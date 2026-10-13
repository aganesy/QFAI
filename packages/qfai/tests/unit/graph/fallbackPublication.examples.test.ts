import { readFile, readdir, writeFile } from "node:fs/promises";
import type * as NativeFs from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { graphEnvironmentKey } from "../../../src/core/graph/layout.js";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { graphCliResult, installedGraphHookResult } from "../../helpers/graphCli.js";

const fault = vi.hoisted(() => ({ phase: "", draftCreated: false }));
vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof NativeFs>();
  return {
    ...fs,
    open: async (...args: Parameters<typeof fs.open>) => {
      const draft = String(args[0]).endsWith(".draft.json");
      if (draft && fault.phase === "draft-open") throw new Error("Private simulated state fault");
      const handle = await fs.open(...args);
      if (draft) {
        fault.draftCreated = true;
        if (fault.phase === "draft-close") {
          const close = handle.close.bind(handle);
          vi.spyOn(handle, "close").mockImplementation(async () => {
            await close();
            throw new Error("Private simulated state fault");
          });
        }
      }
      return handle;
    },
    unlink: async (file: Parameters<typeof fs.unlink>[0]) => {
      const name = path.basename(String(file));
      if (
        (fault.phase === "consume" && name.endsWith(".pending.json")) ||
        (fault.phase === "state-release" && fault.draftCreated && name === "state.lock") ||
        (fault.phase === "analysis-release" && name === "analysis.lock")
      )
        throw new Error("Private simulated state fault");
      return fs.unlink(file);
    },
    rename: async (...args: Parameters<typeof fs.rename>) => {
      if (fault.phase === "publish" && String(args[0]).endsWith(".draft.json"))
        throw new Error("Private simulated state fault");
      return fs.rename(...args);
    },
  };
});

// QFAI:EX-0001-0235-18
it("publishes no search grant after detected prepublication state or lock failures", async () => {
  for (const phase of [
    "consume",
    "draft-open",
    "draft-close",
    "state-release",
    "analysis-release",
    "publish",
  ]) {
    const fixture = await codeAnalysisFixture();
    try {
      await writeFile(
        path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
        '{"kind":"graph-enforcement","denyExploration":true}',
      );
      const event = {
        tool_name: "Bash",
        tool_input: { command: "rg legacy packages/" },
        session_id: "publication-session",
        cwd: fixture.root,
      };
      const observed = await installedGraphHookResult(fixture.root, event);
      const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(observed.output)?.[1] ?? "";
      fault.phase = phase;
      fault.draftCreated = false;
      const failed = await graphCliResult(
        fixture.root,
        [
          "fallback",
          "--attempt-id",
          attemptId,
          "--question",
          "legacy callers",
          "--reason",
          "Incomplete legacy relationships.",
        ],
        fixture.run,
      );
      expect(failed.value).toMatchObject({
        status: "failed",
        permitted: false,
        failure: "Search fallback failed.",
        recovery: expect.stringContaining(".qfai/tools/state"),
      });
      expect(failed.failures).toBe(1);
      expect(failed.output).not.toContain("Private simulated state fault");
      const directory = path.join(fixture.root, ".qfai", "tools", "state", graphEnvironmentKey());
      expect((await readdir(directory)).some((name) => name.endsWith(".grant.json"))).toBe(false);
      expect(
        await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8"),
      ).toBe("Process-port DB marker");
      fault.phase = "";
      const checked = await installedGraphHookResult(fixture.root, event);
      expect(checked.output).toContain('"permissionDecision":"deny"');
    } finally {
      fault.phase = "";
      fault.draftCreated = false;
      await fixture.dispose();
    }
  }
});

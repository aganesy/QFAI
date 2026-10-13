// QFAI:AC-0001-0236-02

import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { completedCodeSnapshotFixture } from "../../../helpers/graphReuse.js";
import { restoreCompletedCodeAnalysis } from "../../../../src/core/graph/reuse.js";
import { graphAnalysisRoot, graphRuntimePaths } from "../../../../src/core/graph/layout.js";
import { codegraphEnvironment } from "../../../../src/core/graph/process.js";
import { classifyStoredGraphExploration } from "../../../../src/core/graph/fallbackState.js";
import { graphCliResult } from "../../../helpers/graphCli.js";

describe("AC-0001-0236-02", () => {
  it("keeps concurrent worktree copies and search permissions independent and separates Windows from WSL paths", async () => {
    const fixture = await completedCodeSnapshotFixture();
    const other = await mkdtemp(path.join(os.tmpdir(), "qfai-independent-worktree-"));
    try {
      await writeFile(
        path.join(other, "checkout.ts"),
        await readFile(path.join(fixture.root, "checkout.ts")),
      );
      expect(
        await Promise.all([
          restoreCompletedCodeAnalysis(fixture.root, fixture.run, fixture.environment),
          restoreCompletedCodeAnalysis(other, fixture.run, fixture.environment),
        ]),
      ).toEqual(["restored", "restored"]);
      const first = path.join(fixture.analysis, ".codegraph", "codegraph.db");
      const second = path.join(graphAnalysisRoot(other, "codegraph"), ".codegraph", "codegraph.db");
      expect((await lstat(first)).nlink).toBe(1);
      expect((await lstat(second)).nlink).toBe(1);
      expect((await lstat(first)).ino).not.toBe((await lstat(second)).ino);
      await Promise.all([
        writeFile(first, "First uncommitted state"),
        writeFile(second, "Second uncommitted state"),
      ]);
      expect(await readFile(first, "utf8")).toBe("First uncommitted state");
      expect(await readFile(second, "utf8")).toBe("Second uncommitted state");
      expect(
        await readFile(
          path.join(fixture.candidate, "analysis", ".codegraph", "codegraph.db"),
          "utf8",
        ),
      ).toBe("Process-port DB marker");
      const event = {
        tool: "Bash",
        command: "rg checkout packages/",
        cwd: fixture.root,
        session: "session",
      };
      const denied = await classifyStoredGraphExploration(fixture.root, event);
      const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(denied.message)?.[1];
      const grant = await graphCliResult(
        fixture.root,
        [
          "fallback",
          "--attempt-id",
          attemptId ?? "",
          "--question",
          "unresolved legacy caller",
          "--reason",
          "Graph cannot identify the legacy caller",
        ],
        fixture.run,
      );
      expect(grant.value).toMatchObject({ permitted: true });
      expect((await classifyStoredGraphExploration(fixture.root, event)).decision).toBe("allow");
      expect((await classifyStoredGraphExploration(other, { ...event, cwd: other })).decision).toBe(
        "deny",
      );
      const windows = { platform: "win32", architecture: "x64" };
      const wsl = { platform: "linux", architecture: "x64" };
      expect(graphRuntimePaths(fixture.root, windows).directory).not.toBe(
        graphRuntimePaths(fixture.root, wsl).directory,
      );
      for (const engine of ["codegraph", "graphify"] as const)
        expect(graphAnalysisRoot(fixture.root, engine, windows)).not.toBe(
          graphAnalysisRoot(fixture.root, engine, wsl),
        );
      expect(codegraphEnvironment(fixture.root, windows).HOME).not.toBe(
        codegraphEnvironment(fixture.root, wsl).HOME,
      );
    } finally {
      await fixture.dispose();
      await rm(other, { recursive: true, force: true });
    }
  });
});

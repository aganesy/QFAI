import { cp, readFile, readdir, rm } from "node:fs/promises";
import type * as NativeFs from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { prepareCodeAnalysis } from "../../../src/core/graph/codePreparation.js";
import {
  completedCodeSnapshotFixture,
  localCodeGenerationProcess,
} from "../../helpers/graphReuse.js";

const replacement = vi.hoisted(() => ({ fail: false }));
vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof NativeFs>();
  return {
    ...fs,
    rename: async (from: string, to: string) => {
      if (replacement.fail && path.basename(from).startsWith(".preparing-codegraph-"))
        throw new Error("Simulated activation interruption");
      return fs.rename(from, to);
    },
  };
});

// QFAI:EX-0001-0236-14
// Mutation: packages/qfai/src/core/graph/storage.ts `if (retained) await rename(previous, current);` -> `if (!retained) await rename(previous, current);` fails "retains prior analysis when activation is interrupted and publishes no incomplete copy"
it("retains prior analysis when activation is interrupted and publishes no incomplete copy", async () => {
  const fixture = await completedCodeSnapshotFixture();
  try {
    await cp(path.join(fixture.candidate, "analysis"), fixture.analysis, { recursive: true });
    await rm(fixture.candidate, { recursive: true });
    const generation = localCodeGenerationProcess(fixture);
    replacement.fail = true;
    const result = await prepareCodeAnalysis(
      fixture.root,
      async (command, args, options) => {
        const native = await generation(command, args, options);
        if (!args.includes("status") || args[2] !== fixture.analysis) return native;
        const value: Record<string, unknown> = JSON.parse(native.stdout);
        return {
          ...native,
          stdout: JSON.stringify({
            ...value,
            pendingChanges: { added: 0, modified: 1, removed: 0 },
          }),
        };
      },
      fixture.environment,
    );
    expect(result.status).toBe("failed");
    await expect(
      readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8"),
    ).resolves.toBe("Process-port DB marker");
    expect(await readdir(path.dirname(fixture.candidate))).toEqual([]);
    expect(
      (await readdir(path.dirname(fixture.analysis))).some(
        (name) => name.startsWith(".preparing-") || name.startsWith(".previous-"),
      ),
    ).toBe(false);
  } finally {
    replacement.fail = false;
    await fixture.dispose();
  }
});

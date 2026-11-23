import { cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { prepareCodeAnalysis } from "../../../src/core/graph/codePreparation.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";
import { completedCodeSnapshotFixture } from "../../helpers/graphReuse.js";

// QFAI:EX-0001-0236-20
// Mutation: packages/qfai/src/core/graph/analysis.ts `if (refresh === "in-place") await mirrorGraphCorpus(root, analysis);` -> `await mirrorGraphCorpus(root, analysis);` fails "keeps the prior code graph paired with its prior inputs when a changed source cannot be rebuilt"
it("keeps the prior code graph paired with its prior inputs when a changed source cannot be rebuilt", async () => {
  const fixture = await completedCodeSnapshotFixture();
  try {
    await cp(path.join(fixture.candidate, "analysis"), fixture.analysis, { recursive: true });
    await rm(fixture.candidate, { recursive: true });
    const prior = await readFile(path.join(fixture.analysis, "checkout.ts"), "utf8");
    await writeFile(
      path.join(fixture.root, "checkout.ts"),
      "export function checkout() { return 8; }\n",
    );
    const run: GraphProcess = async (command, args, options) => {
      if (
        args.some((arg) => arg.endsWith("codegraph-native.mjs")) &&
        !["inventory", "coverage"].includes(args.at(-1) ?? "")
      )
        return { exitCode: 1, stdout: "" };
      const result = await fixture.run(command, args, options);
      if (!args.includes("status")) return result;
      const status: Record<string, unknown> = JSON.parse(result.stdout);
      return {
        ...result,
        stdout: JSON.stringify({
          ...status,
          pendingChanges: { added: 0, modified: 1, removed: 0 },
        }),
      };
    };
    await expect(
      prepareCodeAnalysis(fixture.root, run, fixture.environment),
    ).resolves.toMatchObject({ status: "failed" });
    expect(await readFile(path.join(fixture.analysis, "checkout.ts"), "utf8")).toBe(prior);
    expect(await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8")).toBe(
      "Process-port DB marker",
    );
    expect(
      (await readdir(path.dirname(fixture.analysis))).filter((name) => name.startsWith(".")),
    ).toEqual([]);
  } finally {
    await fixture.dispose();
  }
});

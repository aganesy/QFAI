// QFAI:AC-0001-0236-05

import { cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { completedCodeSnapshotFixture } from "../../../helpers/graphReuse.js";
import { documentAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { prepareCodeAnalysis } from "../../../../src/core/graph/codePreparation.js";
import { prepareDocumentAnalysis } from "../../../../src/core/graph/documents.js";
import { exploreGraph } from "../../../../src/core/graph/query.js";
import type { GraphProcess } from "../../../../src/core/graph/process.js";

describe("AC-0001-0236-05", () => {
  it("retains prior copies on native check and generation failures without publishing stale replacements", async () => {
    for (const failure of ["check", "generation"]) {
      const fixture = await completedCodeSnapshotFixture();
      try {
        await cp(path.join(fixture.candidate, "analysis"), fixture.analysis, { recursive: true });
        await rm(fixture.candidate, { recursive: true });
        const database = path.join(fixture.analysis, ".codegraph", "codegraph.db");
        const prior = await readFile(database);
        await writeFile(path.join(fixture.root, "checkout.ts"), "Changed uncommitted source.\n");
        const run: GraphProcess = async (command, args, options) => {
          if (args.includes("status")) {
            if (failure === "check") return { exitCode: 1, stdout: "" };
            const result = await fixture.run(command, args, options);
            const value: Record<string, unknown> = JSON.parse(result.stdout);
            return {
              ...result,
              stdout: JSON.stringify({
                ...value,
                pendingChanges: { added: 0, modified: 1, removed: 0 },
              }),
            };
          }
          if (
            args.some((arg) => arg.endsWith("codegraph-native.mjs")) &&
            !["inventory", "coverage"].includes(args.at(-1) ?? "")
          )
            return { exitCode: 1, stdout: "" };
          return fixture.run(command, args, options);
        };
        expect((await prepareCodeAnalysis(fixture.root, run, fixture.environment)).status).toBe(
          "failed",
        );
        await expect(readFile(database)).resolves.toEqual(prior);
        expect(
          (await exploreGraph(fixture.root, { domain: "code", question: "changed source" }, run))
            .status,
        ).toBe("not-ready");
        expect(await readdir(path.dirname(fixture.candidate))).toEqual([]);
        expect(fixture.calls.some((call) => call.args.includes("context"))).toBe(false);
      } finally {
        await fixture.dispose();
      }
    }
    const documents = await documentAnalysisFixture();
    try {
      const graph = path.join(documents.documentAnalysis, "graphify-out", "graph.json");
      const prior = await readFile(graph);
      await writeFile(path.join(documents.root, "rationale.md"), "Changed document.\n");
      await rm(path.join(documents.root, ".qfai", "graph-processing.json"));
      const run: GraphProcess = (command, args, options) =>
        args.some((arg) => arg.endsWith("graphify-native.py")) && args.at(-1) === "semantic"
          ? Promise.resolve({
              exitCode: 0,
              stdout: '{"current":false,"unsupported":[],"unreadable":[]}',
            })
          : documents.run(command, args, options);
      expect((await prepareDocumentAnalysis(documents.root, run)).status).toBe("not-ready");
      expect(
        (
          await exploreGraph(
            documents.root,
            { domain: "documents", question: "changed rationale" },
            run,
          )
        ).status,
      ).toBe("not-ready");
      expect(await readFile(graph)).toEqual(prior);
      expect(
        documents.calls.some(
          (call) => call.args.includes("query") || call.args.includes("extract"),
        ),
      ).toBe(false);
    } finally {
      await documents.dispose();
    }
  });
});

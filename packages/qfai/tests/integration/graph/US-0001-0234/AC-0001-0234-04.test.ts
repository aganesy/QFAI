// QFAI:AC-0001-0234-04

import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { documentAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { graphCliResult } from "../../../helpers/graphCli.js";

import type { GraphProcess } from "../../../../src/core/graph/process.js";

describe("AC-0001-0234-04", () => {
  it("queries completed documents through the CLI without processing and refuses native stale scope", async () => {
    const fixture = await documentAnalysisFixture();
    let current = true;
    const run: GraphProcess = (command, args, options) => {
      if (args.includes("extract")) throw new Error("Unexpected model processing");
      if (args.some((arg) => arg.endsWith("graphify-native.py")) && args.at(-1) === "semantic")
        return Promise.resolve({
          exitCode: 0,
          stdout: JSON.stringify({ current, unsupported: [], unreadable: [] }),
        });
      return fixture.run(command, args, options);
    };

    try {
      await rm(path.join(fixture.root, ".qfai", "graph-processing.json"));
      const graph = path.join(fixture.documentAnalysis, "graphify-out", "graph.json");
      const prior = await readFile(graph);
      const reply = (await graphCliResult(fixture.root, ["documents", "rationale"], run)).value;
      expect(JSON.stringify(reply)).toContain('"status":"answered"');
      expect(JSON.stringify(reply)).toContain("rationale.md");
      expect(fixture.calls.filter((call) => call.args.includes("query"))).toHaveLength(1);
      expect(
        fixture.calls.every(
          (call) =>
            call.env?.OPENAI_BASE_URL === undefined && call.env?.OLLAMA_BASE_URL === undefined,
        ),
      ).toBe(true);
      await writeFile(path.join(fixture.root, "rationale.md"), "Changed document.\n");
      current = false;
      fixture.calls.length = 0;
      const stale = (await graphCliResult(fixture.root, ["documents", "changed rationale"], run))
        .value;
      expect(JSON.stringify(stale)).toContain('"status":"not-ready"');
      expect(
        fixture.calls.some((call) => call.args.includes("query") || call.args.includes("extract")),
      ).toBe(false);
      expect(await readFile(graph)).toEqual(prior);
    } finally {
      await fixture.dispose();
    }
  });
});

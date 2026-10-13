// QFAI:AC-0001-0234-05

import { describe, expect, it } from "vitest";
import { documentAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { graphCliResult } from "../../../helpers/graphCli.js";

import type { GraphProcess } from "../../../../src/core/graph/process.js";

describe("AC-0001-0234-05", () => {
  it("shows requested scope, source facts and inference while refusing absence claims for incomplete coverage", async () => {
    const fixture = await documentAnalysisFixture();
    let complete = false;
    const run: GraphProcess = (command, args, options) => {
      if (args.some((arg) => arg.endsWith("graphify-native.py")) && args.at(-1) === "semantic")
        return Promise.resolve({
          exitCode: 0,
          stdout: '{"current":true,"unsupported":["legacy.foo"],"unreadable":["locked.md"]}',
        });
      if (args.at(-1) === "coverage")
        return Promise.resolve({
          exitCode: 0,
          stdout: JSON.stringify({
            complete,
            unsupported: [],
            unreadable: [],
            unparsed: complete ? [] : ["broken.ts"],
          }),
        });
      if (args.includes("context"))
        return Promise.resolve({
          exitCode: 0,
          stdout: JSON.stringify({
            query: args[args.indexOf("context") + 1],
            summary: "No native context entries",
            entryPoints: [],
            nodes: [],
            edges: [],
            codeBlocks: [],
            relatedFiles: [],
            stats: {
              nodeCount: 0,
              edgeCount: 0,
              fileCount: 0,
              codeBlockCount: 0,
              totalCodeSize: 0,
            },
          }),
        });
      return fixture.run(command, args, options);
    };

    try {
      const documents = JSON.stringify(
        (await graphCliResult(fixture.root, ["documents", "Requirement rationale"], run)).value,
      );
      expect(documents).toContain('"status":"incomplete"');
      expect(documents).toContain("requestedScope");
      expect(documents).toContain("Requirement rationale");
      expect(documents).toContain("legacy.foo");
      expect(documents).toContain("locked.md");
      expect(documents).toContain("[src=rationale.md loc=L1]");
      expect(documents).toContain("[INFERRED]");
      expect(documents).toContain("semantic correctness");
      expect(documents).toContain("does not establish absence");
      const incomplete = JSON.stringify(
        (await graphCliResult(fixture.root, ["code", "unknown function"], run)).value,
      );
      expect(incomplete).toContain('"status":"incomplete"');
      expect(incomplete).toContain("broken.ts");
      expect(incomplete).toContain("does not establish absence");
      complete = true;
      const confirmed = JSON.stringify(
        (await graphCliResult(fixture.root, ["code", "unknown function"], run)).value,
      );
      expect(confirmed).toContain('"status":"no-match"');
      expect(confirmed).toContain("does not establish global absence");
    } finally {
      await fixture.dispose();
    }
  });
});

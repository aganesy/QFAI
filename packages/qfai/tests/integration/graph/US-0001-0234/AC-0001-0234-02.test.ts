// QFAI:AC-0001-0234-02

import { describe, expect, it } from "vitest";
import { documentAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { graphCliResult } from "../../../helpers/graphCli.js";

import { continueGraphExploration, exploreGraph } from "../../../../src/core/graph/query.js";

describe("AC-0001-0234-02", () => {
  it("routes rationale through Graphify and requires a specific code question for a follow-up", async () => {
    const fixture = await documentAnalysisFixture();

    try {
      const reply = (
        await graphCliResult(
          fixture.root,
          ["documents", "Requirement and ADR rationale"],
          fixture.run,
        )
      ).value;
      expect(JSON.stringify(reply)).toContain('"engine":"graphify"');
      expect(JSON.stringify(reply)).toContain("rationale.md");
      expect(fixture.calls.filter((call) => call.args.includes("query"))).toHaveLength(1);
      expect(fixture.calls.some((call) => call.args.includes("context"))).toBe(false);
      const first = await exploreGraph(
        fixture.root,
        { domain: "documents", question: "rationale" },
        fixture.run,
      );
      for (const request of [
        { domain: "documents", question: "rationale" },
        { domain: "code", question: " " },
      ] as const) {
        await expect(
          continueGraphExploration(fixture.root, first, request, fixture.run),
        ).rejects.toThrow();
      }
      const next = await continueGraphExploration(
        fixture.root,
        first,
        { domain: "code", question: "Which function calls checkout?" },
        fixture.run,
      );
      expect(next.engine).toBe("codegraph");
      expect(next.status).toBe("answered");
      expect(fixture.calls.filter((call) => call.args.includes("context"))).toHaveLength(1);
    } finally {
      await fixture.dispose();
    }
  });
});

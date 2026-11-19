// QFAI:AC-0001-0234-02

import { describe, expect, it } from "vitest";
import { documentAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { graphCliResult } from "../../../helpers/graphCli.js";

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
      const unresolved = "Which function calls checkout?";
      const next = await graphCliResult(fixture.root, ["code", unresolved], fixture.run);
      expect(next.value).toMatchObject({ engine: "codegraph", status: "answered" });
      const contexts = fixture.calls.filter((call) => call.args.includes("context"));
      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.args).toContain(unresolved);
      expect(fixture.calls.filter((call) => call.args.includes("query"))).toHaveLength(1);
    } finally {
      await fixture.dispose();
    }
  });
});

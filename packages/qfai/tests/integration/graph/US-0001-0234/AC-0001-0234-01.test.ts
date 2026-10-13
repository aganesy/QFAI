// QFAI:AC-0001-0234-01

import { describe, expect, it } from "vitest";
import { documentAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { graphCliResult } from "../../../helpers/graphCli.js";

import {
  continueGraphExploration,
  exploreGraph,
  readKnownGraphFile,
} from "../../../../src/core/graph/query.js";

describe("AC-0001-0234-01", () => {
  it("routes code exploration through the CLI and reads evidence before a specific document follow-up", async () => {
    const fixture = await documentAnalysisFixture();

    try {
      const reply = (
        await graphCliResult(
          fixture.root,
          ["code", "checkout callers and change impact"],
          fixture.run,
        )
      ).value;
      expect(JSON.stringify(reply)).toContain('"engine":"codegraph"');
      expect(JSON.stringify(reply)).toContain("checkout.ts");
      expect(fixture.calls.filter((call) => call.args.includes("context"))).toHaveLength(1);
      expect(fixture.calls.some((call) => call.args.includes("graphify"))).toBe(false);
      const calls = fixture.calls.length;
      expect(await readKnownGraphFile(fixture.root, "checkout.ts")).toContain("function checkout");
      expect(fixture.calls).toHaveLength(calls);
      await expect(readKnownGraphFile(fixture.root, "../checkout.ts")).rejects.toThrow("known");
      const first = await exploreGraph(
        fixture.root,
        { domain: "code", question: "checkout" },
        fixture.run,
      );
      for (const request of [
        { domain: "code", question: "checkout" },
        { domain: "documents", question: " " },
      ] as const) {
        await expect(
          continueGraphExploration(fixture.root, first, request, fixture.run),
        ).rejects.toThrow();
      }
      const next = await continueGraphExploration(
        fixture.root,
        first,
        { domain: "documents", question: "Which requirement explains checkout?" },
        fixture.run,
      );
      expect(next.engine).toBe("graphify");
      expect(next.status).toBe("answered");
      expect(fixture.calls.filter((call) => call.args.includes("query"))).toHaveLength(1);
    } finally {
      await fixture.dispose();
    }
  });
});

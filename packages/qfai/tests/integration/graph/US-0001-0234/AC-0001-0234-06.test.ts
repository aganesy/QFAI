// QFAI:AC-0001-0234-06

import { rm } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { codeAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { graphCliResult } from "../../../helpers/graphCli.js";

describe("AC-0001-0234-06", () => {
  it("reports missing analysis with recovery and runs no raw search itself", async () => {
    const fixture = await codeAnalysisFixture();
    try {
      await rm(path.join(fixture.analysis, ".codegraph", "codegraph.db"));
      const answer = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
      expect(answer.value).toMatchObject({ status: "failed" });
      expect(answer.output).toContain("Repair");
      expect(answer.failures).toBe(1);
      expect(
        fixture.calls.some(
          (call) =>
            call.args.includes("rg") || call.args.includes("grep") || call.args.includes("context"),
        ),
      ).toBe(false);
    } finally {
      await fixture.dispose();
    }
  });
});

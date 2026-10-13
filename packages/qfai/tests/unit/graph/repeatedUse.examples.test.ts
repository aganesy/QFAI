import { expect, it } from "vitest";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { prepareCodeAnalysis } from "../../../src/core/graph/codePreparation.js";
import { exploreGraph } from "../../../src/core/graph/query.js";

// QFAI:EX-0001-0236-19
// Mutation: packages/qfai/src/core/graph/analysis.ts `return nativeCodeAnalysisCurrent(root, analysis, run);` -> `return true;` fails "rechecks unchanged scope natively and reuses analysis without regeneration or watchers"
it("rechecks unchanged scope natively and reuses analysis without regeneration or watchers", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    for (let use = 0; use < 2; use += 1) {
      expect(await prepareCodeAnalysis(fixture.root, fixture.run)).toMatchObject({
        status: "prepared",
        source: "current",
      });
      expect(
        await exploreGraph(fixture.root, { domain: "code", question: "checkout" }, fixture.run),
      ).toMatchObject({ status: "answered", engine: "codegraph" });
    }
    expect(fixture.calls.filter((call) => call.args.includes("status"))).toHaveLength(4);
    expect(fixture.calls.filter((call) => call.args.includes("context"))).toHaveLength(2);
    expect(fixture.calls.filter((call) => call.args.at(-1) === "coverage")).toHaveLength(2);
    expect(
      fixture.calls.some(
        (call) =>
          call.args.some((arg) => /^(?:index|sync|extract|serve|--watch)$/.test(arg)) ||
          (call.args.some((arg) => arg.endsWith("codegraph-native.mjs")) &&
            !["inventory", "coverage"].includes(call.args.at(-1) ?? "")),
      ),
    ).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

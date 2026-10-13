import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { inspectCurrentCodeAnalysis } from "../../../src/core/graph/analysis.js";
import {
  inspectDocumentAnalysis,
  prepareGraphifyCodeAnalysis,
} from "../../../src/core/graph/documents.js";
import {
  codeAnalysisFixture,
  documentAnalysisFixture,
  graphifyExtractionFixture,
} from "../../helpers/graphAnalysis.js";
import { graphAnalysisRoot } from "../../../src/core/graph/layout.js";

// QFAI:EX-0001-0236-10
// Mutation: packages/qfai/src/core/graph/analysis.ts `value.version === GRAPH_VERSIONS.codegraph` -> `true` fails "rejects changed native engine parser grammar and selected processing definitions"
it("rejects changed native engine parser grammar and selected processing definitions", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    for (const change of [
      { version: "99.0.0" },
      { index: { builtWithVersion: "99.0.0" } },
      { index: { currentExtractionVersion: 2 } },
      { index: { reindexRecommended: true } },
    ]) {
      const current = await inspectCurrentCodeAnalysis(
        fixture.root,
        async (command, args, options) => {
          const result = await fixture.run(command, args, options);
          const status: { index: Record<string, unknown> } = JSON.parse(result.stdout);
          return {
            ...result,
            stdout: JSON.stringify({
              ...status,
              ...change,
              index: { ...status.index, ...change.index },
            }),
          };
        },
      );
      expect(current, JSON.stringify(change)).toBe(false);
    }
  } finally {
    await fixture.dispose();
  }
  const documents = await documentAnalysisFixture();
  try {
    await writeFile(
      path.join(documents.root, ".qfai", "graph-processing.json"),
      JSON.stringify({ ...documents.processing, model: "different-model" }),
    );
    expect(await inspectDocumentAnalysis(documents.root, documents.run)).toBe(false);
    expect(documents.calls).toHaveLength(0);
  } finally {
    await documents.dispose();
  }
});

// QFAI:EX-0001-0236-11
// Mutation: packages/qfai/src/core/graph/documents.ts `const current = graphAnalysisRoot(root, "graphify-code");` -> `const current = graphAnalysisRoot(root, "graphify-code"); if (await readOptionalJson(path.join(current, "graphify-out", "managed.json"))) return { status: "prepared" };` fails "allows native Graphify code rebuilds when updating changed code"
it("allows native Graphify code rebuilds when updating changed code", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    const run = graphifyExtractionFixture(fixture);
    expect(await prepareGraphifyCodeAnalysis(fixture.root, run)).toMatchObject({
      status: "prepared",
    });
    const changed = "export function checkout() { return 11; }\n";
    await writeFile(path.join(fixture.root, "checkout.ts"), changed);
    expect(await prepareGraphifyCodeAnalysis(fixture.root, run)).toMatchObject({
      status: "prepared",
    });
    expect(
      await readFile(
        path.join(graphAnalysisRoot(fixture.root, "graphify-code"), "checkout.ts"),
        "utf8",
      ),
    ).toBe(changed);
    expect(fixture.calls.filter((call) => call.args.includes("extract"))).toHaveLength(2);
    expect(
      fixture.calls.every((call) => !call.args.includes("--watch") && !call.args.includes("serve")),
    ).toBe(true);
  } finally {
    await fixture.dispose();
  }
});

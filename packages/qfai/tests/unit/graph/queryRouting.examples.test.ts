import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { graphCliResult } from "../../helpers/graphCli.js";
import { exploreGraph } from "../../../src/core/graph/query.js";
import { codeAnalysisFixture, documentAnalysisFixture } from "../../helpers/graphAnalysis.js";

// QFAI:EX-0001-0234-01
// Mutation: packages/qfai/src/core/graph/query.ts `request.domain === "code" && (await inspectCurrentCodeAnalysis(root, run))` -> `request.domain === "documents" && (await inspectCurrentCodeAnalysis(root, run))` fails "queries CodeGraph first for callers and change impact"
it("queries CodeGraph first for callers and change impact", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    const managed = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
    expect(managed.value).toMatchObject({ engine: "codegraph", status: "answered" });
    expect(managed.output).toContain("checkout.ts");
    expect(managed.failures).toBe(0);
    expect(fixture.calls.some((call) => call.args.includes("graphify"))).toBe(false);
    fixture.calls.length = 0;
    const invalid = await graphCliResult(
      fixture.root,
      ["code", "checkout", "--approved", "true"],
      fixture.run,
    );
    expect(invalid.value).toMatchObject({ status: "failed" });
    expect(invalid.output).not.toContain("checkout.ts");
    expect(invalid.failures).toBe(1);
    expect(fixture.calls).toHaveLength(0);
    fixture.calls.length = 0;
    const result = await exploreGraph(
      fixture.root,
      { domain: "code", question: "callers and change impact of checkout" },
      fixture.run,
    );
    expect(result.engine).toBe("codegraph");
    expect(result.status).toBe("answered");
    expect(result.answer).toContain("checkout.ts");
    expect(fixture.calls.filter((call) => call.args.includes("context"))).toHaveLength(1);
    expect(fixture.calls.some((call) => call.args.includes("graphify"))).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-06
// Mutation: packages/qfai/src/cli/graphCli.ts `const question = args[1]?.trim();` -> `const question = args[0]?.trim();` fails "asks Graphify only for the rationale left unresolved by code"
it("asks Graphify only for the rationale left unresolved by code", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const first = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
    expect(first.value).toMatchObject({ engine: "codegraph", status: "answered" });
    const unresolved = "Which requirement explains checkout?";
    const result = await graphCliResult(fixture.root, ["documents", unresolved], fixture.run);
    expect(result.value).toMatchObject({ engine: "graphify", status: "answered" });
    expect(result.failures).toBe(0);
    const queries = fixture.calls.filter((call) => call.args.includes("query"));
    expect(queries).toHaveLength(1);
    const query = queries[0]?.args;
    expect(query?.[(query?.indexOf("query") ?? -1) + 1]).toBe(unresolved);
    expect(fixture.calls.filter((call) => call.args.includes("context"))).toHaveLength(1);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-05
// Mutation: packages/qfai/src/cli/graphCli.ts `const question = args[1]?.trim();` -> `const question = args[0]?.trim();` fails "asks CodeGraph only for the code relationship left unresolved by documents"
it("asks CodeGraph only for the code relationship left unresolved by documents", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const first = await graphCliResult(
      fixture.root,
      ["documents", "Requirement ADR rationale"],
      fixture.run,
    );
    expect(first.value).toMatchObject({ engine: "graphify", status: "answered" });
    const unresolved = "Which function calls checkout?";
    const result = await graphCliResult(fixture.root, ["code", unresolved], fixture.run);
    expect(result.value).toMatchObject({ engine: "codegraph", status: "answered" });
    expect(result.failures).toBe(0);
    const contexts = fixture.calls.filter((call) => call.args.includes("context"));
    expect(contexts).toHaveLength(1);
    expect(contexts[0]?.args[2]).toBe(unresolved);
    expect(fixture.calls.filter((call) => call.args.includes("query"))).toHaveLength(1);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-04
// Mutation: packages/qfai/src/core/graph/query.ts `request.domain === "code" && (await inspectCurrentCodeAnalysis(root, run))` -> `request.domain === "documents" && (await inspectCurrentCodeAnalysis(root, run))` fails "uses no second engine or watcher for a fully answered code question"
it("uses no second engine or watcher for a fully answered code question", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const result = await exploreGraph(
      fixture.root,
      { domain: "code", question: "checkout callers" },
      fixture.run,
    );
    expect(result.engine).toBe("codegraph");
    expect(result.status).toBe("answered");
    expect(fixture.calls.some((call) => call.args.includes("graphify"))).toBe(false);
    expect(
      fixture.calls.some((call) =>
        call.args.some((arg) => ["serve", "watch", "sync"].includes(arg)),
      ),
    ).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-03
// Mutation: packages/qfai/src/core/graph/query.ts `request.domain === "documents" ? await inspectDocumentScope(root, run) : undefined` -> `request.domain === "code" ? await inspectDocumentScope(root, run) : undefined` fails "queries Graphify first for a requirement and ADR relationship"
it("queries Graphify first for a requirement and ADR relationship", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const result = await graphCliResult(
      fixture.root,
      ["documents", "Requirement ADR rationale"],
      fixture.run,
    );
    expect(result.value).toMatchObject({ engine: "graphify", status: "answered" });
    expect(result.output).toContain("rationale.md");
    expect(result.failures).toBe(0);
    expect(fixture.calls.filter((call) => call.args.includes("query"))).toHaveLength(1);
    expect(fixture.calls.some((call) => call.args.includes("context"))).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-02
// Mutation: packages/qfai/src/core/graph/query.ts `const context = nativeCodeContext(result.stdout, request.question);` -> `const context = nativeCodeContext("{}", request.question);` fails "reads an exact known source file without another graph query"
it("reads an exact known source file without another graph query", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    const result = await graphCliResult(fixture.root, ["code", "checkout"], fixture.run);
    expect(result.value).toMatchObject({ engine: "codegraph", status: "answered" });
    const text =
      typeof result.value === "object" && result.value !== null && "answer" in result.value
        ? result.value.answer
        : undefined;
    const answer: unknown = typeof text === "string" ? JSON.parse(text) : undefined;
    const files =
      typeof answer === "object" && answer !== null && "relatedFiles" in answer
        ? answer.relatedFiles
        : undefined;
    expect(files).toEqual(["checkout.ts"]);
    const queries = fixture.calls.length;
    expect(await readFile(path.join(fixture.root, "checkout.ts"), "utf8")).toBe(
      "export function checkout() { return 3; }\n",
    );
    expect(fixture.calls).toHaveLength(queries);
  } finally {
    await fixture.dispose();
  }
});

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { documentAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import { exploreGraph } from "../../../src/core/graph/query.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";
import { graphCliResult } from "../../helpers/graphCli.js";

// QFAI:EX-0001-0236-15
// Mutation: packages/qfai/src/core/graph/documents.ts `await mirrorGraphCorpus(root, staged, scope);` -> `await mirrorGraphCorpus(root, staged, scope); const checkedRun = run; run = async (...args: Parameters<GraphProcess>) => ({ ...(await checkedRun(...args)), exitCode: 0 });` fails "retains prior document graph when the selected local backend cannot update changed documents"
it("retains prior document graph when the selected local backend cannot update changed documents", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed rationale\n");
    const run: GraphProcess = async (command, args, options) => {
      if (args.includes("extract")) {
        fixture.calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
        const corpus = args[args.indexOf("extract") + 1];
        if (!corpus) throw new Error("Expected managed staging corpus");
        await mkdir(path.join(corpus, "graphify-out"), { recursive: true });
        await writeFile(path.join(corpus, "graphify-out", "graph.json"), "Partial backend output");
        return { exitCode: 1, stdout: "" };
      }
      if (
        args.includes(fixture.documentAnalysis) &&
        args.some((arg) => arg.endsWith("graphify-native.py"))
      ) {
        fixture.calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
        return { exitCode: 0, stdout: '{"current":false,"unsupported":[],"unreadable":[]}' };
      }
      return fixture.run(command, args, options);
    };
    await expect(prepareDocumentAnalysis(fixture.root, run)).resolves.toMatchObject({
      status: "failed",
    });
    expect(
      await readFile(path.join(fixture.documentAnalysis, "graphify-out", "graph.json"), "utf8"),
    ).toBe("Process-port graph marker");
    expect(
      await exploreGraph(fixture.root, { domain: "documents", question: "Changed rationale" }, run),
    ).toMatchObject({ status: "not-ready", engine: "graphify" });
    const managed = await graphCliResult(fixture.root, ["documents", "Changed rationale"], run);
    expect(managed.value).toMatchObject({
      engine: "graphify",
      status: "failed",
      failure: "Graphify analysis preparation failed.",
    });
    expect(managed.output).toContain("selected local model");
    expect(managed.output).toContain("repair Graphify document analysis");
    expect(managed.failures).toBe(1);
    expect(
      await readFile(path.join(fixture.documentAnalysis, "graphify-out", "graph.json"), "utf8"),
    ).toBe("Process-port graph marker");
    expect(fixture.calls.filter((call) => call.args.includes("extract"))).toHaveLength(2);
    expect(
      fixture.calls.some(
        (call) =>
          call.args.includes("query") ||
          call.args.includes("context") ||
          call.env?.OPENAI_API_KEY !== undefined,
      ),
    ).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

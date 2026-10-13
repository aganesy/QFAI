import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { exploreGraph } from "../../../src/core/graph/query.js";
import {
  codeAnalysisFixture,
  documentAnalysisFixture,
  graphifyExtractionFixture,
} from "../../helpers/graphAnalysis.js";
import {
  prepareDocumentAnalysis,
  prepareGraphifyCodeAnalysis,
  inspectDocumentAnalysis,
  type ExternalProcessingRequest,
} from "../../../src/core/graph/documents.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";
import { graphifyEnvironment } from "../../../src/core/graph/process.js";

// QFAI:EX-0001-0234-07
// Mutation: packages/qfai/src/core/graph/query.ts `status: "not-ready",` -> `status: "failed",` fails "leaves documents not ready when only an ambient API key is present"
it("leaves documents not ready when only an ambient API key is present", async () => {
  const fixture = await codeAnalysisFixture();
  const previousKey = process.env.OPENAI_API_KEY;
  try {
    process.env.OPENAI_API_KEY = "fixture-ambient-key-must-not-authorize-processing";
    const document = path.join(fixture.root, "rationale.md");
    await writeFile(document, "# Rationale\nPrivate project rationale.\n");
    const result = await exploreGraph(
      fixture.root,
      { domain: "documents", question: "requirement rationale" },
      fixture.run,
    );
    expect(result.engine).toBe("graphify");
    expect(result.status).toBe("not-ready");
    expect(result.recovery).toContain("processing");
    expect(fixture.calls).toHaveLength(0);
    expect(await readFile(document, "utf8")).toBe("# Rationale\nPrivate project rationale.\n");
    expect(JSON.stringify(result)).not.toContain(process.env.OPENAI_API_KEY);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-12
// Mutation: packages/qfai/src/core/graph/query.ts `status: "not-ready",` -> `status: "failed",` fails "keeps changed documents not ready after processing configuration is removed"
it("keeps changed documents not ready after processing configuration is removed", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const graph = path.join(fixture.documentAnalysis, "graphify-out", "graph.json");
    const prior = await readFile(graph);
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed requirement rationale\n");
    await rm(path.join(fixture.root, ".qfai", "graph-processing.json"));
    const run: GraphProcess = (command, args, options) =>
      args.some((arg) => arg.endsWith("graphify-native.py")) && args.at(-1) === "semantic"
        ? Promise.resolve({
            exitCode: 0,
            stdout: '{"current":false,"unsupported":[],"unreadable":[]}',
          })
        : fixture.run(command, args, options);
    const result = await exploreGraph(
      fixture.root,
      { domain: "documents", question: "Changed rationale" },
      run,
    );
    expect(result.status).toBe("not-ready");
    expect(result.recovery).toContain("processing");
    expect(
      fixture.calls.some((call) => call.args.includes("query") || call.args.includes("extract")),
    ).toBe(false);
    expect(await readFile(graph)).toEqual(prior);
    expect(await readFile(path.join(fixture.root, "rationale.md"), "utf8")).toContain("Changed");
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-11
// Mutation: packages/qfai/src/core/graph/documents.ts `return recorded;` -> `return undefined;` fails "queries a current completed document graph without a model or backend call"
it("queries a current completed document graph without a model or backend call", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await rm(path.join(fixture.root, ".qfai", "graph-processing.json"));
    const result = await exploreGraph(
      fixture.root,
      { domain: "documents", question: "Requirement rationale" },
      fixture.run,
    );
    expect(result.status).toBe("answered");
    expect(result.answer).toContain("rationale.md");
    expect(fixture.calls.filter((call) => call.args.includes("query"))).toHaveLength(1);
    expect(fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
    expect(
      fixture.calls.some(
        (call) => call.args.includes("--backend") || call.args.includes("--model"),
      ),
    ).toBe(false);
    expect(
      fixture.calls.some(
        (call) => call.env?.OLLAMA_BASE_URL !== undefined || call.env?.OPENAI_API_KEY !== undefined,
      ),
    ).toBe(false);
    await writeFile(path.join(fixture.root, ".qfai", "graph-processing.json"), "{broken");
    fixture.calls.length = 0;
    expect(
      (
        await exploreGraph(
          fixture.root,
          { domain: "documents", question: "Requirement rationale" },
          fixture.run,
        )
      ).status,
    ).toBe("not-ready");
    expect(fixture.calls.some((call) => call.args.includes("query"))).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-10
// Mutation: packages/qfai/src/core/graph/documents.ts `"--code-only",` -> `"--no-cluster",` fails "allows local Graphify code analysis without claiming document readiness"
it("allows local Graphify code analysis without claiming document readiness", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    await writeFile(path.join(fixture.root, "rationale.md"), "# Rationale\n");
    const run = graphifyExtractionFixture(fixture);
    const result = await prepareGraphifyCodeAnalysis(fixture.root, run);
    expect(result.status).toBe("prepared");
    const extracts = fixture.calls.filter((call) => call.args.includes("extract"));
    expect(extracts).toHaveLength(1);
    expect(extracts[0]?.args).toContain("--code-only");
    expect(extracts[0]?.args).not.toContain("--backend");
    expect(extracts[0]?.env?.OPENAI_API_KEY).toBeUndefined();
    expect(extracts[0]?.env?.HOME).toContain(path.join(fixture.root, ".qfai", "tools", "home"));
    expect(extracts[0]?.env?.USERPROFILE).toBe(extracts[0]?.env?.HOME);
    expect(extracts[0]?.env?.XDG_CONFIG_HOME).toContain(
      path.join(fixture.root, ".qfai", "tools", "home"),
    );
    expect(extracts[0]?.env?.GRAPHIFY_ALLOW_LOCAL_PROVIDERS).toBe("0");
    expect(extracts[0]?.env?.GRAPHIFY_NO_AUTO_REFRESH).toBe("1");
    expect(extracts[0]?.args.slice(0, 3)).toEqual(["-I", "-X", "utf8"]);
    expect(await inspectDocumentAnalysis(fixture.root, run)).toBe(false);
    expect(await readFile(path.join(fixture.root, "rationale.md"), "utf8")).toBe("# Rationale\n");
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-09
// Mutation: packages/qfai/src/core/graph/documents.ts `if (!local) {` -> `if (false) {` fails "requires human approval of the exact external destination and document scope"
it("requires human approval of the exact external destination and document scope", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const selected = {
      backend: "openai",
      model: "selected-model",
      endpoint: "https://selected.example.invalid/v1",
      scope: ["rationale.md"],
    };
    await writeFile(
      path.join(fixture.root, ".qfai", "graph-processing.json"),
      JSON.stringify(selected),
    );
    await writeFile(path.join(fixture.root, "outside.md"), "Unapproved document.\n");
    const extraction = graphifyExtractionFixture(fixture);
    const approvals: ExternalProcessingRequest[] = [];
    const run: GraphProcess = async (command, args, options) => {
      if (args.includes("extract")) {
        const corpus = args[args.indexOf("extract") + 1];
        if (!corpus) throw new Error("Expected managed corpus.");
        expect(await readFile(path.join(corpus, "rationale.md"), "utf8")).toContain("rationale");
        await expect(readFile(path.join(corpus, "outside.md"))).rejects.toMatchObject({
          code: "ENOENT",
        });
      }
      return extraction(command, args, options);
    };
    expect((await prepareDocumentAnalysis(fixture.root, run)).status).toBe("not-ready");
    expect(fixture.calls.every((call) => call.args.includes("-c"))).toBe(true);
    expect(fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
    expect(fixture.calls.some((call) => call.env?.OPENAI_BASE_URL !== undefined)).toBe(false);
    const result = await prepareDocumentAnalysis(fixture.root, run, (request) => {
      approvals.push(request);
      return Promise.resolve(true);
    });
    expect(result.status).toBe("prepared");
    expect(approvals).toEqual([
      {
        destination: selected.endpoint,
        scope: selected.scope,
        backend: "openai",
        model: "selected-model",
        worktree: fixture.root,
      },
    ]);
    const extracts = fixture.calls.filter((call) => call.args.includes("extract"));
    expect(extracts).toHaveLength(1);
    expect(extracts[0]?.env?.OPENAI_BASE_URL).toBe(selected.endpoint);
    expect(extracts[0]?.args).toContain("openai");
    expect(await readFile(path.join(fixture.root, "outside.md"), "utf8")).toBe(
      "Unapproved document.\n",
    );
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-08
// Mutation: packages/qfai/src/core/graph/documents.ts `const backend = processing.backend;` -> `const backend = "openai";` fails "uses explicitly selected local document processing settings"
it("uses explicitly selected local document processing settings", async () => {
  const fixture = await documentAnalysisFixture();
  const previousKey = process.env.OPENAI_API_KEY;
  const previousEndpoint = process.env.OLLAMA_BASE_URL;
  try {
    process.env.OPENAI_API_KEY = "fixture-unused-ambient-provider-key";
    process.env.OLLAMA_BASE_URL = "https://unselected.example.invalid";
    const localSettings = {
      backend: "ollama",
      model: "selected-local-model",
      endpoint: "http://127.0.0.1:11434",
      scope: ["rationale.md"],
    };
    const selected = JSON.stringify(localSettings);
    const definition = path.join(fixture.root, ".qfai", "graph-processing.json");
    await writeFile(definition, selected);
    await writeFile(path.join(fixture.root, "outside.md"), "Unselected local document\n");
    const run: GraphProcess = async (command, args, options) => {
      if (args.includes("extract")) {
        fixture.calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
        const corpus = args[args.indexOf("extract") + 1];
        if (!corpus) throw new Error("Expected the explicit managed corpus.");
        await expect(readFile(path.join(corpus, "outside.md"))).rejects.toMatchObject({
          code: "ENOENT",
        });
        await mkdir(path.join(corpus, "graphify-out"), { recursive: true });
        await writeFile(
          path.join(corpus, "graphify-out", "graph.json"),
          '{"nodes":[{"id":"requirement"}],"edges":[]}',
        );
        return { exitCode: 0, stdout: "Native extraction completed" };
      }
      return fixture.run(command, args, options);
    };
    const result = await prepareDocumentAnalysis(fixture.root, run);
    expect(result.status).toBe("prepared");
    const extracts = fixture.calls.filter((call) => call.args.includes("extract"));
    expect(extracts).toHaveLength(1);
    expect(extracts[0]?.args).toContain("ollama");
    expect(extracts[0]?.args).toContain("selected-local-model");
    const selectedCorpus = extracts[0]?.args[(extracts[0]?.args.indexOf("extract") ?? -1) + 1];
    if (!selectedCorpus) throw new Error("Expected selected document corpus.");
    expect(selectedCorpus).toBe(path.toNamespacedPath(selectedCorpus));
    expect(extracts[0]?.env?.GRAPHIFY_OUT).toBe(
      path.toNamespacedPath(path.join(selectedCorpus, "graphify-out")),
    );
    expect(extracts[0]?.env?.OLLAMA_BASE_URL).toBe("http://127.0.0.1:11434");
    expect(extracts[0]?.env?.OPENAI_API_KEY).toBeUndefined();
    expect(await readFile(definition, "utf8")).toBe(selected);
    expect(JSON.stringify(result)).not.toContain(process.env.OPENAI_API_KEY);
    for (const invalid of [
      { endpoint: 42 },
      { endpoint: [] },
      { endpoint: null },
      { endpoint: "" },
      { model: 42 },
      { scope: "rationale.md" },
      { credentialEnv: 42 },
      { unexpected: true },
    ]) {
      const definitionText = JSON.stringify({ ...localSettings, ...invalid });
      await writeFile(definition, definitionText);
      fixture.calls.length = 0;
      const rejected = await prepareDocumentAnalysis(fixture.root, run);
      expect(rejected.status).toBe("not-ready");
      expect(rejected.recovery).toContain(".qfai/graph-processing.json");
      expect(fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
      expect(await readFile(definition, "utf8")).toBe(definitionText);
    }
    await writeFile(definition, selected);
    const home = graphifyEnvironment(fixture.root).HOME;
    if (!home) throw new Error("Expected the private Graphify home.");
    const providerFile = path.join(home, ".graphify", "providers.json");
    const providers = '{"api_key":"fixture-unselected-private-provider"}\n';
    await mkdir(path.dirname(providerFile), { recursive: true });
    await writeFile(providerFile, providers);
    fixture.calls.length = 0;
    const blocked = await prepareDocumentAnalysis(fixture.root, run);
    expect(blocked.status).toBe("not-ready");
    expect(blocked.recovery).toContain("provider");
    expect(fixture.calls).toHaveLength(0);
    expect(await readFile(providerFile, "utf8")).toBe(providers);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousEndpoint === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = previousEndpoint;
    await fixture.dispose();
  }
});

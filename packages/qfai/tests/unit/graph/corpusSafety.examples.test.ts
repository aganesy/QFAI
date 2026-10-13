import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { mirrorGraphCorpus } from "../../../src/core/graph/analysis.js";
import { exploreGraph } from "../../../src/core/graph/query.js";
import { documentAnalysisFixture, graphifyExtractionFixture } from "../../helpers/graphAnalysis.js";
import { composeGraphDenialHooks } from "../../../src/core/graph/hostSettings.js";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import { inspectInstalledGraphHosts } from "../../../src/core/graph/hostConfiguration.js";

// QFAI:EX-0001-0234-17
// Mutation: packages/qfai/src/core/graph/analysis.ts `/\.(?:pem|key|p12|pfx|keystore)$/i.test(name)` -> `false` fails "excludes secret inputs and linked aliases from both corpora without writing outside storage"
it("excludes secret inputs and linked aliases from both corpora without writing outside storage", async () => {
  const fixture = await documentAnalysisFixture();
  const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-outside-"));
  try {
    const secret = "fixture-secret-input-must-not-be-indexed";
    await writeFile(path.join(fixture.root, ".env"), secret);
    await writeFile(path.join(fixture.root, "private.key"), secret);
    for (const directory of [".Graphify", "graphify-out"]) {
      await mkdir(path.join(fixture.root, directory));
      await writeFile(path.join(fixture.root, directory, "providers.json"), secret);
    }
    await link(path.join(fixture.root, ".env"), path.join(fixture.root, "public.ts"));
    await exploreGraph(fixture.root, { domain: "code", question: "checkout" }, fixture.run);
    await exploreGraph(fixture.root, { domain: "documents", question: "rationale" }, fixture.run);
    for (const corpus of [fixture.analysis, fixture.documentAnalysis]) {
      await expect(readFile(path.join(corpus, ".env"))).rejects.toMatchObject({ code: "ENOENT" });
      await expect(readFile(path.join(corpus, "private.key"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      const alias = await readFile(path.join(corpus, "public.ts"), "utf8").catch(() => undefined);
      expect(alias).toBeUndefined();
      for (const directory of [".Graphify", "graphify-out"]) {
        await expect(
          readFile(path.join(corpus, directory, "providers.json")),
        ).rejects.toMatchObject({ code: "ENOENT" });
      }
    }
    const escaped = path.join(fixture.root, ".qfai", "tools", "escaped");
    await mkdir(path.dirname(escaped), { recursive: true });
    await writeFile(path.join(outside, "sentinel.txt"), "Outside input is retained.\n");
    await symlink(outside, escaped, process.platform === "win32" ? "junction" : "dir");
    const outcome = await mirrorGraphCorpus(fixture.root, escaped).then(
      () => "written",
      () => "rejected",
    );
    expect(outcome).toBe("rejected");
    const sentinel = await readFile(path.join(outside, "sentinel.txt"), "utf8").catch(
      () => undefined,
    );
    expect(sentinel).toBe("Outside input is retained.\n");
    expect(await readFile(path.join(fixture.root, ".env"), "utf8")).toBe(secret);
    expect(await readFile(path.join(fixture.root, "private.key"), "utf8")).toBe(secret);
    for (const source of [".env", "../outside.md", "/outside.md", "C:/outside.md"]) {
      fixture.calls.length = 0;
      const run: typeof fixture.run = (command, args, options) =>
        args.at(-1) === "inventory" && args.some((arg) => arg.endsWith("graphify-native.py"))
          ? Promise.resolve({ exitCode: 0, stdout: JSON.stringify({ files: [source] }) })
          : fixture.run(command, args, options);
      const answer = await exploreGraph(
        fixture.root,
        { domain: "documents", question: "rationale" },
        run,
      );
      expect(answer.status, source).toBe("not-ready");
      expect(fixture.calls.some((call) => call.args.includes("query"))).toBe(false);
    }
  } finally {
    await fixture.dispose();
    await rm(outside, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0234-18
// Mutation: packages/qfai/src/core/graph/hostSettings.ts `export function hasOpaqueCredentials(value: unknown): boolean {` -> `export function hasOpaqueCredentials(value: unknown): boolean { return false;` fails "keeps credentials out of integration settings, processing definitions and generated storage"
it("keeps credentials out of integration settings, processing definitions and generated storage", async () => {
  const fixture = await documentAnalysisFixture();
  const previousKey = process.env.QFAI_TEST_SELECTED_KEY;
  try {
    const key = "fixture-explicit-selected-credential";
    const userCredential = "fixture-adopter-setting-credential";
    const hosts = await inspectInstalledGraphHosts(fixture.root, () =>
      Promise.resolve({ exitCode: 0, stdout: userCredential }),
    );
    expect(JSON.stringify(hosts)).not.toContain(userCredential);
    expect(hosts.every((host) => host.version === undefined)).toBe(true);
    process.env.QFAI_TEST_SELECTED_KEY = key;
    const mcpText = JSON.stringify({
      mcpServers: { adopter: { command: "adopter-tool", env: { TOKEN: userCredential } } },
    });
    const claudeText = JSON.stringify({ env: { SECRET_TOKEN: userCredential } });
    await writeFile(path.join(fixture.root, ".mcp.json"), mcpText);
    await mkdir(path.join(fixture.root, ".claude"));
    await writeFile(path.join(fixture.root, ".claude", "settings.json"), claudeText);
    const hooks = await composeGraphDenialHooks(fixture.root);
    expect(hooks.conflicts.join(" ")).toContain("credential");
    expect(await readFile(path.join(fixture.root, ".mcp.json"), "utf8")).toBe(mcpText);
    expect(await readFile(path.join(fixture.root, ".claude", "settings.json"), "utf8")).toBe(
      claudeText,
    );
    const definition = path.join(fixture.root, ".qfai", "graph-processing.json");
    await writeFile(
      definition,
      JSON.stringify({
        backend: "ollama",
        model: "selected-local-model",
        credentialEnv: "QFAI_TEST_SELECTED_KEY",
      }),
    );
    const result = await prepareDocumentAnalysis(fixture.root, graphifyExtractionFixture(fixture));
    expect(result.status).toBe("prepared");
    expect(fixture.calls.find((call) => call.args.includes("extract"))?.env?.OLLAMA_API_KEY).toBe(
      key,
    );
    const metadata = await readFile(
      path.join(fixture.documentAnalysis, "graphify-out", "managed.json"),
      "utf8",
    );
    expect(metadata).not.toContain(key);
    expect(JSON.stringify({ hooks, result })).not.toContain(key);
    expect(JSON.stringify({ hooks, result })).not.toContain(userCredential);
    await expect(
      readFile(path.join(fixture.documentAnalysis, ".qfai", "graph-processing.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const unsafeDefinition = JSON.stringify({
      backend: "ollama",
      model: "selected-local-model",
      apiKey: key,
    });
    await writeFile(definition, unsafeDefinition);
    fixture.calls.length = 0;
    expect(
      (await prepareDocumentAnalysis(fixture.root, graphifyExtractionFixture(fixture))).status,
    ).toBe("not-ready");
    expect(fixture.calls).toHaveLength(0);
    expect(await readFile(definition, "utf8")).toBe(unsafeDefinition);
    await exploreGraph(fixture.root, { domain: "code", question: "checkout" }, fixture.run);
    for (const call of fixture.calls.filter(
      (item) => item.args.includes("status") || item.args.includes("context"),
    )) {
      expect(call.env?.QFAI_TEST_SELECTED_KEY).toBeUndefined();
      expect(call.env?.CODEGRAPH_NO_UPDATE_CHECK).toBe("1");
      expect(call.env?.HOME).toContain(path.join(fixture.root, ".qfai", "tools", "home"));
    }
  } finally {
    if (previousKey === undefined) delete process.env.QFAI_TEST_SELECTED_KEY;
    else process.env.QFAI_TEST_SELECTED_KEY = previousKey;
    await fixture.dispose();
  }
});

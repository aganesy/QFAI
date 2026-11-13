/**
 * Integration: deliberation records stay out of the Graphify document corpus, and `verify` and
 * `full` report an unparseable root `DESIGN.md` once.
 */
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { GraphConfigUnreadableError, graphAnalysisRoot } from "../../src/core/graph/analysis.js";
import { prepareCodeAnalysis } from "../../src/core/graph/codePreparation.js";
import { prepareDocumentAnalysis } from "../../src/core/graph/documents.js";
import { GRAPH_VERSIONS } from "../../src/core/graph/layout.js";
import { prepareGraphRuntimes } from "../../src/core/graph/prepare.js";
import { exploreGraph } from "../../src/core/graph/query.js";
import { queryPreparedGraph } from "../../src/core/graph/runner.js";
import { validateProject } from "../../src/core/validate.js";
import { codeAnalysisFixture, documentAnalysisFixture } from "../helpers/graphAnalysis.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";
import {
  completedCodeSnapshotFixture,
  completedDocumentSnapshotFixture,
  localCodeGenerationProcess,
} from "../helpers/graphReuse.js";
import { graphCliResult, installedGraphHookResult } from "../helpers/graphCli.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function put(root: string, file: string, content: string): Promise<void> {
  const target = path.join(root, ...file.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf-8");
}

describe("the Graphify document corpus", () => {
  // QFAI:AC-0001-0234-08
  // QFAI:EX-0001-0234-19
  it("holds no file under the deliberation directory, so no query result can name one", async () => {
    const fixture = await documentAnalysisFixture();
    try {
      const record = ".qfai/deliberation/20261112043225-pack-removal.md";
      await put(fixture.root, record, "# Deliberation record: the design rationale\n");
      await put(fixture.root, ".qfai/spec/decisions.md", "# Decisions\n");
      await exploreGraph(fixture.root, { domain: "documents", question: "rationale" }, fixture.run);
      await expect(
        readFile(path.join(fixture.documentAnalysis, ...record.split("/"))),
      ).rejects.toMatchObject({ code: "ENOENT" });
      expect(
        await readFile(
          path.join(fixture.documentAnalysis, ".qfai", "spec", "decisions.md"),
          "utf8",
        ),
      ).toBe("# Decisions\n");

      fixture.calls.length = 0;
      const run: typeof fixture.run = (command, args, options) =>
        args.at(-1) === "inventory" && args.some((arg) => arg.endsWith("graphify-native.py"))
          ? Promise.resolve({ exitCode: 0, stdout: JSON.stringify({ files: [record] }) })
          : fixture.run(command, args, options);
      const answer = await exploreGraph(
        fixture.root,
        { domain: "documents", question: "rationale" },
        run,
      );
      expect(answer.status).toBe("not-ready");
      expect(fixture.calls.some((call) => call.args.includes("query"))).toBe(false);
    } finally {
      await fixture.dispose();
    }
  });

  // QFAI:AC-0001-0234-08
  // QFAI:EX-0001-0234-19
  it("holds no file under a configured deliberation directory", async () => {
    const fixture = await documentAnalysisFixture();
    try {
      await put(fixture.root, "qfai.config.yaml", "paths:\n  deliberationDir: docs\\delib\n");
      const record = "docs/delib/20261113000000-moved.md";
      await put(fixture.root, record, "# Deliberation record: the design rationale\n");
      await put(fixture.root, "docs/guide.md", "# Guide\n");
      await exploreGraph(fixture.root, { domain: "documents", question: "rationale" }, fixture.run);
      await expect(
        readFile(path.join(fixture.documentAnalysis, ...record.split("/"))),
      ).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readFile(path.join(fixture.documentAnalysis, "docs", "guide.md"), "utf8")).toBe(
        "# Guide\n",
      );
    } finally {
      await fixture.dispose();
    }
  });

  // QFAI:AC-0001-0234-08
  // QFAI:EX-0001-0234-19
  it("never restores a cached code analysis holding a file under a configured deliberation directory", async () => {
    const fixture = await completedCodeSnapshotFixture();
    try {
      await put(fixture.root, "qfai.config.yaml", "paths:\n  deliberationDir: docs/delib\n");
      expect(
        await prepareCodeAnalysis(fixture.root, fixture.run, fixture.environment),
      ).toMatchObject({ status: "prepared", source: "restored" });
      await rm(fixture.analysis, { recursive: true });
      const record = ["docs", "delib", "20261113000000-moved.md"];
      await put(fixture.candidate, ["analysis", ...record].join("/"), "# Deliberation record\n");
      expect(
        await prepareCodeAnalysis(
          fixture.root,
          localCodeGenerationProcess(fixture),
          fixture.environment,
        ),
      ).toMatchObject({ status: "prepared", source: "generated" });
      await expect(readFile(path.join(fixture.analysis, ...record))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await fixture.dispose();
    }
  });

  // QFAI:AC-0001-0234-08
  // QFAI:EX-0001-0234-19
  it("never restores a cached document analysis holding a file under a configured deliberation directory", async () => {
    for (const deliberationDir of [".qfai/deliberation", "docs/delib"]) {
      const fixture = await completedDocumentSnapshotFixture();
      try {
        await put(
          fixture.root,
          "qfai.config.yaml",
          `paths:\n  deliberationDir: ${deliberationDir}\n`,
        );
        const cache = path.join(fixture.common, "qfai-graph-cache", "win32-x64", "graphify");
        const [candidate = ""] = await readdir(cache);
        const record = ["docs", "delib", "20261113000000-moved.md"];
        await put(
          path.join(cache, candidate),
          ["analysis", ...record].join("/"),
          "# Deliberation record\n",
        );
        const result = await prepareDocumentAnalysis(
          fixture.root,
          fixture.run,
          undefined,
          fixture.environment,
        );
        // With the record's directory left at the default, the same cached copy is restored.
        expect(result, deliberationDir).toMatchObject({
          status: "prepared",
          source: deliberationDir === "docs/delib" ? "generated" : "restored",
        });
        if (deliberationDir === "docs/delib")
          await expect(
            readFile(path.join(fixture.documentAnalysis, ...record)),
          ).rejects.toMatchObject({ code: "ENOENT" });
      } finally {
        await fixture.dispose();
      }
    }
  });

  const unusableConfigs = {
    "paths: [unclosed\n": "qfai.config.yaml could not be read or parsed.",
    "paths:\n  deliberationDir: 42\n": "qfai.config.yaml gives no usable paths.deliberationDir.",
    "paths: docs\n": "qfai.config.yaml gives no usable paths.deliberationDir.",
    "- a\n": "qfai.config.yaml gives no usable paths.deliberationDir.",
    "paths:\n  deliberationDir: '  '\n": "qfai.config.yaml gives no usable paths.deliberationDir.",
    "paths:\n  deliberationDir: .\n": "qfai.config.yaml gives no usable paths.deliberationDir.",
    "paths:\n  deliberationDir: './'\n": "qfai.config.yaml gives no usable paths.deliberationDir.",
    "paths:\n  deliberationDir: 'docs/..'\n":
      "qfai.config.yaml gives no usable paths.deliberationDir.",
    "paths:\n  deliberationDir: ../records\n":
      "qfai.config.yaml gives no usable paths.deliberationDir.",
  };
  const recovery = "Correct qfai.config.yaml, then retry.";

  // QFAI:AC-0001-0234-08
  // QFAI:EX-0001-0234-20
  it("builds no corpus and runs no query when the configuration gives no usable deliberation directory", async () => {
    for (const [config, message] of Object.entries(unusableConfigs)) {
      const fixture = await documentAnalysisFixture();
      try {
        await put(fixture.root, "qfai.config.yaml", config);
        const record = ".qfai/deliberation/20261113000000-kept.md";
        await put(fixture.root, record, "# Deliberation record: the design rationale\n");
        const answer = queryPreparedGraph(
          fixture.root,
          { domain: "documents", question: "rationale" },
          fixture.run,
        );
        await expect(answer, config).rejects.toBeInstanceOf(GraphConfigUnreadableError);
        await expect(answer, config).rejects.toMatchObject({ message, recovery });
        await expect(
          readFile(path.join(fixture.documentAnalysis, ...record.split("/"))),
        ).rejects.toMatchObject({ code: "ENOENT" });
        expect(fixture.calls.some((call) => call.args.includes("query"))).toBe(false);
        expect(
          fixture.calls.some((call) => call.args.some((arg) => arg.endsWith("graphify-native.py"))),
        ).toBe(false);
      } finally {
        await fixture.dispose();
      }
    }
    const code = await codeAnalysisFixture();
    try {
      await put(code.root, "qfai.config.yaml", "paths: [unclosed\n");
      await expect(
        queryPreparedGraph(code.root, { domain: "code", question: "checkout" }, code.run),
      ).rejects.toBeInstanceOf(GraphConfigUnreadableError);
      expect(code.calls.some((call) => call.args.includes("context"))).toBe(false);
    } finally {
      await code.dispose();
    }
  });

  // QFAI:AC-0001-0234-08
  // QFAI:EX-0001-0234-20
  it("prepares no analysis when the configuration gives no usable deliberation directory", async () => {
    for (const domain of ["code", "documents"] as const) {
      const fixture =
        domain === "code" ? await codeAnalysisFixture() : await documentAnalysisFixture();
      try {
        await rm(graphAnalysisRoot(fixture.root, domain === "code" ? "codegraph" : "graphify"), {
          recursive: true,
        });
        await put(fixture.root, "qfai.config.yaml", "paths: [unclosed\n");
        const prepared = queryPreparedGraph(
          fixture.root,
          { domain, question: "rationale" },
          fixture.run,
        );
        await expect(prepared, domain).rejects.toBeInstanceOf(GraphConfigUnreadableError);
        await expect(prepared, domain).rejects.toMatchObject({
          message: unusableConfigs["paths: [unclosed\n"],
          recovery,
        });
        expect(
          fixture.calls.some((call) =>
            domain === "code"
              ? call.args.some((arg) => arg.endsWith("codegraph-native.mjs"))
              : call.args.includes("extract"),
          ),
          domain,
        ).toBe(false);
      } finally {
        await fixture.dispose();
      }
    }
  });

  // QFAI:AC-0001-0234-08
  // QFAI:EX-0001-0234-20
  it("grants no fallback when the configuration gives no usable deliberation directory", async () => {
    const fixture = await codeAnalysisFixture();
    try {
      await writeFile(
        path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
        '{"kind":"graph-enforcement","denyExploration":true}',
      );
      const event = {
        tool_name: "Bash",
        tool_input: { command: "rg legacy packages/" },
        session_id: "unusable-config-session",
        cwd: fixture.root,
      };
      const observed = await installedGraphHookResult(fixture.root, event);
      const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(observed.output)?.[1] ?? "";
      await put(fixture.root, "qfai.config.yaml", "paths: [unclosed\n");
      const result = await graphCliResult(
        fixture.root,
        [
          "fallback",
          "--attempt-id",
          attemptId,
          "--question",
          "legacy callers",
          "--reason",
          "Graph scope is incomplete.",
        ],
        fixture.run,
      );
      expect(result.value).toMatchObject({
        status: "failed",
        permitted: false,
        failure: unusableConfigs["paths: [unclosed\n"],
        recovery,
      });
      expect(fixture.calls.some((call) => call.args.includes("context"))).toBe(false);
      expect((await installedGraphHookResult(fixture.root, event)).output).toContain(
        '"permissionDecision":"deny"',
      );
    } finally {
      await fixture.dispose();
    }
  });

  // QFAI:AC-0001-0234-08
  // QFAI:EX-0001-0234-20
  it("lets a second init finish with code analysis not ready", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-unusable-config-"));
    roots.push(root);
    const fixture = graphProcessFixture();
    await prepareGraphRuntimes(root, fixture.run);
    const analysis = graphAnalysisRoot(root, "codegraph");
    await put(analysis, ".codegraph/codegraph.db", "native-status port fixture\n");
    const run: typeof fixture.run = (command, args, options) =>
      args.includes("status")
        ? Promise.resolve({
            exitCode: 0,
            stdout: JSON.stringify({
              initialized: true,
              version: GRAPH_VERSIONS.codegraph,
              projectPath: analysis,
              worktreeMismatch: null,
              pendingChanges: { added: 0, modified: 0, removed: 0 },
              index: {
                state: "complete",
                pendingRefs: 0,
                reindexRecommended: false,
                builtWithExtractionVersion: 1,
                currentExtractionVersion: 1,
                builtWithVersion: GRAPH_VERSIONS.codegraph,
              },
            }),
          })
        : fixture.run(command, args, options);
    await put(root, "qfai.config.yaml", "paths:\n  deliberationDir: .qfai/deliberation\n");
    expect(await prepareGraphRuntimes(root, run)).toMatchObject({ code: "code-ready" });
    await put(root, "qfai.config.yaml", "paths: [unclosed\n");
    const result = await prepareGraphRuntimes(root, run);
    expect(result).toMatchObject({ runtime: "installed", code: "code-not-ready" });
    expect(result.failedStep).toBeUndefined();
  });
});

describe("an unparseable root DESIGN.md", () => {
  async function project(withScreen: boolean): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-dcon033-once-"));
    roots.push(root);
    if (withScreen) {
      await put(
        root,
        ".qfai/spec/03_contract/ui/ui-0001-home.yaml",
        "# QFAI-CONTRACT-ID: UI-0001\nscreens:\n  - id: SCR-001\n    title: Home\n    route: /\n",
      );
    }
    await put(root, "DESIGN.md", "no front matter here\n");
    return root;
  }

  // QFAI:AC-0001-0042-14
  // QFAI:EX-0001-0042-16
  it("is reported once by verify and by full, with or without a UI contract", async () => {
    for (const withScreen of [true, false]) {
      const root = await project(withScreen);
      for (const profile of ["verify", "full"] as const) {
        const { issues } = await validateProject(root, await loadConfig(root), { profile });
        const label = `${profile}, UI contract: ${withScreen}`;
        expect(
          issues.filter((issue) => issue.code === "QFAI-DCON-033"),
          label,
        ).toHaveLength(1);
        const keys = issues.map(
          (issue) => `${issue.code}\u0000${issue.file}\u0000${issue.message}`,
        );
        expect(new Set(keys).size, label).toBe(keys.length);
      }
    }
  });
});

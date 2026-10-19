import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
  GRAPH_VERSIONS,
  graphRuntimePaths,
  prepareGraphRuntimes,
} from "../../../src/core/graph/prepare.js";
import { renderGraphPreparation } from "../../../src/core/graph/presentation.js";
import { graphProcessFixture } from "../../helpers/graphProcess.js";
import { graphAnalysisRoot } from "../../../src/core/graph/analysis.js";

// QFAI:EX-0001-0237-05
// Mutation: packages/qfai/src/core/graph/prepare.ts `recovery: "Install Python 3.10 or later and uv, then run qfai init again."` -> `recovery: "Install Python 3.9 and uv, then run qfai init again."` fails "reports an unmet interpreter prerequisite with a recovery action"
it("reports an unmet interpreter prerequisite with a recovery action", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-prerequisite-"));
  const fixture = graphProcessFixture();
  try {
    const result = await prepareGraphRuntimes(root, (command, args, options) =>
      command === "uv" && args[0] === "venv"
        ? Promise.resolve({ exitCode: 1, stdout: "" })
        : fixture.run(command, args, options),
    );
    expect(result.runtime).toBe("not-ready");
    expect(result.failedStep).toContain("Python 3.10+");
    expect(renderGraphPreparation(result)).toContain("Install Python 3.10 or later and uv");
    expect(renderGraphPreparation(result)).toContain("CodeGraph: not-ready");
    expect(renderGraphPreparation(result)).toContain("Graphify: not-ready");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-21
// Mutation: packages/qfai/src/core/graph/prepare.ts `(await inspectCurrentCodeAnalysis(root, run)) ? "code-ready" : "code-not-ready"` -> `(await inspectCurrentCodeAnalysis(root, run)) ? "code-not-ready" : "code-ready"` fails "reports current code analysis without starting another analysis or document model"
it("reports current code analysis without starting another analysis or document model", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-current-"));
  const fixture = graphProcessFixture();
  try {
    await prepareGraphRuntimes(root, fixture.run);
    await writeFile(path.join(root, "source.ts"), "export const current = true;\n");
    const analysis = graphAnalysisRoot(root, "codegraph");
    await mkdir(path.join(analysis, ".codegraph"), { recursive: true });
    await writeFile(
      path.join(analysis, ".codegraph", "codegraph.db"),
      "native-status port fixture\n",
    );
    const calls: string[][] = [];
    const result = await prepareGraphRuntimes(root, async (command, args, options) => {
      if (args.includes("status")) {
        calls.push([...args]);
        return {
          exitCode: 0,
          stdout: JSON.stringify({
            initialized: true,
            version: "1.6.2",
            projectPath: analysis,
            worktreeMismatch: null,
            pendingChanges: { added: 0, modified: 0, removed: 0 },
            index: {
              state: "complete",
              pendingRefs: 0,
              reindexRecommended: false,
              builtWithExtractionVersion: 1,
              currentExtractionVersion: 1,
              builtWithVersion: "1.6.2",
            },
          }),
        };
      }
      return fixture.run(command, args, options);
    });
    expect(result.code).toBe("code-ready");
    expect(result.documents).toBe("documents-not-ready");
    expect(calls).toHaveLength(1);
    expect(
      fixture.calls.some(
        (call) =>
          call.args.includes("index") ||
          call.args.includes("extract") ||
          call.args.includes("serve"),
      ),
    ).toBe(false);
    expect(await readFile(path.join(analysis, "source.ts"), "utf8")).toBe(
      "export const current = true;\n",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-20
// Mutation: packages/qfai/src/core/graph/presentation.ts `${preparation.documents}` -> `${preparation.code}` fails "distinguishes installed tools from unset document processing"
it("distinguishes installed tools from unset document processing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-readiness-"));
  const fixture = graphProcessFixture();
  try {
    const result = await prepareGraphRuntimes(root, fixture.run);
    const output = renderGraphPreparation(result);
    expect(result.failedStep).toBeUndefined();
    expect(output).toContain("CodeGraph: installed");
    expect(output).toContain("Graphify: installed");
    expect(output).toContain("  documents-not-ready");
    expect(output).toContain(".qfai/graph-processing.json");
    expect(output).toContain(".agents/rules/graph-exploration.md");
    expect(output).toContain("node .qfai/tools/graph-cli.mjs documents");
    expect(
      fixture.calls.some(
        (call) => call.args.includes("extract") || call.args.includes("--backend"),
      ),
    ).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-15
// Mutation: packages/qfai/src/core/graph/prepare.ts `graphifyVersion.stdout.trim() !== GRAPH_VERSIONS.graphify` -> `false` fails "does not activate a replacement with an unsupported version"
it("does not activate a replacement with an unsupported version", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-incompatible-"));
  const fixture = graphProcessFixture();
  try {
    await prepareGraphRuntimes(root, fixture.run);
    const paths = graphRuntimePaths(root);
    const prior = await readFile(paths.python);
    const result = await prepareGraphRuntimes(root, (command, args, options) =>
      args.includes("-c")
        ? Promise.resolve({ exitCode: 0, stdout: "99.0.0" })
        : fixture.run(command, args, options),
    );
    expect(result.failedStep).toBe("Graphify compatibility");
    expect(result.runtime).toBe("not-ready");
    expect(await readFile(paths.python)).toEqual(prior);
    expect(renderGraphPreparation(result)).toContain("Previous installation: retained");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-14
// Mutation: packages/qfai/src/core/graph/prepare.ts `previousInstallation: codegraphReady || graphifyReady ? "retained" : "none",` -> `previousInstallation: "none",` fails "retains the prior installation after an interrupted replacement download"
it("retains the prior installation after an interrupted replacement download", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-download-"));
  const fixture = graphProcessFixture();
  try {
    await prepareGraphRuntimes(root, fixture.run);
    const paths = graphRuntimePaths(root);
    const prior = await readFile(paths.codegraph);
    const result = await prepareGraphRuntimes(root, (command, args, options) => {
      if (command === paths.python) return Promise.resolve({ exitCode: 0, stdout: "0.9.85" });
      if (args[0] === "pip") return Promise.resolve({ exitCode: 1, stdout: "" });
      return fixture.run(command, args, options);
    });
    expect(result.runtime).toBe("not-ready");
    expect(result.failedStep).toBe("Graphify download");
    expect(await readFile(paths.codegraph)).toEqual(prior);
    expect(renderGraphPreparation(result)).toContain("Previous installation: retained");
    expect(renderGraphPreparation(result)).toContain("CodeGraph: installed");
    expect(renderGraphPreparation(result)).toContain("Graphify: not-ready");
    const inverse = await prepareGraphRuntimes(root, (command, args, options) => {
      if (args.includes("--version")) return Promise.resolve({ exitCode: 0, stdout: "1.6.1" });
      if (args.includes("install") && args.includes("--prefix"))
        return Promise.resolve({ exitCode: 1, stdout: "" });
      return fixture.run(command, args, options);
    });
    expect(inverse.failedStep).toBe("CodeGraph download");
    expect(renderGraphPreparation(inverse)).toContain("CodeGraph: not-ready");
    expect(renderGraphPreparation(inverse)).toContain("Graphify: installed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-22
// Mutation: packages/qfai/src/core/graph/prepare.ts `command.join(" ")` -> `command[0]` fails "names a command to rerun a failed download by hand"
it("names a command to rerun a failed download by hand", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-rerun-"));
  const fixture = graphProcessFixture();
  try {
    const graphify = renderGraphPreparation(
      await prepareGraphRuntimes(root, (command, args, options) =>
        args[0] === "pip"
          ? Promise.resolve({ exitCode: 1, stdout: "" })
          : fixture.run(command, args, options),
      ),
    );
    expect(graphify).toContain("Failed step: Graphify download");
    expect(graphify).toContain("To see the cause, run: uv pip install --target ");
    expect(graphify).toContain(`"graphifyy[ollama]==${GRAPH_VERSIONS.graphify}"`);
    expect(graphify).not.toContain("reported cause");
    const codegraph = renderGraphPreparation(
      await prepareGraphRuntimes(root, (command, args, options) =>
        args.includes("install") && args.includes("--prefix")
          ? Promise.resolve({ exitCode: 1, stdout: "" })
          : fixture.run(command, args, options),
      ),
    );
    expect(codegraph).toContain("Failed step: CodeGraph download");
    expect(codegraph).toContain("To see the cause, run: npm install --prefix ");
    expect(codegraph).toContain(`@colbymchenry/codegraph@${GRAPH_VERSIONS.codegraph}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

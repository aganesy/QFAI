import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  codeAnalysisFixture,
  documentAnalysisFixture,
  graphifyExtractionFixture,
} from "./graphAnalysis.js";
import { GRAPH_VERSIONS } from "../../src/core/graph/layout.js";
import { graphReuseEnvironment } from "../../src/core/graph/reuse.js";
import type { GraphProcess } from "../../src/core/graph/process.js";
import { prepareDocumentAnalysis } from "../../src/core/graph/documents.js";

export async function completedDocumentSnapshotFixture(
  environment = { ...graphReuseEnvironment(), platform: "win32", architecture: "x64" },
) {
  const fixture = await documentAnalysisFixture();
  const common = await mkdtemp(path.join(os.tmpdir(), "qfai-document-acceptance-cache-"));
  const native = graphifyExtractionFixture(fixture);
  const observed: string[][] = [];
  const run: GraphProcess = async (command, args, options) => {
    observed.push([...args]);
    if (command === "git") return { exitCode: 0, stdout: common };
    if (args.includes("-c")) return { exitCode: 0, stdout: "3.12.13" };
    if (args.at(-1) === "inventory")
      return { exitCode: 0, stdout: '{"files":["checkout.ts","rationale.md"]}' };
    return native(command, args, options);
  };
  try {
    await rm(fixture.documentAnalysis, { recursive: true });
    const prepared = await prepareDocumentAnalysis(fixture.root, run, undefined, environment);
    if (prepared.status !== "prepared" || prepared.reuse !== "published")
      throw new Error("Completed document fixture was not published");
    await rm(fixture.documentAnalysis, { recursive: true });
    observed.length = 0;
    fixture.calls.length = 0;
    return {
      ...fixture,
      common,
      environment,
      observed,
      run,
      dispose: async () => {
        await fixture.dispose();
        await rm(common, { recursive: true, force: true });
      },
    };
  } catch (cause: unknown) {
    await fixture.dispose();
    await rm(common, { recursive: true, force: true });
    throw cause;
  }
}

export async function completedCodeSnapshotFixture() {
  const fixture = await codeAnalysisFixture();
  const common = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-repository-cache-"));
  const environment = { ...graphReuseEnvironment(), platform: "win32", architecture: "x64" };
  const candidate = path.join(
    common,
    "qfai-graph-cache",
    "win32-x64",
    "codegraph",
    "completed-fixture",
  );
  await mkdir(candidate, { recursive: true });
  await cp(fixture.analysis, path.join(candidate, "analysis"), { recursive: true });
  await cp(path.join(fixture.root, "checkout.ts"), path.join(candidate, "analysis", "checkout.ts"));
  await writeFile(
    path.join(candidate, "completed.json"),
    JSON.stringify({
      layout: 1,
      corpusPolicy: 1,
      repository: common,
      environment,
      engineVersion: GRAPH_VERSIONS.codegraph,
    }),
  );
  await rm(fixture.analysis, { recursive: true });
  const observed: string[][] = [];
  const run: GraphProcess = async (command, args, options) => {
    observed.push([...args]);
    if (command === "git") return { exitCode: 0, stdout: common + "\n" };
    if (args.at(-1) === "inventory") return { exitCode: 0, stdout: '{"files":["checkout.ts"]}' };
    if (args.length === 1 && args[0] === "--version") return { exitCode: 0, stdout: "v24.16.0\n" };
    const result = await fixture.run(command, args, options);
    if (args.includes("status")) {
      const status: Record<string, unknown> = JSON.parse(result.stdout);
      status.projectPath = args[2];
      return { ...result, stdout: JSON.stringify(status) };
    }
    return result;
  };
  return {
    ...fixture,
    common,
    candidate,
    environment,
    observed,
    run,
    dispose: async () => {
      await fixture.dispose();
      await rm(common, { recursive: true, force: true });
    },
  };
}

export function localCodeGenerationProcess(
  fixture: Pick<Awaited<ReturnType<typeof completedCodeSnapshotFixture>>, "run" | "observed">,
  repositoryAvailable = true,
): GraphProcess {
  return async (command, args, options) => {
    if (command === "git" && !repositoryAvailable) {
      fixture.observed.push([...args]);
      return { exitCode: 1, stdout: "" };
    }
    if (
      ["inventory", "coverage"].includes(args.at(-1) ?? "") ||
      !args.some((arg) => arg.endsWith("codegraph-native.mjs"))
    )
      return fixture.run(command, args, options);
    fixture.observed.push([...args]);
    const staged = args[3];
    if (!staged) throw new Error("Expected a private native CodeGraph corpus");
    await mkdir(path.join(staged, ".codegraph"), { recursive: true });
    await writeFile(
      path.join(staged, ".codegraph", "codegraph.db"),
      "Native generation process-port marker",
    );
    return { exitCode: 0, stdout: "" };
  };
}

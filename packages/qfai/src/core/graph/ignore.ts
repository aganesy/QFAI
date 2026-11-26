import { readFile } from "node:fs/promises";
import path from "node:path";
import { isEnoent } from "../fs/errno.js";
import { findUnsafeHostFileComponent } from "../init/fsGuards.js";
import { isPathIgnored } from "../gitignore.js";
import { replaceFile } from "../runLog.js";
import {
  GRAPH_ANALYSIS_ENGINES,
  GRAPH_CLI_ENTRYPOINT,
  GRAPH_ENTRYPOINT_RECORD,
  GRAPH_LOCK_FILE,
  GRAPH_STAGING_STEPS,
  graphAnalysisRoot,
  graphAnalysisStaging,
  graphCodegraphInstallDirectory,
  graphPrivateHome,
  graphRetainedDirectory,
  graphRuntimeFiles,
  graphRuntimePaths,
  graphRuntimeStaging,
  graphStatePath,
  graphToolsDirectory,
} from "./layout.js";
import type { GraphProcess } from "./process.js";

/** The files a graph preparation step wrote, and the conflicts it left for the adopter. */
export interface GraphPreparedFiles {
  files: string[];
  conflicts: string[];
}

export const GRAPH_IGNORE_MARKER = "# QFAI graph analysis (local)";

/** Stands for the random id each staging or retained directory carries. */
const SAMPLE_ID = "00000000-0000-4000-8000-000000000000";

/**
 * One path inside each place graph preparation and queries write, built from the helpers that
 * decide where each writer puts it: analysis, every name it is staged or retained under, runtimes
 * and theirs, local state, each engine's private home and cache, the CodeGraph install directory,
 * and the entrypoints. A rule more specific than `/.qfai/tools/` can leave any one of them visible.
 */
function graphOutputSamples(): string[] {
  const root = "";
  const samples: string[] = [];
  for (const engine of GRAPH_ANALYSIS_ENGINES) {
    const current = graphAnalysisRoot(root, engine);
    const output =
      engine === "codegraph"
        ? path.join(".codegraph", "codegraph.db")
        : path.join("graphify-out", "graph.json");
    samples.push(path.join(current, output));
    for (const step of GRAPH_STAGING_STEPS)
      samples.push(path.join(graphAnalysisStaging(current, step, engine, SAMPLE_ID), output));
  }
  samples.push(
    path.join(
      graphRetainedDirectory(graphAnalysisRoot(root, "codegraph"), SAMPLE_ID),
      "graph.json",
    ),
  );
  const runtime = graphRuntimePaths(root);
  const staged = graphRuntimeFiles(graphRuntimeStaging(runtime.directory, SAMPLE_ID.slice(0, 8)));
  samples.push(
    runtime.codegraph,
    runtime.python,
    staged.python,
    path.join(graphRetainedDirectory(runtime.directory, SAMPLE_ID), "pyvenv.cfg"),
    path.join(graphStatePath(root), GRAPH_LOCK_FILE),
  );
  for (const engine of ["codegraph", "graphify"] as const)
    samples.push(path.join(graphPrivateHome(root, engine), ".cache", "entry.json"));
  samples.push(
    path.join(graphCodegraphInstallDirectory(graphPrivateHome(root, "codegraph")), "entry.json"),
    path.join(graphToolsDirectory(root), GRAPH_CLI_ENTRYPOINT),
    path.join(graphToolsDirectory(root), GRAPH_ENTRYPOINT_RECORD),
  );
  // Git names each path with forward slashes, relative to the root.
  return samples.map((sample) => sample.split(path.sep).join(path.posix.sep));
}

export async function ensureGraphGitignore(
  root: string,
  run: GraphProcess,
): Promise<GraphPreparedFiles> {
  if (await findUnsafeHostFileComponent(root, [".gitignore"])) return conflict([]);
  const file = path.join(root, ".gitignore");
  let content = "";
  try {
    content = await readFile(file, "utf8");
  } catch (cause: unknown) {
    if (!isEnoent(cause)) throw cause;
  }
  const tracked = await run("git", ["ls-files", "-z", "--", ".qfai/tools/"], { cwd: root });
  if (tracked.exitCode === 0 && tracked.stdout !== "") {
    return {
      files: [],
      conflicts: [
        "Git already tracks generated output under .qfai/tools/. " +
          "From the repository root, review the indexed paths with `git ls-files -- .qfai/tools/`. " +
          "If you want a generated file to stay local, remove its index entry with `git rm --cached -- <path>`. " +
          "This keeps the files in your working tree. Keep an effective ignore rule for future output.",
      ],
    };
  }
  if (content.includes(GRAPH_IGNORE_MARKER)) {
    const visible = await unignoredGraphOutputs(root, content, run);
    return visible.length === 0 ? { files: [], conflicts: [] } : conflict(visible);
  }
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const separator = content.length > 0 && !content.endsWith("\n") ? newline : "";
  // Renamed into place, so another hard-linked name of the file keeps the bytes it had.
  await replaceFile(
    file,
    `${content}${separator}${GRAPH_IGNORE_MARKER}${newline}/.qfai/tools/${newline}`,
  );
  return { files: [".gitignore"], conflicts: [] };
}

/**
 * The graph output samples Git would still see. Outside a repository (exit 128) the root file
 * alone answers; any other failure counts every sample as visible.
 */
async function unignoredGraphOutputs(
  root: string,
  content: string,
  run: GraphProcess,
): Promise<string[]> {
  const samples = graphOutputSamples();
  // Without --verbose, Git lists only the ignored paths; a path a negation re-includes is absent.
  const checked = await run("git", ["check-ignore", "--no-index", "--", ...samples], { cwd: root });
  if (checked.exitCode === 0 || checked.exitCode === 1) {
    const ignored = new Set(checked.stdout.split(/\r?\n/));
    return samples.filter((sample) => !ignored.has(sample));
  }
  if (checked.exitCode !== 128) return samples;
  const lines = content.split(/\r?\n/);
  return samples.filter((sample) => !isPathIgnored(lines, sample));
}

function conflict(visible: readonly string[]): GraphPreparedFiles {
  const named = visible.length === 0 ? "" : ` Git still sees ${visible.join(", ")}.`;
  return {
    files: [],
    conflicts: [
      `Retain your Git choices.${named} Review .gitignore and explicitly exclude .qfai/tools/ before sharing generated analysis.`,
    ],
  };
}

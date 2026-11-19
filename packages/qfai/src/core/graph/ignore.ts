import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isEnoent } from "../fs/errno.js";
import { findUnsafeHostFileComponent } from "../init/fsGuards.js";
import { isPathIgnored } from "../gitignore.js";
import { graphEnvironmentKey } from "./layout.js";
import type { GraphProcess } from "./process.js";

/** The files a graph preparation step wrote, and the conflicts it left for the adopter. */
export interface GraphPreparedFiles {
  files: string[];
  conflicts: string[];
}

export const GRAPH_IGNORE_MARKER = "# QFAI graph analysis (local)";

/**
 * One path inside each place graph preparation and queries write: analysis and its staging,
 * runtimes and their staging, local state, each engine's private home and cache, and the
 * entrypoints. A rule more specific than `/.qfai/tools/` can leave any one of them visible.
 */
export function graphOutputSamples(key: string = graphEnvironmentKey()): string[] {
  const tools = ".qfai/tools";
  const analysis = `${tools}/analysis/${key}`;
  const runtimes = `${tools}/runtimes`;
  const home = `${tools}/home/${key}`;
  return [
    `${analysis}/codegraph/.codegraph/codegraph.db`,
    `${analysis}/graphify/graphify-out/graph.json`,
    `${analysis}/graphify-code/graphify-out/graph.json`,
    `${analysis}/.preparing-graphify-code-00000000-0000-4000-8000-000000000000/graphify-out/managed.json`,
    `${runtimes}/${key}/codegraph/node_modules/@colbymchenry/codegraph/npm-shim.js`,
    `${runtimes}/${key}/graphify/pyvenv.cfg`,
    `${runtimes}/.p-00000000/graphify/pyvenv.cfg`,
    `${tools}/state/${key}/analysis.lock`,
    `${home}/codegraph/.cache/entry.json`,
    `${home}/graphify/.cache/entry.json`,
    `${tools}/graph-cli.mjs`,
    `${tools}/graph-entrypoints.json`,
  ];
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
  if (tracked.exitCode === 0 && tracked.stdout !== "") return conflict([]);
  if (content.includes(GRAPH_IGNORE_MARKER)) {
    const visible = await unignoredGraphOutputs(root, content, run);
    return visible.length === 0 ? { files: [], conflicts: [] } : conflict(visible);
  }
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const separator = content.length > 0 && !content.endsWith("\n") ? newline : "";
  await writeFile(
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

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isEnoent } from "../fs/errno.js";
import { findUnsafeHostFileComponent } from "../init/fsGuards.js";
import { isPathIgnored } from "../gitignore.js";
import type { GraphProcess } from "./process.js";
import type { GraphSettingsComposition } from "./hostSettings.js";

export const GRAPH_IGNORE_MARKER = "# QFAI graph analysis (local)";

export async function ensureGraphGitignore(
  root: string,
  run: GraphProcess,
): Promise<GraphSettingsComposition> {
  if (await findUnsafeHostFileComponent(root, [".gitignore"])) return conflict();
  const file = path.join(root, ".gitignore");
  let content = "";
  try {
    content = await readFile(file, "utf8");
  } catch (cause: unknown) {
    if (!isEnoent(cause)) throw cause;
  }
  const tracked = await run("git", ["ls-files", "-z", "--", ".qfai/tools/"], { cwd: root });
  if (tracked.exitCode === 0 && tracked.stdout !== "") return conflict();
  if (content.includes(GRAPH_IGNORE_MARKER)) {
    const sample = ".qfai/tools/analysis/current/graph.json";
    const ignored = await run("git", ["check-ignore", "--no-index", "-q", sample], { cwd: root });
    if (
      ignored.exitCode === 0 ||
      (ignored.exitCode === 128 && isPathIgnored(content.split(/\r?\n/), sample))
    )
      return { files: [], conflicts: [] };
    return conflict();
  }
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const separator = content.length > 0 && !content.endsWith("\n") ? newline : "";
  await writeFile(
    file,
    `${content}${separator}${GRAPH_IGNORE_MARKER}${newline}/.qfai/tools/${newline}`,
  );
  return { files: [".gitignore"], conflicts: [] };
}

function conflict(): GraphSettingsComposition {
  return {
    files: [],
    conflicts: [
      "Retain your Git choices. Review .gitignore and explicitly exclude .qfai/tools/ before sharing generated analysis.",
    ],
  };
}

import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getInitAssetsDir } from "../../shared/assets.js";
import { isEnoent } from "../fs/errno.js";
import { findUnsafeHostFileComponent, readPinnedRegularFile } from "../init/fsGuards.js";
import { assertGraphStoragePath } from "./storage.js";
import type { GraphSettingsComposition } from "./hostSettings.js";

export async function installGraphEntrypoints(root: string): Promise<GraphSettingsComposition> {
  const directory = path.join(root, ".qfai", "tools");
  await assertGraphStoragePath(root, directory);
  const bundle = path.resolve(getInitAssetsDir(), "..", "..", "dist", "graph");
  const sources: Record<string, string> = {
    "graph-cli.mjs": wrapper(path.join(bundle, "cli.mjs"), "runInstalledGraphCli"),
    "graph-hook.mjs": wrapper(path.join(bundle, "hook.mjs"), "runInstalledGraphHook"),
    "graph-enforcement.json":
      JSON.stringify({ kind: "graph-enforcement", denyExploration: true }) + "\n",
  };
  const record = "graph-entrypoints.json";
  const names = [...Object.keys(sources), record];
  for (const name of names) {
    if (await findUnsafeHostFileComponent(root, [".qfai", "tools", name])) return conflict();
    try {
      const stats = await lstat(path.join(directory, name));
      if (!stats.isFile() || stats.nlink !== 1) return conflict();
    } catch (cause: unknown) {
      if (!isEnoent(cause)) throw cause;
    }
  }
  let previous: Record<string, unknown> = {};
  try {
    const text = await readPinnedRegularFile(path.join(directory, record), 65536);
    if (text === null) return conflict();
    const parsed: unknown = JSON.parse(text);
    if (
      !object(parsed) ||
      parsed.kind !== "graph-entrypoints" ||
      !object(parsed.sources) ||
      Object.keys(parsed).length !== 2
    )
      return conflict();
    const recorded = parsed.sources;
    if (
      Object.keys(recorded).some((name) => !(name in sources) || typeof recorded[name] !== "string")
    )
      return conflict();
    previous = recorded;
  } catch (cause: unknown) {
    if (cause instanceof SyntaxError) return conflict();
    if (!isEnoent(cause)) throw cause;
  }
  const missing: string[] = [];
  for (const [name, source] of Object.entries(sources)) {
    try {
      const text = await readFile(path.join(directory, name), "utf8");
      if (text !== source && text !== previous[name]) return conflict();
      if (text !== source) missing.push(name);
    } catch (cause: unknown) {
      if (!isEnoent(cause)) throw cause;
      missing.push(name);
    }
  }
  await mkdir(directory, { recursive: true });
  for (const [name, source] of Object.entries(sources))
    if (missing.includes(name)) await writeFile(path.join(directory, name), source);
  const ownership = JSON.stringify({ kind: "graph-entrypoints", sources }) + "\n";
  if (missing.length > 0 || Object.keys(previous).length === 0)
    await writeFile(path.join(directory, record), ownership);
  return { files: missing.map((name) => `.qfai/tools/${name}`), conflicts: [] };
}

function wrapper(bundle: string, entry: string): string {
  return [
    'import { fileURLToPath } from "node:url";',
    'import { realpath } from "node:fs/promises";',
    'import path from "node:path";',
    'const root = await realpath(fileURLToPath(new URL("../../", import.meta.url)));',
    "const cwd = await realpath(process.cwd());",
    "const relative = path.relative(root, cwd);",
    'if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {',
    '  process.stderr.write("Graph project mismatch. Run qfai init in this worktree.\\n");',
    "  process.exitCode = 2;",
    "} else {",
    `  const { ${entry} } = await import(${JSON.stringify(pathToFileURL(bundle).href)});`,
    `  await ${entry}(root, process.argv.slice(2));`,
    "}",
    "",
  ].join("\n");
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function conflict(): GraphSettingsComposition {
  return {
    files: [],
    conflicts: [
      "Retain edited graph entrypoints. Review .qfai/tools before repairing graph protection.",
    ],
  };
}

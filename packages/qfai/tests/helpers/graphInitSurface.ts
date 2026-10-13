import path from "node:path";
import { pathToFileURL } from "node:url";

/** Exact output of the isolated acquisition fixture and the reviewed managed wrappers. */
export function reviewedGraphInitFiles(packageRoot: string): ReadonlyMap<string, string> {
  const sources = {
    "graph-cli.mjs": reviewedWrapper(packageRoot, "cli", "runInstalledGraphCli"),
    "graph-hook.mjs": reviewedWrapper(packageRoot, "hook", "runInstalledGraphHook"),
    "graph-enforcement.json":
      JSON.stringify({ kind: "graph-enforcement", denyExploration: true }) + "\n",
  };
  const runtime = `.qfai/tools/runtimes/${process.platform}-${process.arch}`;
  return new Map([
    ...Object.entries(sources).map(([name, text]): [string, string] => [
      `.qfai/tools/${name}`,
      text,
    ]),
    [
      ".qfai/tools/graph-entrypoints.json",
      JSON.stringify({ kind: "graph-entrypoints", sources }) + "\n",
    ],
    [
      `${runtime}/codegraph/node_modules/@colbymchenry/codegraph/npm-shim.js`,
      "fixture executable\n",
    ],
    [
      `${runtime}/graphify/${process.platform === "win32" ? "Scripts/python.exe" : "bin/python"}`,
      "fixture interpreter\n",
    ],
  ]);
}

function reviewedWrapper(packageRoot: string, bundle: string, entry: string): string {
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
    `  const { ${entry} } = await import(${JSON.stringify(pathToFileURL(path.join(packageRoot, "dist", "graph", `${bundle}.mjs`)).href)});`,
    `  await ${entry}(root, process.argv.slice(2));`,
    "}",
    "",
  ].join("\n");
}

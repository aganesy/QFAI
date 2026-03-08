/* global console, process */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const futureTscPath = path.join(repoRoot, "node_modules", "typescript-future", "bin", "tsc");

const ignoredDirs = new Set([".git", "dist", "node_modules", "tmp"]);
const tsconfigPattern = /^tsconfig(?:\..+)?\.json$/u;

function collectTsconfigFiles(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      files.push(...collectTsconfigFiles(entryPath));
      continue;
    }

    if (entry.isFile() && tsconfigPattern.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

const tsconfigFiles = collectTsconfigFiles(repoRoot);
const ignoredDeprecationFiles = tsconfigFiles.filter((filePath) =>
  readFileSync(filePath, "utf8").includes('"ignoreDeprecations"'),
);

if (ignoredDeprecationFiles.length > 0) {
  console.error("TypeScript deprecations must not be silenced with ignoreDeprecations:");
  for (const filePath of ignoredDeprecationFiles) {
    console.error(`- ${path.relative(repoRoot, filePath)}`);
  }
  process.exit(1);
}

const result = spawnSync(process.execPath, [futureTscPath, "-b", "--pretty", "false"], {
  cwd: repoRoot,
  encoding: "utf-8",
});

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Future TypeScript compatibility check passed.");

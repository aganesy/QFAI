/* global console, process */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const futureTscPath = path.join(repoRoot, "node_modules", "typescript-future", "bin", "tsc");

const ignoredDirs = new Set([".git", "dist", "node_modules", "tmp"]);
const tsconfigPattern = /^tsconfig(?:\..+)?\.json$/u;

/**
 * The build configuration, which is scanned on different terms from a tsconfig.
 *
 * A tsconfig's compiler options are this repository's own, so a deprecation silenced
 * there is one this tree relies on. A bundler's are not: it builds its declaration
 * rollup with options of its own choosing, and the only lever over an option it injects
 * unconditionally is to silence what the compiler says about it. Refusing that would not
 * remove the option; it would remove the declarations.
 *
 * So one of these is refused and the other is REPORTED. An exemption nobody sees is one
 * nobody reviews, and the guard that reads only tsconfigs would have reported none.
 */
const buildConfigPattern = /^tsup\.config\.(?:ts|mts|cts|js|mjs|cjs)$/u;

function collectConfigFiles(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const tsconfigs = [];
  const buildConfigs = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      const nested = collectConfigFiles(entryPath);
      tsconfigs.push(...nested.tsconfigs);
      buildConfigs.push(...nested.buildConfigs);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }
    if (tsconfigPattern.test(entry.name)) {
      tsconfigs.push(entryPath);
    } else if (buildConfigPattern.test(entry.name)) {
      buildConfigs.push(entryPath);
    }
  }

  return { tsconfigs, buildConfigs };
}

/**
 * Whether a tsconfig sets `compilerOptions.ignoreDeprecations`.
 *
 * Read the way the compiler reads it: as JSONC, through the stable compiler's own parser. A
 * comment or a string that merely names the option is not the option, and a key spelled with a
 * JSON escape is. A file that does not parse throws, because a guard that cannot read a file
 * cannot vouch for it.
 */
export function tsconfigSilencesDeprecations(fileName, text) {
  const { config, error } = ts.parseConfigFileTextToJson(fileName, text);
  if (error !== undefined) {
    const reason = ts.flattenDiagnosticMessageText(error.messageText, "\n");
    throw new Error(`${fileName} is not readable as a tsconfig: ${reason}`);
  }
  const options = config?.compilerOptions;
  return (
    options !== null && typeof options === "object" && Object.hasOwn(options, "ignoreDeprecations")
  );
}

/** A build configuration is a program, not JSON, so its check stays a text search. */
const buildConfigNamesOption = (filePath) =>
  readFileSync(filePath, "utf8").includes("ignoreDeprecations");

function silencedTsconfigs(tsconfigFiles) {
  const silenced = [];
  for (const filePath of tsconfigFiles) {
    const relative = path.relative(repoRoot, filePath);
    try {
      if (tsconfigSilencesDeprecations(relative, readFileSync(filePath, "utf8"))) {
        silenced.push(relative);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
  return silenced;
}

function main() {
  const { tsconfigs: tsconfigFiles, buildConfigs: buildConfigFiles } = collectConfigFiles(repoRoot);

  const ignoredDeprecationFiles = silencedTsconfigs(tsconfigFiles);

  if (ignoredDeprecationFiles.length > 0) {
    console.error("TypeScript deprecations must not be silenced with ignoreDeprecations:");
    for (const relative of ignoredDeprecationFiles) {
      console.error(`- ${relative}`);
    }
    process.exit(1);
  }

  for (const filePath of buildConfigFiles.filter(buildConfigNamesOption)) {
    console.log(
      `ignoreDeprecations in ${path.relative(repoRoot, filePath)} — a build-tool option, ` +
        "read the lifting condition beside it",
    );
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
}

// Importing this file reads its decision; running it scans the tree and runs the compiler.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

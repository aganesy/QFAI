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

const silences = (filePath) => readFileSync(filePath, "utf8").includes("ignoreDeprecations");

/**
 * Runs the future compiler and says how its run ended, as the exit code this lane
 * takes and the line it prints.
 *
 * The output is streamed rather than captured: a capture has a buffer limit, and
 * diagnostics past it left no exit status, which read as a type failure with none
 * printed. A run that did not finish, because the compiler could not start or a
 * signal stopped it, is named as that, so it is never mistaken for a type error.
 *
 * `spawn` is a parameter so a test can stand in for the compiler.
 */
export function runFutureCompiler(spawn = spawnSync) {
  const result = spawn(process.execPath, [futureTscPath, "-b", "--pretty", "false"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.error) {
    return {
      code: 1,
      message: `check-types-future: could not run ${futureTscPath}: ${result.error.message}`,
    };
  }
  if (result.signal) {
    return {
      code: 1,
      message: `check-types-future: the compiler stopped on signal ${result.signal} before it finished`,
    };
  }
  if (result.status !== 0) {
    return { code: result.status ?? 1, message: null };
  }
  return { code: 0, message: "Future TypeScript compatibility check passed." };
}

function main() {
  const { tsconfigs: tsconfigFiles, buildConfigs: buildConfigFiles } = collectConfigFiles(repoRoot);

  const ignoredDeprecationFiles = tsconfigFiles.filter(silences);

  if (ignoredDeprecationFiles.length > 0) {
    console.error("TypeScript deprecations must not be silenced with ignoreDeprecations:");
    for (const filePath of ignoredDeprecationFiles) {
      console.error(`- ${path.relative(repoRoot, filePath)}`);
    }
    process.exit(1);
  }

  for (const filePath of buildConfigFiles.filter(silences)) {
    console.log(
      `ignoreDeprecations in ${path.relative(repoRoot, filePath)} — a build-tool option, ` +
        "read the lifting condition beside it",
    );
  }

  const { code, message } = runFutureCompiler();
  if (message !== null) {
    if (code === 0) {
      console.log(message);
    } else {
      console.error(message);
    }
  }
  process.exit(code);
}

// Importing this file reads how a run ends; running it runs the compiler.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

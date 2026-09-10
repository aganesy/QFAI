#!/usr/bin/env node
/* global console, process */
/**
 * The stable type gate, and the check that it is actually the stable one.
 *
 * Two packages in this tree ship a `tsc`: `typescript`, and `typescript-future`
 * which is an alias for the next major. Two packages claiming one bin name
 * means one wins, and `node_modules/.bin/tsc` resolved to the alias — so this
 * lane, spelled `tsc -b` with the bare name, graded every run against a
 * release candidate. The range the package declares support for was checked by
 * nothing, the forward-looking lane beside it became a second copy of this
 * one, and neither said which compiler it had run.
 *
 * So the compiler is named by path rather than by bin name, and the version it
 * reports is held against the declared range. Link order cannot decide it, and
 * a future change to the bin set cannot return this silently.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const stableTscPath = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");

/**
 * The major a dependency range asks for, or `null` when the range is not one
 * this check can read.
 *
 * Only the shapes this repository uses: `^5.6.3`, `~5.6.3`, `5.6.3`. Anything
 * else — a range spanning majors, a tag, a URL — is reported rather than
 * guessed at, because a wrong reading here silently re-opens the hole.
 */
export function declaredMajor(range) {
  const matched = /^[\^~]?(\d+)\.\d+\.\d+$/u.exec(String(range ?? "").trim());
  return matched?.[1] ?? null;
}

/** The major `tsc --version` reported, or `null` when the output is unreadable. */
export function reportedMajor(versionOutput) {
  const matched = /Version\s+(\d+)\./u.exec(String(versionOutput ?? ""));
  return matched?.[1] ?? null;
}

/**
 * Why the compiler about to run is the wrong one, or `null` when it is right.
 *
 * Separated from the run so the decision is testable without a compiler, and
 * because this is the whole of what the guard asserts.
 */
export function compilerMismatch(declaredRange, versionOutput) {
  const declared = declaredMajor(declaredRange);
  if (declared === null) {
    return `devDependencies.typescript is "${String(declaredRange)}", which this check cannot read as a single major`;
  }
  const reported = reportedMajor(versionOutput);
  if (reported === null) {
    return `the compiler at node_modules/typescript reported "${String(versionOutput).trim()}", which is not a version line`;
  }
  if (reported !== declared) {
    return `the stable lane ran TypeScript ${reported}.x where devDependencies.typescript declares ${declared}.x — the gate is grading against a compiler this package does not claim to support`;
  }
  return null;
}

function main() {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const version = spawnSync(process.execPath, [stableTscPath, "--version"], {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  if (version.status !== 0) {
    console.error(`check-types: could not run ${stableTscPath}`);
    process.stderr.write(version.stderr ?? "");
    process.exit(1);
  }

  const mismatch = compilerMismatch(manifest.devDependencies?.typescript, version.stdout);
  if (mismatch !== null) {
    console.error(`check-types: ${mismatch}.`);
    process.exit(1);
  }

  // Both projects, the same compiler, and the version said out loud — the lane
  // used to name neither what it ran nor what it ran it with.
  console.log(`check-types: ${version.stdout.trim()} (node_modules/typescript)`);
  for (const args of [["-b"], ["-p", "packages/qfai/tsconfig.tests.json"]]) {
    const result = spawnSync(process.execPath, [stableTscPath, ...args, "--pretty", "false"], {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

// Importing this file reads its rules; running it runs the compiler.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

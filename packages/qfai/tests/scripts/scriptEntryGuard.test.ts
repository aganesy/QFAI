/**
 * The entry guard every runnable script ends with, held to a form that works on
 * both platforms.
 *
 * A script that is both a module and a command needs to know whether it was
 * spawned. The wrong way to ask is to build the URL by hand:
 *
 * ```js
 * import.meta.url === `file://${process.argv[1]}`
 * ```
 *
 * `process.argv[1]` is a filesystem path, and prefixing `file://` yields a URL
 * only where that path is POSIX. On Windows it produces
 * `file://C:\dir\script.mjs` against an `import.meta.url` of
 * `file:///C:/dir/script.mjs` — a different number of slashes, a different
 * place for the drive letter, different separators. The comparison is never
 * true, the body never runs, and the process exits 0 having done nothing.
 *
 * That is why this is a static check rather than a behavioural one. The lane
 * runs correctly on every POSIX runner, so nothing a CI job observes can tell
 * the two forms apart; the failure is only reachable on a platform CI does not
 * have. What can be held anywhere is the shape.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Every directory this repository keeps runnable scripts in. */
const SCRIPT_DIRS = ["scripts", "packages/qfai/scripts", "packages/qfai/assets/scripts"];

/** The concatenation that is a URL on POSIX and a broken string on Windows. */
const HAND_BUILT_URL = /`file:\/\/\$\{process\.argv\[1\]\}`/;

/** A script that decides whether it was spawned, however it spells the test. */
const CHECKS_ARGV = /import\.meta\.url\s*===/;

/** Every `.mjs` under `root`, recursively, as repository-relative paths. */
async function scriptsUnder(root: string): Promise<string[]> {
  const found: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (entry.name.endsWith(".mjs")) {
        found.push(path.relative(repoRoot, full).replaceAll("\\", "/"));
      }
    }
  };
  await walk(path.join(repoRoot, root));
  return found.sort();
}

describe("a script's entry guard is portable", () => {
  it("finds the scripts to check, so an empty sweep cannot pass", async () => {
    const all = (await Promise.all(SCRIPT_DIRS.map(scriptsUnder))).flat();

    expect(all.length).toBeGreaterThan(10);
    expect(all).toContain("scripts/check-conflict-markers.mjs");
  });

  it("builds the URL with pathToFileURL, never by concatenation", async () => {
    const offenders: string[] = [];
    for (const dir of SCRIPT_DIRS) {
      for (const rel of await scriptsUnder(dir)) {
        const body = await readFile(path.join(repoRoot, rel), "utf-8");
        if (HAND_BUILT_URL.test(body)) offenders.push(rel);
      }
    }

    expect(
      offenders,
      "a script comparing `import.meta.url` with `file://` plus a path never runs on Windows: " +
        "the guard is false, the body is skipped, and the exit code is 0. " +
        "Use `pathToFileURL(process.argv[1]).href`, as the scripts beside it do",
    ).toEqual([]);
  });

  it("guards against argv[1] being absent where it reads it", async () => {
    // Under a test runner the script is imported rather than spawned, and
    // `process.argv[1]` can be undefined. `pathToFileURL(undefined)` throws,
    // which turns a guard that should be false into an import that fails.
    const missing: string[] = [];
    for (const dir of SCRIPT_DIRS) {
      for (const rel of await scriptsUnder(dir)) {
        const body = await readFile(path.join(repoRoot, rel), "utf-8");
        if (!CHECKS_ARGV.test(body)) continue;
        if (!body.includes("pathToFileURL(process.argv[1])")) continue;
        if (!body.includes("process.argv[1] !== undefined")) missing.push(rel);
      }
    }

    expect(
      missing,
      "`pathToFileURL(undefined)` throws, so a script importable by a test has to check first",
    ).toEqual([]);
  });
});

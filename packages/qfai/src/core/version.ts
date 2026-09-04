import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

declare const __QFAI_TOOL_VERSION__: string | undefined;

export async function resolveToolVersion(): Promise<string> {
  if (typeof __QFAI_TOOL_VERSION__ === "string" && __QFAI_TOOL_VERSION__.length > 0) {
    return __QFAI_TOOL_VERSION__;
  }

  try {
    const packagePath = await resolvePackageJsonPath();
    const raw = await readFile(packagePath, "utf-8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    const version = typeof parsed.version === "string" ? parsed.version : "";
    return version.length > 0 ? version : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Where the running qfai was resolved from, or `null` when it cannot be told.
 *
 * `npx qfai` resolves a bare name by walking PARENT directories for
 * `node_modules/.bin`, so a nested worktree with no dependencies of its own
 * runs the enclosing checkout's binary — a different branch and lockfile — and
 * the run says nothing about it (#1096). This is what makes that visible.
 *
 * The package directory rather than `process.argv[1]`: the shim npm writes into
 * `.bin` is a different path from the package it forwards to, and the package
 * is the thing whose version was reported.
 */
export async function resolveToolPackageDir(): Promise<string | null> {
  try {
    return path.dirname(await resolvePackageJsonPath());
  } catch {
    return null;
  }
}

/**
 * Where the running qfai sits relative to `root`, or `null` when it cannot be
 * told (so a caller reports nothing rather than guessing).
 *
 * Compared on real paths on both sides. `import.meta.url` is already
 * symlink-resolved by Node, so comparing it against a lexical `root` reported
 * every project reached through a symlinked path — a macOS `/tmp`, a mapped
 * drive, an `npm link` — as external on every run.
 *
 * `outside` is reported only for a package that sits inside some
 * `node_modules` directory, because that is the only place `npx` can reach by
 * walking parents for a bare name: another checkout's copy, a copy hoisted to a
 * monorepo root, a global prefix's `lib/node_modules`, or the `_npx` cache it
 * silently populates when no parent has one. A package directory with no such
 * segment is a checkout being run directly — the operator named the file and
 * nothing was resolved ambiently — so it is not reported. That also keeps the
 * whole test harness quiet, whose temp roots are outside the source tree by
 * construction.
 *
 * **What remains is a path question, not an intent question.** A deliberate
 * global install and a hoisted monorepo dependency both satisfy every condition
 * above and are both fine. Telling them from the ambient resolution needs the
 * project's own dependency declaration, not a path comparison; callers must say
 * so rather than call this a defect.
 */
export async function locateToolAgainstProject(
  root: string,
): Promise<{ packageDir: string; outside: boolean } | null> {
  const packageDir = await resolveToolPackageDir();
  if (packageDir === null) return null;
  const [realRoot, realPackageDir] = await Promise.all([
    toRealPath(path.resolve(root)),
    toRealPath(packageDir),
  ]);
  return { packageDir, outside: classifyToolLocation(realRoot, realPackageDir) };
}

/**
 * Whether `packageDir` is an installed copy resolved from outside `root`.
 *
 * Pure, and exported for that reason: `resolveToolPackageDir()` reports where
 * this file really is, so a test cannot move the package to reach the state
 * this predicate exists to detect. Both operands must already be real paths —
 * {@link locateToolAgainstProject} is what resolves them.
 */
export function classifyToolLocation(root: string, packageDir: string): boolean {
  const relative = path.relative(root, packageDir);
  const escapes = relative.startsWith("..") || path.isAbsolute(relative);
  return escapes && isInsideNodeModules(packageDir);
}

/**
 * Whether any segment of `target` is a `node_modules` directory.
 *
 * Segment-wise rather than a substring test, so a project of its own called
 * `node_modules_migration` — or any directory merely containing the word — is
 * not read as an installed dependency.
 */
function isInsideNodeModules(target: string): boolean {
  return target.split(/[\\/]+/).includes("node_modules");
}

/**
 * `realpath`, falling back to the input when it cannot be resolved.
 *
 * A path that does not exist is not a reason to report anything: the fallback
 * keeps the comparison lexical for that operand instead of throwing out of a
 * validator whose subject is unrelated.
 */
async function toRealPath(target: string): Promise<string> {
  try {
    return await realpath(target);
  } catch {
    return target;
  }
}

/**
 * This module's own directory, however it was bundled.
 */
function moduleDir(): string {
  const base = import.meta.url;
  return path.dirname(base.startsWith("file:") ? fileURLToPath(base) : base);
}

/**
 * The package's own `package.json`, found by walking up rather than counting.
 *
 * A fixed `../../package.json` was right for exactly one layout. tsup bundles
 * the public API to `dist/index.mjs` and the CLI to `dist/cli/index.mjs`, so
 * two levels up from the former is the directory ABOVE the package —
 * `/project/node_modules/package.json` for a normal install, whose version and
 * whose directory are both somebody else's. Source runs from `src/core/` and
 * the CLI bundle from `dist/cli/` each happened to land right, which is why
 * nothing caught it.
 *
 * The walk stops at the first `package.json` naming this package, so a
 * consumer's own manifest one level further out cannot be mistaken for it.
 */
async function resolvePackageJsonPath(): Promise<string> {
  // Memoised: the answer is a property of where this file was installed, which
  // cannot change inside one process, and both `resolveToolVersion` and
  // `resolveToolPackageDir` ask for it on every validate run. Without this the
  // walk repeats its reads for an answer that was already known.
  cachedPackageJsonPath ??= (async (): Promise<string> => {
    const found = await findPackageJsonUpward(moduleDir(), PACKAGE_NAME);
    if (found === null) {
      throw new Error(`could not locate ${PACKAGE_NAME}'s package.json above ${moduleDir()}`);
    }
    return found;
  })();
  try {
    return await cachedPackageJsonPath;
  } catch (error) {
    // A rejected promise must not become the permanent answer: clear it so a
    // later call re-walks rather than replaying a failure from a moment when
    // the tree was mid-write.
    cachedPackageJsonPath = null;
    throw error;
  }
}

let cachedPackageJsonPath: Promise<string> | null = null;

/**
 * The nearest `package.json` at or above `startDir` whose `name` is `name`.
 *
 * Exported for the reason the fixed depth failed: a test that starts where this
 * module really lives cannot see a misresolution that only happens in a bundle
 * layout. Taking the start directory as an argument makes both layouts
 * reachable.
 *
 * Matching on the name is what stops the walk at OUR manifest. A consumer's own
 * `package.json` sits one level above `node_modules/`, and a depth-counting
 * resolver returned exactly that.
 */
export async function findPackageJsonUpward(
  startDir: string,
  name: string,
): Promise<string | null> {
  let dir = path.resolve(startDir);
  for (let depth = 0; depth < 16; depth += 1) {
    const candidate = path.join(dir, "package.json");
    try {
      const parsed = JSON.parse(await readFile(candidate, "utf-8")) as { name?: unknown };
      if (parsed.name === name) {
        return candidate;
      }
    } catch {
      // Absent, unreadable, or not JSON: keep walking. A manifest that names
      // something else is not ours either, and falls through the same way — so
      // a broken file in the path cannot end the search early.
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** The name the walk matches on, and the only thing that identifies us. */
const PACKAGE_NAME = "qfai";

import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

declare const __QFAI_TOOL_VERSION__: string | undefined;

export async function resolveToolVersion(): Promise<string> {
  if (typeof __QFAI_TOOL_VERSION__ === "string" && __QFAI_TOOL_VERSION__.length > 0) {
    return __QFAI_TOOL_VERSION__;
  }

  try {
    const packagePath = resolvePackageJsonPath();
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
export function resolveToolPackageDir(): string | null {
  try {
    return path.dirname(resolvePackageJsonPath());
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
  const packageDir = resolveToolPackageDir();
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

function resolvePackageJsonPath(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  return path.resolve(path.dirname(basePath), "../../package.json");
}

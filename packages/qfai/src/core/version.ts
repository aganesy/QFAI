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
): Promise<{ packageDir: string; outside: boolean; declaredElsewhere: boolean } | null> {
  const packageDir = await resolveToolPackageDir();
  if (packageDir === null) return null;
  const [realRoot, realPackageDir] = await Promise.all([
    toRealPath(path.resolve(root)),
    toRealPath(packageDir),
  ]);
  const outside = classifyToolLocation(realRoot, realPackageDir);
  return {
    packageDir,
    outside,
    // Only asked when the answer can matter. A copy resolved from inside the
    // project is the declared one by construction, and reading a manifest to
    // confirm that would be work on every clean run.
    declaredElsewhere: outside ? await resolvesAgainstDeclaration(realRoot, realPackageDir) : false,
  };
}

/**
 * Whether a `qfai` dependency is declared and the running copy is not it.
 *
 * This is the intent signal `outside` cannot carry. A path comparison says the
 * copy came from outside the project; it cannot say whether that was chosen.
 * Four resolutions land outside and only two are hazards (#1108):
 *
 * - **a declaration exists and the copy is not under it** — the worktree case,
 *   and the `_npx` cache case. Another checkout's lockfile decided what ran,
 *   against a project that had said what it wanted. This returns `true`.
 * - **no declaration anywhere up the chain** — a global install or an `npx`
 *   fetch is then the only way it could be running, so the operator chose it.
 * - **the copy is under the directory that declares it** — hoisting to a
 *   monorepo root, or pnpm's virtual store. The declaration is being honoured.
 *
 * The declaring directory is the answer to "what would that declaration
 * install", which is why containment against it is the test rather than a
 * version comparison: the version a lockfile pins is not readable from the
 * running process, and the directory is.
 */
async function resolvesAgainstDeclaration(root: string, packageDir: string): Promise<boolean> {
  const declaringDir = await findDeclaringDir(root);
  return declaringDir !== null && classifyAgainstDeclaration(declaringDir, packageDir);
}

/**
 * Whether `packageDir` lies outside the directory that declared the dependency.
 *
 * Pure, and exported for the same reason {@link classifyToolLocation} is: the
 * package directory a test can observe is where this file really lives, so the
 * state this predicate exists to detect is unreachable unless the operands can
 * be handed in.
 *
 * Containment rather than a version comparison, because the version a lockfile
 * pins is not readable from the running process and the directory is. A copy
 * under the declaring directory is the declared one — npm's `node_modules/qfai`,
 * or pnpm's `node_modules/.pnpm/...` that Node resolves through.
 */
export function classifyAgainstDeclaration(declaringDir: string, packageDir: string): boolean {
  const relative = path.relative(declaringDir, packageDir);
  return relative.startsWith("..") || path.isAbsolute(relative);
}

/**
 * The nearest directory at or above `root` whose `package.json` declares
 * `qfai`, or `null` when none does.
 *
 * Every dependency field counts. A tool named in `devDependencies` is as
 * declared as one in `dependencies` — the project said which copy it wants
 * either way — and `optionalDependencies` / `peerDependencies` are a weaker
 * statement but still a statement.
 */
export async function findDeclaringDir(root: string): Promise<string | null> {
  let dir = path.resolve(root);
  for (let depth = 0; depth < 16; depth += 1) {
    try {
      const raw = await readFile(path.join(dir, "package.json"), "utf-8");
      if (declaresQfai(JSON.parse(raw))) return dir;
    } catch {
      // Absent, unreadable, or not JSON: keep walking. A manifest that does not
      // declare the tool is not a stopping point either — a workspace package
      // can be silent while its root declares.
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Whether `manifest` names {@link PACKAGE_NAME} in any dependency field. */
function declaresQfai(manifest: unknown): boolean {
  if (typeof manifest !== "object" || manifest === null) return false;
  const fields = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ] as const;
  const record: Record<string, unknown> = manifest as Record<string, unknown>;
  for (const field of fields) {
    const deps = record[field];
    if (typeof deps === "object" && deps !== null && PACKAGE_NAME in deps) return true;
  }
  return false;
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

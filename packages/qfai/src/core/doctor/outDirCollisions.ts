/**
 * Detect `paths.outDir` collisions between the `qfai.config.yaml` files
 * of one monorepo.
 *
 * Two projects that resolve `paths.outDir` to the same absolute
 * directory share every artifact written there — run logs included —
 * while each keeps its own retention settings. The `doctor` diagnostic
 * pass reports the collision, and the run-log pruner consults the same
 * detection BEFORE removing anything, so a `--clean` invoked from one
 * project can never delete another project's evidence on the strength
 * of its own TTL.
 *
 * Extracted from `core/doctor.ts` so both consumers (the diagnostic
 * check and the pre-prune guard in `cleanRunLogs.ts`) share one
 * implementation instead of restating the scan.
 */

import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { loadConfig, resolvePath } from "../config.js";
import { collectFilesByGlobs } from "../fs.js";
import { isEnoent } from "../fs/errno.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "../traceability.js";
import { exists } from "../validators/utils.js";

const execute = promisify(execFile);

export const DEFAULT_CONFIG_SEARCH_IGNORE_GLOBS = [
  ...DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
  "**/.pnpm/**",
  "**/tmp/**",
  "**/.mcp-tools/**",
];

export type OutDirCollision = {
  outDir: string;
  roots: string[];
};

export type OutDirCollisionResult = {
  monorepoRoot: string;
  configRoots: string[];
  collisions: OutDirCollision[];
  scan: {
    truncated: boolean;
    matchedFileCount: number;
    limit: number;
  };
};

/** One physical output directory and every project root that claims it. */
type OutDirOwners = {
  /** Logical path used for reporting: the lowest-sorting claimant spelling. */
  outDir: string;
  roots: Set<string>;
};

type OutDirOwnership = {
  monorepoRoot: string;
  configRoots: string[];
  /** Keyed by the canonical (symlink-resolved) directory, not the spelling. */
  ownersByCanonicalOutDir: Map<string, OutDirOwners>;
  scan: OutDirCollisionResult["scan"];
};

/**
 * Canonical identity of an `outDir`, so two spellings of one physical
 * directory collapse to a single key.
 *
 * `path.normalize` alone compares spellings: `a/report` reached through
 * a symlink or a Windows junction and the same directory reached
 * directly normalize to different strings, so a shared `outDir` would
 * not register as shared and one project's retention settings would
 * delete the other's run logs. `realpath` removes that difference.
 *
 * An `outDir` that does not exist yet has no real path of its own, so
 * the deepest EXISTING ancestor is resolved instead and the missing
 * segments are appended. Two not-yet-created `outDir`s that sit behind
 * the same link still land on one key that way, and a project that has
 * never run `qfai validate` does not have to be treated as unresolvable.
 *
 * Any non-`ENOENT` resolution failure (`EACCES`, an I/O error, a symlink
 * loop) is thrown rather than degraded to the logical path: the caller
 * that guards an irreversible prune must fail closed, since not being
 * able to identify the directory is not evidence that nobody shares it.
 */
async function canonicalizeOutDir(outDirAbs: string): Promise<string> {
  const absolute = path.resolve(outDirAbs);
  const missingSegments: string[] = [];
  let current = absolute;
  for (;;) {
    try {
      const resolved = await realpath(current);
      return missingSegments.length === 0
        ? path.normalize(resolved)
        : path.join(resolved, ...missingSegments);
    } catch (error) {
      if (!isEnoent(error)) {
        throw new Error(
          `failed to resolve outDir ${absolute}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      const parent = path.dirname(current);
      if (parent === current) {
        // Reached the filesystem root without finding anything that
        // exists (a bogus drive letter, say). Nothing to resolve.
        return path.normalize(absolute);
      }
      missingSegments.unshift(path.basename(current));
      current = parent;
    }
  }
}

/** Map every `qfai.config.yaml` in the monorepo to its resolved `outDir`. */
async function collectOutDirOwnership(root: string, scanLimit?: number): Promise<OutDirOwnership> {
  const monorepoRoot = await findMonorepoRoot(root);
  const configScan = await collectFilesByGlobs(monorepoRoot, {
    globs: ["**/qfai.config.yaml"],
    ignore: DEFAULT_CONFIG_SEARCH_IGNORE_GLOBS,
    ...(scanLimit === undefined ? {} : { limit: scanLimit }),
  });
  const configRoots = Array.from(
    new Set(configScan.files.map((configPath) => path.dirname(configPath))),
  ).sort((a, b) => a.localeCompare(b));
  const ownersByCanonicalOutDir = new Map<string, OutDirOwners>();

  for (const configRoot of configRoots) {
    const { config } = await loadConfig(configRoot);
    const outDir = path.normalize(resolvePath(configRoot, config, "outDir"));
    const canonical = await canonicalizeOutDir(outDir);
    const owners = ownersByCanonicalOutDir.get(canonical) ?? { outDir, roots: new Set<string>() };
    // Deterministic reporting spelling when several claimants disagree.
    if (outDir.localeCompare(owners.outDir) < 0) {
      owners.outDir = outDir;
    }
    owners.roots.add(configRoot);
    ownersByCanonicalOutDir.set(canonical, owners);
  }

  return {
    monorepoRoot,
    configRoots,
    ownersByCanonicalOutDir,
    scan: {
      truncated: configScan.truncated,
      matchedFileCount: configScan.matchedFileCount,
      limit: configScan.limit,
    },
  };
}

export async function detectOutDirCollisions(root: string): Promise<OutDirCollisionResult> {
  const { monorepoRoot, configRoots, ownersByCanonicalOutDir, scan } =
    await collectOutDirOwnership(root);

  const collisions: OutDirCollision[] = [];
  for (const owners of ownersByCanonicalOutDir.values()) {
    if (owners.roots.size > 1) {
      collisions.push({
        outDir: owners.outDir,
        roots: Array.from(owners.roots).sort((a, b) => a.localeCompare(b)),
      });
    }
  }

  return { monorepoRoot, configRoots, collisions, scan };
}

/**
 * Project roots other than `root` whose `paths.outDir` resolves to
 * `outDirAbs`. Empty when nothing else writes into that directory —
 * which is the only state in which a destructive cleanup keyed on
 * `root`'s own retention settings is safe.
 *
 * Keyed on the ownership map rather than on `detectOutDirCollisions`'s
 * `collisions` list so a `root` that carries no `qfai.config.yaml` of
 * its own (defaults in effect, hence absent from `configRoots`) still
 * sees the foreign owner of the directory it is about to prune.
 *
 * Both sides of the comparison go through `canonicalizeOutDir`, so a
 * co-owner that reaches the directory through a symlink or junction is
 * still recognised; a directory that cannot be resolved at all throws,
 * which the pre-prune guard turns into a refusal to delete.
 */
export async function findOutDirCoOwners(
  root: string,
  outDirAbs: string,
  /** Lowers the config-scan file limit. Test seam; production uses the default. */
  scanLimit?: number,
): Promise<string[]> {
  const selfRoot = path.resolve(root);
  const target = await canonicalizeOutDir(outDirAbs);
  const { ownersByCanonicalOutDir, scan } = await collectOutDirOwnership(selfRoot, scanLimit);
  // A truncated scan is not "no co-owners" — it is "the question was not
  // answered". The glob stops at its file limit, so a co-owner enumerated
  // after the cut is simply absent from the map, and an empty result here
  // would authorise an irreversible delete on unproven exclusive ownership.
  // The `output.outDirCollision` diagnostic does warn about truncation, but
  // it runs after the clean phase. Throwing lets the pre-prune guard refuse,
  // the same way it does for a directory that cannot be canonicalised.
  if (scan.truncated) {
    throw new Error(
      `outDir ownership scan hit its ${scan.limit}-file limit after ${scan.matchedFileCount} qfai.config.yaml matches; exclusive ownership of ${outDirAbs} cannot be proven`,
    );
  }
  const owners = ownersByCanonicalOutDir.get(target);
  if (!owners) {
    return [];
  }
  // Resolved, not raw. `owners.roots` holds `path.dirname()` of glob output,
  // and fast-glob emits `/` separators on every platform - so on Windows these
  // came back as `C:/Users/...` while everything they are compared against, and
  // the operator reading them in `cleanRunLogs`'s refusal, uses `\`. Resolving
  // here makes the returned paths platform-native, which is what the filter
  // below already assumed.
  return Array.from(owners.roots)
    .map((owner) => path.resolve(owner))
    .filter((owner) => owner !== selfRoot)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * The directory the config scan starts from: the nearest ancestor of
 * `startDir` holding `pnpm-workspace.yaml`, else the Git working-tree
 * root, else `startDir` itself.
 *
 * The Git root comes from Git, not from a `.git` entry on disk. An empty
 * `.git` directory left in a shared parent (a temporary directory, say)
 * is not a repository, and treating it as one widened a standalone
 * project's scan to unrelated directories.
 */
async function findMonorepoRoot(startDir: string): Promise<string> {
  const start = path.resolve(startDir);
  const gitRoot = await resolveGitRoot(start);
  if (gitRoot.kind === "unavailable") {
    return findMarkerRoot(start, [".git", "pnpm-workspace.yaml"]);
  }
  let current = start;
  for (;;) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    if (gitRoot.kind === "root" && (await isSameDirectory(current, gitRoot.dir))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return start;
    }
    current = parent;
  }
}

/**
 * The working-tree root Git reports for `dir`; `none` when `dir` is not in
 * a working tree. `unavailable` when Git itself cannot be started:
 * the caller then falls back to the on-disk `.git` marker, which can
 * only widen the scan, so the pre-prune guard still sees every co-owner
 * it saw before.
 */
async function resolveGitRoot(dir: string): Promise<GitRoot> {
  try {
    const { stdout } = await execute("git", ["rev-parse", "--show-toplevel"], {
      cwd: dir,
      encoding: "utf8",
    });
    const top = stdout.trim();
    return top === "" ? { kind: "none" } : { kind: "root", dir: path.resolve(top) };
  } catch (error) {
    return isEnoent(error) ? { kind: "unavailable" } : { kind: "none" };
  }
}

type GitRoot = { kind: "root"; dir: string } | { kind: "none" } | { kind: "unavailable" };

/** True when both paths name one directory once symlinks are resolved. */
async function isSameDirectory(candidate: string, realDir: string): Promise<boolean> {
  try {
    return path.relative(await realpath(candidate), realDir) === "";
  } catch {
    return false;
  }
}

async function findMarkerRoot(start: string, markers: readonly string[]): Promise<string> {
  let current = start;
  for (;;) {
    for (const marker of markers) {
      if (await exists(path.join(current, marker))) {
        return current;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return start;
    }
    current = parent;
  }
}

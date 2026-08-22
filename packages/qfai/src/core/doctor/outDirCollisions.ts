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

import path from "node:path";

import { loadConfig, resolvePath } from "../config.js";
import { collectFilesByGlobs } from "../fs.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "../traceability.js";
import { exists } from "../validators/utils.js";

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

type OutDirOwnership = {
  monorepoRoot: string;
  configRoots: string[];
  outDirToRoots: Map<string, Set<string>>;
  scan: OutDirCollisionResult["scan"];
};

/** Map every `qfai.config.yaml` in the monorepo to its resolved `outDir`. */
async function collectOutDirOwnership(root: string): Promise<OutDirOwnership> {
  const monorepoRoot = await findMonorepoRoot(root);
  const configScan = await collectFilesByGlobs(monorepoRoot, {
    globs: ["**/qfai.config.yaml"],
    ignore: DEFAULT_CONFIG_SEARCH_IGNORE_GLOBS,
  });
  const configRoots = Array.from(
    new Set(configScan.files.map((configPath) => path.dirname(configPath))),
  ).sort((a, b) => a.localeCompare(b));
  const outDirToRoots = new Map<string, Set<string>>();

  for (const configRoot of configRoots) {
    const { config } = await loadConfig(configRoot);
    const outDir = path.normalize(resolvePath(configRoot, config, "outDir"));
    const roots = outDirToRoots.get(outDir) ?? new Set<string>();
    roots.add(configRoot);
    outDirToRoots.set(outDir, roots);
  }

  return {
    monorepoRoot,
    configRoots,
    outDirToRoots,
    scan: {
      truncated: configScan.truncated,
      matchedFileCount: configScan.matchedFileCount,
      limit: configScan.limit,
    },
  };
}

export async function detectOutDirCollisions(root: string): Promise<OutDirCollisionResult> {
  const { monorepoRoot, configRoots, outDirToRoots, scan } = await collectOutDirOwnership(root);

  const collisions: OutDirCollision[] = [];
  for (const [outDir, roots] of outDirToRoots.entries()) {
    if (roots.size > 1) {
      collisions.push({
        outDir,
        roots: Array.from(roots).sort((a, b) => a.localeCompare(b)),
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
 */
export async function findOutDirCoOwners(root: string, outDirAbs: string): Promise<string[]> {
  const selfRoot = path.resolve(root);
  const target = path.normalize(path.resolve(outDirAbs));
  const { outDirToRoots } = await collectOutDirOwnership(selfRoot);
  const owners = outDirToRoots.get(target);
  if (!owners) {
    return [];
  }
  return Array.from(owners)
    .filter((owner) => path.resolve(owner) !== selfRoot)
    .sort((a, b) => a.localeCompare(b));
}

async function findMonorepoRoot(startDir: string): Promise<string> {
  let current = path.resolve(startDir);
  for (;;) {
    const gitPath = path.join(current, ".git");
    const workspacePath = path.join(current, "pnpm-workspace.yaml");
    if ((await exists(gitPath)) || (await exists(workspacePath))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return path.resolve(startDir);
}

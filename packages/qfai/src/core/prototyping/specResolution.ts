/**
 * Resolve the primary spec ID for the prototyping skill at runtime.
 *
 * Resolution order:
 *   1. config.prototyping.primarySpecId (explicit override)
 *   2. Auto-scan: smallest spec ID whose 01_Spec.md contains a prototyping
 *      marker (`surface_type: ui-bearing` in frontmatter, or "prototyping"
 *      in the title heading)
 *   3. undefined (caller falls back to generic guidance)
 *
 * This module is the single source of truth for "which spec drives the
 * current prototyping run", removing any need for the SKILL.md to hardcode
 * a specific spec id.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";

export type ResolvedSpec = {
  /** Four-digit spec ID, e.g. "0001". */
  specId: string;
  /** Absolute path to the spec directory. */
  specDir: string;
  /** Absolute path to 01_Spec.md inside the spec directory. */
  specMdPath: string;
  /** How the spec was located. */
  source: "config" | "marker-scan";
};

const PROTOTYPING_MARKER_RE = /surface_type:\s*ui-bearing|^#\s+.*prototyping/im;

export async function resolvePrimaryPrototypingSpec(
  root: string,
  config: QfaiConfig,
): Promise<ResolvedSpec | undefined> {
  const specsRoot = path.resolve(root, config.paths.specsDir);

  // 1. Explicit config override
  const explicit = config.prototyping?.primarySpecId;
  if (explicit) {
    const entries = await collectSpecEntries(specsRoot);
    const hit = entries.find((entry) => entry.specNumber === explicit);
    if (hit) {
      return {
        specId: explicit,
        specDir: hit.dir,
        specMdPath: path.join(hit.dir, "01_Spec.md"),
        source: "config",
      };
    }
    return undefined;
  }

  // 2. Marker-based scan: smallest spec ID first
  const entries = await collectSpecEntries(specsRoot);
  const sorted = [...entries].sort((a, b) => a.specNumber.localeCompare(b.specNumber));
  for (const entry of sorted) {
    const specMdPath = path.join(entry.dir, "01_Spec.md");
    let body = "";
    try {
      body = await readFile(specMdPath, "utf-8");
    } catch {
      continue;
    }
    if (PROTOTYPING_MARKER_RE.test(body)) {
      return {
        specId: entry.specNumber,
        specDir: entry.dir,
        specMdPath,
        source: "marker-scan",
      };
    }
  }

  // 3. Fallback: caller decides what to do
  return undefined;
}

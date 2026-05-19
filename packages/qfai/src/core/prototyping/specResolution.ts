/**
 * Resolve the prototyping spec(s) at runtime.
 *
 * Two entry points are exported:
 *
 *  - `resolvePrimaryPrototypingSpec(root, config)` — legacy single-spec
 *    resolver retained for callers that still expect "one spec drives the
 *    invocation". Slated for removal once the multi-spec rewrite lands
 *    across `prototypingIterate` / `prototypingCertify`. Do not extend.
 *  - `resolveAllUiBearingSpecs(root, config)` — new multi-spec resolver.
 *    Returns every spec ID whose `01_Spec.md` carries a UI-bearing
 *    marker (or, as a fallback, has a matching `.qfai/contracts/ui/*.yaml`
 *    contract). Deterministic, no prompts, sorted lexicographically.
 *
 * Both helpers read from the consumer project filesystem only; neither
 * performs interactive selection.
 */

import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
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
const UI_BEARING_MARKER_RE = /surface_type:\s*ui-bearing/im;

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

/**
 * Resolve every UI-bearing spec in the consumer project in one call.
 *
 * A spec is considered UI-bearing when either:
 *   1. its `01_Spec.md` contains a `surface_type: ui-bearing` marker
 *      (matches the existing `resolvePrimaryPrototypingSpec` convention),
 *      OR
 *   2. a UI contract YAML exists at
 *      `<contractsDir>/ui/<spec-id>.yaml` whose basename matches the
 *      spec id (fallback signal — covers consumer projects that author
 *      contracts without a frontmatter marker).
 *
 * Returns spec IDs sorted lexicographically and deduplicated. The function
 * never prompts; deterministic file-system query only. Zero UI-bearing
 * specs returns an empty array (caller decides the no-op exit).
 *
 * @param root absolute path to the consumer project root
 * @param config resolved `QfaiConfig` (paths.specsDir / paths.contractsDir
 *   are honoured)
 */
export async function resolveAllUiBearingSpecs(
  root: string,
  config: QfaiConfig,
): Promise<string[]> {
  const specsRoot = path.resolve(root, config.paths.specsDir);
  const contractsRoot = path.resolve(root, config.paths.contractsDir);

  const entries = await collectSpecEntries(specsRoot);
  const uiBearing = new Set<string>();

  for (const entry of entries) {
    const specId = entry.specNumber;
    if (!specId) continue;

    let markerHit = false;
    const specMdPath = path.join(entry.dir, "01_Spec.md");
    try {
      const body = await readFile(specMdPath, "utf-8");
      if (UI_BEARING_MARKER_RE.test(body)) {
        markerHit = true;
      }
    } catch (error) {
      if (!isEnoent(error)) {
        // Re-throw unexpected filesystem errors so callers fail fast
        // rather than silently classify the spec as non-UI.
        throw error;
      }
    }

    if (markerHit) {
      uiBearing.add(specId);
      continue;
    }

    // Fallback: matching UI contract file
    if (await hasMatchingUiContract(contractsRoot, specId)) {
      uiBearing.add(specId);
    }
  }

  return [...uiBearing].sort((a, b) => a.localeCompare(b));
}

async function hasMatchingUiContract(
  contractsRoot: string,
  specId: string,
): Promise<boolean> {
  const uiDir = path.join(contractsRoot, "ui");
  const direct = path.join(uiDir, `${specId}.yaml`);
  try {
    await access(direct);
    return true;
  } catch (error) {
    if (!isEnoent(error)) {
      throw error;
    }
  }

  // Also accept `spec-NNNN.yaml` / `ui-NNNN-*.yaml` shapes — consumer
  // projects sometimes prefix with `spec-` or follow the
  // `ui-XXXX-<slug>.yaml` convention documented in
  // `.qfai/contracts/ui/README.md`. We accept any basename that contains
  // the four-digit spec id token surrounded by non-digit boundaries.
  let names: string[];
  try {
    names = await readdir(uiDir);
  } catch (error) {
    if (isEnoent(error)) {
      return false;
    }
    throw error;
  }
  const tokenRe = new RegExp(`(?:^|[^0-9])${specId}(?:[^0-9]|$)`);
  return names.some((name) => name.endsWith(".yaml") && tokenRe.test(name));
}

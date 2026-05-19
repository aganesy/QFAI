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

/**
 * Title-marker regex: matches `# … prototyping …` headings (anywhere)
 * inside an `01_Spec.md`. Shared SSOT between the legacy composite
 * `PROTOTYPING_MARKER_RE` (which OR's frontmatter + title) and the
 * multi-spec `resolveTitleMarkerSpecs` helper that the iterate
 * command's section-0 no-op gate consults.
 *
 * Exported so callers re-use the same source — DO NOT inline-redefine
 * this elsewhere; the two arms of `PROTOTYPING_MARKER_RE` are built
 * from `UI_BEARING_MARKER_RE.source` and `TITLE_MARKER_RE.source` so a
 * single edit propagates everywhere.
 */
export const TITLE_MARKER_RE = /^#\s+.*prototyping/im;

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

/**
 * Multi-spec strict UI-bearing marker: matches ONLY the canonical
 * frontmatter signal `surface_type: ui-bearing`. Intentionally more
 * restrictive than `PROTOTYPING_MARKER_RE`, which OR's in the legacy
 * `# … prototyping …` heading arm via `TITLE_MARKER_RE`.
 *
 * Why the asymmetry: title-marker scans must occur explicitly (via
 * the exported `resolveTitleMarkerSpecs` helper) so the
 * spec-set-membership semantics are visible at the call site. Folding
 * the title arm into `UI_BEARING_MARKER_RE` would silently widen the
 * frozen multi-spec set with heading-only matches, masking the
 * configuration shape from operators.
 */
const UI_BEARING_MARKER_RE = /surface_type:\s*ui-bearing/im;
// Legacy composite: frontmatter marker OR legacy title heading. Built
// from the two single-purpose sources so the title arm cannot drift.
const PROTOTYPING_MARKER_RE = new RegExp(
  `${UI_BEARING_MARKER_RE.source}|${TITLE_MARKER_RE.source}`,
  "im",
);

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

/**
 * Cheap title-marker probe. Returns spec IDs (four-digit form) whose
 * `01_Spec.md` carries a `# … prototyping …` heading. Mirrors the
 * legacy `PROTOTYPING_MARKER_RE` title arm in
 * `resolvePrimaryPrototypingSpec` so the section-0 no-op gate honours
 * the same surface the legacy resolver does.
 *
 * Lex-sorted; deduped by spec id. Read failures other than ENOENT
 * propagate so a permission-denied scan does not silently no-op the
 * run.
 *
 * @param root absolute path to the consumer project root
 * @param specsDir relative path to the specs directory (e.g.
 *   `.qfai/specs`). Pass `config.paths.specsDir` for parity with
 *   `resolveAllUiBearingSpecs`.
 */
export async function resolveTitleMarkerSpecs(
  root: string,
  specsDir: string,
): Promise<string[]> {
  const specsRoot = path.resolve(root, specsDir);
  let entries: Awaited<ReturnType<typeof collectSpecEntries>>;
  try {
    entries = await collectSpecEntries(specsRoot);
  } catch (err) {
    if (isEnoent(err)) return [];
    throw err;
  }
  const out: string[] = [];
  for (const entry of entries) {
    const specMdPath = path.join(entry.dir, "01_Spec.md");
    let body: string;
    try {
      body = await readFile(specMdPath, "utf-8");
    } catch (err) {
      if (isEnoent(err)) continue;
      throw err;
    }
    if (TITLE_MARKER_RE.test(body)) {
      out.push(entry.specNumber);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
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
  // `.qfai/contracts/ui/README.md`.
  //
  // Codex r3264487007: tightened from the prior `(?:^|[^0-9])${specId}
  // (?:[^0-9]|$)` token-anywhere regex which over-matched unrelated
  // basenames whose names happened to contain the four-digit spec id
  // (e.g. `unrelated-text-0001.yaml` would be treated as a UI contract
  // for spec 0001). The accepted shapes are now anchored explicitly:
  //
  //   - `<specId>.yaml`                  (bare 4-digit id; legacy)
  //   - `spec-<specId>.yaml`             (spec-prefixed; legacy)
  //   - `ui-<specId>.yaml`               (ui-prefixed, no slug)
  //   - `ui-<specId>-<anything>.yaml`    (ui-prefixed with slug, per
  //                                       the documented convention)
  //
  // Any other basename — including ones that merely *contain* the id
  // token — is rejected. The fallback is intentionally narrower than
  // the contract's "direct match" arm to avoid silent false-positives.
  let names: string[];
  try {
    names = await readdir(uiDir);
  } catch (error) {
    if (isEnoent(error)) {
      return false;
    }
    throw error;
  }
  const anchoredRe = new RegExp(`^(?:spec-|ui-)?${specId}(?:-[^.]*)?\\.yaml$`);
  return names.some((name) => anchoredRe.test(name));
}

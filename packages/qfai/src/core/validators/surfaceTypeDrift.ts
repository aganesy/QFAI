/**
 * D-SURFACE-TYPE-MISSING — warns when a spec has a matching UI
 * companion under `<contractsDir>/ui/` but its `01_Spec.md`
 * frontmatter does not declare `surface_type: ui-bearing`.
 *
 * Severity is computed from the running version against
 * `SUNSETS.surfaceTypeMissing`: `warning` inside the window, `error` from the
 * sunset onwards.
 *
 * This used to be a hard-coded `warning` beside a comment arguing that pinning
 * the sunset here would create "a second internal version source that could
 * drift". The argument was sound and the conclusion was backwards: leaving the
 * version out did not avoid drift, it guaranteed it — the finding kept saying
 * "scheduled to escalate in a future minor release" at the version where the
 * escalation was already due. `core/sunset.ts` is the single source both this
 * severity and that sentence now read.
 * Specs without a UI companion emit no finding.
 */
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { SUNSETS, deprecationSeverity } from "../sunset.js";
import { resolveToolVersion } from "../version.js";
import { hasUiCompanionForSpec } from "../detection/surfaceType.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

const SURFACE_TYPE_FRONTMATTER_RE = /^\s*surface_type\s*:\s*ui-bearing\s*$/im;

export async function validateSurfaceTypeDrift(root: string, config: QfaiConfig): Promise<Issue[]> {
  const specsRoot = path.resolve(root, config.paths.specsDir);
  let entries: Awaited<ReturnType<typeof collectSpecEntries>>;
  try {
    entries = await collectSpecEntries(specsRoot);
  } catch {
    return [];
  }

  // Resolved once: the version cannot change mid-scan, and a per-entry
  // await would make the severity look entry-dependent.
  const severity = deprecationSeverity(await resolveToolVersion(), SUNSETS.surfaceTypeMissing);
  const findings: Issue[] = [];
  for (const entry of entries) {
    const specId = entry.specNumber;
    if (!specId || specId === "0000") continue;

    const hasCompanion = await hasUiCompanionForSpec(root, specId, config);
    if (!hasCompanion) continue;

    const specMdPath = path.join(entry.dir, "01_Spec.md");
    const body = await readSafe(specMdPath);
    if (body.length === 0) continue;
    if (SURFACE_TYPE_FRONTMATTER_RE.test(body)) continue;

    const relPath = path.relative(root, specMdPath).replace(/\\/g, "/");
    findings.push(
      issue(
        "D-SURFACE-TYPE-MISSING",
        `[D-SURFACE-TYPE-MISSING] ${relPath}: spec-${specId} has a UI contract companion under ${path.posix.join(
          config.paths.contractsDir.replace(/\\/g, "/"),
          "ui",
        )}/ but its frontmatter does not declare 'surface_type: ui-bearing'`,
        severity,
        relPath,
        "sdd.surfaceTypeDrift",
        [`spec-${specId}`, "D-SURFACE-TYPE-MISSING"],
        "canonical",
        severity === "error"
          ? `Add 'surface_type: ui-bearing' to the spec frontmatter (or rerun /qfai-sdd which auto-populates it). This is past its announced sunset (v${SUNSETS.surfaceTypeMissing}) and now blocks: without the marker the spec is excluded from the UI-bearing set, so its screens are skipped downstream.`
          : `Add 'surface_type: ui-bearing' to the spec frontmatter (or rerun /qfai-sdd which auto-populates it). This escalates to error at v${SUNSETS.surfaceTypeMissing}; until then treat it as priority-2 cleanup rather than blocking.`,
      ),
    );
  }

  return findings;
}

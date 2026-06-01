/**
 * D-SURFACE-TYPE-MISSING — warns when a spec has a matching UI
 * companion under `<contractsDir>/ui/` but its `01_Spec.md`
 * frontmatter does not declare `surface_type: ui-bearing`.
 *
 * Severity is `warning` during the deprecation window; it escalates
 * to `error` in a future minor release once ecosystem
 * `surface_type` population is broadly complete. The precise sunset
 * version is intentionally NOT recorded here — the canonical
 * version source for QFAI is `package.json#version`, and pinning a
 * specific future minor in the distributed surface would be a
 * second internal version source that could drift if the sunset
 * slips. CHANGELOG and the migration memo carry the operational
 * schedule; runtime / JSDoc surfaces stay version-agnostic.
 * Specs without a UI companion emit no finding.
 */
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { hasUiCompanionForSpec } from "../detection/surfaceType.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

const SURFACE_TYPE_FRONTMATTER_RE = /^\s*surface_type\s*:\s*ui-bearing\s*$/im;

export async function validateSurfaceTypeDrift(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = path.resolve(root, config.paths.specsDir);
  let entries: Awaited<ReturnType<typeof collectSpecEntries>>;
  try {
    entries = await collectSpecEntries(specsRoot);
  } catch {
    return [];
  }

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
        "warning",
        relPath,
        "sdd.surfaceTypeDrift",
        [`spec-${specId}`, "D-SURFACE-TYPE-MISSING"],
        "canonical",
        "Add 'surface_type: ui-bearing' to the spec frontmatter (or rerun /qfai-sdd which auto-populates it). This warning is scheduled to escalate to error in a future minor release once ecosystem surface_type population is broadly complete; treat it as priority-2 cleanup rather than blocking. See CHANGELOG / migration memo for the operational schedule.",
      ),
    );
  }

  return findings;
}

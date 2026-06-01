/**
 * D-SURFACE-TYPE-MISSING — warns when a spec has a matching UI
 * companion under `<contractsDir>/ui/` but its `01_Spec.md`
 * frontmatter does not declare `surface_type: ui-bearing`.
 *
 * Severity is `warning` during the deprecation window; it escalates
 * to `error` at the qfai 1.10.0 sunset (one-minor window from the
 * v1.9.x family). The sunset is pinned by the v1.9.2 second-wave
 * migration memo (§12). Specs without a UI companion emit no
 * finding. The `qfai 1.10.0` handle uses no leading `v` so the
 * distributed-surface version-marker guard (which anchors on
 * `\bv[0-9]+\.[0-9]+...`) does not trip.
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
        "Add 'surface_type: ui-bearing' to the spec frontmatter (or rerun /qfai-sdd which auto-populates it). This warning escalates to error at the qfai 1.10.0 sunset (one-minor window pinned by the v1.9.2 second-wave migration memo §12); treat it as priority-2 cleanup before then rather than blocking.",
      ),
    );
  }

  return findings;
}

/**
 * D-SURFACE-TYPE-MISSING — warns when a spec has a matching UI
 * companion under `<contractsDir>/ui/` but its `01_Spec.md`
 * frontmatter does not declare `surface_type: ui-bearing`.
 *
 * Severity is computed from the running version against
 * `SUNSETS.surfaceTypeMissing`: `warning` inside the window, `error` from the
 * sunset onwards.
 *
 * A hard-coded `warning` avoids pinning the sunset here on the reasoning that
 * doing so would create "a second internal version source that could drift" —
 * but leaving the version out does not avoid drift, it guarantees it: the
 * finding would keep saying "scheduled to escalate in a future minor release"
 * at the version where the escalation is already due. `core/sunset.ts` is the
 * single source both this severity and that sentence read.
 * Specs without a UI companion emit no finding.
 */
import path from "node:path";

import type { QfaiConfig } from "../config.js";
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

  const severity = "error" as const;
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
        `Add 'surface_type: ui-bearing' to the spec frontmatter (or rerun /qfai-sdd which auto-populates it). Without the marker the spec is excluded from the UI-bearing set, so its screens are skipped downstream.`,
      ),
    );
  }

  return findings;
}

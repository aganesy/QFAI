/**
 * Reviewer-Gate finding `R-DESIGN-MD-PATCH-OUT-OF-ZONE` (severity
 * warning).
 *
 * Emitted when a DESIGN.md edit touches token paths that the
 * front-matter `patch_zone:` block did not authorize. Mirrors the
 * `detectMockHrefDrift` SSOT-sync pattern: a pure function takes the
 * before/after text and returns the issues that fire.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { findOutOfZoneTokenEdits, parseDesignMdPatchZone } from "../design/designMdPatchZone.js";
import { exists, issue } from "./utils.js";

export type DesignMdPatchOutOfZoneInput = {
  readonly filePath: string;
  readonly before: string;
  readonly after: string;
};

const ROOT_DESIGN_MD_REL = "DESIGN.md";
const DESIGN_MD_BACKUP_REL = ".qfai/contracts/design/DESIGN.md.backup";

/**
 * Pure-function detector. Given the prior and current bytes of a
 * DESIGN.md file, return `R-DESIGN-MD-PATCH-OUT-OF-ZONE` (warning)
 * issues when an out-of-zone edit is observed.
 *
 * Returns zero issues when:
 *   - the before-text has no `patch_zone:` block (legacy behavior;
 *     every edit is implicitly out-of-zone but the reviewer finding is
 *     scoped to projects that opted into the feature), OR
 *   - the diff is fully contained in the zone, OR
 *   - before / after bytes are identical.
 *
 * Returns exactly one issue with a non-empty justification listing the
 * file, the declared zone, and the offending token paths when the diff
 * leaves the zone.
 */
export function detectDesignMdPatchOutOfZone(input: DesignMdPatchOutOfZoneInput): readonly Issue[] {
  if (input.before === input.after) return [];
  const zoneResult = parseDesignMdPatchZone(input.before);
  // Removal of the patch_zone block itself: the AFTER text has no
  // zone declared, while the BEFORE text did. This is treated as an
  // out-of-zone edit (operator removed the structural anchor).
  const afterZoneResult = parseDesignMdPatchZone(input.after);
  if (zoneResult.ok && !afterZoneResult.ok) {
    return [
      issue(
        "R-DESIGN-MD-PATCH-OUT-OF-ZONE",
        `R-DESIGN-MD-PATCH-OUT-OF-ZONE: ${input.filePath} removed the patch_zone block; ` +
          `the declared zone (tokens=[${zoneResult.zone.tokens.join(", ")}]) is no ` +
          `longer present in the AFTER text so every subsequent edit is implicitly ` +
          `out-of-zone. Justification: file=${input.filePath}, removed=patch_zone, ` +
          `prior tokens=[${zoneResult.zone.tokens.join(", ")}].`,
        "warning",
        input.filePath,
        "reviewerGate.designMdPatchOutOfZone",
      ),
    ];
  }
  if (!zoneResult.ok) {
    // No prior zone declared; this validator does not fire (legacy
    // behavior). The repo-level zero-zone state is the pre-feature
    // baseline.
    return [];
  }
  const offending = findOutOfZoneTokenEdits(input.before, input.after, zoneResult.zone);
  if (offending.length === 0) return [];
  return [
    issue(
      "R-DESIGN-MD-PATCH-OUT-OF-ZONE",
      `R-DESIGN-MD-PATCH-OUT-OF-ZONE: ${input.filePath} contains edits outside the ` +
        `declared patch_zone. Justification: file=${input.filePath}, ` +
        `zone tokens=[${zoneResult.zone.tokens.join(", ")}], ` +
        `offending tokens=[${offending.join(", ")}].`,
      "warning",
      input.filePath,
      "reviewerGate.designMdPatchOutOfZone",
    ),
  ];
}

/**
 * Profile-level validator entry point. Reads the live `DESIGN.md`
 * + an optional sibling `.backup` snapshot under
 * `.qfai/contracts/design/DESIGN.md.backup`. The pair-sync check
 * applies only when both files exist; without the backup snapshot
 * there is no prior state to diff against and the validator no-ops.
 *
 * The backup file is the operator-authored "what the lock was frozen
 * against" baseline. `qfai-sdd` Phase 0 writes it alongside the lock;
 * subsequent prototyping iterations consult the diff via this
 * validator.
 */
export async function validateDesignMdPatchZone(
  root: string,
  _config: QfaiConfig,
): Promise<readonly Issue[]> {
  const livePath = path.join(root, ROOT_DESIGN_MD_REL);
  const backupPath = path.join(root, DESIGN_MD_BACKUP_REL);
  if (!(await exists(livePath))) return [];
  if (!(await exists(backupPath))) return [];
  let before = "";
  let after = "";
  try {
    before = await readFile(backupPath, "utf-8");
    after = await readFile(livePath, "utf-8");
  } catch {
    return [];
  }
  return detectDesignMdPatchOutOfZone({
    filePath: ROOT_DESIGN_MD_REL,
    before,
    after,
  });
}

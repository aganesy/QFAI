/**
 * Canonical UIX rollout validators — v1.7.13
 *
 * Validates migration shape and applies the phase-1 ratchet.
 * Moved from legacy/uixCompatibility.ts to establish canonical ownership.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

// ---------------------------------------------------------------------------
// Canonical issue helper
// ---------------------------------------------------------------------------

function canonicalIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "canonical",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

// ---------------------------------------------------------------------------
// validateMigration
// ---------------------------------------------------------------------------

const CURRENT_SIDECAR_VERSION = "1.0.0";

export async function validateMigration(root: string, config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const strict = config.uiux?.migration?.strict === true;
  const issues: Issue[] = [];

  try {
    await readdir(path.join(root, "uiux"));
  } catch {
    issues.push(
      canonicalIssue(
        "UIX-VAL-MIGRATION-SIDECAR-MISSING",
        "UI-bearing spec detected but uiux/ sidecar directory is missing. Migration required.",
        strict ? "error" : "warning",
        "uiux/",
        "Run the UIX sidecar migration to create the uiux/ directory structure.",
      ),
    );
    return issues;
  }

  const versionPath = path.join(root, "uiux", ".sidecar-version");
  const versionContent = await readSafe(versionPath);
  if (versionContent) {
    const version = versionContent.trim();
    if (version && version !== CURRENT_SIDECAR_VERSION) {
      issues.push(
        canonicalIssue(
          "UIX-VAL-MIGRATION-STALE-VERSION",
          `Sidecar template version '${version}' is outdated (current: ${CURRENT_SIDECAR_VERSION}).`,
          "warning",
          "uiux/.sidecar-version",
          `Upgrade sidecar template from ${version} to ${CURRENT_SIDECAR_VERSION}. Run the migration tool for upgrade steps.`,
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// applyPhase1Ratchet
// ---------------------------------------------------------------------------

/**
 * Within Phase 1 (30 days of release), all UIX-VAL issues are downgraded
 * to warning-only regardless of configuration.
 */
export function applyPhase1Ratchet(
  issues: Issue[],
  releaseDate: Date,
  now: Date = new Date(),
): Issue[] {
  const phase1EndMs = releaseDate.getTime() + 30 * 24 * 60 * 60 * 1000;
  if (now.getTime() > phase1EndMs) return issues;

  return issues.map((iss) => {
    if (iss.code.startsWith("UIX-VAL-") && iss.severity === "error") {
      return { ...iss, severity: "warning" as const };
    }
    return iss;
  });
}

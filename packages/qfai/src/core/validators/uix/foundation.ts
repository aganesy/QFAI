/**
 * Canonical UIX foundation validator — v1.7.13
 *
 * Validates sidecar directory presence for UI-bearing specs.
 * Moved from legacy/uixCompatibility.ts to establish canonical ownership.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";

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
// validateSidecarMissing
// ---------------------------------------------------------------------------

export async function validateSidecarMissing(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  try {
    await readdir(path.join(root, "uiux"));
    return [];
  } catch {
    return [
      canonicalIssue(
        "UIX-VAL-SIDECAR-MISSING",
        "UI-bearing spec detected but uiux/ sidecar directory is missing.",
        "error",
        "uiux/",
        "Create the uiux/ directory and populate it with the sidecar template files.",
      ),
    ];
  }
}

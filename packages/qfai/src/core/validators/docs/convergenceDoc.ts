/**
 * Doc convergence validator — spec-0037
 *
 * Validates that the master convergence document exists
 * with required canonical structure sections.
 *
 * BR-0037-0013
 */
import path from "node:path";

import type { Issue } from "../../types.js";
import { readSafe } from "../utils.js";

const REQUIRED_SECTIONS = ["canonical model", "subsystem maturity", "cross-reference"] as const;

export type ConvergenceDocResult = {
  exists: boolean;
  hasSections: string[];
  missingSections: string[];
  issues: Issue[];
};

/**
 * Validate the convergence document exists and has required sections.
 */
export async function validateConvergenceDoc(steeringDir: string): Promise<ConvergenceDocResult> {
  const issues: Issue[] = [];

  const docPath = path.join(steeringDir, "convergence.md");
  const content = await readSafe(docPath);

  if (!content) {
    issues.push({
      code: "QFAI-DOC-CONVERGENCE-MISSING",
      severity: "error",
      category: "compatibility",
      message: "Master convergence document is missing from steering directory.",
      file: "steering/convergence.md",
      suggested_action:
        "Create convergence.md in the steering directory with canonical baseline sections.",
    });
    return { exists: false, hasSections: [], missingSections: [...REQUIRED_SECTIONS], issues };
  }

  const lower = content.toLowerCase();
  const hasSections: string[] = [];
  const missingSections: string[] = [];

  for (const section of REQUIRED_SECTIONS) {
    if (lower.includes(section)) {
      hasSections.push(section);
    } else {
      missingSections.push(section);
    }
  }

  if (missingSections.length > 0) {
    issues.push({
      code: "QFAI-DOC-CONVERGENCE-INCOMPLETE",
      severity: "error",
      category: "compatibility",
      message: `Convergence document missing required sections: ${missingSections.join(", ")}`,
      file: "steering/convergence.md",
      suggested_action: `Add the following sections to convergence.md: ${missingSections.join(", ")}`,
    });
  }

  return { exists: true, hasSections, missingSections, issues };
}

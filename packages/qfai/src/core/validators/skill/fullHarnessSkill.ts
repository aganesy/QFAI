/**
 * Full-harness skill validator — spec-0035
 *
 * Validates that the full-harness skill file exists with proper
 * workflow structure including evidence, reviewer, and calibration sections.
 *
 * BR-0035-0009, BR-0035-0010, BR-0035-0011, BR-0035-0012, BR-0035-0013
 */
import path from "node:path";

import type { Issue, IssueSeverity } from "../../types.js";
import { readSafe } from "../utils.js";

function harnessIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "compatibility",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

export type FullHarnessValidationResult = {
  skillFileExists: boolean;
  hasWorkflowLoop: boolean;
  hasEvidenceCollection: boolean;
  hasReviewerInvocation: boolean;
  hasCalibrationObligation: boolean;
  issues: Issue[];
};

const WORKFLOW_INDICATORS = [
  "iteration",
  "loop",
  "convergence",
  "evidence",
] as const;

const EVIDENCE_INDICATORS = [
  "render evidence",
  "test results",
  "validator output",
  "evidence collection",
] as const;

const REVIEWER_INDICATORS = [
  "reviewer",
  "review findings",
  "review summary",
] as const;

const CALIBRATION_INDICATORS = [
  "calibration",
  "scoring-ready",
  "threshold",
] as const;

/**
 * Validate full-harness skill file content and structure.
 */
export async function validateFullHarnessSkill(
  skillsDir: string,
): Promise<FullHarnessValidationResult> {
  const issues: Issue[] = [];

  // Check for dedicated skill file
  const skillPath = path.join(skillsDir, "qfai-prototyping-full-harness");
  const skillMdPath = path.join(skillPath, "SKILL.md");
  const content = await readSafe(skillMdPath);

  const skillFileExists = content.length > 0;

  if (!skillFileExists) {
    issues.push(
      harnessIssue(
        "UIX-VAL-FULL-HARNESS-ENTRYPOINT-MISSING",
        "Dedicated full-harness skill file is missing.",
        "error",
        "qfai-prototyping-full-harness/SKILL.md",
        "Create a dedicated full-harness skill file at the skills directory.",
      ),
    );
    return {
      skillFileExists: false,
      hasWorkflowLoop: false,
      hasEvidenceCollection: false,
      hasReviewerInvocation: false,
      hasCalibrationObligation: false,
      issues,
    };
  }

  const lower = content.toLowerCase();

  const hasWorkflowLoop = WORKFLOW_INDICATORS.some((i) => lower.includes(i))
    && !isRoutingOnly(lower);
  const hasEvidenceCollection = EVIDENCE_INDICATORS.some((i) => lower.includes(i));
  const hasReviewerInvocation = REVIEWER_INDICATORS.some((i) => lower.includes(i));
  const hasCalibrationObligation = CALIBRATION_INDICATORS.some((i) => lower.includes(i));

  if (!hasWorkflowLoop) {
    issues.push(
      harnessIssue(
        "UIX-VAL-FULL-HARNESS-NO-WORKFLOW",
        "Full-harness skill file does not define a workflow loop.",
        "error",
        "qfai-prototyping-full-harness/SKILL.md",
        "Add workflow loop definition with iteration, evidence, review, and calibration steps.",
      ),
    );
  }

  return {
    skillFileExists,
    hasWorkflowLoop,
    hasEvidenceCollection,
    hasReviewerInvocation,
    hasCalibrationObligation,
    issues,
  };
}

/**
 * Detect routing-only content (skill file that only redirects
 * to another command without defining its own workflow).
 */
function isRoutingOnly(content: string): boolean {
  const routingPatterns = [
    /^this\s+skill\s+(?:routes?|redirects?|delegates?)\s+to/im,
    /^see\s+`?qfai\s+prototyping/im,
  ];
  return routingPatterns.some((p) => p.test(content));
}

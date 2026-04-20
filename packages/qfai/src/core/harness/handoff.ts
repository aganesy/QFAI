import type { FullHarnessExitReason } from "./exitReason.js";

export type FullHarnessHandoff = {
  selected_build: string;
  artifact_refs: string[];
  outstanding_issues: string[];
  required_human_review_points: string[];
  exit_reason: FullHarnessExitReason;
  next_recommended_action: string;
};

export function createFullHarnessHandoff(input: {
  selectedBuild: string;
  artifactRefs: string[];
  exitReason: FullHarnessExitReason;
  outstandingIssues?: string[];
  requiredHumanReviewPoints?: string[];
}): FullHarnessHandoff {
  return {
    selected_build: input.selectedBuild,
    artifact_refs: input.artifactRefs,
    outstanding_issues: input.outstandingIssues ?? [],
    required_human_review_points: input.requiredHumanReviewPoints ?? [],
    exit_reason: input.exitReason,
    next_recommended_action:
      input.exitReason === "quality-threshold-met"
        ? "Proceed to human validation of the selected build."
        : "Review the outstanding issues and rerun full-harness after fixes.",
  };
}

/**
 * Reviewer identity validation — v1.7.15
 *
 * CLI --reviewer is mandatory for full-harness.
 * Placeholders are rejected.
 */

import { REVIEWER_PLACEHOLDERS } from "./types.js";

export function validateReviewer(reviewer: string | undefined): string {
  if (reviewer === undefined) {
    throw new Error(
      "Full-harness mode requires --reviewer <id>. " +
        "Reviewer must be a real person or team identifier.",
    );
  }
  const normalized = reviewer.trim().toLowerCase();
  if (REVIEWER_PLACEHOLDERS.includes(normalized)) {
    throw new Error(
      `Reviewer "${reviewer}" is a placeholder value. ` +
        "Full-harness mode requires a real reviewer identifier. " +
        `Rejected values: ${REVIEWER_PLACEHOLDERS.filter(Boolean).join(", ")}`,
    );
  }
  return reviewer.trim();
}

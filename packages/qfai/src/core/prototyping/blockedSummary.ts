/**
 * `[BLOCKED] exit-64 prevented by:` summary for non-converged cycles.
 *
 * Three blocker categories, stable + additive-only (additions to this
 * list require a spec amendment). The order is the emission order in
 * the summary stdout. Numbers + first-offender details are derived from
 * the accepted iteration's runtime gate output:
 *
 *   - designMdViolations     — count + first offender `{kind}={found}`
 *   - layoutAntiPatternsDetected — count + first offender code/id
 *   - blockingFindings       — count + the first line the reviewer wrote
 *
 * Pure / deterministic. No I/O; the caller supplies the iteration shape
 * directly.
 */

import type { DesignMdViolation } from "./designMdViolations.js";

export const BLOCKED_CATEGORIES = [
  "designMdViolations",
  "layoutAntiPatternsDetected",
  "blockingFindings",
] as const;

export type BlockedCategory = (typeof BLOCKED_CATEGORIES)[number];

export type BlockedSummaryInput = {
  readonly designMdViolations: readonly DesignMdViolation[];
  readonly layoutAntiPatternsDetected: readonly string[];
  readonly blockingFindings: readonly string[];
};

export type BlockedCategoryLine = {
  readonly category: BlockedCategory;
  readonly count: number;
  readonly text: string;
};

function firstDesignMdViolationOffender(violations: readonly DesignMdViolation[]): string {
  const first = violations[0];
  if (first === undefined) return "none";
  return `${first.kind}=${first.found}`;
}

function firstLayoutAntiPatternOffender(lap: readonly string[]): string {
  const first = lap[0];
  if (first === undefined) return "none";
  return first;
}

export function buildBlockedCategoryLines(
  input: BlockedSummaryInput,
): readonly BlockedCategoryLine[] {
  const dmvCount = input.designMdViolations.length;
  const lapCount = input.layoutAntiPatternsDetected.length;
  const findingCount = input.blockingFindings.length;
  return [
    {
      category: "designMdViolations",
      count: dmvCount,
      text:
        dmvCount === 0
          ? "0 designMdViolations"
          : `${dmvCount} designMdViolations (top: ${firstDesignMdViolationOffender(input.designMdViolations)})`,
    },
    {
      category: "layoutAntiPatternsDetected",
      count: lapCount,
      text:
        lapCount === 0
          ? "0 layoutAntiPatternsDetected"
          : `${lapCount} layoutAntiPatternsDetected (top: ${firstLayoutAntiPatternOffender(input.layoutAntiPatternsDetected)})`,
    },
    {
      category: "blockingFindings",
      count: findingCount,
      text:
        findingCount === 0
          ? "0 blockingFindings"
          : `${findingCount} blockingFindings (top: ${input.blockingFindings[0] ?? "none"})`,
    },
  ];
}

export const BLOCKED_SUMMARY_HEADER = "[BLOCKED] exit-64 prevented by:";

/**
 * Build the full multi-line summary text. The first line is the literal
 * header anchored by the unit test ledger; the following 3 lines are
 * the per-category descriptors in stable order.
 */
export function buildBlockedSummary(input: BlockedSummaryInput): string {
  const lines = buildBlockedCategoryLines(input);
  return [BLOCKED_SUMMARY_HEADER, ...lines.map((l) => `  - ${l.text}`)].join("\n");
}

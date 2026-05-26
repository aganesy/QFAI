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
 *   - axes-below-exceptional — count of axes not at exceptional + first
 *     offender axis name + current ordinal
 *
 * Pure / deterministic. No I/O; the caller supplies the iteration shape
 * directly.
 */

import type { DesignMdViolation } from "./designMdViolations.js";

export const BLOCKED_CATEGORIES = [
  "designMdViolations",
  "layoutAntiPatternsDetected",
  "axes-below-exceptional",
] as const;

export type BlockedCategory = (typeof BLOCKED_CATEGORIES)[number];

export type BlockedSummaryInput = {
  readonly designMdViolations: readonly DesignMdViolation[];
  readonly layoutAntiPatternsDetected: readonly string[];
  readonly scores: {
    readonly informationArchitecture: string;
    readonly navigationFlow: string;
    readonly usability: string;
    readonly functionality: string;
  };
};

export type BlockedCategoryLine = {
  readonly category: BlockedCategory;
  readonly count: number;
  readonly text: string;
};

const AXIS_LABELS: readonly { readonly key: keyof BlockedSummaryInput["scores"]; readonly label: string }[] = [
  { key: "informationArchitecture", label: "informationArchitecture" },
  { key: "navigationFlow", label: "navigationFlow" },
  { key: "usability", label: "usability" },
  { key: "functionality", label: "functionality" },
];

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

function axesBelowExceptional(scores: BlockedSummaryInput["scores"]): {
  count: number;
  first: { axis: string; current: string } | null;
} {
  let count = 0;
  let first: { axis: string; current: string } | null = null;
  for (const { key, label } of AXIS_LABELS) {
    const v = scores[key];
    if (v !== "exceptional") {
      count += 1;
      if (first === null) first = { axis: label, current: v };
    }
  }
  return { count, first };
}

export function buildBlockedCategoryLines(
  input: BlockedSummaryInput,
): readonly BlockedCategoryLine[] {
  const dmvCount = input.designMdViolations.length;
  const lapCount = input.layoutAntiPatternsDetected.length;
  const axes = axesBelowExceptional(input.scores);
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
          ? "0 anti-patterns"
          : `${lapCount} anti-patterns (top: ${firstLayoutAntiPatternOffender(input.layoutAntiPatternsDetected)})`,
    },
    {
      category: "axes-below-exceptional",
      count: axes.count,
      text:
        axes.count === 0
          ? "0 axes below exceptional"
          : `${axes.count} ${axes.count === 1 ? "axis" : "axes"} below exceptional (${axes.first?.axis ?? "n/a"}: ${axes.first?.current ?? "n/a"})`,
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

/**
 * Counted signals for one screen.
 *
 * A count is not a score. Twelve controls on a screen declaring one primary
 * task is an observation anyone can reproduce from the capture; rating that
 * screen `strong` is a judgement with a number painted on it. So nothing here
 * aggregates, weights or thresholds: the reviewer reads the numbers, decides
 * whether one indicates something unasked-for, and raises a finding citing it.
 *
 * The two ratios are the ones that answer "the screen explains too much": a
 * page introduction, a line under every field and a dump of every available
 * parameter each move one of them. Both are contract-relative, so neither
 * needs a global threshold — the denominator comes from the screen's own
 * declared tasks and its own control count.
 *
 * The DOM half is in `core/uiux/htmlMockDom.ts`, which loads jsdom lazily.
 * This half is arithmetic and formatting, so it stays importable without
 * paying for that.
 */
import type { ScreenElementCounts } from "../uiux/htmlMockDom.js";

export type ScreenSignals = ScreenElementCounts & {
  readonly screen: string;
  /** Declared `primary_tasks` for this screen: the denominator criterion 7 reads against. */
  readonly primaryTasks: number;
  /** Controls per declared task, or `null` when the contract declares no task to divide by. */
  readonly controlsPerTask: number | null;
  /** Explanatory words per control, or `null` when the screen has no control to divide by. */
  readonly explanatoryWordsPerControl: number | null;
};

/** Two decimals, so a ratio reads as a measurement rather than as a float. */
function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 100) / 100;
}

export function buildScreenSignals(
  screen: string,
  counts: ScreenElementCounts,
  primaryTasks: number,
): ScreenSignals {
  return {
    ...counts,
    screen,
    primaryTasks,
    controlsPerTask: ratio(counts.interactiveControls, primaryTasks),
    explanatoryWordsPerControl: ratio(counts.explanatoryWords, counts.interactiveControls),
  };
}

/** `null` reads as the absent denominator it is, not as zero. */
function show(value: number | null): string {
  return value === null ? "n/a" : String(value);
}

/**
 * One line per screen, in the operator's output.
 *
 * Printed as well as written because the numbers are the reviewer's input for
 * the cycle that follows, and a run whose signals nobody saw is one where the
 * counts get made up instead.
 */
export function formatScreenSignals(signals: ScreenSignals): string {
  return (
    `${signals.screen}: ${signals.interactiveControls} controls ` +
    `(${show(signals.controlsPerTask)} per declared task), ` +
    `${signals.explanatoryWords} explanatory of ${signals.words} words ` +
    `(${show(signals.explanatoryWordsPerControl)} per control), ` +
    `depth ${signals.maxDepth}, ${signals.distinctElementTypes} element types`
  );
}

export const SCREEN_SIGNALS_HEADER = "[SIGNALS] counted from this cycle's captures:";

export function formatScreenSignalsBlock(signals: readonly ScreenSignals[]): string {
  return [SCREEN_SIGNALS_HEADER, ...signals.map((s) => `  - ${formatScreenSignals(s)}`)].join("\n");
}

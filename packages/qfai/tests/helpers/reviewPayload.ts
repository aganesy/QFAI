/**
 * Schema-valid, converged `<screen>.review.json` fixture.
 *
 * `qfai prototyping certify` parses every per-(spec × screen) review
 * payload it finds against the shipped reviewer payload reference
 * (`.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`),
 * checks that its `(specId, screenId, cycle)` identifies the pair and
 * accepted iteration it is stored under, and re-derives convergence
 * from it — so certify fixtures cannot use a placeholder object any
 * more. One definition here keeps the certify suites in lock-step with
 * `parseEvaluatorReview`.
 *
 * Defaults describe a converged payload at the accepted iteration the
 * certify fixtures use (`iter-01`); overrides exist so a test can aim a
 * single field at one gate.
 */
export type ReviewPayloadOverrides = {
  readonly cycle?: number;
  readonly sessionStatus?: "ok" | "retryExhausted" | "launchFailed";
  readonly axis?: "weak" | "acceptable" | "strong" | "exceptional";
  readonly layoutAntiPatternsDetected?: readonly string[];
  readonly designMdViolations?: ReadonlyArray<{ kind: string; found: string }>;
};

export function reviewPayload(
  specId: string,
  screenId: string,
  overrides: ReviewPayloadOverrides = {},
): string {
  const axis = overrides.axis ?? "exceptional";
  return JSON.stringify({
    specId,
    screenId,
    cycle: overrides.cycle ?? 1,
    sessionStatus: overrides.sessionStatus ?? "ok",
    retryCount: 0,
    ordinalAxes: {
      informationArchitecture: axis,
      navigationFlow: axis,
      usability: axis,
      functionality: axis,
    },
    impressions: {
      operability: "Controls respond predictably.",
      transitionFeel: "Transitions are calm.",
      crossScreenContinuity: "Layout holds across screens.",
      userStoryFeel: "The story reads end to end.",
      acceptanceCriteriaFeel: "Criteria are observable.",
      menuReachabilityFeel: "Every menu entry is reachable.",
    },
    layoutAntiPatternsDetected: overrides.layoutAntiPatternsDetected ?? [],
    designMdViolations: overrides.designMdViolations ?? [],
    wallTimeSec: 42,
    softWarnings: { timeBudget: false },
  });
}

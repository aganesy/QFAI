/**
 * Schema-valid `<screen>.review.json` fixture.
 *
 * `qfai prototyping certify` parses every per-(spec × screen) review
 * payload it finds against the shipped reviewer payload reference
 * (`.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`),
 * so certify fixtures cannot use a placeholder object any more — a
 * present-but-unparsable payload is a coverage rejection (exit 64).
 * One definition here keeps the certify suites in lock-step with
 * `parseEvaluatorReview`.
 */
export function reviewPayload(specId: string, screenId: string): string {
  return JSON.stringify({
    specId,
    screenId,
    cycle: 1,
    sessionStatus: "ok",
    retryCount: 0,
    ordinalAxes: {
      informationArchitecture: "strong",
      navigationFlow: "strong",
      usability: "strong",
      functionality: "strong",
    },
    impressions: {
      operability: "Controls respond predictably.",
      transitionFeel: "Transitions are calm.",
      crossScreenContinuity: "Layout holds across screens.",
      userStoryFeel: "The story reads end to end.",
      acceptanceCriteriaFeel: "Criteria are observable.",
      menuReachabilityFeel: "Every menu entry is reachable.",
    },
    layoutAntiPatternsDetected: [],
    designMdViolations: [],
    wallTimeSec: 42,
    softWarnings: { timeBudget: false },
  });
}

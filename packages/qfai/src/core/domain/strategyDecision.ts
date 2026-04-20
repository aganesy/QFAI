export const CANONICAL_STRATEGY_DECISIONS = [
  "template",
  "component-library",
  "design-system",
  "native-pattern",
  "bespoke",
  "none",
] as const;

export type CanonicalStrategyDecision = (typeof CANONICAL_STRATEGY_DECISIONS)[number];

const CANONICAL_STRATEGY_DECISION_SET = new Set<string>(CANONICAL_STRATEGY_DECISIONS);

export function isCanonicalStrategyDecision(value: string): value is CanonicalStrategyDecision {
  return CANONICAL_STRATEGY_DECISION_SET.has(value);
}

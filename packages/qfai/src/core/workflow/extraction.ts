// The facts `qfai-run` reads out of a request, each from a closed vocabulary. The decision rules
// read them, and nothing else, to choose the route.

export const INTENTS = [
  "question-how",
  "question-why",
  "question-help",
  "question-hosted",
  "no-work",
  "defect",
  "defect-regression",
  "defect-silent",
  "defect-crash",
  "defect-conformance",
  "performance",
  "security",
  "surface-contradiction",
  "model-gap",
  "unenforced",
  "stale-record",
  "feature",
  "design",
  "epic",
  "behaviour-change",
  "deprecation",
  "refactor",
  "docs",
  "flaky-test",
  "test-defect",
  "ci",
  "dependency",
  "release",
  "order",
  "follow-up",
] as const;

export const ENTRY_FLAGS = [
  "repro",
  "cause",
  "fix",
  "expect",
  "decision",
  "upstream",
  "bundle",
  "vague",
  "last-good",
  "env",
  "intermittent",
  "trace",
  "bot",
  "measured",
  "stale",
] as const;

export const QUALIFIERS = [
  "docs-answerable",
  "known-duplicate",
  "mixed-bundle",
  "human-run",
  "distribution-incident",
  "settled-design",
  "red-since-change",
  "check-misses",
  "mechanism-inert",
  "removal-requested",
  "visual-open",
] as const;

export const SIGNALS = [
  "approved-record-task",
  "grilling-required",
  "decide-by-change-request",
  "disabled-test",
  "flaky-label",
  "backport",
  "release-notes",
  "test-plan",
] as const;

export const RISKS = [
  "security",
  "data-loss",
  "silent",
  "breaking",
  "upgrade",
  "performance",
] as const;

export const ARTIFACTS = [
  "code",
  "tests",
  "spec",
  "contract",
  "ui",
  "docs",
  "config",
  "ci",
  "deps",
  "data",
  "release",
  "assistant",
] as const;

export const CONFIDENCES = ["high", "medium", "low"] as const;

export type Intent = (typeof INTENTS)[number];
export type EntryFlag = (typeof ENTRY_FLAGS)[number];
export type Qualifier = (typeof QUALIFIERS)[number];
export type Signal = (typeof SIGNALS)[number];
export type Risk = (typeof RISKS)[number];
export type Artifact = (typeof ARTIFACTS)[number];
export type Confidence = (typeof CONFIDENCES)[number];

// One reading of a request: what it asks for, and the facts that refine it.
export interface RoutingReading {
  intent: Intent | null;
  entryFlags: EntryFlag[];
  qualifiers: Qualifier[];
  signals: Signal[];
}

// The main reading, the facts every reading shares, and at lower confidence the other readings.
export interface WorkflowExtraction extends RoutingReading {
  risks: Risk[];
  artifacts: Artifact[];
  confidence: Confidence;
  alternatives?: RoutingReading[];
}

// Alternatives are one or two readings: required at `low`, allowed at `medium`, refused at
// `high`.
export function alternativesFit(confidence: unknown, alternatives: unknown): boolean {
  const count = Array.isArray(alternatives) ? alternatives.length : 0;
  if (alternatives !== undefined && (count < 1 || count > 2)) return false;
  if (confidence === "high") return alternatives === undefined;
  if (confidence === "low") return count > 0;
  return true;
}

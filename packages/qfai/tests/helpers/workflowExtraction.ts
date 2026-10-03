/**
 * Extractions for workflow tests: a routing result carries the facts read out of a request, and
 * the core's decision rules choose the route from them.
 */
import type { WorkflowExtraction } from "../../src/core/workflow/extraction.js";

/** A high-confidence extraction with nothing set but what `fields` gives. */
export function extraction(fields: Partial<WorkflowExtraction> = {}): WorkflowExtraction {
  return {
    intent: "feature",
    entryFlags: [],
    qualifiers: [],
    signals: [],
    risks: [],
    artifacts: ["code", "tests"],
    confidence: "high",
    ...fields,
  };
}

// The facts that route to each route the decision rules can reach. `revert-culprit` is reached
// only by a re-route, so no extraction routes to it.
const BY_ROUTE: Record<string, Partial<WorkflowExtraction>> = {
  "close-no-change": { intent: "no-work" },
  "answer-question": { intent: "question-how" },
  "investigate-question": { intent: "question-why" },
  "request-info": { intent: "defect", entryFlags: ["vague"] },
  "close-duplicate": { intent: "defect", entryFlags: ["stale"] },
  "cluster-reports": { intent: "defect-crash", entryFlags: ["bot"] },
  "decide-acceptance": { intent: "feature", entryFlags: ["decision"] },
  "decide-design": { intent: "design" },
  "decompose-epic": { intent: "epic" },
  "retriage-bundle": { intent: "follow-up" },
  "repair-consistency": { intent: "surface-contradiction" },
  "sweep-guard": { intent: "unenforced", qualifiers: ["check-misses"] },
  "retire-mechanism": { intent: "unenforced", qualifiers: ["removal-requested"] },
  "restate-records": { intent: "stale-record" },
  "add-feature": { intent: "feature" },
  "prototype-feature": { intent: "feature", qualifiers: ["visual-open"] },
  "change-compatibility": { intent: "deprecation" },
  "apply-settled-spec": { intent: "order", artifacts: ["spec"] },
  "apply-settled-build": { intent: "order", artifacts: ["code", "tests"] },
  "refactor-code": { intent: "refactor" },
  "edit-text": { intent: "docs", artifacts: ["docs"] },
  "fix-defect": { intent: "defect" },
  "fix-regression": { intent: "defect-regression", entryFlags: ["repro", "last-good"] },
  "improve-performance": { intent: "performance", entryFlags: ["measured"] },
  "fix-vulnerability": { intent: "security" },
  "fix-crash": { intent: "defect-crash", entryFlags: ["trace"] },
  "fix-intermittent": { intent: "defect", entryFlags: ["intermittent"] },
  "fix-env-bound": { intent: "defect", entryFlags: ["env"] },
  "fix-conformance": { intent: "defect-conformance" },
  "quarantine-flaky": { intent: "flaky-test" },
  "repair-test": { intent: "test-defect" },
  "fix-red-main": { intent: "ci", qualifiers: ["red-since-change"] },
  "change-tooling": { intent: "ci" },
  "bump-dependency": { intent: "dependency" },
  "hand-off-operation": { intent: "order", qualifiers: ["human-run"] },
  "backport-fix": { intent: "release", signals: ["backport"] },
  "draft-release-notes": { intent: "release", signals: ["release-notes"] },
  "verify-manually": { intent: "release", signals: ["test-plan"] },
};

/** The routes an extraction can reach, each with the extraction that reaches it. */
export const ROUTED_ROUTES = Object.keys(BY_ROUTE);

/** A high-confidence extraction the decision rules route to `route`. */
export function extractionFor(
  route: string,
  fields: Partial<WorkflowExtraction> = {},
): WorkflowExtraction {
  const facts = BY_ROUTE[route];
  if (!facts) throw new Error(`no extraction routes to ${route}`);
  return extraction({ ...facts, ...fields });
}

/**
 * Runs routed by the decision rules over the package's own plans, driven through `decide` the way
 * the command drives one: every decision becomes journal records and every snapshot is the
 * journal folded.
 */
import type { WorkflowExtraction } from "../../../src/core/workflow/extraction.js";
import { planFacts } from "../../../src/core/workflow/observe.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { JournalRun } from "../../unit/workflow/journalRun.js";

type Facts = Parameters<JournalRun["apply"]>[1];
type Decision = ReturnType<JournalRun["apply"]>;
type WorkOrder = ReturnType<JournalRun["next"]>;

export const FLOW = "BF-0001";

// The reviewers of the package's `heavy` review profile.
export const HEAVY_REVIEWERS = [
  "completion-reviewer",
  "architecture-reviewer",
  "requirements-reviewer",
  "implementation-reviewer",
];

const ROUTING_ORDER = {
  workOrderId: "work-order-route-1",
  stageInstanceId: "route",
  attempt: 1,
  stageKind: "route",
  executor: { skill: "qfai-run" },
  operation: "route",
};

/** A run in `routing` whose routing work order is outstanding. */
export function routingRun(runId = "run-20260928000000100"): JournalRun {
  const executionContext = {
    runId,
    qfaiVersion: "2.0.0",
    policyDigests: {},
    planDigests: {},
    harness: { host: "test", capabilities: {} },
    requestDigest: "",
  };
  const start = {
    completionTarget: "qfai_done" as const,
    baseline: { findings: [], toolVersion: "2.0.0", cliEntryDigest: "d", policyDigests: {} },
  };
  return new JournalRun([
    { event: "run-created", to: "created", executionContext, start },
    { event: "capture-request", from: "created", to: "routing" },
    { event: "work-order-issued", workOrder: ROUTING_ORDER },
  ]);
}

/** What routing and every stage of these runs is decided on. */
export async function runFacts(extra: Facts = {}): Promise<NonNullable<Facts>> {
  return {
    plans: await planFacts(),
    flows: [FLOW],
    heavyReviewerRoles: HEAVY_REVIEWERS,
    now: "2026-09-28T00:00:00.000Z",
    ...extra,
  };
}

/** A routing proposal carrying `facts`, binding BF-0001 where the route takes a flow. */
export function proposalWith(facts: Partial<WorkflowExtraction>, fields: object = {}) {
  return {
    requestKind: "routed",
    extraction: extraction(facts),
    goal: "Serve the request.",
    expectedBehaviorRefs: [{ kind: "request" as const, ref: "request" }],
    observedRefs: [],
    affectedFlowIds: [FLOW],
    riskSignals: [],
    unresolvedQuestions: [],
    newStories: [],
    proposedWriteScope: ["src/**", "tests/**"],
    protectedTargets: [],
    rationale: "The facts read out of the request.",
    ...fields,
  };
}

/** A run whose routing result carries `facts`, and the decision `accept` gave it. */
export async function routedBy(
  facts: Partial<WorkflowExtraction>,
  fields: object = {},
  extra: Facts = {},
) {
  const run = routingRun();
  const decision = run.accept(
    { testObservation: "not_applicable", proposal: proposalWith(facts, fields) },
    await runFacts(extra),
  );
  return { run, decision };
}

/** Answers the open question whose purpose is `purpose` with `optionId`. */
export function answerOpen(run: JournalRun, purpose: string | undefined, optionId: string) {
  const { run: state, openQuestions } = run.snapshot;
  const question = (openQuestions ?? []).find((open) => open.purpose === purpose);
  if (!question) throw new Error(`no open ${String(purpose)} question`);
  return run.apply(
    {
      operation: "decision",
      questionId: question.questionId,
      answer: { optionIds: [optionId] },
      answeredBy: "operator-1",
      expectedSequence: state.sequence,
    },
    { now: "2026-09-28T00:00:00.000Z" },
  );
}

/** The receipts a canned accepted result of the work order carries, every branch continuing. */
export function cannedFields(workOrder: WorkOrder): Record<string, unknown> {
  const steps = workOrder.steps ?? [];
  const names = steps.map((step) => step.name);
  const diagnoses = steps.some(
    (step) => step.name === "implement-diagnose" && step.mode !== "read-only",
  );
  const cited = { ids: ["EX-0001-0001-01"], digest: "e".repeat(64) };
  return {
    testObservation: "not_applicable",
    ...(diagnoses
      ? { diagnosis: { verdict: "missing-test", reproductionRef: "repro.md", matchedIds: [] } }
      : {}),
    ...(workOrder.stageKind === "test_fix"
      ? { testFix: { citedBefore: cited, citedAfter: cited, reviewRef: "r.md", rerunRef: "t.md" } }
      : {}),
    ...(workOrder.stageKind === "regression_fix"
      ? { regressionFix: { testId: "t-1", rerunRef: "t.md", reviewRef: "r.md" } }
      : {}),
    ...(names.includes("triage-close") ? { closure: { outcome: "answered", followUps: [] } } : {}),
  };
}

/**
 * Issues and accepts each stage with a canned result until `next` issues no work order. Returns
 * every work order issued and the `next` that issued none.
 */
export async function driveStages(run: JournalRun, extra: Facts = {}) {
  const facts = await runFacts(extra);
  const issued: WorkOrder[] = [];
  for (let step = 0; step < 12; step += 1) {
    const next: Decision = run.apply({ operation: "next" }, facts);
    const workOrder = next.verdict.workOrder;
    if (!workOrder) return { issued, last: next };
    issued.push(workOrder);
    const accepted = run.accept(cannedFields(workOrder), facts);
    if (!accepted.verdict.ok) throw new Error(JSON.stringify(accepted.verdict));
  }
  throw new Error("the plan did not end within twelve stages");
}

/** What `finish` observes on a run that changed nothing and whose gates all pass. */
export function quietCompletion(): NonNullable<NonNullable<Facts>["completion"]> {
  return {
    validate: { failOn: "error", findings: [] },
    toolVersion: "2.0.0",
    cliEntryDigest: "d",
    policyDigests: {},
    changedPaths: [],
    uncommittedPaths: [],
  };
}

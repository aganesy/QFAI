// QFAI:AC-0001-0215-02
// QFAI:AC-0001-0215-03
// QFAI:AC-0001-0215-04
// QFAI:AC-0001-0215-05
// QFAI:AC-0001-0215-06
// QFAI:AC-0001-0214-03

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import type { WorkflowExtraction } from "../../../src/core/workflow/extraction.js";
import { writeRunRecords } from "../../../src/core/workflow/fold.js";
import { stageResultRefusals } from "../../../src/core/workflow/parse.js";
import { JournalRun, planOf, readyWith } from "../../unit/workflow/journalRun.js";
import {
  FLOW,
  HEAVY_REVIEWERS,
  answerOpen,
  cannedFields,
  proposalWith,
  routedBy,
  runFacts,
} from "./decisionRuns.js";

type Facts = NonNullable<Parameters<JournalRun["apply"]>[1]>;
type Reading = Partial<WorkflowExtraction>;

// The commit and the run's tracked changes every operation observes, unchanged between them.
const REVISION: Facts = { head: "c0ffee", observedChangedPaths: [], fileDigests: {} };

// A reading of the request as a defect report with its reproduction and cause.
const DEFECT = { intent: "defect", entryFlags: ["repro", "cause"], qualifiers: [], signals: [] };

// What each operation observes: the package's plans, the revision, and every receipt the run holds
// classed `valid`.
async function factsFor(run: JournalRun, extra: Facts = {}): Promise<Facts> {
  const { routingReceiptRef, receiptRefs } = run.snapshot;
  const refs = [...(routingReceiptRef ? [routingReceiptRef] : []), ...(receiptRefs ?? [])];
  const receiptValidity = Object.fromEntries(refs.map((ref) => [ref, "valid" as const]));
  return runFacts(run, { ...REVISION, receiptValidity, ...extra });
}

// A run routed by `reading`, its plan confirmed where `gate:user` asks for it.
async function routed(reading: Reading, fields: object = {}): Promise<JournalRun> {
  const { run, decision } = await routedBy(reading, fields, REVISION);
  const questions = decision.verdict.questions ?? [];
  if (questions.some((question) => question.purpose === "plan")) {
    answerOpen(run, "plan", "proceed");
  }
  return run;
}

// Issues the next work order and accepts its canned result with `fields` in its place.
async function settle(run: JournalRun, fields: Record<string, unknown> = {}, extra: Facts = {}) {
  const workOrder = run.next(await factsFor(run, extra));
  const decision = run.accept(
    { ...cannedFields(workOrder), ...fields },
    await factsFor(run, extra),
  );
  return { workOrder, decision };
}

const diagnosed = (verdict: string) => ({
  diagnosis: { verdict, reproductionRef: "repro.md", matchedIds: ["EX-0001-0001-01"] },
});

// Where the run goes next: the destination it re-routes to, or the stage it issues.
async function whereTo(run: JournalRun): Promise<string> {
  const pending = run.snapshot.pendingReroute?.route;
  if (pending) return `reroute:${pending}`;
  return `stage:${run.next(await factsFor(run)).stageInstanceId}`;
}

// Accepts the routing result a re-route asks for, and confirms the plan where `gate:user` asks.
async function routeAgain(run: JournalRun, fields: object = {}, extra: Facts = {}) {
  const workOrder = run.next(await factsFor(run, extra));
  const proposal = proposalWith({ intent: "defect" }, fields);
  const decision = run.accept(
    { testObservation: "not_applicable", proposal },
    await factsFor(run, extra),
  );
  const questions = decision.verdict.questions ?? [];
  if (questions.some((question) => question.purpose === "plan")) {
    answerOpen(run, "plan", "proceed");
  }
  return { workOrder, decision };
}

// A decide-acceptance run whose `triage-close` reports the feature adopted toward `route`.
async function adoptedToward(route: string) {
  const run = await routed(
    { intent: "feature", entryFlags: ["decision"] },
    { proposedWriteScope: [] },
  );
  await settle(run);
  await settle(run);
  const { decision } = await settle(run, {
    branch: { outcome: "adopted", route },
    closure: undefined,
  });
  return { run, decision };
}

const refusalsOf = (decision: { verdict: { error?: object } }) => {
  const error = decision.verdict.error;
  return error && "reasons" in error ? error.reasons : [];
};

// QFAI:EX-0001-0215-03
it("Each verdict of a fix-defect diagnosis continues the route or re-routes it where the plan declares", async () => {
  const verdicts = [
    "missing-test",
    "as-specified",
    "not-ours",
    "duplicate",
    "needs-info",
    "expectation-differs",
    "defective-test",
    "regression",
    "surface-conflict",
  ];
  const seen: Record<string, string[]> = {};
  for (const verdict of verdicts) {
    const run = await routed({ intent: "defect" });
    await settle(run, diagnosed(verdict));
    const last = run.records.at(-1);
    seen[verdict] = [
      `${last?.from ?? ""}>${last?.to ?? ""}`,
      last?.event ?? "",
      await whereTo(run),
    ];
  }
  const rerouted = (route: string) => ["running>routing", "declared-reroute", `reroute:${route}`];

  expect(seen).toEqual({
    "missing-test": ["running>ready", "accept-nonfinal-result", "stage:spec"],
    "as-specified": rerouted("answer-question"),
    "not-ours": rerouted("close-no-change"),
    duplicate: rerouted("close-duplicate"),
    "needs-info": rerouted("request-info"),
    "expectation-differs": rerouted("decide-acceptance"),
    "defective-test": rerouted("repair-test"),
    regression: rerouted("fix-red-main"),
    "surface-conflict": rerouted("repair-consistency"),
  });
});

// QFAI:EX-0001-0215-04
it("A repair-consistency run re-routes on a check gap and on a retire outcome", async () => {
  const gap = await routed({ intent: "surface-contradiction" });
  await settle(gap, diagnosed("check-gap"));
  const retire = await routed({ intent: "surface-contradiction" });
  await settle(retire, diagnosed("missing-test"));
  const { workOrder } = await settle(retire, { branch: { outcome: "retire" } });

  expect({
    gap: await whereTo(gap),
    triage: workOrder.steps?.find((step) => step.name === "sdd-triage")?.branchPoint,
    retire: await whereTo(retire),
  }).toEqual({ gap: "reroute:sweep-guard", triage: true, retire: "reroute:retire-mechanism" });
});

// QFAI:EX-0001-0215-05
it("A bisect that reports a revert re-routes to revert-culprit; one reporting none continues", async () => {
  const regression: Reading = { intent: "defect-regression", entryFlags: ["repro", "last-good"] };
  const fixRegression = await routed(regression);
  await settle(fixRegression, { branch: { outcome: "revert" } });
  const fixRedMain = await routed({ intent: "ci", qualifiers: ["red-since-change"] });
  await settle(fixRedMain, { branch: { outcome: "revert" } });
  const plain = await routed(regression);
  await settle(plain);

  expect([await whereTo(fixRegression), await whereTo(fixRedMain), await whereTo(plain)]).toEqual([
    "reroute:revert-culprit",
    "reroute:revert-culprit",
    "stage:diagnose",
  ]);
});

// QFAI:EX-0001-0215-06
it("A quarantine-flaky diagnosis of a product race re-routes; a defective test continues", async () => {
  const race = await routed({ intent: "flaky-test" });
  await settle(race);
  await settle(race, diagnosed("product-race"));
  const test = await routed({ intent: "flaky-test" });
  await settle(test);
  await settle(test, diagnosed("defective-test"));

  expect([await whereTo(race), await whereTo(test)]).toEqual([
    "reroute:fix-intermittent",
    "stage:fix",
  ]);
});

// QFAI:EX-0001-0215-07
it("A refactor that needs a behaviour change goes to the route it names among the declared ones", async () => {
  const compatible = await routed({ intent: "refactor" });
  await settle(compatible, {
    branch: { outcome: "behaviour-change", route: "change-compatibility" },
  });
  const other = await routed({ intent: "refactor" });
  const { decision } = await settle(other, {
    branch: { outcome: "behaviour-change", route: "fix-defect" },
  });

  expect({
    compatible: await whereTo(compatible),
    refused: refusalsOf(decision),
    state: other.snapshot.run.state,
  }).toEqual({
    compatible: "reroute:change-compatibility",
    refused: [{ reason: "branch-undeclared", subject: "branch" }],
    state: "running",
  });
});

// QFAI:EX-0001-0215-08
it("A settled-record triage that finds more than the record settles changes nothing and re-routes", async () => {
  const run = await routed({ intent: "order", artifacts: ["spec"] });
  const { decision } = await settle(run, {
    branch: { outcome: "outside-record", route: "decide-design" },
  });

  expect({
    events: decision.events.map((event) => event.type),
    changed: decision.events.some((event) => event.appendedRows !== undefined),
    destination: await whereTo(run),
  }).toEqual({
    events: ["declared-reroute"],
    changed: false,
    destination: "reroute:decide-design",
  });
});

// QFAI:EX-0001-0215-09
it("An adopted feature re-routes to the route triage-close names and keeps gate:user", async () => {
  const { run } = await adoptedToward("prototype-feature");
  const destination = await whereTo(run);
  const { decision } = await routeAgain(run);

  expect({
    destination,
    asked: decision.verdict.questions?.map((question) => question.purpose),
    route: run.snapshot.plan?.route,
    modifiers: run.snapshot.modifiers?.map((entry) => entry.modifier),
  }).toEqual({
    destination: "reroute:prototype-feature",
    asked: ["plan"],
    route: "prototype-feature",
    modifiers: ["gate:user"],
  });
});

// QFAI:EX-0001-0215-10
it("A defect found while investigating re-routes by the decision rules", async () => {
  const run = await routed({ intent: "question-why" }, { proposedWriteScope: [] });
  await settle(run, {
    branch: { outcome: "defect-found", extraction: DEFECT },
    closure: undefined,
  });

  expect(run.snapshot.pendingReroute).toEqual({
    route: "fix-defect",
    rule: 27,
    fromStep: "triage-investigate",
    outcome: "defect-found",
  });
});

// QFAI:EX-0001-0215-11
it("A branch reported where the plan declares no such point is refused and changes nothing", async () => {
  const text = await routed(
    { intent: "docs", artifacts: ["docs"] },
    { affectedFlowIds: [], proposedWriteScope: ["README.md"] },
  );
  const onEdit = await settle(text, { branch: { outcome: "behaviour-change" } });
  const defect = await routed({ intent: "defect" });
  const onDiagnose = await settle(defect, {
    ...diagnosed("missing-test"),
    branch: { outcome: "retire" },
  });
  const undeclared = [{ reason: "branch-undeclared", subject: "branch" }];

  expect({
    edit: [refusalsOf(onEdit.decision), onEdit.decision.events, text.snapshot.run.state],
    diagnose: [
      refusalsOf(onDiagnose.decision),
      onDiagnose.decision.events,
      defect.snapshot.run.state,
    ],
  }).toEqual({
    edit: [undeclared, [], "running"],
    diagnose: [undeclared, [], "running"],
  });
});

// QFAI:EX-0001-0215-12
it("A re-route keeps the diagnosis receipt at an unchanged revision and runs it again after a change", async () => {
  const kept = await routed({ intent: "defect" });
  await settle(kept, diagnosed("defective-test"));
  const settled = await routeAgain(kept);
  const first = kept.next(await factsFor(kept));

  const moved = {
    observedChangedPaths: ["src/app.ts"],
    fileDigests: { "src/app.ts": "d".repeat(64) },
  };
  const changed = await routed({ intent: "defect" });
  await settle(changed, diagnosed("defective-test"));
  await routeAgain(changed, {}, moved);
  const again = changed.next(await factsFor(changed, moved));

  expect({
    reused: settled.decision.events.find((event) => event.type === "plan-accepted")?.reused?.step,
    satisfied: kept.snapshot.acceptedStages?.map((stage) => [stage.stageInstanceId, stage.reused]),
    first: first.stageInstanceId,
    again: again.stageInstanceId,
  }).toEqual({
    reused: "implement-diagnose",
    satisfied: [["diagnose", expect.stringMatching(/^results\//)]],
    first: "fix",
    again: "diagnose",
  });
});

// QFAI:EX-0001-0215-12
it("A carried receipt satisfying one step of a longer first stage leaves the stage's other steps", async () => {
  const diagnose = {
    stageInstanceId: "diagnose",
    stageKind: "diagnose",
    steps: [{ name: "implement-diagnose" }],
  };
  const probe = {
    stageInstanceId: "probe",
    stageKind: "diagnose",
    steps: [{ name: "implement-diagnose" }, { name: "implement-bisect" }],
  };
  const fix = {
    stageInstanceId: "fix",
    stageKind: "regression_fix",
    steps: [{ name: "implement-regression-fix" }],
  };
  const plans = {
    "fix-defect": {
      route: "fix-defect",
      stages: [diagnose, fix],
      branchPoints: [
        {
          step: "implement-diagnose",
          outcomes: [{ outcome: "regression", routes: ["fix-red-main"] }],
        },
      ],
    },
    "fix-red-main": { route: "fix-red-main", stages: [probe, fix] },
  };
  const run = new JournalRun(readyWith(planOf("fix-defect", [diagnose, fix], ["src/**"]), FLOW));
  await settle(run, diagnosed("regression"), { plans });
  await routeAgain(run, {}, { plans });
  const issued = run.next(await factsFor(run, { plans }));
  const accepted = run.accept(
    { testObservation: "not_applicable" },
    await factsFor(run, { plans }),
  );

  expect({
    steps: (issued.steps ?? []).map((step) => step.name),
    state: accepted.verdict.run?.state,
  }).toEqual({ steps: ["implement-bisect"], state: "ready" });
});

// A request re-routed twice: investigated, found a defect, then found to expect something else.
async function reroutedTwice(): Promise<JournalRun> {
  const run = await routed({ intent: "question-why" }, { proposedWriteScope: [] });
  await settle(run, {
    branch: { outcome: "defect-found", extraction: DEFECT },
    closure: undefined,
  });
  await routeAgain(run);
  await settle(run, diagnosed("expectation-differs"));
  await routeAgain(run, { proposedWriteScope: [] });
  await settle(run);
  await settle(run);
  return run;
}

const adopted = { branch: { outcome: "adopted", route: "add-feature" }, closure: undefined };

// QFAI:EX-0001-0215-13
it("A third re-route asks the operator, whose proceed re-routes and whose stop cancels", async () => {
  const run = await reroutedTwice();
  const { decision: asked } = await settle(run, adopted);
  const [question] = asked.verdict.questions ?? [];
  const waiting = run.apply({ operation: "next" }, await factsFor(run));
  const proceeded = answerOpen(run, "reroute", "proceed");
  const routing = run.next(await factsFor(run));
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-reroutes-"));
  let summary: unknown;
  try {
    await writeRunRecords(dir, run.records, run.snapshot);
    summary = JSON.parse(await readFile(path.join(dir, "summary.json"), "utf8"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  const stopped = await reroutedTwice();
  await settle(stopped, adopted);
  const cancelled = answerOpen(stopped, "reroute", "stop");

  expect({
    asked: [asked.verdict.run?.state, question?.kind, question?.purpose],
    names: question?.text.includes("Change the product's behaviour"),
    options: question?.options.map((option) => option.effect),
    // Under a no-question mode nothing answers it: the run waits and issues no work.
    waiting: [
      waiting.verdict.run?.state,
      waiting.verdict.workOrder,
      waiting.verdict.questions?.length,
    ],
    proceeded: proceeded.verdict.run?.state,
    routing: routing.reroute,
    reroutes:
      typeof summary === "object" && summary !== null ? Reflect.get(summary, "reroutes") : [],
    cancelled: cancelled.verdict.run?.state,
  }).toEqual({
    asked: ["awaiting_input", "decision", "reroute"],
    names: true,
    options: ["proceed", "stop"],
    waiting: ["awaiting_input", null, 1],
    proceeded: "routing",
    routing: { route: "add-feature", fromStep: "triage-close", outcome: "adopted" },
    reroutes: [
      {
        from: "investigate-question",
        to: "fix-defect",
        step: "triage-investigate",
        outcome: "defect-found",
      },
      {
        from: "fix-defect",
        to: "decide-acceptance",
        step: "implement-diagnose",
        outcome: "expectation-differs",
      },
      { from: "decide-acceptance", to: "add-feature", step: "triage-close", outcome: "adopted" },
    ],
    cancelled: "cancelled",
  });
});

// QFAI:EX-0001-0215-14
it("A finding no stage of the route serves blocks the run and names the skill to invoke", async () => {
  const run = await routed({ intent: "test-defect" });
  await settle(run);
  const criterion = {
    findingCode: "criterion-wrong",
    path: ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
    cause: "The criterion the test checks is itself wrong.",
    owningFlow: FLOW,
    detectingCommand: "independent review",
    resolvingOwner: "qfai-sdd",
    blockingExtent: "run",
  };
  const { decision } = await settle(run, { outcome: "needs_repair", debts: [criterion] });
  const next = run.apply({ operation: "next" }, await factsFor(run));

  expect({
    state: decision.verdict.run?.state,
    halt: decision.verdict.halt,
    route: run.snapshot.plan?.route,
    next: next.verdict.workOrder,
  }).toEqual({
    state: "blocked",
    halt: {
      blocker: "stage-blocked",
      owner: "qfai-sdd",
      subjects: [`criterion-wrong@${criterion.path}`],
    },
    route: "repair-test",
    next: null,
  });
});

// QFAI:EX-0001-0215-15
it("The routing work order of a re-route names it, and routing keeps the destination", async () => {
  const { run } = await adoptedToward("prototype-feature");
  const workOrder = run.next(await factsFor(run));
  const story = {
    goal: "Show ten addresses per customer.",
    covers: ["the address list"],
    excludes: [],
    evidence: ["request"],
    flowId: FLOW,
  };
  const proposal = proposalWith({ intent: "feature" }, { newStories: [story] });
  const decision = run.accept({ testObservation: "not_applicable", proposal }, await factsFor(run));

  expect({
    reroute: workOrder.reroute,
    decided: decision.events.find((event) => event.type === "route-decided")?.route,
    plan: decision.verdict.plan?.route,
    creates: decision.verdict.questions?.filter((question) => question.kind === "create").length,
  }).toEqual({
    reroute: { route: "prototype-feature", fromStep: "triage-close", outcome: "adopted" },
    decided: "prototype-feature",
    plan: "prototype-feature",
    creates: 1,
  });
});

// QFAI:EX-0001-0212-08
it("A re-route keeps review:heavy on a route with no default, and no payload lowers a modifier", async () => {
  const run = await routed({ intent: "defect", risks: ["data-loss"] });
  await settle(run, diagnosed("defective-test"));
  await routeAgain(run);
  const fix = run.next(await factsFor(run));
  const lowered = stageResultRefusals({ resultId: "result-1", modifiers: [] }).filter(
    (refusal) => refusal.subject === "modifiers",
  );

  expect({
    route: run.snapshot.plan?.route,
    stage: fix.stageInstanceId,
    modifiers: fix.modifiers,
    heavy: HEAVY_REVIEWERS.every((role) => fix.requiredReviewerRoles?.includes(role)),
    lowered,
  }).toEqual({
    route: "repair-test",
    stage: "fix",
    modifiers: ["review:heavy"],
    heavy: true,
    lowered: [{ reason: "schema", subject: "modifiers" }],
  });
});

const fact = (text: string) => ({ kind: "fact", text, effect: "proceed" });

// QFAI:EX-0001-0214-04
it("A request whose missing facts arrive is routed again by the decision rules", async () => {
  const run = await routed({ intent: "defect", entryFlags: ["vague"] }, { proposedWriteScope: [] });
  run.digestKey = "b".repeat(64);
  const { decision: asked } = await settle(run, {
    outcome: "awaiting_input",
    questions: [fact("Which version shows it?"), fact("What are the steps to reproduce it?")],
  });
  const values = ["2.3.1", "Add a sixth address and save."];
  (asked.verdict.questions ?? []).forEach((question, index) => {
    run.apply(
      {
        operation: "decision",
        questionId: question.questionId,
        answer: { value: values[index] ?? "" },
        answeredBy: "operator-1",
        expectedSequence: run.snapshot.run.sequence,
      },
      { now: "2026-09-28T00:00:00.000Z" },
    );
  });
  await settle(run);
  const { decision } = await settle(run, {
    branch: { outcome: "info-received", extraction: DEFECT },
    closure: undefined,
  });

  expect({
    asked: [asked.verdict.run?.state, asked.verdict.questions?.length],
    events: decision.events.map((event) => event.type),
    destination: await whereTo(run),
  }).toEqual({
    asked: ["awaiting_input", 2],
    events: ["declared-reroute"],
    destination: "reroute:fix-defect",
  });
});

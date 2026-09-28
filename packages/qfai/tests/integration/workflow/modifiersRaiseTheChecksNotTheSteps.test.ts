// QFAI:AC-0001-0219-01
// QFAI:AC-0001-0219-02
// QFAI:AC-0001-0219-03
// QFAI:AC-0001-0219-04
// QFAI:AC-0001-0219-05
// QFAI:AC-0001-0219-06
// QFAI:AC-0001-0219-07
// QFAI:AC-0001-0219-08
// QFAI:AC-0001-0219-09
// QFAI:AC-0001-0219-10

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { writeRunRecords } from "../../../src/core/workflow/fold.js";
import {
  extractionModifiers,
  type WorkflowModifier,
} from "../../../src/core/workflow/modifiers.js";
import { planFacts } from "../../../src/core/workflow/observe.js";
import { stageResultRefusals } from "../../../src/core/workflow/parse.js";
import { parsePlan } from "../../../src/core/workflow/planFormat.js";
import { WORKFLOW_ROUTES } from "../../../src/core/workflow/routes.js";
import { flowBindingOf } from "../../../src/core/workflow/stages.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { JournalRun, planOf, readyWith } from "../../unit/workflow/journalRun.js";
import {
  FLOW,
  HEAVY_REVIEWERS,
  answerOpen,
  cannedFields,
  driveStages,
  quietCompletion,
  routedBy,
  runFacts,
} from "./decisionRuns.js";

type WorkOrder = ReturnType<JournalRun["next"]>;
type Stages = Parameters<typeof planOf>[1];

const OWNER = {
  kind: "decision",
  text: "Which surface owns the column name: the validator or the template?",
  options: [
    {
      optionId: "validator",
      label: "The validator",
      description: "Fix the template.",
      effect: "proceed",
    },
    {
      optionId: "template",
      label: "The template",
      description: "Fix the validator.",
      effect: "proceed",
    },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "validator",
};

const ADOPTED = {
  step: "sdd-triage",
  decision: "The validator owns the column name.",
  reason: "The contract names the validator as the source.",
};

// Issues and accepts stages with canned results until the next work order runs `step`.
async function runUntil(run: JournalRun, step: string): Promise<WorkOrder> {
  const facts = await runFacts();
  for (let at = 0; at < 8; at += 1) {
    const workOrder = run.next(facts);
    if ((workOrder.steps ?? []).some((each) => each.name === step)) return workOrder;
    const accepted = run.accept(cannedFields(workOrder), facts);
    if (!accepted.verdict.ok) throw new Error(JSON.stringify(accepted.verdict));
  }
  throw new Error(`no work order runs ${step}`);
}

const names = (decision: { events: { type: string }[] }) =>
  decision.events.map((event) => event.type);

// QFAI:EX-0001-0219-01
it("Heavy review adds the heavy reviewers to every stage and changes nothing else", async () => {
  const { run } = await routedBy({ intent: "defect", risks: ["data-loss"] });
  const facts = await runFacts();
  const diagnose = run.next(facts);
  run.accept({ ...cannedFields(diagnose), adopted: [{ ...ADOPTED, step: "implement-diagnose" }] });
  const { issued } = await driveStages(run);
  const finished = run.apply({ operation: "finish" }, { completion: quietCompletion() });

  expect({
    stages: [diagnose, ...issued].map((workOrder) => workOrder.stageInstanceId),
    heavy: [diagnose, ...issued].every((workOrder) =>
      HEAVY_REVIEWERS.every((role) => workOrder.requiredReviewerRoles?.includes(role)),
    ),
    adopted: finished.verdict.adopted,
  }).toEqual({
    stages: ["diagnose", "spec", "acceptance", "implement", "verify"],
    heavy: true,
    adopted: [{ ...ADOPTED, step: "implement-diagnose" }],
  });
});

// QFAI:EX-0001-0219-02
it("A user gate stops at the declared decision point; without it the decision is adopted", async () => {
  const gated = await routedBy({ intent: "surface-contradiction", gate: "decide" });
  answerOpen(gated.run, "plan", "proceed");
  const sdd = await runUntil(gated.run, "sdd-triage");
  const adoptedUnderGate = gated.run.accept({
    testObservation: "not_applicable",
    adopted: [ADOPTED],
  });
  const asked = gated.run.accept({
    testObservation: "not_applicable",
    outcome: "awaiting_input",
    questions: [OWNER],
  });
  const answered = answerOpen(gated.run, undefined, "validator");
  const again = gated.run.next(await runFacts());

  const free = await routedBy({ intent: "surface-contradiction" });
  await runUntil(free.run, "sdd-triage");
  const adopted = free.run.accept({ testObservation: "not_applicable", adopted: [ADOPTED] });
  const finished = free.run.apply({ operation: "finish" }, { completion: quietCompletion() });

  expect({
    point: sdd.steps?.find((step) => step.name === "sdd-triage")?.decisionPoint,
    refused: adoptedUnderGate.verdict.error,
    asked: [asked.verdict.run?.state, asked.verdict.questions?.length],
    answered: answered.verdict.run?.state,
    again: [again.stageInstanceId, again.attempt],
    adopted: [adopted.verdict.run?.state, finished.verdict.adopted],
  }).toEqual({
    point: "user",
    refused: expect.objectContaining({
      code: "invalid-input",
      reasons: [{ reason: "decision-unasked", subject: "adopted[0]" }],
    }),
    asked: ["awaiting_input", 1],
    answered: "ready",
    again: ["sdd", 2],
    adopted: ["ready", [ADOPTED]],
  });
});

// QFAI:EX-0001-0219-03
it("A breaking change without an upstream record asks to confirm the plan, then nothing stops", async () => {
  const { run, decision } = await routedBy({ intent: "defect", risks: ["breaking"] });
  const confirmed = answerOpen(run, "plan", "proceed");
  const { issued, last } = await driveStages(run);

  expect({
    routed: [decision.verdict.run?.state, decision.verdict.questions?.map((each) => each.purpose)],
    modifiers: run.snapshot.modifiers?.map((each) => each.modifier),
    confirmed: confirmed.verdict.run?.state,
    stages: issued.length,
    last: [last.verdict.run?.state, last.verdict.workOrder, last.verdict.questions],
  }).toEqual({
    routed: ["awaiting_input", ["plan"]],
    modifiers: ["review:heavy", "gate:user"],
    confirmed: "ready",
    stages: 5,
    last: ["ready", null, undefined],
  });
});

// QFAI:EX-0001-0219-04
// QFAI:EX-0001-0219-11
it("A release gate asks at the end of a fix-regression run, and finish waits for the approval", async () => {
  const facts = {
    intent: "defect-regression" as const,
    entryFlags: ["repro" as const],
    gate: "approve" as const,
  };
  const { run } = await routedBy(facts);
  await driveUntilDone(run);
  const unopened = run.apply({ operation: "finish" }, { completion: quietCompletion() });
  const opened = run.apply({ operation: "next" }, await runFacts());
  const waiting = run.apply({ operation: "finish" }, { completion: quietCompletion() });
  const approved = answerOpen(run, "release", "approve");
  const after = run.apply({ operation: "next" }, await runFacts());
  const authorization = approved.events.find((event) => event.authorization)?.authorization;

  expect({
    modifiers: run.snapshot.modifiers?.map((each) => [each.modifier, each.source]),
    unopened: unopened.verdict.unmet?.map((each) => each.condition),
    opened: [opened.verdict.run?.state, opened.verdict.questions?.map((each) => each.purpose)],
    waiting: waiting.verdict.unmet?.map((each) => each.condition),
    answeredBy: authorization?.answeredBy,
    after: [after.verdict.run?.state, after.verdict.workOrder, after.events],
  }).toEqual({
    modifiers: [["gate:release", "extraction"]],
    unopened: expect.arrayContaining(["release-unapproved"]),
    opened: ["awaiting_input", ["release"]],
    waiting: expect.arrayContaining(["run-waiting"]),
    answeredBy: "operator-1",
    after: ["ready", null, []],
  });
  expect(waiting.verdict.unmet?.map((each) => each.condition)).not.toContain("release-unapproved");

  const raised = await routedBy({ intent: "defect" });
  const verify = await runUntil(raised.run, "verify-repo-gate");
  const blocker = raised.run.accept({
    ...cannedFields(verify),
    raise: [{ modifier: "gate:release", reason: "The fix blocks the next release." }],
  });
  const release = raised.run.apply({ operation: "next" }, await runFacts());
  expect({
    events: names(blocker),
    release: release.verdict.questions?.map((each) => each.purpose),
    decide: extractionModifiers(extraction({ gate: "decide" })).includes("gate:release"),
  }).toEqual({
    events: ["modifier-raised", "accept-nonfinal-result"],
    release: ["release"],
    decide: false,
  });
});

// Accepts every stage the run issues until `next` issues none or opens a question.
async function driveUntilDone(run: JournalRun) {
  const facts = await runFacts();
  for (let at = 0; at < 12; at += 1) {
    const snapshot = run.snapshot;
    const plan = snapshot.plan?.stages ?? [];
    if ((snapshot.acceptedStages ?? []).length === plan.length) return;
    const workOrder = run.next(facts);
    run.accept(cannedFields(workOrder), facts);
  }
}

// QFAI:EX-0001-0219-05
it("A hand-off puts the release question before the hand-off step runs", async () => {
  const { run } = await routedBy(
    { intent: "order", qualifiers: ["human-run"] },
    { affectedFlowIds: [], proposedWriteScope: [] },
  );
  const facts = await runFacts();
  const inspect = run.next(facts);
  run.accept(cannedFields(inspect), facts);
  const asked = run.apply({ operation: "next" }, facts);
  answerOpen(run, "release", "approve");
  const handoff = run.next(facts);

  expect({
    route: run.snapshot.routeDecision?.route,
    inspect: inspect.stageInstanceId,
    asked: [asked.verdict.run?.state, asked.verdict.questions?.map((each) => each.purpose)],
    handoff: (handoff.steps ?? []).map((step) => [step.name, step.decisionPoint]),
  }).toEqual({
    route: "hand-off-operation",
    inspect: "inspect",
    asked: ["awaiting_input", ["release"]],
    handoff: [["triage-handoff", "release"]],
  });
});

const SUBSETS: WorkflowModifier[][] = [
  [],
  ["review:heavy"],
  ["gate:user"],
  ["gate:release"],
  ["review:heavy", "gate:user"],
  ["review:heavy", "gate:release"],
  ["gate:user", "gate:release"],
  ["review:heavy", "gate:user", "gate:release"],
];

// The stages and steps a route issues under `modifiers`, every stage accepted with a canned
// result and a release question approved where one is put.
function issuedUnder(stages: Stages, route: string, modifiers: WorkflowModifier[]) {
  const flow = flowBindingOf(stages) === "none" ? undefined : FLOW;
  const entries = modifiers.map((modifier) => ({ modifier, source: "default" as const }));
  const raised = { event: "modifier-raised", modifiers: entries };
  const run = new JournalRun([...readyWith(planOf(route, stages), flow), raised]);
  const issued: unknown[] = [];
  for (let at = 0; at < 14; at += 1) {
    const next = run.apply({ operation: "next" }, {});
    const workOrder = next.verdict.workOrder;
    if (workOrder) {
      issued.push([workOrder.stageInstanceId, workOrder.stageKind, workOrder.steps]);
      run.accept(cannedFields(workOrder));
    } else if (next.verdict.questions?.some((each) => each.purpose === "release")) {
      answerOpen(run, "release", "approve");
    } else return issued;
  }
  return issued;
}

// QFAI:EX-0001-0219-06
it("No set of modifiers changes the stages or steps of any catalog route", async () => {
  const plans = await planFacts();
  const differing: string[] = [];
  for (const route of WORKFLOW_ROUTES) {
    const stages = plans[route]?.stages ?? [];
    const bare = JSON.stringify(issuedUnder(stages, route, []));
    for (const subset of SUBSETS.slice(1)) {
      if (JSON.stringify(issuedUnder(stages, route, subset)) !== bare) {
        differing.push(`${route} under ${subset.join("+")}`);
      }
    }
  }
  expect(differing).toEqual([]);
});

// QFAI:EX-0001-0219-07
it("A raised modifier stays for the rest of the run and the summary says where it came from", async () => {
  const { run } = await routedBy({ intent: "defect" });
  const facts = await runFacts();
  const diagnose = run.next(facts);
  const raised = run.accept({
    ...cannedFields(diagnose),
    raise: [{ modifier: "review:heavy", reason: "silent wrong totals" }],
  });
  const spec = run.next(facts);
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-modifiers-"));
  try {
    await writeRunRecords(dir, run.records, run.snapshot);
    const summary: unknown = JSON.parse(await readFile(path.join(dir, "summary.json"), "utf8"));

    expect({
      events: names(raised),
      spec: [
        spec.modifiers,
        HEAVY_REVIEWERS.every((role) => spec.requiredReviewerRoles?.includes(role)),
      ],
      summary:
        typeof summary === "object" && summary !== null
          ? Reflect.get(summary, "modifiers")
          : undefined,
    }).toEqual({
      events: ["modifier-raised", "accept-nonfinal-result"],
      spec: [["review:heavy"], true],
      summary: [{ modifier: "review:heavy", source: "raised" }],
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0219-09
// QFAI:EX-0001-0219-10
it("Each modifier attaches when any one of its signals holds, and not otherwise", () => {
  const heavy = (fields: Parameters<typeof extraction>[0]) =>
    extractionModifiers(extraction(fields)).includes("review:heavy");
  const user = (fields: Parameters<typeof extraction>[0]) =>
    extractionModifiers(extraction(fields)).includes("gate:user");
  const low = {
    confidence: "low" as const,
    alternatives: [{ intent: "feature" as const, entryFlags: [], qualifiers: [], signals: [] }],
  };

  expect({
    heavy: [
      heavy({ risks: ["security"] }),
      heavy({ risks: ["data-loss"] }),
      heavy({ risks: ["silent"] }),
      heavy({ risks: ["breaking"] }),
      heavy({ risks: ["upgrade"] }),
      heavy({ risks: ["performance"] }),
      heavy(low),
    ],
    user: [
      user({ gate: "decide" }),
      user({ gate: "external" }),
      user({ risks: ["breaking"] }),
      user({ risks: ["breaking"], entryFlags: ["upstream"] }),
      user({ qualifiers: ["contradicts-record"] }),
      user(low),
      user({ gate: "approve" }),
    ],
  }).toEqual({
    heavy: [true, true, true, true, true, false, true],
    user: [true, true, true, false, true, true, false],
  });
});

// QFAI:EX-0001-0219-12
it("A route's default modifiers apply whatever its extraction says", async () => {
  const modifiersOf = async (facts: Parameters<typeof routedBy>[0], fields: object = {}) => {
    const { run } = await routedBy(facts, fields);
    return run.snapshot.modifiers?.map((each) => each.modifier).sort();
  };
  const closing = { affectedFlowIds: [], proposedWriteScope: [".qfai/discussion/**"] };

  expect([
    await modifiersOf({ intent: "feature", entryFlags: ["decision"] }, closing),
    await modifiersOf({ intent: "deprecation" }),
    await modifiersOf({ intent: "security" }),
  ]).toEqual([
    ["gate:user"],
    ["gate:user", "review:heavy"],
    ["gate:release", "gate:user", "review:heavy"],
  ]);
});

// QFAI:EX-0001-0219-13
it("A cited decision row in force answers the decision it settled; a missing one stops the run", async () => {
  const facts = {
    intent: "order" as const,
    entryFlags: ["upstream" as const],
    gate: "decide" as const,
    artifacts: ["spec" as const],
  };
  const { run } = await routedBy(facts);
  answerOpen(run, "plan", "proceed");
  const spec = run.next(await runFacts());
  const rows = { decisionRows: [{ rowId: "DEC-0001", inForce: true }] };
  const settledBy = (row: string) => ({
    testObservation: "not_applicable",
    adopted: [
      { step: "sdd-triage", decision: "Apply the settled change.", reason: `Settled by ${row}.` },
    ],
  });
  const missing = run.accept(settledBy("DEC-9999"), rows);
  const cited = run.accept(settledBy("DEC-0001"), rows);

  expect({
    route: [run.snapshot.routeDecision?.route, spec.stageInstanceId],
    missing: missing.verdict.error,
    cited: cited.verdict.run?.state,
  }).toEqual({
    route: ["apply-settled-spec", "spec"],
    missing: expect.objectContaining({
      reasons: [{ reason: "decision-unasked", subject: "adopted[0]" }],
    }),
    cited: "ready",
  });
});

// QFAI:EX-0001-0219-14
it("A modifier outside the three is refused in a plan and in a result", () => {
  const plan = [
    "route: edit-text",
    "family: change",
    "stages:",
    "  - id: edit",
    "    kind: maintenance",
    "    steps: [maintain-edit]",
    "  - id: verify",
    "    kind: verify",
    "    steps: [verify-change-note, verify-context, verify-qfai-gate, verify-repo-gate]",
    "    after: [edit]",
    "defaultModifiers: [gate:legal]",
    "decisionPoints: []",
    "branchPoints: []",
  ].join("\n");
  const loaded = parsePlan(plan, "edit-text");
  const result = stageResultRefusals({
    resultId: "r-1",
    workOrderId: "w-1",
    stageInstanceId: "s-1",
    attempt: 1,
    expectedSequence: 1,
    outcome: "accepted",
    testObservation: "not_applicable",
    actor: { agentInstance: "a-1" },
    raise: [{ modifier: "review:light", reason: "A small change." }],
  });

  expect({
    plan: loaded.ok ? [] : loaded.refusals.map((each) => [each.reason, each.subject]),
    result,
  }).toEqual({
    plan: [["out-of-vocabulary", "gate:legal"]],
    result: [{ reason: "schema", subject: "raise[0].modifier" }],
  });
});

// QFAI:EX-0001-0219-15
it("A critical decision reaches the operator without the user gate, which then holds", async () => {
  const { run } = await routedBy({ intent: "surface-contradiction" });
  await runUntil(run, "sdd-triage");
  const critical = run.accept({
    testObservation: "not_applicable",
    outcome: "awaiting_input",
    questions: [OWNER],
    raise: [{ modifier: "gate:user", reason: "The winning side contradicts a recorded decision." }],
  });
  answerOpen(run, undefined, "validator");
  const again = run.next(await runFacts());

  expect({
    critical: [critical.verdict.run?.state, names(critical)],
    again: again.modifiers,
  }).toEqual({
    critical: ["awaiting_input", ["modifier-raised", "question-opened", "material-decision"]],
    again: ["gate:user"],
  });
});

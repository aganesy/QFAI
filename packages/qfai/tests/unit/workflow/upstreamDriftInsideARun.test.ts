// QFAI:SPEC-0018:TC-0018-0256
// QFAI:SPEC-0018:TC-0018-0257
// QFAI:SPEC-0018:TC-0018-0258
// QFAI:SPEC-0018:TC-0018-0259
// QFAI:SPEC-0018:TC-0018-0260
// QFAI:SPEC-0018:TC-0018-0261

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = NonNullable<Parameters<typeof decide>[0]>;
type Result = NonNullable<Parameters<typeof decide>[1]["result"]>;
type Debt = NonNullable<Result["debts"]>[number];

const stages = [
  ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
  ["bounded-implement", "implement", "qfai-implement", "implement"],
  ["bounded-verify", "verify", "qfai-verify", "verify-full"],
].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
  stageInstanceId,
  stageKind,
  skill,
  operation,
  when: "always",
}));
const plan = {
  route: "bounded-change",
  writeScope: ["src/notify/**", ".qfai/specs/spec-0001/**"],
  stages,
};
const facts = {
  specs: {
    "spec-0001": { lifecycle: "active" },
    "spec-0002": { lifecycle: "active" },
    "spec-0003": { lifecycle: "active" },
  },
};

// A run of the bounded-change plan bound to spec-0001, with its first `accepted` stages done
// and the next one issued.
function issued(accepted: number, extra: Partial<Snapshot> = {}): Snapshot {
  const ready: Snapshot = {
    run: { id: "run-drift", state: "ready", sequence: 10 },
    plan,
    specBinding: { specId: "spec-0001" },
    acceptedStages: stages
      .slice(0, accepted)
      .map(({ stageInstanceId, stageKind }) => ({
        stageInstanceId,
        stageKind,
        outcome: "accepted",
      })),
    ...extra,
  };
  const decision = decide(ready, { operation: "next" }, facts);
  const { workOrder, run } = decision.verdict;
  if (!workOrder || !run) throw new Error("next issues the stage's work order");
  return { ...ready, run, outstandingWorkOrder: workOrder };
}

function resultFor(snapshot: Snapshot, fields: Partial<Result>): Result {
  const workOrder = snapshot.outstandingWorkOrder;
  if (!workOrder) throw new Error("a work order is outstanding");
  return {
    resultId: `result-${snapshot.run.sequence}`,
    workOrderId: workOrder.workOrderId,
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    expectedSequence: snapshot.run.sequence,
    outcome: "accepted",
    ...fields,
  };
}

function accept(snapshot: Snapshot, fields: Partial<Result>) {
  return decide(snapshot, { operation: "accept", result: resultFor(snapshot, fields) }, facts);
}

function debt(owningSpec: string, path: string, resolvingOwner: string): Debt {
  return {
    findingCode: "QFAI-AC-DRIFT",
    path,
    cause: "The acceptance criterion changed after its test was written.",
    owningSpec,
    detectingCommand: "qfai validate",
    resolvingOwner,
    blockingExtent: "run",
  };
}

const spec2Drift = debt("spec-0002", ".qfai/specs/spec-0002/03_Acceptance-Criteria.md", "qfai-sdd");
const spec3Drift = debt("spec-0003", ".qfai/specs/spec-0003/03_Acceptance-Criteria.md", "qfai-sdd");

function outcomeOf(decision: ReturnType<typeof decide>) {
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    halt: decision.verdict.halt,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : undefined,
  };
}

it("TC-0018-0256 (TDD-0507): blocked debts outside the scope name scope-dependency and every finding", () => {
  const verifying = issued(2);
  const shared = outcomeOf(
    accept(verifying, { outcome: "blocked", debts: [spec2Drift, spec3Drift] }),
  );
  const mixed = outcomeOf(
    accept(verifying, {
      outcome: "blocked",
      debts: [spec2Drift, { ...spec3Drift, resolvingOwner: "operator" }],
    }),
  );
  const subjects = [
    "QFAI-AC-DRIFT@.qfai/specs/spec-0002/03_Acceptance-Criteria.md",
    "QFAI-AC-DRIFT@.qfai/specs/spec-0003/03_Acceptance-Criteria.md",
  ];

  expect([shared, mixed]).toEqual([
    {
      state: "blocked",
      halt: { blocker: "scope-dependency", owner: "qfai-sdd", subjects },
      code: undefined,
      reasons: undefined,
    },
    {
      state: "blocked",
      halt: { blocker: "scope-dependency", owner: "operator", subjects },
      code: undefined,
      reasons: undefined,
    },
  ]);
});

it("TC-0018-0257 (TDD-0508): drift inside the checked scope goes to qfai-sdd", () => {
  const verifying = issued(2);
  const inside = debt("spec-0001", ".qfai/specs/spec-0001/03_Acceptance-Criteria.md", "qfai-sdd");
  const repair = accept(verifying, { outcome: "needs_repair", debts: [inside] });
  const run = repair.verdict.run;
  if (!run) throw new Error("the repair is accepted");
  const { outstandingWorkOrder: _done, ...rest } = verifying;
  const next = decide(
    { ...rest, run, repairRequest: { stageInstanceId: "bounded-verify", debts: [inside] } },
    { operation: "next" },
    facts,
  );

  expect({ state: run.state, executor: next.verdict.workOrder?.executor }).toEqual({
    state: "ready",
    executor: { skill: "qfai-sdd" },
  });
});

it("TC-0018-0258 (TDD-0509): a CR under .qfai/decisions refused write-scope", () => {
  const path = ".qfai/decisions/CR-20260924-0001.md";
  const implementing = issued(1);

  expect(
    outcomeOf(accept(implementing, { changedFiles: [{ path, digest: "d".repeat(64) }] })),
  ).toEqual({
    state: "running",
    halt: undefined,
    code: "invalid-input",
    reasons: [{ reason: "write-scope", subject: path }],
  });
});

const repairable: [string, Debt][] = [
  [
    "TC-0018-0259 (TDD-0510): in-scope-skill-owner",
    debt("spec-0001", "src/notify/send.ts", "qfai-implement"),
  ],
  [
    "TC-0018-0259 (TDD-0511): owning-spec-unknown",
    debt("spec-0099", ".qfai/specs/spec-0099/03_Acceptance-Criteria.md", "operator"),
  ],
  [
    "TC-0018-0259 (TDD-0512): owning-spec-false",
    debt("spec-0002", "src/notify/send.ts", "operator"),
  ],
];

for (const [title, finding] of repairable) {
  it(title, () => {
    expect(outcomeOf(accept(issued(2), { outcome: "blocked", debts: [finding] }))).toEqual({
      state: "running",
      halt: undefined,
      code: "invalid-input",
      reasons: [{ reason: "blocked-repairable", subject: "debts[0]" }],
    });
  });
}

// A run blocked on the spec-0002 drift, resumed: resume reissues the verify work order.
function resumedAfterScopeDependency() {
  const verifying = { ...issued(2), attempts: { "bounded-verify": 1 } };
  const blocked = accept(verifying, { outcome: "blocked", debts: [spec2Drift] });
  const run = blocked.verdict.run;
  if (!run || run.state !== "blocked") throw new Error("the drift blocks the run");
  const resumed = decide({ ...verifying, run }, { operation: "resume" }, facts);
  const workOrder = resumed.verdict.workOrder;
  const resumedRun = resumed.verdict.run;
  if (!workOrder || !resumedRun) throw new Error("resume reissues the work order");
  return {
    snapshot: { ...verifying, run: resumedRun, outstandingWorkOrder: workOrder },
    workOrder,
  };
}

it("TC-0018-0260 (TDD-0513): still-blocked", () => {
  const { snapshot, workOrder } = resumedAfterScopeDependency();
  const again = accept(snapshot, { outcome: "blocked", debts: [spec2Drift] });

  expect({
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    state: again.verdict.run?.state,
    blocker: again.verdict.halt?.blocker,
  }).toEqual({
    stageInstanceId: "bounded-verify",
    attempt: 2,
    state: "blocked",
    blocker: "scope-dependency",
  });
});

it("TC-0018-0260 (TDD-0514): cleared", () => {
  const { snapshot, workOrder } = resumedAfterScopeDependency();
  const cleared = accept(snapshot, { outcome: "accepted" });

  expect({
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    state: cleared.verdict.run?.state,
  }).toEqual({ stageInstanceId: "bounded-verify", attempt: 2, state: "ready" });
});

it("TC-0018-0261 (TDD-0515): delegation-unavailable comes before listed debts", () => {
  const decision = accept(issued(2), {
    outcome: "blocked",
    debts: [spec2Drift],
    delegation: { status: "unavailable", attempt: 1 },
  });

  expect(decision.verdict.halt).toEqual({
    blocker: "delegation-unavailable",
    owner: "operator",
    subjects: ["delegateSubAgent"],
  });
});

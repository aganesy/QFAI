// QFAI:EX-0001-0194-05
// QFAI:EX-0001-0198-04

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { writeTracked } from "../../../src/core/workflow/fold.js";
import { JournalRun, planOf, readyWith, stage } from "./journalRun.js";

const FLOW = "BF-0007";
const bounded = planOf(
  "bounded-change",
  [
    stage("bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"),
    stage("bounded-implement", "implement", "qfai-implement", "implement"),
    stage("bounded-verify", "verify", "qfai-verify", "verify-full"),
  ],
  ["src/notify/**", ".qfai/spec/02_business-flow/business-flow-0007/**"],
);
const direct = planOf("direct", [
  stage("edit", "maintenance", "qfai-maintain", "non-normative-edit"),
  stage("verify", "verify", "qfai-verify", "verify-full"),
]);

// What every operation of a bounded run observes: the flows, and the bound flow's examples.
const facts = {
  flows: [FLOW],
  obligations: {
    flowId: FLOW,
    ids: [FLOW, "EX-0007-0001-01"],
    exampleIds: ["EX-0007-0001-01"],
    annotated: ["EX-0007-0001-01"],
    digest: "1".repeat(64),
  },
};

const specFinding = {
  findingCode: "QFAI-TRACE-002",
  path: ".qfai/spec/02_business-flow/business-flow-0007/user-story-0007-0001/03_Example.md",
  cause: "A test names an example the story does not define",
  owningFlow: FLOW,
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "run",
};

// A bounded run whose verify work order is outstanding.
function verifying(): JournalRun {
  const run = new JournalRun(readyWith(bounded, FLOW));
  for (const kind of ["sdd_delta", "implement"]) {
    expect(run.next(facts).stageKind).toBe(kind);
    expect(run.accept({}, facts).verdict.run?.state).toBe("ready");
  }
  expect(run.next(facts).stageKind).toBe("verify");
  return run;
}

// Where each `next` sends the run, as stage instance, attempt and executor.
function issued(run: JournalRun) {
  const workOrder = run.next(facts);
  return `${workOrder.stageInstanceId}#${String(workOrder.attempt)}@${workOrder.executor?.skill ?? ""}`;
}

it("A verify result needs_repair whose finding sits in a story file with resolvingOwner qfai-sdd", () => {
  const run = verifying();

  expect(
    run.accept({ outcome: "needs_repair", debts: [specFinding] }, facts).verdict.run?.state,
  ).toBe("ready");
  const repair = issued(run);
  expect(run.accept({}, facts).verdict.run?.state).toBe("ready");
  const recheck = issued(run);
  expect(run.accept({}, facts).verdict.run?.state).toBe("ready");
  const after = run.apply({ operation: "next" }, facts).verdict.workOrder;

  expect({ repair, recheck, after, accepted: run.snapshot.acceptedStages?.length }).toEqual({
    repair: "bounded-sdd-delta#2@qfai-sdd",
    recheck: "bounded-verify#2@qfai-verify",
    after: null,
    accepted: 3,
  });
});

it("A verify result needs_repair whose findings name two owners the plan serves", () => {
  const run = verifying();
  const codeFinding = {
    ...specFinding,
    path: "src/notify/send.ts",
    resolvingOwner: "qfai-implement",
  };

  run.accept({ outcome: "needs_repair", debts: [specFinding, codeFinding] }, facts);
  const first = issued(run);
  run.accept({}, facts);
  const second = issued(run);
  run.accept({}, facts);

  expect([first, second, issued(run)]).toEqual([
    "bounded-sdd-delta#2@qfai-sdd",
    "bounded-implement#2@qfai-implement",
    "bounded-verify#2@qfai-verify",
  ]);
});

// A direct plan binds no flow; its only stage is the maintenance edit.
const semanticEffect = {
  findingCode: "maintain-semantic-effect",
  path: "src/orders.ts",
  cause: "The corrected string is compared by the code",
  owningFlow: null,
  detectingCommand: "the maintenance edit's review",
  resolvingOwner: "qfai-implement",
  blockingExtent: "run",
};

function maintaining(): JournalRun {
  const run = new JournalRun(readyWith(direct, undefined));
  expect(run.next().stageKind).toBe("maintenance");
  return run;
}

it("A maintain result needs_repair whose finding names an owner the direct plan does not serve", () => {
  const run = maintaining();
  const decision = run.accept({ outcome: "needs_repair", debts: [semanticEffect] });

  expect({
    state: decision.verdict.run?.state,
    events: decision.events.map((event) => event.type),
    replans: run.snapshot.replans,
    repairRequest: run.snapshot.repairRequest,
  }).toEqual({
    state: "routing",
    events: ["scope-or-obligation-revision"],
    replans: 1,
    repairRequest: undefined,
  });
});

it("A blocked result of a run that binds no flow names no owning flow", () => {
  const run = maintaining();
  const onlyTheOperator = { ...semanticEffect, resolvingOwner: "operator" };

  expect(run.accept({ outcome: "blocked", debts: [onlyTheOperator] }).verdict.run?.state).toBe(
    "blocked",
  );
});

it("A blocked result of a verify work order, which carries no target, in a bound run", () => {
  const flowless = {
    ...specFinding,
    path: "docs/notes.md",
    owningFlow: null,
    resolvingOwner: "operator",
  };
  const owned = { ...flowless, owningFlow: FLOW };
  const refusal = (debt: typeof flowless | typeof owned) => {
    const run = verifying();
    expect(run.snapshot.outstandingWorkOrder?.target).toBeUndefined();
    const error = run.accept({ outcome: "blocked", debts: [debt] }, facts).verdict.error;
    return error && "reasons" in error ? error.reasons : run.snapshot.run.state;
  };

  expect([refusal(flowless), refusal(owned)]).toEqual([
    [{ reason: "blocked-repairable", subject: "debts[0]" }],
    "blocked",
  ]);
});

it("The tracked summary of a run that binds no flow keeps a debt's null owning flow", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-flowless-summary-"));
  try {
    const run = maintaining();
    const debt = { ...semanticEffect, resolvingOwner: "operator" };
    run.accept({ outcome: "accepted_with_debt", debts: [debt] });

    await writeTracked(dir, run.records, run.snapshot);
    const summary: unknown = JSON.parse(await readFile(path.join(dir, "summary.json"), "utf8"));

    expect(summary).toMatchObject({ debts: [{ owningFlow: null }] });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

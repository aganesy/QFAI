/**
 * A run driven the way the command drives one: every decision is turned into journal records
 * with the command's own extras, and every snapshot is the journal folded from its first event.
 * No test built on it hands `decide` a snapshot of its own making.
 */
import { decide } from "../../../src/core/workflow/decide.js";
import { journalExtrasOf, recordsOf, snapshotOf } from "../../../src/core/workflow/fold.js";
import type { JournalRecord } from "../../../src/core/workflow/persistence.js";

type Snapshot = NonNullable<Parameters<typeof decide>[0]>;
type Input = Parameters<typeof decide>[1];
type Facts = Parameters<typeof decide>[2];
type Decision = ReturnType<typeof decide>;
type Seed = Omit<JournalRecord, "sequence" | "prevHash" | "operation" | "recordedAt">;
type Accepted = Parameters<typeof journalExtrasOf>[3];

export const RECORDED_AT = "2026-09-26T00:00:00.000Z";

export class JournalRun {
  readonly records: JournalRecord[] = [];

  // The run's journal begins with the records the core wrote before the case starts.
  constructor(seed: readonly Seed[]) {
    seed.forEach((record, index) => {
      this.records.push({
        ...record,
        sequence: index + 1,
        prevHash: null,
        operation: "seed",
        recordedAt: RECORDED_AT,
      });
    });
  }

  get snapshot(): Snapshot {
    const folded = snapshotOf(this.records);
    if (!folded) throw new Error("the journal holds no run");
    return folded;
  }

  // Decides one operation on the folded snapshot and appends what the command would append.
  apply(input: Input, facts: Facts = {}, accepted?: Accepted): Decision {
    const before = this.snapshot;
    const decision = decide(before, input, facts);
    const extras = journalExtrasOf(
      before,
      input,
      decision,
      accepted ?? { reports: [], dependencies: [] },
    );
    const added = recordsOf(decision, { operation: input.operation, before: before.run }, extras);
    for (const record of added) this.records.push({ ...record, prevHash: null });
    return decision;
  }

  // `next`, returning the work order it issued or returned again.
  next(facts: Facts = {}) {
    const decision = this.apply({ operation: "next" }, facts);
    const workOrder = decision.verdict.workOrder;
    if (!workOrder) {
      throw new Error(`next issued no work order: ${JSON.stringify(decision.verdict)}`);
    }
    return workOrder;
  }

  // `accept` of a result for the outstanding work order, carrying `fields`.
  accept(fields: Record<string, unknown>, facts: Facts = {}, accepted?: Accepted): Decision {
    const { run, outstandingWorkOrder: workOrder } = this.snapshot;
    if (!workOrder) throw new Error("no work order is outstanding");
    const result = {
      resultId: `result-${String(run.sequence)}`,
      workOrderId: workOrder.workOrderId,
      stageInstanceId: workOrder.stageInstanceId,
      attempt: workOrder.attempt,
      expectedSequence: run.sequence,
      outcome: "accepted",
      ...fields,
    };
    return this.apply({ operation: "accept", result }, facts, accepted);
  }
}

type PlanStages = NonNullable<Seed["plan"]>["stages"];

// A plan as routing records it, with the stages and write scope a case names.
export function planOf(route: string, stages: PlanStages, writeScope: string[] = []) {
  return { route, goal: "", stages, writeScope, expectedBehaviorRefs: [], observedRefs: [] };
}

// The records a run in `ready` carries once `plan` was accepted for `flowId`.
export function readyWith(
  plan: NonNullable<Seed["plan"]>,
  flowId: string | undefined,
  runId = "run-20260926000000000",
): Seed[] {
  const executionContext = {
    runId,
    qfaiVersion: "2.0.0",
    policyDigests: {},
    planDigests: {},
    harness: { host: "test", capabilities: {} },
    requestDigest: "",
  };
  return [
    { event: "run-created", to: "created", executionContext },
    { event: "capture-request", from: "created", to: "routing" },
    { event: "plan-accepted", from: "routing", to: "ready", plan },
    ...(flowId ? [{ event: "binding-recorded", flowId }] : []),
  ];
}

// One plan stage, in the order the plan files list its fields.
export function stage(
  stageInstanceId: string,
  stageKind: string,
  skill: string,
  operation: string,
  when = "always",
): PlanStages[number] {
  return { stageInstanceId, stageKind, skill, operation, when };
}

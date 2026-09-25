// A run in `ready` whose `finish` facts meet every completion condition. Each finish case
// plants one change on a copy of it.

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];
type Facts = Parameters<typeof decide>[2];
type Completion = NonNullable<Facts["completion"]>;

export const RUN_ID = "run-20260925000000001";
export const TOOL_DIGEST = "a".repeat(64);
export const CONFIG_DIGEST = "b".repeat(64);

export const finishPlan = {
  route: "bounded-change",
  writeScope: ["src/notify"],
  stages: [
    ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
    ["bounded-implement", "implement", "qfai-implement", "implement"],
    ["bounded-verify", "verify", "qfai-verify", "verify-full"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when: "always",
  })),
};

export function readySnapshot(): Snapshot {
  return {
    run: { id: RUN_ID, state: "ready", sequence: 12 },
    plan: finishPlan,
    specBinding: { specId: "spec-0007" },
    completionTarget: "qfai_done",
    baseline: {
      findings: [],
      toolVersion: "2.0.0",
      cliEntryDigest: TOOL_DIGEST,
      policyDigests: { "qfai.config.yaml": CONFIG_DIGEST },
    },
    acceptedStages: [
      {
        stageInstanceId: "bounded-sdd-delta",
        stageKind: "sdd_delta",
        outcome: "accepted",
        reviewResults: [
          {
            role: "qa-gatekeeper",
            agentInstance: "agent-qa-1",
            verdict: "PASS",
            reportRef: "reviews/qa-gatekeeper.json",
          },
        ],
      },
      { stageInstanceId: "bounded-implement", stageKind: "implement", outcome: "accepted" },
      { stageInstanceId: "bounded-verify", stageKind: "verify", outcome: "accepted" },
    ],
    actorHistory: [
      { role: "author", agentInstance: "agent-impl-1", stageInstanceId: "bounded-implement" },
    ],
  };
}

export function completion(): Completion {
  return {
    validate: { failOn: "error", findings: [] },
    verifyReport: {
      runId: RUN_ID,
      stageInstanceId: "bounded-verify",
      status: "PASS",
      scope: "full",
    },
    toolVersion: "2.0.0",
    cliEntryDigest: TOOL_DIGEST,
    policyDigests: { "qfai.config.yaml": CONFIG_DIGEST },
    changedPaths: ["src/notify/email.ts"],
    uncommittedPaths: [],
  };
}

export function metFacts(): Facts {
  return {
    ledger: {
      specId: "spec-0007",
      rows: [{ rowId: "TDD-0001", status: "done", digest: "c".repeat(64) }],
    },
    completion: completion(),
  };
}

export function finish(snapshot: Snapshot, facts: Facts) {
  return decide(snapshot, { operation: "finish" }, facts);
}

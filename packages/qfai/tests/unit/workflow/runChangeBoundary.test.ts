// QFAI:EX-0001-0196-22
// QFAI:EX-0001-0196-23
// QFAI:EX-0001-0196-24

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { RUN_ID, completion, finish, metFacts, readySnapshot } from "./finishFixture.js";

type Snapshot = NonNullable<Parameters<typeof decide>[0]>;
type Facts = Parameters<typeof decide>[2];

const LEDGER = ".qfai/specs/BF-0007/tdd/test-list.md";
const IMPLEMENT_EVIDENCE = ".qfai/evidence/implement-BF-0007.md";
const SUMMARY = `.qfai/evidence/workflow/${RUN_ID}/summary.json`;

// The two checks of the cumulative change: the next write operation, and `finish`.
function boundaryChecks(snapshot: Snapshot, changed: string[], facts: Facts = {}) {
  const next = decide(snapshot, { operation: "next" }, { ...facts, observedChangedPaths: changed });
  const finished = finish(snapshot, {
    ...metFacts(),
    ...facts,
    completion: { ...completion(), changedPaths: ["src/notify/email.ts", ...changed] },
  });
  const error = next.verdict.error;
  return {
    next: error && "cause" in error ? error.cause : error?.code,
    outOfScope: (finished.verdict.unmet ?? [])
      .filter((entry) => entry.condition === "diff-out-of-scope")
      .map((entry) => entry.subject),
  };
}

it("issued stage recordAreas pass later write and finish", () => {
  const snapshot = { ...readySnapshot(), issuedRecordAreas: [LEDGER, IMPLEMENT_EVIDENCE] };

  expect(boundaryChecks(snapshot, [LEDGER, IMPLEMENT_EVIDENCE])).toEqual({
    next: undefined,
    outOfScope: [],
  });
});

// The implement work order of the fixture's run, outstanding.
function implementing(): Snapshot {
  const ready = readySnapshot();
  const acceptedStages = (ready.acceptedStages ?? []).slice(0, 1);
  const issued = decide({ ...ready, acceptedStages }, { operation: "next" }, {});
  const { workOrder, run } = issued.verdict;
  if (!workOrder || !run) throw new Error("next issues the implement work order");
  return { ...ready, acceptedStages, run, outstandingWorkOrder: workOrder };
}

it("core evidence passes later write and finish", () => {
  const running = implementing();
  const workOrder = running.outstandingWorkOrder;
  const listed = decide(
    running,
    {
      operation: "accept",
      result: {
        resultId: "result-summary",
        workOrderId: workOrder?.workOrderId ?? "",
        stageInstanceId: workOrder?.stageInstanceId ?? "",
        attempt: workOrder?.attempt ?? 0,
        expectedSequence: running.run.sequence,
        outcome: "accepted",
        changedFiles: [{ path: SUMMARY, digest: "d".repeat(64) }],
      },
    },
    {},
  );
  const error = listed.verdict.error;

  expect({
    checks: boundaryChecks(readySnapshot(), [SUMMARY]),
    listed: error && "reasons" in error ? error.reasons : undefined,
  }).toEqual({
    checks: { next: undefined, outOfScope: [] },
    listed: [{ reason: "write-scope", subject: SUMMARY }],
  });
});

const DRIFTED =
  ".qfai/spec/02_business-flow/business-flow-0002/user-story-0002-0001/02_Acceptance-Criteria.md";
const UNLISTED = ".qfai/specs/BF-0004/03_Acceptance-Criteria.md";
// The change request is a row of the decisions table, which the repair outside the run appends.
const CHANGE_REQUEST = ".qfai/spec/decisions.md";
const CHANGE_ROW = "DEC-0007";
const DIGESTS = {
  [DRIFTED]: "e".repeat(64),
  [UNLISTED]: "f".repeat(64),
  [CHANGE_REQUEST]: "0".repeat(64),
};

// A run blocked on the BF-0002 drift its verify stage found outside the write scope.
function blockedOnScopeDependency(): Snapshot {
  const ready = readySnapshot();
  const acceptedStages = (ready.acceptedStages ?? []).slice(0, 2);
  const issued = decide({ ...ready, acceptedStages }, { operation: "next" }, {});
  const { workOrder, run } = issued.verdict;
  if (!workOrder || !run) throw new Error("next issues the verify work order");
  return {
    ...ready,
    acceptedStages,
    run: { ...run, state: "blocked", sequence: run.sequence + 1 },
    outstandingWorkOrder: workOrder,
    halt: {
      blocker: "scope-dependency",
      owner: "qfai-sdd",
      subjects: [`QFAI-AC-DRIFT@${DRIFTED}`],
    },
  };
}

function repairFacts(approved: boolean, paths: string[], changed: string[]): Facts {
  return {
    observedChangedPaths: changed,
    fileDigests: DIGESTS,
    changeRequests: [{ rowId: CHANGE_ROW, inForce: approved, paths }],
  };
}

function resumeOutcome(facts: Facts) {
  const resumed = decide(blockedOnScopeDependency(), { operation: "resume" }, facts);
  const error = resumed.verdict.error;
  return {
    state: resumed.verdict.run?.state,
    cause: error && "cause" in error ? error.cause : undefined,
    adjustments: resumed.events.flatMap((event) => event.adjustments ?? []),
  };
}

const adjusted = [
  { path: DRIFTED, digest: DIGESTS[DRIFTED], changeRequest: CHANGE_ROW },
  { path: CHANGE_REQUEST, digest: DIGESTS[CHANGE_REQUEST], changeRequest: CHANGE_ROW },
];

it("approved named external repair passes resume and finish", () => {
  const facts = repairFacts(true, [DRIFTED], [DRIFTED, CHANGE_REQUEST]);
  const resumed = resumeOutcome(facts);
  const later = { ...readySnapshot(), startAdjustments: resumed.adjustments };

  expect({ resumed, checks: boundaryChecks(later, [DRIFTED, CHANGE_REQUEST], facts) }).toEqual({
    resumed: { state: "running", cause: undefined, adjustments: adjusted },
    checks: { next: undefined, outOfScope: [] },
  });
});

const failsClosed = { state: "blocked", cause: "invariant-violation", adjustments: [] };

it("missing approval fails closed", () => {
  expect(resumeOutcome(repairFacts(false, [DRIFTED], [DRIFTED, CHANGE_REQUEST]))).toEqual(
    failsClosed,
  );
});

it("unlisted external path fails closed", () => {
  expect(
    resumeOutcome(repairFacts(true, [DRIFTED, UNLISTED], [DRIFTED, UNLISTED, CHANGE_REQUEST])),
  ).toEqual(failsClosed);
});

it("digest drift fails closed", () => {
  const facts = repairFacts(true, [DRIFTED], [DRIFTED, CHANGE_REQUEST]);
  const later = { ...readySnapshot(), startAdjustments: resumeOutcome(facts).adjustments };
  const drifted = { ...facts, fileDigests: { ...DIGESTS, [DRIFTED]: "1".repeat(64) } };

  expect(boundaryChecks(later, [DRIFTED, CHANGE_REQUEST], drifted)).toEqual({
    next: "invariant-violation",
    outOfScope: [DRIFTED],
  });
});

// QFAI:SPEC-0018:TC-0018-0122
// QFAI:SPEC-0018:TC-0018-0172

import { expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { workflowExitCode } from "../../../src/cli/commands/workflow.js";
import { readWorkflowMode } from "../../../src/core/config.js";
import { snapshotOf, writeRecord } from "../../../src/core/workflow/persistence.js";
import type { JournalRecord } from "../../../src/core/workflow/persistence.js";

const busy: [string, string][] = [
  ["TC-0018-0122 (TDD-0146): ebusy", "EBUSY"],
  ["TC-0018-0122 (TDD-0147): eperm", "EPERM"],
  ["TC-0018-0122 (TDD-0148): eacces", "EACCES"],
];

for (const [title, code] of busy) {
  it(title, async () => {
    const calls: string[] = [];
    const write = (filePath: string) => {
      calls.push(filePath);
      return Promise.reject(Object.assign(new Error(`${code}: resource busy or locked`), { code }));
    };

    const refusal = await writeRecord(".qfai/runs/run-1/snapshot.json", "{}", write);

    expect({ refusal, exitCode: workflowExitCode(refusal), calls }).toEqual({
      refusal: { code: "io-error", message: expect.any(String), cause: code },
      exitCode: 1,
      calls: [".qfai/runs/run-1/snapshot.json"],
    });
  });
}

const modes: [string, string, string | null][] = [
  ["TC-0018-0172 (TDD-0219): active", "active", "active"],
  ["TC-0018-0172 (TDD-0220): shadow", "shadow", "shadow"],
  ["TC-0018-0172 (TDD-0221): off", "off", "off"],
  ["TC-0018-0172 (TDD-0222): invalid", "always", null],
];

for (const [title, value, mode] of modes) {
  it(title, () => {
    const document: unknown = parseYaml(`workflow:
  mode: ${value}
`);

    expect(readWorkflowMode(document)).toBe(mode);
  });
}

// A journal of the events given, after the run's first event.
function journalOf(events: Partial<JournalRecord>[]): JournalRecord[] {
  return [{ event: "run-created", to: "created" }, ...events].map((event, index) => ({
    operation: "next",
    recordedAt: "2026-09-26T00:00:00.000Z",
    ...event,
    event: event.event ?? "",
    sequence: index + 1,
    prevHash: null,
  }));
}

const finding = {
  findingCode: "QFAI-TRACE-002",
  path: ".qfai/specs/spec-0007/06_Test-Cases.md",
  cause: "A test case names an example the spec does not define",
  owningSpec: "spec-0007",
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "run",
};

it("the snapshot rebuilds the diagnosis, receipts and reviewers from accepted results", () => {
  const diagnosis = { verdict: "missing-test", reproductionRef: "repro.md", matchedRowIds: [] };
  const review = {
    role: "qa-gatekeeper",
    agentInstance: "agent-2",
    verdict: "PASS",
    reportRef: "r",
  };
  const snapshot = snapshotOf(
    journalOf([
      {
        event: "accept-nonfinal-result",
        stageInstanceId: "diagnose",
        stageKind: "diagnose",
        outcome: "accepted",
        resultRef: "results/diagnose-1.json",
        diagnosis,
        reviewResults: [review],
      },
      {
        event: "accept-nonfinal-result",
        stageInstanceId: "verify",
        stageKind: "verify",
        outcome: "needs_repair",
        resultRef: "results/verify-1.json",
        repairs: [finding],
      },
    ]),
  );

  expect({
    diagnosis: snapshot?.diagnosis,
    receiptRefs: snapshot?.receiptRefs,
    actorHistory: snapshot?.actorHistory,
  }).toEqual({
    diagnosis,
    receiptRefs: ["results/diagnose-1.json"],
    actorHistory: [{ role: "reviewer", agentInstance: "agent-2", stageInstanceId: "diagnose" }],
  });
});

it("the snapshot counts each automatic repair by its cause, and each replan", () => {
  const repair = (resultId: string, repairs: (typeof finding)[]): Partial<JournalRecord> => ({
    event: "accept-nonfinal-result",
    stageInstanceId: "verify",
    outcome: "needs_repair",
    resultRef: `results/${resultId}.json`,
    repairs,
  });
  const otherPath = { ...finding, path: ".qfai/specs/spec-0007/05_Examples.md" };
  const snapshot = snapshotOf(
    journalOf([
      repair("verify-1", [finding]),
      repair("verify-2", [finding, otherPath]),
      repair("verify-3", [finding]),
      { event: "scope-or-obligation-revision", stageInstanceId: "diagnose", outcome: "accepted" },
      { event: "required-plan-revision" },
      { event: "answer-changes-scope" },
    ]),
  );

  expect({ repairsByCause: snapshot?.repairsByCause, replans: snapshot?.replans }).toEqual({
    repairsByCause: [
      { findingCode: finding.findingCode, path: otherPath.path, count: 1 },
      { findingCode: finding.findingCode, path: finding.path, count: 3 },
    ],
    replans: 3,
  });
});

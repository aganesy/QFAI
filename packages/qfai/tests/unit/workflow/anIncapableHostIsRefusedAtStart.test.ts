// QFAI:SPEC-0018:TC-0018-0187
// QFAI:SPEC-0018:TC-0018-0188

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Facts = Parameters<typeof decide>[2];

const CAPABILITIES = [
  "fetchSkillBody",
  "invokeStage",
  "delegateSubAgent",
  "relayQuestion",
  "runShellAndTests",
  "writeProjectRoot",
  "keepRunRecord",
  "resume",
];

const startFacts: Facts = {
  start: {
    runId: "run-20260925000000003",
    qfaiVersion: "2.0.0",
    digestKey: "b".repeat(64),
    policyDigests: {},
    manifestDigests: {},
    planDigests: {},
  },
};

function start(host: string, missing?: string) {
  const capabilities = Object.fromEntries(
    CAPABILITIES.map((capability) => [capability, capability !== missing]),
  );
  return decide(
    null,
    { operation: "start", request: { text: "Fix the export." }, harness: { host, capabilities } },
    startFacts,
  );
}

// The refusal code, its cause, what it names and the events; the message text is not part of
// the contract.
function refusal(decision: ReturnType<typeof start>) {
  const error = decision.verdict.error;
  return {
    run: decision.verdict.run,
    code: error?.code,
    cause: error && "cause" in error ? error.cause : undefined,
    subjects: error && "subjects" in error ? error.subjects : undefined,
    events: decision.events,
  };
}

function refused(subject: string) {
  return {
    run: null,
    code: "fail-closed",
    cause: "unsupported-capability",
    subjects: [subject],
    events: [],
  };
}

it("TC-0018-0187 (TDD-0228): host-copilot", () => {
  expect(refusal(start("copilot"))).toEqual(refused("copilot"));
});

it("TC-0018-0187 (TDD-0229): host-unlisted", () => {
  expect(refusal(start("gemini-cli"))).toEqual(refused("gemini-cli"));
});

const gaps: [string, string][] = [
  ["TC-0018-0187 (TDD-0230): fetch-skill-body", "fetchSkillBody"],
  ["TC-0018-0187 (TDD-0231): invoke-stage", "invokeStage"],
  ["TC-0018-0187 (TDD-0232): delegate-sub-agent", "delegateSubAgent"],
  ["TC-0018-0187 (TDD-0233): relay-question", "relayQuestion"],
  ["TC-0018-0187 (TDD-0234): run-shell-and-tests", "runShellAndTests"],
  ["TC-0018-0187 (TDD-0235): write-project-root", "writeProjectRoot"],
  ["TC-0018-0187 (TDD-0236): keep-run-record", "keepRunRecord"],
  ["TC-0018-0187 (TDD-0237): resume", "resume"],
];

for (const [title, capability] of gaps) {
  it(title, () => {
    expect(refusal(start("claude-code", capability))).toEqual(refused(capability));
  });
}

for (const [title, host] of [
  ["TC-0018-0188 (TDD-0238): claude-code", "claude-code"],
  ["TC-0018-0188 (TDD-0239): codex", "codex"],
] satisfies [string, string][]) {
  it(title, () => {
    const started = start(host);

    expect({ ok: started.verdict.ok, state: started.verdict.run?.state }).toEqual({
      ok: true,
      state: "routing",
    });
  });
}

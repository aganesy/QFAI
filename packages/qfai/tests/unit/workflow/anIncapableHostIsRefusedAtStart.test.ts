// QFAI:EX-0001-0200-01

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

// The refusal code, its cause and the events; the message text is not part of the contract.
function refusal(decision: ReturnType<typeof start>) {
  const error = decision.verdict.error;
  return {
    run: decision.verdict.run,
    code: error?.code,
    cause: error && "cause" in error ? error.cause : undefined,
    events: decision.events,
  };
}

const refused = {
  run: null,
  code: "fail-closed",
  cause: "unsupported-capability",
  events: [],
};

it("host-copilot", () => {
  expect(refusal(start("copilot"))).toEqual(refused);
});

it("host-unlisted", () => {
  expect(refusal(start("gemini-cli"))).toEqual(refused);
});

const gaps: [string, string][] = [
  ["fetch-skill-body", "fetchSkillBody"],
  ["invoke-stage", "invokeStage"],
  ["delegate-sub-agent", "delegateSubAgent"],
  ["relay-question", "relayQuestion"],
  ["run-shell-and-tests", "runShellAndTests"],
  ["write-project-root", "writeProjectRoot"],
  ["keep-run-record", "keepRunRecord"],
  ["resume", "resume"],
];

for (const [title, capability] of gaps) {
  it(title, () => {
    expect(refusal(start("claude-code", capability))).toEqual(refused);
  });
}

for (const [title, host] of [
  ["claude-code", "claude-code"],
  ["codex", "codex"],
] satisfies [string, string][]) {
  it(title, () => {
    const started = start(host);

    expect({ ok: started.verdict.ok, state: started.verdict.run?.state }).toEqual({
      ok: true,
      state: "routing",
    });
  });
}

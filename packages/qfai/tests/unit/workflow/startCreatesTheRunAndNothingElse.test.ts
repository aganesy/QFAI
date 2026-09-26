// QFAI:EX-0001-0192-11

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Facts = Parameters<typeof decide>[2];

const startFacts: Facts = {
  start: {
    runId: "run-20260925000000004",
    qfaiVersion: "2.0.0",
    digestKey: "c".repeat(64),
    policyDigests: {},

    planDigests: {},
  },
};

const capabilities = Object.fromEntries(
  [
    "fetchSkillBody",
    "invokeStage",
    "delegateSubAgent",
    "relayQuestion",
    "runShellAndTests",
    "writeProjectRoot",
    "keepRunRecord",
    "resume",
  ].map((capability) => [capability, true]),
);

it("a start input carrying scope is refused schema", () => {
  const refused = decide(
    null,
    {
      operation: "start",
      request: { text: "Fix the export." },
      harness: { host: "claude-code", capabilities },
      scope: { writeAreas: ["src/**"] },
    },
    startFacts,
  );
  const error = refused.verdict.error;

  expect({
    run: refused.verdict.run,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : undefined,
    events: refused.events,
  }).toEqual({
    run: null,
    code: "invalid-input",
    reasons: [{ reason: "schema", subject: "scope" }],
    events: [],
  });
});

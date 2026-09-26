// QFAI:EX-0001-0196-02

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const harness = {
  host: "claude-code",
  capabilities: {
    fetchSkillBody: true,
    invokeStage: true,
    delegateSubAgent: true,
    relayQuestion: true,
    runShellAndTests: true,
    writeProjectRoot: true,
    keepRunRecord: true,
    resume: true,
  },
};

it("Decide start", () => {
  const started = decide(
    null,
    {
      operation: "start",
      request: { text: "Return 404 for a missing export." },
      harness,
    },
    {
      start: {
        runId: "run-20260925000000001",
        qfaiVersion: "2.0.0",
        digestKey: "b".repeat(64),
        policyDigests: { "qfai.config.yaml": "c".repeat(64) },

        planDigests: { "assets/defaults/workflows/direct.yml": "e".repeat(64) },
      },
    },
  );
  const context = started.events.find((event) => event.type === "run-created")?.executionContext;

  expect({ run: started.verdict.run, context }).toEqual({
    run: { id: "run-20260925000000001", state: "routing", sequence: 2 },
    context: {
      runId: "run-20260925000000001",
      qfaiVersion: "2.0.0",
      policyDigests: { "qfai.config.yaml": "c".repeat(64) },

      planDigests: { "assets/defaults/workflows/direct.yml": "e".repeat(64) },
      harness,
      requestDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    },
  });
  expect(JSON.stringify(started)).not.toContain("schemaVersion");
  expect(JSON.stringify(started)).not.toContain("Return 404 for a missing export.");
});

// QFAI:SPEC-0018:TC-0018-0271

import { afterEach, expect, it } from "vitest";

import {
  DISCOVERY_PROPOSAL,
  FEATURE_PROPOSAL,
  field,
  minimalProject,
  removeProjects,
  resultFor,
  startRun,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

// A feature request that changes spec-0001 and needs no capability no spec owns.
const noNewCapability = {
  goal: "Add a delimiter option to the CSV export of an order.",
  affectedSpecIds: ["spec-0001"],
  newCapabilities: [],
  proposedWriteScope: [".qfai/specs/spec-0001/**", "src/**"],
};

const featureProposal = { ...FEATURE_PROPOSAL, ...noNewCapability };

const boundedChangeProposal = {
  ...DISCOVERY_PROPOSAL,
  ...noNewCapability,
  candidateRoute: "bounded-change",
  requiredStages: ["sdd_delta", "implement", "verify"],
};

it("TC-0018-0271 (TDD-0532): A feature request with no new capability routes bounded-change and completes its plan", async () => {
  const root = await minimalProject();
  const runId = await startRun(root);
  const routing = workflow(root, ["next", "--run", runId]);

  const asFeature = await submit(
    root,
    runId,
    "accept",
    resultFor(routing.json, "route-1", { proposal: featureProposal }),
  );
  const asBoundedChange = await submit(
    root,
    runId,
    "accept",
    resultFor(routing.json, "route-2", { proposal: boundedChangeProposal }),
  );

  const issued: unknown[] = [];
  let last = workflow(root, ["next", "--run", runId]);
  for (let step = 0; step < 6 && field(last.json, "workOrder") !== null; step += 1) {
    issued.push({
      stageKind: field(last.json, "workOrder.stageKind"),
      target: field(last.json, "workOrder.target"),
    });
    await submit(root, runId, "accept", resultFor(last.json, `stage-${String(step)}`));
    last = workflow(root, ["next", "--run", runId]);
  }

  expect({
    asFeature: { ok: field(asFeature.json, "ok"), state: field(asFeature.json, "run.state") },
    asBoundedChange: field(asBoundedChange.json, "run.state"),
    issued,
    end: { ok: field(last.json, "ok"), workOrder: field(last.json, "workOrder") },
  }).toEqual({
    asFeature: { ok: false, state: "routing" },
    asBoundedChange: "ready",
    issued: [
      { stageKind: "sdd_delta", target: { kind: "spec", specId: "spec-0001" } },
      { stageKind: "implement", target: { kind: "spec", specId: "spec-0001" } },
      { stageKind: "verify", target: { kind: "spec", specId: "spec-0001" } },
    ],
    end: { ok: true, workOrder: null },
  });
});

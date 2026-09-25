// QFAI:SPEC-0018:TC-0018-0066

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { hashAssistantAssetText } from "../../../src/core/assistantAssetProvenance.js";
import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowInput, WorkflowSnapshot } from "../../../src/core/workflow/decide.js";
import { namedFileDigestsOf } from "../../../src/core/workflow/observe.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const plan = {
  route: "bugfix",
  stages: [
    ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only", "always"],
    [
      "bugfix-sdd-append",
      "sdd_append",
      "qfai-sdd",
      "defect-row-seeding",
      "missing_test_row_needed",
    ],
    ["bugfix-implement", "implement", "qfai-implement", "implement", "missing_test_row_needed"],
    ["bugfix-verify", "verify", "qfai-verify", "verify-full", "always"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = "", when = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when,
  })),
  writeScope: ["src/forms/**"],
};
const reproductionRef = "evidence/empty-value-reproduction.json";
const reproductionText = '{"input":"","observed":"accepted"}\n';

let root: string | undefined;

afterEach(async () => {
  if (root) await removeTempTree(root);
  root = undefined;
});

it("TC-0018-0066 (TDD-0083): Issue the sdd_append work order after a missing-test diagnosis", async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-appended-row-"));
  await mkdir(path.join(root, "evidence"), { recursive: true });
  await writeFile(path.join(root, reproductionRef), reproductionText);
  const snapshot: WorkflowSnapshot = {
    run: { id: "run-append", state: "ready", sequence: 7 },
    plan,
    specBinding: { specId: "spec-0007" },
    diagnosis: { verdict: "missing-test", reproductionRef, matchedRowIds: [] },
    acceptedStages: [
      { stageInstanceId: "bugfix-diagnose", stageKind: "diagnose", outcome: "accepted" },
    ],
  };
  const next: WorkflowInput = { operation: "next" };
  const decision = decide(snapshot, next, {
    fileDigests: await namedFileDigestsOf(root, snapshot, next),
  });
  const workOrder = decision.verdict.workOrder;
  const writable = [...(workOrder?.scope?.writeAreas ?? []), ...(workOrder?.recordAreas ?? [])];

  expect({
    stageKind: workOrder?.stageKind,
    inputs: workOrder?.inputs,
    changeRequestWritable: writable.some(
      (area) => area.startsWith(".qfai/decisions") || area.includes("change-request"),
    ),
    stageKindsWritingChangeRequests: plan.stages.filter((stage) =>
      /change[-_]?request/i.test(`${stage.stageKind} ${stage.operation}`),
    ),
  }).toEqual({
    stageKind: "sdd_append",
    inputs: [{ path: reproductionRef, digest: hashAssistantAssetText(reproductionText) }],
    changeRequestWritable: false,
    stageKindsWritingChangeRequests: [],
  });
});

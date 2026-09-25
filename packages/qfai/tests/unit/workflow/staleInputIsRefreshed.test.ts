// QFAI:SPEC-0018:TC-0018-0154

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { hashAssistantAssetText } from "../../../src/core/assistantAssetProvenance.js";
import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowInput, WorkflowSnapshot } from "../../../src/core/workflow/decide.js";
import { namedFileDigestsOf } from "../../../src/core/workflow/observe.js";
import { removeTempTree } from "../../helpers/tempTree.js";
import { finishPlan } from "./finishFixture.js";

const source = "src/notify/email.ts";
const sourceText = "export const send = () => true;\r\n";
const review = ".qfai/review/implement-review.md";
const staleDigest = "1".repeat(64);

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

// A project holding the work order's input and the review record the result names.
async function projectWithInput(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-stale-input-"));
  roots.push(root);
  for (const [file, text] of Object.entries({ [source]: sourceText, [review]: "PASS\n" })) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), text);
  }
  return root;
}

it("TC-0018-0154 (TDD-0208): A result whose submitted digest of an input differs from the digest in the facts", async () => {
  const root = await projectWithInput();
  const run = { id: "run-stale-input", state: "running", sequence: 8 };
  const implementOrder = {
    workOrderId: "work-order-bounded-implement-1",
    stageInstanceId: "bounded-implement",
    attempt: 1,
    stageKind: "implement",
    target: { kind: "spec" as const, specId: "spec-0007" },
    executor: { skill: "qfai-implement" },
    operation: "implement",
    scope: { writeAreas: ["src/notify"] },
    inputs: [{ path: source, digest: staleDigest }],
  };
  const snapshot: WorkflowSnapshot = {
    run,
    plan: finishPlan,
    specBinding: { specId: "spec-0007" },
    acceptedStages: [
      { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
    ],
    outstandingWorkOrder: implementOrder,
  };
  const accept: WorkflowInput = {
    operation: "accept",
    result: {
      resultId: "result-stale-input",
      workOrderId: implementOrder.workOrderId,
      stageInstanceId: implementOrder.stageInstanceId,
      attempt: 1,
      expectedSequence: run.sequence,
      outcome: "accepted",
      changedFiles: [{ path: source, digest: staleDigest }],
      artifactRefs: [{ path: review, digest: staleDigest }],
    },
  };
  const next: WorkflowInput = { operation: "next" };
  const refused = decide(snapshot, accept, {
    fileDigests: await namedFileDigestsOf(root, snapshot, accept),
  });
  const reissued = decide(snapshot, next, {
    fileDigests: await namedFileDigestsOf(root, snapshot, next),
  });
  const error = refused.verdict.error;

  expect({
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : undefined,
    events: refused.events,
    inputs: reissued.verdict.workOrder?.inputs,
  }).toEqual({
    code: "invalid-input",
    reasons: [
      { reason: "digest-mismatch", subject: source },
      { reason: "digest-mismatch", subject: review },
    ],
    events: [],
    inputs: [{ path: source, digest: hashAssistantAssetText(sourceText) }],
  });
});

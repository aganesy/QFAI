// QFAI:SPEC-0018:TC-0018-0266
// QFAI:SPEC-0018:TC-0018-0267

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  commitAll,
  featureRunAt,
  field,
  initProject,
  removeProjects,
  resultFor,
  START_INPUT,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

// A feature run in `ready` after its verify stage was accepted with this run's report.
async function verifiedRun(root: string, completionTarget: string) {
  const { runId, issued } = await featureRunAt(root, "verify", {
    ...START_INPUT,
    completionTarget,
  });
  const report = path.join(root, ".qfai", "runs", "shared", "verify.json");
  await mkdir(path.dirname(report), { recursive: true });
  await writeFile(report, '{"status":"PASS","scope":"full"}\n');
  await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "verify-1", {
      artifactRefs: [{ path: ".qfai/runs/shared/verify.json", digest: "submitted" }],
      reviewResults: [
        { role: "qa-gatekeeper", agentInstance: "qa-1", verdict: "PASS", reportRef: "qa.md" },
      ],
    }),
  );
  return runId;
}

// What `finish` and `status` report, and whether the tracked summary kept its bytes.
async function finishedAndReported(root: string, runId: string) {
  const summaryFile = path.join(root, ".qfai", "evidence", "workflow", runId, "summary.json");
  const summary = await readFile(summaryFile);
  const finished = workflow(root, ["finish", "--run", runId]);
  const runDir = path.join(root, ".qfai", "runs", runId);
  const snapshot: unknown = JSON.parse(await readFile(path.join(runDir, "snapshot.json"), "utf8"));
  return {
    finished: field(finished.json, "run.state"),
    summaryState: field(JSON.parse(summary.toString("utf8")), "state"),
    summaryKept: (await readFile(summaryFile)).equals(summary),
    snapshot: field(snapshot, "run.state"),
    status: field(workflow(root, ["status", "--run", runId]).json, "run.state"),
  };
}

const COMPLETED_AT_RUNTIME_ONLY = {
  finished: "completed",
  summaryState: "ready",
  summaryKept: true,
  snapshot: "completed",
  status: "completed",
};

it("TC-0018-0266 (TDD-0525): committed qfai_done finishes at runtime only", async () => {
  const root = await initProject();
  const runId = await verifiedRun(root, "qfai_done");
  commitAll(root);

  expect(await finishedAndReported(root, runId)).toEqual(COMPLETED_AT_RUNTIME_ONLY);
}, 180_000);

it("TC-0018-0267 (TDD-0526): uncommitted working_tree finishes at runtime only", async () => {
  const root = await initProject();
  const runId = await verifiedRun(root, "working_tree");

  expect(await finishedAndReported(root, runId)).toEqual(COMPLETED_AT_RUNTIME_ONLY);
}, 180_000);

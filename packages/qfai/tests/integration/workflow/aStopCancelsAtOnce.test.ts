// QFAI:SPEC-0018:TC-0018-0138

import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  featureRunAt,
  field,
  minimalProject,
  removeProjects,
  submit,
  treeDigest,
} from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0138 (TDD-0354): Built CLI", async () => {
  const root = await minimalProject();
  const { runId, issued } = await featureRunAt(root, "implement");
  const summary = `.qfai/evidence/workflow/${runId}/summary.json`;
  const run = `.qfai/runs/${runId}/`;
  const rewritten = (rel: string) =>
    rel === summary ||
    rel === `${run}snapshot.json` ||
    rel.startsWith(`${run}journal/`) ||
    rel.startsWith(`${run}inbox/`);
  const before = await treeDigest(root, rewritten);
  const stopped = await submit(root, runId, "decision", {
    stop: true,
    answeredBy: "operator",
    expectedSequence: field(issued.json, "run.sequence"),
  });
  const tracked: unknown = JSON.parse(
    await readFile(path.join(root, summary), "utf8").catch(() => "null"),
  );
  const stages = field(tracked, "stages");
  const outstanding = field(issued.json, "workOrder.stageInstanceId");

  expect({
    state: field(stopped.json, "run.state"),
    tracked: field(tracked, "state"),
    outstandingReviewed: Array.isArray(stages)
      ? stages.filter((stage) => field(stage, "stageInstanceId") === outstanding)
      : stages,
    nothingElse: (await treeDigest(root, rewritten)) === before,
  }).toEqual({
    state: "cancelled",
    tracked: "cancelled",
    outstandingReviewed: [],
    nothingElse: true,
  });
});

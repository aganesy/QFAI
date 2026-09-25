// QFAI:SPEC-0018:TC-0018-0009

import { existsSync } from "node:fs";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  FEATURE_PROPOSAL,
  field,
  inbox,
  minimalProject,
  removeProjects,
  resultFor,
  START_INPUT,
  submit,
  treeDigest,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0009 (TDD-0260): Built CLI on a temp repo", async () => {
  const root = await minimalProject();
  const input = await inbox(root, null, "start", START_INPUT);
  const before = await treeDigest(root);
  const runId = String(field(workflow(root, ["start", "--in", input]).json, "run.id"));
  const routing = workflow(root, ["next", "--run", runId]);
  const routed = await submit(
    root,
    runId,
    "accept",
    resultFor(routing.json, "route-1", { proposal: FEATURE_PROPOSAL }),
  );
  const declined = await submit(root, runId, "decision", {
    questionId: field(routed.json, "questions.0.questionId"),
    answer: { optionIds: ["decline"] },
    answeredBy: "operator",
    expectedSequence: field(routed.json, "run.sequence"),
  });
  const own = `.qfai/runs/${runId}/`;

  expect({
    exit: declined.status,
    state: field(declined.json, "run.state"),
    tracked: existsSync(path.join(root, ".qfai", "evidence", "workflow")),
    outside: (await treeDigest(root, (rel) => rel.startsWith(own))) === before,
  }).toEqual({ exit: 0, state: "cancelled", tracked: false, outside: true });
});

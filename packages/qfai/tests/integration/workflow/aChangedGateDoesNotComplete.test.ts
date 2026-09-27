// QFAI:SPEC-0018:TC-0018-0061
// Fault seeds: FAULT-024

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  DISCOVERY_PROPOSAL,
  field,
  minimalProject,
  removeProjects,
  routedRun,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0061 (TDD-0309): Built CLI", async () => {
  const root = await minimalProject("workflow:\n  mode: active\n");
  const proposal = { ...DISCOVERY_PROPOSAL, proposedWriteScope: ["qfai.config.yaml"] };
  const { runId, routed } = await routedRun(root, proposal);
  await writeFile(path.join(root, "qfai.config.yaml"), "workflow:\n  mode: active\n# edited\n");
  const finished = workflow(root, ["finish", "--run", runId]);
  const unmet = field(finished.json, "unmet");

  expect({
    exit: finished.status,
    drift: Array.isArray(unmet)
      ? unmet.filter((entry) => field(entry, "condition") === "policy-drift")
      : unmet,
    state: field(finished.json, "run.state") === field(routed.json, "run.state"),
  }).toEqual({
    exit: 1,
    drift: [{ condition: "policy-drift", subject: "qfai.config.yaml", owner: "operator" }],
    state: true,
  });
});

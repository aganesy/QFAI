// QFAI:SPEC-0018:TC-0018-0032

import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  featureRunAt,
  field,
  minimalProject,
  removeProjects,
  resultFor,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0032 (TDD-0304): finish offered a verify", async () => {
  const root = await minimalProject();
  const { runId, issued } = await featureRunAt(root, "verify");
  const runs = path.join(root, ".qfai", "runs");
  await mkdir(path.join(root, ".qfai", "report"), { recursive: true });
  await writeFile(path.join(root, ".qfai", "report", "verify.json"), '{"status":"FAIL"}\n');
  const accepted = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "verify-1", {
      artifactRefs: [{ path: ".qfai/report/verify.json", digest: "submitted" }],
    }),
  );
  const foreign = path.join(runs, "run-20200101000000000", "reports", "verify", "verify.json");
  await mkdir(path.dirname(foreign), { recursive: true });
  await writeFile(foreign, '{"status":"PASS","scope":"full"}\n');
  await copyFile(foreign, path.join(runs, runId, "reports", "verify", "verify.json"));
  const finished = workflow(root, ["finish", "--run", runId]);
  const unmet = field(finished.json, "unmet");

  expect({
    foreign: Array.isArray(unmet)
      ? unmet.filter((entry) => field(entry, "condition") === "verify-foreign")
      : unmet,
    state: [field(accepted.json, "run.state"), field(finished.json, "run.state")],
  }).toEqual({
    foreign: [{ condition: "verify-foreign", subject: "verify.json", owner: "qfai-verify" }],
    state: ["ready", "ready"],
  });
});

// QFAI:SPEC-0018:TC-0018-0039

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { validateQuietly } from "../../../src/core/workflow/observe.js";
import {
  commitAll,
  featureRunAt,
  field,
  initProject,
  removeProjects,
  resultFor,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

it("TC-0018-0039 (TDD-0305): Built CLI on a fixture whose validate is clean, asserted first", async () => {
  const root = await initProject();
  const errors = (await validateQuietly(root)).issues.filter((issue) => issue.severity === "error");
  const { runId, issued } = await featureRunAt(root, "verify");
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
  commitAll(root);
  const finished = workflow(root, ["finish", "--run", runId]);

  expect({
    errors,
    target: field(finished.json, "target"),
    unmet: field(finished.json, "unmet") ?? [],
    state: field(finished.json, "run.state"),
    exit: finished.status,
  }).toEqual({ errors: [], target: "qfai_done", unmet: [], state: "completed", exit: 0 });
}, 60_000);

/**
 * What the spec-0018 journeys share: the steps that drive a run on a `qfai init` project through
 * its stages with scripted results, and the built CLI's own `validate` of the fixture.
 */
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashAssistantAssetText } from "../../src/core/assistantAssetProvenance.js";
import {
  CLI,
  commitAll,
  field,
  resultFor,
  submit,
  workflow,
} from "../integration/workflow/workflowProject.js";

async function write(root: string, rel: string, text: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await writeFile(path.join(root, rel), `${text}\n`);
}

/** Accepts `extra` as the result of the work order `document` names, then issues the next one. */
export async function acceptThenNext(
  root: string,
  runId: string,
  document: unknown,
  resultId: string,
  extra: object = {},
) {
  const accepted = await submit(root, runId, "accept", resultFor(document, resultId, extra));
  if (field(accepted.json, "ok") !== true) throw new Error(`${resultId}: ${accepted.stdout}`);
  return { accepted, next: workflow(root, ["next", "--run", runId]) };
}

/**
 * Accepts the verify work order `document` names with this run's full PASS report and an
 * independent QA pass, commits the tree and calls `finish`.
 */
export async function verifyAndFinish(root: string, runId: string, document: unknown) {
  const report = '{"status":"PASS","scope":"full"}';
  await write(root, ".qfai/runs/shared/verify.json", report);
  const verified = await submit(
    root,
    runId,
    "accept",
    resultFor(document, "verify-1", {
      artifactRefs: [
        { path: ".qfai/runs/shared/verify.json", digest: hashAssistantAssetText(`${report}\n`) },
      ],
      reviewResults: [
        { role: "qa-gatekeeper", agentInstance: "qa-1", verdict: "PASS", reportRef: "qa.md" },
      ],
    }),
  );
  if (field(verified.json, "ok") !== true) throw new Error(`verify: ${verified.stdout}`);
  commitAll(root);
  return workflow(root, ["finish", "--run", runId]);
}

/** The exit code of the built CLI's `validate` over `root`, and the errors it printed. */
export function validateOf(root: string): { exit: number | null; errors: string[] } {
  const run = spawnSync(process.execPath, [CLI, "validate", "--format", "text"], {
    cwd: root,
    encoding: "utf8",
  });
  const errors = `${run.stdout}${run.stderr}`
    .split("\n")
    .filter((line) => line.startsWith("[error]"));
  return { exit: run.status, errors };
}

/** What a work order names: its stage kind, executor, operation and target. */
export function orderOf(document: unknown) {
  return {
    stageKind: field(document, "workOrder.stageKind"),
    skill: field(document, "workOrder.executor.skill"),
    operation: field(document, "workOrder.operation"),
    target: field(document, "workOrder.target"),
  };
}

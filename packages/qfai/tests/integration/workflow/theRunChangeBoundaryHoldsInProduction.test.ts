// QFAI:AC-0001-0196-08
// QFAI:EX-0001-0196-22
// QFAI:EX-0001-0196-23
// QFAI:EX-0001-0196-24

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

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

async function write(root: string, file: string, text: string): Promise<string> {
  const full = path.join(root, ...file.split("/"));
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, text);
  return file;
}

// The digest the core recomputes for a changed file: SHA-256 after CRLF normalization.
async function changed(root: string, file: string) {
  const { createHash } = await import("node:crypto");
  const text = (await readFile(path.join(root, ...file.split("/")), "utf8")).replace(/\r\n/g, "\n");
  return { path: file, digest: createHash("sha256").update(text, "utf8").digest("hex") };
}

it("An implement result changing its evidence and a source file inside the boundary, then next", async () => {
  const root = await initProject();
  const { runId, issued } = await featureRunAt(root, "implement");
  const evidence = await write(root, ".qfai/evidence/implement-BF-0001.md", "# Implement\n");
  const source = await write(root, "src/export.ts", "export const csv = true;\n");

  const accepted = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "implement-1", {
      changedFiles: [await changed(root, evidence), await changed(root, source)],
    }),
  );
  const next = workflow(root, ["next", "--run", runId]);
  const summary = path.join(root, ".qfai", "evidence", "workflow", runId, "summary.json");

  expect({
    accepted: field(accepted.json, "run.state"),
    next: field(next.json, "run.state"),
    stage: field(next.json, "workOrder.stageKind"),
    summary: (await readFile(summary, "utf8")).length > 0,
  }).toEqual({ accepted: "ready", next: "running", stage: "verify", summary: true });
});

it("A file changed outside the boundary while the implement work order is outstanding", async () => {
  const root = await initProject();
  const { runId, issued } = await featureRunAt(root, "implement");
  await write(root, "docs/stray.md", "Not in the plan.\n");

  const accepted = await submit(root, runId, "accept", resultFor(issued.json, "implement-1"));

  expect({
    state: field(accepted.json, "run.state"),
    cause: field(accepted.json, "halt.cause"),
    subjects: field(accepted.json, "halt.subjects"),
  }).toEqual({ state: "blocked", cause: "invariant-violation", subjects: ["docs/stray.md"] });
});

// A feature run whose verify result is blocked on a finding in `docs/guide.md`, which lies
// outside the run's scope, repaired outside the run under a change request at WIP.
async function repairedOutsideTheRun(unapproved?: string) {
  const root = await initProject();
  // The finding's owning flow has to exist in the tree.
  const flow = ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md";
  await write(root, flow, "# BF-0001: Export orders\n");
  commitAll(root);
  const { runId, issued } = await featureRunAt(root, "verify");
  const finding = {
    findingCode: "QFAI-DOC-001",
    path: "docs/guide.md",
    cause: "The guide describes the old export",
    owningFlow: "BF-0001",
    detectingCommand: "qfai validate",
    resolvingOwner: "operator",
    blockingExtent: "run",
  };
  const blocked = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "verify-1", { outcome: "blocked", debts: [finding] }),
  );
  expect(field(blocked.json, "halt.blocker"), blocked.stdout).toBe("scope-dependency");
  await write(root, "docs/guide.md", "The new export.\n");
  const row = "| DEC-0001 | Change request: docs/guide.md | Approved by the operator | WIP |\n";
  await appendFile(path.join(root, ".qfai", "spec", "decisions.md"), row);
  if (unapproved) await write(root, unapproved, "Nobody approved this.\n");
  return workflow(root, ["resume", "--run", runId]);
}

it("resume after the finding's file was repaired under a change request, and nothing else", async () => {
  const resumed = await repairedOutsideTheRun();

  expect({
    state: field(resumed.json, "run.state"),
    stage: field(resumed.json, "workOrder.stageKind"),
  }).toEqual({ state: "running", stage: "verify" });
});

it("resume after the same repair and a change no change request approves", async () => {
  const resumed = await repairedOutsideTheRun("docs/other.md");

  expect({
    code: field(resumed.json, "error.code"),
    cause: field(resumed.json, "error.cause"),
  }).toEqual({ code: "fail-closed", cause: "invariant-violation" });
});

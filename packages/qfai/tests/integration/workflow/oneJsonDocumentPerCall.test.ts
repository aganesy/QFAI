// QFAI:SPEC-0018:TC-0018-0027
// QFAI:SPEC-0018:TC-0018-0028
// QFAI:SPEC-0018:TC-0018-0029

import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import type { CliRun } from "./workflowProject.js";
import {
  FEATURE_PROPOSAL,
  field,
  inbox,
  minimalProject,
  removeProjects,
  resultFor,
  routedRun,
  START_INPUT,
  startRun,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

const UNKNOWN = "run-00000000000000000";

// The operation's stdout is one JSON document and nothing else.
function oneDocument(run: CliRun) {
  return { parsed: run.json !== undefined, ok: field(run.json, "ok") };
}

async function corrupt(root: string, runId: string) {
  const event = path.join(root, ".qfai", "runs", runId, "journal", "000002.json");
  await writeFile(event, "{ torn");
}

const calls: [string, (root: string) => Promise<CliRun>, boolean][] = [
  [
    "TC-0018-0027 (TDD-0274): start-ok",
    async (root) => workflow(root, ["start", "--in", await inbox(root, null, "s", START_INPUT)]),
    true,
  ],
  [
    "TC-0018-0027 (TDD-0275): start-error",
    (root) => Promise.resolve(workflow(root, ["start"])),
    false,
  ],
  [
    "TC-0018-0027 (TDD-0276): next-ok",
    async (root) => workflow(root, ["next", "--run", await startRun(root)]),
    true,
  ],
  [
    "TC-0018-0027 (TDD-0277): next-error",
    (root) => Promise.resolve(workflow(root, ["next", "--run", UNKNOWN])),
    false,
  ],
  ["TC-0018-0027 (TDD-0278): accept-ok", async (root) => (await routedRun(root)).routed, true],
  [
    "TC-0018-0027 (TDD-0279): accept-error",
    async (root) => {
      const runId = await startRun(root);
      await mkdir(path.join(root, "elsewhere"), { recursive: true });
      await writeFile(path.join(root, "elsewhere", "result.json"), "{}");
      return workflow(root, ["accept", "--run", runId, "--in", "elsewhere/result.json"]);
    },
    false,
  ],
  [
    "TC-0018-0027 (TDD-0280): decision-ok",
    async (root) => {
      const runId = await startRun(root);
      return submit(root, runId, "decision", { stop: true, answeredBy: "operator" });
    },
    true,
  ],
  [
    "TC-0018-0027 (TDD-0281): decision-error",
    async (root) => {
      const runId = await startRun(root);
      const answer = { questionId: "question-9-1", answer: { optionIds: ["create"] } };
      return submit(root, runId, "decision", { ...answer, answeredBy: "operator" });
    },
    false,
  ],
  [
    "TC-0018-0027 (TDD-0282): status-ok",
    async (root) => workflow(root, ["status", "--run", await startRun(root)]),
    true,
  ],
  [
    "TC-0018-0027 (TDD-0283): status-error",
    (root) => Promise.resolve(workflow(root, ["status", "--run", UNKNOWN])),
    false,
  ],
  [
    "TC-0018-0027 (TDD-0284): resume-ok",
    async (root) => workflow(root, ["resume", "--run", (await routedRun(root)).runId]),
    true,
  ],
  [
    "TC-0018-0027 (TDD-0285): resume-error",
    async (root) => workflow(root, ["resume", "--run", await startRun(root)]),
    false,
  ],
  [
    "TC-0018-0027 (TDD-0286): finish-ok",
    async (root) => workflow(root, ["finish", "--run", await startRun(root)]),
    true,
  ],
  [
    "TC-0018-0027 (TDD-0287): finish-error",
    (root) => Promise.resolve(workflow(root, ["finish"])),
    false,
  ],
];

for (const [title, call, ok] of calls) {
  it(title, async () => {
    const root = await minimalProject();

    expect(oneDocument(await call(root))).toEqual({ parsed: true, ok });
  });
}

it("TC-0018-0028 (TDD-0288): Built CLI status and next on a run in running", async () => {
  const root = await minimalProject();
  const { runId } = await routedRun(root);
  workflow(root, ["next", "--run", runId]);
  const status = workflow(root, ["status", "--run", runId]);
  const next = workflow(root, ["next", "--run", runId]);

  expect(
    [status, next].map((run) => ({
      exit: run.status,
      state: field(run.json, "run.state"),
      target: field(run.json, "target") ?? null,
    })),
  ).toEqual([
    { exit: 0, state: "running", target: null },
    { exit: 0, state: "running", target: null },
  ]);
});

// A run that has asked the operator whether to create the capability it found.
async function awaitingRun(root: string) {
  const { runId, routed } = await routedRun(root, FEATURE_PROPOSAL);
  const questionId = String(field(routed.json, "questions.0.questionId"));
  const sequence = Number(field(routed.json, "run.sequence"));
  return { runId, routed, questionId, sequence };
}

async function heldLock(root: string, runId: string) {
  const owner = {
    pid: process.pid,
    hostname: os.hostname(),
    worktree: root,
    runId,
    operation: "accept",
    startedAt: new Date().toISOString(),
    token: "held",
  };
  await writeFile(path.join(root, ".qfai", "runs", ".lock"), JSON.stringify(owner));
}

const exits: [string, (root: string) => Promise<CliRun>, number][] = [
  [
    "TC-0018-0029 (TDD-0289): exit0-blocked",
    async (root) => {
      const { runId } = await routedRun(root);
      const issued = workflow(root, ["next", "--run", runId]);
      return submit(
        root,
        runId,
        "accept",
        resultFor(issued.json, "blocked-1", { outcome: "blocked" }),
      );
    },
    0,
  ],
  [
    "TC-0018-0029 (TDD-0290): exit0-awaiting-input",
    async (root) => (await awaitingRun(root)).routed,
    0,
  ],
  [
    "TC-0018-0029 (TDD-0291): exit0-cancelled",
    async (root) =>
      submit(root, await startRun(root), "decision", { stop: true, answeredBy: "operator" }),
    0,
  ],
  [
    "TC-0018-0029 (TDD-0292): exit0-replayed-accept",
    async (root) => {
      const runId = await startRun(root);
      const routing = workflow(root, ["next", "--run", runId]);
      const result = resultFor(routing.json, "route-1", { proposal: FEATURE_PROPOSAL });
      await submit(root, runId, "accept", result);
      return submit(root, runId, "accept", result);
    },
    0,
  ],
  [
    "TC-0018-0029 (TDD-0293): exit0-replayed-decision",
    async (root) => {
      const { runId, questionId, sequence } = await awaitingRun(root);
      const answer = { questionId, answer: { optionIds: ["create"] }, answeredBy: "operator" };
      await submit(root, runId, "decision", { ...answer, expectedSequence: sequence });
      return submit(root, runId, "decision", { ...answer, expectedSequence: sequence });
    },
    0,
  ],
  [
    "TC-0018-0029 (TDD-0294): exit0-status-failed",
    async (root) => {
      const runId = await startRun(root);
      await corrupt(root, runId);
      return workflow(root, ["status", "--run", runId]);
    },
    0,
  ],
  [
    "TC-0018-0029 (TDD-0295): exit0-start-off",
    async (root) => {
      await writeFile(path.join(root, "qfai.config.yaml"), "workflow:\n  mode: off\n");
      return workflow(root, ["start", "--in", await inbox(root, null, "s", START_INPUT)]);
    },
    0,
  ],
  [
    "TC-0018-0029 (TDD-0296): exit0-start-shadow",
    async (root) => {
      await writeFile(path.join(root, "qfai.config.yaml"), "workflow:\n  mode: shadow\n");
      return workflow(root, ["start", "--in", await inbox(root, null, "s", START_INPUT)]);
    },
    0,
  ],
  [
    "TC-0018-0029 (TDD-0297): exit1-finish-unmet",
    async (root) => workflow(root, ["finish", "--run", await startRun(root)]),
    1,
  ],
  [
    "TC-0018-0029 (TDD-0298): exit1-integrity",
    async (root) => {
      const runId = await startRun(root);
      await corrupt(root, runId);
      return workflow(root, ["next", "--run", runId]);
    },
    1,
  ],
  [
    "TC-0018-0029 (TDD-0299): exit2-stale-sequence",
    async (root) => {
      const runId = await startRun(root);
      const routing = workflow(root, ["next", "--run", runId]);
      const result = resultFor(routing.json, "route-1", { proposal: FEATURE_PROPOSAL });
      return submit(root, runId, "accept", { ...result, expectedSequence: 1 });
    },
    2,
  ],
  [
    "TC-0018-0029 (TDD-0300): exit2-lock-held",
    async (root) => {
      const runId = await startRun(root);
      await heldLock(root, runId);
      return workflow(root, ["next", "--run", runId]);
    },
    2,
  ],
  [
    "TC-0018-0029 (TDD-0301): exit2-run-active",
    async (root) => {
      await startRun(root);
      return workflow(root, ["start", "--in", await inbox(root, null, "again", START_INPUT)]);
    },
    2,
  ],
  [
    "TC-0018-0029 (TDD-0302): exit2-invalid-input",
    async (root) => {
      const input = { ...START_INPUT, scope: { writeAreas: ["src/**"] } };
      return workflow(root, ["start", "--in", await inbox(root, null, "scoped", input)]);
    },
    2,
  ],
];

for (const [title, call, exit] of exits) {
  it(title, async () => {
    const root = await minimalProject();
    const run = await call(root);

    expect({ exit: run.status, parsed: run.json !== undefined }).toEqual({ exit, parsed: true });
  });
}

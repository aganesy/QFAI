// QFAI:AC-0001-0196-07
// QFAI:AC-0001-0196-08
// QFAI:AC-0001-0200-01

import { readdir, rm } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  CAPABILITIES,
  DISCOVERY_PROPOSAL,
  START_INPUT,
  commitAll,
  field,
  fileRef,
  inbox,
  initProject,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
  write,
} from "../../e2e/workflowJourney.js";
import { proposalFor } from "./acceptanceRuns.js";

afterEach(removeProjects);

it("A saturated delegation is retried at 30, 60 and 120 seconds, and a fourth leaves the run blocked", async () => {
  const root = await initProject();
  const { runId } = await routedRun(root, DISCOVERY_PROPOSAL);
  const seen: unknown[] = [];
  for (let n = 1; n <= 4; n += 1) {
    const issued = workflow(root, ["next", "--run", runId]);
    const saturated = await submit(
      root,
      runId,
      "accept",
      resultFor(issued.json, `discussion-${String(n)}`, {
        outcome: "unrun",
        testObservation: "unrun",
        delegation: { status: "saturated", attempt: field(issued.json, "workOrder.attempt") },
      }),
    );
    seen.push([
      field(saturated.json, "run.state"),
      field(saturated.json, "retry.nextDelaySeconds"),
    ]);
  }
  const status = workflow(root, ["status", "--run", runId]);
  const finish = workflow(root, ["finish", "--run", runId]);

  expect({
    seen,
    blocker: field(status.json, "halt.blocker"),
    finish: [finish.status, field(finish.json, "run.state")],
  }).toEqual({
    seen: [
      ["running", 30],
      ["running", 60],
      ["running", 120],
      ["blocked", undefined],
    ],
    blocker: "budget-exhausted",
    finish: [1, "blocked"],
  });
}, 300_000);

async function typoRun() {
  const root = await initProject();
  await write(root, "README.md", "# Notifications\n\nYou recieve one email per address.\n");
  commitAll(root);
  const { runId } = await routedRun(root, proposalFor("direct"));
  const edit = workflow(root, ["next", "--run", runId]);
  await write(root, "README.md", "# Notifications\n\nYou receive one email per address.\n");
  return { root, runId, edit };
}

it("A change outside the run's authorized boundary blocks the run, and resume clears it once undone", async () => {
  const { root, runId, edit } = await typoRun();
  await write(root, "src/stray.ts", "export const stray = true;\n");
  const blocked = await submit(
    root,
    runId,
    "accept",
    resultFor(edit.json, "edit-1", { changedFiles: [await fileRef(root, "README.md")] }),
  );
  const halted = workflow(root, ["status", "--run", runId]);
  await rm(path.join(root, "src"), { recursive: true, force: true });
  const resumed = workflow(root, ["resume", "--run", runId]);

  expect({
    blocked: field(blocked.json, "run.state"),
    cause: field(halted.json, "halt.cause"),
    resumed: [field(resumed.json, "run.state"), field(resumed.json, "workOrder.stageKind")],
  }).toEqual({
    blocked: "blocked",
    cause: "invariant-violation",
    resumed: ["running", "maintenance"],
  });
}, 300_000);

it("Changes inside the work order's write areas are admitted at the next write operation", async () => {
  const { root, runId, edit } = await typoRun();
  const accepted = await submit(
    root,
    runId,
    "accept",
    resultFor(edit.json, "edit-1", { changedFiles: [await fileRef(root, "README.md")] }),
  );
  const verify = workflow(root, ["next", "--run", runId]);

  expect([field(accepted.json, "run.state"), field(verify.json, "workOrder.stageKind")]).toEqual([
    "ready",
    "verify",
  ]);
}, 300_000);

it("A host the command does not know, or a report with a capability gap, is refused at start with no run", async () => {
  const root = await initProject();
  const refuse = async (name: string, harness: object) => {
    const started = workflow(root, [
      "start",
      "--in",
      await inbox(root, null, name, { ...START_INPUT, harness }),
    ]);
    return [started.status, field(started.json, "error.code"), field(started.json, "error.cause")];
  };
  const copilot = await refuse("copilot", { host: "copilot", capabilities: CAPABILITIES });
  const gap = await refuse("gap", {
    host: "codex",
    capabilities: { ...CAPABILITIES, resume: false },
  });
  const runs = (await readdir(path.join(root, ".qfai", "run"))).filter((name) =>
    name.startsWith("run-"),
  );

  expect({ copilot, gap, runs }).toEqual({
    copilot: [2, "fail-closed", "unsupported-capability"],
    gap: [2, "fail-closed", "unsupported-capability"],
    runs: [],
  });
}, 300_000);

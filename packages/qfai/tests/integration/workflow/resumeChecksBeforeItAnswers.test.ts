// QFAI:SPEC-0018:TC-0018-0102
// QFAI:SPEC-0018:TC-0018-0103
// QFAI:SPEC-0018:TC-0018-0104

import { spawnSync } from "node:child_process";
import { appendFile, cp, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { removeTempTree } from "../../helpers/tempTree.js";
import { field, minimalProject, removeProjects, routedRun, workflow } from "./workflowProject.js";

const worktrees: string[] = [];

afterEach(async () => {
  await removeProjects();
  await Promise.all(worktrees.splice(0).map((dir) => removeTempTree(dir)));
});

function git(root: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

// A discovery run whose discussion work order is outstanding.
async function runningRun(root: string): Promise<string> {
  const { runId } = await routedRun(root);
  const issued = workflow(root, ["next", "--run", runId]);
  if (field(issued.json, "run.state") !== "running") throw new Error(issued.stdout);
  return runId;
}

it("TC-0018-0102 (TDD-0316): Built CLI", async () => {
  const root = await minimalProject();
  const runId = await runningRun(root);
  const second = path.join(await mkdtemp(path.join(os.tmpdir(), "qfai-worktree-")), "second");
  worktrees.push(path.dirname(second));
  git(root, ["worktree", "add", "-q", "--detach", second]);
  await cp(path.join(root, ".qfai", "runs"), path.join(second, ".qfai", "runs"), {
    recursive: true,
  });
  const resumed = workflow(second, ["resume", "--run", runId]);

  expect({
    code: field(resumed.json, "error.code"),
    workOrder: field(resumed.json, "workOrder"),
  }).toEqual({ code: "identity-mismatch", workOrder: undefined });
});

it("TC-0018-0103 (TDD-0317): Switch the branch of the run's worktree, then resume", async () => {
  const root = await minimalProject();
  const runId = await runningRun(root);
  git(root, ["checkout", "-q", "-b", "another-branch"]);
  const resumed = workflow(root, ["resume", "--run", runId]);

  expect({
    state: field(resumed.json, "run.state"),
    cause: field(resumed.json, "halt.cause"),
  }).toEqual({ state: "blocked", cause: "invariant-violation" });
});

it("TC-0018-0104 (TDD-0318): Change a watched manifest outside the run's write scope, then resume", async () => {
  const root = await minimalProject();
  const runId = await runningRun(root);
  const manifest = path.join(root, ".qfai", "assistant", "manifest", "agent-routing.yml");
  await appendFile(manifest, "# edited outside the run\n");
  const resumed = workflow(root, ["resume", "--run", runId]);

  expect({
    state: field(resumed.json, "run.state"),
    cause: field(resumed.json, "halt.cause"),
  }).toEqual({ state: "blocked", cause: "policy-drift" });
});

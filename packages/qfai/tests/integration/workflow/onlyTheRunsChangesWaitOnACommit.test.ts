// QFAI:AC-0001-0192-14
// QFAI:EX-0001-0192-41

import { spawnSync } from "node:child_process";

import { afterEach, expect, it } from "vitest";

import {
  commitAll,
  field,
  fileRef,
  initProject,
  list,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
  write,
} from "../../e2e/workflowJourney.js";
import { proposalFor, verifyResult } from "./acceptanceRuns.js";

afterEach(removeProjects);

function commitOnly(root: string, paths: string[]): void {
  for (const args of [
    ["add", "--", ...paths],
    ["-c", "user.name=qfai", "-c", "user.email=qfai@example.com", "commit", "-qm", "run"],
  ]) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
  }
}

it("finish on a worktree the operator left dirty before start", async () => {
  const root = await initProject();
  await write(root, "README.md", "# Notifications\n\nYou recieve one email per address.\n");
  commitAll(root);
  // The operator's own work in progress, uncommitted before the run starts.
  await write(root, "notes/draft.md", "Half a thought.\n");
  const { runId } = await routedRun(root, proposalFor("direct"));
  const edit = workflow(root, ["next", "--run", runId]);
  await write(root, "README.md", "# Notifications\n\nYou receive one email per address.\n");
  await submit(
    root,
    runId,
    "accept",
    resultFor(edit.json, "edit-1", { changedFiles: [await fileRef(root, "README.md")] }),
  );
  const verify = workflow(root, ["next", "--run", runId]);
  await submit(root, runId, "accept", await verifyResult(root, verify.json));
  const early = workflow(root, ["finish", "--run", runId]);
  commitOnly(root, ["README.md", `.qfai/evidence/workflow/${runId}`]);
  const done = workflow(root, ["finish", "--run", runId]);

  const uncommitted = list(early.json, "unmet").find(
    (unmet) => field(unmet, "condition") === "uncommitted",
  );
  expect({
    subject: String(field(uncommitted, "subject")).includes("notes/draft.md"),
    done: [done.status, field(done.json, "run.state")],
  }).toEqual({ subject: false, done: [0, "completed"] });
}, 300_000);

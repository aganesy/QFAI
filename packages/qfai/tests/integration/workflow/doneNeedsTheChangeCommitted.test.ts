// QFAI:AC-0001-0192-14

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import path from "node:path";

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

const git = (root: string, args: string[]) =>
  spawnSync("git", ["-c", "user.name=qfai", "-c", "user.email=q@x", ...args], {
    cwd: root,
    encoding: "utf8",
  });

// A direct run that edits README.md, with its verify stage accepted: ready to finish.
async function editedRun(root: string): Promise<string> {
  await write(root, "README.md", "# Notifications\n\nYou recieve one email per address.\n");
  commitAll(root);
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
  return runId;
}

it("finish reports uncommitted and leaves the run ready until the run's changes are committed", async () => {
  // A project with no flow yet, so validate holds nothing against the run.
  const root = await initProject();
  const runId = await editedRun(root);
  const early = workflow(root, ["finish", "--run", runId]);
  const status = workflow(root, ["status", "--run", runId]);
  commitAll(root);
  const done = workflow(root, ["finish", "--run", runId]);
  // The run's own records stay local: written, ignored, and never part of the commit.
  const records = path.join(root, ".qfai", "evidence", "workflow", runId, "summary.json");
  const tracked = git(root, ["ls-files", ".qfai/evidence"]);

  expect({
    early: [
      early.status,
      field(early.json, "run.state"),
      list(early.json, "unmet").map((unmet) => field(unmet, "condition")),
    ],
    status: field(status.json, "run.state"),
    done: [done.status, field(done.json, "run.state"), field(done.json, "target")],
    records: [existsSync(records), tracked.stdout],
  }).toEqual({
    early: [1, "ready", ["uncommitted"]],
    status: "ready",
    done: [0, "completed", "qfai_done"],
    records: [true, ""],
  });
}, 300_000);

// QFAI:EX-0001-0192-41
it("finish never waits on the run's own records, even where git does not ignore them", async () => {
  const root = await initProject();
  // A stale negation from an earlier managed block leaves the run's records visible to git.
  await appendFile(path.join(root, ".gitignore"), "!.qfai/evidence/workflow/\n");
  const runId = await editedRun(root);
  const visible = git(root, ["status", "--porcelain", "--untracked-files=all", ".qfai/evidence"]);
  git(root, ["add", "README.md"]);
  git(root, ["commit", "-qm", "edit"]);
  const done = workflow(root, ["finish", "--run", runId]);

  expect({
    visible: visible.stdout.includes(`.qfai/evidence/workflow/${runId}/`),
    done: [done.status, field(done.json, "run.state"), list(done.json, "unmet")],
  }).toEqual({ visible: true, done: [0, "completed", []] });
}, 300_000);

// QFAI:AC-0001-0192-14

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

it("finish reports uncommitted and leaves the run ready until the run's changes are committed", async () => {
  // A project with no flow yet, so validate holds nothing against the run.
  const root = await initProject();
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
  const early = workflow(root, ["finish", "--run", runId]);
  const status = workflow(root, ["status", "--run", runId]);
  commitAll(root);
  const done = workflow(root, ["finish", "--run", runId]);

  expect({
    early: [
      early.status,
      field(early.json, "run.state"),
      list(early.json, "unmet").map((unmet) => field(unmet, "condition")),
    ],
    status: field(status.json, "run.state"),
    done: [done.status, field(done.json, "run.state"), field(done.json, "target")],
  }).toEqual({
    early: [1, "ready", ["uncommitted"]],
    status: "ready",
    done: [0, "completed", "qfai_done"],
  });
}, 300_000);

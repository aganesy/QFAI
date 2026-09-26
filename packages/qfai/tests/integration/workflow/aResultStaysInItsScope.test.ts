// QFAI:AC-0001-0192-10

import { afterEach, expect, it } from "vitest";

import { FEATURE_PROPOSAL } from "../../e2e/workflowFeatureRun.js";
import {
  answer,
  field,
  fileRef,
  list,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  workflow,
  write,
} from "../../e2e/workflowJourney.js";
import { FLOW_ID, flowProject, runAt } from "./acceptanceRuns.js";

afterEach(removeProjects);

const reasonsOf = (document: unknown) =>
  list(document, "error.reasons").map((each) => [field(each, "reason"), field(each, "subject")]);

it("A result changing a file in neither its write areas nor its record areas is refused", async () => {
  const root = await flowProject();
  const { runId, issued } = await runAt(root, "bounded-change", "sdd_delta");
  await write(root, "README.md", "# Notifications\n\nYou receive one email per address.\n");
  const refused = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "delta-1", { changedFiles: [await fileRef(root, "README.md")] }),
  );

  expect({
    exit: refused.status,
    code: field(refused.json, "error.code"),
    reasons: reasonsOf(refused.json),
    state: field(workflow(root, ["status", "--run", runId]).json, "run.state"),
  }).toEqual({
    exit: 2,
    code: "invalid-input",
    reasons: [["write-scope", "README.md"]],
    state: "running",
  });
}, 300_000);

const FLOW_DIR = ".qfai/spec/02_business-flow/business-flow-0001";

async function storyFile(root: string, id: string) {
  const rel = `${FLOW_DIR}/user-story-${id.slice(3)}/01_User-story.md`;
  await write(root, rel, `# ${id}: A story\n\n## User Story\n\n- Goal: As a customer, I act.\n`);
  return fileRef(root, rel);
}

it("A story-authoring result binding a story no approved slot covers is refused", async () => {
  const root = await flowProject();
  const proposal = {
    ...FEATURE_PROPOSAL,
    newStories: [{ ...FEATURE_PROPOSAL.newStories[0], flowId: FLOW_ID }],
  };
  const { runId, routed } = await routedRun(root, proposal);
  await answer(root, runId, list(routed.json, "questions")[0], "proceed");
  const sdd = workflow(root, ["next", "--run", runId]);
  const slotId = field(sdd.json, "workOrder.target.slotId");
  const changedFiles = [
    await storyFile(root, "US-0001-0002"),
    await storyFile(root, "US-0001-0003"),
  ];
  const refused = await submit(
    root,
    runId,
    "accept",
    resultFor(sdd.json, "sdd-1", {
      changedFiles,
      bindings: [
        { slotId, flowId: FLOW_ID, storyIds: ["US-0001-0002"] },
        { slotId: "slot-never-approved", flowId: FLOW_ID, storyIds: ["US-0001-0003"] },
      ],
    }),
  );

  expect({
    code: field(refused.json, "error.code"),
    reasons: reasonsOf(refused.json).map(([reason]) => reason),
    state: field(workflow(root, ["status", "--run", runId]).json, "run.state"),
  }).toEqual({
    code: "invalid-input",
    reasons: expect.arrayContaining(["unbound-story"]),
    state: "running",
  });
}, 300_000);

// QFAI:AC-0001-0195-08
// QFAI:AC-0001-0195-09

import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { DECISIONS } from "../../e2e/workflowFeatureRun.js";
import {
  field,
  fileRef,
  list,
  removeProjects,
  resultFor,
  submit,
  workflow,
  write,
} from "../../e2e/workflowJourney.js";
import { FLOW_ID, flowProject, runAt, withOtherFlows } from "./acceptanceRuns.js";

afterEach(removeProjects);

const EXAMPLES =
  ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md";

// A drift finding in `flowId`'s criteria, owned by story authoring.
function drift(flowId: string) {
  const dir = `business-flow-${flowId.slice(3)}`;
  return {
    findingCode: "criterion-drift",
    path: `.qfai/spec/02_business-flow/${dir}/business-flow.md`,
    cause: "The flow's criterion no longer matches what the code does.",
    owningFlow: flowId,
    detectingCommand: "qfai validate",
    resolvingOwner: "qfai-sdd",
    blockingExtent: "run",
  };
}

it("Drift outside the checked scope blocks the run on scope-dependency, naming each finding and its owner", async () => {
  const root = await flowProject();
  await withOtherFlows(root);
  const decisionsBefore = await readFile(path.join(root, DECISIONS), "utf8");
  const { runId, issued } = await runAt(root, "bounded-change", "verify");
  const blocked = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "verify-1", {
      outcome: "blocked",
      testObservation: "unrun",
      debts: [drift("BF-0002"), drift("BF-0003")],
    }),
  );
  const status = workflow(root, ["status", "--run", runId]);

  expect({
    state: field(blocked.json, "run.state"),
    blocker: field(status.json, "halt.blocker"),
    subjects: list(status.json, "halt.subjects").length,
    owner: field(status.json, "halt.owner"),
    decisions: (await readFile(path.join(root, DECISIONS), "utf8")) === decisionsBefore,
  }).toEqual({
    state: "blocked",
    blocker: "scope-dependency",
    subjects: 2,
    owner: "qfai-sdd",
    decisions: true,
  });
}, 300_000);

it("Drift inside the checked scope is a repair owned by story authoring, not a halt", async () => {
  const root = await flowProject();
  const { runId, issued } = await runAt(root, "bounded-change", "verify");
  const repair = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "verify-1", {
      outcome: "needs_repair",
      testObservation: "fail",
      debts: [
        {
          ...drift(FLOW_ID),
          path: EXAMPLES,
          blockingExtent: "stage",
        },
      ],
    }),
  );
  const next = workflow(root, ["next", "--run", runId]);

  expect([field(repair.json, "run.state"), field(next.json, "workOrder.executor.skill")]).toEqual([
    "ready",
    "qfai-sdd",
  ]);
}, 300_000);

const NEW_ROW = "| EX-0001-0001-03 | AC-0001-0001-01 | Five addresses and one removed | Accepted |";

async function changeExamples(root: string) {
  const text = await readFile(path.join(root, EXAMPLES), "utf8");
  await write(root, EXAMPLES, text.replace(/\n$/, `\n${NEW_ROW}\n`));
  return fileRef(root, EXAMPLES);
}

it("A story-authoring result that changes the tree while it still asks for approval is refused", async () => {
  const root = await flowProject();
  const { runId, issued } = await runAt(root, "bounded-change", "sdd_delta");
  const question = {
    kind: "decision",
    text: `Add ${NEW_ROW} to the story's examples?`,
    options: [
      {
        optionId: "apply",
        label: "Add it",
        description: "The stage writes it.",
        effect: "proceed",
      },
      { optionId: "skip", label: "Leave it", description: "The run stops.", effect: "stop" },
    ],
    selection: { min: 1, max: 1 },
    recommendation: "apply",
  };
  const refused = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "delta-1", {
      outcome: "awaiting_input",
      questions: [question],
      changedFiles: [await changeExamples(root)],
    }),
  );

  expect({
    code: field(refused.json, "error.code"),
    reasons: list(refused.json, "error.reasons").map((each) => field(each, "reason")),
    state: field(workflow(root, ["status", "--run", runId]).json, "run.state"),
  }).toEqual({
    code: "invalid-input",
    reasons: expect.arrayContaining(["record-unauthorized"]),
    state: "running",
  });
}, 300_000);

it("A change request citing no answer of this run is refused", async () => {
  const root = await flowProject();
  const { runId, issued } = await runAt(root, "bounded-change", "sdd_delta");
  const changed = await changeExamples(root);
  await write(
    root,
    DECISIONS,
    [
      "# Decisions",
      "",
      "## Decisions",
      "",
      "| ID | Content | Approach | Status |",
      "| --- | ------- | -------- | ------ |",
      `| DEC-0001 | Change request: ${EXAMPLES}, ${DECISIONS} | Within ${runId}/request-scope by operator | DONE |`,
      "",
    ].join("\n"),
  );
  const refused = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "delta-1", { changedFiles: [changed, await fileRef(root, DECISIONS)] }),
  );

  expect({
    code: field(refused.json, "error.code"),
    reasons: list(refused.json, "error.reasons").map((each) => field(each, "reason")),
    state: field(workflow(root, ["status", "--run", runId]).json, "run.state"),
  }).toEqual({
    code: "invalid-input",
    reasons: expect.arrayContaining(["record-unauthorized"]),
    state: "running",
  });
}, 300_000);

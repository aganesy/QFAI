// QFAI:BF-0001
/**
 * E2E: a typo is fixed through the edit-text route.
 *
 * On a `qfai init` project, a typo in prose routes `edit-text`: the maintenance stage edits the one
 * file in scope, a full verify follows, and `finish` completes the run from `ready`. A change
 * outside the checked scope is refused at `accept` and leaves the run where it was.
 */
import { afterEach, expect, it } from "vitest";

import {
  START_INPUT,
  commitAll,
  field,
  fileRef,
  initProject,
  removeProjects,
  resultFor,
  routedRun,
  stepNames,
  submit,
  workflow,
  write,
} from "./workflowJourney.js";
import { extractionFor } from "../helpers/workflowExtraction.js";

afterEach(removeProjects);

const EDIT_TEXT_PROPOSAL = {
  requestKind: "routed",
  extraction: extractionFor("edit-text"),
  goal: "Fix the typo 'recieve' in the README.",
  expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
  observedRefs: [{ kind: "path", ref: "README.md" }],
  affectedFlowIds: [],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [],
  proposedWriteScope: ["README.md"],
  protectedTargets: [],
  rationale: "A typo in prose only.",
};

const TYPO_INPUT = { ...START_INPUT, request: { text: "Fix the typo 'recieve' in the README." } };

async function readmeProject(): Promise<string> {
  const root = await initProject();
  await write(root, "README.md", "# Orders\n\nYou recieve one email per order.\n");
  commitAll(root);
  return root;
}

it("the edit-text plan edits the one file, verifies in full, and finish completes the run from ready", async () => {
  const root = await readmeProject();
  const { runId, routed } = await routedRun(root, EDIT_TEXT_PROPOSAL, TYPO_INPUT);
  const edit = workflow(root, ["next", "--run", runId]);
  await write(root, "README.md", "# Orders\n\nYou receive one email per order.\n");
  const edited = await submit(
    root,
    runId,
    "accept",
    resultFor(edit.json, "edit-1", { changedFiles: [await fileRef(root, "README.md")] }),
  );
  const verify = workflow(root, ["next", "--run", runId]);
  await write(root, ".qfai/report/verify.json", '{"status":"PASS","scope":"full"}\n');
  const verified = await submit(
    root,
    runId,
    "accept",
    resultFor(verify.json, "verify-1", {
      testObservation: "pass",
      artifactRefs: [await fileRef(root, ".qfai/report/verify.json")],
      reviewResults: [
        { role: "qa-gatekeeper", agentInstance: "qa-1", verdict: "PASS", reportRef: "qa.md" },
      ],
    }),
  );
  commitAll(root);
  const finished = workflow(root, ["finish", "--run", runId]);

  expect({
    states: [routed, edit, edited, verify, verified, finished].map((each) =>
      field(each.json, "run.state"),
    ),
    stages: [edit, verify].map((each) => [
      field(each.json, "workOrder.stageKind"),
      stepNames(each.json),
    ]),
    target: [finished.status, field(finished.json, "target")],
  }).toEqual({
    states: ["ready", "running", "ready", "running", "ready", "completed"],
    stages: [
      ["maintenance", ["maintain-edit"]],
      ["verify", ["verify-change-note", "verify-context", "verify-qfai-gate", "verify-repo-gate"]],
    ],
    target: [0, "qfai_done"],
  });
}, 300_000);

it("a typo that turns out to change behaviour stops the run before any edit, naming the skill that owns it", async () => {
  const root = await readmeProject();
  const { runId } = await routedRun(root, EDIT_TEXT_PROPOSAL, TYPO_INPUT);
  const edit = workflow(root, ["next", "--run", runId]);
  const semantic = {
    findingCode: "maintain-semantic-effect",
    path: "README.md",
    cause: "The misspelt word is a value the code compares.",
    owningFlow: null,
    detectingCommand: "independent review",
    resolvingOwner: "qfai-sdd",
    blockingExtent: "run",
  };
  const returned = await submit(
    root,
    runId,
    "accept",
    resultFor(edit.json, "edit-1", {
      outcome: "needs_repair",
      changedFiles: [],
      debts: [semantic],
    }),
  );
  const stopped = workflow(root, ["next", "--run", runId]);

  expect({
    returned: [returned.status, field(returned.json, "run.state")],
    stopped: [
      field(stopped.json, "workOrder"),
      field(stopped.json, "halt.blocker"),
      field(stopped.json, "halt.owner"),
    ],
  }).toEqual({ returned: [0, "blocked"], stopped: [null, "stage-blocked", "qfai-sdd"] });
}, 300_000);

it("a maintenance result changing a file outside the checked scope is refused, and the run stays running", async () => {
  const root = await readmeProject();
  const { runId } = await routedRun(root, EDIT_TEXT_PROPOSAL, TYPO_INPUT);
  const edit = workflow(root, ["next", "--run", runId]);
  await write(root, "src/orders.ts", "export const orders = [];\n");
  const refused = await submit(
    root,
    runId,
    "accept",
    resultFor(edit.json, "edit-1", { changedFiles: [await fileRef(root, "src/orders.ts")] }),
  );

  expect({
    exit: refused.status,
    code: field(refused.json, "error.code"),
    reasons: field(refused.json, "error.reasons"),
    state: field(refused.json, "run.state"),
  }).toEqual({
    exit: 2,
    code: "invalid-input",
    reasons: [{ reason: "write-scope", subject: "src/orders.ts" }],
    state: "running",
  });
}, 300_000);

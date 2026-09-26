// QFAI:BF-0001
/**
 * E2E: a typo is fixed through the direct route.
 *
 * On a `qfai init` project, a typo in prose routes `direct`: the maintenance stage edits the one
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
  submit,
  workflow,
  write,
} from "./workflowJourney.js";

afterEach(removeProjects);

const DIRECT_PROPOSAL = {
  requestKind: "change",
  candidateRoute: "direct",
  goal: "Fix the typo 'recieve' in the README.",
  expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
  observedRefs: [{ kind: "path", ref: "README.md" }],
  affectedFlowIds: [],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [],
  proposedWriteScope: ["README.md"],
  protectedTargets: [],
  requiredStages: ["maintenance", "verify"],
  rationale: "A typo in prose only.",
};

const TYPO_INPUT = { ...START_INPUT, request: { text: "Fix the typo 'recieve' in the README." } };

async function readmeProject(): Promise<string> {
  const root = await initProject();
  await write(root, "README.md", "# Orders\n\nYou recieve one email per order.\n");
  commitAll(root);
  return root;
}

it("the direct plan edits the one file, verifies in full, and finish completes the run from ready", async () => {
  const root = await readmeProject();
  const { runId, routed } = await routedRun(root, DIRECT_PROPOSAL, TYPO_INPUT);
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
      field(each.json, "workOrder.executor.skill"),
      field(each.json, "workOrder.operation"),
    ]),
    target: [finished.status, field(finished.json, "target")],
  }).toEqual({
    states: ["ready", "running", "ready", "running", "ready", "completed"],
    stages: [
      ["maintenance", "qfai-maintain", "non-normative-edit"],
      ["verify", "qfai-verify", "verify-full"],
    ],
    target: [0, "qfai_done"],
  });
}, 300_000);

it("a typo that turns out to change behaviour is returned for a new route before any edit", async () => {
  const root = await readmeProject();
  const { runId } = await routedRun(root, DIRECT_PROPOSAL, TYPO_INPUT);
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
  const routing = workflow(root, ["next", "--run", runId]);

  expect({
    returned: [returned.status, field(returned.json, "run.state")],
    routing: [
      field(routing.json, "workOrder.stageKind"),
      field(routing.json, "workOrder.executor.skill"),
    ],
  }).toEqual({ returned: [0, "routing"], routing: ["route", "qfai-run"] });
}, 300_000);

it("a maintenance result changing a file outside the checked scope is refused, and the run stays running", async () => {
  const root = await readmeProject();
  const { runId } = await routedRun(root, DIRECT_PROPOSAL, TYPO_INPUT);
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

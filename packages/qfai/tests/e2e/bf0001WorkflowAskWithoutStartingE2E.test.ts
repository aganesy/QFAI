// QFAI:BF-0001
/**
 * E2E: asking about the repository starts nothing.
 *
 * The entry's own `status` call on a `qfai init` project answers with no run and the mode in
 * force, and leaves the tree byte for byte as it was. A routing result that classes the request
 * as anything but a change is refused, so an explanation never becomes a run.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  field,
  initProject,
  list,
  removeProjects,
  resultFor,
  startRun,
  submit,
  treeDigest,
  workflow,
} from "./workflowJourney.js";

afterEach(removeProjects);

it("the entry's status call leaves no run and a byte-identical tree", async () => {
  const root = await initProject();
  const before = await treeDigest(root);

  const status = workflow(root, ["status"]);

  expect({
    exit: status.status,
    run: field(status.json, "run"),
    mode: field(status.json, "mode"),
    runs: existsSync(path.join(root, ".qfai", "run")),
    unchanged: (await treeDigest(root)) === before,
  }).toEqual({ exit: 0, run: null, mode: "active", runs: false, unchanged: true });
}, 180_000);

it("a routing result for an explanation only is refused, and the run stays in routing", async () => {
  const root = await initProject();
  const runId = await startRun(root);
  const routing = workflow(root, ["next", "--run", runId]);
  const readOnly = {
    requestKind: "read_only",
    candidateRoute: null,
    goal: "Explain why the export answers 500.",
    expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
    observedRefs: [],
    affectedFlowIds: [],
    riskSignals: [],
    unresolvedQuestions: [],
    newStories: [],
    proposedWriteScope: [],
    protectedTargets: [],
    requiredStages: [],
    rationale: "An explanation is not a change.",
  };
  const refused = await submit(
    root,
    runId,
    "accept",
    resultFor(routing.json, "route-1", { proposal: readOnly }),
  );

  expect({
    exit: refused.status,
    code: field(refused.json, "error.code"),
    reasons: list(refused.json, "error.reasons").map((reason) => field(reason, "reason")),
    state: field(workflow(root, ["status", "--run", runId]).json, "run.state"),
  }).toEqual({
    exit: 2,
    code: "proposal-refused",
    reasons: expect.arrayContaining(["scope-escape"]),
    state: "routing",
  });
}, 180_000);

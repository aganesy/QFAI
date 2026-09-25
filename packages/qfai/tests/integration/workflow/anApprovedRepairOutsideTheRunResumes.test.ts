// QFAI:SPEC-0018:TC-0018-0264

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  commitAll,
  featureRunAt,
  field,
  minimalProject,
  removeProjects,
  resultFor,
  submit,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

const SPEC = ".qfai/specs/spec-0002/03_Acceptance-Criteria.md";
const DRIFTED = ".qfai/contracts/api/orders.yaml";
const CHANGE_REQUEST = ".qfai/decisions/CR-20260926-0001-repair-the-orders-contract.md";

async function write(root: string, file: string, text: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
}

function changeRequest(status: string): string {
  return [
    "# Change Request",
    "",
    "- ID: `CR-20260926-0001`",
    `- Status: \`${status}\``,
    "",
    "## Impact scope",
    "",
    `- Contracts: \`${DRIFTED}\``,
    "",
  ].join("\n");
}

const DRIFT = {
  findingCode: "QFAI-CONTRACT-DRIFT",
  path: DRIFTED,
  cause: "The contract lags the spec.",
  owningSpec: "spec-0002",
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "run",
};

function outOfScope(finished: unknown): unknown[] {
  const unmet = field(finished, "unmet");
  return (Array.isArray(unmet) ? unmet : [])
    .filter((entry) => field(entry, "condition") === "diff-out-of-scope")
    .map((entry) => field(entry, "subject"));
}

// A feature run blocked at verify on a contract drift outside its write scope, which is then
// repaired outside the run under a Change Request in the given status, resumed and finished.
async function repairedOutsideTheRun(status: string) {
  const root = await minimalProject();
  await write(root, SPEC, "# Acceptance criteria\n");
  await write(root, DRIFTED, "openapi: 3.0.0\n");
  commitAll(root);
  const { runId, issued } = await featureRunAt(root, "verify");
  const blocked = await submit(
    root,
    runId,
    "accept",
    resultFor(issued.json, "verify-1", { outcome: "blocked", debts: [DRIFT] }),
  );
  await write(root, DRIFTED, "openapi: 3.0.0\ninfo:\n  title: Orders\n");
  await write(root, CHANGE_REQUEST, changeRequest(status));
  const resumed = workflow(root, ["resume", "--run", runId]);
  const finished = workflow(root, ["finish", "--run", runId]);
  return {
    blocker: field(blocked.json, "halt.blocker"),
    state: field(resumed.json, "run.state"),
    cause: field(resumed.json, "error.cause"),
    outOfScope: outOfScope(finished.json),
  };
}

it("TC-0018-0264: an approved Change Request admits the repair it names at resume and finish", async () => {
  expect(await repairedOutsideTheRun("approved")).toEqual({
    blocker: "scope-dependency",
    state: "running",
    cause: undefined,
    outOfScope: [],
  });
}, 180_000);

it("TC-0018-0264: a Change Request that is not approved leaves the run blocked", async () => {
  expect(await repairedOutsideTheRun("open")).toEqual({
    blocker: "scope-dependency",
    state: "blocked",
    cause: "invariant-violation",
    outOfScope: [DRIFTED, CHANGE_REQUEST],
  });
}, 180_000);

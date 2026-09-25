/**
 * The observer reads the bound spec's ledger and test cases, and the facts it derives decide
 * whether the acceptance stage runs and which skill a test fix goes to.
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowSnapshot } from "../../../src/core/workflow/decide.js";
import {
  acceptanceObligationsUnmetOf,
  ledgerFactsOf,
  planFacts,
} from "../../../src/core/workflow/observe.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const DONE_UNIT =
  "| TDD-0001 | TC-0001-0001 | Unit | tests/a.test.ts | TC-0001-0001 (TDD-0001) | done | - | - |";
const TODO_E2E =
  "| TDD-0002 | - | E2E | tests/e2e/a.spec.ts | US-0001-0001 (TDD-0002) | todo | - | - |";
const DONE_E2E = TODO_E2E.replace("| todo |", "| done |");
const DONE_INTEGRATION =
  "| TDD-0003 | TC-0001-0002 | Integration | tests/b.test.ts | TC-0001-0002 (TDD-0003) | done | - | - |";

async function specProject(rows: string[], integrationLevel = "L3") {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-facts-"));
  roots.push(root);
  const spec = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(spec, "tdd"), { recursive: true });
  const ledger = [
    "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
  ];
  await writeFile(
    path.join(spec, "tdd", "test-list.md"),
    `# TDD Test List\n\n${ledger.join("\n")}\n`,
  );
  const cases = [
    "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
    "| --- | --- | --- | --- | --- | --- |",
    "| TC-0001-0001 | L1 | AC-0001-0001 | EX-0001-0001 | a | b |",
    `| TC-0001-0002 | ${integrationLevel} | AC-0001-0001 | EX-0001-0001 | a | b |`,
  ];
  await writeFile(
    path.join(spec, "06_Test-Cases.md"),
    `# 06 Test Cases\n\n## Test Case Table (required)\n\n${cases.join("\n")}\n`,
  );
  return root;
}

async function readySnapshot(
  route: "bugfix" | "bounded-change",
  accepted: string[],
  diagnosis?: WorkflowSnapshot["diagnosis"],
): Promise<WorkflowSnapshot> {
  const plan = (await planFacts())[route];
  if (!plan) throw new Error(`no ${route} plan`);
  const acceptedStages = accepted.map((stageInstanceId) => ({
    stageInstanceId,
    stageKind:
      plan.stages.find((stage) => stage.stageInstanceId === stageInstanceId)?.stageKind ?? "",
    outcome: "accepted",
  }));
  return {
    run: { id: "run-20260926000000000", state: "ready", sequence: 8 },
    plan,
    specBinding: { specId: "spec-0001" },
    acceptedStages,
    ...(diagnosis ? { diagnosis } : {}),
  };
}

// The work order `next` issues, with the facts the command adapter supplies.
async function nextWorkOrder(root: string, snapshot: WorkflowSnapshot) {
  const ledger = await ledgerFactsOf(root, "spec-0001");
  const acceptanceObligationsUnmet = acceptanceObligationsUnmetOf(snapshot, ledger);
  const decision = decide(snapshot, { operation: "next" }, { ledger, acceptanceObligationsUnmet });
  const workOrder = decision.verdict.workOrder;
  return {
    ok: decision.verdict.ok,
    stageKind: workOrder?.stageKind,
    skill: workOrder?.executor?.skill,
  };
}

it("A bounded change whose ledger holds an unfinished E2E row issues the acceptance stage", async () => {
  const root = await specProject([DONE_UNIT, TODO_E2E]);
  const snapshot = await readySnapshot("bounded-change", ["sdd-delta"]);

  expect(await nextWorkOrder(root, snapshot)).toEqual({
    ok: true,
    stageKind: "acceptance",
    skill: "qfai-atdd",
  });
});

it("A bounded change whose acceptance-layer rows are all done goes straight to implement", async () => {
  const root = await specProject([DONE_UNIT, DONE_E2E]);
  const snapshot = await readySnapshot("bounded-change", ["sdd-delta"]);

  expect(await nextWorkOrder(root, snapshot)).toEqual({
    ok: true,
    stageKind: "implement",
    skill: "qfai-implement",
  });
});

it("An accepted acceptance stage keeps its place once implement has finished the row", async () => {
  const root = await specProject([DONE_UNIT, DONE_E2E]);
  const snapshot = await readySnapshot("bounded-change", ["sdd-delta", "acceptance", "implement"]);

  expect(await nextWorkOrder(root, snapshot)).toEqual({
    ok: true,
    stageKind: "verify",
    skill: "qfai-verify",
  });
});

it("A bugfix diagnosed as a regression does not issue acceptance for an unrelated E2E row", async () => {
  const root = await specProject([DONE_UNIT, TODO_E2E]);
  const diagnosis = {
    verdict: "regression",
    reproductionRef: "repro.md",
    matchedRowIds: ["TDD-0001"],
  };
  const snapshot = await readySnapshot("bugfix", ["diagnose"], diagnosis);

  expect(await nextWorkOrder(root, snapshot)).toEqual({
    ok: true,
    stageKind: "regression_fix",
    skill: "qfai-implement",
  });
});

const testFixCases: [string, string, string[], string][] = [
  ["names an L3 case", "L3", ["L3"], "qfai-atdd"],
  ["names only an L1 case", "L1", ["L1"], "qfai-implement"],
];

for (const [title, level, tcLevels, skill] of testFixCases) {
  it(`A test fix for an Integration row that ${title} goes to ${skill}`, async () => {
    const root = await specProject([DONE_UNIT, DONE_INTEGRATION], level);
    const diagnosis = {
      verdict: "defective-test",
      reproductionRef: "repro.md",
      matchedRowIds: ["TDD-0003"],
    };
    const snapshot = await readySnapshot("bugfix", ["diagnose"], diagnosis);
    const ledger = await ledgerFactsOf(root, "spec-0001");

    expect({
      tcLevels: ledger?.rows.find((row) => row.rowId === "TDD-0003")?.tcLevels,
      workOrder: await nextWorkOrder(root, snapshot),
    }).toEqual({ tcLevels, workOrder: { ok: true, stageKind: "test_fix", skill } });
  });
}

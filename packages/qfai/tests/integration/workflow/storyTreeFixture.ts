/**
 * A temp project holding a small story tree, the tests that annotate its examples and the two
 * record tables, and a run whose work order was issued against it: the decision function reads
 * the tree through the observer, and the issued events are folded the way the journal folds them.
 */
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadConfig } from "../../../src/core/config.js";
import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowSnapshot } from "../../../src/core/workflow/decide.js";
import { foldRecord, recordsOf } from "../../../src/core/workflow/fold.js";
import { storyFactsOf } from "../../../src/core/workflow/storyFacts.js";
import { removeTempTree } from "../../helpers/tempTree.js";

export const FLOW = ".qfai/spec/02_business-flow/business-flow-0001";
export const STORY = `${FLOW}/user-story-0001-0001`;
export const EXAMPLES = `${STORY}/03_Example.md`;
export const CONTRACT = ".qfai/spec/03_contract/cli/export.md";
export const DECISIONS = ".qfai/spec/decisions.md";
export const TEST = "tests/export.test.ts";

export const EXAMPLE_ROWS = [
  "| EX-0001-0001-01 | AC-0001-0001-01 | Two order lines | Two rows |",
  "| EX-0001-0001-02 | AC-0001-0001-01 | No order line | A header only |",
];

export function examples(rows: string[] = EXAMPLE_ROWS): string {
  return ["# Examples", "", "## Examples", "", "| EX-ID | AC-Ref | Input | Expected |"]
    .concat("| --- | --- | --- | --- |", rows, "")
    .join("\n");
}

export function testFile(annotated: string[]): string {
  return annotated
    .map((id) => `// QFAI:${id}\nit("${id}", () => expect(exportCsv([])).toBeDefined());\n`)
    .join("\n");
}

export function decisions(rows: string[]): string {
  return ["# Decisions", "", "| ID | Content | Approach | Status |", "| --- | --- | --- | --- |"]
    .concat(rows, "")
    .join("\n");
}

const FILES: Record<string, string> = {
  "qfai.config.yaml":
    "validation:\n  traceability:\n    testFileGlobs:\n      - tests/**/*.test.ts\n",
  [`${FLOW}/business-flow.md`]: "# BF-0001: Export orders\n",
  [`${STORY}/01_User-story.md`]: "# US-0001-0001: Export an order\n",
  [`${STORY}/02_Acceptance-Criteria.md`]: [
    "# Acceptance Criteria",
    "",
    "## Criteria",
    "",
    "```gherkin",
    "Feature: Export an order",
    "",
    "# AC-0001-0001-01",
    "Scenario: Export the order lines",
    "  Given an order",
    "  When the order is exported",
    "  Then each line is one row",
    "```",
    "",
  ].join("\n"),
  [EXAMPLES]: examples(),
  [CONTRACT]: [
    "# Export",
    "",
    "## Rules",
    "",
    "| BR-ID | Statement | Examples |",
    "| --- | --- | --- |",
    "| BR-0001 | One row per order line | EX-0001-0001-01, EX-0001-0001-02 |",
    "",
  ].join("\n"),
  [DECISIONS]: decisions(["| DEC-0001 | Export as CSV | Settled | DONE |"]),
  ".qfai/spec/open-questions.md": decisions([]),
  [TEST]: testFile(["EX-0001-0001-01", "EX-0001-0001-02"]),
};

const roots: string[] = [];

export async function removeStoryProjects(): Promise<void> {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
}

export async function write(root: string, file: string, text: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
}

export async function read(root: string, file: string): Promise<string> {
  return readFile(path.join(root, file), "utf8");
}

/** A temp project holding the story tree, its tests and its record tables. */
export async function storyProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-"));
  roots.push(root);
  for (const [file, text] of Object.entries(FILES)) await write(root, file, text);
  return root;
}

/** The facts the observer reads for the run's flow. */
export async function storyFacts(root: string, snapshot: WorkflowSnapshot) {
  const { config } = await loadConfig(root);
  return storyFactsOf(root, config, snapshot.flowBinding?.flowId, snapshot.diagnosis);
}

function stage(stageKind: string, skill: string, operation: string, when = "always") {
  return { stageInstanceId: stageKind, stageKind, skill, operation, when };
}

const acceptedStage = (stageKind: string) => ({
  stageInstanceId: stageKind,
  stageKind,
  outcome: "accepted",
});

const BOUNDED = [
  stage("sdd_delta", "qfai-sdd", "update-or-applicability-check"),
  stage("implement", "qfai-implement", "implement"),
  stage("verify", "qfai-verify", "verify-full"),
];

const BUGFIX = [
  stage("diagnose", "qfai-implement", "diagnose-only"),
  stage("sdd_append", "qfai-sdd", "defect-example-seeding", "missing_example_needed"),
  stage("implement", "qfai-implement", "implement", "diagnosis_missing_test"),
  stage("verify", "qfai-verify", "verify-full"),
];

/**
 * A ready run bound to BF-0001 whose next stage is `stageKind`: of the bounded-change plan, or of
 * the bugfix plan after a missing-test diagnosis for defect example seeding.
 */
export function readySnapshot(stageKind: string, extra: Partial<WorkflowSnapshot> = {}) {
  const seeding = stageKind === "sdd_append";
  const stages = seeding ? BUGFIX : BOUNDED;
  const before = stages.slice(
    0,
    stages.findIndex((each) => each.stageKind === stageKind),
  );
  const snapshot: WorkflowSnapshot = {
    run: { id: "run-20260926000000000", state: "ready", sequence: 6 },
    plan: {
      route: seeding ? "bugfix" : "bounded-change",
      stages,
      writeScope: ["src/**", "tests/**"],
    },
    flowBinding: { flowId: "BF-0001" },
    acceptedStages: before.map((each) => acceptedStage(each.stageKind)),
    ...(seeding
      ? {
          diagnosis: {
            verdict: "missing-test",
            reproductionRef: "evidence/reproduction.json",
            matchedIds: ["AC-0001-0001-01"],
          },
        }
      : {}),
    ...extra,
  };
  return snapshot;
}

/** The run after `next` issued its one stage against the tree on disk. */
export async function issued(root: string, before: WorkflowSnapshot) {
  const decision = decide(before, { operation: "next" }, await storyFacts(root, before));
  const records = recordsOf(decision, { operation: "next", before: before.run });
  const snapshot = records.reduce(
    (folded, record) => foldRecord(folded, { ...record, prevHash: null }),
    before,
  );
  return { snapshot, workOrder: decision.verdict.workOrder };
}

/** Decides `accept` of a result for the outstanding work order, reading the tree on disk. */
export async function accepted(root: string, snapshot: WorkflowSnapshot, extra: object = {}) {
  const workOrder = snapshot.outstandingWorkOrder;
  const result = {
    resultId: "result-1",
    workOrderId: workOrder?.workOrderId ?? "",
    stageInstanceId: workOrder?.stageInstanceId ?? "",
    attempt: workOrder?.attempt ?? 0,
    expectedSequence: snapshot.run.sequence,
    outcome: "accepted",
    testObservation: "not_applicable",
    ...extra,
  };
  const decision = decide(
    snapshot,
    { operation: "accept", result },
    await storyFacts(root, snapshot),
  );
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    reasons: error && "reasons" in error ? error.reasons : undefined,
  };
}

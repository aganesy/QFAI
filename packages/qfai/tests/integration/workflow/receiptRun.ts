/**
 * A feature run driven through the built CLI to a recorded RED receipt, and optionally a GREEN
 * one, over a story tree, a test file and a production file that exist on disk. Every stage
 * before acceptance is accepted with a canned result.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashAssistantAssetText } from "../../../src/core/assistantAssetProvenance.js";
import {
  commitAll,
  featureRunAt,
  field,
  minimalProject,
  resultFor,
  submit,
  workflow,
} from "./workflowProject.js";

export const FLOW = ".qfai/spec/02_business-flow/business-flow-0001";
export const STORY = `${FLOW}/user-story-0001-0001`;
export const AC_FILE = `${STORY}/02_Acceptance-Criteria.md`;
export const TEST_FILE = "src/export.test.ts";
export const PRODUCTION_FILE = "src/export.ts";
export const RED_RECEIPT = "results/red-1.json";
export const GREEN_RECEIPT = "results/green-1.json";

/** The criterion file, stating the export as `format`. */
export function criteria(format: string): string {
  return [
    "# Acceptance Criteria",
    "",
    "## Criteria",
    "",
    "```gherkin",
    "Feature: Export an order",
    "",
    "# AC-0001-0001-01",
    "Scenario: Export the order lines",
    "  Given an order with two lines",
    "  When the order is exported",
    `  Then the lines are exported as ${format}`,
    "```",
    "",
  ].join("\n");
}

const FILES: Record<string, string> = {
  [`${FLOW}/business-flow.md`]: "# BF-0001: Export orders\n",
  [`${STORY}/01_User-story.md`]: "# US-0001-0001: Export an order\n",
  [AC_FILE]: criteria("CSV"),
  [`${STORY}/03_Example.md`]: [
    "# Examples",
    "",
    "## Examples",
    "",
    "| EX-ID | AC-Ref | Input | Expected |",
    "| --- | --- | --- | --- |",
    "| EX-0001-0001-01 | AC-0001-0001-01 | An order with two lines | Two rows |",
    "",
  ].join("\n"),
  [TEST_FILE]: "it('exports two rows', () => expect(exportCsv(order)).toHaveLength(2));\n",
  [PRODUCTION_FILE]: "export const exportCsv = () => [];\n",
};

export async function write(root: string, file: string, text: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
}

async function changed(root: string, file: string) {
  return {
    path: file,
    digest: hashAssistantAssetText(await readFile(path.join(root, file), "utf8")),
  };
}

/** Writes BF-0001's story tree, a test file and a production file into `root`. */
export async function writeReceiptFiles(root: string): Promise<void> {
  for (const [file, text] of Object.entries(FILES)) await write(root, file, text);
}

/** A minimal project holding BF-0001's story tree, a test file and a production file. */
export async function receiptProject(): Promise<string> {
  const root = await minimalProject();
  await writeReceiptFiles(root);
  commitAll(root);
  return root;
}

async function accepted(root: string, runId: string, issued: unknown, id: string, extra: object) {
  const done = await submit(root, runId, "accept", resultFor(issued, id, extra));
  if (field(done.json, "ok") !== true) throw new Error(done.stdout);
  const next = workflow(root, ["next", "--run", runId]);
  if (field(next.json, "run.state") !== "running") throw new Error(next.stdout);
  return next;
}

/**
 * A feature run whose acceptance stage recorded RED over the test file, left with the implement
 * work order outstanding; with `green`, the implement stage also recorded GREEN over the
 * production file, leaving the verify work order outstanding.
 */
export async function runWithReceipts(root: string, green: boolean) {
  const { runId, issued } = await featureRunAt(root, "acceptance");
  const red = {
    testObservation: "expected_red",
    red: { testId: "EX-0001-0001-01", failureKind: "assertion" },
    changedFiles: [await changed(root, TEST_FILE)],
  };
  const implement = await accepted(root, runId, issued.json, "red-1", red);
  if (!green) return { runId, outstanding: implement };
  await write(root, PRODUCTION_FILE, "export const exportCsv = () => ['a', 'b'];\n");
  const pass = { testObservation: "pass", changedFiles: [await changed(root, PRODUCTION_FILE)] };
  const verify = await accepted(root, runId, implement.json, "green-1", pass);
  return { runId, outstanding: verify };
}

/** Each classed receipt of a `resume` document, by its reference. */
export function receiptsOf(document: unknown): Record<string, unknown> {
  const receipts = field(document, "classedReceipts");
  return Object.fromEntries(
    (Array.isArray(receipts) ? receipts : []).map((each: unknown) => [
      String(field(each, "ref")),
      field(each, "validity"),
    ]),
  );
}

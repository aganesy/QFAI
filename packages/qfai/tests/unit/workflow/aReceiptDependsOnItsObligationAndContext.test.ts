// QFAI:EX-0001-0189-06

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../../src/core/config.js";
import { writeDiscussionCurrentId } from "../../../src/core/state.js";
import { receiptDependenciesOf, receiptValidityOf } from "../../../src/core/workflow/observe.js";
import { obligationOf } from "../../../src/core/workflow/storyFacts.js";
import type {
  WorkflowResult,
  WorkflowSnapshot,
  WorkflowWorkOrder,
} from "../../../src/core/workflow/types.js";
import {
  AC_FILE,
  criteria,
  PRODUCTION_FILE,
  STORY,
  writeReceiptFiles,
} from "../../integration/workflow/receiptRun.js";

const PACK = ".qfai/discussion/discussion-20260101000000000";
const OTHER_PACK = ".qfai/discussion/discussion-20260102000000000";
const RULE_FILE = ".qfai/spec/03_contract/cli/cli-0001-export.md";
const RULES = [
  "# CLI-0001: Export",
  "",
  "## Business rules",
  "",
  "| BR-ID | Statement | Examples |",
  "| --- | --- | --- |",
  "| BR-0001-0001 | One row per order line. | EX-0001-0001-01 |",
  "",
].join("\n");
const EXTRA_FILES: Record<string, string> = {
  ".qfai/assistant/rule/constitution.md": "# Constitution\n",
  ".qfai/assistant/skill/qfai-atdd/SKILL.md": "# qfai-atdd\n",
  ".qfai/assistant/step/atdd-author/STEP.md": "# atdd-author\n",
  [`${PACK}/01_Context.md`]: "# Context\n",
  [`${OTHER_PACK}/01_Context.md`]: "# Context\n",
  [RULE_FILE]: RULES,
};

let root = "";

async function write(file: string, text: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-receipt-"));
  await writeReceiptFiles(root);
  await write("src/export.ts", "export const exportCsv = () => [];\n");
  for (const [file, text] of Object.entries(EXTRA_FILES)) await write(file, text);
  await writeDiscussionCurrentId(root, path.basename(PACK));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const WORK_ORDER: WorkflowWorkOrder = {
  workOrderId: "wo-1",
  stageInstanceId: "implement",
  attempt: 1,
  stageKind: "implement",
  steps: [
    {
      name: "atdd-author",
      path: ".qfai/assistant/step/atdd-author/STEP.md",
      mode: null,
      passThrough: false,
      decisionPoint: null,
      branchPoint: false,
    },
  ],
  scope: { writeAreas: [PRODUCTION_FILE, "src/gone.ts"] },
};

// The validity of a result's receipt after `change`: a GREEN one over the production file and
// `extra`, or one that observed no test.
async function validityAfter(
  change: () => Promise<void>,
  options: { extra?: string[]; observed?: boolean } = {},
) {
  const { config } = await loadConfig(root);
  const found = await obligationOf(root, config, "BF-0001");
  const obligation = found && { flowId: "BF-0001", ...found };
  const changedFiles = [PRODUCTION_FILE, ...(options.extra ?? [])].map((file) => ({
    path: file,
    digest: "",
  }));
  const result: WorkflowResult = {
    resultId: "r-1",
    workOrderId: "wo-1",
    stageInstanceId: "implement",
    attempt: 1,
    expectedSequence: 1,
    outcome: "completed",
    ...(options.observed === false ? {} : { testObservation: "pass", changedFiles }),
  };
  const dependencies = await receiptDependenciesOf(root, WORK_ORDER, result, obligation);
  await change();
  const stage = { stageInstanceId: "implement", stageKind: "implement", outcome: "completed" };
  const snapshot: WorkflowSnapshot = {
    run: { id: "run-1", state: "running", sequence: 1 },
    acceptedStages: [{ ...stage, receiptRef: "green", dependencies }],
  };
  return (await receiptValidityOf(root, snapshot)).green;
}

const unchanged = async () => {};
const withNothing = { observed: false };

describe("the obligation a receipt holds", () => {
  it("stays valid when nothing changes", async () => {
    expect(await validityAfter(unchanged)).toBe("valid");
  });

  it("stays valid when an unrelated file changes", async () => {
    const edit = () => write(".qfai/spec/02_business-flow/README.md", "# Notes\n");
    expect(await validityAfter(edit)).toBe("valid");
  });

  it("goes stale when the text of a criterion changes", async () => {
    expect(await validityAfter(() => write(AC_FILE, criteria("TSV")))).toBe("stale");
  });

  it("stays valid when another part of the criterion file changes", async () => {
    const edited = criteria("CSV").replace("Feature: Export an order", "Feature: Order export");
    expect(await validityAfter(() => write(AC_FILE, edited))).toBe("valid");
  });

  it("goes stale when the text of an example changes", async () => {
    const edit = () =>
      write(
        `${STORY}/03_Example.md`,
        [
          "# Examples",
          "",
          "## Examples",
          "",
          "| EX-ID | AC-Ref | Input | Expected |",
          "| --- | --- | --- | --- |",
          "| EX-0001-0001-01 | AC-0001-0001-01 | An order with two lines | Three rows |",
          "",
        ].join("\n"),
      );
    expect(await validityAfter(edit)).toBe("stale");
  });

  it("goes stale when the contract that owns a cited rule changes", async () => {
    // Outside the rules table, so the obligation digest holds and only the owner file moves.
    const edit = () => write(RULE_FILE, `${RULES}\nA note on the export.\n`);
    expect(await validityAfter(edit)).toBe("stale");
  });

  it("is held by a receipt that observed no test only through its context", async () => {
    expect(await validityAfter(() => write(AC_FILE, criteria("TSV")), withNothing)).toBe("valid");
  });
});

describe("the context a receipt holds", () => {
  it.each([
    ["the config appears", () => write("qfai.config.yaml", "version: 1\n")],
    ["a lockfile appears", () => write("pnpm-lock.yaml", "lockfileVersion: 9\n")],
    ["a policy file changes", () => write(".qfai/assistant/rule/constitution.md", "# Changed\n")],
    ["a policy file appears", () => write(".qfai/assistant/rule/extra.md", "# Extra\n")],
    ["the owning skill changes", () => write(".qfai/assistant/skill/qfai-atdd/SKILL.md", "# x\n")],
    [
      "a step of the work order changes",
      () => write(".qfai/assistant/step/atdd-author/STEP.md", "#"),
    ],
    ["a file of the selected pack changes", () => write(`${PACK}/01_Context.md`, "# Changed\n")],
    ["another pack is selected", () => writeDiscussionCurrentId(root, path.basename(OTHER_PACK))],
  ])("goes stale when %s", async (_name, change) => {
    expect(await validityAfter(change, withNothing)).toBe("stale");
  });

  it("stays valid when a skill the work order does not run changes", async () => {
    const edit = () => write(".qfai/assistant/skill/qfai-sdd/SKILL.md", "# qfai-sdd\n");
    expect(await validityAfter(edit, withNothing)).toBe("valid");
  });

  it("stays valid when a pack that is not selected changes", async () => {
    const edit = () => write(`${OTHER_PACK}/01_Context.md`, "# Changed\n");
    expect(await validityAfter(edit, withNothing)).toBe("valid");
  });
});

describe("a changed file that no longer exists", () => {
  it("is held as absent, and the receipt stays valid while it stays absent", async () => {
    expect(await validityAfter(unchanged, { extra: ["src/gone.ts"] })).toBe("valid");
  });

  it("goes stale when the file comes back", async () => {
    const restore = () => write("src/gone.ts", "export const gone = 1;\n");
    expect(await validityAfter(restore, { extra: ["src/gone.ts"] })).toBe("stale");
  });
});

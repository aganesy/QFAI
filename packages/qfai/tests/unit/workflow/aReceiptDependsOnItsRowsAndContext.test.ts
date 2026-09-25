import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { WorkflowWorkOrder } from "../../../src/core/workflow/decide.js";
import { receiptDependenciesOf, receiptValidityOf } from "../../../src/core/workflow/observe.js";

const PACK = ".qfai/specs/spec-0001";
const LEDGER = `${PACK}/tdd/test-list.md`;
const AC_FILE = `${PACK}/03_Acceptance-Criteria.md`;
const HEADER =
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | CON-API-Refs | Boundary |";

function ledger(rows: string[]): string {
  return [
    "# TDD Test List",
    "",
    HEADER,
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

const ROW_1 =
  "| TDD-0001 | TC-0001-0001 | Unit | src/a.test.ts | a | todo | - | - | CON-API-0001 | one |";
const ROW_2 = "| TDD-0002 | TC-0001-0002 | Unit | src/b.test.ts | b | todo | - | - | - | - |";

const FILES: Record<string, string> = {
  [`${PACK}/01_Spec.md`]: "# Spec\n\n- Status: active\n\n## Overview\n",
  [`${PACK}/02_User-stories.md`]: "# User stories\n\n- US-0001-0001: export an order.\n",
  [AC_FILE]: "# AC\n\nAC-0001-0001: lines are exported as CSV.\n\nAC-0001-0002: a header row.\n",
  [`${PACK}/04_Business-Rules.md`]:
    "# BR\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | one line each |\n",
  [`${PACK}/05_Examples.md`]:
    "# EX\n\n| EX-ID | BR-Ref |\n| --- | --- |\n| EX-0001-0001 | BR-0001-0001 |\n",
  [`${PACK}/06_Test-Cases.md`]: [
    "# Test cases",
    "",
    "| TC-ID | Level | AC-Refs | EX-Ref |",
    "| --- | --- | --- | --- |",
    "| TC-0001-0001 | L1 | AC-0001-0001 | EX-0001-0001 |",
    "| TC-0001-0002 | L1 | AC-0001-0002 | - |",
    "",
  ].join("\n"),
  [LEDGER]: ledger([ROW_1, ROW_2]),
  ".qfai/contracts/api/orders.yaml": "# QFAI-CONTRACT-ID: CON-API-0001\nopenapi: 3.0.0\n",
  ".qfai/assistant/constitution/constitution.md": "# Constitution\n",
  ".qfai/assistant/skills/qfai-atdd/SKILL.md": "# qfai-atdd\n",
  ".qfai/discussion/discussion-20260101000000000/01_Context.md": "# Context\n",
  ".qfai/discussion/discussion-20260102000000000/01_Context.md": "# Context\n",
  "src/a.ts": "export const a = 1;\n",
};

let root = "";

async function write(file: string, text: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-receipt-"));
  for (const [file, text] of Object.entries(FILES)) await write(file, text);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const WORK_ORDER: WorkflowWorkOrder = {
  workOrderId: "wo-1",
  stageInstanceId: "implement",
  attempt: 1,
  stageKind: "implement",
  executor: { skill: "qfai-atdd" },
  scope: { writeAreas: ["src/a.ts", "src/gone.ts"] },
  ledger: { specId: "spec-0001", rowIds: ["TDD-0001"], rowSetDigest: "" },
};

// The validity of a GREEN receipt over `src/a.ts` and `extra`, after `change`.
async function validityAfter(change: () => Promise<void>, extra: string[] = []) {
  const changedFiles = ["src/a.ts", ...extra].map((file) => ({ path: file, digest: "" }));
  const result = {
    resultId: "r-1",
    workOrderId: "wo-1",
    stageInstanceId: "implement",
    attempt: 1,
    expectedSequence: 1,
    outcome: "completed",
    testObservation: "pass",
    changedFiles,
  };
  const dependencies = await receiptDependenciesOf(root, WORK_ORDER, result, "spec-0001");
  await change();
  const stage = { stageInstanceId: "implement", stageKind: "implement", outcome: "completed" };
  const snapshot = {
    run: { id: "run-1", state: "running", sequence: 1 },
    acceptedStages: [{ ...stage, receiptRef: "green", dependencies }],
  };
  return (await receiptValidityOf(root, snapshot)).green;
}

const unchanged = async () => {};

describe("the obligation of a covered ledger row", () => {
  it("is unchanged by nothing", async () => {
    expect(await validityAfter(unchanged)).toBe("valid");
  });

  it.each([
    ["Layer", ROW_1.replace("| Unit |", "| Integration |")],
    ["Boundary", ROW_1.replace("| one |", "| two |")],
    ["TC-Refs", ROW_1.replace("| TC-0001-0001 |", "| TC-0001-0001, TC-0001-0002 |")],
    ["CON-API-Refs", ROW_1.replace("| CON-API-0001 |", "| - |")],
  ])("covers the row's %s", async (_column, row) => {
    expect(await validityAfter(() => write(LEDGER, ledger([row, ROW_2])))).toBe("stale");
  });

  it.each([
    ["Status", ROW_1.replace("| todo |", "| red |")],
    ["Evidence", ROW_1.replace("| - | CON-API", "| RED:fail | CON-API")],
    ["Test file", ROW_1.replace("src/a.test.ts", "src/a2.test.ts")],
  ])("leaves out the row's %s", async (_column, row) => {
    expect(await validityAfter(() => write(LEDGER, ledger([row, ROW_2])))).toBe("valid");
  });

  it("leaves out a row the work order does not cover", async () => {
    const other = ROW_2.replace("| Unit |", "| Integration |");
    expect(await validityAfter(() => write(LEDGER, ledger([ROW_1, other])))).toBe("valid");
  });

  it("covers the text of an AC the row reaches through its test case", async () => {
    const text = FILES[AC_FILE]?.replace("as CSV", "as TSV") ?? "";
    expect(await validityAfter(() => write(AC_FILE, text))).toBe("stale");
  });

  it("covers the text of an EX and the contract the row cites", async () => {
    const examples = `${PACK}/05_Examples.md`;
    const text = FILES[examples]?.replace("| BR-0001-0001 |\n", "| BR-0001-0002 |\n") ?? "";
    expect(await validityAfter(() => write(examples, text))).toBe("stale");
    const contract = ".qfai/contracts/api/orders.yaml";
    expect(await validityAfter(() => write(contract, `${FILES[contract]}info: {}\n`))).toBe(
      "stale",
    );
  });

  it("leaves out an AC no covered row cites", async () => {
    const text = FILES[AC_FILE]?.replace("a header row", "no header row") ?? "";
    expect(await validityAfter(() => write(AC_FILE, text))).toBe("valid");
  });
});

describe("the context a receipt depends on", () => {
  it.each([
    ["the config", () => write("qfai.config.yaml", "paths: {}\n")],
    ["a lockfile", () => write("pnpm-lock.yaml", "lockfileVersion: '9.0'\n")],
    ["a policy file", () => write(".qfai/assistant/constitution/constitution.md", "# Changed\n")],
    ["a new policy file", () => write(".qfai/assistant/constitution/extra.md", "# Extra\n")],
    ["the executor skill", () => write(".qfai/assistant/skills/qfai-atdd/SKILL.md", "# Changed\n")],
    [
      "the spec lifecycle",
      () =>
        write(
          `${PACK}/01_Spec.md`,
          "# Spec\n\n- Status: deprecated\n- Deprecated-at: 2026-01-01\n\n## Overview\n",
        ),
    ],
    [
      "the selected discussion pack",
      () =>
        write(
          ".qfai/state.json",
          JSON.stringify({ discussion: { currentId: "discussion-20260102000000000" } }),
        ),
    ],
  ])("covers %s", async (_name, change) => {
    expect(await validityAfter(change)).toBe("stale");
  });

  it("leaves out another skill", async () => {
    const change = () => write(".qfai/assistant/skills/qfai-sdd/SKILL.md", "# Other\n");
    expect(await validityAfter(change)).toBe("valid");
  });
});

describe("a changed file the stage deleted", () => {
  it("stays valid while it is still absent", async () => {
    expect(await validityAfter(unchanged, ["src/gone.ts"])).toBe("valid");
  });

  it("is stale once it exists again", async () => {
    const change = () => write("src/gone.ts", "export const gone = 1;\n");
    expect(await validityAfter(change, ["src/gone.ts"])).toBe("stale");
  });
});

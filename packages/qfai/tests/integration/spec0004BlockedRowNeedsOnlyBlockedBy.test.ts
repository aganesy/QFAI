/**
 * Integration: a `blocked` ledger row needs only a well-formed `Blocked-By`.
 *
 * Each case builds its own tree in a fresh temporary directory and runs validate in-process
 * from `src`. An absent finding proves nothing unless the ledger check read the row, so each
 * case also requires a finding that only reading that ledger can produce.
 */
// QFAI:SPEC-0004:TC-0004-0076

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { removeTempTree } from "../helpers/tempTree.js";

const SPEC_DIR = ".qfai/specs/spec-0001";
const LEDGER = `${SPEC_DIR}/tdd/test-list.md`;

type ReportedIssue = {
  readonly code: string;
  readonly severity: string;
  /** Every field that can name a path, with `\` normalised to `/`. */
  readonly texts: readonly string[];
};

function stringsOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

async function reportedIssues(root: string): Promise<ReportedIssue[]> {
  const text = await readFile(path.join(root, ".qfai", "report", "validate-tdd.json"), "utf-8");
  const report: unknown = JSON.parse(text);
  if (report === null || typeof report !== "object" || !("issues" in report)) {
    throw new Error("validate-tdd.json carries no issues array");
  }
  const { issues } = report;
  if (!Array.isArray(issues)) throw new Error("validate-tdd.json issues is not an array");
  return issues.map((raw: unknown) => {
    const record: Record<string, unknown> =
      raw !== null && typeof raw === "object" ? { ...raw } : {};
    const texts = [
      ...stringsOf(record.file),
      ...stringsOf(record.relatedFiles),
      ...stringsOf(record.refs),
      ...stringsOf(record.message),
      ...stringsOf(record.suggested_action),
    ].map((value) => value.replace(/\\/g, "/"));
    return {
      code: typeof record.code === "string" ? record.code : "",
      severity: typeof record.severity === "string" ? record.severity : "",
      texts,
    };
  });
}

/**
 * Row 1 is the row under test. Row 2 is the control: its `Blocked-By` names a blocker and no
 * departure status, so the check that must accept row 1 rejects it.
 */
const LEDGER_TEXT = [
  "# TDD Execution Ledger",
  "",
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Blocked-By |",
  "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ---------- |",
  "| TDD-0002 | - | unit | - | - | blocked | - | - | spec-0004:TDD-0001 — blocked at todo |",
  "| TDD-0003 | - | unit | - | - | blocked | - | - | CR-20260923-0001 |",
  "",
].join("\n");

/** A finding names row 1 by its TDD-ID or by the `row 1` label the ledger check writes. */
const NAMES_ROW_1 = /\bTDD-0002\b|\brow 1(?!\d)/;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0004-blocked-row-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("TC-0004-0076: a blocked row needs only its Blocked-By", () => {
  it("TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error", async () => {
    // A fresh directory, so the tree has no `.qfai/steering/`.
    await mkdir(path.join(root, SPEC_DIR, "tdd"), { recursive: true });
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["06_Test-Cases.md", "# TC\n"],
    ] as const) {
      await writeFile(path.join(root, SPEC_DIR, name), body, "utf-8");
    }
    await writeFile(path.join(root, LEDGER), LEDGER_TEXT, "utf-8");

    await runValidate({ root, strict: false, profile: "tdd" });
    const issues = await reportedIssues(root);

    const controlReads = issues.filter(
      (issue) =>
        issue.code === "TDDLIST_BLOCKED_MISSING_REF" &&
        issue.texts.includes(LEDGER) &&
        issue.texts.some((text) => text.includes("(row 2)")),
    );
    expect(controlReads, "the ledger check read this ledger's Blocked-By cells").toHaveLength(1);

    const rowErrors = issues
      .filter(
        (issue) => issue.severity === "error" && issue.texts.some((text) => NAMES_ROW_1.test(text)),
      )
      .map((issue) => issue.code);
    expect(rowErrors).toEqual([]);
  });
});

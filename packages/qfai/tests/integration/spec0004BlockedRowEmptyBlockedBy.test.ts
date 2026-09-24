/**
 * Integration: a `blocked` ledger row whose `Blocked-By` is empty is still rejected.
 *
 * The case builds its own tree in a fresh temporary directory and runs validate in-process from
 * `src`.
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

/** Row 1 is the `blocked` row whose `Blocked-By` cell is empty. */
const LEDGER_TEXT = [
  "# TDD Execution Ledger",
  "",
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Blocked-By |",
  "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ---------- |",
  "| TDD-0002 | - | unit | - | - | blocked | - | - |  |",
  "",
].join("\n");

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0004-empty-blocked-by-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("TC-0004-0076: a blocked row with an empty Blocked-By is rejected", () => {
  it("TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row", async () => {
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

    const naming = issues.filter(
      (issue) =>
        issue.code === "TDDLIST_BLOCKED_MISSING_REF" &&
        issue.severity === "error" &&
        issue.texts.includes(LEDGER) &&
        issue.texts.some((text) => text.includes("(row 1)")),
    );
    expect(naming.length).toBeGreaterThan(0);
  });
});

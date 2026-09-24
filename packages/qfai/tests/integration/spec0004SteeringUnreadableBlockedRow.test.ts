/**
 * Integration: ledger checks do not read `.qfai/steering/`, so a file there that cannot be read
 * raises nothing.
 *
 * The case builds its own tree in a fresh temporary directory and runs validate in-process from
 * `src`. An absent finding proves nothing unless the ledger check read the row, so the case also
 * requires a finding that only reading that ledger can produce.
 */
// QFAI:SPEC-0004:TC-0004-0076

import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { removeTempTree } from "../helpers/tempTree.js";

const execFileP = promisify(execFile);

/** `.qfai/steering` followed by `/` or the end of the string, so `.qfai/assistant/steering/` never matches. */
const STEERING_PATH = /\.qfai\/steering(?:\/|$)/;

const SPEC_DIR = ".qfai/specs/spec-0001";
const LEDGER = `${SPEC_DIR}/tdd/test-list.md`;
const UNREADABLE = ".qfai/steering/unreadable.md";

/** The `Everyone` group, by SID so the name's locale does not matter. */
const EVERYONE_SID = "*S-1-1-0";

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

/** Take read access away from `file`: an `Everyone` read deny on win32, mode `000` elsewhere. */
async function denyRead(file: string): Promise<void> {
  if (process.platform === "win32") {
    await execFileP("icacls", [file, "/deny", `${EVERYONE_SID}:(R)`]);
  } else {
    await chmod(file, 0o000);
  }
}

/** Undo `denyRead`, so the temporary tree can be removed. */
async function restoreRead(file: string): Promise<void> {
  if (process.platform === "win32") {
    await execFileP("icacls", [file, "/remove:d", EVERYONE_SID]);
  } else {
    await chmod(file, 0o644);
  }
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

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0004-steering-unreadable-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("TC-0004-0076: an unreadable file under .qfai/steering/ raises nothing", () => {
  it("TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: no finding names .qfai/steering/", async () => {
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
    const unreadable = path.join(root, UNREADABLE);
    await mkdir(path.dirname(unreadable), { recursive: true });
    await writeFile(unreadable, "# Work-log entry\n", "utf-8");

    await denyRead(unreadable);
    try {
      await expect(
        readFile(unreadable),
        `${UNREADABLE} is unreadable on ${process.platform}`,
      ).rejects.toThrow();

      await runValidate({ root, strict: false, profile: "tdd" });
      const issues = await reportedIssues(root);

      const controlReads = issues.filter(
        (issue) =>
          issue.code === "TDDLIST_BLOCKED_MISSING_REF" &&
          issue.texts.includes(LEDGER) &&
          issue.texts.some((text) => text.includes("(row 2)")),
      );
      expect(controlReads, "the ledger check read this ledger's Blocked-By cells").toHaveLength(1);

      const steeringTexts = issues.flatMap((issue) =>
        issue.texts.filter((text) => STEERING_PATH.test(text)),
      );
      expect(steeringTexts).toEqual([]);
    } finally {
      await restoreRead(unreadable);
    }
  });
});

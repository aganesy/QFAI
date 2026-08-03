/**
 * The ledger had no value meaning "this row cannot be started".
 *
 * Six statuses, none of them "blocked", and no blocker-reference field —
 * `DR-ID` is reserved for `exception`. So a row stopped on a defective upstream
 * contract or an unresolved Change Request had exactly one honest encoding,
 * `todo`, which is what Phase Red selects next and what the completion gate
 * treats as unfinished. The determination was never persisted, so it got
 * re-derived — and disagreed about — on every planning pass.
 *
 * `exception` could not absorb it: it is scoped to an anomaly, demands a
 * `DR-*` at `error`, and **satisfies spec completion** — so filing a blocked
 * row there would silently close the obligation.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const NINE_COL = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Blocked-By |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ---------- |`;

const EIGHT_COL = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |`;

async function run(ledger: string): Promise<Array<{ code: string; severity: string }>> {
  const root = path.join(
    os.tmpdir(),
    `qfai-blocked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["06_Test-Cases.md", "# TC\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    await writeFile(path.join(specDir, "tdd", "test-list.md"), ledger, "utf-8");
    const issues = await validateTddList(root, defaultConfig);
    return issues.map((i) => ({ code: i.code, severity: i.severity }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("`blocked` is a legal status", () => {
  it("is no longer reported as an invalid status", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | CR-20260729-0008 |\n`,
    );
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_INVALID_STATUS");
  });

  it("still rejects a status outside the vocabulary", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | stuck | - | - | CR-1 |\n`,
    );
    expect(issues.map((i) => i.code)).toContain("TDDLIST_INVALID_STATUS");
  });
});

describe("TDDLIST_BLOCKED_MISSING_REF — a blocked row must name its blocker", () => {
  // Otherwise `blocked` is the same unfalsifiable state `todo` was, one word
  // further along: "cannot start" with no record of what it waits on.
  it("errors when Blocked-By is empty", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - |  |\n`,
    );
    expect(issues.find((i) => i.code === "TDDLIST_BLOCKED_MISSING_REF")?.severity).toBe("error");
  });

  it("errors when the cell is a dash placeholder", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | - |\n`,
    );
    expect(issues.map((i) => i.code)).toContain("TDDLIST_BLOCKED_MISSING_REF");
  });

  it("errors, and says so, when the ledger has no Blocked-By column at all", async () => {
    // The column is optional; a ledger that uses `blocked` without it needs the
    // message to name the missing column, not just an empty cell.
    const issues = await run(
      `${EIGHT_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - |\n`,
    );
    expect(issues.map((i) => i.code)).toContain("TDDLIST_BLOCKED_MISSING_REF");
  });

  for (const blocker of [
    "CR-20260729-0008",
    ".qfai/contracts/db/CON-DB-0005.sql:2715",
    "spec-0006:TDD-0034",
  ]) {
    it(`accepts "${blocker}"`, async () => {
      const issues = await run(
        `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | - | - | ${blocker} |\n`,
      );
      expect(issues.map((i) => i.code)).not.toContain("TDDLIST_BLOCKED_MISSING_REF");
    });
  }

  it("says nothing about a row that is not blocked", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | todo | - | - |  |\n`,
    );
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_BLOCKED_MISSING_REF");
  });
});

describe("blocked does not become a completion loophole", () => {
  // The whole hazard of adding a status: if `blocked` satisfied completion the
  // way `exception` does, it would be a one-word way to close an unimplemented
  // obligation. It must stay unfinished work.
  it("does not require, or accept, a DR-ID in place of a blocker", async () => {
    const issues = await run(
      `${NINE_COL}\n| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | blocked | DR-0001-0001 | - |  |\n`,
    );
    expect(issues.map((i) => i.code)).toContain("TDDLIST_BLOCKED_MISSING_REF");
    // And it is not treated as a parked exception either.
    expect(issues.map((i) => i.code)).not.toContain("TDDLIST_EXCEPTION_PARKED");
  });
});

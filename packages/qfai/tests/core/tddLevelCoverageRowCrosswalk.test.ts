/**
 * The layer crosswalk's second direction.
 *
 * A test case that declares `L3`, `L4` or `L5` has its test written by
 * `/qfai-atdd`, which files it under the directory the level names. A ledger
 * row on a unit or component layer claims the same test case for this ledger,
 * so `TDDLIST_TC_NOT_COVERED` reads it as discharged while `QFAI-ATDD-112`
 * still demands the annotated test — both gates pass, each on the other's
 * account, and the row count a plan is sized from counts work nobody owes.
 *
 * The first direction was already reported: a `L1` / `L2` test case referenced
 * only from another layer. This one was not, and it is the one a ledger
 * accumulates silently.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { validateTddList } from "../../src/core/validators/tddList.js";
import type * as VersionModule from "../../src/core/version.js";

/** The version `resolveToolVersion` reports; empty defers to the real one. */
const toolVersion = vi.hoisted(() => ({ override: "" }));

vi.mock("../../src/core/version.js", async (importOriginal) => {
  const actual = await importOriginal<typeof VersionModule>();
  return {
    ...actual,
    resolveToolVersion: async (): Promise<string> =>
      toolVersion.override.length > 0 ? toolVersion.override : actual.resolveToolVersion(),
  };
});

afterEach(() => {
  toolVersion.override = "";
});

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |";

const testCases = (level: string): string =>
  [
    "# 06 Test Cases",
    "",
    "## Test Case Table",
    "",
    "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   |",
    "| ------- | ----- | ------- | ------- | ------ | ---------- |",
    `| TC-0001 | ${level.padEnd(5)} | AC-0001 | EX-0001 | step-1 | expected-1 |`,
    "",
  ].join("\n");

const row = (layer: string): string =>
  `| TDD-0001 | TC-0001 | ${layer.padEnd(5)} | tests/a.test.ts | sel | todo | - | - |`;

const ledger = (rows: string[]): string =>
  ["# TDD Test List", "", HEADERS, SEP, ...rows, ""].join("\n");

async function findingsFor(level: string, rows: string[]): Promise<Issue[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-crosswalk-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases(level), "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), ledger(rows), "utf-8");
    return await validateTddList(root, defaultConfig);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const crosswalk = async (level: string, rows: string[]): Promise<Issue[]> =>
  (await findingsFor(level, rows)).filter((entry) => entry.code === "QFAI-TCLEVEL-002");

describe("a TC the ledger does not own, cited from a coverage row", () => {
  it.each(["L3", "L4", "L5"])("is reported for a %s TC on a Unit row", async (level) => {
    const found = await crosswalk(level, [row("Unit")]);

    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("TC-0001");
    expect(found[0]?.message).toContain(level);
    expect(found[0]?.message).toContain("UNIT");
  });

  it("is reported for a Component row too", async () => {
    const found = await crosswalk("L3", [row("Component")]);

    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("COMPONENT");
  });

  it("names the test-cases file, which is where the Level is edited", async () => {
    // The Level cell is not in the ledger this validator otherwise reads, so a
    // finding that named only the ledger would point at a file that cannot be
    // edited to clear it.
    const found = await crosswalk("L3", [row("Unit")]);

    expect(found[0]?.relatedFiles?.join(" ")).toContain("06_Test-Cases.md");
  });
});

describe("what the rule leaves alone", () => {
  it.each(["Integration", "API", "E2E"])(
    "says nothing about a %s row, which is the seeded shape",
    async (layer) => {
      // Phase 2b seeds one such row per integration-level test case, and the
      // obligation columns hold the E2E and API rows. Reporting them would
      // report the ledger for being correct.
      expect(await crosswalk("L3", [row(layer)])).toEqual([]);
    },
  );

  it.each(["L1", "L2"])("says nothing about a %s TC on a Unit row", async (level) => {
    expect(await crosswalk(level, [row("Unit")])).toEqual([]);
  });

  it("says nothing about a TC with no row at all", async () => {
    // The ordinary state of an integration-level test case before its row is
    // seeded, and the permanent state of one whose test /qfai-atdd owns
    // outright.
    expect(await crosswalk("L3", [])).toEqual([]);
  });

  it("says nothing when the row's Layer is outside the vocabulary", async () => {
    // `TDDLIST_UNKNOWN_LAYER` already names that cell. A second finding on one
    // typo tells the reader to fix two things when there is one.
    const issues = await findingsFor("L3", [row("Bogus")]);

    expect(issues.filter((entry) => entry.code === "QFAI-TCLEVEL-002")).toEqual([]);
    expect(issues.map((entry) => entry.code)).toContain("TDDLIST_UNKNOWN_LAYER");
  });

  it("says nothing about a TC that declares no Level, which is the other rule's", async () => {
    const issues = await findingsFor("", [row("Unit")]);

    expect(issues.filter((entry) => entry.code === "QFAI-TCLEVEL-002")).toEqual([]);
    expect(issues.map((entry) => entry.code)).toContain("QFAI-TCLEVEL-001");
  });
});

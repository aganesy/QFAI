import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { classifyCoverageLevel } from "../../src/core/tddHelpers.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

describe("classifyCoverageLevel", () => {
  it("classifies positively rather than by exclusion", () => {
    expect(classifyCoverageLevel("L1")).toBe("coverage-target");
    expect(classifyCoverageLevel("unit")).toBe("coverage-target");
    expect(classifyCoverageLevel("L3")).toBe("non-coverage");
    expect(classifyCoverageLevel("integration")).toBe("non-coverage");
  });

  it("names the unrecognized case instead of silently including it", () => {
    expect(classifyCoverageLevel("smoke")).toBe("unrecognized");
  });

  it("treats an empty cell as a coverage target", () => {
    expect(classifyCoverageLevel("")).toBe("coverage-target");
  });
});

async function withSpec(
  testCases: string,
  assertion: (issues: Awaited<ReturnType<typeof validateTddList>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-level-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      [
        "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |",
        "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |",
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo   | -     | -        |",
      ].join("\n"),
      "utf-8",
    );
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const tcTable = (rows: string[]): string =>
  [
    "# 06 Test Cases",
    "",
    "## Test Case Table (required)",
    "",
    "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   | Notes  |",
    "| ------- | ----- | ------- | ------- | ------ | ---------- | ------ |",
    ...rows,
    "",
  ].join("\n");

describe("TDDLIST_TC_NOT_COVERED respects the shipped Level vocabulary", () => {
  it("no longer demands a ledger row for an L3 test case", async () => {
    await withSpec(
      tcTable([
        "| TC-0001 | L2    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |",
        "| TC-0002 | L3    | AC-0001 | EX-0001 | step-2 | expected-2 | note-2 |",
      ]),
      (issues) => {
        const missing = issues.filter((entry) => entry.code === "TDDLIST_TC_NOT_COVERED");
        expect(missing.flatMap((entry) => entry.message)).not.toContain("TC-0002");
        expect(missing).toHaveLength(0);
      },
    );
  });

  it("still demands one for an L2 test case", async () => {
    await withSpec(
      tcTable([
        "| TC-0001 | L2    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |",
        "| TC-0009 | L2    | AC-0001 | EX-0001 | step-9 | expected-9 | note-9 |",
      ]),
      (issues) => {
        const missing = issues.find((entry) => entry.code === "TDDLIST_TC_NOT_COVERED");
        expect(missing?.message).toContain("TC-0009");
      },
    );
  });

  it("warns on an unrecognized Level rather than silently doubling the ledger", async () => {
    await withSpec(
      tcTable(["| TC-0001 | smoke | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |"]),
      (issues) => {
        const finding = issues.find((entry) => entry.code === "TDDLIST_UNKNOWN_LEVEL");
        expect(finding?.severity).toBe("warning");
        expect(finding?.refs).toEqual(["smoke"]);
        expect(finding?.message).toContain("Accepted:");
      },
    );
  });

  it("stays quiet on a template-conformant Level set", async () => {
    await withSpec(
      tcTable(["| TC-0001 | L2    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |"]),
      (issues) => {
        expect(issues.some((entry) => entry.code === "TDDLIST_UNKNOWN_LEVEL")).toBe(false);
      },
    );
  });
});

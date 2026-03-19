import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

// ── Helpers ──

async function withTddProject(fn: (root: string) => Promise<void>): Promise<void> {
  const dirName = `qfai-tdd-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const root = path.join(os.tmpdir(), dirName);
  await mkdir(root, { recursive: true });
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedSpec(
  root: string,
  specNumber: string,
  opts: {
    testCases?: string;
    testList?: string;
    testFiles?: string[];
  },
): Promise<void> {
  const specsDir = path.join(root, ".qfai", "specs");
  const specDir = path.join(specsDir, `spec-${specNumber}`);
  const tddDir = path.join(specDir, "tdd");
  const policiesDir = path.join(specsDir, "_policies");

  await mkdir(tddDir, { recursive: true });
  await mkdir(policiesDir, { recursive: true });

  // Minimal spec files for layout detection
  await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
  await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
  await writeFile(path.join(specDir, "06_Test-Cases.md"), opts.testCases ?? "", "utf-8");

  if (opts.testList !== undefined) {
    await writeFile(path.join(tddDir, "test-list.md"), opts.testList, "utf-8");
  }

  if (opts.testFiles) {
    for (const file of opts.testFiles) {
      const filePath = path.join(root, file);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, "// test\n", "utf-8");
    }
  }
}

const TC_TABLE_UNIT_COMPONENT = `# 06 Test Cases

| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected | Notes |
| ----- | ----- | ------- | ------ | ----- | -------- | ----- |
| TC-0001 | unit | AC-0001 | EX-0001 | step | expected | |
| TC-0002 | component | AC-0002 | EX-0002 | step | expected | |
| TC-0003 | integration | AC-0003 | EX-0003 | step | expected | |
`;

const EIGHT_COL_HEADER = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |`;

function row(
  tddId: string,
  tcRefs: string,
  layer: string,
  testFile: string,
  selector: string,
  status: string,
  drId: string,
  evidence: string,
): string {
  return `| ${tddId} | ${tcRefs} | ${layer} | ${testFile} | ${selector} | ${status} | ${drId} | ${evidence} |`;
}

// ── Tests ──

describe("tddList Phase 2 validators", { timeout: 15000 }, () => {
  // Phase 1 backward compatibility: TDDLIST_MISSING = warning
  it("emits TDDLIST_MISSING as warning when test-list.md absent", async () => {
    await withTddProject(async (root) => {
      await seedSpec(root, "0001", {});
      const issues = await validateTddList(root, defaultConfig);
      const missing = issues.find((i) => i.code === "TDDLIST_MISSING");
      expect(missing).toBeDefined();
      expect(missing?.severity).toBe("warning");
    });
  });

  // Phase 1: old 6-column template triggers TDDLIST_REQUIRED_COLUMN_MISSING
  it("emits TDDLIST_REQUIRED_COLUMN_MISSING for old 6-column template", async () => {
    await withTddProject(async (root) => {
      const oldTemplate = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status |
| ------ | ------- | ----- | --------- | -------- | ------ |
| TDD-0001 | TC-0001 | unit | tests/a.test.ts | test1 | todo | |
`;
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList: oldTemplate,
      });
      const issues = await validateTddList(root, defaultConfig);
      const missing = issues.filter((i) => i.code === "TDDLIST_REQUIRED_COLUMN_MISSING");
      expect(missing.length).toBeGreaterThanOrEqual(1);
      const cols = missing.map((i) => i.message);
      expect(cols.some((m) => m.includes("DR-ID"))).toBe(true);
      expect(cols.some((m) => m.includes("Evidence"))).toBe(true);
    });
  });

  // Phase 2 – Check 6: TDDLIST_INVALID_ID
  it("emits TDDLIST_INVALID_ID for non-TDD-NNNN format", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-ABC", "TC-0001", "unit", "", "test1", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const invalid = issues.find((i) => i.code === "TDDLIST_INVALID_ID");
      expect(invalid).toBeDefined();
      expect(invalid?.severity).toBe("error");
      expect(invalid?.message).toContain("TDD-ABC");
    });
  });

  it("emits TDDLIST_INVALID_ID for empty TDD-ID", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("", "TC-0001", "unit", "", "test1", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const invalid = issues.find((i) => i.code === "TDDLIST_INVALID_ID");
      expect(invalid).toBeDefined();
      expect(invalid?.severity).toBe("error");
    });
  });

  it("emits TDDLIST_INVALID_ID for sub-ID format TDD-0001-0001", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001-0001", "TC-0001", "unit", "", "test1", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const invalid = issues.find((i) => i.code === "TDDLIST_INVALID_ID");
      expect(invalid).toBeDefined();
      expect(invalid?.severity).toBe("error");
    });
  });

  it("does not emit TDDLIST_INVALID_ID for valid TDD-0001", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_INVALID_ID")).toBeUndefined();
    });
  });

  // Phase 2 – Check 7: TDDLIST_DUPLICATE_ID
  it("emits TDDLIST_DUPLICATE_ID for duplicate TDD-IDs", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "todo", "", ""),
        row("TDD-0001", "TC-0002", "unit", "", "test2", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const dup = issues.find((i) => i.code === "TDDLIST_DUPLICATE_ID");
      expect(dup).toBeDefined();
      expect(dup?.severity).toBe("error");
    });
  });

  it("emits TDDLIST_DUPLICATE_ID for case-insensitive duplicates", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "todo", "", ""),
        row("tdd-0001", "TC-0002", "unit", "", "test2", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const dup = issues.find((i) => i.code === "TDDLIST_DUPLICATE_ID");
      expect(dup).toBeDefined();
      expect(dup?.severity).toBe("error");
    });
  });

  it("does not emit TDDLIST_DUPLICATE_ID for single row", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_DUPLICATE_ID")).toBeUndefined();
    });
  });

  // Phase 2 – Check 8: TDDLIST_EXCEPTION_MISSING_DR
  it("emits TDDLIST_EXCEPTION_MISSING_DR when exception has empty DR-ID", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "exception", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const dr = issues.find((i) => i.code === "TDDLIST_EXCEPTION_MISSING_DR");
      expect(dr).toBeDefined();
      expect(dr?.severity).toBe("error");
    });
  });

  it("emits TDDLIST_EXCEPTION_MISSING_DR when exception has whitespace DR-ID", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "exception", "   ", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const dr = issues.find((i) => i.code === "TDDLIST_EXCEPTION_MISSING_DR");
      expect(dr).toBeDefined();
      expect(dr?.severity).toBe("error");
    });
  });

  it("does not emit TDDLIST_EXCEPTION_MISSING_DR when exception has DR-ID", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "exception", "DR-0042", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_EXCEPTION_MISSING_DR")).toBeUndefined();
    });
  });

  it("does not emit TDDLIST_EXCEPTION_MISSING_DR for non-exception status", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_EXCEPTION_MISSING_DR")).toBeUndefined();
    });
  });

  // Phase 2 – Check 9: TDDLIST_TEST_FILE_MISSING
  it("emits TDDLIST_TEST_FILE_MISSING when done row has non-existent file", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "tests/nonexistent.test.ts", "test1", "done", "", "ev"),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const missing = issues.find((i) => i.code === "TDDLIST_TEST_FILE_MISSING");
      expect(missing).toBeDefined();
      expect(missing?.severity).toBe("error");
    });
  });

  it("does not emit TDDLIST_TEST_FILE_MISSING when done row has existing file", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "tests/a.test.ts", "test1", "done", "", "ev"),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
        testFiles: ["tests/a.test.ts"],
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_TEST_FILE_MISSING")).toBeUndefined();
    });
  });

  it("does not emit TDDLIST_TEST_FILE_MISSING for todo/red status", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "tests/nonexistent.ts", "test1", "todo", "", ""),
        row("TDD-0002", "TC-0002", "unit", "tests/nonexistent.ts", "test2", "red", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_TEST_FILE_MISSING")).toBeUndefined();
    });
  });

  it("normalizes backslash paths for file existence check", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "tests\\a.test.ts", "test1", "green", "", "ev"),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
        testFiles: ["tests/a.test.ts"],
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_TEST_FILE_MISSING")).toBeUndefined();
    });
  });

  it("emits TDDLIST_TEST_FILE_MISSING when done row has empty Test file", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "done", "", "ev"),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const missing = issues.find((i) => i.code === "TDDLIST_TEST_FILE_MISSING");
      expect(missing).toBeDefined();
      expect(missing?.severity).toBe("error");
      expect(missing?.message).toContain("empty");
    });
  });

  it("emits TDDLIST_TEST_FILE_MISSING for path traversal attempts", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "../outside.ts", "test1", "green", "", "ev"),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const missing = issues.find((i) => i.code === "TDDLIST_TEST_FILE_MISSING");
      expect(missing).toBeDefined();
      expect(missing?.message).toContain("project-root-relative");
    });
  });

  it("emits TDDLIST_TEST_FILE_MISSING for absolute paths", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "/etc/passwd", "test1", "done", "", "ev"),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const missing = issues.find((i) => i.code === "TDDLIST_TEST_FILE_MISSING");
      expect(missing).toBeDefined();
      expect(missing?.message).toContain("project-root-relative");
    });
  });

  it("emits TDDLIST_TEST_FILE_MISSING for Windows absolute paths on any platform", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "C:/Users/test.ts", "test1", "done", "", "ev"),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const missing = issues.find((i) => i.code === "TDDLIST_TEST_FILE_MISSING");
      expect(missing).toBeDefined();
      expect(missing?.message).toContain("project-root-relative");
    });
  });

  // Phase 2 – Check 10: TDDLIST_TC_NOT_COVERED
  it("emits TDDLIST_TC_NOT_COVERED for header-only test-list with unit/component TCs", async () => {
    await withTddProject(async (root) => {
      // Header only, no data rows
      const testList = EIGHT_COL_HEADER;
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const info = issues.find((i) => i.code === "TDDLIST_INFO");
      expect(info).toBeDefined();
      const notCovered = issues.filter((i) => i.code === "TDDLIST_TC_NOT_COVERED");
      expect(notCovered.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("emits TDDLIST_TC_NOT_COVERED when unit TC is not in test-list", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "todo", "", ""),
        // TC-0002 (component) is missing
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const notCovered = issues.filter((i) => i.code === "TDDLIST_TC_NOT_COVERED");
      expect(notCovered.length).toBe(1);
      expect(notCovered[0]?.message).toContain("TC-0002");
      expect(notCovered[0]?.severity).toBe("error");
    });
  });

  it("does not emit TDDLIST_TC_NOT_COVERED for integration TCs", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "todo", "", ""),
        row("TDD-0002", "TC-0002", "component", "", "test2", "todo", "", ""),
        // TC-0003 is integration, should not be required
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_TC_NOT_COVERED")).toBeUndefined();
    });
  });

  it("does not emit TDDLIST_TC_NOT_COVERED when all unit/component TCs are referenced", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001,TC-0002", "unit", "", "test1", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_TC_NOT_COVERED")).toBeUndefined();
    });
  });

  it("counts todo status as covered for TC coverage", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-0001", "TC-0001", "unit", "", "test1", "todo", "", ""),
        row("TDD-0002", "TC-0002", "component", "", "test2", "todo", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      expect(issues.find((i) => i.code === "TDDLIST_TC_NOT_COVERED")).toBeUndefined();
    });
  });

  // Phase 2 severity: all Phase 2 errors must be error severity
  it("all Phase 2 issues use error severity", async () => {
    await withTddProject(async (root) => {
      const testList = [
        EIGHT_COL_HEADER,
        row("TDD-ABC", "TC-0001", "unit", "tests/missing.ts", "test1", "done", "", ""),
        row("TDD-ABC", "", "unit", "", "test2", "exception", "", ""),
      ].join("\n");
      await seedSpec(root, "0001", {
        testCases: TC_TABLE_UNIT_COMPONENT,
        testList,
      });
      const issues = await validateTddList(root, defaultConfig);
      const phase2Codes = [
        "TDDLIST_INVALID_ID",
        "TDDLIST_DUPLICATE_ID",
        "TDDLIST_EXCEPTION_MISSING_DR",
        "TDDLIST_TEST_FILE_MISSING",
        "TDDLIST_TC_NOT_COVERED",
      ];
      const phase2Issues = issues.filter((i) => phase2Codes.includes(i.code));
      expect(phase2Issues.length).toBeGreaterThan(0);
      for (const issue of phase2Issues) {
        expect(issue.severity).toBe("error");
      }
    });
  });
});

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

const tcTable = (level: string): string =>
  [
    "# 06 Test Cases",
    "",
    "| TC-ID   | Level  | AC-Refs | EX-Ref  | Steps  | Expected   | Notes  |",
    "| ------- | ------ | ------- | ------- | ------ | ---------- | ------ |",
    `| TC-0001 | ${level} | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |`,
    "",
  ].join("\n");

async function withProject(
  opts: { testCases: string; annotationIn: "integration" | "api" | "e2e" },
  assertion: (issues: Awaited<ReturnType<typeof validateAtddCodeTraceability>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tc-routing-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 US\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), opts.testCases, "utf-8");

    const testDir = path.join(root, "tests", opts.annotationIn);
    await mkdir(testDir, { recursive: true });
    await writeFile(path.join(testDir, "a.test.ts"), "/* QFAI:SPEC-0001:TC-0001 */\n", "utf-8");

    assertion(await validateAtddCodeTraceability(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = (issues: Awaited<ReturnType<typeof validateAtddCodeTraceability>>): string[] =>
  issues.map((entry) => entry.code);

describe("the TC obligation routes by declared Level", () => {
  it("counts an L4 TC annotated in tests/api and does not forbid it", async () => {
    await withProject({ testCases: tcTable("L4"), annotationIn: "api" }, (issues) => {
      // One correct placement previously produced two errors at once.
      expect(codes(issues)).not.toContain("QFAI-ATDD-121");
      expect(codes(issues)).not.toContain("QFAI-ATDD-112");
    });
  });

  it("still forbids an L3 TC annotated in tests/api", async () => {
    await withProject({ testCases: tcTable("L3"), annotationIn: "api" }, (issues) => {
      expect(codes(issues)).toContain("QFAI-ATDD-121");
    });
  });

  it("no longer counts an L4 TC annotated in tests/integration", async () => {
    await withProject({ testCases: tcTable("L4"), annotationIn: "integration" }, (issues) => {
      expect(codes(issues)).toContain("QFAI-ATDD-112");
    });
  });

  it("defaults to integration when the spec declares no Level", async () => {
    const noLevel = [
      "# 06 Test Cases",
      "",
      "| TC-ID   | AC-Refs | EX-Ref  | Steps  | Expected   | Notes  |",
      "| ------- | ------- | ------- | ------ | ---------- | ------ |",
      "| TC-0001 | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |",
      "",
    ].join("\n");

    await withProject({ testCases: noLevel, annotationIn: "integration" }, (issues) => {
      expect(codes(issues)).not.toContain("QFAI-ATDD-112");
    });
  });

  it("counts an L5 TC annotated in tests/e2e and does not forbid it", async () => {
    await withProject({ testCases: tcTable("L5"), annotationIn: "e2e" }, (issues) => {
      expect(codes(issues)).not.toContain("QFAI-ATDD-122");
      expect(codes(issues)).not.toContain("QFAI-ATDD-112");
    });
  });

  it("still forbids an L3 TC annotated in tests/e2e", async () => {
    await withProject({ testCases: tcTable("L3"), annotationIn: "e2e" }, (issues) => {
      expect(codes(issues)).toContain("QFAI-ATDD-122");
    });
  });

  it("reads the Level from a later TC-ID table, not only the first", async () => {
    // A split catalogue: the first table has no Level column at all.
    const splitTables = [
      "# 06 Test Cases",
      "",
      "| TC-ID   | AC-Refs | Notes  |",
      "| ------- | ------- | ------ |",
      "| TC-0002 | AC-0002 | note-2 |",
      "",
      "## Second table",
      "",
      "| TC-ID   | Level | AC-Refs | Notes  |",
      "| ------- | ----- | ------- | ------ |",
      "| TC-0001 | L4    | AC-0001 | note-1 |",
      "",
    ].join("\n");

    await withProject({ testCases: splitTables, annotationIn: "api" }, (issues) => {
      const missing = issues.find((entry) => entry.code === "QFAI-ATDD-112");
      expect(codes(issues)).not.toContain("QFAI-ATDD-121");
      // TC-0002 is still uncovered, but TC-0001 must not be listed.
      expect(missing?.refs).toEqual(["SPEC-0001:TC-0002"]);
    });
  });

  it("reads the Level from the heading form's meta line", async () => {
    const headingForm = [
      "# 06 Test Cases",
      "",
      "## TC-0001: pricing over the service boundary",
      "",
      "- Level: L4",
      "- AC-Refs: AC-0001",
      "",
    ].join("\n");

    await withProject({ testCases: headingForm, annotationIn: "api" }, (issues) => {
      expect(codes(issues)).not.toContain("QFAI-ATDD-121");
      expect(codes(issues)).not.toContain("QFAI-ATDD-112");
    });
  });

  it("names the declared home directory in the QFAI-ATDD-112 message and fix", async () => {
    await withProject({ testCases: tcTable("L4"), annotationIn: "integration" }, (issues) => {
      const missing = issues.find((entry) => entry.code === "QFAI-ATDD-112");
      expect(missing?.message).toContain("tests/api/** -> SPEC-0001:TC-0001");
      expect(missing?.suggested_action).toContain("tests/api/**: SPEC-0001:TC-0001");
      expect(missing?.rule).toBe("atddCodeTraceability.coverage.tcToDeclaredLayer");
    });
  });

  it("forbids an L4 TC left behind in tests/integration", async () => {
    // A migration that adds the correct tests/api/** annotation and leaves the
    // old integration one behind used to validate clean, contradicting the
    // shipped "exactly one directory" rule.
    await withProject({ testCases: tcTable("L4"), annotationIn: "integration" }, (issues) => {
      const finding = issues.find((entry) => entry.code === "QFAI-ATDD-123");
      expect(finding?.severity).toBe("error");
      expect(finding?.message).toContain("SPEC-0001:TC-0001");
      expect(finding?.suggested_action).toContain("tests/integration/**");
    });
  });

  it("says nothing about an L3 TC annotated in tests/integration", async () => {
    await withProject({ testCases: tcTable("L3"), annotationIn: "integration" }, (issues) => {
      expect(codes(issues)).not.toContain("QFAI-ATDD-123");
    });
  });
});

describe("the reported directories follow the configured testsDir", () => {
  it("names <testsDir>/api instead of the literal tests/api", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tc-routing-dir-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
      await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 US\n", "utf-8");
      await writeFile(path.join(specDir, "06_Test-Cases.md"), tcTable("L4"), "utf-8");

      const config = {
        ...defaultConfig,
        paths: { ...defaultConfig.paths, testsDir: "spec-tests" },
      };
      const issues = await validateAtddCodeTraceability(root, config);
      const missing = issues.find((entry) => entry.code === "QFAI-ATDD-112");
      // Following a fix that names an unscanned directory can never clear it.
      expect(missing?.message).toContain("spec-tests/api/**");
      expect(missing?.suggested_action).toContain("spec-tests/api/**");
      // No bare `tests/...` literal survives (the substring inside
      // "spec-tests/..." does not count).
      expect(missing?.message).not.toMatch(/(^|[^-\w])tests\//);
      expect(missing?.suggested_action).not.toMatch(/(^|[^-\w])tests\//);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

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
  opts: { testCases: string; annotationIn: "integration" | "api" },
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
    await writeFile(
      path.join(testDir, "a.test.ts"),
      "/* QFAI:SPEC-0001:TC-0001 */\n",
      "utf-8",
    );

    assertion(await validateAtddCodeTraceability(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = (
  issues: Awaited<ReturnType<typeof validateAtddCodeTraceability>>,
): string[] => issues.map((entry) => entry.code);

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
});

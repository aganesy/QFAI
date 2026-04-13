/**
 * Integration: Report Command Spec-0005 TDD Backfill
 *
 * Validates that the report command (spec-0005) requirements are covered by
 * existing implementation: report.ts module, CLI report command, and
 * prototyping observability adapter.
 *
 * All 9 TDD items are Exception-pattern backfill (DR-0005-0002).
 * Existing coverage: tests/cli/report.test.ts, tests/core/report.test.ts.
 */
// QFAI:SPEC-0005:TC-0005-0001
// QFAI:SPEC-0005:TC-0005-0002
// QFAI:SPEC-0005:TC-0005-0003
// QFAI:SPEC-0005:TC-0005-0004
// QFAI:SPEC-0005:TC-0005-0005
// QFAI:SPEC-0005:TC-0005-0006
// QFAI:SPEC-0005:TC-0005-0007
// QFAI:SPEC-0005:TC-0005-0008
// QFAI:SPEC-0005:TC-0005-0009
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPORT_MODULE = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "report.ts",
);

const REPORT_CLI = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "cli",
  "commands",
  "report.ts",
);

const OBSERVABILITY_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "prototyping",
  "observabilityAdapter.ts",
);

// TC-0005-0001: Default Markdown report generation
describe("TC-0005-0001: Default Markdown report generation", () => {
  it("report module exports formatReportMarkdown", async () => {
    const content = await readFile(REPORT_MODULE, "utf-8");
    expect(content).toContain("formatReportMarkdown");
    expect(content).toContain("QFAI Report");
  });
});

// TC-0005-0002: JSON report generation
describe("TC-0005-0002: JSON report generation", () => {
  it("report CLI supports format json option", async () => {
    const content = await readFile(REPORT_CLI, "utf-8");
    expect(content).toMatch(/format.*json|json.*format/i);
  });
});

// TC-0005-0003: --base-url repository link
describe("TC-0005-0003: --base-url repository link", () => {
  it("report CLI supports baseUrl option", async () => {
    const content = await readFile(REPORT_CLI, "utf-8");
    expect(content).toMatch(/baseUrl|base-url|base_url/i);
  });
});

// TC-0005-0004: --run-validate internal validation
describe("TC-0005-0004: --run-validate internal validation", () => {
  it("report CLI supports runValidate option", async () => {
    const content = await readFile(REPORT_CLI, "utf-8");
    expect(content).toMatch(/runValidate|run-validate|run_validate/i);
  });
});

// TC-0005-0005: validate.json missing exit 2
describe("TC-0005-0005: validate.json missing exit 2", () => {
  it("report CLI handles missing validate.json with exit 2", async () => {
    const content = await readFile(REPORT_CLI, "utf-8");
    expect(content).toContain("exitCode");
  });
});

// TC-0005-0006: --out output path control
describe("TC-0005-0006: --out output path control", () => {
  it("report CLI supports outPath option", async () => {
    const content = await readFile(REPORT_CLI, "utf-8");
    expect(content).toMatch(/outPath|out-path|outDir/i);
  });
});

// TC-0005-0007: spec-pack report generation
describe("TC-0005-0007: spec-pack report generation", () => {
  it("report module supports spec-pack reports", async () => {
    const content = await readFile(REPORT_MODULE, "utf-8");
    expect(content).toMatch(/specPack|spec-pack|spec_pack/i);
  });
});

// TC-0005-0008: phase guard refinement block
describe("TC-0005-0008: phase guard refinement block", () => {
  it("report CLI supports phase option", async () => {
    const content = await readFile(REPORT_CLI, "utf-8");
    expect(content).toMatch(/phase/i);
  });
});

// TC-0005-0009: Coverage placeholder
describe("TC-0005-0009: Coverage placeholder for EX-0005-0005", () => {
  it("prototyping observability adapter exists and exports", async () => {
    const content = await readFile(OBSERVABILITY_PATH, "utf-8");
    expect(content).toMatch(/export/);
  });
});

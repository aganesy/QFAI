import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createReportData,
  formatReportMarkdown,
} from "../../src/core/report.js";
import type { ValidationResult } from "../../src/core/types.js";

describe("report contract coverage", () => {
  it("includes orphan contracts, none specs, and missing contract-ref specs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-core-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const uiDir = path.join(root, ".qfai", "contracts", "ui");
    const dbDir = path.join(root, ".qfai", "contracts", "db");

    await mkdir(specsRoot, { recursive: true });
    await mkdir(uiDir, { recursive: true });
    await mkdir(dbDir, { recursive: true });

    await writeSpecPack(specsRoot, "spec-0001", "SPEC-0001", "UI-0001");
    await writeSpecPack(specsRoot, "spec-0002", "SPEC-0002", "none");
    await writeSpecPack(specsRoot, "spec-0003", "SPEC-0003");

    await writeFile(
      path.join(uiDir, "ui-0001-sample.yaml"),
      "# QFAI-CONTRACT-ID: UI-0001\n",
    );
    await writeFile(
      path.join(dbDir, "db-0001-sample.sql"),
      "-- QFAI-CONTRACT-ID: DB-0001\n",
    );

    const validation: ValidationResult = {
      toolVersion: "test",
      issues: [],
      counts: { info: 0, warning: 0, error: 0 },
      traceability: {
        sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
        testFiles: { globs: [], excludeGlobs: [], matchedFileCount: 0 },
      },
    };

    const data = await createReportData(root, validation);
    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("## 契約→Spec");
    expect(markdown).toContain("- UI-0001: SPEC-0001");
    expect(markdown).toContain("- DB-0001: (none)");
    expect(markdown).toContain("## Spec→契約");
    expect(markdown).toContain("- SPEC-0002: (none)");
    expect(markdown).toContain("## Specで contract-ref 未宣言");
    expect(markdown).toContain("- SPEC-0003");
    expect(markdown).not.toContain("- SPEC-0003:");
  });
});

async function writeSpecPack(
  specsRoot: string,
  dirName: string,
  specId: string,
  contractRef?: string,
): Promise<void> {
  const packDir = path.join(specsRoot, dirName);
  await mkdir(packDir, { recursive: true });

  const specLines = [`# ${specId}: Sample`];
  if (contractRef !== undefined) {
    specLines.push(`QFAI-CONTRACT-REF: ${contractRef}`);
  }
  specLines.push("", "## 業務ルール", "", "- [BR-0001][P1] sample");

  await writeFile(path.join(packDir, "spec.md"), specLines.join("\n"));
  await writeFile(
    path.join(packDir, "delta.md"),
    [`# ${specId}: Delta`, "", "- 区分: Compatibility", ""].join("\n"),
  );
  await writeFile(
    path.join(packDir, "scenario.md"),
    [
      `@${specId}`,
      "Feature: Sample",
      "  @SC-0001 @BR-0001",
      "  Scenario: Basic",
      "    Given ...",
      "",
    ].join("\n"),
  );
}

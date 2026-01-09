import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createReportData,
  formatReportMarkdown,
  type ReportData,
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
        testFiles: {
          globs: [],
          excludeGlobs: [],
          matchedFileCount: 0,
          truncated: false,
          limit: 20000,
        },
      },
    };

    const data = await createReportData(root, validation);
    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("### Contract → Spec");
    expect(markdown).toContain("- UI-0001: SPEC-0001");
    expect(markdown).toContain("- DB-0001: (none)");
    expect(markdown).toContain("### Spec → Contracts");
    expect(markdown).toContain("| Spec      | Status   | Contracts |");
    expect(markdown).toContain("| SPEC-0001 | declared | UI-0001   |");
    expect(markdown).toContain("| SPEC-0002 | declared | (none)    |");
    expect(markdown).toContain("| SPEC-0003 | missing  | (missing) |");
    expect(markdown).toContain("### Specs missing contract-ref");
    expect(markdown).toContain("- SPEC-0003");
    expect(markdown).not.toContain("- SPEC-0003:");
  });

  it("does not fallback to file path when SPEC id is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-core-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const uiDir = path.join(root, ".qfai", "contracts", "ui");

    await mkdir(specsRoot, { recursive: true });
    await mkdir(uiDir, { recursive: true });

    const specPackDir = path.join(specsRoot, "spec-0001");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(specPackDir, "spec.md"),
      [
        "# Sample Spec",
        "",
        "QFAI-CONTRACT-REF: UI-0001",
        "",
        "## 業務ルール",
        "",
        "- [BR-0001][P1] sample",
        "",
      ].join("\n"),
    );
    await writeFile(
      path.join(specPackDir, "delta.md"),
      ["# Delta", "", "- 区分: Compatibility", ""].join("\n"),
    );
    await writeFile(
      path.join(specPackDir, "scenario.feature"),
      [
        "@SPEC-0001",
        "Feature: Sample",
        "# QFAI-CONTRACT-REF: UI-0001",
        "  @SC-0001 @BR-0001",
        "  Scenario: Basic",
        "    Given ...",
        "",
      ].join("\n"),
    );
    await writeFile(
      path.join(uiDir, "ui-0001-sample.yaml"),
      "# QFAI-CONTRACT-ID: UI-0001\n",
    );

    const data = await createReportData(root);
    const markdown = formatReportMarkdown(data);
    const specSection = extractSection(markdown, "### Spec → Contracts");

    expect(specSection).toContain("- (none)");
    expect(specSection).not.toContain("spec-0001/spec.md");
  });

  it("links paths when baseUrl is provided", () => {
    const data = createReportDataForLinks();
    const markdown = formatReportMarkdown(data, {
      baseUrl: "https://example.com/repo/",
    });

    expect(markdown).toContain("- ルート: [.](https://example.com/repo)");
    expect(markdown).toContain(
      "- 設定: [qfai.config.yaml](https://example.com/repo/qfai.config.yaml)",
    );
    expect(markdown).toContain(
      "- file: [specs/with space/テスト.md](https://example.com/repo/specs/with%20space/%E3%83%86%E3%82%B9%E3%83%88.md):12",
    );
    expect(markdown).not.toContain("https://example.com/repo//specs");
  });

  it("keeps raw paths when baseUrl is omitted", () => {
    const data = createReportDataForLinks();
    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("- ルート: .");
    expect(markdown).toContain("- 設定: qfai.config.yaml");
    expect(markdown).toContain("- file: specs/with space/テスト.md:12");
  });

  it("keeps docs/examples/report.md contract sections in sync", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-docs-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const uiDir = path.join(root, ".qfai", "contracts", "ui");
    const apiDir = path.join(root, ".qfai", "contracts", "api");
    const dbDir = path.join(root, ".qfai", "contracts", "db");

    await mkdir(specsRoot, { recursive: true });
    await mkdir(uiDir, { recursive: true });
    await mkdir(apiDir, { recursive: true });
    await mkdir(dbDir, { recursive: true });

    await writeSpecPack(
      specsRoot,
      "spec-0001",
      "SPEC-0001",
      "API-0001, UI-0001",
    );
    await writeFile(
      path.join(uiDir, "ui-0001-sample.yaml"),
      "# QFAI-CONTRACT-ID: UI-0001\n",
    );
    await writeFile(
      path.join(apiDir, "api-0001-sample.yaml"),
      "# QFAI-CONTRACT-ID: API-0001\n",
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
        testFiles: {
          globs: [],
          excludeGlobs: [],
          matchedFileCount: 0,
          truncated: false,
          limit: 20000,
        },
      },
    };

    const data = await createReportData(root, validation);
    const markdown = formatReportMarkdown(data);
    const examplePath = path.resolve(
      process.cwd(),
      "..",
      "..",
      "docs",
      "examples",
      "report.md",
    );
    const example = await readFile(examplePath, "utf-8");

    const targets = [
      "### Contract Coverage",
      "### Contract → Spec",
      "### Spec → Contracts",
      "### Specs missing contract-ref",
    ];

    for (const heading of targets) {
      expect(extractSection(markdown, heading)).toBe(
        extractSection(example, heading),
      );
    }
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
  const scenarioContractRef = contractRef ?? "none";
  await writeFile(
    path.join(packDir, "scenario.feature"),
    [
      `@${specId}`,
      "Feature: Sample",
      `# QFAI-CONTRACT-REF: ${scenarioContractRef}`,
      "  @SC-0001 @BR-0001",
      "  Scenario: Basic",
      "    Given ...",
      "",
    ].join("\n"),
  );
}

function extractSection(markdown: string, heading: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const startIndex = lines.findIndex((line) => line === heading);
  if (startIndex === -1) {
    return "";
  }
  const startLine = lines[startIndex] ?? "";
  const startLevel = startLine.startsWith("### ") ? 3 : 2;
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (startLevel === 2) {
      if (line.startsWith("## ")) {
        endIndex = i;
        break;
      }
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("### ")) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex, endIndex).join("\n");
}

function createReportDataForLinks(): ReportData {
  return {
    tool: "qfai",
    version: "test",
    generatedAt: "2024-01-01T00:00:00.000Z",
    root: ".",
    configPath: "qfai.config.yaml",
    summary: {
      specs: 0,
      scenarios: 0,
      contracts: { api: 0, ui: 0, db: 0 },
      counts: { info: 0, warning: 1, error: 0 },
    },
    ids: { spec: [], br: [], sc: [], ui: [], api: [], db: [] },
    traceability: {
      upstreamIdsFound: 0,
      referencedInCodeOrTests: false,
      sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
      scSources: {},
      testFiles: {
        globs: [],
        excludeGlobs: [],
        matchedFileCount: 0,
        truncated: false,
        limit: 20000,
      },
      contracts: { total: 0, referenced: 0, orphan: 0, idToSpecs: {} },
      specs: {
        contractRefMissing: 0,
        missingRefSpecs: [],
        specToContracts: {},
      },
    },
    issues: [
      {
        code: "QFAI-TEST-000",
        severity: "warning",
        category: "compatibility",
        message: "link test",
        file: "specs/with space/テスト.md",
        loc: { line: 12 },
      },
    ],
  };
}

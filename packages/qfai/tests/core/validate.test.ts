import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { shouldFail } from "../../src/cli/lib/failOn.js";
import {
  type ValidationResult,
  VALIDATION_SCHEMA_VERSION,
} from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";

describe("validateProject", () => {
  it("counts error/warning correctly", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const result = await validateProject(root);

    expect(result.schemaVersion).toBe(VALIDATION_SCHEMA_VERSION);
    expect(typeof result.toolVersion).toBe("string");
    expect(result.counts.error).toBe(2);
    expect(result.counts.warning).toBe(0);
    expect(result.counts.info).toBe(0);

    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI_TRACE_SC_NO_CONTRACT");
    expect(codes).toContain("QFAI_CONTRACT_ORPHAN");
  });

  it("accepts spec-0001-*.md as a spec file", async () => {
    const root = await setupProject({
      includeContractRefs: false,
      specFileName: "spec-0001-sample.md",
    });
    const result = await validateProject(root);

    const codes = result.issues.map((issue) => issue.code);
    expect(codes).not.toContain("QFAI-SPEC-000");
  });

  it("detects unknown SPEC references in Scenario", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "spec",
      "scenarios",
      "scenarios.feature",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags([
        "@SC-0001",
        "@BR-0001",
        "@SPEC-9999",
        "@UI-0001",
        "@API-0001",
        "@DATA-0001",
      ]),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-005");
  });

  it("detects unknown BR references in Scenario", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "spec",
      "scenarios",
      "scenarios.feature",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags([
        "@SC-0001",
        "@BR-9999",
        "@SPEC-0001",
        "@UI-0001",
        "@API-0001",
        "@DATA-0001",
      ]),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-006");
  });

  it("detects unknown Contract references in Spec", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "spec", "spec-0001-sample.md");
    const base = sampleSpecWithIds("SPEC-0001", "BR-0001");
    await writeFile(specPath, `${base}\n\n- Related: UI-9999\n`);

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-009");
    expect(issue?.file).toBe(specPath);
  });

  it("detects BR not defined under referenced SPEC", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specDir = path.join(root, ".qfai", "spec");
    await writeFile(
      path.join(specDir, "spec-0002-alt.md"),
      sampleSpecWithIds("SPEC-0002", "BR-0002"),
    );
    const scenarioPath = path.join(
      root,
      ".qfai",
      "spec",
      "scenarios",
      "scenarios.feature",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags([
        "@SC-0001",
        "@BR-0002",
        "@SPEC-0001",
        "@UI-0001",
        "@API-0001",
        "@DATA-0001",
      ]),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-007");
  });

  it("treats unknown Contract references as warning when configured", async () => {
    const root = await setupProject({
      includeContractRefs: true,
      configText: buildConfig({ unknownContractIdSeverity: "warning" }),
    });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "spec",
      "scenarios",
      "scenarios.feature",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags([
        "@SC-0001",
        "@BR-0001",
        "@SPEC-0001",
        "@UI-0001",
        "@API-0001",
        "@DATA-0001",
        "@UI-9999",
      ]),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-008");
    expect(issue?.severity).toBe("warning");
  });

  it("detects duplicate SPEC ids", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specDir = path.join(root, ".qfai", "spec");
    // BR は重複させず、SPEC の重複のみを検証する。
    await writeFile(
      path.join(specDir, "spec-0001-alt.md"),
      sampleSpecWithIds("SPEC-0001", "BR-0002"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-ID-001");
  });

  it("detects invalid id format", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specDir = path.join(root, ".qfai", "spec");
    await writeFile(
      path.join(specDir, "spec-0003-invalid.md"),
      sampleSpecWithIds("SPEC-0003", "BR-1"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-ID-002");
  });

  it("detects contract parse failures", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const uiPath = path.join(root, ".qfai", "contracts", "ui", "ui.yaml");
    const apiPath = path.join(root, ".qfai", "contracts", "api", "broken.json");
    await writeFile(uiPath, "id: [UI-0001");
    await writeFile(apiPath, "{ invalid json }");

    const result = await validateProject(root);
    const parseIssues = result.issues.filter(
      (issue) => issue.code === "QFAI-CONTRACT-001",
    );
    expect(parseIssues.some((issue) => issue.file === uiPath)).toBe(true);
    expect(parseIssues.some((issue) => issue.file === apiPath)).toBe(true);
  });

  it("detects missing contract ids", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const uiPath = path.join(root, ".qfai", "contracts", "ui", "ui.yaml");
    const apiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "api",
      "openapi.yaml",
    );
    await writeFile(uiPath, "name: Missing id");
    await writeFile(
      apiPath,
      [
        "openapi: 3.0.0",
        "info:",
        "  title: Sample API",
        "  version: 0.1.0",
        "paths:",
        "  /health:",
        "    get:",
        "      responses:",
        '        "200":',
        "          description: OK",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const missingIdIssues = result.issues.filter(
      (issue) => issue.code === "QFAI-CONTRACT-002",
    );
    expect(missingIdIssues.some((issue) => issue.file === uiPath)).toBe(true);
    expect(missingIdIssues.some((issue) => issue.file === apiPath)).toBe(true);
  });
});

describe("runValidate", () => {
  it("writes JSON output and respects failOn", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const jsonPath = path.join(root, "out", "validate.json");

    const exitCode = await runValidate({
      root,
      strict: false,
      failOn: "never",
      format: "json",
      jsonPath,
    });

    expect(exitCode).toBe(0);
    const raw = await readText(jsonPath);
    const parsed = JSON.parse(raw) as ValidationResult;
    expect(parsed.schemaVersion).toBe(VALIDATION_SCHEMA_VERSION);
    expect(typeof parsed.toolVersion).toBe("string");
    expect(parsed.counts.error).toBe(2);
  });
});

describe("shouldFail", () => {
  it("evaluates failOn thresholds", () => {
    const result: ValidationResult = {
      schemaVersion: VALIDATION_SCHEMA_VERSION,
      toolVersion: "0.2.2",
      issues: [],
      counts: { info: 0, warning: 1, error: 0 },
    };
    expect(shouldFail(result, "never")).toBe(false);
    expect(shouldFail(result, "error")).toBe(false);
    expect(shouldFail(result, "warning")).toBe(true);
  });
});

async function setupProject(options: {
  includeContractRefs: boolean;
  specFileName?: string;
  configText?: string;
}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-"));
  const configText = options.configText ?? buildConfig();
  await writeFile(path.join(root, "qfai.config.yaml"), configText);

  const specDir = path.join(root, ".qfai", "spec");
  const decisionsDir = path.join(root, ".qfai", "spec", "decisions");
  const scenariosDir = path.join(root, ".qfai", "spec", "scenarios");
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  const apiDir = path.join(root, ".qfai", "contracts", "api");
  const dataDir = path.join(root, ".qfai", "contracts", "db");
  const srcDir = path.join(root, "src");

  await mkdir(specDir, { recursive: true });
  await mkdir(decisionsDir, { recursive: true });
  await mkdir(scenariosDir, { recursive: true });
  await mkdir(uiDir, { recursive: true });
  await mkdir(apiDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  await mkdir(srcDir, { recursive: true });

  const specFileName = options.specFileName ?? "spec-0001-sample.md";
  await writeFile(path.join(specDir, specFileName), sampleSpec());
  await writeFile(
    path.join(scenariosDir, "scenarios.feature"),
    sampleScenario(options.includeContractRefs),
  );
  await writeFile(path.join(uiDir, "ui.yaml"), sampleUiContract());
  await writeFile(path.join(apiDir, "openapi.yaml"), sampleApiContract());
  await writeFile(path.join(dataDir, "schema.sql"), sampleDataContract());
  await writeFile(path.join(root, "src", "index.ts"), "// SPEC-0001\n");

  return root;
}

function buildConfig(
  options: {
    unknownContractIdSeverity?: "error" | "warning";
  } = {},
): string {
  const unknownContractIdSeverity =
    options.unknownContractIdSeverity ?? "error";
  return [
    "paths:",
    "  specDir: .qfai/spec",
    "  decisionsDir: .qfai/spec/decisions",
    "  scenariosDir: .qfai/spec/scenarios",
    "  contractsDir: .qfai/contracts",
    "  uiContractsDir: .qfai/contracts/ui",
    "  apiContractsDir: .qfai/contracts/api",
    "  dataContractsDir: .qfai/contracts/db",
    "  srcDir: src",
    "  testsDir: tests",
    "validation:",
    "  failOn: error",
    "  require:",
    "    specSections:",
    "      - 背景",
    "      - スコープ",
    "      - 非ゴール",
    "      - 用語",
    "      - 前提",
    "      - 決定事項",
    "      - 業務ルール",
    "  traceability:",
    "    brMustHaveSc: true",
    "    scMustTouchContracts: true",
    "    allowOrphanContracts: false",
    `    unknownContractIdSeverity: ${unknownContractIdSeverity}`,
    "output:",
    "  format: text",
    "  jsonPath: .qfai/out/validate.json",
    "",
  ].join("\n");
}

function sampleSpec(): string {
  return sampleSpecWithIds("SPEC-0001", "BR-0001");
}

function sampleScenario(includeContractRefs: boolean): string {
  const tags = [
    "@SC-0001",
    "@BR-0001",
    "@SPEC-0001",
    ...(includeContractRefs ? ["@UI-0001", "@API-0001", "@DATA-0001"] : []),
  ];
  return sampleScenarioWithTags(tags);
}

function sampleSpecWithIds(specId: string, brId: string): string {
  return [
    `# ${specId}: Sample Spec`,
    "",
    "## 背景",
    "",
    "- ...",
    "",
    "## スコープ",
    "",
    "- ...",
    "",
    "## 非ゴール",
    "",
    "- ...",
    "",
    "## 用語",
    "",
    "- ...",
    "",
    "## 前提",
    "",
    "- ...",
    "",
    "## 決定事項",
    "",
    "- ...",
    "",
    "## 業務ルール",
    "",
    `- [${brId}] ...`,
    "",
  ].join("\n");
}

function sampleScenarioWithTags(tags: string[]): string {
  return [
    tags.join(" "),
    "Feature: Sample flow",
    "  Scenario: Basic scenario",
    "    Given ...",
    "    When ...",
    "    Then ...",
    "",
  ].join("\n");
}

function sampleUiContract(): string {
  return [
    "id: UI-0001",
    "name: Sample Screen",
    "refs:",
    "  - BR-0001",
    "",
  ].join("\n");
}

function sampleApiContract(): string {
  return [
    "openapi: 3.0.0",
    "info:",
    "  title: Sample API",
    "  version: 0.1.0",
    "paths:",
    "  /health:",
    "    get:",
    "      operationId: API-0001",
    "      responses:",
    '        "200":',
    "          description: OK",
    "",
  ].join("\n");
}

function sampleDataContract(): string {
  return [
    "-- DATA-0001",
    "CREATE TABLE sample_table (",
    "  id INTEGER PRIMARY KEY",
    ");",
    "",
  ].join("\n");
}

async function readText(target: string): Promise<string> {
  return readFile(target, "utf-8");
}

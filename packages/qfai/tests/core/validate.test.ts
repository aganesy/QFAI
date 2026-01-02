import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { shouldFail } from "../../src/cli/lib/failOn.js";
import { type ValidationResult } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";

describe("validateProject", () => {
  it("counts error/warning correctly", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const result = await validateProject(root);

    expect(typeof result.toolVersion).toBe("string");
    expect(result.counts.error).toBe(0);
    expect(result.counts.warning).toBe(0);
    expect(result.counts.info).toBe(0);
    expect(result.traceability.sc.total).toBe(1);
    expect(result.traceability.sc.covered).toBe(1);
    expect(result.traceability.sc.missing).toBe(0);

    const codes = result.issues.map((issue) => issue.code);
    expect(codes).not.toContain("QFAI-TRACE-020");
  });

  it("detects unknown contract ids in scenario steps", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Step-based contract refs",
        "  @SC-0001 @BR-0001",
        "  Scenario: Unknown contract in steps",
        "    Given UI-0001 is visible",
        "    When API-0001 is called",
        "    Then UI-9999 is stored",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-008");
    expect(issue?.refs).toContain("UI-9999");
  });

  it("accepts spec-0001/spec.md as a spec file", async () => {
    const root = await setupProject({
      includeContractRefs: false,
      specDirName: "spec-0001",
    });
    const result = await validateProject(root);

    const codes = result.issues.map((issue) => issue.code);
    expect(codes).not.toContain("QFAI-SPEC-000");
  });

  it("detects missing required sections by H2 headings", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001").replace(
      "## 背景",
      "背景",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SPEC-004");
  });

  it("detects missing BR priority", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001").replace(
      "[P1] ",
      "",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-BR-001");
  });

  it("detects invalid BR priority", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001").replace(
      "[P1]",
      "[P9]",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-BR-002");
  });

  it("detects missing delta.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPackDir = path.join(root, ".qfai", "specs", "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(specPackDir, "spec.md"),
      sampleSpecWithIds("SPEC-0002", "BR-0002"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-DELTA-001");
  });

  it("detects missing scenario.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPackDir = path.join(root, ".qfai", "specs", "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(specPackDir, "spec.md"),
      sampleSpecWithIds("SPEC-0002", "BR-0002"),
    );
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SC-001");
  });

  it("detects missing spec.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPackDir = path.join(root, ".qfai", "specs", "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());
    await writeFile(
      path.join(specPackDir, "scenario.md"),
      sampleScenarioWithTags([
        "@SC-0002",
        "@BR-0001",
        "@UI-0001",
        "@API-0001",
        "@DB-0001",
      ]),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SPEC-005");
  });

  it("detects invalid delta classification", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(deltaPath, sampleDelta().replace("- [x]", "- [ ]"));

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-DELTA-003");
  });

  it("detects unknown SPEC references in Scenario", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags([
        "@SC-0001",
        "@BR-0001",
        "@SPEC-9999",
        "@UI-0001",
        "@API-0001",
        "@DB-0001",
      ]),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-005");
  });

  it("detects missing Feature line in Scenario file", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      [
        "@SC-0001 @BR-0001",
        "Scenario: Missing feature",
        "  Given ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SC-010");
  });

  it("detects missing Scenario line in Scenario file", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      ["@SPEC-0001", "Feature: Missing scenario", "", "Given ...", ""].join(
        "\n",
      ),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SC-006");
  });

  it("detects multiple SCs in a spec entry", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Multi scenario",
        "  @SC-0001 @BR-0001 @UI-0001 @API-0001 @DB-0001",
        "  Scenario: First scenario",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @SC-0002 @BR-0001 @UI-0001 @API-0001 @DB-0001",
        "  Scenario: Second scenario",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-012");
  });

  it("allows multiple Scenarios with the same SC", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Same SC scenario",
        "  @SC-0001 @BR-0001 @UI-0001 @API-0001 @DB-0001",
        "  Scenario: First scenario",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @SC-0001 @BR-0001 @UI-0001 @API-0001 @DB-0001",
        "  Scenario: Second scenario",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).not.toContain("QFAI-TRACE-012");
  });

  it("detects missing SC in Spec entry", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Missing SC",
        "  @BR-0001",
        "  Scenario: No SC",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-012");
  });

  it("detects missing SPEC tag on Feature", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      [
        "Feature: Missing SPEC",
        "  @SC-0001 @BR-0001",
        "  Scenario: No spec tag",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-014");
  });

  it("detects missing Scenario tags", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Missing tags",
        "  Scenario: No tags",
        "    Given ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SC-008");
  });

  it("detects missing Scenario tag ids", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Missing ids",
        "  @SC-0001",
        "  Scenario: Missing BR",
        "    Given ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-015");
  });

  it("detects missing SC tag per scenario", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Multi scenario",
        "",
        "  @SC-0001 @BR-0001",
        "  Scenario: With SC",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @BR-0001",
        "  Scenario: Missing SC",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SC-008");
  });

  it("detects unknown BR references in Scenario", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags([
        "@SC-0001",
        "@BR-9999",
        "@UI-0001",
        "@API-0001",
        "@DB-0001",
      ]),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-006");
  });

  it("ignores Contract references in Spec", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const base = sampleSpecWithIds("SPEC-0001", "BR-0001");
    await writeFile(specPath, `${base}\n\n- Related: UI-9999\n`);

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-021");
    expect(issue).toBeUndefined();
  });

  it("reduces secondary unknown-contract noise when contract text still contains IDs", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const uiPath = path.join(root, ".qfai", "contracts", "ui", "ui.yaml");
    const apiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "api",
      "openapi.yaml",
    );

    await writeFile(
      uiPath,
      ["# QFAI-CONTRACT-ID: UI-0001", "id: [UI-0001"].join("\n"),
    );
    await writeFile(
      apiPath,
      ["# QFAI-CONTRACT-ID: API-0001", "openapi: ["].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-CONTRACT-001");
    expect(codes).not.toContain("QFAI-TRACE-008");
  });

  it("detects BR not defined under referenced SPEC", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specsDir = path.join(root, ".qfai", "specs");
    const specPackDir = path.join(specsDir, "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(specPackDir, "spec.md"),
      sampleSpecWithIds("SPEC-0002", "BR-0002"),
    );
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags([
        "@SC-0001",
        "@BR-0002",
        "@UI-0001",
        "@API-0001",
        "@DB-0001",
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
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags([
        "@SC-0001",
        "@BR-0001",
        "@UI-0001",
        "@API-0001",
        "@DB-0001",
        "@UI-9999",
      ]),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-008");
    expect(issue?.severity).toBe("warning");
  });

  it("detects missing SC references in tests", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// no SC refs\n");

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-010");
    expect(issue?.severity).toBe("error");
    expect(issue?.refs).toContain("SC-0001");
  });

  it("detects unknown SC references in tests", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// QFAI:SC-9999\n");

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-011");
    expect(issue?.severity).toBe("error");
    expect(issue?.refs).toContain("SC-9999");
  });

  it("detects missing test file globs when no files match", async () => {
    const root = await setupProject({
      includeContractRefs: true,
      configText: buildConfig({ testFileGlobs: ["e2e/**/*.spec.ts"] }),
    });

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-013");
    expect(issue?.severity).toBe("error");
  });

  it("detects missing test file globs even when scMustHaveTest is disabled", async () => {
    const root = await setupProject({
      includeContractRefs: true,
      configText: buildConfig({
        scMustHaveTest: false,
        testFileGlobs: ["e2e/**/*.spec.ts"],
      }),
    });

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-013");
    expect(issue?.severity).toBe("error");
  });

  it("counts SC references in src tests", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// no SC refs\n");
    const srcTestPath = path.join(root, "src", "traceability.test.ts");
    await writeFile(srcTestPath, "// QFAI:SC-0001\n");

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-010");
    expect(issue).toBeUndefined();
  });

  it("treats missing SC references as warning when configured", async () => {
    const root = await setupProject({
      includeContractRefs: true,
      configText: buildConfig({ scNoTestSeverity: "warning" }),
    });
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// no SC refs\n");

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-010");
    expect(issue?.severity).toBe("warning");
  });

  it("skips SC test validation when disabled", async () => {
    const root = await setupProject({
      includeContractRefs: true,
      configText: buildConfig({ scMustHaveTest: false }),
    });
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// no SC refs\n");

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-010");
    expect(issue).toBeUndefined();
  });

  it("detects duplicate SPEC ids", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specsDir = path.join(root, ".qfai", "specs");
    const specPackDir = path.join(specsDir, "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    // SPEC-0001 を重複させて SPEC ID の重複を検証する。
    await writeFile(
      path.join(specPackDir, "spec.md"),
      sampleSpecWithIds("SPEC-0001", "BR-0002"),
    );
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-ID-001");
  });

  it("detects invalid id format", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specsDir = path.join(root, ".qfai", "specs");
    const specPackDir = path.join(specsDir, "spec-0003");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(specPackDir, "spec.md"),
      sampleSpecWithIds("SPEC-0003", "BR-1"),
    );
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-ID-002");
  });

  it("detects missing QFAI-CONTRACT-REF in spec", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001").replace(
      "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001\n\n",
      "",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-020");
  });

  it("detects unknown contract refs in spec", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001").replace(
      "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
      "QFAI-CONTRACT-REF: UI-9999",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-021");
    expect(issue?.refs).toContain("UI-9999");
  });

  it("detects orphan contracts", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001").replace(
      "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
      "QFAI-CONTRACT-REF: UI-0001",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-022");
    expect(issue?.refs).toEqual(
      expect.arrayContaining(["API-0001", "DB-0001"]),
    );
  });

  it("detects multiple contract declarations", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const uiPath = path.join(root, ".qfai", "contracts", "ui", "ui.yaml");
    await writeFile(
      uiPath,
      [
        "# QFAI-CONTRACT-ID: UI-0001",
        "# QFAI-CONTRACT-ID: UI-0002",
        "id: UI-0001",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find(
      (item) => item.code === "QFAI-CONTRACT-011",
    );
    expect(issue?.file).toBe(uiPath);
  });

  it("detects duplicate contract ids", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const apiDir = path.join(root, ".qfai", "contracts", "api");
    await writeFile(
      path.join(apiDir, "duplicate.yaml"),
      ["# QFAI-CONTRACT-ID: API-0001", "openapi: 3.0.0", "paths: {}"].join(
        "\n",
      ),
    );

    const result = await validateProject(root);
    const issue = result.issues.find(
      (item) => item.code === "QFAI-CONTRACT-012",
    );
    expect(issue?.refs).toContain("API-0001");
  });

  it("detects contract parse failures", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const uiPath = path.join(root, ".qfai", "contracts", "ui", "ui.yaml");
    const apiPath = path.join(root, ".qfai", "contracts", "api", "broken.json");
    await writeFile(
      uiPath,
      ["# QFAI-CONTRACT-ID: UI-0001", "id: [UI-0001"].join("\n"),
    );
    await writeFile(
      apiPath,
      ["// QFAI-CONTRACT-ID: API-0001", '{"invalid":'].join("\n"),
    );

    const result = await validateProject(root);
    const parseIssues = result.issues.filter(
      (issue) => issue.code === "QFAI-CONTRACT-001",
    );
    expect(parseIssues.some((issue) => issue.file === uiPath)).toBe(true);
    expect(parseIssues.some((issue) => issue.file === apiPath)).toBe(true);
  });

  it("detects missing contract declarations", async () => {
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
      (issue) => issue.code === "QFAI-CONTRACT-010",
    );
    expect(missingIdIssues.some((issue) => issue.file === uiPath)).toBe(true);
    expect(missingIdIssues.some((issue) => issue.file === apiPath)).toBe(true);
  });
});

describe("runValidate", () => {
  it("writes JSON output and respects failOn", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const jsonPath = path.join(root, ".qfai", "out", "validate.json");

    const exitCode = await runValidate({
      root,
      strict: false,
      failOn: "never",
      format: "github",
    });

    expect(exitCode).toBe(0);
    const raw = await readText(jsonPath);
    const parsed = JSON.parse(raw) as ValidationResult;
    expect(typeof parsed.toolVersion).toBe("string");
    expect(parsed.counts.error).toBe(0);
  });
});

describe("shouldFail", () => {
  it("evaluates failOn thresholds", () => {
    const result: ValidationResult = {
      toolVersion: "0.2.2",
      issues: [],
      counts: { info: 0, warning: 1, error: 0 },
      traceability: {
        sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
        testFiles: { globs: [], excludeGlobs: [], matchedFileCount: 0 },
      },
    };
    expect(shouldFail(result, "never")).toBe(false);
    expect(shouldFail(result, "error")).toBe(false);
    expect(shouldFail(result, "warning")).toBe(true);
  });
});

async function setupProject(options: {
  includeContractRefs: boolean;
  specDirName?: string;
  configText?: string;
}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-"));
  const configText = options.configText ?? buildConfig();
  await writeFile(path.join(root, "qfai.config.yaml"), configText);

  const specsDir = path.join(root, ".qfai", "specs");
  const specDirName = options.specDirName ?? "spec-0001";
  const specPackDir = path.join(specsDir, specDirName);
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  const apiDir = path.join(root, ".qfai", "contracts", "api");
  const dataDir = path.join(root, ".qfai", "contracts", "db");
  const srcDir = path.join(root, "src");
  const testsDir = path.join(root, "tests");

  await mkdir(specPackDir, { recursive: true });
  await mkdir(uiDir, { recursive: true });
  await mkdir(apiDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  await mkdir(srcDir, { recursive: true });
  await mkdir(testsDir, { recursive: true });

  await writeFile(path.join(specPackDir, "spec.md"), sampleSpec());
  await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());
  await writeFile(
    path.join(specPackDir, "scenario.md"),
    sampleScenario(options.includeContractRefs),
  );
  await writeFile(path.join(uiDir, "ui.yaml"), sampleUiContract());
  await writeFile(path.join(apiDir, "openapi.yaml"), sampleApiContract());
  await writeFile(path.join(dataDir, "schema.sql"), sampleDataContract());
  await writeFile(path.join(root, "src", "index.ts"), "// SPEC-0001\n");
  await writeFile(
    path.join(testsDir, "traceability.test.ts"),
    "// QFAI:SC-0001\n",
  );

  return root;
}

function buildConfig(
  options: {
    unknownContractIdSeverity?: "error" | "warning";
    scNoTestSeverity?: "error" | "warning";
    scMustHaveTest?: boolean;
    testFileGlobs?: string[];
    testFileExcludeGlobs?: string[];
  } = {},
): string {
  const unknownContractIdSeverity =
    options.unknownContractIdSeverity ?? "error";
  const scNoTestSeverity = options.scNoTestSeverity ?? "error";
  const scMustHaveTest = options.scMustHaveTest ?? true;
  const testFileGlobs = options.testFileGlobs ?? [
    "tests/**/*.test.ts",
    "tests/**/*.spec.ts",
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
  ];
  const testFileExcludeGlobs = options.testFileExcludeGlobs ?? [];
  const testFileGlobsLines =
    testFileGlobs.length === 0
      ? ["    testFileGlobs: []"]
      : [
          "    testFileGlobs:",
          ...testFileGlobs.map((glob) => `      - ${glob}`),
        ];
  const testFileExcludeGlobsLines =
    testFileExcludeGlobs.length === 0
      ? ["    testFileExcludeGlobs: []"]
      : [
          "    testFileExcludeGlobs:",
          ...testFileExcludeGlobs.map((glob) => `      - ${glob}`),
        ];

  return [
    "paths:",
    "  specsDir: .qfai/specs",
    "  contractsDir: .qfai/contracts",
    "  rulesDir: .qfai/rules",
    "  outDir: .qfai/out",
    "  promptsDir: .qfai/prompts",
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
    `    scMustHaveTest: ${scMustHaveTest}`,
    ...testFileGlobsLines,
    ...testFileExcludeGlobsLines,
    `    scNoTestSeverity: ${scNoTestSeverity}`,
    "    allowOrphanContracts: false",
    `    unknownContractIdSeverity: ${unknownContractIdSeverity}`,
    "output:",
    "  validateJsonPath: .qfai/out/validate.json",
    "",
  ].join("\n");
}

function sampleSpec(): string {
  return sampleSpecWithIds("SPEC-0001", "BR-0001");
}

function sampleDelta(): string {
  return [
    "# Delta: SPEC-0001",
    "",
    "## 変更区分",
    "- [x] Compatibility（互換維持: 既存仕様と整合）",
    "- [ ] Change/Improvement（改善/仕様変更: 期待値の変更を含む）",
    "",
    "## 変更の要約（What）",
    "- ...",
    "",
  ].join("\n");
}

function sampleScenario(includeContractRefs: boolean): string {
  const tags = [
    "@SC-0001",
    "@BR-0001",
    ...(includeContractRefs ? ["@UI-0001", "@API-0001", "@DB-0001"] : []),
  ];
  return sampleScenarioWithTags(tags);
}

function sampleSpecWithIds(specId: string, brId: string): string {
  return [
    `# ${specId}: Sample Spec`,
    "",
    "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
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
    `- [${brId}][P1] ...`,
    "",
  ].join("\n");
}

function sampleScenarioWithTags(tags: string[]): string {
  return [
    "@SPEC-0001",
    "Feature: Sample flow",
    `  ${tags.join(" ")}`,
    "  Scenario: Basic scenario",
    "    Given ...",
    "    When ...",
    "    Then ...",
    "",
  ].join("\n");
}

function sampleUiContract(): string {
  return [
    "# QFAI-CONTRACT-ID: UI-0001",
    "id: UI-0001",
    "name: Sample Screen",
    "refs:",
    "  - BR-0001",
    "",
  ].join("\n");
}

function sampleApiContract(): string {
  return [
    "# QFAI-CONTRACT-ID: API-0001",
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
    "-- QFAI-CONTRACT-ID: DB-0001",
    "CREATE TABLE sample_table (",
    "  id INTEGER PRIMARY KEY",
    ");",
    "",
  ].join("\n");
}

async function readText(target: string): Promise<string> {
  return readFile(target, "utf-8");
}

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { shouldFail } from "../../src/cli/lib/failOn.js";
import { type ValidationResult } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { captureStdout } from "../helpers/stdout.js";

describe("validateProject", () => {
  it("counts error/warning correctly", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const result = await validateProject(root);

    expect(typeof result.toolVersion).toBe("string");
    expect(result.counts.error).toBe(0);
    expect(result.counts.warning).toBe(1);
    expect(result.counts.info).toBe(1);
    expect(result.traceability.sc.total).toBe(1);
    expect(result.traceability.sc.covered).toBe(1);
    expect(result.traceability.sc.missing).toBe(0);

    const codes = result.issues.map((issue) => issue.code);
    expect(codes).not.toContain("QFAI-TRACE-020");
    expect(codes).toContain("QFAI-TRACE-036");
  });

  it("detects unknown contract ids in scenario contract refs", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Scenario contract refs",
        "# QFAI-CONTRACT-REF: UI-0001, API-0001, UI-9999",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Unknown contract in refs",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-008");
    expect(issue?.refs).toContain("UI-9999");
  });

  it("detects scenario contract refs that are not in spec contract refs", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    const specContent = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
      "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
      "QFAI-CONTRACT-REF: UI-0001",
    );
    await writeFile(specPath, specContent);
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Scenario contract refs",
        "# QFAI-CONTRACT-REF: UI-0001, API-0001",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Subset violation",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-025");
  });

  it("warns when scenario uses none but spec lists contract refs", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Scenario contract refs",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: None refs",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-036");
    expect(issue?.severity).toBe("warning");
  });

  it("detects missing QFAI-CONTRACT-REF in scenario", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Missing contract refs",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Missing contract refs",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-031");
    expect(issue).toBeDefined();
  });

  it("detects multiple SPEC tags in a scenario", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Multiple SPEC tags",
        "# QFAI-CONTRACT-REF: none",
        "  @SPEC-0002 @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Multiple SPEC tags",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-016");
  });

  it("keeps subset validation even when a scenario has multiple SPEC tags", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    const specContent = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
      "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
      "QFAI-CONTRACT-REF: UI-0001",
    );
    await writeFile(specPath, specContent);
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Multiple SPEC tags with subset violation",
        "# QFAI-CONTRACT-REF: UI-0001, API-0001",
        "  @SPEC-0001 @SPEC-0002 @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Multiple SPEC tags",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-016");
    expect(codes).toContain("QFAI-TRACE-025");
  });

  it("detects invalid contract refs in scenario", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Invalid contract refs",
        "# QFAI-CONTRACT-REF: UI-0001, invalid",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Invalid contract refs",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-032");
    expect(issue?.refs).toContain("invalid");
  });

  it("detects mixed none and contract refs in scenario", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Mixed contract refs",
        "# QFAI-CONTRACT-REF: none, UI-0001",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Mixed contract refs",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-033");
    expect(issue).toBeDefined();
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
    const root = await setupProject({
      includeContractRefs: true,
      configText: buildConfig({ specSections: defaultSpecSections() }),
    });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
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
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
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
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
      "[P1]",
      "[P9]",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-BR-002");
  });

  it("detects BR namespace mismatch", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0002-0001");
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-BR-003");
  });

  it("detects missing delta.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPackDir = path.join(root, ".qfai", "specs", "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(specPackDir, "spec.md"),
      sampleSpecWithIds("SPEC-0002", "BR-0002-0001"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-DELTA-001");
  });

  it("detects missing case-catalogue.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const casePath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "case-catalogue.md",
    );
    await rm(casePath);

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-CASE-001");
  });

  it("detects missing traceability-matrix.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const matrixPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "traceability-matrix.md",
    );
    await rm(matrixPath);

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-RTM-001");
  });

  it("warns when traceability-matrix has planned status in full phase", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const matrixPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "traceability-matrix.md",
    );
    await writeFile(
      matrixPath,
      [
        "# Traceability Matrix",
        "",
        "| BR | SC | Status",
        "| --- | --- | ---",
        "| BR-0001-0001 | SC-0001-0001 | planned",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-RTM-005");
    expect(issue?.severity).toBe("warning");
  });

  it("warns when traceability-matrix has planned status in tdd phase", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const matrixPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "traceability-matrix.md",
    );
    await writeFile(
      matrixPath,
      [
        "# Traceability Matrix",
        "",
        "| BR | SC | Status |",
        "| --- | --- | --- |",
        "| BR-0001-0001 | SC-0001-0001 | planned |",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root, undefined, { phase: "tdd" });
    const issue = result.issues.find((item) => item.code === "QFAI-RTM-005");
    expect(issue?.severity).toBe("warning");
  });

  it("allows planned status in traceability-matrix during atdd phase", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const matrixPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "traceability-matrix.md",
    );
    await writeFile(
      matrixPath,
      [
        "# Traceability Matrix",
        "",
        "| BR | SC | Status |",
        "| --- | --- | --- |",
        "| BR-0001-0001 | SC-0001-0001 | planned |",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root, undefined, { phase: "atdd" });
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).not.toContain("QFAI-RTM-005");
  });

  it("warns when ATDD coverage ledger is missing in atdd phase", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const result = await validateProject(root, undefined, { phase: "atdd" });
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-ATDD-001");
  });

  it("detects missing scenario.feature", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPackDir = path.join(root, ".qfai", "specs", "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(specPackDir, "spec.md"),
      sampleSpecWithIds("SPEC-0002", "BR-0002-0001"),
    );
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SC-001");
  });

  it("detects legacy scenario.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const legacyScenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.md",
    );
    await writeFile(legacyScenarioPath, "# legacy scenario\n");

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SC-004");
  });

  it("detects missing spec.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPackDir = path.join(root, ".qfai", "specs", "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());
    await writeFile(
      path.join(specPackDir, "scenario.feature"),
      sampleScenarioWithTags(
        ["@SC-0001-0002", "@BR-0001-0001"],
        "UI-0001, API-0001, DB-0001",
      ),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SPEC-005");
  });

  it("detects missing Change Log heading in delta.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      [
        "# Delta: SPEC-0001",
        "",
        "## Decision Records",
        "- rejected: none",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-DELTA-002");
  });

  it("detects missing Decision Records heading in delta.md", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      ["# Delta: SPEC-0001", "", "## Change Log", "- change: init", ""].join(
        "\n",
      ),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-DELTA-003");
  });

  it("warns when Decision Records missing rejected", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      [
        "# Delta: SPEC-0001",
        "",
        "## Change Log",
        "- change: init",
        "",
        "## Decision Records",
        "- selected: A",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-DELTA-101");
    expect(issue?.severity).toBe("warning");
  });

  it("warns when change_type_primary is missing in Change Log", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      [
        "# Delta: SPEC-0001",
        "",
        "## Change Log",
        "### CL-0001 — initial",
        "",
        "- date: 2026-02-01",
        "- author: test",
        "- scope: spec",
        "- change: initial",
        "- reason: test",
        "- links: none",
        "",
        "## Decision Records",
        "- rejected:",
        "  - none",
        "    - do_not: none",
        "    - temptation: none",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-DELTA-201");
    expect(issue?.severity).toBe("warning");
  });

  it("warns when change_type_primary is invalid in Change Log", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      [
        "# Delta: SPEC-0001",
        "",
        "## Change Log",
        "### CL-0001 — initial",
        "",
        "- date: 2026-02-01",
        "- author: test",
        "- change_type_primary: Unknown",
        "- change_type_tags: @docs",
        "- scope: spec",
        "- change: initial",
        "- reason: test",
        "- links: none",
        "",
        "## Decision Records",
        "- rejected:",
        "  - none",
        "    - do_not: none",
        "    - temptation: none",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-DELTA-202");
    expect(issue?.severity).toBe("warning");
  });

  it("warns when change_type_tags include invalid tags", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      [
        "# Delta: SPEC-0001",
        "",
        "## Change Log",
        "### CL-0001 — initial",
        "",
        "- date: 2026-02-01",
        "- author: test",
        "- change_type_primary: Initial",
        "- change_type_tags: @ui @unknown",
        "- scope: spec",
        "- change: initial",
        "- reason: test",
        "- links: none",
        "",
        "## Decision Records",
        "- rejected:",
        "  - none",
        "    - do_not: none",
        "    - temptation: none",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-DELTA-203");
    expect(issue?.severity).toBe("warning");
  });

  it("warns when later Change Log entry misses change_type_primary", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      [
        "# Delta: SPEC-0001",
        "",
        "## Change Log",
        "### CL-0001 — initial",
        "",
        "- date: 2026-02-01",
        "- author: test",
        "- change_type_primary: Initial",
        "- change_type_tags: @docs",
        "- scope: spec",
        "- change: initial",
        "- reason: test",
        "- links: none",
        "",
        "### CL-0002 — follow-up",
        "",
        "- date: 2026-02-02",
        "- author: test",
        "- change_type_tags: @docs",
        "- scope: spec",
        "- change: follow-up",
        "- reason: test",
        "- links: none",
        "",
        "## Decision Records",
        "- rejected:",
        "  - none",
        "    - do_not: none",
        "    - temptation: none",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-DELTA-201");
    expect(issue?.severity).toBe("warning");
  });

  it("warns when Decision Records missing do_not or temptation", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      [
        "# Delta: SPEC-0001",
        "",
        "## Change Log",
        "### CL-0001 — initial",
        "",
        "- date: 2026-02-01",
        "- author: test",
        "- change_type_primary: Initial",
        "- change_type_tags: @docs",
        "- scope: spec",
        "- change: initial",
        "- reason: test",
        "- links: none",
        "",
        "## Decision Records",
        "- rejected:",
        "  - none",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-DELTA-204");
    expect(issue?.severity).toBe("warning");
  });

  it("treats inline rejected as present and warns on missing details", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      [
        "# Delta: SPEC-0001",
        "",
        "## Change Log",
        "### CL-0001 — initial",
        "",
        "- date: 2026-02-01",
        "- author: test",
        "- change_type_primary: Initial",
        "- change_type_tags: @docs",
        "- scope: spec",
        "- change: initial",
        "- reason: test",
        "- links: none",
        "",
        "## Decision Records",
        "- rejected: none",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).not.toContain("QFAI-DELTA-101");
    expect(codes).toContain("QFAI-DELTA-204");
  });

  it("detects Change Log after Decision Records", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const deltaPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "delta.md",
    );
    await writeFile(
      deltaPath,
      [
        "# Delta: SPEC-0001",
        "",
        "## Decision Records",
        "- rejected: none",
        "",
        "## Change Log",
        "- change: init",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-DELTA-004");
  });

  it("detects unknown SPEC references in Scenario", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags(
        ["@SC-0001-0001", "@BR-0001-0001", "@SPEC-9999"],
        "UI-0001, API-0001, DB-0001",
      ),
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
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "# QFAI-CONTRACT-REF: none",
        "@SC-0001-0001 @BR-0001-0001",
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
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Missing scenario",
        "# QFAI-CONTRACT-REF: none",
        "",
        "Given ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-SC-006");
  });

  it("allows multiple Scenarios in a spec entry", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Multi scenario",
        "# QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: First scenario",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @SC-0001-0002 @BR-0001-0001",
        "  Scenario: Second scenario",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(
      testPath,
      ["// QFAI:SC-0001-0001", "// QFAI:SC-0001-0002", ""].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).not.toContain("QFAI-TRACE-035");
  });

  it("detects duplicate SC in scenario.feature", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Same SC scenario",
        "# QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: First scenario",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Second scenario",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-035");
  });

  it("detects duplicate SC when scenario names are identical", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Same name duplicate",
        "# QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Happy path",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Happy path",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-035");
  });

  it("detects missing SC in Spec entry", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Missing SC",
        "# QFAI-CONTRACT-REF: none",
        "  @BR-0001-0001",
        "  Scenario: No SC",
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

  it("emits TS-100 when all scenarios are missing layer/size tags", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TS-100");
    expect(codes).not.toContain("QFAI-TS-101");
  });

  it("emits TS-101 when layer/size tags are partially adopted", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Scenario layer/size",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001 @BR-0001-0001 @layer-unit @size-s",
        "  Scenario: With tags",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @SC-0001-0002 @BR-0001-0001",
        "  Scenario: Missing tags",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TS-101");
    expect(codes).not.toContain("QFAI-TS-100");
    expect(codes).not.toContain("QFAI-TS-003");
    expect(codes).not.toContain("QFAI-TS-006");
  });

  it("emits TS-102 when layer tags are required and missing", async () => {
    const root = await setupProject({
      includeContractRefs: false,
      configText: buildConfig({ requireLayerTags: true }),
    });

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TS-102");
  });

  it("emits TS-103 when size tags are required and missing", async () => {
    const root = await setupProject({
      includeContractRefs: false,
      configText: buildConfig({ requireSizeTags: true }),
    });

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TS-103");
  });

  it("emits TS-110/TS-111 when e2e thresholds are exceeded", async () => {
    const root = await setupProject({
      includeContractRefs: false,
      configText: buildConfig({
        maxE2eScenarioRatio: 0.2,
        maxE2eScenarioCount: 0,
      }),
    });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Scenario layer/size",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001 @BR-0001-0001 @layer-e2e @size-m",
        "  Scenario: E2E",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TS-110");
    expect(codes).toContain("QFAI-TS-111");
  });

  it("detects unknown and multiple layer/size tags", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Scenario invalid tags",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001 @BR-0001-0001 @layer-unit @layer-ui @size-s @size-xl",
        "  Scenario: Invalid tags",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TS-001");
    expect(codes).toContain("QFAI-TS-002");
    expect(codes).toContain("QFAI-TS-004");
    expect(codes).toContain("QFAI-TS-005");
  });

  it("detects missing SPEC tag on Feature", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "Feature: Missing SPEC",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001 @BR-0001-0001",
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
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Missing tags",
        "# QFAI-CONTRACT-REF: none",
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
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Missing ids",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001",
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
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Multi scenario",
        "# QFAI-CONTRACT-REF: none",
        "",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: With SC",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @BR-0001-0001",
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

  it("detects SC namespace mismatch with SPEC tag", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: SC mismatch",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0002-0001 @BR-0001-0001",
        "  Scenario: Mismatched SC",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-034");
  });

  it("detects unknown BR references in Scenario", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags(
        ["@SC-0001-0001", "@BR-9999-0001"],
        "UI-0001, API-0001, DB-0001",
      ),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-006");
  });

  it("ignores Contract references in Spec", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const base = sampleSpecWithIds("SPEC-0001", "BR-0001-0001");
    await writeFile(specPath, `${base}\n\n- Related: UI-9999\n`);

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-021");
    expect(issue).toBeUndefined();
  });

  it("reduces secondary unknown-contract noise when contract text still contains IDs", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const uiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "ui-0001-sample.yaml",
    );
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
      sampleSpecWithIds("SPEC-0002", "BR-0002-0001"),
    );
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags(
        ["@SC-0001-0001", "@BR-0002-0001"],
        "UI-0001, API-0001, DB-0001",
      ),
    );

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-TRACE-007");
    expect(codes).not.toContain("QFAI-TRACE-006");
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
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      sampleScenarioWithTags(
        ["@SC-0001-0001", "@BR-0001-0001"],
        "UI-0001, API-0001, DB-0001, UI-9999",
      ),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-008");
    expect(issue?.severity).toBe("warning");
  });

  it("detects missing SC references in tests", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Traceability coverage",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001 @BR-0001-0001 @layer-api @size-s",
        "  Scenario: Covered by tests",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @SC-0001-0002 @BR-0001-0001 @layer-api @size-s",
        "  Scenario: Missing coverage",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// QFAI:SC-0001-0001\n");

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-010");
    expect(issue?.severity).toBe("error");
    expect(issue?.refs).toContain("SC-0001-0002");
  });

  it("detects unknown SC references in tests", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// QFAI:SC-9999-0001\n");

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-011");
    expect(issue?.severity).toBe("error");
    expect(issue?.refs).toContain("SC-9999-0001");
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
    await writeFile(srcTestPath, "// QFAI:SC-0001-0001\n");

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-010");
    expect(issue).toBeUndefined();
  });

  it("treats missing SC references as warning when configured", async () => {
    const root = await setupProject({
      includeContractRefs: true,
      configText: buildConfig({ scNoTestSeverity: "warning" }),
    });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Traceability coverage",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001 @BR-0001-0001 @layer-api @size-s",
        "  Scenario: Covered by tests",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @SC-0001-0002 @BR-0001-0001 @layer-api @size-s",
        "  Scenario: Missing coverage",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// QFAI:SC-0001-0001\n");

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-010");
    expect(issue?.severity).toBe("warning");
    expect(issue?.refs).toContain("SC-0001-0002");
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

  it("defers SC coverage when a layer has no evidence", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const scenarioPath = path.join(
      root,
      ".qfai",
      "specs",
      "spec-0001",
      "scenario.feature",
    );
    await writeFile(
      scenarioPath,
      [
        "@SPEC-0001",
        "Feature: Deferred coverage",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001 @BR-0001-0001 @layer-unit @size-s",
        "  Scenario: Deferred layer",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// no SC refs\n");

    const result = await validateProject(root);
    const missing = result.issues.find(
      (item) => item.code === "QFAI-TRACE-010",
    );
    const deferred = result.issues.find(
      (item) => item.code === "QFAI-TRACE-041",
    );
    expect(missing).toBeUndefined();
    expect(deferred?.severity).toBe("info");
  });

  it("accepts SC references in feature files", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const featuresDir = path.join(root, "features");
    await mkdir(featuresDir, { recursive: true });
    await writeFile(
      path.join(featuresDir, "traceability.feature"),
      [
        "Feature: Feature evidence",
        "",
        "  @SC-0001-0001",
        "  Scenario: Covered by feature tag",
        "    Given ...",
        "",
      ].join("\n"),
    );
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(testPath, "// no SC refs\n");

    const result = await validateProject(root);
    const missing = result.issues.find(
      (item) => item.code === "QFAI-TRACE-010",
    );
    expect(missing).toBeUndefined();
  });

  it("reports parse errors in feature evidence", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const featuresDir = path.join(root, "features");
    await mkdir(featuresDir, { recursive: true });
    const broken = path.join(featuresDir, "broken.feature");
    await writeFile(
      broken,
      ["Scenario: Missing Feature", "  Given ...", ""].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-040");
    expect(issue).toBeDefined();
    expect(issue?.file).toBe(broken);
  });

  it("detects duplicate SPEC ids", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specsDir = path.join(root, ".qfai", "specs");
    const specPackDir = path.join(specsDir, "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    // SPEC-0001 を重複させて SPEC ID の重複を検証する。
    await writeFile(
      path.join(specPackDir, "spec.md"),
      sampleSpecWithIds("SPEC-0001", "BR-0002-0001"),
    );
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());

    const result = await validateProject(root);
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("QFAI-ID-001");
  });

  it("detects duplicate AC/CASE ids across spec packs", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specsDir = path.join(root, ".qfai", "specs");
    const specOnePath = path.join(specsDir, "spec-0001", "spec.md");
    const specWithAc = [
      sampleSpecWithIds("SPEC-0001", "BR-0001-0001"),
      "",
      "## Acceptance Criteria",
      "",
      "- [AC-0001-0001] Given/When/Then ... (CASE-0001-0001)",
      "",
    ].join("\n");
    await writeFile(specOnePath, specWithAc);

    const specPackDir = path.join(specsDir, "spec-0002");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(specPackDir, "spec.md"),
      [
        sampleSpecWithIds("SPEC-0002", "BR-0002-0001"),
        "",
        "## Acceptance Criteria",
        "",
        "- [AC-0001-0001] Given/When/Then ... (CASE-0001-0001)",
        "",
      ].join("\n"),
    );
    await writeFile(path.join(specPackDir, "delta.md"), sampleDelta());
    await writeFile(
      path.join(specPackDir, "scenario.feature"),
      [
        "@SPEC-0002",
        "Feature: Duplicate AC/CASE",
        "# QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
        "  @SC-0002-0001 @BR-0002-0001",
        "  Scenario: Duplicate AC/CASE",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );
    const testPath = path.join(root, "tests", "traceability.test.ts");
    await writeFile(
      testPath,
      ["// QFAI:SC-0001-0001", "// QFAI:SC-0002-0001", ""].join("\n"),
    );

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
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
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
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
      "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
      "QFAI-CONTRACT-REF: UI-9999",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-024");
    expect(issue?.refs).toContain("UI-9999");
  });

  it("detects mixed none and contract refs in spec", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
      "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
      "QFAI-CONTRACT-REF: none, UI-0001",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-023");
    expect(issue).toBeDefined();
  });

  it("detects invalid contract refs in spec", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
      "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
      "QFAI-CONTRACT-REF: UI-0001, invalid",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-021");
    expect(issue?.refs).toContain("invalid");
  });

  it("detects orphan contracts", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
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

  it("treats orphan contracts as warning when configured", async () => {
    const root = await setupProject({
      includeContractRefs: true,
      configText: buildConfig({ orphanContractsPolicy: "warning" }),
    });
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "spec.md");
    const content = sampleSpecWithIds("SPEC-0001", "BR-0001-0001").replace(
      "QFAI-CONTRACT-REF: UI-0001, API-0001, DB-0001",
      "QFAI-CONTRACT-REF: UI-0001",
    );
    await writeFile(specPath, content);

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-TRACE-022");
    expect(issue?.severity).toBe("warning");
  });

  it("detects multiple contract declarations", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const uiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "ui-0001-sample.yaml",
    );
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
    const uiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "ui-0001-sample.yaml",
    );
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
    const uiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "ui-0001-sample.yaml",
    );
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

  it("detects missing thema contract declaration", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const themaPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "thema-001-sample.yml",
    );
    await writeFile(
      themaPath,
      ["id: THEMA-001", "name: Sample Theme", ""].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-THEMA-010");
    expect(issue?.file).toBe(themaPath);
  });

  it("detects thema id mismatch", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const themaPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "thema-001-sample.yml",
    );
    await writeFile(
      themaPath,
      [
        "# QFAI-CONTRACT-ID: THEMA-001",
        "id: THEMA-002",
        "name: Sample Theme",
        "",
      ].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-THEMA-013");
    expect(issue?.file).toBe(themaPath);
  });

  it("detects missing thema name", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const themaPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "thema-001-sample.yml",
    );
    await writeFile(
      themaPath,
      ["# QFAI-CONTRACT-ID: THEMA-001", "id: THEMA-001", ""].join("\n"),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-THEMA-014");
    expect(issue?.file).toBe(themaPath);
  });

  it("detects invalid themaRef in UI contract", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const uiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "ui-0001-sample.yaml",
    );
    await writeFile(uiPath, sampleUiContract({ themaRef: "THEMA-001" }));

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-UI-020");
    expect(issue?.refs).toContain("THEMA-001");
  });

  it("detects missing assets.pack", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const uiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "ui-0001-sample.yaml",
    );
    await writeFile(
      uiPath,
      sampleUiContract({
        assets: { use: ["UI-0001.desktop.light.default"] },
      }),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-ASSET-001");
    expect(issue).toBeDefined();
  });

  it("detects missing assets.yaml", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const packDir = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "assets",
      "ui-0001-sample",
    );
    await mkdir(packDir, { recursive: true });
    const uiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "ui-0001-sample.yaml",
    );
    await writeFile(
      uiPath,
      sampleUiContract({ assets: { pack: "assets/ui-0001-sample" } }),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-ASSET-002");
    expect(issue).toBeDefined();
  });

  it("detects missing assets.use entries", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const packDir = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "assets",
      "ui-0001-sample",
    );
    await writeAssetsPack(
      packDir,
      [
        "packId: UI-0001",
        "type: ui",
        "items:",
        "  - id: UI-0001.desktop.light.default",
        "    kind: snapshot",
        "    path: snapshots/sample.txt",
        "",
      ].join("\n"),
      ["snapshots/sample.txt"],
    );

    const uiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "ui-0001-sample.yaml",
    );
    await writeFile(
      uiPath,
      sampleUiContract({
        assets: {
          pack: "assets/ui-0001-sample",
          use: ["UI-0001.desktop.light.missing"],
        },
      }),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-ASSET-003");
    expect(issue?.refs).toContain("UI-0001.desktop.light.missing");
  });

  it("detects invalid assets.yaml path", async () => {
    const root = await setupProject({ includeContractRefs: true });
    const packDir = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "assets",
      "ui-0001-sample",
    );
    await writeAssetsPack(
      packDir,
      [
        "packId: UI-0001",
        "type: ui",
        "items:",
        "  - id: UI-0001.desktop.light.default",
        "    kind: snapshot",
        "    path: ../outside.txt",
        "",
      ].join("\n"),
    );

    const uiPath = path.join(
      root,
      ".qfai",
      "contracts",
      "ui",
      "ui-0001-sample.yaml",
    );
    await writeFile(
      uiPath,
      sampleUiContract({ assets: { pack: "assets/ui-0001-sample" } }),
    );

    const result = await validateProject(root);
    const issue = result.issues.find((item) => item.code === "QFAI-ASSET-004");
    expect(issue).toBeDefined();
  });
});

describe("runValidate", () => {
  it("writes JSON output and respects failOn", async () => {
    const root = await setupProject({ includeContractRefs: false });
    const jsonPath = path.join(root, ".qfai", "report", "validate.json");

    let exitCode = 0;
    const output = await captureStdout(async () => {
      exitCode = await runValidate({
        root,
        strict: false,
        failOn: "never",
        format: "github",
      });
    });

    expect(exitCode).toBe(0);
    const raw = await readText(jsonPath);
    const parsed = JSON.parse(raw) as ValidationResult;
    expect(typeof parsed.toolVersion).toBe("string");
    expect(parsed.counts.error).toBe(0);
    expect(output).toContain("qfai validate summary:");
  });
});

describe("shouldFail", () => {
  it("evaluates failOn thresholds", () => {
    const result: ValidationResult = {
      toolVersion: "unknown",
      issues: [],
      counts: { info: 0, warning: 1, error: 0 },
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
    path.join(specPackDir, "case-catalogue.md"),
    sampleCaseCatalogue(),
  );
  await writeFile(
    path.join(specPackDir, "scenario.feature"),
    sampleScenario(options.includeContractRefs),
  );
  await writeFile(
    path.join(specPackDir, "traceability-matrix.md"),
    sampleTraceabilityMatrix(),
  );
  await writeFile(path.join(uiDir, "ui-0001-sample.yaml"), sampleUiContract());
  await writeFile(path.join(apiDir, "openapi.yaml"), sampleApiContract());
  await writeFile(path.join(dataDir, "schema.sql"), sampleDataContract());
  await writeFile(path.join(root, "src", "index.ts"), "// SPEC-0001\n");
  await writeFile(
    path.join(testsDir, "traceability.test.ts"),
    "// QFAI:SC-0001-0001\n",
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
    orphanContractsPolicy?: "error" | "warning" | "allow";
    specSections?: string[];
    requireLayerTags?: boolean;
    requireSizeTags?: boolean;
    maxE2eScenarioRatio?: number;
    maxE2eScenarioCount?: number;
  } = {},
): string {
  const unknownContractIdSeverity =
    options.unknownContractIdSeverity ?? "error";
  const scNoTestSeverity = options.scNoTestSeverity ?? "error";
  const scMustHaveTest = options.scMustHaveTest ?? true;
  const orphanContractsPolicy = options.orphanContractsPolicy ?? "error";
  const testFileGlobs = options.testFileGlobs ?? [
    "tests/**/*.test.ts",
    "tests/**/*.spec.ts",
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
    "features/**/*.feature",
  ];
  const specSections = options.specSections ?? [];
  const testFileExcludeGlobs = options.testFileExcludeGlobs ?? [];
  const specSectionsLines =
    specSections.length === 0
      ? ["    specSections: []"]
      : [
          "    specSections:",
          ...specSections.map((section) => `      - ${section}`),
        ];
  const hasTestStrategy =
    options.requireLayerTags !== undefined ||
    options.requireSizeTags !== undefined ||
    options.maxE2eScenarioRatio !== undefined ||
    options.maxE2eScenarioCount !== undefined;
  const testStrategyLines = hasTestStrategy
    ? [
        "  testStrategy:",
        `    requireLayerTags: ${options.requireLayerTags ?? false}`,
        `    requireSizeTags: ${options.requireSizeTags ?? false}`,
        ...(options.maxE2eScenarioRatio !== undefined
          ? [`    maxE2eScenarioRatio: ${options.maxE2eScenarioRatio}`]
          : []),
        ...(options.maxE2eScenarioCount !== undefined
          ? [`    maxE2eScenarioCount: ${options.maxE2eScenarioCount}`]
          : []),
      ]
    : [];
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
    "  outDir: .qfai/report",
    "  promptsDir: .qfai/assistant/prompts",
    "  srcDir: src",
    "  testsDir: tests",
    "validation:",
    "  failOn: error",
    "  require:",
    ...specSectionsLines,
    ...testStrategyLines,
    "  traceability:",
    "    brMustHaveSc: true",
    `    scMustHaveTest: ${scMustHaveTest}`,
    ...testFileGlobsLines,
    ...testFileExcludeGlobsLines,
    `    scNoTestSeverity: ${scNoTestSeverity}`,
    `    orphanContractsPolicy: ${orphanContractsPolicy}`,
    `    unknownContractIdSeverity: ${unknownContractIdSeverity}`,
    "output:",
    "  validateJsonPath: .qfai/report/validate.json",
    "",
  ].join("\n");
}

function defaultSpecSections(): string[] {
  return [
    "背景",
    "スコープ",
    "非ゴール",
    "用語",
    "前提",
    "決定事項",
    "業務ルール",
  ];
}

function sampleSpec(): string {
  return sampleSpecWithIds("SPEC-0001", "BR-0001-0001");
}

function sampleDelta(): string {
  return [
    "# Delta: SPEC-0001",
    "",
    "## Change Log",
    "### CL-0001 — initial",
    "",
    "- date: 2026-02-01",
    "- author: test",
    "- change_type_primary: Initial",
    "- change_type_tags: @docs",
    "- scope: spec",
    "- change: initial",
    "- reason: test",
    "- links: none",
    "",
    "## Decision Records",
    "- rejected:",
    "  - none",
    "    - do_not: none",
    "    - temptation: none",
    "",
  ].join("\n");
}

function sampleScenario(includeContractRefs: boolean): string {
  const tags = ["@SC-0001-0001", "@BR-0001-0001"];
  const contractRefValue = includeContractRefs
    ? "UI-0001, API-0001, DB-0001"
    : "none";
  return sampleScenarioWithTags(tags, contractRefValue);
}

function sampleCaseCatalogue(): string {
  return ["# Case Catalogue", "", "- CASE-0001-0001: Sample case", ""].join(
    "\n",
  );
}

function sampleTraceabilityMatrix(): string {
  return [
    "# Traceability Matrix",
    "",
    "| BR | SC |",
    "| --- | --- |",
    "| BR-0001-0001 | SC-0001-0001 |",
    "",
  ].join("\n");
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

function sampleScenarioWithTags(
  tags: string[],
  contractRefValue?: string | null,
): string {
  const lines = ["@SPEC-0001", "Feature: Sample flow"];
  if (contractRefValue !== undefined && contractRefValue !== null) {
    lines.push(`# QFAI-CONTRACT-REF: ${contractRefValue}`);
  }
  lines.push(
    `  ${tags.join(" ")}`,
    "  Scenario: Basic scenario",
    "    Given ...",
    "    When ...",
    "    Then ...",
    "",
  );
  return lines.join("\n");
}

function sampleUiContract(options?: {
  themaRef?: string;
  assets?: { pack?: string; use?: string[] };
}): string {
  const lines = [
    "# QFAI-CONTRACT-ID: UI-0001",
    "id: UI-0001",
    "name: Sample Screen",
    "refs:",
    "  - BR-0001-0001",
  ];
  if (options?.themaRef) {
    lines.push(`themaRef: ${options.themaRef}`);
  }
  if (options?.assets) {
    lines.push("assets:");
    if (options.assets.pack) {
      lines.push(`  pack: ${options.assets.pack}`);
    }
    if (options.assets.use) {
      lines.push("  use:");
      for (const entry of options.assets.use) {
        lines.push(`    - ${entry}`);
      }
    }
  }
  lines.push("");
  return lines.join("\n");
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

async function writeAssetsPack(
  packDir: string,
  manifest: string,
  files: string[] = [],
): Promise<void> {
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "assets.yaml"), manifest);
  for (const file of files) {
    const filePath = path.join(packDir, file);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "sample");
  }
}

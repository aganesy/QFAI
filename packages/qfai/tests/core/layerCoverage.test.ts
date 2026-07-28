import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  collapseIdRuns,
  validateLayerCoverage,
} from "../../src/core/validators/layerCoverage.js";

describe("validateLayerCoverage", () => {
  it("emits error when a US has no AC child", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "02_User-stories.md"),
        [
          "# 02 User Stories",
          "",
          "## US-0001: title",
          "- Parent: CAP-0001",
          "",
          "## US-0002: title",
          "- Parent: CAP-0001",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      const error = issues.find((entry) => entry.code === "QFAI-COV-101");
      expect(error?.severity).toBe("error");
      expect(error?.refs).toContain("US-0002");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits error when an AC has no BR child", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "03_Acceptance-criteria.md"),
        [
          "# 03 Acceptance Criteria",
          "",
          "## AC-0001: title",
          "- Parent: US-0001",
          "",
          "## AC-0002: title",
          "- Parent: US-0001",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      const error = issues.find((entry) => entry.code === "QFAI-COV-102");
      expect(error?.severity).toBe("error");
      expect(error?.refs).toContain("AC-0002");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits errors when BR has no EX and EX has no TC", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "04_Business-rules.md"),
        [
          "# 04 Business Rules",
          "",
          "## BR-0001: title",
          "- Parent: AC-0001",
          "",
          "## BR-0002: title",
          "- Parent: AC-0001",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "05_Examples.feature"),
        [
          "Feature: examples",
          "",
          "@EX-0001",
          "Scenario: covered",
          "  # Parent: BR-0001",
          "  Given condition",
          "  When action",
          "  Then result",
          "",
          "@EX-0002",
          "Scenario: no tc",
          "  # Parent: BR-0001",
          "  Given condition",
          "  When action",
          "  Then result",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "06_Test-cases.md"),
        ["# 06 Test Cases", "", "## TC-0001: title", "- Parent: EX-0001", ""].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      const brError = issues.find((entry) => entry.code === "QFAI-COV-103");
      const exError = issues.find((entry) => entry.code === "QFAI-COV-104");
      expect(brError?.severity).toBe("error");
      expect(brError?.refs).toContain("BR-0002");
      expect(exError?.severity).toBe("error");
      expect(exError?.refs).toContain("EX-0002");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("skips coverage check when child layer file does not exist", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");
      await unlink(path.join(root, ".qfai", "specs", "spec-0001", "04_Business-rules.md"));

      const issues = await validateLayerCoverage(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-COV-102")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("validateLayerCoverage (v1421 hard gates)", () => {
  it("emits coverage errors when AC/BR/EX links are missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-v1421-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedV1421Spec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "05_Examples.md"),
        [
          "# 05 Examples",
          "",
          "| EX-ID   | BR-Ref  | Input   | Expected   | Notes   |",
          "| ------- | ------- | ------- | ---------- | ------- |",
          "| EX-0001 | BR-0001 | input-1 | expected-1 | note-1  |",
          "| EX-0002 | BR-0001 | input-2 | expected-2 | note-2  |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps   | Expected   | Notes   |",
          "| ------- | ----- | ------- | ------- | ------- | ---------- | ------- |",
          "| TC-0001 | L2    | AC-0001 | EX-0001 | step-1  | expected-1 | note-1  |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      const acError = issues.find((entry) => entry.code === "QFAI-COV-201");
      const brError = issues.find((entry) => entry.code === "QFAI-COV-202");
      const exError = issues.find((entry) => entry.code === "QFAI-COV-203");

      expect(acError?.refs).toContain("AC-0002");
      expect(brError?.refs).toContain("BR-0002");
      expect(exError?.refs).toContain("EX-0002");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits QFAI-COV-204 when BR row has empty AC-Refs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-v1421-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedV1421Spec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "04_Business-Rules.md"),
        [
          "# 04 Business Rules",
          "",
          "| BR-ID   | Title      | AC-Refs | Rule    | Notes   | NFR-Refs |",
          "| ------- | ---------- | ------- | ------- | ------- | -------- |",
          "| BR-0001 | rule-1     | AC-0001 | body-1  | note-1  | NFR-001  |",
          "| BR-0002 | rule-empty |         | body-2  | note-2  | NFR-001  |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      const error = issues.find((entry) => entry.code === "QFAI-COV-204");
      expect(error?.severity).toBe("error");
      expect(error?.refs).toContain("BR-0002");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits QFAI-COV-205 when EX row has empty BR-Ref", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-v1421-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedV1421Spec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "05_Examples.md"),
        [
          "# 05 Examples",
          "",
          "| EX-ID   | BR-Ref  | Input   | Expected   | Notes   |",
          "| ------- | ------- | ------- | ---------- | ------- |",
          "| EX-0001 | BR-0001 | input-1 | expected-1 | note-1  |",
          "| EX-0002 |         | input-2 | expected-2 | note-2  |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      const error = issues.find((entry) => entry.code === "QFAI-COV-205");
      expect(error?.severity).toBe("error");
      expect(error?.refs).toContain("EX-0002");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits QFAI-COV-206 when TC row has both AC-Refs and EX-Ref empty", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-v1421-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedV1421Spec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps   | Expected   | Notes   |",
          "| ------- | ----- | ------- | ------- | ------- | ---------- | ------- |",
          "| TC-0001 | L2    | AC-0001 | EX-0001 | step-1  | expected-1 | note-1  |",
          "| TC-0002 | L2    |         |         | step-2  | expected-2 | note-2  |",
          "| TC-0003 | L2    | AC-0002 | EX-0002 | step-3  | expected-3 | note-3  |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      const error = issues.find((entry) => entry.code === "QFAI-COV-206");
      expect(error?.severity).toBe("error");
      expect(error?.refs).toContain("TC-0002");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("allows EX rows to reference multiple BR IDs when one example covers a cohesive rule bundle", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-v1421-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedV1421Spec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "05_Examples.md"),
        [
          "# 05 Examples",
          "",
          "| EX-ID   | BR-Ref           | Input   | Expected   | Notes   |",
          "| ------- | ---------------- | ------- | ---------- | ------- |",
          "| EX-0001 | BR-0001, BR-0002 | input-1 | expected-1 | note-1  |",
          "| EX-0002 | BR-0002          | input-2 | expected-2 | note-2  |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-COV-207")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accepts layered AC/BR/EX/TC IDs in v1421 coverage", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-v1421-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedV1421Spec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "03_Acceptance-Criteria.md"),
        [
          "# 03 Acceptance Criteria",
          "",
          "```gherkin",
          "# AC-0001-0001",
          "Scenario: desc-1",
          "  Given a precondition",
          "  When an action occurs",
          "  Then an outcome is produced",
          "```",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "04_Business-Rules.md"),
        [
          "# 04 Business Rules",
          "",
          "| BR-ID        | Title  | AC-Refs      | Rule   | Notes  | NFR-Refs |",
          "| ------------ | ------ | ------------ | ------ | ------ | -------- |",
          "| BR-0001-0001 | rule-1 | AC-0001-0001 | body-1 | note-1 | NFR-001  |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "05_Examples.md"),
        [
          "# 05 Examples",
          "",
          "| EX-ID        | BR-Ref       | Input   | Expected   | Notes   |",
          "| ------------ | ------------ | ------- | ---------- | ------- |",
          "| EX-0001-0001 | BR-0001-0001 | input-1 | expected-1 | note-1  |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "| TC-ID        | Level | AC-Refs      | EX-Ref       | Steps  | Expected   | Notes   |",
          "| ------------ | ----- | ------------ | ------------ | ------ | ---------- | ------- |",
          "| TC-0001-0001 | L2    | AC-0001-0001 | EX-0001-0001 | step-1 | expected-1 | note-1  |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      expect(issues.filter((entry) => entry.severity === "error")).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function seedPolicies(root: string, capIds: string[]): Promise<void> {
  const policiesDir = path.join(root, ".qfai", "specs", "_policies");
  await mkdir(policiesDir, { recursive: true });

  const capLines = capIds.map((capId) => `| ${capId} | capability | metric | note |`).join("\n");
  await writeFile(
    path.join(policiesDir, "03_Capabilities.md"),
    [
      "# 03 Capabilities",
      "",
      "| CAP ID | Statement | Success metrics | Notes |",
      "| ------ | --------- | --------------- | ----- |",
      capLines,
      "",
    ].join("\n"),
    "utf-8",
  );
}

async function seedSpec(root: string, specNumber: string, capId: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  await writeFile(
    path.join(specDir, "01_Spec.md"),
    ["# 01 Spec", "", `- Spec: spec-${specNumber}`, `- Parent: ${capId}`, ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "02_User-stories.md"),
    ["# 02 User Stories", "", "## US-0001: title", `- Parent: ${capId}`, ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "03_Acceptance-criteria.md"),
    ["# 03 Acceptance Criteria", "", "## AC-0001: title", "- Parent: US-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "04_Business-rules.md"),
    ["# 04 Business Rules", "", "## BR-0001: title", "- Parent: AC-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "05_Examples.feature"),
    [
      "Feature: examples",
      "",
      "@EX-0001",
      "Scenario: default",
      "  # Parent: BR-0001",
      "  Given precondition",
      "  When action",
      "  Then result",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "06_Test-cases.md"),
    ["# 06 Test Cases", "", "## TC-0001: title", "- Parent: EX-0001", ""].join("\n"),
    "utf-8",
  );
}

async function seedV1421Spec(root: string, specNumber: string, capId: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  await writeFile(
    path.join(specDir, "01_Spec.md"),
    ["# 01 Spec", "", `- Spec: spec-${specNumber}`, `- Parent: ${capId}`, ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "02_User-stories.md"),
    ["# 02 User Stories", "", "## US-0001: title", `- Parent: ${capId}`, ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "03_Acceptance-Criteria.md"),
    [
      "# 03 Acceptance Criteria",
      "",
      "| AC-ID   | Description |",
      "| ------- | ----------- |",
      "| AC-0001 | desc-1      |",
      "| AC-0002 | desc-2      |",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "04_Business-Rules.md"),
    [
      "# 04 Business Rules",
      "",
      "| BR-ID   | Title  | AC-Refs | Rule   | Notes  | NFR-Refs |",
      "| ------- | ------ | ------- | ------ | ------ | -------- |",
      "| BR-0001 | rule-1 | AC-0001 | body-1 | note-1 | NFR-001  |",
      "| BR-0002 | rule-2 | AC-0002 | body-2 | note-2 | NFR-001  |",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "05_Examples.md"),
    [
      "# 05 Examples",
      "",
      "| EX-ID   | BR-Ref  | Input   | Expected   | Notes   |",
      "| ------- | ------- | ------- | ---------- | ------- |",
      "| EX-0001 | BR-0001 | input-1 | expected-1 | note-1  |",
      "| EX-0002 | BR-0002 | input-2 | expected-2 | note-2  |",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "06_Test-Cases.md"),
    [
      "# 06 Test Cases",
      "",
      "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   | Notes   |",
      "| ------- | ----- | ------- | ------- | ------ | ---------- | ------- |",
      "| TC-0001 | L2    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1  |",
      "| TC-0002 | L2    | AC-0002 | EX-0002 | step-2 | expected-2 | note-2  |",
      "",
    ].join("\n"),
    "utf-8",
  );
}

describe("collapseIdRuns", () => {
  it("collapses a contiguous numeric run into a range", () => {
    expect(collapseIdRuns(["BR-0003-0001", "BR-0003-0002", "BR-0003-0003"])).toEqual([
      "BR-0003-0001..BR-0003-0003",
    ]);
  });

  it("keeps a lone ID as-is and splits on a gap", () => {
    expect(collapseIdRuns(["AC-0001", "AC-0002", "AC-0009"])).toEqual([
      "AC-0001..AC-0002",
      "AC-0009",
    ]);
  });

  it("does not merge across differing stems", () => {
    expect(collapseIdRuns(["BR-0001-0002", "BR-0002-0003"])).toEqual([
      "BR-0001-0002",
      "BR-0002-0003",
    ]);
  });

  it("returns an empty list for no IDs", () => {
    expect(collapseIdRuns([])).toEqual([]);
  });
});

describe("specs-coverage Signals section", () => {
  const reportPathFor = (root: string, specNumber: string): string =>
    path.join(root, ".qfai", "report", "specs-coverage", `spec-${specNumber}.md`);

  it("collapses thin coverage into one coded, ranged row per layer", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-signals-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedV1421Spec(root, "0001", "CAP-0001");

      await validateLayerCoverage(root, defaultConfig);
      const report = await readFile(reportPathFor(root, "0001"), "utf-8");

      expect(report).toContain(
        "QFAI-COV-207 (warning): 2 AC entries covered by exactly 1 TC — AC-0001..AC-0002",
      );
      expect(report).toContain(
        "QFAI-COV-207 (warning): 2 BR entries covered by exactly 1 EX — BR-0001..BR-0002",
      );
      expect(report).toContain(
        "QFAI-COV-207 (warning): 2 EX entries covered by exactly 1 TC — EX-0001..EX-0002",
      );
      // The old `AC signal: AC-0001 -> 1 TC` shape carried no code and no action.
      expect(report).not.toContain("signal: AC-0001 ->");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("states the severity and the expected triage action", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-signals-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedV1421Spec(root, "0001", "CAP-0001");

      await validateLayerCoverage(root, defaultConfig);
      const report = await readFile(reportPathFor(root, "0001"), "utf-8");

      expect(report).toContain("is a **warning**, not a gate");
      expect(report).toContain("already `QFAI-COV-201/202/203` errors");
      expect(report).toContain("add a second case, merge the artifact into a sibling");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("omits uncovered artifacts, which are already hard errors", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-signals-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedV1421Spec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   | Notes   |",
          "| ------- | ----- | ------- | ------- | ------ | ---------- | ------- |",
          "| TC-0001 | L2    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1  |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-COV-201")).toBe(true);

      const report = await readFile(reportPathFor(root, "0001"), "utf-8");
      const signals = report.slice(report.indexOf("## Signals"));
      expect(signals).not.toContain("AC-0002");
      expect(signals).not.toContain("EX-0002");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

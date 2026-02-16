import { mkdtemp, mkdir, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateLayerCoverage } from "../../src/core/validators/layerCoverage.js";

describe("validateLayerCoverage", () => {
  it("emits error when a US has no AC child", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cov-"));
    try {
      await seedShared(root, ["CAP-0001"]);
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
      await seedShared(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      await writeFile(
        path.join(
          root,
          ".qfai",
          "specs",
          "spec-0001",
          "03_Acceptance-criteria.md",
        ),
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
      await seedShared(root, ["CAP-0001"]);
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
        [
          "# 06 Test Cases",
          "",
          "## TC-0001: title",
          "- Parent: EX-0001",
          "",
        ].join("\n"),
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
      await seedShared(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");
      await unlink(
        path.join(root, ".qfai", "specs", "spec-0001", "04_Business-rules.md"),
      );

      const issues = await validateLayerCoverage(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-COV-102")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function seedShared(root: string, capIds: string[]): Promise<void> {
  const sharedDir = path.join(root, ".qfai", "specs", "_shared");
  await mkdir(sharedDir, { recursive: true });

  const capLines = capIds
    .map((capId) => `| ${capId} | capability | metric | note |`)
    .join("\n");
  await writeFile(
    path.join(sharedDir, "03_Capabilities.md"),
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

async function seedSpec(
  root: string,
  specNumber: string,
  capId: string,
): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  await writeFile(
    path.join(specDir, "01_Spec.md"),
    [
      "# 01 Spec",
      "",
      `- Spec: spec-${specNumber}`,
      `- Parent: ${capId}`,
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "02_User-stories.md"),
    [
      "# 02 User Stories",
      "",
      "## US-0001: title",
      `- Parent: ${capId}`,
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "03_Acceptance-criteria.md"),
    [
      "# 03 Acceptance Criteria",
      "",
      "## AC-0001: title",
      "- Parent: US-0001",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "04_Business-rules.md"),
    [
      "# 04 Business Rules",
      "",
      "## BR-0001: title",
      "- Parent: AC-0001",
      "",
    ].join("\n"),
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
    ["# 06 Test Cases", "", "## TC-0001: title", "- Parent: EX-0001", ""].join(
      "\n",
    ),
    "utf-8",
  );
}

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateLayeredTraceability } from "../../src/core/validators/layeredTraceability.js";
import { validateOrphanProhibition } from "../../src/core/validators/orphanProhibition.js";
import { validateSpecSplitByCapability } from "../../src/core/validators/specSplitByCapability.js";

describe("v1.4.28 layered validators", () => {
  it("passes spec split by capability when CAP count and spec count match", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedShared(root, ["CAP-0001", "CAP-0002", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails spec split when CAP count and spec count mismatch", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedShared(root, ["CAP-0001", "CAP-0002", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-SPLIT-102")).toBe(
        true,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails layered traceability when Parent is missing or down-ref exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedShared(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      const acPath = path.join(
        root,
        ".qfai",
        "specs",
        "spec-0001",
        "03_Acceptance-criteria.md",
      );
      await writeFile(
        acPath,
        [
          "# 03 Acceptance Criteria",
          "",
          "## AC-0001: title",
          "- Notes: no parent",
          "",
        ].join("\n"),
        "utf-8",
      );
      const usPath = path.join(
        root,
        ".qfai",
        "specs",
        "spec-0001",
        "02_User-stories.md",
      );
      await writeFile(
        usPath,
        [
          "# 02 User Stories",
          "",
          "## US-0001: title",
          "- Parent: CAP-0001",
          "- Notes: AC-0001 should not appear here.",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayeredTraceability(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-LAYER-102")).toBe(
        true,
      );
      expect(issues.some((issue) => issue.code === "QFAI-LAYER-106")).toBe(
        true,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails orphan prohibition when TC points to unknown EX", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedShared(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      const tcPath = path.join(
        root,
        ".qfai",
        "specs",
        "spec-0001",
        "06_Test-cases.md",
      );
      await writeFile(
        tcPath,
        [
          "# 06 Test Cases",
          "",
          "## TC-0001: title",
          "- Parent: EX-9999",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateOrphanProhibition(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-ORPHAN-109")).toBe(
        true,
      );
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

  await writeFile(
    path.join(sharedDir, "01_Objective.md"),
    "# 01 Objective\n\n- objective\n",
    "utf-8",
  );
  await writeFile(
    path.join(sharedDir, "02_Initiative.md"),
    "# 02 Initiative\n\n- initiative\n",
    "utf-8",
  );
  await writeFile(
    path.join(sharedDir, "04_Business-flow.md"),
    "# 04 Business Flow\n\n```mermaid\nflowchart TD\n  A --> B\n```\n",
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
      `# 01 Spec`,
      ``,
      `- Spec: spec-${specNumber}`,
      `- Parent: ${capId}`,
      ``,
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
      "Feature: CAP examples",
      "",
      "@EX-0001",
      "Scenario: title",
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
  await writeFile(path.join(specDir, "09_delta.md"), "# Delta\n", "utf-8");
}

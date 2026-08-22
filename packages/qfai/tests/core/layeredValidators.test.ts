import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateLayeredTraceability } from "../../src/core/validators/layeredTraceability.js";
import { validateOrphanProhibition } from "../../src/core/validators/orphanProhibition.js";
import { validateSpecSplitByCapability } from "../../src/core/validators/specSplitByCapability.js";

describe("v1.4.36 layered validators", () => {
  it("passes spec split by capability when CAP count and spec count match", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"]);
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-SPLIT-102")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accepts an ID gap left by an approved DELETE when the catalog declares the mapping", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // spec-0002 was deleted with its capability; 11_Slice-Policy.md forbids
      // renumbering spec-0003, so the surviving directories keep their IDs.
      await seedPolicies(root, ["CAP-0001", "CAP-0003"], ["spec-0001", "spec-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still reports a spec directory the declared mapping does not name", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0003"], ["spec-0001", "spec-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const codes = issues.map((issue) => issue.code);
      expect(codes).toContain("QFAI-SPLIT-103");
      expect(codes).toContain("QFAI-SPLIT-104");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("compares the declared pair, not the positional one, for the CAP back-reference", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0003"], ["spec-0001", "spec-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0009");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const parentIssue = issues.find((issue) => issue.code === "QFAI-SPLIT-105");
      expect(parentIssue?.refs).toEqual(["spec-0003", "CAP-0003"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a CAP row that declares no spec directory of its own", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], ["spec-0001", null]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["CAP-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports two CAP rows that declare the same spec directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], ["spec-0001", "spec-0001"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["spec-0001 (CAP-0001, CAP-0002)"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats an all-blank Spec column as a declared mapping, not as a legacy catalog", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // The column exists, so the catalog opted into the declared mapping; the
      // sequential directories must not smuggle the positional derivation back.
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], [null, null]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["CAP-0001", "CAP-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not synthesise a positional directory for a blank Spec cell", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0003"], ["spec-0001", null]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const codes = issues.map((issue) => issue.code);
      // Only the missing declaration is reported: no 103 for a phantom
      // spec-0002, and no 104 for the directory the blank row still owns.
      expect(codes).toEqual(["QFAI-SPLIT-106"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a CAP that occupies more than one catalog row", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0001"], ["spec-0001", "spec-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["CAP-0001"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a repeated CAP row even when the second row names another spec", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0001"], ["spec-0001", "spec-0002"]);
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping.map((issue) => issue.refs)).toEqual([["CAP-0001"]]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the positional derivation when the catalog declares no Spec column", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const codes = issues.map((issue) => issue.code);
      expect(codes).toContain("QFAI-SPLIT-103");
      expect(codes).toContain("QFAI-SPLIT-104");
      expect(codes).not.toContain("QFAI-SPLIT-106");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails layered traceability when Parent is missing or down-ref exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      const acPath = path.join(root, ".qfai", "specs", "spec-0001", "03_Acceptance-Criteria.md");
      await writeFile(
        acPath,
        ["# 03 Acceptance Criteria", "", "## AC-0001: title", "- Notes: no parent", ""].join("\n"),
        "utf-8",
      );
      const usPath = path.join(root, ".qfai", "specs", "spec-0001", "02_User-stories.md");
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
      expect(issues.some((issue) => issue.code === "QFAI-LAYER-102")).toBe(true);
      expect(issues.some((issue) => issue.code === "TRACE_DOWNSTREAM_REF")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails orphan prohibition when TC points to unknown EX", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      const tcPath = path.join(root, ".qfai", "specs", "spec-0001", "06_Test-Cases.md");
      await writeFile(
        tcPath,
        ["# 06 Test Cases", "", "## TC-0001: title", "- Parent: EX-9999", ""].join("\n"),
        "utf-8",
      );

      const issues = await validateOrphanProhibition(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-ORPHAN-109")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

/**
 * Seeds `_policies`. Pass `declaredSpecIds` to emit the `Spec` column that
 * declares the CAP -> spec directory mapping; `null` leaves a row's cell empty.
 * Omit it to get the legacy catalog with no `Spec` column at all.
 */
async function seedPolicies(
  root: string,
  capIds: string[],
  declaredSpecIds?: (string | null)[],
): Promise<void> {
  const policiesDir = path.join(root, ".qfai", "specs", "_policies");
  await mkdir(policiesDir, { recursive: true });

  const header = declaredSpecIds
    ? ["| CAP ID | Spec | Statement | Success metrics | Notes |", "| --- | --- | --- | --- | --- |"]
    : [
        "| CAP ID | Statement | Success metrics | Notes |",
        "| ------ | --------- | --------------- | ----- |",
      ];
  const capLines = capIds
    .map((capId, index) =>
      declaredSpecIds
        ? `| ${capId} | ${declaredSpecIds[index] ?? ""} | capability | metric | note |`
        : `| ${capId} | capability | metric | note |`,
    )
    .join("\n");
  await writeFile(
    path.join(policiesDir, "03_Capabilities.md"),
    ["# 03 Capabilities", "", ...header, capLines, ""].join("\n"),
    "utf-8",
  );

  await writeFile(
    path.join(policiesDir, "01_Objective.md"),
    "# 01 Objective\n\n- objective\n",
    "utf-8",
  );
  await writeFile(
    path.join(policiesDir, "02_Initiative.md"),
    "# 02 Initiative\n\n- initiative\n",
    "utf-8",
  );
  await writeFile(
    path.join(policiesDir, "04_Business-Flow.md"),
    "# 04 Business Flow\n\n```mermaid\nflowchart TD\n  A --> B\n```\n",
    "utf-8",
  );
  await writeFile(
    path.join(policiesDir, "11_Slice-Policy.md"),
    "# 11 Slice Policy\n\n- structural: 1 pack-type = 1 spec\n",
    "utf-8",
  );
}

async function seedSpec(root: string, specNumber: string, capId: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  await writeFile(
    path.join(specDir, "01_Spec.md"),
    [`# 01 Spec`, ``, `- Spec: spec-${specNumber}`, `- Parent: ${capId}`, ``].join("\n"),
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
    path.join(specDir, "04_Business-Rules.md"),
    ["# 04 Business Rules", "", "## BR-0001: title", "- Parent: AC-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "05_Examples.md"),
    [
      "# 05 Examples",
      "",
      "## EX-0001: title",
      "- Parent: BR-0001",
      "- Given: precondition",
      "- When: action",
      "- Then: result",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "06_Test-Cases.md"),
    ["# 06 Test Cases", "", "## TC-0001: title", "- Parent: EX-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(specDir, "07_Decisions.md"), "# 07 Decisions\n", "utf-8");
  await writeFile(path.join(specDir, "08_Open-questions.md"), "# 08 Open Questions\n", "utf-8");
  await writeFile(path.join(specDir, "09_delta.md"), "# Delta\n", "utf-8");
  await writeFile(path.join(specDir, "10_Plan.md"), "# Plan\n", "utf-8");
}

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateContractReferences } from "../../src/core/validators/contractReferences.js";

describe("validateContractReferences", () => {
  it("reports missing contract IDs referenced by spec-pack contracts index", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedSpecPack(root);
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "11_Contracts.md"),
        [
          "# 11 Contracts",
          "",
          "| Contract ID | Type | File |",
          "| ----------- | ---- | ---- |",
          "| CON-API-9999 | API | .qfai/contracts/api/api-9999-missing.yaml |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedApiContract(root, "CON-API-0001");

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-030");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("error");
      expect(issue?.refs).toContain("CON-API-9999");
      expect(issue?.file).toContain("11_Contracts.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("normalizes short IDs in layered _policies contracts index", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001");
      const sharedContractsPath = path.join(root, ".qfai", "specs", "_policies", "05_Contracts.md");

      await writeFile(
        sharedContractsPath,
        ["# 05 Contracts", "", "| Short ID |", "| -------- |", "| API-001 |", ""].join("\n"),
        "utf-8",
      );

      const initialIssues = await validateContractReferences(root, defaultConfig);
      expect(initialIssues.some((item) => item.code === "QFAI-CONTRACT-030")).toBe(false);

      await writeFile(
        sharedContractsPath,
        ["# 05 Contracts", "", "| Short ID |", "| -------- |", "| API-999 |", ""].join("\n"),
        "utf-8",
      );

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-030");

      expect(issue).toBeDefined();
      expect(issue?.refs).toContain("CON-API-0999");
      expect(issue?.file).toContain("05_Contracts.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores contract ID examples outside contract index tables", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      const sharedContractsPath = path.join(root, ".qfai", "specs", "_policies", "05_Contracts.md");

      await writeFile(
        sharedContractsPath,
        [
          "# 05 Contracts",
          "",
          "## API Contracts",
          "",
          "| Short ID | Router | Declared ID | File | Purpose |",
          "| -------- | ------ | ----------- | ---- | ------- |",
          "| 0 items | 0 contracts | - | - | Add rows only when contracts exist |",
          "",
          "## Mapping Rules",
          "",
          "- API short ID format: `API-001`",
          "- Canonical API mapping: `CON-API-0001`",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-030")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses unknownContractIdSeverity for issue severity", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedSpecPack(root);
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "11_Contracts.md"),
        ["# 11 Contracts", "", "| Contract ID |", "| ----------- |", "| CON-UI-7777 |", ""].join(
          "\n",
        ),
        "utf-8",
      );

      const warningConfig = {
        ...defaultConfig,
        validation: {
          ...defaultConfig.validation,
          traceability: {
            ...defaultConfig.validation.traceability,
            unknownContractIdSeverity: "warning" as const,
          },
        },
      };

      const issues = await validateContractReferences(root, warningConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-030");

      expect(issue).toBeDefined();
      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toContain("CON-UI-7777");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function seedSpecPack(root: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_Objective.md"), "# 02 Objective\n", "utf-8");
}

async function seedLayered(root: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  const sharedDir = path.join(root, ".qfai", "specs", "_policies");
  await mkdir(specDir, { recursive: true });
  await mkdir(sharedDir, { recursive: true });

  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User Stories\n", "utf-8");
  await writeFile(
    path.join(specDir, "03_Acceptance-Criteria.md"),
    "# 03 Acceptance Criteria\n",
    "utf-8",
  );
}

async function seedApiContract(root: string, contractId: string): Promise<void> {
  const apiDir = path.join(root, ".qfai", "contracts", "api");
  await mkdir(apiDir, { recursive: true });
  await writeFile(
    path.join(apiDir, "api-0001-sample.yaml"),
    [
      `# QFAI-CONTRACT-ID: ${contractId}`,
      'openapi: "3.1.0"',
      "info:",
      "  title: Sample API",
      '  version: "0.1.0"',
      "paths: {}",
      "",
    ].join("\n"),
    "utf-8",
  );
}

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
  const policiesDir = path.join(root, ".qfai", "specs", "_policies");
  await mkdir(specDir, { recursive: true });
  await mkdir(policiesDir, { recursive: true });

  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User Stories\n", "utf-8");
  await writeFile(
    path.join(specDir, "03_Acceptance-Criteria.md"),
    "# 03 Acceptance Criteria\n",
    "utf-8",
  );
}

async function seedApiContract(
  root: string,
  contractId: string,
  dependsOn?: string[],
): Promise<void> {
  const apiDir = path.join(root, ".qfai", "contracts", "api");
  await mkdir(apiDir, { recursive: true });
  await writeFile(
    path.join(apiDir, "api-0001-sample.yaml"),
    [
      `# QFAI-CONTRACT-ID: ${contractId}`,
      'openapi: "3.1.0"',
      ...(dependsOn ? [`x-qfai-depends-on: [${dependsOn.join(", ")}]`] : []),
      "info:",
      "  title: Sample API",
      '  version: "0.1.0"',
      "paths: {}",
      "",
    ].join("\n"),
    "utf-8",
  );
}

async function seedDbContract(root: string, contractId: string): Promise<void> {
  const dbDir = path.join(root, ".qfai", "contracts", "db");
  await mkdir(dbDir, { recursive: true });
  await writeFile(
    path.join(dbDir, "db-0001-sample.sql"),
    [
      `-- QFAI-CONTRACT-ID: ${contractId}`,
      "-- Depends on: -",
      "CREATE TABLE sample (id text);",
      "",
    ].join("\n"),
    "utf-8",
  );
}

/**
 * The shipped index template calls `Depends On` the only place a multi-file
 * schema's composition is written down, but nothing read the column: a table
 * could drop it, and a row could contradict the file it names, in silence.
 */
describe("the contract index's Depends On column", () => {
  const indexRow = (dependsOn: string): string =>
    `| API-001 | /api/orders | CON-API-0001 | \`.qfai/contracts/api/api-0001-sample.yaml\` | ${dependsOn} | create draft |`;

  const writeIndex = (root: string, lines: string[]): Promise<void> =>
    writeFile(
      path.join(root, ".qfai", "specs", "_policies", "05_Contracts.md"),
      ["# 05 Contracts", "", "## API Contracts", "", ...lines, ""].join("\n"),
      "utf-8",
    );

  it("reports a table that dropped the column", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001");
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Purpose |",
        "| -------- | ------ | ----------- | ---- | ------- |",
        "| API-001 | /api/orders | CON-API-0001 | `.qfai/contracts/api/api-0001-sample.yaml` | create draft |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-032");

      expect(issue?.severity).toBe("warning");
      expect(issue?.file).toContain("05_Contracts.md");
      expect(issue?.loc?.line).toBe(5);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores a table that is not a contract index", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await writeIndex(root, [
        "| Short ID | Purpose |",
        "| -------- | ------- |",
        "| API-001 | x |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-032")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a row that does not mirror the contract file's declaration", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedDbContract(root, "CON-DB-0001");
      await seedApiContract(root, "CON-API-0001", ["CON-DB-0001"]);
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        indexRow("-"),
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-033");

      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toEqual(["CON-API-0001", "CON-DB-0001"]);
      expect(issue?.loc?.line).toBe(7);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stays silent when the row and the file agree", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedDbContract(root, "CON-DB-0001");
      await seedApiContract(root, "CON-API-0001", ["CON-DB-0001"]);
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        indexRow("CON-DB-0001"),
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-033")).toBe(false);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-032")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

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
        "| DB-001 | orders | CON-DB-0001 | `.qfai/contracts/db/db-0001-sample.sql` | - | schema |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-033")).toBe(false);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-032")).toBe(false);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-034")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a blank cell rather than reading it as `no dependencies`", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      // The file declares `[]`, so a set comparison alone would call the blank
      // cell a match and leave "never stated" indistinguishable from "none".
      await seedApiContract(root, "CON-API-0001", []);
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        indexRow(""),
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-033");

      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toEqual(["CON-API-0001"]);
      expect(issue?.loc?.line).toBe(7);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leaves an empty table under a non-contract heading alone", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      // A Design table that happens to hold no rows states no id either way, so
      // row evidence cannot tell it from the shipped `0 items` API table. Only
      // the section it sits under can.
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "05_Contracts.md"),
        [
          "# 05 Contracts",
          "",
          "## Design Contracts",
          "",
          "| Short ID | Entity | Declared ID | File | Purpose |",
          "| -------- | ------ | ----------- | ---- | ------- |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-032")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still reports an empty table under a contract heading", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Purpose |",
        "| -------- | ------ | ----------- | ---- | ------- |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-032")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps checking the rest of a table around one mistyped row", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedDbContract(root, "CON-DB-0001");
      await seedApiContract(root, "CON-API-0001", ["CON-DB-0001"]);
      // One unresolvable `Declared ID` used to disqualify the whole table, so
      // the next row's disagreement with its own contract file went unreported.
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        "| API-002 | /api/typo | CON API 0002 | `.qfai/contracts/api/api-0002.yaml` | - | typo |",
        indexRow("-"),
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-033");

      expect(issue?.refs).toEqual(["CON-API-0001", "CON-DB-0001"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("holds a spec-pack `Contract ID` table to the same column rule", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedSpecPack(root);
      await seedApiContract(root, "CON-API-0001", []);
      await writeFile(
        path.join(root, ".qfai", "specs", "spec-0001", "11_Contracts.md"),
        [
          "# 11 Contracts",
          "",
          "| Contract ID | Type | File |",
          "| ----------- | ---- | ---- |",
          "| CON-API-0001 | API | `.qfai/contracts/api/api-0001-sample.yaml` |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-032")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-034")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a row whose File does not declare the row's id", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001", []);
      await writeFile(
        path.join(root, ".qfai", "contracts", "api", "api-0002-sample.yaml"),
        ["# QFAI-CONTRACT-ID: CON-API-0002", 'openapi: "3.1.0"', "x-qfai-depends-on: []", ""].join(
          "\n",
        ),
        "utf-8",
      );
      // The mirror check reads the declaration by id and never looked at the
      // `File` cell, so this row passed `-030` (both ids exist), `-033` (the
      // dependencies compared are the ones `CON-API-0001` really declares) and
      // `-034` (the id is listed) while sending every reader to the wrong file.
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        "| API-001 | /api/orders | CON-API-0001 | `.qfai/contracts/api/api-0002-sample.yaml` | - | create draft |",
        "| API-002 | /api/items | CON-API-0002 | `.qfai/contracts/api/api-0002-sample.yaml` | - | list |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-035");

      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toEqual(["CON-API-0001"]);
      expect(issue?.loc?.line).toBe(7);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-030")).toBe(false);
      // The second row names its own file, so only the first row is reported.
      expect(issues.filter((item) => item.code === "QFAI-CONTRACT-035")).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leaves a File cell that names no single file alone", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001", []);
      // A glob is how a long-lived index names a whole contract family; it points
      // at no one file, so there is nothing to hold the row to.
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        "| API-001 | /api/orders | CON-API-0001 | `.qfai/contracts/api/*.yaml` | - | create draft |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-035")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not let a short ID in the Declared ID column stand in for the id", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001", []);
      // `API-001` normalizes to `CON-API-0001`, so a canonical column that never
      // states the id counted as coverage while the row checks skipped the row.
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        "| API-001 | /api/orders | API-001 | `.qfai/contracts/api/api-0001-sample.yaml` | - | create draft |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-034");
      expect(issue?.refs).toEqual(["CON-API-0001"]);

      // The full id still counts as coverage, backticks and all.
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        "| API-001 | /api/orders | `CON-API-0001` | `.qfai/contracts/api/api-0001-sample.yaml` | - | create draft |",
      ]);

      const mirrored = await validateContractReferences(root, defaultConfig);
      expect(mirrored.some((item) => item.code === "QFAI-CONTRACT-034")).toBe(false);
      expect(mirrored.some((item) => item.code === "QFAI-CONTRACT-035")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the columns aligned across an escaped pipe", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedDbContract(root, "CON-DB-0001");
      await seedApiContract(root, "CON-API-0001", ["CON-DB-0001"]);
      // `\|` is the only way to write a pipe inside a GFM cell. Splitting on a
      // bare `|` turned this row into seven cells and shifted `Declared ID`,
      // `File` and `Depends On` one place left, so a correct row lost its id.
      await writeIndex(root, [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        "| API-001 | GET /orders \\| POST /orders | CON-API-0001 | `.qfai/contracts/api/api-0001-sample.yaml` | CON-DB-0001 | create draft |",
        "| DB-001 | orders | CON-DB-0001 | `.qfai/contracts/db/db-0001-sample.sql` | - | schema |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.map((item) => item.code)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leaves an example table inside a code fence out of the index", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001", []);
      const exampleTable = [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        "| API-001 | /api/orders | CON-API-0001 | `.qfai/contracts/api/api-0001-sample.yaml` | - | create draft |",
      ];
      // Showing a filled-in example is the natural way to document the index.
      // Read as data, it satisfied coverage and the row check while the rendered
      // index still listed no contract at all.
      await writeIndex(root, ["0 items", "", "```markdown", ...exampleTable, "```"]);

      const fenced = await validateContractReferences(root, defaultConfig);
      expect(fenced.find((item) => item.code === "QFAI-CONTRACT-034")?.refs).toEqual([
        "CON-API-0001",
      ]);

      // The same table outside the fence is the real index and still counts.
      await writeIndex(root, exampleTable);
      const real = await validateContractReferences(root, defaultConfig);
      expect(real.some((item) => item.code === "QFAI-CONTRACT-034")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leaves an example table inside an HTML comment out of the index", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001", []);
      const exampleTable = [
        "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
        "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
        "| API-001 | /api/orders | CON-API-0001 | `.qfai/contracts/api/api-0001-sample.yaml` | - | create draft |",
      ];
      // A commented-out example is the same class of "not rendered content" as a
      // fenced one — and it is the spelling the shipped `05_Contracts.md`
      // template writes its own example rows in, so it is what an author copies.
      // Read as data, it satisfied `-034` coverage and the `-033` row check
      // while a reader of the rendered index saw no contract row at all.
      await writeIndex(root, ["0 items", "", "<!-- Example row:", ...exampleTable, "-->"]);

      const commented = await validateContractReferences(root, defaultConfig);
      expect(commented.find((item) => item.code === "QFAI-CONTRACT-034")?.refs).toEqual([
        "CON-API-0001",
      ]);

      // The over-correction pin: uncommented, the same table is the real index.
      await writeIndex(root, exampleTable);
      const real = await validateContractReferences(root, defaultConfig);
      expect(real.some((item) => item.code === "QFAI-CONTRACT-034")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps a heading hidden in a comment out of the table's enclosing heading", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      // An empty table is judged by the heading above it, so a commented-out
      // heading could silence the check on the real table below: the shipped
      // `0 items` API table owes its `Depends On` column, but read the hidden
      // `### Design Contracts` as its heading and it becomes a lookalike table
      // that owes nothing.
      await writeIndex(root, [
        "<!--",
        "### Design Contracts",
        "-->",
        "",
        "0 items",
        "",
        "| Short ID | Router | Declared ID | File | Purpose |",
        "| -------- | ------ | ----------- | ---- | ------- |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-032")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leaves a table that indexes another artifact kind by slug alone", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      // A long-lived index also carries Design / UI tables whose `Declared ID`
      // is a slug; they declare no `CON-*` id and owe no apply order.
      await writeIndex(root, [
        "| Short ID | Entity | Declared ID | File | Purpose |",
        "| -------- | ------ | ----------- | ---- | ------- |",
        "| DCON-005 | Design System | design-system | `.qfai/contracts/design/design-system.yaml` | tokens |",
      ]);

      const issues = await validateContractReferences(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-CONTRACT-032")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("QFAI-CONTRACT-034 — a contract missing from every index", () => {
  it("reports a contract no index table names", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001", []);
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "05_Contracts.md"),
        ["# 05 Contracts", "", "## API Contracts", "", "0 items", ""].join("\n"),
        "utf-8",
      );

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-034");

      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toEqual(["CON-API-0001"]);
      expect(issue?.file).toContain("api-0001-sample.yaml");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not let a Short ID stand in for a blank Declared ID", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001", []);
      // `API-001` normalizes to `CON-API-0001`, so counting the short form as
      // coverage hid the blank `Declared ID`: the row checks skip a row they
      // cannot read an id from, leaving the broken row with no finding at all.
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "05_Contracts.md"),
        [
          "# 05 Contracts",
          "",
          "## API Contracts",
          "",
          "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
          "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
          "| API-001 | /api/orders | | `.qfai/contracts/api/api-0001-sample.yaml` | - | create draft |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateContractReferences(root, defaultConfig);
      const issue = issues.find((item) => item.code === "QFAI-CONTRACT-034");

      expect(issue?.severity).toBe("warning");
      expect(issue?.refs).toEqual(["CON-API-0001"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not let one row stand in for the two contracts it names", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ref-"));
    try {
      await seedLayered(root);
      await seedApiContract(root, "CON-API-0001", []);
      await writeFile(
        path.join(root, ".qfai", "contracts", "api", "api-0002-sample.yaml"),
        ["# QFAI-CONTRACT-ID: CON-API-0002", 'openapi: "3.1.0"', "x-qfai-depends-on: []", ""].join(
          "\n",
        ),
        "utf-8",
      );
      // Crediting both ids left the pair with no unique row anywhere and no
      // finding: `QFAI-CONTRACT-030` stays silent because both exist, and the
      // row check skips the row on the same `size !== 1` test.
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "05_Contracts.md"),
        [
          "# 05 Contracts",
          "",
          "## API Contracts",
          "",
          "| Short ID | Router | Declared ID | File | Depends On | Purpose |",
          "| -------- | ------ | ----------- | ---- | ---------- | ------- |",
          "| - | /api/orders | CON-API-0001, CON-API-0002 | `.qfai/contracts/api/` | - | create draft |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateContractReferences(root, defaultConfig);

      expect(issues.some((item) => item.code === "QFAI-CONTRACT-030")).toBe(false);
      expect(
        issues
          .filter((item) => item.code === "QFAI-CONTRACT-034")
          .flatMap((item) => item.refs ?? [])
          .sort(),
      ).toEqual(["CON-API-0001", "CON-API-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { defaultConfig } from "../../src/core/config.js";
import { declaredContractId } from "../../src/core/contractsDecl.js";
import { writeBusinessFlowReports } from "../../src/core/specPackReport.js";
import { parseContractRules } from "../../src/core/storyTree/contractRules.js";
import { contractNumber, isContractId, nextId } from "../../src/core/storyTree/ids.js";
import {
  buildStoryTreeModel,
  nextStoryTreeId,
  readStoryTreeModel,
} from "../../src/core/storyTree/tree.js";
import { validateStoryTreeContractReferences } from "../../src/core/validators/contractReferences.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import { validateDbContractApplyOrder } from "../../src/core/validators/dbContractApplyOrder.js";
import { validateStoryTreeStructureModel } from "../../src/core/validators/storyTreeStructure.js";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
const roots: string[] = [];
const spec = ".qfai/spec";
const contracts = `${spec}/03_contract`;
const story = `${spec}/02_business-flow/business-flow-0001/user-story-0001-0001`;
const check = `${contracts}/cli/cli-0003-check.md`;

/** A path to a source, test or script file, as a contract would write it. */
const IMPLEMENTATION_PATH =
  /(?<![\w./-])(?:packages\/[\w-]+\/)?(?:src|tests?|scripts)\/[\w./-]+\.(?:[cm]?[jt]sx?|sh)\b/g;

/** Every file under this repository's contract kind directories. */
async function contractFiles(): Promise<string[]> {
  const base = path.join(REPO_ROOT, ".qfai/spec/03_contract");
  const kinds = ["cli", "api", "db", "ui"];
  const listed = await Promise.all(
    kinds.map(async (kind) => {
      const entries = await readdir(path.join(base, kind), {
        recursive: true,
        withFileTypes: true,
      }).catch(() => []);
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(entry.parentPath, entry.name));
    }),
  );
  return listed.flat();
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function rulesTable(section: string, rows: string[], extra = ""): string {
  return [
    `## ${section}`,
    "",
    extra,
    "| BR-ID | Statement | Examples |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function contract(h1: string, rows: string[], extra = ""): string {
  return `# ${h1}\n\n${rulesTable("Business rules", rows, extra)}`;
}

function tree(contractText: string, decisions = ""): Map<string, string> {
  const files = new Map([
    [
      `${story}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0001-01\nScenario: Check\n  Given a project\n  When it is checked\n  Then it passes\n```\n",
    ],
    [
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | project | passes |\n",
    ],
    [check, contractText],
  ]);
  if (decisions) {
    files.set(
      `${spec}/decisions.md`,
      `| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n${decisions}\n`,
    );
  }
  return files;
}

function ruleFindings(files: Map<string, string>): string[] {
  return validateStoryTreeStructureModel(buildStoryTreeModel(files))
    .filter((entry) => entry.code === "QFAI-STORY-005")
    .map((entry) => entry.message);
}

async function put(root: string, relative: string, body: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
}

const INDEX_HEADER = [
  "# Contracts",
  "",
  "## Contract Index",
  "",
  "| ID | Title | File | Depends On | Reconciled With | Purpose |",
  "| --- | --- | --- | --- | --- | --- |",
];

function indexRow(id: string, file: string): string {
  return `| ${id} | Title | \`${file}\` | - | - | Purpose. |`;
}

async function contractTree(rows: string[], files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-ids-"));
  roots.push(root);
  await put(root, `${contracts}/contracts.md`, [...INDEX_HEADER, ...rows, ""].join("\n"));
  for (const [relative, body] of Object.entries(files)) {
    await put(root, `${contracts}/${relative}`, body);
  }
  return root;
}

async function indexFindings(root: string): Promise<string[]> {
  const model = await readStoryTreeModel(root, defaultConfig);
  const issues = await validateStoryTreeContractReferences(root, defaultConfig, model);
  return issues.map((entry) => `${entry.code} ${entry.message}`);
}

const CLI_CONTRACT = "# CLI-0001: Check\n\n## Ownership boundary\n\nChecks a project.\n";
const API_CONTRACT = "# QFAI-CONTRACT-ID: API-0002\nopenapi: 3.1.0\nx-qfai-depends-on: [DB-0004]\n";
const DB_CONTRACT =
  "-- QFAI-CONTRACT-ID: DB-0004\n-- Depends on: -\nCREATE TABLE orders (id int);\n";

describe("contract IDs and contract-scoped business rules", () => {
  // QFAI:AC-0001-0008-04
  it("allocates the next BR of a contract under that contract's number", () => {
    // QFAI:EX-0001-0008-12
    const files = tree(
      contract("CLI-0003: Check", [
        "| BR-0003-0001 | First | EX-0001-0001-01 |",
        "| BR-0003-0002 | Second | EX-0001-0001-01 |",
      ]),
      "| DEC-0001 | Retired BR-0003-0004 | Keep its ID reserved | DONE |",
    );
    const model = buildStoryTreeModel(files);
    expect(model.contracts).toEqual([{ id: "CLI-0003", file: check }]);
    expect(nextStoryTreeId(model, "BR", "CLI-0003")).toBe("BR-0003-0005");
    expect(nextStoryTreeId(model, "BR", "API-0007")).toBe("BR-0007-0001");
    expect(() => nextId("BR", [], "CON-UI-0001")).toThrow(TypeError);
    const suffixed = buildStoryTreeModel(
      tree(
        contract("CLI-0003: Check", ["| BR-0003-0001 | First | EX-0001-0001-01 |"]),
        "| DEC-0001 | Notes on BR-0003-0009copy | None | DONE |",
      ),
    );
    expect(nextStoryTreeId(suffixed, "BR", "CLI-0003")).toBe("BR-0003-0002");
  });

  // QFAI:AC-0001-0008-04
  it("reports a contract-scoped BR that carries another contract's number", () => {
    // QFAI:EX-0001-0008-13
    expect(
      ruleFindings(tree(contract("CLI-0003: Check", ["| BR-0003-0001 | Own | EX-0001-0001-01 |"]))),
    ).toEqual([]);
    expect(
      ruleFindings(
        tree(contract("CLI-0003: Check", ["| BR-0002-0001 | Other | EX-0001-0001-01 |"])),
      ),
    ).toEqual([
      expect.stringContaining(
        `BR-0002-0001 does not carry the number of its contract CLI-0003 in ${check}`,
      ),
    ]);
    expect(
      ruleFindings(tree(contract("Check", ["| BR-0003-0001 | Undeclared | EX-0001-0001-01 |"]))),
    ).toEqual([
      expect.stringContaining(
        "BR-0003-0001 does not carry the number of its contract (no contract ID)",
      ),
    ]);
  });

  // QFAI:AC-0001-0057-07
  it("reads a Business rules table with its statement and examples", () => {
    // QFAI:EX-0001-0057-10
    const text = contract("CLI-0003: Check", [
      "| BR-0003-0001 | Check the project | EX-0001-0001-01 |",
    ]);
    expect(parseContractRules(check, text)).toEqual({
      rules: [
        {
          id: "BR-0003-0001",
          statement: "Check the project",
          examples: ["EX-0001-0001-01"],
          file: check,
        },
      ],
      errors: [],
    });
    expect(ruleFindings(tree(text))).toEqual([]);
  });

  // QFAI:AC-0001-0057-07
  it("rejects a Business rules table without the Examples column", () => {
    // QFAI:EX-0001-0057-11
    const columns =
      "# CLI-0003: Check\n\n## Business rules\n\n| BR-ID | Statement |\n| --- | --- |\n| BR-0003-0001 | Two columns |\n";
    expect(ruleFindings(tree(columns))).toContain(`Invalid Business rules columns in ${check}`);
  });

  // QFAI:AC-0001-0057-07
  it("reads a Business rules heading that closes with a run of hashes", () => {
    // QFAI:EX-0001-0057-12
    const text =
      "# CLI-0003: Check\n\n## Business rules ##\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0003-0001 | Check the project | EX-0001-0001-01 |\n";
    expect(parseContractRules(check, text)).toMatchObject({
      rules: [{ id: "BR-0003-0001", examples: ["EX-0001-0001-01"] }],
      errors: [],
    });
    expect(ruleFindings(tree(text))).toEqual([]);
  });

  // QFAI:AC-0001-0054-03
  it("reads the index under a Contract Index heading that closes with hashes", async () => {
    // QFAI:EX-0001-0054-06
    const root = await contractTree([], { "api/api-0002-orders.yaml": API_CONTRACT });
    await put(
      root,
      `${contracts}/contracts.md`,
      [
        "# Contracts",
        "",
        "## Example",
        "",
        ...INDEX_HEADER.slice(4),
        indexRow("API-0009", "api/api-0009-example.yaml"),
        "",
        "## Contract Index ##",
        "",
        ...INDEX_HEADER.slice(4),
        indexRow("API-0002", "api/api-0002-orders.yaml"),
        "",
      ].join("\n"),
    );
    expect(await indexFindings(root)).toEqual([]);
  });

  // QFAI:AC-0001-0054-04
  it("reports a Markdown file under api/ once and counts it as no contract", async () => {
    // QFAI:EX-0001-0054-07
    const refunds = "api/api-0003-refunds.md";
    const root = await contractTree([indexRow("API-0003", refunds)], {
      [refunds]: contract("API-0003: Refunds", ["| BR-0003-0001 | Refund | EX-0001-0001-01 |"]),
    });
    const empty = (await validateContracts(root, defaultConfig))
      .filter((entry) => entry.code === "QFAI-CONTRACT-000")
      .map((entry) => entry.rule);
    expect(empty.sort()).toEqual([
      "contracts.api.files",
      "contracts.db.files",
      "contracts.ui.files",
    ]);
    expect(await indexFindings(root)).toEqual([
      expect.stringMatching(
        /^QFAI-CONTRACT-034 .*api-0003-refunds\.md is Markdown, which is not a contract: api\/ holds OpenAPI YAML or JSON contracts$/,
      ),
    ]);
    const model = await readStoryTreeModel(root, defaultConfig);
    expect(model.contracts).toEqual([]);
    expect(model.rules).toEqual([]);
  });

  // QFAI:AC-0001-0066-01
  it("names each contract node of a flow graph by the contract ID its file declares", async () => {
    // QFAI:EX-0001-0066-03
    const root = await contractTree([], {
      "cli/cli-0003-check.md": contract("CLI-0003: Check", [
        "| BR-0003-0001 | Check the project | EX-0001-0001-01 |",
      ]),
      "api/api-0002-orders.yaml": `${API_CONTRACT}x-qfai-rules:\n  - id: BR-0002-0001\n    statement: Accept an order\n    examples: [EX-0001-0001-01]\n`,
      "tech.md": `# Tech\n\n${rulesTable("Business rules", ["| BR-0009-0001 | Stack | EX-0001-0001-01 |"])}`,
    });
    for (const [relative, body] of tree("")) {
      if (relative !== check) await put(root, relative, body);
    }
    await put(
      root,
      `${spec}/02_business-flow/business-flow-0001/business-flow.md`,
      "# BF-0001: Flow\n",
    );
    await put(root, `${story}/01_User-story.md`, "# US-0001-0001: Check\n");
    await writeBusinessFlowReports(root, defaultConfig);
    const graph = JSON.parse(
      await readFile(
        path.join(root, ".qfai/report/business-flow-0001/traceability-graph.json"),
        "utf8",
      ),
    ) as { nodes: Array<{ id: string; type: string }>; edges: Array<Record<string, string>> };
    expect(
      new Set(graph.nodes.filter((node) => node.type === "CON").map((node) => node.id)),
    ).toEqual(new Set(["API-0002", "CLI-0003", `${contracts}/tech.md`]));
    expect(graph.edges.filter((edge) => edge.relation === "BR_TO_CON")).toEqual([
      { from: "BR-0002-0001", to: "API-0002", relation: "BR_TO_CON" },
      { from: "BR-0003-0001", to: "CLI-0003", relation: "BR_TO_CON" },
      { from: "BR-0009-0001", to: `${contracts}/tech.md`, relation: "BR_TO_CON" },
    ]);
  });

  // QFAI:AC-0001-0054-03
  it("accepts an index whose rows agree with each contract's file and declaration", async () => {
    // QFAI:EX-0001-0054-03
    const files = {
      "cli/cli-0001-check.md": CLI_CONTRACT,
      "api/api-0002-orders.yaml": API_CONTRACT,
      "db/db-0004-orders.sql": DB_CONTRACT,
    };
    const agreeing = [
      indexRow("CLI-0001", `${contracts}/cli/cli-0001-check.md`),
      indexRow("API-0002", "api/api-0002-orders.yaml"),
      indexRow("DB-0004", `${contracts}/db/db-0004-orders.sql`),
    ];
    const root = await contractTree(agreeing, files);
    expect(await indexFindings(root)).toEqual([]);
    const legacyChecks = (await validateContracts(root, defaultConfig)).filter((entry) =>
      /^QFAI-CONTRACT-01[0-5]$/.test(entry.code),
    );
    expect(legacyChecks).toEqual([]);

    const disagreeing = await contractTree(
      [indexRow("API-0003", "api/api-0002-orders.yaml"), agreeing[2] ?? ""],
      files,
    );
    const findings = await indexFindings(disagreeing);
    expect(findings).toEqual([
      expect.stringMatching(
        /^QFAI-CONTRACT-034 Contract file .*api-0002-orders\.yaml is listed as API-0003$/,
      ),
      expect.stringMatching(/^QFAI-CONTRACT-034 Contract file .*cli-0001-check\.md has no row in /),
    ]);
  });

  // QFAI:AC-0001-0054-03
  it("reports a misnamed or undeclared contract, a wrong kind and a shared number", async () => {
    // QFAI:EX-0001-0054-04
    const root = await contractTree(
      [
        indexRow("CLI-0001", "cli/check.md"),
        indexRow("API-0002", "api/api-0002-orders.yaml"),
        indexRow("-", "ui/ui-0005-home.yaml"),
        indexRow("CLI-0002", "cli/cli-0002-moved.md"),
        indexRow("DB-0001", "db/db-0001-orders.sql"),
      ],
      {
        "cli/check.md": CLI_CONTRACT,
        "api/api-0002-orders.yaml": "# QFAI-CONTRACT-ID: DB-0002\nopenapi: 3.1.0\n",
        "ui/ui-0005-home.yaml": "screens: []\n",
        "db/db-0001-orders.sql": "-- QFAI-CONTRACT-ID: DB-0001\nCREATE TABLE orders (id int);\n",
      },
    );
    const findings = await indexFindings(root);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/check\.md is not named cli-NNNN-<slug> after its contract ID$/),
        expect.stringMatching(
          /api-0002-orders\.yaml declares DB-0002, whose kind is not API, and is listed as API-0002$/,
        ),
        expect.stringMatching(/ui-0005-home\.yaml declares no contract ID, and is listed as -$/),
        expect.stringMatching(
          /lists CLI-0002 with cli\/cli-0002-moved\.md, which is not a contract file$/,
        ),
        expect.stringMatching(
          /^QFAI-CONTRACT-034 Contract number 0001 is declared by more than one contract: /,
        ),
      ]),
    );
    expect(findings).toHaveLength(5);
  });

  // QFAI:AC-0001-0054-03
  it("reads no contract ID of a kind other than CLI, API, DB and UI", async () => {
    // QFAI:EX-0001-0054-11
    const yaml = "# QFAI-CONTRACT-ID: DESIGN-0006\nscreens: []\n";
    const markdown = "# DESIGN-0007: Theme\n";
    expect(isContractId("DESIGN-0006")).toBe(false);
    expect(contractNumber("DESIGN-0006")).toBeNull();
    expect(declaredContractId("ui/ui-0006-tokens.yaml", yaml)).toBeNull();
    expect(declaredContractId("cli/cli-0007-theme.md", markdown)).toBeNull();
    const root = await contractTree(
      [
        indexRow("DESIGN-0006", "ui/ui-0006-tokens.yaml"),
        indexRow("DESIGN-0007", "cli/cli-0007-theme.md"),
      ],
      { "ui/ui-0006-tokens.yaml": yaml, "cli/cli-0007-theme.md": markdown },
    );
    const findings = await indexFindings(root);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /ui-0006-tokens\.yaml declares no contract ID, and is listed as DESIGN-0006$/,
        ),
        expect.stringMatching(
          /cli-0007-theme\.md declares no contract ID, and is listed as DESIGN-0007$/,
        ),
      ]),
    );
    expect(findings).toHaveLength(2);
  });
});

describe("the new contract IDs in the checks that read the old ones", () => {
  // QFAI:AC-0001-0057-07
  it("reads the one rendered Business rules table", () => {
    const fenced = contract(
      "CLI-0003: Check",
      ["| BR-0003-0001 | Check the project | EX-0001-0001-01 |"],
      "```md\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0003-0009 | Example | EX-0001-0001-01 |\n```\n",
    );
    expect(parseContractRules(check, fenced)).toMatchObject({
      rules: [{ id: "BR-0003-0001" }],
      errors: [],
    });
    const twoTables = `${contract("CLI-0003: Check", ["| BR-0003-0001 | First | EX-0001-0001-01 |"])}\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0003-0002 | Second | EX-0001-0001-01 |\n`;
    expect(parseContractRules(check, twoTables).errors).toEqual([
      `More than one Business rules table in ${check}`,
    ]);
    const commentedSection = `${contract("CLI-0003: Check", ["| BR-0003-0001 | Real | EX-0001-0001-01 |"])}\n<!--\n${rulesTable("Business rules", ["| BR-0003-0009 | Hidden | EX-0001-0001-01 |"])}-->\n`;
    expect(parseContractRules(check, commentedSection)).toMatchObject({
      rules: [{ id: "BR-0003-0001" }],
      errors: [],
    });
    const twoSections = `${contract("CLI-0003: Check", ["| BR-0003-0001 | First | EX-0001-0001-01 |"])}\n${rulesTable("Business rules", ["| BR-0003-0002 | Second | EX-0001-0001-01 |"])}`;
    expect(parseContractRules(check, twoSections).errors).toContain(
      `More than one ## Business rules section in ${check}`,
    );
  });

  it("reads a Markdown contract's ID from its first rendered H1", () => {
    expect(
      declaredContractId(
        "api/api-0002-orders.md",
        "<!--\n# API-0003: Old title\n-->\n\n# API-0002: Orders\n",
      ),
    ).toBe("API-0002");
  });

  // QFAI:AC-0001-0054-03
  it("reads the table under Contract Index, not an earlier one with the same columns", async () => {
    const root = await contractTree([], { "api/api-0002-orders.yaml": API_CONTRACT });
    await put(
      root,
      `${contracts}/contracts.md`,
      [
        "# Contracts",
        "",
        "## Example",
        "",
        ...INDEX_HEADER.slice(4),
        indexRow("API-0009", "api/api-0009-example.yaml"),
        "",
        "  ## Contract Index",
        "",
        ...INDEX_HEADER.slice(4),
        indexRow("API-0002", "api/api-0002-orders.yaml"),
        "",
        "### More",
        "",
        ...INDEX_HEADER.slice(4),
        indexRow("API-0008", "api/api-0008-missing.yaml"),
        "",
      ].join("\n"),
    );
    expect(await indexFindings(root)).toEqual([
      expect.stringMatching(
        /lists API-0008 with api\/api-0008-missing\.yaml, which is not a contract file$/,
      ),
    ]);
  });

  // QFAI:AC-0001-0054-03
  it("reads an index whose delimiter row has fewer than three hyphens", async () => {
    // QFAI:EX-0001-0054-05
    const root = await contractTree([], { "api/api-0002-orders.yaml": API_CONTRACT });
    await put(
      root,
      `${contracts}/contracts.md`,
      [
        ...INDEX_HEADER.slice(0, 5),
        "| -- | :-- | --: | :-: | - | -- |",
        indexRow("API-0002", "api/api-0002-orders.yaml"),
        "",
      ].join("\n"),
    );
    expect(await indexFindings(root)).toEqual([]);
  });

  it("checks the apply order of a DB-NNNN contract", async () => {
    const root = await contractTree([], {
      "db/db-0004-orders.sql": DB_CONTRACT,
      "db/db-0005-lines.sql":
        "-- Depends on: -\n-- See DB-0004 for orders.\n-- QFAI-CONTRACT-ID: DB-0005\nCREATE TABLE lines (o int REFERENCES orders (id));\n",
    });
    const files = ["db/db-0004-orders.sql", "db/db-0005-lines.sql"].map((file) =>
      path.join(root, contracts, file),
    );
    const issues = await validateDbContractApplyOrder(root, files);
    expect(issues.map((entry) => `${entry.code} ${entry.refs?.join(",") ?? ""}`)).toEqual([
      expect.stringMatching(/^QFAI-CONTRACT-036 .*DB-0004/),
    ]);
  });

  // QFAI:AC-0001-0054-05
  it("leaves a db contract without one DB-NNNN declaration out of the apply order", async () => {
    // QFAI:EX-0001-0054-08
    const lines = [
      "-- QFAI-CONTRACT-ID: DB-0004",
      "-- Depends on: -",
      "CREATE TABLE lines (o int REFERENCES orders (id), a int REFERENCES archive (id));",
      "",
    ].join("\n");
    const archive =
      "-- QFAI-CONTRACT-ID: API-0003\n-- QFAI-CONTRACT-ID: DB-0002\nCREATE TABLE archive (id int);\n";
    const applyOrder = async (ordersId: string): Promise<string[]> => {
      const root = await contractTree([], {
        "db/db-0001-orders.sql": `-- QFAI-CONTRACT-ID: ${ordersId}\nCREATE TABLE orders (id int);\n`,
        "db/db-0002-archive.sql": archive,
        "db/db-0004-lines.sql": lines,
      });
      return (await validateContracts(root, defaultConfig))
        .filter((entry) => entry.code === "QFAI-CONTRACT-036")
        .map((entry) => `${entry.file} ${entry.message}`);
    };

    expect(await applyOrder("API-0001")).toEqual([]);
    const findings = await applyOrder("DB-0001");
    expect(findings).toEqual([expect.stringMatching(/db-0004-lines\.sql .*DB-0001 \(orders\)\.$/)]);
    expect(findings.join("\n")).not.toContain("archive");
  });

  // QFAI:AC-0001-0054-04
  it("counts API-NNNN and DB-NNNN contracts, not Markdown files, in ATDD coverage", async () => {
    // QFAI:EX-0001-0054-09
    const root = await contractTree([], {
      "api/api-0002-orders.yaml": API_CONTRACT,
      "db/db-0004-orders.sql": DB_CONTRACT,
    });
    await put(root, `${contracts}/api/api-0003-refunds.md`, "# API-0003: Refunds\n");
    await put(root, `${contracts}/db/db-0005-lines.md`, "# DB-0005: Lines\n");
    await put(
      root,
      "tests/api/orders.test.ts",
      "// QFAI:API-0002\n// QFAI:DB-0004\n// QFAI:API-0003-copy\n// QFAI:API-0003-0001\n",
    );
    await put(root, "tests/atdd/malformed.test.ts", "// QFAI:API-0003-copy\n");
    await put(root, "tests/atdd/annotated.test.ts", "// QFAI:API-0003\n");
    const result = await evaluateAtddCodeTraceability(root, defaultConfig);
    expect([...result.activeApiContractIds].sort()).toEqual(["API-0002"]);
    expect([...result.activeDbContractIds].sort()).toEqual(["DB-0004"]);
    expect([...result.refs.api.keys()]).toEqual(["API-0002"]);
    expect(result.skippedTestFiles.map((file) => path.basename(file))).toEqual([
      "annotated.test.ts",
    ]);
  });
});

describe("a contract names no implementation file", () => {
  // QFAI:AC-0001-0009-04
  // QFAI:EX-0001-0009-17
  it("keeps source, test and script paths out of the contracts and says so", async () => {
    const files = await contractFiles();
    expect(files.length).toBeGreaterThan(0);
    const named = await Promise.all(
      files.map(async (file) =>
        [...(await readFile(file, "utf-8")).matchAll(IMPLEMENTATION_PATH)].map(
          ([match]) => `${path.relative(REPO_ROOT, file)}: ${match}`,
        ),
      ),
    );
    expect(named.flat()).toEqual([]);
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const rules = await readFile(
        path.join(
          REPO_ROOT,
          tree,
          "assistant/skill/qfai-sdd/references/contract-artifact-rules.md",
        ),
        "utf-8",
      );
      expect(rules.replace(/\s+/g, " ")).toContain("A contract never names an implementation file");
    }
  });
});

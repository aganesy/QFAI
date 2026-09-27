import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { defaultConfig } from "../../src/core/config.js";
import { declaredContractId } from "../../src/core/contractsDecl.js";
import { parseContractRules } from "../../src/core/storyTree/contractRules.js";
import { nextId } from "../../src/core/storyTree/ids.js";
import {
  buildStoryTreeModel,
  nextStoryTreeId,
  readStoryTreeModel,
} from "../../src/core/storyTree/tree.js";
import { validateStoryTreeContractReferences } from "../../src/core/validators/contractReferences.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import { validateDbContractApplyOrder } from "../../src/core/validators/dbContractApplyOrder.js";
import { validateStoryTreeStructureModel } from "../../src/core/validators/storyTreeStructure.js";

const roots: string[] = [];
const spec = ".qfai/spec";
const contracts = `${spec}/03_contract`;
const story = `${spec}/02_business-flow/business-flow-0001/user-story-0001-0001`;
const check = `${contracts}/cli/cli-0003-check.md`;

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
    expect(nextId("BR", ["BR-0003-0001", "BR-0007"])).toBe("BR-0008");
    expect(() => nextId("BR", [], "CON-UI-0001")).toThrow(TypeError);
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
  it("reads a Business rules table as the Rules table is read", () => {
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
      refs: [],
      errors: [],
    });
    expect(ruleFindings(tree(text))).toEqual([]);
    const legacy = `# Check\n\n${rulesTable("Rules", ["| BR-0001 | Legacy | EX-0001-0001-01 |"], "Rule refs: BR-0001")}`;
    expect(parseContractRules(check, legacy).rules.map(({ id }) => id)).toEqual(["BR-0001"]);
    expect(parseContractRules(check, legacy).refs).toEqual(["BR-0001"]);
  });

  // QFAI:AC-0001-0057-07
  it("rejects a Rule refs line under Business rules", () => {
    // QFAI:EX-0001-0057-11
    const text = contract(
      "CLI-0003: Check",
      ["| BR-0003-0001 | Check the project | EX-0001-0001-01 |"],
      "Rule refs: BR-0003-0001",
    );
    expect(parseContractRules(check, text).refs).toEqual([]);
    expect(ruleFindings(tree(text))).toEqual([
      `A Rule refs line is not allowed under ## Business rules in ${check}`,
    ]);
    const columns =
      "# CLI-0003: Check\n\n## Business rules\n\n| BR-ID | Statement |\n| --- | --- |\n| BR-0003-0001 | Two columns |\n";
    expect(parseContractRules(check, columns).errors).toEqual([
      `Invalid Business rules columns in ${check}`,
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
        indexRow("DESIGN-0001", "design/design-0001-tokens.yaml"),
      ],
      {
        "cli/check.md": CLI_CONTRACT,
        "api/api-0002-orders.yaml": "# QFAI-CONTRACT-ID: DB-0002\nopenapi: 3.1.0\n",
        "ui/ui-0005-home.yaml": "screens: []\n",
        "design/design-0001-tokens.yaml": "# QFAI-CONTRACT-ID: DESIGN-0001\ntokens: {}\n",
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
    const commentedRefs = contract(
      "CLI-0003: Check",
      ["| BR-0003-0001 | Check the project | EX-0001-0001-01 |"],
      "```md\nRule refs: BR-0001\n```\n",
    );
    expect(parseContractRules(check, commentedRefs).errors).toEqual([]);
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

  it("declares nothing when a file mixes a new and an old declaration", () => {
    expect(declaredContractId("cli/cli-0001-check.yaml", "# QFAI-CONTRACT-ID: CLI-0001\n")).toBe(
      "CLI-0001",
    );
    expect(
      declaredContractId(
        "cli/cli-0001-check.yaml",
        "# QFAI-CONTRACT-ID: CLI-0001\n# QFAI-CONTRACT-ID: CON-API-0002\n",
      ),
    ).toBeNull();
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
        ...INDEX_HEADER.slice(2),
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

  it("reads a new ID in an index with the old columns", async () => {
    const root = await contractTree([], { "api/api-0002-orders.yaml": API_CONTRACT });
    await put(
      root,
      `${contracts}/contracts.md`,
      "# Contracts\n\n| Declared ID | File |\n| --- | --- |\n| API-0002 | `api/api-0002-orders.yaml` |\n",
    );
    expect(await indexFindings(root)).toEqual([]);
    await put(root, `${contracts}/cli/cli-0002-check.md`, "# CLI-0002: Check\n");
    await put(
      root,
      `${contracts}/contracts.md`,
      "# Contracts\n\n| Declared ID | File |\n| --- | --- |\n| API-0002 | `api/api-0002-orders.yaml` |\n| CLI-0002 | `cli/cli-0002-check.md` |\n",
    );
    expect(await indexFindings(root)).toEqual([
      expect.stringMatching(
        /^QFAI-CONTRACT-034 Contract number 0002 is declared by more than one contract: /,
      ),
    ]);
    await put(root, `${contracts}/api/api-0003-refunds.md`, "# API-0003: Refunds\n");
    expect(await indexFindings(root)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^QFAI-CONTRACT-034 Contract API-0003 is not listed with its file in .*api-0003-refunds\.md$/,
        ),
      ]),
    );
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

  it("counts API-NNNN and DB-NNNN contracts and annotations in ATDD coverage", async () => {
    const root = await contractTree([], {
      "api/api-0002-orders.yaml": API_CONTRACT,
      "db/db-0004-orders.sql": DB_CONTRACT,
    });
    await put(root, `${contracts}/api/api-0003-refunds.md`, "# API-0003: Refunds\n");
    await put(
      root,
      "tests/api/orders.test.ts",
      "// QFAI:API-0002\n// QFAI:DB-0004\n// QFAI:API-0003-copy\n// QFAI:API-0003-0001\n",
    );
    await put(root, "tests/atdd/malformed.test.ts", "// QFAI:API-0003-copy\n");
    await put(root, "tests/atdd/annotated.test.ts", "// QFAI:API-0003\n");
    const result = await evaluateAtddCodeTraceability(root, defaultConfig);
    expect([...result.activeApiContractIds].sort()).toEqual(["API-0002", "API-0003"]);
    expect([...result.activeDbContractIds]).toEqual(["DB-0004"]);
    expect([...result.refs.api.keys()]).toEqual(["API-0002"]);
    expect(result.skippedTestFiles.map((file) => path.basename(file))).toEqual([
      "annotated.test.ts",
    ]);
  });
});

import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { loadConfig } from "../../../src/core/config.js";
import { validateDocumentSchema } from "../../../src/core/validators/documentSchema.js";
import {
  executePlannedStep,
  type MigrationContext,
  type MigrationStep,
} from "../../../src/migration/specToStory/harness.js";
import { step03 } from "../../../src/migration/specToStory/step03MoveCatalog.js";
import { step04 } from "../../../src/migration/specToStory/step04RenumberIds.js";
import { step07 } from "../../../src/migration/specToStory/step07RulesToContracts.js";
import { step08 } from "../../../src/migration/specToStory/step08RewriteAnnotations.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/migration-spec-to-story/contract-ids",
);
const CONTRACTS = ".qfai/spec/03_contract";
const EVIDENCE = ".qfai/evidence/migration-spec-to-story";
const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function text(root: string, relative: string): Promise<string> {
  return readFile(path.join(root, relative), "utf8");
}

async function files(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"),
    )
    .sort();
}

/** A project after steps 1 and 2 holding the fixture's 1.x contracts and old index. */
async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migrate-contracts-"));
  roots.push(root);
  await put(
    root,
    "qfai.config.yaml",
    'paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n  testsDir: tests\nvalidation:\n  traceability:\n    testFileGlobs:\n      - "tests/**/*.test.ts"\n',
  );
  await cp(path.join(FIXTURE, "contracts"), path.join(root, CONTRACTS), { recursive: true });
  await cp(
    path.join(FIXTURE, "05_Contracts.md"),
    path.join(root, ".qfai/spec/_policies/05_Contracts.md"),
  );
  return root;
}

/** One spec pack whose story, rule and plan name old IDs. */
async function putPack(root: string, story: string, rule: string, contract: string) {
  const pack = ".qfai/spec/spec-0001";
  await put(
    root,
    `${pack}/01_Spec.md`,
    "# Spec\n\n- Status: active\n\n## Scope\n\n- In: Orders.\n",
  );
  await put(
    root,
    `${pack}/02_User-stories.md`,
    `# Stories\n\n## US-0001-0001: Place an order\n\n${story}\n`,
  );
  await put(
    root,
    `${pack}/03_Acceptance-Criteria.md`,
    "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Place one order\n  Given a cart\n  When the order is placed\n  Then it is accepted\n```\n",
  );
  await put(
    root,
    `${pack}/04_Business-Rules.md`,
    `# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | ${rule} |\n`,
  );
  await put(
    root,
    `${pack}/05_Examples.md`,
    "# Examples\n\n| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | one item | accepted |\n",
  );
  await put(
    root,
    `${pack}/06_Test-Cases.md`,
    "# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n",
  );
  await put(
    root,
    ".qfai/spec/_policies/04_Business-Flow.md",
    "# Business Flow\n\n```mermaid\nflowchart LR\n  Cart --> Order\n```\n",
  );
  await put(
    root,
    `${EVIDENCE}/plan.yaml`,
    `flows:\n  - title: Order flow\n    from: _policies/04_Business-Flow.md\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: ${contract}\n`,
  );
}

async function context(root: string): Promise<MigrationContext> {
  const { config, issues } = await loadConfig(root);
  expect(issues).toEqual([]);
  return {
    root,
    specsDir: path.resolve(root, config.paths.specsDir),
    contractsDir: path.resolve(root, config.paths.contractsDir),
    config,
  };
}

async function run(step: MigrationStep, root: string, dryRun = false) {
  const output: string[] = [];
  const errors: string[] = [];
  const code = await executePlannedStep(step, await context(root), dryRun, {
    stdout: { write: (value) => output.push(value) },
    stderr: { write: (value) => errors.push(value) },
  });
  return { code, output: output.join(""), errors: errors.join("") };
}

function forAPerson(report: string): string[] {
  const section = report.split(/\r?\n(?=## )/).find((part) => part.startsWith("## For a person"));
  return (section ?? "")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

describe("migration contract IDs", () => {
  // QFAI:AC-0004-0006-04
  it("numbers every old contract across kinds, so a colliding old number takes a new one", async () => {
    // QFAI:EX-0004-0006-12
    const root = await project();
    expect((await run(step03, root)).code).toBe(3);
    expect(await files(path.join(root, CONTRACTS))).toEqual([
      "api/api-0002-orders.yaml",
      "cli/cli-0001-orders.md",
      "contracts.md",
      "db/db-0003-orders.sql",
      "ui/ui-0004-receipt.yaml",
    ]);
    expect(JSON.parse(await text(root, `${EVIDENCE}/contract-map.json`))).toEqual({
      contracts: {
        "cli/orders.md": { id: "CLI-0001", path: "cli/cli-0001-orders.md" },
        "api/api-0001-orders.yaml": {
          id: "API-0002",
          path: "api/api-0002-orders.yaml",
          old: "CON-API-0001",
        },
        "db/db-0001-orders.sql": {
          id: "DB-0003",
          path: "db/db-0003-orders.sql",
          old: "CON-DB-0001",
        },
        "ui/receipt.yaml": { id: "UI-0004", path: "ui/ui-0004-receipt.yaml" },
      },
    });

    const keeper = await project();
    await rm(path.join(keeper, CONTRACTS, "cli"), { recursive: true });
    await run(step03, keeper);
    expect(await files(path.join(keeper, CONTRACTS))).toEqual([
      "api/api-0001-orders.yaml",
      "contracts.md",
      "db/db-0002-orders.sql",
      "ui/ui-0003-receipt.yaml",
    ]);
  });

  it("declares each new ID and rewrites the old IDs a dependency names", async () => {
    // QFAI:EX-0004-0006-13
    const root = await project();
    await run(step03, root);
    const api = await text(root, `${CONTRACTS}/api/api-0002-orders.yaml`);
    expect(api.split("\n").slice(0, 3)).toEqual([
      "# QFAI-CONTRACT-ID: API-0002",
      "openapi: 3.1.0",
      "x-qfai-depends-on: [DB-0003]",
    ]);
    expect(await text(root, `${CONTRACTS}/db/db-0003-orders.sql`)).toBe(
      "-- QFAI-CONTRACT-ID: DB-0003\n-- Depends on: -\nCREATE TABLE orders (id TEXT PRIMARY KEY);\n",
    );
    expect((await text(root, `${CONTRACTS}/cli/cli-0001-orders.md`)).split("\n")[0]).toBe(
      "# CLI-0001: Orders command",
    );
    expect(await text(root, `${CONTRACTS}/ui/ui-0004-receipt.yaml`)).toMatch(
      /^# QFAI-CONTRACT-ID: UI-0004\nscreens:\n/,
    );
  });

  it("writes the contract index in its table shape and lists the old sections for a person", async () => {
    // QFAI:EX-0004-0006-14
    const root = await project();
    const result = await run(step03, root);
    expect(result.code).toBe(3);
    expect(await text(root, `${CONTRACTS}/contracts.md`)).toBe(
      [
        "# Contracts",
        "",
        "## Contract Index",
        "",
        "| ID | Title | File | Depends On | Reconciled With | Purpose |",
        "| --- | --- | --- | --- | --- | --- |",
        "| CLI-0001 | Orders command | `.qfai/spec/03_contract/cli/cli-0001-orders.md` | - | - | - |",
        "| API-0002 | /orders | `.qfai/spec/03_contract/api/api-0002-orders.yaml` | DB-0003 | DB-0003 | Accept orders |",
        "| DB-0003 | Order storage | `.qfai/spec/03_contract/db/db-0003-orders.sql` | - | API-0002 | Store orders |",
        "| UI-0004 | receipt | `.qfai/spec/03_contract/ui/ui-0004-receipt.yaml` | - | - | - |",
        "",
      ].join("\n"),
    );
    const archive = `${EVIDENCE}/retired/_policies/05_Contracts.md`;
    for (const heading of ["Purpose", "Mapping Rules"]) {
      expect(forAPerson(result.output)).toContain(
        `${CONTRACTS}/contracts.md: rewrite "## ${heading}" of .qfai/spec/_policies/05_Contracts.md by hand (kept at ${archive})`,
      );
    }
  });

  it("shows every rename in a dry run and changes nothing on a second run", async () => {
    // QFAI:EX-0004-0006-15
    const root = await project();
    const before = await files(root);
    const dry = await run(step03, root, true);
    expect(await files(root)).toEqual(before);
    expect(dry.output).toContain(
      `- ${CONTRACTS}/api/api-0001-orders.yaml: renamed to ${CONTRACTS}/api/api-0002-orders.yaml as API-0002`,
    );
    expect(dry.output).toContain(`- ${EVIDENCE}/contract-map.json: write`);
    const real = await run(step03, root);
    expect(real.output).toBe(dry.output);
    const map = await text(root, `${EVIDENCE}/contract-map.json`);
    const again = await run(step03, root);
    expect(again.output).toMatch(/## Operations\r?\nnone/);
    expect(await text(root, `${EVIDENCE}/contract-map.json`)).toBe(map);
  });

  it("lists every old ID left in a contract body with its file and line", async () => {
    // QFAI:EX-0004-0006-16
    const root = await project();
    const result = await run(step03, root);
    const receipt = `${CONTRACTS}/ui/ui-0004-receipt.yaml`;
    expect(forAPerson(result.output)).toEqual(
      expect.arrayContaining([
        `${receipt}:5: CON-API-0001 is now API-0002; write API-0002 here and wherever the project uses CON-API-0001`,
        `${receipt}:6: CON-UI-0009 is declared by no contract, so it has no new ID`,
      ]),
    );
    expect(await text(root, receipt)).toContain("CON-UI-0009:total");
  });

  // QFAI:AC-0004-0007-04
  it("refuses a rule destination outside the contract kinds or naming no contract", async () => {
    // QFAI:EX-0004-0007-24
    const root = await project();
    await run(step03, root);
    for (const [contract, message] of [
      ["tech.md", "which is not under cli/, api/, db/ or ui/"],
      ["api/missing.yaml", "which is not a contract file"],
    ] as const) {
      await putPack(root, "As a buyer, I place an order.", "Orders are stored.", contract);
      const before = await files(root);
      const result = await run(step04, root);
      expect(result.code).toBe(2);
      expect(result.errors).toContain(`BR-0001-0001 names ${contract}, ${message}`);
      expect(await files(root)).toEqual(before);
    }
  });

  it("refuses a rule destination that holds no contract", async () => {
    // QFAI:EX-0004-0007-27
    const root = await project();
    await put(root, `${CONTRACTS}/api/orders.md`, "# Orders API\n");
    await put(root, `${CONTRACTS}/design/order.md`, "# Order screen\n");
    await run(step03, root);
    for (const [contract, reason] of [
      ["api/orders.md", "Markdown is not a contract: api/ holds OpenAPI YAML or JSON contracts"],
      [
        "design/order.md",
        "design/ no longer exists: the brand belongs in the root DESIGN.md and a screen in a ui/ contract",
      ],
    ] as const) {
      await putPack(root, "As a buyer, I place an order.", "Orders are stored.", contract);
      const before = await files(root);
      const result = await run(step04, root);
      expect(result.code).toBe(2);
      expect(result.errors).toContain(
        `BR-0001-0001 names ${contract}, which holds no contract: ${reason}`,
      );
      expect(await files(root)).toEqual(before);
    }
  });

  it("numbers a rule under the contract its old path names and records the contract map", async () => {
    // QFAI:EX-0004-0007-25
    // QFAI:EX-0004-0007-26
    const root = await project();
    await putPack(
      root,
      "As a buyer, I place an order through CON-API-0001 and CON-UI-0009.",
      "Orders are stored.",
      "api/api-0001-orders.yaml",
    );
    await run(step03, root);
    const result = await run(step04, root);
    const map = JSON.parse(await text(root, `${EVIDENCE}/id-map.json`)) as {
      ids: Record<string, Record<string, string>>;
      contracts: unknown;
    };
    expect(map.ids["spec-0001"]?.["BR-0001-0001"]).toBe("BR-0002-0001");
    expect(map.contracts).toEqual(
      (JSON.parse(await text(root, `${EVIDENCE}/contract-map.json`)) as { contracts: unknown })
        .contracts,
    );
    const story =
      ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md";
    expect(await text(root, story)).toContain("through API-0002 and CON-UI-0009.");
    expect(forAPerson(result.output)).toContain(
      `${story}: CON-UI-0009 is declared by no contract, so it has no new ID`,
    );
  });

  it("writes a rule into its renamed contract with the old IDs in its statement rewritten", async () => {
    // QFAI:EX-0004-0009-13
    // QFAI:EX-0004-0009-14
    const root = await project();
    await putPack(
      root,
      "As a buyer, I place an order.",
      "An order stored by CON-DB-0001 is proven by EX-0001-0001, as BR-0001-0009 says.",
      "api/api-0001-orders.yaml",
    );
    await run(step03, root);
    await run(step04, root);
    const result = await run(step07, root);
    expect(result.code).toBe(3);
    expect(parseYaml(await text(root, `${CONTRACTS}/api/api-0002-orders.yaml`))).toMatchObject({
      "x-qfai-rules": [
        {
          id: "BR-0002-0001",
          statement:
            "An order stored by DB-0003 is proven by EX-0001-0001-01, as BR-0001-0009 says.",
          examples: ["EX-0001-0001-01"],
        },
      ],
    });
    expect(forAPerson(result.output)).toContain(
      ".qfai/spec/spec-0001/04_Business-Rules.md: BR-0001-0001: its statement names BR-0001-0009, which has no new ID",
    );
  });

  // QFAI:AC-0004-0010-03
  it("rewrites a contract annotation to the new contract ID and lists one no contract declares", async () => {
    // QFAI:EX-0004-0010-06
    const root = await project();
    await putPack(
      root,
      "As a buyer, I place an order.",
      "Orders are stored.",
      "db/db-0001-orders.sql",
    );
    // Built from parts, so this file carries no annotation of its own.
    const annotation = (id: string) => ["QFAI", id].join(":");
    await put(
      root,
      "tests/integration/orders.test.ts",
      `// ${annotation("CON-API-0001")}\n// ${annotation("CON-DB-0009")}\n`,
    );
    await run(step03, root);
    await run(step04, root);
    const result = await run(step08, root);
    expect(result.code).toBe(3);
    expect(await text(root, "tests/integration/orders.test.ts")).toBe(
      `// ${annotation("API-0002")}\n// ${annotation("CON-DB-0009")}\n`,
    );
    expect(forAPerson(result.output)).toContain(
      `tests/integration/orders.test.ts:2: ${annotation("CON-DB-0009")}: no contract declares CON-DB-0009`,
    );
  });
});

describe("migration CLI contract shape", () => {
  const OLD = `${CONTRACTS}/cli/orders.md`;
  const NEW = `${CONTRACTS}/cli/cli-0001-orders.md`;
  const ARCHIVE = `${EVIDENCE}/retired/contract/cli/orders.md`;
  const PLACEHOLDER = "`<What this contract decides, and which contract decides the rest.>`";
  const EMPTY_RULES =
    "## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n";
  const OWNERSHIP =
    "This contract decides what `orders list` prints. The API contract decides how an order is stored.";
  const WITH_LEFTOVERS = [
    "# Contract: Orders command",
    "",
    "Status: active",
    "Rule refs: BR-0001-0001",
    "",
    "## Ownership boundary",
    "",
    OWNERSHIP,
    "",
    "## Options",
    "",
    "- `--all` lists every order.",
    "",
  ].join("\n");

  // QFAI:AC-0004-0006-05
  it("keeps the H1 and the ownership boundary and lists every other part for a person", async () => {
    // QFAI:EX-0004-0006-20
    const root = await project();
    await put(root, OLD, WITH_LEFTOVERS);
    const result = await run(step03, root);
    expect(result.code).toBe(3);
    expect(await text(root, NEW)).toBe(
      `# CLI-0001: Orders command\n\n## Ownership boundary\n\n${OWNERSHIP}\n\n${EMPTY_RULES}`,
    );
    const kept = `by hand (kept at ${ARCHIVE})`;
    expect(forAPerson(result.output).filter((item) => item.startsWith(NEW))).toEqual([
      `${NEW}: rewrite the text before the first section of ${OLD} ${kept}`,
      `${NEW}: rewrite "## Options" of ${OLD} ${kept}`,
    ]);
    expect(await text(root, ARCHIVE)).toBe(WITH_LEFTOVERS);
    expect((await run(step03, root)).output).toMatch(/## Operations\r?\nnone/);
  });

  it("writes the template's placeholder where the old contract has no ownership boundary", async () => {
    // QFAI:EX-0004-0006-21
    const root = await project();
    await put(root, OLD, "# Contract: Orders command\n");
    const result = await run(step03, root);
    expect(result.code).toBe(3);
    expect(await text(root, NEW)).toBe(
      `# CLI-0001: Orders command\n\n## Ownership boundary\n\n${PLACEHOLDER}\n\n${EMPTY_RULES}`,
    );
    expect(forAPerson(result.output).filter((item) => item.startsWith(NEW))).toEqual([
      `${NEW} ## Ownership boundary: write what this contract decides, and which contract decides the rest, in place of the template's placeholder`,
    ]);
    await expect(readFile(path.join(root, ARCHIVE))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("names the template section for an ownership boundary or a rules table it cannot keep", async () => {
    // QFAI:EX-0004-0006-22
    const root = await project();
    const old =
      "# Contract: Orders command\n\n## Ownership boundary\n\n- Orders only.\n\n## Business rules\n\nBR-ID | Statement | Examples\n--- | --- | ---\n\n## Rules\n\n| ID | Rule |\n| --- | --- |\n| R1 | List newest first. |\n";
    await put(root, OLD, old);
    const result = await run(step03, root);
    expect(result.code).toBe(3);
    expect(await text(root, NEW)).toBe(
      `# CLI-0001: Orders command\n\n## Ownership boundary\n\n${PLACEHOLDER}\n\n${EMPTY_RULES}`,
    );
    const kept = `by hand (kept at ${ARCHIVE})`;
    expect(forAPerson(result.output).filter((item) => item.startsWith(NEW))).toEqual([
      `${NEW} ## Ownership boundary: rewrite "## Ownership boundary" of ${OLD} ${kept}`,
      `${NEW} ## Business rules: rewrite "## Business rules" of ${OLD} ${kept}`,
      `${NEW} ## Business rules: rewrite "## Rules" of ${OLD} ${kept}`,
    ]);
    expect(await text(root, ARCHIVE)).toBe(old);
  });

  it("leaves a contract that passes the CLI schema once its rules are written", async () => {
    // QFAI:EX-0004-0006-23
    const root = await project();
    await put(root, OLD, WITH_LEFTOVERS);
    await putPack(
      root,
      "As a buyer, I list my orders.",
      "Orders are listed newest first.",
      "cli/orders.md",
    );
    await run(step03, root);
    await run(step04, root);
    expect((await run(step07, root)).code).toBe(0);
    expect(await text(root, NEW)).toContain(
      "| BR-0001-0001 | Orders are listed newest first. | EX-0001-0001-01 |",
    );
    const { config } = await loadConfig(root);
    const findings = await validateDocumentSchema(root, config);
    expect(findings.filter((finding) => finding.code === "QFAI-DOCSCHEMA-002")).toEqual([]);
    const onContract = (all: typeof findings) =>
      all.filter((finding) => finding.message.includes("cli-0001-orders.md"));
    expect(onContract(findings)).toEqual([]);

    await put(root, NEW, `${await text(root, NEW)}\n## Options\n\n- \`--all\`\n`);
    expect(onContract(await validateDocumentSchema(root, config))).not.toEqual([]);
  });

  // QFAI:AC-0004-0009-03
  it("lists a rule whose statement names another rule when it lands in a CLI contract", async () => {
    // QFAI:EX-0004-0009-15
    const root = await project();
    await putPack(
      root,
      "As a buyer, I list my orders.",
      "Orders are listed as BR-0001-0009 orders them.",
      "cli/orders.md",
    );
    await run(step03, root);
    await run(step04, root);
    const result = await run(step07, root);
    expect(result.code).toBe(3);
    expect(await text(root, NEW)).toContain(
      "| BR-0001-0001 | Orders are listed as BR-0001-0009 orders them. | EX-0001-0001-01 |",
    );
    expect(forAPerson(result.output)).toContain(
      `${NEW}: BR-0001-0001: its statement names BR-0001-0009; a statement in a CLI contract names no rule, so rewrite it by hand`,
    );
  });
});

describe("migration files that are no contract", () => {
  const RETIRED = `${EVIDENCE}/retired/contract`;
  const NUMBERED = [
    "api/api-0002-orders.yaml",
    "cli/cli-0001-orders.md",
    "contracts.md",
    "db/db-0003-orders.sql",
    "ui/ui-0004-receipt.yaml",
  ];

  // QFAI:AC-0004-0006-06
  it("archives a Markdown file under api/, db/ or ui/ unnumbered and names its directory's form", async () => {
    // QFAI:EX-0004-0006-24
    const root = await project();
    const markdown = [
      ["api/orders.md", "# Orders API\n\nPOST /orders accepts an order.\n", "OpenAPI YAML or JSON"],
      ["db/schema.md", "# Order storage\n", "SQL"],
      ["ui/receipt.md", "# Receipt screen\n", "YAML"],
    ] as const;
    for (const [relative, content] of markdown)
      await put(root, `${CONTRACTS}/${relative}`, content);
    const result = await run(step03, root);
    expect(result.code).toBe(3);
    expect(await files(path.join(root, CONTRACTS))).toEqual(NUMBERED);
    const map = await text(root, `${EVIDENCE}/contract-map.json`);
    for (const [relative, content, form] of markdown) {
      expect(map).not.toContain(relative);
      expect(await text(root, `${RETIRED}/${relative}`)).toBe(content);
      expect(forAPerson(result.output)).toContain(
        `${CONTRACTS}/${relative}: Markdown is not a contract: ${relative.split("/")[0]}/ holds ${form} contracts; rewrite what it states by hand (kept at ${RETIRED}/${relative})`,
      );
    }
    expect((await run(step03, root)).output).toMatch(/## Operations\r?\nnone/);
  });

  it("archives the whole design/ directory unnumbered and names each of its files", async () => {
    // QFAI:EX-0004-0006-25
    const root = await project();
    const design = [
      ["design/order.md", "# Order screen\n\nThe receipt shows the order ID.\n"],
      ["design/design-system.yaml", "colors:\n  primary: '#003366'\n"],
      ["design/screens/home.yaml", "screens: []\n"],
    ] as const;
    for (const [relative, content] of design) await put(root, `${CONTRACTS}/${relative}`, content);
    const result = await run(step03, root);
    expect(result.code).toBe(3);
    expect(await files(path.join(root, CONTRACTS))).toEqual(NUMBERED);
    await expect(readdir(path.join(root, CONTRACTS, "design"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    const reason =
      "design/ no longer exists: the brand belongs in the root DESIGN.md and a screen in a ui/ contract";
    for (const [relative, content] of design) {
      expect(await text(root, `${RETIRED}/${relative}`)).toBe(content);
      expect(forAPerson(result.output)).toContain(
        `${CONTRACTS}/${relative}: ${reason}; rewrite what it states by hand (kept at ${RETIRED}/${relative})`,
      );
    }
    expect(await text(root, `${EVIDENCE}/contract-map.json`)).not.toContain("design/");
  });
});

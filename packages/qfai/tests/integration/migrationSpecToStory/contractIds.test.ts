import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { loadConfig } from "../../../src/core/config.js";
import { validateProject } from "../../../src/core/validate.js";
import { validateDocumentSchema } from "../../../src/core/validators/documentSchema.js";
import {
  executePlannedStep,
  runStep,
  type MigrationContext,
  type MigrationStep,
} from "../../../src/migration/specToStory/harness.js";
import { OLD_CONTRACT_TOKEN } from "../../../src/migration/specToStory/contractIds.js";
import { step03 } from "../../../src/migration/specToStory/step03MoveCatalog.js";
import { step04 } from "../../../src/migration/specToStory/step04RenumberIds.js";
import { step05 } from "../../../src/migration/specToStory/step05CasesToExamples.js";
import { step06 } from "../../../src/migration/specToStory/step06DeriveAcRefs.js";
import { step07 } from "../../../src/migration/specToStory/step07RulesToContracts.js";
import { step08 } from "../../../src/migration/specToStory/step08RewriteAnnotations.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/migration-spec-to-story/contract-ids",
);
const CONTRACTS = ".qfai/spec/03_contract";
const STATE = "tmp/qfai-migration";
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
async function putPack(root: string, story: string, rule: string, contract: string, refs?: string) {
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
    refs === undefined
      ? `# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | ${rule} |\n`
      : `# Rules\n\n| BR-ID | Rule | Contract-Refs |\n| --- | --- | --- |\n| BR-0001-0001 | ${rule} | ${refs} |\n`,
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
    `${STATE}/plan.yaml`,
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

/** One `## <name>` section of a step report. */
function section(report: string, name: string): string {
  return report.split(/\r?\n(?=## )/).find((part) => part.startsWith(`## ${name}`)) ?? "";
}

/** The items of `## For a person`, each under the `###` heading above it (`null` before any). */
function personGroups(report: string): { heading: string | null; items: string[] }[] {
  const groups: { heading: string | null; items: string[] }[] = [];
  for (const line of section(report, "For a person").split(/\r?\n/)) {
    if (line.startsWith("### ")) groups.push({ heading: line.slice(4), items: [] });
    else if (line.startsWith("- ")) {
      if (groups.length === 0) groups.push({ heading: null, items: [] });
      groups[groups.length - 1]?.items.push(line.slice(2));
    }
  }
  return groups;
}

/** A step run the way the skill runs it, which also reads the configuration file. */
async function runCli(step: number, root: string, dryRun = false) {
  const output: string[] = [];
  const errors: string[] = [];
  const code = await runStep(step, dryRun ? ["--dry-run"] : [], {
    cwd: root,
    stdout: { write: (value) => output.push(value) },
    stderr: { write: (value) => errors.push(value) },
  });
  return { code, output: output.join(""), errors: errors.join("") };
}

/** Every file of the project with its content, the report directory left out. */
async function tree(root: string): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  for (const relative of await files(root)) {
    snapshot[relative] = await text(root, relative);
  }
  return snapshot;
}

/**
 * A project after steps 1 and 2 whose UI contract declares `CON-UI-0008`, whose one
 * spec rule cites `refs`, and whose configuration ends with `prototyping`.
 */
async function primaryProject(refs: string, prototyping: string): Promise<string> {
  const root = await project();
  const receipt = await readFile(path.join(FIXTURE, "contracts/ui/receipt.yaml"), "utf8");
  await put(root, `${CONTRACTS}/ui/receipt.yaml`, `# QFAI-CONTRACT-ID: CON-UI-0008\n${receipt}`);
  await putPack(
    root,
    "As a buyer, I place an order.",
    "A receipt is shown.",
    "api/api-0001-orders.yaml",
    refs,
  );
  await put(root, "qfai.config.yaml", `${await text(root, "qfai.config.yaml")}${prototyping}`);
  return root;
}

async function prototypingOf(root: string): Promise<unknown> {
  const config: unknown = parseYaml(await text(root, "qfai.config.yaml"));
  return typeof config === "object" && config !== null && "prototyping" in config
    ? config.prototyping
    : undefined;
}

const PRIMARY_SPEC = "prototyping:\n  primarySpecId: spec-0001\n";

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
    expect(JSON.parse(await text(root, `${STATE}/contract-map.json`))).toEqual({
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
    for (const heading of ["Purpose", "Mapping Rules"]) {
      expect(forAPerson(result.output)).toContain(
        `${CONTRACTS}/contracts.md: rewrite "## ${heading}" of .qfai/spec/_policies/05_Contracts.md by hand`,
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
    expect(dry.output).toContain(`- ${STATE}/contract-map.json: write`);
    const real = await run(step03, root);
    expect(real.output).toBe(dry.output);
    const map = await text(root, `${STATE}/contract-map.json`);
    const again = await run(step03, root);
    expect(again.output).toMatch(/## Operations\r?\nnone/);
    expect(await text(root, `${STATE}/contract-map.json`)).toBe(map);
  });

  it("rewrites a translated old ID in a contract body and lists one no contract declares", async () => {
    // QFAI:EX-0004-0006-16
    const root = await project();
    const result = await run(step03, root);
    const receipt = `${CONTRACTS}/ui/ui-0004-receipt.yaml`;
    const written = await text(root, receipt);
    expect(written).toContain("CON-UI-0009:total");
    expect(written).toContain("[data-qfai='API-0002:submit']");
    expect(written).not.toContain("CON-API-0001");
    const listed = `${receipt}:6: CON-UI-0009 is declared by no contract, so it has no new ID`;
    expect(forAPerson(result.output).filter((item) => item.startsWith(receipt))).toEqual([listed]);
    const content = personGroups(result.output).find((group) => group.heading === "Content");
    expect(content?.items).toContain(listed);
  });

  // QFAI:AC-0004-0006-04
  it("rewrites each old ID the contract map translates wherever a written contract holds it", async () => {
    // QFAI:EX-0004-0006-32
    const root = await project();
    const api = await readFile(path.join(FIXTURE, "contracts/api/api-0001-orders.yaml"), "utf8");
    const sql = await readFile(path.join(FIXTURE, "contracts/db/db-0001-orders.sql"), "utf8");
    await put(
      root,
      `${CONTRACTS}/api/api-0001-orders.yaml`,
      api.replace("title: Orders API", "title: Orders API\n  description: Kept by CON-DB-0001"),
    );
    await put(root, `${CONTRACTS}/db/db-0001-orders.sql`, `${sql}-- see CON-API-0001\n`);
    const notes = "See CON-API-0001 for the orders API.\n";
    await put(root, "docs/notes.md", notes);
    const result = await run(step03, root);
    const written = await text(root, `${CONTRACTS}/api/api-0002-orders.yaml`);
    expect(written).toContain("x-qfai-depends-on: [DB-0003]");
    expect(await text(root, "docs/notes.md")).toBe(notes);
    expect(written).toContain("description: Kept by DB-0003");
    expect(await text(root, `${CONTRACTS}/db/db-0003-orders.sql`)).toContain("-- see API-0002\n");
    expect(written).not.toContain("CON-");
    const inContracts = (item: string) => /^\.qfai\/spec\/03_contract\/(?:api|db)\//.test(item);
    expect(forAPerson(result.output).filter(inContracts)).toEqual([]);
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
    const map = JSON.parse(await text(root, `${STATE}/id-map.json`)) as {
      ids: Record<string, Record<string, string>>;
      contracts: unknown;
    };
    expect(map.ids["spec-0001"]?.["BR-0001-0001"]).toBe("BR-0002-0001");
    expect(map.contracts).toEqual(
      (JSON.parse(await text(root, `${STATE}/contract-map.json`)) as { contracts: unknown })
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
    const kept = "by hand";
    expect(forAPerson(result.output).filter((item) => item.startsWith(NEW))).toEqual([
      `${NEW}: rewrite the text before the first section of ${OLD} ${kept}`,
      `${NEW}: rewrite "## Options" of ${OLD} ${kept}`,
    ]);
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
    const kept = "by hand";
    expect(forAPerson(result.output).filter((item) => item.startsWith(NEW))).toEqual([
      `${NEW} ## Ownership boundary: rewrite "## Ownership boundary" of ${OLD} ${kept}`,
      `${NEW} ## Business rules: rewrite "## Business rules" of ${OLD} ${kept}`,
      `${NEW} ## Business rules: rewrite "## Rules" of ${OLD} ${kept}`,
    ]);
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
  const NUMBERED = [
    "api/api-0002-orders.yaml",
    "cli/cli-0001-orders.md",
    "contracts.md",
    "db/db-0003-orders.sql",
    "ui/ui-0004-receipt.yaml",
  ];

  // QFAI:AC-0004-0006-06
  it("deletes a Markdown file under api/, db/ or ui/ unnumbered and names its directory's form", async () => {
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
    const map = await text(root, `${STATE}/contract-map.json`);
    for (const [relative, , form] of markdown) {
      expect(map).not.toContain(relative);
      expect(result.output).toContain(`- ${CONTRACTS}/${relative}: delete`);
      expect(forAPerson(result.output)).toContain(
        `${CONTRACTS}/${relative}: Markdown is not a contract: ${relative.split("/")[0]}/ holds ${form} contracts; rewrite what it states by hand`,
      );
    }
    expect((await run(step03, root)).output).toMatch(/## Operations\r?\nnone/);
  });

  it("deletes the whole design/ directory unnumbered and names each of its files", async () => {
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
    expect(result.output).toContain(`- ${CONTRACTS}/design: delete`);
    for (const [relative] of design) {
      expect(forAPerson(result.output)).toContain(
        `${CONTRACTS}/${relative}: ${reason}; rewrite what it states by hand`,
      );
    }
    expect(await text(root, `${STATE}/contract-map.json`)).not.toContain("design/");
  });

  it("names every dot-prefixed file of design/, an empty .gitkeep included", async () => {
    // QFAI:EX-0004-0006-26
    const root = await project();
    const design = [
      ["design/.gitkeep", ""],
      ["design/.tokens.json", '{ "primary": "#003366" }\n'],
      ["design/.drafts/home.yaml", "screens: []\n"],
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
    expect(result.output).toContain(`- ${CONTRACTS}/design: delete`);
    for (const [relative] of design) {
      expect(forAPerson(result.output)).toContain(
        `${CONTRACTS}/${relative}: ${reason}; rewrite what it states by hand`,
      );
    }
    expect(await text(root, `${STATE}/contract-map.json`)).not.toContain("design/");
  });
});

describe("migration primary spec becomes the primary UI contract", () => {
  const NEW_NAME = "primaryUiContract";
  const OLD_KEY = "prototyping.primarySpecId";
  const OLD_NAME = "primarySpecId";

  // QFAI:AC-0004-0006-07
  it("replaces the key where one UI contract is tied, and keeps it for a person where none is", async () => {
    const tied = await primaryProject("CON-UI-0008", PRIMARY_SPEC);
    const control = await primaryProject("CON-UI-0008", "");
    expect((await runCli(3, control)).code).toBe(3);
    expect(await files(path.join(control, CONTRACTS))).toContain("ui/ui-0004-receipt.yaml");
    expect((await runCli(3, tied)).code).toBe(3);
    expect(await prototypingOf(tied)).toEqual({ primaryUiContract: "UI-0004" });

    const untied = await primaryProject("-", PRIMARY_SPEC);
    const result = await runCli(3, untied);
    expect(result.code).toBe(3);
    expect(await prototypingOf(untied)).toEqual({ primarySpecId: "spec-0001" });
    expect(
      forAPerson(result.output).filter(
        (item) => item.includes(OLD_NAME) && item.includes("spec-0001"),
      ),
    ).toHaveLength(1);
    const step4 = await runCli(4, untied);
    expect(step4.code).toBe(2);
    expect(step4.errors).toContain(OLD_KEY);
  });

  it("replaces the primary spec ID by the new ID of the UI contract its rules cite", async () => {
    // QFAI:EX-0004-0006-30
    const control = await primaryProject("CON-UI-0008", "");
    expect((await runCli(3, control)).code).toBe(3);
    expect(await files(path.join(control, CONTRACTS))).toContain("ui/ui-0004-receipt.yaml");

    const root = await primaryProject("CON-UI-0008", PRIMARY_SPEC);
    const first = await runCli(3, root);
    expect(first.code).toBe(3);
    expect(await prototypingOf(root)).toEqual({ primaryUiContract: "UI-0004" });
    const operations = section(first.output, "Operations");
    expect(operations).toContain(OLD_NAME);
    expect(operations).toContain(NEW_NAME);
    const second = await runCli(3, root);
    expect(second.output).toMatch(/## Operations\r?\nnone/);
    expect(await prototypingOf(root)).toEqual({ primaryUiContract: "UI-0004" });

    const already = await primaryProject(
      "CON-UI-0008",
      `${PRIMARY_SPEC}  primaryUiContract: UI-0009\n`,
    );
    const kept = await runCli(3, already);
    expect(await prototypingOf(already)).toEqual({ primaryUiContract: "UI-0009" });
    expect(section(kept.output, "Operations")).toContain(OLD_NAME);
  });

  // QFAI:AC-0004-0006-07
  it("reads the tie from the ID map once step 7 has deleted the pack's rules", async () => {
    const root = await primaryProject("CON-UI-0008", "");
    expect((await runCli(3, root)).code).toBe(3);
    await rm(path.join(root, ".qfai/spec/spec-0001/04_Business-Rules.md"));
    await put(
      root,
      `${STATE}/id-map.json`,
      `${JSON.stringify({
        version: 1,
        ids: { "spec-0001": { "BR-0001-0001": "BR-0003-0001" } },
        placements: { "spec-0001": { "BR-0001-0001": "ui/receipt.yaml" } },
        retiredPacks: {},
      })}\n`,
    );
    await put(root, "qfai.config.yaml", `${await text(root, "qfai.config.yaml")}${PRIMARY_SPEC}`);
    const result = await runCli(3, root);
    expect(result.errors).toBe("");
    expect(await prototypingOf(root)).toEqual({ primaryUiContract: "UI-0004" });
    expect(section(result.output, "Operations")).toContain(NEW_NAME);
  });

  it("leaves the key for a person where no single UI contract is tied, and stops the steps after", async () => {
    // QFAI:EX-0004-0006-31
    const markdown = async (root: string) => {
      await put(root, `${CONTRACTS}/ui/receipt.md`, "# CON-UI-0006: Receipt screen\n");
    };
    const cases: [string, string, (root: string) => Promise<void>][] = [
      ["cites no UI contract", "-", async () => {}],
      [
        "cites two",
        "CON-UI-0008, CON-UI-0007",
        async (root) =>
          put(
            root,
            `${CONTRACTS}/ui/summary.yaml`,
            "# QFAI-CONTRACT-ID: CON-UI-0007\nscreens: []\n",
          ),
      ],
      ["cites only a Markdown contract", "CON-UI-0006", markdown],
    ];
    for (const [label, refs, prepare] of cases) {
      const control = await primaryProject(refs, "");
      await prepare(control);
      expect((await runCli(3, control)).code, label).toBe(3);
    }
    const supported = await primaryProject("-", "");
    expect((await runCli(3, supported)).code).toBe(3);
    const supportedStep4 = await runCli(4, supported);
    expect(supportedStep4.code).not.toBe(2);
    expect(await text(supported, `${STATE}/id-map.json`)).toContain("BR-0001-0001");

    for (const [label, refs, prepare] of cases) {
      const root = await primaryProject(refs, PRIMARY_SPEC);
      await prepare(root);
      const result = await runCli(3, root);
      expect(result.code, label).toBe(3);
      expect(await prototypingOf(root), label).toEqual({ primarySpecId: "spec-0001" });
      expect(
        forAPerson(result.output).filter(
          (item) => item.includes(OLD_NAME) && item.includes("spec-0001"),
        ),
        label,
      ).toHaveLength(1);
    }

    const root = await primaryProject("-", PRIMARY_SPEC);
    expect((await runCli(3, root)).code).toBe(3);
    const before = await tree(root);
    const refused = await runCli(4, root);
    expect(refused.code).toBe(2);
    expect(refused.errors).toContain(OLD_KEY);
    expect(await tree(root)).toEqual(before);

    const config = await text(root, "qfai.config.yaml");
    await put(
      root,
      "qfai.config.yaml",
      config.replace("primarySpecId: spec-0001", "primaryUiContract: UI-0004"),
    );
    const allowed = await runCli(4, root);
    expect(allowed.errors).not.toContain(OLD_KEY);
    expect(allowed.code).not.toBe(2);
    expect(await text(root, `${STATE}/id-map.json`)).toContain("BR-0001-0001");
  });
});

describe("migration step 3 groups what it lists for a person", () => {
  async function lean(files: Record<string, string>): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migrate-groups-"));
    roots.push(root);
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    for (const [relative, content] of Object.entries(files)) await put(root, relative, content);
    return root;
  }

  const OBJECTIVE = {
    ".qfai/spec/_policies/01_Objective.md":
      "# 01 Objective\n\n## Objective\n\n- Buyers can order.\n",
  };
  const DESIGN = { [`${CONTRACTS}/design/order.md`]: "# Order screen\n" };
  const CONSTRAINT = {
    ".qfai/spec/_policies/07_Constraints.md":
      "# 07 Constraints\n\n## Constraints\n\n| ID | Constraint | Rationale |\n| --- | --- | --- |\n| TC-02 | Runs on Linux | Adopters |\n",
  };
  const GLOSSARY = {
    ".qfai/spec/_policies/06_Glossary.md":
      "# 06 Glossary\n\n## Terms\n\n| Term | Definition |\n| --- | --- |\n| Order | An accepted request |\n",
  };

  // QFAI:AC-0004-0006-08
  it("opens with Content, then Identifiers, and prints no group or heading it has no item for", async () => {
    // QFAI:EX-0004-0006-33
    const nothing = await run(step03, await lean(GLOSSARY));
    expect(nothing.code).toBe(0);
    expect(section(nothing.output, "For a person")).toMatch(/^## For a person\r?\nnone\s*$/);
    expect(nothing.output).not.toMatch(/^### /m);
    const contentOnly = await run(step03, await lean({ ...OBJECTIVE, ...DESIGN }));
    expect(contentOnly.code).toBe(3);
    expect(forAPerson(contentOnly.output)).toHaveLength(2);

    const both = await run(step03, await lean({ ...OBJECTIVE, ...DESIGN, ...CONSTRAINT }));
    expect(both.code).toBe(3);
    const items = forAPerson(both.output);
    expect(items.some((item) => item.includes('rewrite "## Objective"'))).toBe(true);
    expect(items.some((item) => item.includes("TC-02 is now TC-01"))).toBe(true);
    const groups = personGroups(both.output);
    expect(groups.map((group) => group.heading)).toEqual(["Content", "Identifiers"]);
    const [content, identifiers] = groups;
    expect(content?.items.some((item) => item.includes('rewrite "## Objective"'))).toBe(true);
    expect(content?.items.some((item) => item.includes("design/order.md"))).toBe(true);
    expect(content?.items.some((item) => item.includes("TC-02"))).toBe(false);
    expect(identifiers?.items).toHaveLength(1);
    expect(identifiers?.items[0]).toContain("TC-02 is now TC-01");

    expect(personGroups(contentOnly.output).map((group) => group.heading)).toEqual(["Content"]);
  });
});

describe("migration step 7 writes contracts that validate", () => {
  const limit = "An order total is never negative, and it is at most the credit limit.";
  const cap = "An order is refused above the limit, with no partial receipt.";
  const sectionRules =
    "# Rules\n\n## BR-0001-0001: Order total\n\n- **Rule**: An order total is never negative,\n  and it is at most the credit limit.\n- **Notes**: Totals are rounded.\n- **NFRs**: NFR-0030\n- **Contracts**: DB-0001\n\n## BR-0001-0002: Order limit\n\n- **Rule**: An order is refused above the limit,\n  with no partial receipt.\n- **Notes**: Limits are per account.\n- **NFRs**: NFR-0030\n- **Contracts**: API-0001\n";
  const tableRules = `# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | ${limit} |\n| BR-0001-0002 | ${cap} |\n`;

  /** A project whose plan places the first rule in the DB contract and the second in the API one. */
  async function ruleProject(rules: string): Promise<string> {
    const root = await project();
    await putPack(root, "As a buyer, I place an order.", limit, "db/db-0001-orders.sql");
    await put(root, ".qfai/spec/spec-0001/04_Business-Rules.md", rules);
    await put(
      root,
      ".qfai/spec/spec-0001/05_Examples.md",
      "# Examples\n\n| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001, BR-0001-0002 | one item | accepted |\n",
    );
    await put(
      root,
      `${STATE}/plan.yaml`,
      "flows:\n  - title: Order flow\n    from: _policies/04_Business-Flow.md\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: db/db-0001-orders.sql\n  - id: BR-0001-0002\n    contract: api/api-0001-orders.yaml\n",
    );
    return root;
  }

  /** Steps 3 to 7; step 7 leaves no old pack behind, so validation reads the story tree. */
  async function migrate(root: string): Promise<void> {
    for (const step of [step03, step04, step05, step06, step07]) await run(step, root);
  }

  /**
   * The first `-- Rule` line of a SQL contract and the line under it, each with its whitespace
   * runs collapsed and the rule ID shown as `BR-N`. A rule comment that runs over several lines
   * puts something else under the first line.
   */
  function ruleComment(sql: string): string[] {
    const lines = sql.split("\n");
    const start = lines.findIndex((line) => /^-- Rule BR-\d{4}-\d{4}:/.test(line));
    return start < 0
      ? []
      : lines.slice(start, start + 2).map((line) =>
          line
            .replace(/BR-\d{4}-\d{4}/, "BR-N")
            .replace(/\s+/g, " ")
            .trim(),
        );
  }

  /** The IDs a YAML contract's `x-qfai-depends-on` holds as a flow list on one line, or `null`. */
  function dependsOnList(contract: string): string[] | null {
    const list = /^x-qfai-depends-on:[ \t]*\[([^\]\n]*)\][ \t]*$/m.exec(contract)?.[1];
    return list === undefined ? null : list.split(",").map((id) => id.trim());
  }

  /** The messages of the findings with `code`, only those about `file` when one is given. */
  async function findings(root: string, code: string, file?: string): Promise<string[]> {
    const result = await validateProject(root, undefined, { profile: "sdd" });
    const aboutFile = (issue: { file?: string; message: string }): boolean =>
      file === undefined ||
      `${issue.file ?? ""}\n${issue.message}`.replaceAll("\\", "/").includes(file);
    return result.issues
      .filter((issue) => issue.code === code && aboutFile(issue))
      .map((issue) => issue.message);
  }

  /** The validator read the story tree: it did not stop at the old-layout finding. */
  async function expectTreeRead(root: string): Promise<void> {
    expect(await findings(root, "QFAI-LAYOUT-001")).toEqual([]);
  }

  it("reads the examples of a SQL rule written from a section and keeps its statement to the Rule value", async () => {
    // QFAI:EX-0004-0009-18
    const sqlContract = `${CONTRACTS}/db/db-0003-orders.sql`;
    const apiContract = `${CONTRACTS}/api/api-0002-orders.yaml`;
    const table = await ruleProject(tableRules);
    await migrate(table);
    expect(ruleComment(await text(table, sqlContract))).toEqual([
      `-- Rule BR-N: ${limit}`,
      "-- Examples: EX-0001-0001-01",
    ]);
    await expectTreeRead(table);
    expect(await findings(table, "QFAI-STORY-005")).toEqual([]);

    const section = await ruleProject(sectionRules);
    await migrate(section);
    expect(ruleComment(await text(section, sqlContract))).toEqual([
      `-- Rule BR-N: ${limit}`,
      "-- Examples: EX-0001-0001-01",
    ]);
    expect(await text(section, sqlContract)).not.toMatch(/Notes|NFR|\*\*|Order total/);
    const rules: unknown = parseYaml(await text(section, apiContract));
    const written =
      typeof rules === "object" && rules !== null ? Reflect.get(rules, "x-qfai-rules") : undefined;
    expect(
      Array.isArray(written)
        ? written.map((rule) => String(Reflect.get(rule, "statement")).replace(/\s+/g, " ").trim())
        : written,
    ).toEqual([cap]);
    await expectTreeRead(section);
    expect(await findings(section, "QFAI-STORY-005")).toEqual([]);
  });

  it("keeps a dependency list of eight IDs on one line so the contract declares them", async () => {
    // QFAI:EX-0004-0009-19
    const root = await ruleProject(tableRules);
    const ids = Array.from(
      { length: 8 },
      (_, index) => `CON-DB-${String(index + 1).padStart(4, "0")}`,
    );
    const api = `${CONTRACTS}/api/api-0001-orders.yaml`;
    await put(
      root,
      api,
      (await text(root, api)).replace(
        "x-qfai-depends-on: [CON-DB-0001]",
        `x-qfai-depends-on: [${ids.join(", ")}]`,
      ),
    );
    for (const [index, id] of ids.entries()) {
      if (index === 0) continue;
      await put(
        root,
        `${CONTRACTS}/db/table${index}.sql`,
        `-- QFAI-CONTRACT-ID: ${id}\n-- Depends on: -\nCREATE TABLE table${index} (id INT);\n`,
      );
    }
    const contract = `${CONTRACTS}/api/api-0002-orders.yaml`;
    await run(step03, root);
    // Control: step 3 writes the renumbered list on one line.
    const renumbered = dependsOnList(await text(root, contract));
    expect(renumbered).toHaveLength(8);
    expect(renumbered?.every((id) => /^DB-\d{4}$/.test(id))).toBe(true);
    for (const step of [step04, step05, step06, step07]) await run(step, root);
    expect(await text(root, contract)).toContain("x-qfai-rules:");
    await expectTreeRead(root);
    expect(await findings(root, "QFAI-CONTRACT-015", "api/api-0002-orders.yaml")).toEqual([]);
    expect(dependsOnList(await text(root, contract))).toEqual(renumbered);
  });
});

describe("migration old contract ID matching", () => {
  it("matches a whole old contract ID and not the start of a longer token", () => {
    const found = (value: string): string[] => value.match(OLD_CONTRACT_TOKEN) ?? [];
    expect(found("Depends on CON-UI-0008, and CON-API-0001.")).toEqual([
      "CON-UI-0008",
      "CON-API-0001",
    ]);
    expect(found("Refers to CON-UI-0008-01 and CON-DB-0002x.")).toEqual([]);
  });
});

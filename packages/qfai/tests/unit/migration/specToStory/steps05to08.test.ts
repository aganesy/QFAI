import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { defaultConfig } from "../../../../src/core/config.js";
import { serializeIdMap } from "../../../../src/migration/specToStory/idMap.js";
import {
  executePlannedStep,
  type MigrationContext,
} from "../../../../src/migration/specToStory/harness.js";
import { step05 } from "../../../../src/migration/specToStory/step05CasesToExamples.js";
import { step06 } from "../../../../src/migration/specToStory/step06DeriveAcRefs.js";
import { step07 } from "../../../../src/migration/specToStory/step07RulesToContracts.js";
import { step08 } from "../../../../src/migration/specToStory/step08RewriteAnnotations.js";

const roots: string[] = [];
const spec = "spec-0001";
const story = "02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md";

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-steps-"));
  roots.push(root);
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = ".qfai/spec";
  config.paths.contractsDir = ".qfai/spec/03_contract";
  config.paths.testsDir = "tests";
  config.validation.traceability.testFileGlobs = ["tests/**/*.test.ts"];
  const context = {
    root,
    specsDir: path.join(root, config.paths.specsDir),
    contractsDir: path.join(root, config.paths.contractsDir),
    config,
  };
  await put(
    root,
    ".qfai/evidence/migration-spec-to-story/id-map.json",
    serializeIdMap({
      version: 1,
      ids: {
        [spec]: {
          "US-0001-0001": "US-0001-0001",
          "AC-0001-0001": "AC-0001-0001-01",
          "AC-0001-0002": "AC-0001-0001-02",
          "EX-0001-0001": "EX-0001-0001-01",
          "TC-0001-0001": "EX-0001-0001-02",
          "TC-0001-0002": "EX-0001-0001-01",
          "TC-0001-0006": "EX-0001-0001-03",
          "BR-0001-0001": "BR-0001",
        },
      },
      placements: { [spec]: { "US-0001-0001": "Checkout", "BR-0001-0001": "api/orders.yaml" } },
      retiredPacks: {},
    }),
  );
  await put(
    root,
    `.qfai/spec/${story}`,
    "# Examples\n\n## Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | — | Existing input | Existing result |\n",
  );
  return context;
}

async function put(root: string, target: string, content: string): Promise<void> {
  const file = path.join(root, target);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

function capture() {
  const output: string[] = [];
  const error: string[] = [];
  return {
    output,
    error,
    io: {
      stdout: { write: (value: string) => output.push(value) },
      stderr: { write: (value: string) => error.push(value) },
    },
  };
}

describe("migration steps 5 to 8", () => {
  it("uses heading-only legacy cases and keeps their detail in the new example", async () => {
    // QFAI:EX-0004-0008-02
    // QFAI:EX-0004-0003-17
    const context = await fixture();
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md`,
      "# Cases\n\n## TC-0001-0001: Submit order\n\n- AC-Refs: AC-0001-0001\n- EX-Ref: —\n- Verify that submission creates an order.\n",
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "# Examples\n",
    );
    const report = capture();
    expect(await executePlannedStep(step05, context, false, report.io)).toBe(0);
    expect(report.output.join("")).toContain(
      "## Cases to examples\n- TC-0001-0001 → EX-0001-0001-02\n",
    );
    expect(report.output.join("")).toContain("## For a person\nnone");
    expect(await readFile(path.join(context.specsDir, story), "utf8")).toContain(
      "EX-0001-0001-02 | AC-0001-0001-01 | Submit order",
    );
  });

  it("keeps a case with several example references for human resolution", async () => {
    const context = await fixture();
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md`,
      "# Cases\n\n## TC-0001-0001: Several examples\n\n- AC-Refs: AC-0001-0001\n- EX-Ref: EX-0001-0001, EX-0001-0002\n- Verify both results.\n",
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | First | Pass |\n| EX-0001-0002 | BR-0001-0001 | Second | Pass |\n",
    );
    const c = capture();
    expect(await executePlannedStep(step05, context, false, c.io)).toBe(3);
    expect(c.output.join("")).toContain("several EX-Ref values");
    expect(await readFile(path.join(context.specsDir, story), "utf8")).not.toContain(
      "Several examples",
    );
  });

  it("converts every single-criterion case and accounts for each unconvertible case", async () => {
    // QFAI:EX-0004-0008-01
    // QFAI:EX-0004-0008-03
    // QFAI:EX-0004-0008-04
    // QFAI:EX-0004-0003-16
    const context = await fixture();
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md`,
      "# Test Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | — | Submit order | Order accepted |\n| TC-0001-0002 | AC-0001-0001 | EX-0001-0001 | Existing EX | Accepted |\n| TC-0001-0003 | — | — | Missing AC | Review |\n| TC-0001-0004 | AC-0001-0001, AC-0001-0002 | — | Two ACs | Review |\n| TC-0001-0006 | AC-0001-0001 | EX-0001-9999 | Dangling EX | Review |\n",
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | Input | Output |\n",
    );
    const c = capture();
    expect(await executePlannedStep(step05, context, false, c.io)).toBe(3);
    expect(c.output.join("")).toContain("TC-0001-0001 → EX-0001-0001-02");
    expect(c.output.join("")).toContain("TC-0001-0003");
    expect(c.output.join("")).toContain("TC-0001-0004");
    expect(c.output.join("")).toContain("TC-0001-0006 → EX-0001-0001-03");
    const examples = await readFile(path.join(context.specsDir, story), "utf8");
    expect(examples).toContain("EX-0001-0001-02 | AC-0001-0001-01 | Submit order | Order accepted");
    expect(examples).toContain("EX-0001-0001-03 | AC-0001-0001-01 | Dangling EX | Review");
    expect(examples).not.toContain("Missing AC");
    expect(examples).not.toContain("Two ACs");
    expect(
      await readFile(
        path.join(
          context.root,
          `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md`,
        ),
        "utf8",
      ),
    ).toContain("TC-0001-0003 | — | — | Missing AC | Review");
    const repeated = await step05.plan(context);
    expect(repeated.operations).toEqual([]);
    expect((repeated.casesToExamples?.length ?? 0) + (repeated.forAPerson?.length ?? 0)).toBe(4);
  });

  it("accounts for five case-only rows as three conversions and two human decisions", async () => {
    // QFAI:EX-0004-0008-05
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: {
          [spec]: {
            "TC-0001-0001": "EX-0001-0001-02",
            "TC-0001-0002": "EX-0001-0001-03",
            "TC-0001-0003": "EX-0001-0001-04",
            "AC-0001-0001": "AC-0001-0001-01",
          },
        },
        placements: { [spec]: {} },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md`,
      "| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | — | First | Accepted |\n| TC-0001-0002 | AC-0001-0001 | — | Second | Accepted |\n| TC-0001-0003 | AC-0001-0001 | — | Third | Accepted |\n| TC-0001-0004 | — | — | Missing | Review |\n| TC-0001-0005 | AC-0001-0001, AC-0001-0002 | — | Ambiguous | Review |\n",
    );
    const report = capture();
    expect(await executePlannedStep(step05, context, false, report.io)).toBe(3);
    const plan = await step05.plan(context);
    expect(plan.casesToExamples).toHaveLength(3);
    expect(plan.forAPerson).toHaveLength(2);
    expect(report.output.join("")).toContain("TC-0001-0004");
    expect(report.output.join("")).toContain("TC-0001-0005");
    const examples = await readFile(path.join(context.specsDir, story), "utf8");
    expect(examples).toContain("EX-0001-0001-02 | AC-0001-0001-01 | First | Accepted");
    expect(examples).toContain("EX-0001-0001-03 | AC-0001-0001-01 | Second | Accepted");
    expect(examples).toContain("EX-0001-0001-04 | AC-0001-0001-01 | Third | Accepted");
    expect(examples).not.toContain("Missing");
    expect(examples).not.toContain("Ambiguous");
  });

  it("derives a mapped example's criterion from all citing cases", async () => {
    // QFAI:EX-0004-0008-06
    const context = await fixture();
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md`,
      "| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0002 | AC-0001-0001 | EX-0001-0001 | one | yes |\n| TC-0001-0005 | AC-0001-0001 | EX-0001-0001 | two | yes |\n",
    );
    expect(await executePlannedStep(step06, context, false, capture().io)).toBe(0);
    expect(await readFile(path.join(context.specsDir, story), "utf8")).toContain(
      "EX-0001-0001-01 | AC-0001-0001-01 | Existing input",
    );
  });

  it("preserves a criterion assigned after migration when old cases disagree", async () => {
    const context = await fixture();
    const examplePath = path.join(context.specsDir, story);
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md`,
      "| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0002 | AC-0001-0001 | EX-0001-0001 | one | yes |\n",
    );
    const manual =
      "# Examples\n\n## Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-02 | Corrected input | Corrected result |\n";
    await put(context.root, `.qfai/spec/${story}`, manual);
    const report = capture();
    expect(await executePlannedStep(step06, context, false, report.io)).toBe(0);
    expect(report.output.join("")).toContain("## Operations\nnone");
    expect(await readFile(examplePath, "utf8")).toBe(manual);
  });

  it("writes a mapped rule into its existing YAML contract and leaves unresolved rules in their pack", async () => {
    // QFAI:EX-0004-0009-01
    // QFAI:EX-0004-0009-05
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows:\n  - title: Checkout\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/04_Business-Rules.md`,
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | An order total is never negative. |\n| BR-0001-0002 | A missing rule stays. |\n",
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | Input | Output |\n",
    );
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
    const c = capture();
    expect(await executePlannedStep(step07, context, false, c.io)).toBe(3);
    expect(
      parseYaml(await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8")),
    ).toMatchObject({
      "x-qfai-rules": [
        {
          id: "BR-0001",
          statement: "An order total is never negative.",
          examples: ["EX-0001-0001-01"],
        },
      ],
    });
    expect(
      await readFile(path.join(context.specsDir, spec, "04_Business-Rules.md"), "utf8"),
    ).toContain("BR-0001-0002");
    expect(c.output.join("")).toContain("BR-0001-0002");
    expect(c.output.join("")).toContain("no contract placement in plan");
  });

  it("moves a heading rule to its contract and archives the original section", async () => {
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows:\n  - title: Checkout\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
    );
    const source =
      "# Rules\n\n## BR-0001-0001: Valid total\n\n- AC-Refs: AC-0001-0001\n- The total MUST be nonnegative.\n";
    await put(context.root, `.qfai/spec/${spec}/04_Business-Rules.md`, source);
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "# Examples\n\n## EX-0001-0001: Valid order\n\n- BR-Ref: BR-0001-0001\n- Given an order\n- When submitted\n- Then accepted\n",
    );
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
    expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
    const contract = await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8");
    expect(contract).toContain("BR-0001");
    expect(contract).toContain("The total MUST be nonnegative.");
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired",
          spec,
          "04_Business-Rules.md",
        ),
        "utf8",
      ),
    ).toBe(source);
  });

  const existingRuleFormats = [
    {
      contract: "api/orders.yaml",
      render: (statement: string, examples: string[]) =>
        `openapi: 3.0.0\nx-qfai-rules:\n  - id: BR-0001\n    statement: ${statement}\n    examples: [${examples.join(", ")}]\n`,
    },
    {
      contract: "api/orders.json",
      render: (statement: string, examples: string[]) =>
        `${JSON.stringify({ "x-qfai-rules": [{ id: "BR-0001", statement, examples }] }, null, 2)}\n`,
    },
    {
      contract: "db/orders.sql",
      render: (statement: string, examples: string[]) =>
        `CREATE TABLE orders (id INT);\n\n-- Rule BR-0001: ${statement}\n-- Examples: ${examples.join(", ")}\n`,
    },
    {
      contract: "cli/orders.md",
      render: (statement: string, examples: string[]) =>
        `# Orders\n\n## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001 | ${statement} | ${examples.join(", ")} |\n`,
    },
  ] as const;

  async function existingRuleFixture(contract: string, content: string) {
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: { [spec]: { "BR-0001-0001": "BR-0001", "EX-0001-0001": "EX-0001-0001-01" } },
        placements: { [spec]: { "BR-0001-0001": contract } },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      `flows: []\nrules:\n  - id: BR-0001-0001\n    contract: ${contract}\n`,
    );
    const source =
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | An order total is never negative. |\n";
    await put(context.root, `.qfai/spec/${spec}/04_Business-Rules.md`, source);
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | Input | Output |\n",
    );
    await put(context.root, `.qfai/spec/03_contract/${contract}`, content);
    return { context, source };
  }

  for (const format of existingRuleFormats) {
    it(`preserves an identical existing rule in ${format.contract} during migration`, async () => {
      const original = format.render("An order total is never negative.", ["EX-0001-0001-01"]);
      const { context, source } = await existingRuleFixture(format.contract, original);
      expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
      expect(await readFile(path.join(context.contractsDir, format.contract), "utf8")).toBe(
        original,
      );
      await expect(
        readFile(path.join(context.specsDir, spec, "04_Business-Rules.md")),
      ).rejects.toMatchObject({ code: "ENOENT" });
      expect(
        await readFile(
          path.join(
            context.root,
            ".qfai/evidence/migration-spec-to-story/retired",
            spec,
            "04_Business-Rules.md",
          ),
          "utf8",
        ),
      ).toBe(source);
    });

    for (const difference of ["statement", "examples"] as const) {
      it(`rejects a ${difference} collision in ${format.contract} before writing`, async () => {
        const original = format.render(
          difference === "statement" ? "A different rule." : "An order total is never negative.",
          difference === "examples" ? ["EX-0001-0001-02"] : ["EX-0001-0001-01"],
        );
        const { context, source } = await existingRuleFixture(format.contract, original);
        const report = capture();
        expect(await executePlannedStep(step07, context, false, report.io)).toBe(2);
        expect(report.error.join("")).toContain("conflicting rule BR-0001");
        expect(await readFile(path.join(context.contractsDir, format.contract), "utf8")).toBe(
          original,
        );
        expect(
          await readFile(path.join(context.specsDir, spec, "04_Business-Rules.md"), "utf8"),
        ).toBe(source);
        await expect(
          readFile(
            path.join(
              context.root,
              ".qfai/evidence/migration-spec-to-story/retired",
              spec,
              "04_Business-Rules.md",
            ),
          ),
        ).rejects.toMatchObject({ code: "ENOENT" });
      });
    }
  }

  it("writes SQL and Markdown rule forms with mapped example IDs", async () => {
    // QFAI:EX-0004-0009-03
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: {
          [spec]: {
            "EX-0001-0001": "EX-0001-0001-01",
            "BR-0001-0001": "BR-0001",
            "BR-0001-0002": "BR-0002",
          },
        },
        placements: { [spec]: {} },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows: []\nrules:\n  - id: BR-0001-0001\n    contract: db/orders.sql\n  - id: BR-0001-0002\n    contract: cli/orders.md\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/04_Business-Rules.md`,
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | SQL rule. |\n| BR-0001-0002 | Markdown rule. |\n",
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001, BR-0001-0002 | Input | Output |\n",
    );
    await put(
      context.root,
      ".qfai/spec/03_contract/db/orders.sql",
      "CREATE TABLE orders (id INT);\n",
    );
    await put(context.root, ".qfai/spec/03_contract/cli/orders.md", "# Orders\n");
    expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
    expect(await readFile(path.join(context.contractsDir, "db/orders.sql"), "utf8")).toContain(
      "-- Rule BR-0001: SQL rule.\n-- Examples: EX-0001-0001-01",
    );
    expect(await readFile(path.join(context.contractsDir, "cli/orders.md"), "utf8")).toContain(
      "| BR-0002 | Markdown rule. | EX-0001-0001-01 |",
    );
    expect(await readFile(path.join(context.contractsDir, "cli/orders.md"), "utf8")).toContain(
      "## Rules\n\n| BR-ID | Statement | Examples |",
    );
    await expect(
      readFile(path.join(context.specsDir, spec, "04_Business-Rules.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired",
          spec,
          "04_Business-Rules.md",
        ),
        "utf8",
      ),
    ).toContain("SQL rule.");
  });

  it("writes a mapped rule and both citing examples to a SQL contract", async () => {
    // QFAI:EX-0004-0009-02
    // QFAI:EX-0004-0009-04
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: {
          [spec]: {
            "EX-0001-0001": "EX-0001-0001-01",
            "EX-0001-0002": "EX-0001-0001-02",
            "BR-0001-0001": "BR-0001",
          },
        },
        placements: { [spec]: { "BR-0001-0001": "db/orders.sql" } },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows: []\nrules:\n  - id: BR-0001-0001\n    contract: db/orders.sql\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/04_Business-Rules.md`,
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | An order total is never negative. |\n",
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | First | Pass |\n| EX-0001-0002 | BR-0001-0001 | Second | Pass |\n",
    );
    await put(
      context.root,
      ".qfai/spec/03_contract/db/orders.sql",
      "CREATE TABLE orders (id INT);\n",
    );
    expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
    expect(await readFile(path.join(context.contractsDir, "db/orders.sql"), "utf8")).toContain(
      "-- Rule BR-0001: An order total is never negative.\n-- Examples: EX-0001-0001-01, EX-0001-0001-02",
    );
  });

  it("keeps a placed rule when its contract file is absent", async () => {
    // QFAI:EX-0004-0009-06
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: { [spec]: { "BR-0001-0001": "BR-0001", "EX-0001-0001": "EX-0001-0001-01" } },
        placements: { [spec]: { "BR-0001-0001": "api/missing.yaml" } },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows: []\nrules:\n  - id: BR-0001-0001\n    contract: api/missing.yaml\n",
    );
    const rule =
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | An order total is never negative. |\n";
    await put(context.root, `.qfai/spec/${spec}/04_Business-Rules.md`, rule);
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | First | Pass |\n",
    );
    const result = capture();
    expect(await executePlannedStep(step07, context, false, result.io)).toBe(3);
    expect(result.output.join("")).toContain("contract api/missing.yaml does not exist");
    expect(await readFile(path.join(context.specsDir, spec, "04_Business-Rules.md"), "utf8")).toBe(
      rule,
    );
    await expect(
      readFile(path.join(context.contractsDir, "api/missing.yaml")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  async function partialRuleRun() {
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: {
          [spec]: {
            "BR-0001-0001": "BR-0001",
            "BR-0001-0002": "BR-0002",
            "EX-0001-0001": "EX-0001-0001-01",
            "EX-0001-0002": "EX-0001-0001-02",
          },
        },
        placements: {
          [spec]: { "BR-0001-0001": "api/orders.yaml", "BR-0001-0002": "api/later.yaml" },
        },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows: []\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n  - id: BR-0001-0002\n    contract: api/later.yaml\n",
    );
    const source =
      "# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | An order total is never negative. |\n| BR-0001-0002 | A later rule. |\n";
    await put(context.root, `.qfai/spec/${spec}/04_Business-Rules.md`, source);
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | First | Pass |\n| EX-0001-0002 | BR-0001-0002 | Second | Pass |\n",
    );
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
    const first = capture();
    expect(await executePlannedStep(step07, context, false, first.io)).toBe(3);
    expect(first.output.join("")).toContain("contract api/later.yaml does not exist");
    const current = path.join(context.specsDir, spec, "04_Business-Rules.md");
    const archive = path.join(
      context.root,
      ".qfai/evidence/migration-spec-to-story/retired",
      spec,
      "04_Business-Rules.md",
    );
    expect(await readFile(archive, "utf8")).toBe(source);
    expect(await readFile(current, "utf8")).not.toContain("BR-0001-0001");
    await put(context.root, ".qfai/spec/03_contract/api/later.yaml", "openapi: 3.0.0\n");
    return { context, source, current, archive };
  }

  it("refuses to remove a partly moved rule source that was edited after the first run", async () => {
    const { context, current } = await partialRuleRun();
    const edited = `${await readFile(current, "utf8")}\nKeep BR-0001-0002 under review.\n`;
    await writeFile(current, edited);
    const rerun = capture();
    expect(await executePlannedStep(step07, context, false, rerun.io)).toBe(2);
    expect(rerun.error.join("")).toContain(
      `.qfai/spec/${spec}/04_Business-Rules.md differs from its archived original minus the rules already moved`,
    );
    expect(await readFile(current, "utf8")).toBe(edited);
    expect(await readFile(path.join(context.contractsDir, "api/later.yaml"), "utf8")).toBe(
      "openapi: 3.0.0\n",
    );
  });

  it("completes a partly moved rule source on a clean rerun", async () => {
    const { context, source, current, archive } = await partialRuleRun();
    const rerun = capture();
    expect(await executePlannedStep(step07, context, false, rerun.io)).toBe(0);
    expect(rerun.output.join("")).toContain(
      `.qfai/spec/${spec}/04_Business-Rules.md: archive complete; remove migrated rule source`,
    );
    await expect(readFile(current)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(archive, "utf8")).toBe(source);
    expect(
      parseYaml(await readFile(path.join(context.contractsDir, "api/later.yaml"), "utf8")),
    ).toMatchObject({
      "x-qfai-rules": [
        { id: "BR-0002", statement: "A later rule.", examples: ["EX-0001-0001-02"] },
      ],
    });
    expect(
      parseYaml(await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8")),
    ).toMatchObject({
      "x-qfai-rules": [
        {
          id: "BR-0001",
          statement: "An order total is never negative.",
          examples: ["EX-0001-0001-01"],
        },
      ],
    });
  });

  it("keeps a rule whose only citing example stayed unmapped", async () => {
    // QFAI:EX-0004-0009-09
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: { [spec]: { "BR-0001-0001": "BR-0001" } },
        placements: { [spec]: { "BR-0001-0001": "api/orders.yaml" } },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows: []\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
    );
    const rule =
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | An order total is never negative. |\n";
    const example =
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0002 | BR-0001-0001 | Unplaced | Review |\n";
    await put(context.root, `.qfai/spec/${spec}/04_Business-Rules.md`, rule);
    await put(context.root, `.qfai/spec/${spec}/05_Examples.md`, example);
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
    const result = capture();
    expect(await executePlannedStep(step07, context, false, result.io)).toBe(3);
    expect(result.output.join("")).toContain("no mapped example cites the rule");
    expect(await readFile(path.join(context.specsDir, spec, "04_Business-Rules.md"), "utf8")).toBe(
      rule,
    );
    expect(await readFile(path.join(context.specsDir, spec, "05_Examples.md"), "utf8")).toBe(
      example,
    );
    expect(await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8")).toBe(
      "openapi: 3.0.0\n",
    );
  });

  it("keeps a rule no old example cites", async () => {
    // QFAI:EX-0004-0009-07
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows:\n  - title: Checkout\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
    );
    const source =
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | An order total is never negative. |\n";
    await put(context.root, `.qfai/spec/${spec}/04_Business-Rules.md`, source);
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
    const report = capture();
    expect(await executePlannedStep(step07, context, false, report.io)).toBe(3);
    expect(report.output.join("")).toContain("no mapped example cites the rule");
    expect(await readFile(path.join(context.specsDir, spec, "04_Business-Rules.md"), "utf8")).toBe(
      source,
    );
  });

  it("reports an applicable NFR beside both contracts that received the pack's rules", async () => {
    // QFAI:EX-0004-0009-08
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: {
          [spec]: {
            "BR-0001-0001": "BR-0001",
            "BR-0001-0002": "BR-0002",
            "EX-0001-0001": "EX-0001-0001-01",
            "EX-0001-0002": "EX-0001-0001-02",
          },
        },
        placements: {
          [spec]: { "BR-0001-0001": "api/orders.yaml", "BR-0001-0002": "db/orders.sql" },
        },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows: []\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n  - id: BR-0001-0002\n    contract: db/orders.sql\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/01_Spec.md`,
      "# Orders\n\n## Applicable NFR\n\n- P95 under 200 ms\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/04_Business-Rules.md`,
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | Accept valid orders. |\n| BR-0001-0002 | Persist accepted orders. |\n",
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | First | Accepted |\n| EX-0001-0002 | BR-0001-0002 | Second | Stored |\n",
    );
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
    await put(
      context.root,
      ".qfai/spec/03_contract/db/orders.sql",
      "CREATE TABLE orders (id INT);\n",
    );
    const report = capture();
    expect(await executePlannedStep(step07, context, false, report.io)).toBe(3);
    const output = report.output.join("");
    expect(output).toContain("Applicable NFR: - P95 under 200 ms");
    expect(output).toContain("contracts: api/orders.yaml, db/orders.sql");
    expect(await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8")).toContain(
      "BR-0001",
    );
    expect(await readFile(path.join(context.contractsDir, "db/orders.sql"), "utf8")).toContain(
      "BR-0002",
    );
  });

  it("refuses changed or unknown rule placements before writing a contract", async () => {
    const context = await fixture();
    await put(
      context.root,
      `.qfai/spec/${spec}/04_Business-Rules.md`,
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | An order total is never negative. |\n",
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | Input | Output |\n",
    );
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
    await put(context.root, ".qfai/spec/03_contract/api/other.yaml", "openapi: 3.0.0\n");
    for (const rule of [
      { id: "BR-0001-0001", contract: "api/other.yaml" },
      { id: "BR-0001-9999", contract: "api/orders.yaml" },
    ]) {
      const preservedRule =
        rule.id === "BR-0001-9999" ? "  - id: BR-0001-0001\n    contract: api/orders.yaml\n" : "";
      await put(
        context.root,
        ".qfai/evidence/migration-spec-to-story/plan.yaml",
        `flows:\n  - title: Checkout\n    stories:\n      - id: US-0001-0001\nrules:\n${preservedRule}  - id: ${rule.id}\n    contract: ${rule.contract}\n`,
      );
      const c = capture();
      expect(await executePlannedStep(step07, context, false, c.io)).toBe(2);
      expect(c.error.join("")).toContain(rule.id);
      expect(await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8")).toBe(
        "openapi: 3.0.0\n",
      );
      expect(await readFile(path.join(context.contractsDir, "api/other.yaml"), "utf8")).toBe(
        "openapi: 3.0.0\n",
      );
    }
  });

  it("rewrites selected case annotations and E2E story annotations, and reports retained lines", async () => {
    const context = await fixture();
    await put(
      context.root,
      "tests/integration/checkout.test.ts",
      "// QFAI:SPEC-0001:TC-0001-0001\n// QFAI:SPEC-0001:US-0001-0001\n// QFAI:CON-API-0001\n",
    );
    await put(
      context.root,
      "tests/e2e/checkout.test.ts",
      "// QFAI:SPEC-0001:US-0001-0001\n// QFAI:SPEC-0001:TC-0001-9999\n",
    );
    const c = capture();
    expect(await executePlannedStep(step08, context, false, c.io)).toBe(3);
    expect(
      await readFile(path.join(context.root, "tests/integration/checkout.test.ts"), "utf8"),
    ).toContain(["QFAI", "EX-0001-0001-02"].join(":"));
    expect(await readFile(path.join(context.root, "tests/e2e/checkout.test.ts"), "utf8")).toContain(
      ["QFAI", "BF-0001"].join(":"),
    );
    expect(c.output.join("")).toContain("Annotations kept");
    expect(c.output.join("")).toContain("QFAI:SPEC-0001:US-0001-0001");
    expect(c.output.join("")).toContain("QFAI:SPEC-0001:TC-0001-9999");
  });
});

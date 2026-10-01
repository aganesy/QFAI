import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { defaultConfig } from "../../../../src/core/config.js";
import { validateProject } from "../../../../src/core/validate.js";
import { readIdMap, serializeIdMap } from "../../../../src/migration/specToStory/idMap.js";
import {
  executePlannedStep,
  type MigrationContext,
  type MigrationStep,
} from "../../../../src/migration/specToStory/harness.js";
import { step04 } from "../../../../src/migration/specToStory/step04RenumberIds.js";
import { step05 } from "../../../../src/migration/specToStory/step05CasesToExamples.js";
import { step06 } from "../../../../src/migration/specToStory/step06DeriveAcRefs.js";
import { step07 } from "../../../../src/migration/specToStory/step07RulesToContracts.js";
import { step08 } from "../../../../src/migration/specToStory/step08RewriteAnnotations.js";
import { atLocation } from "../../../helpers/reportLocation.js";

const roots: string[] = [];
const spec = "spec-0001";
const story = "02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md";

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function bareFixture(): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-steps-"));
  roots.push(root);
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = ".qfai/spec";
  config.paths.contractsDir = ".qfai/spec/03_contract";
  config.paths.testsDir = "tests";
  config.validation.traceability.testFileGlobs = ["tests/**/*.test.ts"];
  return {
    root,
    specsDir: path.join(root, config.paths.specsDir),
    contractsDir: path.join(root, config.paths.contractsDir),
    config,
  };
}

async function fixture(): Promise<MigrationContext> {
  const context = await bareFixture();
  const root = context.root;
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
          "BR-0001-0001": "BR-0002-0001",
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

/** Every file under `root`, keyed by its relative path, with its bytes. */
async function snapshot(root: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    files.set(path.relative(root, file).replace(/\\/g, "/"), await readFile(file, "latin1"));
  }
  return files;
}

/** The body of one `## <name>` section of a step report. */
function reportSection(output: string, name: string): string {
  const heading = `## ${name}\n`;
  const start = output.indexOf(heading);
  if (start < 0) return "";
  const body = output.slice(start + heading.length);
  const end = body.indexOf("\n## ");
  return (end < 0 ? body : body.slice(0, end)).trimEnd();
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

const packDir = `.qfai/spec/${spec}`;
const planFile = ".qfai/evidence/migration-spec-to-story/plan.yaml";
const twoStoryFlows =
  "flows:\n  - title: Checkout\n    stories:\n      - id: US-0001-0001\n      - id: US-0001-0002\n";
const examplesEntry = "examples:\n  - id: EX-0001-0002\n    criterion: AC-0001-0002\n";
const flowDir = "02_business-flow/business-flow-0001";

/**
 * A spec pack as it stands after steps 1 to 3: two stories with one criterion each, three
 * examples (the second cited by two test cases that name different criteria, the third by
 * none), and the rules and plan the caller gives.
 */
async function twoStoryPack(plan: string, rules = "# Rules\n"): Promise<MigrationContext> {
  const context = await bareFixture();
  const root = context.root;
  await put(
    root,
    `${packDir}/01_Spec.md`,
    "# Spec\n\n- Status: active\n\n## Scope\n\n- In: Orders.\n",
  );
  await put(
    root,
    `${packDir}/02_User-stories.md`,
    "# Stories\n\n## US-0001-0001: Place order\n\nPlace order.\n\n## US-0001-0002: Review order\n\nReview order.\n",
  );
  await put(
    root,
    `${packDir}/03_Acceptance-Criteria.md`,
    "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Place an order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n\n# AC-0001-0002\n# Parent: US-0001-0002\nScenario: Review an order\n  Given an order\n  When it is opened\n  Then it is shown\n```\n",
  );
  await put(root, `${packDir}/04_Business-Rules.md`, rules);
  await put(
    root,
    `${packDir}/05_Examples.md`,
    "# Examples\n\n| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | one item | accepted |\n| EX-0001-0002 | — | two items | accepted twice |\n| EX-0001-0003 | — | free item | accepted free |\n",
  );
  await put(
    root,
    `${packDir}/06_Test-Cases.md`,
    "# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n| TC-0001-0002 | AC-0001-0001 | EX-0001-0002 | submit twice | accepted |\n| TC-0001-0003 | AC-0001-0002 | EX-0001-0002 | review | shown |\n",
  );
  await put(root, planFile, plan);
  return context;
}

/** Runs the steps in order and fails on the first that refuses its input, with its message. */
async function runInOrder(
  context: MigrationContext,
  steps: readonly MigrationStep[],
): Promise<void> {
  for (const step of steps) {
    const report = capture();
    const code = await executePlannedStep(step, context, false, report.io);
    expect(code, report.error.join("")).not.toBe(2);
  }
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
    const twoCriteria = `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md: TC-0001-0004: several criteria`;
    const before = await snapshot(context.root);
    const dry = capture();
    expect(await executePlannedStep(step05, context, true, dry.io)).toBe(3);
    expect(reportSection(dry.output.join(""), "For a person")).toContain(twoCriteria);
    expect(await snapshot(context.root)).toEqual(before);
    const c = capture();
    expect(await executePlannedStep(step05, context, false, c.io)).toBe(3);
    expect(c.output.join("")).toContain("TC-0001-0001 → EX-0001-0001-02");
    expect(c.output.join("")).toContain("TC-0001-0003");
    expect(reportSection(c.output.join(""), "For a person")).toContain(twoCriteria);
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

  it("writes a case's steps as plain values and lists a cell holding several steps", async () => {
    // QFAI:EX-0004-0008-12
    // QFAI:EX-0004-0008-13
    const context = await fixture();
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md`,
      "# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | — | When the order is submitted | Then the order is accepted |\n| TC-0001-0006 | AC-0001-0001 | — | Given a cart When it is submitted | Accepted |\n",
    );
    const c = capture();
    expect(await executePlannedStep(step05, context, false, c.io)).toBe(3);
    const examples = await readFile(path.join(context.specsDir, story), "utf8");
    expect(examples).toContain(
      "| EX-0001-0001-02 | AC-0001-0001-01 | the order is submitted | the order is accepted |",
    );
    expect(examples).toContain(
      "| EX-0001-0001-03 | AC-0001-0001-01 | Given a cart When it is submitted | Accepted |",
    );
    expect(reportSection(c.output.join(""), "Cases to examples")).toBe(
      "- TC-0001-0001 → EX-0001-0001-02\n- TC-0001-0006 → EX-0001-0001-03",
    );
    expect(reportSection(c.output.join(""), "For a person")).toBe(
      `- .qfai/spec/${story}: EX-0001-0001-03 Input is Gherkin steps, not one plain value; rewrite it`,
    );
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

  it("places an example cited with and without a criterion under that criterion's story", async () => {
    // QFAI:EX-0004-0008-10
    const context = await bareFixture();
    await put(
      context.root,
      `.qfai/spec/${spec}/01_Spec.md`,
      "# Spec\n\n- Status: active\n\n## Scope\n\n- In: Orders.\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/02_User-stories.md`,
      "# Stories\n\n## US-0001-0001: Browse\n\nBrowse.\n\n## US-0001-0002: Order\n\nOrder.\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/03_Acceptance-Criteria.md`,
      "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Browse\n  Given a catalog\n  When it is opened\n  Then items are listed\n\n# AC-0001-0002\n# Parent: US-0001-0002\nScenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
    );
    await put(context.root, `.qfai/spec/${spec}/04_Business-Rules.md`, "# Rules\n");
    await put(
      context.root,
      `.qfai/spec/${spec}/05_Examples.md`,
      "# Examples\n\n| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | — | A full cart | Accepted |\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/06_Test-Cases.md`,
      "# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0002 | EX-0001-0001 | Place order | Accepted |\n| TC-0001-0002 | — | EX-0001-0001 | Place again | Accepted |\n",
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows:\n  - title: Checkout\n    stories:\n      - id: US-0001-0001\n      - id: US-0001-0002\nrules: []\n",
    );
    for (const step of [step04, step05, step06]) {
      const report = capture();
      expect(
        await executePlannedStep(step, context, false, report.io),
        report.error.join(""),
      ).not.toBe(2);
    }
    const flow = path.join(context.specsDir, "02_business-flow/business-flow-0001");
    const criteria = await readFile(
      path.join(flow, "user-story-0001-0002/02_Acceptance-Criteria.md"),
      "utf8",
    );
    expect(criteria).toContain("  # AC-0001-0002-01\n  Scenario: Order");
    expect(await readFile(path.join(flow, "user-story-0001-0002/03_Example.md"), "utf8")).toContain(
      "| EX-0001-0002-01 | AC-0001-0002-01 | A full cart | Accepted |",
    );
    expect(
      await readFile(path.join(flow, "user-story-0001-0001/03_Example.md"), "utf8"),
    ).not.toContain("A full cart");
  });

  it("reports a case-only row whose one criterion has no new ID without writing an example", async () => {
    // QFAI:EX-0004-0008-11
    const context = await fixture();
    const examplePath = path.join(context.specsDir, story);
    const examples = await readFile(examplePath, "utf8");
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md`,
      "| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0003 | — | Unmapped criterion | Review |\n",
    );
    const report = capture();
    expect(await executePlannedStep(step05, context, false, report.io)).toBe(3);
    expect(reportSection(report.output.join(""), "For a person")).toBe(
      `- .qfai/evidence/migration-spec-to-story/retired/${spec}/06_Test-Cases.md: TC-0001-0001: missing ID mapping`,
    );
    expect(reportSection(report.output.join(""), "Operations")).toBe("none");
    expect(await readFile(examplePath, "utf8")).toBe(examples);
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
          id: "BR-0002-0001",
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
    expect(contract).toContain("BR-0002-0001");
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
        `openapi: 3.0.0\nx-qfai-rules:\n  - id: BR-0002-0001\n    statement: ${statement}\n    examples: [${examples.join(", ")}]\n`,
    },
    {
      contract: "api/orders.json",
      render: (statement: string, examples: string[]) =>
        `${JSON.stringify({ "x-qfai-rules": [{ id: "BR-0002-0001", statement, examples }] }, null, 2)}\n`,
    },
    {
      contract: "db/orders.sql",
      render: (statement: string, examples: string[]) =>
        `CREATE TABLE orders (id INT);\n\n-- Rule BR-0002-0001: ${statement}\n-- Examples: ${examples.join(", ")}\n`,
    },
    {
      contract: "cli/orders.md",
      render: (statement: string, examples: string[]) =>
        `# Orders\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0002-0001 | ${statement} | ${examples.join(", ")} |\n`,
    },
  ] as const;

  async function existingRuleFixture(contract: string, content: string) {
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: { [spec]: { "BR-0001-0001": "BR-0002-0001", "EX-0001-0001": "EX-0001-0001-01" } },
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
        expect(report.error.join("")).toContain("conflicting rule BR-0002-0001");
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
            "BR-0001-0001": "BR-0002-0001",
            "BR-0001-0002": "BR-0002-0002",
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
      "-- Rule BR-0002-0001: SQL rule.\n-- Examples: EX-0001-0001-01",
    );
    expect(await readFile(path.join(context.contractsDir, "cli/orders.md"), "utf8")).toContain(
      "| BR-0002-0002 | Markdown rule. | EX-0001-0001-01 |",
    );
    expect(await readFile(path.join(context.contractsDir, "cli/orders.md"), "utf8")).toContain(
      "## Business rules\n\n| BR-ID | Statement | Examples |",
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
            "BR-0001-0001": "BR-0002-0001",
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
      "-- Rule BR-0002-0001: An order total is never negative.\n-- Examples: EX-0001-0001-01, EX-0001-0001-02",
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
        ids: { [spec]: { "BR-0001-0001": "BR-0002-0001", "EX-0001-0001": "EX-0001-0001-01" } },
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
            "BR-0001-0001": "BR-0002-0001",
            "BR-0001-0002": "BR-0002-0002",
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
        { id: "BR-0002-0002", statement: "A later rule.", examples: ["EX-0001-0001-02"] },
      ],
    });
    expect(
      parseYaml(await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8")),
    ).toMatchObject({
      "x-qfai-rules": [
        {
          id: "BR-0002-0001",
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
        ids: { [spec]: { "BR-0001-0001": "BR-0002-0001" } },
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

  it("adds a placed rule to a JSON contract as one top-level x-qfai-rules object", async () => {
    // QFAI:EX-0004-0009-10
    const { context } = await existingRuleFixture("api/orders.json", '{"openapi":"3.0.0"}\n');
    expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
    const parsed: unknown = JSON.parse(
      await readFile(path.join(context.contractsDir, "api/orders.json"), "utf8"),
    );
    expect(parsed).toEqual({
      openapi: "3.0.0",
      "x-qfai-rules": [
        {
          id: "BR-0002-0001",
          statement: "An order total is never negative.",
          examples: ["EX-0001-0001-01"],
        },
      ],
    });
  });

  it("adds a placed rule as one row of an existing Markdown Rules table", async () => {
    // QFAI:EX-0004-0009-11
    const oldRow = "| BR-0002-0002 | A cart holds one currency. | EX-0001-0002-01 |";
    const { context } = await existingRuleFixture(
      "cli/orders.md",
      `# Orders\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n${oldRow}\n`,
    );
    expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
    const contract = await readFile(path.join(context.contractsDir, "cli/orders.md"), "utf8");
    expect(contract.match(/^## Business rules$/gm)).toHaveLength(1);
    expect(contract.split("\n").filter((line) => /^\| BR-\d{4}-\d{4} \|/.test(line))).toEqual([
      oldRow,
      "| BR-0002-0001 | An order total is never negative. | EX-0001-0001-01 |",
    ]);
  });

  it("lists only the placed citing example when another stayed in its pack", async () => {
    // QFAI:EX-0004-0009-12
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: { [spec]: { "BR-0001-0001": "BR-0002-0001", "EX-0001-0001": "EX-0001-0001-01" } },
        placements: { [spec]: { "BR-0001-0001": "api/orders.yaml" } },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows: []\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/04_Business-Rules.md`,
      "| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | An order total is never negative. |\n",
    );
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | Placed | Pass |\n| EX-0001-0002 | BR-0001-0001 | Kept | Review |\n",
    );
    await put(
      context.root,
      `.qfai/spec/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0002 | BR-0001-0001 | Kept | Review |\n",
    );
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
    expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
    expect(
      parseYaml(await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8")),
    ).toEqual({
      openapi: "3.0.0",
      "x-qfai-rules": [
        {
          id: "BR-0002-0001",
          statement: "An order total is never negative.",
          examples: ["EX-0001-0001-01"],
        },
      ],
    });
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
            "BR-0001-0001": "BR-0002-0001",
            "BR-0001-0002": "BR-0002-0002",
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
      "BR-0002-0001",
    );
    expect(await readFile(path.join(context.contractsDir, "db/orders.sql"), "utf8")).toContain(
      "BR-0002-0002",
    );
  });

  it("refuses changed or unknown rule placements before writing a contract", async () => {
    // QFAI:EX-0004-0003-26
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

  it("leaves a legacy criterion annotation in place and reports it for a person", async () => {
    // QFAI:EX-0004-0010-05
    const context = await fixture();
    const annotation = ["QFAI", "SPEC-0001", "AC-0001-0001"].join(":");
    const content = `import { it } from "vitest";\n// ${annotation}\nit("orders", () => {});\n`;
    await put(context.root, "tests/integration/orders.test.ts", content);
    const report = capture();
    expect(await executePlannedStep(step08, context, false, report.io)).toBe(3);
    expect(
      await readFile(path.join(context.root, "tests/integration/orders.test.ts"), "utf8"),
    ).toBe(content);
    expect(reportSection(report.output.join(""), "For a person")).toBe(
      `- tests/integration/orders.test.ts:2: ${annotation}: no usable ID mapping`,
    );
  });

  it("sets an example's AC-Ref from the plan's examples entry", async () => {
    // QFAI:EX-0004-0008-14
    const exampleFile = (context: MigrationContext): string =>
      path.join(context.specsDir, flowDir, "user-story-0001-0002/03_Example.md");
    const withoutEntry = await twoStoryPack(`${twoStoryFlows}rules: []\n`);
    await runInOrder(withoutEntry, [step04, step05, step06]);
    expect(await readFile(exampleFile(withoutEntry), "utf8")).not.toContain("EX-0001-0002-01");

    const context = await twoStoryPack(`${twoStoryFlows}rules: []\n${examplesEntry}`);
    await runInOrder(context, [step04, step05, step06]);
    const placed = "| EX-0001-0002-01 | AC-0001-0002-01 | two items | accepted twice |";
    expect(await readFile(exampleFile(context), "utf8")).toContain(placed);

    const blanked = (await readFile(exampleFile(context), "utf8")).replace(
      "| EX-0001-0002-01 | AC-0001-0002-01 |",
      "| EX-0001-0002-01 | — |",
    );
    await writeFile(exampleFile(context), blanked);
    expect(await executePlannedStep(step06, context, false, capture().io)).toBe(0);
    expect(await readFile(exampleFile(context), "utf8")).toContain(placed);
  });

  it("removes a rule marked binds none or retire without placing it in a contract", async () => {
    // QFAI:EX-0004-0009-16
    const context = await twoStoryPack(
      `${twoStoryFlows}rules:\n  - id: BR-0001-0001\n    binds: none\n  - id: BR-0001-0002\n    retire: superseded by another rule\n`,
      "# Rules\n\n| BR-ID | Rule | Contract-Refs |\n| --- | --- | --- |\n| BR-0001-0001 | Orders may be free. | - |\n| BR-0001-0002 | Orders may be held. | - |\n",
    );
    await put(context.root, ".qfai/spec/03_contract/api/api-0001-orders.yaml", "openapi: 3.0.0\n");
    await runInOrder(context, [step04]);
    const exampleFile = path.join(context.specsDir, flowDir, "user-story-0001-0001/03_Example.md");
    const placed = await readFile(exampleFile, "utf8");
    const report = capture();
    expect(await executePlannedStep(step07, context, false, report.io), report.error.join("")).toBe(
      0,
    );
    const output = report.output.join("");
    const operations = reportSection(output, "Operations");
    expect(operations).toContain("BR-0001-0001");
    expect(operations).toContain("BR-0001-0002");
    expect(operations).toContain("superseded by another rule");
    expect(reportSection(output, "For a person")).toBe("none");
    const map = await readFile(
      path.join(context.root, ".qfai/evidence/migration-spec-to-story/id-map.json"),
      "utf8",
    );
    expect(map).not.toContain("BR-0001-0001");
    expect(map).not.toContain("BR-0001-0002");
    await expect(
      readFile(path.join(context.specsDir, spec, "04_Business-Rules.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const archive = await readFile(
      path.join(
        context.root,
        ".qfai/evidence/migration-spec-to-story/retired",
        spec,
        "04_Business-Rules.md",
      ),
      "utf8",
    );
    expect(archive).toContain("BR-0001-0001");
    expect(archive).toContain("BR-0001-0002");
    expect(
      await readFile(path.join(context.contractsDir, "api/api-0001-orders.yaml"), "utf8"),
    ).toBe("openapi: 3.0.0\n");
    expect(await readFile(exampleFile, "utf8")).toBe(placed);
  });

  it("removes only a rule's own table row and heading section from its source", async () => {
    // QFAI:EX-0004-0009-17
    const context = await fixture();
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows:\n  - title: Checkout\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
    );
    const source =
      "# Rules\n\n| BR-ID | Status |\n| --- | --- |\n| BR-0001-0001 | active |\n| BR-0001-0002 | active |\n\n## BR-0001-0001: Valid total\n\n- Status: active\n- The total MUST be nonnegative.\n\n## BR-0001-0002: Later rule\n\n- Status: active\n- A later rule.\n";
    await put(context.root, `.qfai/spec/${spec}/04_Business-Rules.md`, source);
    await put(
      context.root,
      `.qfai/evidence/migration-spec-to-story/retired/${spec}/05_Examples.md`,
      "| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | Input | Output |\n",
    );
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
    const report = capture();
    expect(await executePlannedStep(step07, context, false, report.io)).toBe(3);
    expect(report.error.join("")).toBe("");
    const contract = parseYaml(
      await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8"),
    );
    expect(contract).toMatchObject({
      "x-qfai-rules": [
        {
          id: "BR-0002-0001",
          statement: expect.stringContaining("The total MUST be nonnegative."),
        },
      ],
    });
    expect(contract).toHaveProperty(["x-qfai-rules", "length"], 1);
    const remaining = await readFile(
      path.join(context.specsDir, spec, "04_Business-Rules.md"),
      "utf8",
    );
    expect(remaining.split("\n").filter((line) => line.trim() !== "")).toEqual([
      "# Rules",
      "| BR-ID | Status |",
      "| --- | --- |",
      "| BR-0001-0002 | active |",
      "## BR-0001-0002: Later rule",
      "- Status: active",
      "- A later rule.",
    ]);
    expect(reportSection(report.output.join(""), "For a person")).toContain(
      `.qfai/spec/${spec}/04_Business-Rules.md: BR-0001-0002: no contract placement in plan`,
    );
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

  it("rewrites the annotation of a test case whose example the plan's entry placed", async () => {
    // QFAI:EX-0004-0010-07
    const legacy = ["QFAI", "SPEC-0001", "TC-0001-0002"].join(":");
    const file = "tests/integration/order.test.ts";
    const withTestFile = async (plan: string): Promise<MigrationContext> => {
      const context = await twoStoryPack(plan);
      await put(context.root, file, `// ${legacy}\nit("orders", () => {});\n`);
      await runInOrder(context, [step04, step05, step06, step07]);
      return context;
    };
    const unplaced = await withTestFile(`${twoStoryFlows}rules: []\n`);
    const kept = capture();
    expect(await executePlannedStep(step08, unplaced, false, kept.io)).toBe(3);
    expect(reportSection(kept.output.join(""), "For a person")).toBe(
      `- ${file}:1: ${legacy}: no usable ID mapping`,
    );

    const context = await withTestFile(`${twoStoryFlows}rules: []\n${examplesEntry}`);
    const report = capture();
    expect(await executePlannedStep(step08, context, false, report.io)).toBe(0);
    expect(await readFile(path.join(context.root, file), "utf8")).toBe(
      `// ${["QFAI", "EX-0001-0002-01"].join(":")}\nit("orders", () => {});\n`,
    );
    expect(reportSection(report.output.join(""), "For a person")).toBe("none");
  });
});

const orderRule = "An order total is never negative, and it is at most the credit limit.";
const limitRule = "An order is refused above the limit, with no partial receipt.";

/** The two rules as heading sections with a `Rule` field continued on a second line. */
const sectionRules =
  "# Rules\n\n## BR-0001-0001: Order total\n\n- **Rule**: An order total is never negative,\n  and it is at most the credit limit.\n- **Notes**: Totals are rounded.\n- **NFRs**: NFR-0030\n- **Contracts**: DB-0001\n\n## BR-0001-0002: Order limit\n\n- **Rule**: An order is refused above the limit,\n  with no partial receipt.\n- **Notes**: Limits are per account.\n- **NFRs**: NFR-0030\n- **Contracts**: API-0001\n";

/** The same two rules as table rows. */
const tableRules = `# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | ${orderRule} |\n| BR-0001-0002 | ${limitRule} |\n`;

/**
 * A project whose plan places `BR-0001-0001` in `db/orders.sql` and `BR-0001-0002` in
 * `api/orders.yaml`, both cited by one old example, with the rules written as `source` says.
 */
async function ruleProject(source: string): Promise<MigrationContext> {
  const context = await fixture();
  await put(
    context.root,
    ".qfai/evidence/migration-spec-to-story/id-map.json",
    serializeIdMap({
      version: 1,
      ids: {
        [spec]: {
          "EX-0001-0001": "EX-0001-0001-01",
          "BR-0001-0001": "BR-0002-0001",
          "BR-0001-0002": "BR-0002-0002",
        },
      },
      placements: { [spec]: {} },
      retiredPacks: {},
    }),
  );
  await put(
    context.root,
    planFile,
    "flows: []\nrules:\n  - id: BR-0001-0001\n    contract: db/orders.sql\n  - id: BR-0001-0002\n    contract: api/orders.yaml\n",
  );
  await put(context.root, `${packDir}/04_Business-Rules.md`, source);
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
  await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", "openapi: 3.0.0\n");
  return context;
}

function oneLine(value: unknown): string {
  return String(value).replace(/\s+/g, " ").trim();
}

/**
 * The `-- Rule <id>:` line of a SQL contract, its whitespace runs collapsed, and the line under
 * it. A rule comment that runs over several lines puts something else under the first line.
 */
function ruleComment(sql: string, id: string): string[] {
  const lines = sql.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`-- Rule ${id}:`));
  return start < 0 ? [] : [oneLine(lines[start]), oneLine(lines[start + 1])];
}

/** The IDs a YAML contract's `x-qfai-depends-on` holds as a flow list on one line, or `null`. */
function dependsOnList(text: string): string[] | null {
  const list = /^x-qfai-depends-on:[ \t]*\[([^\]\n]*)\][ \t]*$/m.exec(text)?.[1];
  return list === undefined ? null : list.split(",").map((id) => id.trim());
}

function field(value: unknown, name: string): unknown {
  return typeof value === "object" && value !== null && name in value
    ? Reflect.get(value, name)
    : undefined;
}

/** The `x-qfai-rules` entries of a YAML contract, each narrowed to its three fields. */
function yamlRules(text: string): { id: unknown; statement: unknown; examples: unknown }[] {
  const rules = field(parseYaml(text), "x-qfai-rules");
  if (!Array.isArray(rules)) return [];
  return rules.map((rule: unknown) => ({
    id: field(rule, "id"),
    statement: field(rule, "statement"),
    examples: field(rule, "examples"),
  }));
}

describe("migration step 7 writes the Rule value of a rule written as a section", () => {
  it("writes a section rule as the table row of the same rule would be written", async () => {
    // QFAI:EX-0004-0009-18
    const sqlLine = (rule: string) => [
      `-- Rule BR-0002-0001: ${rule}`,
      "-- Examples: EX-0001-0001-01",
    ];
    const written = async (source: string) => {
      const context = await ruleProject(source);
      expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
      return {
        sql: await readFile(path.join(context.contractsDir, "db/orders.sql"), "utf8"),
        yaml: yamlRules(await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8")),
      };
    };

    const table = await written(tableRules);
    expect(ruleComment(table.sql, "BR-0002-0001")).toEqual(sqlLine(orderRule));
    expect(table.yaml).toHaveLength(1);
    expect(table.yaml[0]).toMatchObject({ id: "BR-0002-0002", examples: ["EX-0001-0001-01"] });
    expect(oneLine(table.yaml[0]?.statement)).toBe(limitRule);

    const section = await written(sectionRules);
    expect(ruleComment(section.sql, "BR-0002-0001")).toEqual(sqlLine(orderRule));
    expect(section.sql).not.toMatch(/Notes|NFR|\*\*|Order total|DB-0001/);
    expect(section.yaml).toHaveLength(1);
    expect(section.yaml[0]).toMatchObject({ id: "BR-0002-0002", examples: ["EX-0001-0001-01"] });
    expect(oneLine(section.yaml[0]?.statement)).toBe(limitRule);
  });

  it("keeps the title and the content of a section that has no Rule field", async () => {
    const context = await ruleProject(
      "# Rules\n\n## BR-0001-0001: Valid total\n\n- Status: active\n- The total MUST be nonnegative.\n\n## BR-0001-0002: Later rule\n\n- Status: active\n- A later rule.\n",
    );
    expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
    const sql = await readFile(path.join(context.contractsDir, "db/orders.sql"), "utf8");
    expect(sql).toContain("Valid total");
    expect(sql).toContain("The total MUST be nonnegative.");
    const [rule] = yamlRules(
      await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8"),
    );
    expect(String(rule?.statement)).toContain("Later rule");
    expect(String(rule?.statement)).toContain("A later rule.");
  });

  // QFAI:EX-0004-0009-18
  it("rewrites an SQL rule an earlier step 7 left over several comment lines", async () => {
    const context = await ruleProject(sectionRules);
    const words = orderRule.split(" ");
    const half = Math.ceil(words.length / 2);
    const target = path.join(context.contractsDir, "db/orders.sql");
    await put(
      context.root,
      path.relative(context.root, target),
      `CREATE TABLE orders (id INT);\n\n-- Rule BR-0002-0001: ${words.slice(0, half).join(" ")}\n-- ${words.slice(half).join(" ")}\n-- Examples: EX-0001-0001-01\n`,
    );
    expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
    expect(ruleComment(await readFile(target, "utf8"), "BR-0002-0001")).toEqual([
      `-- Rule BR-0002-0001: ${orderRule}`,
      "-- Examples: EX-0001-0001-01",
    ]);
  });

  // QFAI:EX-0004-0009-18
  it("raises no conflicting rule when a rerun meets the SQL rule it wrote", async () => {
    const context = await ruleProject(sectionRules);
    await put(
      context.root,
      planFile,
      "flows: []\nrules:\n  - id: BR-0001-0001\n    contract: db/orders.sql\n  - id: BR-0001-0002\n    contract: db/later.sql\n",
    );
    const first = capture();
    expect(await executePlannedStep(step07, context, false, first.io)).toBe(3);
    expect(first.output.join("")).toContain("contract db/later.sql does not exist");
    const written = await readFile(path.join(context.contractsDir, "db/orders.sql"), "utf8");
    expect(ruleComment(written, "BR-0002-0001")).toEqual([
      `-- Rule BR-0002-0001: ${orderRule}`,
      "-- Examples: EX-0001-0001-01",
    ]);

    await put(
      context.root,
      ".qfai/spec/03_contract/db/later.sql",
      "CREATE TABLE later (id INT);\n",
    );
    const rerun = capture();
    expect(await executePlannedStep(step07, context, false, rerun.io)).toBe(0);
    expect(rerun.error.join("")).not.toContain("conflicting rule");
    expect(await readFile(path.join(context.contractsDir, "db/orders.sql"), "utf8")).toBe(written);
    expect(
      ruleComment(
        await readFile(path.join(context.contractsDir, "db/later.sql"), "utf8"),
        "BR-0002-0002",
      ),
    ).toEqual([`-- Rule BR-0002-0002: ${limitRule}`, "-- Examples: EX-0001-0001-01"]);
  });
});

const dependencies = Array.from(
  { length: 8 },
  (_, index) => `DB-${String(index + 2).padStart(4, "0")}`,
);
const longDependsOn = `x-qfai-depends-on: [${dependencies.join(", ")}]`;

describe("migration step 7 keeps the declarations of a YAML contract", () => {
  it("keeps a list of dependencies longer than 80 columns on one line", async () => {
    // QFAI:EX-0004-0009-19
    const context = await ruleProject(tableRules);
    const contract = `# QFAI-CONTRACT-ID: API-0001\nopenapi: 3.0.0\n${longDependsOn}\ninfo:\n  title: Orders API\n`;
    expect(longDependsOn.length).toBeGreaterThan(80);
    await put(context.root, ".qfai/spec/03_contract/api/orders.yaml", contract);
    expect(await executePlannedStep(step07, context, false, capture().io)).toBe(0);
    const written = await readFile(path.join(context.contractsDir, "api/orders.yaml"), "utf8");
    expect(written).toContain("x-qfai-rules:");
    expect(written.split("\n")[0]).toBe("# QFAI-CONTRACT-ID: API-0001");
    expect(dependsOnList(written)).toEqual(dependencies);
  });
});

describe("migration step 8 leaves a test-case annotation in an E2E file", () => {
  const legacyCase = ["QFAI", "SPEC-0001", "TC-0001-0001"].join(":");
  const legacyStory = ["QFAI", "SPEC-0001", "US-0001-0001"].join(":");
  const e2eFile = "tests/e2e/order.test.ts";
  const outsideFile = "tests/integration/order.test.ts";

  async function migrated() {
    const context = await twoStoryPack(`${twoStoryFlows}rules: []\n`);
    await put(
      context.root,
      e2eFile,
      `// ${legacyStory}\n// ${legacyCase}\nit("orders", () => {});\n`,
    );
    await put(context.root, outsideFile, `// ${legacyCase}\nit("orders", () => {});\n`);
    await runInOrder(context, [step04, step05, step06, step07]);
    const example = (await readIdMap(context.root))?.ids[spec]?.["TC-0001-0001"] ?? "";
    expect(example).toMatch(/^EX-\d{4}-\d{4}-\d{2}$/);
    return { context, example };
  }

  /**
   * The findings of `qfai validate --profile tdd` on the migrated tree. The cut-over step removes
   * the old pack, and validation reports nothing else while one is left, so the pack goes first.
   */
  async function findings(context: MigrationContext) {
    await rm(path.join(context.root, packDir), { recursive: true, force: true });
    const result = await validateProject(
      context.root,
      {
        config: context.config,
        issues: [],
        configPath: path.join(context.root, "qfai.config.yaml"),
      },
      { profile: "tdd" },
    );
    return result.issues;
  }

  async function misplacedIn(context: MigrationContext, file: string): Promise<string[]> {
    return (await findings(context))
      .filter(
        (issue) =>
          issue.code === "QFAI-STORY-007" &&
          issue.message.replaceAll("\\", "/").includes(file.replaceAll("\\", "/")),
      )
      .map((issue) => issue.message);
  }

  it("rewrites the story annotation, lists the case annotation and lists it again on each run", async () => {
    // QFAI:EX-0004-0010-08
    const { context, example } = await migrated();
    const first = capture();
    const firstCode = await executePlannedStep(step08, context, false, first.io);

    // Control: a case annotation outside the E2E layer and a story annotation inside it.
    expect(await readFile(path.join(context.root, outsideFile), "utf8")).toBe(
      `// ${["QFAI", example].join(":")}\nit("orders", () => {});\n`,
    );
    const afterFirst = await readFile(path.join(context.root, e2eFile), "utf8");
    expect(afterFirst.split("\n")[0]).toBe(`// ${["QFAI", "BF-0001"].join(":")}`);
    expect(firstCode).toBe(3);

    // The case annotation of the E2E file stays as it is and is listed.
    expect(afterFirst.split("\n")[1]).toBe(`// ${legacyCase}`);
    expect(afterFirst).not.toContain(["QFAI", "EX-"].join(":"));
    const listed = reportSection(first.output.join(""), "For a person");
    expect(listed.split("\n").filter((line) => line.startsWith("- "))).toHaveLength(1);
    expect(listed).toMatch(atLocation(e2eFile, 2));
    expect(listed).toContain(legacyCase);
    expect(listed).toContain(example);
    expect(listed).toMatch(/outside[^.]*E2E/i);
    expect(listed).toMatch(new RegExp(`Test exception: (?:<EX>|${example})`));
    expect(listed).toContain("decisions.md");
    expect(listed).toMatch(/Approach/);
    expect(listed).toMatch(/DONE/);
    expect(listed).toMatch(/delete/i);

    const second = capture();
    expect(await executePlannedStep(step08, context, false, second.io)).toBe(3);
    expect(await readFile(path.join(context.root, e2eFile), "utf8")).toBe(afterFirst);
    expect(reportSection(second.output.join(""), "For a person")).toBe(listed);
  });

  it("lists nothing for the annotation once its line is deleted", async () => {
    // QFAI:EX-0004-0010-08
    const { context } = await migrated();
    expect(await executePlannedStep(step08, context, false, capture().io)).toBe(3);
    const current = await readFile(path.join(context.root, e2eFile), "utf8");
    expect(current).toContain(legacyCase);
    await writeFile(
      path.join(context.root, e2eFile),
      current
        .split("\n")
        .filter((line) => !line.includes(legacyCase))
        .join("\n"),
    );
    const report = capture();
    expect(await executePlannedStep(step08, context, false, report.io)).toBe(0);
    expect(reportSection(report.output.join(""), "For a person")).toBe("none");
  });

  it("leaves no EX annotation in the E2E file for validation to report", async () => {
    // QFAI:EX-0004-0010-08
    const { context } = await migrated();
    // Control: validation reads the tree, and the example still lacks a test.
    expect((await findings(context)).map((issue) => issue.code)).toContain("QFAI-STORY-006");
    expect(await misplacedIn(context, path.join("e2e", "order.test.ts"))).toEqual([]);
    const code = await executePlannedStep(step08, context, false, capture().io);
    expect(await misplacedIn(context, path.join("e2e", "order.test.ts"))).toEqual([]);
    expect(code).toBe(3);
  });
});

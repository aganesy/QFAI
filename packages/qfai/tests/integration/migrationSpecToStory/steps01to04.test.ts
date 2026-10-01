import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { loadConfig } from "../../../src/core/config.js";
import {
  executePlannedStep,
  runStep,
  type MigrationContext,
} from "../../../src/migration/specToStory/harness.js";
import { readIdMap } from "../../../src/migration/specToStory/idMap.js";
import { step01 } from "../../../src/migration/specToStory/step01RenameDirectories.js";
import { step02 } from "../../../src/migration/specToStory/step02MergeTables.js";
import { step04 } from "../../../src/migration/specToStory/step04RenumberIds.js";
import { step07 } from "../../../src/migration/specToStory/step07RulesToContracts.js";
import { isMigrationReportPath } from "../../helpers/migrationReport.js";
import { atLocation } from "../../helpers/reportLocation.js";

async function withProject(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migrate-01-04-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
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

async function run(step: typeof step01, project: MigrationContext, dryRun = false) {
  const output: string[] = [];
  const errors: string[] = [];
  const code = await executePlannedStep(step, project, dryRun, {
    stdout: { write: (value) => output.push(value) },
    stderr: { write: (value) => errors.push(value) },
  });
  return { code, output: output.join(""), errors: errors.join("") };
}

const STORY_DIR = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001";

async function putMinimalPack(root: string, status = "active", caseRow = ""): Promise<void> {
  await put(
    root,
    "qfai.config.yaml",
    "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
  );
  await put(
    root,
    ".qfai/spec/spec-0001/01_Spec.md",
    `# Spec\n\n- Status: ${status}\n\n## Scope\n\n- In: Orders.\n`,
  );
  await put(
    root,
    ".qfai/spec/spec-0001/02_User-stories.md",
    "# Stories\n\n## US-0001-0001: Order\n\nOrder.\n",
  );
  await put(
    root,
    ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
    "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
  );
  await put(root, ".qfai/spec/spec-0001/04_Business-Rules.md", "# Rules\n");
  await put(
    root,
    ".qfai/spec/spec-0001/05_Examples.md",
    "# Examples\n\n| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n",
  );
  await put(
    root,
    ".qfai/spec/spec-0001/06_Test-Cases.md",
    `# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n${caseRow}`,
  );
  await put(
    root,
    ".qfai/evidence/migration-spec-to-story/plan.yaml",
    "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\nrules: []\n",
  );
}

const PACK_DIR = ".qfai/spec/spec-0001";
const FLOW_DIR = ".qfai/spec/02_business-flow/business-flow-0001";
const PLAN_FILE = ".qfai/evidence/migration-spec-to-story/plan.yaml";
const MAP_FILE = ".qfai/evidence/migration-spec-to-story/id-map.json";
const CONTRACT = "api/api-0001-orders.yaml";

/** The body of one `## <name>` section of a step report. */
function reportSection(output: string, name: string): string {
  const heading = `## ${name}\n`;
  const start = output.indexOf(heading);
  if (start < 0) return "";
  const body = output.slice(start + heading.length);
  const end = body.indexOf("\n## ");
  return (end < 0 ? body : body.slice(0, end)).trimEnd();
}

/** The old-ID to new-ID entries the ID map holds for `spec-0001`; empty when no map exists. */
async function mapIds(root: string): Promise<Record<string, string>> {
  return (await readIdMap(root))?.ids["spec-0001"] ?? {};
}

/** A hash of every file's path and bytes, the report directory left out. */
async function treeHash(root: string): Promise<string> {
  const hash = createHash("sha256");
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .map((relative) => relative.replaceAll("\\", "/"))
    .filter((relative) => !isMigrationReportPath(relative))
    .sort();
  for (const relative of files) {
    hash.update(`${relative}\0`);
    hash.update(await readFile(path.join(root, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

const OLD_LAYOUT = path.resolve(__dirname, "../../fixtures/migration-spec-to-story/old-layout");
const OLD_CRITERIA = path.resolve(
  __dirname,
  "../../fixtures/bf0004MigrationCutover/legacy-criteria.md",
);
const SPEC_TABLES = ["04_Business-Rules.md", "05_Examples.md", "06_Test-Cases.md"];

/**
 * Steps 1 to 5 over a copy of the old-layout project. Each replacement renames the ID header of
 * one table file in both of its packs. The result holds the exit codes and reports of steps 4 and
 * 5, and every file the project then holds, the three table files by name only since they differ
 * in the header they were given.
 */
async function runOldPack(...headers: [file: string, from: string, to: string][]): Promise<{
  codes: number[];
  outputs: string[];
  snapshot: [string, string][];
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migrate-old-pack-"));
  try {
    await cp(OLD_LAYOUT, root, { recursive: true });
    await cp(OLD_CRITERIA, path.join(root, ".qfai/specs/spec-0001/03_Acceptance-Criteria.md"));
    await rename(path.join(root, "gitignore.input"), path.join(root, ".gitignore"));
    await rename(
      path.join(root, ".qfai/assistant/skill-local.input"),
      path.join(root, ".qfai/assistant/skills.local"),
    );
    await writeFile(path.join(root, "AGENTS.md"), "# Our agents\n\nProject text.\n");
    await writeFile(path.join(root, "CLAUDE.md"), "# Our Claude\n\nProject text.\n");
    for (const [file, from, to] of headers) {
      for (const pack of ["spec-0001", "spec-0002"]) {
        const target = path.join(root, ".qfai/specs", pack, file);
        const text = await readFile(target, "utf8");
        expect(text).toContain(`| ${from} `);
        await writeFile(target, text.replace(`| ${from} `, `| ${to} `), "utf8");
      }
    }
    const codes: number[] = [];
    const outputs: string[] = [];
    for (const step of [1, 2, 3, 4, 5]) {
      const output: string[] = [];
      const code = await runStep(step, [], {
        cwd: root,
        stdout: { write: (value) => output.push(value) },
        stderr: { write: () => true },
      });
      if (step >= 4) {
        codes.push(code);
        outputs.push(output.join(""));
      } else {
        expect(code, `step ${step}`).not.toBe(2);
      }
    }
    const snapshot: [string, string][] = [];
    for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const relative = path.relative(root, path.join(entry.parentPath, entry.name));
      const posix = relative.replaceAll("\\", "/");
      if (isMigrationReportPath(posix)) continue;
      const content = SPEC_TABLES.includes(entry.name)
        ? "present"
        : createHash("sha256")
            .update(await readFile(path.join(root, relative)))
            .digest("hex");
      snapshot.push([posix, content]);
    }
    return { codes, outputs, snapshot: snapshot.sort(([a], [b]) => a.localeCompare(b)) };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function expectNoIdMap(root: string): Promise<void> {
  await expect(readFile(path.join(root, MAP_FILE))).rejects.toMatchObject({ code: "ENOENT" });
}

/** The `file:line` locations a message names for one file, as line numbers. */
function namedLines(message: string, file: string): number[] {
  const escaped = file.replaceAll(".", "\\.");
  return [...message.matchAll(new RegExp(`${escaped}:(\\d+)`, "g"))].map((match) =>
    Number(match[1]),
  );
}

/** The list items of the `## For a person` section of a step report. */
function personItems(output: string): string[] {
  return reportSection(output, "For a person")
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

/** The one item of `## For a person` that names `file` and matches every one of `parts`. */
function itemNaming(output: string, file: string, parts: readonly RegExp[]): string {
  const items = personItems(output).filter(
    (item) => item.includes(file) && parts.every((part) => part.test(item)),
  );
  expect(items, `${file} ${parts.map(String).join(" ")}`).toHaveLength(1);
  return items[0] ?? "";
}

/** The criteria file step 4 writes for one story whose criteria each hold the placeholder Scenario. */
function placeholderCriteria(...ids: string[]): string {
  const placeholder = [
    "  Scenario: <the outcome this criterion accepts>",
    "    Given <a starting state>",
    "    When <the user acts>",
    "    Then <the expected outcome>",
  ];
  return [
    "# Acceptance Criteria",
    "",
    "## Criteria",
    "",
    "```gherkin",
    "Feature: Order",
    ...ids.flatMap((id, index) => [...(index === 0 ? [] : [""]), `  # ${id}`, ...placeholder]),
    "```",
    "",
  ].join("\n");
}

const BASE_FLOWS =
  "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\n      - id: US-0001-0002\n";
const BASE_RULES = `  - id: BR-0001-0001\n    contract: ${CONTRACT}\n  - id: BR-0001-0004\n    contract: ${CONTRACT}\n`;

/** A plan over the two stories of `putPlanPack`; `rules` and `examples` are the YAML list bodies. */
function planYaml(options: { rules?: string; examples?: string } = {}): string {
  const rules = options.rules ?? BASE_RULES;
  return `${BASE_FLOWS}rules:${rules === "" ? " []\n" : `\n${rules}`}${options.examples ?? ""}`;
}

/**
 * A pack as it stands after steps 1 to 3: two stories with one criterion each; four rules, the
 * first citing a contract and the others citing none; three examples, the first cited by one
 * test case, the second by two cases naming different criteria, the third by none; and the
 * contract the plan places rules in.
 */
async function putPlanPack(root: string, plan = planYaml()): Promise<void> {
  await put(
    root,
    "qfai.config.yaml",
    "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
  );
  await put(
    root,
    `${PACK_DIR}/01_Spec.md`,
    "# Spec\n\n- Status: active\n\n## Scope\n\n- In: Orders.\n",
  );
  await put(
    root,
    `${PACK_DIR}/02_User-stories.md`,
    "# Stories\n\n## US-0001-0001: Place order\n\nPlace order.\n\n## US-0001-0002: Review order\n\nReview order.\n",
  );
  await put(
    root,
    `${PACK_DIR}/03_Acceptance-Criteria.md`,
    "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Place an order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n\n# AC-0001-0002\n# Parent: US-0001-0002\nScenario: Review an order\n  Given an order\n  When it is opened\n  Then it is shown\n```\n",
  );
  await put(
    root,
    `${PACK_DIR}/04_Business-Rules.md`,
    "# Rules\n\n| BR-ID | Rule | Contract-Refs |\n| --- | --- | --- |\n| BR-0001-0001 | Orders have an item. | CON-API-0001 |\n| BR-0001-0002 | Orders may be free. | - |\n| BR-0001-0003 | Orders may be held. | - |\n| BR-0001-0004 | Orders have a buyer. | - |\n",
  );
  await put(
    root,
    `${PACK_DIR}/05_Examples.md`,
    "# Examples\n\n| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001, BR-0001-0004 | one item | accepted |\n| EX-0001-0002 | — | two items | accepted twice |\n| EX-0001-0003 | — | free item | accepted free |\n",
  );
  await put(
    root,
    `${PACK_DIR}/06_Test-Cases.md`,
    "# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n| TC-0001-0002 | AC-0001-0001 | EX-0001-0002 | submit twice | accepted |\n| TC-0001-0003 | AC-0001-0002 | EX-0001-0002 | review | shown |\n",
  );
  await put(
    root,
    `.qfai/spec/03_contract/${CONTRACT}`,
    "# QFAI-CONTRACT-ID: API-0001\nopenapi: 3.0.0\n",
  );
  await put(root, PLAN_FILE, plan);
}

describe("migration steps 1 to 4", () => {
  it("uses the catalog title in the generated story when the old H2 is untitled", async () => {
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/02_User-stories.md",
        "# Stories\n\n## US Catalog\n\n- US-0001-0001: Order from catalog\n\n## US-0001-0001\n\nOrder.\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).not.toBe(2);
      const story = await readFile(
        path.join(
          root,
          ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md",
        ),
        "utf8",
      );
      expect(story).toMatch(/^# US-0001-0001: Order from catalog$/m);
    });
  });

  it("keeps the source pack untouched when an untitled story has ambiguous catalog titles", async () => {
    await withProject(async (root) => {
      await putMinimalPack(root);
      const source =
        "# Stories\n\n## US Catalog\n\n- US-0001-0001: First title\n- US-0001-0001: Second title\n\n## US-0001-0001\n\nOrder.\n";
      await put(root, ".qfai/spec/spec-0001/02_User-stories.md", source);
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(result.output).toContain("US-0001-0001 has no unique title");
      expect(result.output).toContain("## Operations\nnone");
      expect(
        await readFile(path.join(root, ".qfai/spec/spec-0001/02_User-stories.md"), "utf8"),
      ).toBe(source);
      await expect(
        readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("moves old default directories when their config keys are omitted", async () => {
    await withProject(async (root) => {
      await put(root, "qfai.config.yaml", "paths: {}\n");
      await put(root, ".qfai/specs/spec-0001/01_Spec.md", "legacy spec\n");
      await put(root, ".qfai/contracts/api/order.yaml", "legacy contract\n");
      const output: string[] = [];
      const errors: string[] = [];
      const code = await runStep(1, [], {
        cwd: root,
        stdout: { write: (value) => output.push(value) },
        stderr: { write: (value) => errors.push(value) },
      });
      expect(code).toBe(0);
      expect(errors).toEqual([]);
      expect(output.join("")).toContain(".qfai/specs/spec-0001");
      expect(await readFile(path.join(root, ".qfai/spec/spec-0001/01_Spec.md"), "utf8")).toBe(
        "legacy spec\n",
      );
      expect(await readFile(path.join(root, ".qfai/spec/03_contract/api/order.yaml"), "utf8")).toBe(
        "legacy contract\n",
      );
    });
  });

  it("moves each old entry and sets aside a collision without overwriting the new skill", async () => {
    await withProject(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/specs\n  contractsDir: .qfai/contracts\n  skillsDir: .qfai/assistant/skills\n",
      );
      await put(root, ".qfai/assistant/skills/qfai-sdd/SKILL.md", "old skill\n");
      await put(root, ".qfai/assistant/skills/team-review/SKILL.md", "project skill\n");
      await put(root, ".qfai/assistant/skill/qfai-sdd/SKILL.md", "new skill\n");
      await put(root, ".qfai/specs/spec-0001/01_Spec.md", "old pack\n");
      const project = await context(root);
      const preview = await run(step01, project, true);
      expect(preview.code).toBe(0);
      expect(preview.output).toContain("legacy/skills/qfai-sdd");
      const real = await run(step01, project);
      expect(real.code).toBe(0);
      expect(real.output).toBe(preview.output);
      expect(
        await readFile(path.join(root, ".qfai/assistant/skill/qfai-sdd/SKILL.md"), "utf8"),
      ).toBe("new skill\n");
      expect(
        await readFile(
          path.join(root, ".qfai/evidence/migration-spec-to-story/legacy/skills/qfai-sdd/SKILL.md"),
          "utf8",
        ),
      ).toBe("old skill\n");
      expect(
        await readFile(path.join(root, ".qfai/assistant/skill/team-review/SKILL.md"), "utf8"),
      ).toBe("project skill\n");
      expect(await readFile(path.join(root, "qfai.config.yaml"), "utf8")).toContain(
        "specsDir: .qfai/spec",
      );
      expect((await run(step01, await context(root))).output).toContain("## Operations\nnone");
    });
  });

  it("merges decision, question, delta and change request records before archiving sources", async () => {
    await withProject(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/07_Decisions.md",
        "# Decisions\n\n### DR-0001-0001: Keep input\n\n- Status: proposed\n- Decision: Keep it.\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/08_Open-questions.md",
        "# Questions\n\n## Open Questions\n\n| OQ-ID | Question | Status | Notes |\n| --- | --- | --- | --- |\n| OQ-0001-0001 | Who owns this? | open | ask owner |\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/09_delta.md",
        "# Delta\n\n### DL-0001\n\n#### Meta\n\n```yaml\nnotes: Decision from delta.\n```\n",
      );
      const result = await run(step02, await context(root));
      expect(result.code).toBe(0);
      const decisions = await readFile(path.join(root, ".qfai/spec/decisions.md"), "utf8");
      expect(decisions).toContain("DEC-0001");
      expect(decisions).toContain("spec-0001/07_Decisions.md#DR-0001-0001");
      expect(decisions).toContain("spec-0001/09_delta.md#DL-0001");
      expect(
        await readFile(
          path.join(
            root,
            ".qfai/evidence/migration-spec-to-story/retired/spec-0001/07_Decisions.md",
          ),
          "utf8",
        ),
      ).toContain("Keep input");
      expect(await readFile(path.join(root, ".qfai/spec/open-questions.md"), "utf8")).toContain(
        "Who owns this?",
      );
      expect((await run(step02, await context(root))).output).toContain("## Operations\nnone");
    });
  });

  it("writes the old section's prose as the flow's purpose and lists the flow for a person", async () => {
    // QFAI:EX-0004-0007-18
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/_policies/04_Business-Flow.md",
        "# Business Flow\n\n## CHG-0001: Order flow\n\nA buyer turns a cart into an order.\n\n### Actors\n\nThe buyer and the store.\n\n```mermaid\nflowchart LR\n  Cart --> Order\n```\n",
      );
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/plan.yaml",
        "flows:\n  - title: Order flow\n    from: 'CHG-0001: Order flow'\n    stories:\n      - id: US-0001-0001\nrules: []\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      const flowFile = ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md";
      expect(await readFile(path.join(root, flowFile), "utf8")).toBe(
        [
          "# BF-0001: Order flow",
          "",
          "## Purpose",
          "",
          "A buyer turns a cart into an order.",
          "",
          "The buyer and the store.",
          "",
          "## Flow",
          "",
          "```mermaid",
          "flowchart LR",
          "  Cart --> Order",
          "```",
          "",
          "## Alternate and exception paths",
          "",
          "- `<branch, failure, interruption or resumption, and where it leads>`",
          "",
        ].join("\n"),
      );
      expect(result.output).toContain(
        `- ${flowFile}: BF-0001 has no alternate and exception paths; write them\n`,
      );
      expect(result.output).not.toContain("has no old flow diagram");
    });
  });

  it("writes a stable ID map and story files from the plan", async () => {
    // QFAI:EX-0004-0007-14
    // QFAI:EX-0004-0007-15
    // QFAI:EX-0004-0007-19
    await withProject(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      await put(
        root,
        ".qfai/spec/_policies/04_Business-Flow.md",
        "# Business Flow\n\n## Flow\n\n```mermaid\nflowchart LR\n  A --> B\n```\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/01_Spec.md",
        "# Spec\n\n- Status: active\n\n## Scope\n\n### In\n\n- Order placement.\n\n### Out\n\n- Shipping.\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/02_User-stories.md",
        "# Stories\n\n## US-0001-0001: Place an order\n\n- Parent: CAP-0001\n- Source: discussion-20260101000000000#DUS-001\n- Flow: BF-0001\n- Goal: As a buyer, I want to place an order,\n  so that the cart becomes a purchase.\n- Non-goals: Shipping.\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Place one order\n Given an empty cart\n When an item is added\n Then the order is accepted\n\n# AC-0001-0002\n# Parent: US-0001-0001\nScenario: Place two items\n Given two items\n When the order is placed\n Then the order is accepted\n```\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/04_Business-Rules.md",
        "# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | Orders have an item. |\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/05_Examples.md",
        "# Examples\n\n| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | one item | accepted |\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/06_Test-Cases.md",
        "# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n| TC-0001-0002 | AC-0001-0001 | — | submit twice | rejected |\n",
      );
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/plan.yaml",
        "flows:\n  - title: Order flow\n    from: _policies/04_Business-Flow.md\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
      );
      const contracts = {
        "api/orders.yaml": {
          id: "API-0002",
          path: "api/api-0002-orders.yaml",
          old: "CON-API-0001",
        },
      };
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/contract-map.json",
        `${JSON.stringify({ contracts }, null, 2)}\n`,
      );
      const first = await run(step04, await context(root));
      expect(first.code).toBe(3);
      expect(first.output).toContain(
        "## For a person\n- .qfai/spec/02_business-flow/business-flow-0001/business-flow.md: BF-0001 has no purpose and no alternate and exception paths; write them\n",
      );
      expect(
        await readFile(
          path.join(root, ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md"),
          "utf8",
        ),
      ).toBe(
        [
          "# BF-0001: Order flow",
          "",
          "## Purpose",
          "",
          "`<Who carries out this flow, and the outcome it reaches.>`",
          "",
          "## Flow",
          "",
          "```mermaid",
          "flowchart LR",
          "  A --> B",
          "```",
          "",
          "## Alternate and exception paths",
          "",
          "- `<branch, failure, interruption or resumption, and where it leads>`",
          "",
        ].join("\n"),
      );
      const mapPath = path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json");
      const firstMap = await readFile(mapPath, "utf8");
      const map = JSON.parse(firstMap) as {
        ids: Record<string, Record<string, string>>;
        contracts: unknown;
      };
      expect(map.ids["spec-0001"]).toMatchObject({
        "US-0001-0001": "US-0001-0001",
        "AC-0001-0001": "AC-0001-0001-01",
        "EX-0001-0001": "EX-0001-0001-01",
        "TC-0001-0001": "EX-0001-0001-01",
        "TC-0001-0002": "EX-0001-0001-02",
        "BR-0001-0001": "BR-0002-0001",
      });
      expect(map.contracts).toEqual(contracts);
      expect(
        await readFile(
          path.join(
            root,
            ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
          ),
          "utf8",
        ),
      ).toContain("EX-0001-0001-01");
      const story = await readFile(
        path.join(
          root,
          ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md",
        ),
        "utf8",
      );
      expect(story).toBe(
        "# US-0001-0001: Place an order\n\n## User Story\n\nAs a buyer, I want to place an order, so that the cart becomes a purchase.\n\n## Non-goals\n\n- Shipping.\n",
      );
      expect(
        await readFile(
          path.join(
            root,
            ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
          ),
          "utf8",
        ),
      ).toBe(
        [
          "# Acceptance Criteria",
          "",
          "## Criteria",
          "",
          "```gherkin",
          "Feature: Place an order",
          "  # AC-0001-0001-01",
          "  Scenario: Place one order",
          "    Given an empty cart",
          "    When an item is added",
          "    Then the order is accepted",
          "",
          "  # AC-0001-0001-02",
          "  Scenario: Place two items",
          "    Given two items",
          "    When the order is placed",
          "    Then the order is accepted",
          "```",
          "",
        ].join("\n"),
      );
      const second = await run(step04, await context(root));
      expect(second.code).toBe(3);
      expect(second.output).toContain("## Operations\nnone");
      expect(await readFile(mapPath, "utf8")).toBe(firstMap);
      const criteriaPath = path.join(
        root,
        ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
      );
      const edited = `${await readFile(criteriaPath, "utf8")}<!-- resolved by a person -->\n`;
      await writeFile(criteriaPath, edited, "utf8");
      const third = await run(step04, await context(root));
      expect(third.code).toBe(3);
      expect(third.output).toContain(
        "the existing file differs from what step 4 writes and is kept",
      );
      expect(await readFile(criteriaPath, "utf8")).toBe(edited);
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/plan.yaml",
        "flows:\n  - title: Different flow\n    from: _policies/04_Business-Flow.md\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
      );
      const changedPlan = await run(step04, await context(root));
      expect(changedPlan.code).toBe(2);
      expect(changedPlan.errors).toContain("US-0001-0001");
      expect(await readFile(mapPath, "utf8")).toBe(firstMap);
    });
  });

  it("numbers a case whose EX-Ref has no example row when its criterion is valid", async () => {
    await withProject(async (root) => {
      await putMinimalPack(
        root,
        "active",
        "| TC-0001-0001 | AC-0001-0001 | EX-0001-9999 | Submit order | Accepted |\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(result.output).not.toContain("references missing EX-0001-9999");
      const map = JSON.parse(
        await readFile(
          path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"),
          "utf8",
        ),
      ) as { ids: Record<string, Record<string, string>> };
      expect(map.ids["spec-0001"]?.["TC-0001-0001"]).toBe("EX-0001-0001-01");
    });
  });

  it("keeps a superseded example out of the ID map and preserves its source", async () => {
    await withProject(async (root) => {
      await putMinimalPack(
        root,
        "active",
        "| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n",
      );
      const example =
        "# Examples\n\n## EX-0001-0001: Old result\n\n- Status: superseded by EX-0001-0002\n- BR-Ref: BR-0001-0001\n- Given an order\n- Then accepted\n";
      await put(root, ".qfai/spec/spec-0001/05_Examples.md", example);
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(result.output).toContain("EX-0001-0001 is superseded");
      const map = JSON.parse(
        await readFile(
          path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"),
          "utf8",
        ),
      ) as { ids: Record<string, Record<string, string>> };
      expect(map.ids["spec-0001"]?.["EX-0001-0001"]).toBeUndefined();
      expect(await readFile(path.join(root, ".qfai/spec/spec-0001/05_Examples.md"), "utf8")).toBe(
        example,
      );
      expect(
        await readFile(
          path.join(
            root,
            ".qfai/evidence/migration-spec-to-story/retired/spec-0001/05_Examples.md",
          ),
          "utf8",
        ),
      ).toBe(example);
    });
  });

  it("writes a story block that is not one story sentence as it stands, for a person", async () => {
    // QFAI:EX-0004-0007-16
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/02_User-stories.md",
        "# Stories\n\n## US-0001-0001: Place order\n\n- Parent: CAP-0001\n- Source: discussion-20260101000000000#DUS-001\n  and a second line\n- Goal: Place order.\n\n## US-0001-0002: Review order\n\n- Goal: Review order.\n- Flow: BF-0001\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Place\n Given a cart\n When placed\n Then accepted\n\n# AC-0001-0002\n# Parent: US-0001-0002\nScenario: Review\n Given an order\n When reviewed\n Then visible\n```\n",
      );
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/plan.yaml",
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\n      - id: US-0001-0002\nrules: []\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      for (const [id, title] of [
        ["0001", "Place order"],
        ["0002", "Review order"],
      ] as const) {
        const file = `.qfai/spec/02_business-flow/business-flow-0001/user-story-0001-${id}/01_User-story.md`;
        expect(await readFile(path.join(root, file), "utf8")).toBe(
          `# US-0001-${id}: ${title}\n\n## User Story\n\n- Goal: ${title}.\n`,
        );
        expect(result.output).toContain(
          `${file}: US-0001-${id} is not one "As a <actor>, I want <goal>, so that <benefit>." sentence`,
        );
      }
    });
  });

  it("keeps the whitespace inside a story sentence and a scenario line", async () => {
    // QFAI:EX-0004-0007-14
    // QFAI:EX-0004-0007-15
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/02_User-stories.md",
        "# Stories\n\n## US-0001-0001: Order\n\n- Goal: As a buyer, I want to send `a  b`,  \n  so that the order is exact.\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        '# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Order\n  Given a cart\n  When an order is placed with\n    """\n    body  \n      \n    \tkey: value\n    """\n   Then the order is accepted\n```\n',
      );
      await run(step04, await context(root));
      const storyDir = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001";
      expect(await readFile(path.join(root, storyDir, "01_User-story.md"), "utf8")).toBe(
        "# US-0001-0001: Order\n\n## User Story\n\nAs a buyer, I want to send `a  b`, so that the order is exact.\n",
      );
      expect(
        await readFile(path.join(root, storyDir, "02_Acceptance-Criteria.md"), "utf8"),
      ).toContain(
        '    When an order is placed with\n      """\n      body  \n        \n      \tkey: value\n      """\n    Then',
      );
    });
  });

  it("indents each step and Examples line to the template and shifts what sits under it", async () => {
    // QFAI:EX-0004-0007-15
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        '# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Order <n>\n Given <n> items\n  When an order is placed with\n  """\n payload\n  """\n Then the order is accepted\n   * a receipt is sent\n   Examples:\n     | n |\n     | 2 |\n```\n',
      );
      await run(step04, await context(root));
      const criteria = await readFile(
        path.join(
          root,
          ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
        ),
        "utf8",
      );
      expect(criteria).toContain(
        '    Given <n> items\n    When an order is placed with\n    """\n   payload\n    """\n    Then the order is accepted\n    * a receipt is sent\n    Examples:\n      | n |\n      | 2 |\n',
      );
    });
  });

  it("sends a story block with more than its sentence to a person, as written", async () => {
    // QFAI:EX-0004-0007-16
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/02_User-stories.md",
        "# Stories\n\n## US-0001-0001: Order\n\n- Source: discussion-20260101000000000#DUS-001\n  ```text\n  archived payload\n  ```\n\nAs a buyer, I want an order, so that I get a receipt.\n  - Requires approval.\n\n\n\n````text\n```\n- Source: example\n````\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      const file =
        ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md";
      expect(result.output).toContain(`${file}: US-0001-0001 is not one`);
      expect(await readFile(path.join(root, file), "utf8")).toBe(
        "# US-0001-0001: Order\n\n## User Story\n\nAs a buyer, I want an order, so that I get a receipt.\n  - Requires approval.\n\n\n\n````text\n```\n- Source: example\n````\n",
      );
    });
  });

  it("keeps plus-marked non-goals apart and sends a story with a subheading to a person", async () => {
    // QFAI:EX-0004-0007-14
    // QFAI:EX-0004-0007-16
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/02_User-stories.md",
        "# Stories\n\n## US-0001-0001: Order\n\n- Source:\n\n    discussion-20260101000000000#DUS-001\n- Parent:\n  - CAP-0001\n- Goal: As a buyer, I want an order, so that I get a receipt.\n- Non-goals:\n  + Shipping.\n  + Billing.\n  1. Refunds.\n\n## US-0001-0002: Review\n\nAs a buyer, I want a review, so that I see the order.\n### Constraints\nOnly the buyer sees it.\n\n## US-0001-0003: Track\n\nAs a buyer, I want tracking, so that I see the parcel.\n***\nTracking is daily.\n",
      );
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/plan.yaml",
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\n      - id: US-0001-0002\n      - id: US-0001-0003\nrules: []\n",
      );
      const result = await run(step04, await context(root));
      const flow = ".qfai/spec/02_business-flow/business-flow-0001";
      expect(
        await readFile(path.join(root, flow, "user-story-0001-0001/01_User-story.md"), "utf8"),
      ).toBe(
        "# US-0001-0001: Order\n\n## User Story\n\nAs a buyer, I want an order, so that I get a receipt.\n\n## Non-goals\n\n- Shipping.\n- Billing.\n- Refunds.\n",
      );
      expect(result.output).not.toContain(
        `${flow}/user-story-0001-0001/01_User-story.md: US-0001-0001 is not one`,
      );
      for (const id of ["0002", "0003"]) {
        expect(result.output).toContain(
          `${flow}/user-story-0001-${id}/01_User-story.md: US-0001-${id} is not one`,
        );
      }
    });
  });

  it("refuses a plan that places a superseded rule", async () => {
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/04_Business-Rules.md",
        "# Rules\n\n## BR-0001-0001: Old rule\n\n- Status: superseded by BR-0001-0002\n- Old rule.\n",
      );
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/plan.yaml",
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(2);
      expect(result.errors).toContain("BR-0001-0001");
      await expect(
        readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
      ).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("refuses malformed plan YAML before writing an ID map", async () => {
    await withProject(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      await put(root, ".qfai/spec/spec-0001/01_Spec.md", "# Spec\n");
      await put(root, ".qfai/evidence/migration-spec-to-story/plan.yaml", "flows: [\n");
      const result = await run(step04, await context(root));
      expect(result.code).toBe(2);
      expect(result.errors).toContain("plan.yaml");
      await expect(
        readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
      ).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("keeps prose criteria for a person instead of writing invalid Gherkin", async () => {
    // QFAI:AC-0004-0007-02
    // QFAI:EX-0004-0007-17
    await withProject(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      await put(root, ".qfai/spec/spec-0001/01_Spec.md", "# Spec\n\n- Status: active\n");
      await put(
        root,
        ".qfai/spec/spec-0001/02_User-stories.md",
        "# Stories\n\n## US-0001-0001: Order\n\nOrder.\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n## AC-0001-0001: Order is accepted\n\nParent: US-0001-0001\n\nThe order is accepted.\n",
      );
      await put(root, ".qfai/spec/spec-0001/04_Business-Rules.md", "# Rules\n");
      await put(root, ".qfai/spec/spec-0001/05_Examples.md", "# Examples\n");
      await put(root, ".qfai/spec/spec-0001/06_Test-Cases.md", "# Cases\n");
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/plan.yaml",
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\nrules: []\n",
      );
      const storyDir = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001";
      const clean = await run(step04, await context(root));
      expect(clean.code).toBe(3);
      expect((await readdir(path.join(root, storyDir))).sort()).toEqual([
        "01_User-story.md",
        "03_Example.md",
      ]);
      expect(clean.output).toContain(
        `${storyDir}/02_Acceptance-Criteria.md: US-0001-0001 has no criterion that takes a new ID`,
      );
      itemNaming(clean.output, `${storyDir}/02_Acceptance-Criteria.md`, [
        /US-0001-0001/,
        /no criterion that takes a new ID/,
        /AC-0001-0001/,
      ]);
      await put(root, `${storyDir}/02_Acceptance-Criteria.md`, "# Acceptance Criteria\n\nstale\n");
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(result.output).toContain("AC-0001-0001 has no convertible Gherkin scenario");
      const map = JSON.parse(
        await readFile(
          path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"),
          "utf8",
        ),
      ) as { ids: Record<string, Record<string, string>> };
      expect(map.ids["spec-0001"]?.["AC-0001-0001"]).toBeUndefined();
      expect(
        await readFile(path.join(root, ".qfai/spec/spec-0001/03_Acceptance-Criteria.md"), "utf8"),
      ).toContain("The order is accepted.");
      expect((await readdir(path.join(root, storyDir))).sort()).toEqual([
        "01_User-story.md",
        "02_Acceptance-Criteria.md",
        "03_Example.md",
      ]);
      expect(await readFile(path.join(root, storyDir, "02_Acceptance-Criteria.md"), "utf8")).toBe(
        "# Acceptance Criteria\n\nstale\n",
      );
      expect(result.output).toContain(
        `${storyDir}/02_Acceptance-Criteria.md: the existing file is kept; check that it states US-0001-0001's criteria`,
      );
      expect(result.output).toContain(
        `${storyDir}/02_Acceptance-Criteria.md: US-0001-0001 has no criterion that takes a new ID`,
      );
      const authored =
        "# Acceptance Criteria\n\n## Criteria\n\n```gherkin\nFeature: Order\n  # AC-0001-0001-01\n  Scenario: Accept\n    Given a cart\n    When an order is placed\n    Then the order is accepted\n```\n";
      await put(root, `${storyDir}/02_Acceptance-Criteria.md`, authored);
      await run(step04, await context(root));
      expect(await readFile(path.join(root, storyDir, "02_Acceptance-Criteria.md"), "utf8")).toBe(
        authored,
      );
    });
  });

  it("lists a story left with no criterion together with the old criteria its catalog row named", async () => {
    // QFAI:AC-0004-0007-02
    // QFAI:EX-0004-0007-39
    await withProject(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      await put(root, `${PACK_DIR}/01_Spec.md`, "# Spec\n\n- Status: active\n");
      await put(
        root,
        `${PACK_DIR}/02_User-stories.md`,
        "# Stories\n\n## US-0001-0001: Place order\n\nPlace order.\n\n## US-0001-0002: Review order\n\nReview order.\n",
      );
      await put(
        root,
        `${PACK_DIR}/03_Acceptance-Criteria.md`,
        [
          "# Criteria",
          "",
          "| AC-ID | US Ref | Title |",
          "| --- | --- | --- |",
          "| AC-0001-0001 | US-0001-0001, US-0001-0002 | Place an order |",
          "| AC-0001-0002 | US-0001-0001 | Reject an empty order |",
          "",
          "```gherkin",
          "# AC-0001-0001",
          "Scenario: Place an order",
          "  Given a cart",
          "  When an order is placed",
          "  Then the order is accepted",
          "",
          "# AC-0001-0002",
          "Scenario: Reject an empty order",
          "  Given an empty cart",
          "  When an order is placed",
          "  Then the order is rejected",
          "```",
          "",
        ].join("\n"),
      );
      await put(root, `${PACK_DIR}/04_Business-Rules.md`, "# Rules\n");
      await put(root, `${PACK_DIR}/05_Examples.md`, "# Examples\n");
      await put(root, `${PACK_DIR}/06_Test-Cases.md`, "# Cases\n");
      await put(
        root,
        PLAN_FILE,
        [
          "flows:",
          "  - title: Order flow",
          "    stories:",
          "      - id: US-0001-0001",
          "        criteria:",
          "          - AC-0001-0001",
          "          - AC-0001-0002",
          "      - id: US-0001-0002",
          "rules: []",
          "",
        ].join("\n"),
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      const second = path.join(root, FLOW_DIR, "user-story-0001-0002");
      expect((await readdir(second)).sort()).toEqual(["01_User-story.md", "03_Example.md"]);
      const criteriaFile = `${FLOW_DIR}/user-story-0001-0002/02_Acceptance-Criteria.md`;
      expect(result.output).toContain(
        `${criteriaFile}: US-0001-0002 has no criterion that takes a new ID`,
      );
      const item = itemNaming(result.output, criteriaFile, [
        /US-0001-0002/,
        /no criterion that takes a new ID/,
        /AC-0001-0001/,
      ]);
      expect(item).not.toMatch(/AC-0001-0002/);
    });
  });

  it("lists a story left with no criterion together with the old criterion its plan entry named", async () => {
    // QFAI:AC-0004-0007-02
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/03_Acceptance-Criteria.md`,
        "# Criteria\n\n## AC-0001-0001: Order is accepted\n\nThe order is accepted.\n",
      );
      await put(
        root,
        PLAN_FILE,
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\n        criteria:\n          - AC-0001-0001\nrules: []\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      const criteriaFile = `${STORY_DIR}/02_Acceptance-Criteria.md`;
      expect(result.output).toContain(
        `${criteriaFile}: US-0001-0001 has no criterion that takes a new ID`,
      );
      itemNaming(result.output, criteriaFile, [
        /US-0001-0001/,
        /no criterion that takes a new ID/,
        /AC-0001-0001/,
      ]);
    });
  });

  it("refuses an invalid existing decision table before moving its source", async () => {
    await withProject(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      await put(
        root,
        ".qfai/spec/decisions.md",
        "# Decisions\n\n## Decisions\n\n| ID | Content |\n| --- | --- |\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/07_Decisions.md",
        "# Decisions\n\n## DR-1: Retain source\n\n- Status: accepted\n",
      );
      const result = await run(step02, await context(root));
      expect(result.code).toBe(2);
      expect(result.errors).toContain("invalid decisions.md");
      expect(
        await readFile(path.join(root, ".qfai/spec/spec-0001/07_Decisions.md"), "utf8"),
      ).toContain("Retain source");
    });
  });

  it("retires deprecated and removed packs and refuses an active story placement", async () => {
    for (const status of ["deprecated", "removed"]) {
      await withProject(async (root) => {
        await putMinimalPack(root, status);
        const decision = await run(step02, await context(root));
        expect(decision.code).toBe(0);
        expect(await readFile(path.join(root, ".qfai/spec/decisions.md"), "utf8")).toContain(
          `spec-0001 is ${status}`,
        );
        const renumber = await run(step04, await context(root));
        expect(renumber.code).toBe(2);
        expect(renumber.errors).toContain("unknown active story US-0001-0001");
      });
    }
  });

  it("reports a missing EX reference when the case has no criterion", async () => {
    await withProject(async (root) => {
      await putMinimalPack(
        root,
        "active",
        "| TC-0001-0001 | — | EX-0001-9999 | submit | accepted |\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(result.output).toContain("TC-0001-0001 references missing EX-0001-9999");
      const map = JSON.parse(
        await readFile(
          path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"),
          "utf8",
        ),
      ) as { ids: Record<string, Record<string, string>> };
      expect(map.ids["spec-0001"]?.["TC-0001-0001"]).toBeUndefined();
    });
  });

  it("rejects a criterion added after the first ID map was written", async () => {
    await withProject(async (root) => {
      await putMinimalPack(root);
      expect((await run(step04, await context(root))).code).toBe(3);
      const mapPath = path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json");
      const firstMap = await readFile(mapPath, "utf8");
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Order\n  Given a cart\n  When an order is placed\n  Then accepted\n# AC-0001-0002\n# Parent: US-0001-0001\nScenario: Repeat order\n  Given a cart\n  When another order is placed\n  Then accepted\n```\n",
      );
      const rerun = await run(step04, await context(root));
      expect(rerun.code).toBe(2);
      expect(rerun.errors).toContain("numbering changed for AC-0001-0002");
      expect(await readFile(mapPath, "utf8")).toBe(firstMap);
    });
  });

  it("keeps a criterion's first named scenario and lists what it does not write", async () => {
    // QFAI:AC-0004-0007-03
    // QFAI:EX-0004-0007-20
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nBackground:\n  Given a signed-in buyer\n\nScenario: Place one order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n\n@later\nScenario: Place two orders\n  Given two carts\n  When both orders are placed\n  Then both are accepted\n```\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(
        await readFile(path.join(root, `${STORY_DIR}/02_Acceptance-Criteria.md`), "utf8"),
      ).toBe(
        [
          "# Acceptance Criteria",
          "",
          "## Criteria",
          "",
          "```gherkin",
          "Feature: Order",
          "  # AC-0001-0001-01",
          "  Scenario: Place one order",
          "    Given a cart",
          "    When an order is placed",
          "    Then the order is accepted",
          "```",
          "",
        ].join("\n"),
      );
      const source = ".qfai/spec/spec-0001/03_Acceptance-Criteria.md";
      // Line 6 of the old file holds the Background and line 15 the second Scenario.
      const background = itemNaming(result.output, source, [/AC-0001-0001/, /Background/]);
      const further = itemNaming(result.output, source, [/AC-0001-0001/, /Place two orders/]);
      expect(background).toMatch(atLocation(source, 6));
      expect(further).toMatch(atLocation(source, 15));
      expect(result.output).not.toContain("placeholder");
    });
  });

  it("names the header row of an Examples table that follows a description", async () => {
    // QFAI:EX-0004-0007-21
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario Outline: Place <count> items\n  Given <count> items\n  When the order is placed\n  Then the order is accepted\n  Examples:\n    Counts a buyer may place.\n    | count |\n    | 2     |\n```\n",
      );
      const result = await run(step04, await context(root));
      expect(result.output).toContain("with Examples header row | count |");
    });
  });

  it("writes a placeholder scenario for an outline and an ID-named scenario", async () => {
    // QFAI:EX-0004-0007-21
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario Outline: Place <count> items\n  Given <count> items\n  When the order is placed\n  Then the order is accepted\n  Examples:\n    | count |\n    | 2     |\n\n# AC-0001-0002\n# Parent: US-0001-0001\nScenario: AC-0001-0002\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      const placeholder = [
        "  Scenario: <the outcome this criterion accepts>",
        "    Given <a starting state>",
        "    When <the user acts>",
        "    Then <the expected outcome>",
      ];
      const criteriaFile = `${STORY_DIR}/02_Acceptance-Criteria.md`;
      expect(await readFile(path.join(root, criteriaFile), "utf8")).toBe(
        [
          "# Acceptance Criteria",
          "",
          "## Criteria",
          "",
          "```gherkin",
          "Feature: Order",
          "  # AC-0001-0001-01",
          ...placeholder,
          "",
          "  # AC-0001-0001-02",
          ...placeholder,
          "```",
          "",
        ].join("\n"),
      );
      const source = ".qfai/spec/spec-0001/03_Acceptance-Criteria.md";
      // The outline is on line 6 of the old file and the header row of its Examples table on
      // line 11; the Scenario named only by its ID is on line 16.
      const outline = itemNaming(result.output, source, [/AC-0001-0001/, /Place <count> items/]);
      const named = itemNaming(result.output, source, [/AC-0001-0002/]);
      expect(outline).toMatch(atLocation(source, 6));
      expect(outline).toMatch(/\|\s*count\s*\|/);
      expect(named).toMatch(atLocation(source, 16));
      for (const id of ["AC-0001-0001-01", "AC-0001-0001-02"]) {
        expect(result.output).toContain(
          `- ${criteriaFile}: ${id} holds a placeholder Scenario; write it\n`,
        );
      }
    });
  });

  it("lists a Scenario Template with the line of its keyword and the header row of its Examples table", async () => {
    // QFAI:EX-0004-0007-21
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario Template: Place <count> items\n  Given <count> items\n  When the order is placed\n  Then the order is accepted\n  Examples:\n    | count |\n    | 2     |\n```\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(result.output).toContain(
        `- ${STORY_DIR}/02_Acceptance-Criteria.md: AC-0001-0001-01 holds a placeholder Scenario; write it\n`,
      );
      expect(
        await readFile(path.join(root, `${STORY_DIR}/02_Acceptance-Criteria.md`), "utf8"),
      ).toBe(placeholderCriteria("AC-0001-0001-01"));
      const source = ".qfai/spec/spec-0001/03_Acceptance-Criteria.md";
      // The keyword is on line 6 of the old file and the header row of its Examples table on line 11.
      const template = itemNaming(result.output, source, [/AC-0001-0001/, /Place <count> items/]);
      expect(template).toMatch(atLocation(source, 6));
      expect(template).toMatch(/\|\s*count\s*\|/);
    });
  });

  it("lists a Scenario with no name with the line of its keyword", async () => {
    // QFAI:EX-0004-0007-21
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Place one order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n\nScenario:\n  Given two carts\n  When both orders are placed\n  Then both are accepted\n```\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(
        await readFile(path.join(root, `${STORY_DIR}/02_Acceptance-Criteria.md`), "utf8"),
      ).toContain("  Scenario: Place one order\n");
      const source = ".qfai/spec/spec-0001/03_Acceptance-Criteria.md";
      // The nameless Scenario is on line 11 of the old file.
      expect(itemNaming(result.output, source, [/AC-0001-0001/])).toMatch(atLocation(source, 11));
    });
  });

  it("holds a placeholder for a criterion whose only Scenario has no name and lists it with its line", async () => {
    // QFAI:EX-0004-0007-21
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario:\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(result.output).toContain(
        `- ${STORY_DIR}/02_Acceptance-Criteria.md: AC-0001-0001-01 holds a placeholder Scenario; write it\n`,
      );
      expect(
        await readFile(path.join(root, `${STORY_DIR}/02_Acceptance-Criteria.md`), "utf8"),
      ).toBe(placeholderCriteria("AC-0001-0001-01"));
      const source = ".qfai/spec/spec-0001/03_Acceptance-Criteria.md";
      expect(itemNaming(result.output, source, [/AC-0001-0001/])).toMatch(atLocation(source, 6));
    });
  });

  it("lists a Background that lies outside every criterion", async () => {
    // QFAI:EX-0004-0007-22
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\nBackground:\n  Given a signed-in buyer\n\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(
        await readFile(path.join(root, `${STORY_DIR}/02_Acceptance-Criteria.md`), "utf8"),
      ).not.toContain("Background");
      expect(result.output).toContain(
        "- .qfai/spec/spec-0001/03_Acceptance-Criteria.md: a Background outside every criterion is not written\n",
      );
    });
  });

  it("writes an example's single step as a plain value and lists a cell holding several", async () => {
    // QFAI:EX-0004-0007-23
    await withProject(async (root) => {
      await putMinimalPack(
        root,
        "active",
        "| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | Submit | Accepted |\n| TC-0001-0002 | AC-0001-0001 | EX-0001-0002 | Submit | Accepted |\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/05_Examples.md",
        "# Examples\n\n| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | — | Given one item | Then the order is accepted |\n| EX-0001-0002 | — | Given a cart When it is submitted | The order is accepted |\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      const exampleFile = `${STORY_DIR}/03_Example.md`;
      const examples = await readFile(path.join(root, exampleFile), "utf8");
      expect(examples).toContain(
        "| EX-0001-0001-01 | AC-0001-0001-01 | one item | the order is accepted |\n",
      );
      expect(examples).toContain(
        "| EX-0001-0001-02 | AC-0001-0001-01 | Given a cart When it is submitted | The order is accepted |\n",
      );
      expect(result.output).toContain(
        `- ${exampleFile}: EX-0001-0001-02 Input is Gherkin steps, not one plain value; rewrite it\n`,
      );
      expect(result.output).not.toContain("EX-0001-0001-01 Input");
      expect(result.output).not.toContain("Expected is Gherkin steps");
    });
  });

  it("reruns step 4 after step 7 moved part of a pack's rules", async () => {
    await withProject(async (root) => {
      await putMinimalPack(root);
      const rules =
        "# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | First rule. |\n| BR-0001-0002 | Second rule. |\n";
      await put(root, ".qfai/spec/spec-0001/04_Business-Rules.md", rules);
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/plan.yaml",
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/api-0001-orders.yaml\n  - id: BR-0001-0002\n    contract: api/api-0002-later.yaml\n",
      );
      await put(
        root,
        ".qfai/spec/03_contract/api/api-0001-orders.yaml",
        "# QFAI-CONTRACT-ID: API-0001\nopenapi: 3.0.0\n",
      );
      await put(
        root,
        ".qfai/spec/03_contract/api/api-0002-later.yaml",
        "# QFAI-CONTRACT-ID: API-0002\nopenapi: 3.0.0\n",
      );
      const first = await run(step04, await context(root));
      expect(first.errors).toBe("");
      const mapPath = path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json");
      const map = await readFile(mapPath, "utf8");
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/retired/spec-0001/04_Business-Rules.md",
        rules,
      );
      await put(
        root,
        ".qfai/spec/spec-0001/04_Business-Rules.md",
        "# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0002 | Second rule. |",
      );
      const rerun = await run(step04, await context(root));
      expect(rerun.errors).toBe("");
      expect(rerun.code).toBe(first.code);
      expect(await readFile(mapPath, "utf8")).toBe(map);
    });
  });

  it("refuses each invalid plan key before writing and names the entry", async () => {
    // QFAI:EX-0004-0003-38
    await withProject(async (root) => {
      await putPlanPack(root);
      const control = await run(step04, await context(root));
      expect(control.code).toBe(3);
      expect(await mapIds(root)).toMatchObject({ "EX-0001-0001": "EX-0001-0001-01" });
    });
    const invalid = [
      {
        name: "an example no test-case row cites",
        entry: "EX-0001-0003",
        plan: planYaml({
          examples: "examples:\n  - id: EX-0001-0003\n    criterion: AC-0001-0001\n",
        }),
      },
      {
        name: "a criterion the citing rows do not name",
        entry: "EX-0001-0001",
        plan: planYaml({
          examples: "examples:\n  - id: EX-0001-0001\n    criterion: AC-0001-0002\n",
        }),
      },
      {
        name: "an example listed twice",
        entry: "EX-0001-0002",
        plan: planYaml({
          examples:
            "examples:\n  - id: EX-0001-0002\n    criterion: AC-0001-0001\n  - id: EX-0001-0002\n    criterion: AC-0001-0002\n",
        }),
      },
      {
        name: "a rule with both contract and retire",
        entry: "BR-0001-0002",
        plan: planYaml({
          rules: `${BASE_RULES}  - id: BR-0001-0002\n    contract: ${CONTRACT}\n    retire: superseded\n`,
        }),
      },
      {
        name: "binds none on a rule whose Contract-Refs names a contract",
        entry: "BR-0001-0001",
        plan: planYaml({
          rules: `  - id: BR-0001-0001\n    binds: none\n  - id: BR-0001-0004\n    contract: ${CONTRACT}\n`,
        }),
      },
      {
        name: "a rule with an empty retire reason",
        entry: "BR-0001-0002",
        plan: planYaml({ rules: `${BASE_RULES}  - id: BR-0001-0002\n    retire: ''\n` }),
      },
    ];
    for (const { name, entry, plan } of invalid) {
      await withProject(async (root) => {
        await putPlanPack(root, plan);
        const before = await treeHash(root);
        const result = await run(step04, await context(root));
        expect(result.code, name).toBe(2);
        expect(result.errors, name).toContain("plan.yaml");
        expect(result.errors, name).toContain(entry);
        expect(await treeHash(root), name).toBe(before);
        await expectNoIdMap(root);
      });
    }
  });

  it("accepts a mark on an unplaced rule and refuses an entry the ID map does not hold", async () => {
    // QFAI:EX-0004-0003-39
    const prepared = async (root: string, plan: string): Promise<void> => {
      await putPlanPack(root);
      expect((await run(step04, await context(root))).code).toBe(3);
      await put(root, PLAN_FILE, plan);
    };
    await withProject(async (root) => {
      await prepared(
        root,
        planYaml({ examples: "examples:\n  - id: EX-0001-0002\n    criterion: AC-0001-0002\n" }),
      );
      const before = await treeHash(root);
      const result = await run(step04, await context(root));
      expect(result.code).toBe(2);
      expect(result.errors).toContain("EX-0001-0002");
      expect(await treeHash(root)).toBe(before);
    });
    await withProject(async (root) => {
      await prepared(
        root,
        planYaml({ rules: `${BASE_RULES}  - id: BR-0001-0002\n    binds: none\n` }),
      );
      const mapBefore = await readFile(path.join(root, MAP_FILE), "utf8");
      const renumbered = await run(step04, await context(root));
      expect(renumbered.code).toBe(3);
      expect(await readFile(path.join(root, MAP_FILE), "utf8")).toBe(mapBefore);
      expect((await mapIds(root))["BR-0001-0002"]).toBeUndefined();
      const moved = await run(step07, await context(root));
      expect(moved.code).toBe(3);
      const remaining = await readFile(path.join(root, PACK_DIR, "04_Business-Rules.md"), "utf8");
      expect(remaining).toContain("BR-0001-0003");
      expect(remaining).not.toContain("BR-0001-0002");
      expect(reportSection(moved.output, "Operations")).toContain("BR-0001-0002");
      expect(reportSection(moved.output, "For a person")).not.toContain("BR-0001-0002");
      expect(reportSection(moved.output, "For a person")).toContain("BR-0001-0003");
    });
    await withProject(async (root) => {
      await prepared(
        root,
        planYaml({
          rules: `  - id: BR-0001-0001\n    contract: ${CONTRACT}\n  - id: BR-0001-0004\n    binds: none\n`,
        }),
      );
      const before = await treeHash(root);
      const result = await run(step04, await context(root));
      expect(result.code).toBe(2);
      expect(result.errors).toContain("BR-0001-0004");
      expect(await treeHash(root)).toBe(before);
    });
  });

  it("refuses a rerun whose plan no longer places an example the ID map holds", async () => {
    // QFAI:EX-0004-0003-39
    await withProject(async (root) => {
      await putPlanPack(
        root,
        planYaml({ examples: "examples:\n  - id: EX-0001-0002\n    criterion: AC-0001-0001\n" }),
      );
      expect((await run(step04, await context(root))).code).toBe(3);
      expect((await mapIds(root))["EX-0001-0002"]).toBeDefined();
      await put(root, PLAN_FILE, planYaml({}));
      const before = await treeHash(root);
      const result = await run(step04, await context(root));
      expect(result.code).toBe(2);
      expect(result.errors).toContain("numbering changed for EX-0001-0002");
      expect(await treeHash(root)).toBe(before);
    });
  });

  it("refuses a step 7 rerun whose plan marks a rule no pack holds", async () => {
    // QFAI:EX-0004-0003-39
    for (const missing of ["BR-0001-0099", "BR-9999-0001"]) {
      await withProject(async (root) => {
        await putPlanPack(root);
        expect((await run(step04, await context(root))).code).toBe(3);
        await put(
          root,
          PLAN_FILE,
          planYaml({ rules: `${BASE_RULES}  - id: ${missing}\n    binds: none\n` }),
        );
        const before = await treeHash(root);
        const result = await run(step07, await context(root));
        expect(result.code, missing).toBe(2);
        expect(result.errors, missing).toContain(missing);
        expect(await treeHash(root), missing).toBe(before);
      });
    }
  });

  it("accepts binds none only where the rule's Contract-Refs is a literal dash", async () => {
    // QFAI:EX-0004-0003-39
    await withProject(async (root) => {
      await putPlanPack(root);
      await put(
        root,
        `${PACK_DIR}/04_Business-Rules.md`,
        "# Rules\n\n| BR-ID | Rule | Contract-Refs |\n| --- | --- | --- |\n| BR-0001-0001 | Orders have an item. | CON-API-0001 |\n| BR-0001-0002 | Orders may be free. | - |\n| BR-0001-0003 | Orders may be held. | - |\n| BR-0001-0004 | Orders have a buyer. |  |\n",
      );
      await put(
        root,
        PLAN_FILE,
        planYaml({ rules: `${BASE_RULES}  - id: BR-0001-0004\n    binds: none\n` }),
      );
      const before = await treeHash(root);
      const result = await run(step04, await context(root));
      expect(result.code).toBe(2);
      expect(result.errors).toContain("BR-0001-0004");
      expect(await treeHash(root)).toBe(before);
    });
  });

  it("refuses an examples entry added after every pack is retired", async () => {
    // QFAI:EX-0004-0003-39
    await withProject(async (root) => {
      await putPlanPack(root);
      expect((await run(step04, await context(root))).code).toBe(3);
      await put(
        root,
        `${PACK_DIR}/01_Spec.md`,
        "# Spec\n\n- Status: superseded\n\n## Scope\n\n- In: Orders.\n",
      );
      await put(
        root,
        PLAN_FILE,
        planYaml({ examples: "examples:\n  - id: EX-0001-0002\n    criterion: AC-0001-0001\n" }),
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(2);
      expect(result.errors).toContain("EX-0001-0002");
    });
  });

  it("accepts a retire mark on a rule whose own status is retired and removes it in step 7", async () => {
    // QFAI:EX-0004-0003-39
    await withProject(async (root) => {
      await putPlanPack(root);
      await put(
        root,
        `${PACK_DIR}/04_Business-Rules.md`,
        "# Rules\n\n| BR-ID | Rule | Status | Contract-Refs |\n| --- | --- | --- | --- |\n| BR-0001-0001 | Orders have an item. | active | CON-API-0001 |\n| BR-0001-0002 | Orders may be free. | superseded | - |\n| BR-0001-0003 | Orders may be held. | active | - |\n| BR-0001-0004 | Orders have a buyer. | active | - |\n",
      );
      await put(
        root,
        PLAN_FILE,
        planYaml({ rules: `${BASE_RULES}  - id: BR-0001-0002\n    retire: replaced\n` }),
      );
      const planned = await run(step04, await context(root));
      expect(planned.code).toBe(3);
      expect((await mapIds(root))["BR-0001-0002"]).toBeUndefined();
      const moved = await run(step07, await context(root));
      expect(moved.code).toBe(3);
      const remaining = await readFile(path.join(root, PACK_DIR, "04_Business-Rules.md"), "utf8");
      expect(remaining).not.toContain("BR-0001-0002");
      expect(reportSection(moved.output, "Operations")).toContain("BR-0001-0002");
    });
  });

  it("leaves a criterion unresolved when its Parent line names a story that does not exist", async () => {
    // QFAI:EX-0004-0007-30
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/03_Acceptance-Criteria.md`,
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-9999\nScenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
      );
      await put(
        root,
        PLAN_FILE,
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\n        criteria:\n          - AC-0001-0001\nrules: []\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect((await mapIds(root))["AC-0001-0001"]).toBe("AC-0001-0001-01");
    });
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/03_Acceptance-Criteria.md`,
        "# Criteria\n\n## Catalog\n\n| AC-ID | US Ref |\n| --- | --- |\n| AC-0001-0001 | US-0001-0001 |\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-9999\nScenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
      );
      await put(
        root,
        PLAN_FILE,
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\nrules: []\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect((await mapIds(root))["AC-0001-0001"]).toBeUndefined();
    });
  });

  it("selects each flow's old section by its exact H2 title", async () => {
    // QFAI:EX-0004-0007-28
    const policy = (second: string): string =>
      `# Business Flow\n\n## Order flow\n\nBuyers place orders.\n\n\`\`\`mermaid\nflowchart LR\n  Cart --> Order\n\`\`\`\n\n## ${second}\n\nBuyers follow parcels.\n\n\`\`\`mermaid\nflowchart LR\n  Order --> Parcel\n\`\`\`\n`;
    const plan = (first: string, second: string): string =>
      `flows:\n  - title: Order flow\n    from: ${first}\n    stories:\n      - id: US-0001-0001\n  - title: Track flow\n    from: ${second}\n    stories:\n      - id: US-0001-0002\nrules: []\n`;
    await withProject(async (root) => {
      await putPlanPack(root, plan("Order flow", "Track flow"));
      await put(root, ".qfai/spec/_policies/04_Business-Flow.md", policy("Track flow"));
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      const first = await readFile(path.join(root, FLOW_DIR, "business-flow.md"), "utf8");
      const second = await readFile(
        path.join(root, ".qfai/spec/02_business-flow/business-flow-0002/business-flow.md"),
        "utf8",
      );
      expect(first).toContain(
        "## Purpose\n\nBuyers place orders.\n\n## Flow\n\n```mermaid\nflowchart LR\n  Cart --> Order\n```\n",
      );
      expect(first).not.toContain("parcels");
      expect(first).not.toContain("Parcel");
      expect(second).toContain(
        "## Purpose\n\nBuyers follow parcels.\n\n## Flow\n\n```mermaid\nflowchart LR\n  Order --> Parcel\n```\n",
      );
      expect(second).not.toContain("Buyers place orders.");
      expect(second).not.toContain("Cart --> Order");
    });
    for (const { name, from, second } of [
      { name: "a title no H2 holds", from: "No such flow", second: "Track flow" },
      { name: "a title two H2 sections hold", from: "Order flow", second: "Order flow" },
    ]) {
      await withProject(async (root) => {
        await putPlanPack(root, plan(from, "Track flow"));
        await put(root, ".qfai/spec/_policies/04_Business-Flow.md", policy(second));
        const before = await treeHash(root);
        const result = await run(step04, await context(root));
        expect(result.code, name).toBe(2);
        expect(result.errors, name).toContain("plan.yaml");
        expect(result.errors, name).toContain(from);
        expect(await treeHash(root), name).toBe(before);
      });
    }
  });

  it("takes a criterion's story from its catalog row when it has no Parent line", async () => {
    // QFAI:EX-0004-0007-29
    const criteria = (column: string, parentLine: string): string =>
      `# Criteria\n\n## Catalog\n\n| AC-ID | ${column} |\n| --- | --- |\n| AC-0001-0001 | US-0001-0001 |\n\n\`\`\`gherkin\n# AC-0001-0001\n${parentLine}Scenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n\`\`\`\n`;
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/03_Acceptance-Criteria.md`,
        criteria("US Ref", "# Parent: US-0001-0001\n"),
      );
      await run(step04, await context(root));
      expect((await mapIds(root))["AC-0001-0001"]).toBe("AC-0001-0001-01");
    });
    for (const column of ["US Ref", "US-Refs", "Maps To"]) {
      await withProject(async (root) => {
        await putMinimalPack(root);
        await put(root, `${PACK_DIR}/03_Acceptance-Criteria.md`, criteria(column, ""));
        const result = await run(step04, await context(root));
        expect((await mapIds(root))["AC-0001-0001"], column).toBe("AC-0001-0001-01");
        expect(reportSection(result.output, "For a person"), column).not.toMatch(
          /AC-0001-0001(?!-\d)/,
        );
        expect(
          await readFile(path.join(root, STORY_DIR, "02_Acceptance-Criteria.md"), "utf8"),
        ).toContain("# AC-0001-0001-01");
      });
    }
  });

  it("keeps a criterion whose Parent line and catalog row disagree until a story lists it", async () => {
    // QFAI:EX-0004-0007-30
    const criteria = (parentLine: string, cell: string): string =>
      `# Criteria\n\n## Catalog\n\n| AC-ID | US Ref |\n| --- | --- |\n| AC-0001-0001 | ${cell} |\n\n\`\`\`gherkin\n# AC-0001-0001\n${parentLine}Scenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n\`\`\`\n`;
    const stories =
      "# Stories\n\n## US-0001-0001: Order\n\nOrder.\n\n## US-0001-0002: Review\n\nReview.\n";
    const plan = (assigned: string): string =>
      `flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\n      - id: US-0001-0002\n${assigned}rules: []\n`;
    const source = `${PACK_DIR}/03_Acceptance-Criteria.md`;
    const item = (output: string): string =>
      reportSection(output, "For a person")
        .split("\n")
        .find(
          (line) => line.includes("03_Acceptance-Criteria.md") && line.includes("AC-0001-0001"),
        ) ?? "";
    for (const { name, text, word } of [
      {
        name: "a row naming another story",
        text: criteria("# Parent: US-0001-0001\n", "US-0001-0002"),
        word: "",
      },
      {
        name: "a row naming two stories",
        text: criteria("", "US-0001-0001, US-0001-0002"),
        word: "ambiguous",
      },
    ]) {
      await withProject(async (root) => {
        await putMinimalPack(root);
        await put(root, `${PACK_DIR}/02_User-stories.md`, stories);
        await put(root, source, text);
        await put(root, PLAN_FILE, plan(""));
        const result = await run(step04, await context(root));
        expect(result.code, name).toBe(3);
        expect((await mapIds(root))["AC-0001-0001"], name).toBeUndefined();
        expect(await readFile(path.join(root, source), "utf8"), name).toBe(text);
        const line = item(result.output);
        expect(line, name).not.toBe("");
        expect(line, name).toContain("US-0001-0002");
        expect(line, name).toContain("US-0001-0001");
        if (word !== "") expect(line, name).toContain(word);
      });
    }
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(root, `${PACK_DIR}/02_User-stories.md`, stories);
      await put(root, source, criteria("# Parent: US-0001-0001\n", "US-0001-0002"));
      await put(
        root,
        PLAN_FILE,
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\n      - id: US-0001-0002\n        criteria:\n          - AC-0001-0001\nrules: []\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect((await mapIds(root))["AC-0001-0001"]).toBe("AC-0001-0002-01");
      expect(
        await readFile(
          path.join(root, FLOW_DIR, "user-story-0001-0002/02_Acceptance-Criteria.md"),
          "utf8",
        ),
      ).toContain("# AC-0001-0002-01");
    });
  });

  it("writes a story sentence from the fields of a block, each bold or plain", async () => {
    // QFAI:EX-0004-0007-31
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/02_User-stories.md`,
        "# Stories\n\n## US-0001-0001: Place order\n\n- **As a** buyer\n- **I want**: to place an order\n- **So that**: the cart becomes a purchase\n\n## US-0001-0002: Place order again\n\n- As a: buyer\n- I want to place an order\n- So that the cart becomes a purchase.\n",
      );
      await put(
        root,
        PLAN_FILE,
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\n      - id: US-0001-0002\nrules: []\n",
      );
      const result = await run(step04, await context(root));
      const sentence = "As a buyer, I want to place an order, so that the cart becomes a purchase.";
      expect(
        await readFile(path.join(root, FLOW_DIR, "user-story-0001-0001/01_User-story.md"), "utf8"),
      ).toBe(`# US-0001-0001: Place order\n\n## User Story\n\n${sentence}\n`);
      expect(
        await readFile(path.join(root, FLOW_DIR, "user-story-0001-0002/01_User-story.md"), "utf8"),
      ).toBe(`# US-0001-0002: Place order again\n\n## User Story\n\n${sentence}\n`);
      expect(result.output).not.toContain("is not one");
    });
  });

  it("drops the closing marker of a story field written entirely in bold", async () => {
    // QFAI:EX-0004-0007-31
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/02_User-stories.md`,
        "# Stories\n\n## US-0001-0001: Place order\n\n- **As a: buyer**\n- **I want: to place an order**\n- **So that: the cart becomes a purchase**\n",
      );
      await run(step04, await context(root));
      expect(
        await readFile(path.join(root, FLOW_DIR, "user-story-0001-0001/01_User-story.md"), "utf8"),
      ).toBe(
        "# US-0001-0001: Place order\n\n## User Story\n\nAs a buyer, I want to place an order, so that the cart becomes a purchase.\n",
      );
    });
  });

  it("keeps the article a story block's As an field was written with", async () => {
    // QFAI:EX-0004-0007-31
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/02_User-stories.md`,
        "# Stories\n\n## US-0001-0001: Place order\n\n- As an: administrator\n- I want to place an order\n- So that the cart becomes a purchase.\n",
      );
      await run(step04, await context(root));
      expect(
        await readFile(path.join(root, FLOW_DIR, "user-story-0001-0001/01_User-story.md"), "utf8"),
      ).toBe(
        "# US-0001-0001: Place order\n\n## User Story\n\nAs an administrator, I want to place an order, so that the cart becomes a purchase.\n",
      );
    });
  });

  it("leaves a criterion unresolved when its catalog row names a story that does not exist", async () => {
    // QFAI:EX-0004-0007-29
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/03_Acceptance-Criteria.md`,
        "# Criteria\n\n## Catalog\n\n| AC-ID | US Ref |\n| --- | --- |\n| AC-0001-0001 | US-0001-9999 |\n\n```gherkin\n# AC-0001-0001\nScenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
      );
      await put(
        root,
        PLAN_FILE,
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\n        criteria:\n          - AC-0001-0001\nrules: []\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect((await mapIds(root))["AC-0001-0001"]).toBe("AC-0001-0001-01");
    });
  });

  it("writes a story block missing a part as it stands and names the missing part", async () => {
    // QFAI:EX-0004-0007-32
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/02_User-stories.md`,
        "# Stories\n\n## US-0001-0001: Order\n\n- **As a** buyer\n- **So that**: the cart becomes a purchase\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      const file = `${FLOW_DIR}/user-story-0001-0001/01_User-story.md`;
      expect(await readFile(path.join(root, file), "utf8")).toBe(
        "# US-0001-0001: Order\n\n## User Story\n\n- **As a** buyer\n- **So that**: the cart becomes a purchase\n",
      );
      const line =
        reportSection(result.output, "For a person")
          .split("\n")
          .find((item) => item.includes(`${file}:`)) ?? "";
      expect(line).toContain("I want");
      expect(line).toContain("missing");
    });
  });

  it("converts indented Scenario, Scenario Outline and Background keywords as unindented ones", async () => {
    // QFAI:EX-0004-0007-33
    const criteria = (indent: string): string =>
      `# Criteria\n\n\`\`\`gherkin\n${indent === "" ? "# Orders\n" : "Feature: Orders\n"}# AC-0001-0001\n# Parent: US-0001-0001\n${indent}Scenario: Order <n>\n Given <n> items\n  When an order is placed with\n  """\n payload\n  """\n Then the order is accepted\n   * a receipt is sent\n   Examples:\n     | n |\n     | 2 |\n\n# AC-0001-0002\n# Parent: US-0001-0001\n${indent}Background:\n  Given a signed-in buyer\n\n${indent}Scenario: Place one order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n\n@later\n${indent}Scenario: Place two orders\n  Given two carts\n  When both orders are placed\n  Then both are accepted\n\n# AC-0001-0003\n# Parent: US-0001-0001\n${indent}Scenario Outline: Place <count> items\n  Given <count> items\n  When the order is placed\n  Then the order is accepted\n  Examples:\n    | count |\n    | 2     |\n\`\`\`\n`;
    const converted = async (indent: string) => {
      let outcome = { output: "", criteria: "" };
      await withProject(async (root) => {
        await putMinimalPack(root);
        await put(root, `${PACK_DIR}/03_Acceptance-Criteria.md`, criteria(indent));
        const result = await run(step04, await context(root));
        outcome = {
          output: result.output,
          criteria: await readFile(
            path.join(root, STORY_DIR, "02_Acceptance-Criteria.md"),
            "utf8",
          ).catch(() => ""),
        };
      });
      return outcome;
    };
    const plain = await converted("");
    expect(plain.output).not.toContain("no convertible");
    const indented = await converted("  ");
    expect(indented.output).not.toContain("no convertible");
    expect(indented.criteria).toBe(plain.criteria);
    expect(indented.output).toBe(plain.output);
  });

  it("places an example under the criterion its plan entry names", async () => {
    // QFAI:EX-0004-0007-34
    await withProject(async (root) => {
      await putPlanPack(root);
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect((await mapIds(root))["EX-0001-0002"]).toBeUndefined();
      expect(reportSection(result.output, "For a person")).toContain(
        "05_Examples.md: EX-0001-0002",
      );
      expect(await readFile(path.join(root, PACK_DIR, "05_Examples.md"), "utf8")).toContain(
        "EX-0001-0002",
      );
    });
    await withProject(async (root) => {
      await putPlanPack(
        root,
        planYaml({ examples: "examples:\n  - id: EX-0001-0002\n    criterion: AC-0001-0002\n" }),
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      const ids = await mapIds(root);
      expect(ids["EX-0001-0002"]).toBe("EX-0001-0002-01");
      expect(ids["TC-0001-0002"]).toBe("EX-0001-0002-01");
      expect(ids["TC-0001-0003"]).toBe("EX-0001-0002-01");
      expect(
        await readFile(path.join(root, FLOW_DIR, "user-story-0001-0002/03_Example.md"), "utf8"),
      ).toContain("| EX-0001-0002-01 | AC-0001-0002-01 | two items | accepted twice |");
      const other = await readFile(
        path.join(root, FLOW_DIR, "user-story-0001-0001/03_Example.md"),
        "utf8",
      );
      expect(other).toContain("one item");
      expect(other).not.toContain("two items");
      expect(reportSection(result.output, "For a person")).not.toContain("EX-0001-0002");
    });
  });

  it("reads an example's index table row and heading section as one example", async () => {
    // QFAI:EX-0004-0007-35
    await withProject(async (root) => {
      await putMinimalPack(
        root,
        "active",
        "| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n",
      );
      await put(
        root,
        `${PACK_DIR}/05_Examples.md`,
        "# Examples\n\n| EX-ID | BR-Ref |\n| --- | --- |\n| EX-0001-0001 | — |\n\n## EX-0001-0001: Order accepted\n\n- Given one item\n- Then the order is accepted\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(result.errors).not.toContain("duplicate");
      const examples = await readFile(path.join(root, STORY_DIR, "03_Example.md"), "utf8");
      expect(examples.match(/^\| EX-0001-0001-01 \|/gm)).toHaveLength(1);
      expect(examples).toContain(
        "| EX-0001-0001-01 | AC-0001-0001-01 | one item | the order is accepted |",
      );
    });
  });

  it("refuses an example whose row and section disagree, naming both locations", async () => {
    // QFAI:EX-0004-0007-36
    await withProject(async (root) => {
      await putMinimalPack(
        root,
        "active",
        "| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n",
      );
      await put(
        root,
        `${PACK_DIR}/05_Examples.md`,
        "# Examples\n\n| EX-ID | AC-Ref | BR-Ref |\n| --- | --- | --- |\n| EX-0001-0001 | AC-0001-0001 | — |\n\n## EX-0001-0001: Order accepted\n\n- AC-Ref: AC-0001-0002\n- Given one item\n- Then the order is accepted\n",
      );
      const before = await treeHash(root);
      const result = await run(step04, await context(root));
      expect(result.code).toBe(2);
      const lines = namedLines(result.errors, "05_Examples.md");
      expect(lines).toContain(5);
      expect(lines.some((line) => line >= 7 && line <= 11)).toBe(true);
      expect(result.errors).toMatch(/index table row, a heading section or both/);
      expect(result.errors).toMatch(/equal values/);
      expect(await treeHash(root)).toBe(before);
      await expectNoIdMap(root);
    });
  });

  // QFAI:AC-0004-0007-05
  it("reads an ID written as a table row and as a heading as one record, whatever its kind", async () => {
    const kinds = [
      {
        kind: "example",
        file: "05_Examples.md",
        cases: "| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n",
        text: (field: string) =>
          `# Examples\n\n| EX-ID | AC-Ref | BR-Ref |\n| --- | --- | --- |\n| EX-0001-0001 | AC-0001-0001 | — |\n\n## EX-0001-0001: Order accepted\n\n- AC-Ref: ${field}\n- Given one item\n- Then the order is accepted\n`,
        agree: "AC-0001-0001",
        differ: "AC-0001-0002",
      },
      {
        kind: "test case",
        file: "06_Test-Cases.md",
        cases: "",
        text: (field: string) =>
          `# Cases\n\n| TC-ID | AC-Refs | EX-Ref |\n| --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | — |\n\n## TC-0001-0001: Submit an order\n\n- AC-Refs: ${field}\n- EX-Ref: —\n- Verify that submission creates an order.\n`,
        agree: "AC-0001-0001",
        differ: "AC-0001-0002",
      },
      {
        kind: "rule",
        file: "04_Business-Rules.md",
        cases: "",
        text: (field: string) =>
          `# Rules\n\n| BR-ID | Status |\n| --- | --- |\n| BR-0001-0001 | active |\n\n## BR-0001-0001: Orders have an item\n\n- Status: ${field}\n- Orders have an item.\n`,
        agree: "active",
        differ: "draft",
      },
    ];
    for (const { kind, file, cases, text, agree, differ } of kinds) {
      await withProject(async (root) => {
        await putMinimalPack(root, "active", cases);
        await put(root, `${PACK_DIR}/${file}`, text(agree));
        const result = await run(step04, await context(root));
        expect(result.code, kind).toBe(3);
        expect(result.errors, kind).toBe("");
        expect(result.output, kind).not.toContain("duplicate");
      });
      await withProject(async (root) => {
        await putMinimalPack(root, "active", cases);
        await put(root, `${PACK_DIR}/${file}`, text(differ));
        const before = await treeHash(root);
        const result = await run(step04, await context(root));
        expect(result.code, kind).toBe(2);
        const lines = namedLines(result.errors, file);
        expect(lines, kind).toContain(5);
        expect(
          lines.some((line) => line >= 7 && line <= 11),
          kind,
        ).toBe(true);
        expect(result.errors, kind).toMatch(/index table row, a heading section or both/);
        expect(result.errors, kind).toMatch(/equal values/);
        expect(await treeHash(root), kind).toBe(before);
        await expectNoIdMap(root);
      });
    }
  });

  it("reads the steps' tables headed with a space as it reads them headed with a hyphen", async () => {
    // QFAI:EX-0004-0007-37
    const hyphen = await runOldPack();
    expect(hyphen.codes).toEqual([3, 0]);
    const again = await runOldPack();
    expect(again.codes).toEqual(hyphen.codes);
    expect(again.outputs).toEqual(hyphen.outputs);
    expect(again.snapshot).toEqual(hyphen.snapshot);
    const spaced = await runOldPack(
      ["04_Business-Rules.md", "BR-ID", "BR ID"],
      ["05_Examples.md", "EX-ID", "EX ID"],
      ["06_Test-Cases.md", "TC-ID", "TC ID"],
    );
    expect(spaced.codes).toEqual(hyphen.codes);
    expect(spaced.outputs).toEqual(hyphen.outputs);
    expect(spaced.snapshot).toEqual(hyphen.snapshot);
  });

  it("stops step 4 before writing when a rules table holds only rule IDs under an unknown header", async () => {
    // QFAI:EX-0004-0007-38
    const rules = (header: string): string =>
      `# Rules\n\n| ${header} | Rule |\n| --- | --- |\n| BR-0001-0001 | Orders have an item. |\n| BR-0001-0002 | Orders may be free. |\n`;
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(root, `${PACK_DIR}/04_Business-Rules.md`, rules("BR-ID"));
      expect((await run(step04, await context(root))).code).toBe(3);
    });
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(root, `${PACK_DIR}/04_Business-Rules.md`, rules("Rule No"));
      const before = await treeHash(root);
      const result = await run(step04, await context(root));
      expect(result.code).toBe(2);
      expect(namedLines(result.errors, "04_Business-Rules.md")).toContain(3);
      expect(await treeHash(root)).toBe(before);
      expect(await readFile(path.join(root, PACK_DIR, "04_Business-Rules.md"), "utf8")).toBe(
        rules("Rule No"),
      );
      await expectNoIdMap(root);
    });
  });

  // QFAI:AC-0004-0007-06
  it("reads an old table headed with a space and stops on one whose IDs stand under an unknown header", async () => {
    const example = (header: string): string =>
      `# Examples\n\n| ${header} | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | one item | accepted |\n`;
    const testCase = (header: string): string =>
      `# Cases\n\n| ${header} | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n`;
    const rule = (header: string): string =>
      `# Rules\n\n| ${header} | Rule |\n| --- | --- |\n| BR-0001-0001 | Orders have an item. |\n`;
    const kinds = [
      { kind: "rule", file: "04_Business-Rules.md", text: rule, spaced: "BR ID", hyphen: "BR-ID" },
      { kind: "example", file: "05_Examples.md", text: example, spaced: "EX ID", hyphen: "EX-ID" },
      {
        kind: "test case",
        file: "06_Test-Cases.md",
        text: testCase,
        spaced: "TC ID",
        hyphen: "TC-ID",
      },
    ];
    const readWith = async (file: string, content: string) => {
      let outcome = { code: 0, output: "", written: "" };
      await withProject(async (root) => {
        await putMinimalPack(root);
        await put(root, `${PACK_DIR}/04_Business-Rules.md`, rule("BR-ID"));
        await put(root, `${PACK_DIR}/05_Examples.md`, example("EX-ID"));
        await put(root, `${PACK_DIR}/06_Test-Cases.md`, testCase("TC-ID"));
        await put(root, `${PACK_DIR}/${file}`, content);
        const result = await run(step04, await context(root));
        const map = await readFile(path.join(root, MAP_FILE), "utf8").catch(() => "");
        const examples = await readFile(path.join(root, STORY_DIR, "03_Example.md"), "utf8").catch(
          () => "",
        );
        outcome = { code: result.code, output: result.output, written: `${map}\n${examples}` };
      });
      return outcome;
    };
    for (const { kind, file, text, spaced, hyphen } of kinds) {
      const control = await readWith(file, text(hyphen));
      expect(control.code, kind).toBe(3);
      expect(await readWith(file, text(spaced)), kind).toEqual(control);
      await withProject(async (root) => {
        await putMinimalPack(root);
        await put(root, `${PACK_DIR}/${file}`, text("Number"));
        const before = await treeHash(root);
        const result = await run(step04, await context(root));
        expect(result.code, kind).toBe(2);
        expect(namedLines(result.errors, file), kind).toContain(3);
        expect(await treeHash(root), kind).toBe(before);
        await expectNoIdMap(root);
      });
    }
  });

  it("still reads a criteria catalog by the criterion IDs in its rows and refuses no table of other text", async () => {
    // QFAI:AC-0004-0007-06
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        `${PACK_DIR}/03_Acceptance-Criteria.md`,
        "# Criteria\n\n| Criterion | US Ref |\n| --- | --- |\n| AC-0001-0001 | US-0001-0001 |\n\n```gherkin\n# AC-0001-0001\nScenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
      );
      await put(
        root,
        `${PACK_DIR}/04_Business-Rules.md`,
        "# Rules\n\n| Area | Owner |\n| --- | --- |\n| Orders | Ann |\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | Orders have an item. |\n",
      );
      const result = await run(step04, await context(root));
      expect(result.errors).toBe("");
      expect(result.code).toBe(3);
      expect(
        await readFile(path.join(root, STORY_DIR, "02_Acceptance-Criteria.md"), "utf8"),
      ).toMatch(/# AC-0001-0001-01/);
    });
  });

  // QFAI:AC-0004-0009-04
  it("moves a rule written as a table row and as a heading once, leaving the lines between", async () => {
    const rules = (status: string): string =>
      `# Rules\n\n| BR-ID | Status |\n| --- | --- |\n| BR-0001-0001 | active |\n| BR-0001-0002 | active |\n\n## BR-0001-0001: Orders have an item\n\n- Status: ${status}\n- Orders have an item.\n\n## BR-0001-0002: Orders may be free\n\n- Status: active\n- Orders may be free.\n`;
    const plan = planYaml({ rules: `  - id: BR-0001-0001\n    contract: ${CONTRACT}\n` });
    await withProject(async (root) => {
      await putPlanPack(root, plan);
      await put(root, `${PACK_DIR}/04_Business-Rules.md`, rules("active"));
      expect((await run(step04, await context(root))).code).toBe(3);
      const moved = await run(step07, await context(root));
      expect(moved.errors).toBe("");
      expect(moved.code).toBe(3);
      const contract: unknown = parseYaml(
        await readFile(path.join(root, ".qfai/spec/03_contract", CONTRACT), "utf8"),
      );
      const held =
        typeof contract === "object" && contract !== null && "x-qfai-rules" in contract
          ? contract["x-qfai-rules"]
          : undefined;
      expect(Array.isArray(held) ? held.length : 0).toBe(1);
      expect(JSON.stringify(held)).toContain("Orders have an item.");
      expect(JSON.stringify(held)).not.toContain("Orders may be free.");
      const remaining = await readFile(path.join(root, PACK_DIR, "04_Business-Rules.md"), "utf8");
      expect(remaining.split("\n").filter((line) => line.trim() !== "")).toEqual([
        "# Rules",
        "| BR-ID | Status |",
        "| --- | --- |",
        "| BR-0001-0002 | active |",
        "## BR-0001-0002: Orders may be free",
        "- Status: active",
        "- Orders may be free.",
      ]);
      expect(reportSection(moved.output, "For a person")).toContain(
        "04_Business-Rules.md: BR-0001-0002",
      );
    });
    await withProject(async (root) => {
      await putPlanPack(root, plan);
      await put(root, `${PACK_DIR}/04_Business-Rules.md`, rules("active"));
      expect((await run(step04, await context(root))).code).toBe(3);
      await put(root, `${PACK_DIR}/04_Business-Rules.md`, rules("draft"));
      const before = await treeHash(root);
      const refused = await run(step07, await context(root));
      expect(refused.code).toBe(2);
      const lines = namedLines(refused.errors, "04_Business-Rules.md");
      expect(lines).toContain(5);
      expect(lines.some((line) => line >= 8 && line <= 12)).toBe(true);
      expect(refused.errors).toMatch(/index table row, a heading section or both/);
      expect(refused.errors).toMatch(/equal values/);
      expect(await treeHash(root)).toBe(before);
    });
  });
});

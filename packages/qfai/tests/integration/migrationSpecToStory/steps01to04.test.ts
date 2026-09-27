import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../../../src/core/config.js";
import {
  executePlannedStep,
  runStep,
  type MigrationContext,
} from "../../../src/migration/specToStory/harness.js";
import { step01 } from "../../../src/migration/specToStory/step01RenameDirectories.js";
import { step02 } from "../../../src/migration/specToStory/step02MergeTables.js";
import { step04 } from "../../../src/migration/specToStory/step04RenumberIds.js";

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
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Place one order\n Given an empty cart\n When an item is added\n Then the order is accepted\n\n# AC-0001-0002\n# Parent: US-0001-0001\nScenario Outline: Place <count> items\n Given <count> items\n When the order is placed\n Then the order is accepted\n Examples:\n   | count |\n   | 2     |\n```\n",
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
          "  Scenario Outline: Place <count> items",
          "    Given <count> items",
          "    When the order is placed",
          "    Then the order is accepted",
          "    Examples:",
          "      | count |",
          "      | 2     |",
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
        '# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario Outline: Order <n>\n Given <n> items\n  When an order is placed with\n  """\n payload\n  """\n Then the order is accepted\n   * a receipt is sent\n   Examples:\n     | n |\n     | 2 |\n```\n',
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
});

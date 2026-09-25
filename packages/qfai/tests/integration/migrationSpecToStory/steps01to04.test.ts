import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

  it("writes a stable ID map, story files and re-keyed worklog from the plan", async () => {
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
        "# Stories\n\n## US-0001-0001: Place an order\n\n- Goal: Place an order.\n",
      );
      await put(
        root,
        ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
        "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Place one order\n  Given an empty cart\n  When an item is added\n  Then the order is accepted\n```\n",
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
      await put(
        root,
        ".qfai/steering/entry.md",
        "---\nid: entry\nscope: spec-0001\nlinks: [spec-0001]\npromote-to: spec-0001/07_Decisions.md\n---\nBody\n",
      );
      const first = await run(step04, await context(root));
      expect(first.code).toBe(0);
      const mapPath = path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json");
      const firstMap = await readFile(mapPath, "utf8");
      const map = JSON.parse(firstMap) as { ids: Record<string, Record<string, string>> };
      expect(map.ids["spec-0001"]).toMatchObject({
        "US-0001-0001": "US-0001-0001",
        "AC-0001-0001": "AC-0001-0001-01",
        "EX-0001-0001": "EX-0001-0001-01",
        "TC-0001-0001": "EX-0001-0001-01",
        "TC-0001-0002": "EX-0001-0001-02",
        "BR-0001-0001": "BR-0001",
      });
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
      expect(story).toContain("## Legacy Source Scope\n\n### In\n\n- Order placement.");
      expect(story).toContain(
        "- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0001/01_Spec.md#scope`",
      );
      expect(story).toContain(
        "- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0001/02_User-stories.md#us-0001-0001`",
      );
      expect(await readFile(path.join(root, ".qfai/steering/entry.md"), "utf8")).toContain(
        "scope: BF-0001",
      );
      const second = await run(step04, await context(root));
      expect(second.code).toBe(0);
      expect(second.output).toContain("## Operations\nnone");
      expect(await readFile(mapPath, "utf8")).toBe(firstMap);
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

  it("carries one pack's scope and the distinct source block into each of its stories", async () => {
    await withProject(async (root) => {
      await putMinimalPack(root);
      await put(
        root,
        ".qfai/spec/spec-0001/02_User-stories.md",
        "# Stories\n\n## US-0001-0001: Place order\n\n- Goal: Place order.\n\n## US-0001-0002: Review order\n\n- Goal: Review order.\n",
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
      for (const [id, goal] of [
        ["0001", "Place order."],
        ["0002", "Review order."],
      ] as const) {
        const story = await readFile(
          path.join(
            root,
            `.qfai/spec/02_business-flow/business-flow-0001/user-story-0001-${id}/01_User-story.md`,
          ),
          "utf8",
        );
        expect(story).toContain(`- Goal: ${goal}`);
        expect(story).toContain("## Legacy Source Scope\n\n- In: Orders.");
        expect(story).toContain(`02_User-stories.md#us-0001-${id}`);
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
      const storyCriteria = await readFile(
        path.join(
          root,
          ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
        ),
        "utf8",
      );
      expect(storyCriteria).not.toContain("The order is accepted.");
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

  it("reports an old short DR reference when no unique DEC row exists", async () => {
    await withProject(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/id-map.json",
        '{"version":1,"ids":{},"placements":{},"retiredPacks":{}}\n',
      );
      await put(root, ".qfai/evidence/migration-spec-to-story/plan.yaml", "flows: []\nrules: []\n");
      await put(root, ".qfai/steering/entry.md", "---\nid: entry\npromoted-to: DR-1\n---\nBody\n");
      const result = await run(step04, await context(root));
      expect(result.code).toBe(3);
      expect(result.output).toContain("promoted-to DR-1 has no unique DEC row");
      expect(await readFile(path.join(root, ".qfai/steering/entry.md"), "utf8")).toContain(
        "promoted-to: DR-1",
      );
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
        "flows:\n  - title: Order flow\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n  - id: BR-0001-0002\n    contract: api/later.yaml\n",
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

  it("matches a promoted DR by the decision file promote-to names, not by the DR ID alone", async () => {
    // QFAI:EX-0004-0007-10
    await withProject(async (root) => {
      await put(
        root,
        "qfai.config.yaml",
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      await put(
        root,
        ".qfai/evidence/migration-spec-to-story/id-map.json",
        '{"version":1,"ids":{},"placements":{},"retiredPacks":{}}\n',
      );
      await put(root, ".qfai/evidence/migration-spec-to-story/plan.yaml", "flows: []\nrules: []\n");
      await put(
        root,
        ".qfai/spec/decisions.md",
        "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0001 | .qfai/spec/spec-0001/07_Decisions.md#DR-0001: First pack | a | DONE |\n| DEC-0002 | .qfai/spec/spec-0002/07_Decisions.md#DR-0001: Second pack | b | DONE |\n",
      );
      await put(
        root,
        ".qfai/steering/entry.md",
        "---\nid: entry\npromote-to: spec-0002/07_Decisions.md\npromoted-to: DR-0001\n---\nBody\n",
      );
      const result = await run(step04, await context(root));
      expect(result.code).toBe(0);
      const entry = await readFile(path.join(root, ".qfai/steering/entry.md"), "utf8");
      expect(entry).toContain("promote-to: decisions.md");
      expect(entry).toContain("promoted-to: DEC-0002");
    });
  });
});

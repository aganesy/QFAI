import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parse as parseYaml } from "yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../../src/core/config.js";
import type { Issue } from "../../../src/core/types.js";
import { validateStepTree } from "../../../src/core/validators/stepTree.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { removeTempTree } from "../../helpers/tempTree.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-step-tree-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

function frontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return ["---", ...lines, "---", "", "Body.", ""].join("\n");
}

async function writeDoc(rel: string, content: string): Promise<void> {
  const target = path.join(root, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf-8");
}

async function writeParent(
  name: string,
  steps: string,
  roles = "[orchestrator]",
  extra: Record<string, string> = {},
): Promise<void> {
  await writeDoc(
    `.qfai/assistant/skill/${name}/SKILL.md`,
    frontmatter({ name, description: '"Use when testing."', steps, roles, ...extra }),
  );
}

async function writeStep(dir: string, fields: Record<string, string>): Promise<void> {
  await writeDoc(`.qfai/assistant/step/${dir}/STEP.md`, frontmatter({ name: dir, ...fields }));
}

/** A consistent tree: one parent, one owned step, one common step it requires. */
async function seedCleanTree(): Promise<void> {
  await writeParent("qfai-demo", "[demo-one, common-share]");
  await writeStep("demo-one", { owner: "qfai-demo", requires: "[common-share]" });
  await writeStep("common-share", { owner: "common", requires: "[]" });
}

/** Findings about this fixture, leaving out the package plans' steps it does not install. */
async function run(): Promise<Issue[]> {
  const issues = await validateStepTree(root, (await loadConfig(root)).config);
  return issues.filter((finding) => !finding.message.startsWith("The workflow plan "));
}

function rules(issues: Issue[]): string[] {
  return issues.map((finding) => finding.rule ?? "");
}

describe("validateStepTree", () => {
  it("reports nothing for a project with no step layer and no parent", async () => {
    expect(await validateStepTree(root, (await loadConfig(root)).config)).toEqual([]);
  });

  it("accepts a consistent tree", async () => {
    await seedCleanTree();
    expect(await run()).toEqual([]);
  });

  // QFAI:AC-0001-0217-02
  // QFAI:EX-0001-0217-02
  it("refuses a SKILL.md anywhere under the step layer", async () => {
    await seedCleanTree();
    await writeDoc(".qfai/assistant/step/demo-one/nested/SKILL.md", "# nested\n");
    const found = await run();
    expect(rules(found)).toEqual(["stepTree.skillDocUnderSteps"]);
    expect(found[0]?.code).toBe("QFAI-SKILLS-016");
    expect(found[0]?.file).toBe(".qfai/assistant/step/demo-one/nested/SKILL.md");
  });

  // QFAI:EX-0001-0217-02
  // QFAI:EX-0001-0217-03
  it("refuses a step directory without STEP.md and a name that is not its directory", async () => {
    await seedCleanTree();
    await writeParent("qfai-demo", "[demo-one, demo-two, common-share]");
    await mkdir(path.join(root, ".qfai/assistant/step/demo-two"), { recursive: true });
    await writeStep("demo-one", { name: "demo-renamed", owner: "qfai-demo" });
    expect(rules(await run()).sort()).toEqual([
      "stepTree.missingStepDoc",
      "stepTree.nameMismatch",
      "stepTree.unknownStep",
    ]);
  });

  // QFAI:AC-0001-0217-03
  // QFAI:EX-0001-0217-04
  it("refuses an owner that is neither common nor an installed parent", async () => {
    await seedCleanTree();
    await writeStep("demo-one", { owner: "qfai-missing", requires: "[common-share]" });
    expect(rules(await run())).toEqual(["stepTree.unknownOwner"]);
  });

  // QFAI:EX-0001-0217-05
  it("refuses a parent steps: entry naming no installed step", async () => {
    await seedCleanTree();
    await writeParent("qfai-demo", "[demo-one, demo-absent, common-share]");
    const found = await run();
    expect(rules(found)).toEqual(["stepTree.unknownStep"]);
    expect(found[0]?.file).toBe(".qfai/assistant/skill/qfai-demo/SKILL.md");
  });

  // QFAI:EX-0001-0217-05
  it("refuses a plan step that is not installed", async () => {
    const plans = path.join(getInitAssetsDir(), "..", "defaults", "workflows");
    const [plan = ""] = (await readdir(plans)).filter((name) => name.endsWith(".yml"));
    const parsed = parseYaml(await readFile(path.join(plans, plan), "utf-8")) as {
      stages?: Array<{ steps?: unknown[] }>;
    };
    const first = parsed.stages?.[0]?.steps?.[0];
    const name = typeof first === "object" && first !== null ? Reflect.get(first, "step") : first;
    expect(typeof name).toBe("string");
    await seedCleanTree();
    const issues = await validateStepTree(root, (await loadConfig(root)).config);
    expect(
      issues.some(
        (finding) =>
          finding.rule === "stepTree.unknownStep" &&
          finding.message.includes(`uses step "${String(name)}"`),
      ),
    ).toBe(true);
  });

  // QFAI:EX-0001-0217-06
  it("refuses a step no parent lists, no plan uses and no step requires", async () => {
    await seedCleanTree();
    await writeStep("common-idle", { owner: "common", requires: "[]" });
    const found = await run();
    expect(rules(found)).toEqual(["stepTree.orphan"]);
    expect(found[0]?.file).toBe(".qfai/assistant/step/common-idle/STEP.md");
  });

  // QFAI:EX-0001-0217-06
  it("counts a common step a parent requires as used, and no step as used without a reference", async () => {
    await seedCleanTree();
    await writeStep("common-review-cycle", { owner: "common", requires: "[]" });
    const orphaned = await run();
    expect(rules(orphaned)).toEqual(["stepTree.orphan"]);
    expect(orphaned[0]?.file).toBe(".qfai/assistant/step/common-review-cycle/STEP.md");
    await writeParent("qfai-demo", "[demo-one, common-share]", "[orchestrator]", {
      requires: "[common-review-cycle]",
    });
    expect(await run()).toEqual([]);
  });

  it("counts a common step another step requires as used", async () => {
    await seedCleanTree();
    await writeParent("qfai-demo", "[demo-one]");
    expect(await run()).toEqual([]);
  });

  // QFAI:AC-0001-0217-04
  // QFAI:EX-0001-0217-07
  it("refuses requires naming a step that is not common", async () => {
    await seedCleanTree();
    await writeParent("qfai-demo", "[demo-one, demo-two, common-share]");
    await writeStep("demo-two", { owner: "qfai-demo", requires: "[demo-one]" });
    expect(rules(await run())).toEqual(["stepTree.requiresNonCommon"]);
  });

  // QFAI:EX-0001-0217-07
  it("refuses a common step that requires anything", async () => {
    await seedCleanTree();
    await writeStep("common-share", { owner: "common", requires: "[common-share]" });
    expect(rules(await run())).toEqual(["stepTree.commonRequires"]);
  });

  // QFAI:EX-0001-0217-09
  it("refuses a parent requires: that is not a list, names a step that is not common, or names no installed step", async () => {
    const cases: Array<[string, string, string]> = [
      ["common-share", "stepTree.requiresShape", "not a list"],
      ["[demo-one]", "stepTree.requiresNonCommon", '"demo-one"'],
      ["[common-absent]", "stepTree.unknownStep", '"common-absent"'],
    ];
    for (const [requires, rule, named] of cases) {
      await seedCleanTree();
      await writeParent("qfai-demo", "[demo-one, common-share]", "[orchestrator]", { requires });
      const found = await run();
      expect(rules(found), requires).toEqual([rule]);
      expect(found[0]?.file, requires).toBe(".qfai/assistant/skill/qfai-demo/SKILL.md");
      expect(found[0]?.message, requires).toContain(named);
    }
  });

  // QFAI:EX-0001-0217-06
  it("refuses a step whose owner's steps: does not list it", async () => {
    await seedCleanTree();
    await writeParent("qfai-demo", "[common-share]");
    await writeParent("qfai-other", "[demo-one]");
    expect(rules(await run())).toEqual(["stepTree.ownerOmitsStep"]);
  });

  it("refuses a parent whose roles: omit orchestrator or a role one of its steps declares", async () => {
    await seedCleanTree();
    await writeStep("demo-one", {
      owner: "qfai-demo",
      requires: "[common-share]",
      roles: "[solution-architect, completion-reviewer]",
    });
    await writeParent("qfai-demo", "[demo-one, common-share]", "[completion-reviewer]");
    const found = await run();
    expect(rules(found)).toEqual(["stepTree.parentRolesMissing"]);
    expect(found[0]?.file).toBe(".qfai/assistant/skill/qfai-demo/SKILL.md");
    expect(found[0]?.message).toContain("orchestrator, solution-architect");
  });

  it("accepts a parent whose roles: cover orchestrator and the roles of every listed step", async () => {
    await seedCleanTree();
    await writeStep("demo-one", {
      owner: "qfai-demo",
      requires: "[common-share]",
      roles: "[solution-architect]",
    });
    await writeParent(
      "qfai-demo",
      "[demo-one, common-share]",
      "[orchestrator, solution-architect]",
    );
    expect(await run()).toEqual([]);
  });
});

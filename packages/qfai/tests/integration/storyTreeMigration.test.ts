import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runStep } from "../../src/migration/specToStory/harness.js";

const roots: string[] = [];

async function sandbox(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-migration-"));
  roots.push(root);
  return root;
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

async function snapshot(root: string): Promise<string> {
  const entries: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      const absolute = path.join(directory, name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      const stats = await lstat(absolute);
      if (stats.isSymbolicLink()) {
        entries.push(`${relative}:link:${await readlink(absolute)}`);
      } else if (stats.isDirectory()) {
        entries.push(`${relative}:dir`);
        await visit(absolute);
      } else {
        entries.push(`${relative}:file:${(await readFile(absolute)).toString("base64")}`);
      }
    }
  }
  await visit(root);
  return entries.join("\n");
}

async function step(root: string, number: number, args: string[] = []) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runStep(number, args, {
    cwd: root,
    stdout: { write: (value) => stdout.push(value) },
    stderr: { write: (value) => stderr.push(value) },
  });
  return { code, stdout: stdout.join(""), stderr: stderr.join("") };
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("BF-0004 migration acceptance boundaries", () => {
  // QFAI:AC-0004-0003-01
  // QFAI:AC-0004-0003-07
  // QFAI:AC-0004-0004-02
  it("rejects an invalid invocation, previews without writes, archives a collision and reruns unchanged", async () => {
    const root = await sandbox();
    await put(
      root,
      "qfai.config.yaml",
      "paths:\n  specsDir: .qfai/specs\n  contractsDir: .qfai/contracts\n  skillsDir: .qfai/assistant/skills\n",
    );
    await put(root, ".qfai/specs/spec-0001/01_Spec.md", "old pack\n");
    await put(root, ".qfai/assistant/skills/qfai-sdd/SKILL.md", "old skill\n");
    await put(root, ".qfai/assistant/skill/qfai-sdd/SKILL.md", "current skill\n");
    await put(root, ".qfai/assistant/skills.local/house-style/SKILL.md", "house style\n");
    const original = await snapshot(root);

    const invalid = await step(root, 1, ["--force"]);
    expect(invalid.code).toBe(2);
    expect(invalid.stderr).toContain("--dry-run");
    expect(await snapshot(root)).toBe(original);

    const preview = await step(root, 1, ["--dry-run"]);
    expect(preview.code).toBe(0);
    expect(preview.stdout).toContain("## Operations");
    expect(preview.stdout).toContain("legacy/skills/qfai-sdd");
    expect(await snapshot(root)).toBe(original);

    const applied = await step(root, 1);
    expect(applied.code).toBe(0);
    expect(applied.stdout).toBe(preview.stdout);
    expect(await readFile(path.join(root, ".qfai/spec/spec-0001/01_Spec.md"), "utf8")).toBe(
      "old pack\n",
    );
    expect(await readFile(path.join(root, ".qfai/assistant/skill/qfai-sdd/SKILL.md"), "utf8")).toBe(
      "current skill\n",
    );
    expect(
      await readFile(
        path.join(root, ".qfai/evidence/migration-spec-to-story/legacy/skills/qfai-sdd/SKILL.md"),
        "utf8",
      ),
    ).toBe("old skill\n");
    expect(
      await readFile(path.join(root, ".qfai/assistant/skill.local/house-style/SKILL.md"), "utf8"),
    ).toBe("house style\n");
    await expect(lstat(path.join(root, ".qfai/specs"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(path.join(root, ".qfai/assistant/skills"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(lstat(path.join(root, ".qfai/assistant/skills.local"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    const migrated = await snapshot(root);
    const rerun = await step(root, 1);
    expect(rerun.code).toBe(0);
    expect(rerun.stdout).toContain("## Operations\nnone");
    expect(await snapshot(root)).toBe(migrated);
  });

  // QFAI:AC-0004-0003-01
  it("refuses a symlinked legacy source before changing either tree", async () => {
    const root = await sandbox();
    const external = await sandbox();
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/specs\n");
    await put(external, "spec-0001/01_Spec.md", "outside source\n");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await symlink(
      external,
      path.join(root, ".qfai/specs"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const before = await snapshot(root);
    const externalBefore = await snapshot(external);

    const refused = await step(root, 1);
    expect(refused.code).toBe(2);
    expect(refused.stderr).toMatch(/symbolic link/i);
    expect(await snapshot(root)).toBe(before);
    expect(await snapshot(external)).toBe(externalBefore);
  });

  it("keeps the first ID map and migrated story fixed when a later plan moves the story", async () => {
    const root = await sandbox();
    const evidence = ".qfai/evidence/migration-spec-to-story";
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
      "# Spec\n\n- Status: active\n\n## Scope\n\nAn order is placed from a cart.\n",
    );
    await put(
      root,
      ".qfai/spec/spec-0001/02_User-stories.md",
      "# Stories\n\n## US-0001-0001: Place an order\n\n- Goal: Place an order.\n",
    );
    await put(
      root,
      ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
      "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Place an order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
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
      "# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n",
    );
    await put(
      root,
      `${evidence}/plan.yaml`,
      "flows:\n  - title: Order flow\n    from: _policies/04_Business-Flow.md\n    stories:\n      - id: US-0001-0001\nrules: []\n",
    );

    const migrated = await step(root, 4);
    expect(migrated.code).toBe(0);
    const mapFile = path.join(root, evidence, "id-map.json");
    const idMap = await readFile(mapFile, "utf8");
    const parsed = JSON.parse(idMap) as { ids: Record<string, Record<string, string>> };
    expect(parsed.ids["spec-0001"]).toMatchObject({
      "US-0001-0001": "US-0001-0001",
      "AC-0001-0001": "AC-0001-0001-01",
    });
    expect(
      await readFile(
        path.join(
          root,
          ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
        ),
        "utf8",
      ),
    ).toContain("AC-0001-0001-01");
    const firstTree = await snapshot(root);
    const rerun = await step(root, 4);
    expect(rerun.code).toBe(0);
    expect(rerun.stdout).toContain("## Operations\nnone");
    expect(await snapshot(root)).toBe(firstTree);

    await put(
      root,
      `${evidence}/plan.yaml`,
      "flows:\n  - title: Different flow\n    from: _policies/04_Business-Flow.md\n    stories:\n      - id: US-0001-0001\nrules: []\n",
    );
    const beforeRefusal = await snapshot(root);
    const changedPlan = await step(root, 4);
    expect(changedPlan.code).toBe(2);
    expect(changedPlan.stderr).toContain("US-0001-0001");
    expect(await snapshot(root)).toBe(beforeRefusal);
    expect(await readFile(mapFile, "utf8")).toBe(idMap);
  });
});

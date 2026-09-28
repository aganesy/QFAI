/**
 * Integration: `qfai init` installs the workflow entry — the two entry skills and every step the
 * built-in plans name — through the existing asset copy. The built-in plans stay in the package
 * and are never written into the project.
 */
// QFAI:AC-0001-0203-01
// QFAI:EX-0001-0203-01
// QFAI:EX-0001-0203-02
// QFAI:EX-0001-0203-03
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

import { packagePlansDir, WORKFLOW_ROUTES } from "../../../src/core/workflow/plans.js";
import {
  ENTRY_SKILLS,
  HOST_SKILL_DIRS,
  SKILLS,
  initQuietly,
  withEmptyRepo,
  withInstall,
} from "./upgradeStates.js";

const PLANS = WORKFLOW_ROUTES.map((route) => `${route}.yml`);

/** The steps the packaged plans name, read from the plans themselves. */
async function planSteps(): Promise<string[]> {
  const names = new Set<string>();
  for (const plan of PLANS) {
    const parsed: unknown = parseYaml(await readFile(path.join(packagePlansDir(), plan), "utf-8"));
    const stages: unknown =
      typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "stages") : [];
    for (const stage of Array.isArray(stages) ? stages : []) {
      const steps: unknown =
        typeof stage === "object" && stage !== null ? Reflect.get(stage, "steps") : [];
      for (const entry of Array.isArray(steps) ? steps : []) {
        const name: unknown =
          typeof entry === "object" && entry !== null ? Reflect.get(entry, "step") : entry;
        if (typeof name === "string") names.add(name);
      }
    }
  }
  return [...names].sort();
}

async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
}

/** One digest per skill directory other than the entry skills. */
async function otherSkillDigests(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const name of (await readdir(path.join(root, SKILLS))).sort()) {
    if (ENTRY_SKILLS.includes(name)) continue;
    const hash = createHash("sha256");
    for (const file of await filesUnder(path.join(root, SKILLS, name))) {
      hash.update(file).update(await readFile(file));
    }
    out[name] = hash.digest("hex");
  }
  return out;
}

async function expectInstallSet(root: string): Promise<void> {
  for (const skill of ENTRY_SKILLS) {
    expect(existsSync(path.join(root, SKILLS, skill, "SKILL.md")), skill).toBe(true);
  }
  const steps = await planSteps();
  expect(steps.length, "the plans name steps").toBeGreaterThan(0);
  for (const step of steps) {
    const doc = path.join(root, ".qfai", "assistant", "step", step, "STEP.md");
    expect(existsSync(doc), `${step} is installed`).toBe(true);
  }
  const written = (await filesUnder(root)).map((file) => path.basename(file));
  expect(
    written.filter((name) => PLANS.includes(name)),
    "no plan is written",
  ).toEqual([]);
  const schemas = written.filter((name) => name.endsWith(".schema.json"));
  expect(schemas, "no workflow schema is written into the project").toEqual([]);
}

async function expectWrappersResolve(root: string): Promise<void> {
  for (const host of HOST_SKILL_DIRS) {
    for (const skill of ENTRY_SKILLS) {
      const wrapper = await realpath(path.join(root, host, skill));
      expect(wrapper, `${host}/${skill}`).toBe(await realpath(path.join(root, SKILLS, skill)));
    }
  }
}

describe("the workflow entry install set", () => {
  it("Fresh init installs the entry skills and every step the plans name", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      await expectInstallSet(root);
    });
  });

  it("Four host skill dirs resolve both entry skills to one source", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      await expectWrappersResolve(root);
    });
  });

  it("Upgrade over an install without the workflow entry", async () => {
    await withInstall(["absent-skills"], async (root) => {
      const before = await otherSkillDigests(root);
      await initQuietly(root);
      await expectInstallSet(root);
      await expectWrappersResolve(root);
      expect(await otherSkillDigests(root)).toEqual(before);
    });
  });
});

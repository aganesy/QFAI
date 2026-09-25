/**
 * Integration: `qfai init` installs the workflow entry — the two entry skills and each plan-named
 * stage skill's orchestrated-mode reference — through the existing asset copy. The built-in plans
 * stay in the package and are never written into the project.
 */
// QFAI:AC-0001-0203-01
// QFAI:EX-0001-0203-01
// QFAI:EX-0001-0203-02
// QFAI:EX-0001-0203-03
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { packagePlansDir } from "../../../src/core/workflow/plans.js";
import {
  ENTRY_SKILLS,
  HOST_SKILL_DIRS,
  SKILLS,
  initQuietly,
  withEmptyRepo,
  withInstall,
} from "./upgradeStates.js";

const PLANS = ["bounded-change.yml", "bugfix.yml", "direct.yml", "discovery.yml", "feature.yml"];

/** The skills the packaged plans name, read from the plans themselves. */
async function planSkills(): Promise<string[]> {
  const names = new Set<string>();
  for (const plan of PLANS) {
    const text = await readFile(path.join(packagePlansDir(), plan), "utf-8");
    for (const match of text.matchAll(/qfai-[a-z-]+/g)) names.add(match[0]);
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
  for (const skill of await planSkills()) {
    const reference = path.join(root, SKILLS, skill, "references", "orchestrated-mode.md");
    expect(existsSync(reference), `${skill} carries its orchestrated-mode reference`).toBe(true);
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
  it("Fresh init installs the entry skills and the orchestrated-mode references", async () => {
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

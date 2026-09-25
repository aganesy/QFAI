/**
 * Integration: `qfai init` installs the workflow entry — the two entry skills, the built-in plans
 * and each plan-named stage skill's orchestrated-mode reference — through the existing asset copy.
 */
// QFAI:SPEC-0003:TC-0003-0062
// QFAI:SPEC-0003:TC-0003-0063
// QFAI:SPEC-0003:TC-0003-0064
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { initQuietly, withEmptyRepo, withInstall } from "./upgradeStates.js";

const ENTRY_SKILLS = ["qfai-run", "qfai-maintain"];
const PLANS = ["bounded-change.yml", "bugfix.yml", "direct.yml", "discovery.yml", "feature.yml"];
const HOST_SKILL_DIRS = [".agents/skills", ".claude/skills", ".codex/skills", ".github/skills"];
const SKILLS = ".qfai/assistant/skills";
const WORKFLOWS = ".qfai/assistant/process/workflows";

/** The skills the installed plans name, read from the plans themselves. */
async function planSkills(root: string): Promise<string[]> {
  const names = new Set<string>();
  for (const plan of PLANS) {
    const text = await readFile(path.join(root, WORKFLOWS, plan), "utf-8");
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
  expect((await readdir(path.join(root, WORKFLOWS))).sort()).toEqual(PLANS);
  for (const skill of await planSkills(root)) {
    const reference = path.join(root, SKILLS, skill, "references", "orchestrated-mode.md");
    expect(existsSync(reference), `${skill} carries its orchestrated-mode reference`).toBe(true);
  }
  const schemas = (await filesUnder(root)).filter((file) => file.endsWith(".schema.json"));
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
  it("TC-0003-0062: Fresh init installs the entry skills, plans and references", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      await expectInstallSet(root);
    });
  });

  it("TC-0003-0063: Four host skill dirs resolve both entry skills to one source", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      await expectWrappersResolve(root);
    });
  });

  it("TC-0003-0064: Upgrade over an install without the workflow entry", async () => {
    await withInstall(["absent-skills"], async (root) => {
      const before = await otherSkillDigests(root);
      await initQuietly(root);
      await expectInstallSet(root);
      await expectWrappersResolve(root);
      expect(await otherSkillDigests(root)).toEqual(before);
    });
  });
});

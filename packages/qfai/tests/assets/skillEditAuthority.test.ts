/**
 * A skill that says "update" needs `Edit`.
 *
 * `qfai init` publishes each shipped skill as a symlink into
 * `.qfai/assistant/skills/<id>/`, so the frontmatter in the body below is the
 * frontmatter the tool actually reads — `allowed-tools` is live, not
 * decorative. `/qfai-atdd` mandated "Create and update:
 * `.qfai/evidence/atdd-<spec-id>.md`" while granting only `Write`, which turns
 * every append onto a multi-hundred-line evidence file into a whole-file
 * rewrite reproduced from context. That file is also the hash subject of the
 * stage review, so a lossy rewrite moves a hash a reviewer already recorded
 * and nothing downstream can tell it from a legitimate edit.
 *
 * These tests pin the rule for every shipped skill: if the body mandates
 * creating *and updating* an artifact, the frontmatter must grant `Edit`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

/** The phrase a skill uses when it owns an artifact across sessions. */
const UPDATE_MANDATE = /Create and update/i;

interface SkillFrontmatter {
  readonly id: string;
  readonly allowedTools: readonly string[];
  readonly body: string;
}

const parseAllowedTools = (source: string, file: string): readonly string[] => {
  // The capture group is read through a narrowing check rather than
  // `match !== null` alone: under `noUncheckedIndexedAccess` the group is
  // `string | undefined`, so a null match and a regex whose shape changed
  // out from under this reader both land on the same explicit throw.
  const inner = /^allowed-tools:\s*\[([^\]]*)\]\s*$/m.exec(source)?.[1];
  if (inner === undefined) {
    throw new Error(`${file}: no inline 'allowed-tools: [...]' frontmatter entry`);
  }
  return inner
    .split(",")
    .map((tool) => tool.trim())
    .filter((tool) => tool.length > 0);
};

const loadSkills = async (tree: string): Promise<readonly SkillFrontmatter[]> => {
  const skillsDir = path.join(repoRoot, tree, "assistant", "skills");
  const files = await fg(["*/SKILL.md"], { cwd: skillsDir, absolute: false });
  files.sort();
  const skills: SkillFrontmatter[] = [];
  for (const relative of files) {
    const body = await readFile(path.join(skillsDir, relative), "utf-8");
    skills.push({
      id: path.dirname(relative),
      allowedTools: parseAllowedTools(body, relative),
      body,
    });
  }
  if (skills.length === 0) {
    throw new Error(`${tree}: no shipped SKILL.md found`);
  }
  return skills;
};

describe.each(TREES)("%s", (tree) => {
  it("grants /qfai-atdd the Edit tool its evidence file requires", async () => {
    const skills = await loadSkills(tree);
    const atdd = skills.find((skill) => skill.id === "qfai-atdd");
    expect(atdd).toBeDefined();
    if (atdd === undefined) return;
    expect(atdd.allowedTools).toContain("Edit");
    // The append target that made the omission load-bearing.
    expect(atdd.body).toContain("Create and update: `.qfai/evidence/atdd-<spec-id>.md`");
    // Edit is an addition, not a swap: whole-file authoring is still needed
    // for the first write of each evidence file.
    expect(atdd.allowedTools).toContain("Write");
    expect(atdd.allowedTools).toContain("Read");
  });

  it("grants Edit to every skill whose body mandates updating an artifact", async () => {
    const skills = await loadSkills(tree);
    const mandating = skills.filter((skill) => UPDATE_MANDATE.test(skill.body));
    // Guards the predicate itself: if the phrase is reworded away, this test
    // would otherwise pass vacuously.
    expect(mandating.map((skill) => skill.id)).toEqual([
      "qfai-atdd",
      "qfai-configure",
      "qfai-verify",
    ]);
    const missing = mandating
      .filter((skill) => !skill.allowedTools.includes("Edit"))
      .map((skill) => skill.id);
    expect(missing).toEqual([]);
  });

  it("keeps every allowed-tools list free of duplicates", async () => {
    const skills = await loadSkills(tree);
    for (const skill of skills) {
      expect(new Set(skill.allowedTools).size).toBe(skill.allowedTools.length);
    }
  });
});

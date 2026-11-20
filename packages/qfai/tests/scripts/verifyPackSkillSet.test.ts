/**
 * The packed-artifact gate checks every skill the source tree ships.
 *
 * `verify-pack` used to hold a hand-written list of eight skills that left out
 * the free-text entry `qfai-run` and `qfai-maintain`. A skill missing from that
 * list was never looked for in the tarball, the install or the host wrappers,
 * so the pack could drop it and the gate stayed green. The set now comes from
 * the source skill directories, by the same rule init links skills with.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { PRIMARY_SKILL_ID, sourceSkillIds } from "../../../../scripts/lib/pack-skill-set.mjs";
import { collectCanonicalSkillIds } from "../../src/core/init/integrationDirs.js";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistantAssets = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
);
const sourceSkillRoot = path.join(assistantAssets, "skill");

const scratch: string[] = [];
afterEach(async () => {
  for (const dir of scratch.splice(0)) await rm(dir, { recursive: true, force: true });
});

async function skillTree(layout: Record<string, boolean>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-pack-skill-set-"));
  scratch.push(root);
  for (const [id, hasSkillDoc] of Object.entries(layout)) {
    await mkdir(path.join(root, id), { recursive: true });
    if (hasSkillDoc) await writeFile(path.join(root, id, "SKILL.md"), `# ${id}\n`);
  }
  return root;
}

describe("the skill set verify-pack checks", () => {
  it("includes the free-text entry and the maintenance skill", () => {
    const ids = sourceSkillIds(sourceSkillRoot);

    expect(ids).toContain(PRIMARY_SKILL_ID);
    expect(ids).toContain("qfai-maintain");
  });

  it("is the set init links into the host directories", async () => {
    expect(sourceSkillIds(sourceSkillRoot)).toEqual(
      await collectCanonicalSkillIds(assistantAssets),
    );
  });

  it("counts only directories that hold a SKILL.md", async () => {
    const root = await skillTree({ "qfai-run": true, "qfai-zeta": true, "not-a-skill": false });
    await writeFile(path.join(root, "README.md"), "stray file\n");

    expect(sourceSkillIds(root)).toEqual(["qfai-run", "qfai-zeta"]);
  });

  it("stops when the source tree has no free-text entry", async () => {
    const root = await skillTree({ "qfai-sdd": true });

    expect(() => sourceSkillIds(root)).toThrow(/qfai-run\/SKILL\.md/);
  });

  it("is what the script iterates, not a literal list", async () => {
    const text = await readFile(path.join(repoRoot, "scripts", "verify-pack.mjs"), "utf-8");

    expect(text).toContain('from "./lib/pack-skill-set.mjs"');
    expect(text).toMatch(/const requiredSkills = sourceSkillIds\(/);
  });
});

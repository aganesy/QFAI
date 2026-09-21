/**
 * The `pr-merge` skill document, held identical across the four trees that carry
 * it, and holding the values its prose promises.
 *
 * Its own file because of where it has to run. A change touching only prose
 * under `.agents/`, `.claude/`, `.codex/` or `.instruction/` classifies as
 * documentation-only and skips the test job, so the lint lane is the only place
 * a guard over those trees still runs. The lane therefore carries every test
 * whose subject is one of them.
 *
 * The rest of the `pr-merge` coverage lives in `../pr-merge/prMergePlan.test.ts`,
 * spawns a PowerShell process per case, and reads nothing from those trees but
 * the script and the body policy it dot-sources — executables, which the
 * classifier already keeps out of the documentation-only set. Running that file
 * in the lint lane to reach prose assertions it does not make cost the lane
 * several hundred seconds and guarded nothing a prose change could break.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const claudeSkillPath = path.join(repoRoot, ".claude", "skills", "pr-merge", "SKILL.md");
const agentsSkillPath = path.join(repoRoot, ".agents", "skills", "pr-merge", "SKILL.md");
const codexSkillPath = path.join(repoRoot, ".codex", "skills", "pr-merge", "SKILL.md");
const githubSkillPath = path.join(repoRoot, ".github", "skills", "pr-merge", "SKILL.md");

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

describe("pr-merge wrapper docs", () => {
  it("keeps pr-merge skill docs aligned across integrations", async () => {
    const [claudeSkill, agentsSkill, codexSkill, githubSkill] = await Promise.all([
      readFile(claudeSkillPath, "utf-8"),
      readFile(agentsSkillPath, "utf-8"),
      readFile(codexSkillPath, "utf-8"),
      readFile(githubSkillPath, "utf-8"),
    ]);

    expect(normalizeNewlines(claudeSkill)).toBe(normalizeNewlines(agentsSkill));
    expect(normalizeNewlines(codexSkill)).toBe(normalizeNewlines(agentsSkill));
    expect(normalizeNewlines(agentsSkill)).toBe(normalizeNewlines(githubSkill));

    // The values an operator acts on. Each is a promise the prose makes about
    // what the script does, so prose that stops making it misdescribes the
    // command the reader is about to run.
    expect(agentsSkill).toContain("It never creates or pushes a tag.");
    expect(agentsSkill).toContain("It does not tag.");
    expect(agentsSkill).toContain("Always start with a dry run.");
    expect(agentsSkill).toContain("-MergeMethod merge|squash|rebase");
    expect(agentsSkill).toContain("default is `merge`.");
    expect(agentsSkill).toContain("tmp/pr-merge/pr-<PR number>-merge-plan.json");
    expect(agentsSkill).toContain("The live PR body lacks an authored removal-list answer.");
  });
});

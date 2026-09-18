/**
 * The `pr-fix` skill document, held identical across the four trees that carry
 * it, and holding the values its prose promises.
 *
 * Its own file because of where it has to run. A change touching only prose
 * under `.agents/`, `.claude/`, `.codex/` or `.instruction/` classifies as
 * documentation-only and skips the test job, so the lint lane is the only place
 * a guard over those trees still runs. The lane therefore carries every test
 * whose subject is one of them.
 *
 * The rest of the `pr-fix` coverage lives in `../pr-fix/prFixMonitor.test.ts`, spawns a
 * PowerShell process per case, and reads nothing from those trees but the script
 * itself — an executable, which the classifier already keeps out of the
 * documentation-only set. Running that file in the lint lane to reach the one
 * assertion below cost the lane several hundred seconds and guarded nothing a
 * prose change could break.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const claudeSkillPath = path.join(repoRoot, ".claude", "skills", "pr-fix", "SKILL.md");
const agentsSkillPath = path.join(repoRoot, ".agents", "skills", "pr-fix", "SKILL.md");
const codexSkillPath = path.join(repoRoot, ".codex", "skills", "pr-fix", "SKILL.md");
const githubSkillPath = path.join(repoRoot, ".github", "skills", "pr-fix", "SKILL.md");

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

describe("pr-fix wrapper docs", () => {
  it("keeps pr-fix skill docs aligned across integrations", async () => {
    const [claudeSkill, agentsSkill, codexSkill, githubSkill] = await Promise.all([
      readFile(claudeSkillPath, "utf-8"),
      readFile(agentsSkillPath, "utf-8"),
      readFile(codexSkillPath, "utf-8"),
      readFile(githubSkillPath, "utf-8"),
    ]);

    expect(normalizeNewlines(claudeSkill)).toBe(normalizeNewlines(agentsSkill));
    expect(normalizeNewlines(codexSkill)).toBe(normalizeNewlines(agentsSkill));
    expect(normalizeNewlines(agentsSkill)).toBe(normalizeNewlines(githubSkill));
    expect(agentsSkill).toContain("`-SleepSeconds` の既定値は `60`");
    expect(agentsSkill).toContain("`-RequiredZeroStreak` の既定値は `30`");
    expect(agentsSkill).toContain("live 監視モード（`-DryRun` なし）");
    expect(agentsSkill).toContain("`tmp/pr-fix/`");
    expect(agentsSkill).toContain("`^.+/v(\\d+\\.\\d+\\.\\d+)(?:[-_].*)?$`");
  });
});

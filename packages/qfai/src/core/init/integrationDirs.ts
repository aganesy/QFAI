import { readdir } from "node:fs/promises";
import path from "node:path";

import { exists } from "./fsGuards.js";

export const SKILL_INTEGRATION_DIRS = [
  ".claude/skills",
  ".agents/skills",
  ".codex/skills",
  ".github/skills",
];

export const AGENT_INTEGRATION_CONFIGS: Array<{ dir: string; suffix: string }> = [
  { dir: ".claude/agents", suffix: ".md" },
  { dir: ".github/agents", suffix: ".agent.md" },
];

/**
 * The skills an install carries: a directory under `skills/` holding a
 * `SKILL.md`. Exported because a name prefix looks like the same list and is
 * not — a suite that reads the tree its own way answers a slightly different
 * question than the installer does, and the gap shows up as a shipped skill
 * nothing checks.
 */
export async function collectCanonicalSkillIds(assistantAssetsDir: string): Promise<string[]> {
  const skillsDir = path.join(assistantAssetsDir, "skill");
  if (!(await exists(skillsDir))) {
    return [];
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillDoc = path.join(skillsDir, entry.name, "SKILL.md");
    if (await exists(skillDoc)) {
      skills.push(entry.name);
    }
  }

  return skills.sort();
}

export async function collectCanonicalAgentNames(assistantAssetsDir: string): Promise<string[]> {
  const agentsDir = path.join(assistantAssetsDir, "agent");
  if (!(await exists(agentsDir))) {
    return [];
  }

  const entries = await readdir(agentsDir, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".md") || entry.name === "README.md") {
      continue;
    }
    names.push(entry.name.slice(0, -".md".length));
  }

  return names.sort();
}

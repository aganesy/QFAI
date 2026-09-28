import { mkdir, readdir, symlink } from "node:fs/promises";
import path from "node:path";

import {
  AGENT_INTEGRATION_CONFIGS,
  SKILL_INTEGRATION_DIRS,
  collectCanonicalSkillIds,
} from "../../src/cli/commands/init.js";

/**
 * Writes the host links a project initialised before the migration carries:
 * one per skill and agent in its assistant tree, each naming the plural
 * directory (`skills/`, `agents/`) that the migration renames.
 *
 * Returns the links written, repository-relative with `/`.
 */
export async function seedOldHostLinks(root: string): Promise<string[]> {
  const assistant = path.join(root, ".qfai", "assistant");
  const skills = await collectCanonicalSkillIds(assistant);
  const agents = (await readdir(path.join(assistant, "agent"), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => entry.name.slice(0, -".md".length))
    .sort();
  const written: string[] = [];
  const link = async (dir: string, name: string, target: string, type: "dir" | "file") => {
    const host = path.join(root, ...dir.split("/"));
    await mkdir(host, { recursive: true });
    await symlink(path.relative(host, target), path.join(host, name), type);
    written.push(`${dir}/${name}`);
  };
  for (const dir of SKILL_INTEGRATION_DIRS) {
    for (const skill of skills) {
      await link(dir, skill, path.join(assistant, "skills", skill), "dir");
    }
  }
  for (const { dir, suffix } of AGENT_INTEGRATION_CONFIGS) {
    for (const agent of agents) {
      await link(dir, `${agent}${suffix}`, path.join(assistant, "agents", `${agent}.md`), "file");
    }
  }
  return written;
}

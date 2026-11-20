import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/** The free-text entry every install must carry. */
export const PRIMARY_SKILL_ID = "qfai-run";

/**
 * The skills an install must carry, read from the source skill tree.
 *
 * A skill is a directory under `skillRoot` holding a `SKILL.md`, the same rule
 * init uses when it links skills into the host directories. Reading the set
 * from the source rather than from a list in the gate means a skill the pack
 * drops still counts as expected, so the archive, install and wrapper checks
 * notice it is gone.
 *
 * @param {string} skillRoot the source `assets/init/.qfai/assistant/skill` directory
 * @returns {string[]} skill ids, sorted
 */
export function sourceSkillIds(skillRoot) {
  if (!existsSync(skillRoot)) {
    throw new Error(`The source skill directory ${skillRoot} does not exist.`);
  }
  const ids = readdirSync(skillRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => existsSync(path.join(skillRoot, id, "SKILL.md")))
    .sort();
  if (!ids.includes(PRIMARY_SKILL_ID)) {
    throw new Error(
      `The source skill directory ${skillRoot} has no ${PRIMARY_SKILL_ID}/SKILL.md, the free-text entry every install carries.`,
    );
  }
  return ids;
}

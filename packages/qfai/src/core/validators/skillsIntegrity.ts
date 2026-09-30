import path from "node:path";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { diffProjectSkillsAgainstInitAssets } from "../skillsIntegrity.js";

/**
 * The skills directory as the finding should name it: repo-relative when it
 * sits under the project, absolute when `paths.skillsDir` points outside it.
 * The diff is taken against whatever that setting resolves to, so naming the
 * default location instead would send a project that moved its skills tree to
 * repair a directory it does not use.
 */
function describeSkillsDir(root: string, skillsDir: string): string {
  const relative = path.relative(root, skillsDir).replace(/\\/g, "/");
  return relative.length > 0 && !relative.startsWith("..") ? relative : skillsDir;
}

export async function validateSkillsIntegrity(root: string, config: QfaiConfig): Promise<Issue[]> {
  const diff = await diffProjectSkillsAgainstInitAssets(root, config);
  if (diff.status !== "modified") {
    return [];
  }

  const total = diff.missing.length + diff.extra.length + diff.changed.length;
  const hints = [
    diff.changed.length > 0 ? `changed: ${diff.changed.length}` : null,
    diff.missing.length > 0 ? `deleted: ${diff.missing.length}` : null,
    diff.extra.length > 0 ? `added: ${diff.extra.length}` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  const sample = [...diff.changed, ...diff.missing, ...diff.extra].slice(0, 10);
  const sampleText = sample.length > 0 ? ` Examples: ${sample.join(", ")}` : "";
  const skillsDir = describeSkillsDir(root, diff.skillsDir);

  return [
    {
      code: "QFAI-SKILLS-001",
      severity: "error",
      category: "change",
      file: skillsDir,
      message: `Standard asset '${skillsDir}/**' has been modified (${hints || `diff=${total}`}).${sampleText}`,
      suggested_action: [
        "Editing skills directly is discouraged (an update or a re-run of init may overwrite the edits).",
        "To restore the standard state, run 'qfai init --force'.",
      ].join("\n"),
      rule: "skills.integrity",
    },
  ];
}

import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

// Paths that are legacy / non-canonical after the assistant-layer recut.
// Any SKILL.md text that references these is flagged as broken.
const NON_CANONICAL_REFS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\.qfai\/assistant\/steering\/agent-routing\.yml/,
    reason: "agent-routing.yml has moved to .qfai/assistant/manifest/agent-routing.yml.",
  },
  {
    pattern: /\.qfai\/assistant\/steering\/agent-catalog\.yml/,
    reason: "agent-catalog.yml has moved to .qfai/assistant/manifest/agent-catalog.yml.",
  },
  {
    pattern: /\.qfai\/assistant\/steering\/review-profiles\.yml/,
    reason: "review-profiles.yml has moved to .qfai/assistant/manifest/review-profiles.yml.",
  },
  {
    pattern: /\.qfai\/assistant\/steering\/test-layers\.md/,
    reason: "test-layers.md has moved to .qfai/assistant/catalog/test-layers.md.",
  },
];

// Skills required to declare a `project_memory:` block to surface their
// remembered-context invariants. The block is optional for now, so the
// validator emits a warning (not an error) when missing.
const PROJECT_MEMORY_REQUIRED_SKILLS = new Set([
  "qfai-implement",
  "qfai-sdd",
  "qfai-atdd",
  "qfai-discussion",
  "qfai-prototyping",
  "qfai-verify",
]);

export async function validateSkillDocReferences(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const skillsDir = path.join(root, ".qfai", "assistant", "skills");
  if (!(await exists(skillsDir))) return issues;

  let entries: Dirent[];
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch (err: unknown) {
    if (isEnoent(err)) return issues;
    throw err;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillId = entry.name;
    const skillDoc = path.join(skillsDir, skillId, "SKILL.md");
    let body: string;
    try {
      body = await readFile(skillDoc, "utf-8");
    } catch (err: unknown) {
      if (isEnoent(err)) continue;
      throw err;
    }

    // W-SKILL-DOC-BROKEN-REF
    for (const ref of NON_CANONICAL_REFS) {
      if (ref.pattern.test(body)) {
        issues.push(
          issue(
            "W-SKILL-DOC-BROKEN-REF",
            `${skillId}/SKILL.md references a non-canonical path (post-recut). ${ref.reason}`,
            "warning",
            `.qfai/assistant/skills/${skillId}/SKILL.md`,
            "skillDocReferences.brokenRef",
          ),
        );
      }
    }

    // project_memory enforcement (warning-only — opt-in convention).
    if (PROJECT_MEMORY_REQUIRED_SKILLS.has(skillId)) {
      const trailing = body.slice(-2_000);
      if (!/^\s*project_memory\s*:/m.test(trailing)) {
        issues.push(
          issue(
            "W-WORKLOG-SCHEMA",
            `${skillId}/SKILL.md is missing a trailing project_memory: block. Skills that participate in the work-log surface MUST declare project_memory to enumerate their remembered context.`,
            "warning",
            `.qfai/assistant/skills/${skillId}/SKILL.md`,
            "skillDocReferences.projectMemory",
          ),
        );
      }
    }
  }

  return issues;
}

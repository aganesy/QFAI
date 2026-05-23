import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { resolveToolVersion } from "../version.js";
import { LEGACY_STEERING_SUNSET } from "../paths/assistantPaths.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

/**
 * Severity escalates to `error` once the running tool reaches or passes
 * the LEGACY_STEERING_SUNSET minor. SSOT shared with the
 * assistantTreeMigration validator so both surfaces flip at the same
 * cutoff. Per qfai-validate.md contract: "warning (during window) /
 * error (after sunset)".
 */
function brokenRefSeverity(version: string): "warning" | "error" {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!m) return "warning";
  const major = Number.parseInt(m[1] ?? "0", 10);
  const minor = Number.parseInt(m[2] ?? "0", 10);
  if (major > LEGACY_STEERING_SUNSET.major) return "error";
  if (major === LEGACY_STEERING_SUNSET.major && minor >= LEGACY_STEERING_SUNSET.minor) {
    return "error";
  }
  return "warning";
}

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

// Every `qfai-*` skill MUST declare a trailing `project_memory:` block.
// The block surfaces remembered-context invariants the skill expects
// downstream agents to honor. The validator emits a warning when
// missing (severity intentionally kept at warning for now to avoid
// breaking projects mid-migration; will escalate to error once the
// seeded asset templates uniformly carry the block).
const QFAI_SKILL_ID_RE = /^qfai-/;

export async function validateSkillDocReferences(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const skillsDir = path.join(root, ".qfai", "assistant", "skills");
  if (!(await exists(skillsDir))) return issues;

  // Resolve current tool version once so broken-ref severity escalates
  // consistently across every skill scanned in this pass.
  const toolVersion = await resolveToolVersion();
  const refSeverity = brokenRefSeverity(toolVersion);

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

    // W-SKILL-DOC-BROKEN-REF — scoped to qfai-* skills per contract.
    // User-defined non-qfai-* skills under .qfai/assistant/skills/ are
    // intentionally NOT flagged so consumers can author their own
    // SKILL.md without colliding with QFAI's path-migration finding.
    // Severity escalates from warning to error at LEGACY_STEERING_SUNSET
    // (matches qfai-validate.md contract).
    if (QFAI_SKILL_ID_RE.test(skillId)) {
      for (const ref of NON_CANONICAL_REFS) {
        if (ref.pattern.test(body)) {
          issues.push(
            issue(
              "W-SKILL-DOC-BROKEN-REF",
              `${skillId}/SKILL.md references a non-canonical path (post-recut). ${ref.reason}`,
              refSeverity,
              `.qfai/assistant/skills/${skillId}/SKILL.md`,
              "skillDocReferences.brokenRef",
            ),
          );
        }
      }
    }

    // project_memory enforcement (warning-only — opt-in convention).
    if (QFAI_SKILL_ID_RE.test(skillId)) {
      const trailing = body.slice(-2_000);
      if (!/^\s*project_memory\s*:/m.test(trailing)) {
        // Distinct code — `W-WORKLOG-SCHEMA` is reserved by contract
        // for worklog-entry frontmatter shape problems. The
        // SKILL.md project_memory enforcement is a separate concern.
        issues.push(
          issue(
            "W-SKILL-PROJECT-MEMORY",
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

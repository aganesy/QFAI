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
export function brokenRefSeverity(version: string): "warning" | "error" {
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
          const headline =
            refSeverity === "error"
              ? `${skillId}/SKILL.md references a non-canonical path (post-recut) past the announced sunset (v${LEGACY_STEERING_SUNSET.major}.${LEGACY_STEERING_SUNSET.minor}.0). Migrate the reference to fix.`
              : `${skillId}/SKILL.md references a non-canonical path (post-recut). Read-compatible only for the current minor release; sunset: v${LEGACY_STEERING_SUNSET.major}.${LEGACY_STEERING_SUNSET.minor}.0.`;
          issues.push(
            issue(
              "W-SKILL-DOC-BROKEN-REF",
              `${headline} ${ref.reason}`,
              refSeverity,
              `.qfai/assistant/skills/${skillId}/SKILL.md`,
              "skillDocReferences.brokenRef",
            ),
          );
        }
      }
    }

    // project_memory enforcement (warning-only — opt-in convention).
    // The block MUST be the trailing structure of the SKILL.md so the
    // remembered-context declaration is the last thing the loader
    // reads. Mid-file `project_memory:` lines followed by other
    // sections are NOT compliant.
    //
    // Algorithm:
    //   1. Walk the full body line-by-line and remember the LAST
    //      occurrence of `^\s*project_memory\s*:`. Using the last
    //      occurrence avoids false-positives where the SKILL.md
    //      prose merely mentions `project_memory:` earlier in the
    //      doc and the real declaration block sits at the tail.
    //   2. Walk every line after that last occurrence. Allow:
    //        - blank lines
    //        - top-level list items (`-`)
    //        - **top-level** HTML comments (`<!--` at column 0;
    //          indented `  <!--` falls through to the indented-line
    //          check and is rejected unless it also matches one of
    //          the YAML-syntactic patterns below)
    //        - indented YAML-syntactic continuation lines — narrowed
    //          to TWO specific shapes:
    //            * `^\s*-` indented list item (`  - foo`)
    //            * `^\s+[A-Za-z_][\w-]*\s*:` indented mapping key
    //              (`  scope:`, `  notes:`, `    sub_key:`)
    //          Any other indented content (e.g. indented prose
    //          paragraph, indented standalone value, indented HTML
    //          comment) is rejected so the trailing block does not
    //          silently absorb non-YAML text per BR-0004-0022.
    //      Reject:
    //        - any line starting with `#` (markdown heading) — the
    //          strongest "not trailing" signal
    //        - any other non-blank, top-level text (arbitrary prose
    //          after the block also disqualifies)
    if (QFAI_SKILL_ID_RE.test(skillId)) {
      const lines = body.split(/\r?\n/);
      const declRe = /^\s*project_memory\s*:/;
      let lastDeclIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line !== undefined && declRe.test(line)) lastDeclIdx = i;
      }
      const isTrailing = (() => {
        if (lastDeclIdx === -1) return false;
        // YAML-syntactic indented-continuation patterns:
        //   - `^\s*-` indented list item (`  - foo`, `\t- bar`)
        //   - `^\s+[A-Za-z_][\w-]*\s*:` indented mapping key
        //     (`  scope:`, `  notes:`, `    sub_key:`)
        // Anything else with leading whitespace (e.g. indented prose
        // paragraph) is rejected so the block doesn't accidentally
        // absorb non-YAML content following it.
        const indentedListRe = /^\s*-/;
        const indentedMappingKeyRe = /^\s+[A-Za-z_][\w-]*\s*:/;
        for (let i = lastDeclIdx + 1; i < lines.length; i++) {
          const line = lines[i] ?? "";
          if (line.trim() === "") continue;
          if (line.startsWith("<!--")) continue;
          if (line.startsWith("#")) return false;
          if (line.startsWith(" ") || line.startsWith("\t")) {
            if (indentedListRe.test(line)) continue;
            if (indentedMappingKeyRe.test(line)) continue;
            // Indented but not a YAML structural line → reject.
            return false;
          }
          if (line.startsWith("-")) continue; // top-level list (legacy form)
          // Any other non-blank top-level line means the block isn't trailing.
          return false;
        }
        return true;
      })();
      if (!isTrailing) {
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

import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

// A `qfai-*` skill MAY end with a `project_memory:` block: the
// remembered-context invariants that skill expects downstream agents to
// honor. The block is the skill's own, and no baseline states one for every
// skill, so a skill with nothing to remember carries none. A declared block
// that is not the last thing in the file is warned about.
const QFAI_SKILL_ID_RE = /^qfai-/;

export async function validateSkillDocReferences(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  // Honor `config.paths.skillsDir` via the canonical resolvePath
  // helper so a project that relocates its skills tree (relative
  // OR absolute) is still scanned. Pre-fix the validator hardcoded
  // `.qfai/assistant/skill` and silently SKIPped every qfai-* SKILL
  // file under the actual configured location — letting
  // QFAI-SKILLDOC-001 drift go
  // unreported. The fix mirrors the sister validators
  // `staleReferences.ts` and `autopilotPolicy.ts`.
  const skillsDir = resolvePath(root, config, "skillsDir");
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
    // Operator-facing relPath derived from the actual scan path so
    // relocated skillsDir surfaces under its real (root-relative or
    // absolute) location — not a hardcoded default skill directory.
    // legacy.
    const skillDocRelPath = path.relative(root, skillDoc).replace(/\\/g, "/");
    let body: string;
    try {
      body = await readFile(skillDoc, "utf-8");
    } catch (err: unknown) {
      if (isEnoent(err)) continue;
      throw err;
    }

    // project_memory shape (warning-only — opt-in convention).
    // A declared block MUST be the trailing structure of the SKILL.md so
    // the remembered-context declaration is the last thing the loader
    // reads. Mid-file `project_memory:` lines followed by other
    // sections are NOT compliant. A SKILL.md that declares no block is.
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
    //            * `^\s+-` indented list item (`  - foo`)
    //            * `^\s+[A-Za-z_][\w-]*\s*:` indented mapping key
    //              (`  scope:`, `  notes:`, `    sub_key:`)
    //          Any other indented content (e.g. indented prose
    //          paragraph, indented standalone value, indented HTML
    //          comment) is rejected so the trailing block does not
    //          silently absorb non-YAML text under the YAML block rule.
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
        // YAML-syntactic indented-continuation patterns. Both
        // regexes use `\s+` (one-or-more) to make the indent
        // requirement explicit and symmetric:
        //   - `^\s+-` indented list item (`  - foo`, `\t- bar`)
        //   - `^\s+[A-Za-z_][\w-]*\s*:` indented mapping key
        //     (`  scope:`, `  notes:`, `    sub_key:`)
        // Anything else with leading whitespace (e.g. indented prose
        // paragraph) is rejected so the block doesn't accidentally
        // absorb non-YAML content following it.
        const indentedListRe = /^\s+-/;
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
      if (lastDeclIdx !== -1 && !isTrailing) {
        issues.push(
          issue(
            "QFAI-SKILLDOC-001",
            `${skillId}/SKILL.md declares a project_memory: block that is not the last thing in the file. Move the block to the end, or remove it if the skill has nothing to remember.`,
            "warning",
            skillDocRelPath,
            "skillDocReferences.projectMemory",
          ),
        );
      }
    }
  }

  return issues;
}

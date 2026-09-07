/**
 * Reviewer-Gate finding `R-AUTOPILOT-POLICY-MISSING` (severity error).
 *
 * Every qfai-* SKILL.md MUST carry a `## Default Autopilot Policy`
 * section listing three named buckets per the spec governance contract:
 *   - auto-decide (output formatting / ID / sequence numbering /
 *     append-vs-create on subject overlap / equivalent-option pick)
 *   - ask-user (the decisions the skill stops and prompts on)
 *   - hard-required (the inputs the skill cannot proceed without)
 *
 * A SKILL.md MAY narrow ANY of the three buckets — dropping an entry
 * the skill cannot reach — but MUST NOT widen one. Only auto-decide
 * widening is machine-detectable (the canonical entry set is closed);
 * it surfaces a warning-level `R-AUTOPILOT-POLICY-WIDENED` flag. The
 * other two buckets carry per-skill entries, so their contract is
 * enforced by review.
 *
 * Scoping: only `qfai-*` skills under `.qfai/assistant/skills/` are
 * checked. User-authored non-qfai-* skills are intentionally exempt
 * (mirrors `validateSkillDocReferences` scoping).
 */
import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

const SKILL_DIR_REL = path.join(".qfai", "assistant", "skills");
const QFAI_SKILL_ID_RE = /^qfai-/;
const SECTION_HEADING_RE = /^##\s+Default Autopilot Policy\s*$/im;

/**
 * Canonical token set for the auto-decide bucket. A SKILL.md whose
 * auto-decide bullets contain ONLY entries that match any of these
 * stable substrings is compliant (narrowing is allowed). Adding
 * bullets that don't match any allowed token = widening, which is
 * flagged.
 *
 * The matching is case-insensitive on a stable substring; intentional
 * for resilience against minor wording variations (e.g. "ID/sequence
 * numbering" vs "ID / sequence numbering").
 */
export const AUTO_DECIDE_ALLOWED_TOKENS: readonly string[] = [
  "output formatting",
  "ID / sequence numbering",
  "append-vs-create on subject overlap",
  "equivalent-option pick",
];

const BUCKET_HEADERS = {
  autoDecide: /^\s*[-*]\s*auto-decide\s*:/im,
  askUser: /^\s*[-*]\s*ask-user\s*:/im,
  hardRequired: /^\s*[-*]\s*hard-required\s*:/im,
} as const;

export type AutopilotPolicyParseResult = {
  /** True when `## Default Autopilot Policy` heading is present. */
  hasSection: boolean;
  /** Per-bucket presence flags. */
  buckets: {
    autoDecide: boolean;
    askUser: boolean;
    hardRequired: boolean;
  };
  /** Auto-decide entries that DON'T match an allowed token (widening). */
  widenedTokens: string[];
};

/**
 * Pure-function parser. Extracts the `## Default Autopilot Policy`
 * block (until the next `## ` heading or EOF), then scans the block for
 * the three bucket headers. The auto-decide widening check enumerates
 * the bullets nested under the `auto-decide:` line and flags any
 * bullet whose text does not contain any of `AUTO_DECIDE_ALLOWED_TOKENS`.
 */
export function parseAutopilotPolicy(content: string): AutopilotPolicyParseResult {
  const headingMatch = SECTION_HEADING_RE.exec(content);
  if (!headingMatch) {
    return {
      hasSection: false,
      buckets: { autoDecide: false, askUser: false, hardRequired: false },
      widenedTokens: [],
    };
  }
  const startIdx = headingMatch.index + headingMatch[0].length;
  // Find the next `## ` heading after this section.
  const nextHeadingRe = /^##\s+/m;
  nextHeadingRe.lastIndex = 0;
  const rest = content.slice(startIdx);
  const next = nextHeadingRe.exec(rest);
  const block = next ? rest.slice(0, next.index) : rest;

  const autoDecide = BUCKET_HEADERS.autoDecide.test(block);
  const askUser = BUCKET_HEADERS.askUser.test(block);
  const hardRequired = BUCKET_HEADERS.hardRequired.test(block);

  const widenedTokens = autoDecide ? findWidenedAutoDecideTokens(block) : [];

  return {
    hasSection: true,
    buckets: { autoDecide, askUser, hardRequired },
    widenedTokens,
  };
}

/**
 * Walk the block from the `auto-decide:` line until the next
 * top-level (`-` / `*` at column 0..2) bucket header or EOF. For each
 * nested bullet, return the bullet text if it does not match any
 * allowed token. Narrowing (fewer bullets than the canonical set) is
 * permitted; widening (a bullet outside the allowed set) is flagged.
 */
function findWidenedAutoDecideTokens(block: string): string[] {
  const lines = block.split(/\r?\n/);
  let inAutoDecide = false;
  const widened: string[] = [];
  for (const line of lines) {
    if (BUCKET_HEADERS.autoDecide.test(line)) {
      inAutoDecide = true;
      continue;
    }
    if (!inAutoDecide) continue;
    // Stop when we hit another top-level bucket header.
    if (BUCKET_HEADERS.askUser.test(line) || BUCKET_HEADERS.hardRequired.test(line)) {
      break;
    }
    // Indented nested bullet under auto-decide.
    const nested = /^\s+[-*]\s+(.+)$/.exec(line);
    if (!nested?.[1]) continue;
    const bulletText = nested[1].trim();
    if (!bulletText) continue;
    const lowered = bulletText.toLowerCase();
    const matched = AUTO_DECIDE_ALLOWED_TOKENS.some((token) =>
      lowered.includes(token.toLowerCase()),
    );
    if (!matched) widened.push(bulletText);
  }
  return widened;
}

/**
 * Scan every `qfai-*` SKILL.md under the skills root and emit
 * `R-AUTOPILOT-POLICY-MISSING` (error) when the section is absent, or
 * `R-AUTOPILOT-POLICY-WIDENED` (warning) when the auto-decide bucket
 * contains entries outside the canonical allowed set.
 *
 * Code-registry note: `R-AUTOPILOT-POLICY-MISSING` is part of the
 * closed mandatory-justification catalog
 * (`justificationCatalog.ts`) — empty `justification:` on a finding
 * with that code is advisory-failing.
 * `R-AUTOPILOT-POLICY-WIDENED` is an AUXILIARY warning-class code that
 * lives OUTSIDE the mandatory-justification catalog: it is semantically
 * distinct from MISSING (different remediation: narrow the auto-decide
 * bucket back to the canonical set vs add the section), still useful
 * as a signal, but its severity (`warning`) and advisory contract are
 * not the same as the 8-code error-class catalog. It is intentionally
 * NOT added to `ADVISORY_FAILING_CODES` in `reviewerJustification.ts`.
 */
export async function validateAutopilotPolicy(
  root: string,
  options: { config?: QfaiConfig } = {},
): Promise<Issue[]> {
  const issues: Issue[] = [];
  // Honor `config.paths.skillsDir` via the canonical `resolvePath`
  // helper (SSOT) so a project that relocates its skills tree
  // (relative OR absolute) is still scanned. When no config is
  // supplied, fall back to the legacy hardcoded
  // `.qfai/assistant/skills` so single-arg test callers keep
  // working. Pre-fix the scan was hardcoded to the default path,
  // so a relocated skillsDir would silently SKIP every qfai-*
  // SKILL.md and let missing / widened Default Autopilot Policy
  // sections go unreported on the sdd / full profiles.
  const skillsDir = options.config
    ? resolvePath(root, options.config, "skillsDir")
    : path.join(root, SKILL_DIR_REL);
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
    if (!QFAI_SKILL_ID_RE.test(skillId)) continue;
    const skillDoc = path.join(skillsDir, skillId, "SKILL.md");
    let body: string;
    try {
      body = await readFile(skillDoc, "utf-8");
    } catch (err: unknown) {
      if (isEnoent(err)) continue;
      throw err;
    }
    const result = parseAutopilotPolicy(body);
    // Operator-facing relPath derived from the actual scan path so a
    // relocated skillsDir surfaces under its real root-relative
    // location (mirrors `staleReferences.ts` and `skillDocReferences.ts`).
    const relPath = path.relative(root, skillDoc).replace(/\\/g, "/");
    if (!result.hasSection) {
      const message =
        `R-AUTOPILOT-POLICY-MISSING: ${relPath} is missing the ` +
        `"## Default Autopilot Policy" section required by the SKILL.md ` +
        `governance contract. Add the section with three named buckets ` +
        `(auto-decide / ask-user / hard-required). ` +
        `Justification: file=${relPath}, missing=## Default Autopilot Policy.`;
      issues.push(
        issue(
          "R-AUTOPILOT-POLICY-MISSING",
          message,
          "error",
          relPath,
          "reviewerGate.autopilotPolicyMissing",
        ),
      );
      continue;
    }
    // Section present BUT one or more required buckets are missing.
    // `parseAutopilotPolicy` already detects the three canonical
    // headings; gating on `hasSection` alone would PASS a section
    // that contains the heading but no buckets — defeating the
    // governance contract. Reuse the MISSING code (same intent: the
    // section is not satisfying the contract) and enumerate the
    // missing buckets in the message so the operator can locate the
    // gap quickly.
    const missingBuckets: string[] = [];
    if (!result.buckets.autoDecide) missingBuckets.push("auto-decide");
    if (!result.buckets.askUser) missingBuckets.push("ask-user");
    if (!result.buckets.hardRequired) missingBuckets.push("hard-required");
    if (missingBuckets.length > 0) {
      const message =
        `R-AUTOPILOT-POLICY-MISSING: ${relPath} "## Default Autopilot Policy" ` +
        `section is present but missing required bucket(s): ` +
        `[${missingBuckets.join(", ")}]. The governance contract requires all ` +
        `three named buckets (auto-decide / ask-user / hard-required). ` +
        `Add the missing bucket(s) under the section as bullet lines ` +
        `(e.g. "- auto-decide:" / "- ask-user:" / "- hard-required:") ` +
        `with their entries listed beneath. ` +
        `Justification: file=${relPath}, missingBuckets=[${missingBuckets.join(", ")}].`;
      issues.push(
        issue(
          "R-AUTOPILOT-POLICY-MISSING",
          message,
          "error",
          relPath,
          "reviewerGate.autopilotPolicyMissing",
        ),
      );
      continue;
    }
    if (result.widenedTokens.length > 0) {
      const message =
        `R-AUTOPILOT-POLICY-WIDENED: ${relPath} auto-decide bucket lists ` +
        `entries outside the canonical allowed set ` +
        `([${result.widenedTokens.join(" | ")}]). Narrowing is permitted; ` +
        `widening MUST go through ask-user. ` +
        `Justification: file=${relPath}, widened=[${result.widenedTokens.join(", ")}].`;
      issues.push(
        issue(
          "R-AUTOPILOT-POLICY-WIDENED",
          message,
          "warning",
          relPath,
          "reviewerGate.autopilotPolicyWidened",
        ),
      );
    }
  }
  return issues;
}

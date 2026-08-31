/**
 * Reviewer-Gate finding `R-AUTOPILOT-POLICY-MISSING` (severity error).
 *
 * Every qfai-* SKILL.md MUST carry a `## Default Autopilot Policy`
 * section listing three named buckets per the spec governance contract:
 *   - auto-decide (output formatting / ID / sequence numbering /
 *     append-vs-create on subject overlap / equivalent-option pick)
 *   - ask-user (CREATE / DELETE / SPLIT / MERGE / SUPERSEDE /
 *     UPDATE:REMOVE triage ops, destructive operations, version-pin
 *     changes, scope expansions)
 *   - hard-required (brand intent / primarySpecId)
 *
 * A SKILL.md MAY narrow the auto-decide set (drop entries) but MUST
 * NOT widen it. Widening surfaces a warning-level
 * `R-AUTOPILOT-POLICY-WIDENED` flag.
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
import { newRuleSeverity, RULE_PROMOTIONS } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
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

/**
 * The exact hard-required set: `brand intent`, which reaches root
 * `DESIGN.md` front-matter via qfai-discussion, and `primarySpecId`, which
 * selects the spec every skill operates on. Both have a consumer in the
 * shipped tree; the retired `companyName` had none, so it bought a
 * guaranteed prompt out of a 0-1 budget and read nothing back.
 *
 * Unlike auto-decide this set may be neither widened NOR narrowed, so it is
 * matched in both directions: no entry outside it, and no entry of it
 * missing. Stored already normalized (see {@link normalizeHardRequiredEntry}).
 */
export const HARD_REQUIRED_ENTRIES: readonly string[] = ["brand intent", "primaryspecid"];

const BUCKET_HEADERS = {
  autoDecide: /^\s*[-*]\s*auto-decide\s*:/im,
  askUser: /^\s*[-*]\s*ask-user\s*:/im,
  hardRequired: /^\s*[-*]\s*hard-required\s*:/im,
} as const;

/**
 * Reduce one hard-required bullet to the identifier it names, so the
 * comparison against {@link HARD_REQUIRED_ENTRIES} can be an EQUALITY rather
 * than a substring test.
 *
 * Substring matching was the hole: a bullet reading
 * `- brand intent / companyName` contains `brand intent`, so it was neither an
 * unknown entry nor a missing one, and the retired identifier could be
 * reintroduced by writing it beside a permitted one. Equality on a normalized
 * bullet rejects that while leaving the bullets free to carry the decoration
 * the shipped tree actually uses — backticks and a trailing qualifier such as
 * `` `primarySpecId` (when absent from inputs) ``.
 *
 * Normalization is deliberately narrow: a trailing parenthetical or dash
 * clause is a qualifier on ONE entry, whereas anything else joining two names
 * (`/`, `+`, a comma) survives into the result and fails the equality, which
 * is the direction this guard must fail in.
 */
export function normalizeHardRequiredEntry(bullet: string): string {
  return bullet
    .replace(/[`*_]/g, "")
    .replace(/\s*[—–-]\s+.*$/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Collect the bullets nested under the `- hard-required:` line, stopping at
 * the first line that is not a nested bullet. Reads a whole SKILL.md as
 * readily as an already-extracted policy block, because the bucket header is
 * what anchors it.
 */
export function collectHardRequiredEntries(content: string): string[] {
  const entries: string[] = [];
  let inBucket = false;
  for (const line of content.split(/\r?\n/)) {
    if (BUCKET_HEADERS.hardRequired.test(line)) {
      inBucket = true;
      continue;
    }
    if (!inBucket) continue;
    const nested = /^\s+[-*]\s+(.+)$/.exec(line);
    const text = nested?.[1]?.trim();
    if (text === undefined || text.length === 0) break;
    entries.push(text);
  }
  return entries;
}

/**
 * Compare a hard-required bucket against {@link HARD_REQUIRED_ENTRIES} in both
 * directions. `unknown` holds bullets naming something outside the set (as
 * written, for the operator to find); `missing` holds set members no bullet
 * names.
 *
 * Exported so the validator and the shipped-asset guard in
 * `tests/assets/assets.test.ts` decide membership with ONE matcher: two copies
 * of this rule is how the substring hole reached both of them at once.
 */
export function classifyHardRequiredEntries(entries: readonly string[]): {
  unknown: string[];
  missing: string[];
} {
  const normalized = entries.map((entry) => normalizeHardRequiredEntry(entry));
  return {
    unknown: entries.filter(
      (entry) => !HARD_REQUIRED_ENTRIES.includes(normalizeHardRequiredEntry(entry)),
    ),
    missing: HARD_REQUIRED_ENTRIES.filter((required) => !normalized.includes(required)),
  };
}

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
  /** Hard-required bullets naming something outside the pinned set. */
  hardRequiredUnknown: string[];
  /** Pinned hard-required entries no bullet names. */
  hardRequiredMissing: string[];
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
      hardRequiredUnknown: [],
      hardRequiredMissing: [],
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
  // Only meaningful once the bucket header exists; without it the emitter
  // already reports the missing bucket and reporting every pinned entry as
  // "missing" on top of that would be the same defect twice.
  const hardRequiredEntries = hardRequired ? collectHardRequiredEntries(block) : [];
  const { unknown, missing } = classifyHardRequiredEntries(hardRequiredEntries);

  return {
    hasSection: true,
    buckets: { autoDecide, askUser, hardRequired },
    widenedTokens,
    hardRequiredUnknown: hardRequired ? unknown : [],
    hardRequiredMissing: hardRequired ? missing : [],
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

  // `QFAI-AUTOPILOT-001` runs a promotion window
  // (`RULE_PROMOTIONS`, P7): the rule is right, but it necessarily fires on
  // every SKILL.md installed before the set was pinned, and those are only
  // refreshed by an explicit `qfai init --force`. Shipping it straight at
  // `error` would turn an upgrade into a latched gate. `resolveToolVersion`
  // resolves rather than rejects — a read failure returns `"unknown"`, which
  // the comparator reads as inside the window, so an unreadable version can
  // never be what escalates this into a build failure.
  const hardRequiredPromotion = RULE_PROMOTIONS.autopilotHardRequiredDrift.promoteAt;
  const hardRequiredSeverity = newRuleSeverity(await resolveToolVersion(), hardRequiredPromotion);
  const hardRequiredWindowNote =
    hardRequiredSeverity === "warning"
      ? ` Reported as a warning until the ${hardRequiredPromotion} release, then an error.`
      : "";

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
    // The bucket's CONTENT, not just its header. Checking only the header let
    // a project whose installed SKILL.md still lists a retired entry pass
    // `qfai validate` indefinitely: installed skills are refreshed only by an
    // explicit `qfai init --force`, so nothing else would ever surface it.
    if (result.hardRequiredUnknown.length > 0 || result.hardRequiredMissing.length > 0) {
      const parts: string[] = [];
      if (result.hardRequiredUnknown.length > 0) {
        parts.push(`outside the pinned set ([${result.hardRequiredUnknown.join(" | ")}])`);
      }
      if (result.hardRequiredMissing.length > 0) {
        parts.push(`missing ([${result.hardRequiredMissing.join(" | ")}])`);
      }
      const message =
        `QFAI-AUTOPILOT-001: ${relPath} hard-required bucket ` +
        `lists entries ${parts.join(" and ")}. Unlike auto-decide this bucket may be ` +
        `neither widened nor narrowed: every entry costs a guaranteed prompt, and ` +
        `every pinned entry has a consumer in the shipped tree. Restore the bucket to ` +
        `exactly [${HARD_REQUIRED_ENTRIES.join(", ")}] — ` +
        `\`qfai init --force\` regenerates the shipped wording.${hardRequiredWindowNote} ` +
        `Justification: file=${relPath}, unknown=[${result.hardRequiredUnknown.join(", ")}], ` +
        `missing=[${result.hardRequiredMissing.join(", ")}].`;
      issues.push(
        issue(
          "QFAI-AUTOPILOT-001",
          message,
          hardRequiredSeverity,
          relPath,
          "reviewerGate.autopilotPolicyHardRequiredDrift",
        ),
      );
    }
  }
  return issues;
}

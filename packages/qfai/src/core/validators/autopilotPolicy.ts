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
 * The hard-required entries every skill may carry.
 *
 * `brand intent` reaches root `DESIGN.md` front-matter through qfai-discussion;
 * `primarySpecId` selects the spec a skill operates on. Both have a consumer in
 * the shipped tree.
 *
 * Stored already normalized (see {@link normalizeHardRequiredEntry}).
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export const HARD_REQUIRED_COMMON_ENTRIES: readonly string[] = ["brand intent", "primaryspecid"];

/**
 * Inputs a single skill reads, keyed by skill id, declared here so that adding
 * one is a reviewed change rather than a silent widening.
 *
 * The bucket is not a closed set: `qfai-configure` cannot write a config
 * without a `testFileGlobs` proposal that matches a real file or without a
 * tooling choice that resolves to a runnable path, and nothing else reads
 * either. A list of only the common entries would fail on those; a list of none
 * would admit anything.
 *
 * Each value is matched as a whole word inside the normalized bullet, so it
 * names the input rather than the sentence around it — rewording the bullet
 * does not need an edit here, and dropping the input does.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export const HARD_REQUIRED_SKILL_ENTRIES: Readonly<Record<string, readonly string[]>> = {
  "qfai-configure": ["testfileglobs", "tooling choice"],
};

/**
 * The hard-required entries that have been retired: an input no shipped file
 * reads, so the bucket paid a guaranteed prompt out of a 0-1 budget and read
 * nothing back. `companyName` is the one; it had no template slot, no artifact
 * section and no reference file.
 *
 * Kept beside the allowed sets rather than folded into them, because a retired
 * name is worth reporting by name: an operator reading "outside the allowed
 * set" about `companyName` has to work out that it used to be inside it.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export const RETIRED_HARD_REQUIRED_ENTRIES: readonly string[] = ["companyname"];

const BUCKET_HEADERS = {
  autoDecide: /^\s*[-*]\s*auto-decide\s*:/im,
  askUser: /^\s*[-*]\s*ask-user\s*:/im,
  hardRequired: /^\s*[-*]\s*hard-required\s*:/im,
} as const;

/**
 * The same line `BUCKET_HEADERS.hardRequired` finds, with whatever follows the
 * colon captured.
 *
 * Two patterns for one line, kept in step by a case that asks both about the
 * same header spellings. A single pattern would be better, but the bucket set
 * is iterated whole to close one bucket at the next, and only this one has a
 * tail to read.
 */
const HARD_REQUIRED_HEADER_WITH_TAIL = /^\s*[-*]\s*hard-required\s*:(.*)$/i;

/**
 * The bullet with its decoration removed and nothing else — backticks,
 * emphasis and repeated whitespace go, and every name the bullet writes stays,
 * including one in a trailing clause.
 *
 * That is what the retired-name search reads, because a retired name is
 * usually written in exactly such a clause.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export function decorationOnly(bullet: string): string {
  return bullet.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Reduce one hard-required bullet to the identifier it names, so a comparison
 * against the allowed entries reads the name and not the decoration around it.
 *
 * Decoration is backticks and emphasis; a qualifier is a trailing parenthetical
 * or a trailing dash clause, and both attach to ONE entry — `` `primarySpecId`
 * (when absent from inputs) ``. Parentheses go first: a qualifier may hold a
 * dash of its own, and dropping from that dash leaves an unclosed parenthesis
 * behind.
 *
 * A dash clause is a qualifier only when it is more than one word. A qualifier
 * states a CONDITION and reads as prose — "neither this nor the proposal above
 * has a defensible default" — while a single word after a dash is a name, and
 * dropping it is how an unregistered input reaches the bucket unseen: the two
 * whole-bullet searches beside this one look for names the policy already
 * knows, so a name it has never heard of matches neither and the reduced form
 * no longer holds it. A one-word clause is kept, and
 * {@link splitJoinedEntries} then answers for it separately.
 *
 * Anything that joins two names — `/`, `+`, a comma, a retained dash — survives
 * into the result, so a bullet naming two entries does not equal either of
 * them.
 *
 * Not for the retired-name search: this drops a multi-word clause, and a
 * retired name written in one is exactly what that search is for. Use
 * {@link decorationOnly} there.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export function normalizeHardRequiredEntry(bullet: string): string {
  return bullet
    .replace(/[`*_]/g, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*[—–-]\s+\S+\s+.*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Collect the entries nested under the `- hard-required:` line, one string per
 * entry with a wrapped bullet joined back into it. Reads a whole SKILL.md as
 * readily as an already-extracted policy block, because the bucket header is
 * what anchors it.
 *
 * The bucket runs to the next sibling bullet or the next heading, and past
 * everything else: a blank line, a comment and a line of prose all stay inside
 * it. Ending at any of those made a formatting edit enough to hide every entry
 * below it, which is a hole in a check whose whole subject is what the bucket
 * names.
 *
 * A sibling is a bullet at or left of the header's own indent, which is the
 * list rule rather than a column-zero test: Markdown admits up to three spaces
 * before a top-level bullet, so `   - ask-user:` opens the next bucket and a
 * collector anchored at column zero read it, and everything under it, as more
 * hard-required entries.
 *
 * A value written on the header line itself — `- hard-required: companyName` —
 * is an entry. Read as a header and nothing else, that file collected an empty
 * bucket, and an empty bucket is a narrowing this check permits: the one
 * spelling that hides an entry was the one spelling that reported nothing.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export function collectHardRequiredEntries(content: string): string[] {
  const entries: string[] = [];
  let inBucket = false;
  let bucketIndent = 0;
  for (const line of content.split(/\r?\n/)) {
    if (!inBucket) {
      const header = HARD_REQUIRED_HEADER_WITH_TAIL.exec(line);
      if (header !== null) {
        inBucket = true;
        bucketIndent = line.length - line.trimStart().length;
        const inline = header[1]?.trim();
        if (inline !== undefined && inline.length > 0) {
          entries.push(inline);
        }
      }
      continue;
    }
    // Checked before the nested read, which accepts any indented bullet: a
    // sibling is one of those too, and reading it as an entry is what carried
    // the next bucket's items into this one.
    //
    // Two tests, because the buckets are found by content and the list by
    // structure. Another bucket header closes this one at any indent, which is
    // the indent `BUCKET_HEADERS` already accepts — anything else would let a
    // policy be read one way when its buckets are located and another way when
    // their entries are collected. Any other bullet closes it only at or left
    // of this header, which is what makes it a sibling rather than an entry.
    const bullet = /^(\s*)[-*]\s/.exec(line);
    const opensAnotherBucket = Object.values(BUCKET_HEADERS).some((header) => header.test(line));
    if (
      opensAnotherBucket ||
      (bullet !== null && (bullet[1]?.length ?? 0) <= bucketIndent) ||
      /^#{1,6}\s/.test(line)
    ) {
      break;
    }
    const nested = /^\s+[-*]\s+(.+)$/.exec(line);
    const text = nested?.[1]?.trim();
    if (text !== undefined && text.length > 0) {
      entries.push(text);
      continue;
    }
    // A wrapped bullet continues on an indented line that is not itself a
    // bullet. Ending the bucket there dropped the rest of that entry AND every
    // entry after it, so a retired name written past a wrap was invisible to
    // this collector.
    const continuation = /^\s+(\S.*)$/.exec(line);
    const carried = continuation?.[1]?.trim();
    if (carried !== undefined && carried.length > 0 && entries.length > 0) {
      entries[entries.length - 1] = `${entries[entries.length - 1]} ${carried}`;
    }
  }
  return entries;
}

/**
 * The pieces a bullet joins with `/`, `+` or a comma, outside any parenthetical.
 *
 * A hard-required bullet names one input. When it joins two, an allowed-name
 * search over the whole bullet passes on whichever half is permitted and
 * carries the other in beside it — so `brand intent / an unreviewed secret`
 * declares an input nothing has approved and reads as clean. Each piece
 * answering for itself is what closes that.
 *
 * A dash joins too, because {@link normalizeHardRequiredEntry} keeps a one-word
 * dash clause: that clause is a name rather than a condition, and left inside
 * its neighbour it would be carried in by an allowed-name search that only asks
 * whether SOME permitted name is present.
 *
 * Parentheses are skipped because a qualifier is prose and may hold any of
 * these characters: `primarySpecId (absent from inputs, and no default)` is one
 * entry with one qualifier rather than two entries.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
/** The three dashes a bullet writes between an entry and what follows it. */
function isDash(char: string): boolean {
  return char === "—" || char === "–" || char === "-";
}

export function splitJoinedEntries(normalized: string): string[] {
  const pieces: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of normalized) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    }
    if (depth === 0 && (char === "/" || char === "+" || char === "," || isDash(char))) {
      pieces.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  pieces.push(current);
  return pieces.map((piece) => piece.trim()).filter((piece) => piece.length > 0);
}

/**
 * Judge one hard-required bucket against what its skill may carry.
 *
 * `retired` holds bullets naming an entry that has been withdrawn; `unknown`
 * holds bullets naming anything else outside the allowed set. Both are returned
 * as written, for the operator to find.
 *
 * A bucket carrying **fewer** entries than the allowed set is not reported: a
 * skill may narrow this bucket to the inputs it actually reads. Carrying more
 * is what this refuses.
 *
 * Matching is by whole word inside the bullet rather than by equality, so a
 * bullet naming two entries answers for both: `- brand intent / companyName`
 * names a live entry and a withdrawn one, and only a word match sees the
 * second. For the same reason the allowed test reads each joined piece
 * separately (see {@link splitJoinedEntries}) — asked of the whole bullet it
 * passes on one half and admits whatever the other half names.
 *
 * The validator and the shipped-asset guard in `tests/assets/assets.test.ts`
 * both call this, so membership has one definition rather than two.
 *
 * @param skillId the skill the bucket belongs to, which decides the
 * skill-specific entries it may carry. Omitted, only the common set applies.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export function classifyHardRequiredEntries(
  entries: readonly string[],
  skillId?: string,
): {
  retired: string[];
  unknown: string[];
} {
  // The names are input identifiers, matched as literals. Interpolating one
  // straight into a pattern would read a `+` or a `(` in a future entry as
  // syntax — a silently wrong match, or a thrown SyntaxError.
  const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const named = (normalized: string, names: readonly string[]): boolean =>
    names.some((name) => new RegExp(`(^|[^a-z0-9])${escape(name)}([^a-z0-9]|$)`).test(normalized));

  const allowed = [
    ...HARD_REQUIRED_COMMON_ENTRIES,
    ...(skillId === undefined ? [] : (HARD_REQUIRED_SKILL_ENTRIES[skillId] ?? [])),
  ];
  // The inputs this policy knows about but this skill may not name. A bullet
  // holding one is reported however else it reads: the allowed test asks only
  // whether *some* permitted name is in the bullet, so `brand intent —
  // testFileGlobs` passes on its first half and carries the second in beside
  // it. Hard-required is the bucket that stops a run, and an input smuggled
  // into it is the widening this check exists to see.
  const foreign = [
    ...HARD_REQUIRED_COMMON_ENTRIES,
    ...Object.values(HARD_REQUIRED_SKILL_ENTRIES).flat(),
  ].filter((name) => !allowed.includes(name));

  const retired: string[] = [];
  const unknown: string[] = [];
  for (const entry of entries) {
    const normalized = normalizeHardRequiredEntry(entry);
    // Both whole-bullet searches, for the same reason: a name written in a
    // trailing clause — `brand intent — companyName` — is gone from the
    // reduced form, and that clause is one of the places it gets written.
    if (named(decorationOnly(entry), RETIRED_HARD_REQUIRED_ENTRIES)) {
      retired.push(entry);
      continue;
    }
    // Every joined piece has to name something allowed. `pieces` is empty only
    // for a bullet that normalizes away entirely, which names nothing and is
    // reported for that.
    const pieces = splitJoinedEntries(normalized);
    if (
      named(decorationOnly(entry), foreign) ||
      pieces.length === 0 ||
      !pieces.every((piece) => named(piece, allowed))
    ) {
      unknown.push(entry);
    }
  }
  return { retired, unknown };
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
  /** Hard-required bullets naming an entry this policy has retired. */
  hardRequiredRetired: string[];
  /**
   * Hard-required bullets naming an entry that is neither common to every
   * skill nor declared for this one. Narrowing is not reported: a bucket may
   * name fewer entries than the set allows.
   */
  hardRequiredUnknown: string[];
};

/**
 * Pure-function parser. Extracts the `## Default Autopilot Policy`
 * block (until the next `## ` heading or EOF), then scans the block for
 * the three bucket headers. The auto-decide widening check enumerates
 * the bullets nested under the `auto-decide:` line and flags any
 * bullet whose text does not contain any of `AUTO_DECIDE_ALLOWED_TOKENS`.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export function parseAutopilotPolicy(
  content: string,
  skillId?: string,
): AutopilotPolicyParseResult {
  const headingMatch = SECTION_HEADING_RE.exec(content);
  if (!headingMatch) {
    return {
      hasSection: false,
      buckets: { autoDecide: false, askUser: false, hardRequired: false },
      widenedTokens: [],
      hardRequiredRetired: [],
      hardRequiredUnknown: [],
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
  const { retired, unknown } = classifyHardRequiredEntries(hardRequiredEntries, skillId);

  return {
    hasSection: true,
    buckets: { autoDecide, askUser, hardRequired },
    widenedTokens,
    hardRequiredRetired: hardRequired ? retired : [],
    hardRequiredUnknown: hardRequired ? unknown : [],
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
    const result = parseAutopilotPolicy(body, skillId);
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
    if (result.hardRequiredRetired.length > 0 || result.hardRequiredUnknown.length > 0) {
      const parts: string[] = [];
      if (result.hardRequiredRetired.length > 0) {
        parts.push(`a retired entry ([${result.hardRequiredRetired.join(" | ")}])`);
      }
      if (result.hardRequiredUnknown.length > 0) {
        parts.push(
          `an entry this skill does not declare ([${result.hardRequiredUnknown.join(" | ")}])`,
        );
      }
      const message =
        `QFAI-AUTOPILOT-001: ${relPath} hard-required bucket names ${parts.join(" and ")}. ` +
        `Every entry costs a guaranteed prompt, so an input nothing reads buys nothing. ` +
        `A skill may carry fewer entries than it is allowed and never more: drop the ` +
        `entry, or declare it for this skill if the skill really consumes it — ` +
        `\`qfai init --force\` regenerates the shipped wording.${hardRequiredWindowNote} ` +
        `Justification: file=${relPath}, retired=[${result.hardRequiredRetired.join(", ")}], ` +
        `unknown=[${result.hardRequiredUnknown.join(", ")}].`;
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

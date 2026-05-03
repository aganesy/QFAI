import type { SpecSummary } from "./specSummary.js";

export const TRIAGE_TOP_LEVEL_OPS = ["CREATE", "DELETE", "SPLIT", "MERGE", "SUPERSEDE"] as const;

export const TRIAGE_UPDATE_SUBOPS = ["APPEND", "MODIFY", "REMOVE"] as const;

export type TriageTopLevelOp = (typeof TRIAGE_TOP_LEVEL_OPS)[number];
export type TriageUpdateSubOp = (typeof TRIAGE_UPDATE_SUBOPS)[number];

/**
 * The 8 first-class triage operations. UPDATE is split into APPEND/MODIFY/REMOVE
 * sub-ops to make granularity an explicit decision recorded in delta.md.
 */
export type TriageOp = TriageTopLevelOp | { update: TriageUpdateSubOp };

export interface TriageRequirement {
  id: string;
  subject: string;
  /** Optional capability ID this REQ maps onto (e.g. CAP-0008). */
  capability?: string;
  /**
   * Optional explicit hint to remove existing items rather than add.
   * When true and a single matching spec is found, classify as UPDATE:REMOVE.
   */
  removalHint?: boolean;
}

export interface TriageInput {
  reqs: TriageRequirement[];
  summaries: SpecSummary[];
  /** Spec size thresholds beyond which APPEND is upgraded to SPLIT. */
  thresholds?: TriageThresholds;
}

export interface TriageThresholds {
  ac: number;
  tc: number;
}

export const DEFAULT_TRIAGE_THRESHOLDS: TriageThresholds = { ac: 30, tc: 50 };

export interface TriageRow {
  source: string;
  subject: string;
  existingSpec: string | null;
  op: TriageOp;
  approvedBy?: string;
  rationale?: string;
}

const APPROVAL_REQUIRED_TOP_LEVEL = new Set<TriageTopLevelOp>([
  "CREATE",
  "DELETE",
  "SPLIT",
  "MERGE",
  "SUPERSEDE",
]);

/**
 * Determine whether a given operation requires explicit user approval
 * (AskUserQuestion before recording in delta.md).
 */
export function requiresApproval(op: TriageOp): boolean {
  if (typeof op === "string") {
    return APPROVAL_REQUIRED_TOP_LEVEL.has(op);
  }
  return op.update === "REMOVE";
}

export function isUpdateOp(op: TriageOp): op is { update: TriageUpdateSubOp } {
  return typeof op !== "string";
}

export function topLevelOp(
  op: TriageOp,
): "CREATE" | "UPDATE" | "DELETE" | "SPLIT" | "MERGE" | "SUPERSEDE" {
  if (typeof op === "string") {
    return op;
  }
  return "UPDATE";
}

export function subOp(op: TriageOp): TriageUpdateSubOp | null {
  return isUpdateOp(op) ? op.update : null;
}

/**
 * Stop tokens are stripped from `tokenize` output so that subject overlap
 * scoring is dominated by content nouns rather than connectives.
 *
 * Design note (PR #206 review #15): `remove` and `delete` are included on
 * purpose. The classifier already routes "removal-shaped" REQs through
 * the `removalHint` branch, so the verbs themselves should not bias
 * subject-overlap scoring on the additive path. As a side effect, a
 * subject like `"remove the flag"` (where `the` and `flag` are also
 * filtered or short) can collapse to zero meaningful tokens. In that
 * case `bestSubjectMatch` returns `undefined` and `classifyTriage`
 * proposes CREATE. This is documented behaviour: subjects that
 * tokenize to nothing meaningful require manual triage by the agent
 * driving Stage 1 (which is already required for CREATE rows by
 * QFAI-TRIAGE-006 + AskUserQuestion).
 */
const STOP_TOKENS = new Set([
  "the",
  "a",
  "an",
  "to",
  "of",
  "and",
  "or",
  "for",
  "in",
  "on",
  "with",
  "from",
  "is",
  "are",
  "be",
  "this",
  "that",
  "new",
  "add",
  "update",
  "change",
  "fix",
  "remove",
  "delete",
  "support",
  "enable",
  "make",
  "do",
  "into",
  "by",
  "at",
  "as",
]);

/**
 * Tokenize a subject string into a normalized lower-cased token set.
 *
 * Splits on any character that is not a Unicode letter or number using
 * the `\p{L}\p{N}` property escapes (Node 18+, requires the `u` flag).
 * That covers (PR #206 review #12, #23):
 *
 * - ASCII alphanumerics and Latin-1 supplement
 * - Hiragana, Katakana (full + half-width), CJK Unified Ideographs
 *   plus CJK Extension A/B and beyond
 * - Full-width alphanumerics (`Ａ-Ｚ`, `０-９`, etc.)
 * - Other scripts (Greek, Cyrillic, Thai, Arabic, ...) without
 *   special-casing
 *
 * Punctuation, the prolonged sound mark `ー`, the middle dot `・`, and
 * other symbols become separators so that `"プロトタイプ・契約"` yields
 * `["プロトタイプ", "契約"]` rather than a single combined token.
 *
 * Tokens shorter than two characters are dropped to avoid noise from
 * single-character connectives; this is intentional but may strip
 * single-CJK-character lemmas (e.g., the kanji `行` from `行う`). Subject
 * authors are expected to use multi-character noun forms; otherwise
 * tokenization may collapse to an empty set and the classifier proposes
 * CREATE (see `STOP_TOKENS` jsdoc above).
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length >= 2 && !STOP_TOKENS.has(t)),
  );
}

/**
 * Count the number of tokens present in both sets. Symmetric in the
 * arguments; iteration is over the (typically smaller) `a` set.
 */
function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

interface SubjectCandidate {
  score: number;
  summary: SpecSummary;
}

/**
 * Lexicographic comparator for subject-match candidates.
 *
 * Order (strongest to weakest):
 *
 * 1. Higher `score` wins (more shared subject tokens).
 * 2. Smaller `acCount` wins. Rationale: a spec with more append headroom
 *    is preferred so the cascade does not pile onto an already-large
 *    spec that would soon trip the SPLIT threshold. Trade-off (PR #206
 *    review #6): when two specs share the subject equally but the
 *    capability owner is the larger one, this tie-breaker may route
 *    the REQ onto the smaller peripheral spec. The
 *    capability-exact-match branch in `classifyTriage` short-circuits
 *    before this fallback runs whenever the REQ carries a capability,
 *    so the divergence only appears for capability-less REQs that
 *    still token-overlap with both specs. The size-threshold escalation
 *    (`tooLarge` -> SPLIT) absorbs the worst case; the agent driving
 *    Stage 1 is also expected to verify the proposed primary spec
 *    against the impact cascade before persisting.
 * 3. Lexicographically smaller `specId` wins. This keeps the result
 *    deterministic for any input order, provided the comparator below
 *    is fed a stable iteration. `bestSubjectMatch` snapshots the input
 *    via spread + sort to avoid relying on caller iteration order
 *    (PR #206 review #27).
 *
 * Returns a negative number when `a` is preferred over `b`, positive
 * when `b` is preferred, and zero only when both candidates would tie
 * across all three keys (which means `a.summary.specId === b.summary.specId`
 * — a guaranteed-stable input contains no such pair).
 */
function compareSubjectCandidates(a: SubjectCandidate, b: SubjectCandidate): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.summary.acCount !== b.summary.acCount) {
    return a.summary.acCount - b.summary.acCount;
  }
  return a.summary.specId.localeCompare(b.summary.specId);
}

/**
 * Find the active spec whose title/capability/scope-in shares the most
 * subject tokens with the requirement.
 *
 * `scopeOut` is intentionally excluded from the haystack: tokens a spec
 * explicitly declares as out-of-scope must not bias the closest-match
 * selection (otherwise append-first would route a REQ onto a spec that
 * has already disowned the subject).
 *
 * Tie-breaking: see `compareSubjectCandidates`. The function snapshots
 * the input and sorts by `specId` before scoring so that the result is
 * deterministic regardless of caller iteration order (PR #206 review
 * #27 — `collectSpecSummaries` already returns a sorted array, but the
 * type signature does not advertise that, so this guards against
 * accidental shuffles in fixtures or future callers).
 *
 * Returns `undefined` when no token overlap exists with any active spec
 * — that is the only condition under which `classifyTriage` proposes
 * CREATE.
 */
export function bestSubjectMatch(
  subject: string,
  summaries: SpecSummary[],
): SpecSummary | undefined {
  const reqTokens = tokenize(subject);
  if (reqTokens.size === 0) return undefined;

  // Snapshot + sort so the score loop is fed a deterministic order.
  const ordered = [...summaries].sort((a, b) => a.specId.localeCompare(b.specId));

  let best: SubjectCandidate | undefined;
  for (const s of ordered) {
    if (s.status !== "active") continue;
    const haystack = [s.title, s.capability ?? "", ...s.scopeIn].join(" ");
    const score = overlapCount(reqTokens, tokenize(haystack));
    if (score === 0) continue;
    const candidate: SubjectCandidate = { score, summary: s };
    if (!best || compareSubjectCandidates(candidate, best) < 0) {
      best = candidate;
    }
  }
  return best?.summary;
}

/**
 * Append-first triage classifier.
 *
 * Decision order per REQ:
 *
 * 1. removalHint:
 *    - capability matches multiple active specs -> MERGE (with
 *      removal-intent rationale, mirroring the additive path so the
 *      cascade across the matched specs is not silently collapsed onto
 *      `capabilityMatches[0]`).
 *    - otherwise UPDATE:REMOVE on a capability-matched spec, or on the
 *      closest subject-overlap match. Falls through to DELETE only when
 *      no active spec can absorb the removal.
 * 2. capability matches multiple active specs -> MERGE.
 * 3. capability matches a single active spec -> APPEND, escalating to
 *    SPLIT when AC/TC thresholds are exceeded.
 * 4. capability does not match (or is absent) but subject tokens overlap
 *    an active spec's title/capability/scope -> APPEND on the closest
 *    spec, with a fallback rationale prompting cascade verification.
 *    SPLIT applies if the closest spec exceeds size thresholds.
 * 5. No subject overlap with any active spec -> CREATE candidate. The
 *    caller MUST add the new CAP to `_policies/03_Capabilities.md` and
 *    cite it in the Rationale column (validator: QFAI-TRIAGE-006).
 *
 * The classifier output is a *proposal*. The agent driving Stage 1 Triage
 * is expected to read the candidate spec's scope/AC/BR before persisting
 * the table, and to add cascade rows for any other specs that need
 * MODIFY/REMOVE in support of the primary change.
 */
export function classifyTriage(input: TriageInput): TriageRow[] {
  const thresholds = input.thresholds ?? DEFAULT_TRIAGE_THRESHOLDS;
  const active = input.summaries.filter((s) => s.status === "active");
  const rows: TriageRow[] = [];

  for (const req of input.reqs) {
    const capabilityMatches = req.capability
      ? active.filter((s) => s.capability === req.capability)
      : [];

    if (req.removalHint) {
      if (capabilityMatches.length > 1) {
        rows.push({
          source: req.id,
          subject: req.subject,
          existingSpec: capabilityMatches.map((m) => m.specId).join("+"),
          op: "MERGE",
          rationale:
            "removal-intent across multiple capability-matched specs; consolidate before REMOVE",
        });
        continue;
      }
      const target = capabilityMatches[0] ?? bestSubjectMatch(req.subject, active);
      if (target) {
        // Symmetry with the additive path (PR #206 review #3): when the
        // target spec already exceeds AC/TC thresholds, propose SPLIT
        // before REMOVE so that traceability is preserved across the
        // resulting child specs. Without this escalation the additive
        // and removal branches diverged on size handling, which
        // contradicts the append-first principle.
        const tooLarge = target.acCount > thresholds.ac || target.tcCount > thresholds.tc;
        rows.push({
          source: req.id,
          subject: req.subject,
          existingSpec: target.specId,
          op: tooLarge ? "SPLIT" : { update: "REMOVE" },
          ...(tooLarge
            ? {
                rationale:
                  "removal targets a spec exceeding size thresholds; SPLIT before REMOVE to preserve traceability",
              }
            : {}),
        });
      } else {
        // No active spec absorbed the removal-shaped REQ. DELETE
        // ("subject ごとリポジトリから消失") is a stronger statement
        // than the input justifies — the REQ may simply have a subject
        // whose tokens were stripped by the STOP_TOKEN filter, not a
        // genuine product removal. Emit DELETE with a placeholder
        // rationale that surfaces the burden of proof to the agent
        // driving Stage 1 Triage, mirroring the CREATE placeholder
        // pattern (PR #206 review LW-I): the triage row is presented
        // for manual review + AskUserQuestion approval rather than
        // as a confident classification.
        rows.push({
          source: req.id,
          subject: req.subject,
          existingSpec: null,
          op: "DELETE",
          rationale:
            "no active spec absorbed the removal-shaped REQ; verify the subject is genuinely retired before approving DELETE (otherwise downgrade to UPDATE:REMOVE on the relevant spec)",
        });
      }
      continue;
    }

    if (capabilityMatches.length > 1) {
      rows.push({
        source: req.id,
        subject: req.subject,
        existingSpec: capabilityMatches.map((m) => m.specId).join("+"),
        op: "MERGE",
      });
      continue;
    }

    const primary = capabilityMatches[0] ?? bestSubjectMatch(req.subject, active);
    if (primary) {
      const tooLarge = primary.acCount > thresholds.ac || primary.tcCount > thresholds.tc;
      const isFallback = capabilityMatches.length === 0;
      const row: TriageRow = {
        source: req.id,
        subject: req.subject,
        existingSpec: primary.specId,
        op: tooLarge ? "SPLIT" : { update: "APPEND" },
      };
      if (isFallback) {
        row.rationale = `subject-overlap fallback to ${primary.specId}; verify impact cascade before persisting`;
      }
      rows.push(row);
      continue;
    }

    // CREATE rationale is intentionally a placeholder. The agent driving
    // Stage 1 Triage MUST replace it with a real `CAP-NNNN` reference
    // before persisting, otherwise QFAI-TRIAGE-006 will reject the row
    // (PR #206 review #13). Surfacing the placeholder verbatim makes
    // the required follow-up explicit instead of letting the row look
    // ready to ship.
    rows.push({
      source: req.id,
      subject: req.subject,
      existingSpec: null,
      op: "CREATE",
      rationale:
        "no active spec scope absorbs this requirement; add CAP-NNNN to _policies/03_Capabilities.md and replace this placeholder before persisting (QFAI-TRIAGE-006)",
    });
  }

  return rows;
}

export const TRIAGE_TABLE_HEADER = [
  "Source",
  "Subject",
  "Existing Spec",
  "Operation",
  "Sub-op",
  "Approved By",
  "Rationale",
] as const;

/**
 * Escape a single Triage table cell so the resulting markdown row keeps
 * the column structure intact even when the source REQ subject /
 * rationale / spec name contains literal `|` (e.g. CLI flags
 * `--mode=a|b`, regexes `(?:add|remove)`, URL queries `?op=a|b`) or
 * embedded newlines (e.g. multi-line subjects pasted from a discussion
 * pack). Without this, the persisted delta.md row would break GFM
 * table parsing — `parseAllMarkdownTables` would split on the literal
 * pipe and `validators/specPack.ts` would misalign column → row,
 * letting QFAI-TRIAGE-* validators silently miss the row
 * (PR #206 review LMAJOR / Lsbk).
 *
 * Escapes:
 * - `|` → `\|` (GFM table escape)
 * - `\r\n` / `\r` / `\n` → ` ` (single space; `<br>` is GFM-only and
 *   not all downstream consumers handle it consistently)
 */
function escapeTableCell(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r\n|\r|\n/g, " ");
}

/**
 * Render a triage section as a markdown table block. Designed to be appended
 * directly under the `## Change Summary` section of a delta.md file.
 */
export function renderTriageMarkdown(rows: TriageRow[]): string {
  const header = `| ${TRIAGE_TABLE_HEADER.join(" | ")} |`;
  const sep = `| ${TRIAGE_TABLE_HEADER.map(() => "---").join(" | ")} |`;
  const lines = ["## Triage", "", header, sep];
  for (const row of rows) {
    const top = topLevelOp(row.op);
    const sub = subOp(row.op) ?? "-";
    const cells = [
      row.source,
      row.subject,
      row.existingSpec ?? "(none)",
      top,
      sub,
      row.approvedBy ?? "-",
      row.rationale ?? "-",
    ].map(escapeTableCell);
    lines.push(`| ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines.join("\n");
}

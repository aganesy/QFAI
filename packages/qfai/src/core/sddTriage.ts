import { escapeTableCell } from "./specPackParsers.js";
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
  /**
   * Spec size thresholds. A breach is a *signal* recorded in the row's
   * `rationale`, asking for a capability-ownership review; it never changes
   * the classified operation, and in particular never upgrades APPEND to
   * SPLIT (see {@link classifyTriage}).
   */
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
 *    still token-overlap with both specs. A size-threshold breach is only
 *    a `size signal: ...` rationale note (it never escalates to SPLIT), so
 *    the agent driving Stage 1 is expected to verify the proposed primary
 *    spec against the impact cascade before persisting.
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
 * 2. capability matches multiple active specs -> MERGE. A breached AC/TC
 *    threshold on any target is reported on the row and never changes the
 *    operation.
 * 3. capability matches a single active spec -> APPEND. A breached AC/TC
 *    threshold is reported on the row and never changes the operation.
 * 4. capability does not match (or is absent) but subject tokens overlap
 *    an active spec's title/capability/scope -> APPEND on the closest
 *    spec, with a fallback rationale prompting cascade verification. A
 *    breached threshold on that spec is likewise only a rationale note.
 * 5. No subject overlap with any active spec -> CREATE candidate. The
 *    caller MUST add the new CAP to `_policies/03_Capabilities.md` and
 *    cite it in the Rationale column (validator: QFAI-TRIAGE-006).
 *
 * This classifier never emits SPLIT. SPLIT asserts one spec must become N
 * specs, and `validateSpecSplitByCapability` hard-enforces one `CAP-NNNN`
 * per spec, so a count-driven SPLIT of a single-capability spec raises
 * `QFAI-SPLIT-102` / `QFAI-SPLIT-104` at `error` and has no legal end
 * state. Size breaches surface as a `size signal: ...` rationale that asks
 * for a capability-ownership review; only that review can propose SPLIT.
 *
 * The classifier output is a *proposal*. The agent driving Stage 1 Triage
 * is expected to read the candidate spec's scope/AC/BR before persisting
 * the table, and to add cascade rows for any other specs that need
 * MODIFY/REMOVE in support of the primary change.
 */
/**
 * The `size signal: ...` note for any row, or `undefined` when no target
 * breaches a threshold.
 *
 * One formatter for every operation. The breach detail — which specs, which
 * counts, which thresholds — is identical whatever the row does; only the
 * clause naming what the operation does next differs, and that is `standsClause`.
 * Three call sites building this string by hand is how the IDs, the thresholds
 * or the `QFAI-SPLIT-102/104` citation drift out of one of them.
 *
 * The operation is never changed by a breach: MERGE, APPEND and UPDATE:REMOVE
 * all stand, and the note only asks for a capability-ownership review. A
 * count-driven SPLIT of a single-capability spec has no legal end state —
 * `validateSpecSplitByCapability` raises `QFAI-SPLIT-102` / `QFAI-SPLIT-104` at
 * `error` — so only that review can propose one.
 */
function sizeSignal(
  targets: readonly SpecSummary[],
  thresholds: TriageThresholds,
  standsClause: string,
): string | undefined {
  const breached = targets.filter(
    (target) => target.acCount > thresholds.ac || target.tcCount > thresholds.tc,
  );
  if (breached.length === 0) {
    return undefined;
  }
  const details = breached
    .map(
      (target) =>
        `${target.specId} has ac=${target.acCount} (threshold ${thresholds.ac}), ` +
        `tc=${target.tcCount} (threshold ${thresholds.tc})`,
    )
    .join(" / ");
  return `size signal: ${details}. ${standsClause} (QFAI-SPLIT-102/104)`;
}

/** What a MERGE row does next after a breach. */
const MERGE_STANDS =
  "MERGE stands; start a capability-ownership review on the merged owner — " +
  "SPLIT only if it owns more than one CAP-NNNN, otherwise record the reasoned non-split";

/** What a single-target removal row does next after a breach. */
const REMOVE_STANDS =
  "Removal proceeds as UPDATE:REMOVE; start a capability-ownership review separately — " +
  "SPLIT only if the spec owns more than one CAP-NNNN";

/** What a single-target additive row does next after a breach. */
const APPEND_STANDS =
  "APPEND stands; start a capability-ownership review separately — " +
  "SPLIT only if the spec owns more than one CAP-NNNN";

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
        const notes = [
          "removal-intent across multiple capability-matched specs; consolidate before REMOVE",
        ];
        const breach = sizeSignal(capabilityMatches, thresholds, MERGE_STANDS);
        if (breach) {
          notes.push(breach);
        }
        rows.push({
          source: req.id,
          subject: req.subject,
          existingSpec: capabilityMatches.map((m) => m.specId).join("+"),
          op: "MERGE",
          rationale: notes.join("; "),
        });
        continue;
      }
      const target = capabilityMatches[0] ?? bestSubjectMatch(req.subject, active);
      if (target) {
        // Symmetry with the additive path (PR #206 review #3): the size
        // breach is reported on the row, but it no longer decides the
        // operation. A count-driven SPLIT of a single-capability spec is
        // illegal — `validateSpecSplitByCapability` raises QFAI-SPLIT-102/104
        // at `error` — so the breach starts a capability-ownership review
        // instead.
        // `notes`, like the multi-target MERGE path above: the removal-intent
        // note comes first and the size signal is appended. Building the
        // rationale from the breach alone dropped the `removal-intent` keyword
        // from single-target rows, so the same REQ read differently depending
        // on how many specs matched it.
        const notes = ["removal-intent on the capability-matched spec"];
        const breach = sizeSignal([target], thresholds, REMOVE_STANDS);
        if (breach) {
          notes.push(breach);
        }
        rows.push({
          source: req.id,
          subject: req.subject,
          existingSpec: target.specId,
          op: { update: "REMOVE" },
          rationale: notes.join("; "),
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
        //
        // The `Existing Spec` cell is part of that placeholder. DELETE
        // removes a whole spec directory, so a row that names none is not
        // executable; the rationale names the follow-up and the validator
        // (`QFAI-TRIAGE-009`) refuses the row until the target is settled,
        // the same producer/validator contract CREATE has with
        // `QFAI-TRIAGE-006`.
        rows.push({
          source: req.id,
          subject: req.subject,
          existingSpec: null,
          op: "DELETE",
          rationale:
            "no active spec absorbed the removal-shaped REQ; verify the subject is genuinely retired, then replace the Existing Spec placeholder with the spec this DELETE removes before persisting (QFAI-TRIAGE-009) — otherwise downgrade to UPDATE:REMOVE on the relevant spec",
        });
      }
      continue;
    }

    if (capabilityMatches.length > 1) {
      // Step 4 of the Slice Policy runs after step 3, not instead of it: the
      // MERGE targets are evaluated against the thresholds too. Without this
      // the size signal the policy promises was simply absent whenever the
      // selected operation was MERGE.
      const breach = sizeSignal(capabilityMatches, thresholds, MERGE_STANDS);
      rows.push({
        source: req.id,
        subject: req.subject,
        existingSpec: capabilityMatches.map((m) => m.specId).join("+"),
        op: "MERGE",
        ...(breach ? { rationale: breach } : {}),
      });
      continue;
    }

    const primary = capabilityMatches[0] ?? bestSubjectMatch(req.subject, active);
    if (primary) {
      // A size breach is a SIGNAL, not the operation decision. SPLIT asserts
      // the spec must become N specs, and `validateSpecSplitByCapability`
      // hard-enforces one CAP-NNNN per spec — so splitting a single-capability
      // spec on a count alone raises QFAI-SPLIT-102/104 at `error` and has no
      // legal end state. SPLIT is reserved for `capabilityMatches.length > 1`,
      // which is handled by the MERGE/`> 1` branch above and by an explicit
      // capability-ownership review.
      const isFallback = capabilityMatches.length === 0;
      const row: TriageRow = {
        source: req.id,
        subject: req.subject,
        existingSpec: primary.specId,
        op: { update: "APPEND" },
      };
      const notes: string[] = [];
      if (isFallback) {
        notes.push(
          `subject-overlap fallback to ${primary.specId}; verify impact cascade before persisting`,
        );
      }
      const breach = sizeSignal([primary], thresholds, APPEND_STANDS);
      if (breach) {
        notes.push(breach);
      }
      if (notes.length > 0) {
        row.rationale = notes.join("; ");
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
 * The `Existing Spec` literal for a row that has no spec to act on — in
 * practice a CREATE row. `-` is the spelling the field already uses and it
 * matches the "not applicable" cells of the neighbouring `Sub-op` /
 * `Approved By` columns, so it is the canonical one.
 */
export const TRIAGE_NO_EXISTING_SPEC = "-";

/**
 * Legacy spelling of `TRIAGE_NO_EXISTING_SPEC` that this renderer emitted
 * before the grammar was fixed. Still accepted by the validator so an
 * upgrade does not invalidate delta.md files written by an older version.
 */
export const TRIAGE_NO_EXISTING_SPEC_LEGACY = "(none)";

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
 *
 * Symmetric pair: paired with `splitMarkdownRow`
 * (`packages/qfai/src/core/specPackParsers.ts`). The pair invariant
 * declared on both sides MUST stay in lock-step — the parser only
 * un-escapes `\|` → `|` and does NOT decode `\\` → `\`. Therefore
 * literal backslashes in the cell are persisted as-is — we deliberately
 * do not pre-escape `\` here, so cells like Windows paths
 * (`C:\Users\foo`) or regex literals (`\d+`, `(?<=foo)\bbar`) round-trip
 * unchanged through render → parse. Adding `\` → `\\` here without a
 * matching `\\` → `\` in the parser would silently double backslashes
 * (PR #206 review NkNm / NkzP / Nk-A / NptA).
 *
 * The contract is also declared at the spec level for the SDD skill
 * (Stage 1 Triage business rules) and exercised end-to-end by the
 * round-trip identity tests in `tests/core/sddTriage.test.ts` under
 * `describe("escapeTableCell ↔ splitMarkdownRow round-trip identity")`
 * — extend them when adding any new escape/un-escape rule.
 */
// Re-exported, not redefined: a second copy of the encoder is the drift the
// pair invariant above exists to prevent. The implementation now lives beside
// its decoder in `specPackParsers.ts` and is public, so ledger writers and the
// Triage renderer share one encoder.
export { escapeTableCell };

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
      row.existingSpec ?? TRIAGE_NO_EXISTING_SPEC,
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

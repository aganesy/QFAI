import type { SpecSummary } from "./specSummary.js";

export const TRIAGE_TOP_LEVEL_OPS = [
  "CREATE",
  "DELETE",
  "SPLIT",
  "MERGE",
  "SUPERSEDE",
] as const;

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

export function topLevelOp(op: TriageOp): "CREATE" | "UPDATE" | "DELETE" | "SPLIT" | "MERGE" | "SUPERSEDE" {
  if (typeof op === "string") {
    return op;
  }
  return "UPDATE";
}

export function subOp(op: TriageOp): TriageUpdateSubOp | null {
  return isUpdateOp(op) ? op.update : null;
}

const STOP_TOKENS = new Set([
  "the","a","an","to","of","and","or","for","in","on","with","from",
  "is","are","be","this","that","new","add","update","change","fix",
  "remove","delete","support","enable","make","do","into","by","at","as",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9぀-ヿ㐀-鿿]+/)
      .filter((t) => t.length >= 2 && !STOP_TOKENS.has(t)),
  );
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

/**
 * Find the active spec whose title/capability/scope shares the most
 * subject tokens with the requirement. Tie-breaker: smaller acCount,
 * then lexicographic specId. Returns undefined when no token overlap
 * exists with any active spec — that is the only condition under which
 * `classifyTriage` proposes CREATE.
 */
export function bestSubjectMatch(
  subject: string,
  summaries: SpecSummary[],
): SpecSummary | undefined {
  const reqTokens = tokenize(subject);
  if (reqTokens.size === 0) return undefined;

  let best: { score: number; summary: SpecSummary } | undefined;
  for (const s of summaries) {
    if (s.status !== "active") continue;
    const haystack = [s.title, s.capability ?? "", ...s.scopeIn, ...s.scopeOut].join(" ");
    const score = overlapCount(reqTokens, tokenize(haystack));
    if (score === 0) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && s.acCount < best.summary.acCount) ||
      (score === best.score &&
        s.acCount === best.summary.acCount &&
        s.specId < best.summary.specId)
    ) {
      best = { score, summary: s };
    }
  }
  return best?.summary;
}

/**
 * Append-first triage classifier.
 *
 * Decision order per REQ:
 *
 * 1. removalHint -> UPDATE:REMOVE on a capability-matched spec, or on the
 *    closest subject-overlap match. Falls through to DELETE only when no
 *    active spec can absorb the removal.
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
      const target = capabilityMatches[0] ?? bestSubjectMatch(req.subject, active);
      if (target) {
        rows.push({
          source: req.id,
          subject: req.subject,
          existingSpec: target.specId,
          op: { update: "REMOVE" },
        });
      } else {
        rows.push({
          source: req.id,
          subject: req.subject,
          existingSpec: null,
          op: "DELETE",
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

    rows.push({
      source: req.id,
      subject: req.subject,
      existingSpec: null,
      op: "CREATE",
      rationale: "no active spec scope absorbs this requirement; new CAP required",
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
    ];
    lines.push(`| ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines.join("\n");
}

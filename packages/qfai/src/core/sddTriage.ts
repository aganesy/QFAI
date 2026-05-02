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

/**
 * Classify each requirement into an operation against the existing specs.
 * The classifier favours minimal change: APPEND when a capability already
 * owns the requirement, SPLIT when the owning spec is over the size
 * thresholds, and CREATE only when no active spec matches.
 */
export function classifyTriage(input: TriageInput): TriageRow[] {
  const thresholds = input.thresholds ?? DEFAULT_TRIAGE_THRESHOLDS;
  const activeSummaries = input.summaries.filter((s) => s.status === "active");
  const rows: TriageRow[] = [];

  for (const req of input.reqs) {
    const matches = req.capability
      ? activeSummaries.filter((s) => s.capability === req.capability)
      : [];

    if (matches.length === 0) {
      rows.push({
        source: req.id,
        subject: req.subject,
        existingSpec: null,
        op: "CREATE",
      });
      continue;
    }

    if (matches.length > 1) {
      rows.push({
        source: req.id,
        subject: req.subject,
        existingSpec: matches.map((m) => m.specId).join("+"),
        op: "MERGE",
      });
      continue;
    }

    const target = matches[0];
    if (!target) {
      rows.push({
        source: req.id,
        subject: req.subject,
        existingSpec: null,
        op: "CREATE",
      });
      continue;
    }

    if (req.removalHint) {
      rows.push({
        source: req.id,
        subject: req.subject,
        existingSpec: target.specId,
        op: { update: "REMOVE" },
      });
      continue;
    }

    const tooLarge = target.acCount > thresholds.ac || target.tcCount > thresholds.tc;
    rows.push({
      source: req.id,
      subject: req.subject,
      existingSpec: target.specId,
      op: tooLarge ? "SPLIT" : { update: "APPEND" },
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

/**
 * Decision Record shape, shared by the ledger's `DR-ID` resolver and the
 * re-open gate.
 *
 * The Delta Rejected Guard requires a `[RE-OPEN]` decision record before a
 * candidate listed under a delta's `## Rejected` may be re-adopted, and four
 * reviewer agents block on it. The marker existed only in prose: no status
 * value, no field carrying the prior `DR-*`, no field carrying the approval,
 * and nothing that could tell a valid re-open from a sentence typed into a PR
 * description. This module gives the record a parsed shape so the guard can
 * fail for the right reason.
 *
 * The declaration collector lived in `validators/tddList.ts`; it moved here so
 * the ledger resolver and the re-open gate read the same two files rather than
 * growing a second reader that could disagree about where a `DR-*` may live.
 */

import path from "node:path";

import { exists, readSafe } from "./validators/utils.js";

/**
 * The `DR-*` id class: policy-level `DR-NNNN` or spec-scoped `DR-NNNN-MMMM`.
 *
 * Kept in step with `ids.ts#STRICT_ID_PATTERNS.DR` — anchored here because both
 * consumers validate one cell or one field value rather than scanning prose.
 */
export const DR_ID_FORMAT = /^DR-\d{4}(?:-\d{4})?$/;

/** Files a `DR-*` may be declared in, relative to the spec dir / specs root. */
export const DR_DECLARATION_FILES = ["07_Decisions.md"];
export const DR_POLICY_DECLARATION_FILE = path.join("_policies", "08_Decisions.md");

/** The `Status:` value that marks a decision record as a `[RE-OPEN]`. */
export const RE_OPEN_STATUS = "re-open";

/**
 * One `### DR-*` block, reduced to the fields the re-open gate needs.
 *
 * `null` means the field was absent or carried a placeholder — the two are the
 * same failure for a gate that has to decide whether an approval exists.
 */
export type DecisionRecordEntry = {
  id: string;
  status: string | null;
  reOpens: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
};

/**
 * Every `DR-*` declared for this spec: its own `07_Decisions.md` plus the
 * shared `_policies/08_Decisions.md`.
 *
 * Both files are read, not one: a policy-level decision is cited from spec
 * ledgers, and resolving only against the spec-local file would report every
 * such citation as unresolved.
 */
export async function collectDeclaredDrIds(
  specDir: string,
  specsRoot: string,
): Promise<Set<string>> {
  const declared = new Set<string>();
  const files = [
    ...DR_DECLARATION_FILES.map((name) => path.join(specDir, name)),
    path.join(specsRoot, DR_POLICY_DECLARATION_FILE),
  ];
  for (const file of files) {
    if (!(await exists(file))) continue;
    const text = await readSafe(file);
    for (const match of text.matchAll(/\bDR-\d{4}(?:-\d{4})?\b/g)) {
      declared.add(match[0].toUpperCase());
    }
  }
  return declared;
}

/**
 * The `DR-*` ids **declared** by a `### DR-*` heading, as opposed to merely
 * mentioned.
 *
 * {@link collectDeclaredDrIds} greps the file, which is right for a ledger cell
 * naming a record from outside but wrong for a field inside the same file: a
 * `Re-opens:` line naming a record that does not exist would find its own text
 * and report itself resolved.
 */
export async function collectDeclaredDrHeadingIds(
  specDir: string,
  specsRoot: string,
): Promise<Set<string>> {
  const declared = new Set<string>();
  const files = [
    ...DR_DECLARATION_FILES.map((name) => path.join(specDir, name)),
    path.join(specsRoot, DR_POLICY_DECLARATION_FILE),
  ];
  for (const file of files) {
    if (!(await exists(file))) continue;
    for (const entry of parseDecisionRecordEntries(await readSafe(file))) {
      declared.add(entry.id);
    }
  }
  return declared;
}

/**
 * A value that carries no information: absent, a dash, a `<placeholder>`, or
 * `TBD`. The templates ship every optional field pre-filled with one of these,
 * so treating them as present would make the gate pass on an untouched copy.
 */
export function isPlaceholderValue(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  if (/^[-–—]+$/.test(trimmed)) return true;
  if (/^<.*>$/.test(trimmed)) return true;
  return /^(tbd|todo|n\/a|none|未定)$/i.test(trimmed);
}

/** Strip the decoration a template field carries around its value. */
function cleanValue(raw: string): string {
  return raw
    .replace(/<!--.*?-->/g, "")
    .replace(/`/g, "")
    .trim();
}

/** `Approved by` and `Approved-by` are the same field to a reader. */
function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

const HEADING_RE = /^#{2,6}\s+(DR-[A-Za-z0-9][A-Za-z0-9-]*)\s*[:：]?/;
const FIELD_RE = /^\s*[-*]\s*([A-Za-z][A-Za-z -]*?)\s*[:：]\s*(.*)$/;
const FENCE_RE = /^\s*(?:```|~~~)/;

/**
 * Parse the `### DR-*` blocks of a Decisions file.
 *
 * Fenced blocks are skipped: both shipped templates document the entry shape
 * inside prose and a reference file may quote a sample, and a quoted sample is
 * not a declaration.
 */
export function parseDecisionRecordEntries(text: string): DecisionRecordEntry[] {
  const entries: DecisionRecordEntry[] = [];
  let current: DecisionRecordEntry | null = null;
  let inFence = false;

  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = HEADING_RE.exec(line);
    if (heading?.[1]) {
      current = {
        id: heading[1].toUpperCase(),
        status: null,
        reOpens: null,
        approvedBy: null,
        approvedAt: null,
      };
      entries.push(current);
      continue;
    }
    if (!current) continue;

    const field = FIELD_RE.exec(line);
    if (!field?.[1]) continue;
    const key = normalizeKey(field[1]);
    const value = cleanValue(field[2] ?? "");
    if (key === "status") current.status = value.toLowerCase();
    else if (key === "re-opens") current.reOpens = value;
    else if (key === "approved-by") current.approvedBy = value;
    else if (key === "approved-at") current.approvedAt = value;
  }

  return entries;
}

/** The `[RE-OPEN]` records declared in a Decisions file, by id. */
export function collectReOpenEntries(text: string): DecisionRecordEntry[] {
  return parseDecisionRecordEntries(text).filter((entry) => entry.status === RE_OPEN_STATUS);
}

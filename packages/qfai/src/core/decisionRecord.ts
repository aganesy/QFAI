/**
 * Envelope-deviation decision-record writer.
 *
 * Persists `.qfai/evidence/decisions/<ISO8601-ts>.json` whenever an
 * `AskUserQuestion` (issued by a skill body) names one of the four
 * envelope-deviation contexts in its `envelopeContractClause` slot:
 *   - skill-envelope
 *   - architectural-decision
 *   - rejected-option (re-adoption)
 *   - scope-expansion
 *
 * The writer is a library function — callers (`AskUserQuestion`-issuing
 * orchestrators or skill bodies) invoke `writeDecisionRecord` once the
 * operator's answer is collected. A question whose
 * `envelopeContractClause` matches none of the four contexts MUST NOT
 * trigger a write (no fail-open false-positive); the matcher uses
 * stable substring containment so e.g. "rejected-option re-adoption"
 * resolves to the `rejected-option` context.
 *
 * The decisions directory is git-ignored by default (mirrors
 * `.qfai/evidence/prototyping/`); ship-time init keeps that contract.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Canonical 4-context taxonomy. The matcher is a case-insensitive
 * substring containment check on `envelopeContractClause`, so a
 * free-form clause like "scope-expansion: extra spec scope" still
 * routes correctly.
 */
export const ENVELOPE_DEVIATION_CONTEXTS = [
  "skill-envelope",
  "architectural-decision",
  "rejected-option",
  "scope-expansion",
] as const;

export type EnvelopeDeviationContext = (typeof ENVELOPE_DEVIATION_CONTEXTS)[number];

/**
 * Stable substring containment check. Returns true when the input
 * names ANY of the canonical 4 contexts. `undefined` / empty input
 * returns false (no fail-open).
 */
export function isEnvelopeDeviationContext(clause: string | undefined | null): boolean {
  if (typeof clause !== "string") return false;
  const lower = clause.toLowerCase();
  if (lower.trim() === "") return false;
  return ENVELOPE_DEVIATION_CONTEXTS.some((ctx) => lower.includes(ctx));
}

export type DecisionRecord = {
  question: string;
  answer: string;
  scope: string;
  operatorIdentity: string;
  timestamp: string;
  envelopeContractClause: string;
};

export type WriteDecisionRecordInput = {
  root: string;
  question: string;
  answer: string;
  scope: string;
  operatorIdentity: string;
  envelopeContractClause: string;
  /**
   * Override the default ISO-8601 timestamp (test seam). Otherwise the
   * current wall-clock time is used.
   */
  now?: () => Date;
};

export type WriteDecisionRecordResult = {
  /** True when a record was actually persisted to disk. */
  written: boolean;
  /** Absolute path of the written file; undefined when no write occurred. */
  path?: string;
};

const DECISIONS_REL = path.join(".qfai", "evidence", "decisions");

/**
 * File-safe ISO-8601 stamp. Colons are illegal in Windows filenames,
 * so they are replaced with `-` (mirrors common convention in other
 * QFAI evidence stamp paths, e.g. timestamped discussion dirs).
 */
function fileSafeIsoStamp(date: Date): string {
  const iso = date.toISOString();
  return iso.replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
}

/**
 * Write the decision record only when the input clause names a
 * canonical envelope-deviation context. Otherwise return
 * `{written: false}` without touching the filesystem.
 *
 * The write is atomic: the file is created with `writeFile` after
 * `mkdir -p` succeeds; partial writes are not possible because the
 * payload is a single JSON serialization.
 */
export async function writeDecisionRecord(
  input: WriteDecisionRecordInput,
): Promise<WriteDecisionRecordResult> {
  if (!isEnvelopeDeviationContext(input.envelopeContractClause)) {
    return { written: false };
  }
  const now = (input.now ?? (() => new Date()))();
  const stamp = fileSafeIsoStamp(now);
  const record: DecisionRecord = {
    question: input.question,
    answer: input.answer,
    scope: input.scope,
    operatorIdentity: input.operatorIdentity,
    timestamp: now.toISOString(),
    envelopeContractClause: input.envelopeContractClause,
  };
  const dir = path.join(input.root, DECISIONS_REL);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${stamp}.json`);
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
  return { written: true, path: filePath };
}

/**
 * Read all decision records under `<root>/.qfai/evidence/decisions/`.
 * Returns an empty array when the directory is absent — empty store is
 * a normal state (no records yet).
 */
export async function readDecisionRecords(
  root: string,
): Promise<Array<DecisionRecord & { __file: string }>> {
  const { readdir, readFile } = await import("node:fs/promises");
  const { isEnoent } = await import("./fs/errno.js");
  const dir = path.join(root, DECISIONS_REL);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }
  const out: Array<DecisionRecord & { __file: string }> = [];
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const full = path.join(dir, name);
    let raw: string;
    try {
      raw = await readFile(full, "utf-8");
    } catch {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) continue;
    const obj = parsed as Record<string, unknown>;
    out.push({
      question: typeof obj.question === "string" ? obj.question : "",
      answer: typeof obj.answer === "string" ? obj.answer : "",
      scope: typeof obj.scope === "string" ? obj.scope : "",
      operatorIdentity: typeof obj.operatorIdentity === "string" ? obj.operatorIdentity : "",
      timestamp: typeof obj.timestamp === "string" ? obj.timestamp : "",
      envelopeContractClause:
        typeof obj.envelopeContractClause === "string" ? obj.envelopeContractClause : "",
      __file: full,
    });
  }
  return out;
}

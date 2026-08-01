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
 * A decision record carries the operator's approval and cannot be
 * regenerated, so — unlike the regenerable stage evidence beside it —
 * `.qfai/evidence/decisions/` is re-included by the managed `.gitignore`
 * block `qfai init` writes (`QFAI_GITIGNORE_GOVERNANCE_NEGATIONS`).
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
 * so they are replaced with `-`. The millisecond component is
 * RETAINED so two writes within the same second do not collide on
 * disk and overwrite each other — envelope-deviation records are
 * audit evidence and a silent overwrite would lose decision history.
 * Dots are also `-`-replaced so the stamp ends up as a single
 * filename-safe token without a stray `.` separator (e.g.
 * `2026-05-28T15-42-31-123Z`).
 */
function fileSafeIsoStamp(date: Date): string {
  const iso = date.toISOString();
  return iso.replace(/[:.]/g, "-");
}

/**
 * Write the decision record only when the input clause names a
 * canonical envelope-deviation context. Otherwise return
 * `{written: false}` without touching the filesystem.
 *
 * The write is atomic and collision-safe: the file is created with
 * `writeFile({ flag: "wx" })` (exclusive-create) after `mkdir -p`
 * succeeds. If two callers produce the same millisecond-precision
 * stamp (the previously surfaced race, e.g. rapid consecutive
 * `AskUserQuestion` callbacks or a test seam returning the same
 * `Date`), the second attempt fails with `EEXIST` and the writer
 * retries with a counter-suffixed filename (`<stamp>-1.json`,
 * `<stamp>-2.json`, ...) until exclusive create succeeds. Partial
 * writes are not possible because the payload is a single JSON
 * serialization.
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
  const payload = `${JSON.stringify(record, null, 2)}\n`;
  // Exclusive-create retry loop. Caps the retry count to a safety
  // bound (1024) so a pathological collision storm cannot spin
  // forever — in practice the first or second attempt always wins
  // because the millisecond stamp is unique under any non-fixed
  // `Date` provider, and the deterministic-`Date` test seam case
  // resolves within a handful of attempts.
  for (let attempt = 0; attempt < 1024; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt}`;
    const filePath = path.join(dir, `${stamp}${suffix}.json`);
    try {
      await writeFile(filePath, payload, { encoding: "utf-8", flag: "wx" });
      return { written: true, path: filePath };
    } catch (err: unknown) {
      // EEXIST = filename taken by a previous millisecond-collision
      // record; bump the suffix and retry. Any other error
      // propagates immediately — partial writes do not happen with
      // exclusive-create + single-call writeFile.
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      if (code !== "EEXIST") {
        throw err;
      }
    }
  }
  // Pathological case: 1024 attempts exhausted in the same
  // millisecond. Surface explicitly rather than overwriting silently.
  throw new Error(
    `writeDecisionRecord: exhausted 1024 suffixed attempts for stamp ${stamp}; ` +
      "millisecond collision storm or directory permission issue.",
  );
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

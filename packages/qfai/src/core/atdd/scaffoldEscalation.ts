/**
 * ATDD scaffold escalation state helpers.
 *
 * Persists per-AC or per-BF attempt counters in `.qfai/state.json`.
 *
 * Two SEPARATE counters live under `atdd`:
 *
 *   {
 *     "atdd": {
 *       // counted by `qfai atdd scaffold` — scaffold-side cycles
 *       "scaffoldAttempts": { "<AC-or-BF-ID>": <count> },
 *       // counted by `qfai validate` — validate-side cycles
 *       "scaffoldValidateCycles": { "<AC-or-BF-ID>": <count> }
 *     }
 *   }
 *
 * Separation rationale: the spec defines escalation in terms of
 * "consecutive `qfai validate` cycles" specifically. A single shared
 * counter that both scaffold and validate increment would mean
 * `qfai atdd scaffold` ran twice + `qfai validate` ran once trips the
 * threshold-3 gate — that violates the spec contract. Each counter has
 * exactly one writer.
 *
 * Counters survive across runs; callers reset them when a placeholder is filled.
 *
 * Persistence goes through `core/state.ts`, the single loader/writer
 * for `.qfai/state.json`. A private copy of that logic here would mean
 * two copies of the same read-failure policy, and the counters live in
 * the same document as `discussion.currentId`: a write that starts
 * from a failed read would erase the other writer's namespace. So the
 * read-modify-write paths use `readStateStrict`, which refuses to
 * merge onto an empty document when the existing file is unreadable.
 *
 * Every mutation runs inside `updateState`, which holds the state-file
 * lock across the read AND the write. Incrementing through a plain
 * load-mutate-store would lose an update whenever two runs (two flows,
 * or two operators) overlap: both read the same snapshot and the later
 * write erases the earlier increment, delaying an escalation.
 */

import { readStateTolerant, updateState } from "../state.js";

/** Default escalation threshold when the config key is absent/invalid. */
export const DEFAULT_SCAFFOLD_ESCALATE_CYCLES = 3;

function attemptKey(id: string): string {
  return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A counter value is a non-negative integer; anything else reads as 0. */
function toCounter(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  ) {
    return value;
  }
  return 0;
}

function readAttemptsMap(
  state: Record<string, unknown> | null,
  mapName: string,
): Record<string, number> {
  if (state === null) return {};
  const atdd = state.atdd;
  if (!isRecord(atdd)) return {};
  const attempts = atdd[mapName];
  if (!isRecord(attempts)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(attempts)) {
    if (typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && v >= 0) {
      out[k] = v;
    }
  }
  return out;
}

async function readMapCount(root: string, mapName: string, id: string): Promise<number> {
  const state = await readStateTolerant(root);
  const attempts = readAttemptsMap(state, mapName);
  return attempts[attemptKey(id)] ?? 0;
}

async function recordAttemptInMap(root: string, mapName: string, id: string): Promise<number> {
  return updateState(root, (existing) => {
    const atddField = existing.atdd;
    const atdd = isRecord(atddField) ? { ...atddField } : {};
    const attemptsField = atdd[mapName];
    const attempts = isRecord(attemptsField) ? { ...attemptsField } : {};
    const key = attemptKey(id);
    const next = toCounter(attempts[key]) + 1;
    attempts[key] = next;
    atdd[mapName] = attempts;
    return { next: { ...existing, atdd }, result: next };
  });
}

async function resetAttemptInMap(root: string, mapName: string, id: string): Promise<void> {
  await updateState(root, (existing) => {
    const noop = { next: null, result: undefined };
    const atddField = existing.atdd;
    if (!isRecord(atddField)) return noop;
    const atddRecord = { ...atddField };
    const attemptsField = atddRecord[mapName];
    if (!isRecord(attemptsField)) return noop;
    const key = attemptKey(id);
    if (!(key in attemptsField)) return noop;
    const attempts: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(attemptsField)) {
      if (k !== key) {
        attempts[k] = v;
      }
    }
    atddRecord[mapName] = attempts;
    return { next: { ...existing, atdd: atddRecord }, result: undefined };
  });
}

/**
 * Read the current scaffold-side attempt counter for an AC or BF ID.
 * Returns 0 when no counter has been recorded.
 *
 * Writer: `qfai atdd scaffold` only.
 */
export async function readScaffoldAttempts(root: string, id: string): Promise<number> {
  return readMapCount(root, "scaffoldAttempts", id);
}

/**
 * Increment the scaffold-side attempt counter by 1.
 *
 * Writer: `qfai atdd scaffold` only — validate MUST NOT call this.
 */
export async function recordScaffoldAttempt(root: string, id: string): Promise<number> {
  return recordAttemptInMap(root, "scaffoldAttempts", id);
}

/**
 * Reset the scaffold-side attempt counter to 0 (or remove the entry).
 *
 * Writer: `qfai atdd scaffold` only.
 */
export async function resetScaffoldAttempt(root: string, id: string): Promise<void> {
  return resetAttemptInMap(root, "scaffoldAttempts", id);
}

/**
 * Read the current validate-side cycle counter for an AC or BF ID.
 * Returns 0 when no counter has been recorded.
 *
 * Writer: `qfai validate` (scaffoldPlaceholder validator) only.
 */
export async function readValidateCycles(root: string, id: string): Promise<number> {
  return readMapCount(root, "scaffoldValidateCycles", id);
}

/**
 * Increment the validate-side cycle counter by 1.
 *
 * Writer: `qfai validate` (scaffoldPlaceholder validator) only — the
 * scaffold command MUST NOT call this. The two counters MUST stay
 * single-writer to keep the spec's "consecutive `qfai validate` cycles"
 * semantics intact (one `qfai atdd scaffold` invocation does not count
 * toward the validate cycle).
 */
export async function recordValidateCycle(root: string, id: string): Promise<number> {
  return recordAttemptInMap(root, "scaffoldValidateCycles", id);
}

/**
 * Reset the validate-side cycle counter to 0 (or remove the entry).
 *
 * Called by the validator when it observes that a previously-tracked
 * AC or BF ID no longer has an unfilled placeholder, so the
 * "consecutive cycles" semantics survives an interleaving where the
 * operator fills the placeholder then only re-runs `qfai validate`
 * (without `qfai atdd scaffold`).
 */
export async function resetValidateCycle(root: string, id: string): Promise<void> {
  return resetAttemptInMap(root, "scaffoldValidateCycles", id);
}

/**
 * Enumerate AC and BF IDs that currently have a non-zero
 * validate-side cycle counter, so the validator can reset stale entries
 * (placeholder filled / file deleted) without enumerating the test
 * tree twice. Entries whose key does not match the AC/BF grammar are
 * silently skipped.
 */
export async function listValidateCycleKeys(root: string): Promise<string[]> {
  const state = await readStateTolerant(root);
  const map = readAttemptsMap(state, "scaffoldValidateCycles");
  const out: string[] = [];
  for (const key of Object.keys(map)) {
    if (/^(?:AC-\d{4}-\d{4}-\d{2}|BF-\d{4})$/u.test(key)) out.push(key);
  }
  return out;
}

/**
 * Centralized threshold resolver. Honors `0` as a valid value meaning
 * "escalation disabled" (so a user can opt out via config). Rejects
 * negative / non-integer / non-finite values and falls back to `default`.
 *
 * Single SSOT shared by `qfai validate` (scaffoldPlaceholder validator)
 * and `qfai atdd scaffold` so the same config key has one meaning
 * everywhere.
 */
export function resolveEscalateThreshold(
  configured: number | undefined,
  defaultCycles: number = DEFAULT_SCAFFOLD_ESCALATE_CYCLES,
): number {
  if (
    typeof configured === "number" &&
    Number.isFinite(configured) &&
    Number.isInteger(configured) &&
    configured >= 0
  ) {
    return configured;
  }
  return defaultCycles;
}

/**
 * Pure decision helper. Returns true once the attempt count has reached
 * or exceeded the configured threshold. A `threshold <= 0` means
 * "escalation disabled" and never returns true.
 */
export function shouldEscalate(attempts: number, threshold: number): boolean {
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return false;
  }
  return attempts >= threshold;
}

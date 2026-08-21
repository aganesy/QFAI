/**
 * ATDD scaffold escalation state helpers.
 *
 * Persists per-(spec, TC) attempt counters in the existing
 * `.qfai/state.json` SSOT (alongside `discussion.currentId`).
 *
 * Two SEPARATE counters live under `atdd`:
 *
 *   {
 *     "atdd": {
 *       // counted by `qfai atdd scaffold` — scaffold-side cycles
 *       "scaffoldAttempts": { "<specId>:<tcId>": <count> },
 *       // counted by `qfai validate` — validate-side cycles
 *       "scaffoldValidateCycles": { "<specId>:<tcId>": <count> }
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
 * Counters survive across runs; callers reset them when they observe
 * progress on a given TC (the placeholder shape is gone).
 *
 * Persistence goes through `core/state.ts`, the single loader/writer
 * for `.qfai/state.json`. A private copy of that logic here would mean
 * two copies of the same read-failure policy, and the counters live in
 * the same document as `discussion.currentId`: a write that starts
 * from a failed read would erase the other writer's namespace. So the
 * read-modify-write paths use `readStateStrict`, which refuses to
 * merge onto an empty document when the existing file is unreadable.
 */

import { readStateStrict, readStateTolerant, writeStateFile } from "../state.js";

/** Default escalation threshold when the config key is absent/invalid. */
export const DEFAULT_SCAFFOLD_ESCALATE_CYCLES = 3;

function attemptKey(specId: string, tcId: string): string {
  return `${specId}:${tcId}`;
}

function readAttemptsMap(
  state: Record<string, unknown> | null,
  mapName: string,
): Record<string, number> {
  if (state === null) return {};
  const atdd = state.atdd;
  if (atdd === null || typeof atdd !== "object" || Array.isArray(atdd)) {
    return {};
  }
  const attempts = (atdd as Record<string, unknown>)[mapName];
  if (attempts === null || typeof attempts !== "object" || Array.isArray(attempts)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(attempts as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && v >= 0) {
      out[k] = v;
    }
  }
  return out;
}

async function readMapCount(
  root: string,
  mapName: string,
  specId: string,
  tcId: string,
): Promise<number> {
  const state = await readStateTolerant(root);
  const attempts = readAttemptsMap(state, mapName);
  return attempts[attemptKey(specId, tcId)] ?? 0;
}

async function recordAttemptInMap(
  root: string,
  mapName: string,
  specId: string,
  tcId: string,
): Promise<number> {
  const existing = (await readStateStrict(root)) ?? {};
  const atddField = existing.atdd;
  const atdd =
    atddField !== null && typeof atddField === "object" && !Array.isArray(atddField)
      ? { ...(atddField as Record<string, unknown>) }
      : {};
  const attemptsField = atdd[mapName];
  const attempts =
    attemptsField !== null && typeof attemptsField === "object" && !Array.isArray(attemptsField)
      ? { ...(attemptsField as Record<string, unknown>) }
      : {};
  const key = attemptKey(specId, tcId);
  const previousRaw = attempts[key];
  const previous =
    typeof previousRaw === "number" &&
    Number.isFinite(previousRaw) &&
    Number.isInteger(previousRaw) &&
    previousRaw >= 0
      ? previousRaw
      : 0;
  const next = previous + 1;
  attempts[key] = next;
  atdd[mapName] = attempts;
  const updated: Record<string, unknown> = { ...existing, atdd };
  await writeStateFile(root, updated);
  return next;
}

async function resetAttemptInMap(
  root: string,
  mapName: string,
  specId: string,
  tcId: string,
): Promise<void> {
  const existing = await readStateStrict(root);
  if (existing === null) return;
  const atddField = existing.atdd;
  if (atddField === null || typeof atddField !== "object" || Array.isArray(atddField)) {
    return;
  }
  const atddRecord = { ...(atddField as Record<string, unknown>) };
  const attemptsField = atddRecord[mapName];
  if (attemptsField === null || typeof attemptsField !== "object" || Array.isArray(attemptsField)) {
    return;
  }
  const sourceAttempts = attemptsField as Record<string, unknown>;
  const key = attemptKey(specId, tcId);
  if (!(key in sourceAttempts)) {
    return;
  }
  const attempts: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(sourceAttempts)) {
    if (k !== key) {
      attempts[k] = v;
    }
  }
  atddRecord[mapName] = attempts;
  const updated: Record<string, unknown> = { ...existing, atdd: atddRecord };
  await writeStateFile(root, updated);
}

/**
 * Read the current scaffold-side attempt counter for a (spec, TC) pair.
 * Returns 0 when no counter has been recorded.
 *
 * Writer: `qfai atdd scaffold` only.
 */
export async function readScaffoldAttempts(
  root: string,
  specId: string,
  tcId: string,
): Promise<number> {
  return readMapCount(root, "scaffoldAttempts", specId, tcId);
}

/**
 * Increment the scaffold-side attempt counter by 1.
 *
 * Writer: `qfai atdd scaffold` only — validate MUST NOT call this.
 */
export async function recordScaffoldAttempt(
  root: string,
  specId: string,
  tcId: string,
): Promise<number> {
  return recordAttemptInMap(root, "scaffoldAttempts", specId, tcId);
}

/**
 * Reset the scaffold-side attempt counter to 0 (or remove the entry).
 *
 * Writer: `qfai atdd scaffold` only.
 */
export async function resetScaffoldAttempt(
  root: string,
  specId: string,
  tcId: string,
): Promise<void> {
  return resetAttemptInMap(root, "scaffoldAttempts", specId, tcId);
}

/**
 * Read the current validate-side cycle counter for a (spec, TC) pair.
 * Returns 0 when no counter has been recorded.
 *
 * Writer: `qfai validate` (scaffoldPlaceholder validator) only.
 */
export async function readValidateCycles(
  root: string,
  specId: string,
  tcId: string,
): Promise<number> {
  return readMapCount(root, "scaffoldValidateCycles", specId, tcId);
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
export async function recordValidateCycle(
  root: string,
  specId: string,
  tcId: string,
): Promise<number> {
  return recordAttemptInMap(root, "scaffoldValidateCycles", specId, tcId);
}

/**
 * Reset the validate-side cycle counter to 0 (or remove the entry).
 *
 * Called by the validator when it observes that a previously-tracked
 * (spec, TC) pair no longer has an unfilled placeholder, so the
 * "consecutive cycles" semantics survives an interleaving where the
 * operator fills the placeholder then only re-runs `qfai validate`
 * (without `qfai atdd scaffold`).
 */
export async function resetValidateCycle(
  root: string,
  specId: string,
  tcId: string,
): Promise<void> {
  return resetAttemptInMap(root, "scaffoldValidateCycles", specId, tcId);
}

/**
 * Enumerate the set of (spec, TC) keys that currently have a non-zero
 * validate-side cycle counter, so the validator can reset stale entries
 * (placeholder filled / file deleted) without enumerating the test
 * tree twice. Returns parsed `{ specId, tcId }` pairs; entries whose
 * key does not match the canonical `spec-NNNN:TC-NNNN-NNNN` shape are
 * silently skipped.
 */
export async function listValidateCycleKeys(
  root: string,
): Promise<Array<{ specId: string; tcId: string }>> {
  const state = await readStateTolerant(root);
  const map = readAttemptsMap(state, "scaffoldValidateCycles");
  const out: Array<{ specId: string; tcId: string }> = [];
  for (const key of Object.keys(map)) {
    const m = /^(spec-\d{3,4}):(TC-\d{4}-\d{4})$/u.exec(key);
    if (m !== null && typeof m[1] === "string" && typeof m[2] === "string") {
      out.push({ specId: m[1], tcId: m[2] });
    }
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

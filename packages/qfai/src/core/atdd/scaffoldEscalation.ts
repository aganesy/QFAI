/**
 * ATDD scaffold escalation state helpers.
 *
 * Persists per-(spec, TC) attempt counters in the existing
 * `.qfai/state.json` SSOT (alongside `discussion.currentId`). Keys live
 * under the top-level `atdd.scaffoldAttempts` map:
 *
 *   { "atdd": { "scaffoldAttempts": { "<specId>:<tcId>": <count> } } }
 *
 * Counters survive across runs; callers reset them when they observe
 * progress on a given TC (the placeholder shape is gone).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STATE_REL = path.join(".qfai", "state.json");

function stateAbsPath(root: string): string {
  return path.join(root, STATE_REL);
}

function attemptKey(specId: string, tcId: string): string {
  return `${specId}:${tcId}`;
}

async function loadState(root: string): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await readFile(stateAbsPath(root), "utf-8");
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function writeState(root: string, state: Record<string, unknown>): Promise<void> {
  const abs = stateAbsPath(root);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

function readAttemptsMap(state: Record<string, unknown> | null): Record<string, number> {
  if (state === null) return {};
  const atdd = state.atdd;
  if (atdd === null || typeof atdd !== "object" || Array.isArray(atdd)) {
    return {};
  }
  const attempts = (atdd as Record<string, unknown>).scaffoldAttempts;
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

/**
 * Read the current attempt counter for a (spec, TC) pair. Returns 0
 * when no counter has been recorded (file missing, malformed, or
 * `atdd.scaffoldAttempts[<key>]` absent).
 */
export async function readScaffoldAttempts(
  root: string,
  specId: string,
  tcId: string,
): Promise<number> {
  const state = await loadState(root);
  const attempts = readAttemptsMap(state);
  return attempts[attemptKey(specId, tcId)] ?? 0;
}

/**
 * Increment the attempt counter for a (spec, TC) pair by 1 and persist
 * the updated state. Creates the file when absent and preserves
 * unrelated top-level keys.
 */
export async function recordScaffoldAttempt(
  root: string,
  specId: string,
  tcId: string,
): Promise<number> {
  const existing = (await loadState(root)) ?? {};
  const atddField = existing.atdd;
  const atdd =
    atddField !== null && typeof atddField === "object" && !Array.isArray(atddField)
      ? { ...(atddField as Record<string, unknown>) }
      : {};
  const attemptsField = atdd.scaffoldAttempts;
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
  atdd.scaffoldAttempts = attempts;
  const updated: Record<string, unknown> = { ...existing, atdd };
  await writeState(root, updated);
  return next;
}

/**
 * Reset the attempt counter for a (spec, TC) pair to 0 (or remove the
 * entry entirely). Called when the implementer has replaced the
 * placeholder with a real test (progress observed).
 */
export async function resetScaffoldAttempt(
  root: string,
  specId: string,
  tcId: string,
): Promise<void> {
  const existing = await loadState(root);
  if (existing === null) return;
  const atddField = existing.atdd;
  if (atddField === null || typeof atddField !== "object" || Array.isArray(atddField)) {
    return;
  }
  const atddRecord = { ...(atddField as Record<string, unknown>) };
  const attemptsField = atddRecord.scaffoldAttempts;
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
  atddRecord.scaffoldAttempts = attempts;
  const updated: Record<string, unknown> = { ...existing, atdd: atddRecord };
  await writeState(root, updated);
}

/**
 * Pure decision helper. Returns true once the attempt count has reached
 * or exceeded the configured threshold.
 */
export function shouldEscalate(attempts: number, threshold: number): boolean {
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return false;
  }
  return attempts >= threshold;
}

/**
 * Pure helper that normalises operator-supplied `primarySpecId` inputs
 * into the canonical 4-digit zero-padded form (e.g. `"0001"`) and emits a
 * deterministic error message for unparseable / out-of-range values.
 *
 * Acceptance: `1`, `"1"`, `"01"`, `"0001"` all normalise to `"0001"`.
 * Inputs outside `[1, 9999]` (zero, negative, > 9999) and inputs that
 * are neither integer-coercible numbers nor digit strings are rejected.
 *
 * The error message string is anchored by the unit test ledger; any
 * rewording MUST update the test side simultaneously.
 */

export type ParsedPrimarySpecId = { ok: true; normalised: string } | { ok: false; error: string };

const MIN_SPEC_NUMBER = 1;
const MAX_SPEC_NUMBER = 9999;

function buildError(rawDisplay: string): string {
  return `primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received ${rawDisplay}`;
}

function isSafePositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_SPEC_NUMBER && value <= MAX_SPEC_NUMBER;
}

export function parsePrimarySpecId(input: unknown): ParsedPrimarySpecId {
  if (typeof input === "number") {
    if (!isSafePositiveInteger(input)) {
      return { ok: false, error: buildError(String(input)) };
    }
    return { ok: true, normalised: String(input).padStart(4, "0") };
  }
  if (typeof input !== "string") {
    return {
      ok: false,
      error: buildError(input === null ? "null" : typeof input),
    };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0 || !/^\d+$/u.test(trimmed)) {
    return { ok: false, error: buildError(input) };
  }
  const numeric = Number(trimmed);
  if (!isSafePositiveInteger(numeric)) {
    return { ok: false, error: buildError(input) };
  }
  return { ok: true, normalised: String(numeric).padStart(4, "0") };
}

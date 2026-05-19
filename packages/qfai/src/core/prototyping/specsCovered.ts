/**
 * SSOT for `prototyping.json#specsCovered` validation. Both
 * `prototypingIterate` (cycle >= 1 hash gate) and `prototypingCertify`
 * (final-spec resolution for the certificate body) need to read the
 * frozen seed and validate it as "non-empty array of non-empty
 * strings". Pre-1.8.9 each command had its own copy of the predicate;
 * this module is the single implementation both call sites import.
 *
 * The contract enforced here:
 *   - input must be an object-shaped record (otherwise `null`)
 *   - `specsCovered` must be an array (otherwise `null`)
 *   - the array must be non-empty (otherwise `null`)
 *   - every entry must be a non-empty string (otherwise `null`)
 *
 * Returning `null` lets each call site decide its own remediation
 * (iterate exits 2 with "missing or malformed"; certify exits 2 with
 * the certificate-binding diagnostic). The 4 null trigger paths are
 * pinned by regression tests to prevent silent decay if the predicate
 * is later refactored.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read the LEGACY single-spec field `prototyping.json#specsCovered`.
 *
 * Despite the "Frozen" prefix in the function name (kept for historical
 * compatibility), this helper does NOT read `frozenSpecsCovered`. It
 * reads the pre-multi-spec `specsCovered` field that cycle 0 still
 * writes as backward-compatible single-spec (resolved primary spec ID).
 * For the multi-spec cycle-0 frozen full UI-bearing set, use
 * {@link readFrozenSpecsCoveredMultiSpec}.
 *
 * Disambiguation cheat-sheet for call sites (codex r3264482141):
 *   - `readFrozenSpecsCovered(record)`          → record.specsCovered          (legacy single-spec field)
 *   - `readFrozenSpecsCoveredMultiSpec(record)` → record.frozenSpecsCovered    (CHG-002 multi-spec field; SSOT)
 *   - `readFrozenSpecsCoveredField(record)`     → record.frozenSpecsCovered    (iterate-local copy)
 *
 * Accepts an arbitrary `unknown` so the `iterate` call site (which
 * already narrowed to a `PrototypingJsonShape` record) and the
 * `certify` call site (which only narrowed to `unknown`) can both
 * use this helper without re-validating the wrapper.
 */
export function readFrozenSpecsCovered(record: unknown): string[] | null {
  if (!isRecord(record)) return null;
  const raw = record.specsCovered;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string" || value.length === 0) return null;
    out.push(value);
  }
  return out;
}

/**
 * Read `prototyping.json#frozenSpecsCovered` from a parsed record.
 *
 * `frozenSpecsCovered` is the cycle-0-frozen FULL UI-bearing spec set
 * (multi-spec). It is distinct from `specsCovered`, which records only
 * the single resolved primary spec for backward compatibility with
 * pre-multi-spec consumers. Per-(spec × screen) gates (e.g. certify's
 * review.json presence check) MUST iterate the multi-spec field so
 * that secondary specs in the frozen set are not silently skipped.
 *
 * Same validation contract as `readFrozenSpecsCovered`: returns `null`
 * when the field is missing, empty, non-array, or carries non-string /
 * empty-string entries. Callers fall back to `readFrozenSpecsCovered`
 * (legacy single-spec field) when this returns `null` so pre-Wave-3
 * evidence still loads.
 */
export function readFrozenSpecsCoveredMultiSpec(record: unknown): string[] | null {
  if (!isRecord(record)) return null;
  const raw = record.frozenSpecsCovered;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string" || value.length === 0) return null;
    out.push(value);
  }
  return out;
}

export type SpecsCoveredDriftResult = {
  drifted: boolean;
  added: string[];
  removed: string[];
};

/**
 * Compare the cycle-0 frozen `specsCovered` set against a caller-provided
 * snapshot of the currently UI-bearing spec set.
 *
 * Pure function: the comparison is performed against the FROZEN value as
 * the baseline (per AC-0012-0049 — mid-run spec-set changes are deferred
 * to the next invocation, never re-derived from the live filesystem at
 * comparison time). The caller is responsible for capturing
 * `currentLive` once (typically via `resolveAllUiBearingSpecs`); this
 * helper does no I/O so the relationship between "what was frozen" and
 * "what is observed" is auditable.
 *
 * Returned shape:
 *   - `added[]`   — IDs present in `currentLive` but missing from
 *                    `frozenSpecsCovered`
 *   - `removed[]` — IDs present in `frozenSpecsCovered` but missing from
 *                    `currentLive`
 *   - `drifted`   — true when either array is non-empty
 *
 * Both output arrays are sorted lexicographically and deduplicated.
 */
export function checkSpecsCoveredDrift(
  frozenSpecsCovered: readonly string[],
  currentLive: readonly string[],
): SpecsCoveredDriftResult {
  const frozenSet = new Set(frozenSpecsCovered);
  const liveSet = new Set(currentLive);
  const added = [...liveSet].filter((id) => !frozenSet.has(id)).sort((a, b) => a.localeCompare(b));
  const removed = [...frozenSet]
    .filter((id) => !liveSet.has(id))
    .sort((a, b) => a.localeCompare(b));
  return {
    drifted: added.length > 0 || removed.length > 0,
    added,
    removed,
  };
}

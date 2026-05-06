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
 * Read `prototyping.json#specsCovered` from a parsed record.
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

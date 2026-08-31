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
 *   - `readFrozenSpecsCoveredMultiSpec(record)` → record.frozenSpecsCovered    (multi-spec field; SSOT)
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

/**
 * Result type for {@link classifyFrozenSpecsCoveredMultiSpec}. Discriminates
 * between three states the certify call site must distinguish:
 *
 *   - `absent` — the `frozenSpecsCovered` key is missing on the record
 *     (or the record itself is invalid). Caller MAY fall back to the
 *     legacy `specsCovered` field for pre-Wave-3 evidence compatibility.
 *   - `malformed` — the key IS present on the record but the value
 *     fails the validation contract (not an array, empty array, contains
 *     a non-string or empty-string entry). Caller MUST fail closed
 *     (exit 2) rather than fall back, because a partially-corrupt frozen
 *     scope could silently downgrade multi-spec certification to the
 *     primary-spec-only legacy field and let missing secondary-spec
 *     review evidence pass unnoticed.
 *   - `ok` — the field is present AND valid; caller uses `value`.
 */
export type FrozenSpecsCoveredClassification =
  | { kind: "absent" }
  | { kind: "malformed"; reason: string }
  | { kind: "ok"; value: string[] };

/**
 * Classifying counterpart to {@link readFrozenSpecsCoveredMultiSpec}.
 *
 * `readFrozenSpecsCoveredMultiSpec` collapses "field missing" and "field
 * present but invalid" into a single `null` return value, which lets
 * call sites that do `readFrozenSpecsCoveredMultiSpec(...) ??
 * readFrozenSpecsCovered(...)` silently downgrade a corrupt multi-spec
 * frozen set to the legacy single-spec `specsCovered` field. In
 * multi-spec runs that downgrade certificates to the primary-spec scope
 * and lets missing secondary-spec review evidence ship a sealed
 * certificate (codex r3270861808 P1 — chatgpt-codex-connector).
 *
 * This classifier preserves the validation contract of the reader but
 * exposes the absent/malformed distinction so the certify call sites
 * can fail closed when the field is present-but-invalid.
 */
export function classifyFrozenSpecsCoveredMultiSpec(
  record: unknown,
): FrozenSpecsCoveredClassification {
  if (!isRecord(record)) {
    return { kind: "absent" };
  }
  if (!Object.prototype.hasOwnProperty.call(record, "frozenSpecsCovered")) {
    return { kind: "absent" };
  }
  // codex r3270923641 (P1, chatgpt-codex-connector): an explicit `null`
  // (or `undefined`) value on a present `frozenSpecsCovered` key is NOT
  // the same as the key being absent. A hand-edited
  // `"frozenSpecsCovered": null` is a corrupt edit that means "the
  // operator wrote the field but it carries no valid scope" — falling
  // back to legacy `specsCovered` here would silently downgrade
  // certification scope and re-open the same multi-spec evidence-gap
  // vector the wave-33 absent-vs-malformed discrimination was meant to
  // close. Treat both `null` and `undefined` on a present key as
  // malformed so certify fails closed.
  const raw = record.frozenSpecsCovered;
  if (raw === null) {
    return { kind: "malformed", reason: "value is null" };
  }
  if (raw === undefined) {
    return { kind: "malformed", reason: "value is undefined" };
  }
  if (!Array.isArray(raw)) {
    return { kind: "malformed", reason: "field is not an array" };
  }
  if (raw.length === 0) {
    return { kind: "malformed", reason: "array is empty" };
  }
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") {
      return { kind: "malformed", reason: "array contains a non-string entry" };
    }
    if (value.length === 0) {
      return { kind: "malformed", reason: "array contains an empty-string entry" };
    }
    out.push(value);
  }
  return { kind: "ok", value: out };
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

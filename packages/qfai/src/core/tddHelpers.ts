/**
 * Shared constants and helpers for TDD list processing.
 * Used by both the tddList validator and the report generator
 * to keep TC-Refs parsing, parent-ID resolution, and layer/status
 * classification in a single source of truth.
 */

/**
 * Layers that are TDD coverage targets.
 *
 * Both spellings of each layer are accepted — the code form used by
 * `06_Test-Cases.md#Level` and the word form used by `tdd/test-list.md#Layer`.
 * The pairing is the crosswalk in `catalog/test-layers.md`; this set and
 * {@link NON_COVERAGE_LAYERS} MUST stay in step with that table.
 */
export const UNIT_COMPONENT_LAYERS = new Set(["unit", "l1", "component", "l2"]);

/**
 * Layers explicitly excluded from TDD coverage targets.
 * Unknown Level values are conservatively included to avoid silent false negatives.
 *
 * Carries both spellings for the same reason as {@link UNIT_COMPONENT_LAYERS}:
 * a spec that writes the mandated code form (`L3`) would otherwise be an
 * unknown value here, be counted as a TDD coverage target, and raise
 * `TDDLIST_TC_NOT_COVERED` for a row the layer policy says is not owed.
 */
export const NON_COVERAGE_LAYERS = new Set([
  "integration",
  "l3",
  "api",
  "l4",
  "e2e",
  "l5",
  "system",
  "acceptance",
]);

/**
 * Determine whether a Level value should be treated as a coverage target.
 * - Known unit/component (`unit`/`L1`, `component`/`L2`) → true
 * - Known non-coverage (integration/api/e2e in either spelling,
 *   plus legacy `system`/`acceptance`) → false
 * - Unknown/unrecognized → true (conservative: avoids silent coverage gaps)
 * - Empty → true (treated same as missing)
 */
export function isCoverageTargetLevel(level: string): boolean {
  const normalized = level.trim().toLowerCase();
  if (normalized.length === 0) return true;
  if (NON_COVERAGE_LAYERS.has(normalized)) return false;
  return true;
}

export const TDD_DONE_STATUSES = new Set(["done", "green", "refactor"]);

/**
 * Split a TC-Refs cell value into individual TC reference strings.
 * Accepts comma, semicolon, or whitespace as delimiters.
 */
export function splitTcRefs(cell: string): string[] {
  return cell
    .trim()
    .split(/[,;\s]+/)
    .filter((r) => r.length > 0);
}

/**
 * Resolve the parent TC-ID from a sub-ID reference.
 * Example: "TC-0001-0001" → "TC-0001".
 * Returns `undefined` when the reference is already a parent-level ID
 * (i.e., has only one numeric segment like "TC-0001").
 */
export function resolveParentTcId(tcRef: string): string | undefined {
  // Only strip when there are at least two -NNNN segments (sub-ID)
  if (!/^TC-\d{4}-\d{4}/i.test(tcRef)) return undefined;
  const parent = tcRef.replace(/-\d{4}$/, "");
  return parent !== tcRef ? parent : undefined;
}

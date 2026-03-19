/**
 * Shared constants and helpers for TDD list processing.
 * Used by both the tddList validator and the report generator
 * to keep TC-Refs parsing, parent-ID resolution, and layer/status
 * classification in a single source of truth.
 */

export const UNIT_COMPONENT_LAYERS = new Set(["unit", "component"]);

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
 * Returns `undefined` when the reference is already a parent-level ID.
 */
export function resolveParentTcId(tcRef: string): string | undefined {
  const parent = tcRef.replace(/-\d{4}$/, "");
  return parent !== tcRef ? parent : undefined;
}

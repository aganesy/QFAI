/**
 * CLI-HANDOFF canonical schema (Pair IV SSOT).
 *
 * Every skill that writes or reads handoff state MUST use this shape
 * (per the spec governance handoff schema acceptance criteria). The
 * minimum field set is:
 *   - companyName?
 *   - primaryUiContract?
 *   - startDate?
 *   - signature?
 *   - entryPattern?
 *   - productScope?
 * All fields are optional; `additionalProperties: true` so skills MAY
 * attach per-skill data under custom keys without violating the
 * contract.
 */

export const HANDOFF_MINIMUM_FIELDS = [
  "companyName",
  "primaryUiContract",
  "startDate",
  "signature",
  "entryPattern",
  "productScope",
] as const;

export type HandoffMinimumField = (typeof HANDOFF_MINIMUM_FIELDS)[number];

/**
 * Canonical (typed) view over the minimum field set. Extra keys are
 * still allowed at runtime — TypeScript callers can extend this
 * intersection with their own per-skill type.
 */
export type CanonicalHandoff = {
  companyName?: string;
  primaryUiContract?: string;
  startDate?: string;
  signature?: string;
  entryPattern?: string;
  productScope?: string;
};

export type HandoffValidationIssue = {
  code: string;
  message: string;
  field?: string;
};

/**
 * Schema-drift code emitted by the SSOT-sync Pair IV reviewer-gate
 * detector. See `handoffSchemaDrift.ts`.
 */
export const HANDOFF_SCHEMA_DRIFT_CODE = "R-HANDOFF-SCHEMA-DRIFT" as const;

/**
 * Validate a handoff payload against the canonical schema. Returns an
 * array of issues; empty array means valid.
 *
 * - Input must be a non-null object (not array, not primitive).
 * - All known fields, if present, must be string.
 * - Unknown keys are allowed (additionalProperties: true).
 */
export function validateHandoff(input: unknown): HandoffValidationIssue[] {
  const issues: HandoffValidationIssue[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    issues.push({
      code: "HANDOFF-SCHEMA-NOT-OBJECT",
      message: "Handoff payload must be a non-null, non-array object.",
    });
    return issues;
  }
  // `Record<string, unknown>` is the structural supertype of any parsed
  // JSON object; per-field reads narrow types explicitly.
  const obj = input as Record<string, unknown>;
  for (const field of HANDOFF_MINIMUM_FIELDS) {
    if (!(field in obj)) continue;
    const value = obj[field];
    if (value !== undefined && typeof value !== "string") {
      issues.push({
        code: "HANDOFF-SCHEMA-FIELD-TYPE",
        message: `Field "${field}" must be a string (got ${typeof value}).`,
        field,
      });
    }
  }
  return issues;
}

/**
 * Parse a handoff record, which is a JSON file, into a plain-object view.
 *
 * It does not enforce the schema; that is `validateHandoff`'s job. It
 * returns `null` when the text is not JSON or its top-level value is not
 * a plain object.
 */
export function parseHandoff(text: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return isRecord(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

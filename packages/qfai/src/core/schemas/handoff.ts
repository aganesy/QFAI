/**
 * CLI-HANDOFF canonical schema (Pair IV SSOT).
 *
 * Every skill that writes or reads handoff state MUST use this shape
 * (per the spec governance handoff schema acceptance criteria). The
 * minimum field set is:
 *   - companyName?
 *   - primarySpecId?
 *   - startDate?
 *   - signature?
 *   - entryPattern?
 *   - productScope?
 * All fields are optional; `additionalProperties: true` so skills MAY
 * attach per-skill data under custom keys without violating the
 * contract. Legacy ad-hoc files (e.g. `session-handoff.yaml`) are
 * accepted during the deprecation window with a
 * `D-HANDOFF-LEGACY-FORMAT` warning emitted by the reader.
 */
export const HANDOFF_MINIMUM_FIELDS = [
  "companyName",
  "primarySpecId",
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
  primarySpecId?: string;
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
 * Diagnostic code surfaced when a legacy ad-hoc file (e.g.
 * `session-handoff.yaml`) is read during the deprecation window. NOT
 * an error: the reader returns the parsed payload AND attaches this
 * warning so callers can route through `qfai handoff upgrade`.
 */
export const HANDOFF_LEGACY_FORMAT_CODE = "D-HANDOFF-LEGACY-FORMAT" as const;

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
  // JSON/YAML object; per-field reads narrow types explicitly.
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
 * Parse a YAML or JSON handoff payload into a `CanonicalHandoff` view
 * plus the full raw object (for legacy / extra-key passthrough).
 *
 * The parser is intentionally permissive on input shape (YAML AND JSON
 * both reduce to a plain object). It does NOT enforce the schema —
 * that is `validateHandoff`'s job; this returns `null` only on JSON
 * parse failure or non-object input.
 */
export function parseHandoffJson(text: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}

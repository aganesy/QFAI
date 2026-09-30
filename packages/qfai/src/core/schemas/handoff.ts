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

import { parse as parseYaml } from "yaml";

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
 * Parse a YAML OR JSON handoff payload into a `Record<string, unknown>`
 * view. The canonical handoff format is YAML (per `references/handoff.md`);
 * JSON parses too, because JSON is a subset of YAML.
 *
 * The parser is intentionally permissive on input shape (both formats
 * reduce to a plain object). It does NOT enforce the schema — that is
 * `validateHandoff`'s job; this returns `null` only when:
 *   - YAML parsing throws (the YAML library accepts JSON, so this
 *     covers both formats),
 *   - the parsed value is `null` (empty document),
 *   - the parsed value is not a plain object (array, scalar).
 *
 * Function-narrow imports (`parse as parseYaml`) keep the tree-shake
 * surface tight; the `yaml` package is already a project dep.
 */
export function parseHandoff(text: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  // Narrow via structural check above (non-null, object, non-array);
  // the YAML library returns `unknown` so this cast is the standard
  // safe-after-guard pattern, not a bare assertion on user data.
  return parsed as Record<string, unknown>;
}

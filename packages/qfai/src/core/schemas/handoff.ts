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
 * contract. A record whose `iterationKind` is `restyle` must also carry
 * the restyle short form's `liveRoutes` and `entryPoints`.
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
 * The fields of the short form a prototyping handoff takes when the loop
 * restyled the live app in place (`iterationKind: "restyle"`): the live
 * routes reviewed, and the stylesheet and motion entry points changed.
 */
export const HANDOFF_RESTYLE_FIELDS = ["iterationKind", "liveRoutes", "entryPoints"] as const;

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
export const HANDOFF_SCHEMA_DRIFT_CODE = "QFAI-HANDOFF-001" as const;

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
  issues.push(...restyleIssues(obj));
  return issues;
}

/** The prototyping loop's iteration kinds a handoff record may name. */
const ITERATION_KINDS: readonly unknown[] = ["prototype", "restyle"];

/**
 * An `iterationKind` names a known kind, and a restyle record names at least
 * one live route and both lists of entry points.
 */
function restyleIssues(obj: Record<string, unknown>): HandoffValidationIssue[] {
  const [kindField, routesField, entryField] = HANDOFF_RESTYLE_FIELDS;
  const kind = obj[kindField];
  if (kind === undefined) return [];
  if (!ITERATION_KINDS.includes(kind)) {
    return [
      {
        code: "HANDOFF-SCHEMA-FIELD-TYPE",
        message: `Field "${kindField}" must be "prototype" or "restyle".`,
        field: kindField,
      },
    ];
  }
  if (kind !== "restyle") return [];
  const issues: HandoffValidationIssue[] = [];
  const routes = obj[routesField];
  if (!isStringList(routes) || routes.length === 0) {
    issues.push({
      code: "HANDOFF-SCHEMA-FIELD-TYPE",
      message: `A restyle handoff needs "${routesField}", a non-empty list of route strings.`,
      field: routesField,
    });
  }
  const entry = obj[entryField];
  if (!isRecord(entry) || !isStringList(entry.stylesheet) || !isStringList(entry.motion)) {
    issues.push({
      code: "HANDOFF-SCHEMA-FIELD-TYPE",
      message: `A restyle handoff needs "${entryField}" with "stylesheet" and "motion" lists of paths.`,
      field: entryField,
    });
  }
  return issues;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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

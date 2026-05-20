/**
 * Prototype handoff schema validation.
 *
 * `.qfai/contracts/design/prototype-handoff.yaml` is the post-loop
 * handoff artifact written by `/qfai-prototyping` and consumed by
 * `/qfai-implement`. It carries a pointer to the final iteration
 * artifact plus the `imageSources[]` license catalog so downstream
 * gates can re-verify license provenance without re-walking the
 * prototype tree.
 *
 * This module exposes a pure validator for the `imageSources[]`
 * portion of that schema. Every entry must carry exactly
 * `{url, license, attribution, source}` — extra fields are rejected
 * (closed schema; protects against schema drift and typos). The
 * validator aggregates every named-field violation in one pass so
 * the writer can fix multiple problems per retry.
 *
 * Mapping a validation failure onto a non-zero process exit code is
 * the caller's responsibility.
 */

/**
 * Closed schema for a single `prototype-handoff.yaml#imageSources[]`
 * entry. All four fields are required strings.
 */
export type ImageSourceEntry = {
  readonly url: string;
  readonly license: string;
  readonly attribution: string;
  readonly source: string;
};

/**
 * The four required keys for an `imageSources[]` entry. Order is the
 * canonical field-listing order used in error messages.
 */
export const IMAGE_SOURCE_REQUIRED_FIELDS = ["url", "license", "attribution", "source"] as const;

export type ImageSourceField = (typeof IMAGE_SOURCE_REQUIRED_FIELDS)[number];

const IMAGE_SOURCE_KNOWN_FIELDS: ReadonlySet<string> = new Set<string>([
  ...IMAGE_SOURCE_REQUIRED_FIELDS,
]);

export type ValidateImageSourcesResult =
  | { readonly ok: true; readonly entries: readonly ImageSourceEntry[] }
  | { readonly ok: false; readonly errors: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCompleteImageSource(
  partial: Partial<Record<ImageSourceField, string>>,
): partial is Record<ImageSourceField, string> {
  return IMAGE_SOURCE_REQUIRED_FIELDS.every((f) => typeof partial[f] === "string");
}

/**
 * Returns `true` when the URL parses as an HTTPS URL.
 *
 * Mirrors the same predicate in `licenseVerify.ts` — handoff schema
 * validation rejects non-https `url` fields up-front so the certify
 * gate does not have to re-run scheme verification on already-validated
 * handoff entries. Per the prototyping CLI contract, every
 * `imageSources[]` row must reference an HTTPS resource.
 */
function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates `imageSources[]` against the closed schema. Returns
 * `{ok: true, entries}` when every entry passes; otherwise
 * `{ok: false, errors}` with one error per offending field (no
 * early return, so writers see the full failure surface).
 *
 * Validation rules:
 *   - input must be an array
 *   - each entry must be a JSON object
 *   - each entry must carry every field in
 *     {@link IMAGE_SOURCE_REQUIRED_FIELDS}, all strings
 *   - extra top-level keys on an entry are rejected
 */
export function validateImageSources(input: unknown): ValidateImageSourcesResult {
  const errors: string[] = [];
  if (!Array.isArray(input)) {
    return { ok: false, errors: ["imageSources must be an array"] };
  }

  const entries: ImageSourceEntry[] = [];
  const inputEntries: readonly unknown[] = input;
  for (let i = 0; i < inputEntries.length; i += 1) {
    const entry: unknown = inputEntries[i];
    if (!isRecord(entry)) {
      errors.push(`imageSources[${i}] must be an object`);
      continue;
    }
    const accepted: Partial<Record<ImageSourceField, string>> = {};
    for (const field of IMAGE_SOURCE_REQUIRED_FIELDS) {
      if (!(field in entry)) {
        errors.push(`imageSources[${i}].${field} is required`);
        continue;
      }
      const value = entry[field];
      if (typeof value !== "string") {
        errors.push(`imageSources[${i}].${field} must be a string`);
        continue;
      }
      if (field === "url" && !isHttpsUrl(value)) {
        // Codex r3264477851: enforce the contract's `url(https)` rule
        // at schema-validation time so the certify gate does not also
        // have to re-check scheme. The most-actionable diagnostic is
        // recorded; `accepted.url` stays unset so the entry never
        // promotes to the typed output.
        errors.push(`imageSources[${i}].url must be an https URL (got ${value})`);
        continue;
      }
      accepted[field] = value;
    }
    for (const key of Object.keys(entry)) {
      if (!IMAGE_SOURCE_KNOWN_FIELDS.has(key)) {
        errors.push(`imageSources[${i}] has unknown field: ${key}`);
      }
    }
    if (isCompleteImageSource(accepted)) {
      entries.push({
        url: accepted.url,
        license: accepted.license,
        attribution: accepted.attribution,
        source: accepted.source,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, entries };
}

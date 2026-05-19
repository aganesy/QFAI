/**
 * License verification for prototype image sources.
 *
 * Prototypes may reference external image hosts (e.g. stock-photo
 * providers). To keep the shipped catalog reproducible we require
 * every referenced image to:
 *
 *   1. originate from an explicitly allow-listed source host, and
 *   2. carry a license string that is registered for that source.
 *
 * This module is a pure function over (sources[], catalog) — it does
 * no I/O and emits one structured error per offending entry so the
 * caller can render aggregate diagnostics. Mapping the
 * `license-not-allowlisted` error onto a non-zero process exit code
 * is the caller's responsibility.
 */

export type ImageSource = {
  readonly url: string;
  readonly source: string;
  readonly license: string;
};

export type LicenseCatalog = {
  readonly allowedSources: readonly string[];
  readonly licenseTiers: { readonly [source: string]: readonly string[] };
};

export type LicenseVerifyError =
  | { code: "license-not-allowlisted"; source: string; url: string }
  | { code: "license-tier-unknown"; source: string; license: string; url: string };

export type LicenseVerifyResult =
  | { ok: true }
  | { ok: false; errors: readonly LicenseVerifyError[] };

/**
 * Verifies every entry in `imageSources` against `catalog`. Returns
 * `{ok: true}` when all entries pass; otherwise `{ok: false, errors}`
 * with one structured error per offending entry (no early return so
 * callers see the full failure surface).
 */
export function licenseVerify(
  imageSources: readonly ImageSource[],
  catalog: LicenseCatalog,
): LicenseVerifyResult {
  const allowed = new Set(catalog.allowedSources);
  const errors: LicenseVerifyError[] = [];

  for (const entry of imageSources) {
    const { source, license, url } = entry;
    if (!allowed.has(source)) {
      errors.push({ code: "license-not-allowlisted", source, url });
      continue;
    }
    const tiers = catalog.licenseTiers[source];
    if (!tiers || !tiers.includes(license)) {
      errors.push({ code: "license-tier-unknown", source, license, url });
    }
  }

  if (errors.length === 0) {
    return { ok: true };
  }
  return { ok: false, errors };
}

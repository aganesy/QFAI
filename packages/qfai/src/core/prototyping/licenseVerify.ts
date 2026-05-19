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
  /**
   * Optional per-source URL host allowlist. When present, every
   * `imageSources[]` entry's URL host (`new URL(url).hostname`) MUST be
   * one of the strings in `sourceHosts[entry.source]`; otherwise the
   * verifier emits `license-host-mismatch`. Closes the
   * source-label-only-bypass flagged by codex r3265260657 (P1): a
   * caller could claim `source: "unsplash"` while pointing at an
   * arbitrary host. Backward-compat: if `sourceHosts` is undefined or
   * the per-source list is undefined, the host check is skipped (old
   * behaviour).
   */
  readonly sourceHosts?: { readonly [source: string]: readonly string[] };
};

export type LicenseVerifyError =
  | { code: "license-not-allowlisted"; source: string; url: string }
  | { code: "license-tier-unknown"; source: string; license: string; url: string }
  | { code: "license-non-https-url"; source: string; url: string }
  | {
      code: "license-host-mismatch";
      source: string;
      expectedHosts: readonly string[];
      url: string;
    };

export type LicenseVerifyResult =
  | { ok: true }
  | { ok: false; errors: readonly LicenseVerifyError[] };

/**
 * Returns `true` when the URL parses as an HTTPS URL.
 *
 * Per the prototyping CLI contract, image sources MUST be HTTPS so the
 * frozen license catalog can be re-fetched deterministically without
 * network MITM risk. `http://`, malformed URLs, or non-string inputs
 * are all rejected as `non-https`.
 */
function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Returns the lowercased hostname of `url` when parseable, else `null`.
 * Lowercased so host comparison is case-insensitive (RFC 3986: host is
 * case-insensitive).
 */
function urlHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Verifies every entry in `imageSources` against `catalog`. Returns
 * `{ok: true}` when all entries pass; otherwise `{ok: false, errors}`
 * with one structured error per offending entry (no early return so
 * callers see the full failure surface).
 *
 * Per the prototyping CLI contract (`.qfai/contracts/cli/qfai-prototyping.md`
 * hard-stop class 3), three failure modes raise exit 66:
 *   - non-allowlisted source host
 *   - unknown license tier for an allowlisted source
 *   - non-HTTPS URL (e.g. plain `http://`, malformed URL string)
 *
 * The non-HTTPS guard runs first per entry so an `http://` URL hitting
 * an allowlisted source is still classified as `license-non-https-url`
 * (the most actionable diagnostic) rather than passing through scheme
 * verification entirely.
 */
export function licenseVerify(
  imageSources: readonly ImageSource[],
  catalog: LicenseCatalog,
): LicenseVerifyResult {
  const allowed = new Set(catalog.allowedSources);
  const errors: LicenseVerifyError[] = [];

  for (const entry of imageSources) {
    const { source, license, url } = entry;
    if (!isHttpsUrl(url)) {
      errors.push({ code: "license-non-https-url", source, url });
      continue;
    }
    if (!allowed.has(source)) {
      errors.push({ code: "license-not-allowlisted", source, url });
      continue;
    }
    // 10th-wave Fix G (codex r3265260657, P1): if the catalog declares
    // `sourceHosts[source]`, bind the claimed source to acceptable URL
    // hosts so a caller cannot claim `source: "unsplash"` with a URL
    // pointing at `https://unapproved.example/img.jpg`. When the
    // `sourceHosts` block (or the per-source entry) is absent the
    // check is skipped — backward-compat with catalogs that pre-date
    // host pinning.
    const expectedHosts = catalog.sourceHosts?.[source];
    if (expectedHosts && expectedHosts.length > 0) {
      const host = urlHost(url);
      if (host === null || !expectedHosts.includes(host)) {
        errors.push({ code: "license-host-mismatch", source, expectedHosts, url });
        continue;
      }
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

import { parse as parseYaml } from "yaml";

export const DESIGN_MD_SHA_HEX_RE = /^[0-9a-f]{64}$/;

/**
 * Single-source lock-sha extractor for `.qfai/contracts/design/DESIGN.md.lock.yaml`.
 *
 * Returns the lower-cased 64-character hex sha256 when the lock yaml
 * carries a well-formed `designMdSha256` scalar; returns `null` when
 *
 *   - the input is not parseable YAML
 *   - the parsed document is not an object-shaped mapping
 *   - `designMdSha256` is missing or empty
 *   - `designMdSha256` is present but is not a 64-character hex string
 *
 * Callers (doctor / designContractReadiness / prototypingIterate) all use
 * this helper so the lock contract is uniform across the codebase.
 */
export function readDesignMdLockSha(text: string): string | null {
  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const value = (parsed as Record<string, unknown>)["designMdSha256"];
  if (typeof value !== "string" || value.length === 0) return null;
  const lower = value.toLowerCase();
  return DESIGN_MD_SHA_HEX_RE.test(lower) ? lower : null;
}

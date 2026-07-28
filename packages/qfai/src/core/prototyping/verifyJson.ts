import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Canonical project-root relative path to the `/qfai-verify` gate artifact.
 *
 * `.qfai/report/` is the canonical report location (post-PR-#207); `validate.json`
 * already lives there. `verify.json` was the only certify gate file still pinned
 * to `.qfai/output/`, with no config key and no fallback — so migrating off
 * `.qfai/output/` broke certification while staying there carried a
 * `D-DEPRECATED-PATH` warning on every run.
 */
export const VERIFY_JSON_REL = ".qfai/report/verify.json" as const;

/** Legacy location, read only when the canonical one is absent. */
export const VERIFY_JSON_LEGACY_REL = ".qfai/output/verify.json" as const;

export type VerifyJsonRead = {
  /** Which location the payload came from; `missing` when neither exists. */
  source: "canonical" | "legacy" | "missing";
  /** Project-root relative path actually read, or the canonical one when missing. */
  rel: string;
  /** Parsed JSON object, or `null` when missing or unparseable. */
  json: Record<string, unknown> | null;
};

async function loadJsonObject(absolutePath: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(absolutePath, "utf-8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Reads `verify.json` canonical-first, falling back to the legacy
 * `.qfai/output/` location. Mirrors the fallback the saas-package gates signal
 * already uses in `prototypingCertify.ts`.
 */
export async function readVerifyJson(root: string): Promise<VerifyJsonRead> {
  const canonical = await loadJsonObject(path.resolve(root, VERIFY_JSON_REL));
  if (canonical) {
    return { source: "canonical", rel: VERIFY_JSON_REL, json: canonical };
  }
  const legacy = await loadJsonObject(path.resolve(root, VERIFY_JSON_LEGACY_REL));
  if (legacy) {
    return { source: "legacy", rel: VERIFY_JSON_LEGACY_REL, json: legacy };
  }
  return { source: "missing", rel: VERIFY_JSON_REL, json: null };
}

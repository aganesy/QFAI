/**
 * License-catalog add-only patch + audit row.
 *
 * The patch file declares additions to the frozen license catalog
 * (`allowedSources[]`, optionally `licenseTiers[*]`). The applier:
 *
 *   - Rejects any deletion (live entry missing from the patch is fine —
 *     "add-only" — but live entry omitted while the patch lists it as
 *     removed is not the supported shape; deletion intent is signalled
 *     by an explicit `remove:` field which is rejected outright).
 *   - Rejects any modification (a key present in both live and patch
 *     whose value differs).
 *   - Appends one audit row per successful apply:
 *       { appliedAt, patchSha256, addedSources[], addedLicenseTiers? }
 *
 * `patchSha256` is computed over the raw patch bytes (sha256 hex digest)
 * so the audit row is reproducible. `addedLicenseTiers` is OPTIONAL: it
 * is omitted on rows produced by patches that only add sources without
 * tier metadata, preserving backward compatibility with the legacy
 * 3-key audit-row shape.
 */

import { createHash } from "node:crypto";

import type { LicenseCatalog } from "./licenseVerify.js";

export type LicensePatch = {
  readonly addedSources?: readonly string[];
  readonly addedLicenseTiers?: Readonly<Record<string, readonly string[]>>;
};

export type LicensePatchAuditRow = {
  readonly appliedAt: string;
  readonly patchSha256: string;
  readonly addedSources: readonly string[];
  /**
   * Tier additions, persisted so the cycle >= 1 replay path can
   * reconstruct `licenseTiers` (not just `allowedSources`). Optional
   * to preserve backward-compat with legacy 3-key rows produced
   * before this field was introduced.
   */
  readonly addedLicenseTiers?: Readonly<Record<string, readonly string[]>>;
};

export type ApplyLicensePatchResult = {
  readonly nextCatalog: LicenseCatalog;
  readonly auditRow: LicensePatchAuditRow;
};

export function computePatchSha256(patchBytes: Buffer): string {
  return createHash("sha256").update(patchBytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate a raw parsed patch object. Rejects any deletion / modification
 * intent. Returns a typed `LicensePatch` or an error message.
 */
export function parseLicensePatch(raw: unknown):
  | { ok: true; patch: LicensePatch }
  | {
      ok: false;
      error: string;
    } {
  if (!isRecord(raw)) {
    return { ok: false, error: "license-patch must be a JSON/YAML object" };
  }
  // Explicit deletion/modification keys are rejected outright so the
  // surface is unambiguously add-only.
  for (const banned of ["removeSources", "removedSources", "remove", "modify", "modifySources"]) {
    if (banned in raw) {
      return {
        ok: false,
        error: `license-patch must be add-only; deletion/modification key "${banned}" is not supported`,
      };
    }
  }
  let addedSources: string[] | undefined;
  if (raw.addedSources !== undefined) {
    if (!Array.isArray(raw.addedSources)) {
      return { ok: false, error: "license-patch.addedSources must be an array of strings" };
    }
    addedSources = [];
    for (const v of raw.addedSources) {
      if (typeof v !== "string" || v.length === 0) {
        return { ok: false, error: "license-patch.addedSources[] must be non-empty strings" };
      }
      addedSources.push(v);
    }
  }
  let addedLicenseTiers: Record<string, string[]> | undefined;
  if (raw.addedLicenseTiers !== undefined) {
    if (!isRecord(raw.addedLicenseTiers)) {
      return {
        ok: false,
        error: "license-patch.addedLicenseTiers must be an object of source -> tiers[]",
      };
    }
    addedLicenseTiers = {};
    for (const [k, v] of Object.entries(raw.addedLicenseTiers)) {
      if (!Array.isArray(v)) {
        return {
          ok: false,
          error: `license-patch.addedLicenseTiers["${k}"] must be an array of strings`,
        };
      }
      const list: string[] = [];
      for (const entry of v) {
        if (typeof entry !== "string" || entry.length === 0) {
          return {
            ok: false,
            error: `license-patch.addedLicenseTiers["${k}"][] must be non-empty strings`,
          };
        }
        list.push(entry);
      }
      addedLicenseTiers[k] = list;
    }
  }
  const out: LicensePatch = {
    ...(addedSources !== undefined ? { addedSources } : {}),
    ...(addedLicenseTiers !== undefined ? { addedLicenseTiers } : {}),
  };
  return { ok: true, patch: out };
}

/**
 * Apply an add-only license patch to the frozen catalog. Existing
 * entries are preserved unchanged; new entries are appended (set-union
 * semantics for `allowedSources`, key-union for `licenseTiers`). The
 * add-only invariant is enforced at parse time by `parseLicensePatch`,
 * which rejects banned deletion/modification keys before this function
 * is reached. Tier-level merging is set-union over the existing tiers,
 * so this call cannot drop or rewrite an existing tier entry.
 */
export function applyLicensePatch(
  live: LicenseCatalog,
  patch: LicensePatch,
  patchBytes: Buffer,
  nowIso: string,
): ApplyLicensePatchResult {
  const liveSources = new Set(live.allowedSources);
  const addedThisPatch: string[] = [];
  for (const src of patch.addedSources ?? []) {
    if (!liveSources.has(src)) {
      addedThisPatch.push(src);
    }
  }
  // Add-only at the tier level: existing entries are preserved
  // unchanged; patch entries are unioned into the existing tier set.
  // `parseLicensePatch` already rejects banned deletion/modification
  // keys (`removeSources`, `modify`, etc.), so this path is reached
  // only with additive intent — a tier present in `live[source]`
  // cannot be dropped or rewritten here.
  const nextLicenseTiers: Record<string, string[]> = Object.fromEntries(
    Object.entries(live.licenseTiers).map(([k, v]) => [k, [...v]]),
  );
  // Capture per-patch tier additions for the audit row so the cycle
  // >= 1 replay path can rebuild `licenseTiers` (not just
  // `allowedSources`). We record only the *delta* against `live`
  // (i.e. tiers not already present for the source) so the audit
  // shape stays minimal and idempotent.
  const addedTiersDelta: Record<string, string[]> = {};
  for (const [source, tiers] of Object.entries(patch.addedLicenseTiers ?? {})) {
    const existing = nextLicenseTiers[source];
    const deltaForSource: string[] = [];
    if (existing === undefined) {
      nextLicenseTiers[source] = [...tiers];
      for (const t of tiers) deltaForSource.push(t);
    } else {
      // Union new tiers into the existing list; existing entries survive
      // unchanged.
      for (const t of tiers) {
        if (!existing.includes(t)) {
          existing.push(t);
          deltaForSource.push(t);
        }
      }
    }
    if (deltaForSource.length > 0) {
      addedTiersDelta[source] = deltaForSource;
    }
  }
  const nextAllowed = [...live.allowedSources, ...addedThisPatch];
  const nextCatalog: LicenseCatalog = {
    allowedSources: nextAllowed,
    licenseTiers: nextLicenseTiers,
    ...(live.sourceHosts !== undefined
      ? {
          sourceHosts: Object.fromEntries(
            Object.entries(live.sourceHosts).map(([k, v]) => [k, [...v]]),
          ),
        }
      : {}),
  };
  const hasTierDelta = Object.keys(addedTiersDelta).length > 0;
  const auditRow: LicensePatchAuditRow = {
    appliedAt: nowIso,
    patchSha256: computePatchSha256(patchBytes),
    addedSources: addedThisPatch,
    ...(hasTierDelta ? { addedLicenseTiers: addedTiersDelta } : {}),
  };
  return { nextCatalog, auditRow };
}

/**
 * Canonical audit-row shape lockdown. Returns `true` when the value is
 * the canonical 3-key shape `{appliedAt, patchSha256, addedSources}`
 * OR the canonical 4-key shape that adds an optional
 * `addedLicenseTiers: Record<string, string[]>` for tier replay
 * (see {@link LicensePatchAuditRow}). The 4th key is OPTIONAL —
 * legacy 3-key rows produced before tier replay was introduced
 * still parse so back-fill is not required.
 *
 * `patchSha256` matches `^[a-f0-9]{64}$` — **lowercase canonical only**.
 * `computePatchSha256` uses Node's `createHash("sha256").digest("hex")`
 * which always returns lowercase hex, so production-written rows pass.
 * Hand-edited or externally-generated rows containing uppercase hex are
 * intentionally rejected to keep the canonical form unambiguous (avoids
 * hash-string drift between case-different siblings). If a future
 * consumer needs to ingest mixed-case rows, normalise to lowercase
 * before validation rather than relaxing the regex with `/i`.
 */
export function isLicensePatchAuditRow(value: unknown): value is LicensePatchAuditRow {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  // Allow exactly the 3 required keys OR those plus `addedLicenseTiers`.
  const required = new Set(["addedSources", "appliedAt", "patchSha256"]);
  const optional = new Set(["addedLicenseTiers"]);
  for (const k of required) {
    if (!keys.includes(k)) return false;
  }
  for (const k of keys) {
    if (!required.has(k) && !optional.has(k)) return false;
  }
  if (typeof value.appliedAt !== "string" || value.appliedAt.length === 0) return false;
  if (typeof value.patchSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.patchSha256)) {
    return false;
  }
  if (!Array.isArray(value.addedSources)) return false;
  if (!value.addedSources.every((v) => typeof v === "string")) return false;
  if (value.addedLicenseTiers !== undefined) {
    if (!isRecord(value.addedLicenseTiers)) return false;
    for (const [source, tiers] of Object.entries(value.addedLicenseTiers)) {
      if (typeof source !== "string" || source.length === 0) return false;
      if (!Array.isArray(tiers)) return false;
      if (!tiers.every((t) => typeof t === "string" && t.length > 0)) return false;
    }
  }
  return true;
}

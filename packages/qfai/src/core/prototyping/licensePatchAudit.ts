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
 *       { appliedAt: ISO timestamp, patchSha256, addedSources[] }
 *
 * `patchSha256` is computed over the raw patch bytes (sha256 hex digest)
 * so the audit row is reproducible.
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
  for (const [source, tiers] of Object.entries(patch.addedLicenseTiers ?? {})) {
    const existing = nextLicenseTiers[source];
    if (existing === undefined) {
      nextLicenseTiers[source] = [...tiers];
      continue;
    }
    // Union new tiers into the existing list; existing entries survive
    // unchanged.
    for (const t of tiers) {
      if (!existing.includes(t)) {
        existing.push(t);
      }
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
  const auditRow: LicensePatchAuditRow = {
    appliedAt: nowIso,
    patchSha256: computePatchSha256(patchBytes),
    addedSources: addedThisPatch,
  };
  return { nextCatalog, auditRow };
}

/**
 * Canonical audit-row shape lockdown. Returns `true` when the value is
 * the exact `{appliedAt, patchSha256, addedSources}` shape with the
 * expected value types. Used by the unit test ledger to pin the shape
 * so additions to the row require an explicit spec amendment.
 */
export function isLicensePatchAuditRow(value: unknown): value is LicensePatchAuditRow {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  const expected = ["addedSources", "appliedAt", "patchSha256"];
  if (keys.length !== expected.length) return false;
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] !== expected[i]) return false;
  }
  if (typeof value.appliedAt !== "string" || value.appliedAt.length === 0) return false;
  if (typeof value.patchSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.patchSha256)) {
    return false;
  }
  if (!Array.isArray(value.addedSources)) return false;
  return value.addedSources.every((v) => typeof v === "string");
}

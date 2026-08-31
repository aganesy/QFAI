import { readdir } from "node:fs/promises";
import path from "node:path";

export type PackKind = "discussion";

export type PackNameStatus = "canonical" | "legacy" | "dangerous" | "other";

export type PackNameValidation = {
  kind: PackKind;
  name: string;
  status: PackNameStatus;
  isCanonical: boolean;
  isLegacy: boolean;
  isDangerous: boolean;
  isPrefixed: boolean;
  timestamp: string | null;
};

export type LocatedPack = {
  kind: PackKind;
  rootDir: string;
  path: string;
  name: string;
  status: PackNameStatus;
  isCanonical: boolean;
  isLegacy: boolean;
  isDangerous: boolean;
  timestamp: string | null;
};

type PackRule = {
  prefix: string;
  legacyPattern: RegExp;
  parkedLegacyPattern: RegExp;
};

const PACK_RULES: Record<PackKind, PackRule> = {
  discussion: {
    prefix: "discussion",
    legacyPattern: /^discussion-\d{4}$/i,
    parkedLegacyPattern: /^discussion-legacy-[a-z0-9][a-z0-9-]*$/i,
  },
};

/**
 * The 17-digit `YYYYMMDDhhmmssSSS` stamp a canonical QFAI artifact name carries.
 *
 * Exported because it is the naming rule, not a pack-local detail: every writer
 * that stamps a name — the discussion packs here, the import-lite evidence file
 * the SDD preflight selects — has to admit exactly the same width, or one of
 * them starts accepting names the other rejects.
 */
export const CANONICAL_TIMESTAMP_RE = /^\d{17}$/;

export function parsePackTimestamp(kind: PackKind, name: string): string | null {
  const rule = PACK_RULES[kind];
  const prefix = `${rule.prefix}-`;
  if (!name.startsWith(prefix)) {
    return null;
  }
  const suffix = name.slice(prefix.length);
  if (!CANONICAL_TIMESTAMP_RE.test(suffix)) {
    return null;
  }
  return suffix;
}

export function validatePackName(kind: PackKind, name: string): PackNameValidation {
  const rule = PACK_RULES[kind];
  const normalizedPrefix = `${rule.prefix}-`;
  const isPrefixed = name.toLowerCase().startsWith(normalizedPrefix);
  const timestamp = parsePackTimestamp(kind, name);
  const isCanonical = timestamp !== null;
  const isLegacy = !isCanonical && rule.legacyPattern.test(name);
  const isParkedLegacy = !isCanonical && rule.parkedLegacyPattern.test(name);
  const isDangerous = isPrefixed && !isCanonical && !isLegacy && !isParkedLegacy;
  const status: PackNameStatus = isCanonical
    ? "canonical"
    : isLegacy
      ? "legacy"
      : isDangerous
        ? "dangerous"
        : "other";

  return {
    kind,
    name,
    status,
    isCanonical,
    isLegacy,
    isDangerous,
    isPrefixed,
    timestamp,
  };
}

export async function findPacks(rootDir: string, kind: PackKind): Promise<LocatedPack[]> {
  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    const packs: LocatedPack[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const validation = validatePackName(kind, entry.name);
      if (validation.status === "other") {
        continue;
      }
      packs.push({
        kind,
        rootDir,
        path: path.join(rootDir, entry.name),
        name: entry.name,
        status: validation.status,
        isCanonical: validation.isCanonical,
        isLegacy: validation.isLegacy,
        isDangerous: validation.isDangerous,
        timestamp: validation.timestamp,
      });
    }

    return packs.sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return [];
  }
}

export function latestPack(packs: readonly LocatedPack[]): LocatedPack | null {
  let latest: LocatedPack | null = null;
  for (const candidate of packs) {
    if (!candidate.isCanonical || !candidate.timestamp) {
      continue;
    }
    if (!latest || isTimestampGreater(candidate.timestamp, latest.timestamp)) {
      latest = candidate;
    }
  }
  return latest;
}

export async function findLatestPack(rootDir: string, kind: PackKind): Promise<LocatedPack | null> {
  const packs = await findPacks(rootDir, kind);
  return latestPack(packs);
}

function isTimestampGreater(left: string, right: string | null): boolean {
  if (!right) {
    return true;
  }
  return BigInt(left) > BigInt(right);
}

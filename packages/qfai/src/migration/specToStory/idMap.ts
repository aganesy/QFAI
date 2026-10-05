import { readFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../../core/fs/errno.js";

/** The migration's working state: the plan, the ID map and the contract map. */
export const MIGRATION_STATE_DIR = "tmp/qfai-migration";
export const ID_MAP_PATH = `${MIGRATION_STATE_DIR}/id-map.json`;
export const CONTRACT_MAP_PATH = `${MIGRATION_STATE_DIR}/contract-map.json`;
export const PLAN_PATH = `${MIGRATION_STATE_DIR}/plan.yaml`;

/**
 * A 1.x contract's new identity, keyed by its old path under `paths.contractsDir`:
 * its new contract ID, its new path under the same directory, and the `CON-*` ID
 * it declared, when it declared one.
 */
export type ContractEntry = { id: string; path: string; old?: string };
export type ContractMap = Record<string, ContractEntry>;

export type MigrationIdMap = {
  version: 1;
  ids: Record<string, Record<string, string>>;
  placements: Record<string, Record<string, string>>;
  retiredPacks: Record<string, string>;
  contracts?: ContractMap;
};

export class IdMapInputError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function isNestedStringMap(value: unknown): value is Record<string, Record<string, string>> {
  return isRecord(value) && Object.values(value).every(isStringMap);
}

function isContractMap(value: unknown): value is ContractMap {
  return (
    isNestedStringMap(value) &&
    Object.values(value).every(
      (entry) =>
        typeof entry.id === "string" &&
        typeof entry.path === "string" &&
        Object.keys(entry).every((key) => ["id", "path", "old"].includes(key)),
    )
  );
}

function isMigrationIdMap(value: unknown): value is MigrationIdMap {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    isNestedStringMap(value.ids) &&
    isNestedStringMap(value.placements) &&
    isStringMap(value.retiredPacks) &&
    (value.contracts === undefined || isContractMap(value.contracts)) &&
    Object.keys(value).every((key) =>
      ["version", "ids", "placements", "retiredPacks", "contracts"].includes(key),
    )
  );
}

/** The contract map step 3 writes, which step 4 copies into the ID map. */
export async function readContractMap(root: string): Promise<ContractMap | null> {
  let content: string;
  try {
    content = await readFile(path.join(root, CONTRACT_MAP_PATH), "utf8");
  } catch (error) {
    if (isEnoent(error)) return null;
    throw new IdMapInputError(`Cannot read ${CONTRACT_MAP_PATH}: ${String(error)}`);
  }
  try {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed) || !isContractMap(parsed.contracts) || Object.keys(parsed).length !== 1)
      throw new TypeError("Unexpected contract map structure");
    return parsed.contracts;
  } catch (error) {
    throw new IdMapInputError(`Cannot parse ${CONTRACT_MAP_PATH}: ${String(error)}`);
  }
}

export function serializeContractMap(contracts: ContractMap): string {
  return `${JSON.stringify({ contracts }, null, 2)}\n`;
}

/** Each old `CON-*` ID one contract declared, mapped to that contract's new ID. */
export function oldContractIds(contracts: ContractMap | undefined): Record<string, string> {
  const byOld = new Map<string, string[]>();
  for (const entry of Object.values(contracts ?? {})) {
    if (entry.old) byOld.set(entry.old, [...(byOld.get(entry.old) ?? []), entry.id]);
  }
  return Object.fromEntries(
    [...byOld].filter(([, ids]) => ids.length === 1).map(([old, ids]) => [old, ids[0] ?? ""]),
  );
}

export function serializeIdMap(map: MigrationIdMap): string {
  if (!isMigrationIdMap(map)) throw new TypeError("Invalid migration ID map");
  return `${JSON.stringify(map, null, 2)}\n`;
}

export async function readIdMap(root: string): Promise<MigrationIdMap | null> {
  const filePath = path.join(root, ID_MAP_PATH);
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    if (isEnoent(error)) {
      return null;
    }
    throw new IdMapInputError(`Cannot read ${ID_MAP_PATH}: ${String(error)}`);
  }
  try {
    const parsed: unknown = JSON.parse(content);
    if (!isMigrationIdMap(parsed)) throw new TypeError("Unexpected ID map structure");
    return parsed;
  } catch (error) {
    throw new IdMapInputError(`Cannot parse ${ID_MAP_PATH}: ${String(error)}`);
  }
}

export async function compareIdMap(root: string, map: MigrationIdMap): Promise<boolean> {
  const existing = await readIdMap(root);
  if (existing === null) return false;
  const sorted = (items: Record<string, string>) =>
    Object.fromEntries(Object.entries(items).sort(([left], [right]) => left.localeCompare(right)));
  const nested = (items: Record<string, Record<string, string>>) =>
    Object.fromEntries(
      Object.entries(items)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, sorted(value)]),
    );
  const normalized = (value: MigrationIdMap) => ({
    version: value.version,
    ids: nested(value.ids),
    placements: nested(value.placements),
    retiredPacks: sorted(value.retiredPacks),
    contracts: nested(value.contracts ?? {}),
  });
  return JSON.stringify(normalized(existing)) === JSON.stringify(normalized(map));
}

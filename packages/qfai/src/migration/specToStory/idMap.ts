import { readFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../../core/fs/errno.js";

export const ID_MAP_PATH = ".qfai/evidence/migration-spec-to-story/id-map.json";

export type MigrationIdMap = {
  version: 1;
  ids: Record<string, Record<string, string>>;
  placements: Record<string, Record<string, string>>;
  retiredPacks: Record<string, string>;
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

function isMigrationIdMap(value: unknown): value is MigrationIdMap {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    isNestedStringMap(value.ids) &&
    isNestedStringMap(value.placements) &&
    isStringMap(value.retiredPacks) &&
    Object.keys(value).every((key) =>
      ["version", "ids", "placements", "retiredPacks"].includes(key),
    )
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
  });
  return JSON.stringify(normalized(existing)) === JSON.stringify(normalized(map));
}

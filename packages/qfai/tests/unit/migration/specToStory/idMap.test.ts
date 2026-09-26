import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ID_MAP_PATH,
  compareIdMap,
  readIdMap,
  serializeIdMap,
  type MigrationIdMap,
} from "../../../../src/migration/specToStory/idMap.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function root(): Promise<string> {
  const value = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-map-"));
  roots.push(value);
  return value;
}

const map: MigrationIdMap = {
  version: 1,
  ids: { "spec-0001": { "US-0001-0001": "US-0001-0001", "TC-0001-0001": "EX-0001-0001-01" } },
  placements: { "spec-0001": { "US-0001-0001": "checkout" } },
  retiredPacks: {},
};

describe("migration ID map", () => {
  it("reads a valid map and compares canonical content without rewriting it", async () => {
    const project = await root();
    const file = path.join(project, ID_MAP_PATH);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, serializeIdMap(map));
    expect(await readIdMap(project)).toEqual(map);
    expect(await compareIdMap(project, map)).toBe(true);
    expect(
      await compareIdMap(project, {
        ...map,
        ids: { "spec-0001": { "TC-0001-0001": "EX-0001-0001-01", "US-0001-0001": "US-0001-0001" } },
      }),
    ).toBe(true);
    expect(await readFile(file, "utf8")).toBe(serializeIdMap(map));
  });

  it("reports a missing map and refuses malformed or changed maps", async () => {
    const project = await root();
    expect(await readIdMap(project)).toBeNull();
    expect(await compareIdMap(project, map)).toBe(false);
    const file = path.join(project, ID_MAP_PATH);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "{bad json");
    await expect(readIdMap(project)).rejects.toThrow(ID_MAP_PATH);
    await writeFile(file, serializeIdMap(map));
    expect(await compareIdMap(project, { ...map, retiredPacks: { "spec-0002": "DEC-0001" } })).toBe(
      false,
    );
  });
});

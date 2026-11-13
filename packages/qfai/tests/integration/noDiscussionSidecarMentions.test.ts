import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets");
const TEXT_EXTENSIONS = new Set([".md", ".yaml", ".yml", ".json", ".toml", ".txt"]);

// The discussion pack and its `uiux/` sidecars were removed. A shipped file that
// still names a discussion or UI/UX sidecar sends an agent looking for files a
// project no longer has.
const STALE_SIDECAR = /(discussion|ui\/ux)[^\n]{0,40}\bsidecars?\b|\bsidecar artifacts\b/i;

async function listTextFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listTextFiles(full);
      }
      return entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
    }),
  );
  return nested.flat();
}

describe("shipped assets after the discussion pack removal", () => {
  it("name no discussion or UI/UX sidecar", async () => {
    const files = await listTextFiles(ASSETS);
    const offenders: string[] = [];
    for (const file of files) {
      const lines = (await readFile(file, "utf8")).split("\n");
      lines.forEach((line, index) => {
        if (STALE_SIDECAR.test(line)) {
          offenders.push(`${path.relative(ASSETS, file)}:${index + 1}`);
        }
      });
    }
    expect(files.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const CONFIG_RELATIVE = "core/config.ts";

// Optional fields that are parsed into the resolved config but not yet consumed by
// any validator/CLI. Each entry is tracked by its own issue; drop the entry once the
// field is wired up. Entries are deliberately not asserted to be *still* unused, so a
// fix landing from another branch cannot turn this guard red.
const PENDING_CONSUMER_FIELDS = new Set<string>([
  "competitive_refs_min", // tracked separately from the requireResearchSummary gate
]);

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function extractOptionalFieldNames(source: string, typeName: string): string[] {
  const declaration = new RegExp(`export type ${typeName} = \\{([\\s\\S]*?)\\n\\};`).exec(source);
  if (!declaration) {
    return [];
  }
  const body = declaration[1] ?? "";
  return [...body.matchAll(/^\s{2}([A-Za-z_][A-Za-z0-9_]*)\?:/gm)].map((match) => match[1] ?? "");
}

describe("uiux config field usage", () => {
  it("every optional QfaiUiuxConfig field is read outside core/config.ts", async () => {
    const srcDir = path.resolve(__dirname, "../../src");
    const configPath = path.join(srcDir, CONFIG_RELATIVE);
    const configSource = await readFile(configPath, "utf-8");

    const fields = extractOptionalFieldNames(configSource, "QfaiUiuxConfig");
    expect(fields.length).toBeGreaterThan(0);

    const otherFiles = (await collectTsFiles(srcDir)).filter(
      (filePath) => path.resolve(filePath) !== path.resolve(configPath),
    );
    const corpus = (
      await Promise.all(otherFiles.map((filePath) => readFile(filePath, "utf-8")))
    ).join("\n");

    const unreferenced = fields.filter(
      (field) => !PENDING_CONSUMER_FIELDS.has(field) && !corpus.includes(field),
    );

    expect(unreferenced).toEqual([]);
  });
});

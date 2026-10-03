/**
 * The direction every import under `src/` may take between the package's layers.
 *
 * | Layer     | May import         |
 * | --------- | ------------------ |
 * | CLI       | Core, Shared       |
 * | Migration | Core, Shared       |
 * | Core      | Shared             |
 * | Shared    | nothing            |
 *
 * A module both the CLI and a migration step need lives in Core, so neither
 * reaches into the other. `src/index.ts`, the package entry, sits above the
 * layers and is not checked.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");

const MAY_IMPORT: Readonly<Record<string, readonly string[]>> = {
  cli: ["core", "shared"],
  migration: ["core", "shared"],
  core: ["shared"],
  shared: [],
};

/** A path under `src/`, with forward slashes on every platform. */
const shown = (file: string): string => path.relative(SRC, file).split(path.sep).join("/");

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return entry.isFile() && entry.name.endsWith(".ts") ? [full] : [];
    }),
  );
  return nested.flat();
}

/** The top-level directory under `src/` that holds `file`, or `null` for a file at its root. */
function layerOf(file: string): string | null {
  const segments = path.relative(SRC, file).split(path.sep);
  return segments.length > 1 ? (segments[0] ?? null) : null;
}

/** Every relative module a file names: static imports, re-exports and `import()` calls. */
function relativeImports(file: string, text: string): string[] {
  const { importedFiles } = ts.preProcessFile(text, true, true);
  return importedFiles
    .map((ref) => ref.fileName)
    .filter((spec) => spec.startsWith("."))
    .map((spec) => path.resolve(path.dirname(file), spec));
}

describe("source layer directions", () => {
  it("every import under src/ follows the layer table", async () => {
    const violations: string[] = [];
    for (const file of await sourceFiles(SRC)) {
      const from = layerOf(file);
      if (from === null) continue;
      const allowed = MAY_IMPORT[from];
      if (allowed === undefined) {
        violations.push(`${shown(file)}: ${from}/ is not a declared layer`);
        continue;
      }
      for (const target of relativeImports(file, await readFile(file, "utf-8"))) {
        const to = layerOf(target);
        if (to === from || (to !== null && allowed.includes(to))) continue;
        violations.push(
          `${shown(file)} imports ${shown(target)}: ${from} may import ${allowed.join(", ") || "nothing"}`,
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it("reads imports, re-exports and dynamic imports", () => {
    const file = path.join(SRC, "migration", "step.ts");
    const text = [
      'import { a } from "../cli/a.js";',
      'export { b } from "../core/b.js";',
      'const c = await import("../shared/c.js");',
      'import d from "node:path";',
    ].join("\n");
    expect(relativeImports(file, text).map(shown)).toEqual([
      "cli/a.js",
      "core/b.js",
      "shared/c.js",
    ]);
  });
});

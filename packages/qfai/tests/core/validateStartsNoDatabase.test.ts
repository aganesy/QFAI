/**
 * `qfai validate` never starts a database engine.
 *
 * That guarantee is why `qfai db-drift` is a separate command, so it is held
 * here as a fact about the source rather than left to the comments that state
 * it: no module `validate.ts` imports, statically or dynamically, reaches the
 * in-process Postgres engine or the module that loads it.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
const VALIDATE_TS = path.join(SRC_ROOT, "core", "validate.ts");
const DRIFT_MODULE = path.join(SRC_ROOT, "core", "dbSchemaDrift.ts");
const ENGINE_PACKAGE = "@electric-sql/pglite";

function resolveRelative(from: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = [
    base.replace(/\.js$/u, ".ts"),
    `${base}.ts`,
    path.join(base, "index.ts"),
    base,
  ];
  return candidates.find((candidate) => candidate.endsWith(".ts") && existsSync(candidate)) ?? null;
}

/** Every source file `entry` reaches, and every package specifier they name. */
async function importClosure(
  entry: string,
): Promise<{ files: Set<string>; packages: Set<string> }> {
  const files = new Set<string>();
  const packages = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || files.has(file)) continue;
    files.add(file);
    const source = await readFile(file, "utf-8");
    const { importedFiles } = ts.preProcessFile(source, true, true);
    for (const { fileName } of importedFiles) {
      if (!fileName.startsWith(".")) {
        packages.add(fileName);
        continue;
      }
      const resolved = resolveRelative(file, fileName);
      if (resolved !== null) pending.push(resolved);
    }
  }
  return { files, packages };
}

describe("qfai validate and the database engine", () => {
  it("imports neither the engine nor the module that loads it", async () => {
    const { files, packages } = await importClosure(VALIDATE_TS);

    expect(files.size).toBeGreaterThan(1);
    expect(files.has(DRIFT_MODULE)).toBe(false);
    expect([...packages].filter((name) => name.startsWith(ENGINE_PACKAGE))).toEqual([]);
  });

  it("sees the engine import where it is", async () => {
    const { packages } = await importClosure(DRIFT_MODULE);

    expect(packages.has(ENGINE_PACKAGE)).toBe(true);
  });
});

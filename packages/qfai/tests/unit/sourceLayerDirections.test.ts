/**
 * The direction every import under `src/` may take between the package's layers.
 *
 * The allowed directions are the `## Architecture` table of
 * `.qfai/spec/03_contract/tech.md`, which this test reads: a layer imports
 * only what its `Depends on` cell lists. A module both the CLI and a migration
 * step need lives in Core, so neither reaches into the other. `src/index.ts`,
 * the package entry, sits above the layers and is not checked; any other file
 * at the root of `src/` belongs to no layer and is reported.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
const TECH = path.resolve(SRC, "../../../.qfai/spec/03_contract/tech.md");

type LayerTable = Readonly<Record<string, readonly string[]>>;

/** A path under `src/`, with forward slashes on every platform. */
const shown = (file: string): string => path.relative(SRC, file).split(path.sep).join("/");

/** The cells of one Markdown table row. */
const cells = (row: string): string[] =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

/** The layer table in the `## Architecture` section: each layer's directory and the directories it may import. */
function parseLayerTable(markdown: string): LayerTable {
  const section = markdown.split(/^## /m).find((part) => part.startsWith("Architecture"));
  const rows = (section ?? "")
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map(cells);
  const header = rows[0] ?? [];
  expect(header[0], "the Architecture section must hold the layer table").toBe("Layer");
  const dependsOn = header.indexOf("Depends on");
  const table: Record<string, readonly string[]> = {};
  for (const row of rows.slice(2)) {
    const layer = (row[0] ?? "").toLowerCase();
    table[layer] = (row[dependsOn] ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name !== "" && name !== "-");
  }
  return table;
}

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

/** Every module a file names: static imports, every export-from form, `import()` calls and `import("…")` types. */
function moduleSpecifiers(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      found.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      found.push(node.moduleReference.expression.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      found.push(node.arguments[0].text);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      found.push(node.argument.literal.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** The relative modules a file names, resolved against the file. */
function relativeImports(file: string, text: string): string[] {
  return moduleSpecifiers(file, text)
    .filter((spec) => spec.startsWith("."))
    .map((spec) => path.resolve(path.dirname(file), spec));
}

/** What breaks the layer table in one file: its own layer, and each relative import it makes. */
function layerViolations(file: string, text: string, mayImport: LayerTable): string[] {
  const from = layerOf(file);
  if (from === null) {
    return shown(file) === "index.ts"
      ? []
      : [`${shown(file)}: a file at the root of src/ is not in a declared layer`];
  }
  const allowed = mayImport[from];
  if (allowed === undefined) return [`${shown(file)}: ${from}/ is not a declared layer`];
  const violations: string[] = [];
  for (const target of relativeImports(file, text)) {
    const to = layerOf(target);
    if (to === from || (to !== null && allowed.includes(to))) continue;
    violations.push(
      `${shown(file)} imports ${shown(target)}: ${from} may import ${allowed.join(", ") || "nothing"}`,
    );
  }
  return violations;
}

describe("source layer directions", () => {
  it("every import under src/ follows the layer table in tech.md", async () => {
    const mayImport = parseLayerTable(await readFile(TECH, "utf-8"));
    const violations: string[] = [];
    for (const file of await sourceFiles(SRC)) {
      violations.push(...layerViolations(file, await readFile(file, "utf-8"), mayImport));
    }
    expect(violations).toEqual([]);
  });

  it("reads the layers and their allowed directions from the table", () => {
    const markdown = [
      "## Stack",
      "",
      "| Layer | Notes |",
      "| --- | --- |",
      "| Ignored | not the architecture table |",
      "",
      "## Architecture",
      "",
      "| Layer | Responsibility | Depends on |",
      "| --- | --- | --- |",
      "| CLI | Commands | Core, Shared |",
      "| Core | Reads | Shared |",
      "| Shared | Helpers | - |",
    ].join("\n");
    expect(parseLayerTable(markdown)).toEqual({
      cli: ["core", "shared"],
      core: ["shared"],
      shared: [],
    });
  });

  it("reads imports, every export-from form, dynamic imports and import types", () => {
    const file = path.join(SRC, "migration", "step.ts");
    const text = [
      'import { a } from "../cli/a.js";',
      'export { b } from "../core/b.js";',
      'export * as ns from "../cli/ns.js";',
      'export * from "../shared/star.js";',
      'const c = await import("../shared/c.js");',
      'type T = import("../cli/t.js").T;',
      'import d from "node:path";',
    ].join("\n");
    expect(relativeImports(file, text).map(shown)).toEqual([
      "cli/a.js",
      "core/b.js",
      "cli/ns.js",
      "shared/star.js",
      "shared/c.js",
      "cli/t.js",
    ]);
  });

  it("reports an edge the table does not allow and passes one it does", () => {
    const mayImport: LayerTable = { cli: ["core", "shared"], migration: ["core", "shared"] };
    const file = path.join(SRC, "migration", "step.ts");
    expect(layerViolations(file, 'import { a } from "../cli/a.js";', mayImport)).toEqual([
      "migration/step.ts imports cli/a.js: migration may import core, shared",
    ]);
    expect(layerViolations(file, 'import { b } from "../core/b.js";', mayImport)).toEqual([]);
    expect(layerViolations(file, 'export * as ns from "../cli/ns.js";', mayImport)).toHaveLength(1);
  });

  it("skips index.ts and reports any other file at the root of src/ or a directory with no layer", () => {
    const mayImport: LayerTable = { cli: ["shared"] };
    const entry = path.join(SRC, "index.ts");
    expect(layerViolations(entry, 'export * from "./cli/a.js";', mayImport)).toEqual([]);
    expect(layerViolations(path.join(SRC, "stray.ts"), "export {};", mayImport)).toEqual([
      "stray.ts: a file at the root of src/ is not in a declared layer",
    ]);
    expect(layerViolations(path.join(SRC, "extra", "x.ts"), "export {};", mayImport)).toEqual([
      "extra/x.ts: extra/ is not a declared layer",
    ]);
  });
});

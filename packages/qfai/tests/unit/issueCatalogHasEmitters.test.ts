/**
 * Meta-test: every key of `ISSUE_EXPECTED_BY_CODE` in validate.ts must name an
 * issue code that something under `src/` can actually emit.
 *
 * That map is the closest thing qfai publishes to a rule catalog: it is the
 * "expected" text an operator reads to learn what a gate wants. An entry whose
 * code no validator emits documents a gate that cannot fire, and it also hides
 * regressions — a validator that is deleted or silently unwired leaves its
 * catalog entry behind looking healthy.
 *
 * Soundness: the scan resolves each code through the TypeScript AST and only
 * counts string literals in *code* positions, so a mention inside a comment or
 * a JSDoc block cannot satisfy a key. The catalog's own object literal is
 * excluded from the scan, otherwise every key would trivially find itself.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_ROOT = path.resolve(__dirname, "../../src");
const VALIDATE_TS = path.resolve(SRC_ROOT, "cli/commands/validate.ts");
const CATALOG_NAME = "ISSUE_EXPECTED_BY_CODE";

/**
 * Catalog entries knowingly kept without an emitter. This set MUST stay empty:
 * a code with no emitter is documentation of a gate that cannot fire, so the
 * fix is to delete the entry or restore its emitter, never to allowlist it.
 */
const ORPHANED_CODES: ReadonlySet<string> = new Set<string>();

interface SourceScan {
  /** String literals in code positions — comments cannot contribute. */
  readonly literals: ReadonlySet<string>;
  /** `const NAME = "literal"` bindings, so computed catalog keys resolve. */
  readonly constants: ReadonlyMap<string, string>;
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(full)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

async function parseSource(file: string): Promise<ts.SourceFile> {
  const content = await readFile(file, "utf-8");
  return ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
}

function findCatalogLiteral(source: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  let found: ts.ObjectLiteralExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === CATALOG_NAME &&
      node.initializer !== undefined &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function scanSource(
  source: ts.SourceFile,
  literals: Set<string>,
  constants: Map<string, string>,
  skip?: ts.Node,
): void {
  const visit = (node: ts.Node): void => {
    if (skip !== undefined && node.pos === skip.pos && node.end === skip.end) {
      return;
    }
    if (ts.isStringLiteralLike(node)) {
      literals.add(node.text);
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      constants.set(node.name.text, node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

async function scanSourceTree(catalog: ts.ObjectLiteralExpression): Promise<SourceScan> {
  const literals = new Set<string>();
  const constants = new Map<string, string>();
  for (const file of await collectSourceFiles(SRC_ROOT)) {
    const source = await parseSource(file);
    scanSource(source, literals, constants, file === VALIDATE_TS ? catalog : undefined);
  }
  return { literals, constants };
}

/**
 * Catalog keys come in three shapes: quoted (`"QFAI-SCOPE-001":`), bare
 * identifier (`E_SPEC_MISSING_FILESET:`) and computed (`[SOME_CODE]:`). The
 * computed form is resolved through the constant it names so the check stays
 * on the code, not on the spelling.
 */
function readCatalogKey(
  property: ts.ObjectLiteralElementLike,
  constants: ReadonlyMap<string, string>,
): string {
  const name = property.name;
  if (name !== undefined) {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
      return name.text;
    }
    if (ts.isComputedPropertyName(name) && ts.isIdentifier(name.expression)) {
      const resolved = constants.get(name.expression.text);
      if (resolved !== undefined) {
        return resolved;
      }
    }
  }
  throw new Error(`${CATALOG_NAME} has a key that cannot be resolved statically`);
}

async function loadCatalog(): Promise<{ keys: string[]; literals: ReadonlySet<string> }> {
  const source = await parseSource(VALIDATE_TS);
  const catalog = findCatalogLiteral(source);
  if (catalog === undefined) {
    throw new Error(`${CATALOG_NAME} object literal not found in ${VALIDATE_TS}`);
  }
  const { literals, constants } = await scanSourceTree(catalog);
  const keys = catalog.properties.map((property) => readCatalogKey(property, constants));
  return { keys, literals };
}

describe("ISSUE_EXPECTED_BY_CODE catalog", () => {
  it("describes only codes that something under src/ can emit", async () => {
    const { keys, literals } = await loadCatalog();
    expect(keys.length).toBeGreaterThan(0);

    const orphans = keys.filter((key) => !literals.has(key) && !ORPHANED_CODES.has(key)).sort();

    expect(orphans).toEqual([]);
  });

  it("keeps no orphan allowlist", () => {
    expect(ORPHANED_CODES.size).toBe(0);
  });

  it("does not accept a code that appears only inside a comment", () => {
    const source = ts.createSourceFile(
      "sample.ts",
      ["// QFAI-SAMPLE-001 is only mentioned here", 'const code = "QFAI-SAMPLE-002";'].join("\n"),
      ts.ScriptTarget.Latest,
      true,
    );
    const literals = new Set<string>();
    const constants = new Map<string, string>();
    scanSource(source, literals, constants);

    expect(literals.has("QFAI-SAMPLE-002")).toBe(true);
    expect(literals.has("QFAI-SAMPLE-001")).toBe(false);
    expect(constants.get("code")).toBe("QFAI-SAMPLE-002");
  });
});

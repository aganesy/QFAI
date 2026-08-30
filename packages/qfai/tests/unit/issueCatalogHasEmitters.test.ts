/**
 * Meta-test: every key of `ISSUE_EXPECTED_BY_CODE` in validate.ts must name a
 * code that qfai can actually put in front of an operator.
 *
 * That map is the closest thing qfai publishes to a rule catalog: it is the
 * "expected" text `resolveIssueExpected` prints for an `Issue.code`. An entry
 * whose code nothing produces documents a gate that cannot fire, and it hides
 * regressions — a validator that is deleted or silently unwired leaves its
 * catalog entry behind looking healthy.
 *
 * Soundness: a bare mention of the code is NOT evidence that anything emits it.
 * A `report.ts` guidance filter such as `["QFAI-PROT-271"].includes(item.code)`
 * *consumes* an issue, it never produces one, yet it kept dead catalog entries
 * looking alive. So the scan resolves each code through the TypeScript AST and
 * counts only two producer positions:
 *
 *   1. issue-emitting call sites — argument 0 of a call to a function that
 *      returns `Issue` and takes `code`/`issueCode` first, plus `code:` /
 *      `issueCode:` properties. Identifiers, `??` defaults and `OBJECT.member`
 *      accesses are resolved back to the string literal they name.
 *   2. rendered report signals — a `*_SIGNAL_CODE` constant interpolated into
 *      report text. `QFAI-COV-207` is written into the coverage report body
 *      rather than emitted as an `Issue`, and `resolveIssueExpected` is pinned
 *      to answer for it (tests/core/layerCoverage.test.ts).
 *
 * A comment, a message string or a filter list satisfies neither position.
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

/** Parameter / property names that carry an `Issue.code` value. */
const CODE_PARAM_NAMES: ReadonlySet<string> = new Set(["code", "issueCode"]);
/** Naming convention for a code rendered into report text instead of emitted. */
const SIGNAL_CONST_SUFFIX = "_SIGNAL_CODE";

/**
 * Catalog entries knowingly kept without a producer. This set MUST stay empty:
 * a code nothing produces is documentation of a gate that cannot fire, so the
 * fix is to delete the entry or restore its producer, never to allowlist it.
 */
const ORPHANED_CODES: ReadonlySet<string> = new Set<string>();

type LiteralScope = (name: string) => ReadonlySet<string>;
type Bindings = Map<string, Set<string>>;

const EMPTY: ReadonlySet<string> = new Set<string>();

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
  let content: string;
  try {
    content = await readFile(file, "utf-8");
  } catch (error) {
    throw new Error(`cannot read ${file} for the issue-catalog scan: ${String(error)}`);
  }
  return ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
    return unwrapExpression(node.expression);
  }
  return node;
}

/**
 * Resolve an expression standing in a code position to the string literals it
 * can hold. Only the shapes the codebase actually uses are followed, so an
 * unresolvable expression yields nothing rather than a guess.
 */
function resolveLiterals(expr: ts.Expression, scope: LiteralScope, depth = 0): ReadonlySet<string> {
  if (depth > 5) {
    return EMPTY;
  }
  const node = unwrapExpression(expr);
  if (ts.isStringLiteralLike(node)) {
    return new Set([node.text]);
  }
  if (ts.isIdentifier(node)) {
    return scope(node.text);
  }
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
    return scope(`${node.expression.text}.${node.name.text}`);
  }
  const branches: ts.Expression[] = [];
  if (ts.isConditionalExpression(node)) {
    branches.push(node.whenTrue, node.whenFalse);
  } else if (
    ts.isBinaryExpression(node) &&
    (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  ) {
    branches.push(node.left, node.right);
  }
  const out = new Set<string>();
  for (const branch of branches) {
    for (const literal of resolveLiterals(branch, scope, depth + 1)) {
      out.add(literal);
    }
  }
  return out;
}

/** Index `const NAME = "code"` and `const MAP = { key: "code" }` bindings. */
function indexBindings(source: ts.SourceFile, bindings: Bindings): void {
  const scope: LiteralScope = (name) => bindings.get(name) ?? EMPTY;
  const add = (name: string, value: string): void => {
    const set = bindings.get(name) ?? new Set<string>();
    set.add(value);
    bindings.set(name, set);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = unwrapExpression(node.initializer);
      for (const literal of resolveLiterals(init, scope)) {
        add(node.name.text, literal);
      }
      if (ts.isObjectLiteralExpression(init)) {
        for (const prop of init.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          const key = prop.name;
          if (!ts.isIdentifier(key) && !ts.isStringLiteral(key)) continue;
          for (const literal of resolveLiterals(prop.initializer, scope)) {
            add(`${node.name.text}.${key.text}`, literal);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

function issueFactoryName(node: ts.Node): string | undefined {
  if (
    !ts.isFunctionDeclaration(node) &&
    !ts.isFunctionExpression(node) &&
    !ts.isArrowFunction(node)
  ) {
    return undefined;
  }
  const first = node.parameters[0];
  if (
    first === undefined ||
    !ts.isIdentifier(first.name) ||
    !CODE_PARAM_NAMES.has(first.name.text)
  ) {
    return undefined;
  }
  if (node.type === undefined || !/\bIssue\b/.test(node.type.getText())) {
    return undefined;
  }
  if (ts.isFunctionDeclaration(node)) {
    return node.name?.text;
  }
  const parent: ts.Node | undefined = node.parent;
  if (parent !== undefined && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  return undefined;
}

/** Names of the helpers that build an `Issue` from a code argument. */
function collectIssueFactories(sources: readonly ts.SourceFile[]): ReadonlySet<string> {
  const factories = new Set<string>();
  for (const source of sources) {
    const visit = (node: ts.Node): void => {
      const name = issueFactoryName(node);
      if (name !== undefined) {
        factories.add(name);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return factories;
}

function calleeName(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) {
    return expr.text;
  }
  if (ts.isPropertyAccessExpression(expr)) {
    return expr.name.text;
  }
  return undefined;
}

function codePositionExpression(
  node: ts.Node,
  factories: ReadonlySet<string>,
): ts.Expression | undefined {
  if (ts.isCallExpression(node) && node.arguments.length > 0) {
    const name = calleeName(node.expression);
    return name !== undefined && factories.has(name) ? node.arguments[0] : undefined;
  }
  if (ts.isPropertyAssignment(node)) {
    const key = node.name;
    const text = ts.isIdentifier(key) || ts.isStringLiteral(key) ? key.text : undefined;
    return text !== undefined && CODE_PARAM_NAMES.has(text) ? node.initializer : undefined;
  }
  if (ts.isShorthandPropertyAssignment(node) && CODE_PARAM_NAMES.has(node.name.text)) {
    return node.name;
  }
  if (ts.isTemplateSpan(node)) {
    const expr = unwrapExpression(node.expression);
    return ts.isIdentifier(expr) && expr.text.endsWith(SIGNAL_CONST_SUFFIX) ? expr : undefined;
  }
  return undefined;
}

/** Codes reachable from a producer position — emitter call site or signal render. */
function collectProducedCodes(
  sources: readonly ts.SourceFile[],
  bindingsBySource?: ReadonlyMap<ts.SourceFile, Bindings>,
): ReadonlySet<string> {
  const factories = collectIssueFactories(sources);
  const produced = new Set<string>();
  for (const source of sources) {
    let bindings = bindingsBySource?.get(source);
    if (bindings === undefined) {
      bindings = new Map<string, Set<string>>();
      indexBindings(source, bindings);
    }
    const local = bindings;
    const scope: LiteralScope = (name) => local.get(name) ?? EMPTY;
    const visit = (node: ts.Node): void => {
      const expr = codePositionExpression(node, factories);
      if (expr !== undefined) {
        for (const literal of resolveLiterals(expr, scope)) {
          produced.add(literal);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return produced;
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

/**
 * Catalog keys come in three shapes: quoted (`"QFAI-SCOPE-001":`), bare
 * identifier (`E_SPEC_MISSING_FILESET:`) and computed (`[SOME_CODE]:`). The
 * computed form is resolved through the constant it names so the check stays
 * on the code, not on the spelling.
 */
function readCatalogKey(property: ts.ObjectLiteralElementLike, scope: LiteralScope): string {
  const name = property.name;
  if (name !== undefined) {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
      return name.text;
    }
    if (ts.isComputedPropertyName(name) && ts.isIdentifier(name.expression)) {
      const resolved = [...scope(name.expression.text)];
      // Narrowed rather than indexed: `noUncheckedIndexedAccess` types
      // `resolved[0]` as `string | undefined`, and `length === 1` does not
      // narrow the element. A Set of strings never yields `undefined`, so the
      // fall-through below is unreachable at runtime and the throw stays the
      // single exit for a key this cannot resolve.
      const [only] = resolved;
      if (resolved.length === 1 && only !== undefined) {
        return only;
      }
    }
  }
  throw new Error(`${CATALOG_NAME} has a key that cannot be resolved statically`);
}

async function loadCatalog(): Promise<{ keys: string[]; produced: ReadonlySet<string> }> {
  const files = await collectSourceFiles(SRC_ROOT);
  const sources: ts.SourceFile[] = [];
  const bindingsBySource = new Map<ts.SourceFile, Bindings>();
  const global: Bindings = new Map();
  for (const file of files) {
    const source = await parseSource(file);
    sources.push(source);
    const local: Bindings = new Map();
    indexBindings(source, local);
    bindingsBySource.set(source, local);
    for (const [name, values] of local) {
      const merged = global.get(name) ?? new Set<string>();
      for (const value of values) merged.add(value);
      global.set(name, merged);
    }
  }
  const validateSource = sources.find((source) => path.resolve(source.fileName) === VALIDATE_TS);
  const catalog = validateSource === undefined ? undefined : findCatalogLiteral(validateSource);
  if (catalog === undefined) {
    throw new Error(`${CATALOG_NAME} object literal not found in ${VALIDATE_TS}`);
  }
  const scope: LiteralScope = (name) => global.get(name) ?? EMPTY;
  return {
    keys: catalog.properties.map((property) => readCatalogKey(property, scope)),
    produced: collectProducedCodes(sources, bindingsBySource),
  };
}

function sample(lines: readonly string[]): ts.SourceFile {
  return ts.createSourceFile("sample.ts", lines.join("\n"), ts.ScriptTarget.Latest, true);
}

const FACTORY_STUB =
  "function issue(code: string, message: string): Issue {\n  return { code, message };\n}";

describe("ISSUE_EXPECTED_BY_CODE catalog", () => {
  it("describes only codes that something under src/ can produce", async () => {
    const { keys, produced } = await loadCatalog();
    expect(keys.length).toBeGreaterThan(0);

    const orphans = keys.filter((key) => !produced.has(key) && !ORPHANED_CODES.has(key)).sort();

    expect(orphans).toEqual([]);
  });

  it("keeps no orphan allowlist", () => {
    expect(ORPHANED_CODES.size).toBe(0);
  });

  it("counts emitter call sites, not every mention of a code", () => {
    const produced = collectProducedCodes([
      sample([
        FACTORY_STUB,
        "// QFAI-SAMPLE-001 is only mentioned in a comment",
        'const consumed = issues.filter((item) => ["QFAI-SAMPLE-002"].includes(item.code));',
        'const message = "see QFAI-SAMPLE-003 for details";',
        'issue("QFAI-SAMPLE-004", "emitted here");',
      ]),
    ]);

    // Consumers and prose are not producers.
    expect(produced.has("QFAI-SAMPLE-001")).toBe(false);
    expect(produced.has("QFAI-SAMPLE-002")).toBe(false);
    expect(produced.has("QFAI-SAMPLE-003")).toBe(false);
    // Over-correction pin: a real emitter call site still counts.
    expect(produced.has("QFAI-SAMPLE-004")).toBe(true);
  });

  it("resolves indirect emitter arguments and rendered signal codes", () => {
    const produced = collectProducedCodes([
      sample([
        FACTORY_STUB,
        'const CODES = { missing: "QFAI-SAMPLE-010" } as const;',
        'issue(CODES.missing, "emitted through a code map");',
        'const resolved = context.issueCode ?? "QFAI-SAMPLE-011";',
        'issue(resolved, "emitted through a defaulted local");',
        'const raw: Issue = { code: "QFAI-SAMPLE-012", message: "built inline" };',
        'const THIN_SIGNAL_CODE = "QFAI-SAMPLE-013";',
        "lines.push(`${THIN_SIGNAL_CODE} (warning): rendered into the report`);",
        'const UNUSED_CODE = "QFAI-SAMPLE-014";',
      ]),
    ]);

    expect([...produced].sort()).toEqual([
      "QFAI-SAMPLE-010",
      "QFAI-SAMPLE-011",
      "QFAI-SAMPLE-012",
      "QFAI-SAMPLE-013",
    ]);
  });
});

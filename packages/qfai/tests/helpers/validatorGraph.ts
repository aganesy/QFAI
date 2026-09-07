/**
 * Symbol-graph analysis behind the dead-validator guard
 * (`tests/unit/validators-are-wired.test.ts`).
 *
 * The guard answers one question: is every public `validate*` under
 * `src/core/validators/` actually invoked from the `validate.ts` graph? The
 * answer used to be computed by concatenating file bodies into one string and
 * asking `String.prototype.includes`, which credited a validator for any
 * textual occurrence of its name — a comment, an import declaration, a barrel
 * line, a name inside an error message, a longer identifier that merely
 * contains it, or a call sitting in an exported-but-unused function of a module
 * that happened to be reached for some other symbol. Each hole was patched with
 * another regular expression, and each patch left the next one.
 *
 * So the analysis runs on the TypeScript AST instead:
 *
 * - **Declarations** are collected from `export function validate…`,
 *   `export const validate… =` AND `export { local as validateX }` clauses, so
 *   a validator published under an alias cannot escape the census.
 * - **References** are `ts.Identifier` nodes in value position. Comments,
 *   string and template text, type positions, declaration names and
 *   import/export specifiers are not identifiers in value position, so none of
 *   them can count as wiring — by construction, not by subtraction.
 * - **Aliased imports** are canonicalised: `import { validateFoo as runFoo }`
 *   plus a `runFoo()` call credits `validateFoo`, not `runFoo`.
 * - **Reachability is per symbol, not per file.** Entering a module for one
 *   imported name walks that name's declaration and whatever it transitively
 *   references — a sibling export nobody imports never joins the graph.
 *
 * The result is a set of exact identifier names, so `validateTraceability` is
 * no longer credited by a call to `validateTraceabilityIntegrity`.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

/** A public validator: the exported name, and the file that publishes it. */
export interface ValidatorDeclaration {
  readonly name: string;
  readonly file: string;
}

/** Entry marker meaning "every top-level symbol of this module is reachable". */
export const ALL_SYMBOLS = "*all-symbols*";

/** What the guard considers a validator: an exported `validate*` value. */
const VALIDATOR_NAME_RE = /^validate\w+$/;

/** A named import binding: the local name maps to `imported` from `spec`. */
interface ImportBinding {
  readonly spec: string;
  /** The exported name in `spec`, or {@link ALL_SYMBOLS} for `* as` / default. */
  readonly imported: string;
}

/** An `export { local as public } from "spec"` binding. */
interface ReexportBinding {
  readonly spec: string;
  readonly local: string;
}

/** The top-level shape of one module, as the walk needs it. */
export interface ModuleIndex {
  /** Top-level declaration name → the statement that declares it. */
  readonly declarations: ReadonlyMap<string, ts.Statement>;
  /** Top-level statements that run on import (they are always reachable). */
  readonly sideEffects: readonly ts.Statement[];
  /** Local binding name → where it was imported from. */
  readonly imports: ReadonlyMap<string, ImportBinding>;
  /** `export { local as public }` (no module specifier): public → local. */
  readonly localAliases: ReadonlyMap<string, string>;
  /** `export { local as public } from "spec"`: public → source binding. */
  readonly reexports: ReadonlyMap<string, ReexportBinding>;
  /** Specifiers of `export * from "spec"`, searched as a last resort. */
  readonly starExports: readonly string[];
}

interface MutableModuleIndex {
  declarations: Map<string, ts.Statement>;
  sideEffects: ts.Statement[];
  imports: Map<string, ImportBinding>;
  localAliases: Map<string, string>;
  reexports: Map<string, ReexportBinding>;
  starExports: string[];
}

export function parseSource(fileName: string, body: string): ts.SourceFile {
  return ts.createSourceFile(fileName, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** Every identifier a binding name introduces, destructuring included. */
function bindingIdentifiers(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  const out: string[] = [];
  for (const element of name.elements) {
    if (ts.isBindingElement(element)) out.push(...bindingIdentifiers(element.name));
  }
  return out;
}

function indexImport(statement: ts.ImportDeclaration, into: MutableModuleIndex): void {
  const clause = statement.importClause;
  if (!clause || clause.isTypeOnly) return; // side-effect or type-only import
  if (!ts.isStringLiteral(statement.moduleSpecifier)) return;
  const spec = statement.moduleSpecifier.text;
  if (clause.name) into.imports.set(clause.name.text, { spec, imported: ALL_SYMBOLS });
  const bindings = clause.namedBindings;
  if (!bindings) return;
  if (ts.isNamespaceImport(bindings)) {
    into.imports.set(bindings.name.text, { spec, imported: ALL_SYMBOLS });
    return;
  }
  for (const element of bindings.elements) {
    if (element.isTypeOnly) continue;
    const imported = (element.propertyName ?? element.name).text;
    into.imports.set(element.name.text, { spec, imported });
  }
}

function indexExport(statement: ts.ExportDeclaration, into: MutableModuleIndex): void {
  if (statement.isTypeOnly) return;
  const specifier = statement.moduleSpecifier;
  const spec = specifier && ts.isStringLiteral(specifier) ? specifier.text : null;
  const clause = statement.exportClause;
  if (!clause || ts.isNamespaceExport(clause)) {
    if (spec) into.starExports.push(spec);
    return;
  }
  for (const element of clause.elements) {
    if (element.isTypeOnly) continue;
    const local = (element.propertyName ?? element.name).text;
    if (spec) into.reexports.set(element.name.text, { spec, local });
    else into.localAliases.set(element.name.text, local);
  }
}

function indexDeclaration(statement: ts.Statement, into: MutableModuleIndex): void {
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    if (statement.name) into.declarations.set(statement.name.text, statement);
    return;
  }
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      for (const name of bindingIdentifiers(declaration.name)) {
        into.declarations.set(name, statement);
      }
    }
    return;
  }
  if (
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isModuleDeclaration(statement)
  ) {
    if (ts.isModuleDeclaration(statement) || statement.name.kind === ts.SyntaxKind.Identifier) {
      into.declarations.set(statement.name.getText(), statement);
    }
    return;
  }
  into.sideEffects.push(statement);
}

/** Index one module's top-level statements: declarations, imports, exports. */
export function indexModule(source: ts.SourceFile): ModuleIndex {
  const into: MutableModuleIndex = {
    declarations: new Map(),
    sideEffects: [],
    imports: new Map(),
    localAliases: new Map(),
    reexports: new Map(),
    starExports: [],
  };
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) indexImport(statement, into);
    else if (ts.isExportDeclaration(statement)) indexExport(statement, into);
    else indexDeclaration(statement, into);
  }
  return into;
}

/**
 * The `name` child of a declaration-shaped node — the one identifier position
 * that names something instead of referring to it. `validateFoo` in
 * `function validateFoo()`, in `{ validateFoo: … }` or in `obj.validateFoo` is
 * not a reference to the module-level validator, so it must not be credited.
 */
function declarationName(node: ts.Node): ts.Node | undefined {
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) return node.name;
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) return node.name;
  if (ts.isVariableDeclaration(node) || ts.isParameter(node)) return node.name;
  if (ts.isBindingElement(node)) return node.name;
  if (ts.isPropertyAccessExpression(node)) return node.name;
  if (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) return node.name;
  if (ts.isMethodDeclaration(node) || ts.isEnumMember(node)) return node.name;
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) return node.name;
  if (ts.isLabeledStatement(node)) return node.label;
  return undefined;
}

/** A reference in value position, canonicalised past any import alias. */
interface SymbolReference {
  readonly name: string;
  /** Module specifier the name comes from, or `null` for the same module. */
  readonly spec: string | null;
}

/**
 * Identifiers the statement uses in value position, with import aliases
 * resolved to the name their source module exports.
 */
function statementReferences(statement: ts.Statement, index: ModuleIndex): SymbolReference[] {
  const refs: SymbolReference[] = [];
  const push = (identifier: string): void => {
    const binding = index.imports.get(identifier);
    if (!binding) {
      refs.push({ name: identifier, spec: null });
      return;
    }
    const named = binding.imported !== ALL_SYMBOLS;
    refs.push({ name: named ? binding.imported : ALL_SYMBOLS, spec: binding.spec });
    if (!named) refs.push({ name: identifier, spec: null });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node) || ts.isInterfaceDeclaration(node)) return;
    if (ts.isTypeAliasDeclaration(node)) return;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isIdentifier(node)) {
      push(node.text);
      return;
    }
    if (ts.isShorthandPropertyAssignment(node)) {
      push(node.name.text);
      return;
    }
    const named = declarationName(node);
    ts.forEachChild(node, (child) => {
      if (child === named && ts.isIdentifier(child)) return;
      visit(child);
    });
  };
  visit(statement);
  return refs;
}

/** Work the caller must continue in another module. */
export interface CrossModuleReference {
  readonly spec: string;
  /** Exported name to enter the module for, or {@link ALL_SYMBOLS}. */
  readonly name: string;
}

export interface ModuleWalk {
  /** Names referenced in value position from the requested symbols. */
  readonly names: ReadonlySet<string>;
  /** Imports the requested symbols actually use, to follow next. */
  readonly external: readonly CrossModuleReference[];
  /** Requested names this module does not declare, re-export or star-export. */
  readonly unresolved: readonly string[];
}

/**
 * Walk one module from the requested entry symbols.
 *
 * Only the requested symbols and what they transitively reference inside this
 * module are inspected: an exported function nobody imports contributes
 * nothing, which is the whole point — a call to an unwired validator sitting in
 * dead code is not wiring. Top-level side-effect statements are always
 * included, because importing the module runs them.
 */
export function walkModuleSymbols(
  index: ModuleIndex,
  entry: readonly string[] | typeof ALL_SYMBOLS,
  options: { readonly includeSideEffects?: boolean } = {},
): ModuleWalk {
  const names = new Set<string>();
  const external: CrossModuleReference[] = [];
  const unresolved: string[] = [];
  const nameQueue = entry === ALL_SYMBOLS ? [...index.declarations.keys()] : [...entry];
  const requested = new Set<string>(nameQueue);
  const statementQueue: ts.Statement[] =
    options.includeSideEffects === false ? [] : [...index.sideEffects];
  const walked = new Set<ts.Statement>();

  const requestName = (name: string): void => {
    if (requested.has(name)) return;
    requested.add(name);
    nameQueue.push(name);
  };

  /** Turn one requested export name into the statement (or module) that supplies it. */
  const resolveName = (name: string): void => {
    const declaration = index.declarations.get(name);
    if (declaration) {
      statementQueue.push(declaration);
      return;
    }
    const local = index.localAliases.get(name);
    if (local !== undefined) {
      names.add(local); // calling an alias calls what it aliases
      requestName(local);
      return;
    }
    const reexport = index.reexports.get(name);
    if (reexport) {
      names.add(reexport.local);
      external.push({ spec: reexport.spec, name: reexport.local });
      return;
    }
    if (index.starExports.length > 0) {
      for (const spec of index.starExports) external.push({ spec, name });
      return;
    }
    unresolved.push(name);
  };

  const recordReference = (reference: SymbolReference): void => {
    if (reference.spec !== null) {
      external.push({ spec: reference.spec, name: reference.name });
      if (reference.name !== ALL_SYMBOLS) names.add(reference.name);
      return;
    }
    names.add(reference.name);
    if (index.declarations.has(reference.name) || index.localAliases.has(reference.name)) {
      requestName(reference.name);
    }
  };

  while (nameQueue.length > 0 || statementQueue.length > 0) {
    const name = nameQueue.shift();
    if (name !== undefined) {
      resolveName(name);
      continue;
    }
    const statement = statementQueue.shift();
    if (statement === undefined || walked.has(statement)) continue;
    walked.add(statement);
    for (const reference of statementReferences(statement, index)) recordReference(reference);
  }
  return { names, external, unresolved };
}

/**
 * Names referenced from `entry` in a single module source — the hermetic form
 * of the walk, for fixtures that must not touch the repository tree.
 */
export function referencedNamesInSource(
  body: string,
  entry: readonly string[] | typeof ALL_SYMBOLS,
): ReadonlySet<string> {
  return walkModuleSymbols(indexModule(parseSource("fixture.ts", body)), entry).names;
}

/** Resolve a relative TS import specifier to an on-disk source file. */
export async function resolveModule(fromFile: string, spec: string): Promise<string | null> {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, path.join(base, "index.ts")]) {
    try {
      const stats = await stat(candidate);
      if (stats.isFile()) return candidate;
    } catch {
      // candidate shape does not exist — try the next one
    }
  }
  return null;
}

interface WorkItem {
  readonly file: string;
  readonly name: string;
}

/**
 * Every name invoked from the symbol graph rooted at `entryFile`.
 *
 * Membership is exact-identifier: a validator is in this set only because
 * reachable code names it in value position.
 */
export async function buildReachableNames(
  entryFile: string,
  srcRoot: string,
): Promise<ReadonlySet<string>> {
  const reachable = new Set<string>();
  const indexes = new Map<string, ModuleIndex | null>();
  const queue: WorkItem[] = [{ file: entryFile, name: ALL_SYMBOLS }];
  const seen = new Set<string>([`${entryFile}::${ALL_SYMBOLS}`]);
  const enqueue = (item: WorkItem): void => {
    const key = `${item.file}::${item.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    queue.push(item);
  };

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const first = !indexes.has(item.file);
    const index = await loadIndex(item.file, indexes);
    if (!index) continue;
    const entry = item.name === ALL_SYMBOLS ? ALL_SYMBOLS : [item.name];
    const walk = walkModuleSymbols(index, entry, { includeSideEffects: first });
    for (const name of walk.names) reachable.add(name);
    for (const name of walk.unresolved) {
      // A declaration form this indexer does not model: fall back to the whole
      // module rather than reporting a wired validator as dead.
      if (name !== ALL_SYMBOLS) enqueue({ file: item.file, name: ALL_SYMBOLS });
    }
    for (const reference of walk.external) {
      const target = await resolveModule(item.file, reference.spec);
      if (!target || !target.startsWith(srcRoot)) continue;
      enqueue({ file: target, name: reference.name });
    }
  }
  return reachable;
}

async function loadIndex(
  file: string,
  cache: Map<string, ModuleIndex | null>,
): Promise<ModuleIndex | null> {
  const cached = cache.get(file);
  if (cached !== undefined) return cached;
  let index: ModuleIndex | null = null;
  try {
    index = indexModule(parseSource(file, await readFile(file, "utf-8")));
  } catch {
    index = null; // unreadable or non-file module — best-effort traversal
  }
  cache.set(file, index);
  return index;
}

/** Every `.ts` source file under `dir`, tests and declaration files excluded. */
export async function listTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const out: string[] = [];
  for (const name of entries) {
    if (name.endsWith(".d.ts")) continue;
    const full = path.join(dir, name);
    const stats = await stat(full);
    if (stats.isDirectory()) out.push(...(await listTsFiles(full)));
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

function hasExportModifier(statement: ts.Statement): boolean {
  if (!ts.canHaveModifiers(statement)) return false;
  const modifiers = ts.getModifiers(statement) ?? [];
  return modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

/**
 * Public validator names one module publishes.
 *
 * Three declaration forms, because all three are equally public and equally
 * capable of being dead: `export function validateX`, `export const validateX =`
 * and `export { local as validateX }`. A plain `export { validateX } from "…"`
 * is pass-through plumbing for another module's declaration, so it is not
 * counted twice; an aliased re-export publishes a new name and is.
 */
export function collectValidatorExports(fileName: string, body: string): string[] {
  const names: string[] = [];
  const add = (name: string): void => {
    if (VALIDATOR_NAME_RE.test(name)) names.push(name);
  };
  for (const statement of parseSource(fileName, body).statements) {
    if (ts.isExportDeclaration(statement)) {
      collectExportClauseValidators(statement, add);
      continue;
    }
    if (!hasExportModifier(statement)) continue;
    if (ts.isFunctionDeclaration(statement) && statement.name) add(statement.name.text);
    else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          add(declaration.name.text);
        }
      }
    }
  }
  return names;
}

function collectExportClauseValidators(
  statement: ts.ExportDeclaration,
  add: (name: string) => void,
): void {
  if (statement.isTypeOnly) return;
  const clause = statement.exportClause;
  if (!clause || !ts.isNamedExports(clause)) return;
  for (const element of clause.elements) {
    if (element.isTypeOnly) continue;
    const local = (element.propertyName ?? element.name).text;
    if (statement.moduleSpecifier && local === element.name.text) continue; // plumbing
    add(element.name.text);
  }
}

/**
 * Every public validator declared under `dir`, deduplicated by name and file.
 */
export async function collectPublicValidators(
  dir: string,
  exclude: ReadonlySet<string> = new Set<string>(),
): Promise<ValidatorDeclaration[]> {
  const out: ValidatorDeclaration[] = [];
  const seen = new Set<string>();
  for (const file of await listTsFiles(dir)) {
    for (const name of collectValidatorExports(file, await readFile(file, "utf-8"))) {
      const key = `${file}::${name}`;
      if (exclude.has(name) || seen.has(key)) continue;
      seen.add(key);
      out.push({ name, file });
    }
  }
  return out;
}

/**
 * The identifiers a barrel actually re-exports, parsed from its export clauses.
 *
 * Exact identifiers matter: a substring test on the barrel body reports
 * `validateTraceability` as exported merely because the file mentions
 * `validateTraceabilityIntegrity`, which silently forgives the very omission
 * the P4 check exists to catch. Type-only exports are skipped — a type
 * re-export is not a validator re-export.
 */
export function barrelExportedNames(indexBody: string): ReadonlySet<string> {
  const names = new Set<string>();
  for (const statement of parseSource("index.ts", indexBody).statements) {
    if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) continue;
    const clause = statement.exportClause;
    if (!clause || !ts.isNamedExports(clause)) continue;
    for (const element of clause.elements) {
      if (!element.isTypeOnly) names.add(element.name.text);
    }
  }
  return names;
}

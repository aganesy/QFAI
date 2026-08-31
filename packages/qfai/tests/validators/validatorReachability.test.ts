import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: a runner launched from the
// repo root resolves `src/core` to a path that does not exist, and the walk
// below would then scan nothing and pass vacuously.
// tests/validators/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const coreRoot = path.join(packageRoot, "src", "core");

/**
 * Every entry point that can end up emitting findings. `validate.ts` is the one
 * that matters — it owns the profile tables — but a validator wired only into a
 * CLI command is still live, so the CLI roots are walked too rather than being
 * reported as dead.
 */
const ENTRY_POINTS = ["validate.ts", "../index.ts", "../cli/index.ts", "../cli/main.ts"] as const;

/**
 * Validator modules that no entry point reaches today, each pinned to the issue
 * that owns its fate. This is a freeze of the backlog, not permission to grow
 * it: a NEW unreachable module fails this test, which is the point — a
 * validator with its own tests and its own rule codes looks enforced to every
 * reader, and nothing else in the suite notices that it never runs.
 *
 * Removing an entry when its module is wired in (or deleted) is not merely
 * expected, it is required: the assertions below check the list in both
 * directions. An entry left behind after its module was connected would let a
 * later disconnection slip past unnoticed, because the filter would keep
 * hiding the module.
 */
const KNOWN_UNREACHABLE = new Map<string, string>([
  ["validators/auditProfile.ts", "unfiled — same class as #402"],
  ["validators/requirePack.ts", "unfiled — same class as #402"],
  ["validators/requirementsContext.ts", "unfiled — same class as #402"],
  // Its last importer went with the retired validators; the module itself is
  // still on disk, so the walk sees it and nothing reaches it.
  ["validators/requireIndex.ts", "unfiled — QFAI-REQINDEX-* cannot fire; no importer left"],
  ["validators/skill/phaseOrdering.ts", "unfiled — same class as #402"],
  ["validators/skill/sidecarFlowOrdering.ts", "unfiled — same class as #402"],
  ["validators/uix/designSystemPresence.ts", "#403 — retired uix/ validators"],
  ["validators/uix/fixtureCoverage.ts", "#403 — retired uix/ validators"],
  ["validators/uix/nonUiOverfire.ts", "#403 — retired uix/ validators"],
]);

/**
 * Findings entry points that live in a module the graph *does* reach, yet that
 * nothing ever calls. Loading a module is not running its validator: a
 * re-export pulls the file in, and every rule code inside it still stays cold.
 * These are the ones the reachability walk alone cannot see, pinned on the same
 * terms as `KNOWN_UNREACHABLE` — the assertion below demands equality, so an
 * entry has to go the moment its validator is wired up.
 */
const KNOWN_UNDISPATCHED = new Map<string, string>([
  // `validate.ts` imports the `inspectIntegrationSurface` wrapper instead.
  ["validateIntegrationSurface", "unfiled — superseded by inspectIntegrationSurface"],
]);

const parsed = new Map<string, ts.SourceFile | null>();

/**
 * Parse once per file, and answer every question below off the AST rather than
 * off the raw text. Regex cannot do this job: `// … ui/*.yaml` opens a block
 * comment to a text scanner and swallows the code after it, a name inside a
 * string or a comment is not a reference, and `import type` looks exactly like
 * an import until you can see the elided clause.
 */
async function parseSource(file: string): Promise<ts.SourceFile | null> {
  const cached = parsed.get(file);
  if (cached !== undefined) {
    return cached;
  }

  let source: string;
  try {
    source = await readFile(file, "utf-8");
  } catch {
    // A missing file must not silently shrink the graph; `ENTRY_POINTS` is
    // asserted separately, and `tsc -b` owns unresolvable imports.
    parsed.set(file, null);
    return null;
  }

  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS,
  );
  parsed.set(file, sourceFile);
  return sourceFile;
}

/** True when the import statement still loads its module after type erasure. */
function importHasRuntimeEffect(statement: ts.ImportDeclaration): boolean {
  const clause = statement.importClause;
  if (clause === undefined) {
    return true; // side-effect import
  }
  if (clause.isTypeOnly) {
    return false;
  }
  if (clause.name !== undefined) {
    return true; // default binding survives even beside `{ type … }`
  }

  const bindings = clause.namedBindings;
  if (bindings === undefined) {
    return true;
  }
  if (ts.isNamespaceImport(bindings)) {
    return true;
  }
  return bindings.elements.some((element) => !element.isTypeOnly);
}

/** True when the `export … from` statement still loads its module. */
function reexportHasRuntimeEffect(statement: ts.ExportDeclaration): boolean {
  if (statement.isTypeOnly) {
    return false;
  }
  const clause = statement.exportClause;
  if (clause === undefined || !ts.isNamedExports(clause)) {
    return true; // `export * from …`
  }
  return clause.elements.some((element) => !element.isTypeOnly);
}

/**
 * Relative specifiers this module loads at runtime — static imports, runtime
 * `export … from` re-exports, and dynamic `import()`. Bare specifiers are
 * dependencies, never modules of this package.
 */
function runtimeSpecifiers(sourceFile: ts.SourceFile): string[] {
  const specifiers: string[] = [];
  const push = (node: ts.Expression | undefined): void => {
    if (node !== undefined && ts.isStringLiteral(node) && node.text.startsWith(".")) {
      specifiers.push(node.text);
    }
  };

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && importHasRuntimeEffect(statement)) {
      push(statement.moduleSpecifier);
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier !== undefined &&
      reexportHasRuntimeEffect(statement)
    ) {
      push(statement.moduleSpecifier);
    }
  }

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return specifiers;
}

/**
 * Resolve a specifier the way NodeNext does for this package's own sources:
 * the emitted `.js` extension maps back to the `.ts` on disk, and a directory
 * specifier resolves to its `index.ts`.
 */
async function resolveSpecifier(specifier: string, fromFile: string): Promise<string | null> {
  let candidate = path.resolve(path.dirname(fromFile), specifier);

  if (candidate.endsWith(".js")) {
    candidate = `${candidate.slice(0, -".js".length)}.ts`;
  }

  const asIndex = `${candidate.replace(/\.ts$/, "")}/index.ts`;
  for (const target of [candidate, asIndex]) {
    try {
      const stats = await stat(target);
      if (stats.isFile()) {
        return target;
      }
    } catch {
      // Unresolvable here is not a failure: `.json` imports and asset paths all
      // land here and none of them can reach a validator.
      continue;
    }
  }

  return null;
}

async function walkTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkTsFiles(full)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

/** Files transitively loaded from `ENTRY_POINTS`. */
async function collectReachable(): Promise<Set<string>> {
  const reachable = new Set<string>();
  const queue = ENTRY_POINTS.map((entry) => path.resolve(coreRoot, entry));

  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || reachable.has(file)) {
      continue;
    }
    reachable.add(file);

    const sourceFile = await parseSource(file);
    if (sourceFile === null) {
      continue;
    }

    for (const specifier of runtimeSpecifiers(sourceFile)) {
      const resolved = await resolveSpecifier(specifier, file);
      if (resolved !== null && !reachable.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  return reachable;
}

/**
 * Deliberately an unanchored substring match, not an exact one. The findings
 * array is written `Issue[]`, `readonly Issue[]` and `Promise<readonly
 * Issue[]>` across the validators — `validateDesignMdPatchZone`,
 * `detectEvidenceMutationUnlogged` and `detectSkillManifestDrift` all use the
 * readonly form — so anchoring this would silently exempt that whole family
 * from the dispatch assertion below. `readonlyFindingsShapes` pins it.
 */
const FINDINGS_ARRAY = /\bIssue\[\]/;

/**
 * Named types that carry findings. Not every validator returns `Issue[]`
 * directly — `validatePrototypingSkillContent` returns a `SkillValidationResult`
 * with an `issues` member, and both validators this PR deleted had that same
 * shape — so a rule that only reads the annotation text would exempt exactly
 * the family it is meant to police.
 */
async function collectFindingsTypes(): Promise<Set<string>> {
  const names = new Set<string>();
  for (const file of await walkTsFiles(path.join(packageRoot, "src"))) {
    const sourceFile = await parseSource(file);
    if (sourceFile === null) {
      continue;
    }
    for (const statement of sourceFile.statements) {
      if (ts.isInterfaceDeclaration(statement)) {
        const carries = statement.members.some(
          (member) =>
            ts.isPropertySignature(member) &&
            member.type !== undefined &&
            FINDINGS_ARRAY.test(member.type.getText(sourceFile)),
        );
        if (carries) {
          names.add(statement.name.text);
        }
      } else if (
        ts.isTypeAliasDeclaration(statement) &&
        FINDINGS_ARRAY.test(statement.type.getText(sourceFile))
      ) {
        names.add(statement.name.text);
      }
    }
  }
  return names;
}

/** True when a declared return type hands back findings, directly or awaited. */
function returnsFindings(returnType: string, findingsTypes: ReadonlySet<string>): boolean {
  const awaited = returnType.replace(/^Promise<([\s\S]*)>$/, "$1").trim();
  return FINDINGS_ARRAY.test(returnType) || findingsTypes.has(awaited);
}

/**
 * The return type of an exported `const` that is itself callable. A validator
 * written as `export const validateFoo = async (…): Promise<Issue[]> => …` is a
 * validator in every sense that matters here, so reading only function
 * declarations would let a whole authoring style in unpoliced: re-export the
 * module from the barrel and it counts as reached while never being called.
 *
 * Known limit: a const annotated with a *named* function-type alias hides its
 * return type behind that alias, which needs a type checker rather than a
 * syntax-only walk. No validator is written that way today.
 */
function callableReturnType(
  declaration: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): string | null {
  const annotation = declaration.type;
  if (annotation !== undefined) {
    return ts.isFunctionTypeNode(annotation) ? annotation.type.getText(sourceFile) : null;
  }

  const initializer = declaration.initializer;
  if (
    initializer !== undefined &&
    (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) &&
    initializer.type !== undefined
  ) {
    return initializer.type.getText(sourceFile);
  }
  return null;
}

/**
 * True when a top-level statement carries the `export` keyword.
 *
 * `ts.Statement` does not declare `modifiers` — only the node kinds that can
 * hold them do — so the property is reached through `canHaveModifiers` /
 * `getModifiers` rather than off the union. Reading it directly type-checks
 * nowhere and would leave every caller below narrowing an `any`.
 */
function isExportedStatement(statement: ts.Statement): boolean {
  if (!ts.canHaveModifiers(statement)) {
    return false;
  }
  return (
    ts
      .getModifiers(statement)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
  );
}

/**
 * Exported entry points that can emit findings, identified by their declared
 * return type rather than by a name prefix: `run*`, `detect*` and `check*`
 * validators exist too, and a prefix rule would exempt exactly the modules this
 * PR deleted. Both `function` declarations and callable `const`s count.
 */
function findingsEntries(sourceFile: ts.SourceFile, findingsTypes: ReadonlySet<string>): string[] {
  const names: string[] = [];
  for (const statement of sourceFile.statements) {
    const isExported = isExportedStatement(statement);
    if (isExported !== true) {
      continue;
    }

    if (ts.isFunctionDeclaration(statement)) {
      if (statement.name === undefined) {
        continue;
      }
      if (returnsFindings(statement.type?.getText(sourceFile) ?? "", findingsTypes)) {
        names.push(statement.name.text);
      }
      continue;
    }

    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }
      const returnType = callableReturnType(declaration, sourceFile);
      if (returnType !== null && returnsFindings(returnType, findingsTypes)) {
        names.push(declaration.name.text);
      }
    }
  }
  return names;
}

/**
 * Values this module imports from a relative specifier, keyed by the name at
 * the *declaration* site and holding every local name bound to it. The two
 * differ under `import { validateFoo as runFoo }`: the call site says `runFoo`
 * while the owner table below is keyed by `validateFoo`, so storing only the
 * local name would report a genuinely dispatched validator as dead — and the
 * assertion demands equality, so that is a failing test, not a lenient one.
 */
function importedValueBindings(sourceFile: ts.SourceFile): Map<string, Set<string>> {
  const bindings = new Map<string, Set<string>>();
  const bind = (declared: string, local: string): void => {
    const locals = bindings.get(declared);
    if (locals === undefined) {
      bindings.set(declared, new Set([local]));
      return;
    }
    locals.add(local);
  };

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !importHasRuntimeEffect(statement)) {
      continue;
    }
    const specifier = statement.moduleSpecifier;
    if (!ts.isStringLiteral(specifier) || !specifier.text.startsWith(".")) {
      continue;
    }
    const clause = statement.importClause;
    if (clause?.name !== undefined) {
      // A default binding carries no declaration-site name to map it to.
      bind(clause.name.text, clause.name.text);
    }
    const named = clause?.namedBindings;
    if (named !== undefined && ts.isNamedImports(named)) {
      for (const element of named.elements) {
        if (!element.isTypeOnly) {
          bind(element.propertyName?.text ?? element.name.text, element.name.text);
        }
      }
    }
  }
  return bindings;
}

/**
 * Identifiers this module evaluates. Declaration names, member names, type
 * positions and import clauses are all excluded, so `{ validateFoo: false }`,
 * `type T = typeof validateFoo` and an unused import do not pass for a call.
 */
function valueReferences(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();

  const isNonReference = (node: ts.Identifier): boolean => {
    const parent: ts.Node | undefined = node.parent;
    if (parent === undefined) {
      return true;
    }
    if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) {
      return true;
    }
    if (ts.isExportSpecifier(parent) || ts.isNamespaceExport(parent)) {
      return true;
    }
    if (ts.isFunctionDeclaration(parent) || ts.isVariableDeclaration(parent)) {
      return parent.name === node;
    }
    if (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) {
      return parent.name === node;
    }
    if (ts.isPropertyAccessExpression(parent)) {
      return parent.name === node;
    }
    return ts.isTypeReferenceNode(parent) || ts.isTypeQueryNode(parent);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && !isNonReference(node)) {
      names.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return names;
}

/** True when the module exports anything that survives compilation. */
function hasRuntimeExport(sourceFile: ts.SourceFile): boolean {
  return sourceFile.statements.some((statement) => {
    if (ts.isExportDeclaration(statement)) {
      return reexportHasRuntimeEffect(statement);
    }
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      return false;
    }
    return isExportedStatement(statement);
  });
}

/**
 * Validator modules that can actually run. A module whose every export is a
 * `type` emits nothing, so being reached only by `import type` is correct for
 * it and says nothing about a dead validator.
 */
async function collectValidatorModules(): Promise<string[]> {
  const files = await walkTsFiles(path.join(coreRoot, "validators"));
  const modules: string[] = [];
  for (const file of files) {
    const sourceFile = await parseSource(file);
    if (sourceFile !== null && hasRuntimeExport(sourceFile)) {
      modules.push(file);
    }
  }
  return modules;
}

const toRelative = (file: string): string =>
  path.relative(coreRoot, file).split(path.sep).join("/");

describe("validator reachability", () => {
  it("every entry point exists", async () => {
    for (const entry of ENTRY_POINTS) {
      const stats = await stat(path.resolve(coreRoot, entry));
      expect(stats.isFile(), `${entry} is not a file`).toBe(true);
    }
  });

  it("no validator module is unreachable from an entry point", async () => {
    const reachable = await collectReachable();
    const modules = await collectValidatorModules();
    expect(modules.length).toBeGreaterThan(0);

    const unreachable = modules
      .filter((file) => !reachable.has(file))
      .map(toRelative)
      .filter((relative) => !KNOWN_UNREACHABLE.has(relative))
      .sort();

    expect(unreachable).toEqual([]);
  });

  it("no pinned backlog entry has gone stale", async () => {
    const reachable = await collectReachable();
    const modules = new Set((await collectValidatorModules()).map(toRelative));

    // Deleted: the module named by the entry is gone, so the pin is dangling.
    const missing = [...KNOWN_UNREACHABLE.keys()].filter((relative) => !modules.has(relative));
    // Connected: the module is now reachable, so the entry is masking it. It
    // must be deleted here at the moment it is wired in, or a later regression
    // that disconnects it again cannot fail this test.
    const connected = [...KNOWN_UNREACHABLE.keys()].filter((relative) =>
      reachable.has(path.join(coreRoot, ...relative.split("/"))),
    );

    expect([...missing, ...connected].sort()).toEqual([]);
  });

  it("every findings entry in a reachable module is dispatched, not merely loaded", async () => {
    const reachable = await collectReachable();
    const modules = await collectValidatorModules();
    const findingsTypes = await collectFindingsTypes();

    // Only modules the graph reaches: one that is not loaded at all is already
    // covered by `KNOWN_UNREACHABLE`, and pinning it twice would mean deleting
    // two entries to clear one issue.
    const owners = new Map<string, string>();
    for (const file of modules) {
      const sourceFile = await parseSource(file);
      if (sourceFile === null || !reachable.has(file)) {
        continue;
      }
      for (const name of findingsEntries(sourceFile, findingsTypes)) {
        owners.set(name, file);
      }
    }
    expect(owners.size).toBeGreaterThan(0);

    const dispatched = new Set<string>();
    for (const file of reachable) {
      const sourceFile = await parseSource(file);
      if (sourceFile === null) {
        continue;
      }
      const bindings = importedValueBindings(sourceFile);
      const references = valueReferences(sourceFile);
      for (const [name, owner] of owners) {
        // Inside the declaring module an internal call is enough — the module
        // is loaded, so an orchestrator there does run. Anywhere else the name
        // must have been imported as a value as well, so that an unrelated
        // object key of the same name cannot stand in for a call; the call is
        // then looked for under the local name the import bound, alias or not.
        const callNames = owner === file ? [name] : [...(bindings.get(name) ?? [])];
        if (callNames.some((callName) => references.has(callName))) {
          dispatched.add(name);
        }
      }
    }

    const undispatched = [...owners.keys()].filter((name) => !dispatched.has(name)).sort();

    // Equality, not a subset: an entry whose validator has since been wired in
    // — or deleted — must go from the pinned list in the same change, or it
    // would go on masking that validator forever.
    expect(undispatched).toEqual([...KNOWN_UNDISPATCHED.keys()].sort());
  });
});

/** Parse a literal module so the walkers above can be exercised directly. */
function parseLiteral(source: string): ts.SourceFile {
  return ts.createSourceFile("literal.ts", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
}

describe("reachability walkers", () => {
  const findingsTypes = new Set(["SkillValidationResult"]);

  it("enumerates callable consts, not only function declarations", () => {
    const sourceFile = parseLiteral(
      [
        "export async function validateDeclared(root: string): Promise<Issue[]> { return []; }",
        "export const validateArrow = async (root: string): Promise<Issue[]> => [];",
        "export const validateExpression = function (root: string): Issue[] { return []; };",
        "export const validateAnnotated: (root: string) => SkillValidationResult = () => ({});",
        "export const NOT_A_VALIDATOR: readonly string[] = [];",
        "const validateUnexported = async (root: string): Promise<Issue[]> => [];",
      ].join("\n"),
    );

    expect(findingsEntries(sourceFile, findingsTypes).sort()).toEqual([
      "validateAnnotated",
      "validateArrow",
      "validateDeclared",
      "validateExpression",
    ]);
  });

  // Pin, not a regression test: every shape below is enumerated today. It
  // exists because `FINDINGS_ARRAY` reads as if it only matched a bare
  // `Issue[]`, so a later "tightening" to an anchored match would look like a
  // cleanup while quietly dropping the readonly-returning validators — the
  // largest family in `src/core/validators` — out of the dispatch assertion.
  it("treats readonly findings arrays as findings, bare and inside a Promise", () => {
    const sourceFile = parseLiteral(
      [
        "export async function validateReadonlyAwaited(root: string): Promise<readonly Issue[]> { return []; }",
        "export function validateReadonlyDirect(root: string): readonly Issue[] { return []; }",
        "export const validateReadonlyArrow = async (root: string): Promise<readonly Issue[]> => [];",
        "export function notAValidator(root: string): readonly string[] { return []; }",
      ].join("\n"),
    );

    expect(findingsEntries(sourceFile, findingsTypes).sort()).toEqual([
      "validateReadonlyArrow",
      "validateReadonlyAwaited",
      "validateReadonlyDirect",
    ]);
  });

  it("maps an aliased import back to the name it was declared under", () => {
    const sourceFile = parseLiteral(
      [
        'import { validateFoo as runFoo, validateBar } from "./validators/index.js";',
        'import type { validateTyped } from "./validators/index.js";',
        "export async function run(root: string): Promise<Issue[]> {",
        "  return [...(await runFoo(root)), ...(await validateBar(root))];",
        "}",
      ].join("\n"),
    );

    const bindings = importedValueBindings(sourceFile);
    expect([...(bindings.get("validateFoo") ?? [])]).toEqual(["runFoo"]);
    expect([...(bindings.get("validateBar") ?? [])]).toEqual(["validateBar"]);
    expect(bindings.has("validateTyped")).toBe(false);
    expect(bindings.has("runFoo")).toBe(false);

    // The alias is what the call site names, so it is what dispatch must find.
    expect(valueReferences(sourceFile).has("runFoo")).toBe(true);
  });
});

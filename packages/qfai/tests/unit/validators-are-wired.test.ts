/**
 * Meta-test: every prototyping validator function with `Issue[]` return must
 * be referenced from the validate.ts symbol graph (validate.ts itself, OR an
 * orchestrator imported by validate.ts).
 *
 * This catches the "validator written but never invoked" failure mode that
 * allowed `validateExecutionPlan` and `validateDelegationMap` to lurk as dead
 * code in v1.8.3 (RR §8.6). Adding a new prototyping validator without
 * wiring it into runPrototypingValidators (directly or via an orchestrator
 * like validateStateGate) MUST fail this test in CI.
 *
 * Implementation strategy:
 *   1. Walk every TS file under src/core/validators/prototyping/
 *   2. Extract every `export function validate*(`
 *   3. Build a "reachable text" set: validate.ts plus the source bodies of
 *      every file directly imported from validate.ts under
 *      `./validators/...` (1-hop). This handles the orchestrator pattern
 *      where validate.ts imports `validateStateGate` and the orchestrator
 *      internally calls `validateExecutionPlanIssues`.
 *   4. Assert each validator name appears in the reachable text, OR is on
 *      the documented PENDING_WIRING allowlist (existing dead code that
 *      requires a follow-up wiring effort).
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTOTYPING_VALIDATORS_DIR = path.resolve(__dirname, "../../src/core/validators/prototyping");
const VALIDATORS_INDEX = path.resolve(__dirname, "../../src/core/validators/index.ts");
const VALIDATE_TS = path.resolve(__dirname, "../../src/core/validate.ts");
const SRC_ROOT = path.resolve(__dirname, "../../src");

const PUBLIC_VALIDATOR_RE = /^export\s+(?:async\s+)?function\s+(validate\w+)\s*\(/gm;

/**
 * Legacy custom-Issue-returning functions kept for backward compatibility
 * (will be deleted in Phase 7). Their *Issues replacement is the wiring path.
 */
const DEPRECATED_LEGACY_VALIDATORS = new Set<string>([
  "validateExecutionPlan",
  "validateDelegationMap",
]);

/**
 * Validators known to be dead code awaiting wiring. As of v1.8.4 Phase 3
 * this set is empty: the four validators discovered by the Phase 2 meta-test
 * (validateScreenshotDir, validateLighthouseGate, validateIterationGate,
 * validateDesignSystemThreshold) were each given a `*Issues` adapter and
 * dispatched from validateStateGate.
 *
 * This list MUST shrink over time and MUST never grow without explicit
 * justification. The sentinel `expect(PENDING_WIRING.size).toBe(0)` keeps
 * accidental regressions visible.
 */
const PENDING_WIRING: ReadonlySet<string> = new Set<string>();

async function listTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const out: string[] = [];
  for (const name of entries) {
    if (name.endsWith(".d.ts")) continue;
    const full = path.join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      out.push(...(await listTsFiles(full)));
    } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

async function collectPublicValidators(
  dir: string,
): Promise<Array<{ name: string; file: string }>> {
  const files = await listTsFiles(dir);
  const out: Array<{ name: string; file: string }> = [];
  for (const file of files) {
    const body = await readFile(file, "utf-8");
    PUBLIC_VALIDATOR_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PUBLIC_VALIDATOR_RE.exec(body)) !== null) {
      const name = match[1];
      if (!DEPRECATED_LEGACY_VALIDATORS.has(name)) {
        out.push({ name, file });
      }
    }
  }
  return out;
}

/**
 * Build the "reachable from validate.ts" text by including validate.ts plus
 * every file directly imported from validate.ts under `./validators/`,
 * `./prototyping/`, or `./uiux/` (1-hop). Orchestrators that wrap multiple
 * sibling validators are detected this way.
 */
async function buildReachableText(): Promise<string> {
  const validateBody = await readFile(VALIDATE_TS, "utf-8");
  const importRe = /from\s+["'](\.\.?\/[\w./-]+)["']/g;
  const visited = new Set<string>();
  const fragments: string[] = [validateBody];

  let match: RegExpExecArray | null;
  while ((match = importRe.exec(validateBody)) !== null) {
    const rel = match[1];
    if (!rel) continue;
    // Resolve relative to validate.ts (which lives in src/core/)
    const resolved = path.resolve(path.dirname(VALIDATE_TS), rel.replace(/\.js$/, ".ts"));
    if (!resolved.startsWith(SRC_ROOT)) continue;
    if (visited.has(resolved)) continue;
    visited.add(resolved);
    try {
      const body = await readFile(resolved, "utf-8");
      fragments.push(body);
      // 2-hop: also follow imports of orchestrators (e.g. validators/index.ts
      // re-exports stateGate.ts; if validate.ts imports from index.ts, we
      // need index.ts → stateGate.ts).
      let inner: RegExpExecArray | null;
      const innerRe = /from\s+["'](\.\.?\/[\w./-]+)["']/g;
      while ((inner = innerRe.exec(body)) !== null) {
        const innerRel = inner[1];
        if (!innerRel) continue;
        const innerResolved = path.resolve(
          path.dirname(resolved),
          innerRel.replace(/\.js$/, ".ts"),
        );
        if (!innerResolved.startsWith(SRC_ROOT)) continue;
        if (visited.has(innerResolved)) continue;
        visited.add(innerResolved);
        try {
          fragments.push(await readFile(innerResolved, "utf-8"));
        } catch {
          // ignore — may be a directory index or non-existent; we just want
          // best-effort traversal
        }
      }
    } catch {
      // ignore unresolved imports
    }
  }
  return fragments.join("\n");
}

describe("meta-test: prototyping validators are wired into the pipeline", () => {
  it("every public Issue[]-returning validator under validators/prototyping/ is reachable from validate.ts", async () => {
    const validators = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);
    const reachable = await buildReachableText();

    expect(validators.length, "expected at least one public validator").toBeGreaterThan(0);

    const unwired: Array<{ name: string; file: string }> = [];
    for (const { name, file } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (!reachable.includes(name)) {
        unwired.push({ name, file });
      }
    }

    if (unwired.length > 0) {
      const lines = unwired
        .map((u) => `  - ${u.name} (${path.relative(process.cwd(), u.file)})`)
        .join("\n");
      throw new Error(
        `The following prototyping validators are exported but not reachable from validate.ts:\n${lines}\n\n` +
          "Wire the validator into runPrototypingValidators (directly or via an orchestrator " +
          "like validateStateGate) before merging. This guard exists to prevent the v1.8.3 " +
          "dead-code-validator regression (RR §8.6).",
      );
    }
  });

  it("validators/index.ts re-exports every public prototyping validator (excluding pending-wiring)", async () => {
    const validators = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);
    const indexBody = await readFile(VALIDATORS_INDEX, "utf-8");

    const missingExports: string[] = [];
    for (const { name } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (!indexBody.includes(name)) {
        missingExports.push(name);
      }
    }

    expect(
      missingExports,
      `validators/index.ts must re-export every public prototyping validator. Missing: ${missingExports.join(", ")}`,
    ).toEqual([]);
  });

  it("validateExecutionPlanIssues is wired (QFAI-PROT-310)", async () => {
    const reachable = await buildReachableText();
    expect(
      reachable.includes("validateExecutionPlanIssues"),
      "validateExecutionPlanIssues must reach runPrototypingValidators",
    ).toBe(true);
  });

  it("validateDelegationMapIssues is wired (QFAI-PROT-311)", async () => {
    const reachable = await buildReachableText();
    expect(
      reachable.includes("validateDelegationMapIssues"),
      "validateDelegationMapIssues must reach runPrototypingValidators",
    ).toBe(true);
  });

  it("PENDING_WIRING list does not grow silently (target: stay at 0)", () => {
    // Tripwire: if a contributor adds to PENDING_WIRING without justification,
    // this assertion documents the current count and forces a deliberate
    // update when changing it. The list MUST shrink, not grow.
    //
    // v1.8.4 Phase 3: PENDING_WIRING is empty. Every prototyping validator
    // is now reachable from runPrototypingValidators. NEW dead-code
    // validators cannot enter the codebase silently.
    expect(PENDING_WIRING.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ATDD family: the same dead-code failure mode outside validators/prototyping/
// ---------------------------------------------------------------------------

const VALIDATORS_DIR = path.resolve(__dirname, "../../src/core/validators");

/**
 * The module that owns the ATDD gate family. Pinned by name so that deleting
 * it cannot be disguised by some other module happening to emit an ATDD code:
 * `modules.length > 0` alone would still hold and every other assertion would
 * vacuously pass.
 */
const ATDD_GATE_MODULE = path.resolve(VALIDATORS_DIR, "atddCodeTraceability.ts");

/** The exported entry point every `qfai validate` profile runs through. */
const VALIDATE_ENTRY = "validateProject";

/** The orchestrator `--profile atdd` dispatches to; the ATDD profile boundary. */
const ATDD_PROFILE_ENTRY = "runAtddValidators";

const ATDD_CODE_PATTERN = /^QFAI-ATDD-\d+$/;
/** Static `from "./x.js"` plus dynamic `await import("./x.js")` specifiers. */
const MODULE_SPECIFIER_RE = /(?:from\s*|import\s*\(\s*)["'](\.\.?\/[\w./-]+)["']/g;

function parse(fileName: string, body: string): ts.SourceFile {
  return ts.createSourceFile(fileName, body, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

/** Every string literal in a module, `code` constants included. Comments are not literals. */
function collectStringLiterals(fileName: string, body: string): string[] {
  const literals: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteralLike(node)) literals.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(parse(fileName, body));
  return literals;
}

/**
 * `const RULE_ID = "QFAI-..."` bindings, by name. Rule IDs are routinely named
 * this way (`upstreamSsotGuard.ts:30` exports `UPSTREAM_SSOT_EDIT_RULE_ID` and
 * passes it to `issue()`), so a literal-only reader would see such a module
 * emit nothing and drop it from the ATDD family altogether.
 */
function collectStringConstants(source: ts.SourceFile): Map<string, string> {
  const constants = new Map<string, string>();
  const visit = (node: ts.Node): void => {
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
  return constants;
}

/** The string value of an argument: a literal, or a constant declared in the module. */
function constantValue(
  expression: ts.Expression,
  constants: ReadonlyMap<string, string>,
): string | undefined {
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (ts.isIdentifier(expression)) return constants.get(expression.text);
  return undefined;
}

/**
 * Issue codes a module actually *emits*: the first argument of an `issue(...)`
 * call, plus any `code:` property in an Issue literal — as a string literal, or
 * as an identifier resolved against the module's own string constants.
 *
 * Prose is deliberately invisible here. `scaffoldPlaceholder.ts` and
 * `tddList.ts` both discuss `QFAI-ATDD-112` in comments and in the message text
 * of a `D-SCAFFOLD-*` / `TDDLIST_*` finding while emitting no ATDD code at all —
 * a whole-file text scan counted them as ATDD emitters, so a deletion of the
 * real gate module would have left the guard green on two impostors.
 *
 * Known limit: a rule ID *imported* from another module still reads as no code.
 * No validator does that today, and the `QFAI-ATDD-001` retirement check below
 * scans every string literal under `src/` precisely so a cross-module constant
 * cannot smuggle the retired code back in.
 */
function collectEmittedCodes(fileName: string, body: string): string[] {
  const source = parse(fileName, body);
  const constants = collectStringConstants(source);
  const codes = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "issue"
    ) {
      const first = node.arguments[0];
      const code = first === undefined ? undefined : constantValue(first, constants);
      if (code !== undefined) codes.add(code);
    }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "code") {
      const code = constantValue(node.initializer, constants);
      if (code !== undefined) codes.add(code);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...codes];
}

/** Top-level `export [async] function validate*` / `export const validate* =`. */
function collectExportedValidatorNames(fileName: string, body: string): string[] {
  const names: string[] = [];
  const isExported = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  for (const stmt of parse(fileName, body).statements) {
    if (ts.isFunctionDeclaration(stmt)) {
      if (stmt.name && stmt.name.text.startsWith("validate") && isExported(stmt)) {
        names.push(stmt.name.text);
      }
      continue;
    }
    if (ts.isVariableStatement(stmt) && isExported(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text.startsWith("validate")) {
          names.push(decl.name.text);
        }
      }
    }
  }
  return names;
}

// ---------------------------------------------------------------------------
// Declaration-level call graph
//
// Module-level reachability is not wiring. A text (or even AST) hit anywhere in
// an importable module says nothing about whether that code ever runs: the call
// may sit in a helper nobody invokes, or in a comment. Reachability is
// therefore computed over *declarations* — who calls whom.
//
// A node is the pair (declaring file, declared name), never a bare name. Bare
// names merge every same-named declaration in the import graph: a reachable
// `check()` in one module and an unreachable `check()` in another that calls a
// validator would collapse into one node and report the validator as executed.
// Callees are resolved through the caller's own import bindings (following
// `export { x } from` barrels), so an edge always lands on the declaration the
// call actually reaches.
// ---------------------------------------------------------------------------

/** A call-graph node: the declaration `name` inside `file`. */
function declId(file: string, name: string): string {
  return `${file}#${name}`;
}

/** Node for statements outside any function; importing the module runs them. */
function moduleTopLevelOwner(file: string): string {
  return declId(file, "<module>");
}

/**
 * The declaration name a call site names, or `undefined` when syntax alone
 * cannot say. `adapter.check()` deliberately yields nothing: reducing it to the
 * bare `check` hands the edge to whatever local `check()` the same file happens
 * to declare — including one nobody invokes — and a validator called only from
 * that dead local would read as executed.
 */
function calleeName(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) return expression.text;
  return undefined;
}

/** Combinators that invoke a callback argument where it stands. */
const CALLBACK_INVOKING_METHODS: ReadonlySet<string> = new Set<string>([
  "map",
  "flatMap",
  "forEach",
  "filter",
  "find",
  "findIndex",
  "findLast",
  "some",
  "every",
  "reduce",
  "sort",
  "then",
  "catch",
  "finally",
]);

/** A graph node for an unnamed function expression / arrow. */
function anonymousId(file: string, node: ts.Node): string {
  return declId(file, `<anonymous@${node.pos}>`);
}

/**
 * Whether an unnamed function runs at the point it is written — an IIFE, or the
 * callback of a combinator that invokes it. `register(() => validateAtddFoo())`
 * does not qualify: merely handing a closure to someone is not running it, and
 * folding its body into the caller would report a never-invoked validator as
 * executed.
 */
function invokedInPlace(node: ts.FunctionExpression | ts.ArrowFunction): boolean {
  let current: ts.Node = node;
  let parent: ts.Node | undefined = current.parent;
  while (parent !== undefined && ts.isParenthesizedExpression(parent)) {
    current = parent;
    parent = parent.parent;
  }
  if (parent === undefined || !ts.isCallExpression(parent)) return false;
  if (parent.expression === current) return true;
  if (!parent.arguments.some((argument) => argument === current)) return false;
  const callee = parent.expression;
  if (ts.isPropertyAccessExpression(callee)) return CALLBACK_INVOKING_METHODS.has(callee.name.text);
  if (ts.isIdentifier(callee)) return CALLBACK_INVOKING_METHODS.has(callee.text);
  return false;
}

/** `const validateX = async () => {}` / `{ validateX: () => {} }` name their function. */
function boundName(node: ts.Node): string | undefined {
  const parent: ts.Node | undefined = node.parent;
  if (parent === undefined) return undefined;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  return undefined;
}

/** Where an imported / re-exported binding comes from. */
type ImportTarget = { file: string; name: string };

type ModuleFacts = {
  file: string;
  source: ts.SourceFile;
  /** Names declared in this module (functions, methods, function-valued bindings). */
  declared: Set<string>;
  /** Local binding name -> origin, for static and `await import()` named imports. */
  imports: Map<string, ImportTarget>;
  /** `export { a as b } from "./x.js"` — exported name -> origin. */
  reExports: Map<string, ImportTarget>;
  /** `export * from "./x.js"` targets. */
  starReExports: string[];
};

/** Resolve a relative specifier to the `.ts` path this repo compiles it from. */
function specifierTarget(fromFile: string, specifier: string): string {
  return path.resolve(path.dirname(fromFile), specifier.replace(/\.js$/, ".ts"));
}

/** `await import("./x.js")` / `import("./x.js")` initializer -> resolved path. */
function dynamicImportTarget(file: string, initializer?: ts.Expression): string | undefined {
  let expr: ts.Expression | undefined = initializer;
  if (expr !== undefined && ts.isAwaitExpression(expr)) expr = expr.expression;
  if (expr === undefined || !ts.isCallExpression(expr)) return undefined;
  if (expr.expression.kind !== ts.SyntaxKind.ImportKeyword) return undefined;
  const arg = expr.arguments[0];
  if (arg === undefined || !ts.isStringLiteralLike(arg) || !arg.text.startsWith(".")) {
    return undefined;
  }
  return specifierTarget(file, arg.text);
}

/** Declarations and binding origins of one module — the input to edge resolution. */
function moduleFacts(file: string, body: string): ModuleFacts {
  const source = parse(file, body);
  const declared = new Set<string>();
  const imports = new Map<string, ImportTarget>();
  const reExports = new Map<string, ImportTarget>();
  const starReExports: string[] = [];

  const relativeTarget = (specifier?: ts.Expression): string | undefined =>
    specifier !== undefined && ts.isStringLiteralLike(specifier) && specifier.text.startsWith(".")
      ? specifierTarget(file, specifier.text)
      : undefined;

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      declared.add(node.name.text);
    } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      declared.add(node.name.text);
    } else if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      const bound = boundName(node);
      if (bound !== undefined) declared.add(bound);
    }

    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const target = relativeTarget(node.moduleSpecifier);
      if (target !== undefined) {
        for (const element of node.importClause.namedBindings.elements) {
          imports.set(element.name.text, {
            file: target,
            name: (element.propertyName ?? element.name).text,
          });
        }
      }
    }

    if (ts.isExportDeclaration(node)) {
      const target = relativeTarget(node.moduleSpecifier);
      if (target !== undefined) {
        if (node.exportClause !== undefined && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            reExports.set(element.name.text, {
              file: target,
              name: (element.propertyName ?? element.name).text,
            });
          }
        } else if (node.exportClause === undefined) {
          starReExports.push(target);
        }
      }
    }

    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      const target = dynamicImportTarget(file, node.initializer);
      if (target !== undefined) {
        for (const element of node.name.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const imported =
            element.propertyName !== undefined && ts.isIdentifier(element.propertyName)
              ? element.propertyName.text
              : element.name.text;
          imports.set(element.name.text, { file: target, name: imported });
        }
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(source);
  return { file, source, declared, imports, reExports, starReExports };
}

/** Follow `export { x } from` / `export *` chains to the declaring module. */
function resolveExport(
  facts: ReadonlyMap<string, ModuleFacts>,
  file: string,
  name: string,
  seen: Set<string>,
): string | undefined {
  const key = declId(file, name);
  if (seen.has(key)) return undefined;
  seen.add(key);
  const module = facts.get(file);
  if (module === undefined) return undefined;
  if (module.declared.has(name)) return key;
  const reExport = module.reExports.get(name);
  if (reExport !== undefined) return resolveExport(facts, reExport.file, reExport.name, seen);
  for (const star of module.starReExports) {
    const hit = resolveExport(facts, star, name, seen);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/** The declaration a call site named `callee` inside `file` actually reaches. */
function resolveCallee(
  facts: ReadonlyMap<string, ModuleFacts>,
  file: string,
  callee: string,
): string | undefined {
  const module = facts.get(file);
  if (module === undefined) return undefined;
  if (module.declared.has(callee)) return declId(file, callee);
  const imported = module.imports.get(callee);
  if (imported === undefined) return undefined;
  return resolveExport(facts, imported.file, imported.name, new Set<string>());
}

function addEdge(edges: Map<string, Set<string>>, from: string, to: string): void {
  const targets = edges.get(from) ?? new Set<string>();
  targets.add(to);
  edges.set(from, targets);
}

/** Add every `caller -> callee` edge in one module to the shared graph. */
function collectCallEdges(
  facts: ReadonlyMap<string, ModuleFacts>,
  module: ModuleFacts,
  edges: Map<string, Set<string>>,
): void {
  const walk = (node: ts.Node, owner: string): void => {
    let nextOwner = owner;
    if (ts.isFunctionDeclaration(node) && node.name) {
      nextOwner = declId(module.file, node.name.text);
    } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      nextOwner = declId(module.file, node.name.text);
    } else if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      const bound = boundName(node);
      if (bound !== undefined) {
        nextOwner = declId(module.file, bound);
      } else {
        // An unnamed closure owns its own body. It joins the caller only where
        // it is actually invoked, so a validator parked in a callback nobody
        // runs stays unreachable.
        nextOwner = anonymousId(module.file, node);
        if (invokedInPlace(node)) addEdge(edges, owner, nextOwner);
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = calleeName(node.expression);
      const target = callee === undefined ? undefined : resolveCallee(facts, module.file, callee);
      if (target !== undefined) addEdge(edges, owner, target);
    }
    ts.forEachChild(node, (child) => walk(child, nextOwner));
  };
  walk(module.source, moduleTopLevelOwner(module.file));
}

/** Declaration-level call graph over a `path -> source` module set. */
function buildCallGraph(modules: ReadonlyMap<string, string>): Map<string, Set<string>> {
  const facts = new Map<string, ModuleFacts>();
  for (const [file, body] of modules) {
    facts.set(file, moduleFacts(file, body));
  }
  const edges = new Map<string, Set<string>>();
  for (const module of facts.values()) {
    collectCallEdges(facts, module, edges);
  }
  return edges;
}

/** Names transitively invoked starting from `roots`. */
function reachableFrom(edges: ReadonlyMap<string, Set<string>>, roots: string[]): Set<string> {
  const seen = new Set<string>(roots);
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const callee of edges.get(current) ?? []) {
      if (seen.has(callee)) continue;
      seen.add(callee);
      queue.push(callee);
    }
  }
  return seen;
}

/**
 * Every module transitively reachable from validate.ts through relative
 * specifiers, keyed by resolved `.ts` path. This is the *file* set the call
 * graph is built from — it decides which functions exist, not which run.
 */
async function buildImportedModules(): Promise<Map<string, string>> {
  const modules = new Map<string, string>();
  const queue: string[] = [VALIDATE_TS];
  const seen = new Set<string>(queue);

  while (queue.length > 0) {
    const file = queue.shift();
    if (file === undefined) break;
    let body: string;
    try {
      body = await readFile(file, "utf-8");
    } catch {
      // Unresolved specifier (directory index, type-only module) — best-effort
      // traversal, the guard degrades to "contributes no functions" for it.
      continue;
    }
    modules.set(file, body);
    MODULE_SPECIFIER_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MODULE_SPECIFIER_RE.exec(body)) !== null) {
      const rel = match[1];
      if (!rel) continue;
      const resolved = path.resolve(path.dirname(file), rel.replace(/\.js$/, ".ts"));
      if (!resolved.startsWith(SRC_ROOT)) continue;
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      queue.push(resolved);
    }
  }
  return modules;
}

type ExecutionGraph = { edges: Map<string, Set<string>>; modules: ReadonlyMap<string, string> };

async function buildExecutionGraph(): Promise<ExecutionGraph> {
  const modules = await buildImportedModules();
  return { edges: buildCallGraph(modules), modules };
}

/**
 * Declarations that run for *some* profile. `runProfileOwnValidators` dispatches
 * on `switch (profile)`, which a static graph cannot evaluate, so every branch
 * merges here — this set answers "does this run at all", never "does this run
 * for a given profile".
 */
function executedFromEntry(graph: ExecutionGraph): Set<string> {
  const roots = [
    declId(VALIDATE_TS, VALIDATE_ENTRY),
    ...[...graph.modules.keys()].map(moduleTopLevelOwner),
  ];
  return reachableFrom(graph.edges, roots);
}

/**
 * Declarations that run for `qfai validate --profile atdd`. Rooted at the
 * profile's own orchestrator so that a validator moved to another profile's
 * branch — still reachable from `validateProject` — reads as unwired here.
 */
function executedFromAtddProfile(graph: ExecutionGraph): Set<string> {
  return reachableFrom(graph.edges, [declId(VALIDATE_TS, ATDD_PROFILE_ENTRY)]);
}

/**
 * Names a barrel actually re-exports, read from its `ExportDeclaration` nodes.
 * A raw-text regex matched `// export { validateAtddFoo } from "./foo.js";`
 * just as happily as the live line, so commenting a re-export out left the
 * validator unreachable through the barrel with the guard still green.
 */
function reExportFacts(file: string, body: string): { names: Set<string>; starTargets: string[] } {
  const facts = moduleFacts(file, body);
  return { names: new Set<string>(facts.reExports.keys()), starTargets: facts.starReExports };
}

async function collectReExportedNames(file: string): Promise<Set<string>> {
  const body = await readFile(file, "utf-8");
  const { names, starTargets } = reExportFacts(file, body);
  for (const target of starTargets) {
    try {
      const targetBody = await readFile(target, "utf-8");
      for (const name of collectExportedValidatorNames(target, targetBody)) names.add(name);
    } catch {
      // Unresolved star target (directory index, deleted module): it
      // contributes no exported name, so the barrel check stays strict.
    }
  }
  return names;
}

type AtddModule = { file: string; codes: string[]; exports: string[] };

/** Validator modules that emit at least one `QFAI-ATDD-NNN` issue code. */
async function collectAtddEmittingModules(): Promise<AtddModule[]> {
  const files = await listTsFiles(VALIDATORS_DIR);
  const out: AtddModule[] = [];
  for (const file of files) {
    if (path.basename(file) === "index.ts") continue;
    const body = await readFile(file, "utf-8");
    const codes = collectEmittedCodes(file, body)
      .filter((c) => ATDD_CODE_PATTERN.test(c))
      .sort();
    if (codes.length === 0) continue;
    out.push({ file, codes, exports: collectExportedValidatorNames(file, body) });
  }
  return out;
}

describe("meta-test: ATDD validators are reachable from the production graph", () => {
  const SAMPLE_FILE = path.join(SRC_ROOT, "atddSample.ts");
  const SAMPLE_SOURCE = "export async function validateAtddSample() {\n  return [];\n}";
  const sampleDecl = declId(SAMPLE_FILE, "validateAtddSample");
  const caller = (file: string, source: string): ReadonlyMap<string, string> =>
    new Map([
      [SAMPLE_FILE, SAMPLE_SOURCE],
      [file, source],
    ]);

  it("neither a barrel re-export nor a commented-out call is a call site", () => {
    const barrel = path.join(SRC_ROOT, "barrel.ts");
    const edges = buildCallGraph(
      caller(
        barrel,
        [
          'export { validateAtddSample } from "./atddSample.js";',
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators() {",
          "  // return [...(await validateAtddSample(root, config))];",
          "  return [];",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachableFrom(edges, [declId(barrel, "runAtddValidators")]).has(sampleDecl)).toBe(false);

    const live = path.join(SRC_ROOT, "live.ts");
    const liveEdges = buildCallGraph(
      caller(
        live,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators() {",
          "  return [...(await validateAtddSample())];",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachableFrom(liveEdges, [declId(live, "runAtddValidators")]).has(sampleDecl)).toBe(
      true,
    );
  });

  it("a call inside a function nobody invokes is not reachable", () => {
    const orphan = path.join(SRC_ROOT, "orphanHelper.ts");
    const edges = buildCallGraph(
      caller(
        orphan,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators() {",
          "  return [];",
          "}",
          "async function unusedHelper() {",
          "  return validateAtddSample();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachableFrom(edges, [declId(orphan, "runAtddValidators")]).has(sampleDecl)).toBe(false);
    expect(reachableFrom(edges, [declId(orphan, "unusedHelper")]).has(sampleDecl)).toBe(true);
  });

  it("same-named declarations in different modules are distinct graph nodes", () => {
    // A bare-name graph merges both `check()` declarations into one node, so the
    // orphan module's call to the validator becomes reachable from the wired
    // `check()` and the validator reads as executed while nothing invokes it.
    const wired = path.join(SRC_ROOT, "wired.ts");
    const orphan = path.join(SRC_ROOT, "orphanModule.ts");
    const edges = buildCallGraph(
      new Map([
        [SAMPLE_FILE, SAMPLE_SOURCE],
        [
          wired,
          [
            "function check() {",
            "  return [];",
            "}",
            "async function runAtddValidators() {",
            "  return check();",
            "}",
          ].join("\n"),
        ],
        [
          orphan,
          [
            'import { validateAtddSample } from "./atddSample.js";',
            "function check() {",
            "  return validateAtddSample();",
            "}",
          ].join("\n"),
        ],
      ]),
    );
    expect(reachableFrom(edges, [declId(wired, "runAtddValidators")]).has(sampleDecl)).toBe(false);
    expect(reachableFrom(edges, [declId(orphan, "check")]).has(sampleDecl)).toBe(true);
  });

  it("a validator reached only from another profile's branch is not ATDD-wired", () => {
    // `switch (profile)` is not evaluated by a static graph: rooting at
    // validateProject merges every branch, so profile membership must be read
    // from the profile's own orchestrator instead.
    const entry = path.join(SRC_ROOT, "profileEntry.ts");
    const edges = buildCallGraph(
      caller(
        entry,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "export async function validateProject(profile) {",
          "  return runProfileOwnValidators(profile);",
          "}",
          "async function runProfileOwnValidators(profile) {",
          "  switch (profile) {",
          '    case "atdd":',
          "      return runAtddValidators();",
          "    default:",
          "      return runUiuxValidators();",
          "  }",
          "}",
          "async function runAtddValidators() {",
          "  return [];",
          "}",
          "async function runUiuxValidators() {",
          "  return validateAtddSample();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachableFrom(edges, [declId(entry, "validateProject")]).has(sampleDecl)).toBe(true);
    expect(reachableFrom(edges, [declId(entry, "runAtddValidators")]).has(sampleDecl)).toBe(false);
  });

  it("a property call does not borrow a same-named local declaration", () => {
    // `adapter.check()` reduced to a bare `check` handed the edge to the local
    // `check()` below — which nothing invokes — and the validator it calls read
    // as executed.
    const receiver = path.join(SRC_ROOT, "receiver.ts");
    const edges = buildCallGraph(
      caller(
        receiver,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators(adapter) {",
          "  return adapter.check();",
          "}",
          "function check() {",
          "  return validateAtddSample();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachableFrom(edges, [declId(receiver, "runAtddValidators")]).has(sampleDecl)).toBe(
      false,
    );
    expect(reachableFrom(edges, [declId(receiver, "check")]).has(sampleDecl)).toBe(true);
  });

  it("a validator parked in an unrun callback is not reachable from its registrar", () => {
    const registry = path.join(SRC_ROOT, "registry.ts");
    const edges = buildCallGraph(
      caller(
        registry,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "const pending = [];",
          "function register(task) {",
          "  pending.push(task);",
          "}",
          "async function runAtddValidators() {",
          "  register(() => validateAtddSample());",
          "  return [];",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachableFrom(edges, [declId(registry, "runAtddValidators")]).has(sampleDecl)).toBe(
      false,
    );

    // A callback a combinator invokes where it stands still counts as running.
    const mapped = path.join(SRC_ROOT, "mapped.ts");
    const mappedEdges = buildCallGraph(
      caller(
        mapped,
        [
          'import { validateAtddSample } from "./atddSample.js";',
          "async function runAtddValidators(specs) {",
          "  return (await Promise.all(specs.map((spec) => validateAtddSample(spec)))).flat();",
          "}",
        ].join("\n"),
      ),
    );
    expect(reachableFrom(mappedEdges, [declId(mapped, "runAtddValidators")]).has(sampleDecl)).toBe(
      true,
    );
  });

  it("prose that merely names an ATDD code does not make a module an emitter", () => {
    const proseOnly = [
      "// `QFAI-ATDD-112` stopped demanding an annotation for L1/L2, so this",
      "// ledger is their only gate.",
      "const findings = [",
      '  issue("D-SCAFFOLD-PLACEHOLDER", "left exactly as QFAI-ATDD-112 saw it", "warning"),',
      "];",
    ].join("\n");
    expect(collectEmittedCodes("proseOnly.ts", proseOnly)).toEqual(["D-SCAFFOLD-PLACEHOLDER"]);

    const emitter = 'return [issue("QFAI-ATDD-112", "TC lacks a test annotation", "error")];';
    expect(collectEmittedCodes("emitter.ts", emitter)).toEqual(["QFAI-ATDD-112"]);
  });

  it("a rule ID handed to issue() through a constant is still an emitted code", () => {
    // `upstreamSsotGuard.ts:30,169` is the live instance of this shape. A
    // literal-only reader saw no code at all, so an ATDD validator written the
    // same way dropped out of the family and skipped every check below.
    const viaConstant = [
      'const ATDD_RULE_ID = "QFAI-ATDD-999";',
      'return [issue(ATDD_RULE_ID, "message", "error")];',
    ].join("\n");
    expect(collectEmittedCodes("viaConstant.ts", viaConstant)).toEqual(["QFAI-ATDD-999"]);

    const viaCodeProperty = [
      'const ATDD_RULE_ID = "QFAI-ATDD-998";',
      "return [{ code: ATDD_RULE_ID, severity: \"error\", message: 'm' }];",
    ].join("\n");
    expect(collectEmittedCodes("viaProperty.ts", viaCodeProperty)).toEqual(["QFAI-ATDD-998"]);
  });

  it("the ATDD gate module still exists and still emits the routing codes", async () => {
    const modules = await collectAtddEmittingModules();
    const gate = modules.find((m) => m.file === ATDD_GATE_MODULE);

    expect(
      gate?.file,
      "validators/atddCodeTraceability.ts owns the QFAI-ATDD-* family. If it was deleted or " +
        "stopped emitting, the reachability assertions below go vacuous.",
    ).toBe(ATDD_GATE_MODULE);
    // US -> tests/e2e/**, TC -> tests/integration/**, CON-API -> tests/api/**.
    // QFAI-ATDD-113 is the CON-API leg: without it pinned here, dropping the
    // CON-API coverage gate alone leaves every assertion in this file green.
    expect(gate?.codes).toEqual(
      expect.arrayContaining([
        "QFAI-ATDD-111",
        "QFAI-ATDD-112",
        "QFAI-ATDD-113",
        "QFAI-ATDD-121",
        "QFAI-ATDD-122",
      ]),
    );
  });

  it("every exported validator of an ATDD-emitting module runs on the atdd profile", async () => {
    const modules = await collectAtddEmittingModules();
    const graph = await buildExecutionGraph();
    const executed = executedFromAtddProfile(graph);

    expect(
      executedFromEntry(graph).has(declId(VALIDATE_TS, ATDD_PROFILE_ENTRY)),
      "runAtddValidators must itself be reachable from validateProject, or the check below " +
        "measures nothing.",
    ).toBe(true);

    const unwired: string[] = [];
    for (const { file, exports, codes } of modules) {
      const rel = path.relative(SRC_ROOT, file);
      if (exports.length === 0) {
        unwired.push(`${rel} (emits ${codes.join(", ")} but exports no validate* function)`);
        continue;
      }
      // Per validator, not per module: a module that co-locates a wired
      // `validateA` with an unwired `validateB` must still fail on B.
      for (const name of exports) {
        if (!executed.has(declId(file, name))) unwired.push(`${rel}#${name}`);
      }
    }

    expect(
      unwired,
      "Each ATDD validator must be invoked on a path that actually executes under " +
        "`--profile atdd` — runAtddValidators, or an orchestrator it reaches. Being importable " +
        "is not wiring: a re-export from validators/index.ts, a commented-out call, and a call " +
        "inside a helper nobody invokes all leave the validator's issue codes unable to appear " +
        "in validate.json — exactly the dead-validator state QFAI-ATDD-001 was in. Reachability " +
        "from some *other* profile's branch is not wiring either.",
    ).toEqual([]);
  });

  it("validators/index.ts re-exports every ATDD-emitting validator", async () => {
    const modules = await collectAtddEmittingModules();
    const reExported = await collectReExportedNames(VALIDATORS_INDEX);

    const missing: string[] = [];
    for (const { exports } of modules) {
      for (const name of exports) {
        if (!reExported.has(name)) missing.push(name);
      }
    }

    expect(
      missing,
      `validators/index.ts must re-export every ATDD-emitting validator. Missing: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("a commented-out re-export is not a re-export", () => {
    const barrel = path.join(VALIDATORS_DIR, "index.ts");
    const { names } = reExportFacts(
      barrel,
      [
        '// export { validateAtddCommented } from "./commented.js";',
        '/* export { validateAtddBlock } from "./block.js"; */',
        'export { validateAtddLive } from "./live.js";',
      ].join("\n"),
    );
    expect([...names]).toEqual(["validateAtddLive"]);
  });

  it("QFAI-ATDD-001 stays retired", async () => {
    // Every string literal under src/, not just a quoted hit under validators/:
    // re-declaring the code as `const ATDD_LEDGER_MISSING = "QFAI-ATDD-001"`
    // elsewhere and passing the constant to `issue()` would revive the finding
    // while leaving no matching literal in the validators directory.
    const files = await listTsFiles(SRC_ROOT);
    const emitters: string[] = [];
    for (const file of files) {
      const body = await readFile(file, "utf-8");
      if (!body.includes("QFAI-ATDD-001")) continue;
      if (collectStringLiterals(file, body).includes("QFAI-ATDD-001")) {
        emitters.push(path.relative(SRC_ROOT, file));
      }
    }

    expect(
      emitters,
      "QFAI-ATDD-001 fired on the *absence* of <spec-dir>/atdd/coverage-ledger.md, a file " +
        "`qfai init` never ships and that qfai-atdd/SKILL.md and catalog/test-layers.md both " +
        "classify as optional legacy. The code is retired; do not reintroduce it.",
    ).toEqual([]);
  });
});

/**
 * The two review-artifact layouts contradict each other. This is the guard that
 * fires when that contradiction becomes REACHABLE — #1078, recorded as
 * `OQ-0012-0013` under `CR-20260904-0002`.
 *
 * `validate`'s reviewer-deliverable gate reads the flat
 * `.qfai/evidence/prototyping/iter-NN/review.json`. `qfai prototyping certify`
 * requires the per-spec `iter-NN/spec-NNNN/<screen>.review.json` and exits 64
 * for a multi-spec frozen set without it. A project that satisfies one fails
 * the other, and `certify` will not seal unless `validate` reports zero errors,
 * so a multi-spec project is uncertifiable either way.
 *
 * Which artifact is canonical is **deferred**, not decided. Both ends of the
 * contradiction already have behaviour coverage — `certify`'s exit 64 on
 * `frozenSpecsCovered: ["0012", "0007"]`, and the flat gate's
 * `prototypingEvidence.review.missing` — and `TC-0012-0388` pins the
 * single-spec freeze. Those rows are not duplicated here. What nothing covered
 * is the moment the deferral stops being safe.
 *
 * ## Why this watches module EDGES rather than call shapes
 *
 * Two earlier drafts chased the shape of the use — `name(…)`, then that plus
 * aliases and namespaces — and review found a further evasion each time: a
 * `export * from` barrel, and `export const forwarded = watched` inside the
 * declaring module, which has no call at all. Chasing shapes is a losing game
 * because there is always one more.
 *
 * The module edge is the choke point instead. Nothing in those modules can be
 * used without an import or re-export edge into them, whatever it is then
 * renamed to, assigned into, or re-published through — and a barrel chain is
 * caught at its first link, where the barrel itself takes the edge. Measured on
 * this tree: **zero** such edges exist, so the invariant is "still zero" rather
 * than an allowlist of tolerated ones.
 *
 * No row claims the contradiction is acceptable. Each failure message names the
 * decision that now has to be made rather than telling the reader to revert.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(import.meta.dirname, "../../src");

/** The modules that declare the per-spec review layout's surface. */
const DECLARING_MODULES: readonly string[] = [
  "core/prototyping/iterationPaths.ts",
  "core/prototyping/reviewerDispatch.ts",
];

/**
 * Names in those modules that say nothing about which review layout is in use.
 *
 * `findStaleIterDirs` / `deleteStaleIterDirs` walk `iter-NN` directories for
 * cleanup. An edge importing only these is not a per-spec wire-in, and blocking
 * it would redden this guard on a change that has nothing to do with the
 * decision it guards. (A star re-export or namespace import republishes
 * everything, so neither is covered by this list.)
 */
const LAYOUT_NEUTRAL_NAMES: ReadonlySet<string> = new Set([
  "findStaleIterDirs",
  "deleteStaleIterDirs",
]);

/**
 * The exported surface of each declaring module, pinned.
 *
 * The edge check catches a consumer. This catches the *supply* side one step
 * earlier: `export const forwarded = iterationReviewPathPerSpec` adds no call
 * and no edge of its own, but it hands the per-spec layout to any importer
 * under a name nothing watches. Pinned as an enumeration, so a new export there
 * has to be justified in review.
 */
const PINNED_EXPORTS: Readonly<Record<string, readonly string[]>> = {
  "core/prototyping/iterationPaths.ts": [
    "deleteStaleIterDirs",
    "findIterationReviewFiles",
    "findStaleIterDirs",
    "iterationDirPerSpec",
    "iterationReviewPathPerSpec",
    "parseIterationReviewPath",
  ],
  "core/prototyping/reviewerDispatch.ts": [
    "DEFAULT_REVIEWER_ATTEMPT_LIMIT",
    "ReviewerAttemptResult",
    "ReviewerBackoffStrategy",
    "ReviewerDispatchOptions",
    "ReviewerOutcome",
    "ReviewerPlaywrightAttempt",
    "ReviewerPlaywrightRunner",
    "ReviewerSessionStatus",
    "defaultExponentialBackoff",
    "dispatchReviewerToPair",
  ],
};

const GATE_MODULE = "core/validators/prototypingEvidence.ts";
const GATE_FUNCTION = "validateIterationReviewArtifacts";
/** The flat-layout helper the gate must keep reading. */
const FLAT_HELPER = "iterationReviewPath";

const TRIGGER_GUIDANCE =
  "This is NOT a regression to revert — it is the trigger OQ-0012-0013 names. Decide which " +
  "artifact is canonical, record it against CR-20260904-0002, and then move or delete this guard " +
  "as that decision requires.";

async function productionModules(dir: string = SRC_ROOT): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await productionModules(full)));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

function parse(source: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

const relative = (file: string): string => path.relative(SRC_ROOT, file).split(path.sep).join("/");

const DECLARING_BASENAMES = new Set(DECLARING_MODULES.map((rel) => path.basename(rel, ".ts")));

/**
 * The specifier text when it names a declaring module, else `undefined`.
 *
 * Returns the text rather than a boolean so the caller narrows through the
 * return value instead of asserting the node's type back afterwards — the
 * project forbids bare `as`, and a `as ts.StringLiteral` here would be exactly
 * that.
 */
function declaringModuleSpecifier(
  node: ts.ImportDeclaration | ts.ExportDeclaration,
): string | undefined {
  const specifier = node.moduleSpecifier;
  if (specifier === undefined || !ts.isStringLiteral(specifier)) return undefined;
  const base = path.basename(specifier.text).replace(/\.js$/, "");
  return DECLARING_BASENAMES.has(base) ? specifier.text : undefined;
}

/**
 * Runtime edges from one module into a declaring module.
 *
 * Type-only is excluded at both levels — `import type { X }` and
 * `import { type X }` — because such an import has no runtime binding: nothing
 * is reachable through it, so reporting one would block a change that cannot
 * make the contradiction live. Same for `export type { … } from`.
 */
function declaringModuleEdges(source: string, fileName: string): string[] {
  const parsed = parse(source, fileName);
  const edges: string[] = [];

  for (const stmt of parsed.statements) {
    if (!ts.isImportDeclaration(stmt) && !ts.isExportDeclaration(stmt)) continue;
    const target = declaringModuleSpecifier(stmt);
    if (target === undefined) continue;

    const isImport = ts.isImportDeclaration(stmt);
    const clauseTypeOnly = isImport
      ? Boolean(stmt.importClause?.isTypeOnly)
      : Boolean(stmt.isTypeOnly);
    if (clauseTypeOnly) continue;

    const bindings = isImport ? stmt.importClause?.namedBindings : stmt.exportClause;

    if (bindings === undefined) {
      // `export * from "…"` republishes every name, the watched ones included,
      // and `import "…"` runs the module. Either is an edge on its own.
      edges.push(`${isImport ? "imports" : "re-exports *"} from ${target}`);
      continue;
    }
    if (ts.isNamespaceImport(bindings)) {
      // `import * as ns` exposes every export under `ns.…`.
      edges.push(`namespace-imports ${target} as ${bindings.name.text}`);
      continue;
    }
    if (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) {
      const carried = bindings.elements
        .filter((element) => !element.isTypeOnly)
        .map((element) => (element.propertyName ?? element.name).text)
        .filter((name) => !LAYOUT_NEUTRAL_NAMES.has(name));
      if (carried.length > 0) {
        edges.push(
          `${isImport ? "imports" : "re-exports"} ${carried.sort().join(", ")} from ${target}`,
        );
      }
    }
  }

  // A dynamic `import("…")` is a runtime edge too, and it is not a statement —
  // it is a call anywhere in the body, so the loop above cannot see it. This is
  // the likeliest wire-in shape rather than the most exotic: dynamic import is
  // used in nine modules here, and `cli/commands/prototypingIterate.ts` — where
  // a per-spec wire-in would live — already loads six sibling
  // `core/prototyping/*` modules exactly this way. Like a namespace import, it
  // hands over the whole module, so no name filter applies.
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0
    ) {
      const [specifier] = node.arguments;
      if (specifier !== undefined && ts.isStringLiteral(specifier)) {
        const base = path.basename(specifier.text).replace(/\.js$/, "");
        if (DECLARING_BASENAMES.has(base)) {
          edges.push(`dynamically imports ${specifier.text}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);

  return [...new Set(edges)].sort();
}

/** Exported names of one module, in the shape `PINNED_EXPORTS` records. */
function exportedNames(source: string, fileName: string): string[] {
  const parsed = parse(source, fileName);
  const names: string[] = [];
  for (const stmt of parsed.statements) {
    const modifiers = ts.canHaveModifiers(stmt) ? (ts.getModifiers(stmt) ?? []) : [];
    if (!modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (ts.isVariableStatement(stmt)) {
      for (const declaration of stmt.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      }
    } else if (
      (ts.isFunctionDeclaration(stmt) ||
        ts.isClassDeclaration(stmt) ||
        ts.isInterfaceDeclaration(stmt) ||
        ts.isTypeAliasDeclaration(stmt) ||
        ts.isEnumDeclaration(stmt)) &&
      stmt.name !== undefined
    ) {
      names.push(stmt.name.text);
    }
    // A re-export clause carries no local declaration; the edge check above is
    // what sees those.
  }
  return [...new Set(names)].sort();
}

/**
 * The local names a module binds to `original` through its imports.
 *
 * Row 3 resolves the gate's callee back to the import binding rather than
 * comparing the written name: re-importing `iterationReviewPath as
 * flatReviewPath` and calling that changes no behaviour, and a name comparison
 * would fail the row on it — blocking a PR that did not touch the decision this
 * guard is about.
 */
function localNamesFor(source: string, fileName: string, original: string): Set<string> {
  const parsed = parse(source, fileName);
  const locals = new Set<string>();
  for (const stmt of parsed.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (stmt.importClause?.isTypeOnly) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if (element.isTypeOnly) continue;
      if ((element.propertyName ?? element.name).text === original) locals.add(element.name.text);
    }
  }
  return locals;
}

/**
 * `seeds` plus every local name assigned from one of them, transitively.
 *
 * `const flatPath = iterationReviewPath; … flatPath(i)` is a behaviour-preserving
 * tidy-up. Without this the gate row would see only `flatPath`, conclude the
 * flat helper is no longer read, and block a change that did not touch the
 * decision this guard is about — the same false-positive class as comparing
 * callee text instead of resolving the import binding.
 */
function withLocalAliases(source: string, fileName: string, seeds: Set<string>): Set<string> {
  const parsed = parse(source, fileName);
  /** local name -> the identifier it was assigned from. */
  const assignedFrom = new Map<string, string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isIdentifier(node.initializer)
    ) {
      assignedFrom.set(node.name.text, node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);

  const resolved = new Set(seeds);
  // Fixed point, so a chain of renames resolves rather than only one hop.
  let grew = true;
  while (grew) {
    grew = false;
    for (const [local, from] of assignedFrom) {
      if (resolved.has(from) && !resolved.has(local)) {
        resolved.add(local);
        grew = true;
      }
    }
  }
  return resolved;
}

/** Names called as `name(…)` or `x.name(…)` inside ONE named function's body. */
function callsInsideFunction(
  source: string,
  fileName: string,
  functionName: string,
): ReadonlySet<string> {
  const parsed = parse(source, fileName);
  const names = new Set<string>();
  let found = false;

  const collect = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee)) names.add(callee.text);
      else if (ts.isPropertyAccessExpression(callee)) names.add(callee.name.text);
    }
    ts.forEachChild(node, collect);
  };
  const find = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
      found = true;
      if (node.body) collect(node.body);
    }
    ts.forEachChild(node, find);
  };
  ts.forEachChild(parsed, find);

  // A renamed or deleted function must not read as "calls nothing", which would
  // pass the positive assertion below by vacuity.
  if (!found) throw new Error(`${functionName} not found in ${fileName}`);
  return names;
}

describe("the per-spec review layout stays unreachable while its canonical status is undecided", () => {
  it("has no production module taking a runtime edge into the per-spec modules", async () => {
    const modules = await productionModules();
    // A walk that found almost nothing would pass this row silently.
    expect(modules.length).toBeGreaterThan(200);

    const edges: string[] = [];
    for (const file of modules) {
      if (DECLARING_MODULES.includes(relative(file))) continue;
      const source = await readFile(file, "utf-8");
      for (const edge of declaringModuleEdges(source, file)) {
        edges.push(`${relative(file)} ${edge}`);
      }
    }

    expect(
      edges.sort(),
      "the per-spec review layout is reachable from production code, so `validate` (which reads " +
        "the flat iter-NN/review.json) and `certify` (which requires " +
        "iter-NN/spec-NNNN/<screen>.review.json for a multi-spec frozen set) can now contradict " +
        "each other on a live project: satisfying one fails the other, and certify will not seal " +
        `while validate reports errors. ${TRIGGER_GUIDANCE}`,
    ).toEqual([]);
  });

  it("adds no new export to the per-spec modules", async () => {
    // The supply side. A forwarding export hands the layout to any importer
    // under a name nothing watches, while adding no call and no edge itself.
    const actual: Record<string, string[]> = {};
    for (const moduleRel of DECLARING_MODULES) {
      const file = path.join(SRC_ROOT, moduleRel);
      actual[moduleRel] = exportedNames(await readFile(file, "utf-8"), file);
    }

    expect(
      actual,
      "the per-spec modules' exported surface changed. A new export — a wrapper, or a forwarding " +
        "`export const x = iterationReviewPathPerSpec` — hands the layout to importers under a " +
        `name the edge check reports only as a name it has never seen. ${TRIGGER_GUIDANCE} If the ` +
        "change is unrelated to the layout decision, add the name to PINNED_EXPORTS and say so in " +
        "review.",
    ).toEqual(PINNED_EXPORTS);
  });

  it("still has the reviewer-deliverable gate reading the flat layout", async () => {
    // The other direction: if the gate switches to the per-spec layout, the
    // canonical-artifact decision has been made implicitly and OQ-0012-0013
    // starts describing a tree that changed under it.
    const file = path.join(SRC_ROOT, GATE_MODULE);
    const source = await readFile(file, "utf-8");
    const calls = callsInsideFunction(source, GATE_MODULE, GATE_FUNCTION);

    // Resolved through the import binding, so an alias of the same helper is
    // still the same helper.
    const flatLocals = localNamesFor(source, GATE_MODULE, FLAT_HELPER);
    flatLocals.add(FLAT_HELPER);
    const readsFlat = [...withLocalAliases(source, GATE_MODULE, flatLocals)].some((local) =>
      calls.has(local),
    );

    expect(
      readsFlat,
      `${GATE_FUNCTION} no longer calls \`${FLAT_HELPER}\` under any name it imports it by, so it ` +
        "may have stopped reading the flat layout that OQ-0012-0013 records it as reading. If the " +
        "gate moved, that IS the canonical-artifact decision: record it against CR-20260904-0002 " +
        "rather than leaving the open question describing a tree that changed.",
    ).toBe(true);

    // And it must not have taken up the per-spec surface, under any alias.
    const perSpecLocals = new Set<string>();
    for (const name of PINNED_EXPORTS["core/prototyping/iterationPaths.ts"] ?? []) {
      if (LAYOUT_NEUTRAL_NAMES.has(name)) continue;
      for (const local of localNamesFor(source, GATE_MODULE, name)) perSpecLocals.add(local);
    }
    expect(
      [...withLocalAliases(source, GATE_MODULE, perSpecLocals)]
        .filter((local) => calls.has(local))
        .sort(),
      `${GATE_FUNCTION} now calls the per-spec layout helpers, which is exactly the decision ` +
        "OQ-0012-0013 defers. Record it against CR-20260904-0002.",
    ).toEqual([]);
  });
});

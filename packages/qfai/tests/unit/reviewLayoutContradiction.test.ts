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
 * single-spec freeze by seeding a second UI-bearing spec and asserting the
 * frozen set stays one entry. Those rows are not duplicated here.
 *
 * What nothing covered is the moment the deferral stops being safe. Today the
 * contradiction is held apart by a comment and a deliberate freeze; a wire-in
 * that made the per-spec layout real would make it live, and no test would say
 * so. These rows say so.
 *
 * No row claims the contradiction is acceptable. They assert it stays
 * unreachable, and each failure message names the decision that now has to be
 * made rather than telling the reader to revert.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(import.meta.dirname, "../../src");

/**
 * The per-spec review layout's entry points. Any production use means that
 * layout is being produced or consumed for real, which is when the two gates
 * begin contradicting each other on a live project.
 *
 * Not the whole of `iterationPaths.ts`: `findStaleIterDirs` and
 * `deleteStaleIterDirs` walk `iter-NN` directories for cleanup, are already
 * wired into `certify`, and say nothing about which review layout is in use.
 * Including them made this guard red on the tree it was written for — the
 * measurement, not the intent, decided this list.
 */
const PER_SPEC_ENTRY_POINTS: ReadonlySet<string> = new Set([
  "iterationDirPerSpec",
  "iterationReviewPathPerSpec",
  "findIterationReviewFiles",
  "parseIterationReviewPath",
  "dispatchReviewerToPair",
]);

/** Where those names are declared, keyed the way `relative()` reports paths. */
const DECLARING_MODULES: ReadonlySet<string> = new Set([
  "core/prototyping/iterationPaths.ts",
  "core/prototyping/reviewerDispatch.ts",
]);

/**
 * Internal composition inside the declaring modules, pinned rather than
 * exempted.
 *
 * `iterationPaths.ts` legitimately builds one of its own helpers out of
 * another, and a blanket exemption for the declaring modules would let a NEW
 * exported wrapper appear there — reached from a CLI command under a name this
 * guard does not watch, which is a plausible way for a wire-in to begin. Pinned
 * as an enumeration, so such a wrapper has to be justified in review instead.
 */
const PINNED_INTERNAL_COMPOSITION: readonly string[] = [
  "core/prototyping/iterationPaths.ts iterationReviewPathPerSpec -> iterationDirPerSpec",
];

/** Every `.ts` under `src/` — the whole production surface. */
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

const relative = (file: string): string => path.relative(SRC_ROOT, file).replace(/\\/g, "/");

/** The basenames of the declaring modules, for matching a module specifier. */
const DECLARING_BASENAMES = new Set([...DECLARING_MODULES].map((rel) => path.basename(rel, ".ts")));

function specifierNamesDeclaringModule(node: ts.ImportDeclaration | ts.ExportDeclaration): boolean {
  const specifier = node.moduleSpecifier;
  if (specifier === undefined || !ts.isStringLiteral(specifier)) return false;
  return DECLARING_BASENAMES.has(path.basename(specifier.text).replace(/\.js$/, ""));
}

/**
 * How a watched name is used in one module, if at all.
 *
 * Binding-aware rather than name-aware, and that distinction is load-bearing:
 * `prototypingCertify.ts` declares its OWN `findStaleIterDirs` and calls it, so
 * a name-only scan reported a per-spec wire-in that does not exist. A call
 * counts only when its callee resolves to an IMPORT of a watched name.
 *
 * Three shapes, because a scan that only knows the first is evaded by the
 * others — and named-import aliases are ordinary here, 51 of them under `src/`,
 * so the evasion is house style rather than something contrived:
 *
 * - `import { watched } from …; watched(…)`
 * - `import { watched as local } from …; local(…)` — the alias, resolved back
 *   through the import clause;
 * - `import * as ns from "./iterationPaths.js"; ns.watched(…)` — a
 *   property-access callee a bare identifier check never sees.
 *
 * The IMPORT itself is reported too, and that is the part hardest to evade: the
 * binding cannot be used without being bound, whatever it is later renamed to
 * or assigned into. `const f = local; f()` defeats every call-shape check and
 * defeats none of the import check. Re-exports count for the same reason — a
 * re-export is how a wire-in reaches a module that never imports the declaring
 * one directly.
 */
function perSpecUsage(source: string, fileName: string): string[] {
  const parsed = parse(source, fileName);
  const findings: string[] = [];
  /** local name -> the watched name it is bound to, via an import or re-export. */
  const bound = new Map<string, string>();
  /** namespace binding names for a declaring module. */
  const namespaces = new Set<string>();

  for (const stmt of parsed.statements) {
    if (!ts.isImportDeclaration(stmt) && !ts.isExportDeclaration(stmt)) continue;
    const isImport = ts.isImportDeclaration(stmt);
    const clause = isImport ? stmt.importClause?.namedBindings : stmt.exportClause;

    if (clause !== undefined && ts.isNamespaceImport(clause)) {
      if (specifierNamesDeclaringModule(stmt)) namespaces.add(clause.name.text);
      continue;
    }
    if (clause === undefined || (!ts.isNamedImports(clause) && !ts.isNamedExports(clause))) {
      continue;
    }
    for (const element of clause.elements) {
      // `propertyName` holds the ORIGINAL when an alias is present.
      const original = (element.propertyName ?? element.name).text;
      if (!PER_SPEC_ENTRY_POINTS.has(original)) continue;
      bound.set(element.name.text, original);
      const alias = element.propertyName ? ` as ${element.name.text}` : "";
      findings.push(`${isImport ? "imports" : "re-exports"} ${original}${alias}`);
    }
  }

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee)) {
        const watched = bound.get(callee.text);
        if (watched !== undefined) findings.push(`calls ${watched}`);
      } else if (
        ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        namespaces.has(callee.expression.text) &&
        PER_SPEC_ENTRY_POINTS.has(callee.name.text)
      ) {
        findings.push(`calls ${callee.name.text} via ${callee.expression.text}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);

  return [...new Set(findings)].sort();
}

/** `<module> <caller> -> <watched callee>` for calls inside a declaring module. */
function internalComposition(source: string, fileName: string, moduleRel: string): string[] {
  const parsed = parse(source, fileName);
  const found: string[] = [];
  const visit = (node: ts.Node, enclosing: string): void => {
    const current = ts.isFunctionDeclaration(node) && node.name ? node.name.text : enclosing;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      PER_SPEC_ENTRY_POINTS.has(node.expression.text)
    ) {
      found.push(`${moduleRel} ${current} -> ${node.expression.text}`);
    }
    ts.forEachChild(node, (child) => visit(child, current));
  };
  ts.forEachChild(parsed, (child) => visit(child, "<module scope>"));
  return [...new Set(found)].sort();
}

/**
 * Names called as `name(…)` inside ONE named function's body.
 *
 * Per file would be the wrong scope for the last row: the gate could move to
 * the per-spec layout while another function in the same module still called
 * the flat helper, and a file-level check would stay green through exactly the
 * change it exists to notice.
 */
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

const GATE_MODULE = "core/validators/prototypingEvidence.ts";
const GATE_FUNCTION = "validateIterationReviewArtifacts";

const TRIGGER_GUIDANCE =
  "This is NOT a regression to revert — it is the trigger OQ-0012-0013 names. Decide which " +
  "artifact is canonical, record it against CR-20260904-0002, and then move or delete this guard " +
  "as that decision requires.";

describe("the per-spec review layout stays unreachable while its canonical status is undecided", () => {
  it("has no production module importing or calling the per-spec review entry points", async () => {
    const modules = await productionModules();
    // A walk that found almost nothing would pass this row silently.
    expect(modules.length).toBeGreaterThan(200);

    const uses: string[] = [];
    for (const file of modules) {
      if (DECLARING_MODULES.has(relative(file))) continue;
      const source = await readFile(file, "utf-8");
      for (const use of perSpecUsage(source, file)) uses.push(`${relative(file)} ${use}`);
    }

    expect(
      uses.sort(),
      "the per-spec review layout is in production use, so `validate` (which reads the flat " +
        "iter-NN/review.json) and `certify` (which requires iter-NN/spec-NNNN/<screen>.review.json " +
        "for a multi-spec frozen set) now contradict each other on a live project: satisfying one " +
        `fails the other, and certify will not seal while validate reports errors. ${TRIGGER_GUIDANCE}`,
    ).toEqual([]);
  });

  it("adds no new internal wrapper around the per-spec entry points", async () => {
    // The declaring modules are not exempted, they are pinned: a new exported
    // wrapper there could be reached from a CLI command under a name this
    // guard does not watch.
    const composition: string[] = [];
    for (const moduleRel of DECLARING_MODULES) {
      const file = path.join(SRC_ROOT, moduleRel);
      const source = await readFile(file, "utf-8");
      composition.push(...internalComposition(source, file, moduleRel));
    }

    expect(
      composition.sort(),
      "the per-spec helpers have gained an internal caller. If it is a new exported wrapper, a " +
        "production module can now reach the per-spec layout under a name this guard does not " +
        `watch. ${TRIGGER_GUIDANCE} If it is genuine internal refactoring, add it to ` +
        "PINNED_INTERNAL_COMPOSITION and say so in review.",
    ).toEqual([...PINNED_INTERNAL_COMPOSITION].sort());
  });

  it("still has the reviewer-deliverable gate reading the flat layout", async () => {
    // The other direction. If the gate is switched to the per-spec layout, the
    // canonical-artifact decision has been made implicitly and OQ-0012-0013
    // starts describing a tree that changed under it.
    const source = await readFile(path.join(SRC_ROOT, GATE_MODULE), "utf-8");
    const calls = callsInsideFunction(source, GATE_MODULE, GATE_FUNCTION);

    expect(
      calls.has("iterationReviewPath"),
      `${GATE_FUNCTION} no longer calls \`iterationReviewPath\`, so it may have stopped reading ` +
        "the flat layout that OQ-0012-0013 records it as reading. If the gate moved, that IS the " +
        "canonical-artifact decision: record it against CR-20260904-0002 rather than leaving the " +
        "open question describing a tree that changed.",
    ).toBe(true);

    expect(
      [...calls].filter((name) => PER_SPEC_ENTRY_POINTS.has(name)).sort(),
      `${GATE_FUNCTION} now calls the per-spec layout helpers, which is exactly the decision ` +
        "OQ-0012-0013 defers. Record it against CR-20260904-0002.",
    ).toEqual([]);
  });
});

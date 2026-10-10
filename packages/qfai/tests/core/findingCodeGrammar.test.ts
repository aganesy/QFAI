import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { GATE_GROUP_FAMILIES } from "../../src/cli/commands/validate.js";
import { SAAS_PACKAGE_SKIPPED_GATE_FAMILIES } from "../../src/core/saasPackage/skippedGates.js";
import { familyMatches } from "../helpers/gateFamilies.js";

const SRC_ROOT = path.resolve(__dirname, "../../src");
const DOC_PATH = path.resolve(__dirname, "../../docs/finding-codes.md");

/**
 * Wrap-tolerant containment: what the document says is the rule, the column it
 * wraps at is not. Without this a sentence assertion fails on a reflow that
 * changed no wording.
 */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");
const TEST_STUB_VALIDATOR = path.resolve(__dirname, "../../src/core/validators/testTodoStubs.ts");

/** The one grammar a new finding code may use — see `docs/finding-codes.md`. */
const CANONICAL_CODE_RE = /^QFAI-[A-Z]+-\d{3}$/;

/** The shape a finding code can take, in any family. */
const CODE_SHAPE_RE = /^[A-Z][A-Z0-9_-]*$/;

/** The naming convention for a constant that holds a code or a rule id. */
const CODE_CONSTANT_RE = /(?:_RULE_ID|_CODE|_RULE)$/;

/**
 * The shared `issue()` helper, seeded rather than discovered.
 *
 * Its own declaration is discovered too, but seeding it keeps the scan honest
 * if `validators/utils.ts` ever moves: a scan that silently found no factories
 * would report an empty code set and pass every guard below.
 */
const SHARED_ISSUE_FACTORY = "issue";

/**
 * The local factories this repository is known to build findings through.
 *
 * Asserted below, so a renamed parameter or a changed return type that stops
 * {@link collectIssueFactories} from seeing one fails loudly instead of
 * quietly shrinking the scanned surface.
 */
const KNOWN_LOCAL_FACTORIES: readonly string[] = [
  "canonicalIssue",
  "classificationIssue",
  "competitiveIssue",
  "contractIssue",
  "finding",
  "skillIssue",
  "threeLayerIssue",
  "trendIssue",
];

/**
 * Codes outside the canonical grammar. Frozen: the guards below fail both when a
 * new non-conforming code appears and when a registered one stops existing, so
 * this list can only shrink.
 */
const LEGACY_FINDING_CODES: readonly string[] = [
  "HANDOFF-SCHEMA-FIELD-TYPE",
  "HANDOFF-SCHEMA-NOT-OBJECT",
  "QFAI-CFG-LINK-001",
  "QFAI-CFG-LINK-002",
];

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * The value an `as const` / parenthesis wrapper is hiding.
 *
 * `const HANDOFF_SCHEMA_DRIFT_CODE = "QFAI-HANDOFF-001" as const` is how
 * several code constants are written, and reading the declaration's initializer
 * without unwrapping sees an `AsExpression`, not a literal.
 */
function unwrapExpression(node: ts.Expression | undefined): ts.Expression | undefined {
  let current = node;
  while (
    current !== undefined &&
    (ts.isAsExpression(current) || ts.isParenthesizedExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * Every function that turns a code into an `Issue`.
 *
 * A regex over `issue("…")` saw only the shared helper: `\bissue\(` does not
 * match `classificationIssue(`, so the codes raised through the nine
 * local factories reached no guard at all — the legacy registry was
 * missing them, and a new non-conforming code added through the same call
 * passed silently, which is the bypass this file exists to close.
 *
 * A factory is a declaration whose return type names `Issue` and whose first
 * parameter is the code. That is this repository's convention for all nine;
 * {@link KNOWN_LOCAL_FACTORIES} pins it so a drift away from it is visible.
 */
function collectIssueFactories(sources: readonly ts.SourceFile[]): Set<string> {
  const factories = new Set<string>([SHARED_ISSUE_FACTORY]);
  const record = (
    name: string | undefined,
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    type: ts.TypeNode | undefined,
    source: ts.SourceFile,
  ): void => {
    if (name === undefined || type === undefined) return;
    if (!/\bIssue\b/.test(type.getText(source))) return;
    if (parameters[0]?.name.getText(source) !== "code") return;
    factories.add(name);
  };
  for (const source of sources) {
    const visit = (node: ts.Node): void => {
      if (ts.isFunctionDeclaration(node)) {
        record(node.name?.text, node.parameters, node.type, source);
      } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const initializer = unwrapExpression(node.initializer);
        if (
          initializer !== undefined &&
          (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
        ) {
          record(node.name.text, initializer.parameters, initializer.type, source);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return factories;
}

/** Every `const NAME = "value"` binding, so a code named through one resolves. */
function collectStringConstants(sources: readonly ts.SourceFile[]): Map<string, string> {
  const constants = new Map<string, string>();
  for (const source of sources) {
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const initializer = unwrapExpression(node.initializer);
        if (initializer !== undefined && ts.isStringLiteral(initializer)) {
          constants.set(node.name.text, initializer.text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return constants;
}

/**
 * Every code the given sources can put on a finding.
 *
 * Three paths reach `Issue.code`: an argument to one of the factories, a
 * `code:` field on an issue-shaped literal, and a constant declared under the
 * `_CODE` / `_RULE_ID` / `_RULE` convention. A conditional takes both branches;
 * {@link CODE_SHAPE_RE} discards whatever is not code-shaped.
 */
function collectCodes(
  sources: readonly ts.SourceFile[],
  factories: ReadonlySet<string>,
  constants: ReadonlyMap<string, string>,
): Set<string> {
  const codes = new Set<string>();
  const push = (node: ts.Expression | undefined): void => {
    const value = unwrapExpression(node);
    if (value === undefined) return;
    if (ts.isStringLiteral(value)) {
      if (CODE_SHAPE_RE.test(value.text)) codes.add(value.text);
      return;
    }
    if (ts.isIdentifier(value)) {
      const bound = constants.get(value.text);
      if (bound !== undefined && CODE_SHAPE_RE.test(bound)) codes.add(bound);
      return;
    }
    if (ts.isConditionalExpression(value)) {
      push(value.whenTrue);
      push(value.whenFalse);
    }
  };
  for (const source of sources) {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (factories.has(node.expression.text)) push(node.arguments[0]);
      } else if (ts.isPropertyAssignment(node) && node.name.getText(source) === "code") {
        push(node.initializer);
      } else if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        CODE_CONSTANT_RE.test(node.name.text)
      ) {
        push(node.initializer);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return codes;
}

type Scan = {
  readonly sources: ts.SourceFile[];
  readonly factories: Set<string>;
  readonly constants: Map<string, string>;
  readonly codes: string[];
};

let scanned: Promise<Scan> | null = null;

/** Parse `src/` once — three guards below read the same answer. */
function scanSource(): Promise<Scan> {
  scanned ??= (async () => {
    const sources: ts.SourceFile[] = [];
    for (const file of await collectTsFiles(SRC_ROOT)) {
      const body = await readFile(file, "utf-8");
      sources.push(ts.createSourceFile(file, body, ts.ScriptTarget.Latest, false));
    }
    const factories = collectIssueFactories(sources);
    const constants = collectStringConstants(sources);
    return {
      sources,
      factories,
      constants,
      codes: [...collectCodes(sources, factories, constants)].sort(),
    };
  })();
  return scanned;
}

/** Every code reachable in `src/`, deduped and sorted. */
async function emittedCodes(): Promise<string[]> {
  return (await scanSource()).codes;
}

/**
 * A path as a comparable key, separators normalised.
 *
 * `ts.createSourceFile` normalises the name it is handed to forward slashes,
 * and the keys this file resolves come from `path.resolve`. On POSIX those are
 * the same string; on win32 they differ by every separator, so without
 * normalising, the lookup in {@link codesInFile} would always miss and the
 * guard below would never run on a Windows checkout while passing in CI.
 * Normalised here rather than at
 * `createSourceFile`, because `fileName` is TypeScript's to shape and a later
 * version could normalise it differently — the test's own key is the test's.
 *
 * `\\` is folded unconditionally rather than via `path.sep`. Keyed on `path.sep`
 * this function is the IDENTITY on POSIX, so removing it would leave every row
 * green on Linux — the same one-platform blindness that let the defect live.
 * The cost is that a POSIX filename containing a literal backslash would fold
 * onto a different key; no file under `src/` has one, and a guard both
 * platforms can verify is worth more than tolerating a name this scan will
 * never see.
 */
function pathKey(file: string): string {
  return file.replace(/\\/g, "/");
}

/** Every code one file can put on a finding, resolved against the whole tree. */
async function codesInFile(file: string): Promise<string[]> {
  const scan = await scanSource();
  const key = pathKey(file);
  // Both sides through the same function. Normalising the incoming key alone
  // is sufficient today — `ts` already hands back forward slashes — so the
  // second call changes no result and no row can distinguish it. It is
  // insurance against a `ts` version that stops normalising, which is a
  // dependency's choice rather than this repository's; read it as a hedge, not
  // as something the suite verifies.
  const source = scan.sources.find((candidate) => pathKey(candidate.fileName) === key);
  if (source === undefined) throw new Error(`not scanned: ${file}`);
  return [...collectCodes([source], scan.factories, scan.constants)];
}

/**
 * The matcher itself, because it is the thing that can fail by matching
 * nothing.
 *
 * The table entry below is the one `GATE_GROUP_FAMILIES.tdd` actually holds.
 * Read as one pattern it satisfies neither arm — not a glob, and equal to no
 * code — so every coverage claim built on it passed by checking nothing. The
 * guard below is one of those claims; it survives today only because the codes
 * it scans happen to be covered by a different, clean entry in the same array.
 */
describe("gate-family matching", () => {
  const ANNOTATED = "TDDLIST_* (execution state)";

  it("matches through an annotation after the pattern", () => {
    expect(familyMatches(ANNOTATED, "TDDLIST_MISSING")).toBe(true);
  });

  it("still requires the prefix, so the annotation is not a wildcard", () => {
    expect(familyMatches(ANNOTATED, "QFAI-TEST-001")).toBe(false);
  });

  it("keeps an exact entry exact", () => {
    expect(familyMatches("QFAI-TRACE-002", "QFAI-TRACE-002")).toBe(true);
    expect(familyMatches("QFAI-TRACE-002", "QFAI-TRACE-003")).toBe(false);
  });

  it("reads an annotated exact entry as that code, not as the whole cell", () => {
    expect(familyMatches("QFAI-TRACE-002 (ledger shape)", "QFAI-TRACE-002")).toBe(true);
  });

  it("covers no code at all when the entry is only an annotation", () => {
    // `startsWith("")` is true of every string, so an empty pattern would make
    // a comment-only cell cover the entire finding surface.
    expect(familyMatches("   ", "QFAI-TEST-001")).toBe(false);
  });
});

describe("finding code grammar", () => {
  it("finds every factory a finding can be built through", async () => {
    // The scan is only as complete as this set. A factory renamed out of the
    // `code`-first convention would leave every code it raises unscanned, and
    // the guards below would pass on a surface that quietly shrank.
    const { factories } = await scanSource();
    expect([...factories].sort()).toEqual([SHARED_ISSUE_FACTORY, ...KNOWN_LOCAL_FACTORIES].sort());
  });

  it("emits no code outside the canonical grammar or the frozen legacy registry", async () => {
    const registered = new Set(LEGACY_FINDING_CODES);
    const unknown = (await emittedCodes()).filter(
      (code) => !CANONICAL_CODE_RE.test(code) && !registered.has(code),
    );
    // A new code must be `QFAI-<AREA>-<NNN>` — see docs/finding-codes.md.
    // Widening the registry to admit one is not the fix.
    expect(unknown).toEqual([]);
  });

  it("keeps no stale entry in the legacy registry", async () => {
    const emitted = new Set(await emittedCodes());
    const stale = LEGACY_FINDING_CODES.filter((code) => !emitted.has(code));
    // A registry that outlives its codes stops being evidence of anything.
    expect(stale).toEqual([]);
  });

  it("registers the legacy codes in sorted order and without duplicates", () => {
    expect(LEGACY_FINDING_CODES).toEqual([...new Set(LEGACY_FINDING_CODES)].sort());
  });

  it("tells a branch holding a frozen-family code what to do with it", async () => {
    // The registry does not grow, so such a branch renames. Without the steps,
    // the reader has to work out what a rename costs and what it may reuse.
    const doc = flat(await readFile(DOC_PATH, "utf-8"));

    expect(doc).toContain("## A branch that already emits a frozen-family code");
    expect(doc).toContain("**Rename to `QFAI-<AREA>-<NNN>`**");
    expect(doc).toContain("**Check whether the code already exists.**");
  });

  it("says what a shipped rename breaks", async () => {
    // The code is an operator-facing identifier in annotations, in
    // `validate.json` and in a waiver, so a rename is a behaviour change for
    // anyone reading or naming it.
    const doc = flat(await readFile(DOC_PATH, "utf-8"));

    expect(doc).toContain("### Renaming a code that has shipped");
    expect(doc).toContain("breaking for anyone identifying findings by code");
  });

  it("documents every frozen family in docs/finding-codes.md", async () => {
    const doc = await readFile(DOC_PATH, "utf-8");
    const prefixes = new Set(
      LEGACY_FINDING_CODES.map((code) => code.match(/^[A-Z]+[-_]/)?.[0] ?? code),
    );
    const undocumented = [...prefixes].sort().filter((prefix) => !doc.includes(`\`${prefix}\``));
    expect(undocumented).toEqual([]);
  });

  it("looks a source up by a win32-shaped path on every platform", async () => {
    // `ts.createSourceFile` normalises `fileName` to forward slashes and the
    // keys this file resolves come from `path.resolve`, so on win32 the two
    // would differ by every separator: the lookup would find nothing, the row
    // below would throw `not scanned:`, and CI would stay green because POSIX
    // spells both the same way.
    //
    // Keyed on a literal backslash form so this row fails on POSIX too if the
    // normalisation is removed. A guard only one platform can observe is what
    // produced the defect.
    const { sources } = await scanSource();
    const source = sources.find((candidate) =>
      candidate.fileName.endsWith("/core/validators/testTodoStubs.ts"),
    );
    expect(source).toBeDefined();
    if (source === undefined) return;

    await expect(codesInFile(source.fileName.replace(/\//g, "\\"))).resolves.toContain(
      "QFAI-TEST-002",
    );
  });

  it("covers every code a gate emits with a family entry, not a bare code", async () => {
    // Both family tables listed `QFAI-TEST-001` alone while the gate also
    // emits `QFAI-TEST-002`, so the partial-profile notice under-stated what
    // `--profile saas-package` and the profiles that skip the stub gate had
    // skipped. The gate group asked here is the one that *owns* the stub gate:
    // `runAtddValidators` and `runTddValidators` both call it, so it sits in
    // its own `test-stubs` group rather than inside `tdd`.
    const stubCodes = await codesInFile(TEST_STUB_VALIDATOR);
    expect(stubCodes).toContain("QFAI-TEST-002");

    const tables = {
      "skippedGates.validateTestTodoStubs":
        SAAS_PACKAGE_SKIPPED_GATE_FAMILIES.validateTestTodoStubs,
      "GATE_GROUP_FAMILIES.test-stubs": GATE_GROUP_FAMILIES["test-stubs"],
    };
    const uncovered: string[] = [];
    for (const [table, families] of Object.entries(tables)) {
      for (const code of stubCodes) {
        if (!families.some((family) => familyMatches(family, code))) {
          uncovered.push(`${table} does not cover ${code}`);
        }
      }
    }
    expect(uncovered).toEqual([]);
  });
});

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { GATE_GROUP_FAMILIES } from "../../src/cli/commands/validate.js";
import { SAAS_PACKAGE_SKIPPED_GATE_FAMILIES } from "../../src/core/saasPackage/skippedGates.js";

const SRC_ROOT = path.resolve(__dirname, "../../src");
const DOC_PATH = path.resolve(__dirname, "../../docs/finding-codes.md");
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
  "makeIssue",
  "skillIssue",
  "threeLayerIssue",
  "trendIssue",
];

/**
 * Codes that predate the grammar. Frozen: the guards below fail both when a
 * new non-conforming code appears and when a registered one stops existing, so
 * this list can only shrink. It has: the `UIX-VAL-STRATEGY-*`, `UIX-VAL-TASTE-*`
 * and `QFAI-DOC-*` entries left with the validators that raised them, which is
 * the shrink the guard is here to make visible.
 */
const LEGACY_FINDING_CODES: readonly string[] = [
  "D-DEPRECATED-PATH",
  "D-DEPRECATED-SCHEMA",
  "D-HANDOFF-LEGACY-FORMAT",
  "D-SAAS-PACKAGE-ATTESTATION-MISSING",
  "D-SAAS-PACKAGE-HANDOFF-SCHEMA",
  "D-SAAS-PACKAGE-VERIFY-SKIPPED",
  "D-SCAFFOLD-FOREIGN-HOME",
  "D-SCAFFOLD-PLACEHOLDER",
  "D-SURFACE-TYPE-MISSING",
  "E_AC_NOT_VERIFIED",
  "E_DELTA_MISSING_REQUIRED",
  "E_ID_INVALID_FORMAT",
  "E_LEDGER_EMPTY_CELL",
  "E_LEDGER_MISSING_COLUMN",
  "E_OQ_OPEN_RELEASE_BLOCK",
  "E_OQ_STATUS_UNPARSEABLE",
  "E_REF_NOT_FOUND",
  "E_SPEC_MISSING_FILESET",
  "E_TC_ORPHAN",
  "E_UPWARD_REF_FORBIDDEN",
  "HANDOFF-SCHEMA-FIELD-TYPE",
  "HANDOFF-SCHEMA-NOT-OBJECT",
  "I-ASSISTANT-LAYER-UNSEEDED",
  "QFAI-CFG-LINK-001",
  "QFAI-CFG-LINK-002",
  "QFAI-CFG-LINK-003",
  "QFAI-UIUX-PERF",
  "QFAI_CONFIG_INVALID",
  "R-AUTOPILOT-POLICY-MISSING",
  "R-AUTOPILOT-POLICY-WIDENED",
  "R-CERTIFY-VERIFY-CIRCULAR",
  "R-DESIGN-MD-PATCH-OUT-OF-ZONE",
  "R-EVIDENCE-MUTATION-UNLOGGED",
  "R-EXPLORATION-CERTIFY-ATTEMPT",
  "R-HANDOFF-INCOMPLETE",
  "R-HANDOFF-SCHEMA-DRIFT",
  "R-MOCK-HREF-DRIFT",
  "R-PACK-LOCATION-DRIFT",
  "R-PROMPT-SCANNER-DRIFT",
  "R-SKILL-MANIFEST-DRIFT",
  "TDDLIST-001",
  "TDDLIST-002",
  "TDDLIST-003",
  "TDDLIST-004",
  "TDDLIST-005",
  "TDDLIST-006",
  "TDDLIST_BLOCKED_MISSING_REF",
  "TDDLIST_COVERAGE_LAYER_MISMATCH",
  "TDDLIST_DUPLICATE_ID",
  "TDDLIST_EVIDENCE_EMPTY",
  "TDDLIST_EVIDENCE_STATUS_ONLY",
  "TDDLIST_EXCEPTION_INVALID_DR",
  "TDDLIST_EXCEPTION_MISSING_DR",
  "TDDLIST_EXCEPTION_PARKED",
  "TDDLIST_EXCEPTION_UNRESOLVED_DR",
  "TDDLIST_INFO",
  "TDDLIST_INVALID_ID",
  "TDDLIST_INVALID_OBLIGATION_REF",
  "TDDLIST_INVALID_STATUS",
  "TDDLIST_LAYER_PATH_MISMATCH",
  "TDDLIST_MISSING",
  "TDDLIST_OBLIGATION_LAYER_MISMATCH",
  "TDDLIST_OWNING_MODULE_NOT_SINGULAR",
  "TDDLIST_REQUIRED_COLUMN_MISSING",
  "TDDLIST_SELECTOR_UNRESOLVED",
  "TDDLIST_STALE_STATUS",
  "TDDLIST_TABLE_MISSING",
  "TDDLIST_TC_NOT_COVERED",
  "TDDLIST_TC_TABLE_UNRESOLVED",
  "TDDLIST_TEST_FILE_MISSING",
  "TDDLIST_UNKNOWN_LAYER",
  "TDDLIST_UNKNOWN_LEVEL",
  "TDDLIST_UNKNOWN_REF",
  "TRACE_DOWNSTREAM_REF",
  "TRACE_SHARED_SCOPE_VIOLATION",
  "UIX-VAL-3LAYER-FORBIDDEN-FILE",
  "UIX-VAL-3LAYER-INCOMPLETE-FAMILY",
  "UIX-VAL-3LAYER-LEGACY-FORMAT",
  "UIX-VAL-3LAYER-MIXED-FORMAT",
  "UIX-VAL-CLASSIFICATION-CONTRADICTION",
  "UIX-VAL-CLASSIFICATION-DUPLICATE-SECONDARY-SURFACE",
  "UIX-VAL-CLASSIFICATION-INVALID-BOOLEAN",
  "UIX-VAL-CLASSIFICATION-INVALID-SECONDARY-SURFACE",
  "UIX-VAL-CLASSIFICATION-INVALID-SURFACE",
  "UIX-VAL-CLASSIFICATION-MISSING",
  "UIX-VAL-CLASSIFICATION-RATIONALE-PLACEHOLDER",
  "UIX-VAL-CLASSIFICATION-REQUIRED-FIELD",
  "UIX-VAL-CLASSIFICATION-SECONDARY-ARRAY",
  "UIX-VAL-CLASSIFICATION-SECONDARY-DUPLICATE",
  "UIX-VAL-DIRECTION-HISTORY-MISSING",
  "UIX-VAL-DS-READ-ERROR",
  "UIX-VAL-DS01",
  "UIX-VAL-DS02",
  "UIX-VAL-OQ-OPEN-CRITICAL",
  "UIX-VAL-SCREEN-CONTRACT-DUPLICATE-ID",
  "UIX-VAL-SCREEN-CONTRACT-LEGACY-FORMAT",
  "UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE",
  "UIX-VAL-SCREEN-CONTRACT-STATE-COVERAGE",
  "UIX-VAL-SIDECAR-MISSING",
  "UIX-VAL-SKILL-ASPIRATIONAL",
  "UIX-VAL-SKILL-BANNED-PHRASE",
  "UIX-VAL-SKILL-CANONICAL-SURFACE",
  "UIX-VAL-SKILL-CLI-SURFACE",
  "UIX-VAL-SKILL-DELEGATION",
  "UIX-VAL-SKILL-ENV-PRECONDITIONS",
  "UIX-VAL-SKILL-EVIDENCE-PATHS",
  "UIX-VAL-SKILL-PLAYWRIGHT-FALLBACK",
  "UIX-VAL-SKILL-PREFLIGHT",
  "UIX-VAL-SKILL-SECTION-MISSING",
  "UIX-VAL-SKILL-STATIC-FIRST",
  "UIX-VAL-SKILL-UI-BEARING-FALSE",
  "UIX-VAL-T05",
  "UIX-VAL-TREND-CATEGORY-MISSING",
  "UIX-VAL-TREND-ENTRY-MISSING",
  "UIX-VAL-TREND-FIELD-MISSING",
  "UIX-VAL-TREND-SCAN-MISSING",
  "W-ASSISTANT-LAYOUT",
  "W-PENDING-PROMOTION",
  "W-SKILL-DOC-BROKEN-REF",
  "W-SKILL-PROJECT-MEMORY",
  "W-STALE-REFERENCE",
  "W-WORKLOG-BROKEN-LINK",
  "W-WORKLOG-SCHEMA",
  "W-WORKLOG-STALE",
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
 * `const DEPRECATED_SCHEMA_CODE = "D-DEPRECATED-SCHEMA" as const` is how
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
 * match `classificationIssue(`, so the 57 `UIX-VAL-*` codes raised through the
 * nine local factories reached no guard at all — the legacy registry was
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

/** Every code one file can put on a finding, resolved against the whole tree. */
async function codesInFile(file: string): Promise<string[]> {
  const scan = await scanSource();
  const source = scan.sources.find((candidate) => candidate.fileName === file);
  if (source === undefined) throw new Error(`not scanned: ${file}`);
  return [...collectCodes([source], scan.factories, scan.constants)];
}

/** `QFAI-TEST-*` matches `QFAI-TEST-002`; a bare `QFAI-TEST-001` does not. */
function familyMatches(family: string, code: string): boolean {
  return family.endsWith("*") ? code.startsWith(family.slice(0, -1)) : family === code;
}

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

  it("documents every frozen family in docs/finding-codes.md", async () => {
    const doc = await readFile(DOC_PATH, "utf-8");
    const prefixes = new Set(
      LEGACY_FINDING_CODES.map((code) => code.match(/^[A-Z]+[-_]/)?.[0] ?? code),
    );
    const undocumented = [...prefixes].sort().filter((prefix) => !doc.includes(`\`${prefix}\``));
    expect(undocumented).toEqual([]);
  });

  it("covers every code a gate emits with a family entry, not a bare code", async () => {
    // Both family tables listed `QFAI-TEST-001` alone while the gate also
    // emits `QFAI-TEST-002`, so the partial-profile notice under-stated what
    // `--profile saas-package` and `--profile tdd` had skipped.
    const stubCodes = await codesInFile(TEST_STUB_VALIDATOR);
    expect(stubCodes).toContain("QFAI-TEST-002");

    const tables = {
      "skippedGates.validateTestTodoStubs":
        SAAS_PACKAGE_SKIPPED_GATE_FAMILIES.validateTestTodoStubs,
      "GATE_GROUP_FAMILIES.tdd": GATE_GROUP_FAMILIES.tdd,
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

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import {
  parseFirstMarkdownTable,
  resolveTestCaseTable,
  resolveTestCaseTables,
} from "../specPackParsers.js";
import {
  EXCEPTION_PARKED_CODE,
  EXCEPTION_PARKED_RULE_ID,
  UNKNOWN_LEVEL_CODE,
  UNKNOWN_LEVEL_RULE_ID,
} from "../ruleIds.js";
import type { LedgerTable } from "../tddHelpers.js";
import {
  classifyCoverageLevel,
  collectLedgerTables,
  isCoverageBearingRow,
  isCoverageTargetLevel,
  splitTcRefs,
  resolveParentTcId,
  TDD_LEDGER_REQUIRED_COLUMNS,
  UNIT_COMPONENT_LAYERS,
  NON_COVERAGE_LAYERS,
} from "../tddHelpers.js";
import { collectHeadingTcIdsFrom, collectHeadingTcLevelsFrom } from "../atddTraceability.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe } from "./utils.js";

/**
 * Whether a row of a ledger table is subject to the row-shape checks
 * (`TDDLIST_INVALID_ID`, `TDDLIST_UNKNOWN_LAYER`,
 * `TDDLIST_OBLIGATION_LAYER_MISMATCH`).
 *
 * The first table is checked whole, exactly as it always was: a blank `TDD-ID`
 * there is itself `TDDLIST_INVALID_ID`, so every one of its rows is either an
 * item or already reported. A later table has no such rule — the coverage
 * reader deliberately treats a blank `TDD-ID` as "this line is not a row" — so
 * applying the shape checks to those lines would report cells of something the
 * ledger does not treat as a row at all. What is left is exactly the set
 * Check 10 scores coverage from, which is the point: a row that can discharge a
 * coverage-target TC is checked the same wherever in the ledger it sits.
 */
function isRowShapeChecked(scan: LedgerTable, row: string[], tableIndex: number): boolean {
  if (tableIndex === 0) return true;
  return scan.tddIdIndex < 0 || (row[scan.tddIdIndex] ?? "").trim().length > 0;
}

/**
 * Where a row-shape finding sits, for the human reading it.
 *
 * A one-table ledger is the common case and its label has always been `row N`;
 * naming a table it does not have would be noise. Row indices are per table, so
 * once there is more than one the table has to be named or `row 2` is ambiguous.
 */
function describeLedgerRow(tableIndex: number, rowIndex: number): string {
  return tableIndex === 0 ? `row ${rowIndex + 1}` : `table ${tableIndex + 1}, row ${rowIndex + 1}`;
}

const REQUIRED_COLUMNS = TDD_LEDGER_REQUIRED_COLUMNS;

// `review-fix` is the state an item holds while reworking a blocking
// reviewer's REVISE. Without it a REVISE landed on `refactor`, whose only
// outbound edge is `done`, and agents wrote invented state names into the
// free-text Evidence column.
// `blocked` is "cannot be started", which the vocabulary had no value for. The
// only honest encoding was `todo` — exactly the status Phase Red selects next
// and exactly the one that prohibits completion, so the determination was never
// persisted and got re-derived, and disagreed about, on every planning pass.
// `exception` cannot absorb it: that is scoped to an anomaly, demands a DR-ID at
// `error`, and satisfies spec completion — so a blocked row filed there would
// silently close the obligation.
const VALID_STATUSES = new Set([
  "todo",
  "blocked",
  "red",
  "green",
  "refactor",
  "review-fix",
  "done",
  "exception",
]);

/** The column naming what a `blocked` row is waiting on. Optional; required on `blocked`. */
const BLOCKED_BY_COLUMN = "Blocked-By";

/**
 * The `Layer` values the shipped ledger schema declares
 * (`qfai-implement/SKILL.md` "Execution Ledger: test-list.md").
 *
 * The skill picks a row's obligation column by `Layer`, so a value outside this
 * set leaves it with no rule to follow.
 */
const VALID_LAYERS = new Set(["unit", "component", "integration", "api", "e2e"]);

/**
 * Layers that cannot host a `TC-*` obligation.
 *
 * `test-layers.md` forbids `TC-*` annotations in `tests/e2e/**` and
 * `tests/api/**`, so those rows record their obligation in `US-Refs` /
 * `CON-API-Refs`. This is the mirror of the `US-Refs`-on-a-Unit-row check.
 */
const TC_FORBIDDEN_LAYERS = new Set(["api", "e2e"]);

/**
 * The ledger `Layer` vocabulary, lower-cased. A value outside it is already
 * reported by `TDDLIST_UNKNOWN_LAYER`; the crosswalk treats it as "no evidence"
 * rather than stacking a second finding on the same typo.
 */
const KNOWN_LEDGER_LAYERS = new Set(["unit", "component", "integration", "api", "e2e"]);

/**
 * The ledger layers that discharge a coverage-target TC of this declared
 * `Level`, or `null` when the level names none — an absent or unrecognized
 * `Level` says nothing about layer, so any legal row still counts.
 *
 * `catalog/test-layers.md`'s crosswalk: L1 -> unit, L2 -> component. L3-L5 are
 * not coverage targets and never reach here.
 */
function expectedCoverageLayers(level: string): Set<string> | null {
  switch (level) {
    case "l1":
    case "unit":
      return new Set(["unit"]);
    case "l2":
    case "component":
      return new Set(["component"]);
    default:
      return null;
  }
}

const TC_ID_TOKEN = /^TC-\d{4}(-\d{4})?$/;

// `review-fix` is reached from `refactor`, so the item's test file already
// exists; a rework row whose Test file is blank or deleted is an incomplete
// ledger, not a valid intermediate state.
const TEST_FILE_CHECK_STATUSES = new Set(["green", "refactor", "review-fix", "done"]);

/**
 * Statuses whose row has already run a TDD cycle, so its `Evidence` cell is
 * owed the command+result pair that cycle produced.
 *
 * Deliberately the same set as `TEST_FILE_CHECK_STATUSES` but a separate
 * constant: the two rules answer different questions ("is there a test file"
 * vs "is there proof it ran"), and binding them to one name would make a later
 * change to either silently move the other.
 *
 * `todo` and `red` are excluded because a row can legitimately sit there with
 * nothing to show yet; `exception` is excluded because a parked row records its
 * reason in `DR-ID`, which `TDDLIST_EXCEPTION_MISSING_DR` already gates.
 */
const EVIDENCE_CHECK_STATUSES = new Set(["green", "refactor", "review-fix", "done"]);

/**
 * An `Evidence` cell carrying no content: empty, or nothing but dash
 * placeholders (ASCII hyphen, en dash, em dash).
 *
 * This is `qfai-implement/SKILL.md` "Empty evidence entries are rejected" in
 * machine form. A ledger of `Evidence: -` rows was the observed failure.
 */
const EVIDENCE_PLACEHOLDER = /^[-–—\s]*$/;

/**
 * A verdict claim with no execution behind it — the `Status: PASS` shape
 * `SKILL.md` names verbatim, plus the "should pass" / "looks good" phrasings
 * the next bullet rejects.
 */
const EVIDENCE_VERDICT_WORD =
  /\b(pass(?:ed|es|ing)?|fail(?:ed|s|ing)?|ok|ng|green|red|success(?:ful)?|looks good|should pass|all good)\b/i;

/**
 * A command invocation, recognised **structurally** rather than from a list of
 * known runners.
 *
 * A runner allowlist (`npm` / `pytest` / `cargo` …) is exactly what makes
 * `QFAI-TEST-001` fire on JS/TS and nothing else; repeating that here would
 * give the Evidence gate the same stack blindness. What a command looks like in
 * every stack is a program name followed by an argument that is not prose — a
 * flag, a path, a selector, a filename or an assignment. So the match is: a
 * bare word token, whitespace, then either a real flag (`-q`, `--filter`) or a
 * token containing one of `/` `\` `.` `:` `=` `*`.
 *
 * The flag branch is `--?[A-Za-z]`, not `-\S`. The looser form matched an arrow:
 * `Status: PASS -> 3 passed` read as command-shaped and slipped past this gate
 * with no command in it at all — the exact evasion the gate exists to catch.
 *
 * `go test ./...`, `pytest -q tests/test_a.py::test_b`, `cargo test --lib`,
 * `mvn -Dtest=Foo test` and `vitest run tests/foo.test.ts` all match on some
 * adjacent pair; `Status: PASS` and `looks good` match on none.
 */
const EVIDENCE_COMMAND_SHAPE =
  /(?:^|[\s`([{>$|&;])[A-Za-z_][\w.+-]*\s+(?:--?[A-Za-z][\w-]*|[^\s]*[/\\.:=*][^\s])/;

/**
 * Widely used test runners, as an **additional** acceptor.
 *
 * This list can only make the gate accept more, never reject more, so it
 * cannot reintroduce stack bias: an unlisted runner still passes through
 * `EVIDENCE_COMMAND_SHAPE`. It exists because argument-less invocations such as
 * `npm test` carry no structural marker and would otherwise read as prose.
 */
const EVIDENCE_KNOWN_RUNNER =
  /(?:^|[\s`([{>$|&;])(?:npm|pnpm|yarn|bun|npx|deno|node|vitest|jest|mocha|ava|karma|playwright|cypress|pytest|tox|nox|unittest|go|cargo|dotnet|mvn|gradle|make|rake|bundle|rspec|minitest|phpunit|pest|ctest|swift|flutter|dart|mix|sbt|stack|qfai)\b/i;

/**
 * True when the cell shows a command was actually run, not merely asserted.
 *
 * Backticks are deliberately NOT an acceptor of their own. A ```Status: PASS```
 * span holds whitespace, so a "backticked span with more than one word"
 * acceptor let the exact verdict this rule rejects launder itself into a
 * command. Only the runner list and the structural shape decide, and both read
 * through backticks unchanged.
 */
function hasCommandShape(evidence: string): boolean {
  return EVIDENCE_KNOWN_RUNNER.test(evidence) || EVIDENCE_COMMAND_SHAPE.test(evidence);
}

/**
 * Test directories a `Layer` value implies. `null` means the layer has no
 * mandated directory, so no consistency claim is made about it.
 */
const LAYER_TEST_DIRS: Record<string, string | null> = {
  unit: null,
  component: null,
  integration: "tests/integration/",
  api: "tests/api/",
  e2e: "tests/e2e/",
};

const TDD_ID_FORMAT = /^TDD-\d{4}$/;

/**
 * True when `testFile` is placed under the repo-root `dir`.
 *
 * A substring test matched anywhere in the path, so `src/tests/e2e/foo.test.ts`
 * and `mytests/e2e/foo.test.ts` both read as `tests/e2e/` and produced a
 * TDDLIST_LAYER_PATH_MISMATCH warning against a file that is not in the
 * mandated directory at all. Anchoring at the start, after stripping a leading
 * `./`, keeps the claim to real directory placement.
 */
function isUnderTestDir(testFile: string, dir: string): boolean {
  return testFile.replace(/^\.\//, "").startsWith(dir);
}

/**
 * A Change Request reference in any documented form: the bare id, the canonical
 * filename with its slug, and either with or without the `.md` extension.
 *
 * A `CR-*` in the `DR-ID` column records an approved reset and is retained
 * through the row's later statuses. It is not a Decision Record for an anomaly,
 * so a cell holding nothing but `CR-*` references leaves an `exception` row
 * without the DR it owes.
 *
 * Matching the bare id alone let the check be bypassed by writing what an
 * author naturally pastes — the filename `CR-20260731-0001-tighten-scope.md`
 * did not match, so the cell read as "carries a real DR" and the exception row
 * kept its exemption without ever owing a DR.
 */
const CHANGE_REQUEST_REF = /^CR-\d{8}-\d{4}(?:-[A-Za-z0-9][A-Za-z0-9-]*)?(?:\.md)?$/i;

/**
 * True when the `DR-ID` cell carries no reference other than `CR-*` ones.
 *
 * Tokens split on commas, semicolons AND whitespace: a cell written
 * `CR-20260731-0001 CR-20260731-0002` is two references, and treating it as one
 * token made it fail the CR pattern and silently satisfy the DR requirement.
 */
function isChangeRequestRefsOnly(drId: string): boolean {
  const refs = drId
    .split(/[,;\s]+/)
    .map((ref) => ref.trim())
    .filter((ref) => ref.length > 0);
  return refs.length > 0 && refs.every((ref) => CHANGE_REQUEST_REF.test(ref));
}

const TDD_LIST_REL_PATH = path.join("tdd", "test-list.md");

/**
 * The declared shape of a Decision Record id.
 *
 * `DR-ID` was a hard, `error`-severity precondition for `exception` with no
 * referent anywhere in the toolkit: no ID class, no row schema in either
 * shipped Decisions template, and no validator that resolved the reference. Any
 * non-empty string satisfied the gate, so the one thing a parked row was
 * required to carry was the one thing nothing could check.
 *
 * Kept in step with `ids.ts#STRICT_ID_PATTERNS.DR` — anchored here because this
 * validates one cell rather than scanning prose.
 */
const DR_ID_FORMAT = /^DR-\d{4}(?:-\d{4})?$/;

/**
 * Anything presenting itself as a DR id, so a malformed one is reported rather
 * than ignored.
 *
 * `^DR[-_]?\d` was too narrow: `DR-ABCD` and `DR-foo` are exactly the invented
 * tokens the format exists to surface, and they slipped through the non-empty
 * check unreported. A separator or a digit after `DR` is enough to claim the
 * prefix; whether the rest is well formed is what `DR_ID_FORMAT` decides.
 */
const DR_ID_SHAPED = /^DR[-_\d]/i;

/** Files a `DR-*` may be declared in, relative to the spec dir / specs root. */
const DR_DECLARATION_FILES = ["07_Decisions.md"];
const DR_POLICY_DECLARATION_FILE = path.join("_policies", "08_Decisions.md");

/** Waiver rule id for `TDDLIST_EXCEPTION_UNRESOLVED_DR`. */
export const UNRESOLVED_DR_RULE_ID = "TDDLIST-003";

function toPosixRel(value: string): string {
  return value.replace(/\\/g, "/");
}

/**
 * Every `DR-*` declared for this spec: its own `07_Decisions.md` plus the
 * shared `_policies/08_Decisions.md`.
 *
 * Both files are read, not one: a policy-level decision is cited from spec
 * ledgers, and resolving only against the spec-local file would report every
 * such citation as unresolved.
 */
async function collectDeclaredDrIds(specDir: string, specsRoot: string): Promise<Set<string>> {
  const declared = new Set<string>();
  const files = [
    ...DR_DECLARATION_FILES.map((name) => path.join(specDir, name)),
    path.join(specsRoot, DR_POLICY_DECLARATION_FILE),
  ];
  for (const file of files) {
    if (!(await exists(file))) continue;
    const text = await readSafe(file);
    for (const match of text.matchAll(/\bDR-\d{4}(?:-\d{4})?\b/g)) {
      declared.add(match[0].toUpperCase());
    }
  }
  return declared;
}

/**
 * Waiver rule id for `TDDLIST_EXCEPTION_PARKED`.

/**
 * Waiver rule ids for `TDDLIST_EXCEPTION_PARKED` / `TDDLIST_UNKNOWN_LEVEL`.
 *
 * A parked item that carries a user-approved accepted risk is a legitimate
 * end state, but the ledger row alone cannot prove the DR-ID was approved; and a
 * project may deliberately ship a Level vocabulary QFAI does not know.
 * `.qfai/waivers.yml` is the approval artifact QFAI already has for both (it
 * requires `id`/`reason`/`expires`/`evidence` and expires), so each finding
 * carries a `rule` that `waivers.ts#resolveRuleKeys` accepts — as does its
 * `code`, which is what an operator should actually write.
 *
 * Re-exported from `core/ruleIds.ts`, which `waivers.ts` also reads, so the two
 * cannot drift apart on a rename.
 */
export { EXCEPTION_PARKED_RULE_ID, UNKNOWN_LEVEL_RULE_ID };

/**
 * Waiver rule id for `TDDLIST_EVIDENCE_STATUS_ONLY`.
 *
 * The finding is a warning because pre-existing ledgers predate the check;
 * a project that has audited its legacy rows silences them with a waiver rather
 * than by rewriting evidence it can no longer reproduce.
 */
export const EVIDENCE_STATUS_ONLY_RULE_ID = "TDDLIST-004";

/**
 * Waiver rule id for `TDDLIST_STALE_STATUS`.
 *
 * A project that declares test paths and selectors before implementing them
 * would see this on every not-yet-started row, which is a legitimate workflow.
 * The waiver is the escape hatch, so the id must be resolvable by
 * `waivers.ts#resolveRuleKeys` — as is the code itself, which is the spelling
 * an operator copies out of `validate.json`.
 */
export const STALE_STATUS_RULE_ID = "TDDLIST-005";

/** Waiver rule id for `TDDLIST_SELECTOR_UNRESOLVED`. */
export const SELECTOR_UNRESOLVED_RULE_ID = "TDDLIST-006";

/**
 * Read a ledger row's `Test file` cell, or `null` when it names nothing this
 * validator may read.
 *
 * Mirrors Check 9's path handling — relative, inside the project root — but
 * reports nothing: Check 9 already owns the diagnostics for a completion-
 * claiming row, and a `todo` row with an absent test file is the normal case.
 */
async function readTestFileContent(root: string, testFile: string): Promise<string | null> {
  if (testFile.length === 0) {
    return null;
  }
  const normalized = testFile.replace(/\\/g, "/");
  if (path.isAbsolute(normalized) || path.win32.isAbsolute(normalized)) {
    return null;
  }
  const resolved = path.resolve(root, normalized);
  const relative = path.relative(root, resolved);
  if (relative === ".." || relative.startsWith(".." + path.sep)) {
    return null;
  }
  try {
    if (!(await stat(resolved)).isFile()) {
      return null;
    }
  } catch {
    return null;
  }
  const content = await readSafe(resolved);
  return content.length > 0 ? content : null;
}

/**
 * Whether a ledger `Selector` names something present in the test file.
 *
 * Selectors are written in whatever the project's runner accepts —
 * `tests/x_test.py::TestA::test_b`, `describe > renders header`,
 * `"renders the header"` — so this is a containment check, not a parse. Two
 * chances to match, in order of strength:
 *
 * 1. the selector text after any `path::` prefix appears verbatim;
 * 2. its last identifier-shaped token appears.
 *
 * Deliberately lenient. Both consumers treat a match as evidence *for* the
 * test's presence, so a false negative costs a warning that a false positive
 * would silently swallow.
 */
function selectorResolves(selector: string, content: string): boolean {
  const trimmed = selector.replace(/^[`"']+|[`"']+$/g, "").trim();
  if (trimmed.length === 0) {
    return false;
  }
  const withoutPath = trimmed.includes("::")
    ? trimmed.split("::").slice(1).join("::").trim() || trimmed
    : trimmed;
  if (withoutPath.length >= 3 && content.includes(withoutPath)) {
    return true;
  }
  const tokens = withoutPath.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g);
  const last = tokens?.[tokens.length - 1];
  return last !== undefined && content.includes(last);
}

/** Per-spec file that owns the Test Case Table, and the target of its findings. */
const TEST_CASES_FILE_NAME = "06_Test-Cases.md";

/** Repo-relative, posix-slashed path used for the `file` field of an issue. */
function toRelPath(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

/**
 * The accepted `Level` vocabulary, in the spelling the shipped
 * `06_Test-Cases.md` template actually uses.
 *
 * The internal sets are normalized to lower case for matching, so rendering
 * them directly told the reader to write `l1` while the template writes `L1`.
 * Codes are upper-cased and the two groups stay labelled, because "accepted"
 * alone does not say which values make a TC a mandatory ledger row.
 */
function canonicalLevel(level: string): string {
  return /^l\d+$/.test(level) ? level.toUpperCase() : level;
}

function acceptedLevelVocabulary(): string {
  const render = (levels: Iterable<string>): string =>
    [...levels].map(canonicalLevel).sort().join(", ");
  return `coverage targets: ${render(UNIT_COMPONENT_LAYERS)}; non-coverage: ${render(NON_COVERAGE_LAYERS)}`;
}

export async function validateTddList(root: string, config: QfaiConfig): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const issues: Issue[] = [];

  for (const entry of entries) {
    const specIssues = await validateSpecTddList(root, entry.dir, entry.specNumber, specsRoot);
    issues.push(...specIssues);
  }

  return issues;
}

async function validateSpecTddList(
  root: string,
  specDir: string,
  specNumber: string,
  specsRoot: string,
): Promise<Issue[]> {
  const filePath = path.join(specDir, TDD_LIST_REL_PATH);
  const relPath = toRelPath(root, filePath);
  const issues: Issue[] = [];

  // Check 1: File existence.
  //
  // **`tdd/test-list.md` is optional only for a spec that declares no
  // coverage-target TC.** That is an escalation from "optional for older
  // specs", and a deliberate one: a `warning` here was survivable while
  // `QFAI-ATDD-112` demanded an annotation for every TC, but with Unit and
  // Component excluded from that rule this ledger is their only gate. Returning
  // early on a missing file let a spec with declared L1/L2 TCs, no tests and no
  // ledger pass `validate --profile full --fail-on error`.
  //
  // The escalation is carried by `TDDLIST_TC_NOT_COVERED` (`error`), not by
  // `TDDLIST_MISSING` itself, and it is conditional on the spec: a spec whose
  // TCs are all L3-L5 still sees only the warning. It is also NOT waivable —
  // `QFAI-WAIVER-002` refuses every waiver on an `error` rule — so the finding
  // has to be clearable by the operator, and it is: seed the ledger. The
  // warning below says all of this, because a new hard failure an operator
  // meets first as red CI is the failure mode this package keeps re-learning.
  if (!(await exists(filePath))) {
    const { unitComponentTcIds } = await collectTestCaseIds(specDir);
    const owed = unitComponentTcIds.size;
    issues.push(
      issue(
        "TDDLIST_MISSING",
        owed > 0
          ? `tdd/test-list.md not found for spec-${specNumber}. It is optional only for a spec that declares no coverage-target TC, and this one declares ${String(owed)}`
          : `tdd/test-list.md not found for spec-${specNumber} (optional: the spec declares no coverage-target TC)`,
        "warning",
        relPath,
        "tddList.fileExists",
        undefined,
        // `canonical` is what this rule has always emitted, and the positional
        // `category` slot is only spelled out here because `suggested_action`
        // sits behind it. A JSON `category` is machine-readable output a
        // consumer may key on, and moving one is a change to announce on its
        // own merits, not a side effect of adding advice text.
        "canonical",
        owed > 0
          ? `Unit/Component TC are gated here alone since \`QFAI-ATDD-112\` stopped demanding an annotation for them, so the absent ledger is reported as \`TDDLIST_TC_NOT_COVERED\` (error) below. Seed \`${TDD_LIST_REL_PATH}\` with one row per coverage-target TC (\`/qfai-sdd\` Phase 2b), then run \`/qfai-implement\`.`
          : `Seed \`${TDD_LIST_REL_PATH}\` when the spec gains a Unit or Component TC (\`/qfai-sdd\` Phase 2b).`,
      ),
    );
    // …the obligations the ledger would have carried do not disappear with it.
    if (owed > 0) {
      const missing = Array.from(unitComponentTcIds).sort((left, right) =>
        left.localeCompare(right),
      );
      issues.push(
        issue(
          "TDDLIST_TC_NOT_COVERED",
          `tdd/test-list.md is absent for spec-${specNumber}, so ${String(missing.length)} coverage-target TC have no row: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ` (他 ${String(missing.length - 10)} 件)` : ""}`,
          "error",
          relPath,
          "tddList.tcCoverage",
          missing,
          // Same `category` as the other `TDDLIST_TC_NOT_COVERED` site below.
          // One rule code emitting two categories would sort the same finding
          // into a different report section depending on which path raised it.
          "canonical",
          `Seed \`${TDD_LIST_REL_PATH}\` with one row per coverage-target TC (\`/qfai-sdd\` Phase 2b), then run \`/qfai-implement\`.`,
        ),
      );
    }
    return issues;
  }

  const content = await readSafe(filePath);

  // Check 2: Table existence
  const table = parseFirstMarkdownTable(content);
  if (!table) {
    issues.push(
      issue(
        "TDDLIST_TABLE_MISSING",
        `tdd/test-list.md for spec-${specNumber} does not contain a Markdown table`,
        "error",
        relPath,
        "tddList.tableExists",
      ),
    );
    return issues;
  }

  // Check 3: Required columns
  const normalizedHeaders = table.headers.map((h) => h.trim());
  for (const col of REQUIRED_COLUMNS) {
    if (!normalizedHeaders.includes(col)) {
      issues.push(
        issue(
          "TDDLIST_REQUIRED_COLUMN_MISSING",
          `Required column "${col}" missing in tdd/test-list.md for spec-${specNumber}`,
          "error",
          relPath,
          "tddList.requiredColumns",
        ),
      );
    }
  }
  if (issues.length > 0) {
    return issues;
  }

  // Informational notice for header-only tables
  if (table.rows.length === 0) {
    issues.push(
      issue(
        "TDDLIST_INFO",
        `No active items in tdd/test-list.md for spec-${specNumber}`,
        "info",
        relPath,
        "tddList.noActiveItems",
      ),
    );
    // Do NOT return early: Phase 2 TC coverage check must still run
    // even when the table has no rows, to detect missing test entries.
  }

  // Check 4: Status enum validation
  const statusIndex = normalizedHeaders.indexOf("Status");
  if (statusIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const status = (row[statusIndex] ?? "").trim().toLowerCase();
      if (status.length > 0 && !VALID_STATUSES.has(status)) {
        issues.push(
          issue(
            "TDDLIST_INVALID_STATUS",
            `Invalid status "${status}" in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1})`,
            "error",
            relPath,
            "tddList.validStatus",
          ),
        );
      }
    }
  }

  // Check 5: TC reference existence
  const tcRefsIndex = normalizedHeaders.indexOf("TC-Refs");
  const { knownTcIds, unitComponentTcIds, unrecognizedLevels, coverageTargetLevels, unresolved } =
    await collectTestCaseIds(specDir);
  // The offending `Level` cell lives in 06_Test-Cases.md, not in the ledger
  // this validator is otherwise reading. Reporting `relPath` here pointed
  // the CLI, the JSON `file` field and any `scope.paths` waiver at a file
  // that cannot be edited to clear the finding.
  const testCasesRelPath = toRelPath(root, path.join(specDir, TEST_CASES_FILE_NAME));
  if (unrecognizedLevels.size > 0) {
    issues.push(
      issue(
        "TDDLIST_UNKNOWN_LEVEL",
        `Unrecognized Level value(s) in ${TEST_CASES_FILE_NAME} for spec-${specNumber}: ${[...unrecognizedLevels].sort().join(", ")}. Accepted — ${acceptedLevelVocabulary()}. Unrecognized values are treated as coverage targets, so every such TC becomes a mandatory ledger row`,
        "warning",
        testCasesRelPath,
        // Rule id, not a dotted path: kept as a back-compat waiver key for
        // files written before `resolveRuleKeys` accepted the code itself.
        UNKNOWN_LEVEL_RULE_ID,
        [...unrecognizedLevels].sort(),
        "change",
        `独自の Level 語彙を意図的に使用している場合は \`.qfai/waivers.yml\` に rule: ${UNKNOWN_LEVEL_CODE} の waiver（id / reason / expires / evidence / scope.paths が必須）を登録してください。`,
      ),
    );
  }
  if (unresolved) {
    // Both TC checks below are no-ops without a resolved table. Say so, so a
    // silent skip is distinguishable from a pass.
    //
    // The finding points at `06_Test-Cases.md`, not at the ledger: that is the
    // file to edit, and `file` is what GitHub annotations, report hotspots and
    // `scope.paths` waivers key on. Blaming `tdd/test-list.md` would send all
    // three at a document that is not the problem.
    issues.push(
      issue(
        "TDDLIST_TC_TABLE_UNRESOLVED",
        unresolved === "no-table"
          ? `Could not resolve the Test Case Table in ${TEST_CASES_FILE_NAME} for spec-${specNumber}: no Markdown table was found under the \`## Test Case Table\` section (a table elsewhere in the file is not used); TC coverage checks skipped`
          : `No \`TC-ID\` column found in the Test Case Table of ${TEST_CASES_FILE_NAME} for spec-${specNumber}; TC coverage checks skipped`,
        "warning",
        testCasesRelPath,
        "tddList.testCaseTableResolvable",
        undefined,
        "change",
        `${TEST_CASES_FILE_NAME} の \`## Test Case Table\` セクションに \`TC-ID\` 列を持つ表を記載してください。`,
      ),
    );
  }
  if (tcRefsIndex >= 0) {
    if (knownTcIds.size > 0) {
      for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
        const row = table.rows[rowIdx];
        if (!row) continue;
        const tcRefsCell = (row[tcRefsIndex] ?? "").trim();
        if (tcRefsCell.length === 0) continue;
        const refs = splitTcRefs(tcRefsCell);
        for (const ref of refs) {
          const normalized = ref.toUpperCase();
          const parent = resolveParentTcId(normalized) ?? normalized;
          if (
            TC_ID_TOKEN.test(normalized) &&
            !knownTcIds.has(normalized) &&
            !knownTcIds.has(parent)
          ) {
            issues.push(
              issue(
                "TDDLIST_UNKNOWN_REF",
                `Unknown TC reference "${ref}" in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1})`,
                "warning",
                relPath,
                "tddList.tcRefExists",
              ),
            );
          }
        }
      }
    }
  }

  const layerIndex = normalizedHeaders.indexOf("Layer");

  // Every table coverage is scored from, resolved once. Checks 5a, 5c and 6
  // below read it as well as Check 10 — see `describeLedgerRow`.
  const coverageTables = collectLedgerTables(content);

  // Check 5a: the `Layer` enum, on every row of every coverage table.
  //
  // Read independently of any reference column: the obligation checks below
  // skip a row whose reference cell is empty or `-`, so `Layer = System` or a
  // plain typo used to pass and left `/qfai-implement` with no rule for which
  // obligation column that row owns. Warning, not error: `Layer` predates the
  // declared enum and existing ledgers carry project-specific names — an error
  // would break them on upgrade without a migration.
  for (const [tableIdx, scan] of coverageTables.entries()) {
    if (scan.layerIndex < 0) continue;
    for (let rowIdx = 0; rowIdx < scan.table.rows.length; rowIdx++) {
      const row = scan.table.rows[rowIdx];
      if (!row || !isRowShapeChecked(scan, row, tableIdx)) continue;
      const rawLayer = (row[scan.layerIndex] ?? "").trim();
      // An empty cell carries no claim; the required-column check owns that gap.
      if (rawLayer.length === 0 || rawLayer === "-") continue;
      if (VALID_LAYERS.has(rawLayer.toLowerCase())) continue;
      issues.push(
        issue(
          "TDDLIST_UNKNOWN_LAYER",
          `Unknown Layer "${rawLayer}" in tdd/test-list.md for spec-${specNumber} (${describeLedgerRow(tableIdx, rowIdx)}). Legal values: Unit, Component, Integration, API, E2E`,
          "warning",
          relPath,
          "tddList.layerEnum",
          [rawLayer],
          "change",
          "Layer を Unit / Component / Integration / API / E2E のいずれかに直してください。行が担う obligation 列は Layer から決まります（TC-Refs: Unit/Component/Integration、US-Refs: E2E、CON-API-Refs: API）。",
        ),
      );
    }
  }

  // Check 5b: optional obligation columns.
  //
  // `test-layers.md` forbids `TC-*` annotations in `tests/e2e/**` and
  // `tests/api/**`, so an E2E or API row has no legal `TC-Refs` value and its
  // obligation has nowhere to live in the eight-column schema. `US-Refs` and
  // `CON-API-Refs` are the optional homes for those; when present their tokens
  // must be well-formed, otherwise an all-`done` ledger silently misreports.
  issues.push(
    ...validateObligationColumn(table, normalizedHeaders, {
      column: "US-Refs",
      pattern: /^US-\d{4}(?:-\d{4})?$/,
      expected: "US-NNNN",
      layer: "e2e",
      relPath,
      specNumber,
      rule: "tddList.usRefsFormat",
    }),
  );
  issues.push(
    ...validateObligationColumn(table, normalizedHeaders, {
      column: "CON-API-Refs",
      pattern: /^CON-API-\d+$/,
      expected: "CON-API-NNNN",
      layer: "api",
      relPath,
      specNumber,
      rule: "tddList.conApiRefsFormat",
    }),
  );

  // Check 5c: the reverse direction — a `TC-*` obligation on a layer that
  // cannot host it. Only `US-Refs` / `CON-API-Refs` were bound to their layer,
  // so `Layer = E2E` with `TC-Refs = TC-0001` still validated clean AND, worse,
  // Check 10 below counted it, letting a forbidden placement mark a
  // coverage-target TC as covered.
  for (const [tableIdx, scan] of coverageTables.entries()) {
    if (scan.layerIndex < 0) continue;
    for (let rowIdx = 0; rowIdx < scan.table.rows.length; rowIdx++) {
      const row = scan.table.rows[rowIdx];
      if (!row || !isRowShapeChecked(scan, row, tableIdx)) continue;
      const rawLayer = (row[scan.layerIndex] ?? "").trim();
      if (!TC_FORBIDDEN_LAYERS.has(rawLayer.toLowerCase())) continue;
      const tcRefsCell = (row[scan.tcRefsIndex] ?? "").trim();
      const tcTokens = splitTcRefs(tcRefsCell).filter((token) =>
        TC_ID_TOKEN.test(token.toUpperCase()),
      );
      if (tcTokens.length === 0) continue;
      issues.push(
        issue(
          "TDDLIST_OBLIGATION_LAYER_MISMATCH",
          `TC-Refs is not legal on a Layer=${rawLayer.toUpperCase()} row, but spec-${specNumber} (${describeLedgerRow(tableIdx, rowIdx)}) references ${tcTokens.join(", ")}`,
          "error",
          relPath,
          "tddList.tcRefsLayer",
          ["TC-Refs", rawLayer],
          "change",
          `Set Layer to UNIT / COMPONENT / INTEGRATION for this row, or move the obligation to the column its Layer owns (US-Refs for E2E, CON-API-Refs for API) and put \`-\` in TC-Refs.`,
        ),
      );
    }
  }

  // ── Phase 2 checks ──

  const tddIdIndex = normalizedHeaders.indexOf("TDD-ID");
  const drIdIndex = normalizedHeaders.indexOf("DR-ID");
  const testFileIndex = normalizedHeaders.indexOf("Test file");

  // Phase 2 – Check 6: TDD-ID format (TDD-NNNN)
  for (const [tableIdx, scan] of coverageTables.entries()) {
    if (scan.tddIdIndex < 0) continue;
    for (let rowIdx = 0; rowIdx < scan.table.rows.length; rowIdx++) {
      const row = scan.table.rows[rowIdx];
      if (!row || !isRowShapeChecked(scan, row, tableIdx)) continue;
      const tddId = (row[scan.tddIdIndex] ?? "").trim();
      if (!TDD_ID_FORMAT.test(tddId)) {
        issues.push(
          issue(
            "TDDLIST_INVALID_ID",
            `Invalid TDD-ID "${tddId}" in tdd/test-list.md for spec-${specNumber} (${describeLedgerRow(tableIdx, rowIdx)}). Expected format: TDD-NNNN`,
            "error",
            relPath,
            "tddList.idFormat",
          ),
        );
      }
    }
  }

  // Phase 2 – Check 7: Duplicate TDD-ID (case-insensitive)
  if (tddIdIndex >= 0) {
    const seen = new Map<string, number>();
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const tddId = (row[tddIdIndex] ?? "").trim().toUpperCase();
      if (tddId.length === 0) continue;
      const prev = seen.get(tddId);
      if (prev !== undefined) {
        issues.push(
          issue(
            "TDDLIST_DUPLICATE_ID",
            `Duplicate TDD-ID "${row[tddIdIndex]?.trim()}" in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1}, first seen row ${prev + 1})`,
            "error",
            relPath,
            "tddList.duplicateId",
          ),
        );
      } else {
        seen.set(tddId, rowIdx);
      }
    }
  }

  // Phase 2 – Check 8b: parked items must be visible in CI.
  //
  // `exception` is a completion-satisfying terminal that no validator reported,
  // so the cheapest fully-compliant path to "implementation complete" was to
  // park every unfinished item there. A warning per row makes the parking
  // visible without breaking existing runs.
  if (statusIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      if ((row[statusIndex] ?? "").trim().toLowerCase() !== "exception") continue;
      const tddId = tddIdIndex >= 0 ? (row[tddIdIndex] ?? "").trim() : "";
      const drId = drIdIndex >= 0 ? (row[drIdIndex] ?? "").trim() : "";
      const hasDrId = drId.length > 0 && drId !== "-";
      // Every row of one ledger shares the same rule AND the same file, so a
      // waiver matched on `rule` + `scope.paths` alone would clear every parked
      // row at once — including ones the operator never approved. `dl_id` is the
      // only per-finding key `waivers.ts#matchesWaiver` compares, so the row
      // identity goes there and `WAIVER-005` refuses a waiver that omits it.
      //
      // That identity must be unique to ONE row. TDD-ID is (TDDLIST_DUPLICATE_ID
      // enforces it within a ledger), so it is used when present. A DR-ID is
      // NOT: several parked rows can cite the same decision record, and keying
      // on it let one `match.dl_ids` entry suppress every row carrying that DR —
      // reintroducing the over-suppression this key exists to prevent. Anything
      // without a TDD-ID falls back to its row position, which is unique by
      // construction.
      const rowKey = tddId.length > 0 ? tddId : `row ${rowIdx + 1}`;
      // Only the TDD-ID form is a "TDD-ID"; the fallback is a row position, and
      // telling an operator to put a TDD-ID in `match.dl_ids` when the value is
      // `row 3` would send them looking for one that does not exist.
      const rowKeyLabel = tddId.length > 0 ? `TDD-ID ${rowKey}` : `row identifier "${rowKey}"`;
      issues.push(
        issue(
          "TDDLIST_EXCEPTION_PARKED",
          `TDD item "${rowKey}" in spec-${specNumber} is parked at Status=exception${hasDrId ? ` (DR-ID ${drId})` : ""}. Resolve it (\`exception -> todo\`), or record the accepted risk as a \`${EXCEPTION_PARKED_CODE}\` waiver in \`.qfai/waivers.yml\` naming this row in \`match.dl_ids\``,
          "warning",
          relPath,
          // Rule id, not a dotted path: kept as a back-compat waiver key for
          // files written before `resolveRuleKeys` accepted the code itself.
          EXCEPTION_PARKED_RULE_ID,
          hasDrId ? [drId] : undefined,
          "change",
          `承認済みの accepted risk である場合は \`.qfai/waivers.yml\` に rule: ${EXCEPTION_PARKED_CODE} の waiver（id / reason / expires / evidence / scope.paths / match.dl_ids が必須）を登録してください。match.dl_ids には対象行の ${rowKeyLabel} だけを列挙します。作業を再開する場合は \`exception -> todo\` で戻してください。`,
          { dl_id: rowKey },
        ),
      );
    }
  }

  // Phase 2 – Check 8a: a blocked row must name its blocker.
  //
  // Without this the new status would be a second unfalsifiable state: "cannot
  // start" with no record of what it is waiting on is the same re-derivation
  // problem `todo` already had, one word further along.
  const blockedByIndex = normalizedHeaders.indexOf(BLOCKED_BY_COLUMN);
  if (statusIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      if ((row[statusIndex] ?? "").trim().toLowerCase() !== "blocked") continue;
      const blockedBy = blockedByIndex >= 0 ? (row[blockedByIndex] ?? "").trim() : "";
      if (blockedBy.length > 0 && blockedBy !== "-") continue;
      issues.push(
        issue(
          "TDDLIST_BLOCKED_MISSING_REF",
          blockedByIndex < 0
            ? `Status=blocked in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1}) but the ledger has no ${BLOCKED_BY_COLUMN} column. Add it and name the blocker`
            : `Status=blocked but ${BLOCKED_BY_COLUMN} is empty in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1}). Name the blocker`,
          "error",
          relPath,
          "tddList.blockedBy",
          undefined,
          "change",
          `${BLOCKED_BY_COLUMN} 列に停止要因を記載してください: Change Request ID（\`CR-YYYYMMDD-NNNN\`）、行番号付きの契約パス（\`.qfai/contracts/db/CON-DB-0005.sql:2715\`）、または他 spec の行（\`spec-0006:TDD-0034\`）。`,
        ),
      );
    }
  }

  // Phase 2 – Check 8: Exception rows must have a DR-ID that resolves
  const declaredDrIds = await collectDeclaredDrIds(specDir, specsRoot);
  if (statusIndex >= 0 && drIdIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const status = (row[statusIndex] ?? "").trim().toLowerCase();
      if (status !== "exception") continue;
      const drId = (row[drIdIndex] ?? "").trim();
      if (drId.length === 0 || isChangeRequestRefsOnly(drId)) {
        const reason =
          drId.length === 0 ? "DR-ID is empty" : "DR-ID holds only Change Request references";
        issues.push(
          issue(
            "TDDLIST_EXCEPTION_MISSING_DR",
            `Status=exception but ${reason} in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1}). Add a DR-ID reference in the form DR-NNNN or DR-NNNN-NNNN, declared in 07_Decisions.md (spec-scoped) or _policies/08_Decisions.md (policy-level)`,
            "error",
            relPath,
            "tddList.exceptionDrId",
          ),
        );
        continue;
      }

      // "Non-empty" was the whole check, so a token the operator invented
      // satisfied the one thing a parked row is required to carry. These two
      // findings give the reference a referent — at `warning`, because ledgers
      // written before the format existed must not start failing CI on upgrade.
      const drTokens = drId
        .split(/[,;\s]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0 && !CHANGE_REQUEST_REF.test(token));

      const malformed = drTokens.filter(
        (token) => DR_ID_SHAPED.test(token) && !DR_ID_FORMAT.test(token.toUpperCase()),
      );
      if (malformed.length > 0) {
        issues.push(
          issue(
            "TDDLIST_EXCEPTION_INVALID_DR",
            `Malformed DR-ID ${malformed.join(", ")} in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1}). Expected DR-NNNN (policy-level) or DR-NNNN-NNNN (spec-scoped)`,
            "warning",
            relPath,
            "tddList.exceptionDrFormat",
            malformed,
            "change",
            `DR-ID を DR-NNNN もしくは DR-NNNN-NNNN の形式に直してください。宣言先は spec の 07_Decisions.md、または _policies/08_Decisions.md です。`,
          ),
        );
      }

      const wellFormed = drTokens
        .map((token) => token.toUpperCase())
        .filter((token) => DR_ID_FORMAT.test(token));
      const unresolved = wellFormed.filter((token) => !declaredDrIds.has(token));
      if (unresolved.length > 0) {
        issues.push(
          issue(
            "TDDLIST_EXCEPTION_UNRESOLVED_DR",
            `DR-ID ${unresolved.join(", ")} in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1}) is declared in no Decisions file. Searched ${DR_DECLARATION_FILES.join(", ")} and ${toPosixRel(DR_POLICY_DECLARATION_FILE)}`,
            "warning",
            relPath,
            // Rule id, not a dotted path: a project keeping its decision
            // records somewhere qfai does not read needs a way to silence this,
            // and a dotted name resolves to no waiver key.
            UNRESOLVED_DR_RULE_ID,
            unresolved,
            "change",
            `該当の Decision Record を spec の 07_Decisions.md（または _policies/08_Decisions.md）に記載してください。別の場所で管理している場合は \`.qfai/waivers.yml\` に rule: ${UNRESOLVED_DR_RULE_ID} の waiver を登録してください。`,
          ),
        );
      }
    }
  }

  // Phase 2 – Check 9: Test file existence for green/refactor/done
  if (statusIndex >= 0 && testFileIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const status = (row[statusIndex] ?? "").trim().toLowerCase();
      if (!TEST_FILE_CHECK_STATUSES.has(status)) continue;
      const testFile = (row[testFileIndex] ?? "").trim();
      if (testFile.length === 0) {
        issues.push(
          issue(
            "TDDLIST_TEST_FILE_MISSING",
            `Test file is empty for spec-${specNumber} (row ${rowIdx + 1}, Status=${status}). Provide a project-root-relative test file path`,
            "error",
            relPath,
            "tddList.testFileExists",
          ),
        );
        continue;
      }
      const normalized = testFile.replace(/\\/g, "/");
      const resolved = path.resolve(root, normalized);
      const relative = path.relative(root, resolved);
      if (
        path.isAbsolute(normalized) ||
        path.win32.isAbsolute(normalized) ||
        relative === ".." ||
        relative.startsWith(".." + path.sep)
      ) {
        issues.push(
          issue(
            "TDDLIST_TEST_FILE_MISSING",
            `Test file "${testFile}" for spec-${specNumber} (row ${rowIdx + 1}) must be a relative path that does not escape the project root`,
            "error",
            relPath,
            "tddList.testFileExists",
          ),
        );
        continue;
      }
      let isFile = false;
      try {
        isFile = (await stat(resolved)).isFile();
      } catch {
        // file does not exist
      }
      if (!isFile) {
        issues.push(
          issue(
            "TDDLIST_TEST_FILE_MISSING",
            `Test file "${testFile}" not found for spec-${specNumber} (row ${rowIdx + 1}). Path resolved relative to project root`,
            "error",
            relPath,
            "tddList.testFileExists",
          ),
        );
      }
    }
  }

  // Phase 2 – Check 9e: the declared seam.
  //
  // `Owning module` is how `delivery-planner` can answer "do these two items
  // write the same source module?" before RED-first has created either module.
  // It is a declaration, so the only thing checkable here is that a filled cell
  // names one module — a list would leave the gate comparing sets again, and a
  // row that honestly owns two modules is a row that should be split.
  const owningModuleIndex = normalizedHeaders.indexOf("Owning module");
  if (owningModuleIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx += 1) {
      const cell = (table.rows[rowIdx]?.[owningModuleIndex] ?? "").trim();
      if (cell.length === 0 || cell === "-") {
        continue;
      }
      if (!/[,;]|\s/.test(cell)) {
        continue;
      }
      issues.push(
        issue(
          "TDDLIST_OWNING_MODULE_NOT_SINGULAR",
          `Owning module must name exactly one module, but spec-${specNumber} (row ${rowIdx + 1}) declares "${cell}"`,
          "error",
          relPath,
          "tddList.owningModule",
          undefined,
          "canonical",
          "Declare one repo-relative path or dotted module path, or `-` when the seam is not declared. " +
            "A row that genuinely owns two modules is a row to split (`references/selector-granularity.md`); " +
            "a list would put the parallel-dispatch gate back to comparing sets it cannot evaluate before RED.",
        ),
      );
    }
  }

  // Phase 2 – Check 9c: the ledger under-reporting.
  //
  // Check 9 only ever looks at rows that *claim* completion, so "row says
  // `done` but the test file is missing" was an error while "the test exists
  // and the row still says `todo`" was invisible. The second direction is the
  // one that actually occurs, because work lands from parallel worktrees and
  // the ledger is updated by hand afterwards. A stale `todo` and a genuinely
  // not-started row are then indistinguishable to every downstream consumer,
  // including the completion gate that reads the ledger.
  //
  // The selector is what makes this trustworthy: a test file typically hosts
  // many rows, so file existence alone would fire on any row whose neighbours
  // have landed. Requiring the row's own selector to resolve inside that file
  // means the named test is really there.
  const selectorIndex = normalizedHeaders.indexOf("Selector");
  if (statusIndex >= 0 && testFileIndex >= 0 && selectorIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      if ((row[statusIndex] ?? "").trim().toLowerCase() !== "todo") continue;
      const content = await readTestFileContent(root, (row[testFileIndex] ?? "").trim());
      if (content === null) continue;
      const selector = (row[selectorIndex] ?? "").trim();
      if (!selectorResolves(selector, content)) continue;
      issues.push(
        issue(
          "TDDLIST_STALE_STATUS",
          `Test file exists and its selector "${selector}" resolves, but Status=todo for spec-${specNumber} (row ${rowIdx + 1}). The ledger may be stale; reconcile it before completion`,
          "warning",
          relPath,
          "tddList.staleStatus",
          undefined,
          "canonical",
          `Set this row to the status the repository actually supports, or clear the Test file / Selector if the test does not belong to it. A project that declares test paths and selectors before implementing them registers a \`.qfai/waivers.yml\` waiver with rule: ${STALE_STATUS_RULE_ID}.`,
        ),
      );
    }
  }

  // Phase 2 – Check 9d: `Selector` is a required column, so it has to be read.
  //
  // It was required and never read by any code in the package — a required
  // column whose value nothing consumes is a false assurance. For rows that
  // claim completion Check 9 has already established the file exists; this
  // establishes the named test is in it, which is also what makes Check 9c
  // above trustworthy.
  if (statusIndex >= 0 && testFileIndex >= 0 && selectorIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const status = (row[statusIndex] ?? "").trim().toLowerCase();
      if (!TEST_FILE_CHECK_STATUSES.has(status)) continue;
      const selector = (row[selectorIndex] ?? "").trim();
      if (selector.length === 0) continue;
      const content = await readTestFileContent(root, (row[testFileIndex] ?? "").trim());
      if (content === null) continue;
      if (selectorResolves(selector, content)) continue;
      issues.push(
        issue(
          "TDDLIST_SELECTOR_UNRESOLVED",
          `Selector "${selector}" was not found in its Test file for spec-${specNumber} (row ${rowIdx + 1}, Status=${status})`,
          "warning",
          relPath,
          "tddList.selectorResolves",
          undefined,
          "canonical",
          `The row claims a completed test the file does not appear to contain — the test was renamed, moved, or the Selector is stale. Update the Selector, or register a \`.qfai/waivers.yml\` waiver with rule: ${SELECTOR_UNRESOLVED_RULE_ID} when the selector is written in a form this check cannot resolve.`,
        ),
      );
    }
  }

  // Phase 2 – Check 9b: Layer <-> Test file consistency.
  //
  // `Layer` was a required column whose value was never read, so a `Unit` row
  // pointing at `tests/integration/**` was an invisible state. `layerIndex` is
  // resolved once above, for the enum check.
  if (layerIndex >= 0 && testFileIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const layer = (row[layerIndex] ?? "").trim().toLowerCase();
      const testFile = (row[testFileIndex] ?? "").trim().replace(/\\/g, "/");
      const expectedDir = LAYER_TEST_DIRS[layer];
      if (!expectedDir || testFile.length === 0) continue;

      const actualDir = Object.entries(LAYER_TEST_DIRS).find(
        ([, dir]) => dir !== null && isUnderTestDir(testFile, dir),
      );
      if (actualDir && actualDir[1] !== expectedDir) {
        issues.push(
          issue(
            "TDDLIST_LAYER_PATH_MISMATCH",
            `Layer "${(row[layerIndex] ?? "").trim()}" for spec-${specNumber} (row ${rowIdx + 1}) does not match Test file "${testFile}" (expected a path under ${expectedDir})`,
            "warning",
            relPath,
            "tddList.layerPathConsistency",
          ),
        );
      }
    }
  }

  // Phase 2 – Check 9c: Evidence content on rows that have run a cycle.
  //
  // `Evidence` was a required column whose *cell* nothing read: the string
  // "Evidence" reached only the required-column header check, so a ledger whose
  // every row said `-` passed `--profile tdd --fail-on error` with `error: 0` —
  // the one machine gate `qfai-implement`'s FINAL CHECKLIST names. That made
  // `error: 0` an actively misleading signal for the two SKILL.md hard rules
  // encoded below, which until now only a human reading the prose could apply.
  const evidenceIndex = normalizedHeaders.indexOf("Evidence");
  if (statusIndex >= 0 && evidenceIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const status = (row[statusIndex] ?? "").trim().toLowerCase();
      if (!EVIDENCE_CHECK_STATUSES.has(status)) continue;
      const evidence = (row[evidenceIndex] ?? "").trim();
      const rowLabel =
        tddIdIndex >= 0 && (row[tddIdIndex] ?? "").trim().length > 0
          ? `${(row[tddIdIndex] ?? "").trim()} (row ${rowIdx + 1})`
          : `row ${rowIdx + 1}`;

      if (EVIDENCE_PLACEHOLDER.test(evidence)) {
        issues.push(
          issue(
            "TDDLIST_EVIDENCE_EMPTY",
            `Evidence is empty for spec-${specNumber} ${rowLabel}, Status=${status}. A row past RED owes the command and its result ("Empty evidence entries are rejected", qfai-implement Evidence hard rules)`,
            "error",
            relPath,
            "tddList.evidencePresent",
            undefined,
            "change",
            `Evidence 列に実際に実行したコマンドとその結果を記録してください（例: \`npx vitest run tests/foo.test.ts\` → 3 passed）。まだ実行していない場合は Status を todo / red に戻してください。`,
          ),
        );
        continue;
      }

      // Only a cell that *claims a verdict* can be status-only evidence. A cell
      // holding some other note without a command is under-specified, but
      // calling it "status-only" would be wrong and erroring on it would reject
      // ledger content the hard rules never described.
      if (EVIDENCE_VERDICT_WORD.test(evidence) && !hasCommandShape(evidence)) {
        issues.push(
          issue(
            "TDDLIST_EVIDENCE_STATUS_ONLY",
            `Evidence for spec-${specNumber} ${rowLabel} states a verdict with no command (Status=${status}): "${evidence}". Status-only evidence is invalid — both the command and its result are required`,
            // `warning`, not `error`, and waivable.
            //
            // The hard rule says "MUST be rejected", and an error is what that
            // deserves — but every ledger written before this check existed
            // carries prose verdicts, and turning them into build failures on
            // upgrade is a migration, not a gate. qfai's own repository has 99
            // such rows. `TDDLIST_EVIDENCE_EMPTY` stays at `error` because an
            // empty cell is unambiguous and was the observed failure; a prose
            // verdict at least asserts something a reviewer can read.
            //
            // The rule id is the waivable `^[A-Z]+-\d{3}$` shape, so a project
            // that has audited its legacy rows can silence them per path
            // instead of being stuck between a false gate and a rewrite.
            "warning",
            relPath,
            EVIDENCE_STATUS_ONLY_RULE_ID,
            undefined,
            "change",
            `"Status: PASS" のような判定だけの記述は無効です。実行したコマンドを併記してください（例: \`npx vitest run tests/foo.test.ts\` → 3 passed）。`,
          ),
        );
      }
    }
  }

  // Phase 2 – Check 10: TC coverage (unit/component TCs must appear in test-list)
  //
  // Read from every ledger table, not just the first. A ledger that appends a
  // per-change-request section (`## CHG-006 …` + its own table) is a shape the
  // implement skill produces, and scoring coverage against table 1 alone
  // reports every TC the later tables cover as uncovered. That was survivable
  // while this was the second gate behind `QFAI-ATDD-112`; with L1/L2 now
  // excluded from that rule it is the only one, so a false negative here is a
  // hard `error` on a correct ledger.
  //
  // Widening this reader is also what obliged Checks 5a / 5c / 6 to read the
  // same set. They did not, so the identical row produced `TDDLIST_UNKNOWN_LAYER`
  // in the first table and *no finding whatsoever* in a later one — while
  // clearing this rule's `error` from both. The exclusions below name those
  // checks as the rules that report a bad `Layer`; in a later table that was
  // simply untrue.
  if (coverageTables.length > 0) {
    if (unitComponentTcIds.size > 0) {
      // TC -> the row layers that cite it. A set, not a boolean: the coverage
      // question and the crosswalk question are both answered from it.
      const citedLayers = new Map<string, Set<string>>();
      const cite = (tcId: string, layer: string): void => {
        const layers = citedLayers.get(tcId) ?? new Set<string>();
        layers.add(layer);
        citedLayers.set(tcId, layers);
      };
      for (const scan of coverageTables) {
        for (const row of scan.table.rows) {
          // `isCoverageBearingRow` is the shared answer to "may a coverage
          // claim be read from this row" — a `TC-*` on an E2E/API row is a
          // forbidden placement (Check 5c) and a line with no `TDD-ID` is not
          // an item at all. `qfai report` asks the same function, so the two
          // commands cannot disagree about one row.
          if (!isCoverageBearingRow(scan, row)) continue;
          const rowLayer =
            scan.layerIndex >= 0 ? (row[scan.layerIndex] ?? "").trim().toLowerCase() : "";
          const tcRefsCell = (row[scan.tcRefsIndex] ?? "").trim();
          if (tcRefsCell.length === 0) continue;
          const refs = splitTcRefs(tcRefsCell);
          for (const ref of refs) {
            const upper = ref.toUpperCase();
            cite(upper, rowLayer);
            const parent = resolveParentTcId(upper);
            if (parent) cite(parent, rowLayer);
          }
        }
      }
      for (const tcId of unitComponentTcIds) {
        const layers = citedLayers.get(tcId);
        if (layers === undefined) {
          issues.push(
            issue(
              "TDDLIST_TC_NOT_COVERED",
              `TC "${tcId}" (coverage-target) is not referenced in tdd/test-list.md for spec-${specNumber}. Add a row with this TC in TC-Refs`,
              "error",
              relPath,
              "tddList.tcCoverage",
            ),
          );
          continue;
        }
        // Crosswalk: a declared `Level` names the layer that discharges the TC.
        // Counting any non-E2E/API row let a `Level = L1` TC be closed by an
        // `Layer = Integration` row alone — and since L1/L2 no longer owe
        // `QFAI-ATDD-112` either, full validation passed with no unit test at
        // all. Only an explicit contradiction is reported: a TC that declared
        // no `Level`, or a row whose `Layer` is blank or outside the ledger
        // vocabulary, is not evidence of a mismatch.
        const expected = expectedCoverageLayers(coverageTargetLevels.get(tcId) ?? "");
        if (expected === null) continue;
        const decisive = [...layers].filter((layer) => KNOWN_LEDGER_LAYERS.has(layer));
        if (decisive.length !== layers.size || decisive.length === 0) continue;
        if (decisive.some((layer) => expected.has(layer))) continue;
        issues.push(
          issue(
            "TDDLIST_COVERAGE_LAYER_MISMATCH",
            `TC "${tcId}" declares Level=${coverageTargetLevels.get(tcId) ?? ""} but is only referenced from Layer=${decisive
              .map((layer) => layer.toUpperCase())
              .sort()
              .join(
                ", ",
              )} row(s) in tdd/test-list.md for spec-${specNumber}. The row still counts as coverage today; this escalates to error in a later release`,
            // `warning`, not `error`, on purpose. The mismatch is real and the
            // hole it names is real — but every ledger written before this rule
            // existed could carry one, and escalating on the release that
            // introduces the check hands consumers a zero-length window. This
            // repository's own specs have five. Making the drift visible is
            // what was missing; failing on it needs an announced window.
            "warning",
            relPath,
            "tddList.tcCoverageLayer",
            [tcId],
            "change",
            `Move the TC-Refs to a Layer=${[...expected]
              .map((layer) => layer.toUpperCase())
              .sort()
              .join(
                " / ",
              )} row, or change the TC's \`Level\` in ${TEST_CASES_FILE_NAME} to the layer that actually covers it.`,
          ),
        );
      }
    }
  }

  return issues;
}

type TestCaseIds = {
  knownTcIds: Set<string>;
  unitComponentTcIds: Set<string>;
  /**
   * Coverage-target TC -> the lower-cased `Level` it declared, or `""` when the
   * spec declared none. The id set alone discards the level, so coverage could
   * only ask "is this TC on some row"; the crosswalk needs to ask "on a row of
   * the layer its Level names".
   */
  coverageTargetLevels: Map<string, string>;
  /** `Level` values that match neither vocabulary; reported so a mismatch is visible. */
  unrecognizedLevels: Set<string>;
  /**
   * Set when no `TC-ID`-bearing table could be located. Both TC checks go
   * silent in that case, so the caller reports the miss rather than letting
   * "nothing found" read as "everything covered".
   */
  unresolved?: "no-table" | "no-tc-id-column";
};

type ObligationColumnSpec = {
  column: string;
  pattern: RegExp;
  expected: string;
  /** Lower-cased `Layer` value this obligation column is legal on. */
  layer: string;
  relPath: string;
  specNumber: string;
  rule: string;
};

/**
 * Validates an optional obligation column: token shape AND the row `Layer` the
 * obligation is legal on.
 *
 * Absent column, empty cell and `-` are all fine — the column is optional and
 * only rows carrying that obligation fill it. Checking the shape alone let a
 * `Layer = Unit` row claim a `US-*` obligation, which the ATDD gates route to
 * `tests/e2e/**`: the ledger would record a layer-scoped obligation the
 * completion gate reads at the wrong layer.
 */
function validateObligationColumn(
  table: { rows: string[][] },
  headers: string[],
  spec: ObligationColumnSpec,
): Issue[] {
  const index = headers.indexOf(spec.column);
  if (index < 0) {
    return [];
  }
  const layerIndex = headers.indexOf("Layer");

  const issues: Issue[] = [];
  for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx += 1) {
    const cell = (table.rows[rowIdx]?.[index] ?? "").trim();
    if (cell.length === 0 || cell === "-") {
      continue;
    }
    for (const token of cell.split(/[,;\s]+/).filter((value) => value.length > 0)) {
      if (spec.pattern.test(token.toUpperCase())) {
        continue;
      }
      issues.push(
        issue(
          "TDDLIST_INVALID_OBLIGATION_REF",
          `Invalid ${spec.column} value "${token}" in tdd/test-list.md for spec-${spec.specNumber} (row ${rowIdx + 1}). Expected format: ${spec.expected}`,
          "error",
          spec.relPath,
          spec.rule,
        ),
      );
    }

    if (layerIndex < 0) {
      continue;
    }
    const rawLayer = (table.rows[rowIdx]?.[layerIndex] ?? "").trim();
    if (rawLayer.toLowerCase() === spec.layer) {
      continue;
    }
    issues.push(
      issue(
        "TDDLIST_OBLIGATION_LAYER_MISMATCH",
        `${spec.column} is only legal on a Layer=${spec.layer.toUpperCase()} row, but spec-${spec.specNumber} (row ${rowIdx + 1}) declares Layer="${rawLayer}"`,
        "error",
        spec.relPath,
        `${spec.rule}Layer`,
        [spec.column, rawLayer],
        "change",
        `Set Layer to ${spec.layer.toUpperCase()} for this row, or move the obligation to the column its Layer owns (TC-Refs for Unit/Component/Integration, US-Refs for E2E, CON-API-Refs for API).`,
      ),
    );
  }
  return issues;
}

async function collectTestCaseIds(specDir: string): Promise<TestCaseIds> {
  // One instance of each Set for the whole function: the early returns hand
  // back the same (still empty) object the happy path fills, so there is no
  // second `unrecognizedLevels` that could diverge from this one.
  const knownTcIds = new Set<string>();
  const unitComponentTcIds = new Set<string>();
  const unrecognizedLevels = new Set<string>();
  const coverageTargetLevels = new Map<string, string>();
  const collected: TestCaseIds = {
    knownTcIds,
    unitComponentTcIds,
    unrecognizedLevels,
    coverageTargetLevels,
  };
  const testCasesPath = path.join(specDir, TEST_CASES_FILE_NAME);
  if (!(await exists(testCasesPath))) return collected;
  let content: string;
  try {
    content = await readFile(testCasesPath, "utf-8");
  } catch {
    return collected;
  }
  // Heading form (`## TC-0001` plus a `- Level:` line) is a supported shape
  // that `parseTestCases` and the ATDD level collector both read, and that this
  // gate did not: `resolveTestCaseTable` returns tables only, so a heading-form
  // spec produced a `TDDLIST_TC_TABLE_UNRESOLVED` warning and skipped coverage
  // entirely. With L1/L2 excluded from `QFAI-ATDD-112`, that left them gated by
  // nothing at all. Collected before the table pass so a spec that uses only
  // headings is still covered.
  //
  // The id pass is separate from the level pass on purpose. A heading block
  // that declares no `- Level:` line yields no level pair, but the TC is still
  // declared — seeding `knownTcIds` from the pairs alone made every level-less
  // heading-form TC an "unknown reference" the moment its ledger cited it.
  for (const tcId of collectHeadingTcIdsFrom(content)) {
    knownTcIds.add(tcId);
  }
  const headingLeveledTcIds = new Set<string>();
  for (const [tcId, level] of collectHeadingTcLevelsFrom(content)) {
    knownTcIds.add(tcId);
    if (classifyCoverageLevel(level) === "unrecognized") {
      unrecognizedLevels.add(level);
    }
    // First declaration wins between two headings for the same TC, exactly as
    // `collectTcLevels` now resolves them. Reading every pair let a later
    // heading add a coverage target the earlier one had not claimed (`L3` then
    // `L1`), or leave one the earlier had (`L1` then `L3`) — either way one TC
    // owed by both gates, which is precisely what the L1/L2 exclusion cannot
    // afford. `headingLeveledTcIds` is set here rather than at the top of the
    // loop so a level-less heading does not out-rank a later levelled one.
    if (headingLeveledTcIds.has(tcId)) continue;
    headingLeveledTcIds.add(tcId);
    if (isCoverageTargetLevel(level)) {
      unitComponentTcIds.add(tcId);
      // Heading form wins over the table form, matching `collectTcLevels`.
      coverageTargetLevels.set(tcId, level.trim().toLowerCase());
    }
  }

  // Scoped to the `## Test Case Table` section the template names, with a
  // header-match fallback for older specs. Reading the first table in
  // document order let an explanatory table above the heading hijack the set.
  const resolution = resolveTestCaseTable(content);
  if (!resolution.table) {
    // Only unresolved when neither shape yielded anything. A heading-form spec
    // has real TCs and must not be reported as an unreadable one.
    return knownTcIds.size > 0 ? collected : { ...collected, unresolved: resolution.reason };
  }

  // Every TC-ID table, not just the first. `atddTraceability` already reads
  // them all, so a spec that splits `06_Test-Cases.md` per BR had `TC-*` rows
  // that `QFAI-ATDD-112` saw and this gate did not. Since L1/L2 are now
  // excluded from `QFAI-ATDD-112`, the ledger is their only gate — a `Level =
  // L1` row in a second table would otherwise be owed by nothing at all.

  const tableLeveledTcIds = new Set<string>();
  // Coverage targets admitted by the blank/absent-`Level` fallback rather than
  // by a declaration, and therefore still revocable.
  //
  // `classifyCoverageLevel("")` is `coverage-target` on purpose — an unstated
  // `Level` must not silently drop the TC out of the only gate L1/L2 have. But
  // a row that says nothing cannot out-rank a later row that says `L3`: the
  // ATDD collector ignores a blank cell entirely and takes the `L3`, so leaving
  // the provisional target in place made a correctly annotated integration TC
  // owe `QFAI-ATDD-112` *and* `TDDLIST_TC_NOT_COVERED`. Tracking which ids the
  // fallback added is what lets the first explicit `Level` settle it either way.
  const provisionalTcIds = new Set<string>();
  for (const table of resolveTestCaseTables(content)) {
    // Lower-cased on both sides: `resolveTestCaseTables` now accepts a `tc-id`
    // / `TC-Id` header the way the ATDD collector always has, and a
    // case-sensitive `indexOf` here would take the table and then read column
    // `-1` from every row — the table would resolve and contribute nothing.
    const headers = table.headers.map((h) => h.trim().toLowerCase());
    const tcIdIndex = headers.indexOf("tc-id");
    const levelIndex = headers.indexOf("level");

    for (const row of table.rows) {
      const tcId = (row[tcIdIndex] ?? "").trim().toUpperCase();
      if (tcId.length === 0) continue;
      knownTcIds.add(tcId);
      // Heading wins on duplicates, which is what `collectTcLevels` and the
      // scaffold parser already do. Without this, a TC declared `L3` by its
      // heading and `L1` by a table row picked up a `TDDLIST_TC_NOT_COVERED`
      // obligation on top of the `QFAI-ATDD-112` one its heading gives it —
      // the two gates disagreeing about the same TC, which is the class of
      // defect this PR exists to close.
      if (headingLeveledTcIds.has(tcId)) continue;
      const level = levelIndex >= 0 ? (row[levelIndex] ?? "").trim().toLowerCase() : "";
      if (levelIndex >= 0) {
        if (classifyCoverageLevel(level) === "unrecognized") {
          unrecognizedLevels.add((row[levelIndex] ?? "").trim());
        }
        // First declaration wins across tables too, not only across shapes.
        // The non-coverage `continue` used to leave the id unrecorded, so a
        // TC declared `L3` by an earlier table and `L1` by a later one picked
        // up a ledger obligation on top of its `QFAI-ATDD-112` one —
        // `collectTcLevels` keeps the `L3`, and the two gates have to agree.
        if (tableLeveledTcIds.has(tcId)) continue;
        if (level.length > 0) {
          // The first *explicit* `Level` is the declaration, and it settles a
          // provisional target in whichever direction it points.
          tableLeveledTcIds.add(tcId);
          if (!isCoverageTargetLevel(level)) {
            if (provisionalTcIds.delete(tcId)) {
              unitComponentTcIds.delete(tcId);
              coverageTargetLevels.delete(tcId);
            }
            continue;
          }
          if (provisionalTcIds.delete(tcId)) {
            // Provisionally recorded as `""`; the declaration replaces it, so
            // the `Level`/`Layer` crosswalk reads the level the spec states
            // rather than the absence an earlier row happened to show.
            coverageTargetLevels.set(tcId, level);
          }
        }
      }
      // Reaches here when: (a) Level is a coverage target, or (b) Level column is absent (fallback: all TCs)
      unitComponentTcIds.add(tcId);
      if (!coverageTargetLevels.has(tcId)) {
        coverageTargetLevels.set(tcId, level);
      }
      if (level.length === 0) {
        provisionalTcIds.add(tcId);
      }
    }
  }
  return collected;
}

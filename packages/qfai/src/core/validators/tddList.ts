import { stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import { maskNonSpecRegions, parseFirstMarkdownTable } from "../specPackParsers.js";
import {
  EXCEPTION_PARKED_CODE,
  EXCEPTION_PARKED_RULE_ID,
  UNKNOWN_LEVEL_CODE,
  UNKNOWN_LEVEL_RULE_ID,
} from "../ruleIds.js";
import type { LedgerTable } from "../tddHelpers.js";
import {
  collectIncompleteLedgerTables,
  collectLedgerTables,
  isRowShapeChecked,
  isWellFormedTcRef,
  isCoverageBearingRow,
  splitTcRefs,
  resolveParentTcId,
  TC_FORBIDDEN_LAYERS,
  TDD_LEDGER_REQUIRED_COLUMNS,
  UNIT_COMPONENT_LAYERS,
  NON_COVERAGE_LAYERS,
} from "../tddHelpers.js";
// The coverage-target TC set `qfai report` also reads, so the gate and the
// progress figure cannot disagree about which TCs a spec declares.
import { collectTestCaseIds, TEST_CASES_FILE_NAME } from "../testCaseCoverageTargets.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe } from "./utils.js";

/**
 * The one authoritative list of ledger status transitions.
 *
 * `TDDLIST_EXCEPTION_PARKED` remediates via `exception -> todo`, an edge
 * `qfai-implement/SKILL.md` summarises without naming. An operator who checked
 * the finding against the skill instead of the reference found only "backward
 * transitions are prohibited … the only exception is an approved Change Request
 * reset" and reasonably concluded the tool was asking for something it forbids.
 * Citing the reference from the finding closes that loop.
 */
const TRANSITIONS_REF =
  ".qfai/assistant/skills/qfai-implement/references/execution-ledger.md#allowed-transitions";

/**
 * Where a row finding sits, for the human reading it.
 *
 * A one-table ledger is the common case and its label has always been `row N`;
 * naming a table it does not have would be noise. Row indices are per table, so
 * once there is more than one the table has to be named or `row 2` is ambiguous.
 *
 * **The ordinal counts ledger tables, not tables in the file**, and says so.
 * `collectLedgerTables` admits only schema-complete tables outside fenced and
 * commented regions, so the shipped `test-list.md` template — a `## Ledger`
 * table, a `## Schema` documentation table, a `## CHG-001` ledger table — makes
 * its third table the *second* ledger table. An unqualified `table 2` sent the
 * reader to the documentation table that has no rows to fix.
 */
function describeLedgerRow(tableIndex: number, rowIndex: number): string {
  return tableIndex === 0
    ? `row ${rowIndex + 1}`
    : `ledger table ${tableIndex + 1}, row ${rowIndex + 1}`;
}

/** One checked ledger row, with everything a finding needs to locate it. */
interface LedgerRowRef {
  scan: LedgerTable;
  row: string[];
  /** `row N`, or `ledger table M, row N` outside the first ledger table. */
  label: string;
}

/**
 * Every row of every ledger table that the per-row checks apply to.
 *
 * **One iteration order, one reader, one label.** Splitting the checks between
 * "coverage" ones that read every table and "execution state" ones that read
 * the first was a fail-open in two halves: a `Status=done` row in an appended
 * `## CHG-…` table cleared `TDDLIST_TC_NOT_COVERED` while its non-existent
 * `Test file` and empty `Evidence` were never looked at, so the gate accepted a
 * completion claim it had declined to check. Whether a row is trustworthy and
 * whether it discharges a TC are not separable questions — the second is only
 * worth anything because of the first.
 */
function* checkedLedgerRows(tables: readonly LedgerTable[]): Generator<LedgerRowRef> {
  for (const [tableIndex, scan] of tables.entries()) {
    for (let rowIndex = 0; rowIndex < scan.table.rows.length; rowIndex++) {
      const row = scan.table.rows[rowIndex];
      if (!row || !isRowShapeChecked(scan, row, tableIndex)) continue;
      yield { scan, row, label: describeLedgerRow(tableIndex, rowIndex) };
    }
  }
}

/** A trimmed cell, or `""` when the column is absent from this table. */
function cell(ref: LedgerRowRef, column: string): string {
  const index = ref.scan.headers.indexOf(column);
  return index < 0 ? "" : (ref.row[index] ?? "").trim();
}

/** Whether any ledger table declares `column`. Optional columns only. */
function anyTableHasColumn(tables: readonly LedgerTable[], column: string): boolean {
  return tables.some((scan) => scan.headers.includes(column));
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
  const withoutPath = normalizeSelector(selector);
  if (withoutPath === null) {
    return false;
  }
  if (withoutPath.length >= 3 && content.includes(withoutPath)) {
    return true;
  }
  const tokens = withoutPath.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g);
  const last = tokens?.[tokens.length - 1];
  return last !== undefined && content.includes(last);
}

/** The selector reduced to what both checks compare: quotes off, `path::` prefix off. */
function normalizeSelector(selector: string): string | null {
  const trimmed = selector.replace(/^[`"']+|[`"']+$/g, "").trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.includes("::")
    ? trimmed.split("::").slice(1).join("::").trim() || trimmed
    : trimmed;
}

/**
 * The same containment check WITHOUT the last-identifier fallback.
 *
 * `CR-20260818-0001`, approved 2026-08-23, option A. `selectorResolves` is deliberately lenient
 * because its other consumer treats a match as evidence *for* a test's presence, where a false
 * negative costs a warning and a false positive would swallow one. `TDDLIST_STALE_STATUS` reads it
 * in the opposite direction — a match is evidence the row's `todo` is STALE — so the same leniency
 * inverts: the last identifier of "renders the header" is `header`, which appears in almost any test
 * file, and the rule fires on rows whose test genuinely does not exist.
 *
 * A rule whose entire value is being trusted cannot afford that. The carve-out is here rather than in
 * `selectorResolves` so the other consumer keeps the leniency `drift-protocol.md` chose on purpose,
 * and the trade is stated: a row whose test exists under a slightly reworded title stops being
 * reported as stale — a false negative replacing a false positive, on a `warning` with no error-level
 * consequence.
 *
 * **Each `::` segment is required separately, not the joined string**, and that is a deliberate
 * departure from the option's literal wording ("verbatim containment of the selector"). A pytest
 * selector normalises to `TestX::test_reconcile_head`, and no Python file contains that text — the
 * class and the method are on different lines. Requiring the joined form turned a shape the suite
 * already covers into a false negative, which is the same defect this is repairing, pointed the other
 * way. Requiring every segment keeps the strictness where it matters: a one-segment selector like
 * `validates the header` must still appear in full, so the `header` fallback stays dead.
 */
function selectorResolvesVerbatim(selector: string, content: string): boolean {
  const withoutPath = normalizeSelector(selector);
  if (withoutPath === null) {
    return false;
  }
  const segments = withoutPath
    .split("::")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return false;
  }
  return segments.every((segment) => segment.length >= 3 && content.includes(segment));
}

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

/**
 * The coverage obligations a spec still owes when its ledger holds no rows.
 *
 * Two paths reach it and they must answer identically: the file is absent, or
 * the file exists and its only schema-shaped table is inside a fence or an HTML
 * comment. Both leave every coverage-target TC without a row, and since
 * `QFAI-ATDD-112` stopped demanding an annotation for L1/L2 this is the only
 * gate that still asks. Naming the TCs — rather than only saying "no table" —
 * is what makes the finding actionable: the fix is one row per id listed.
 */
function tcNotCoveredWithoutLedger(
  unitComponentTcIds: ReadonlySet<string>,
  specNumber: string,
  relPath: string,
  reason: string,
): Issue[] {
  if (unitComponentTcIds.size === 0) return [];
  const missing = Array.from(unitComponentTcIds).sort((left, right) => left.localeCompare(right));
  return [
    issue(
      "TDDLIST_TC_NOT_COVERED",
      `${reason} for spec-${specNumber}, so ${String(missing.length)} coverage-target TC have no row: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ` (他 ${String(missing.length - 10)} 件)` : ""}`,
      "error",
      relPath,
      "tddList.tcCoverage",
      missing,
      // Same `category` as the in-ledger `TDDLIST_TC_NOT_COVERED` site. One
      // rule code emitting two categories would sort the same finding into a
      // different report section depending on which path raised it.
      "canonical",
      `Seed \`${TDD_LIST_REL_PATH}\` with one row per independently observable boundary of a coverage-target TC (\`/qfai-sdd\` Phase 2b), then run \`/qfai-implement\`.`,
    ),
  ];
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
          ? `Unit/Component TC are gated here alone since \`QFAI-ATDD-112\` stopped demanding an annotation for them, so the absent ledger is reported as \`TDDLIST_TC_NOT_COVERED\` (error) below. Seed \`${TDD_LIST_REL_PATH}\` with one row per independently observable boundary of a coverage-target TC (\`/qfai-sdd\` Phase 2b), then run \`/qfai-implement\`.`
          : `Seed \`${TDD_LIST_REL_PATH}\` when the spec gains a Unit or Component TC (\`/qfai-sdd\` Phase 2b).`,
      ),
    );
    // …the obligations the ledger would have carried do not disappear with it.
    issues.push(
      ...tcNotCoveredWithoutLedger(
        unitComponentTcIds,
        specNumber,
        relPath,
        "tdd/test-list.md is absent",
      ),
    );
    return issues;
  }

  const content = await readSafe(filePath);

  // Check 2: Table existence.
  //
  // Read from the masked text, the way `collectLedgerTables` does. Unmasked,
  // the first table in the file could be a fenced sample or a commented-out old
  // one, and taking it as the ledger failed open in both directions at once:
  // every row check below ran against rows inside the fence, while
  // `collectLedgerTables` correctly found no ledger and Check 10 skipped
  // coverage entirely — so a spec whose only schema-shaped table was a
  // copy-paste template passed `--profile full --fail-on error` with its L1/L2
  // TCs gated by nothing, `QFAI-ATDD-112` having already excluded them.
  //
  // Masking also makes the two readers agree on which table is table 1:
  // Check 3 below returns on any missing required column, so past it the first
  // masked table IS `coverageTables[0]` and `row N` means the same row to every
  // check that prints it.
  const specContent = maskNonSpecRegions(content);
  const table = parseFirstMarkdownTable(specContent);
  if (!table) {
    issues.push(
      issue(
        "TDDLIST_TABLE_MISSING",
        `tdd/test-list.md for spec-${specNumber} does not contain a Markdown table outside fenced or commented-out regions`,
        "error",
        relPath,
        "tddList.tableExists",
      ),
    );
    // Same as an absent file: the obligations are outstanding and the ids are
    // what makes that fixable. "No table" alone does not say which rows to add.
    const { unitComponentTcIds } = await collectTestCaseIds(specDir);
    issues.push(
      ...tcNotCoveredWithoutLedger(
        unitComponentTcIds,
        specNumber,
        relPath,
        "tdd/test-list.md holds no ledger table outside fenced or commented-out regions",
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

  // Every table coverage is scored from, resolved once and read by every
  // per-row check below. Past Check 3 the first entry is `table` itself: the
  // masked reader above found it first and this one requires the same schema.
  const coverageTables = collectLedgerTables(content);
  const ledgerRows = (): Generator<LedgerRowRef> => checkedLedgerRows(coverageTables);

  // A later table that looks like a ledger table and is missing a column is
  // reported, not dropped. `collectLedgerTables` admits only schema-complete
  // tables, so an appended `## CHG-…` section that mistyped one header
  // contributed nothing at all — its rows vanished from the gate and from
  // `qfai report`, and a `done` row in the first table read as the whole
  // story while the follow-up work sat in a table nobody looked at. Check 3
  // only ever saw the first table, so nothing named the omission either.
  for (const incomplete of collectIncompleteLedgerTables(content)) {
    for (const column of incomplete.missing) {
      issues.push(
        issue(
          "TDDLIST_REQUIRED_COLUMN_MISSING",
          `Required column "${column}" missing from a ledger table in tdd/test-list.md for spec-${specNumber}. Its rows are not read: a table carrying TDD-ID and TC-Refs is a ledger table, and an incomplete one is a gap, not a note`,
          "error",
          relPath,
          "tddList.requiredColumns",
        ),
      );
    }
  }

  // Informational notice for a ledger with no rows anywhere. Keyed on the whole
  // ledger, not on the first table: "No active items" was printed for a file
  // whose first table is an empty header and whose `## CHG-…` table holds every
  // row, which is the shape `/qfai-implement` produces.
  if (coverageTables.every((scan) => scan.table.rows.length === 0)) {
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
  for (const ref of ledgerRows()) {
    const status = cell(ref, "Status").toLowerCase();
    if (status.length === 0 || VALID_STATUSES.has(status)) continue;
    issues.push(
      issue(
        "TDDLIST_INVALID_STATUS",
        `Invalid status "${status}" in tdd/test-list.md for spec-${specNumber} (${ref.label})`,
        "error",
        relPath,
        "tddList.validStatus",
      ),
    );
  }

  // Check 5: TC reference existence
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
  if (knownTcIds.size > 0) {
    for (const entry of ledgerRows()) {
      const tcRefsCell = cell(entry, "TC-Refs");
      if (tcRefsCell.length === 0) continue;
      for (const ref of splitTcRefs(tcRefsCell)) {
        const normalized = ref.toUpperCase();
        const parent = resolveParentTcId(normalized) ?? normalized;
        if (!TC_ID_TOKEN.test(normalized)) continue;
        if (knownTcIds.has(normalized) || knownTcIds.has(parent)) continue;
        issues.push(
          issue(
            "TDDLIST_UNKNOWN_REF",
            `Unknown TC reference "${ref}" in tdd/test-list.md for spec-${specNumber} (${entry.label})`,
            "warning",
            relPath,
            "tddList.tcRefExists",
          ),
        );
      }
    }
  }

  // Check 5a: the `Layer` enum.
  //
  // Read independently of any reference column: the obligation checks below
  // skip a row whose reference cell is empty or `-`, so `Layer = System` or a
  // plain typo used to pass and left `/qfai-implement` with no rule for which
  // obligation column that row owns. Warning, not error: `Layer` predates the
  // declared enum and existing ledgers carry project-specific names — an error
  // would break them on upgrade without a migration.
  for (const ref of ledgerRows()) {
    const rawLayer = cell(ref, "Layer");
    // An empty cell carries no claim; the required-column check owns that gap.
    if (rawLayer.length === 0 || rawLayer === "-") continue;
    if (VALID_LAYERS.has(rawLayer.toLowerCase())) continue;
    issues.push(
      issue(
        "TDDLIST_UNKNOWN_LAYER",
        `Unknown Layer "${rawLayer}" in tdd/test-list.md for spec-${specNumber} (${ref.label}). Legal values: Unit, Component, Integration, API, E2E`,
        "warning",
        relPath,
        "tddList.layerEnum",
        [rawLayer],
        "change",
        "Layer を Unit / Component / Integration / API / E2E のいずれかに直してください。行が担う obligation 列は Layer から決まります（TC-Refs: Unit/Component/Integration、US-Refs: E2E、CON-API-Refs: API）。",
      ),
    );
  }

  // Check 5b: optional obligation columns.
  //
  // `test-layers.md` forbids `TC-*` annotations in `tests/e2e/**` and
  // `tests/api/**`, so an E2E or API row has no legal `TC-Refs` value and its
  // obligation has nowhere to live in the eight-column schema. `US-Refs` and
  // `CON-API-Refs` are the optional homes for those; when present their tokens
  // must be well-formed, otherwise an all-`done` ledger silently misreports.
  issues.push(
    ...validateObligationColumn(ledgerRows(), {
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
    ...validateObligationColumn(ledgerRows(), {
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
  for (const ref of ledgerRows()) {
    const rawLayer = cell(ref, "Layer");
    if (!TC_FORBIDDEN_LAYERS.has(rawLayer.toLowerCase())) continue;
    const tcTokens = splitTcRefs(cell(ref, "TC-Refs")).filter((token) =>
      TC_ID_TOKEN.test(token.toUpperCase()),
    );
    if (tcTokens.length === 0) continue;
    issues.push(
      issue(
        "TDDLIST_OBLIGATION_LAYER_MISMATCH",
        `TC-Refs is not legal on a Layer=${rawLayer.toUpperCase()} row, but spec-${specNumber} (${ref.label}) references ${tcTokens.join(", ")}`,
        "error",
        relPath,
        "tddList.tcRefsLayer",
        ["TC-Refs", rawLayer],
        "change",
        `Set Layer to UNIT / COMPONENT / INTEGRATION for this row, or move the obligation to the column its Layer owns (US-Refs for E2E, CON-API-Refs for API) and put \`-\` in TC-Refs.`,
      ),
    );
  }

  // Check 5d: the split row's identity.
  //
  // `spec-traceability-rules.md` makes the (`TC-*`, `Boundary`) pair the key a
  // reseed matches on, precisely because nothing else distinguishes the rows a
  // matrix-shaped TC was split into: they repeat one `TC-Refs`, carry a serial
  // `TDD-ID`, and hold a `Selector` that `/qfai-implement` rewrites whenever a
  // review-fix handback replaces the test. Until now the rule had no reader —
  // a ledger whose sibling rows left `Boundary` empty, or spent one slug
  // twice, passed `--fail-on error` and then had the next Phase 2b preserve
  // `Status` and `Evidence` against whichever sibling it happened to land on.
  // A single row owes nothing: one row for a TC is already identified by that
  // TC, and demanding the column there would fail every non-matrix ledger.
  issues.push(...validateSplitBoundaryIdentity(ledgerRows(), relPath, specNumber));

  // ── Phase 2 checks ──

  // Phase 2 – Check 6: TDD-ID format (TDD-NNNN)
  for (const ref of ledgerRows()) {
    const tddId = cell(ref, "TDD-ID");
    if (TDD_ID_FORMAT.test(tddId)) continue;
    issues.push(
      issue(
        "TDDLIST_INVALID_ID",
        `Invalid TDD-ID "${tddId}" in tdd/test-list.md for spec-${specNumber} (${ref.label}). Expected format: TDD-NNNN`,
        "error",
        relPath,
        "tddList.idFormat",
      ),
    );
  }

  // Phase 2 – Check 7: Duplicate TDD-ID (case-insensitive), across the whole
  // ledger rather than within one table. `TDDLIST_EXCEPTION_PARKED` keys its
  // per-row waiver on the TDD-ID, so an id repeated in an appended table made
  // one approved `match.dl_ids` entry silently cover a row nobody approved.
  const seenTddIds = new Map<string, string>();
  for (const ref of ledgerRows()) {
    const tddId = cell(ref, "TDD-ID");
    if (tddId.length === 0) continue;
    const key = tddId.toUpperCase();
    const first = seenTddIds.get(key);
    if (first === undefined) {
      seenTddIds.set(key, ref.label);
      continue;
    }
    issues.push(
      issue(
        "TDDLIST_DUPLICATE_ID",
        `Duplicate TDD-ID "${tddId}" in tdd/test-list.md for spec-${specNumber} (${ref.label}, first seen ${first})`,
        "error",
        relPath,
        "tddList.duplicateId",
      ),
    );
  }

  // Phase 2 – Check 8b: parked items must be visible in CI.
  //
  // `exception` is a completion-satisfying terminal that no validator reported,
  // so the cheapest fully-compliant path to "implementation complete" was to
  // park every unfinished item there. A warning per row makes the parking
  // visible without breaking existing runs.
  for (const ref of ledgerRows()) {
    if (cell(ref, "Status").toLowerCase() !== "exception") continue;
    const tddId = cell(ref, "TDD-ID");
    const drId = cell(ref, "DR-ID");
    const hasDrId = drId.length > 0 && drId !== "-";
    // Every row of one ledger shares the same rule AND the same file, so a
    // waiver matched on `rule` + `scope.paths` alone would clear every parked
    // row at once — including ones the operator never approved. `dl_id` is the
    // only per-finding key `waivers.ts#matchesWaiver` compares, so the row
    // identity goes there and `WAIVER-005` refuses a waiver that omits it.
    //
    // That identity must be unique to ONE row. TDD-ID is (TDDLIST_DUPLICATE_ID
    // enforces it across the whole ledger), so it is used when present. A DR-ID
    // is NOT: several parked rows can cite the same decision record, and keying
    // on it let one `match.dl_ids` entry suppress every row carrying that DR —
    // reintroducing the over-suppression this key exists to prevent. Anything
    // without a TDD-ID falls back to its row position, which is unique by
    // construction and can only arise in the first ledger table: a blank
    // `TDD-ID` after it is not a row at all.
    const rowKey = tddId.length > 0 ? tddId : ref.label;
    // Only the TDD-ID form is a "TDD-ID"; the fallback is a row position, and
    // telling an operator to put a TDD-ID in `match.dl_ids` when the value is
    // `row 3` would send them looking for one that does not exist.
    const rowKeyLabel = tddId.length > 0 ? `TDD-ID ${rowKey}` : `row identifier "${rowKey}"`;
    issues.push(
      issue(
        "TDDLIST_EXCEPTION_PARKED",
        `TDD item "${rowKey}" in spec-${specNumber} is parked at Status=exception${hasDrId ? ` (DR-ID ${drId})` : ""}. Resolve it (\`exception -> todo\` — see ${TRANSITIONS_REF} — which needs no Change Request **only when the anomaly did not change an approved obligation**; if it did, that is drift and the approved upstream reset applies instead), or record the accepted risk as a \`${EXCEPTION_PARKED_CODE}\` waiver in \`.qfai/waivers.yml\` naming this row in \`match.dl_ids\``,
        "warning",
        relPath,
        // Rule id, not a dotted path: kept as a back-compat waiver key for
        // files written before `resolveRuleKeys` accepted the code itself.
        EXCEPTION_PARKED_RULE_ID,
        hasDrId ? [drId] : undefined,
        "change",
        `承認済みの accepted risk である場合は \`.qfai/waivers.yml\` に rule: ${EXCEPTION_PARKED_CODE} の waiver（id / reason / expires / evidence / scope.paths / match.dl_ids が必須）を登録してください。match.dl_ids には対象行の ${rowKeyLabel} だけを列挙します。作業を再開する場合は \`exception -> todo\` で戻してください（${TRANSITIONS_REF} が定める再入 edge です。anomaly が承認済み obligation を変更していない場合は Change Request 不要で、anomaly の DR-ID はそのまま残します。変更していた場合は drift なので、\`.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected\` の Change Request と承認済み upstream reset を使ってください）。`,
        { dl_id: rowKey },
      ),
    );
  }

  // Phase 2 – Check 8a: a blocked row must name its blocker.
  //
  // Without this the new status would be a second unfalsifiable state: "cannot
  // start" with no record of what it is waiting on is the same re-derivation
  // problem `todo` already had, one word further along.
  const hasBlockedByColumn = anyTableHasColumn(coverageTables, BLOCKED_BY_COLUMN);
  for (const ref of ledgerRows()) {
    if (cell(ref, "Status").toLowerCase() !== "blocked") continue;
    const blockedBy = cell(ref, BLOCKED_BY_COLUMN);
    if (blockedBy.length > 0 && blockedBy !== "-") continue;
    issues.push(
      issue(
        "TDDLIST_BLOCKED_MISSING_REF",
        !hasBlockedByColumn
          ? `Status=blocked in tdd/test-list.md for spec-${specNumber} (${ref.label}) but the ledger has no ${BLOCKED_BY_COLUMN} column. Add it and name the blocker`
          : `Status=blocked but ${BLOCKED_BY_COLUMN} is empty in tdd/test-list.md for spec-${specNumber} (${ref.label}). Name the blocker`,
        "error",
        relPath,
        "tddList.blockedBy",
        undefined,
        "change",
        `${BLOCKED_BY_COLUMN} 列に停止要因を記載してください: Change Request ID（\`CR-YYYYMMDD-NNNN\`）、行番号付きの契約パス（\`.qfai/contracts/db/CON-DB-0005.sql:2715\`）、または他 spec の行（\`spec-0006:TDD-0034\`）。`,
      ),
    );
  }

  // Phase 2 – Check 8: Exception rows must have a DR-ID that resolves
  const declaredDrIds = await collectDeclaredDrIds(specDir, specsRoot);
  {
    for (const ref of ledgerRows()) {
      const rowIdxLabel = ref.label;
      const status = cell(ref, "Status").toLowerCase();
      if (status !== "exception") continue;
      const drId = cell(ref, "DR-ID");
      if (drId.length === 0 || isChangeRequestRefsOnly(drId)) {
        const reason =
          drId.length === 0 ? "DR-ID is empty" : "DR-ID holds only Change Request references";
        issues.push(
          issue(
            "TDDLIST_EXCEPTION_MISSING_DR",
            `Status=exception but ${reason} in tdd/test-list.md for spec-${specNumber} (${rowIdxLabel}). Add a DR-ID reference in the form DR-NNNN or DR-NNNN-NNNN, declared in 07_Decisions.md (spec-scoped) or _policies/08_Decisions.md (policy-level)`,
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
            `Malformed DR-ID ${malformed.join(", ")} in tdd/test-list.md for spec-${specNumber} (${rowIdxLabel}). Expected DR-NNNN (policy-level) or DR-NNNN-NNNN (spec-scoped)`,
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
            `DR-ID ${unresolved.join(", ")} in tdd/test-list.md for spec-${specNumber} (${rowIdxLabel}) is declared in no Decisions file. Searched ${DR_DECLARATION_FILES.join(", ")} and ${toPosixRel(DR_POLICY_DECLARATION_FILE)}`,
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
  for (const ref of ledgerRows()) {
    const status = cell(ref, "Status").toLowerCase();
    if (!TEST_FILE_CHECK_STATUSES.has(status)) continue;
    const testFile = cell(ref, "Test file");
    if (testFile.length === 0) {
      issues.push(
        issue(
          "TDDLIST_TEST_FILE_MISSING",
          `Test file is empty for spec-${specNumber} (${ref.label}, Status=${status}). Provide a project-root-relative test file path`,
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
          `Test file "${testFile}" for spec-${specNumber} (${ref.label}) must be a relative path that does not escape the project root`,
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
          `Test file "${testFile}" not found for spec-${specNumber} (${ref.label}). Path resolved relative to project root`,
          "error",
          relPath,
          "tddList.testFileExists",
        ),
      );
    }
  }

  // Phase 2 – Check 9e: the declared seam.
  //
  // `Owning module` is how `delivery-planner` can answer "do these two items
  // write the same source module?" before RED-first has created either module.
  // It is a declaration, so the only thing checkable here is that a filled cell
  // names one module — a list would leave the gate comparing sets again, and a
  // row that honestly owns two modules is a row that should be split.
  for (const ref of ledgerRows()) {
    const owningModule = cell(ref, "Owning module");
    if (owningModule.length === 0 || owningModule === "-") continue;
    if (!/[,;]|\s/.test(owningModule)) continue;
    issues.push(
      issue(
        "TDDLIST_OWNING_MODULE_NOT_SINGULAR",
        `Owning module must name exactly one module, but spec-${specNumber} (${ref.label}) declares "${owningModule}"`,
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
  for (const ref of ledgerRows()) {
    if (cell(ref, "Status").toLowerCase() !== "todo") continue;
    const testFileContent = await readTestFileContent(root, cell(ref, "Test file"));
    if (testFileContent === null) continue;
    const selector = cell(ref, "Selector");
    if (!selectorResolvesVerbatim(selector, testFileContent)) continue;
    issues.push(
      issue(
        "TDDLIST_STALE_STATUS",
        `Test file exists and its selector "${selector}" resolves, but Status=todo for spec-${specNumber} (${ref.label}). The ledger may be stale; reconcile it before completion`,
        "warning",
        relPath,
        "tddList.staleStatus",
        undefined,
        "canonical",
        `Set this row to the status the repository actually supports, or clear the Test file / Selector if the test does not belong to it. A project that declares test paths and selectors before implementing them registers a \`.qfai/waivers.yml\` waiver with rule: ${STALE_STATUS_RULE_ID}.`,
      ),
    );
  }

  // Phase 2 – Check 9d: `Selector` is a required column, so it has to be read.
  //
  // It was required and never read by any code in the package — a required
  // column whose value nothing consumes is a false assurance. For rows that
  // claim completion Check 9 has already established the file exists; this
  // establishes the named test is in it, which is also what makes Check 9c
  // above trustworthy.
  for (const ref of ledgerRows()) {
    const status = cell(ref, "Status").toLowerCase();
    if (!TEST_FILE_CHECK_STATUSES.has(status)) continue;
    const selector = cell(ref, "Selector");
    if (selector.length === 0) continue;
    const testFileContent = await readTestFileContent(root, cell(ref, "Test file"));
    if (testFileContent === null) continue;
    if (selectorResolves(selector, testFileContent)) continue;
    issues.push(
      issue(
        "TDDLIST_SELECTOR_UNRESOLVED",
        `Selector "${selector}" was not found in its Test file for spec-${specNumber} (${ref.label}, Status=${status})`,
        "warning",
        relPath,
        "tddList.selectorResolves",
        undefined,
        "canonical",
        `The row claims a completed test the file does not appear to contain — the test was renamed, moved, or the Selector is stale. Update the Selector, or register a \`.qfai/waivers.yml\` waiver with rule: ${SELECTOR_UNRESOLVED_RULE_ID} when the selector is written in a form this check cannot resolve.`,
      ),
    );
  }

  // Phase 2 – Check 9b: Layer <-> Test file consistency.
  //
  // `Layer` was a required column whose value was never read, so a `Unit` row
  // pointing at `tests/integration/**` was an invisible state.
  for (const ref of ledgerRows()) {
    const rawLayer = cell(ref, "Layer");
    const testFile = cell(ref, "Test file").replace(/\\/g, "/");
    const expectedDir = LAYER_TEST_DIRS[rawLayer.toLowerCase()];
    if (!expectedDir || testFile.length === 0) continue;

    const actualDir = Object.entries(LAYER_TEST_DIRS).find(
      ([, dir]) => dir !== null && isUnderTestDir(testFile, dir),
    );
    if (!actualDir || actualDir[1] === expectedDir) continue;
    issues.push(
      issue(
        "TDDLIST_LAYER_PATH_MISMATCH",
        `Layer "${rawLayer}" for spec-${specNumber} (${ref.label}) does not match Test file "${testFile}" (expected a path under ${expectedDir})`,
        "warning",
        relPath,
        "tddList.layerPathConsistency",
      ),
    );
  }

  // Phase 2 – Check 9c: Evidence content on rows that have run a cycle.
  //
  // `Evidence` was a required column whose *cell* nothing read: the string
  // "Evidence" reached only the required-column header check, so a ledger whose
  // every row said `-` passed `--profile tdd --fail-on error` with `error: 0` —
  // the one machine gate `qfai-implement`'s FINAL CHECKLIST names. That made
  // `error: 0` an actively misleading signal for the two SKILL.md hard rules
  // encoded below, which until now only a human reading the prose could apply.
  for (const ref of ledgerRows()) {
    const status = cell(ref, "Status").toLowerCase();
    if (!EVIDENCE_CHECK_STATUSES.has(status)) continue;
    const evidence = cell(ref, "Evidence");
    const tddId = cell(ref, "TDD-ID");
    const rowLabel = tddId.length > 0 ? `${tddId} (${ref.label})` : ref.label;

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
    if (!EVIDENCE_VERDICT_WORD.test(evidence) || hasCommandShape(evidence)) continue;
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
  //
  // No guard on `coverageTables.length`. It used to skip this check whole when
  // the reader found no ledger table, which is exactly the case in which every
  // coverage-target TC is uncovered — a fenced-only or commented-out ledger
  // then silenced the one gate L1/L2 have. An empty set cites no layer, so the
  // loop below reports each TC as not covered, which is the honest answer.
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
        const rowLayer = (row[scan.layerIndex] ?? "").trim().toLowerCase();
        const tcRefsCell = (row[scan.tcRefsIndex] ?? "").trim();
        if (tcRefsCell.length === 0) continue;
        const refs = splitTcRefs(tcRefsCell);
        for (const ref of refs) {
          const upper = ref.toUpperCase();
          // Only a well-formed reference discharges anything.
          // `resolveParentTcId` strips the last segment, so an over-long
          // `TC-0001-0001-0001` resolved to the real `TC-0001-0001` and
          // cleared its obligation — while Check 5 skips a token that fails
          // `TC_ID_TOKEN` rather than reporting it, so nothing named the
          // malformed ref either. The TC ended up owed by neither gate on the
          // strength of a typo.
          if (!isWellFormedTcRef(upper)) continue;
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

  return issues;
}

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
  rows: Iterable<LedgerRowRef>,
  spec: ObligationColumnSpec,
): Issue[] {
  const issues: Issue[] = [];
  for (const ref of rows) {
    // An absent column reads as an empty cell, which is the same "this row
    // carries no such obligation" the optional column already means.
    if (ref.scan.headers.indexOf(spec.column) < 0) continue;
    const value = cell(ref, spec.column);
    if (value.length === 0 || value === "-") {
      continue;
    }
    for (const token of value.split(/[,;\s]+/).filter((entry) => entry.length > 0)) {
      if (spec.pattern.test(token.toUpperCase())) {
        continue;
      }
      issues.push(
        issue(
          "TDDLIST_INVALID_OBLIGATION_REF",
          `Invalid ${spec.column} value "${token}" in tdd/test-list.md for spec-${spec.specNumber} (${ref.label}). Expected format: ${spec.expected}`,
          "error",
          spec.relPath,
          spec.rule,
        ),
      );
    }

    const rawLayer = cell(ref, "Layer");
    if (rawLayer.toLowerCase() === spec.layer) {
      continue;
    }
    issues.push(
      issue(
        "TDDLIST_OBLIGATION_LAYER_MISMATCH",
        `${spec.column} is only legal on a Layer=${spec.layer.toUpperCase()} row, but spec-${spec.specNumber} (${ref.label}) declares Layer="${rawLayer}"`,
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

/** `Boundary` cells that mean "not filled in": absent column, empty, or `-`. */
function boundarySlug(ref: LedgerRowRef): string {
  const value = cell(ref, "Boundary");
  return value === "-" ? "" : value.toLowerCase();
}

/**
 * The `Boundary` invariant for rows that share a `TC-*`.
 *
 * Two severities, because the two failures reach a ledger by different routes.
 *
 * A **missing** slug is the legacy shape: a project seeded before the column
 * existed holds sibling rows without it, and the migration that adds it is
 * gated behind an approved Change Request (the split re-scopes rows, which
 * `constitution/drift-protocol.md` puts on the upstream path). Reporting that
 * at `error` would fail the gate for work the project is not yet permitted to
 * do, so it is a `warning` that names the rows and the route.
 *
 * A **duplicate** slug cannot arrive that way. Only a Phase 2b that already
 * writes `Boundary` can produce one, and it leaves two rows of one `TC-*`
 * genuinely indistinguishable — the next reseed has no way to tell which row
 * owns which observation. That is an `error`.
 */
function validateSplitBoundaryIdentity(
  rows: Iterable<LedgerRowRef>,
  relPath: string,
  specNumber: string,
): Issue[] {
  const byTc = new Map<string, LedgerRowRef[]>();
  for (const ref of rows) {
    for (const token of splitTcRefs(cell(ref, "TC-Refs"))) {
      const tc = token.toUpperCase();
      if (!TC_ID_TOKEN.test(tc)) continue;
      const bucket = byTc.get(tc);
      if (bucket) {
        bucket.push(ref);
      } else {
        byTc.set(tc, [ref]);
      }
    }
  }

  const issues: Issue[] = [];
  for (const tc of [...byTc.keys()].sort()) {
    const siblings = byTc.get(tc) ?? [];
    // One row for a TC is identified by that TC. The identity cell is only
    // owed once the TC was split.
    if (siblings.length < 2) continue;

    const unnamed = siblings.filter((ref) => boundarySlug(ref).length === 0);
    if (unnamed.length > 0) {
      issues.push(
        issue(
          "TDDLIST_SPLIT_BOUNDARY_MISSING",
          `${tc} is split across ${String(siblings.length)} rows in tdd/test-list.md for spec-${specNumber}, but ${String(unnamed.length)} of them name no Boundary (${unnamed.map((ref) => ref.label).join(", ")}). Sibling rows are told apart by the (TC, Boundary) pair and by nothing else.`,
          "warning",
          relPath,
          "tddList.splitBoundaryIdentity",
          [tc],
          "canonical",
          `Rerun \`/qfai-sdd <spec-id>\` so Phase 2b writes a Boundary slug on every row of ${tc}. A ledger seeded before the column existed needs an approved CR-* first (\`qfai-sdd/references/sdd-phase-checklists.md\`, Phase 2b), because re-splitting an aggregate row re-scopes it.`,
        ),
      );
    }

    const seen = new Map<string, string[]>();
    for (const ref of siblings) {
      const slug = boundarySlug(ref);
      if (slug.length === 0) continue;
      const labels = seen.get(slug);
      if (labels) {
        labels.push(ref.label);
      } else {
        seen.set(slug, [ref.label]);
      }
    }
    for (const slug of [...seen.keys()].sort()) {
      const labels = seen.get(slug) ?? [];
      if (labels.length < 2) continue;
      issues.push(
        issue(
          "TDDLIST_SPLIT_BOUNDARY_DUPLICATE",
          `Boundary "${slug}" is claimed by ${String(labels.length)} rows of ${tc} in tdd/test-list.md for spec-${specNumber} (${labels.join(", ")}), so those rows carry no distinct identity`,
          "error",
          relPath,
          "tddList.splitBoundaryUnique",
          [tc, slug],
          "canonical",
          `Give each row of ${tc} the slug of the one observable boundary it owns. A slug is unique within its TC; repointing an existing row's Boundary at another boundary silently re-scopes a row whose Evidence was observed against the old one.`,
        ),
      );
    }
  }
  return issues;
}

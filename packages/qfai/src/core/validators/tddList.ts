import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { lstat, readFile, readlink, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { ChangedSince } from "../gitChanges.js";
import { changedFilesSince } from "../gitChanges.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import { isSpecInScope, type SpecScope } from "../specScope.js";
import {
  maskNonSpecRegions,
  parseFirstMarkdownTable,
  splitMarkdownRow,
} from "../specPackParsers.js";
import {
  EXCEPTION_PARKED_CODE,
  EXCEPTION_PARKED_RULE_ID,
  UNKNOWN_LEVEL_CODE,
  UNKNOWN_LEVEL_RULE_ID,
} from "../ruleIds.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
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
import { resolveToolVersion } from "../version.js";
import { exists, isInside, issue, readSafe } from "./utils.js";

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
 * table, a `## Schema` documentation table, a `## CHG-NNN` ledger table — makes
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

/**
 * Every ledger status that still owes work: `VALID_STATUSES` less `done`.
 *
 * Derived rather than listed, so a new non-terminal status cannot be added to
 * the vocabulary and left out of the retirement migration instruction — which
 * would strand exactly the rows nothing asks for again. `blocked` and
 * `review-fix` are the two that were missed when this was spelled out by hand.
 */
const LIVE_LEDGER_STATUSES = Array.from(VALID_STATUSES).filter((status) => status !== "done");

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

/** The canonical repo-relative pointer stored in an Evidence cell. */
const EVIDENCE_ANCHOR_PATTERN =
  /(?:^|[\s`(])(\.qfai\/evidence\/(?:implement|atdd)-spec-\d{4}\.md)#([a-z0-9][a-z0-9-]*)(?=$|[\s`),.;])/gi;

/** A cell claiming a pointer must not pass merely because its syntax is malformed. */
const EVIDENCE_POINTER_CLAIM = /\bevidence\s+at\b/i;

interface EvidenceAnchor {
  file: string;
  fragment: string;
}

function collectEvidenceAnchors(evidence: string): EvidenceAnchor[] {
  const anchors: EvidenceAnchor[] = [];
  for (const match of evidence.matchAll(EVIDENCE_ANCHOR_PATTERN)) {
    const file = match[1];
    const fragment = match[2];
    if (file && fragment) {
      anchors.push({ file, fragment: fragment.toLowerCase() });
    }
  }
  return anchors;
}

interface MarkdownEvidenceIndex {
  anchors: ReadonlySet<string>;
  sections: ReadonlyMap<string, string>;
}

/** GitHub-style heading anchors and their visible sections. */
function markdownEvidenceIndex(markdown: string): MarkdownEvidenceIndex {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const originalLines = normalized.split("\n");
  const visibleLines = maskEvidenceRegions(normalized).split("\n");
  const headings = visibleLines.flatMap((line, lineIndex) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    return match ? [{ level: match[1]?.length ?? 6, title: match[2] ?? "", lineIndex }] : [];
  });
  const occurrences = new Map<string, number>();
  const anchors = new Set<string>();
  const sections = new Map<string, string>();

  for (const [index, heading] of headings.entries()) {
    const base = heading.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const seen = occurrences.get(base) ?? 0;
    occurrences.set(base, seen + 1);
    const anchor = seen === 0 ? base : `${base}-${seen}`;
    anchors.add(anchor);

    const nextPeer = headings.slice(index + 1).find((candidate) => {
      return /^TDD-\d{4}\b/i.test(candidate.title) || candidate.level <= heading.level;
    });
    const endLine = nextPeer?.lineIndex ?? originalLines.length;
    sections.set(anchor, originalLines.slice(heading.lineIndex + 1, endLine).join("\n"));
  }
  return { anchors, sections };
}

/**
 * Evidence fields may own a fenced payload indented beneath a list item.
 * CommonMark treats that indentation as list continuation, while the general
 * spec masker deliberately preserves list continuations. For evidence field
 * discovery the fence is still payload, so labels printed inside it must not
 * become sibling fields.
 */
function maskEvidenceRegions(markdown: string): string {
  const lines = maskNonSpecRegions(markdown).split("\n");
  let open: { marker: string; length: number } | null = null;
  return lines
    .map((line) => {
      if (open !== null) {
        const closing = /^\s*(`{3,}|~{3,})\s*$/.exec(line)?.[1];
        if (closing && closing.charAt(0) === open.marker && closing.length >= open.length) {
          open = null;
        }
        return "";
      }
      const opening = /^\s*(`{3,}|~{3,})[^\r\n]*$/.exec(line)?.[1];
      if (opening) {
        open = { marker: opening.charAt(0), length: opening.length };
        return "";
      }
      return line;
    })
    .join("\n");
}

function fencedEvidenceValue(lines: readonly string[], startLine: number): string | null {
  let cursor = startLine;
  while (cursor < lines.length && (lines[cursor] ?? "").trim().length === 0) cursor += 1;
  const opening = /^\s*(`{3,}|~{3,})[^\r\n]*$/.exec(lines[cursor] ?? "");
  const marker = opening?.[1];
  if (!marker) return null;

  const content: string[] = [];
  for (cursor += 1; cursor < lines.length; cursor += 1) {
    const line = lines[cursor] ?? "";
    const closing = /^\s*(`{3,}|~{3,})\s*$/.exec(line)?.[1];
    if (closing?.charAt(0) === marker.charAt(0) && closing.length >= marker.length) {
      const value = content.join("\n").trim();
      return value.length > 0 ? value : null;
    }
    content.push(line);
  }
  return null;
}

interface EvidenceFieldOccurrence {
  round: number | null;
  value: string;
}

function evidenceFieldOccurrences(section: string, field: string): EvidenceFieldOccurrence[] {
  const normalized = section.replace(/\r\n/g, "\n");
  const originalLines = normalized.split("\n");
  const visibleLines = maskEvidenceRegions(normalized).split("\n");
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bulletPattern = new RegExp(
    `^\\s*(?:[-*][ \\t]+)?(?:\\*\\*)?(?:Round[ \\t]+(\\d+):[ \\t]*)?${escaped}(?:\\*\\*)?[ \\t]*:[ \\t]*(.*)$`,
    "i",
  );
  const occurrences: EvidenceFieldOccurrence[] = [];

  for (const [lineIndex, visibleLine] of visibleLines.entries()) {
    if (/^\s*\|/.test(visibleLine)) {
      const cells = splitMarkdownRow(visibleLine);
      for (let cellIndex = 0; cellIndex < cells.length - 1; cellIndex += 1) {
        const rawLabel = (cells[cellIndex] ?? "").replace(/^\*\*|\*\*$/g, "").trim();
        const roundMatch = /^Round\s+(\d+):\s*(.*)$/i.exec(rawLabel);
        const label = (roundMatch?.[2] ?? rawLabel).trim();
        if (label.toLowerCase() !== field.toLowerCase()) continue;
        const value = (cells[cellIndex + 1] ?? "").trim().replace(/^`([^`]*)`$/, "$1");
        const resolved =
          value.length > 0 ? value : fencedEvidenceValue(originalLines, lineIndex + 1);
        if (resolved !== null) {
          occurrences.push({
            round: roundMatch?.[1] ? Number(roundMatch[1]) : null,
            value: resolved,
          });
        }
      }
      continue;
    }

    const match = bulletPattern.exec(visibleLine);
    if (!match) continue;
    const value = (match[2] ?? "").trim().replace(/^`([^`]*)`$/, "$1");
    const resolved = value.length > 0 ? value : fencedEvidenceValue(originalLines, lineIndex + 1);
    if (resolved !== null) {
      occurrences.push({ round: match[1] ? Number(match[1]) : null, value: resolved });
    }
  }
  return occurrences;
}

function rowEvidenceFieldValue(section: string, field: string): string | null {
  return (
    evidenceFieldOccurrences(section, field)
      .filter(({ round }) => round === null)
      .at(-1)?.value ?? null
  );
}

function roundEvidenceFieldValue(section: string, round: number, field: string): string | null {
  return (
    evidenceFieldOccurrences(section, field)
      .filter((occurrence) => occurrence.round === round)
      .at(-1)?.value ?? null
  );
}

/**
 * The fields a round records once, and only once.
 *
 * Read per round by {@link roundEvidenceFieldValue}, which takes the last
 * occurrence — so a second block bearing the same round number silently
 * overrides some of these and leaves the rest reading from the first.
 */
const ROUND_SCOPED_EVIDENCE_FIELDS = [
  "Revision",
  "RED revision",
  "RED test hash",
  "RED test manifest",
  "RED command",
  "RED result",
  "GREEN command",
  "GREEN result",
] as const;

function evidenceRoundNumbers(section: string): number[] {
  const normalized = maskEvidenceRegions(section.replace(/\r\n/g, "\n"));
  const rounds = new Set<number>();
  for (const line of normalized.split("\n")) {
    const match = /(?:^|\|)\s*(?:[-*][ \t]+)?(?:\*\*)?Round[ \t]+(\d+):/i.exec(line);
    if (match?.[1]) rounds.add(Number(match[1]));
  }
  return [...rounds].sort((left, right) => left - right);
}

/**
 * A cell that says the run did not happen, wherever it says it.
 *
 * The lead-anchored form alone read only `not run: npm test`. A record is just
 * as likely to put the negation after the command it negates — `npm test was
 * not run`, `we did not run npm test` — and there the runner token matched, the
 * lead anchor did not, and a `done` row claimed a command it states it never
 * executed. So the phrase is looked for anywhere in the cell.
 *
 * The unanchored form requires an explicit negator (`not`, `never`, `no`,
 * `n't`) governing a run verb. A bare `skipped` / `n/a` stays lead-anchored on
 * purpose: mid-cell it is as likely to be part of a path or a test name
 * (`tests/skipped-cases.test.ts`) as a verdict, and rejecting a real command
 * over its filename is the failure the two result predicates below are being
 * fixed for.
 */
const EVIDENCE_COMMAND_NOT_RUN = [
  /^\s*(?:skipped|not[ -]?run|never[ -]?run|did\s+not\s+run|was\s+not\s+run|n\/a|none)(?:\s*$|\s*[:—-])/i,
  /\b(?:not|never|no|n['’]t)\s+(?:been\s+|yet\s+)*(?:run|ran|executed|invoked)\b/i,
  /\b(?:wasn|weren|isn|aren|hasn|haven|didn|don|doesn|couldn)['’]t\s+(?:been\s+)?(?:run|ran|executed|invoked)\b/i,
];

function isExecutedEvidenceCommand(value: string): boolean {
  return hasCommandShape(value) && !EVIDENCE_COMMAND_NOT_RUN.some((form) => form.test(value));
}

/**
 * A result line with the file names it ran taken out of it.
 *
 * A result says two different things at once: the outcome, and which file
 * produced it. Scanning the whole line for failure words reads the second as if
 * it were the first, and `PASS tests/error-handler.test.ts (1 passed)` then
 * answers "failing" to one predicate and "not passing" to the other — the same
 * defect in both directions, from one shared cause, which is why one function
 * removes it for both.
 *
 * Only tokens that are unambiguously *file names* are removed: a token
 * carrying a path separator and ending in an extension, or a bare
 * `<name>.test.<ext>` / `<name>.spec.<ext>`. A bare `/` (as in `6 failed / 13
 * passed`) and a counted form like `1 failed/2 passed` keep their words,
 * because neither ends in an extension — over-removal would silence a real
 * failure, which is the worse of the two errors here.
 */
function evidenceResultOutcomeText(value: string): string {
  return value.replace(/\S*[/\\]\S*\.\w+/g, " ").replace(/\S+\.(?:test|spec)\.\w+/gi, " ");
}

/**
 * A result that reports nothing having run.
 *
 * `exit 0` and the word `passed` are both true of a run that matched no test at
 * all — a mistyped selector, a filter that no longer matches, a renamed file —
 * so `0 tests passed` and `exit 0 (0 tests)` cleared the GREEN half of the
 * completion gate without the row's behaviour ever being executed. The command
 * shape and the selector's static resolution are both satisfied in that state,
 * so nothing else downstream asks the question.
 *
 * `0 tests failed` is deliberately excluded by the lookahead: that spelling
 * reports the absence of failures, not the absence of tests, and rejecting it
 * would fail the honest summaries that phrase a pass that way. `\b` before the
 * zero keeps `10 tests` and `100 passed` out of it.
 */
const EVIDENCE_RESULT_RAN_NOTHING =
  /\b(?:0|zero)\s+(?:tests?|specs?|examples?)\b(?!\s*(?:failed|failing|failures?|errors?))|\b0\s+passed\b|\bno\s+tests?\s+(?:ran|run|found|matched|executed)\b|\bno\s+test\s+files?\s+found\b/i;

function isPassingEvidenceResult(value: string): boolean {
  const outcome = evidenceResultOutcomeText(value);
  const withoutZeroFailures = outcome.replace(/\b0\s+(?:failed|failures?|errors?)\b/gi, "");
  // Asked before the success words, because they are present and true.
  if (EVIDENCE_RESULT_RAN_NOTHING.test(outcome)) return false;
  if (/\b(?:not|never|did\s+not)\s+(?:pass(?:ed|ing)?|succeed(?:ed)?)\b/i.test(outcome)) {
    return false;
  }
  if (/\b(?:fail(?:ed|ure|ures)?|error|not[ -]?run|skipped)\b/i.test(withoutZeroFailures)) {
    return false;
  }
  return /\b(?:pass(?:ed|ing)?|success(?:ful|fully)?|succeeded|ok)\b|\bexit(?:ed)?\s+0\b/i.test(
    outcome,
  );
}

function isFailingEvidenceResult(value: string): boolean {
  const outcome = evidenceResultOutcomeText(value);
  const withoutZeroFailures = outcome.replace(/\b0\s+(?:failed|failures?|errors?)\b/gi, "");
  if (/\b(?:not|never|did\s+not)\s+(?:fail(?:ed)?|error)\b/i.test(outcome)) return false;
  return /\b(?:fail(?:ed|ure|ures)?|error|expected[ -]?error)\b|\bexit(?:ed)?\s+[1-9]\d*\b/i.test(
    withoutZeroFailures,
  );
}

const SHA256_VALUE = /^(?:sha256:)?[a-f0-9]{64}$/i;

/**
 * The two revision forms `qfai-implement/references/evidence-revision.md`
 * defines: a git rev (abbreviated or full) or `working-tree+<content hash>`.
 *
 * Only the review pack checked this, and a pack is intentionally local-only —
 * so on a fresh clone nothing did. `Revision: abc123` and
 * `Reviewed revision: not-a-revision` then agreed with each other, the
 * checkpoint seal recomputed over them, and a `done` row shipped evidence that
 * names no tree anyone can identify. Freshness cannot be judged against a value
 * that addresses nothing, so the form is checked where the value is committed.
 *
 * **Both object formats.** `git rev-parse HEAD` prints 40 hex digits in a
 * SHA-1 repository and 64 in one initialised with
 * `git init --object-format=sha256`; an abbreviation of either is shorter
 * still. Capping the form at SHA-1's length made every revision recorded by
 * contract in a SHA-256 repository — `Revision`, `RED revision`,
 * `Falsifiability revision` and both `reviewed revision` fields — fail the
 * shape check, so a correct project could not close a row at all. The upper
 * bound is the longer object id; a length in between is a valid abbreviation of
 * one format or the other, and the form check does not adjudicate which.
 */
const EVIDENCE_REVISION_FORM = /^(?:[0-9a-f]{7,64}|working-tree\+[0-9a-f]{64})$/i;

const REVISION_FORM_HINT = "a git rev or working-tree+<sha256>";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function bareSha256(value: string): string {
  return value.replace(/^sha256:/i, "").toLowerCase();
}

/**
 * Every value a `Field: value` line states in the **visible** Markdown of a
 * review artifact.
 *
 * A raw-text scan read the non-specification regions too. A response whose real
 * `Result` is `REVISE` could carry `Result: PASS`, `Reviewed revision` and
 * `Audited evidence hash` inside a fenced sample or an HTML comment — invisible
 * to the human reading the verdict, and enough for every field probe here — so
 * a blocking response passed as long as `summary.json` said PASS and the pack
 * seal was recomputed from the doctored contents. Masking is the same one the
 * evidence entries use, so "what the reader sees" means one thing in both.
 */
function visibleLineFieldValues(content: string, field: string): string[] {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedField}:[ \\t]*(.*)$`, "i");
  return maskEvidenceRegions(content.replace(/\r\n/g, "\n"))
    .split("\n")
    .flatMap((line) => {
      const match = pattern.exec(line);
      return match === null ? [] : [(match[1] ?? "").trim()];
    });
}

/**
 * True when the artifact states `field` exactly once, visibly, and states
 * `value`.
 *
 * Uniqueness is part of the claim: two visible `Result:` lines are not a
 * verdict, they are a document from which a reader can pick either answer.
 */
function exactLineField(content: string, field: string, value: string): boolean {
  const values = visibleLineFieldValues(content, field);
  return values.length === 1 && values[0] === value;
}

function normalizeAuditArtifact(value: string): string {
  const lines = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));
  while (lines[0]?.trim().length === 0) lines.shift();
  while (lines.at(-1)?.trim().length === 0) lines.pop();
  return `${lines.join("\n")}\n`;
}

const GATE_COMPLETED_EVIDENCE_FIELD =
  /^\s*(?:\|\s*)?(?:[-*][ \t]+)?(?:\*\*)?(?:Spec review(?:ed revision| pack(?: seal)?)?|Spec audited evidence hash|Code quality review(?:ed revision| pack(?: seal)?)?|Code quality audited evidence hash|Prototype parity|Checkpoint verification (?:command|result|seal))(?:\*\*)?\s*(?::|\|)/i;

const PHASE_AUTHORED_EVIDENCE_FIELD =
  /^\s*(?:\|\s*)?(?:[-*][ \t]+)?(?:\*\*)?(?:Round[ \t]+\d+:[ \t]*)?(?:TDD-ID|Layer|Test file|Selector|TC-ref|US-ref|CON-API-ref|Revision|RED revision|Replacement proof revision|RED test hash|RED test manifest|RED command|RED result|GREEN command|GREEN result|Satisfied-by|Falsifiability command|Falsifiability result|Falsifiability revision|reviewer verdict|RED failure mode|Refactor verify command|Refactor verify result|Oracle proof|qa-gatekeeper|Shared-artifact re-verify)(?:\*\*)?\s*(?::|\|)/i;

function hasPhaseAuthoredFieldAfterGate(section: string): boolean {
  const visibleLines = maskEvidenceRegions(section.replace(/\r\n/g, "\n")).split("\n");
  const boundary = visibleLines.findIndex((line) => GATE_COMPLETED_EVIDENCE_FIELD.test(line));
  if (boundary < 0) return false;
  return visibleLines
    .slice(boundary + 1)
    .some(
      (line) =>
        PHASE_AUTHORED_EVIDENCE_FIELD.test(line) ||
        /^\s*#{1,6}\s+Shared-artifact re-verify\b/i.test(line),
    );
}

/**
 * `Round N: reviewer verdict` — the one field a completion reviewer writes
 * *inside* the round block, after it has read that block.
 *
 * The gate fields end the phase-authored region, but this one sits before them,
 * so a prefix slice alone put the reviewers' own line inside what they hashed.
 * The subject contract excludes it for exactly that reason
 * (`constitution/shared-skill-delegation-baseline.md`, completion review), and a
 * second round cannot be opened without one (a `REVISE` on round N is what
 * opens N+1), so every legitimate review-fix -> Round 2 row disagreed with the
 * hash recomputed here and reported as unresolved.
 */
const REVIEWER_APPENDED_ROUND_FIELD =
  /^\s*(?:\|\s*)?(?:[-*][ \t]+)?(?:\*\*)?(?:Round[ \t]+\d+:[ \t]*)?reviewer verdict(?:\*\*)?[ \t]*(?::|\|)[ \t]*(.*)$/i;

/**
 * The index of the last line of the fenced value that starts at or after
 * `start`, or `start - 1` when no fence follows — so the caller resumes on the
 * next line and drops nothing it did not mean to.
 *
 * A field whose value is fenced (`evidenceFieldOccurrences`) owns those lines
 * too; dropping only its label would have left the verdict text itself in the
 * subject.
 */
function fencedEvidenceValueEnd(lines: readonly string[], start: number): number {
  let cursor = start;
  while (cursor < lines.length && (lines[cursor] ?? "").trim().length === 0) cursor += 1;
  const marker = /^\s*(`{3,}|~{3,})[^\r\n]*$/.exec(lines[cursor] ?? "")?.[1];
  if (marker === undefined) return start - 1;
  for (cursor += 1; cursor < lines.length; cursor += 1) {
    const closing = /^\s*(`{3,}|~{3,})\s*$/.exec(lines[cursor] ?? "")?.[1];
    if (
      closing !== undefined &&
      closing.charAt(0) === marker.charAt(0) &&
      closing.length >= marker.length
    ) {
      return cursor;
    }
  }
  return lines.length - 1;
}

function phaseAuthoredEvidence(section: string, tddId: string): string {
  const normalized = section.replace(/\r\n/g, "\n");
  const originalLines = normalized.split("\n");
  const visibleLines = maskEvidenceRegions(normalized).split("\n");
  const boundary = visibleLines.findIndex((line) => GATE_COMPLETED_EVIDENCE_FIELD.test(line));
  const end = boundary < 0 ? originalLines.length : boundary;
  const kept: string[] = [];
  for (let index = 0; index < end; index += 1) {
    const verdict = REVIEWER_APPENDED_ROUND_FIELD.exec(visibleLines[index] ?? "");
    if (verdict === null) {
      kept.push(originalLines[index] ?? "");
      continue;
    }
    if ((verdict[1] ?? "").trim().length === 0) {
      index = Math.min(fencedEvidenceValueEnd(originalLines, index + 1), end - 1);
    }
  }
  return normalizeAuditArtifact(`### ${tddId}\n${kept.join("\n")}`);
}

/** The stage artifact that carries a spec's Coverage Depth Matrix. */
function coverageDepthMatrixPath(specNumber: string): string {
  return `.qfai/evidence/coverage-depth-spec-${specNumber}.md`;
}

/**
 * The part of `.qfai/evidence/coverage-depth-spec-NNNN.md` that belongs to one
 * row's obligation — the matrix rows whose obligation cell equals it and the
 * justification paragraphs whose first line names it.
 *
 * `constitution/shared-skill-delegation-baseline.md` (audit subject, step 3)
 * puts this slice in the completion review's subject as a **second** artifact
 * record. Hashing only the evidence section left the reviewer's own judgement
 * about coverage depth outside every hash: a `❌` cell could be flipped to `✅`
 * and its justification rewritten after the PASS, and both recorded hashes
 * still recomputed.
 *
 * Not the file whole, and matched **exactly**: the matrix is one document per
 * spec that a later `/qfai-atdd` run recomputes, so hashing all of it would
 * stale every existing verdict when an unrelated obligation's cell moved.
 * `TC-0001` does not match `TC-00011`, a row may carry several obligations
 * (`TC-0001, TC-0002`), and a row whose obligation appears nowhere in the
 * matrix contributes nothing.
 */
function coverageDepthObligationSlice(content: string, obligationValue: string): string {
  const normalized = content.replace(/\r\n/g, "\n");
  const originalLines = normalized.split("\n");
  const visibleLines = maskEvidenceRegions(normalized).split("\n");
  const kept: string[] = [];
  // Tokenized and cased the way the ledger's own checks read the same cell —
  // `splitTcRefs` (comma, semicolon or whitespace) and a canonical upper case.
  // Splitting on commas alone turned the legal `TC-0001; TC-0002` into one
  // token that names nothing, and comparing case-sensitively did the same to
  // the legal `tc-0001`; either way the row's matrix lines and justification
  // fell out of the audited slice entirely, so the reviewer's coverage-depth
  // judgement could be rewritten after the PASS without staling any hash.
  for (const id of splitTcRefs(obligationValue).map((token) => token.toUpperCase())) {
    const names = new RegExp(
      `(?<![0-9A-Za-z-])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![0-9A-Za-z-])`,
      "i",
    );
    let index = 0;
    while (index < visibleLines.length) {
      const visible = visibleLines[index] ?? "";
      if (visible.trim().length === 0) {
        index += 1;
        continue;
      }
      if (/^\s*\|/.test(visible)) {
        const obligationCell = (splitMarkdownRow(visible)[0] ?? "")
          .replace(/^\*\*|\*\*$/g, "")
          .trim();
        if (obligationCell.toUpperCase() === id) kept.push(originalLines[index] ?? "");
        index += 1;
        continue;
      }
      let end = index;
      while (end < visibleLines.length) {
        const line = visibleLines[end] ?? "";
        if (line.trim().length === 0 || /^\s*\|/.test(line)) break;
        end += 1;
      }
      // The paragraph's **first** line decides. A justification that names no
      // obligation belongs to none of them; "everything after the table" was
      // the other reading, and two readers taking one each computed different
      // hashes from one file.
      if (names.test(visible)) kept.push(...originalLines.slice(index, end));
      index = end;
    }
  }
  return kept.join("\n");
}

/**
 * The Coverage Depth Matrix record for a row's obligation, or `null` when the
 * subject has none — an absent matrix file, or an obligation with no cell and
 * no justification in it.
 */
function coverageDepthAuditRecord(
  specNumber: string,
  obligationValue: string,
  matrix: string | null,
): string | null {
  if (matrix === null) return null;
  const slice = coverageDepthObligationSlice(matrix, obligationValue);
  if (slice.trim().length === 0) return null;
  return `${coverageDepthMatrixPath(specNumber)}\0${sha256(normalizeAuditArtifact(slice))}`;
}

function completedEvidenceAuditHash(
  evidenceFile: string,
  section: string,
  tddId: string,
  matrixRecord: string | null,
): string {
  const records = [`${evidenceFile}\0${sha256(phaseAuthoredEvidence(section, tddId))}`];
  if (matrixRecord !== null) records.push(matrixRecord);
  records.sort();
  return sha256(records.join("\n"));
}

/**
 * Per-run state for the completed-evidence checks: the two roots they resolve
 * against, and one cache per artifact they may read more than once — a spec's
 * Coverage Depth Matrix, and the ledger of whichever spec owns an entry that
 * claims to have re-verified a shared artifact.
 */
interface CompletedEvidenceContext {
  root: string;
  specsRoot: string;
  /** `specsRoot` as a review pack writes it: repo-relative, posix separators. */
  specsRelative: string;
  matrices: Map<string, string | null>;
  ledgers: Map<string, LedgerTable[]>;
}

/** `specsRoot` written the way a review pack's `target.path` states it. */
function repoRelativeSpecsDir(root: string, specsRoot: string): string {
  return path.relative(root, specsRoot).split(path.sep).join("/");
}

function completedEvidenceContext(root: string, specsRoot: string): CompletedEvidenceContext {
  return {
    root,
    specsRoot,
    specsRelative: repoRelativeSpecsDir(root, specsRoot),
    matrices: new Map(),
    ledgers: new Map(),
  };
}

async function coverageDepthMatrix(
  context: CompletedEvidenceContext,
  specNumber: string,
): Promise<string | null> {
  const cached = context.matrices.get(specNumber);
  if (cached !== undefined) return cached;
  const filePath = path.join(context.root, ...coverageDepthMatrixPath(specNumber).split("/"));
  const content = (await exists(filePath)) ? await readSafe(filePath) : null;
  context.matrices.set(specNumber, content);
  return content;
}

/** The ledger tables of `spec-NNNN`, or none when that spec has no ledger. */
async function specLedgerTables(
  context: CompletedEvidenceContext,
  specNumber: string,
): Promise<LedgerTable[]> {
  const cached = context.ledgers.get(specNumber);
  if (cached !== undefined) return cached;
  const filePath = path.join(context.specsRoot, `spec-${specNumber}`, TDD_LIST_REL_PATH);
  const tables = (await exists(filePath)) ? collectLedgerTables(await readSafe(filePath)) : [];
  context.ledgers.set(specNumber, tables);
  return tables;
}

async function expectedAuditHash(
  context: CompletedEvidenceContext,
  evidenceFile: string,
  section: string,
  expected: CompletedEvidenceExpectation,
): Promise<string> {
  const matrix = await coverageDepthMatrix(context, expected.specNumber);
  return completedEvidenceAuditHash(
    evidenceFile,
    section,
    expected.tddId,
    coverageDepthAuditRecord(expected.specNumber, expected.obligationValue, matrix),
  );
}

function checkpointEvidenceSeal(revision: string, command: string, result: string): string {
  return sha256(
    normalizeAuditArtifact(
      `Revision: ${revision}\nCheckpoint verification command: ${command}\nCheckpoint verification result: ${result}`,
    ),
  );
}

function safeRepoRelativePath(value: string): string | null {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  if (
    normalized.length === 0 ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").some((part) => part === "..")
  ) {
    return null;
  }
  return normalized;
}

/**
 * True when every directory component leading to `safePath` is a real
 * directory inside the project.
 *
 * `lstat` only declines to follow the **last** component. A manifest entry is
 * relative and rejects `..`, but a tracked intermediate symlink —
 * `tests/fixtures -> /shared/fixtures` — still sends `tests/fixtures/data.json`
 * outside the repository, so the RED hash addressed bytes a fresh clone does
 * not have and a manifest could be pointed at anything by moving one link.
 * Checking each parent keeps the final entry's own symlink payload hashable
 * (the recorded contract) while confining the walk to the tree.
 */
async function hasPlainParentComponents(root: string, safePath: string): Promise<boolean> {
  const parts = safePath.split("/");
  for (let depth = 1; depth < parts.length; depth += 1) {
    const parent = path.join(root, ...parts.slice(0, depth));
    try {
      if (!(await lstat(parent)).isDirectory()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

async function artifactRecord(root: string, relativePath: string): Promise<string | null> {
  const safePath = safeRepoRelativePath(relativePath);
  if (safePath === null) return null;
  if (!(await hasPlainParentComponents(root, safePath))) return null;
  const absolute = path.join(root, ...safePath.split("/"));
  let metadata;
  try {
    metadata = await lstat(absolute);
  } catch {
    return null;
  }
  // A directory hashed as an empty byte string is a hash that never moves: the
  // fixtures, snapshots and helpers under it could all be rewritten and the
  // recorded RED test hash still recomputed, so a `done` row kept evidence it
  // no longer had. The manifest contract names each input file, so a directory
  // — and any device, FIFO or socket, which `readFile` may block on — is not a
  // manifest entry at all.
  const kind = metadata.isSymbolicLink() ? "symlink" : metadata.isFile() ? "file" : null;
  if (kind === null) return null;
  let bytes: Buffer;
  try {
    bytes =
      kind === "symlink" ? Buffer.from(await readlink(absolute), "utf8") : await readFile(absolute);
  } catch {
    return null;
  }
  // Git's mode representation, not the raw permission bits. `mode & 0o777` made
  // the record depend on the umask of the machine that wrote the file: the same
  // tracked content reads `664` under one umask, `644` under another and `666`
  // on Windows, so evidence recorded on one checkout could not recompute on any
  // other and every handed-over row went unresolved for a difference Git does
  // not even store. The executable bit is the one permission that travels.
  const mode = kind === "symlink" ? "120000" : (metadata.mode & 0o111) === 0 ? "100644" : "100755";
  return `${safePath}\0${kind}\0${mode}\0${sha256(bytes)}`;
}

async function redTestManifestHash(root: string, manifest: string): Promise<string | null> {
  const paths = manifest
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s+/, ""))
    .filter((line) => line.length > 0);
  if (
    paths.length === 0 ||
    new Set(paths).size !== paths.length ||
    paths.some(
      (entry, index) =>
        index > 0 && Buffer.from(paths[index - 1] ?? "").compare(Buffer.from(entry)) > 0,
    )
  ) {
    return null;
  }
  const records: string[] = [];
  for (const entry of paths) {
    const record = await artifactRecord(root, entry);
    if (record === null) return null;
    records.push(record);
  }
  return sha256(records.join("\n"));
}

async function collectReviewPackFiles(
  root: string,
  packPath: string,
): Promise<Array<{ relativePath: string; content: string }> | null> {
  const safePack = safeRepoRelativePath(packPath);
  if (safePack === null || !safePack.startsWith(".qfai/review/review-")) return null;
  const absolutePack = path.join(root, ...safePack.split("/"));
  try {
    if (!(await lstat(absolutePack)).isDirectory()) return null;
  } catch {
    return null;
  }
  const files: Array<{ relativePath: string; content: string }> = [];
  async function walk(directory: string, relativeDirectory: string): Promise<boolean> {
    try {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        const relative = `${relativeDirectory}/${entry.name}`;
        if (entry.isSymbolicLink()) return false;
        if (entry.isDirectory()) {
          if (!(await walk(absolute, relative))) return false;
        } else if (entry.isFile()) {
          files.push({ relativePath: relative, content: await readFile(absolute, "utf8") });
        } else {
          return false;
        }
      }
    } catch {
      return false;
    }
    return true;
  }
  if (!(await walk(absolutePack, safePack)) || files.length === 0) return null;
  return files.sort((left, right) =>
    Buffer.from(left.relativePath).compare(Buffer.from(right.relativePath)),
  );
}

function reviewPackSeal(files: ReadonlyArray<{ relativePath: string; content: string }>): string {
  const records = files.map(
    ({ relativePath, content }) => `${relativePath}\0${sha256(normalizeAuditArtifact(content))}`,
  );
  return sha256(records.join("\n"));
}

interface ReviewPackFile {
  relativePath: string;
  content: string;
}

/** The named artifact of a review pack, or `null` when the pack omits it. */
function reviewPackArtifact(
  files: ReadonlyArray<ReviewPackFile>,
  packPath: string,
  name: string,
): string | null {
  return files.find(({ relativePath }) => relativePath === `${packPath}/${name}`)?.content ?? null;
}

/**
 * Every response `role` wrote into a review pack, in file order.
 *
 * The layout numbers responses per reviewer (`R01_`, `R02_`, ...), so the role
 * is what identifies the answer, not the position — and the numbering is
 * exactly what lets one role answer more than once. Taking the first match
 * alone read `R01_completion-reviewer.md` and never opened
 * `R02_completion-reviewer.md`, so a pack whose second response is `REVISE`
 * closed a row on its first: `summary.json` carries one PASS entry per
 * reviewer, and the seal recomputes over every file whatever they say. The
 * cardinality is the finding, so the caller is handed all of them.
 */
function reviewPackResponses(files: ReadonlyArray<ReviewPackFile>, role: string): string[] {
  const named = new RegExp(`^R\\d{2}_${role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.md$`);
  return files
    .filter(({ relativePath }) => named.test(path.posix.basename(relativePath)))
    .map(({ content }) => content);
}

/**
 * True when every response `role` wrote states `Result: PASS`, and there is at
 * least one. A second, blocking response from the same reviewer is a verdict
 * the pack has not resolved, not a verdict the first one overrides.
 */
function everyResponsePasses(responses: ReadonlyArray<string>): boolean {
  return (
    responses.length > 0 &&
    responses.every((response) => exactLineField(response, "Result", "PASS"))
  );
}

/** A parsed JSON object, or `null` for any other JSON value. */
function jsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value));
}

/**
 * True when a pack's `summary.json` records the whole round as PASS, for
 * `role`, over that spec, at `revision`.
 *
 * Both the item gate and the stage gate read this, and they read it the same
 * way on purpose: a pack answers "which reviewer passed what, and against which
 * tree", and a caller that checked only some of that accepted a pack written
 * about a different subject. `target` is what binds a pack to a spec at all —
 * the layout keeps the scope inside the artifacts, never in the directory name,
 * so without it any canonical `review-<timestamp>/` in the repository was
 * interchangeable with any other.
 *
 * `specsRelative` is where the ledgers were actually found — `paths.specsDir`,
 * repo-relative and posix-separated. Spelling `.qfai/specs` here instead
 * contradicted the very walk that produced the row: a project that configures
 * `specsDir: workspace/specs` writes packs targeting `workspace/specs/spec-NNNN`,
 * this test rejected each one, and every completed row on that project became
 * unresolvable with no local edit that could fix it.
 */
function summaryRecordsReviewerPass(
  content: string,
  role: string,
  specNumber: string,
  revision: string,
  specsRelative: string,
): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return false;
  }
  const record = jsonRecord(parsed);
  if (record === null) return false;
  const target = jsonRecord(record["target"]);
  const reviewers = record["reviewers"];
  return (
    target !== null &&
    record["overall_status"] === "PASS" &&
    record["revision"] === revision &&
    target["kind"] === "spec" &&
    target["path"] === `${specsRelative}/spec-${specNumber}` &&
    Array.isArray(reviewers) &&
    reviewers.some((reviewer: unknown) => {
      const entry = jsonRecord(reviewer);
      return entry !== null && entry["reviewer"] === role && entry["status"] === "PASS";
    })
  );
}

interface CompletedEvidenceExpectation {
  specNumber: string;
  tddId: string;
  layer: string;
  testFile: string;
  selector: string;
  obligationField: "TC-ref" | "US-ref" | "CON-API-ref";
  obligationValue: string;
  preSplit: boolean;
}

/**
 * The `<target>` subsections of every `Shared-artifact re-verify` block in
 * `content`.
 *
 * Heading levels are read **relatively**: the block heading may be the
 * document-level `## Shared-artifact re-verify` a zero-row stage writes, or the
 * one nested inside an editing row's entry (`#### …` under `### TDD-NNNN`), and
 * a consumer subsection is one level below whichever it is. Pinning them to
 * `##`/`###` made the nested form — the one the contract calls "record it on
 * the editing row" — unreadable, and the nested form is the only one an item's
 * audit hash can cover.
 */
function sharedArtifactReverifySections(content: string, target: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const originalLines = normalized.split("\n");
  const visibleLines = maskEvidenceRegions(normalized).split("\n");
  const sections: string[] = [];
  let blockLevel: number | null = null;

  for (let index = 0; index < visibleLines.length; index += 1) {
    const heading = /^\s*(#{1,6})\s+(.+?)\s*$/.exec(visibleLines[index] ?? "");
    if (heading === null) continue;
    const level = heading[1]?.length ?? 0;
    const title = (heading[2] ?? "").trim();
    if (title.toLowerCase() === "shared-artifact re-verify") {
      blockLevel = level;
      continue;
    }
    if (blockLevel === null) continue;
    if (level <= blockLevel) {
      blockLevel = null;
      continue;
    }
    if (level !== blockLevel + 1 || title.toLowerCase() !== target.toLowerCase()) continue;
    let end = index + 1;
    while (end < visibleLines.length) {
      const nextHeading = /^\s*(#{1,6})\s+/.exec(visibleLines[end] ?? "");
      if (nextHeading !== null && (nextHeading[1]?.length ?? 7) <= level) break;
      end += 1;
    }
    sections.push(originalLines.slice(index + 1, end).join("\n"));
  }
  return sections;
}

/** An item evidence file, and the spec it belongs to. */
const ITEM_EVIDENCE_FILE_NAME = /^(?:implement|atdd)-spec-\d{4}\.md$/i;

/** The stage evidence file a zero-row ATDD stage records into. */
const STAGE_EVIDENCE_FILE_NAME = /^coverage-depth-spec-\d{4}\.md$/i;

/**
 * The ledger row an evidence entry belongs to, when that entry is a completed
 * item of a real spec.
 *
 * `.qfai/evidence/<owner>-spec-NNNN.md` names the spec, so the ledger to look
 * in is `spec-NNNN`'s. The row must be the one the entry claims (`TDD-ID`), be
 * `done`, and point its own `Evidence` cell back at this entry — a self-styled
 * `### TDD-9999` section in an evidence file is otherwise an item nobody
 * scheduled and no gate ever reads.
 */
async function completedLedgerExpectation(
  context: CompletedEvidenceContext,
  evidenceFile: string,
  tddId: string,
): Promise<CompletedEvidenceExpectation | null> {
  const specNumber = /-spec-(\d{4})\.md$/i.exec(evidenceFile)?.[1];
  if (specNumber === undefined) return null;
  for (const ref of checkedLedgerRows(await specLedgerTables(context, specNumber))) {
    if (cell(ref, "TDD-ID") !== tddId) continue;
    if (cell(ref, "Status").toLowerCase() !== "done") return null;
    const evidence = cell(ref, "Evidence");
    const fragment = tddId.toLowerCase();
    const anchored = collectEvidenceAnchors(evidence).some(
      (anchor) => anchor.file === evidenceFile && anchor.fragment === fragment,
    );
    if (!anchored) return null;
    const layer = cell(ref, "Layer");
    const normalizedLayer = layer.toLowerCase();
    const obligationField =
      normalizedLayer === "e2e" ? "US-ref" : normalizedLayer === "api" ? "CON-API-ref" : "TC-ref";
    const obligationColumn =
      normalizedLayer === "e2e"
        ? "US-Refs"
        : normalizedLayer === "api"
          ? "CON-API-Refs"
          : "TC-Refs";
    return {
      specNumber,
      tddId,
      layer,
      testFile: cell(ref, "Test file"),
      selector: cell(ref, "Selector"),
      obligationField,
      obligationValue: cell(ref, obligationColumn),
      preSplit: usesPreSplitEvidence(layer, evidence),
    } satisfies CompletedEvidenceExpectation;
  }
  return null;
}

/**
 * True when `section` is an editing item whose own completion is evidence —
 * so a `Shared-artifact re-verify` record inside it carries a reviewer's word.
 *
 * The record is only evidence because the editing item's reviewers hashed it.
 * Recomputing the two audit hashes proves the record is inside what they read;
 * it does **not** prove they accepted it. An entry stopped at
 * `Spec review: REVISE` records the blocking reviewer's own hash over the same
 * subject, so the hashes agreed and an unfinished item's record cleared another
 * row's stale manifest. The entry has to clear the whole completed-evidence
 * contract it is being trusted for: a real `done` ledger row that points back
 * at it, both reviews PASS, and every revision, pack seal and checkpoint seal
 * this module recomputes.
 *
 * It is checked **without** the shared-artifact fallback: an item that needs
 * another item's re-verify record to explain its own stale manifest has not
 * finished the check it is being offered as evidence for, and letting the two
 * clear each other is a cycle, not a provenance chain.
 */
async function isAuditedCompletedEntry(
  context: CompletedEvidenceContext,
  evidenceFile: string,
  section: string,
  tddId: string,
): Promise<boolean> {
  const expected = await completedLedgerExpectation(context, evidenceFile, tddId);
  if (expected === null) return false;
  const expectedHash = await expectedAuditHash(context, evidenceFile, section, expected);
  const hashesRecompute = (["Spec", "Code quality"] as const).every((prefix) => {
    const recorded = rowEvidenceFieldValue(section, `${prefix} audited evidence hash`);
    return (
      recorded !== null && SHA256_VALUE.test(recorded) && bareSha256(recorded) === expectedHash
    );
  });
  if (!hashesRecompute) return false;
  if (missingCompletedEvidenceFields(section, expected).length > 0) return false;
  return (
    (await invalidCompletedEvidenceArtifacts(context, evidenceFile, section, expected, false))
      .length === 0
  );
}

/**
 * True when a stage evidence file's `## Final status` carries the pack seal
 * that makes the stage's record tamper-evident.
 *
 * A zero-row stage owns no item entry, so there is no audit hash to hang its
 * re-verify record on; `qfai-atdd/SKILL.md` puts a `Review pack` and
 * `Review pack seal` in `## Final status` for exactly that case and asks the
 * completion gate to recompute the seal over the recorded path.
 *
 * **An absent pack does not seal.** Elsewhere a missing pack is tolerated
 * because the committed entry still carries what the gate re-derives — the
 * audited hashes over committed evidence and the reviewers' PASS. A stage has
 * none of that: `## Final status` records only a path and a digest, so with the
 * directory gone nothing in the repository can contradict them. Accepting
 * `ENOENT` let a canonical-looking path, any 64 hex digits and a hand-written
 * re-verify block clear a `done` row's stale RED hash on a fresh clone, which
 * is every clone but the author's. `qfai-atdd/references/shared-test-artifacts.md`
 * reads a stage block "only when that file's `## Final status` names its
 * `Review pack` and a `Review pack seal` that **still recomputes** from it";
 * where it cannot be recomputed, the block is not readable evidence. The
 * editing-row home stays portable, and closing the stage gap for a fresh clone
 * needs committed stage provenance the contract does not define yet.
 *
 * **A seal that recomputes is not a verdict.** The seal says the named
 * directory has not been edited since it was recorded; it says nothing about
 * what that directory is *about*. So any unmodified canonical pack in the
 * repository — the `Spec review pack` of some finished row, or a directory
 * holding one `summary.json` that says `overall_status: PASS` and nothing else
 * — could be named here, and a stale RED manifest was cleared by a hand-written
 * re-verify block plus somebody else's digest. `qfai-atdd/SKILL.md` asks the
 * completion gate to "check that `## Final status` says what that pack says",
 * so the pack is read as well: its `summary.json` must bind it to this stage's
 * own spec and record the stage reviewer's PASS at a revision, and that
 * reviewer's response must state the same PASS, the same revision and an
 * `Audited evidence hash` — visibly, and each exactly once, the way every other
 * verdict in this module is read.
 *
 * The request is required to name **no** `TDD-ID`. A pack for one row names it
 * there (`qfai-implement/references/review-artifact-layout.md`, and the item
 * gate below requires the match), and a stage that owns no row has none to
 * name — so that is what separates this stage's own pack from a row pack of the
 * same spec, which target and role alone cannot.
 */
async function hasSealedStageStatus(
  context: CompletedEvidenceContext,
  specNumber: string,
  content: string,
): Promise<boolean> {
  const root = context.root;
  const section = markdownEvidenceIndex(content).sections.get("final-status");
  if (section === undefined) return false;
  // The section is the stage's own verdict, so a verdict it states has to be
  // the one the pack carries. Reading only `Review pack` and its seal out of it
  // let `Final status: REVISE` stand beside a PASS pack from an earlier round
  // and still close the stage — the pack half recomputed, and the half a human
  // wrote was never compared with it. A section that states no outcome is left
  // as it was: the shipped stage-evidence shape does not require the field, and
  // demanding one here would reject every conforming record.
  if (statesBlockingStageOutcome(section)) return false;
  const pack = rowEvidenceFieldValue(section, "Review pack");
  const seal = rowEvidenceFieldValue(section, "Review pack seal");
  if (
    pack === null ||
    seal === null ||
    !SHA256_VALUE.test(seal) ||
    !/^\.qfai\/review\/review-\d{17}$/.test(pack)
  ) {
    return false;
  }
  const safePack = safeRepoRelativePath(pack);
  if (safePack === null) return false;
  try {
    await lstat(path.join(root, ...safePack.split("/")));
  } catch {
    return false;
  }
  const files = await collectReviewPackFiles(root, pack);
  if (files === null || reviewPackSeal(files) !== bareSha256(seal)) return false;
  return stagePackRecordsPass(files, pack, specNumber, context.specsRelative);
}

/**
 * True when a stage's `## Final status` states an outcome that is not a PASS.
 *
 * Read from the fields the shipped templates use for a verdict, at whatever
 * casing they were written in. `PASS` is the only value that agrees with a
 * pack that passed; `REVISE`, `FAIL` and anything else are the stage saying so
 * itself, and are taken at their word.
 */
function statesBlockingStageOutcome(section: string): boolean {
  return ["Final status", "Status", "Outcome", "Result"].some((field) =>
    evidenceFieldOccurrences(section, field).some(
      ({ value }) => value.trim().length > 0 && !/^pass(?:ed)?\b/i.test(value.trim()),
    ),
  );
}

/** The reviewer whose PASS closes a stage rather than a row. */
const STAGE_REVIEWER_ROLE = "completion-reviewer";

/**
 * True when a stage's review pack carries the P8 provenance its
 * `## Final status` claims: a request that is not a row's, and a
 * `completion-reviewer` PASS over this spec at one revision, agreed on by the
 * response and `summary.json`.
 */
function stagePackRecordsPass(
  files: ReadonlyArray<ReviewPackFile>,
  packPath: string,
  specNumber: string,
  specsRelative: string,
): boolean {
  const request = reviewPackArtifact(files, packPath, "review_request.md");
  const summary = reviewPackArtifact(files, packPath, "summary.json");
  const responses = reviewPackResponses(files, STAGE_REVIEWER_ROLE);
  const response = responses[0];
  if (request === null || summary === null || response === undefined) return false;
  if (visibleLineFieldValues(request, "TDD-ID").length > 0) return false;
  // One reviewer, one verdict. A second `R\d\d_completion-reviewer.md` is
  // another answer to the same request, and the round is not resolved while two
  // of them stand — so both the count and every verdict are read, not the first
  // file the listing happened to return.
  if (responses.length !== 1 || !everyResponsePasses(responses)) return false;
  const revisions = visibleLineFieldValues(response, "Reviewed revision");
  const auditedHashes = visibleLineFieldValues(response, "Audited evidence hash");
  const revision = revisions[0];
  const auditedHash = auditedHashes[0];
  return (
    revisions.length === 1 &&
    auditedHashes.length === 1 &&
    revision !== undefined &&
    auditedHash !== undefined &&
    EVIDENCE_REVISION_FORM.test(revision) &&
    SHA256_VALUE.test(auditedHash) &&
    summaryRecordsReviewerPass(summary, STAGE_REVIEWER_ROLE, specNumber, revision, specsRelative)
  );
}

/** One `Shared-artifact re-verify` subsection, judged on its own fields. */
async function isCurrentReverifyRecord(
  root: string,
  evidenceFile: string,
  expected: CompletedEvidenceExpectation,
  section: string,
): Promise<boolean> {
  const revision = rowEvidenceFieldValue(section, "Revision");
  const reverifyCommand = rowEvidenceFieldValue(section, "Re-verify command");
  const reverifyResult = rowEvidenceFieldValue(section, "Re-verify result");
  const proofCommand = rowEvidenceFieldValue(section, "Proof command");
  const proofResult = rowEvidenceFieldValue(section, "Proof result");
  const restoredCommand = rowEvidenceFieldValue(section, "Restored GREEN command");
  const restoredResult = rowEvidenceFieldValue(section, "Restored GREEN result");
  const manifest = rowEvidenceFieldValue(section, "RED test manifest");
  const recordedHash = rowEvidenceFieldValue(section, "RED test hash");
  if (
    rowEvidenceFieldValue(section, "Evidence file") !== evidenceFile ||
    revision === null ||
    !EVIDENCE_REVISION_FORM.test(revision) ||
    rowEvidenceFieldValue(section, "Selector") !== expected.selector ||
    reverifyCommand === null ||
    !isExecutedEvidenceCommand(reverifyCommand) ||
    reverifyResult === null ||
    !isPassingEvidenceResult(reverifyResult) ||
    proofCommand === null ||
    !isExecutedEvidenceCommand(proofCommand) ||
    proofResult === null ||
    !isFailingEvidenceResult(proofResult) ||
    restoredCommand === null ||
    !isExecutedEvidenceCommand(restoredCommand) ||
    restoredResult === null ||
    !isPassingEvidenceResult(restoredResult) ||
    manifest === null ||
    recordedHash === null ||
    !SHA256_VALUE.test(recordedHash)
  ) {
    return false;
  }
  const manifestPaths = manifest
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s+/, ""))
    .filter((line) => line.length > 0);
  if (!manifestPaths.includes(expected.testFile)) return false;
  const computed = await redTestManifestHash(root, manifest);
  return computed !== null && bareSha256(recordedHash) === computed;
}

/**
 * True when some **audited** record re-verifies this row against the current
 * shared artifact.
 *
 * Where the record may live is half the rule. Any Markdown under
 * `.qfai/evidence/` used to qualify, and nothing tied the block to the change
 * that moved the artifact: appending an independent
 * `## Shared-artifact re-verify` block to an unrelated file cleared a `done`
 * row's stale RED hash with a record no reviewer had audited and no seal
 * covered. Two homes are accepted now, and each carries its own binding:
 *
 * - **the editing item's entry** in `implement-`/`atdd-spec-NNNN.md`, inside
 *   the phase-authored region its `Spec` and `Code quality audited evidence
 *   hash` address — so editing the record invalidates the verdicts that closed
 *   that item — and only when that entry is itself a completed, ledger-backed
 *   item (`isAuditedCompletedEntry`). An item cannot re-verify itself: the
 *   consumer is `done` and has no edge on which to observe anything.
 * - **a zero-row stage's `coverage-depth-spec-NNNN.md`**, which owns no item
 *   entry, where `## Final status` must carry the stage `Review pack`, a
 *   `Review pack seal` that still recomputes from it, and a pack whose request,
 *   response and `summary.json` record the stage reviewer's PASS over that
 *   stage's own spec (`hasSealedStageStatus`).
 */
async function hasCurrentSharedArtifactReverify(
  context: CompletedEvidenceContext,
  evidenceFile: string,
  expected: CompletedEvidenceExpectation,
): Promise<boolean> {
  const root = context.root;
  const evidenceDir = path.join(root, ".qfai", "evidence");
  let entries: Dirent[];
  try {
    entries = await readdir(evidenceDir, { withFileTypes: true });
  } catch {
    return false;
  }
  const target = `spec-${expected.specNumber}/${expected.tddId}`;
  for (const entry of entries) {
    const isItemFile = entry.isFile() && ITEM_EVIDENCE_FILE_NAME.test(entry.name);
    const isStageFile = entry.isFile() && STAGE_EVIDENCE_FILE_NAME.test(entry.name);
    if (!isItemFile && !isStageFile) continue;
    let content: string;
    try {
      content = await readFile(path.join(evidenceDir, entry.name), "utf8");
    } catch {
      continue;
    }
    if (isStageFile) {
      // The stage's own spec, not the consumer's: a stage of `spec-0002` may
      // edit a fixture a `done` row of `spec-0001` reads, and its pack is
      // scoped to the spec that opened it.
      const stageSpecNumber = /-spec-(\d{4})\.md$/i.exec(entry.name)?.[1];
      if (stageSpecNumber === undefined) continue;
      if (!(await hasSealedStageStatus(context, stageSpecNumber, content))) continue;
      for (const section of sharedArtifactReverifySections(content, target)) {
        if (await isCurrentReverifyRecord(root, evidenceFile, expected, section)) return true;
      }
      continue;
    }
    const ownerFile = `.qfai/evidence/${entry.name}`;
    for (const [anchor, ownerSection] of markdownEvidenceIndex(content).sections) {
      if (!/^tdd-\d{4}$/.test(anchor)) continue;
      const ownerTddId = anchor.toUpperCase();
      if (ownerFile === evidenceFile && ownerTddId === expected.tddId) continue;
      if (!(await isAuditedCompletedEntry(context, ownerFile, ownerSection, ownerTddId))) continue;
      const audited = phaseAuthoredEvidence(ownerSection, ownerTddId);
      for (const section of sharedArtifactReverifySections(audited, target)) {
        if (await isCurrentReverifyRecord(root, evidenceFile, expected, section)) return true;
      }
    }
  }
  return false;
}

/**
 * What an `Oracle proof` still owes, on a row whose branch requires one.
 *
 * Presence was the whole check, so `Oracle proof: PASS`, `skipped`, or a
 * sentence planning a mutation cleared the one field that separates a
 * discriminating test from a vacuous one. `qfai-implement/references/oracle-strength.md`
 * defines exactly two admissible shapes:
 *
 * - the mutation **run**: the command the row's selector was executed under and
 *   the failing output it produced — an intention is not the proof, and the
 *   reference rejects a load failure or another selector for the same reason;
 * - `equivalent-mutant`, **naming the contract clause** weaker than the
 *   obligation. The bare token is the claim without the reason, and that route
 *   exists precisely so the gap gets raised upstream.
 *
 * The command/output pair is checked with the same two predicates every other
 * recorded run uses, over the whole value — the field is normally a fenced
 * block holding the mutation, its command and its output together.
 *
 * **A generic shape is not the proof.** A known runner plus a failure word is
 * satisfied by a run of something else: `deleted export; npm test -- unrelated
 * → 1 failed` cleared the field while proving nothing about this row's test.
 * `oracle-strength.md`'s own rejection list is what the row is measured
 * against, so the three items on it that have a machine form are checked here
 * against the row's ledger identity and its GREEN run:
 *
 * - **another selector** — the proof must name the `Selector` the row owns;
 * - **another command** — it must contain the row's `GREEN command`; proving a
 *   different test discriminates says nothing about this one;
 * - **a load failure** — a syntax error, a deleted export or a thrown "not
 *   implemented" is the same non-observation `red-admissibility.md` refuses for
 *   RED: it shows the seam is absent, not that the assertions discriminate.
 *
 * Whitespace is collapsed on both sides of the two containment checks, so a
 * fenced command that wrapped still matches the single-line field it came from.
 */
function oracleProofDefects(
  value: string | null,
  selector: string,
  greenCommand: string | null,
): string[] {
  if (value === null) return ["Oracle proof"];
  const equivalentMutant = /^equivalent-mutant\b(.*)$/is.exec(value.trim());
  if (equivalentMutant !== null) {
    return (equivalentMutant[1] ?? "").replace(/^[\s:—–-]+/, "").trim().length === 0
      ? ["Oracle proof: equivalent-mutant naming the weaker contract clause"]
      : [];
  }
  const defects: string[] = [];
  if (!isExecutedEvidenceCommand(value)) {
    defects.push("Oracle proof: the command the mutation was run under");
  }
  if (!isFailingEvidenceResult(value)) {
    defects.push("Oracle proof: the failing output that mutation produced");
  }
  if (ORACLE_PROOF_LOAD_FAILURE.test(value)) {
    defects.push("Oracle proof: an assertion failure rather than a load failure");
  }
  if (!statesEvidenceFragment(value, selector)) {
    defects.push(`Oracle proof: the row's own Selector "${selector}"`);
  }
  if (greenCommand !== null && !statesEvidenceFragment(value, greenCommand)) {
    defects.push("Oracle proof: the row's GREEN command, not another test's");
  }
  return defects;
}

/**
 * The load failures `oracle-strength.md` and `red-admissibility.md` both
 * refuse: the mutation stopped the module from loading, so the run says the
 * seam is missing and nothing about whether the assertions discriminate.
 */
const ORACLE_PROOF_LOAD_FAILURE =
  /\b(?:syntax\s*error|syntaxerror|referenceerror|importerror|modulenotfounderror|err_module_not_found|module\s+not\s+found|unresolved\s+import|error\s+collecting)\b|\bnot[\s-]*implemented\b|\bcannot\s+find\s+(?:module|package|name)\b|\b(?:delet|remov|dropp|comment)ed\s+(?:out\s+)?(?:the\s+)?(?:export|import|module|symbol|declaration)\b|\bfailed\s+to\s+(?:load|import|resolve|parse|transform|compile)\b|\b(?:load|import|collection|module[\s-]resolution)\s+(?:error|failure|failed)\b/i;

/**
 * True when a recorded run states `fragment` — a selector or a command copied
 * from the ledger or from another evidence field.
 *
 * Compared with whitespace collapsed, because a fenced block wraps a command
 * that the field it is compared against holds on one line. An empty or
 * placeholder fragment claims nothing, so it is not held against the value.
 */
function statesEvidenceFragment(value: string, fragment: string): boolean {
  const needle = fragment.replace(/\s+/g, " ").trim();
  if (needle.length === 0 || EVIDENCE_PLACEHOLDER.test(fragment)) return true;
  return value.replace(/\s+/g, " ").includes(needle);
}

/**
 * The entry's **own** fields — its `Shared-artifact re-verify` blocks removed.
 *
 * Such a block is a record about *another* row: it repeats that row's
 * `Selector`, `Revision`, `RED test manifest` and `RED test hash`. Field reads
 * take the last occurrence in the entry, so an editing item that carried one
 * had the consumer's `Selector` read as its own and failed the identity check
 * against its own ledger row. The block still belongs to the audit subject and
 * to the review/checkpoint ordering check, which both read the whole section.
 */
function entryOwnFields(section: string): string {
  const normalized = section.replace(/\r\n/g, "\n");
  const originalLines = normalized.split("\n");
  const visibleLines = maskEvidenceRegions(normalized).split("\n");
  const kept: string[] = [];
  let blockLevel: number | null = null;
  for (const [index, visible] of visibleLines.entries()) {
    const heading = /^\s*(#{1,6})\s+(.+?)\s*$/.exec(visible);
    const level = heading?.[1]?.length ?? null;
    // A block ends at the next heading no deeper than its own, and — because
    // the contract puts it in the phase-authored region, where no such heading
    // need follow — at the first review or checkpoint field as well.
    if (
      blockLevel !== null &&
      ((level !== null && level <= blockLevel) || GATE_COMPLETED_EVIDENCE_FIELD.test(visible))
    ) {
      blockLevel = null;
    }
    if (
      level !== null &&
      (heading?.[2] ?? "").trim().toLowerCase() === "shared-artifact re-verify"
    ) {
      blockLevel = level;
    }
    if (blockLevel === null) kept.push(originalLines[index] ?? "");
  }
  return kept.join("\n");
}

/** Minimum phase and review evidence required once a row reaches `done`. */
function missingCompletedEvidenceFields(
  entrySection: string,
  expected: CompletedEvidenceExpectation,
): string[] {
  const section = entryOwnFields(entrySection);
  const normalizedLayer = expected.layer.toLowerCase();
  const requiredRowFields = [
    "TDD-ID",
    "Layer",
    "Test file",
    "Selector",
    expected.obligationField,
    "RED failure mode",
    "Refactor verify command",
    "Refactor verify result",
    "qa-gatekeeper",
    "Spec review",
    "Spec reviewed revision",
    "Spec audited evidence hash",
    "Spec review pack",
    "Spec review pack seal",
    "Code quality review",
    "Code quality reviewed revision",
    "Code quality audited evidence hash",
    "Code quality review pack",
    "Code quality review pack seal",
    "Checkpoint verification command",
    "Checkpoint verification result",
    "Checkpoint verification seal",
  ];
  const missing = requiredRowFields.filter(
    (field) => rowEvidenceFieldValue(section, field) === null,
  );
  for (const [field, value, caseInsensitive = false] of [
    ["TDD-ID", expected.tddId, true],
    ["Layer", expected.layer, true],
    ["Test file", expected.testFile],
    ["Selector", expected.selector],
    [expected.obligationField, expected.obligationValue, true],
  ] as const) {
    const actual = rowEvidenceFieldValue(section, field);
    if (actual === null) continue;
    const normalize = (candidate: string): string =>
      caseInsensitive ? candidate.toLowerCase() : candidate;
    if (normalize(actual) !== normalize(value)) {
      missing.push(`${field} matching ledger value "${value}"`);
    }
  }
  if (EVIDENCE_PLACEHOLDER.test(expected.obligationValue)) {
    missing.push(`${expected.obligationField} naming a real ledger obligation`);
  }
  // `Prototype parity` is written only on a UI-affecting row (gate item 9), so
  // its absence is not a defect — but a row that states it and states `REVISE`
  // is one the product-surface-reviewer blocked. Reading only the other three
  // verdicts let such a row reach `done` on a matching hash and a full field
  // set, with the one verdict that refused it sitting in plain sight.
  for (const field of [
    "qa-gatekeeper",
    "Spec review",
    "Code quality review",
    "Prototype parity",
  ] as const) {
    const verdict = rowEvidenceFieldValue(section, field);
    if (verdict !== null && verdict.toUpperCase() !== "PASS") {
      missing.push(`${field}: PASS`);
    }
  }
  const rounds = evidenceRoundNumbers(section);
  if (rounds.length === 0 || rounds[0] !== 1) missing.push("Round 1 evidence block");
  if (rounds.some((round, index) => round !== index + 1)) {
    missing.push("continuous evidence rounds starting at Round 1");
  }
  // One round number, one set of values. `evidenceRoundNumbers` dedupes through
  // a `Set` and every field reader takes the last occurrence for its round
  // independently, so appending a second partial `Round 1` instead of opening
  // `Round 2` composed one synthetic round out of two blocks — the restated
  // fields from the new one, the omitted fields from the old — and cleared both
  // the continuity check and the previous round's `REVISE` requirement without
  // a round ever being opened.
  for (const round of rounds) {
    for (const field of ROUND_SCOPED_EVIDENCE_FIELDS) {
      const occurrences = evidenceFieldOccurrences(section, field).filter(
        (occurrence) => occurrence.round === round,
      );
      if (occurrences.length > 1) {
        missing.push(`Round ${round}: exactly one ${field}`);
      }
    }
  }
  if (hasPhaseAuthoredFieldAfterGate(entrySection)) {
    missing.push("all phase-authored fields before review and checkpoint fields");
  }

  const failureMode = rowEvidenceFieldValue(section, "RED failure mode")?.toLowerCase();
  let latestRevision: string | null = null;
  let latestGreenCommand: string | null = null;
  let oracleProofOwed = false;
  for (const round of rounds) {
    const revision = roundEvidenceFieldValue(section, round, "Revision");
    const greenCommand = roundEvidenceFieldValue(section, round, "GREEN command");
    const greenResult = roundEvidenceFieldValue(section, round, "GREEN result");
    if (revision === null) missing.push(`Round ${round}: Revision`);
    if (revision !== null && !EVIDENCE_REVISION_FORM.test(revision)) {
      missing.push(`Round ${round}: Revision naming ${REVISION_FORM_HINT}`);
    }
    if (greenCommand === null) missing.push(`Round ${round}: GREEN command`);
    if (greenResult === null) missing.push(`Round ${round}: GREEN result`);
    if (greenCommand !== null && !isExecutedEvidenceCommand(greenCommand)) {
      missing.push(`Round ${round}: executable GREEN command`);
    }
    if (greenResult !== null && !isPassingEvidenceResult(greenResult)) {
      missing.push(`Round ${round}: passing GREEN result`);
    }

    const observedRedFields = ["RED command", "RED result", "RED revision"] as const;
    const falsifiabilityFields = [
      "Satisfied-by",
      "Falsifiability command",
      "Falsifiability result",
      "Falsifiability revision",
    ] as const;
    const observedValues = observedRedFields.map((field) =>
      roundEvidenceFieldValue(section, round, field),
    );
    const falsifiabilityValues = falsifiabilityFields.map((field) =>
      roundEvidenceFieldValue(section, round, field),
    );
    const observedPresent = observedValues.filter((value) => value !== null).length;
    const falsifiabilityPresent = falsifiabilityValues.filter((value) => value !== null).length;
    const validObservedRed =
      observedPresent === observedRedFields.length && falsifiabilityPresent === 0;
    const validFalsifiability =
      falsifiabilityPresent === falsifiabilityFields.length && observedPresent === 0;
    if (validObservedRed === validFalsifiability) {
      missing.push(
        `Round ${round}: exactly one complete RED command/result/revision or falsifiability proof`,
      );
    }
    const redCommand = observedValues[0];
    const redResult = observedValues[1];
    if (
      validObservedRed &&
      typeof redCommand === "string" &&
      !isExecutedEvidenceCommand(redCommand)
    ) {
      missing.push(`Round ${round}: executable RED command`);
    }
    if (validObservedRed && typeof redResult === "string" && !isFailingEvidenceResult(redResult)) {
      missing.push(`Round ${round}: failing RED result`);
    }
    const redRevision = observedValues[2];
    if (
      validObservedRed &&
      typeof redRevision === "string" &&
      !EVIDENCE_REVISION_FORM.test(redRevision)
    ) {
      missing.push(`Round ${round}: RED revision naming ${REVISION_FORM_HINT}`);
    }
    const falsifiabilityCommand = falsifiabilityValues[1];
    const falsifiabilityResult = falsifiabilityValues[2];
    if (
      validFalsifiability &&
      typeof falsifiabilityCommand === "string" &&
      !isExecutedEvidenceCommand(falsifiabilityCommand)
    ) {
      missing.push(`Round ${round}: executable falsifiability command`);
    }
    if (
      validFalsifiability &&
      typeof falsifiabilityResult === "string" &&
      !isFailingEvidenceResult(falsifiabilityResult)
    ) {
      missing.push(`Round ${round}: failing falsifiability result`);
    }
    const falsifiabilityRevision = falsifiabilityValues[3];
    if (
      validFalsifiability &&
      typeof falsifiabilityRevision === "string" &&
      !EVIDENCE_REVISION_FORM.test(falsifiabilityRevision)
    ) {
      missing.push(`Round ${round}: Falsifiability revision naming ${REVISION_FORM_HINT}`);
    }
    if (validObservedRed && failureMode !== "assertion" && failureMode !== "expected-error") {
      missing.push("RED failure mode: assertion or expected-error for observed RED");
    }
    if (validFalsifiability && failureMode !== "falsifiability") {
      missing.push("RED failure mode: falsifiability for falsifiability proof");
    }
    if (ATDD_OWNED_LAYERS.has(normalizedLayer) && !expected.preSplit) {
      const redHash = roundEvidenceFieldValue(section, round, "RED test hash");
      const redManifest = roundEvidenceFieldValue(section, round, "RED test manifest");
      if (redHash === null) missing.push(`Round ${round}: RED test hash`);
      if (redManifest === null) missing.push(`Round ${round}: RED test manifest`);
      if (redHash !== null && !SHA256_VALUE.test(redHash)) {
        missing.push(`Round ${round}: valid RED test hash`);
      }
    }
    if (!validFalsifiability) oracleProofOwed = true;
    if (round < (rounds.at(-1) ?? round)) {
      const verdict = roundEvidenceFieldValue(section, round, "reviewer verdict");
      if (verdict === null || !/^REVISE\b/i.test(verdict)) {
        missing.push(`Round ${round}: reviewer verdict opening the next round`);
      }
    }
    latestRevision = revision;
    latestGreenCommand = greenCommand;
  }
  if (oracleProofOwed) {
    // The proof is taken at the last GREEN, so the run it has to agree with is
    // the latest round's — an earlier round's command was superseded.
    missing.push(
      ...oracleProofDefects(
        rowEvidenceFieldValue(section, "Oracle proof"),
        expected.selector,
        latestGreenCommand,
      ),
    );
  }

  const refactorCommand = rowEvidenceFieldValue(section, "Refactor verify command");
  const refactorResult = rowEvidenceFieldValue(section, "Refactor verify result");
  if (refactorCommand !== null && !isExecutedEvidenceCommand(refactorCommand)) {
    missing.push("executable Refactor verify command");
  }
  if (refactorResult !== null && !isPassingEvidenceResult(refactorResult)) {
    missing.push("passing Refactor verify result");
  }
  const checkpointCommand = rowEvidenceFieldValue(section, "Checkpoint verification command");
  const checkpointResult = rowEvidenceFieldValue(section, "Checkpoint verification result");
  if (checkpointCommand !== null && !isExecutedEvidenceCommand(checkpointCommand)) {
    missing.push("executable Checkpoint verification command");
  }
  if (checkpointResult !== null && !isPassingEvidenceResult(checkpointResult)) {
    missing.push("Checkpoint verification result: PASS");
  }

  for (const prefix of ["Spec", "Code quality"] as const) {
    const reviewedRevision = rowEvidenceFieldValue(section, `${prefix} reviewed revision`);
    const auditedHash = rowEvidenceFieldValue(section, `${prefix} audited evidence hash`);
    const pack = rowEvidenceFieldValue(section, `${prefix} review pack`);
    const packSeal = rowEvidenceFieldValue(section, `${prefix} review pack seal`);
    if (
      reviewedRevision !== null &&
      latestRevision !== null &&
      reviewedRevision !== latestRevision
    ) {
      missing.push(`${prefix} reviewed revision matching latest Revision`);
    }
    if (reviewedRevision !== null && !EVIDENCE_REVISION_FORM.test(reviewedRevision)) {
      missing.push(`${prefix} reviewed revision naming ${REVISION_FORM_HINT}`);
    }
    if (auditedHash !== null && !SHA256_VALUE.test(auditedHash)) {
      missing.push(`${prefix} audited evidence hash: sha256`);
    }
    if (pack !== null && !/^\.qfai\/review\/review-\d{17}$/.test(pack)) {
      missing.push(
        `${prefix} review pack: canonical .qfai/review/review-<17-digit timestamp> path`,
      );
    }
    if (packSeal !== null && !SHA256_VALUE.test(packSeal)) {
      missing.push(`${prefix} review pack seal: sha256`);
    }
  }
  const checkpointSeal = rowEvidenceFieldValue(section, "Checkpoint verification seal");
  if (checkpointSeal !== null && !SHA256_VALUE.test(checkpointSeal)) {
    missing.push("Checkpoint verification seal: sha256");
  }
  return missing;
}

/**
 * `allowSharedArtifactReverify` is false while an entry is being judged as
 * *another* row's re-verify source: an entry that needs someone else's record
 * to explain its own stale manifest has not finished the check it would be
 * vouching for, and two such entries clearing each other is a cycle.
 */
async function invalidCompletedEvidenceArtifacts(
  context: CompletedEvidenceContext,
  evidenceFile: string,
  entrySection: string,
  expected: CompletedEvidenceExpectation,
  allowSharedArtifactReverify = true,
): Promise<string[]> {
  const root = context.root;
  const section = entryOwnFields(entrySection);
  const invalid: string[] = [];
  const rounds = evidenceRoundNumbers(section);
  if (ATDD_OWNED_LAYERS.has(expected.layer.toLowerCase()) && !expected.preSplit) {
    const latestRound = rounds.at(-1);
    if (latestRound !== undefined) {
      const round = latestRound;
      const manifest = roundEvidenceFieldValue(section, round, "RED test manifest");
      const recorded = roundEvidenceFieldValue(section, round, "RED test hash");
      if (manifest !== null && recorded !== null && SHA256_VALUE.test(recorded)) {
        const manifestPaths = manifest
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map((line) => line.trim().replace(/^[-*]\s+/, ""))
          .filter((line) => line.length > 0);
        const computed = await redTestManifestHash(root, manifest);
        if (!manifestPaths.includes(expected.testFile) || computed === null) {
          invalid.push(`Round ${round}: valid RED test manifest including ${expected.testFile}`);
        } else if (
          bareSha256(recorded) !== computed &&
          !(
            allowSharedArtifactReverify &&
            (await hasCurrentSharedArtifactReverify(context, evidenceFile, expected))
          )
        ) {
          invalid.push(`Round ${round}: RED test hash matching its manifest`);
        }
      }
    }
  }

  const auditHash = await expectedAuditHash(context, evidenceFile, entrySection, expected);
  const latestRound = rounds.at(-1);
  const revision =
    latestRound === undefined ? null : roundEvidenceFieldValue(section, latestRound, "Revision");
  for (const prefix of ["Spec", "Code quality"] as const) {
    const expectedRole = prefix === "Spec" ? "completion-reviewer" : "implementation-reviewer";
    const auditedHash = rowEvidenceFieldValue(section, `${prefix} audited evidence hash`);
    const packPath = rowEvidenceFieldValue(section, `${prefix} review pack`);
    const packSeal = rowEvidenceFieldValue(section, `${prefix} review pack seal`);
    if (auditedHash !== null && SHA256_VALUE.test(auditedHash)) {
      if (bareSha256(auditedHash) !== auditHash) {
        invalid.push(
          `${prefix} audited evidence hash matching phase-authored evidence and Coverage Depth Matrix`,
        );
      }
    }
    if (packPath === null || packSeal === null || !SHA256_VALUE.test(packSeal)) continue;
    const safePackPath = safeRepoRelativePath(packPath);
    if (safePackPath === null) continue;
    try {
      await lstat(path.join(root, ...safePackPath.split("/")));
    } catch (error) {
      // Review packs are intentionally local-only. A fresh clone retains the
      // committed verdict, revision, audit hash, path and seal, but not the pack
      // directory itself. Recompute the pack-specific checks whenever it is
      // present; its absence alone is not a portable completion failure.
      // Narrowed rather than asserted: `catch` binds `unknown`, so a non-Error
      // throw (a string, a rejected non-error) would read `.code` off it and
      // fall through to the failure branch by accident.
      if (isEnoent(error)) continue;
      invalid.push(`${prefix} review pack path readable when present`);
      continue;
    }
    const packFiles = await collectReviewPackFiles(root, packPath);
    if (packFiles === null) {
      invalid.push(`${prefix} review pack resolving to regular files`);
      continue;
    }
    if (reviewPackSeal(packFiles) !== bareSha256(packSeal)) {
      invalid.push(`${prefix} review pack seal matching pack contents`);
    }
    const recordedRevision = rowEvidenceFieldValue(section, `${prefix} reviewed revision`);
    const request = reviewPackArtifact(packFiles, packPath, "review_request.md");
    const summary = reviewPackArtifact(packFiles, packPath, "summary.json");
    // Every response this reviewer wrote, not the first: a second
    // `R\d\d_<role>.md` answering `REVISE` is an open verdict on the same
    // request, and `summary.json` records one line per reviewer whatever the
    // responses say.
    const responses = reviewPackResponses(packFiles, expectedRole);
    const response = responses[0];
    if (
      request === null ||
      !exactLineField(request, "TDD-ID", expected.tddId) ||
      response === undefined ||
      responses.length !== 1 ||
      !everyResponsePasses(responses) ||
      summary === null ||
      recordedRevision === null ||
      !summaryRecordsReviewerPass(
        summary,
        expectedRole,
        expected.specNumber,
        recordedRevision,
        context.specsRelative,
      ) ||
      !exactLineField(response, "Reviewed revision", recordedRevision) ||
      auditedHash === null ||
      !exactLineField(response, "Audited evidence hash", auditedHash)
    ) {
      invalid.push(
        `${prefix} review pack carrying request, summary, and named reviewer PASS provenance`,
      );
    }
  }

  const checkpointCommand = rowEvidenceFieldValue(section, "Checkpoint verification command");
  const checkpointResult = rowEvidenceFieldValue(section, "Checkpoint verification result");
  const checkpointSeal = rowEvidenceFieldValue(section, "Checkpoint verification seal");
  if (
    revision !== null &&
    checkpointCommand !== null &&
    checkpointResult !== null &&
    checkpointSeal !== null &&
    SHA256_VALUE.test(checkpointSeal) &&
    bareSha256(checkpointSeal) !==
      checkpointEvidenceSeal(revision, checkpointCommand, checkpointResult)
  ) {
    invalid.push("Checkpoint verification seal matching command, result, and Revision");
  }
  return invalid;
}

/**
 * Layers whose RED/GREEN pairs are produced by `/qfai-atdd`, not by the
 * implement loop — `Integration` among them because `QFAI-ATDD-112` covers
 * every `L3` TC and every TC with no declared `Level`.
 *
 * The evidence file follows the stage that ran the commands, so these rows
 * anchor into `atdd-<spec-id>.md` and every other row into
 * `implement-<spec-id>.md` (`references/execution-ledger.md`, "ATDD-owned
 * rows"). `qfai-implement`'s completion gate reads the same split, so an
 * `E2E` row pointed at the implement file does not satisfy it.
 */
const ATDD_OWNED_LAYERS = new Set(["integration", "api", "e2e"]);
const PRE_SPLIT_IMPLEMENT_LAYERS = new Set(["api", "e2e"]);

function usesPreSplitEvidence(layer: string, evidence: string): boolean {
  return (
    PRE_SPLIT_IMPLEMENT_LAYERS.has(layer.toLowerCase()) &&
    /\bPre-split-evidence:\s*implement\b/i.test(evidence)
  );
}

function expectedEvidenceFile(specNumber: string, layer: string, evidence: string): string {
  const normalizedLayer = layer.toLowerCase();
  const atddOwned = ATDD_OWNED_LAYERS.has(normalizedLayer);
  const preSplit = usesPreSplitEvidence(layer, evidence);
  const owner = atddOwned && !preSplit ? "atdd" : "implement";
  return `.qfai/evidence/${owner}-spec-${specNumber}.md`;
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
 * The evidence file this row's `Evidence` cell has to point at.
 *
 * A single hard-coded `implement-…` path sent every `E2E` / `API` /
 * `Integration` row at the wrong file, which is the one the completion gate
 * does not accept for them.
 */
function evidenceFileFor(layer: string, specNumber: string): string {
  const stage = ATDD_OWNED_LAYERS.has(layer.trim().toLowerCase()) ? "atdd" : "implement";
  return `.qfai/evidence/${stage}-spec-${specNumber}.md`;
}

/**
 * The anchor an evidence entry carries for this row: the row's own `TDD-ID`,
 * lower-cased.
 *
 * A fixed example anchor named an entry that does not exist for any row but
 * the one it was written from, so following it produced a pointer that
 * resolves to nothing.
 */
function evidenceAnchorFor(tddId: string): string {
  return TDD_ID_FORMAT.test(tddId)
    ? `#${tddId.toLowerCase()}`
    : "#<この行の TDD-ID を小文字にした anchor>";
}

/**
 * The legal way a row at `status` can re-run a cycle it never actually ran.
 *
 * The advice used to be "move it back to `todo` / `red`" for every status this
 * check fires on, and `references/execution-ledger.md` forbids that on three
 * of the four: `green -> red` is the transition table's named example of a
 * prohibited backward edge, `refactor -> red` is admissible only as QA
 * rejection recovery behind a routed `qa-gatekeeper` REVISE, and
 * **any status** -> `todo` is the upstream reset, which needs an approved
 * `CR-*` recorded in `DR-ID`. An operator whose run genuinely does not exist
 * was being told to commit a second lifecycle violation to clear the first.
 */
function unrunRowRecovery(status: string): string {
  switch (status) {
    case "green":
      return "`green -> red` は禁止された後退遷移です。サイクルを実際に走らせていないなら、その行を anomaly として `exception` に移し（`DR-ID` に `DR-*` を記録）、解消後に `exception -> todo` で最初からやり直してください。承認済み上流変更がある場合に限り `any status -> todo`（upstream reset、`DR-ID` に承認済み `CR-*`）も使えます。";
    case "refactor":
      return "`refactor -> red` は routed `qa-gatekeeper` が REVISE を返した QA rejection recovery のときだけ合法です（その verdict を `Evidence` に記録）。それ以外は `exception`（`DR-*` を記録）に移し、解消後に `exception -> todo` で再入してください。承認済み上流変更がある場合に限り `any status -> todo`（upstream reset、`DR-ID` に承認済み `CR-*`）も使えます。";
    case "review-fix":
      return "`review-fix` の行は Status を変えないまま RED/GREEN サイクルを再実行できます（reviewer rework は後退遷移ではありません）。実行結果を evidence ファイルに記録してから `review-fix -> refactor` に戻してください。";
    case "done":
      return "`done` は終端で、`red` へも無承認の `todo` へも戻せません。再開できるのは承認済み `CR-*` を `DR-ID` に記録した upstream reset（`any status -> todo`）だけです。その承認がないなら、上記のとおりセルを in-place で backfill してください。";
    default:
      return "`todo` / `red` への巻き戻しは合法な遷移とは限りません。`references/execution-ledger.md` の Allowed transitions を確認してください。";
  }
}

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

/**
 * The standalone-record home, relative to the project root.
 *
 * The Drift Protocol carve-out lets an implement-stage anomaly create
 * `.qfai/decisions/DR-<id>-<slug>.md` while still forbidding the upstream
 * `07_Decisions.md` / `09_delta.md` write that would cite it. Resolving only
 * against the upstream files therefore reported every protocol-compliant record
 * as declared nowhere, leaving the operator to either make the forbidden write
 * or waive the rule.
 */
const DR_RECORD_DIR = path.join(".qfai", "decisions");

/**
 * Every location a `DR-*` may be declared in, for the DR findings' messages.
 *
 * One list, read by all three: `TDDLIST_EXCEPTION_MISSING_DR` and
 * `TDDLIST_EXCEPTION_INVALID_DR` named only the two upstream files, which the
 * implement stage carrying `[DRIFT-PROTOCOL:MANDATORY]` may not write — so an
 * operator following the finding's own instructions was sent into the SSOT
 * violation the standalone-record home exists to avoid. A finding that names a
 * home must name the same homes the resolver actually searches, and sharing the
 * list is what keeps that true after the next one is added.
 */
const DR_SEARCHED_LOCATIONS = [
  ...DR_DECLARATION_FILES.map((name) => `${name} (spec-scoped)`),
  `${toPosixRel(DR_POLICY_DECLARATION_FILE)} (policy-level)`,
  `${toPosixRel(DR_RECORD_DIR)}/DR-*.md (standalone record)`,
].join(", ");

/** The same homes for the Japanese fix hints, record directory first. */
const DR_DECLARATION_HOMES_JA = [
  `\`${toPosixRel(DR_RECORD_DIR)}/DR-<id>-<slug>.md\`（implement 段で書き込めるのはここだけです）`,
  ...DR_DECLARATION_FILES.map((name) => `spec の \`${name}\``),
  `\`${toPosixRel(DR_POLICY_DECLARATION_FILE)}\``,
].join("、");

/** Waiver rule id for `TDDLIST_EXCEPTION_UNRESOLVED_DR`. */
export const UNRESOLVED_DR_RULE_ID = "TDDLIST-003";

function toPosixRel(value: string): string {
  return value.replace(/\\/g, "/");
}

/**
 * A record filename's slug: `-`, `_` or `.`-joined words, each non-empty.
 *
 * Checking it is what tells a Decision Record apart from a file that merely
 * starts like one. `DR-<id>-<slug>.md` with the placeholder never substituted,
 * or trimmed to `DR-<id>-.md` with the separator and nothing behind it, is a
 * name shaped by a template rather than by a decision — and indexing it
 * silenced the very warning that would have said the record is still missing.
 * Only the id prefix used to be checked, so every such file declared its id.
 *
 * Words are Unicode letters and digits rather than `[a-z0-9]`: a slug written
 * in the project's own language is a record, not a placeholder. `<`, `>` and a
 * doubled separator are what the placeholder and the truncation leave behind,
 * and neither can occur inside a word.
 */
const DR_RECORD_SLUG = /^[\p{L}\p{N}]+(?:[-_.][\p{L}\p{N}]+)*$/u;

/**
 * The two ways the documented `DR-<id>-<slug>.md` name reads, whole-basename
 * anchored, each capturing the id and the slug behind it.
 *
 * The grammar is ambiguous whenever the slug itself opens with four digits (a
 * year, say): the name then reads either as a policy-level `DR-<id>` carrying
 * that whole slug, or as a spec-scoped `DR-<spec>-<seq>` carrying the rest of
 * it. Parsing one id out of the filename has to pick a reading, and picking the
 * longest left the policy-level id the ledger actually cites unresolved. Both
 * are indexed instead — the safe direction for a warning whose subject is only
 * whether the record exists.
 *
 * The slug group is optional so that a record named by its id alone still
 * declares it: that name is unambiguous and nothing about it is a placeholder,
 * so rejecting it would trade one false negative for a false positive.
 */
const DR_RECORD_FILE_READINGS = [
  /^(DR-\d{4}-\d{4})(?:-(.+))?\.md$/iu,
  /^(DR-\d{4})(?:-(.+))?\.md$/iu,
] as const;

/**
 * Every `DR-*` one standalone record filename declares, upper-cased.
 *
 * The filename is what is read, never the body: a record that cites a
 * neighbouring decision in its prose must not thereby declare it.
 */
function recordFileDeclaredIds(fileName: string): string[] {
  const ids: string[] = [];
  for (const reading of DR_RECORD_FILE_READINGS) {
    const match = reading.exec(fileName);
    // Group 1 is not optional, so the `undefined` arm only satisfies
    // `noUncheckedIndexedAccess`; group 2 is genuinely absent for a slugless
    // name, which is accepted, unlike a slug that is present but malformed.
    const id = match?.[1];
    if (id === undefined) continue;
    const slug = match?.[2];
    if (slug !== undefined && !DR_RECORD_SLUG.test(slug)) continue;
    ids.push(id.toUpperCase());
  }
  return ids;
}

/**
 * The project root with its own symlinks resolved, or the path itself when
 * that cannot be taken.
 *
 * Containment is decided between two resolved paths or not at all: a project
 * checked out under a symlinked parent — a temp dir on macOS is the everyday
 * case — resolves every record to a path that shares no prefix with the
 * unresolved root, and each one would read as an escape. Falling back to the
 * unresolved root on failure keeps the direction safe: links are rejected
 * rather than trusted.
 */
async function resolvedRoot(root: string): Promise<string> {
  try {
    return await realpath(root);
  } catch {
    return root;
  }
}

/**
 * Whether a directory entry is a Decision Record file this project carries.
 *
 * A regular file is one. A symlink is one only while what it resolves to stays
 * inside the project root: a link to `/tmp/record.md` or into a sibling
 * checkout resolves for whoever created it and for nobody else, so it silenced
 * the unresolved-DR warning locally while a clean checkout — CI's, a
 * colleague's — has a dangling link and a governance record that was never
 * committed. Anything else (a directory, a socket, a dangling link) is not.
 */
async function isRecordFile(dir: string, entry: Dirent, projectRoot: string): Promise<boolean> {
  if (entry.isFile()) return true;
  if (!entry.isSymbolicLink()) return false;
  try {
    const target = await realpath(path.join(dir, entry.name));
    if (!isInside(projectRoot, target)) return false;
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

/**
 * The `DR-*` declared by the standalone records under `.qfai/decisions/`.
 *
 * Collected once per validation and shared by every spec's resolver: the
 * directory is shared too, so reading it per spec re-`stat`ed the same symlinks
 * and re-scanned the same names once for each spec. Indexing the ids also turns
 * an exception row's lookup into a hash probe rather than a scan over every
 * record file.
 *
 * An absent directory is the common case (no anomaly has been recorded yet) and
 * an unreadable one must not fail the whole ledger check, so both yield an
 * empty set. Directories are dropped rather than indexed: a directory called
 * `DR-<id>-<slug>.md/` would otherwise satisfy the existence check that the
 * Decision Record itself is supposed to satisfy. A symlink is resolved and
 * counts only while it lands inside the project — see `isRecordFile`.
 */
async function collectDeclaredRecordIds(root: string): Promise<ReadonlySet<string>> {
  const ids = new Set<string>();
  const dir = path.join(root, DR_RECORD_DIR);
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return ids;
  }
  const projectRoot = await resolvedRoot(root);
  const names = await Promise.all(
    entries.map(async (entry) =>
      (await isRecordFile(dir, entry, projectRoot)) ? entry.name : null,
    ),
  );
  for (const name of names) {
    if (name === null) continue;
    for (const id of recordFileDeclaredIds(name)) ids.add(id);
  }
  return ids;
}

/**
 * A predicate over the `DR-*` declared for this spec: its own
 * `07_Decisions.md`, the shared `_policies/08_Decisions.md`, and the standalone
 * records under `.qfai/decisions/` (already indexed in `recordIds`).
 *
 * All three are read, not one: a policy-level decision is cited from spec
 * ledgers, and the Drift Protocol sends an implement-stage anomaly record to
 * `.qfai/decisions/` precisely because the upstream files are off limits there.
 *
 * A record resolves whatever its first segment is. Pairing the leading segment
 * of a `DR-<spec>-<seq>` with the citing spec's own number is the convention the
 * shipped `07_Decisions.md` template recommends, and the same template states
 * that validation checks the shape and not the match — as it does for a
 * declaration in `07_Decisions.md` itself. Scoping only the record directory
 * would make an id's validity depend on where it was declared, and would leave
 * the implement stage, which may write nowhere else, with no way to clear the
 * finding but the forbidden upstream write or a waiver.
 */
async function buildDrDeclarationResolver(
  specDir: string,
  specsRoot: string,
  recordIds: ReadonlySet<string>,
): Promise<(drId: string) => boolean> {
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
  return (drId) => {
    const id = drId.toUpperCase();
    return declared.has(id) || recordIds.has(id);
  };
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
 * Finding code for a `done` row that carries no evidence anchor.
 *
 * Canonical `QFAI-<AREA>-<NNN>`, so the code itself is the waiver key
 * (`resolveRuleKeys` in `core/waivers.ts`), which also accepts the stripped
 * `TDDLIST-007` spelling. The `rule` field carries the dotted rule path
 * instead, matching this check's sibling `tddList.evidenceAnchorResolves`.
 *
 * Every completed-evidence check below hangs off an anchor, so a `done` row
 * whose `Evidence` cell is a bare command and result — command-shaped, so
 * `TDDLIST_EVIDENCE_STATUS_ONLY` passes over it too — reached `done` with no
 * evidence entry, no reviewer verdict and no checkpoint, and produced no
 * finding at all. The execution-ledger contract makes the cell a pointer, so
 * the absent anchor is itself the unresolved thing.
 *
 * Reported at `warning` for the same reason `TDDLIST_EVIDENCE_STATUS_ONLY` is:
 * ledgers written before the pointer contract carry outcome prose on hundreds
 * of `done` rows — this repository's own carry ~350 — and turning those into
 * build failures on upgrade is a migration, not a gate. A project that has
 * moved its ledger onto pointers raises it by treating warnings as failures;
 * one still migrating waives it per path.
 */
export const EVIDENCE_ANCHOR_MISSING_CODE = "QFAI-TDDLIST-007";

/** Finding code for an evidence anchor that does not resolve. */
export const EVIDENCE_ANCHOR_UNRESOLVED_CODE = "QFAI-TDDLIST-008";

/**
 * `Revision` names a tree that files the observation covered have moved past.
 *
 * `evidence-revision.md#what-makes-evidence-stale` defines staleness
 * mechanically — "a commit that changes any file the observation covered
 * invalidates it" — and nothing computed it. The field was hand-written,
 * required in three places, and compared against nothing: `QFAI-REVIEW-009`
 * checks that `summary.json`'s field is PRESENT, never that it is CURRENT
 * (#1146).
 *
 * That failure is silent and self-consistent: a stale `Revision` looks exactly
 * like a fresh one, every command in the record is real, and nothing in the
 * record contradicts anything else. The only signal is someone re-running the
 * observation and noticing it no longer matches.
 */
export const EVIDENCE_REVISION_STALE_CODE = "QFAI-TDDLIST-009";

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
      `Seed \`${TDD_LIST_REL_PATH}\` with one row per coverage-target TC (\`/qfai-sdd\` Phase 2b), then run \`/qfai-implement\`.`,
    ),
  ];
}

/**
 * Options shared by {@link validateTddList} and {@link validateTddListSeedShape}.
 */
export type TddListValidateOptions = {
  /**
   * Restricts the walk to the named specs.
   *
   * Every finding this validator raises is filed against a path inside the
   * spec that owns it, so the run-level `--spec` filter already drops the rest
   * — but only *after* each out-of-scope ledger has been read and each of its
   * completed rows `stat`-ed. `/qfai-sdd` gates every slice with its own
   * `--spec` run, so an unscoped walk turns that loop quadratic in spec count.
   * Narrowing the enumeration keeps the output identical and the I/O linear.
   */
  specScope?: SpecScope;
};

export async function validateTddList(
  root: string,
  config: QfaiConfig,
  options: TddListValidateOptions = {},
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  // Repo-relative, for a `git diff` pathspec. `QFAI-TDDLIST-009` asks whether
  // anything the observation covered has moved, and the code under test is
  // half of that.
  const srcRelDir = config.paths.srcDir;
  const entries = await collectSpecEntries(specsRoot);
  // `.qfai/decisions/` is one shared directory, so it is read once here and
  // handed to each spec rather than re-scanned per spec.
  const recordIds = await collectDeclaredRecordIds(root);
  const issues: Issue[] = [];

  for (const entry of entries) {
    if (!isSpecInScope(entry.specNumber, options.specScope)) continue;
    const specIssues = await validateSpecTddList(
      root,
      entry.dir,
      entry.specNumber,
      specsRoot,
      recordIds,
      srcRelDir,
    );
    issues.push(...demoteRetiredSpecIssues(specIssues, entry));
  }

  return issues;
}

/**
 * The revision the row's newest observation names.
 *
 * Completed evidence records the field per round (`- Round 1: Revision: <sha>`),
 * and `rowEvidenceFieldValue` filters `round === null` — it reads only a BARE
 * `- Revision:`. Reading it that way made the staleness check a SILENT NO-OP on
 * every real evidence file, which is the failure class #1146 is about
 * reproduced inside the check written to end it (a silent no-op and a clean run
 * look the same).
 *
 * The last round is the right one: a re-verify round re-takes the observation,
 * so the interval runs from what the newest round names. The bare form is still
 * accepted, because a row may record one.
 */
function observationRevision(section: string): string | null {
  const rounds = evidenceRoundNumbers(section);
  for (const round of [...rounds].sort((a, b) => b - a)) {
    const value = roundEvidenceFieldValue(section, round, "Revision");
    if (value !== null && value.length > 0) return value;
  }
  return rowEvidenceFieldValue(section, "Revision");
}

/**
 * Ledger findings on a retired spec are a historical record, not live work.
 *
 * SUPERSEDE moves a spec's obligations to its successor and rewrites the
 * source's `Status:`; deprecation and removal retire one without a successor.
 * The ledger stayed where it was either way, so a retired spec kept offering
 * `todo` rows as selectable work, kept demanding a resolution or a waiver for
 * every parked `exception` row, and kept owing `Evidence` at `error` — for a
 * spec nobody is allowed to touch, and that no later phase revisits because
 * triage classification already ignores non-active specs.
 *
 * Demoted rather than dropped: the rows are the record of what the retired spec
 * owed, and an operator migrating the live ones to the successor's ledger has
 * to be able to list them. `info` keeps them printed while taking them out of
 * `--fail-on error` / `--fail-on warning`.
 *
 * Only a complete declaration retires a ledger: `SpecEntry.status` is set from
 * the header block alone, only once the retirement carries the companion field
 * it requires, and — for `superseded` — only once that `Superseded-by` names a
 * spec that exists to inherit the rows. An absent, unparseable, out-of-header,
 * half-written or dangling `Status:` leaves the spec current here and is
 * reported by its own `QFAI-STATUS-00N` rule — which matters because
 * `--profile tdd` runs this validator without `validateSpecPacks`, so a
 * demotion it granted on an unvalidated declaration would answer to nothing.
 */
function demoteRetiredSpecIssues(issues: readonly Issue[], entry: SpecEntry): Issue[] {
  const status = entry.status;
  if (status === undefined || status === "active") {
    return [...issues];
  }
  const migration = `spec-${entry.specNumber} is retired (Status: ${status}), so its ledger no longer gates. Migrate every live row (${LIVE_LEDGER_STATUSES.join(" / ")}) to the successor spec's \`${TDD_LIST_REL_PATH}\`, giving each migrated row a TDD-ID the successor's ledger does not already use (TDD-NNNN is ledger-local, so a copied one fails TDDLIST_DUPLICATE_ID there) and remapping every spec-namespaced obligation onto the successor's own IDs — TC-Refs from its 06_Test-Cases.md, and US-Refs on each Layer=E2E row from its 02_User-stories.md. Repoint every Blocked-By naming a migrated row at its new spec-NNNN:TDD-MMMM as well; TDDLIST_BLOCKED_MISSING_REF only checks that the cell is non-empty, so a stale one goes unreported. Reset each migrated in-progress row to Status: todo with an empty DR-ID and Evidence — those cells describe a run against the old obligation — and record the migration in the approved CR. Leave done rows as the historical record.`;
  return issues.map((found): Issue => {
    return {
      ...found,
      severity: "info",
      message: `${found.message} [demoted to info: spec-${entry.specNumber} is Status: ${status}]`,
      suggested_action: migration,
    };
  });
}

/** Statuses at which a row's `Revision` is a claim rather than work in flight. */
const REVISION_AT_REST_STATUSES = new Set(["refactor", "done", "review-fix"]);

/**
 * Files the observation covered that have changed since the revision it names,
 * or `null` when there is nothing to report.
 *
 * A pure decision, with the finding built at the call site where the pin's
 * severity is in scope — `sunsetLedger`'s ratchet is right that a severity
 * decided beside the call is a window that never opens.
 *
 * Exported for its own rows: the four `null` states below are what a suite has
 * to separate, and reaching them through a whole ledger fixture would test the
 * fixture.
 *
 * `null` covers four states:
 *
 * - the row records no `Revision`. That absence belongs to
 *   `QFAI-TDDLIST-008`'s completed-evidence field list; two findings on one
 *   state with two remedies help nobody.
 * - the value is a content address (`working-tree+<hash>`), which names no
 *   commit, so there is no interval to compute. `QFAI-REVIEW-007` / `-009` own
 *   that shape.
 * - nothing under the pathspec moved. The observation is current.
 * - the revision cannot be RESOLVED here. It cannot share this code's window,
 *   because `actions/checkout` is depth-1 by default and every CI run on a
 *   shallow clone would then error on every row; and `QFAI-REVIEW-009` already
 *   reports an unresolvable revision, so a per-row copy would be noise on top
 *   of a signal that exists. The residual is real and stated here rather than
 *   hidden: a revision unresolvable because it is WRONG is not told apart from
 *   one unresolvable because the clone is shallow, and telling them apart needs
 *   a signal this check does not have.
 */
export function staleEvidenceFiles(
  root: string,
  srcRelDir: string,
  section: string,
  testFile: string,
  cache: Map<string, ChangedSince> = new Map(),
): readonly string[] | null {
  const revision = observationRevision(section);
  // The shape test is a COST guard, not a correctness one, and no row can
  // distinguish it: without it a `working-tree+<hash>` reaches
  // `changedFilesSince`, `rev-parse` fails, and the answer is `null` either
  // way. It is kept because this runs per ledger row, and a project on content
  // addresses would spawn a git process for every one of them to reach a
  // guaranteed null.
  if (revision === null || !/^[0-9a-f]{7,64}$/i.test(revision)) {
    return null;
  }
  if (testFile.length === 0 && srcRelDir.length === 0) {
    return null;
  }

  // ONE diff per distinct revision, over the whole tree, filtered per row in
  // memory. Two git processes per row cost ~200 ms each on this repository —
  // 104 invocations for 52 rows, ~10.5 s — and rows share revisions, because an
  // observation revision is per spec and per round rather than per row. A
  // project with 500 rows would otherwise add ~100 s to `validate --profile
  // tdd`, the completion gate `qfai-implement` runs.
  let changed = cache.get(revision);
  if (changed === undefined) {
    changed = changedFilesSince(root, revision, []);
    cache.set(revision, changed);
  }
  if (changed.kind !== "changed") {
    return null;
  }

  const prefix = srcRelDir.length > 0 ? `${srcRelDir}/` : null;
  const covered = changed.files.filter(
    (file) => file === testFile || (prefix !== null && file.startsWith(prefix)),
  );
  return covered.length > 0 ? covered : null;
}

/**
 * The codes that describe the ledger's **seed shape** — the state
 * `/qfai-sdd` Phase 2b leaves behind and can therefore be held to.
 *
 * Every other code in this validator describes execution state that only
 * exists once `/qfai-implement` has driven rows (evidence, test files, stale
 * status, parked exceptions), so those stay in the `tdd` profile alone: the
 * SDD stage neither creates nor owns them.
 */
export const TDD_LIST_SEED_SHAPE_CODES: ReadonlySet<string> = new Set([
  "TDDLIST_TABLE_MISSING",
  "TDDLIST_REQUIRED_COLUMN_MISSING",
  "TDDLIST_DUPLICATE_ID",
  "TDDLIST_INVALID_ID",
  "TDDLIST_INVALID_STATUS",
  "TDDLIST_UNKNOWN_LAYER",
  "TDDLIST_UNKNOWN_LEVEL",
  "TDDLIST_TC_NOT_COVERED",
  // `Owning module` is filled at ledger-authoring time — Phase 2b, from the
  // TC's parent `BR` (`qfai-implement/references/execution-ledger.md`) — so a
  // cell naming two modules is damage the seed owns, not execution state.
  // Leaving it out held the row to the `tdd` profile alone, i.e. the writer
  // passed its own gate and the reader inherited an `error` it is forbidden to
  // fix by restructuring the ledger.
  "TDDLIST_OWNING_MODULE_NOT_SINGULAR",
  // `US-Refs` / `CON-API-Refs` and the `Layer` they have to agree with are all
  // authored by the same phase: the traceability rules give the SDD stage "the
  // rows — which obligations exist and what each covers" and leave the
  // implementing stage `Status`, `DR-ID` and `Evidence` alone. A malformed
  // obligation ID, or one recorded on a Layer that cannot legally carry it, is
  // therefore seed damage; and re-scoping a row to repair it is an upstream
  // change the reader is forbidden to make.
  "TDDLIST_INVALID_OBLIGATION_REF",
  "TDDLIST_OBLIGATION_LAYER_MISMATCH",
  // The remaining three read cells the same phase authors, and were missing
  // for no reason the ownership split supports:
  //
  // - `TDDLIST_MISSING` is the absence of the file Phase 2b's first checklist
  //   line creates. Nothing downstream can create it.
  // - `TDDLIST_UNKNOWN_REF` is a `TC-Refs` token naming no declared TC.
  //   `TC-Refs` carries the row's obligation identity, which the traceability
  //   rules keep upstream: the reader may not re-point it.
  // - `TDDLIST_COVERAGE_LAYER_MISMATCH` compares a TC's `Level` against the
  //   `Layer` of the rows citing it. Both sides are seed-authored — `Level` in
  //   `06_Test-Cases.md`, `Layer` in the row — and reconciling them is a
  //   re-scope, which is an upstream change.
  //
  // All three are `warning`, so they never blocked `--fail-on error`; they did
  // let a malformed seed through `--strict` on the writer's own gate.
  "TDDLIST_MISSING",
  "TDDLIST_UNKNOWN_REF",
  "TDDLIST_COVERAGE_LAYER_MISMATCH",
]);

/**
 * The seed-shape codes that a spec with **no ledger yet** raises anyway.
 *
 * The two sides are written by different phases of the same run: the Slice
 * phase produces the test cases, and only the phase after it seeds a ledger
 * row per coverage-target TC. A gate placed between them therefore sees TCs
 * with no row, and no file to hold them, *by construction*. Everything else in
 * {@link TDD_LIST_SEED_SHAPE_CODES} is a property of the ledger text itself —
 * an absent ledger raises none of them.
 */
export const TDD_LIST_SEED_RECONCILIATION_CODES: ReadonlySet<string> = new Set([
  "TDDLIST_TC_NOT_COVERED",
  "TDDLIST_MISSING",
]);

/** Options for {@link validateTddListSeedShape}. */
export type TddListSeedShapeOptions = TddListValidateOptions & {
  /**
   * Set on a gate the workflow can reach before the ledger has been seeded,
   * which drops {@link TDD_LIST_SEED_RECONCILIATION_CODES} **for the specs
   * that have no ledger yet**.
   *
   * Without it the SDD profile's own per-spec slice gate — which the skill's
   * Required Process places one step ahead of the phase that writes
   * `tdd/test-list.md` — failed with `TDDLIST_TC_NOT_COVERED` (`error`) on
   * every newly sliced spec that declares a unit or component test case. That
   * gate has to pass before the seeding phase runs, so the workflow could
   * never reach the phase that would have cleared it.
   *
   * It is deliberately a permission, not a verdict. The caller sets it from
   * the *position* it might be in, and the per-spec state decides: a spec whose
   * ledger exists is reconciled whatever this says. Dropping the codes on the
   * caller's word alone made `--spec` mean "before Phase 2b", so re-checking a
   * single **seeded** spec passed with rows missing.
   */
  beforeLedgerSeed?: boolean;
};

/**
 * `validateTddList` restricted to {@link TDD_LIST_SEED_SHAPE_CODES}.
 *
 * The phase that writes `tdd/test-list.md` was not the phase that validated
 * it: `--profile sdd` — the only gate `/qfai-sdd` stops on — ran no
 * `TDDLIST_*` check at all, so a ledger seeded at Phase 2b with a duplicate
 * `TDD-ID`, a missing required column, a stray table above the ledger table or
 * a coverage-target TC with no row exited that stage green and surfaced in
 * `/qfai-implement`, on the one agent the drift protocol forbids to restructure
 * the ledger. The whole validator cannot run there — most of it reports
 * execution state the SDD stage has not reached yet — so the writing stage is
 * held to the shape it wrote, and nothing more.
 *
 * `beforeLedgerSeed` narrows that further for a gate the workflow can reach
 * before the seed exists, and only for the specs that are actually unseeded;
 * see {@link TddListSeedShapeOptions}.
 */
export async function validateTddListSeedShape(
  root: string,
  config: QfaiConfig,
  options: TddListSeedShapeOptions = {},
): Promise<Issue[]> {
  const issues = await validateTddList(root, config, options);
  // Which specs have no ledger yet, read off the run's own findings:
  // `TDDLIST_MISSING` is raised on exactly that condition and carries the
  // ledger path every other code in this validator reports against. Deciding
  // it here rather than in the caller keeps "is this spec seeded?" a fact
  // about the tree instead of an inference from the command line.
  const unseeded = new Set(
    issues.filter((entry) => entry.code === "TDDLIST_MISSING").map((entry) => entry.file),
  );
  return issues.filter((entry) => {
    if (!TDD_LIST_SEED_SHAPE_CODES.has(entry.code)) return false;
    if (!TDD_LIST_SEED_RECONCILIATION_CODES.has(entry.code)) return true;
    return !(options.beforeLedgerSeed === true && unseeded.has(entry.file));
  });
}

async function validateSpecTddList(
  root: string,
  specDir: string,
  specNumber: string,
  specsRoot: string,
  recordIds: ReadonlySet<string>,
  srcRelDir: string,
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
  //
  // The binding runs both ways. Shape-and-layer alone still let a
  // `Layer = E2E` row leave `US-Refs` at `-` on a ledger that ships the
  // column — a row with no obligation in any column, and so nothing for a
  // handoff to audit. `validateObligationColumn` requires the cell on the
  // layer that owns it whenever the column is in the header.
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
  const isDrDeclared = await buildDrDeclarationResolver(specDir, specsRoot, recordIds);
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
            `Status=exception but ${reason} in tdd/test-list.md for spec-${specNumber} (${rowIdxLabel}). Add a DR-ID reference in the form DR-NNNN or DR-NNNN-NNNN, declared in one of ${DR_SEARCHED_LOCATIONS}`,
            "error",
            relPath,
            "tddList.exceptionDrId",
            undefined,
            "canonical",
            `DR-ID 列に DR-NNNN（policy-level）または DR-NNNN-NNNN（spec-scoped）を記載し、対応する Decision Record を ${DR_DECLARATION_HOMES_JA} のいずれかに用意してください。retained な \`CR-*\` は再開の記録であって anomaly の記録ではないので、\`DR-*\` を併記してください（\`DR-NNNN, CR-YYYYMMDD-NNNN\`）。`,
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
            `DR-ID を DR-NNNN もしくは DR-NNNN-NNNN の形式に直してください。宣言先は ${DR_DECLARATION_HOMES_JA} です。`,
          ),
        );
      }

      const wellFormed = drTokens
        .map((token) => token.toUpperCase())
        .filter((token) => DR_ID_FORMAT.test(token));
      const unresolved = wellFormed.filter((token) => !isDrDeclared(token));
      if (unresolved.length > 0) {
        issues.push(
          issue(
            "TDDLIST_EXCEPTION_UNRESOLVED_DR",
            `DR-ID ${unresolved.join(", ")} in tdd/test-list.md for spec-${specNumber} (${rowIdxLabel}) is declared in no Decisions file. Searched ${DR_SEARCHED_LOCATIONS}`,
            "warning",
            relPath,
            // Rule id, not a dotted path: a project keeping its decision
            // records somewhere qfai does not read needs a way to silence this,
            // and a dotted name resolves to no waiver key.
            UNRESOLVED_DR_RULE_ID,
            unresolved,
            "change",
            `該当の Decision Record を ${DR_DECLARATION_HOMES_JA} のいずれかに用意してください。このいずれでもない場所で管理している場合に限り、\`.qfai/waivers.yml\` に rule: ${UNRESOLVED_DR_RULE_ID} の waiver を登録してください。`,
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
  //
  // `TDDLIST_EVIDENCE_EMPTY` runs a promotion window (`RULE_PROMOTIONS`): the
  // rule is right, but it necessarily fires on cells written before it existed,
  // including rows already at `done` — a state with no transition left that
  // could re-observe anything. Shipping it straight at `error` turned an
  // upgrade into a latched gate for a consuming repository. It is a `warning`
  // until the pinned release and an `error` from that release onwards.
  //
  // `resolveToolVersion` resolves rather than rejects — its own read failures
  // return `"unknown"`, which the comparator reads as inside the window, so an
  // unreadable version can never be what escalates this into a build failure.
  //
  // The two anchor rules below run their own windows for the same reason. They
  // read a cell nothing read before, so on the release that introduces them
  // every ledger written under the old shape meets them at once — 29 rows in
  // this repository alone, all of them already at `done`.
  const resolvedToolVersion = await resolveToolVersion();
  const windowNoteFor = (severity: "warning" | "error", promoteAt: string): string =>
    severity === "warning"
      ? ` Reported as a warning until the ${promoteAt} release, then an error`
      : "";
  const evidenceEmptyPromotion = RULE_PROMOTIONS.tddListEvidenceEmpty.promoteAt;
  const evidenceEmptySeverity = newRuleSeverity(resolvedToolVersion, evidenceEmptyPromotion);
  const evidenceEmptyWindowNote = windowNoteFor(evidenceEmptySeverity, evidenceEmptyPromotion);
  const anchorMissingPromotion = RULE_PROMOTIONS.tddListEvidenceAnchorMissing.promoteAt;
  const anchorMissingSeverity = newRuleSeverity(resolvedToolVersion, anchorMissingPromotion);
  const anchorMissingWindowNote = windowNoteFor(anchorMissingSeverity, anchorMissingPromotion);
  const anchorUnresolvedPromotion = RULE_PROMOTIONS.tddListEvidenceAnchorUnresolved.promoteAt;
  const anchorUnresolvedSeverity = newRuleSeverity(resolvedToolVersion, anchorUnresolvedPromotion);
  const anchorUnresolvedWindowNote = windowNoteFor(
    anchorUnresolvedSeverity,
    anchorUnresolvedPromotion,
  );
  const revisionStalePromotion = RULE_PROMOTIONS.tddListEvidenceRevisionStale.promoteAt;
  const revisionStaleSeverity = newRuleSeverity(resolvedToolVersion, revisionStalePromotion);
  const revisionStaleWindowNote = windowNoteFor(revisionStaleSeverity, revisionStalePromotion);
  // One whole-tree diff per distinct `Revision`, shared by every row that names
  // it. Scoped to this run rather than to the module: a cache that outlived a
  // run would answer a later one from an earlier tree.
  const revisionDiffCache = new Map<string, ChangedSince>();
  // A single per-spec evidence file can serve hundreds of ledger rows. Cache
  // its parsed sections (and a missing-file sentinel) so each path is read once.
  const evidenceIndexCache = new Map<string, MarkdownEvidenceIndex | null>();
  const evidenceContext = completedEvidenceContext(root, specsRoot);
  for (const ref of ledgerRows()) {
    const status = cell(ref, "Status").toLowerCase();
    if (!EVIDENCE_CHECK_STATUSES.has(status)) continue;
    const evidence = cell(ref, "Evidence");
    const tddId = cell(ref, "TDD-ID");
    const rowLabel = tddId.length > 0 ? `${tddId} (${ref.label})` : ref.label;

    if (EVIDENCE_PLACEHOLDER.test(evidence)) {
      // The pointer example is built from *this* row: the evidence file its
      // `Layer` owns and an anchor named after its own `TDD-ID`. A fixed
      // `implement-…#tdd-0042` named an entry no other row has, and sent every
      // ATDD-owned row at the file its completion gate does not accept.
      const pointerExample = `${evidenceFileFor(cell(ref, "Layer"), specNumber)}${evidenceAnchorFor(tddId)}`;
      issues.push(
        issue(
          "TDDLIST_EVIDENCE_EMPTY",
          `Evidence is empty for spec-${specNumber} ${rowLabel}, Status=${status}. A row past RED owes the command and its result in its evidence file, with the cell pointing at that entry ("Empty evidence entries are rejected", qfai-implement Evidence hard rules).${evidenceEmptyWindowNote}`,
          evidenceEmptySeverity,
          relPath,
          "tddList.evidencePresent",
          undefined,
          "change",
          `実行したコマンドとその結果は evidence ファイルに記録し、Evidence 列には結果の要約とその anchor への pointer だけを書いてください（例: RED fail / GREEN pass — evidence at \`${pointerExample}\`）。コマンドと出力をセルへ直接貼ると、改行や \`|\` が台帳の行を打ち切ったり列をずらしたりします（qfai-implement \`references/execution-ledger.md\`）。Status=done のような終端の行は、Status を変えずに Evidence セルだけを追記します（Evidence の追記は状態遷移ではありません）。実行記録が残っていない場合は evidence ファイルに backfill entry を作成し、その anchor をセルに記録してください。まだサイクルを実行していない場合の合法な回復手順は Status ごとに異なります: ${unrunRowRecovery(status)}`,
        ),
      );
      continue;
    }

    const anchors = collectEvidenceAnchors(evidence);
    const expectedFile = expectedEvidenceFile(specNumber, cell(ref, "Layer"), evidence);
    const expectedFragment = tddId.toLowerCase();
    const malformedClaim = EVIDENCE_POINTER_CLAIM.test(evidence) && anchors.length === 0;
    let anchorFailure = malformedClaim
      ? "the pointer is not a canonical .qfai/evidence/<owner>-spec-NNNN.md#tdd-NNNN anchor"
      : "";
    let relatedFile: string | undefined;

    // A `done` row owes a pointer, not merely a plausible cell. Everything the
    // completion gate checks lives behind the anchor, so without one the row
    // asserts completion and offers nothing to check it against.
    if (status === "done" && anchors.length === 0 && !malformedClaim) {
      issues.push(
        issue(
          EVIDENCE_ANCHOR_MISSING_CODE,
          `Evidence for spec-${specNumber} ${rowLabel} carries no evidence anchor (Status=done): "${evidence}". A completed row's Evidence cell is a pointer into ${expectedFile}.${anchorMissingWindowNote}`,
          anchorMissingSeverity,
          relPath,
          "tddList.evidenceAnchorPresent",
          undefined,
          "change",
          `Evidence 列を \`evidence at \\\`${expectedFile}#${expectedFragment}\\\`\` の形にし、そのファイルに \`### ${tddId}\` セクションを追加してください。移行途中のレガシー行は \`.qfai/waivers.yml\` に rule: ${EVIDENCE_ANCHOR_MISSING_CODE} の waiver を登録してください。`,
        ),
      );
    }

    let lastResolvedSection = "";
    for (const anchor of anchors) {
      relatedFile = anchor.file;
      if (anchor.file !== expectedFile) {
        anchorFailure = `the row's Layer owns ${expectedFile}, not ${anchor.file}`;
        break;
      }
      if (anchor.fragment !== expectedFragment) {
        anchorFailure = `the row is ${tddId}, not #${anchor.fragment}`;
        break;
      }
      let evidenceIndex = evidenceIndexCache.get(anchor.file);
      if (evidenceIndex === undefined) {
        const evidencePath = path.join(root, anchor.file);
        evidenceIndex = (await exists(evidencePath))
          ? markdownEvidenceIndex(await readSafe(evidencePath))
          : null;
        evidenceIndexCache.set(anchor.file, evidenceIndex);
      }
      if (evidenceIndex === null) {
        anchorFailure = `${anchor.file} does not exist`;
        break;
      }
      if (!evidenceIndex.anchors.has(anchor.fragment)) {
        anchorFailure = `${anchor.file} has no #${anchor.fragment} heading`;
        break;
      }
      if (status === "done") {
        const layer = cell(ref, "Layer");
        const normalizedLayer = layer.toLowerCase();
        const obligationField =
          normalizedLayer === "e2e"
            ? "US-ref"
            : normalizedLayer === "api"
              ? "CON-API-ref"
              : "TC-ref";
        const obligationColumn =
          normalizedLayer === "e2e"
            ? "US-Refs"
            : normalizedLayer === "api"
              ? "CON-API-Refs"
              : "TC-Refs";
        const section = evidenceIndex.sections.get(anchor.fragment) ?? "";
        // Kept for the staleness check below, which needs the section this row
        // actually resolved to rather than the last one the loop happened to
        // look at.
        lastResolvedSection = section;
        const expectation = {
          specNumber,
          tddId,
          layer,
          testFile: cell(ref, "Test file"),
          selector: cell(ref, "Selector"),
          obligationField,
          obligationValue: cell(ref, obligationColumn),
          preSplit: usesPreSplitEvidence(layer, evidence),
        } satisfies CompletedEvidenceExpectation;
        const missing = [
          ...missingCompletedEvidenceFields(section, expectation),
          ...(await invalidCompletedEvidenceArtifacts(
            evidenceContext,
            anchor.file,
            section,
            expectation,
          )),
        ];
        if (missing.length > 0) {
          anchorFailure = `${anchor.file}#${anchor.fragment} is missing completed evidence fields: ${missing.join(", ")}`;
          break;
        }
      }
    }

    if (anchorFailure.length === 0) {
      const staleFiles = staleEvidenceFiles(
        root,
        srcRelDir,
        lastResolvedSection,
        cell(ref, "Test file"),
        revisionDiffCache,
      );
      if (staleFiles !== null) {
        const revision = observationRevision(lastResolvedSection) ?? "";
        const shown = staleFiles.slice(0, 5);
        const more =
          staleFiles.length > shown.length ? ` (+${staleFiles.length - shown.length})` : "";
        const atRest = REVISION_AT_REST_STATUSES.has(status.toLowerCase());
        issues.push(
          issue(
            EVIDENCE_REVISION_STALE_CODE,
            `spec-${specNumber} ${rowLabel}: the observation names Revision \`${revision}\`, and ` +
              `${staleFiles.length} file(s) it covered have changed since: ${shown.join(", ")}${more}. ` +
              `Status=${status}${atRest ? " (at rest — this row is making a claim)" : ""}. ` +
              "A stale Revision looks exactly like a fresh one — every command in the record is " +
              "real and nothing contradicts anything else — which is why it is computed rather " +
              `than read.${revisionStaleWindowNote}`,
            revisionStaleSeverity,
            relPath,
            "tddList.evidenceRevisionStale",
            [revision, ...shown],
            "canonical",
            "Re-take the observation and record the revision it was taken at. The interval is " +
              "from the revision the observation NAMES to now — " +
              "`git diff --name-only <revision>..HEAD -- <test file> <srcDir>` — not from your " +
              "last commit, which is a different and much weaker question " +
              "(`references/evidence-revision.md#what-makes-evidence-stale`).",
          ),
        );
      }
    }

    if (anchorFailure.length > 0) {
      issues.push(
        issue(
          EVIDENCE_ANCHOR_UNRESOLVED_CODE,
          `Evidence anchor does not resolve for spec-${specNumber} ${rowLabel}, Status=${status}: ${anchorFailure}.${anchorUnresolvedWindowNote}`,
          anchorUnresolvedSeverity,
          relPath,
          "tddList.evidenceAnchorResolves",
          relatedFile ? [relatedFile] : undefined,
          "change",
          `Evidence 列を \`${expectedFile}#${expectedFragment}\` に向け、そのファイルに \`### ${tddId}\` セクションを追加してください。`,
          relatedFile ? { relatedFiles: [relatedFile] } : undefined,
        ),
      );
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
  // per-change-request section (`## CHG-NNN …` + its own table) is a shape the
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
 * Validates an optional obligation column in **both** directions: the token
 * shape and the row `Layer` an obligation is legal on, and — the reverse — the
 * obligation a row of that `Layer` owes.
 *
 * An absent column is fine: the column is optional in the schema, and a ledger
 * written before it shipped records what it can in `TC-Refs`. Checking the
 * shape alone let a `Layer = Unit` row claim a `US-*` obligation, which the
 * ATDD gates route to `tests/e2e/**`: the ledger would record a layer-scoped
 * obligation the completion gate reads at the wrong layer.
 *
 * An empty cell or `-` is fine **except on the layer that owns the column**.
 * Once the column is in the header the obligation has a home, so a
 * `Layer = E2E` row with no `US-*` (or a `Layer = API` row with no
 * `CON-API-*`) is a row with no obligation at all: `TC-Refs` is forbidden
 * there by `catalog/test-layers.md`, so nothing else on the row says what it
 * covers, and it could reach `done` with no auditable target. This is
 * conditioned on the column being present precisely so that it stays a gate on
 * the new ten-column ledger and never a migration demand on an eight-column
 * one.
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
      if (cell(ref, "Layer").toLowerCase() === spec.layer) {
        issues.push(
          issue(
            "TDDLIST_OBLIGATION_LAYER_MISMATCH",
            `${spec.column} is required on a Layer=${spec.layer.toUpperCase()} row, but spec-${spec.specNumber} (${ref.label}) leaves it empty`,
            "error",
            spec.relPath,
            `${spec.rule}Required`,
            [spec.column, spec.layer.toUpperCase()],
            "change",
            `Record the ${spec.expected} this row covers in ${spec.column}, or remove the row: a Layer=${spec.layer.toUpperCase()} row cannot record its obligation in TC-Refs.`,
          ),
        );
      }
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

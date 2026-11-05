import { readFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { Lexer, parseDocument } from "yaml";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import {
  describeBaseComparison,
  existsAtRevision,
  getChangedFilesAgainstBase,
  gitStdout,
  normalizeRepoPath,
  NotRegularFileError,
  readDecisionFilesAtRevision,
  readFileAtBase,
  readFileAtRevision,
  uncommittedContentPaths,
  type BaseComparison,
} from "../gitChanges.js";
import { parseAllMarkdownTables } from "../specPackParsers.js";
import { parseCountedExampleAnnotations, RECORD_ID_SOURCE } from "../storyTree/ids.js";
import {
  classifyRecordRow,
  diffRecordRows,
  parseRecordTable,
  type RecordRow,
} from "../storyTree/tables.js";
import { buildStoryTreeModel, readStoryTreeModel, type StoryTreeModel } from "../storyTree/tree.js";
import type { Issue } from "../types.js";
import { countsForExample, readStoryTests, storyTestScanIssue } from "./storyTreeObligations.js";
import { issue } from "./utils.js";

/** Story-tree protected files, and register rows compared with the base by ID. */
export async function validateStoryTreeDrift(
  root: string,
  config: QfaiConfig,
  profile: "tdd" | "drift",
): Promise<Issue[]> {
  const baseBranch = config.baseBranch ?? "origin/main";
  const comparison = describeBaseComparison(root, baseBranch);
  if (comparison.kind === "unresolved") {
    return [
      notCompared(
        `"${baseBranch}" has no merge base with HEAD.`,
        "Fetch that ref, or set baseBranch in qfai.config.yaml to one this checkout has, then rerun validate.",
      ),
    ];
  }
  const changed = getChangedFilesAgainstBase(root, baseBranch);
  if (changed === null) {
    // In a repository whose base resolves, the listing itself failed.
    return comparison.kind === "resolved"
      ? [notCompared(`git could not list the changes since "${baseBranch}".`, RERUN_ACTION)]
      : [];
  }
  const specs = normalizeRepoPath(
    path.relative(root, path.resolve(root, config.paths.specsDir)),
  ).replace(/\/$/, "");
  const contracts = normalizeRepoPath(
    path.relative(root, path.resolve(root, config.paths.contractsDir)),
  ).replace(/\/$/, "");
  const decisions = path.posix.join(specs, "decisions.md");
  const questions = path.posix.join(specs, "open-questions.md");
  const issues: Issue[] = [];
  const baseDecisions = readFileAtBase(root, baseBranch, decisions);
  // Read first: a failure that is not a missing file stops the run instead of being compared.
  await readSafePath(path.join(root, decisions));
  let baseModel: StoryTreeModel;
  let headModel: StoryTreeModel;
  try {
    let files: Map<string, string>;
    if (comparison.kind === "resolved") {
      const ancestors = gitStdout(root, ["merge-base", "--all", baseBranch, "HEAD"])
        ?.trim()
        .split(/\s+/);
      if (!ancestors || ancestors.length !== 1 || !ancestors[0])
        throw new Error("A unique readable common ancestor is required");
      files = readDecisionFilesAtRevision(root, ancestors[0], specs);
      for (const [file, text] of files) files.set(file, withoutStatusColumn(text));
    } else {
      files = new Map(
        baseDecisions === null ? [] : [[decisions, withoutStatusColumn(baseDecisions)]],
      );
    }
    const hasPages = [...files.keys()].some((file) =>
      file.startsWith(`${path.posix.join(specs, "decisions")}/`),
    );
    if (baseDecisions === null && !hasPages) {
      // A base without decisions.md is a project before its story tree. A base that has it and
      // could not be read is not, and passing on it is the failure this warning exists for.
      return comparison.kind === "resolved" &&
        existsAtRevision(root, comparison.mergeBase, decisions)
        ? [notCompared(`${decisions} at "${baseBranch}" could not be read.`, RERUN_ACTION)]
        : [];
    }
    if (!files.has(decisions) && !hasPages) return [];
    baseModel = buildStoryTreeModel(files, { specsDir: specs, contractsDir: contracts });
    headModel = await readStoryTreeModel(root, config);
    const problems = [baseModel, headModel].flatMap((model) => [
      ...(model.decisionRegisterComplete
        ? []
        : model.decisionRegisterErrors.map(({ file, message }) => `${file}: ${message}`)),
      ...(model.decisions?.errors ?? []).filter(
        (error) => !/declares .+ more than once/.test(error),
      ),
    ]);
    if (
      !baseModel.decisionRegisterComplete ||
      !headModel.decisionRegisterComplete ||
      problems.length > 0
    )
      throw new Error(
        `The complete decision register could not be read safely: ${problems.join("; ")}`,
      );
  } catch (error) {
    return [
      issue(
        "QFAI-DRIFT-001",
        `Decision-register comparison failed: ${error instanceof Error ? error.message : String(error)}`,
        "error",
        decisions,
        "storyTree.upstreamEdit",
        [decisions],
      ),
    ];
  }
  const rows = headModel.decisions?.rows ?? [];
  const baseIds = new Set((baseModel.decisions?.rows ?? []).map(({ id }) => id));
  // A change request authorises its paths only on the branch that adds it.
  const authorised = new Map<string, string>();
  for (const row of rows) {
    if (baseIds.has(row.id) || rows.filter((candidate) => candidate.id === row.id).length !== 1)
      continue;
    const classified = classifyRecordRow(row);
    if (classified.kind !== "change-request") continue;
    for (const file of classified.refs) authorised.set(normalizeRepoPath(file), row.id);
  }
  const baseQuestions = parseRecordTable(
    withoutStatusColumn(regularFileOrNull(() => readFileAtBase(root, baseBranch, questions)) ?? ""),
    "open-questions",
  ).rows;
  if (profile === "drift") {
    const headQuestions = parseRecordTable(
      await readSafePath(path.join(root, questions)),
      "open-questions",
    ).rows;
    issues.push(
      ...decisionRowDrift(baseModel, headModel),
      ...questionRowDrift(questions, baseModel, headModel, baseQuestions, headQuestions),
    );
  }
  const isProtected = (file: string): boolean =>
    file.startsWith(`${path.posix.join(specs, "01_policy")}/`) ||
    file.startsWith(`${path.posix.join(specs, "02_business-flow")}/`) ||
    contracts === "" ||
    file.startsWith(`${contracts}/`) ||
    file === decisions ||
    file.startsWith(`${path.posix.join(specs, "decisions")}/`) ||
    file === questions;
  const baseQuestionIds = new Set(baseQuestions.map(({ id }) => id));
  // The edits a protected file may take without a change request, against the head given.
  // Appending to the root register or the question register is one; appending to a page is not.
  const needsNoRequest = (file: string, head: string | null): boolean => {
    const read = regularFileOrNull(() => readFileAtBase(root, baseBranch, file));
    if (read === null || head === null) return false;
    const base = file === decisions || file === questions ? withoutStatusColumn(read) : read;
    return (
      (file === decisions && onlyAddsRows(base, head, baseIds, false)) ||
      (file === questions && onlyAddsRows(base, head, baseQuestionIds, true)) ||
      (file.endsWith("/03_Example.md") && onlyAppendsExamples(base, head)) ||
      (file.startsWith(`${contracts}/`) && onlyCitesExamples(base, head)) ||
      unchangedContent(file, base, head)
    );
  };
  for (const file of changed) {
    if (!isProtected(file) || authorised.has(file)) continue;
    // The committed comparison reads the committed file, not the working tree.
    if (
      needsNoRequest(
        file,
        regularFileOrNull(() => readFileAtRevision(root, "HEAD", file)),
      )
    )
      continue;
    issues.push(
      issue(
        "QFAI-DRIFT-001",
        `Upstream story-tree file changed without a Change request row this branch adds: ${file}`,
        "error",
        file,
        "storyTree.upstreamEdit",
        [file],
      ),
    );
  }
  issues.push(...(await examplesWithoutTestChange(root, config, changed, specs, baseBranch)));
  // A path already in the committed comparison is not named again, even when the working tree
  // changes it further: the checks read the file as it is on disk.
  const working = uncommittedContentPaths(
    root,
    (file) => isProtected(file) && !changed.has(file) && !authorised.has(file),
  );
  if (working === null) {
    issues.push(notCompared("git could not list the uncommitted changes.", RERUN_ACTION));
  } else {
    // The edits a commit would pass without a change request pass uncommitted too.
    const uncommitted: string[] = [];
    for (const file of working) {
      if (!needsNoRequest(file, await readWorkingFile(root, file))) uncommitted.push(file);
    }
    if (uncommitted.length > 0) issues.push(uncommittedNotCompared(uncommitted));
  }
  if (profile === "drift" && comparison.kind === "resolved") {
    issues.push(comparedAgainst(baseBranch, comparison, changed.size));
  }
  return issues;
}

/** The most uncommitted paths the finding names; the count says how many there are. */
const UNCOMMITTED_LISTED = 5;

/**
 * The comparison is `<base>...HEAD`, so an edit that is not committed yet is not in it and the
 * checks pass on it. Said once, so a green run is not read as covering the working tree.
 */
function uncommittedNotCompared(uncommitted: readonly string[]): Issue {
  const listed = uncommitted.slice(0, UNCOMMITTED_LISTED);
  const rest = uncommitted.length - listed.length;
  const single = uncommitted.length === 1;
  return issue(
    "QFAI-DRIFT-004",
    `${uncommitted.length} uncommitted ${single ? "change" : "changes"} to protected story-tree ${single ? "file is" : "files are"} not compared with the base: ${listed.join(", ")}${rest > 0 ? ` and ${rest} more` : ""}.`,
    "warning",
    undefined,
    "storyTree.uncommittedNotCompared",
    listed,
    "canonical",
    "Commit the change together with the change request row that names it, then rerun validate.",
  );
}

const RERUN_ACTION =
  "Check that git can read the repository and that the file is smaller than 256 MiB, then rerun validate.";

/** The warning for a run that compared nothing, so a pass is not read as a comparison. */
function notCompared(reason: string, action: string): Issue {
  return issue(
    "QFAI-DRIFT-003",
    `Nothing was compared: ${reason}`,
    "warning",
    undefined,
    "storyTree.notCompared",
    undefined,
    "canonical",
    action,
  );
}

/**
 * Names the commit the drift profile compared with, so a pass can be checked against the base the
 * reader expects: a worktree whose base ref lags the pull request's base passes silently otherwise.
 */
function comparedAgainst(
  baseBranch: string,
  comparison: Extract<BaseComparison, { kind: "resolved" }>,
  changedCount: number,
): Issue {
  const mergeBase = comparison.mergeBase.slice(0, 12);
  const compared = `Compared ${changedCount} changed ${changedCount === 1 ? "file" : "files"} with "${baseBranch}" at merge base ${mergeBase}`;
  const message = comparison.atHead
    ? `${compared}; HEAD is that commit, so the branch has no commit of its own.`
    : `${compared}.`;
  return issue("QFAI-DRIFT-003", message, "info", undefined, "storyTree.baseCompared");
}

/**
 * An example whose row changed since the base while no test annotating it changed. The test may
 * still assert the old expectation, so the owner rechecks it; a confirmed example needs no edit,
 * which is why this is a warning.
 */
async function examplesWithoutTestChange(
  root: string,
  config: QfaiConfig,
  changed: ReadonlySet<string>,
  specs: string,
  baseBranch: string,
): Promise<Issue[]> {
  const rewritten: { id: string; file: string }[] = [];
  for (const file of changed) {
    if (
      !file.startsWith(`${path.posix.join(specs, "02_business-flow")}/`) ||
      !file.endsWith("/03_Example.md")
    ) {
      continue;
    }
    const base = exampleRows(readFileAtBase(root, baseBranch, file) ?? "");
    const head = exampleRows(await readSafePath(path.join(root, file)));
    for (const [id, row] of base) {
      const now = head.get(id);
      if (now !== undefined && now !== row) rewritten.push({ id, file });
    }
  }
  if (rewritten.length === 0) return [];
  let scan: Awaited<ReturnType<typeof readStoryTests>>;
  try {
    scan = await readStoryTests(root, config);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [storyTestScanIssue(root, `Story-tree test scan failed: ${reason}`)];
  }
  if (scan.truncated) {
    return [
      storyTestScanIssue(
        root,
        `Story-tree test scan stopped at the ${DEFAULT_GLOB_FILE_LIMIT} file limit; example-change coverage is incomplete`,
      ),
    ];
  }
  const changedExamples = new Set<string>();
  for (const test of scan.files) {
    if (!countsForExample(test) || !changed.has(normalizeRepoPath(path.relative(root, test.file))))
      continue;
    for (const id of parseCountedExampleAnnotations(test.content, test.file))
      changedExamples.add(id);
  }
  return rewritten
    .filter(({ id }) => !changedExamples.has(id))
    .map(({ id, file }) =>
      issue(
        "QFAI-DRIFT-002",
        `${id} changed in ${file}; no test annotating it changed`,
        "warning",
        file,
        "storyTree.exampleWithoutTestChange",
        [id],
      ),
    );
}

/** Each example row by EX ID, cells trimmed so a re-padded table reads as unchanged. */
function exampleRows(content: string): Map<string, string> {
  const rows = new Map<string, string>();
  for (const table of parseAllMarkdownTables(content)) {
    const idColumn = table.headers.indexOf("EX-ID");
    if (idColumn === -1) continue;
    for (const cells of table.rows) {
      const id = cells[idColumn] ?? "";
      if (/^EX-\d{4}-\d{4}-\d{2}$/.test(id)) rows.set(id, JSON.stringify(cells));
    }
  }
  return rows;
}

/** A row the branch adds takes the timestamp form; a four-digit ID is one the base already held. */
const FOUR_DIGIT_RECORD_ID = /^(?:DEC|OQ)-\d{4}$/;

function rowRewritten(file: string, message: string, id: string): Issue {
  return issue("QFAI-STORY-010", `${file}: ${message}`, "error", file, "storyTree.rowRewritten", [
    id,
  ]);
}

/**
 * Every decision row the base holds is in the head with the same three cells, matched by ID
 * across the complete register: a union merge interleaves appended rows, so the file and the place
 * a row sits in mean nothing. A row the branch adds takes the timestamp form.
 */
function decisionRowDrift(baseModel: StoryTreeModel, headModel: StoryTreeModel): Issue[] {
  const issues: Issue[] = [];
  const head = headModel.decisionOccurrences;
  for (const before of baseModel.decisionOccurrences) {
    const candidates = head.filter(({ row }) => row.id === before.row.id);
    const first = candidates[0];
    if (!first) {
      issues.push(
        rowRewritten(
          before.origin.path,
          `${before.row.id} row removed or its ID changed (base row ${before.origin.actualRow})`,
          before.row.id,
        ),
      );
      continue;
    }
    const same = ({ row }: (typeof head)[number]): boolean =>
      row.content === before.row.content && row.approach === before.row.approach;
    if (candidates.some(same)) continue;
    for (const cell of ["content", "approach"] as const) {
      if (first.row[cell] === before.row[cell]) continue;
      issues.push(
        rowRewritten(
          first.origin.path,
          `${before.row.id} ${cell} changed (row ${first.origin.actualRow})`,
          before.row.id,
        ),
      );
    }
  }
  const baseIds = new Set(baseModel.decisionOccurrences.map(({ row }) => row.id));
  for (const { row, origin } of head) {
    if (baseIds.has(row.id) || !FOUR_DIGIT_RECORD_ID.test(row.id)) continue;
    issues.push(
      rowRewritten(
        origin.path,
        `${row.id} is a row this branch adds with a four-digit ID; a new row takes DEC-yyyymmddhhMMss (row ${origin.actualRow})`,
        row.id,
      ),
    );
  }
  return issues;
}

/** The decision and question IDs the rows name in their Content or Approach. */
function namedRecordIds(rows: readonly RecordRow[]): Set<string> {
  const pattern = new RegExp(RECORD_ID_SOURCE, "g");
  return new Set(
    rows.flatMap((row) =>
      [...`${row.content} ${row.approach}`.matchAll(pattern)].map(([id]) => id),
    ),
  );
}

/**
 * A question row the base holds is kept with the same cells or deleted, never edited. A deleted
 * question is named by a decision row or a question row of the head; a question a decision row of
 * the base names does not come back; and a row the branch adds takes the timestamp form.
 */
function questionRowDrift(
  file: string,
  baseModel: StoryTreeModel,
  headModel: StoryTreeModel,
  base: readonly RecordRow[],
  head: readonly RecordRow[],
): Issue[] {
  const issues: Issue[] = [];
  const difference = diffRecordRows(base, head);
  for (const { id, cell } of difference.changed) {
    issues.push(rowRewritten(file, `${id} ${cell} changed`, id));
  }
  const namedInHead = namedRecordIds([...(headModel.decisions?.rows ?? []), ...head]);
  for (const { id } of difference.removed) {
    if (namedInHead.has(id)) continue;
    issues.push(
      rowRewritten(
        file,
        `${id} removed, and no decision row or question row of the head names it`,
        id,
      ),
    );
  }
  const settledAtBase = namedRecordIds(baseModel.decisions?.rows ?? []);
  for (const { id } of difference.added) {
    if (settledAtBase.has(id)) {
      issues.push(
        rowRewritten(file, `${id} is back, though a decision row the base holds names it`, id),
      );
    }
    if (FOUR_DIGIT_RECORD_ID.test(id)) {
      issues.push(
        rowRewritten(
          file,
          `${id} is a row this branch adds with a four-digit ID; a new row takes OQ-yyyymmddhhMMss`,
          id,
        ),
      );
    }
  }
  return issues;
}

/** The ID cell of a register row, once the line is unpadded. */
function registerRowId(line: string): string | undefined {
  return /^\|((?:DEC|OQ)-[^|]*)\|/.exec(line)?.[1];
}

/**
 * Whether the register file differs from its base only by rows whose IDs the base does not hold,
 * wherever they sit, and, where `deletable`, by deleted rows. Table padding is ignored.
 */
function onlyAddsRows(
  base: string,
  head: string,
  baseIds: ReadonlySet<string>,
  deletable: boolean,
): boolean {
  const headLines = unpadded(head);
  const headIds = new Set(headLines.map(registerRowId));
  const kept = headLines.filter((line) => {
    const id = registerRowId(line);
    return id === undefined || baseIds.has(id);
  });
  const expected = unpadded(base).filter((line) => {
    const id = registerRowId(line);
    return !deletable || id === undefined || headIds.has(id);
  });
  return kept.join("\n") === expected.join("\n");
}

const EXAMPLE_ROW = /^\|\s*EX-\d{4}-\d{4}-\d{2}\s*\|/;

/**
 * Whether the file differs from its base only by appended example rows. Table padding is
 * ignored, because a wider appended row makes the formatter re-pad every row.
 */
function onlyAppendsExamples(base: string, head: string): boolean {
  const baseLines = unpadded(base);
  const kept = new Set(baseLines);
  const headLines = unpadded(head);
  const remaining = headLines.filter((line) => kept.has(line) || !EXAMPLE_ROW.test(line));
  return remaining.join("\n") === baseLines.join("\n");
}

const EXAMPLE_ID = /^EX-\d{4}-\d{4}-\d{2}$/;

/**
 * Whether the contract differs from its base only by EX IDs added to the Examples cell, the
 * last cell, of business-rule rows it already holds. Table padding is ignored.
 */
function onlyCitesExamples(base: string, head: string): boolean {
  const baseLines = unpadded(base);
  const headLines = unpadded(head);
  if (baseLines.length !== headLines.length) return false;
  return baseLines.every(
    (line, index) => line === headLines[index] || onlyAddsExampleIds(line, headLines[index] ?? ""),
  );
}

function onlyAddsExampleIds(baseRow: string, headRow: string): boolean {
  const before = baseRow.split(/(?<!\\)\|/).map((cell) => cell.trim());
  const after = headRow.split(/(?<!\\)\|/).map((cell) => cell.trim());
  const last = before.length - 2;
  if (!/^BR-\d{4}-\d{4}$/.test(before[1] ?? "") || last < 2 || after.length !== before.length)
    return false;
  if (before.some((cell, index) => index !== last && cell !== after[index])) return false;
  const cited = (cell: string | undefined) => (cell ?? "").split(/,\s*/).filter(Boolean);
  const kept = cited(before[last]);
  const now = cited(after[last]);
  return (
    kept.every((id) => now.includes(id)) &&
    now.every((id) => kept.includes(id) || EXAMPLE_ID.test(id))
  );
}

/** Each line with a table row's cell padding and separator dash widths removed, nothing else. */
function unpadded(content: string): string[] {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line.startsWith("|") ? unpaddedRow(line) : line));
}

function unpaddedRow(line: string): string {
  return line
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/^[ \t]+|[ \t]+$/g, "").replace(/^(:?)-{3,}(:?)$/, "$1---$2"))
    .join("|");
}

/**
 * Whether the file reads the same as at the base once differences that cannot change its meaning
 * are set aside: a YAML file whose two sides both parse cleanly to deep-equal values and hold the
 * same comments, or a Markdown file with the same blocks. Any other file is a change.
 */
function unchangedContent(file: string, base: string, head: string): boolean {
  if (/\.ya?ml$/i.test(file)) return sameYaml(base, head);
  if (/\.md$/i.test(file)) return isDeepStrictEqual(markdownBlocks(base), markdownBlocks(head));
  return false;
}

/**
 * Comments carry identity, such as a contract's ID comment, so they must match in order. The
 * values must match read as YAML 1.2 and as YAML 1.1, where `017` and `yes` read differently.
 */
function sameYaml(base: string, head: string): boolean {
  if (!isDeepStrictEqual(yamlComments(base), yamlComments(head))) return false;
  return (["1.2", "1.1"] as const).every((version) => {
    const before = yamlValue(base, version);
    const after = yamlValue(head, version);
    return before !== null && after !== null && isDeepStrictEqual(before.value, after.value);
  });
}

function yamlComments(content: string): string[] {
  return [...new Lexer().lex(content)]
    .filter((token) => token.startsWith("#"))
    .map((token) => token.trim());
}

/** The parsed value, or null when the parser reports any error or warning, such as an unknown tag. */
function yamlValue(content: string, version: "1.1" | "1.2"): { value: unknown } | null {
  try {
    // BigInt keeps a large integer exact, and a Map keeps key types and complex keys.
    const document = parseDocument(content, { version, intAsBigInt: true });
    if (document.errors.length > 0 || document.warnings.length > 0) return null;
    return { value: document.toJS({ mapAsMap: true }) };
  } catch {
    // A document the parser cannot turn into a value has none to compare.
    return null;
  }
}

/** A line that opens a block of its own, so a line break before it is never a re-wrap. */
const OPENS_BLOCK =
  /^(?:[ \t]*$| {4}|\t| {0,3}(?:#|>|<|\[[^\]]+\]:|[-*+](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$)|=+[ \t]*$|-+[ \t]*$|([-*_])(?:[ \t]*\1){2,}[ \t]*$))|(?<!\\)\|/;

/**
 * A block the next line never continues: a heading, a list item, a quote, HTML, a link reference
 * definition, a rule or a setext underline, an indented line or a table row.
 */
const CLOSED_BLOCK =
  /^(?: {4}|\t| {0,3}(?:#|>|<|[-*+](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$)|\[[^\]]+\]:|=+[ \t]*$|-+[ \t]*$|([-*_])(?:[ \t]*\1){2,}[ \t]*$))|(?<!\\)\|/;

const BLANK = /^[ \t]*$/;

/** A comment or a `pre`, `script`, `style` or `textarea` element, which may hold blank lines. */
const RAW_HTML = /^ {0,3}<(?:(!--)|(pre|script|style|textarea)(?=[\s>]|$))/i;

/**
 * The Markdown as blocks, with only these differences removed: a leading byte order mark, line
 * endings, trailing spaces and tabs, table cell padding, and the line break and indentation
 * between two lines of one paragraph. Case, punctuation, inner spacing and the order of lines,
 * rows and items are kept, a line break that is a hard break is kept, and a fenced block, front
 * matter, a comment or raw element up to its close, or another HTML block up to the next blank
 * line, is kept line for line.
 */
function markdownBlocks(content: string): string[] {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const blocks: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  // Front matter closes on its own `---` line, a fence on a fence of its kind at least as long,
  // and a comment or raw element on the line holding its close.
  let closer: RegExp | null = /^---[ \t]*$/.test(lines[0] ?? "") ? /^---[ \t]*$/ : null;
  let html = false;
  let continues = false;
  let hardBreak = false;
  for (const [index, raw] of lines.entries()) {
    if (closer) {
      blocks.push(raw);
      if (index > 0 && closer.test(raw)) closer = null;
      continue;
    }
    if (html && !BLANK.test(raw)) {
      blocks.push(raw);
      continue;
    }
    html = false;
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(raw)?.[1];
    if (fence) {
      blocks.push(raw);
      closer = new RegExp(`^ {0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}[ \\t]*$`);
      continues = false;
      continue;
    }
    const verbatim = RAW_HTML.exec(raw);
    if (verbatim) {
      blocks.push(raw);
      const closing = verbatim[1] ? /-->/ : new RegExp(`</${verbatim[2] ?? ""}>`, "i");
      if (!closing.test(raw.slice(verbatim[0].length))) closer = closing;
      continues = false;
      continue;
    }
    if (/^ {0,3}</.test(raw)) {
      blocks.push(raw);
      html = true;
      continues = false;
      continue;
    }
    const line = raw.replace(/[ \t]+$/, "");
    if (continues && !OPENS_BLOCK.test(line)) {
      blocks.push(`${blocks.pop() ?? ""}${hardBreak ? "\n" : " "}${line.replace(/^[ \t]+/, "")}`);
    } else {
      blocks.push(line.startsWith("|") ? unpaddedRow(line) : line);
      continues = line !== "" && !CLOSED_BLOCK.test(line);
    }
    hardBreak = / {2}$|\\$/.test(raw);
  }
  return blocks;
}

const STATUS_HEADER = /^\|\s*ID\s*\|\s*Content\s*\|\s*Approach\s*\|\s*Status\s*\|?\s*$/m;

/**
 * A base written before the registers lost their Status column, read without that fourth cell, so
 * the commit that drops the column compares row by row. Remove once no supported base can still
 * hold a four-column register.
 */
function withoutStatusColumn(text: string): string {
  if (!STATUS_HEADER.test(text)) return text;
  return text
    .split("\n")
    .map((line) => {
      if (!line.startsWith("|")) return line;
      const cells = line.split(/(?<!\\)\|/);
      return [...cells.slice(0, 4), ...cells.slice(5)].join("|");
    })
    .join("\n");
}

/** A symlink or a submodule at the path has no text to compare, so it reads as a change. */
function regularFileOrNull(read: () => string | null): string | null {
  try {
    return read();
  } catch (error) {
    if (error instanceof NotRegularFileError) return null;
    throw error;
  }
}

/** The file in the working tree, or null when it is missing. */
async function readWorkingFile(root: string, file: string): Promise<string | null> {
  try {
    return await readFile(path.join(root, file), "utf8");
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }
}

async function readSafePath(file: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isEnoent(error)) return "";
    throw error;
  }
}

import { readFile } from "node:fs/promises";
import path from "node:path";

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
  type BaseComparison,
} from "../gitChanges.js";
import { parseAllMarkdownTables } from "../specPackParsers.js";
import { parseCountedExampleAnnotations, RECORD_ID_SOURCE } from "../storyTree/ids.js";
import { diffRecordRows, parseRecordTable, type RecordRow } from "../storyTree/tables.js";
import { buildStoryTreeModel, readStoryTreeModel, type StoryTreeModel } from "../storyTree/tree.js";
import type { Issue } from "../types.js";
import { countsForExample, readStoryTests, storyTestScanIssue } from "./storyTreeObligations.js";
import { issue } from "./utils.js";

/** Register rows compared with the base by ID, and examples changed without a test change. */
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
        "storyTree.registerNotCompared",
        [decisions],
      ),
    ];
  }
  if (profile === "drift") {
    const baseQuestions = parseRecordTable(
      withoutStatusColumn(
        regularFileOrNull(() => readFileAtBase(root, baseBranch, questions)) ?? "",
      ),
      "open-questions",
    ).rows;
    const headQuestions = parseRecordTable(
      await readSafePath(path.join(root, questions)),
      "open-questions",
    ).rows;
    issues.push(
      ...decisionRowDrift(baseModel, headModel),
      ...questionRowDrift(questions, baseModel, headModel, baseQuestions, headQuestions),
    );
  }
  issues.push(...(await examplesWithoutTestChange(root, config, changed, specs, baseBranch)));
  if (profile === "drift" && comparison.kind === "resolved") {
    issues.push(comparedAgainst(baseBranch, comparison, changed.size));
  }
  return issues;
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

async function readSafePath(file: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isEnoent(error)) return "";
    throw error;
  }
}

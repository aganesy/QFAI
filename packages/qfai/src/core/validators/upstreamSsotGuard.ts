import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import {
  getChangedFilesAgainstBase,
  gitStdout,
  normalizeRepoPath,
  readFileAtBase,
  readDecisionFilesAtRevision,
} from "../gitChanges.js";
import { parseAllMarkdownTables } from "../specPackParsers.js";
import { parseCountedExampleAnnotations } from "../storyTree/ids.js";
import {
  classifyRecordRow,
  diffRecordTables,
  diffRecordRows,
  type RecordRow,
} from "../storyTree/tables.js";
import { buildStoryTreeModel, readStoryTreeModel, type StoryTreeModel } from "../storyTree/tree.js";
import type { Issue } from "../types.js";
import { countsForExample, readStoryTests, storyTestScanIssue } from "./storyTreeObligations.js";
import { issue } from "./utils.js";

/** Story-tree protected files and append-only register rows. */
export async function validateStoryTreeDrift(
  root: string,
  config: QfaiConfig,
  profile: "tdd" | "drift",
): Promise<Issue[]> {
  const baseBranch = config.baseBranch ?? "origin/main";
  const changed = getChangedFilesAgainstBase(root, baseBranch);
  if (changed === null) return [];
  const specs = normalizeRepoPath(
    path.relative(root, path.resolve(root, config.paths.specsDir)),
  ).replace(/\/$/, "");
  const contracts = normalizeRepoPath(
    path.relative(root, path.resolve(root, config.paths.contractsDir)),
  ).replace(/\/$/, "");
  const decisions = path.posix.join(specs, "decisions.md");
  const questions = path.posix.join(specs, "open-questions.md");
  const issues: Issue[] = [];
  let baseModel: StoryTreeModel;
  let headModel: StoryTreeModel;
  try {
    const ancestors = gitStdout(root, ["merge-base", "--all", baseBranch, "HEAD"])
      ?.trim()
      .split(/\s+/);
    if (!ancestors || ancestors.length !== 1 || !ancestors[0])
      throw new Error("A unique readable common ancestor is required");
    const files = readDecisionFilesAtRevision(root, ancestors[0], specs);
    if (
      !files.has(decisions) &&
      ![...files.keys()].some((file) => file.startsWith(`${path.posix.join(specs, "decisions")}/`))
    )
      return [];
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
  const baseRows = baseModel.decisions?.rows ?? [];
  const authorised = new Map<string, string>();
  for (const row of rows) {
    const classified = classifyRecordRow(row);
    if (classified.kind !== "change-request" || !classified.inForce) continue;
    const inherited = baseRows.filter((candidate) => candidate.id === row.id);
    if (inherited.length > 1 || rows.filter((candidate) => candidate.id === row.id).length !== 1)
      continue;
    const baseRow = inherited[0];
    if (!authorisesThisBranch(row.status, baseRow?.status)) continue;
    if (baseRow && rewritesImmutableCell(baseRow, row)) continue;
    for (const file of classified.refs) authorised.set(normalizeRepoPath(file), row.id);
  }
  // Existing duplicate history remains an error, but it does not remove the existing
  // exemption for a uniquely identified request whose only changed cell is Status.
  const statusDifference = diffRecordRows(
    {
      rows: baseRows,
      errors: (baseModel.decisions?.errors ?? []).filter(
        (error) => !/declares .+ more than once/.test(error),
      ),
    },
    {
      rows,
      errors: (headModel.decisions?.errors ?? []).filter(
        (error) => !/declares .+ more than once/.test(error),
      ),
    },
    "decisions",
  );
  const onlyRequestStatus =
    statusDifference.onlyChangeRequestRows &&
    [
      ...statusDifference.changed.map(({ id }) => id),
      ...statusDifference.appended.map(({ id }) => id),
    ].every(
      (id) =>
        rows.filter((row) => row.id === id).length === 1 &&
        baseRows.filter((row) => row.id === id).length <= 1,
    );
  // A path-authorised relocation preserves every inherited physical row occurrence.
  const headRegisterFiles = headModel.decisionFiles.map((file) =>
    normalizeRepoPath(path.relative(root, file)),
  );
  const relocated =
    baseModel.decisionFiles.join("\n") !== headRegisterFiles.join("\n") ||
    baseModel.decisionOccurrences.some((before, index) => {
      const after = headModel.decisionOccurrences[index];
      return (
        after !== undefined &&
        (before.origin.path !== after.origin.path ||
          before.origin.actualRow !== after.origin.actualRow)
      );
    });
  if (relocated) {
    for (const [index, before] of baseModel.decisionOccurrences.entries()) {
      const after = headModel.decisionOccurrences[index];
      if (!after) {
        issues.push(
          issue(
            "QFAI-STORY-010",
            `${before.origin.path}:${before.origin.actualRow}: ${before.row.id} row removed (ID)`,
            "error",
            before.origin.path,
            "storyTree.rowRewritten",
            [before.row.id],
          ),
        );
        continue;
      }
      const statusOnly =
        before.row.id === after.row.id &&
        before.row.content === after.row.content &&
        before.row.approach === after.row.approach &&
        classifyRecordRow(after.row).kind === "change-request" &&
        baseRows.filter((row) => row.id === before.row.id).length === 1 &&
        rows.filter((row) => row.id === after.row.id).length === 1;
      if (
        before.raw === after.raw ||
        (statusOnly && rawWithoutStatusToken(before.raw) === rawWithoutStatusToken(after.raw))
      )
        continue;
      issues.push(
        issue(
          "QFAI-STORY-010",
          `${after.origin.path}:${after.origin.actualRow}: ${before.row.id} inherited raw row changed during relocation`,
          "error",
          after.origin.path,
          "storyTree.rowRewritten",
          [before.row.id],
        ),
      );
    }
  }
  if (profile === "drift") {
    for (const [file, kind] of [
      [decisions, "decisions"],
      [questions, "open-questions"],
    ] as const) {
      const base = readFileAtBase(root, baseBranch, file);
      if (base === null) continue;
      const head = await readSafePath(path.join(root, file));
      if (kind === "decisions") {
        for (const [index, before] of baseModel.decisionOccurrences.entries()) {
          const after = headModel.decisionOccurrences[index];
          if (!after) {
            // Relocation already diagnosed this missing occurrence under either profile.
            if (relocated) continue;
            issues.push(
              issue(
                "QFAI-STORY-010",
                `${before.origin.path}:${before.origin.actualRow}: ${before.row.id} row removed (ID)`,
                "error",
                before.origin.path,
                "storyTree.rowRewritten",
                [before.row.id],
              ),
            );
            continue;
          }
          for (const cell of ["id", "content", "approach"] as const) {
            if (before.row[cell] === after.row[cell]) continue;
            issues.push(
              issue(
                "QFAI-STORY-010",
                `${after.origin.path}:${after.origin.actualRow}: ${before.row.id} ${cell} changed`,
                "error",
                after.origin.path,
                "storyTree.rowRewritten",
                [before.row.id],
              ),
            );
          }
        }
        continue;
      }
      const difference = diffRecordTables(base, head, kind);
      for (const removed of difference.removed) {
        issues.push(
          issue(
            "QFAI-STORY-010",
            `${file}: ${removed.id} row removed (ID)`,
            "error",
            file,
            "storyTree.rowRewritten",
            [removed.id],
          ),
        );
      }
      for (const changedCell of difference.rewritten) {
        issues.push(
          issue(
            "QFAI-STORY-010",
            `${file}: ${changedCell.id} ${changedCell.cell} changed`,
            "error",
            file,
            "storyTree.rowRewritten",
            [changedCell.id],
          ),
        );
      }
    }
  }
  const registerFiles = new Set([
    ...baseModel.decisionFiles,
    ...headModel.decisionFiles.map((file) => normalizeRepoPath(path.relative(root, file))),
  ]);
  for (const file of changed) {
    const protectedPath =
      file.startsWith(`${path.posix.join(specs, "01_policy")}/`) ||
      file.startsWith(`${path.posix.join(specs, "02_business-flow")}/`) ||
      contracts === "" ||
      file.startsWith(`${contracts}/`) ||
      file === decisions ||
      file.startsWith(`${path.posix.join(specs, "decisions")}/`) ||
      file === questions;
    if (!protectedPath || authorised.has(file)) continue;
    if (
      registerFiles.has(file) &&
      onlyRequestStatus &&
      withoutChangeRequestRows(readFileAtBase(root, baseBranch, file) ?? "") ===
        withoutChangeRequestRows(await readSafePath(path.join(root, file)))
    )
      continue;
    if (file.endsWith("/03_Example.md") && (await onlyAppendsExamples(root, baseBranch, file)))
      continue;
    if (file.startsWith(`${contracts}/`) && (await onlyCitesExamples(root, baseBranch, file)))
      continue;
    issues.push(
      issue(
        "QFAI-DRIFT-001",
        `Upstream story-tree file changed without an in-force Change request row: ${file}`,
        "error",
        file,
        "storyTree.upstreamEdit",
        [file],
      ),
    );
  }
  issues.push(...(await examplesWithoutTestChange(root, config, changed, specs, baseBranch)));
  return issues;
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

/**
 * A request the base holds at DONE records a change already applied, so it authorises nothing
 * whatever Status it now holds. Otherwise a WIP row authorises, and a DONE row only while newly
 * appended or advanced from base WIP.
 */
function authorisesThisBranch(status: string, statusAtBase: string | undefined): boolean {
  if (statusAtBase === "DONE") return false;
  return status === "WIP" || statusAtBase === undefined || statusAtBase === "WIP";
}

/** A row the base holds keeps its Content and Approach, so a rewrite of either grants nothing. */
function rewritesImmutableCell(base: RecordRow, head: RecordRow): boolean {
  return base.content !== head.content || base.approach !== head.approach;
}

/** Replace only the final Status token; padding and the stored line ending remain evidence. */
function rawWithoutStatusToken(raw: string): string {
  return raw.replace(/(\|[ \t]*)([^|\r\n]*?\S)([ \t]*\|(?:\r\n|\n)?$)/, "$1<Status>$3");
}

function withoutChangeRequestRows(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\|\s*DEC-\d{4}\s*\|\s*Change request:/i.test(line))
    .join("\n");
}

const EXAMPLE_ROW = /^\|\s*EX-\d{4}-\d{4}-\d{2}\s*\|/;

/**
 * Whether the file differs from its base only by appended example rows. Table padding is
 * ignored, because a wider appended row makes the formatter re-pad every row.
 */
async function onlyAppendsExamples(
  root: string,
  baseBranch: string,
  file: string,
): Promise<boolean> {
  const base = readFileAtBase(root, baseBranch, file);
  if (base === null) return false;
  const baseLines = unpadded(base);
  const kept = new Set(baseLines);
  const headLines = unpadded(await readSafePath(path.join(root, file)));
  const remaining = headLines.filter((line) => kept.has(line) || !EXAMPLE_ROW.test(line));
  return remaining.join("\n") === baseLines.join("\n");
}

const EXAMPLE_ID = /^EX-\d{4}-\d{4}-\d{2}$/;

/**
 * Whether the contract differs from its base only by EX IDs added to the Examples cell, the
 * last cell, of business-rule rows it already holds. Table padding is ignored.
 */
async function onlyCitesExamples(root: string, baseBranch: string, file: string): Promise<boolean> {
  const base = readFileAtBase(root, baseBranch, file);
  if (base === null) return false;
  const baseLines = unpadded(base);
  const headLines = unpadded(await readSafePath(path.join(root, file)));
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
    .map((line) => {
      if (!line.startsWith("|")) return line;
      return line
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim().replace(/^(:?)-{3,}(:?)$/, "$1---$2"))
        .join("|");
    });
}

async function readSafePath(file: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

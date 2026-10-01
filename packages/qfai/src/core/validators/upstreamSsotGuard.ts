import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { getChangedFilesAgainstBase, normalizeRepoPath, readFileAtBase } from "../gitChanges.js";
import { parseStoryTestAnnotations } from "../storyTree/ids.js";
import { classifyRecordRow, diffRecordTables, parseRecordTable } from "../storyTree/tables.js";
import type { Issue } from "../types.js";
import { countsForExample, readStoryTests } from "./storyTreeObligations.js";
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
  const decisions = `${specs}/decisions.md`;
  const questions = `${specs}/open-questions.md`;
  const baseDecisions = readFileAtBase(root, baseBranch, decisions);
  if (baseDecisions === null) return [];

  const currentDecisions = await readSafePath(path.join(root, decisions));
  const rows = parseRecordTable(currentDecisions, "decisions").rows;
  const authorised = new Map<string, string>();
  for (const row of rows) {
    const classified = classifyRecordRow(row);
    if (classified.kind !== "change-request" || !classified.inForce) continue;
    for (const file of classified.refs) authorised.set(normalizeRepoPath(file), row.id);
  }
  const issues: Issue[] = [];
  if (profile === "drift") {
    for (const [file, kind] of [
      [decisions, "decisions"],
      [questions, "open-questions"],
    ] as const) {
      const base = readFileAtBase(root, baseBranch, file);
      if (base === null) continue;
      const head = await readSafePath(path.join(root, file));
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
  const decisionDiff = diffRecordTables(baseDecisions, currentDecisions, "decisions");
  for (const file of changed) {
    const protectedPath =
      file.startsWith(`${specs}/01_policy/`) ||
      file.startsWith(`${specs}/02_business-flow/`) ||
      file.startsWith(`${contracts}/`) ||
      file === decisions ||
      file === questions;
    if (!protectedPath || authorised.has(file)) continue;
    if (
      file === decisions &&
      decisionDiff.onlyChangeRequestRows &&
      withoutChangeRequestRows(baseDecisions) === withoutChangeRequestRows(currentDecisions)
    )
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
    if (!file.startsWith(`${specs}/02_business-flow/`) || !file.endsWith("/03_Example.md")) {
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
  const tests = (await readStoryTests(root, config)).files.filter(countsForExample);
  return rewritten
    .filter(({ id }) => {
      const annotating = tests.filter((test) =>
        parseStoryTestAnnotations(test.content).EX.includes(id),
      );
      return !annotating.some((test) =>
        changed.has(normalizeRepoPath(path.relative(root, test.file))),
      );
    })
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
  for (const line of content.split(/\r?\n/)) {
    const cells = line.split("|").map((cell) => cell.trim());
    const id = cells[1] ?? "";
    if (/^EX-\d{4}-\d{4}-\d{2}$/.test(id)) rows.set(id, cells.join("|"));
  }
  return rows;
}

function withoutChangeRequestRows(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\|\s*DEC-\d{4}\s*\|\s*Change request:/i.test(line))
    .join("\n");
}

async function readSafePath(file: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

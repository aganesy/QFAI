import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { getChangedFilesAgainstBase, normalizeRepoPath, readFileAtBase } from "../gitChanges.js";
import { classifyRecordRow, diffRecordTables, parseRecordTable } from "../storyTree/tables.js";
import type { Issue } from "../types.js";
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
  const baseStatus = new Map(
    parseRecordTable(baseDecisions, "decisions").rows.map((row) => [row.id, row.status]),
  );
  const authorised = new Map<string, string>();
  for (const row of rows) {
    const classified = classifyRecordRow(row);
    if (classified.kind !== "change-request" || !classified.inForce) continue;
    if (!authorisesThisBranch(row.status, baseStatus.get(row.id))) continue;
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
  return issues;
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

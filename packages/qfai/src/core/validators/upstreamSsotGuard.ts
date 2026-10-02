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
  return issues;
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

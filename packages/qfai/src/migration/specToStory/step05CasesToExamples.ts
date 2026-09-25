import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../../core/fs/errno.js";
import { escapeTableCell } from "../../core/specPackParsers.js";
import { storyPaths } from "../../core/storyTree/layout.js";
import { readIdMap } from "./idMap.js";
import { parseLegacyRecords, type LegacyKind } from "./legacyRecords.js";
import {
  MigrationInputError,
  type MigrationContext,
  type MigrationOperation,
  type MigrationStep,
} from "./harness.js";

const RETIRED = ".qfai/evidence/migration-spec-to-story/retired";
const OLD_AC = /AC-\d{4}-\d{4}/g;
const OLD_EX = /EX-\d{4}-\d{4}/g;

export type LegacyRow = { file: string; specId: string; cells: Record<string, string> };

export function repositoryRelative(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

export async function readMigrationInput(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error: unknown) {
    if (isEnoent(error)) return null;
    throw new MigrationInputError(`Cannot read migration input ${file}: ${String(error)}`);
  }
}

export async function legacyPackFiles(
  context: MigrationContext,
  name: string,
  retired = true,
): Promise<string[]> {
  const base = retired ? path.join(context.root, RETIRED) : context.specsDir;
  let entries;
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch (error: unknown) {
    if (isEnoent(error)) return [];
    throw new MigrationInputError(`Cannot list migration input ${base}: ${String(error)}`);
  }
  return entries
    .filter((entry) => entry.isDirectory() && /^spec-\d{4}$/.test(entry.name))
    .map((entry) => path.join(base, entry.name, name))
    .sort();
}

export async function readLegacyRows(
  context: MigrationContext,
  name: string,
  retired = true,
): Promise<LegacyRow[]> {
  const kind: LegacyKind =
    name === "06_Test-Cases.md" ? "TC" : name === "05_Examples.md" ? "EX" : "BR";
  const rows: LegacyRow[] = [];
  for (const file of await legacyPackFiles(context, name, retired)) {
    const content = await readMigrationInput(file);
    if (content === null) continue;
    const specId = path.basename(path.dirname(file));
    for (const record of parseLegacyRecords(content, kind, file)) {
      rows.push({ file, specId, cells: record.cells });
    }
  }
  return rows;
}

export function oldAcRefs(value: string): string[] {
  return [...new Set(value.match(OLD_AC) ?? [])];
}

export function oldExRefs(value: string): string[] {
  return [...new Set(value.match(OLD_EX) ?? [])];
}

export function noReference(value: string): boolean {
  return value.trim() === "" || value.trim() === "—" || value.trim() === "-";
}

export function storyExampleFile(context: MigrationContext, mappedId: string): string {
  const match = /^EX-(\d{4})-(\d{4})-\d{2}$/.exec(mappedId);
  if (!match) throw new MigrationInputError(`Invalid mapped example ID: ${mappedId}`);
  const flow = `BF-${match[1]}`;
  const story = `US-${match[1]}-${match[2]}`;
  return storyPaths(context.specsDir, flow, story).files[2] ?? "";
}

export function insertExampleRows(content: string, rows: readonly string[], file: string): string {
  if (rows.length === 0) return content;
  const lines = content.split("\n");
  const header = lines.findIndex((line) => /^\|\s*EX-ID\s*\|\s*AC-Ref\s*\|/.test(line));
  if (header < 0 || !/^\|\s*[-:| ]+\|/.test(lines[header + 1] ?? "")) {
    throw new MigrationInputError(`Cannot find example table in ${file}`);
  }
  let end = header + 2;
  while (lines[end]?.startsWith("|")) end += 1;
  lines.splice(end, 0, ...rows);
  return lines.join("\n");
}

export const step05: MigrationStep = {
  number: 5,
  writeSet: ["qfai", "specs"],
  sections: ["Cases to examples", "For a person"],
  async plan(context) {
    const map = await readIdMap(context.root);
    if (!map) return { operations: [] };
    const cases = await readLegacyRows(context, "06_Test-Cases.md");
    const oldExamples = await readLegacyRows(context, "05_Examples.md");
    const exampleIds = new Set(
      oldExamples.map((row) => `${row.specId}:${row.cells["EX-ID"] ?? ""}`),
    );
    const forAPerson: string[] = [];
    const casesToExamples: string[] = [];
    const additions = new Map<string, string[]>();
    for (const row of cases) {
      const oldId = row.cells["TC-ID"] ?? "";
      const oldExample = row.cells["EX-Ref"] ?? "";
      const exampleRefs = oldExRefs(oldExample);
      if (
        !noReference(oldExample) &&
        !/^\s*EX-\d{4}-\d{4}(?:\s*,\s*EX-\d{4}-\d{4})*\s*$/.test(oldExample)
      ) {
        forAPerson.push(
          `${repositoryRelative(context.root, row.file)}: ${oldId}: invalid EX-Ref ${oldExample}`,
        );
        continue;
      }
      if (exampleRefs.length > 1) {
        forAPerson.push(
          `${repositoryRelative(context.root, row.file)}: ${oldId}: several EX-Ref values need one annotation target`,
        );
        continue;
      }
      const missingExample =
        !noReference(oldExample) && !exampleIds.has(`${row.specId}:${oldExample}`);
      if (!noReference(oldExample) && !missingExample) continue;
      const refs = oldAcRefs(row.cells["AC-Refs"] ?? "");
      const mappedAc = refs.length === 1 ? map.ids[row.specId]?.[refs[0] ?? ""] : undefined;
      const mappedEx = map.ids[row.specId]?.[oldId];
      if (refs.length !== 1 || !mappedAc || !mappedEx) {
        forAPerson.push(
          `${repositoryRelative(context.root, row.file)}: ${oldId}: ${refs.length === 0 ? "no criterion" : refs.length > 1 ? "several criteria" : missingExample ? `EX-Ref ${oldExample} has no example row or new ID mapping` : "missing ID mapping"}`,
        );
        continue;
      }
      if (!(row.cells.Steps ?? "").trim() || !(row.cells.Expected ?? "").trim()) {
        forAPerson.push(
          `${repositoryRelative(context.root, row.file)}: ${oldId}: no convertible steps or expected result`,
        );
        continue;
      }
      const file = storyExampleFile(context, mappedEx);
      const content = await readMigrationInput(file);
      if (content === null) {
        forAPerson.push(
          `${repositoryRelative(context.root, row.file)}: ${oldId}: story example file is missing`,
        );
        continue;
      }
      casesToExamples.push(`${oldId} → ${mappedEx}`);
      if (new RegExp(`\\|\\s*${mappedEx}\\s*\\|`).test(content)) continue;
      const cells = [mappedEx, mappedAc, row.cells.Steps ?? "", row.cells.Expected ?? ""];
      const rendered = `| ${cells.map(escapeTableCell).join(" | ")} |`;
      additions.set(file, [...(additions.get(file) ?? []), rendered]);
    }
    const operations: MigrationOperation[] = [];
    for (const [file, rows] of additions) {
      const current = await readMigrationInput(file);
      if (current === null) continue;
      operations.push({
        kind: "write",
        target: repositoryRelative(context.root, file),
        content: insertExampleRows(current, rows, file),
      });
    }
    return { operations, forAPerson, casesToExamples };
  },
};

import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../../core/fs/errno.js";
import { extractH2Sections, parseHeadings } from "../../core/parse/markdown.js";
import { escapeTableCell, parseAllMarkdownTables } from "../../core/specPackParsers.js";
import { parseRecordTable } from "../../core/storyTree/tables.js";
import {
  MigrationInputError,
  type MigrationContext,
  type MigrationOperation,
  type MigrationStep,
} from "./harness.js";

type OldRecord = {
  kind: "decision" | "question";
  source: string;
  oldId: string;
  summary: string;
  approach: string;
  status?: string | undefined;
  successor?: string | undefined;
  prefix?: string | undefined;
};

const LEGACY_HEADING_ID = /^((?:DR|OQ)-\d+(?:-[A-Za-z0-9]+)*)(?=[:\s]|$)/;

export function mapDecisionStatus(status?: string, successorId?: string): string {
  switch (status?.trim().toLowerCase()) {
    case undefined:
    case "accepted":
    case "approved":
      return "DONE";
    case "proposed":
      return "TODO";
    case "rejected":
      return "REJECTED";
    case "re-open":
      return "WIP";
    case "superseded":
      return successorId ? `SUPERSEDED (by ${successorId})` : "TODO";
    default:
      return "TODO";
  }
}

export function mapQuestionStatus(status?: string): string {
  switch (status?.trim().toLowerCase()) {
    case "resolved":
      return "DONE";
    case "deferred":
      return "DEFERRED";
    default:
      return "TODO";
  }
}

function relative(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

async function readIfPresent(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error: unknown) {
    if (isEnoent(error)) return null;
    throw new MigrationInputError(
      `${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function listDirs(parent: string): Promise<string[]> {
  try {
    return (await readdir(parent, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error: unknown) {
    if (isEnoent(error)) return [];
    throw new MigrationInputError(
      `${parent}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function markdownEntries(text: string, source: string, kind: "decision" | "question"): OldRecord[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const headings = parseHeadings(text).filter(
    (heading) =>
      (heading.level === 2 || heading.level === 3) && LEGACY_HEADING_ID.test(heading.title),
  );
  return headings.map((heading, index) => {
    const next = headings[index + 1];
    const body = lines.slice(heading.line, (next?.line ?? lines.length + 1) - 1).join("\n");
    const oldId = LEGACY_HEADING_ID.exec(heading.title)?.[1] ?? "";
    const status = /^- Status:\s*(.+)$/im.exec(body)?.[1]?.trim();
    const successor = /^- (?:Superseded by|Successor):\s*`?([^\s`]+)`?/im.exec(body)?.[1];
    return {
      kind,
      source,
      oldId,
      summary: heading.title.replace(`${oldId}:`, "").trim(),
      approach: body.replace(/\s+/g, " ").trim(),
      status,
      successor,
    };
  });
}

function questionRows(text: string, source: string): OldRecord[] {
  const section = extractH2Sections(text).get("Open Questions");
  const table = parseAllMarkdownTables(section?.body ?? "").find((candidate) =>
    candidate.headers.includes("OQ-ID"),
  );
  if (!table) return markdownEntries(text, source, "question");
  const id = table.headers.indexOf("OQ-ID");
  const question = table.headers.indexOf("Question");
  const status = table.headers.indexOf("Status");
  const notes = table.headers.indexOf("Notes");
  return table.rows
    .filter((row) => /^OQ-\d+(?:-\d+)?$/.test(row[id] ?? ""))
    .map((row) => ({
      kind: "question",
      source,
      oldId: row[id] ?? "",
      summary: row[question] ?? "",
      approach: row[notes] ?? "",
      status: row[status],
      prefix: row[status]?.toLowerCase() === "unadjudicated" ? "Unadjudicated: " : undefined,
    }));
}

function deltaEntries(text: string, source: string): OldRecord[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const headings = parseHeadings(text).filter(
    (heading) => heading.level === 3 && /^DL-\d{4}\b/.test(heading.title),
  );
  const records: OldRecord[] = headings.map((heading, index) => {
    const next = headings[index + 1];
    const body = lines.slice(heading.line, (next?.line ?? lines.length + 1) - 1).join("\n");
    const oldId = /^DL-\d{4}/.exec(heading.title)?.[0] ?? "";
    const notes = /^notes:\s*(.+)$/m.exec(body)?.[1]?.trim() ?? heading.title;
    return {
      kind: "decision",
      source,
      oldId,
      summary: notes,
      approach: `Delta record from ${source}`,
      status: "accepted",
    };
  });
  let triageRow = 0;
  for (const [title, section] of extractH2Sections(text)) {
    if (!title.startsWith("Triage")) continue;
    for (const table of parseAllMarkdownTables(section.body)) {
      const subjectIndex = table.headers.indexOf("Subject");
      const operationIndex = table.headers.indexOf("Operation");
      if (subjectIndex < 0 || operationIndex < 0) continue;
      for (const row of table.rows) {
        const operation = row[operationIndex] ?? "";
        if (!/^(?:CREATE|UPDATE|REMOVE|SPLIT|MERGE|RETIRE)$/i.test(operation)) continue;
        triageRow += 1;
        const oldId = `Triage-${String(triageRow).padStart(4, "0")}`;
        records.push({
          kind: "decision",
          source,
          oldId,
          summary: `${operation}: ${row[subjectIndex] ?? ""}`,
          approach: row[table.headers.indexOf("Rationale")] ?? "",
          status: "accepted",
        });
      }
    }
  }
  return records;
}

function changeRequest(text: string, source: string): OldRecord | null {
  const oldId = /^- ID:\s*`?([^\s`]+)`?/m.exec(text)?.[1];
  if (!oldId) return null;
  const impact = extractH2Sections(text).get("Impact scope")?.body ?? "";
  const paths = [...impact.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
  const status = /^- Status:\s*`?([^\s`]+)`?/m.exec(text)?.[1];
  const title = /^- Title:\s*(.+)$/m.exec(text)?.[1] ?? oldId;
  return {
    kind: "decision",
    source,
    oldId,
    summary: paths.length > 0 ? paths.join(", ") : title,
    approach: `${source}: ${title}`,
    status,
    prefix: "Change request: ",
  };
}

function retiredPack(text: string, source: string, pack: string): OldRecord | null {
  const status = /^- Status:\s*(superseded|deprecated|removed)\s*$/im.exec(text)?.[1];
  if (!status) return null;
  const successor = /^- (?:Superseded by|Successor):\s*(.+)$/im.exec(text)?.[1]?.trim();
  return {
    kind: "decision",
    source,
    oldId: pack,
    summary: `${pack} is ${status.toLowerCase()}${successor ? ` by ${successor}` : ""}`,
    approach: `Retired pack: ${source}`,
    status: "accepted",
  };
}

function nextRecordId(kind: "DEC" | "OQ", existing: readonly string[], offset: number): string {
  const largest = existing.reduce((max, id) => {
    const match = new RegExp(`^${kind}-(\\d{4})$`).exec(id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${kind}-${String(largest + offset + 1).padStart(4, "0")}`;
}

function appendRows(text: string, rows: readonly string[]): string {
  if (rows.length === 0) return text;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const header = lines.findIndex((line) => /^\|\s*ID\s*\|\s*Content\s*\|/.test(line));
  if (header < 0) throw new MigrationInputError("Record table is missing its header");
  let end = header + 2;
  while (end < lines.length && /^\s*\|/.test(lines[end] ?? "")) end += 1;
  lines.splice(end, 0, ...rows);
  return `${lines.join("\n").trimEnd()}\n`;
}

function origin(record: OldRecord): string {
  return `${record.source}#${record.oldId}`;
}

export const step02: MigrationStep = {
  number: 2,
  writeSet: ["qfai", "specs"],
  sections: ["For a person"],
  async plan(context: MigrationContext) {
    const operations: MigrationOperation[] = [];
    const forAPerson: string[] = [];
    const sources: Array<{ source: string; archive: string; text: string }> = [];
    const specsRelative = relative(context.root, context.specsDir);
    const candidates: Array<{ source: string; archive: string }> = [];
    const records: OldRecord[] = [];
    for (const pack of await listDirs(context.specsDir)) {
      if (!/^spec-\d{4}$/.test(pack)) continue;
      const specSource = `${specsRelative}/${pack}/01_Spec.md`;
      const specText = await readIfPresent(path.join(context.root, specSource));
      if (specText !== null) {
        const record = retiredPack(specText, specSource, pack);
        if (record) records.push(record);
      }
      for (const file of ["07_Decisions.md", "08_Open-questions.md", "09_delta.md"]) {
        candidates.push({
          source: `${specsRelative}/${pack}/${file}`,
          archive: `.qfai/evidence/migration-spec-to-story/retired/${pack}/${file}`,
        });
      }
    }
    for (const file of ["08_Decisions.md", "09_Open-questions.md", "10_delta.md"]) {
      candidates.push({
        source: `${specsRelative}/_policies/${file}`,
        archive: `.qfai/evidence/migration-spec-to-story/retired/_policies/${file}`,
      });
    }
    for (const file of await listChangeRequests(path.join(context.root, ".qfai/decisions"))) {
      candidates.push({
        source: `.qfai/decisions/${file}`,
        archive: `.qfai/evidence/migration-spec-to-story/retired/decisions/${file}`,
      });
    }
    for (const candidate of candidates) {
      const text = await readIfPresent(path.join(context.root, candidate.source));
      if (text === null) continue;
      sources.push({ ...candidate, text });
      if (
        candidate.source.endsWith("07_Decisions.md") ||
        candidate.source.endsWith("08_Decisions.md")
      ) {
        records.push(...markdownEntries(text, candidate.source, "decision"));
      } else if (candidate.source.endsWith("Open-questions.md")) {
        records.push(...questionRows(text, candidate.source));
      } else if (candidate.source.endsWith("delta.md")) {
        records.push(...deltaEntries(text, candidate.source));
      } else {
        const request = changeRequest(text, candidate.source);
        if (request) records.push(request);
      }
    }
    const origins = new Set<string>();
    for (const record of records) {
      const key = `${record.kind}:${origin(record)}`;
      if (origins.has(key)) throw new MigrationInputError(`Duplicate migration record: ${key}`);
      origins.add(key);
    }
    const decisionsTarget = `${specsRelative}/decisions.md`;
    const questionsTarget = `${specsRelative}/open-questions.md`;
    const decisionsOriginal =
      (await readIfPresent(path.join(context.root, decisionsTarget))) ??
      "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
    const questionsOriginal =
      (await readIfPresent(path.join(context.root, questionsTarget))) ??
      "# Open Questions\n\n## Open Questions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
    const existingDecisions = parseRecordTable(decisionsOriginal, "decisions");
    const existingQuestions = parseRecordTable(questionsOriginal, "open-questions");
    if (existingDecisions.errors.length > 0 || existingQuestions.errors.length > 0) {
      const details = [...existingDecisions.errors, ...existingQuestions.errors].slice(0, 4);
      throw new MigrationInputError(
        `Cannot merge into invalid decisions.md or open-questions.md: ${details.join("; ")}`,
      );
    }
    const decided = records.filter(
      (record) =>
        record.kind === "decision" &&
        !existingDecisions.rows.some((row) => row.content.includes(origin(record))),
    );
    const questioned = records.filter(
      (record) =>
        record.kind === "question" &&
        !existingQuestions.rows.some((row) => row.content.includes(origin(record))),
    );
    const decisionIds = new Map(
      decided.map((record, index) => [
        origin(record),
        nextRecordId(
          "DEC",
          existingDecisions.rows.map((row) => row.id),
          index,
        ),
      ]),
    );
    const decisionRows = decided.map((record) => {
      const newId = decisionIds.get(origin(record)) ?? "";
      const sameSourceSuccessor = decided.find(
        (candidate) =>
          candidate.oldId === record.successor &&
          path.dirname(candidate.source) === path.dirname(record.source),
      );
      const globalSuccessors = decided.filter((candidate) => candidate.oldId === record.successor);
      const successor =
        sameSourceSuccessor ?? (globalSuccessors.length === 1 ? globalSuccessors[0] : undefined);
      const successorId = successor
        ? decisionIds.get(origin(successor))
        : existingDecisions.rows.find((row) => row.content.includes(`#${record.successor}:`))?.id;
      if (record.status?.toLowerCase() === "superseded" && !successorId) {
        forAPerson.push(`${record.source}: ${record.oldId} has no migrated successor`);
      }
      const content = record.prefix
        ? `${record.prefix}${record.summary} (${origin(record)})`
        : `${origin(record)}: ${record.summary}`;
      return `| ${newId} | ${escapeTableCell(content)} | ${escapeTableCell(record.approach)} | ${mapDecisionStatus(record.status, successorId)} |`;
    });
    const questionRowsToWrite = questioned.map((record, index) => {
      const id = nextRecordId(
        "OQ",
        existingQuestions.rows.map((row) => row.id),
        index,
      );
      const content = `${record.prefix ?? ""}${origin(record)}: ${record.summary}`;
      return `| ${id} | ${escapeTableCell(content)} | ${escapeTableCell(record.approach)} | ${mapQuestionStatus(record.status)} |`;
    });
    if (decisionRows.length > 0) {
      operations.push({
        kind: "write",
        target: decisionsTarget,
        content: appendRows(decisionsOriginal, decisionRows),
      });
    }
    if (questionRowsToWrite.length > 0) {
      operations.push({
        kind: "write",
        target: questionsTarget,
        content: appendRows(questionsOriginal, questionRowsToWrite),
      });
    }
    for (const source of sources) {
      operations.push({ kind: "move", source: source.source, target: source.archive });
    }
    const decisionsDir = path.join(context.root, ".qfai/decisions");
    const remainingDecisions = await listEntries(decisionsDir);
    if (
      (await directoryExists(decisionsDir)) &&
      remainingDecisions.every((entry) => /^CR-.*\.md$/.test(entry))
    ) {
      operations.push({ kind: "remove-empty-directory", target: ".qfai/decisions" });
    }
    return { operations, forAPerson };
  },
};

async function listChangeRequests(dir: string): Promise<string[]> {
  return (await listEntries(dir)).filter((entry) => /^CR-.*\.md$/.test(entry));
}

async function listEntries(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.sort();
  } catch (error: unknown) {
    if (isEnoent(error)) return [];
    throw new MigrationInputError(
      `${dir}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function directoryExists(dir: string): Promise<boolean> {
  try {
    return (await lstat(dir)).isDirectory();
  } catch (error: unknown) {
    if (isEnoent(error)) return false;
    throw new MigrationInputError(
      `${dir}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

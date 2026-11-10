import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../../core/fs/errno.js";
import { extractH2Sections, parseHeadings } from "../../core/parse/markdown.js";
import { escapeTableCell, parseAllMarkdownTables } from "../../core/specPackParsers.js";
import { parseRecordTable } from "../../core/storyTree/tables.js";
import { readStoryTreeModel } from "../../core/storyTree/tree.js";
import {
  MigrationInputError,
  type MigrationContext,
  type MigrationOperation,
  type MigrationStep,
} from "./harness.js";

type OldRecord = {
  kind: "decision" | "question" | "change-request";
  source: string;
  oldId: string;
  summary: string;
  approach: string;
  status?: string | undefined;
  successor?: string | undefined;
};

/** A migrated record placed in one register, before its ID is assigned. */
type Placed = {
  record: OldRecord;
  register: "decisions" | "open-questions";
  content: string;
  approach: string;
};

const LEGACY_HEADING_ID = /^((?:DR|OQ)-\d+(?:-[A-Za-z0-9]+)*)(?=[:\s]|$)/;
const TIMESTAMP_ID = /^(?:DEC|OQ)-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;

/**
 * Where a record goes and what its row says. The decision register holds
 * decisions only, so a record nobody has decided becomes a question row.
 */
function place(record: OldRecord): Placed {
  const status = record.status?.trim().toLowerCase();
  const from = origin(record);
  const decision = (content: string, approach: string): Placed => ({
    record,
    register: "decisions",
    content,
    approach,
  });
  const question = (content: string, approach: string): Placed => ({
    record,
    register: "open-questions",
    content,
    approach,
  });
  // A keyword row's Content holds only its keyword and option, so its origin begins the Approach.
  const originFirst = `${from}: ${record.approach}`;
  // An old change request is a decision like any other: approved is decided, rejected declined.
  if (record.kind === "change-request") {
    if (status === "approved") return decision(`${from}: ${record.summary}`, record.approach);
    if (status === "rejected") return decision(`Declined: ${record.summary}`, originFirst);
    return question(`${from}: ${record.summary}`, record.approach);
  }
  if (record.kind === "question") {
    if (status === "resolved" || status === "superseded")
      return decision(
        `${from}: ${record.summary} Answer: ${record.approach || "not recorded"}`,
        `The question was ${status} in ${record.source}.`,
      );
    if (status === "unadjudicated")
      return question(`Unadjudicated: ${record.summary}`, `${from}: ${record.approach}`);
    if (status === "deferred")
      return question(
        `${from}: ${record.summary}`,
        `Deferred; next decision point: ${record.approach || "not recorded"}`,
      );
    return question(`${from}: ${record.summary}`, record.approach);
  }
  if (status === "rejected") return decision(`Declined: ${record.summary}`, originFirst);
  const content = `${from}: ${record.summary}`;
  if (status === undefined || status === "accepted" || status === "superseded")
    return decision(content, record.approach);
  return question(content, record.approach);
}

/** The UTC time a timestamp ID names, or null for a legacy ID. */
function timestampOf(id: string): number | null {
  const parts = TIMESTAMP_ID.exec(id)?.slice(1).map(Number);
  if (!parts) return null;
  const [year = 0, month = 1, day = 1, hour = 0, minute = 0, second = 0] = parts;
  return Date.UTC(year, month - 1, day, hour, minute, second);
}

function formatTimestamp(time: number): string {
  return new Date(time).toISOString().replace(/\D/g, "").slice(0, 14);
}

/**
 * `count` IDs for one register: from the run's start, or one second after the
 * highest timestamp ID the register already holds when that is later, one
 * second apart.
 */
function timestampIds(
  prefix: "DEC" | "OQ",
  existing: readonly string[],
  runStart: number,
  count: number,
): string[] {
  const first = existing.reduce(
    (start, id) => {
      const time = id.startsWith(`${prefix}-`) ? timestampOf(id) : null;
      return time === null ? start : Math.max(start, time + 1000);
    },
    Math.floor(runStart / 1000) * 1000,
  );
  return Array.from(
    { length: count },
    (_, index) => `${prefix}-${formatTimestamp(first + index * 1000)}`,
  );
}

/** Whether a row names the origin, and not merely a longer origin it prefixes. */
function mentionsOrigin(text: string, from: string): boolean {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}(?![A-Za-z0-9-])`).test(text);
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
    kind: "change-request",
    source,
    oldId,
    summary: paths.length > 0 ? paths.join(", ") : title,
    approach: `${source}: ${title}`,
    status,
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

function appendRows(text: string, rows: readonly string[]): string {
  if (rows.length === 0) return text;
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const header = lines.findIndex((line) => /^\|\s*ID\s*\|\s*Content\s*\|/.test(line));
  if (header < 0) throw new MigrationInputError("Record table is missing its header");
  let end = header + 2;
  while (end < lines.length && /^\s*\|/.test(lines[end] ?? "")) end += 1;
  const prefix = lines.slice(0, end).join("");
  const ending = (lines[end - 1] ?? "").endsWith("\r\n") ? "\r\n" : "\n";
  return `${prefix}${prefix.endsWith("\n") ? "" : ending}${rows.join(ending)}${ending}${lines.slice(end).join("")}`;
}

function origin(record: OldRecord): string {
  return `${record.source}#${record.oldId}`;
}

type Candidate = { source: string };

/** Every file step 2 merges and then deletes, whether or not it exists. */
async function mergeCandidates(context: MigrationContext): Promise<Candidate[]> {
  const specsRelative = relative(context.root, context.specsDir);
  const candidates: Candidate[] = [];
  for (const pack of await listDirs(context.specsDir)) {
    if (!/^spec-\d{4}$/.test(pack)) continue;
    for (const file of ["07_Decisions.md", "08_Open-questions.md", "09_delta.md"]) {
      candidates.push({ source: `${specsRelative}/${pack}/${file}` });
    }
  }
  for (const file of ["08_Decisions.md", "09_Open-questions.md", "10_delta.md"]) {
    candidates.push({ source: `${specsRelative}/_policies/${file}` });
  }
  for (const file of await listChangeRequests(path.join(context.root, ".qfai/decisions"))) {
    candidates.push({ source: `.qfai/decisions/${file}` });
  }
  return candidates;
}

/** The decision record each retired pack's `01_Spec.md` becomes. */
async function retiredPackRecords(context: MigrationContext): Promise<OldRecord[]> {
  const specsRelative = relative(context.root, context.specsDir);
  const records: OldRecord[] = [];
  for (const pack of await listDirs(context.specsDir)) {
    if (!/^spec-\d{4}$/.test(pack)) continue;
    const specSource = `${specsRelative}/${pack}/01_Spec.md`;
    const specText = await readIfPresent(path.join(context.root, specSource));
    const record = specText === null ? null : retiredPack(specText, specSource, pack);
    if (record) records.push(record);
  }
  return records;
}

/**
 * The first input step 2 has not merged, or null once it has run: a source
 * file it merges, or a retired pack with no decision row yet. A later step
 * moves those packs' files away, and step 2 could no longer read them.
 */
export async function pendingMergeInput(context: MigrationContext): Promise<string | null> {
  for (const candidate of await mergeCandidates(context)) {
    if ((await readIfPresent(path.join(context.root, candidate.source))) !== null) {
      return candidate.source;
    }
  }
  const tree = await readStoryTreeModel(context.root, {
    ...context.config,
    paths: {
      ...context.config.paths,
      specsDir: context.specsDir,
      contractsDir: context.contractsDir,
    },
  });
  if (!tree.decisionRegisterComplete)
    throw new MigrationInputError(
      `The complete decision register is unavailable: ${tree.decisionRegisterErrors
        .map(({ file, message }) => `${file}: ${message}`)
        .join("; ")}`,
    );
  const decisions = (tree.decisions?.rows ?? [])
    .map((row) => `${row.content} ${row.approach}`)
    .join("\n");
  const unmerged = (await retiredPackRecords(context)).find(
    (record) => !mentionsOrigin(decisions, origin(record)),
  );
  return unmerged?.source ?? null;
}

export const step02: MigrationStep = {
  number: 2,
  writeSet: ["qfai", "specs"],
  sections: ["For a person"],
  async plan(context: MigrationContext) {
    const operations: MigrationOperation[] = [];
    const forAPerson: string[] = [];
    const sources: Array<{ source: string; text: string }> = [];
    const specsRelative = relative(context.root, context.specsDir);
    const records = await retiredPackRecords(context);
    for (const candidate of await mergeCandidates(context)) {
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
    const runStart = Date.now();
    const decisionsTarget = `${specsRelative}/decisions.md`;
    const questionsTarget = `${specsRelative}/open-questions.md`;
    const decisionsOriginal =
      (await readIfPresent(path.join(context.root, decisionsTarget))) ??
      "# Decisions\n\n## Decisions\n\n| ID | Content | Approach |\n| --- | --- | --- |\n";
    const questionsOriginal =
      (await readIfPresent(path.join(context.root, questionsTarget))) ??
      "# Open Questions\n\n## Open Questions\n\n| ID | Content | Approach |\n| --- | --- | --- |\n";
    const tree = await readStoryTreeModel(context.root, {
      ...context.config,
      paths: {
        ...context.config.paths,
        specsDir: context.specsDir,
        contractsDir: context.contractsDir,
      },
    });
    if (!tree.decisionRegisterComplete)
      throw new MigrationInputError(
        `The complete decision register is unavailable: ${tree.decisionRegisterErrors
          .map(({ file, message }) => `${file}: ${message}`)
          .join("; ")}`,
      );
    const existingDecisions = tree.decisions ?? parseRecordTable(decisionsOriginal, "decisions");
    const existingQuestions = parseRecordTable(questionsOriginal, "open-questions");
    if (existingDecisions.errors.length > 0 || existingQuestions.errors.length > 0) {
      const details = [...existingDecisions.errors, ...existingQuestions.errors].slice(0, 4);
      throw new MigrationInputError(
        `Cannot merge into invalid decisions.md or open-questions.md: ${details.join("; ")}`,
      );
    }
    // A record an earlier run wrote names its origin in either register, in Content or Approach.
    const written = [...existingDecisions.rows, ...existingQuestions.rows]
      .map((row) => `${row.content} ${row.approach}`)
      .join("\n");
    const placed = records
      .filter((record) => !mentionsOrigin(written, origin(record)))
      .map((record) => place(record));
    const newDecisions = placed.filter((entry) => entry.register === "decisions");
    const newQuestions = placed.filter((entry) => entry.register === "open-questions");
    const decisionIds = timestampIds(
      "DEC",
      existingDecisions.rows.map((row) => row.id),
      runStart,
      newDecisions.length,
    );
    const questionIds = timestampIds(
      "OQ",
      existingQuestions.rows.map((row) => row.id),
      runStart,
      newQuestions.length,
    );
    const idOf = new Map(
      newDecisions.map((entry, index) => [origin(entry.record), decisionIds[index] ?? ""]),
    );
    // What a supersession adds to the front of a row's Approach, by origin.
    const lead = new Map<string, string>();
    for (const { record } of newDecisions) {
      if (record.kind !== "decision" || record.status?.trim().toLowerCase() !== "superseded")
        continue;
      const candidates = newDecisions
        .map((entry) => entry.record)
        .filter(
          (candidate) => candidate.kind === "decision" && candidate.oldId === record.successor,
        );
      const successor =
        candidates.find(
          (candidate) => path.dirname(candidate.source) === path.dirname(record.source),
        ) ?? (candidates.length === 1 ? candidates[0] : undefined);
      if (successor) {
        const key = origin(successor);
        lead.set(key, `${lead.get(key) ?? ""}Supersedes ${idOf.get(origin(record)) ?? ""}. `);
        continue;
      }
      const earlier =
        record.successor === undefined
          ? undefined
          : existingDecisions.rows.find((row) =>
              `${row.content} ${row.approach}`.includes(`#${record.successor}:`),
            );
      if (earlier) lead.set(origin(record), `Superseded by ${earlier.id}. `);
      else forAPerson.push(`${record.source}: ${record.oldId} has no migrated successor`);
    }
    const render = (id: string, entry: Placed): string =>
      `| ${id} | ${escapeTableCell(entry.content)} | ${escapeTableCell(
        `${lead.get(origin(entry.record)) ?? ""}${entry.approach}`,
      )} |`;
    const decisionRows = newDecisions.map((entry, index) =>
      render(decisionIds[index] ?? "", entry),
    );
    const questionRowsToWrite = newQuestions.map((entry, index) =>
      render(questionIds[index] ?? "", entry),
    );
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
      operations.push({ kind: "remove", target: source.source, description: "delete: merged" });
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

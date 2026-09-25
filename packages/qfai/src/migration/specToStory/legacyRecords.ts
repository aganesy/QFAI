import { parseHeadings } from "../../core/parse/markdown.js";
import { parseAllMarkdownTables } from "../../core/specPackParsers.js";
import { MigrationInputError } from "./harness.js";

export type LegacyKind = "BR" | "EX" | "TC";
export type LegacyRecord = {
  id: string;
  cells: Record<string, string>;
  source: {
    kind: "table" | "heading" | "table+heading";
    startLine: number;
    endLine: number;
    raw: string;
  };
};

export function retiredLegacyStatus(value: string): boolean {
  return /^(?:superseded|deprecated|removed)\b/i.test(value.trim());
}

function field(body: string, name: string): string {
  const normalized = name.replace(/[- ]/g, "[- ]?");
  const pattern = new RegExp(`^${normalized}\\s*:\\s*(.*)$`, "i");
  for (const line of body.split("\n")) {
    const clean = line
      .replace(/\*\*/g, "")
      .replace(/^\s*-\s*/, "")
      .trim();
    const match = pattern.exec(clean);
    if (match) return match[1]?.trim() ?? "";
  }
  return "";
}

function headingCells(
  kind: LegacyKind,
  id: string,
  title: string,
  body: string,
): Record<string, string> {
  const content = body
    .split("\n")
    .filter(
      (line) =>
        !/^(?:BR-Ref|EX-Ref|EX Refs|AC-Refs|AC Refs|Status)\s*:/i.test(
          line
            .replace(/\*\*/g, "")
            .replace(/^\s*-\s*/, "")
            .trim(),
        ),
    )
    .join("\n")
    .trim();
  if (kind === "BR") {
    return {
      "BR-ID": id,
      Status: field(body, "Status"),
      Rule: [title, content].filter(Boolean).join("\n\n"),
    };
  }
  if (kind === "EX") {
    const steps = content.split("\n").map((line) => line.replace(/^\s*-\s*/, "").trim());
    const then = steps.findIndex((line) => /^Then\s/i.test(line));
    const input = then < 0 ? content : steps.slice(0, then).join("\n");
    const expected = then < 0 ? "" : steps.slice(then).join("\n");
    return {
      "EX-ID": id,
      Status: field(body, "Status"),
      "BR-Ref": field(body, "BR-Ref"),
      Input: input || [title, content].filter(Boolean).join("\n\n"),
      Expected: expected,
    };
  }
  return {
    "TC-ID": id,
    "AC-Refs": field(body, "AC-Refs") || field(body, "AC Refs"),
    "EX-Ref": field(body, "EX-Ref") || field(body, "EX Refs"),
    Steps: [title, content].filter(Boolean).join("\n\n"),
    Expected: field(body, "Expected") || field(body, "Verify") || content,
  };
}

function refs(value: string, prefix: "AC" | "EX"): string[] {
  return [...new Set(value.match(new RegExp(`${prefix}-\\d{4}-\\d{4}`, "g")) ?? [])].sort();
}

function mergeCase(table: LegacyRecord, heading: LegacyRecord, file: string): LegacyRecord {
  for (const [column, prefix] of [
    ["AC-Refs", "AC"],
    ["EX-Ref", "EX"],
  ] as const) {
    const fromTable = refs(table.cells[column] ?? "", prefix);
    const fromHeading = refs(heading.cells[column] ?? "", prefix);
    if (fromTable.length && fromHeading.length && fromTable.join() !== fromHeading.join()) {
      throw new MigrationInputError(
        `${file}:${heading.source.startLine}: conflicting ${column} for ${heading.id}; table line ${table.source.startLine}`,
      );
    }
  }
  return {
    id: table.id,
    cells: {
      ...table.cells,
      "AC-Refs": heading.cells["AC-Refs"] || table.cells["AC-Refs"] || "",
      "EX-Ref": heading.cells["EX-Ref"] || table.cells["EX-Ref"] || "",
      Steps: heading.cells.Steps || table.cells.Steps || "",
      Expected: heading.cells.Expected || table.cells.Expected || "",
    },
    source: {
      kind: "table+heading",
      startLine: table.source.startLine,
      endLine: heading.source.endLine,
      raw: `${table.source.raw}\n\n${heading.source.raw}`,
    },
  };
}

export function parseLegacyRecords(
  markdown: string,
  kind: LegacyKind,
  file: string,
): LegacyRecord[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const idHeader = `${kind}-ID`;
  const idPattern = new RegExp(`^${kind}-\\d{4}-\\d{4}$`);
  const records: LegacyRecord[] = [];
  const headings = parseHeadings(markdown).filter((heading) => heading.level === 2);
  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index];
    if (!heading || !heading.title.startsWith(`${kind}-`)) continue;
    const id = heading.title.split(/[:\s]/, 1)[0] ?? "";
    if (!idPattern.test(id))
      throw new MigrationInputError(`${file}:${heading.line}: invalid ${kind} ID ${id}`);
    const next = headings[index + 1];
    const endLine = (next?.line ?? lines.length + 1) - 1;
    const raw = lines
      .slice(heading.line - 1, endLine)
      .join("\n")
      .trimEnd();
    const body = lines.slice(heading.line, endLine).join("\n").trim();
    const title = heading.title.slice(id.length).replace(/^:\s*/, "").trim();
    records.push({
      id,
      cells: headingCells(kind, id, title, body),
      source: { kind: "heading", startLine: heading.line, endLine, raw },
    });
  }
  for (const table of parseAllMarkdownTables(markdown)) {
    const idColumn = table.headers.indexOf(idHeader);
    if (idColumn < 0) continue;
    for (const row of table.rows) {
      const id = row[idColumn]?.trim() ?? "";
      const lineIndex = lines.findIndex((line) =>
        new RegExp(`^\\|\\s*${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|`).test(line),
      );
      const line = lineIndex + 1;
      if (!idPattern.test(id))
        throw new MigrationInputError(`${file}:${line}: invalid ${kind} ID ${id}`);
      if (lineIndex < 0) throw new MigrationInputError(`${file}: cannot locate ${id} table row`);
      const cells = Object.fromEntries(
        table.headers.map((header, column) => [header, row[column] ?? ""]),
      );
      if (kind === "EX" && cells.Input === undefined && cells["Given / Input"] !== undefined) {
        cells.Input = cells["Given / Input"] ?? "";
      }
      records.push({
        id,
        cells,
        source: { kind: "table", startLine: line, endLine: line, raw: lines[lineIndex] ?? "" },
      });
    }
  }
  const byId = new Map<string, LegacyRecord>();
  for (const record of records.sort((a, b) => a.source.startLine - b.source.startLine)) {
    const previous = byId.get(record.id);
    if (!previous) {
      byId.set(record.id, record);
      continue;
    }
    if (kind === "TC" && previous.source.kind !== record.source.kind) {
      const table = previous.source.kind === "table" ? previous : record;
      const heading = previous.source.kind === "heading" ? previous : record;
      if (table.source.kind === "table" && heading.source.kind === "heading") {
        byId.set(record.id, mergeCase(table, heading, file));
        continue;
      }
    }
    throw new MigrationInputError(
      `${file}:${record.source.startLine}: duplicate ${record.id}; first at line ${previous.source.startLine}`,
    );
  }
  return [...byId.values()];
}

export function withoutLegacyRecords(
  markdown: string,
  records: readonly LegacyRecord[],
  removedIds: ReadonlySet<string>,
): string {
  const removedLines = new Set<number>();
  for (const record of records) {
    if (!removedIds.has(record.id)) continue;
    for (let line = record.source.startLine; line <= record.source.endLine; line++) {
      removedLines.add(line);
    }
  }
  return markdown
    .split(/\r?\n/)
    .filter((_, index) => !removedLines.has(index + 1))
    .join("\n");
}

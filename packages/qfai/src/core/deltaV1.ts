import { parse as parseYaml } from "yaml";

import {
  extractH2Sections,
  parseHeadings,
  type H2Section,
  type Heading,
} from "./parse/markdown.js";

export const CHANGE_TYPE_PRIMARY_VALUES = [
  "Initial",
  "Behavior",
  "Structural",
  "Ops",
] as const;
export const CHANGE_TYPE_TAG_VALUES = [
  "@api",
  "@db",
  "@nfr",
  "@docs",
  "@test",
] as const;
export const COMPAT_VALUES = [
  "Compatibility",
  "Improvement",
  "Change",
  "Bug-for-bug",
] as const;

export type ChangeTypePrimary = (typeof CHANGE_TYPE_PRIMARY_VALUES)[number];
export type ChangeTypeTag = (typeof CHANGE_TYPE_TAG_VALUES)[number];
export type DeltaCompat = (typeof COMPAT_VALUES)[number];

export type DeltaMeta = {
  id: string;
  date: string;
  primary: string;
  tags: string[];
  compat: string;
  scope: string[];
  notes: string;
};

export type DeltaDecisionEntry = {
  heading: string;
  headingLine: number;
  endLine: number;
  metaHeadingLine: number | null;
  metaYamlBlock: string | null;
  meta: Record<string, unknown> | null;
  metaError: string | null;
  rejectedHeadingLine: number | null;
  rejectedBody: string | null;
};

export type ParsedDeltaV1 = {
  hasDeltaHeading: boolean;
  updateHistorySection: H2Section | null;
  decisionLogSection: H2Section | null;
  entries: DeltaDecisionEntry[];
};

export function parseDeltaV1(text: string): ParsedDeltaV1 {
  const lines = text.split(/\r?\n/);
  const headings = parseHeadings(text);
  const sections = extractH2Sections(text);
  const hasDeltaHeading = headings.some(
    (heading) =>
      heading.level === 1 &&
      normalizeHeading(heading.title).startsWith("delta"),
  );
  const updateHistorySection = findSection(sections, "Update History");
  const decisionLogSection = findSection(sections, "Decision Log");

  return {
    hasDeltaHeading,
    updateHistorySection,
    decisionLogSection,
    entries: decisionLogSection
      ? extractDecisionEntries(lines, headings, decisionLogSection)
      : [],
  };
}

export function normalizePrimary(
  value: string | null | undefined,
): ChangeTypePrimary | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "initial") return "Initial";
  if (normalized === "behavior") return "Behavior";
  if (normalized === "structural") return "Structural";
  if (normalized === "ops") return "Ops";
  return null;
}

export function normalizeTag(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "@api") return "@api";
  if (normalized === "@db") return "@db";
  if (normalized === "@nfr") return "@nfr";
  if (normalized === "@docs") return "@docs";
  if (normalized === "@test") return "@test";
  return null;
}

export function normalizeCompat(
  value: string | null | undefined,
): DeltaCompat | null {
  if (!value) {
    return null;
  }
  if (value === "Compatibility") return "Compatibility";
  if (value === "Improvement") return "Improvement";
  if (value === "Change") return "Change";
  if (value === "Bug-for-bug") return "Bug-for-bug";
  return null;
}

export function toDeltaMeta(record: Record<string, unknown>): DeltaMeta {
  return {
    id: asString(record.id),
    date: asString(record.date),
    primary: asString(record.primary),
    tags: asTagArray(record.tags),
    compat: asString(record.compat),
    scope: asStringArray(record.scope),
    notes: asString(record.notes),
  };
}

function extractDecisionEntries(
  lines: string[],
  headings: Heading[],
  decisionLogSection: H2Section,
): DeltaDecisionEntry[] {
  const h3Entries = headings.filter(
    (heading) =>
      heading.level === 3 &&
      heading.line >= decisionLogSection.startLine &&
      heading.line <= decisionLogSection.endLine &&
      /^dl-/i.test(heading.title.trim()),
  );

  return h3Entries.map((heading, index) => {
    const nextHeading = h3Entries[index + 1];
    const endLine = Math.min(
      decisionLogSection.endLine,
      (nextHeading?.line ?? decisionLogSection.endLine + 1) - 1,
    );
    const level4Headings = headings.filter(
      (item) =>
        item.level === 4 && item.line > heading.line && item.line <= endLine,
    );
    const metaHeading = level4Headings.find(
      (item) => normalizeHeading(item.title) === "meta",
    );
    const rejectedHeading = level4Headings.find(
      (item) => normalizeHeading(item.title) === "rejected",
    );

    const metaBody = metaHeading
      ? readHeadingBody(lines, level4Headings, metaHeading, endLine)
      : null;
    const metaYamlBlock = metaBody ? extractYamlCodeBlock(metaBody) : null;
    const parsedMeta = parseYamlMeta(metaYamlBlock);
    const rejectedBody = rejectedHeading
      ? readHeadingBody(lines, level4Headings, rejectedHeading, endLine)
      : null;

    return {
      heading: heading.title.trim(),
      headingLine: heading.line,
      endLine,
      metaHeadingLine: metaHeading?.line ?? null,
      metaYamlBlock,
      meta: parsedMeta.value,
      metaError: parsedMeta.error,
      rejectedHeadingLine: rejectedHeading?.line ?? null,
      rejectedBody,
    };
  });
}

function findSection(
  sections: Map<string, H2Section>,
  title: string,
): H2Section | null {
  const target = normalizeHeading(title);
  for (const section of sections.values()) {
    if (normalizeHeading(section.title) === target) {
      return section;
    }
  }
  return null;
}

function readHeadingBody(
  lines: string[],
  headings: Heading[],
  current: Heading,
  sectionEndLine: number,
): string {
  const siblings = headings
    .filter((heading) => heading.line > current.line)
    .sort((a, b) => a.line - b.line);
  const nextHeading = siblings[0];
  const startLine = current.line + 1;
  const endLine = Math.min(
    sectionEndLine,
    (nextHeading?.line ?? sectionEndLine + 1) - 1,
  );
  if (startLine > endLine) {
    return "";
  }
  return lines.slice(startLine - 1, endLine).join("\n");
}

function extractYamlCodeBlock(body: string): string | null {
  const match = body.match(/```(?:yaml|yml)\s*([\s\S]*?)```/i);
  const value = match?.[1]?.trim() ?? "";
  return value.length > 0 ? value : null;
}

function parseYamlMeta(block: string | null): {
  value: Record<string, unknown> | null;
  error: string | null;
} {
  if (!block) {
    return { value: null, error: null };
  }
  try {
    const parsed = parseYaml(sanitizeMetaYaml(block));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        value: null,
        error: "Meta YAML はオブジェクト形式で記述してください。",
      };
    }
    return { value: parsed as Record<string, unknown>, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      value: null,
      error: `Meta YAML の解析に失敗しました: ${message}`,
    };
  }
}

function sanitizeMetaYaml(block: string): string {
  const lines = block.split(/\r?\n/);
  const out: string[] = [];
  let inTagsList = false;

  for (const originalLine of lines) {
    let line = originalLine;
    const trimmed = line.trim();

    if (/^tags\s*:/i.test(trimmed)) {
      inTagsList = true;
      line = line.replace(/\[([^\]]*)\]/, (_match, inner: string) => {
        const quoted = inner
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .map((part) =>
            /^@[A-Za-z0-9_-]+$/.test(part) ? `"${part}"` : part,
          )
          .join(", ");
        return `[${quoted}]`;
      });
      out.push(line);
      continue;
    }

    if (inTagsList) {
      if (/^[A-Za-z0-9_-]+\s*:/.test(trimmed) || trimmed.length === 0) {
        inTagsList = false;
      } else if (/^-\s+@[A-Za-z0-9_-]+$/.test(trimmed)) {
        line = line.replace(
          /^(\s*-\s*)(@[A-Za-z0-9_-]+)\s*$/,
          (_match, prefix: string, tag: string) => `${prefix}"${tag}"`,
        );
      }
    }

    out.push(line);
  }

  return out.join("\n");
}

function normalizeHeading(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    const single = value.trim();
    return single.length > 0 ? [single] : [];
  }
  return [];
}

function asTagArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
}

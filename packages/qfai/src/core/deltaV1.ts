import { parse as parseYaml } from "yaml";

import {
  extractH2Sections,
  parseHeadings,
  type H2Section,
  type Heading,
} from "./parse/markdown.js";

export const CHANGE_TYPE_PRIMARY_VALUES = ["Initial", "Behavior", "Structural", "Ops"] as const;
export const CHANGE_TYPE_TAG_VALUES = ["@api", "@db", "@nfr", "@docs", "@test"] as const;
export const COMPAT_VALUES = ["Compatibility", "Improvement", "Change", "Bug-for-bug"] as const;
export const VERIFICATION_LEVEL_VALUES = [
  "unit",
  "integration",
  "acceptance",
  "manual",
  "migration",
  "rollback",
] as const;
export const VERIFICATION_OWNER_VALUES = ["dev", "qa", "reviewer", "ops"] as const;
export const REQUIRED_DELTA_META_KEYS = [
  "id",
  "date",
  "primary",
  "tags",
  "compat",
  "scope",
  "notes",
] as const;

export type ChangeTypePrimary = (typeof CHANGE_TYPE_PRIMARY_VALUES)[number];
export type ChangeTypeTag = (typeof CHANGE_TYPE_TAG_VALUES)[number];
export type DeltaCompat = (typeof COMPAT_VALUES)[number];
export type VerificationLevel = (typeof VERIFICATION_LEVEL_VALUES)[number];
export type VerificationOwner = (typeof VERIFICATION_OWNER_VALUES)[number];

export type DeltaMeta = {
  id: string;
  date: string;
  primary: string;
  tags: string[];
  compat: string;
  scope: string[];
  notes: string;
};

export type VerificationPlanItem = {
  id: string;
  level: string;
  target: string;
  method: string;
  owner: string;
  expected: string;
  links: string[];
};

export type DeltaDecisionEntry = {
  heading: string;
  headingLine: number;
  endLine: number;
  metaHeadingLine: number | null;
  metaYamlBlock: string | null;
  meta: Record<string, unknown> | null;
  metaError: string | null;
  migrationHeadingLine: number | null;
  migrationBody: string | null;
  notesHeadingLine: number | null;
  notesBody: string | null;
  rejectedHeadingLine: number | null;
  rejectedBody: string | null;
  verificationHeadingLine: number | null;
  verificationBody: string | null;
  verificationPlanHeadingLine: number | null;
  verificationPlanError: string | null;
  verificationPlanItems: VerificationPlanItem[];
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
    (heading) => heading.level === 1 && isDeltaTitle(heading.title),
  );
  const updateHistorySection = findSection(sections, "Update History");
  const decisionLogSection = findSection(sections, "Decision Log");

  return {
    hasDeltaHeading,
    updateHistorySection,
    decisionLogSection,
    entries: decisionLogSection ? extractDecisionEntries(lines, headings, decisionLogSection) : [],
  };
}

export function normalizePrimary(value: string | null | undefined): ChangeTypePrimary | null {
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

export function normalizeTag(value: string | null | undefined): ChangeTypeTag | null {
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

export function normalizeCompat(value: string | null | undefined): DeltaCompat | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (/^compat(?:ibility)?$/i.test(normalized)) return "Compatibility";
  if (normalized === "improvement") return "Improvement";
  if (normalized === "change") return "Change";
  if (normalized === "bug-for-bug") return "Bug-for-bug";
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

/** `date: YYYY-MM-DD`, as the shipped skeleton spells an unfilled date. */
const DATE_PLACEHOLDER_RE = /^y{4}-m{2}-d{2}$/i;
/** `<file / module this decision touches>`, as the skeleton spells free text. */
const ANGLE_PLACEHOLDER_RE = /^<[^<>]*>$/;

function isUnfilledValue(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === "" || DATE_PLACEHOLDER_RE.test(trimmed) || ANGLE_PLACEHOLDER_RE.test(trimmed);
}

/**
 * True when the entry is still the shipped skeleton rather than a decision.
 *
 * The delta template has to parse — an author copies it and fills it in — and
 * it deliberately carries real `primary` / `tags` / `compat` values so the
 * first copy teaches the vocabulary the report counts. That leaves `date`,
 * `scope` and `notes` as the only evidence of whether anybody wrote anything,
 * so those three decide it. Counting an untouched copy publishes
 * `Initial 1 / @docs 1 / Improvement 1` for a spec whose decision log is empty,
 * and a fabricated 1 also hides the "nothing was counted" disclosure that a
 * real zero would raise.
 */
export function isPlaceholderDeltaMeta(meta: DeltaMeta): boolean {
  if (isUnfilledValue(meta.date) || isUnfilledValue(meta.notes)) {
    return true;
  }
  return meta.scope.length > 0 && meta.scope.every((item) => isUnfilledValue(item));
}

export function hasMigrationBullets(sectionBody: string | null): boolean {
  if (!sectionBody) {
    return false;
  }
  return sectionBody.split(/\r?\n/).some((line) => /^\s*-\s+\S/.test(line));
}

export function hasLegacyMigrationNotes(sectionBody: string | null): boolean {
  if (!sectionBody) {
    return false;
  }
  const labelMatch = sectionBody.match(/migration\s*\/\s*follow-?ups\s*:/i);
  if (!labelMatch || typeof labelMatch.index !== "number") {
    return false;
  }
  const trailing = sectionBody.slice(labelMatch.index + labelMatch[0].length);
  return /(^|\n)\s{2,}-\s+\S/.test(trailing);
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
      (item) => item.level === 4 && item.line > heading.line && item.line <= endLine,
    );
    const metaHeading = level4Headings.find((item) => normalizeHeading(item.title) === "meta");
    const migrationHeading = level4Headings.find((item) => isMigrationHeading(item.title));
    const notesHeading = level4Headings.find((item) => normalizeHeading(item.title) === "notes");
    const rejectedHeading = level4Headings.find(
      (item) => normalizeHeading(item.title) === "rejected",
    );
    const verificationHeading = level4Headings.find(
      (item) => normalizeHeading(item.title) === "verification",
    );

    const metaBody = metaHeading
      ? readHeadingBody(lines, level4Headings, metaHeading, endLine)
      : null;
    const metaYamlBlock = metaBody ? extractYamlCodeBlock(metaBody) : null;
    const parsedMeta = parseYamlMeta(metaYamlBlock);
    const migrationBody = migrationHeading
      ? readHeadingBody(lines, level4Headings, migrationHeading, endLine)
      : null;
    const notesBody = notesHeading
      ? readHeadingBody(lines, level4Headings, notesHeading, endLine)
      : null;
    const rejectedBody = rejectedHeading
      ? readHeadingBody(lines, level4Headings, rejectedHeading, endLine)
      : null;
    const verificationBody = verificationHeading
      ? readHeadingBody(lines, level4Headings, verificationHeading, endLine)
      : null;
    const verificationPlan = parseVerificationPlan(verificationBody);

    return {
      heading: heading.title.trim(),
      headingLine: heading.line,
      endLine,
      metaHeadingLine: metaHeading?.line ?? null,
      metaYamlBlock,
      meta: parsedMeta.value,
      metaError: parsedMeta.error,
      migrationHeadingLine: migrationHeading?.line ?? null,
      migrationBody,
      notesHeadingLine: notesHeading?.line ?? null,
      notesBody,
      rejectedHeadingLine: rejectedHeading?.line ?? null,
      rejectedBody,
      verificationHeadingLine: verificationHeading?.line ?? null,
      verificationBody,
      verificationPlanHeadingLine:
        verificationPlan.planHeadingLine === null
          ? null
          : verificationHeading
            ? verificationHeading.line + verificationPlan.planHeadingLine
            : null,
      verificationPlanError: verificationPlan.parseError,
      verificationPlanItems: verificationPlan.items,
    };
  });
}

function isMigrationHeading(title: string): boolean {
  return normalizeHeading(title).replace(/\s+/g, "") === "migration/follow-ups";
}

function findSection(sections: Map<string, H2Section>, title: string): H2Section | null {
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
  const endLine = Math.min(sectionEndLine, (nextHeading?.line ?? sectionEndLine + 1) - 1);
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
    const parsed: unknown = parseYaml(sanitizeMetaYaml(block));
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

function parseVerificationPlan(body: string | null): {
  planHeadingLine: number | null;
  parseError: string | null;
  items: VerificationPlanItem[];
} {
  if (!body) {
    return { planHeadingLine: null, parseError: null, items: [] };
  }
  const lines = body.split(/\r?\n/);
  const headings = parseHeadings(body).sort((a, b) => a.line - b.line);
  const planHeading = headings.find((heading) =>
    normalizeHeading(heading.title).startsWith("plan"),
  );
  if (!planHeading) {
    return { planHeadingLine: null, parseError: null, items: [] };
  }
  const planBody = readHeadingBody(lines, headings, planHeading, lines.length);
  const yamlSource = planBody.trim();
  if (yamlSource.length === 0) {
    return { planHeadingLine: planHeading.line, parseError: null, items: [] };
  }

  try {
    const parsed: unknown = parseYaml(yamlSource);
    if (!Array.isArray(parsed)) {
      return {
        planHeadingLine: planHeading.line,
        parseError: "Verification.Plan は YAML 配列（- id: ...）で記述してください。",
        items: [],
      };
    }
    const items = parsed.filter(isRecord).map((item) => ({
      id: asString(item.id),
      level: asString(item.level),
      target: asString(item.target),
      method: asString(item.method),
      owner: asString(item.owner),
      expected: asString(item.expected),
      links: asStringArray(item.links),
    }));
    return { planHeadingLine: planHeading.line, parseError: null, items };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      planHeadingLine: planHeading.line,
      parseError: `Verification.Plan YAML の解析に失敗しました: ${message}`,
      items: [],
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
          .map((part) => (/^@[A-Za-z0-9_-]+$/.test(part) ? `"${part}"` : part))
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

/**
 * The shipped delta files are numbered (`# 09 Delta`, `# 18 Delta`) because every
 * file in a spec pack follows the `NN Title` convention. Strip that leading
 * ordinal before the prefix test, so the heading the templates ship and the
 * heading this parser recognises are the same thing.
 */
function isDeltaTitle(title: string): boolean {
  return normalizeHeading(title)
    .replace(/^\d+\s+/, "")
    .startsWith("delta");
}

function normalizeHeading(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
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

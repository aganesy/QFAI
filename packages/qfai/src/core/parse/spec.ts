import { parseContractRefs, type ParsedContractRefs } from "./contractRefs.js";
import { extractH2Sections, parseHeadings } from "./markdown.js";

export type BrPriority = "P0" | "P1" | "P2" | "P3";

export type ParsedBr = {
  id: string;
  priority: BrPriority;
  text: string;
  line: number;
};

export type ParsedBrWithoutPriority = {
  id: string;
  text: string;
  line: number;
};

export type ParsedBrWithInvalidPriority = {
  id: string;
  priority: string;
  text: string;
  line: number;
};

export const SPEC_STATUS_VALUES = ["active", "superseded", "deprecated", "removed"] as const;
export type SpecStatus = (typeof SPEC_STATUS_VALUES)[number];

export type ParsedSpec = {
  file: string;
  specId?: string;
  sections: Set<string>;
  brs: ParsedBr[];
  brsWithoutPriority: ParsedBrWithoutPriority[];
  brsWithInvalidPriority: ParsedBrWithInvalidPriority[];
  contractRefs: ParsedContractRefs;
  status?: SpecStatus;
  statusRaw?: string;
  supersededBy?: string;
  deprecatedAt?: string;
};

/**
 * Extract a bullet field value from a markdown spec header block of the form
 * `- Name: value`. Returns undefined when the bullet is absent or marked as
 * placeholder ("-").
 */
export function extractBulletField(md: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^\\s*-\\s*${escaped}\\s*:\\s*(.+?)\\s*$`, "im");
  const match = re.exec(md);
  if (!match?.[1]) {
    return undefined;
  }
  const value = match[1].trim();
  if (value === "-" || value.length === 0) {
    return undefined;
  }
  return value;
}

const SPEC_ID_RE = /\bSPEC-\d{4}\b/;
const BR_LINE_RE = /^\s*(?:[-*]\s*)?\[(BR-\d{4}-\d{4})\]\[(P[0-3])\]\s*(.+)$/;
const BR_LINE_ANY_PRIORITY_RE = /^\s*(?:[-*]\s*)?\[(BR-\d{4}-\d{4})\]\[(P[^\]]+)\]\s*(.+)$/;
const BR_LINE_NO_PRIORITY_RE = /^\s*(?:[-*]\s*)?\[(BR-\d{4}-\d{4})\](?!\s*\[P)\s*(.*\S.*)$/;
const VALID_PRIORITIES = new Set<BrPriority>(["P0", "P1", "P2", "P3"]);

export function parseSpec(md: string, file: string): ParsedSpec {
  const headings = parseHeadings(md);
  const h1 = headings.find((heading) => heading.level === 1);
  const specId = h1?.title.match(SPEC_ID_RE)?.[0];

  const sections = extractH2Sections(md);
  const sectionNames = new Set(Array.from(sections.keys()));
  const lines = md.split(/\r?\n/);

  const brs: ParsedBr[] = [];
  const brsWithoutPriority: ParsedBrWithoutPriority[] = [];
  const brsWithInvalidPriority: ParsedBrWithInvalidPriority[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i] ?? "";
    const lineNumber = i + 1;

    const validMatch = lineText.match(BR_LINE_RE);
    if (validMatch) {
      const id = validMatch[1];
      const priority = validMatch[2];
      const text = validMatch[3];
      if (!id || !priority || !text) continue;
      brs.push({
        id,
        priority: priority as BrPriority,
        text: text.trim(),
        line: lineNumber,
      });
      continue;
    }

    const anyPriorityMatch = lineText.match(BR_LINE_ANY_PRIORITY_RE);
    if (anyPriorityMatch) {
      const id = anyPriorityMatch[1];
      const priority = anyPriorityMatch[2];
      const text = anyPriorityMatch[3];
      if (!id || !priority || !text) continue;
      if (!VALID_PRIORITIES.has(priority as BrPriority)) {
        brsWithInvalidPriority.push({
          id,
          priority,
          text: text.trim(),
          line: lineNumber,
        });
      }
      continue;
    }

    const noPriorityMatch = lineText.match(BR_LINE_NO_PRIORITY_RE);
    if (noPriorityMatch) {
      const id = noPriorityMatch[1];
      const text = noPriorityMatch[2];
      if (!id || !text) continue;
      brsWithoutPriority.push({
        id,
        text: text.trim(),
        line: lineNumber,
      });
    }
  }

  const parsed: ParsedSpec = {
    file,
    sections: sectionNames,
    brs,
    brsWithoutPriority,
    brsWithInvalidPriority,
    contractRefs: parseContractRefs(md),
  };
  if (specId) {
    parsed.specId = specId;
  }

  const statusRaw = extractBulletField(md, "Status");
  if (statusRaw !== undefined) {
    parsed.statusRaw = statusRaw;
    if ((SPEC_STATUS_VALUES as readonly string[]).includes(statusRaw)) {
      parsed.status = statusRaw as SpecStatus;
    }
  }
  const supersededBy = extractBulletField(md, "Superseded-by");
  if (supersededBy !== undefined) {
    parsed.supersededBy = supersededBy;
  }
  const deprecatedAt = extractBulletField(md, "Deprecated-at");
  if (deprecatedAt !== undefined) {
    parsed.deprecatedAt = deprecatedAt;
  }

  return parsed;
}

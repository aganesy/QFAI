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

export type ParsedSpec = {
  file: string;
  specId?: string;
  sections: Set<string>;
  brs: ParsedBr[];
  brsWithoutPriority: ParsedBrWithoutPriority[];
  brsWithInvalidPriority: ParsedBrWithInvalidPriority[];
  contractRefs: ParsedContractRefs;
};

export type ParsedContractRefs = {
  lines: string[];
  ids: string[];
  invalidTokens: string[];
  hasNone: boolean;
};

const SPEC_ID_RE = /\bSPEC-\d{4}\b/;
const BR_LINE_RE = /^\s*(?:[-*]\s*)?\[(BR-\d{4})\]\[(P[0-3])\]\s*(.+)$/;
const BR_LINE_ANY_PRIORITY_RE =
  /^\s*(?:[-*]\s*)?\[(BR-\d{4})\]\[(P[^\]]+)\]\s*(.+)$/;
const BR_LINE_NO_PRIORITY_RE =
  /^\s*(?:[-*]\s*)?\[(BR-\d{4})\](?!\s*\[P)\s*(.*\S.*)$/;
const CONTRACT_REF_LINE_RE = /^\s*QFAI-CONTRACT-REF:\s*(.*)\s*$/gm;
const CONTRACT_REF_ID_RE = /^(?:API|UI|DB)-\d{4}$/;

const BR_SECTION_TITLE = "業務ルール";
const VALID_PRIORITIES = new Set<BrPriority>(["P0", "P1", "P2", "P3"]);

export function parseSpec(md: string, file: string): ParsedSpec {
  const headings = parseHeadings(md);
  const h1 = headings.find((heading) => heading.level === 1);
  const specId = h1?.title.match(SPEC_ID_RE)?.[0];

  const sections = extractH2Sections(md);
  const sectionNames = new Set(Array.from(sections.keys()));
  const brSection = sections.get(BR_SECTION_TITLE);
  const brLines = brSection ? brSection.body.split(/\r?\n/) : [];
  const startLine = brSection?.startLine ?? 1;

  const brs: ParsedBr[] = [];
  const brsWithoutPriority: ParsedBrWithoutPriority[] = [];
  const brsWithInvalidPriority: ParsedBrWithInvalidPriority[] = [];

  for (let i = 0; i < brLines.length; i++) {
    const lineText = brLines[i] ?? "";
    const lineNumber = startLine + i;

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
  return parsed;
}

export function parseContractRefs(md: string): ParsedContractRefs {
  const lines: string[] = [];
  for (const match of md.matchAll(CONTRACT_REF_LINE_RE)) {
    lines.push((match[1] ?? "").trim());
  }

  const ids: string[] = [];
  const invalidTokens: string[] = [];
  let hasNone = false;

  for (const line of lines) {
    if (line.length === 0) {
      invalidTokens.push("(empty)");
      continue;
    }
    const tokens = line.split(",").map((token) => token.trim());
    for (const token of tokens) {
      if (token.length === 0) {
        invalidTokens.push("(empty)");
        continue;
      }
      if (token === "none") {
        hasNone = true;
        continue;
      }
      if (CONTRACT_REF_ID_RE.test(token)) {
        ids.push(token);
        continue;
      }
      invalidTokens.push(token);
    }
  }

  return {
    lines,
    ids: unique(ids),
    invalidTokens: unique(invalidTokens),
    hasNone,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

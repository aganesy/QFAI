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
};

const SPEC_ID_RE = /\bSPEC-\d{4}\b/;
const BR_LINE_RE = /^\s*-\s*\[?(BR-\d{4})\]?\s*\((P[0-3])\)\s*(.+)$/;
const BR_LINE_ANY_PRIORITY_RE =
  /^\s*-\s*\[?(BR-\d{4})\]?\s*\((P[^)]+)\)\s*(.+)$/;
const BR_LINE_NO_PRIORITY_RE =
  /^\s*-\s*\[?(BR-\d{4})\]?\s+(?!\()(.*\S.*)$/;

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
    const lineText = brLines[i];
    const lineNumber = startLine + i;

    const validMatch = lineText.match(BR_LINE_RE);
    if (validMatch) {
      brs.push({
        id: validMatch[1],
        priority: validMatch[2] as BrPriority,
        text: validMatch[3].trim(),
        line: lineNumber,
      });
      continue;
    }

    const anyPriorityMatch = lineText.match(BR_LINE_ANY_PRIORITY_RE);
    if (anyPriorityMatch) {
      const priority = anyPriorityMatch[2];
      if (!VALID_PRIORITIES.has(priority as BrPriority)) {
        brsWithInvalidPriority.push({
          id: anyPriorityMatch[1],
          priority,
          text: anyPriorityMatch[3].trim(),
          line: lineNumber,
        });
      }
      continue;
    }

    const noPriorityMatch = lineText.match(BR_LINE_NO_PRIORITY_RE);
    if (noPriorityMatch) {
      brsWithoutPriority.push({
        id: noPriorityMatch[1],
        text: noPriorityMatch[2].trim(),
        line: lineNumber,
      });
    }
  }

  return {
    file,
    specId,
    sections: sectionNames,
    brs,
    brsWithoutPriority,
    brsWithInvalidPriority,
  };
}

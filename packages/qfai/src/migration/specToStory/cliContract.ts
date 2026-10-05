import { parseHeadings } from "../../core/parse/markdown.js";
import { splitMarkdownRow } from "../../core/specPackParsers.js";
import { paragraphsOf, renderTemplate, tableRows, tableText } from "./policyDocuments.js";

const TEMPLATE = "03_contract/cli/cli-NNNN-title.md";
const OWNERSHIP = "Ownership boundary";
const RULES = "Business rules";
const RULE_COLUMNS = ["BR-ID", "Statement", "Examples"] as const;
/** An old section whose content belongs under `## Business rules` once a person rewrites it. */
const RULES_HEADING = /^(?:business )?rules$/i;
/** A rule ID anywhere in a table row after its first cell, which the CLI schema refuses. */
const RULE_ID_AFTER_FIRST_CELL = /^\|[^|\n]*\|[^\n]*BR-\d{4}-\d{4}/m;

/** Where a contract is written, and where it was read from. */
export type CliContractPaths = { target: string; source: string };

export type ShapedCliContract = {
  content: string;
  forAPerson: string[];
};

type Section = { heading: string; body: string };

function splitContract(text: string): {
  title: string;
  beforeTitle: string;
  preamble: string;
  sections: Section[];
} {
  const lines = text.split("\n");
  const headings = parseHeadings(text);
  const h1 = headings.find((item) => item.level === 1);
  const titleLine = h1?.line ?? 0;
  const h2s = headings.filter((item) => item.level === 2 && item.line > titleLine);
  const bodyEnd = (index: number): number => (h2s[index + 1]?.line ?? lines.length + 1) - 1;
  return {
    title: h1 ? (lines[h1.line - 1] ?? "").trimEnd() : "",
    beforeTitle: lines
      .slice(0, Math.max(titleLine - 1, 0))
      .join("\n")
      .trim(),
    preamble: lines
      .slice(titleLine, (h2s[0]?.line ?? lines.length + 1) - 1)
      .join("\n")
      .trim(),
    sections: h2s.map((item, index) => ({
      heading: item.title,
      body: lines.slice(item.line, bodyEnd(index)).join("\n").trim(),
    })),
  };
}

/** One to three paragraphs of prose naming no rule, as the schema's Ownership boundary takes. */
function ownershipBody(body: string): string | null {
  const paragraphs = paragraphsOf(body);
  if (!paragraphs || paragraphs.length > 3 || /BR-\d{4}-\d{4}/.test(body)) return null;
  return paragraphs.join("\n\n");
}

/**
 * One `BR-ID | Statement | Examples` table whose rows open with a pipe and name no
 * other rule, kept as written.
 */
function rulesBody(body: string): string | null {
  if (body.split("\n").some((line) => !line.startsWith("|"))) return null;
  const table = tableRows(body, RULE_COLUMNS);
  const header = splitMarkdownRow(body.split("\n")[0] ?? "");
  if (!table || table.dropped.length > 0 || header.join("|") !== RULE_COLUMNS.join("|")) {
    return null;
  }
  return RULE_ID_AFTER_FIRST_CELL.test(body) ? null : body;
}

/**
 * A Markdown CLI contract in the shape of its `qfai-sdd` template: its H1, an
 * `## Ownership boundary` and a `## Business rules` table. `text` already
 * carries the new H1. Whatever does not fit is left out and named for a person.
 */
export async function shapeCliContract(
  text: string,
  paths: CliContractPaths,
): Promise<ShapedCliContract> {
  const { title, beforeTitle, preamble, sections } = splitContract(text.replace(/\r\n/g, "\n"));
  const forAPerson: string[] = [];
  if (beforeTitle)
    forAPerson.push(
      `${paths.target}: rewrite the text before the title of ${paths.source} by hand`,
    );
  if (preamble)
    forAPerson.push(
      `${paths.target}: rewrite the text before the first section of ${paths.source} by hand`,
    );
  let ownership: string | null = null;
  let rules: string | null = null;
  for (const section of sections) {
    if (section.body === "") continue;
    if (section.heading === OWNERSHIP && ownership === null) {
      ownership = ownershipBody(section.body);
      if (ownership !== null) continue;
    } else if (section.heading === RULES && rules === null) {
      rules = rulesBody(section.body);
      if (rules !== null) continue;
    }
    const into =
      section.heading === OWNERSHIP ? OWNERSHIP : RULES_HEADING.test(section.heading) ? RULES : "";
    const where = into === "" ? paths.target : `${paths.target} ## ${into}`;
    forAPerson.push(`${where}: rewrite "## ${section.heading}" of ${paths.source} by hand`);
  }
  if (!sections.some((section) => section.heading === OWNERSHIP && section.body !== ""))
    forAPerson.push(
      `${paths.target} ## ${OWNERSHIP}: write what this contract decides, and which contract decides the rest, in place of the template's placeholder`,
    );
  const rendered = await renderTemplate(TEMPLATE, (heading, templateBody) =>
    heading === OWNERSHIP ? (ownership ?? templateBody) : (rules ?? tableText(RULE_COLUMNS, [])),
  );
  const content = rendered.replace(/^[^\n]*/, () => title);
  return { content, forAPerson };
}

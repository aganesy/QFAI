import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseHeadings } from "../../core/parse/markdown.js";
import { parseAllMarkdownTables } from "../../core/specPackParsers.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import { MigrationInputError } from "./harness.js";

/** The policy documents step 3 writes in their template's shape. */
export const POLICY_DOCUMENTS = [
  "objective.md",
  "initiative.md",
  "principle.md",
  "glossary.md",
  "constraint.md",
] as const;

type PolicyDocument = (typeof POLICY_DOCUMENTS)[number];

type SectionShape =
  | { kind: "list"; keys?: readonly string[] }
  | { kind: "paragraph" }
  | { kind: "table"; columns: readonly string[]; aliases?: Readonly<Record<string, string[]>> };

type PolicyRules = {
  /** The shape of each section the template declares. */
  shapes: Readonly<Record<string, SectionShape>>;
  /** An old heading, in lower case, and the section that takes its content. */
  routes: Readonly<Record<string, string>>;
  /** An old heading whose content belongs in a section only after a person rewrites it. */
  suggestions?: Readonly<Record<string, string>>;
};

const CONSTRAINT_COLUMNS = ["ID", "Constraint", "Rationale", "Impact"] as const;
const CONSTRAINT_SECTIONS: Readonly<Record<string, string>> = {
  TC: "Technical Constraints",
  OC: "Operational Constraints",
  BC: "Business Constraints",
};

const RULES: Readonly<Record<PolicyDocument, PolicyRules>> = {
  "objective.md": {
    shapes: {
      Objective: { kind: "list", keys: ["Outcome", "Evidence"] },
      Users: { kind: "list" },
      "Success criteria": {
        kind: "table",
        columns: ["Observable result", "Measurement"],
        aliases: { "Observable result": ["Criterion"], Measurement: ["How it is measured"] },
      },
      "Non-goals": { kind: "list" },
    },
    routes: {
      objective: "Objective",
      users: "Users",
      "success criteria": "Success criteria",
      "non-goals": "Non-goals",
      "out of scope": "Non-goals",
    },
    suggestions: {
      "what are we building?": "Objective",
      "who is the user?": "Users",
      'what is "success"?': "Success criteria",
      "what is success?": "Success criteria",
    },
  },
  "initiative.md": {
    shapes: {
      Initiative: { kind: "paragraph" },
      Assumptions: { kind: "list" },
      Dependencies: { kind: "list" },
      Milestones: { kind: "table", columns: ["Milestone", "Description"] },
    },
    routes: {
      initiative: "Initiative",
      assumptions: "Assumptions",
      dependencies: "Dependencies",
      milestones: "Milestones",
    },
  },
  "principle.md": {
    shapes: {
      "Product / Mission": { kind: "list", keys: ["Summary", "Value"] },
      "Axioms (Non-negotiable)": { kind: "list" },
      "Decision priorities": { kind: "table", columns: ["Priority", "Concern", "Decision rule"] },
      "Compatibility vs Change Rubric": { kind: "list", keys: ["Compatibility", "Change"] },
    },
    routes: {
      "product / mission": "Product / Mission",
      "axioms (non-negotiable)": "Axioms (Non-negotiable)",
      "decision priorities": "Decision priorities",
      "compatibility vs change rubric": "Compatibility vs Change Rubric",
    },
  },
  "glossary.md": {
    shapes: { Terms: { kind: "table", columns: ["Term", "Definition"] } },
    routes: { terms: "Terms" },
  },
  "constraint.md": {
    shapes: {
      "Technical Constraints": { kind: "table", columns: CONSTRAINT_COLUMNS },
      "Operational Constraints": { kind: "table", columns: CONSTRAINT_COLUMNS },
      "Business Constraints": { kind: "table", columns: CONSTRAINT_COLUMNS },
    },
    routes: {},
  },
};

export function isPolicyDocument(target: string): boolean {
  return (
    path.posix.basename(path.posix.dirname(target)) === "01_policy" &&
    POLICY_DOCUMENTS.some((name) => name === path.posix.basename(target))
  );
}

function policyName(target: string): PolicyDocument {
  const name = POLICY_DOCUMENTS.find((entry) => entry === path.posix.basename(target));
  if (name === undefined) throw new Error(`Not a policy document: ${target}`);
  return name;
}

/** One old section, read from its source file. */
export type PolicySection = { source: string; archive: string; heading: string; body: string };

/** What the sections moved into one policy document, section by section. */
export type PolicyDraft = {
  target: string;
  lists: Map<string, string[]>;
  paragraphs: Map<string, string[]>;
  rows: Map<string, string[][]>;
};

export function newPolicyDraft(target: string): PolicyDraft {
  return { target, lists: new Map(), paragraphs: new Map(), rows: new Map() };
}

const nonBlank = (body: string): string[] =>
  body
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

/**
 * The items of a body that holds one list and nothing else, as the list sections of
 * the policy schemas accept it, or null. A line under an item continues that item.
 */
function listItems(body: string, keys: readonly string[] = []): string[] | null {
  const lines = body.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines.length === 0 || lines[0] === "") return null;
  const items: string[] = [];
  let blank = true;
  for (const line of lines) {
    if (line.trim() === "") {
      blank = true;
      continue;
    }
    if (/^\s*#/.test(line)) return null;
    if (/^ ?- \S/.test(line)) items.push(line.trimStart());
    else if (blank || items.length === 0 || /^[ \t]?[^-\s]/.test(line)) return null;
    else items[items.length - 1] = `${items.at(-1) ?? ""}\n${line}`;
    blank = false;
  }
  const hasKey = (key: string): boolean => items.some((item) => item.startsWith(`- ${key}: `));
  return items.length > 0 && keys.every(hasKey) ? items : null;
}

/** A line that starts a list, a table, a quote, a fence, a heading or a thematic break. */
const NOT_PROSE =
  /^\s*(?:[-*+]|\d+[.)])\s|^\s*\||^\s*(?:>|```|~~~)|^\s*#|^[ \t]*(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/m;

/** The paragraphs of a body that holds prose and nothing else, or null. */
function paragraphsOf(body: string): string[] | null {
  const blocks = body
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((block) => block.replace(/^\n+/, ""))
    .filter((block) => block.trim() !== "");
  if (blocks.length === 0) return null;
  if (blocks.some((block) => /^(?: {4}|\t)/.test(block) || NOT_PROSE.test(block))) return null;
  return blocks.map((block) => block.trim());
}

/**
 * The rows of a body that holds one table and nothing else, in the given columns, or
 * null. The second value names every other column that holds text.
 */
function tableRows(
  body: string,
  columns: readonly string[],
  aliases: Readonly<Record<string, string[]>> = {},
): { rows: string[][]; dropped: string[] } | null {
  const lines = nonBlank(body);
  if (lines.length < 2 || lines.some((line) => !line.trimStart().startsWith("|"))) return null;
  const tables = parseAllMarkdownTables(lines.join("\n"));
  const table = tables[0];
  if (tables.length !== 1 || table === undefined || table.rows.length !== lines.length - 2) {
    return null;
  }
  const headers = table.headers.map((header) => header.trim().toLowerCase());
  const indexes = columns.map((column) =>
    [column, ...(aliases[column] ?? [])]
      .map((name) => headers.indexOf(name.toLowerCase()))
      .find((index) => index >= 0),
  );
  if (indexes.some((index) => index === undefined)) return null;
  const used = new Set(indexes);
  const dropped = table.headers.filter(
    (_header, index) =>
      !used.has(index) && table.rows.some((row) => (row[index] ?? "").trim() !== ""),
  );
  const rows = table.rows.map((row) => indexes.map((index) => (row[index ?? -1] ?? "").trim()));
  return { rows, dropped };
}

function addUnique<T>(
  map: Map<string, T[]>,
  key: string,
  values: T[],
  same: (a: T, b: T) => boolean,
) {
  const current = map.get(key) ?? [];
  for (const value of values) if (!current.some((entry) => same(entry, value))) current.push(value);
  map.set(key, current);
}

const sameRow = (a: string[], b: string[]): boolean => a.join("\u0000") === b.join("\u0000");
const sameText = (a: string, b: string): boolean => a === b;

function rewrite(draft: PolicyDraft, section: PolicySection, into: string | undefined): string {
  const where = into === undefined ? draft.target : `${draft.target} ## ${into}`;
  return `${where}: rewrite "## ${section.heading}" of ${section.source} by hand (kept at ${section.archive})`;
}

/**
 * Moves one old section into the draft when its heading names a section of the
 * template and its content is of that section's kind. Returns what a person has to
 * do otherwise.
 */
export function movePolicySection(draft: PolicyDraft, section: PolicySection): string[] {
  const name = policyName(draft.target);
  if (name === "constraint.md") return moveConstraintSection(draft, section);
  const rules = RULES[name];
  const heading = section.heading.trim().toLowerCase();
  const into = rules.routes[heading];
  const shape = into === undefined ? undefined : rules.shapes[into];
  if (into === undefined || shape === undefined) {
    return [rewrite(draft, section, rules.suggestions?.[heading])];
  }
  if (shape.kind === "list") {
    const items = listItems(section.body, shape.keys);
    if (items === null) return [rewrite(draft, section, into)];
    addUnique(draft.lists, into, items, sameText);
    return [];
  }
  if (shape.kind === "paragraph") {
    const paragraphs = paragraphsOf(section.body);
    if (paragraphs === null) return [rewrite(draft, section, into)];
    addUnique(draft.paragraphs, into, paragraphs, sameText);
    return [];
  }
  const table = tableRows(section.body, shape.columns, shape.aliases);
  if (table === null) return [rewrite(draft, section, into)];
  addUnique(draft.rows, into, table.rows, sameRow);
  return table.dropped.map(
    (column) =>
      `${draft.target} ## ${into}: carry the "${column}" column of "## ${section.heading}" in ${section.source} by hand (kept at ${section.archive})`,
  );
}

function moveConstraintSection(draft: PolicyDraft, section: PolicySection): string[] {
  const table = tableRows(section.body, CONSTRAINT_COLUMNS);
  if (table === null) return [rewrite(draft, section, undefined)];
  const person = table.dropped.map(
    (column) =>
      `${draft.target}: carry the "${column}" column of "## ${section.heading}" in ${section.source} by hand (kept at ${section.archive})`,
  );
  for (const row of table.rows) {
    const into = CONSTRAINT_SECTIONS[/^([A-Z]{2})-/.exec(row[0] ?? "")?.[1] ?? ""];
    if (into === undefined) {
      person.push(
        `${draft.target}: place ${row[0] || "a row with no ID"} of "## ${section.heading}" in ${section.source} under the section its kind belongs to, with a TC-, OC- or BC- ID (kept at ${section.archive})`,
      );
      continue;
    }
    addUnique(draft.rows, into, [row], sameRow);
  }
  return person;
}

async function templateText(name: PolicyDocument): Promise<string> {
  const root = getInitAssetsDir();
  for (const dir of ["skill", "skills"]) {
    const file = path.join(root, ".qfai/assistant", dir, "qfai-sdd/templates/spec/01_policy", name);
    try {
      return await readFile(file, "utf8");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
  throw new MigrationInputError(`The qfai-sdd template for 01_policy/${name} is missing`);
}

const cell = (value: string): string => value.replace(/\|/g, "\\|");

function tableText(columns: readonly string[], rows: string[][]): string {
  const line = (cells: readonly string[]): string => `| ${cells.map(cell).join(" | ")} |`;
  return [line(columns), line(columns.map(() => "---")), ...rows.map(line)].join("\n");
}

/**
 * The document the template gives, with every section the draft filled replaced by
 * what was moved into it. A section nothing was moved into keeps the template's text.
 */
export async function renderPolicyDocument(draft: PolicyDraft): Promise<string> {
  const name = policyName(draft.target);
  const template = (await templateText(name)).replace(/\r\n/g, "\n");
  const lines = template.split("\n");
  const headings = parseHeadings(template).filter((item) => item.level === 2);
  const title = lines[(parseHeadings(template).find((item) => item.level === 1)?.line ?? 1) - 1];
  const parts = [title ?? ""];
  headings.forEach((heading, index) => {
    const end = (headings[index + 1]?.line ?? lines.length + 1) - 1;
    const templateBody = lines.slice(heading.line, end).join("\n").trim();
    const shape = RULES[name].shapes[heading.title];
    const lists = draft.lists.get(heading.title);
    const paragraphs = draft.paragraphs.get(heading.title);
    const rows = draft.rows.get(heading.title);
    let body = templateBody;
    if (lists && lists.length > 0) body = lists.join("\n");
    else if (paragraphs && paragraphs.length > 0) body = paragraphs.join("\n\n");
    else if (rows && rows.length > 0 && shape?.kind === "table")
      body = tableText(shape.columns, rows);
    parts.push(`## ${heading.title}\n\n${body}`);
  });
  return `${parts.join("\n\n")}\n`;
}

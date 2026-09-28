import { parseAllMarkdownTables } from "../../core/specPackParsers.js";
import {
  addUnique,
  listItems,
  renderTemplate,
  rewrite,
  sameRow,
  sameText,
  tableRows,
  tableText,
  type PolicyDraft,
  type PolicySection,
} from "./policyDocuments.js";

const STACK = "Stack";
const ARCHITECTURE = "Architecture";
const DEPENDENCIES = "Dependencies";
const COMMANDS = "Standard commands (copy-paste)";
const STACK_COLUMNS = ["Component", "Choice"] as const;
const ARCHITECTURE_COLUMNS = ["Layer", "Responsibility", "Depends on"] as const;

/**
 * A path, a file name or a command, which a layer row names by responsibility instead: a
 * backtick or a backslash; a path starting with `/`, `./` or `../`; a slash-joined name
 * ending in a file extension; or three or more slash-joined lowercase segments, or one
 * ending in a slash. A single slash between words, as in `I/O` or `and/or`, is prose. The
 * `## Architecture` section of the `tech.md` document schema holds the same patterns.
 */
const LOCATED =
  /[`\\]|(?:^|[\s(])\.{0,2}\/\w|\w\/[\w./-]*\.[A-Za-z][A-Za-z0-9]{0,4}\b|[a-z0-9_-]+\/[a-z0-9_-]+\/|[a-z0-9_-]\/(?:\s|$)/;

/** Old headings, in lower case, whose `Key: value` items become Stack rows. */
const STACK_LISTS = new Set([
  "runtime / platform",
  "package manager",
  "language / framework",
  "frontend",
]);

/** An old item key, in lower case, and the Stack component it names. */
const COMPONENTS: Readonly<Record<string, string>> = {
  "language runtime": "Runtime",
  "os assumptions": "Platform",
  "ci environment": "CI",
  "component source": "Component catalogue",
};

/** An old command label, in lower case, and the label the template gives it. */
const LABELS: Readonly<Record<string, string>> = { smoke: "Skeleton" };

/** A one-line `- Key: value` item. */
const KEYED_ITEM = /^- ([^:\n`]+): (\S.*)$/;

/** A package in backticks with its reason on a nested item. */
const DEPENDENCY_ITEM = /^- `[^`\n]+`\n[ \t]+- \S/;

function carry(draft: PolicyDraft, into: string, item: string, section: PolicySection): string {
  const first = item.split("\n")[0] ?? item;
  return `${draft.target} ## ${into}: carry "${first}" of "## ${section.heading}" in ${section.source} by hand (kept at ${section.archive})`;
}

function moveStackList(draft: PolicyDraft, section: PolicySection, keyless: boolean): string[] {
  const items = listItems(section.body);
  if (items === null) return [rewrite(draft, section, STACK)];
  const person: string[] = [];
  const rows: string[][] = [];
  for (const item of items) {
    const keyed = KEYED_ITEM.exec(item);
    const key = keyed?.[1]?.trim();
    if (keyed && key) rows.push([COMPONENTS[key.toLowerCase()] ?? key, keyed[2] ?? ""]);
    else if (keyless && !item.includes("\n")) rows.push(["Package manager", item.slice(2)]);
    else person.push(carry(draft, STACK, item, section));
  }
  addUnique(draft.rows, STACK, rows, sameRow);
  return person;
}

/** The item in the template's form, or null when its value cannot be put in backticks. */
function commandItem(item: string): string | null {
  const keyed = KEYED_ITEM.exec(item);
  const label = keyed?.[1]?.trim();
  const value = keyed?.[2]?.trim();
  if (!label || value === undefined) return null;
  const name = LABELS[label.toLowerCase()] ?? label;
  if (value.startsWith("`")) return `- ${name}: ${value}`;
  return value.includes("`") ? null : `- ${name}: \`${value}\``;
}

function moveCommands(draft: PolicyDraft, section: PolicySection): string[] {
  const blocks = section.body
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n/)
    .filter((block) => block.trim() !== "");
  const person: string[] = [];
  const commands: string[] = [];
  let other = false;
  for (const block of blocks) {
    const items = listItems(block);
    if (items === null) {
      other = true;
      continue;
    }
    for (const item of items) {
      const command = commandItem(item);
      if (command === null) person.push(carry(draft, COMMANDS, item, section));
      else commands.push(command);
    }
  }
  if (other) {
    person.unshift(
      `${draft.target} ## ${COMMANDS}: rewrite the part of "## ${section.heading}" of ${section.source} that is not a list of labelled commands by hand (kept at ${section.archive})`,
    );
  }
  addUnique(draft.lists, COMMANDS, commands, sameText);
  return person;
}

/**
 * Moves an old architecture section into the `## Architecture` table of the `tech.md` draft
 * when it is one table of layers: a Layer, a Responsibility and a Depends on column, with no
 * path or file name in a row. Returns what a person has to do otherwise.
 */
export function moveArchitectureSection(draft: PolicyDraft, section: PolicySection): string[] {
  const table = tableRows(section.body, ARCHITECTURE_COLUMNS);
  if (table === null) return [rewrite(draft, section, ARCHITECTURE)];
  const person = table.dropped.map(
    (column) =>
      `${draft.target} ## ${ARCHITECTURE}: carry the "${column}" column of "## ${section.heading}" in ${section.source} by hand (kept at ${section.archive})`,
  );
  const rows: string[][] = [];
  for (const row of table.rows) {
    if (row.some((cell) => LOCATED.test(cell)))
      person.push(
        `${draft.target} ## ${ARCHITECTURE}: rewrite the layer ${row[0] || "with no name"} of "## ${section.heading}" in ${section.source} without a path or file name by hand (kept at ${section.archive})`,
      );
    else rows.push(row);
  }
  addUnique(draft.rows, ARCHITECTURE, rows, sameRow);
  return person;
}

/** Adds standard-command items already in the template's form, such as Skeleton items. */
export function addTechCommands(draft: PolicyDraft, items: string[]): void {
  addUnique(draft.lists, COMMANDS, items, sameText);
}

/**
 * Moves one section of an old technology file into the `tech.md` draft when it fits a
 * template section. Returns what a person has to do otherwise.
 */
export function moveTechSection(draft: PolicyDraft, section: PolicySection): string[] {
  const heading = section.heading.trim().toLowerCase();
  if (heading === "stack") {
    const table = tableRows(section.body, STACK_COLUMNS);
    if (table === null) return [rewrite(draft, section, STACK)];
    addUnique(draft.rows, STACK, table.rows, sameRow);
    return table.dropped.map(
      (column) =>
        `${draft.target} ## ${STACK}: carry the "${column}" column of "## ${section.heading}" in ${section.source} by hand (kept at ${section.archive})`,
    );
  }
  if (STACK_LISTS.has(heading)) return moveStackList(draft, section, heading === "package manager");
  if (heading === "dependencies" || heading === "dependencies (runtime)") {
    const items = listItems(section.body);
    const fits =
      items !== null &&
      (items.every((item) => DEPENDENCY_ITEM.test(item)) ||
        (items.length === 1 && items[0] === "- None."));
    if (!fits) return [rewrite(draft, section, DEPENDENCIES)];
    addUnique(draft.lists, DEPENDENCIES, items, sameText);
    return [];
  }
  if (heading === "standard commands (copy-paste)" || heading === "standard commands") {
    return moveCommands(draft, section);
  }
  return [rewrite(draft, section, undefined)];
}

/**
 * The template's items with each one the moved items name replaced by those items, and
 * the moved items the template does not name after them.
 */
function mergeByName<T>(template: T[], moved: T[], name: (item: T) => string): T[] {
  const key = (item: T): string => name(item).trim().toLowerCase();
  const named = new Set(template.map(key));
  const merged = template.flatMap((item) => {
    const replacing = moved.filter((entry) => key(entry) === key(item));
    return replacing.length > 0 ? replacing : [item];
  });
  return [...merged, ...moved.filter((entry) => !named.has(key(entry)))];
}

const commandLabel = (item: string): string => /^- ([^:\n]+):/.exec(item)?.[1] ?? item;

/**
 * `tech.md` as its template gives it, with each Stack row and each command the draft
 * holds in place of the template's item of the same name, and the draft's layers and
 * dependencies in place of the template's.
 */
export async function renderTechDocument(draft: PolicyDraft): Promise<string> {
  return renderTemplate("03_contract/tech.md", (title, templateBody) => {
    if (title === STACK) {
      const rows = draft.rows.get(STACK) ?? [];
      if (rows.length === 0) return templateBody;
      const templateRows = parseAllMarkdownTables(templateBody)[0]?.rows ?? [];
      return tableText(
        STACK_COLUMNS,
        mergeByName(templateRows, rows, (row) => row[0] ?? ""),
      );
    }
    if (title === ARCHITECTURE) {
      const rows = draft.rows.get(ARCHITECTURE) ?? [];
      return rows.length === 0 ? templateBody : tableText(ARCHITECTURE_COLUMNS, rows);
    }
    if (title === DEPENDENCIES) return draft.lists.get(DEPENDENCIES)?.join("\n") ?? templateBody;
    if (title === COMMANDS) {
      const commands = draft.lists.get(COMMANDS) ?? [];
      if (commands.length === 0) return templateBody;
      const templateItems = templateBody.split("\n").filter((line) => line.startsWith("- "));
      return mergeByName(templateItems, commands, commandLabel).join("\n");
    }
    return templateBody;
  });
}

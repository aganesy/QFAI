import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parseDocument } from "yaml";

import { isEnoent } from "../../core/fs/errno.js";
import { extractH2Sections, parseHeadings } from "../../core/parse/markdown.js";
import { escapeTableCell, parseAllMarkdownTables } from "../../core/specPackParsers.js";
import { declaredContractId } from "../../core/contractsDecl.js";
import { CONTRACT_KIND_BY_DIR, nextId } from "../../core/storyTree/ids.js";
import { storyPaths } from "../../core/storyTree/layout.js";
import { parseRecordTable } from "../../core/storyTree/tables.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import { notAContract, OLD_CONTRACT_TOKEN } from "./contractIds.js";
import {
  ID_MAP_PATH,
  oldContractIds,
  readContractMap,
  readIdMap,
  serializeIdMap,
  type ContractMap,
  type MigrationIdMap,
} from "./idMap.js";
import {
  parseLegacyRecords,
  plainExampleCells,
  retiredLegacyStatus,
  withoutLegacyRecords,
} from "./legacyRecords.js";
import {
  MigrationInputError,
  type MigrationContext,
  type MigrationOperation,
  type MigrationStep,
} from "./harness.js";
import { isDashReference } from "./step05CasesToExamples.js";

export type NumberedPlan = {
  flows: Record<string, string>;
  stories: Record<string, string>;
  criteria: Record<string, string>;
  examples: Record<string, string>;
  rules: Record<string, string>;
};

export type NumberingInput = {
  flows: readonly {
    name: string;
    stories: readonly { id: string; criteria: readonly string[]; examples: readonly string[] }[];
  }[];
  /** Each rule in plan order, with the ID of the contract that declares it. */
  rules: readonly { id: string; contract: string }[];
};

export type PlannedStory = { id: string; criteria: string[] };
export type PlannedFlow = { title: string; from?: string | undefined; stories: PlannedStory[] };
export type PlannedRule = { id: string; contract: string };
/** A rule that binds no contract (`retire` null) or is retired, and takes no new ID. */
export type PlannedMark = { id: string; retire: string | null };
export type PlannedExample = { id: string; criterion: string };
export type MigrationPlan = {
  flows: PlannedFlow[];
  rules: PlannedRule[];
  marks: PlannedMark[];
  examples: PlannedExample[];
};

const PLAN_PATH = ".qfai/evidence/migration-spec-to-story/plan.yaml";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function relative(root: string, absolute: string): string {
  return path.relative(root, absolute).replace(/\\/g, "/");
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error: unknown) {
    if (isEnoent(error)) return null;
    throw new MigrationInputError(
      `${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function listPacks(specsDir: string): Promise<string[]> {
  try {
    return (await readdir(specsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^spec-\d{4}$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch (error: unknown) {
    if (isEnoent(error)) return [];
    throw new MigrationInputError(
      `${specsDir}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function readMigrationPlan(context: MigrationContext): Promise<MigrationPlan | null> {
  const raw = await readOptional(path.join(context.root, PLAN_PATH));
  if (raw === null) return null;
  const document = parseDocument(raw);
  if (document.errors.length > 0) {
    throw new MigrationInputError(`${PLAN_PATH}: ${document.errors[0]?.message ?? "invalid YAML"}`);
  }
  const value: unknown = document.toJS();
  if (isObject(value) && !hasOnlyKeys(value, PLAN_KEYS)) {
    const unknown = Object.keys(value).find((key) => !PLAN_KEYS.includes(key));
    throw new MigrationInputError(`${PLAN_PATH}: unknown field ${unknown}`);
  }
  if (!isObject(value) || !Array.isArray(value.flows) || !Array.isArray(value.rules)) {
    throw new MigrationInputError(`${PLAN_PATH}: flows and rules must be lists`);
  }
  const examples = readPlannedExamples(value.examples);
  const flows: PlannedFlow[] = [];
  const seenStories = new Set<string>();
  const seenTitles = new Set<string>();
  for (const entry of value.flows) {
    if (
      !isObject(entry) ||
      !hasOnlyKeys(entry, ["title", "from", "stories"]) ||
      typeof entry.title !== "string" ||
      entry.title.trim() === "" ||
      !Array.isArray(entry.stories)
    ) {
      throw new MigrationInputError(`${PLAN_PATH}: every flow needs title and stories`);
    }
    if (seenTitles.has(entry.title))
      throw new MigrationInputError(`${PLAN_PATH}: duplicate flow ${entry.title}`);
    seenTitles.add(entry.title);
    if (entry.from !== undefined && (typeof entry.from !== "string" || entry.from.trim() === "")) {
      throw new MigrationInputError(`${PLAN_PATH}: flow ${entry.title} has invalid from`);
    }
    const stories: PlannedStory[] = [];
    for (const item of entry.stories) {
      const id = isObject(item) ? item.id : undefined;
      const criteria = isObject(item) ? item.criteria : undefined;
      if (Array.isArray(criteria)) {
        const values: unknown[] = criteria;
        const ids = values.filter((part): part is string => typeof part === "string");
        const repeated = ids.find((part, index) => ids.indexOf(part) !== index);
        if (repeated !== undefined) {
          throw new MigrationInputError(`${PLAN_PATH}: duplicate criterion ${repeated}`);
        }
      }
      if (
        !isObject(item) ||
        !hasOnlyKeys(item, ["id", "criteria"]) ||
        typeof id !== "string" ||
        !/^US-\d{4}-\d{4}$/.test(id) ||
        (criteria !== undefined &&
          (!Array.isArray(criteria) ||
            !criteria.every((part) => typeof part === "string" && /^AC-\d{4}-\d{4}$/.test(part))))
      ) {
        throw new MigrationInputError(`${PLAN_PATH}: invalid story under ${entry.title}`);
      }
      if (seenStories.has(id)) throw new MigrationInputError(`${PLAN_PATH}: duplicate story ${id}`);
      seenStories.add(id);
      const criteriaIds = Array.isArray(criteria)
        ? criteria.map((part: unknown) => {
            if (typeof part !== "string")
              throw new MigrationInputError(`${PLAN_PATH}: invalid criterion`);
            return part;
          })
        : [];
      stories.push({ id, criteria: criteriaIds });
    }
    flows.push({ title: entry.title, from: entry.from, stories });
  }
  const rules: PlannedRule[] = [];
  const marks: PlannedMark[] = [];
  const seenRules = new Set<string>();
  for (const entry of value.rules) {
    const planned = readPlannedRule(context, entry);
    if (seenRules.has(planned.id))
      throw new MigrationInputError(`${PLAN_PATH}: duplicate rule ${planned.id}`);
    seenRules.add(planned.id);
    if ("contract" in planned) rules.push(planned);
    else marks.push(planned);
  }
  return { flows, rules, marks, examples };
}

const PLAN_KEYS = ["flows", "rules", "examples"];
const RULE_TARGET_KEYS = ["contract", "binds", "retire"];

/** The `examples` list: each entry names an old example and the old criterion it is placed under. */
function readPlannedExamples(value: unknown): PlannedExample[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new MigrationInputError(`${PLAN_PATH}: examples must be a list`);
  const seen = new Set<string>();
  return value.map((entry: unknown) => {
    if (
      !isObject(entry) ||
      !hasOnlyKeys(entry, ["id", "criterion"]) ||
      typeof entry.id !== "string" ||
      !/^EX-\d{4}-\d{4}$/.test(entry.id) ||
      typeof entry.criterion !== "string" ||
      !/^AC-\d{4}-\d{4}$/.test(entry.criterion)
    ) {
      throw new MigrationInputError(
        `${PLAN_PATH}: every examples entry needs an id and a criterion`,
      );
    }
    if (seen.has(entry.id))
      throw new MigrationInputError(`${PLAN_PATH}: duplicate example ${entry.id}`);
    seen.add(entry.id);
    return { id: entry.id, criterion: entry.criterion };
  });
}

/** A rule entry: a placement in a contract, or a mark that binds no contract or retires it. */
function readPlannedRule(context: MigrationContext, entry: unknown): PlannedRule | PlannedMark {
  const placement = isObject(entry) && typeof entry.contract === "string" ? entry.contract : "";
  if (
    !isObject(entry) ||
    !hasOnlyKeys(entry, ["id", ...RULE_TARGET_KEYS]) ||
    typeof entry.id !== "string" ||
    !/^BR-\d{4}-\d{4}$/.test(entry.id)
  ) {
    throw new MigrationInputError(`${PLAN_PATH}: invalid rule placement ${placement}`.trimEnd());
  }
  if (RULE_TARGET_KEYS.filter((key) => entry[key] !== undefined).length !== 1) {
    throw new MigrationInputError(
      `${PLAN_PATH}: ${entry.id} needs exactly one of contract, binds and retire`,
    );
  }
  if (entry.binds !== undefined) {
    if (entry.binds !== "none")
      throw new MigrationInputError(`${PLAN_PATH}: ${entry.id} binds must be none`);
    return { id: entry.id, retire: null };
  }
  if (entry.retire !== undefined) {
    if (typeof entry.retire !== "string" || entry.retire.trim() === "")
      throw new MigrationInputError(`${PLAN_PATH}: ${entry.id} retire needs a reason`);
    return { id: entry.id, retire: entry.retire.trim() };
  }
  return { id: entry.id, contract: readRuleContract(context, entry.id, entry.contract, placement) };
}

function readRuleContract(
  context: MigrationContext,
  id: string,
  contract: unknown,
  placement: string,
): string {
  if (
    typeof contract !== "string" ||
    contract.trim() === "" ||
    !/\.(?:ya?ml|json|sql|md)$/i.test(contract) ||
    path.isAbsolute(contract) ||
    contract.split(/[\\/]/).includes("..") ||
    !path.resolve(context.contractsDir, contract).startsWith(`${context.contractsDir}${path.sep}`)
  ) {
    throw new MigrationInputError(`${PLAN_PATH}: invalid rule placement ${placement}`.trimEnd());
  }
  const [kindDirectory, ...below] = contract.split(/[\\/]/);
  const refused = notAContract(contract.replace(/\\/g, "/"));
  if (refused !== null)
    throw new MigrationInputError(
      `${PLAN_PATH}: ${id} names ${placement}, which holds no contract: ${refused}`,
    );
  if (below.length === 0 || !Object.keys(CONTRACT_KIND_BY_DIR).includes(kindDirectory ?? "")) {
    throw new MigrationInputError(
      `${PLAN_PATH}: ${id} names ${placement}, which is not under cli/, api/, db/ or ui/`,
    );
  }
  return contract.replace(/\\/g, "/");
}

export function numberPlannedItems(input: NumberingInput): NumberedPlan {
  const numbered: NumberedPlan = {
    flows: {},
    stories: {},
    criteria: {},
    examples: {},
    rules: {},
  };
  for (const flow of input.flows) {
    const flowId = nextId("BF", Object.values(numbered.flows));
    numbered.flows[flow.name] = flowId;
    for (const story of flow.stories) {
      const storyId = nextId("US", Object.values(numbered.stories), flowId);
      numbered.stories[story.id] = storyId;
      for (const criterion of story.criteria) {
        numbered.criteria[criterion] = nextId("AC", Object.values(numbered.criteria), storyId);
      }
      for (const example of story.examples) {
        numbered.examples[example] = nextId("EX", Object.values(numbered.examples), storyId);
      }
    }
  }
  for (const rule of input.rules) {
    numbered.rules[rule.id] = nextId("BR", Object.values(numbered.rules), rule.contract);
  }
  return numbered;
}

type OldStory = { id: string; title: string; body: string };
type OldCriterion = {
  id: string;
  /** The story the criterion belongs to by its `Parent:` line or its catalog row, if that is one. */
  parent: string | null;
  /** Why the criterion has no such story where its two references disagree or name several. */
  unresolved?: string;
  /** Every story of its pack that its `Parent:` line or its catalog row names. */
  named: readonly string[];
  text: string;
  /** The line of the old criteria file its text starts on. */
  line: number;
};
type OldExample = { id: string; input: string; expected: string; status: string };
type OldCase = {
  id: string;
  criteria: string[];
  examples: string[];
  danglingExamples: string[];
  invalidExampleReference: boolean;
};
type OldRule = { id: string; statement: string; status: string; contractRefs: string };
type OldPack = {
  id: string;
  dir: string;
  retired: boolean;
  raw: Record<
    | "01_Spec.md"
    | "02_User-stories.md"
    | "03_Acceptance-Criteria.md"
    | "04_Business-Rules.md"
    | "05_Examples.md"
    | "06_Test-Cases.md",
    string
  >;
  stories: OldStory[];
  criteria: OldCriterion[];
  examples: OldExample[];
  cases: OldCase[];
  rules: OldRule[];
};

function sectionBlocks(
  text: string,
  prefix: "US" | "AC",
): Array<{ id: string; title: string; body: string; line: number; bodyLine: number }> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const h2 = parseHeadings(text).filter((heading) => heading.level === 2);
  const headings = h2.filter((heading) =>
    new RegExp(`^${prefix}-\\d{4}-\\d{4}(?::|$)`).test(heading.title),
  );
  return headings.map((heading) => {
    const id = new RegExp(`^${prefix}-\\d{4}-\\d{4}`).exec(heading.title)?.[0] ?? "";
    const next = h2.find((candidate) => candidate.line > heading.line);
    const raw = lines.slice(heading.line, (next?.line ?? lines.length + 1) - 1);
    return {
      id,
      line: heading.line,
      bodyLine:
        heading.line +
        1 +
        Math.max(
          0,
          raw.findIndex((line) => line.trim() !== ""),
        ),
      title: heading.title.replace(new RegExp(`^${id}:?\\s*`), "").trim(),
      body: raw.join("\n").trim(),
    };
  });
}

export function parseOldStories(text: string): OldStory[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const headings = parseHeadings(text).filter((heading) => heading.level === 2);
  const catalogTitles = new Map<string, string[]>();
  for (const heading of headings.filter((item) => item.title === "US Catalog")) {
    const next = headings.find((item) => item.line > heading.line);
    for (const line of lines.slice(heading.line, (next?.line ?? lines.length + 1) - 1)) {
      const row = /^\s*-\s+(US-\d{4}-\d{4}):\s*(.*?)\s*$/.exec(line);
      if (!row) continue;
      const id = row[1] ?? "";
      const titles = catalogTitles.get(id) ?? [];
      titles.push((row[2] ?? "").trim());
      catalogTitles.set(id, titles);
    }
  }
  return sectionBlocks(text, "US").map((story) => {
    if (story.title !== "") return story;
    const candidates = catalogTitles.get(story.id) ?? [];
    const title = candidates.length === 1 ? (candidates[0] ?? "") : "";
    return { ...story, title: /[\p{L}\p{N}]/u.test(title) ? title : "" };
  });
}

export function parseOldCriteria(text: string, storyIds?: ReadonlySet<string>): OldCriterion[] {
  const headed = sectionBlocks(text, "AC");
  const byId = new Map<string, { line: number; criterion: OldCriterion }>();
  for (const entry of headed) {
    if (byId.has(entry.id))
      throw new MigrationInputError(`Duplicate legacy criterion ${entry.id} at line ${entry.line}`);
    byId.set(entry.id, {
      line: entry.line,
      criterion: {
        id: entry.id,
        parent: /(?:^|\n)\s*(?:#|-)?\s*Parent:\s*(US-\d{4}-\d{4})/i.exec(entry.body)?.[1] ?? null,
        named: [],
        text: entry.body,
        line: entry.bodyLine,
      },
    });
  }
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const headings = parseHeadings(text).filter((heading) => heading.level === 2);
  for (let index = 0; index < lines.length; index++) {
    const match = /^[ \t]*#[ \t]*(AC-\d{4}-\d{4})(?::[^\n]*)?$/.exec(lines[index] ?? "");
    if (!match) continue;
    const id = match[1] ?? "";
    const line = index + 1;
    const containing = headings.find(
      (heading, headingIndex) =>
        heading.line < line && (headings[headingIndex + 1]?.line ?? Infinity) > line,
    );
    if (containing?.title.startsWith("AC-") && !containing.title.startsWith(id)) {
      throw new MigrationInputError(
        `Criterion marker ${id} conflicts with heading at line ${containing.line}`,
      );
    }
    if (byId.has(id)) {
      if (!containing?.title.startsWith(id))
        throw new MigrationInputError(`Duplicate legacy criterion ${id} at line ${line}`);
      continue;
    }
    let end = index + 1;
    while (
      end < lines.length &&
      !/^\s*```\s*$/.test(lines[end] ?? "") &&
      !/^[ \t]*#[ \t]*AC-\d{4}-\d{4}(?::[^\n]*)?$/.test(lines[end] ?? "")
    ) {
      end += 1;
    }
    const block = lines.slice(index, end).join("\n").trim();
    byId.set(id, {
      line,
      criterion: {
        id,
        parent: /^[ \t]*#[ \t]*Parent:[ \t]*(US-\d{4}-\d{4})/im.exec(block)?.[1] ?? null,
        named: [],
        text: block,
        line,
      },
    });
  }
  const catalog = catalogStories(text);
  return [...byId.values()]
    .sort((left, right) => left.line - right.line)
    .map(({ criterion }) => {
      const declared = (story: string): boolean => storyIds?.has(story) ?? true;
      const rowStories = (catalog.get(criterion.id) ?? []).filter(declared);
      const lineStory = criterion.parent !== null && declared(criterion.parent);
      const named = [...new Set([...(lineStory ? [criterion.parent ?? ""] : []), ...rowStories])];
      if (criterion.parent !== null && !declared(criterion.parent)) {
        return {
          ...criterion,
          parent: null,
          named,
          unresolved: `names ${criterion.parent} in its Parent line, which is no story of its pack; list it under a story's criteria in plan.yaml`,
        };
      }
      return { ...withCatalogParent(criterion, rowStories), named };
    });
}

const CATALOG_STORY_COLUMN = /^(?:US Ref|US-Refs|Maps To)$/i;

/** The stories each criterion's row of a criteria catalog table names, in a `US Ref` column. */
function catalogStories(text: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const table of parseAllMarkdownTables(text)) {
    const column = table.headers.findIndex((header) => CATALOG_STORY_COLUMN.test(header.trim()));
    if (column < 0) continue;
    for (const row of table.rows) {
      const id = row.find((cell) => /^AC-\d{4}-\d{4}$/.test(cell.trim()))?.trim();
      if (id === undefined) continue;
      const named = splitIds(row[column] ?? "", "US");
      result.set(id, [...new Set([...(result.get(id) ?? []), ...named])]);
    }
  }
  return result;
}

/** A criterion's story from its `Parent:` line and its catalog row, or why it has none. */
function withCatalogParent(criterion: OldCriterion, named: readonly string[]): OldCriterion {
  const pack = criterion.id.split("-")[1];
  const row = named.filter((story) => story.split("-")[1] === pack);
  const line = criterion.parent;
  if (line !== null && row.some((story) => story !== line)) {
    return {
      ...criterion,
      parent: null,
      unresolved: `names ${line} in its Parent line and ${row.join(", ")} in its catalog row; list it under a story's criteria in plan.yaml`,
    };
  }
  if (line !== null || row.length === 0) return criterion;
  if (row.length > 1) {
    return {
      ...criterion,
      unresolved: `is ambiguous: its catalog row names ${row.join(", ")}; list it under a story's criteria in plan.yaml`,
    };
  }
  return { ...criterion, parent: row[0] ?? null };
}

type GherkinItem = { keyword: string; name: string; line: number; lines: string[] };
/** An item of a criterion that is not written, and the line of the old file it starts on. */
type DroppedItem = { line: number; text: string };
/** What a convertible criterion writes: its one named scenario, or null for the placeholder. */
type CriterionShape = { scenario: string | null; dropped: DroppedItem[] };

const GHERKIN_ITEM = /^\s*(Background|Scenario Outline|Scenario Template|Scenario):[ \t]*(.*?)\s*$/;
const ID_ONLY_NAME = /^(?:US|AC)-\d{4}-\d{4}(?:-\d{2})?:?$/;

/** The scenario a criterion holds when none of its old items is one named `Scenario:`. */
const PLACEHOLDER_SCENARIO = [
  "Scenario: <the outcome this criterion accepts>",
  "  Given <a starting state>",
  "  When <the user acts>",
  "  Then <the expected outcome>",
].join("\n");

/** Each `Background`, `Scenario` and `Scenario Outline` of a criterion, with the lines under it. */
function gherkinItems(source: string, firstLine: number): GherkinItem[] {
  const items: GherkinItem[] = [];
  let docString = false;
  for (const [index, line] of source.replace(/\r\n/g, "\n").split("\n").entries()) {
    const delimiter = /^\s*"""/.test(line);
    const header = docString || delimiter ? null : GHERKIN_ITEM.exec(line);
    if (delimiter) docString = !docString;
    if (header) {
      items.push({
        keyword: header[1] ?? "",
        name: header[2] ?? "",
        line: firstLine + index,
        lines: [line],
      });
    } else items.at(-1)?.lines.push(line);
  }
  return items;
}

/** The part of a criterion's text that holds its Gherkin, and the file line it starts on. */
function gherkinSource(criterion: OldCriterion): { source: string; line: number } {
  const fenced = /```gherkin\s*\n([\s\S]*?)\n```/m.exec(criterion.text);
  if (fenced?.[1] === undefined) {
    return { source: criterion.text.replace(/\n```[\s\S]*$/m, ""), line: criterion.line };
  }
  const start = fenced.index + fenced[0].length - "\n```".length - fenced[1].length;
  const before = criterion.text.slice(0, start).match(/\n/g)?.length ?? 0;
  return { source: fenced[1], line: criterion.line + before };
}

/** The header row of an item's first `Examples:` table as written, or null where it has none. */
function examplesHeader(item: GherkinItem): string | null {
  const at = item.lines.findIndex((line) => /^\s*(?:Examples|Scenarios):/.test(line));
  if (at < 0) return null;
  // The first table row of the block, past any description, and before a further `Examples:`.
  const rest = item.lines.slice(at + 1);
  const next = rest.findIndex((line) => /^\s*(?:Examples|Scenarios):/.test(line));
  const row = (next < 0 ? rest : rest.slice(0, next)).find((line) => line.trim().startsWith("|"));
  return row === undefined ? null : row.trim();
}

/** An item's text without the blank, tag and comment lines that lead into the next item. */
function itemText(item: GherkinItem): string {
  const lines = [...item.lines];
  while (lines.length > 1 && /^\s*(?:@|#|$)/.test(lines.at(-1) ?? "")) lines.pop();
  return lines.join("\n");
}

function droppedText(item: GherkinItem): string {
  if (item.keyword === "Background") return item.name ? `Background "${item.name}"` : "Background";
  if (item.keyword !== "Scenario") {
    const header = examplesHeader(item);
    const named = `${item.keyword} "${item.name}"`;
    return header === null ? named : `${named} with Examples header row ${header}`;
  }
  if (item.name === "") return "Scenario with no name";
  if (ID_ONLY_NAME.test(item.name)) return `Scenario named only by its ID ${item.name}`;
  return `further Scenario "${item.name}"`;
}

/**
 * The shape a criterion is written in, or null when it has no `Scenario` with Given, When and
 * Then lines. A criterion holds one named `Scenario:`: the first one it has. Every other
 * `Background`, `Scenario` and `Scenario Outline` is dropped and named for a person.
 */
function criterionShape(criterion: OldCriterion): CriterionShape | null {
  const { source, line } = gherkinSource(criterion);
  const start = source.search(/^[ \t]*Scenario(?: Outline| Template)?:/m);
  if (start < 0) return null;
  const scenario = source.slice(start);
  if (
    !/^\s*Given\s+\S/m.test(scenario) ||
    !/^\s*When\s+\S/m.test(scenario) ||
    !/^\s*Then\s+\S/m.test(scenario)
  ) {
    return null;
  }
  const items = gherkinItems(source, line);
  const kept = items.find(
    (item) => item.keyword === "Scenario" && item.name !== "" && !ID_ONLY_NAME.test(item.name),
  );
  return {
    scenario: kept === undefined ? null : itemText(kept),
    dropped: items
      .filter((item) => item !== kept)
      .map((item) => ({ line: item.line, text: droppedText(item) })),
  };
}

function hasConvertibleCriterion(id: string, criteria: ReadonlyMap<string, OldCriterion>): boolean {
  const criterion = criteria.get(id);
  return criterion !== undefined && criterionShape(criterion) !== null;
}

const BACKGROUND_LINE = /^\s*Background:/gm;

/** How many `Background:` lines of a criteria file lie outside every criterion. */
function backgroundsOutsideCriteria(text: string, criteria: readonly OldCriterion[]): number {
  const count = (value: string): number => (value.match(BACKGROUND_LINE) ?? []).length;
  return count(text) - criteria.reduce((total, criterion) => total + count(criterion.text), 0);
}

function splitIds(value: string, prefix: string): string[] {
  const pattern = new RegExp(`\\b${prefix}-\\d{4}-\\d{4}\\b`, "g");
  return [...new Set(value.match(pattern) ?? [])];
}

async function readOldPack(context: MigrationContext, id: string): Promise<OldPack> {
  const dir = path.join(context.specsDir, id);
  const filenames = [
    "01_Spec.md",
    "02_User-stories.md",
    "03_Acceptance-Criteria.md",
    "04_Business-Rules.md",
    "05_Examples.md",
    "06_Test-Cases.md",
  ] as const;
  const entries = await Promise.all(
    filenames.map(async (file) => {
      const current = await readOptional(path.join(dir, file));
      const archived = await readOptional(
        path.join(context.root, `.qfai/evidence/migration-spec-to-story/retired/${id}/${file}`),
      );
      const archiveFirst = file === "04_Business-Rules.md" || file === "05_Examples.md";
      const raw = archiveFirst ? (archived ?? current) : (current ?? archived);
      if (raw === null)
        throw new MigrationInputError(`${relative(context.root, dir)}/${file} is missing`);
      return [file, raw] as const;
    }),
  );
  const raw = Object.fromEntries(entries) as OldPack["raw"];
  const stories = parseOldStories(raw["02_User-stories.md"]);
  const criteria = parseOldCriteria(
    raw["03_Acceptance-Criteria.md"],
    new Set(stories.map((story) => story.id)),
  );
  const examples = parseLegacyRecords(raw["05_Examples.md"], "EX", `${id}/05_Examples.md`).map(
    (record) => ({
      id: record.id,
      input: record.cells.Input ?? "",
      expected: record.cells.Expected ?? "",
      status: record.cells.Status ?? "",
    }),
  );
  const exampleIds = new Set(examples.map((example) => example.id));
  const cases = parseLegacyRecords(raw["06_Test-Cases.md"], "TC", `${id}/06_Test-Cases.md`).map(
    (record) => {
      const row = record.cells;
      const exampleText = row["EX-Ref"] ?? "";
      const references = splitIds(exampleText, "EX");
      return {
        id: record.id,
        criteria: splitIds(row["AC-Refs"] ?? "", "AC"),
        examples: references.filter((reference) => exampleIds.has(reference)),
        danglingExamples: references.filter((reference) => !exampleIds.has(reference)),
        invalidExampleReference:
          !/^(?:\s*|\s*[—-]\s*|\s*EX-\d{4}-\d{4}(?:\s*,\s*EX-\d{4}-\d{4})*\s*)$/.test(exampleText),
      };
    },
  );
  const rules = parseLegacyRecords(
    raw["04_Business-Rules.md"],
    "BR",
    `${id}/04_Business-Rules.md`,
  ).map((record) => ({
    id: record.id,
    statement: record.cells.Rule ?? "",
    status: record.cells.Status ?? "",
    contractRefs: record.cells["Contract-Refs"] ?? "",
  }));
  return {
    id,
    dir,
    retired: /^- Status:\s*(?:superseded|deprecated|removed)\s*$/im.test(raw["01_Spec.md"]),
    raw,
    stories,
    criteria,
    examples,
    cases,
    rules,
  };
}

function packOf(oldId: string): string {
  const part = /^(?:US|AC|EX|BR|TC)-(\d{4})-\d{4}$/.exec(oldId)?.[1];
  if (!part) throw new MigrationInputError(`Invalid old ID: ${oldId}`);
  return `spec-${part}`;
}

function plannedPlacements(plan: MigrationPlan): MigrationIdMap["placements"] {
  const result: MigrationIdMap["placements"] = {};
  for (const flow of plan.flows) {
    for (const story of flow.stories) {
      (result[packOf(story.id)] ??= {})[story.id] = flow.title;
    }
  }
  for (const rule of plan.rules) {
    (result[packOf(rule.id)] ??= {})[rule.id] = rule.contract;
  }
  return result;
}

export function assertUnchangedPlacements(plan: MigrationPlan, map: MigrationIdMap): void {
  for (const mark of plan.marks) {
    if (map.ids[packOf(mark.id)]?.[mark.id] !== undefined) {
      throw new MigrationInputError(`${PLAN_PATH}: ${mark.id} is marked but the ID map holds it`);
    }
  }
  const current = plannedPlacements(plan);
  for (const [pack, placements] of Object.entries(map.placements)) {
    for (const [oldId, destination] of Object.entries(placements)) {
      if (current[pack]?.[oldId] !== destination) {
        throw new MigrationInputError(`${PLAN_PATH}: placement changed for ${oldId}`);
      }
    }
  }
  for (const [pack, placements] of Object.entries(current)) {
    for (const oldId of Object.keys(placements)) {
      if (!map.ids[pack]?.[oldId]) {
        throw new MigrationInputError(`${PLAN_PATH}: ${oldId} was not in the ID map`);
      }
    }
  }
}

function derivedCriterion(exampleId: string, cases: readonly OldCase[]): string | null {
  const cited = cases.filter((item) => item.examples.includes(exampleId));
  const ids = new Set(cited.flatMap((item) => item.criteria));
  return cited.length > 0 && ids.size === 1 ? ([...ids][0] ?? null) : null;
}

function replacedIds(text: string, replacements: Record<string, string>): string {
  return text.replace(
    /\b(?:(?:US|AC|EX|BR|TC)-\d{4}-\d{4}|CON-(?:API|DB|UI)-\d+)\b(?!-\d)/g,
    (oldId) => replacements[oldId] ?? oldId,
  );
}

/** An old `CON-*` ID in a story's text that no contract declared, so step 4 left it as written. */
function unmappedContracts(
  file: string,
  texts: readonly string[],
  replacements: Record<string, string>,
): string[] {
  const tokens = new Set(texts.flatMap((text) => text.match(OLD_CONTRACT_TOKEN) ?? []));
  return [...tokens]
    .filter((token) => replacements[token] === undefined)
    .map((token) => `${file}: ${token} is declared by no contract, so it has no new ID`);
}

/**
 * The contract ID of each planned rule's destination. The plan names the
 * contract by its path before step 3 renamed it; a contract that already
 * declared its ID keeps its path.
 */
async function ruleContractIds(
  context: MigrationContext,
  plan: MigrationPlan,
  contracts: ContractMap,
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  for (const rule of plan.rules) {
    const mapped: string | undefined = contracts[rule.contract]?.id;
    const text = mapped ? null : await readOptional(path.join(context.contractsDir, rule.contract));
    const id = mapped ?? (text === null ? null : declaredContractId(rule.contract, text));
    if (id === null) {
      throw new MigrationInputError(
        text === null
          ? `${PLAN_PATH}: ${rule.id} names ${rule.contract}, which is not a contract file`
          : `Run step 3 before step 4: ${rule.contract} declares no contract ID`,
      );
    }
    resolved.set(rule.id, id);
  }
  return resolved;
}

const MERMAID_FENCE = /```mermaid\s*\n([\s\S]*?)\n```/m;

/**
 * The old flow section `from` selects: its Mermaid diagram and the prose around it. Headings are
 * dropped: the prose becomes `## Purpose`, and a flow document has no heading below that level.
 */
function flowSource(
  text: string,
  selector: string | undefined,
): { diagram: string | null; prose: string } {
  const selected = selectFlowSection(text, selector);
  if (selected === null) return { diagram: null, prose: "" };
  const prose = selected
    .replace(MERMAID_FENCE, "")
    .split(/\r?\n/)
    .filter((line) => !/^#{1,6}\s/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { diagram: MERMAID_FENCE.exec(selected)?.[1] ?? null, prose };
}

function selectFlowSection(text: string, selector: string | undefined): string | null {
  if (!selector) return null;
  let selected = text;
  if (selector === "_policies/04_Business-Flow.md") {
    const firstChange = parseHeadings(text).find(
      (heading) => heading.level === 2 && heading.title.startsWith("CHG-"),
    );
    if (firstChange)
      selected = text
        .split(/\r?\n/)
        .slice(0, firstChange.line - 1)
        .join("\n");
  } else {
    const headings = parseHeadings(text).filter(
      (heading) => heading.level === 2 && heading.title === selector,
    );
    if (headings.length !== 1)
      throw new MigrationInputError(`${PLAN_PATH}: ambiguous or missing flow source ${selector}`);
    selected = extractH2Sections(text).get(selector)?.body ?? "";
  }
  return selected;
}

function reportUnplaced(
  root: string,
  packs: readonly OldPack[],
  plan: MigrationPlan,
  ownerByCriterion: ReadonlyMap<string, string>,
  exampleCriterion: ReadonlyMap<string, string>,
): string[] {
  const placedStories = new Set(
    plan.flows.flatMap((flow) => flow.stories.map((story) => story.id)),
  );
  const placedRules = new Set([...plan.rules, ...plan.marks].map((rule) => rule.id));
  const forAPerson: string[] = [];
  for (const pack of packs) {
    if (pack.retired) continue;
    const base = relative(root, pack.dir);
    if (backgroundsOutsideCriteria(pack.raw["03_Acceptance-Criteria.md"], pack.criteria) > 0) {
      forAPerson.push(
        `${base}/03_Acceptance-Criteria.md: a Background outside every criterion is not written`,
      );
    }
    for (const story of pack.stories) {
      if (!placedStories.has(story.id)) {
        forAPerson.push(`${base}/02_User-stories.md: ${story.id} has no flow in plan.yaml`);
      }
    }
    for (const criterion of pack.criteria) {
      if (!ownerByCriterion.has(criterion.id)) {
        forAPerson.push(
          `${base}/03_Acceptance-Criteria.md: ${criterion.id} ${criterion.unresolved ?? "has no single placed story"}`,
        );
      } else if (criterionShape(criterion) === null) {
        forAPerson.push(
          `${base}/03_Acceptance-Criteria.md: ${criterion.id} has no convertible Gherkin scenario`,
        );
      }
    }
    for (const example of pack.examples) {
      if (retiredLegacyStatus(example.status)) {
        forAPerson.push(
          `${base}/05_Examples.md: ${example.id} is ${example.status}; keep the source for disposition`,
        );
        continue;
      }
      if (!example.input.trim() || !example.expected.trim()) {
        forAPerson.push(
          `${base}/05_Examples.md: ${example.id} has no unambiguous input and expected result`,
        );
      }
      if (!exampleCriterion.has(example.id)) {
        forAPerson.push(`${base}/05_Examples.md: ${example.id} has no single derived criterion`);
      }
    }
    for (const testCase of pack.cases) {
      const criterion = testCase.criteria[0];
      const convertible =
        testCase.criteria.length === 1 &&
        criterion !== undefined &&
        ownerByCriterion.has(criterion) &&
        pack.criteria.some((item) => item.id === criterion && criterionShape(item) !== null);
      if (
        testCase.invalidExampleReference ||
        testCase.examples.length + testCase.danglingExamples.length > 1
      ) {
        forAPerson.push(`${base}/06_Test-Cases.md: ${testCase.id} has ambiguous EX-Ref`);
      }
      if (testCase.danglingExamples.length > 0 && !convertible) {
        forAPerson.push(
          `${base}/06_Test-Cases.md: ${testCase.id} references missing ${testCase.danglingExamples.join(", ")}`,
        );
      }
    }
    for (const rule of pack.rules) {
      if (retiredLegacyStatus(rule.status)) {
        forAPerson.push(
          `${base}/04_Business-Rules.md: ${rule.id} is ${rule.status}; keep the source for disposition`,
        );
        continue;
      }
      if (!rule.statement.trim()) {
        forAPerson.push(`${base}/04_Business-Rules.md: ${rule.id} has no rule statement`);
      }
      if (!placedRules.has(rule.id)) {
        forAPerson.push(`${base}/04_Business-Rules.md: ${rule.id} has no contract in plan.yaml`);
      }
    }
  }
  return forAPerson;
}

const STORY_SENTENCE = /^As an? [^,]+, I want .+, so that .+\.$/;
/** Fields of an old story block that the archive keeps and the story tree does not. */
const ARCHIVED_STORY_FIELDS = new Set(["parent", "source", "flow"]);

type StoryParts = { sentence: string; nonGoals: string[] };
/** A story block that holds some of its `As a`, `I want` and `So that` fields and not all. */
type PartialStory = { missing: string[] };
const STORY_FIELDS = ["as a", "i want", "so that"] as const;
/** A list item that opens one of the three story fields, each bold or plain, with or without a colon. */
const STORY_FIELD_LINE =
  /^-\s+(?:\*\*)?(As an?|I want|So that)(?:\*\*)?(?:\s*:|\s)(?:\*\*)?\s*(.*)$/i;
type BlockEntry =
  | { kind: "field"; key: string; value: string; items: string[]; article?: "an" }
  | { kind: "paragraph"; text: string }
  | { kind: "other" };

/** A line that opens a list item, a quote, a table or a fence at the top of a block. */
const OTHER_BLOCK =
  /^ {0,3}(?:[-*+]|\d+[.)]|#{1,6})\s|^\s*(?:>|\||```|~~~)|^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;

/** The value of a field line whose opening `**` is closed at the end of the value, without that close. */
function withoutClosingBold(line: string, value: string): string {
  const unbalanced = (value.match(/\*\*/g)?.length ?? 0) % 2 === 1;
  return /^-\s+\*\*/.test(line) && unbalanced ? value.replace(/\s*\*\*\s*$/, "") : value;
}

function storyBlockEntries(body: string): BlockEntry[] {
  const entries: BlockEntry[] = [];
  let current: BlockEntry | null = null;
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    const field = STORY_FIELD_LINE.exec(line) ?? /^-\s+([A-Za-z][A-Za-z-]*):\s*(.*)$/.exec(line);
    const item = /^\s+(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (line.trim() === "") {
      if (current?.kind === "paragraph") current = null;
    } else if (field) {
      current = {
        kind: "field",
        key: (field[1] ?? "").toLowerCase().replace(/^as an$/, "as a"),
        value: withoutClosingBold(line, field[2] ?? ""),
        items: [],
        ...(/^as an$/i.test(field[1] ?? "") ? { article: "an" as const } : {}),
      };
      entries.push(current);
    } else if (current?.kind === "field" && item) {
      current.items.push(item[1] ?? "");
    } else if (current?.kind === "field" && /^\s/.test(line)) {
      const last = current.items.length - 1;
      if (last >= 0) current.items[last] = `${current.items[last]} ${line.trim()}`;
      else current.value = `${current.value.trimEnd()} ${line.trim()}`;
    } else if (OTHER_BLOCK.test(line)) {
      current = { kind: "other" };
      entries.push(current);
    } else if (current?.kind === "other") {
      continue;
    } else if (current?.kind === "paragraph") {
      current.text = `${current.text.trimEnd()} ${line.trim()}`;
    } else {
      current = { kind: "paragraph", text: line.trim() };
      entries.push(current);
    }
  }
  return entries;
}

/**
 * The one `As a …, I want …, so that ….` sentence of an old story block and its
 * non-goals, or null when the block holds anything else. The sentence is the
 * block's one paragraph, its `Goal` field, or its `As a`, `I want` and `So that` fields
 * joined; a block holding only some of those fields names the parts it lacks.
 */
function storyParts(body: string): StoryParts | PartialStory | null {
  const sentences: string[] = [];
  const nonGoals: string[] = [];
  const fields = new Map<string, string>();
  for (const entry of storyBlockEntries(body)) {
    if (entry.kind === "other") {
      return null;
    } else if (entry.kind === "paragraph") {
      sentences.push(entry.text);
    } else if (entry.key === "non-goals") {
      nonGoals.push(...[entry.value, ...entry.items].map((text) => text.trim()).filter(Boolean));
    } else if (ARCHIVED_STORY_FIELDS.has(entry.key)) {
      continue;
    } else if (entry.items.length > 0) {
      return null;
    } else if (STORY_FIELDS.some((key) => key === entry.key)) {
      if (fields.has(entry.key)) return null;
      fields.set(entry.key, entry.value.trim());
      if (entry.article) fields.set("article", entry.article);
    } else if (entry.key === "goal") {
      sentences.push(entry.value);
    } else if (!ARCHIVED_STORY_FIELDS.has(entry.key)) {
      return null;
    }
  }
  if (fields.size > 0) return storyFromFields(fields, sentences.length, nonGoals);
  const sentence = sentences[0]?.trim() ?? "";
  return sentences.length === 1 && STORY_SENTENCE.test(sentence) ? { sentence, nonGoals } : null;
}

function storyFromFields(
  fields: ReadonlyMap<string, string>,
  otherSentences: number,
  nonGoals: string[],
): StoryParts | PartialStory | null {
  if (otherSentences > 0) return null;
  const missing = STORY_FIELDS.filter((key) => !fields.get(key)).map((key) =>
    key === "as a" ? "As a" : key === "i want" ? "I want" : "So that",
  );
  if (missing.length > 0) return { missing };
  const part = (key: string): string => (fields.get(key) ?? "").replace(/\.$/, "");
  const article = fields.get("article") ?? "a";
  const sentence = `As ${article} ${part("as a")}, I want ${part("i want")}, so that ${part("so that")}.`;
  return STORY_SENTENCE.test(sentence) ? { sentence, nonGoals } : null;
}

/**
 * A story block without the top-level fields only the archive keeps, and their
 * continuation lines. A line inside a fence is content, never a field. Every other
 * line stays as written, except a blank line a removed field leaves beside another.
 */
function withoutArchivedFields(body: string): string {
  const kept: string[] = [];
  let skipping = false;
  let removed = false;
  let fence: string | null = null;
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    const field = fence === null ? /^-\s+([A-Za-z][A-Za-z-]*):/.exec(line) : null;
    if (field) skipping = ARCHIVED_STORY_FIELDS.has((field[1] ?? "").toLowerCase());
    else if (fence === null && line.trim() !== "" && !/^\s+\S/.test(line)) skipping = false;
    const run = marker?.[1] ?? "";
    if (marker && fence === null) fence = run;
    else if (
      marker &&
      fence !== null &&
      run[0] === fence[0] &&
      run.length >= fence.length &&
      (marker[2] ?? "").trim() === ""
    )
      fence = null;
    if (skipping) {
      removed = true;
      continue;
    }
    if (removed && line.trim() === "" && (kept.at(-1) ?? "").trim() === "") continue;
    removed = false;
    kept.push(line);
  }
  return kept.join("\n");
}

function outputStory(
  story: OldStory,
  newId: string,
  ids: Record<string, string>,
  parts: StoryParts | null,
): string {
  const heading = `# ${newId}: ${story.title}\n\n## User Story\n\n`;
  if (parts === null) {
    return `${heading}${replacedIds(withoutArchivedFields(story.body), ids).trim()}\n`;
  }
  const nonGoals = parts.nonGoals.map((text) => `- ${replacedIds(text, ids)}`).join("\n");
  return `${heading}${replacedIds(parts.sentence, ids)}\n${nonGoals ? `\n## Non-goals\n\n${nonGoals}\n` : ""}`;
}

/**
 * A scenario re-indented to the template: two spaces for `Scenario:`, four for each step
 * and each `Examples:` line. Every other line keeps its place relative to the step above it: that step's
 * indentation is replaced and every character after it is kept, so a DocString keeps
 * its relative whitespace, tabs included. A whitespace-only line inside a DocString is
 * payload, so it is shifted like the rest rather than emptied.
 */
function indentedScenario(scenario: string): string {
  const lines = scenario.replace(/\r\n/g, "\n").split("\n");
  const indent = (line: string): number => /^\s*/.exec(line)?.[0].length ?? 0;
  const isStep = (line: string): boolean =>
    /^\s*(?:(?:Given|When|Then|And|But|\*)\s|(?:Examples|Scenarios):)/.test(line);
  let stepIndent = indent(lines.find(isStep) ?? "");
  const shifted = (line: string): string => {
    if (indent(line) >= stepIndent) return `    ${line.slice(stepIndent)}`;
    const delta = 4 - stepIndent;
    return delta >= 0 ? `${" ".repeat(delta)}${line}` : line.slice(Math.min(-delta, indent(line)));
  };
  let docString: string | null = null;
  return lines
    .map((line, index) => {
      const delimiter = /^\s*("""|```)/.exec(line)?.[1] ?? null;
      const inDocString = docString !== null && delimiter !== docString;
      if (delimiter !== null && (docString === null || delimiter === docString)) {
        docString = docString === null ? delimiter : null;
      }
      if (line === "") return "";
      if (line.trim() === "") return inDocString ? shifted(line) : "";
      if (index === 0) return `  ${line.trimStart()}`;
      if (!inDocString && delimiter === null && isStep(line)) {
        stepIndent = indent(line);
        return `    ${line.trimStart()}`;
      }
      return shifted(line);
    })
    .join("\n");
}

function outputCriteria(
  story: OldStory,
  criteria: readonly OldCriterion[],
  ids: Record<string, string>,
): string | null {
  if (criteria.length === 0) return null;
  const blocks = criteria.map((criterion) => {
    const shape = criterionShape(criterion);
    if (shape === null) throw new MigrationInputError(`${criterion.id} has no Gherkin scenario`);
    const scenario = shape.scenario ?? PLACEHOLDER_SCENARIO;
    return `  # ${ids[criterion.id]}\n${indentedScenario(replacedIds(scenario, ids))}`;
  });
  return `# Acceptance Criteria\n\n## Criteria\n\n\`\`\`gherkin\nFeature: ${story.title}\n${blocks.join("\n\n")}\n\`\`\`\n`;
}

/** What `outputCriteria` does not write as it stands: each dropped item, and each placeholder. */
function criteriaForAPerson(
  source: string,
  criteriaFile: string,
  criteria: readonly OldCriterion[],
  ids: Record<string, string>,
): string[] {
  const forAPerson: string[] = [];
  for (const criterion of criteria) {
    const shape = criterionShape(criterion);
    if (shape === null) continue;
    for (const item of shape.dropped) {
      forAPerson.push(
        `${source}:${item.line}: ${criterion.id} ${item.text} is not written; a criterion holds one named Scenario`,
      );
    }
    if (shape.scenario === null) {
      forAPerson.push(
        `${criteriaFile}: ${ids[criterion.id] ?? criterion.id} holds a placeholder Scenario; write it`,
      );
    }
  }
  return forAPerson;
}

/** The old criteria whose `Parent:` line, catalog row or plan entry named the story, as an item tail. */
function namedByNote(pack: OldPack, planned: PlannedStory): string {
  const named = pack.criteria
    .filter((item) => item.named.includes(planned.id))
    .map((item) => item.id);
  const placed = pack.criteria
    .filter((item) => planned.criteria.includes(item.id) && !item.named.includes(planned.id))
    .map((item) => item.id);
  return [
    named.length === 0 ? "" : `; named by ${named.join(", ")} in 03_Acceptance-Criteria.md`,
    placed.length === 0 ? "" : `; placed under it by plan.yaml: ${placed.join(", ")}`,
  ].join("");
}

function outputExamples(
  examples: readonly { id: string; criterionId: string; input: string; expected: string }[],
): string {
  const rows = examples.map(
    (example) =>
      `| ${example.id} | ${example.criterionId} | ${escapeTableCell(example.input)} | ${escapeTableCell(example.expected)} |`,
  );
  return `# Examples\n\n## Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`;
}

/** The placeholders of the `qfai-sdd` business flow template. */
const FLOW_PURPOSE_PLACEHOLDER = "`<Who carries out this flow, and the outcome it reaches.>`";
const FLOW_PATHS_PLACEHOLDER =
  "- `<branch, failure, interruption or resumption, and where it leads>`";

function outputFlow(title: string, id: string, diagram: string, prose: string): string {
  return [
    `# ${id}: ${title}`,
    "## Purpose",
    prose || FLOW_PURPOSE_PLACEHOLDER,
    "## Flow",
    `\`\`\`mermaid\n${diagram.trim()}\n\`\`\``,
    "## Alternate and exception paths",
    `${FLOW_PATHS_PLACEHOLDER}\n`,
  ].join("\n\n");
}

function outputFlowIndex(flows: readonly { id: string; title: string }[]): string {
  const rows = flows.map(
    (flow) =>
      `| ${flow.id} | ${escapeTableCell(flow.title)} | \`business-flow-${flow.id.slice(3)}/\` |`,
  );
  return `# Business Flows\n\n## Flows\n\n| BF-ID | Flow | Path |\n| --- | --- | --- |\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`;
}

function outputStoryIndex(stories: readonly { id: string; title: string }[]): string {
  const rows = stories.map(
    (story) =>
      `| ${story.id} | ${escapeTableCell(story.title)} | \`user-story-${story.id.slice(3)}/\` |`,
  );
  return `# User Stories\n\n## Stories\n\n| US-ID | Story | Path |\n| --- | --- | --- |\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`;
}

async function templateDiagram(): Promise<string> {
  const assetRoot = getInitAssetsDir();
  for (const dir of ["skill", "skills"]) {
    const file = path.join(
      assetRoot,
      ".qfai/assistant",
      dir,
      "qfai-sdd/templates/spec/02_business-flow/business-flow-NNNN/business-flow.md",
    );
    const raw = await readOptional(file);
    if (raw !== null)
      return /```mermaid\s*\n([\s\S]*?)\n```/m.exec(raw)?.[1] ?? "flowchart LR\n  Start --> Finish";
  }
  throw new MigrationInputError("The qfai-sdd business flow template is missing");
}

async function archiveSource(
  context: MigrationContext,
  source: string,
  target: string,
): Promise<MigrationOperation[]> {
  const original = await readOptional(path.join(context.root, source));
  if (original === null) return [];
  const archived = await readOptional(path.join(context.root, target));
  if (archived !== null && archived !== original) {
    throw new MigrationInputError(`${target} differs from ${source}`);
  }
  return archived === null
    ? [{ kind: "move", source, target }]
    : [{ kind: "remove", target: source, description: "remove after archival" }];
}

async function archiveExamples(
  context: MigrationContext,
  pack: OldPack,
  source: string,
  target: string,
  map: MigrationIdMap,
): Promise<MigrationOperation[]> {
  const current = await readOptional(path.join(context.root, source));
  const archived = await readOptional(path.join(context.root, target));
  const original = archived ?? current;
  if (original === null) return [];
  const records = parseLegacyRecords(original, "EX", source);
  const mapped = new Set(
    records.filter((record) => map.ids[pack.id]?.[record.id]).map((record) => record.id),
  );
  const remaining = withoutLegacyRecords(original, records, mapped);
  if (current !== null && current !== original && current !== remaining) {
    throw new MigrationInputError(`${source} differs from its archived unmapped examples`);
  }
  const operations: MigrationOperation[] = [];
  if (records.length === mapped.size) {
    if (current === null) return operations;
    operations.push(
      archived === null
        ? { kind: "move", source, target }
        : {
            kind: "remove",
            target: source,
            description: "archive complete; remove migrated examples",
          },
    );
    return operations;
  }
  if (archived === null) operations.push({ kind: "write", target, content: original });
  if (current !== null && current !== remaining) {
    operations.push({ kind: "write", target: source, content: remaining });
  }
  return operations;
}

/**
 * Refuses an `examples` entry that names no example of an active pack, is for an example no
 * test-case row cites, names a criterion of another pack or one no citing row names, or places
 * an example the existing ID map does not hold.
 */
function assertExampleEntries(
  entries: readonly PlannedExample[],
  packs: readonly OldPack[],
  map: MigrationIdMap | null,
): void {
  for (const entry of entries) {
    const pack = packs.find((candidate) => candidate.id === packOf(entry.id));
    const example = pack?.examples.find((candidate) => candidate.id === entry.id);
    if (!pack || pack.retired || !example) {
      throw new MigrationInputError(`${PLAN_PATH}: unknown active example ${entry.id}`);
    }
    if (
      packOf(entry.criterion) !== pack.id ||
      !pack.criteria.some((c) => c.id === entry.criterion)
    ) {
      throw new MigrationInputError(
        `${PLAN_PATH}: ${entry.id} names criterion ${entry.criterion}, which is not a criterion of ${pack.id}`,
      );
    }
    if (retiredLegacyStatus(example.status)) {
      throw new MigrationInputError(
        `${PLAN_PATH}: ${entry.id} is ${example.status} and cannot be placed`,
      );
    }
    const cited = pack.cases.filter((item) => item.examples.includes(entry.id));
    if (!cited.some((item) => item.criteria.includes(entry.criterion))) {
      throw new MigrationInputError(
        `${PLAN_PATH}: ${entry.id} is placed under ${entry.criterion}, which ${
          cited.length === 0 ? "no test-case row cites it under" : "no citing test-case row names"
        }`,
      );
    }
    if (map !== null && map.ids[pack.id]?.[entry.id] === undefined) {
      throw new MigrationInputError(
        `${PLAN_PATH}: ${entry.id} places an example the ID map does not hold`,
      );
    }
  }
}

export const step04: MigrationStep = {
  number: 4,
  writeSet: ["qfai", "specs", "contracts"],
  sections: ["For a person"],
  async plan(context: MigrationContext) {
    const operations: MigrationOperation[] = [];
    const forAPerson: string[] = [];
    const packIds = await listPacks(context.specsDir);
    const existingMap = await readIdMap(context.root);
    // With no spec pack left there is nothing to place, so no plan is read.
    if (packIds.length === 0) return { operations, forAPerson };
    const plan = await readMigrationPlan(context);
    if (plan === null) throw new MigrationInputError(`${PLAN_PATH} is missing`);
    const packs = await Promise.all(packIds.map((id) => readOldPack(context, id)));
    if (existingMap !== null && packs.every((pack) => pack.retired)) {
      assertUnchangedPlacements(plan, existingMap);
      // An entry the map does not hold places an item outside it, whatever the packs' status.
      const added = plan.examples.filter(
        (entry) => existingMap.ids[packOf(entry.id)]?.[entry.id] === undefined,
      );
      assertExampleEntries(added, packs, existingMap);
      return { operations, forAPerson };
    }
    assertExampleEntries(plan.examples, packs, existingMap);
    for (const pack of packs.filter((item) => !item.retired)) {
      for (const story of pack.stories.filter((item) => item.title === "")) {
        forAPerson.push(
          `${relative(context.root, pack.dir)}/02_User-stories.md: ${story.id} has no unique title in its H2 or US Catalog`,
        );
      }
    }
    if (forAPerson.length > 0) return { operations, forAPerson };
    const byPack = new Map(packs.map((pack) => [pack.id, pack]));
    const storyById = new Map(
      packs.flatMap((pack) => pack.stories.map((story) => [story.id, story] as const)),
    );
    const criterionById = new Map(
      packs.flatMap((pack) => pack.criteria.map((item) => [item.id, item] as const)),
    );
    const ownerByCriterion = new Map<string, string>();
    for (const flow of plan.flows) {
      for (const planned of flow.stories) {
        const story = storyById.get(planned.id);
        if (!story || byPack.get(packOf(planned.id))?.retired) {
          throw new MigrationInputError(`${PLAN_PATH}: unknown active story ${planned.id}`);
        }
        const pack = byPack.get(packOf(planned.id));
        for (const criterion of pack?.criteria ?? []) {
          if (criterion.parent !== planned.id) continue;
          const owner = ownerByCriterion.get(criterion.id);
          if (owner && owner !== planned.id) {
            throw new MigrationInputError(
              `${PLAN_PATH}: ${criterion.id} belongs to more than one story`,
            );
          }
          ownerByCriterion.set(criterion.id, planned.id);
        }
        for (const criterionId of planned.criteria) {
          const criterion = criterionById.get(criterionId);
          if (!criterion || packOf(criterionId) !== packOf(planned.id)) {
            throw new MigrationInputError(`${PLAN_PATH}: unknown criterion ${criterionId}`);
          }
          const owner = ownerByCriterion.get(criterionId);
          if (
            (owner && owner !== planned.id) ||
            (criterion.parent && criterion.parent !== planned.id)
          ) {
            throw new MigrationInputError(
              `${PLAN_PATH}: ${criterionId} belongs to more than one story`,
            );
          }
          ownerByCriterion.set(criterionId, planned.id);
        }
      }
    }
    const exampleCriterion = new Map<string, string>();
    const entryCriterion = new Map(plan.examples.map((entry) => [entry.id, entry.criterion]));
    for (const pack of packs) {
      for (const example of pack.examples) {
        if (retiredLegacyStatus(example.status)) continue;
        const criterion =
          entryCriterion.get(example.id) ?? derivedCriterion(example.id, pack.cases);
        if (
          criterion &&
          ownerByCriterion.has(criterion) &&
          hasConvertibleCriterion(criterion, criterionById)
        )
          exampleCriterion.set(example.id, criterion);
      }
    }
    const contracts = existingMap?.contracts ?? (await readContractMap(context.root)) ?? {};
    const ruleContracts = await ruleContractIds(context, plan, contracts);
    const numberedInput: NumberingInput = {
      flows: plan.flows.map((flow) => ({
        name: flow.title,
        stories: flow.stories.map((planned) => {
          const pack = byPack.get(packOf(planned.id));
          if (!pack) throw new MigrationInputError(`${PLAN_PATH}: missing pack for ${planned.id}`);
          const criteria = pack.criteria
            .filter(
              (item) =>
                ownerByCriterion.get(item.id) === planned.id && criterionShape(item) !== null,
            )
            .map((item) => item.id);
          const examples = [
            ...pack.examples
              .filter(
                (item) => ownerByCriterion.get(exampleCriterion.get(item.id) ?? "") === planned.id,
              )
              .map((item) => item.id),
            ...pack.cases
              .filter(
                (item) =>
                  item.examples.length === 0 &&
                  item.danglingExamples.length <= 1 &&
                  !item.invalidExampleReference &&
                  item.criteria.length === 1 &&
                  ownerByCriterion.get(item.criteria[0] ?? "") === planned.id &&
                  hasConvertibleCriterion(item.criteria[0] ?? "", criterionById),
              )
              .map((item) => item.id),
          ];
          return { id: planned.id, criteria, examples };
        }),
      })),
      rules: plan.rules.map((rule) => ({
        id: rule.id,
        contract: ruleContracts.get(rule.id) ?? "",
      })),
    };
    for (const rule of [...plan.rules, ...plan.marks]) {
      const pack = byPack.get(packOf(rule.id));
      const oldRule = pack?.rules.find((candidate) => candidate.id === rule.id);
      if (!oldRule || pack?.retired) {
        throw new MigrationInputError(`${PLAN_PATH}: unknown active rule ${rule.id}`);
      }
      const retiring = "retire" in rule && rule.retire !== null;
      if (retiredLegacyStatus(oldRule.status) && !retiring) {
        throw new MigrationInputError(
          `${PLAN_PATH}: ${rule.id} is ${oldRule.status} and cannot be placed`,
        );
      }
      if ("retire" in rule && rule.retire === null && !isDashReference(oldRule.contractRefs)) {
        throw new MigrationInputError(
          `${PLAN_PATH}: ${rule.id} binds none, but its Contract-Refs is not "-"`,
        );
      }
    }
    const numbered = numberPlannedItems(numberedInput);
    const placements: MigrationIdMap["placements"] = plannedPlacements(plan);
    const ids: MigrationIdMap["ids"] = {};
    for (const pack of packs) {
      ids[pack.id] = {};
    }
    for (const group of [numbered.stories, numbered.criteria, numbered.examples, numbered.rules]) {
      for (const [oldId, newId] of Object.entries(group)) {
        const packMap = (ids[packOf(oldId)] ??= {});
        packMap[oldId] = newId;
      }
    }
    for (const pack of packs) {
      for (const testCase of pack.cases) {
        if (testCase.examples.length === 1 && testCase.danglingExamples.length === 0) {
          const exampleId = ids[pack.id]?.[testCase.examples[0] ?? ""];
          const packMap = ids[pack.id];
          if (exampleId && packMap) packMap[testCase.id] = exampleId;
        }
      }
    }
    const retiredPacks: Record<string, string> = {};
    const decisionText = await readOptional(path.join(context.specsDir, "decisions.md"));
    if (decisionText !== null) {
      const table = parseRecordTable(decisionText, "decisions");
      if (table.errors.length > 0)
        throw new MigrationInputError("decisions.md has an invalid table");
      for (const pack of packs.filter((item) => item.retired)) {
        const row = table.rows.find((item) =>
          item.content.includes(`${pack.id}/01_Spec.md#${pack.id}`),
        );
        if (row) retiredPacks[pack.id] = row.id;
      }
    }
    const computedMap: MigrationIdMap = { version: 1, ids, placements, retiredPacks, contracts };
    if (existingMap !== null) {
      assertUnchangedPlacements(plan, existingMap);
      for (const [pack, entries] of Object.entries(ids)) {
        for (const [oldId, newId] of Object.entries(entries)) {
          const prior = existingMap.ids[pack]?.[oldId];
          if (prior !== newId) {
            throw new MigrationInputError(`${PLAN_PATH}: numbering changed for ${oldId}`);
          }
        }
      }
      // An example the map holds and this run no longer places would be dropped from the story
      // tree while its annotations still map to it.
      for (const pack of packs.filter((item) => !item.retired)) {
        for (const example of pack.examples) {
          const prior = existingMap.ids[pack.id]?.[example.id];
          if (prior !== undefined && ids[pack.id]?.[example.id] === undefined) {
            throw new MigrationInputError(`${PLAN_PATH}: numbering changed for ${example.id}`);
          }
        }
      }
    } else {
      operations.push({ kind: "write", target: ID_MAP_PATH, content: serializeIdMap(computedMap) });
    }
    const map = existingMap ?? computedMap;
    forAPerson.push(
      ...reportUnplaced(context.root, packs, plan, ownerByCriterion, exampleCriterion),
    );
    const specsRelative = relative(context.root, context.specsDir);
    const policyDir = path.join(context.specsDir, "_policies");
    const oldFlowText =
      (await readOptional(path.join(policyDir, "04_Business-Flow.md"))) ??
      (await readOptional(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/_policies/04_Business-Flow.md",
        ),
      )) ??
      "";
    const fallbackDiagram = await templateDiagram();
    operations.push({
      kind: "write",
      target: `${specsRelative}/02_business-flow/business-flows.md`,
      content: outputFlowIndex(
        plan.flows.map((flow) => ({ id: numbered.flows[flow.title] ?? "", title: flow.title })),
      ),
    });
    for (const flow of plan.flows) {
      const flowId = numbered.flows[flow.title];
      if (!flowId) throw new MigrationInputError(`${PLAN_PATH}: flow ${flow.title} has no ID`);
      const flowDir = `${specsRelative}/02_business-flow/business-flow-${flowId.slice(3)}`;
      const { diagram, prose } = flowSource(oldFlowText, flow.from);
      if (!flow.from || !diagram)
        forAPerson.push(`${PLAN_PATH}: ${flow.title} has no old flow diagram`);
      const missing = prose ? "" : "no purpose and ";
      forAPerson.push(
        `${flowDir}/business-flow.md: ${flowId} has ${missing}no alternate and exception paths; write them`,
      );
      operations.push({
        kind: "write",
        target: `${flowDir}/business-flow.md`,
        content: outputFlow(flow.title, flowId, diagram ?? fallbackDiagram, prose),
      });
      operations.push({
        kind: "write",
        target: `${flowDir}/user-stories.md`,
        content: outputStoryIndex(
          flow.stories.map((planned) => ({
            id: map.ids[packOf(planned.id)]?.[planned.id] ?? "",
            title: storyById.get(planned.id)?.title ?? planned.id,
          })),
        ),
      });
      for (const planned of flow.stories) {
        const story = storyById.get(planned.id);
        const pack = byPack.get(packOf(planned.id));
        const storyId = map.ids[packOf(planned.id)]?.[planned.id];
        if (!story || !pack || !storyId) continue;
        const locations = storyPaths(specsRelative, flowId, storyId);
        const packMap = { ...(map.ids[pack.id] ?? {}), ...oldContractIds(map.contracts) };
        const mappedCriteria = pack.criteria.filter(
          (item) => ownerByCriterion.get(item.id) === story.id && criterionShape(item) !== null,
        );
        const [storyFile = "", criteriaFile = "", exampleFile = ""] = locations.files;
        forAPerson.push(
          ...criteriaForAPerson(
            `${relative(context.root, pack.dir)}/03_Acceptance-Criteria.md`,
            criteriaFile,
            mappedCriteria,
            packMap,
          ),
        );
        const mappedExamples = pack.examples
          .filter((item) => ownerByCriterion.get(exampleCriterion.get(item.id) ?? "") === story.id)
          .map((item) => {
            const id = packMap[item.id] ?? "";
            const plain = plainExampleCells(item.input, item.expected);
            for (const column of plain.notPlain) {
              forAPerson.push(
                `${exampleFile}: ${id} ${column} is Gherkin steps, not one plain value; rewrite it`,
              );
            }
            const criterionId = packMap[exampleCriterion.get(item.id) ?? ""] ?? "";
            return { id, criterionId, input: plain.input, expected: plain.expected };
          });
        forAPerson.push(
          ...unmappedContracts(
            storyFile,
            [story.body, ...mappedCriteria.map((item) => item.text)],
            packMap,
          ),
        );
        const found = storyParts(story.body);
        const parts = found !== null && "sentence" in found ? found : null;
        if (found === null) {
          forAPerson.push(
            `${storyFile}: ${storyId} is not one "As a <actor>, I want <goal>, so that <benefit>." sentence; rewrite its User Story`,
          );
        } else if ("missing" in found) {
          forAPerson.push(
            `${storyFile}: ${storyId} is missing the ${found.missing.join(" and ")} part of "As a <actor>, I want <goal>, so that <benefit>."; complete its User Story`,
          );
        }
        operations.push({
          kind: "write",
          target: storyFile,
          content: outputStory(story, storyId, packMap, parts),
        });
        const criteriaText = outputCriteria(story, mappedCriteria, packMap);
        if (criteriaText === null) {
          forAPerson.push(
            `${criteriaFile}: ${storyId} has no criterion that takes a new ID${namedByNote(pack, planned)}`,
          );
          // Nothing tells an earlier step 4's output from a file a person wrote, so an
          // existing criteria file is kept and named for the person resolving the story.
          if ((await readOptional(path.join(context.root, criteriaFile))) !== null) {
            forAPerson.push(
              `${criteriaFile}: the existing file is kept; check that it states ${storyId}'s criteria`,
            );
          }
        } else {
          // A criteria file that differs from what step 4 writes was edited after an
          // earlier run, so it is kept rather than overwritten.
          const existing = await readOptional(path.join(context.root, criteriaFile));
          if (existing === null || existing === criteriaText) {
            operations.push({ kind: "write", target: criteriaFile, content: criteriaText });
          } else {
            forAPerson.push(
              `${criteriaFile}: the existing file differs from what step 4 writes and is kept; check that it states ${storyId}'s criteria`,
            );
          }
        }
        operations.push({
          kind: "write",
          target: exampleFile,
          content: outputExamples(mappedExamples),
        });
      }
    }
    for (const pack of packs) {
      for (const [file, allMapped] of [
        [
          "02_User-stories.md",
          pack.retired || pack.stories.every((story) => Boolean(map.ids[pack.id]?.[story.id])),
        ],
        [
          "03_Acceptance-Criteria.md",
          pack.retired ||
            pack.criteria.every((criterion) => Boolean(map.ids[pack.id]?.[criterion.id])),
        ],
        [
          "05_Examples.md",
          pack.retired || pack.examples.every((example) => Boolean(map.ids[pack.id]?.[example.id])),
        ],
      ] as const) {
        const source = `${specsRelative}/${pack.id}/${file}`;
        if (file === "05_Examples.md") {
          operations.push(
            ...(await archiveExamples(
              context,
              pack,
              source,
              `.qfai/evidence/migration-spec-to-story/retired/${pack.id}/${file}`,
              map,
            )),
          );
          continue;
        }
        if (!allMapped) continue;
        operations.push(
          ...(await archiveSource(
            context,
            source,
            `.qfai/evidence/migration-spec-to-story/retired/${pack.id}/${file}`,
          )),
        );
      }
      for (const file of ["06_Test-Cases.md", "10_Plan.md", "16_Traceability-ledger.md"]) {
        const source = `${specsRelative}/${pack.id}/${file}`;
        operations.push(
          ...(await archiveSource(
            context,
            source,
            `.qfai/evidence/migration-spec-to-story/retired/${pack.id}/${file}`,
          )),
        );
      }
      const tddPath = path.join(pack.dir, "tdd");
      try {
        await readdir(tddPath);
        operations.push({
          kind: "move",
          source: `${specsRelative}/${pack.id}/tdd`,
          target: `.qfai/evidence/migration-spec-to-story/retired/${pack.id}/tdd`,
        });
      } catch (error: unknown) {
        if (!isEnoent(error))
          throw new MigrationInputError(
            `${tddPath}: ${error instanceof Error ? error.message : String(error)}`,
          );
      }
    }
    for (const file of ["03_Capabilities.md", "04_Business-Flow.md"]) {
      const source = `${specsRelative}/_policies/${file}`;
      operations.push(
        ...(await archiveSource(
          context,
          source,
          `.qfai/evidence/migration-spec-to-story/retired/_policies/${file}`,
        )),
      );
    }
    try {
      const policyEntries = await readdir(policyDir);
      if (
        policyEntries.length > 0 &&
        policyEntries.every((entry) =>
          ["03_Capabilities.md", "04_Business-Flow.md"].includes(entry),
        )
      ) {
        operations.push({ kind: "remove-empty-directory", target: `${specsRelative}/_policies` });
      }
    } catch (error: unknown) {
      if (!isEnoent(error)) {
        throw new MigrationInputError(
          `${policyDir}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { operations, forAPerson };
  },
};

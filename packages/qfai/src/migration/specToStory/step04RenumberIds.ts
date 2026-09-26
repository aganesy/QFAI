import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parseDocument } from "yaml";

import { isEnoent } from "../../core/fs/errno.js";
import { extractH2Sections, parseHeadings } from "../../core/parse/markdown.js";
import { escapeTableCell } from "../../core/specPackParsers.js";
import { nextId } from "../../core/storyTree/ids.js";
import { storyPaths } from "../../core/storyTree/layout.js";
import { parseRecordTable } from "../../core/storyTree/tables.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import { ID_MAP_PATH, readIdMap, serializeIdMap, type MigrationIdMap } from "./idMap.js";
import { parseLegacyRecords, retiredLegacyStatus, withoutLegacyRecords } from "./legacyRecords.js";
import {
  MigrationInputError,
  type MigrationContext,
  type MigrationOperation,
  type MigrationStep,
} from "./harness.js";

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
  rules: readonly string[];
};

export type PlannedStory = { id: string; criteria: string[] };
export type PlannedFlow = { title: string; from?: string | undefined; stories: PlannedStory[] };
export type PlannedRule = { id: string; contract: string };
export type MigrationPlan = { flows: PlannedFlow[]; rules: PlannedRule[] };

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
  if (isObject(value) && !hasOnlyKeys(value, ["flows", "rules"])) {
    const unknown = Object.keys(value).find((key) => key !== "flows" && key !== "rules");
    throw new MigrationInputError(`${PLAN_PATH}: unknown field ${unknown}`);
  }
  if (!isObject(value) || !Array.isArray(value.flows) || !Array.isArray(value.rules)) {
    throw new MigrationInputError(`${PLAN_PATH}: flows and rules must be lists`);
  }
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
  const seenRules = new Set<string>();
  for (const entry of value.rules) {
    const placement = isObject(entry) && typeof entry.contract === "string" ? entry.contract : "";
    if (
      !isObject(entry) ||
      !hasOnlyKeys(entry, ["id", "contract"]) ||
      typeof entry.id !== "string" ||
      !/^BR-\d{4}-\d{4}$/.test(entry.id) ||
      typeof entry.contract !== "string" ||
      entry.contract.trim() === "" ||
      !/\.(?:ya?ml|json|sql|md)$/i.test(entry.contract) ||
      path.isAbsolute(entry.contract) ||
      entry.contract.split(/[\\/]/).includes("..") ||
      !path
        .resolve(context.contractsDir, entry.contract)
        .startsWith(`${context.contractsDir}${path.sep}`)
    ) {
      throw new MigrationInputError(`${PLAN_PATH}: invalid rule placement ${placement}`.trimEnd());
    }
    if (seenRules.has(entry.id))
      throw new MigrationInputError(`${PLAN_PATH}: duplicate rule ${entry.id}`);
    seenRules.add(entry.id);
    rules.push({ id: entry.id, contract: entry.contract.replace(/\\/g, "/") });
  }
  return { flows, rules };
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
    numbered.rules[rule] = nextId("BR", Object.values(numbered.rules));
  }
  return numbered;
}

type OldStory = { id: string; title: string; body: string };
type OldCriterion = { id: string; parent: string | null; text: string };
type OldExample = { id: string; input: string; expected: string; status: string };
type OldCase = {
  id: string;
  criteria: string[];
  examples: string[];
  danglingExamples: string[];
  invalidExampleReference: boolean;
};
type OldRule = { id: string; statement: string; status: string };
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
): Array<{ id: string; title: string; body: string; line: number }> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const h2 = parseHeadings(text).filter((heading) => heading.level === 2);
  const headings = h2.filter((heading) =>
    new RegExp(`^${prefix}-\\d{4}-\\d{4}(?::|$)`).test(heading.title),
  );
  return headings.map((heading) => {
    const id = new RegExp(`^${prefix}-\\d{4}-\\d{4}`).exec(heading.title)?.[0] ?? "";
    const next = h2.find((candidate) => candidate.line > heading.line);
    return {
      id,
      line: heading.line,
      title: heading.title.replace(new RegExp(`^${id}:?\\s*`), "").trim(),
      body: lines
        .slice(heading.line, (next?.line ?? lines.length + 1) - 1)
        .join("\n")
        .trim(),
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

export function parseOldCriteria(text: string): OldCriterion[] {
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
        text: entry.body,
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
        text: block,
      },
    });
  }
  return [...byId.values()]
    .sort((left, right) => left.line - right.line)
    .map(({ criterion }) => criterion);
}

function criterionScenario(criterion: OldCriterion): string | null {
  const fenced = /```gherkin\s*\n([\s\S]*?)\n```/m.exec(criterion.text)?.[1];
  const source = fenced ?? criterion.text.replace(/\n```[\s\S]*$/m, "");
  const start = source.search(/^Scenario(?: Outline)?:\s+\S/m);
  if (start < 0) return null;
  const scenario = source.slice(start).trim();
  if (
    !/^\s*Given\s+\S/m.test(scenario) ||
    !/^\s*When\s+\S/m.test(scenario) ||
    !/^\s*Then\s+\S/m.test(scenario)
  ) {
    return null;
  }
  return scenario;
}

function hasConvertibleCriterion(id: string, criteria: ReadonlyMap<string, OldCriterion>): boolean {
  const criterion = criteria.get(id);
  return criterion !== undefined && criterionScenario(criterion) !== null;
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
  const criteria = parseOldCriteria(raw["03_Acceptance-Criteria.md"]);
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
    /\b(?:US|AC|EX|BR|TC)-\d{4}-\d{4}\b/g,
    (oldId) => replacements[oldId] ?? oldId,
  );
}

function flowMermaid(text: string, selector: string | undefined): string | null {
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
    if (!selector.startsWith("CHG-")) {
      throw new MigrationInputError(`${PLAN_PATH}: invalid flow source ${selector}`);
    }
    const headings = parseHeadings(text).filter(
      (heading) => heading.level === 2 && heading.title === selector,
    );
    if (headings.length !== 1)
      throw new MigrationInputError(`${PLAN_PATH}: ambiguous or missing flow source ${selector}`);
    selected = extractH2Sections(text).get(selector)?.body ?? "";
  }
  return /```mermaid\s*\n([\s\S]*?)\n```/m.exec(selected)?.[1] ?? null;
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
  const placedRules = new Set(plan.rules.map((rule) => rule.id));
  const forAPerson: string[] = [];
  for (const pack of packs) {
    if (pack.retired) continue;
    const base = relative(root, pack.dir);
    for (const story of pack.stories) {
      if (!placedStories.has(story.id)) {
        forAPerson.push(`${base}/02_User-stories.md: ${story.id} has no flow in plan.yaml`);
      }
    }
    for (const criterion of pack.criteria) {
      if (!ownerByCriterion.has(criterion.id)) {
        forAPerson.push(
          `${base}/03_Acceptance-Criteria.md: ${criterion.id} has no single placed story`,
        );
      } else if (criterionScenario(criterion) === null) {
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
        pack.criteria.some((item) => item.id === criterion && criterionScenario(item) !== null);
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

function sourceScope(pack: OldPack): string | null {
  const text = pack.raw["01_Spec.md"];
  const headings = parseHeadings(text).filter(
    (heading) => heading.level === 2 && heading.title === "Scope",
  );
  if (headings.length > 1) {
    throw new MigrationInputError(`${pack.id}/01_Spec.md has several Scope sections`);
  }
  return headings.length === 1 ? extractH2Sections(text).get("Scope")?.body.trim() || null : null;
}

function outputStory(
  story: OldStory,
  newId: string,
  ids: Record<string, string>,
  pack: OldPack,
  scope: string | null,
): string {
  const body = replacedIds(story.body, ids).trim();
  const archive = `.qfai/evidence/migration-spec-to-story/retired/${pack.id}`;
  const sourceScopeText = scope ?? "The legacy source has no Scope section.";
  return `# ${newId}: ${story.title}\n\n## User Story\n\n${body}\n\n## Legacy Source Scope\n\n${sourceScopeText}\n\n## Source Provenance\n\n- Spec scope: \`${archive}/01_Spec.md#scope\`\n- Story block: \`${archive}/02_User-stories.md#${story.id.toLowerCase()}\`\n`;
}

function outputCriteria(
  story: OldStory,
  criteria: readonly OldCriterion[],
  ids: Record<string, string>,
): string {
  if (criteria.length === 0) return `# Acceptance Criteria\n\n## Criteria\n`;
  const blocks = criteria.map((criterion) => {
    const scenario = criterionScenario(criterion);
    if (scenario === null) throw new MigrationInputError(`${criterion.id} has no Gherkin scenario`);
    return `# ${ids[criterion.id]}\n# Parent: ${ids[story.id]}\n${replacedIds(scenario, ids)}`;
  });
  return `# Acceptance Criteria\n\n## Criteria\n\n\`\`\`gherkin\nFeature: ${story.title}\n\n${blocks.join("\n\n")}\n\`\`\`\n`;
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

function outputFlow(title: string, id: string, diagram: string): string {
  return `# ${id}: ${title}\n\n## Purpose\n\n- ${title}\n\n## Flow\n\n\`\`\`mermaid\n${diagram.trim()}\n\`\`\`\n`;
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

export const step04: MigrationStep = {
  number: 4,
  writeSet: ["qfai", "specs", "contracts"],
  sections: ["For a person"],
  async plan(context: MigrationContext) {
    const operations: MigrationOperation[] = [];
    const forAPerson: string[] = [];
    const packIds = await listPacks(context.specsDir);
    const existingMap = await readIdMap(context.root);
    if (packIds.length === 0 && existingMap === null) return { operations, forAPerson };
    const plan = await readMigrationPlan(context);
    if (plan === null) throw new MigrationInputError(`${PLAN_PATH} is missing`);
    if (packIds.length === 0 && existingMap !== null) {
      assertUnchangedPlacements(plan, existingMap);
      return { operations, forAPerson };
    }
    const packs = await Promise.all(packIds.map((id) => readOldPack(context, id)));
    if (existingMap !== null && packs.every((pack) => pack.retired)) {
      assertUnchangedPlacements(plan, existingMap);
      return { operations, forAPerson };
    }
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
    for (const pack of packs) {
      for (const example of pack.examples) {
        if (retiredLegacyStatus(example.status)) continue;
        const criterion = derivedCriterion(example.id, pack.cases);
        if (
          criterion &&
          ownerByCriterion.has(criterion) &&
          hasConvertibleCriterion(criterion, criterionById)
        )
          exampleCriterion.set(example.id, criterion);
      }
    }
    const numberedInput: NumberingInput = {
      flows: plan.flows.map((flow) => ({
        name: flow.title,
        stories: flow.stories.map((planned) => {
          const pack = byPack.get(packOf(planned.id));
          if (!pack) throw new MigrationInputError(`${PLAN_PATH}: missing pack for ${planned.id}`);
          const criteria = pack.criteria
            .filter(
              (item) =>
                ownerByCriterion.get(item.id) === planned.id && criterionScenario(item) !== null,
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
      rules: plan.rules.map((rule) => rule.id),
    };
    for (const rule of plan.rules) {
      const pack = byPack.get(packOf(rule.id));
      const oldRule = pack?.rules.find((candidate) => candidate.id === rule.id);
      if (!oldRule || pack?.retired) {
        throw new MigrationInputError(`${PLAN_PATH}: unknown active rule ${rule.id}`);
      }
      if (retiredLegacyStatus(oldRule.status)) {
        throw new MigrationInputError(
          `${PLAN_PATH}: ${rule.id} is ${oldRule.status} and cannot be placed`,
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
    const computedMap: MigrationIdMap = { version: 1, ids, placements, retiredPacks };
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
    const scopeByPack = new Map(packs.map((pack) => [pack.id, sourceScope(pack)] as const));
    const missingScopes = new Set<string>();
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
      const diagram = flowMermaid(oldFlowText, flow.from);
      if (!flow.from || !diagram)
        forAPerson.push(`${PLAN_PATH}: ${flow.title} has no old flow diagram`);
      operations.push({
        kind: "write",
        target: `${flowDir}/business-flow.md`,
        content: outputFlow(flow.title, flowId, diagram ?? fallbackDiagram),
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
        const packMap = map.ids[pack.id] ?? {};
        const scope = scopeByPack.get(pack.id) ?? null;
        if (scope === null && !missingScopes.has(pack.id)) {
          forAPerson.push(`${relative(context.root, pack.dir)}/01_Spec.md: Scope is missing`);
          missingScopes.add(pack.id);
        }
        const mappedCriteria = pack.criteria.filter(
          (item) => ownerByCriterion.get(item.id) === story.id && criterionScenario(item) !== null,
        );
        const mappedExamples = pack.examples
          .filter((item) => ownerByCriterion.get(exampleCriterion.get(item.id) ?? "") === story.id)
          .map((item) => ({
            id: packMap[item.id] ?? "",
            criterionId: packMap[exampleCriterion.get(item.id) ?? ""] ?? "",
            input: item.input,
            expected: item.expected,
          }));
        operations.push({
          kind: "write",
          target: locations.files[0] ?? "",
          content: outputStory(story, storyId, packMap, pack, scope),
        });
        operations.push({
          kind: "write",
          target: locations.files[1] ?? "",
          content: outputCriteria(story, mappedCriteria, packMap),
        });
        operations.push({
          kind: "write",
          target: locations.files[2] ?? "",
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

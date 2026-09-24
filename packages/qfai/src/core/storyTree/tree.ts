import fs from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { parseHeadings } from "../parse/markdown.js";
import { parseAllMarkdownTables } from "../specPackParsers.js";
import { extractFencedCodeBlocks } from "../validators/mermaidUtils.js";
import { parseContractRules, type ContractRule } from "./contractRules.js";
import { resolveStoryTreeRoots } from "./layout.js";
import { parseRecordTable, type ParsedRecordTable } from "./tables.js";

export type StoryTreeDeclaration = { id: string; file: string };
export type FlowDefinition = StoryTreeDeclaration & { directory: string };
export type StoryDefinition = StoryTreeDeclaration & { flowId: string; directory: string };
export type CriterionDefinition = StoryTreeDeclaration & { storyId: string };
export type ExampleDefinition = StoryTreeDeclaration & { storyId: string; acRef: string };
export type RuleReference = StoryTreeDeclaration;

export type StoryTreeModel = {
  flows: FlowDefinition[];
  stories: StoryDefinition[];
  acceptanceCriteria: CriterionDefinition[];
  examples: ExampleDefinition[];
  rules: ContractRule[];
  ruleRefs: RuleReference[];
  declarations: StoryTreeDeclaration[];
  decisions: ParsedRecordTable | null;
  decisionFile: string | null;
  openQuestions: ParsedRecordTable | null;
  openQuestionsFile: string | null;
  contractFiles: string[];
  additionalContractFiles: string[];
  errors: string[];
};

export type StoryTreeModelOptions = { specsDir?: string; contractsDir?: string };

const FLOW_FILE = /(?:^|\/)02_business-flow\/business-flow-(\d{4})\/business-flow\.md$/;
const STORY_FILE =
  /(?:^|\/)02_business-flow\/business-flow-(\d{4})\/user-story-(\d{4}-\d{4})\/01_User-story\.md$/;
const CRITERIA_FILE =
  /(?:^|\/)02_business-flow\/business-flow-\d{4}\/user-story-(\d{4}-\d{4})\/02_Acceptance-Criteria\.md$/;
const EXAMPLE_FILE =
  /(?:^|\/)02_business-flow\/business-flow-\d{4}\/user-story-(\d{4}-\d{4})\/03_Example\.md$/;
const AC_COMMENT = /^\s*#\s*(AC-[A-Za-z0-9_-]+)\s*$/gm;

function normalize(file: string): string {
  return file.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function firstH1Id(text: string, prefix: "BF" | "US"): string | null {
  const heading = parseHeadings(text).find((item) => item.level === 1);
  return (
    new RegExp(`^(${prefix}-[A-Za-z0-9_-]+)(?::|\\s|$)`).exec(heading?.title ?? "")?.[1] ?? null
  );
}

function recordTableFor(
  files: Map<string, string>,
  name: "decisions.md" | "open-questions.md",
  specsDir?: string,
): { file: string; table: ParsedRecordTable } | null {
  const file = specsDir
    ? `${normalize(specsDir)}/${name}`
    : [...files.keys()].find((candidate) => candidate === name || candidate.endsWith(`/${name}`));
  return file && files.has(file)
    ? {
        file,
        table: parseRecordTable(
          files.get(file) ?? "",
          name === "decisions.md" ? "decisions" : "open-questions",
        ),
      }
    : null;
}

export function buildStoryTreeModel(
  files: ReadonlyMap<string, string>,
  options: StoryTreeModelOptions = {},
): StoryTreeModel {
  const texts = new Map([...files.entries()].map(([file, text]) => [normalize(file), text]));
  const contractRoot = options.contractsDir ? normalize(options.contractsDir) : null;
  const model: StoryTreeModel = {
    flows: [],
    stories: [],
    acceptanceCriteria: [],
    examples: [],
    rules: [],
    ruleRefs: [],
    declarations: [],
    decisions: null,
    decisionFile: null,
    openQuestions: null,
    openQuestionsFile: null,
    contractFiles: [],
    additionalContractFiles: [],
    errors: [],
  };
  for (const [file, text] of [...texts.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const flow = FLOW_FILE.exec(file);
    if (flow) {
      const id = firstH1Id(text, "BF");
      if (id) model.flows.push({ id, file, directory: file.slice(0, -"/business-flow.md".length) });
      continue;
    }
    const story = STORY_FILE.exec(file);
    if (story) {
      const id = firstH1Id(text, "US");
      if (id) {
        model.stories.push({
          id,
          file,
          flowId: `BF-${story[1]}`,
          directory: file.slice(0, -"/01_User-story.md".length),
        });
      }
      continue;
    }
    const criteria = CRITERIA_FILE.exec(file);
    if (criteria) {
      for (const block of extractFencedCodeBlocks(text)) {
        if (!block.language || !["gherkin", "feature", "cucumber"].includes(block.language))
          continue;
        for (const match of block.content.matchAll(AC_COMMENT)) {
          model.acceptanceCriteria.push({ id: match[1] ?? "", file, storyId: `US-${criteria[1]}` });
        }
      }
      continue;
    }
    const example = EXAMPLE_FILE.exec(file);
    if (example) {
      for (const table of parseAllMarkdownTables(text)) {
        const idColumn = table.headers.indexOf("EX-ID");
        const acColumn = table.headers.indexOf("AC-Ref");
        if (idColumn < 0 || acColumn < 0) continue;
        for (const row of table.rows) {
          model.examples.push({
            id: row[idColumn] ?? "",
            acRef: row[acColumn] ?? "",
            file,
            storyId: `US-${example[1]}`,
          });
        }
      }
      continue;
    }
    let relative: string | null;
    if (contractRoot) {
      relative = file.startsWith(`${contractRoot}/`) ? file.slice(contractRoot.length + 1) : null;
    } else {
      relative = /(?:^|\/)03_contract\/(.+)$/.exec(file)?.[1] ?? null;
    }
    if (!relative) continue;
    if (
      !/^(?:api|db|ui|cli|design)\//.test(relative) &&
      relative !== "tech.md" &&
      relative !== "structure.md"
    )
      continue;
    model.contractFiles.push(file);
    if (/^(?:cli|design)\//.test(relative)) model.additionalContractFiles.push(file);
    const scan = parseContractRules(file, text);
    model.rules.push(...scan.rules);
    model.ruleRefs.push(...scan.refs.map((id) => ({ id, file })));
    model.errors.push(...scan.errors);
  }
  const decisions = recordTableFor(texts, "decisions.md", options.specsDir);
  const questions = recordTableFor(texts, "open-questions.md", options.specsDir);
  model.decisions = decisions?.table ?? null;
  model.decisionFile = decisions?.file ?? null;
  model.openQuestions = questions?.table ?? null;
  model.openQuestionsFile = questions?.file ?? null;
  model.declarations = [
    ...model.flows,
    ...model.stories,
    ...model.acceptanceCriteria,
    ...model.examples,
    ...model.rules.map(({ id, file }) => ({ id, file })),
    ...(model.decisions?.rows.map(({ id }) => ({ id, file: model.decisionFile ?? "" })) ?? []),
    ...(model.openQuestions?.rows.map(({ id }) => ({ id, file: model.openQuestionsFile ?? "" })) ??
      []),
  ].sort((left, right) => left.id.localeCompare(right.id) || left.file.localeCompare(right.file));
  model.flows.sort((left, right) => left.id.localeCompare(right.id));
  model.stories.sort((left, right) => left.id.localeCompare(right.id));
  model.acceptanceCriteria.sort((left, right) => left.id.localeCompare(right.id));
  model.examples.sort((left, right) => left.id.localeCompare(right.id));
  model.rules.sort((left, right) => left.id.localeCompare(right.id));
  model.ruleRefs.sort((left, right) => left.id.localeCompare(right.id));
  return model;
}

async function collectTexts(directory: string, files: Map<string, string>): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectTexts(file, files);
    else if (entry.isFile()) files.set(file, await fs.readFile(file, "utf8"));
  }
}

export async function readStoryTreeModel(
  root: string,
  config: QfaiConfig,
): Promise<StoryTreeModel> {
  const roots = resolveStoryTreeRoots(root, config);
  const files = new Map<string, string>();
  await collectTexts(roots.specsDir, files);
  if (!roots.contractsDir.startsWith(`${roots.specsDir}${path.sep}`)) {
    await collectTexts(roots.contractsDir, files);
  }
  return buildStoryTreeModel(files, roots);
}

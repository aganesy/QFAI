import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { hashAssistantAssetText } from "../assistantAssetProvenance.js";
import type { QfaiConfig } from "../config.js";
import { resolveFlowScope } from "../flowScope.js";
import { parseStoryTestAnnotations } from "../storyTree/ids.js";
import { readStoryTreeModel, type StoryTreeModel } from "../storyTree/tree.js";
import { countsForExample, readStoryTests } from "../validators/storyTreeObligations.js";
import type {
  WorkflowDiagnosis,
  WorkflowObligationFacts,
  WorkflowRecordsAtIssue,
  WorkflowSeedingTargets,
} from "./types.js";

// A path the story tree model holds, as a project-relative path with `/`.
export function projectRelative(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

export function specsDirOf(root: string, config: QfaiConfig): string {
  return projectRelative(root, path.resolve(root, config.paths.specsDir));
}

function contractsDirOf(root: string, config: QfaiConfig): string {
  return projectRelative(root, path.resolve(root, config.paths.contractsDir));
}

async function readText(file: string): Promise<string> {
  return readFile(file, "utf8").catch(() => "");
}

// The digest of the obligation set: its IDs, and the text of every file that declares one of
// its items or a rule citing one of its examples.
// SIMPLIFIED: an item's text is the whole file that declares it.
// Lift when: an item's text can be read on its own.
async function obligationDigest(ids: string[], files: string[]): Promise<string> {
  const hash = createHash("sha256").update(JSON.stringify(ids));
  for (const file of [...new Set(files)].sort()) {
    hash.update(`\0${hashAssistantAssetText(await readText(file))}`);
  }
  return hash.digest("hex");
}

// The bound flow's BF, AC and EX IDs, and which of its examples a test annotates now.
export async function obligationFactsOf(
  root: string,
  config: QfaiConfig,
  model: StoryTreeModel,
  flowId: string,
): Promise<WorkflowObligationFacts | undefined> {
  const scope = resolveFlowScope([flowId], model);
  if (scope.flowIds.length === 0) return undefined;
  const ids = [...scope.flowIds, ...scope.acceptanceCriteriaIds, ...scope.exampleIds].sort();
  const inScope = new Set(scope.exampleIds);
  const annotated = new Set<string>();
  for (const file of (await readStoryTests(root, config)).files) {
    if (!countsForExample(file)) continue;
    for (const id of parseStoryTestAnnotations(file.content).EX) {
      if (inScope.has(id)) annotated.add(id);
    }
  }
  const declaring = model.declarations
    .filter((item) => ids.includes(item.id))
    .map((item) => item.file);
  return {
    flowId,
    ids,
    exampleIds: scope.exampleIds,
    annotated: [...annotated].sort(),
    digest: await obligationDigest(ids, [...declaring, ...scope.ruleFiles]),
  };
}

// The files that declare an item of the flow or a rule citing one of its examples, which a
// receipt that observed a test depends on.
export async function obligationFilesOf(
  root: string,
  config: QfaiConfig,
  flowId: string,
): Promise<string[]> {
  const model = await readStoryTreeModel(root, config);
  const scope = resolveFlowScope([flowId], model);
  const ids = new Set([...scope.flowIds, ...scope.acceptanceCriteriaIds, ...scope.exampleIds]);
  const files = model.declarations.filter((item) => ids.has(item.id)).map((item) => item.file);
  return [...new Set([...files, ...scope.ruleFiles])]
    .map((file) => projectRelative(root, file))
    .sort();
}

// The criterion a diagnosis's first matched ID names: the ID itself, or an example's criterion.
function matchedCriterion(model: StoryTreeModel, matched: string | undefined) {
  if (matched?.startsWith("AC-")) {
    return model.acceptanceCriteria.find((criterion) => criterion.id === matched);
  }
  const example = model.examples.find((each) => each.id === matched);
  return model.acceptanceCriteria.find((criterion) => criterion.id === example?.acRef);
}

// Where defect example seeding may write: the `03_Example.md` of the story the diagnosis's
// first matched ID names, and every contract whose rules cite that criterion's examples.
export function seedingTargetsOf(
  root: string,
  model: StoryTreeModel,
  diagnosis: WorkflowDiagnosis | null | undefined,
): WorkflowSeedingTargets | undefined {
  const criterion = matchedCriterion(model, diagnosis?.matchedIds[0]);
  if (!criterion) return undefined;
  const story = model.stories.find((each) => each.id === criterion.storyId);
  const examples = new Set(
    model.examples.filter((each) => each.acRef === criterion.id).map((each) => each.id),
  );
  const contracts = model.rules
    .filter((rule) => rule.examples.some((id) => examples.has(id)))
    .map((rule) => projectRelative(root, rule.file));
  return {
    ...(story ? { exampleFile: projectRelative(root, `${story.directory}/03_Example.md`) } : {}),
    contractFiles: [...new Set(contracts)].sort(),
  };
}

// The two tables as they stand, and the contract defect example seeding may extend.
export async function currentRecords(
  root: string,
  config: QfaiConfig,
  seeding: WorkflowSeedingTargets | undefined,
): Promise<WorkflowRecordsAtIssue> {
  const specs = path.resolve(root, config.paths.specsDir);
  const [decisions, openQuestions] = await Promise.all([
    readText(path.join(specs, "decisions.md")),
    readText(path.join(specs, "open-questions.md")),
  ]);
  const [contract] = seeding?.contractFiles.length === 1 ? seeding.contractFiles : [];
  if (contract === undefined) return { decisions, openQuestions };
  return {
    decisions,
    openQuestions,
    contract: { path: contract, text: await readText(path.join(root, contract)) },
  };
}

// The story tree's flows, and for the flow a run binds, its obligations and records.
export async function storyFactsOf(
  root: string,
  config: QfaiConfig,
  flowId: string | undefined,
  diagnosis?: WorkflowDiagnosis | null,
) {
  const model = await readStoryTreeModel(root, config);
  const flows = model.flows.map((flow) => flow.id);
  const specsDir = specsDirOf(root, config);
  const obligations = flowId ? await obligationFactsOf(root, config, model, flowId) : undefined;
  const seeding = seedingTargetsOf(root, model, diagnosis);
  const records = await currentRecords(root, config, seeding);
  return {
    flows,
    specsDir,
    contractsDir: contractsDirOf(root, config),
    records,
    ...(obligations ? { obligations } : {}),
    ...(seeding ? { seeding } : {}),
  };
}

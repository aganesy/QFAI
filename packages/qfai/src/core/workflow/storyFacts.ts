import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolveFlowScope } from "../flowScope.js";
import { parseStoryTestAnnotations } from "../storyTree/ids.js";
import { classifyRecordRow, parseRecordTable } from "../storyTree/tables.js";
import { readStoryTreeModel, type StoryTreeModel } from "../storyTree/tree.js";
import { isEnoent } from "../fs/errno.js";
import {
  countsForExample,
  readStoryTests,
  validateStoryTreeObligationsModel,
} from "../validators/storyTreeObligations.js";
import { obligationDigest } from "./obligationDigest.js";
import type {
  WorkflowDiagnosis,
  WorkflowFacts,
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

// A record or story file that does not exist reads as empty; any other failure to read it is
// the caller's.
async function readText(file: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isEnoent(error)) return "";
    throw error;
  }
}

// Each `Change request:` row of `decisions.md`, whether it is in force, and what it names.
export function changeRequestsOf(decisions: string): NonNullable<WorkflowFacts["changeRequests"]> {
  return parseRecordTable(decisions, "decisions")
    .rows.map(classifyRecordRow)
    .filter((row) => row.kind === "change-request")
    .map((row) => ({ rowId: row.row.id, inForce: row.inForce, paths: row.refs }));
}

// The bound flow's obligations as the tree and its tests read now: its BF, AC and EX IDs, the
// examples a test annotates, whether an acceptance-layer obligation is unmet, and whether a UI
// contract serves the flow.
export async function obligationFactsOf(
  root: string,
  config: QfaiConfig,
  model: StoryTreeModel,
  flowId: string,
) {
  const scope = resolveFlowScope([flowId], model);
  if (scope.flowIds.length === 0) return undefined;
  const ids = [...scope.flowIds, ...scope.acceptanceCriteriaIds, ...scope.exampleIds].sort();
  const inScope = new Set(scope.exampleIds);
  const files = (await readStoryTests(root, config)).files;
  const annotated = new Set<string>();
  for (const file of files.filter(countsForExample)) {
    for (const id of parseStoryTestAnnotations(file.content).EX) {
      if (inScope.has(id)) annotated.add(id);
    }
  }
  const obligations: WorkflowObligationFacts = {
    flowId,
    ids,
    exampleIds: scope.exampleIds,
    annotated: [...annotated].sort(),
    digest: await obligationDigest(model, scope, ids, readText),
  };
  // An acceptance-layer obligation is what the validator's acceptance profile still reports
  // missing for the flow's BF and ACs; an exception row in force exempts an item.
  const owed = new Set([...scope.flowIds, ...scope.acceptanceCriteriaIds]);
  const acceptanceObligationsUnmet = validateStoryTreeObligationsModel(model, files, "atdd").some(
    (issue) => issue.code === "QFAI-STORY-006" && owed.has(issue.refs?.[0] ?? ""),
  );
  const ui = `${contractsDirOf(root, config)}/ui/`;
  const prototypeDecisionNeeded = model.rules.some(
    (rule) =>
      projectRelative(root, rule.file).startsWith(ui) &&
      rule.examples.some((id) => inScope.has(id)),
  );
  return { obligations, acceptanceObligationsUnmet, prototypeDecisionNeeded };
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
  const flow = flowId ? await obligationFactsOf(root, config, model, flowId) : undefined;
  const seeding = seedingTargetsOf(root, model, diagnosis);
  const records = await currentRecords(root, config, seeding);
  return {
    flows,
    specsDir,
    contractsDir: contractsDirOf(root, config),
    records,
    changeRequests: changeRequestsOf(records.decisions),
    ...(flow ?? {}),
    ...(seeding ? { seeding } : {}),
  };
}

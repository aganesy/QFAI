import { isStoryTreeId } from "./storyTree/ids.js";
import type { StoryTreeModel } from "./storyTree/tree.js";

export type FlowScope = {
  flowIds: string[];
  invalidValues: string[];
  storyIds: string[];
  acceptanceCriteriaIds: string[];
  exampleIds: string[];
  ruleIds: string[];
  flowDirectories: string[];
  ruleFiles: string[];
};

function sorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

export function resolveFlowScope(values: readonly string[], model: StoryTreeModel): FlowScope {
  const declared = new Set(model.flows.map((flow) => flow.id));
  const invalidValues = values.filter(
    (value) => !isStoryTreeId(value, "BF") || !declared.has(value),
  );
  const flowIds = sorted(
    values.filter((value) => isStoryTreeId(value, "BF") && declared.has(value)),
  );
  const flowSet = new Set(flowIds);
  const stories = model.stories.filter((story) => flowSet.has(story.flowId));
  const storyIds = sorted(stories.map((story) => story.id));
  const storySet = new Set(storyIds);
  const acceptanceCriteriaIds = sorted(
    model.acceptanceCriteria
      .filter((criterion) => storySet.has(criterion.storyId))
      .map((criterion) => criterion.id),
  );
  const examples = model.examples.filter((example) => storySet.has(example.storyId));
  const exampleIds = sorted(examples.map((example) => example.id));
  const exampleSet = new Set(exampleIds);
  const rules = model.rules.filter((rule) => rule.examples.some((id) => exampleSet.has(id)));
  return {
    flowIds,
    invalidValues: [...new Set(invalidValues)],
    storyIds,
    acceptanceCriteriaIds,
    exampleIds,
    ruleIds: sorted(rules.map((rule) => rule.id)),
    flowDirectories: sorted(
      model.flows.filter((flow) => flowSet.has(flow.id)).map((flow) => flow.directory),
    ),
    ruleFiles: sorted(rules.map((rule) => rule.file)),
  };
}

export function flowScopeContainsId(scope: FlowScope, id: string): boolean {
  return [
    ...scope.flowIds,
    ...scope.storyIds,
    ...scope.acceptanceCriteriaIds,
    ...scope.exampleIds,
    ...scope.ruleIds,
  ].includes(id);
}

export function flowScopeContainsFile(scope: FlowScope, file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  return (
    scope.ruleFiles.includes(normalized) ||
    scope.flowDirectories.some(
      (directory) => normalized === directory || normalized.startsWith(`${directory}/`),
    )
  );
}

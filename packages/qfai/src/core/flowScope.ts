import path from "node:path";

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
  /** Every flow, story, criterion, example and rule ID above, built once for lookups. */
  ids: ReadonlySet<string>;
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
  const ruleIds = sorted(rules.map((rule) => rule.id));
  return {
    flowIds,
    invalidValues: [...new Set(invalidValues)],
    storyIds,
    acceptanceCriteriaIds,
    exampleIds,
    ruleIds,
    flowDirectories: sorted(
      model.flows.filter((flow) => flowSet.has(flow.id)).map((flow) => flow.directory),
    ),
    ruleFiles: sorted(rules.map((rule) => rule.file)),
    ids: new Set([...flowIds, ...storyIds, ...acceptanceCriteriaIds, ...exampleIds, ...ruleIds]),
  };
}

export function flowScopeContainsId(scope: FlowScope, id: string): boolean {
  return scope.ids.has(id);
}

/**
 * A path resolved against the project root, with POSIX separators. The story model names its
 * files absolutely while some validators name them relative to the root, so both sides of a
 * comparison pass through here.
 */
function fromRoot(root: string, file: string): string {
  return path.resolve(root, file.replace(/\\/g, "/")).split(path.sep).join("/");
}

export function flowScopeContainsFile(scope: FlowScope, file: string, root: string): boolean {
  const target = fromRoot(root, file);
  return (
    scope.ruleFiles.some((ruleFile) => fromRoot(root, ruleFile) === target) ||
    scope.flowDirectories.some((directory) => {
      const resolved = fromRoot(root, directory);
      return target === resolved || target.startsWith(`${resolved}/`);
    })
  );
}

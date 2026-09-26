import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { buildContractIndex } from "./contractIndex.js";
import { resolveFlowScope } from "./flowScope.js";
import { isStoryTreeId } from "./storyTree/ids.js";
import { readStoryTreeModel, type StoryTreeModel } from "./storyTree/tree.js";

type GraphNodeType = "BF" | "US" | "AC" | "EX" | "BR" | "CON";
type Graph = {
  nodes: Array<{ id: string; type: GraphNodeType }>;
  edges: Array<{ from: string; to: string; relation: string }>;
};

function graphForFlow(
  model: StoryTreeModel,
  flowId: string,
  contractIdsByFile: ReadonlyMap<string, readonly string[]>,
  root: string,
): Graph {
  const scope = resolveFlowScope([flowId], model);
  const stories = model.stories.filter((story) => story.flowId === flowId);
  const storyIds = new Set(scope.storyIds);
  const criteria = model.acceptanceCriteria.filter((item) => storyIds.has(item.storyId));
  const examples = model.examples.filter((item) => storyIds.has(item.storyId));
  const exampleIds = new Set(scope.exampleIds);
  const rules = model.rules.filter((rule) => rule.examples.some((id) => exampleIds.has(id)));
  const nodes = new Map<string, GraphNodeType>([[flowId, "BF"]]);
  const edges = new Map<string, Graph["edges"][number]>();
  const edge = (from: string, to: string, relation: string): void => {
    edges.set(`${from}|${to}|${relation}`, { from, to, relation });
  };
  for (const story of stories) {
    nodes.set(story.id, "US");
    edge(flowId, story.id, "BF_TO_US");
  }
  for (const criterion of criteria) {
    nodes.set(criterion.id, "AC");
    edge(criterion.storyId, criterion.id, "US_TO_AC");
  }
  for (const example of examples) {
    nodes.set(example.id, "EX");
    edge(example.acRef, example.id, "AC_TO_EX");
  }
  for (const rule of rules) {
    nodes.set(rule.id, "BR");
    for (const exampleId of rule.examples.filter((id) => exampleIds.has(id))) {
      edge(exampleId, rule.id, "EX_TO_BR");
    }
  }
  for (const file of new Set(rules.map((rule) => rule.file))) {
    const fallback = path.relative(root, file).replace(/\\/g, "/");
    for (const contractId of contractIdsByFile.get(file) ?? [fallback]) {
      nodes.set(contractId, "CON");
      for (const rule of rules.filter((item) => item.file === file)) {
        edge(rule.id, contractId, "BR_TO_CON");
      }
    }
  }
  return {
    nodes: [...nodes].map(([id, type]) => ({ id, type })).sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort(
      (a, b) =>
        a.from.localeCompare(b.from) ||
        a.to.localeCompare(b.to) ||
        a.relation.localeCompare(b.relation),
    ),
  };
}

export async function writeBusinessFlowReports(
  root: string,
  config: QfaiConfig,
  flowIds?: readonly string[],
): Promise<void> {
  const model = await readStoryTreeModel(root, config);
  const scope = flowIds?.length ? resolveFlowScope(flowIds, model) : null;
  if (scope?.invalidValues.length) {
    throw new Error(`Unknown business flow: ${scope.invalidValues.join(", ")}`);
  }
  const contractIndex = await buildContractIndex(root, config);
  const contractIdsByFile = new Map<string, string[]>();
  for (const [id, files] of contractIndex.idToFiles) {
    for (const file of files) {
      const ids = contractIdsByFile.get(file) ?? [];
      ids.push(id);
      contractIdsByFile.set(file, ids);
    }
  }
  const selected = scope ? new Set(scope.flowIds) : null;
  const outRoot = resolvePath(root, config, "outDir");
  for (const flow of model.flows.filter(
    (item) => isStoryTreeId(item.id, "BF") && (!selected || selected.has(item.id)),
  )) {
    const scope = resolveFlowScope([flow.id], model);
    const graph = graphForFlow(model, flow.id, contractIdsByFile, root);
    const outputDir = path.join(outRoot, `business-flow-${flow.id.slice(3)}`);
    await mkdir(outputDir, { recursive: true });
    const coverage = [
      `# Coverage (${flow.id})`,
      "",
      `- user stories: ${scope.storyIds.length}`,
      `- acceptance criteria: ${scope.acceptanceCriteriaIds.length}`,
      `- examples: ${scope.exampleIds.length}`,
      `- business rules: ${scope.ruleIds.length}`,
      `- contracts: ${graph.nodes.filter((node) => node.type === "CON").length}`,
    ].join("\n");
    await writeFile(path.join(outputDir, "coverage.md"), `${coverage}\n`, "utf8");
    await writeFile(
      path.join(outputDir, "traceability-graph.json"),
      `${JSON.stringify(graph, null, 2)}\n`,
      "utf8",
    );
  }
}

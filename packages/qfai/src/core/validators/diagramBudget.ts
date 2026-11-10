/**
 * `QFAI-FLOW-006` (warning): a Mermaid diagram with more nodes or edges than
 * the diagram budget, so its author splits it into an overview and detail
 * diagrams.
 *
 * The stage that writes the diagram reads it: `discussion` reads the latest
 * discussion pack and `sdd` the story tree. `verify` and `full` run both.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { DEFAULT_DIAGRAM_BUDGET, resolvePath } from "../config.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { diagramSize } from "./mermaidDiagramSize.js";
import { extractFencedCodeBlocks } from "./mermaidUtils.js";
import { issue } from "./utils.js";

export type DiagramBudgetScope = "story-tree" | "discussion-pack";

async function markdownFiles(
  root: string,
  config: QfaiConfig,
  scope: DiagramBudgetScope,
): Promise<string[]> {
  const dir =
    scope === "story-tree"
      ? resolvePath(root, config, "specsDir")
      : await findLatestDiscussionPackDir(resolvePath(root, config, "discussionDir"));
  if (dir === null) return [];
  return (await collectFiles(dir, { extensions: [".md"] })).sort();
}

export async function validateDiagramBudget(
  root: string,
  config: QfaiConfig,
  scope: DiagramBudgetScope,
): Promise<Issue[]> {
  const budget = { ...DEFAULT_DIAGRAM_BUDGET, ...config.validation.diagramBudget };
  const issues: Issue[] = [];
  for (const file of await markdownFiles(root, config, scope)) {
    const content = await readFile(file, "utf-8");
    for (const block of extractFencedCodeBlocks(content)) {
      if (block.language !== "mermaid") continue;
      const size = diagramSize(block.content);
      if (size === null || (size.nodes <= budget.nodes && size.edges <= budget.edges)) continue;
      issues.push(
        issue(
          "QFAI-FLOW-006",
          `The Mermaid diagram at line ${block.startLine} draws ${size.nodes} nodes and ${size.edges} edges; the budget is ${budget.nodes} nodes and ${budget.edges} edges.`,
          "warning",
          path.relative(root, file).replace(/\\/g, "/"),
          "diagramBudget",
          undefined,
          "canonical",
          "Split the diagram into an overview diagram and detail diagrams, each within the budget.",
        ),
      );
    }
  }
  return issues;
}

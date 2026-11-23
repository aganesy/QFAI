/**
 * `QFAI-FLOW-006` (warning): a Mermaid diagram with more nodes or edges than
 * the diagram budget, so its author brings it within the budget. A
 * `business-flow.md` holds exactly one Flow diagram, so its remedy moves branches
 * into the alternate-path list; any other document splits the diagram.
 *
 * Reads the Markdown files under `paths.specsDir`, in `sdd`, `verify` and `full`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { DEFAULT_DIAGRAM_BUDGET, resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { diagramSize } from "./mermaidDiagramSize.js";
import { extractFencedCodeBlocks } from "./mermaidUtils.js";
import { issue } from "./utils.js";

const SPLIT_REMEDY =
  "Split the diagram into an overview diagram and detail diagrams, each within the budget.";
const BUSINESS_FLOW_REMEDY =
  "Keep the main path in the one Flow diagram, within the budget, and move branches and detail into the Alternate and exception paths list.";

/** The remedy the document's shape allows: a business flow may not add a diagram. */
function remedyFor(file: string): string {
  return path.basename(file) === "business-flow.md" ? BUSINESS_FLOW_REMEDY : SPLIT_REMEDY;
}

export async function validateDiagramBudget(root: string, config: QfaiConfig): Promise<Issue[]> {
  const budget = { ...DEFAULT_DIAGRAM_BUDGET, ...config.validation.diagramBudget };
  const issues: Issue[] = [];
  const files = await collectFiles(resolvePath(root, config, "specsDir"), { extensions: [".md"] });
  for (const file of files.sort()) {
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
          remedyFor(file),
        ),
      );
    }
  }
  return issues;
}

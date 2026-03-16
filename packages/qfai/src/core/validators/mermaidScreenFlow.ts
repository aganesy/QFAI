import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { extractFencedCodeBlocks, containsMermaidSyntax } from "./mermaidUtils.js";
import { issue } from "./utils.js";

const STATE_DIAGRAM_V2_RE = /^\s*stateDiagram-v2\b/;
const STATE_DIAGRAM_V1_RE = /^\s*stateDiagram\b/;
const FLOWCHART_RE = /^\s*flowchart\s+(TD|LR|TB|RL|BT)\b/;
const TRANSITION_RE = /^\s*(\w[\w\s]*?)\s*-->\s*(\w[\w\s]*?)(?:\s*:\s*(.+))?$/gm;

export async function validateMermaidScreenFlow(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const patterns = [
    path.posix.join(root.replace(/\\/g, "/"), config.paths.discussionDir, "**/*.md"),
    path.posix.join(root.replace(/\\/g, "/"), config.paths.specsDir, "**/*.md"),
  ];

  const files = await fg(patterns, { absolute: true });

  for (const filePath of files) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    const blocks = extractFencedCodeBlocks(content);

    for (const block of blocks) {
      if (block.language !== "mermaid") continue;
      if (!containsMermaidSyntax(block.content)) continue;

      const lines = block.content.trim().split("\n");
      const firstLine = lines[0]?.trim() ?? "";

      // Check for v1 stateDiagram (migration warning)
      if (STATE_DIAGRAM_V1_RE.test(firstLine) && !STATE_DIAGRAM_V2_RE.test(firstLine)) {
        issues.push(
          issue(
            "QFAI-FLOW-001",
            `stateDiagram v1 detected at line ${block.startLine}. Migrate to stateDiagram-v2.`,
            "warning",
            rel,
            "mermaidScreenFlow.v1Migration",
            undefined,
            "compatibility",
            "Replace 'stateDiagram' with 'stateDiagram-v2' at the first line of the diagram.",
          ),
        );
      }

      // Check unlabeled transitions in stateDiagram-v2
      if (STATE_DIAGRAM_V2_RE.test(firstLine)) {
        for (const match of block.content.matchAll(TRANSITION_RE)) {
          const from = match[1]?.trim();
          const to = match[2]?.trim();
          const label = match[3]?.trim();
          if (!label) {
            const transitionLine = block.startLine + countNewLines(block.content, match.index);
            issues.push(
              issue(
                "QFAI-FLOW-002",
                `Unlabeled transition: ${from} --> ${to} at line ${transitionLine}`,
                "warning",
                rel,
                "mermaidScreenFlow.unlabeledTransition",
              ),
            );
          }
        }
      }

      if (/^\s*flowchart\b/.test(firstLine) && !FLOWCHART_RE.test(firstLine)) {
        issues.push(
          issue(
            "QFAI-FLOW-004",
            `Flowchart declaration should include direction (TD|LR|TB|RL|BT) at line ${block.startLine}`,
            "warning",
            rel,
            "mermaidScreenFlow.flowchartDeclaration",
          ),
        );
      }
    }
  }

  return issues;
}

function countNewLines(text: string, endIndex: number): number {
  let count = 0;
  for (let i = 0; i < endIndex; i++) {
    if (text[i] === "\n") {
      count += 1;
    }
  }
  return count;
}

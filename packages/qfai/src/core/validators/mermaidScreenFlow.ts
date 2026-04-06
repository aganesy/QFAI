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

type DiagramDeclaration = {
  line: string;
  lineOffset: number;
};

type TransitionInfo = {
  from: string;
  to: string;
  label: string;
  lineOffset: number;
};

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

      const declaration = findDiagramDeclaration(block.content);
      const firstLine = declaration?.line ?? "";
      const declarationLine = block.startLine + (declaration?.lineOffset ?? 0);

      // Check for v1 stateDiagram (migration warning)
      if (STATE_DIAGRAM_V1_RE.test(firstLine) && !STATE_DIAGRAM_V2_RE.test(firstLine)) {
        issues.push(
          issue(
            "QFAI-FLOW-001",
            `stateDiagram v1 detected at line ${declarationLine}. Migrate to stateDiagram-v2.`,
            "warning",
            rel,
            "mermaidScreenFlow.v1Migration",
            undefined,
            "canonical",
            "Replace 'stateDiagram' with 'stateDiagram-v2' at the first line of the diagram.",
          ),
        );
      }

      // Check unlabeled transitions in stateDiagram-v2
      if (STATE_DIAGRAM_V2_RE.test(firstLine)) {
        for (const transition of parseTransitions(block.content)) {
          if (transition.label) {
            continue;
          }
          issues.push(
            issue(
              "QFAI-FLOW-002",
              `Unlabeled transition: ${transition.from} --> ${transition.to} at line ${block.startLine + transition.lineOffset}`,
              "warning",
              rel,
              "mermaidScreenFlow.unlabeledTransition",
            ),
          );
        }
      }

      if (/^\s*flowchart\b/.test(firstLine) && !FLOWCHART_RE.test(firstLine)) {
        issues.push(
          issue(
            "QFAI-FLOW-004",
            `Flowchart declaration should include direction (TD|LR|TB|RL|BT) at line ${declarationLine}`,
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

function findDiagramDeclaration(content: string): DiagramDeclaration | null {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line) {
      continue;
    }
    if (line.startsWith("%%")) {
      continue;
    }
    return { line, lineOffset: index };
  }
  return null;
}

function parseTransitions(content: string): TransitionInfo[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const transitions: TransitionInfo[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line || line.startsWith("%%") || !line.includes("-->")) {
      continue;
    }

    const arrowIndex = line.indexOf("-->");
    const from = line.slice(0, arrowIndex).trim();
    const right = line.slice(arrowIndex + 3).trim();
    if (!from || !right) {
      continue;
    }

    const labelIndex = right.indexOf(":");
    const to = (labelIndex >= 0 ? right.slice(0, labelIndex) : right).trim();
    const label = (labelIndex >= 0 ? right.slice(labelIndex + 1) : "").trim();
    if (!to) {
      continue;
    }

    transitions.push({
      from,
      to,
      label,
      lineOffset: index,
    });
  }

  return transitions;
}

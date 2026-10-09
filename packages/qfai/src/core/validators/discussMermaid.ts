import { readFile } from "node:fs/promises";
import path from "node:path";

import { findPacks, latestPack } from "../packLocator.js";
import { escapeRegExp } from "../regex.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const DISCUSSION_PACK_FLOW_FILE = "03_Story-Workshop.md";
const MERMAID_START_RE = /^\s*(`{3,}|~{3,})\s*mermaid\b/i;
const FLOW_OR_SEQUENCE_RE = /\b(?:sequenceDiagram|flowchart)\b/;

export async function validateDiscussionMermaid(root: string): Promise<Issue[]> {
  const discussionRootDir = path.join(root, ".qfai", "discussion");
  const discussionPacks = await findPacks(discussionRootDir, "discussion");
  const currentPack = latestPack(discussionPacks);

  const issues: Issue[] = [];
  if (!currentPack) {
    return issues;
  }

  const file = path.join(currentPack.path, DISCUSSION_PACK_FLOW_FILE);
  try {
    const text = await readFile(file, "utf-8");
    if (!containsMermaidFlowDiagram(text)) {
      issues.push(
        issue(
          "QFAI-DPACK-009",
          "No flowchart or sequenceDiagram was found in the Mermaid block of 03_Story-Workshop.md.",
          "error",
          file,
          "discussionMermaid.flowOrSequence",
          undefined,
          "change",
          "In the Story Workshop section, write a flowchart or sequenceDiagram in a mermaid fenced block.",
        ),
      );
    }
  } catch {
    return issues;
  }
  return issues;
}

function containsMermaidFlowDiagram(text: string): boolean {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const startMatch = lines[i]?.match(MERMAID_START_RE);
    if (!startMatch) {
      continue;
    }

    const fenceToken = startMatch[1] ?? "";
    if (fenceToken.length === 0) {
      continue;
    }

    const fenceChar = fenceToken[0] ?? "";
    const closeFenceRe = new RegExp(`^\\s*${escapeRegExp(fenceChar)}{${fenceToken.length},}\\s*$`);

    const blockLines: string[] = [];
    let cursor = i + 1;
    for (; cursor < lines.length; cursor += 1) {
      const line = lines[cursor] ?? "";
      if (closeFenceRe.test(line)) {
        break;
      }
      blockLines.push(line);
    }

    if (FLOW_OR_SEQUENCE_RE.test(blockLines.join("\n"))) {
      return true;
    }

    i = cursor;
  }

  return false;
}

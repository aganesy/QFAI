import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const LEGACY_DISCUSS_FILE_RE = /^discuss-.*\.md$/i;
const DISCUSS_PACK_DIR_RE = /^DISCUSS-\d{4}$/i;
const DISCUSS_PACK_FLOW_FILE = "04_Business-flow.md";
const MERMAID_START_RE = /^\s*(`{3,}|~{3,})\s*mermaid\b/i;
const SEQUENCE_DIAGRAM_RE = /\bsequenceDiagram\b/;

export async function validateDiscussMermaid(root: string): Promise<Issue[]> {
  const legacyDiscussionsDir = path.join(root, ".qfai", "discussions");
  const discussRootDir = path.join(root, ".qfai", "discuss");

  const [legacyMarkdownFiles, discussPackMarkdownFiles] = await Promise.all([
    collectFiles(legacyDiscussionsDir, {
      extensions: [".md"],
    }),
    collectFiles(discussRootDir, {
      extensions: [".md"],
    }),
  ]);

  const legacyDiscussFiles = legacyMarkdownFiles.filter((file) =>
    LEGACY_DISCUSS_FILE_RE.test(path.basename(file)),
  );
  const discussPackFiles = discussPackMarkdownFiles.filter((file) => {
    const fileName = path.basename(file);
    if (fileName !== DISCUSS_PACK_FLOW_FILE) {
      return false;
    }
    const discussDirName = path.basename(path.dirname(file));
    return DISCUSS_PACK_DIR_RE.test(discussDirName);
  });
  const discussFiles = [...legacyDiscussFiles, ...discussPackFiles];
  if (discussFiles.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const file of discussFiles) {
    const text = await readFile(file, "utf-8");
    if (containsMermaidSequenceDiagram(text)) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-DISCUSS-021",
        "discuss 成果物に Mermaid sequenceDiagram が見つかりません。",
        "error",
        file,
        "DISCUSS-021",
        undefined,
        "change",
        "Business Flows セクションに mermaid fenced block で sequenceDiagram を記述してください。",
      ),
    );
  }
  return issues;
}

function containsMermaidSequenceDiagram(text: string): boolean {
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
    const closeFenceRe = new RegExp(
      `^\\s*${escapeRegExp(fenceChar)}{${fenceToken.length},}\\s*$`,
    );

    const blockLines: string[] = [];
    let cursor = i + 1;
    for (; cursor < lines.length; cursor += 1) {
      const line = lines[cursor] ?? "";
      if (closeFenceRe.test(line)) {
        break;
      }
      blockLines.push(line);
    }

    if (SEQUENCE_DIAGRAM_RE.test(blockLines.join("\n"))) {
      return true;
    }

    i = cursor;
  }

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

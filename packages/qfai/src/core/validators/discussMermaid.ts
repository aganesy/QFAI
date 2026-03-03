import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import { validatePackName } from "../packLocator.js";
import { escapeRegExp } from "../regex.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const DISCUSSION_PACK_FLOW_FILE = "03_Story-Workshop.md";
const MERMAID_START_RE = /^\s*(`{3,}|~{3,})\s*mermaid\b/i;
const FLOW_OR_SEQUENCE_RE = /\b(?:sequenceDiagram|flowchart)\b/;

type DiscussPackFile = {
  file: string;
  kind: "current" | "legacy";
};

export async function validateDiscussMermaid(root: string): Promise<Issue[]> {
  const discussionRootDir = path.join(root, ".qfai", "discussion");

  const discussionPackMarkdownFiles = await collectFiles(discussionRootDir, {
    extensions: [".md"],
  });
  const discussionPackFiles: DiscussPackFile[] = [];
  for (const file of discussionPackMarkdownFiles) {
    const fileName = path.basename(file);
    if (fileName !== DISCUSSION_PACK_FLOW_FILE) {
      continue;
    }
    const discussionDirName = path.basename(path.dirname(file));
    const nameValidation = validatePackName("discussion", discussionDirName);
    if (nameValidation.isCanonical) {
      discussionPackFiles.push({ file, kind: "current" });
      continue;
    }
    if (nameValidation.isLegacy) {
      discussionPackFiles.push({ file, kind: "legacy" });
    }
  }
  if (discussionPackFiles.length === 0) {
    return [];
  }

  const hasCurrentPack = discussionPackFiles.some(({ kind }) => kind === "current");
  const hasLegacyPack = discussionPackFiles.some(({ kind }) => kind === "legacy");

  const issues: Issue[] = [];
  if (!hasCurrentPack && hasLegacyPack) {
    issues.push(
      issue(
        "QFAI-DISCUSS-022",
        "legacy discussion ディレクトリ命名は deprecated です。新規成果物は discussion-YYYYMMDDhhmmssSSS を使用してください。",
        "warning",
        discussionRootDir,
        "DISCUSS-022",
        undefined,
        "change",
      ),
    );
  }

  for (const { file } of discussionPackFiles) {
    const text = await readFile(file, "utf-8");
    if (containsMermaidFlowDiagram(text)) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-DISCUSS-021",
        "discussion 成果物に Mermaid flowchart または sequenceDiagram が見つかりません。",
        "error",
        file,
        "DISCUSS-021",
        undefined,
        "change",
        "Story Workshop セクションに mermaid fenced block で flowchart または sequenceDiagram を記述してください。",
      ),
    );
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

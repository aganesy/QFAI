import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import { escapeRegExp } from "../regex.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const DISCUSS_PACK_DIR_RE = /^discuss-\d{17}$/;
const LEGACY_DISCUSS_PACK_DIR_RE = /^DISCUSS-\d{4}$/i;
const DISCUSS_PACK_FLOW_FILE = "04_Business-flow.md";
const MERMAID_START_RE = /^\s*(`{3,}|~{3,})\s*mermaid\b/i;
const FLOW_OR_SEQUENCE_RE = /\b(?:sequenceDiagram|flowchart)\b/;

type DiscussPackFile = {
  file: string;
  kind: "current" | "legacy";
};

export async function validateDiscussMermaid(root: string): Promise<Issue[]> {
  const discussRootDir = path.join(root, ".qfai", "discuss");

  const discussPackMarkdownFiles = await collectFiles(discussRootDir, {
    extensions: [".md"],
  });
  const discussPackFiles: DiscussPackFile[] = [];
  for (const file of discussPackMarkdownFiles) {
    const fileName = path.basename(file);
    if (fileName !== DISCUSS_PACK_FLOW_FILE) {
      continue;
    }
    const discussDirName = path.basename(path.dirname(file));
    if (DISCUSS_PACK_DIR_RE.test(discussDirName)) {
      discussPackFiles.push({ file, kind: "current" });
      continue;
    }
    if (LEGACY_DISCUSS_PACK_DIR_RE.test(discussDirName)) {
      discussPackFiles.push({ file, kind: "legacy" });
    }
  }
  if (discussPackFiles.length === 0) {
    return [];
  }

  const hasCurrentPack = discussPackFiles.some(
    ({ kind }) => kind === "current",
  );
  const hasLegacyPack = discussPackFiles.some(({ kind }) => kind === "legacy");

  const issues: Issue[] = [];
  if (!hasCurrentPack && hasLegacyPack) {
    issues.push(
      issue(
        "QFAI-DISCUSS-022",
        "legacy discuss ディレクトリ命名（DISCUSS-XXXX）は deprecated です。新規成果物は discuss-YYYYMMDDhhmmssSSS を使用してください。",
        "warning",
        discussRootDir,
        "DISCUSS-022",
        undefined,
        "change",
      ),
    );
  }

  for (const { file } of discussPackFiles) {
    const text = await readFile(file, "utf-8");
    if (containsMermaidFlowDiagram(text)) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-DISCUSS-021",
        "discuss 成果物に Mermaid flowchart または sequenceDiagram が見つかりません。",
        "error",
        file,
        "DISCUSS-021",
        undefined,
        "change",
        "Business Flows セクションに mermaid fenced block で flowchart または sequenceDiagram を記述してください。",
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

    if (FLOW_OR_SEQUENCE_RE.test(blockLines.join("\n"))) {
      return true;
    }

    i = cursor;
  }

  return false;
}

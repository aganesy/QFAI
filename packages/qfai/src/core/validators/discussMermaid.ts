import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const DISCUSS_FILE_RE = /^discuss-.*\.md$/i;
const MERMAID_SEQUENCE_RE =
  /(```|~~~)\s*mermaid\b[\s\S]*?\bsequenceDiagram\b[\s\S]*?\1/m;

export async function validateDiscussMermaid(root: string): Promise<Issue[]> {
  const discussionsDir = path.join(root, ".qfai", "discussions");
  const markdownFiles = await collectFiles(discussionsDir, {
    extensions: [".md"],
  });
  const discussFiles = markdownFiles.filter((file) =>
    DISCUSS_FILE_RE.test(path.basename(file)),
  );
  if (discussFiles.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const file of discussFiles) {
    const text = await readFile(file, "utf-8");
    if (MERMAID_SEQUENCE_RE.test(text)) {
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

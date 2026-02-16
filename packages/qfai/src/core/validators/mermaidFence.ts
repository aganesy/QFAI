import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";
import { containsMermaidSyntax, extractFencedCodeBlocks } from "./mermaidUtils.js";

const TARGET_DIRS = [
  [".qfai", "specs"],
  [".qfai", "discuss"],
  [".qfai", "require"],
  [".qfai", "evidence"],
] as const;

export async function validateMermaidFenceUsage(root: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  for (const segments of TARGET_DIRS) {
    const targetDir = path.join(root, ...segments);
    const files = await collectFiles(targetDir, {
      extensions: [".md", ".feature"],
    });

    for (const file of files) {
      const text = await readFile(file, "utf-8");
      const blocks = extractFencedCodeBlocks(text);
      for (const block of blocks) {
        if (!containsMermaidSyntax(block.content)) {
          continue;
        }
        if (block.language === "mermaid") {
          continue;
        }

        issues.push(
          issue(
            "QFAI-MERMAID-001",
            `Mermaid 記法を含む fenced code block は \`mermaid\` を指定してください（detected=${
              block.language ?? "(none)"
            }, line=${block.startLine}）。`,
            "error",
            file,
            "mermaid.fence",
            undefined,
            "change",
            [
              "Mermaid 図は必ず次の形式で記述してください:",
              "```mermaid",
              "<diagram>",
              "```",
            ].join("\n"),
          ),
        );
      }
    }
  }

  return issues;
}


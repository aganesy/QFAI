import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";
import { extractFencedCodeBlocks } from "./mermaidUtils.js";

const BUSINESS_FLOW_FILE_CANDIDATES = [
  "04_Business-Flow.md",
  "04_Business-flow.md",
] as const;
const BUSINESS_FLOW_SHARED_DIR = path.join(".qfai", "specs", "_shared");
const FLOW_OR_SEQUENCE_RE = /(^|\n)\s*(?:sequenceDiagram|flowchart)\b/i;

export async function validateBusinessFlowHasMermaid(
  root: string,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const businessFlowPath = await resolveBusinessFlowPath(root);
  if (businessFlowPath) {
    const text = await readFile(businessFlowPath, "utf-8");
    const mermaidBlocks = extractFencedCodeBlocks(text).filter(
      (block) => block.language === "mermaid",
    );

    if (mermaidBlocks.length === 0) {
      issues.push(
        issue(
          "QFAI-BFLOW-001",
          "04_Business-Flow.md に mermaid fenced block が見つかりません。",
          "error",
          businessFlowPath,
          "businessFlow.mermaid.required",
          undefined,
          "change",
          "Business Flow は Markdown + Mermaid で記述し、少なくとも1つの mermaid block を追加してください。",
        ),
      );
    } else if (
      !mermaidBlocks.some((block) => FLOW_OR_SEQUENCE_RE.test(block.content))
    ) {
      issues.push(
        issue(
          "QFAI-BFLOW-002",
          "04_Business-Flow.md の mermaid block に flowchart または sequenceDiagram が見つかりません。",
          "error",
          businessFlowPath,
          "businessFlow.mermaid.diagramType",
          undefined,
          "change",
          "Business Flow の mermaid block に flowchart または sequenceDiagram を含めてください。",
        ),
      );
    }

    if (path.basename(businessFlowPath) === "04_Business-flow.md") {
      issues.push(
        issue(
          "QFAI-BFLOW-004",
          "Business Flow の canonical file 名は 04_Business-Flow.md です。旧名ファイルを検出しました。",
          "warning",
          businessFlowPath,
          "businessFlow.fileName.canonical",
          undefined,
          "change",
          "`.qfai/specs/_shared/04_Business-Flow.md` へリネームしてください。",
        ),
      );
    }
  }

  issues.push(...(await collectDeprecatedFeatureWarnings(root)));
  return issues;
}

async function collectDeprecatedFeatureWarnings(
  root: string,
): Promise<Issue[]> {
  const sharedDir = path.join(root, ".qfai", "specs", "_shared");
  const featureFiles = await collectFiles(sharedDir, {
    extensions: [".feature"],
  });
  const issues: Issue[] = [];

  for (const file of featureFiles) {
    if (!/business-flow/i.test(path.basename(file))) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-BFLOW-003",
        "Business Flow の .feature 形式は deprecated です。04_Business-Flow.md (mermaid) を使用してください。",
        "warning",
        file,
        "businessFlow.feature.deprecated",
        undefined,
        "change",
        "`.qfai/specs/_shared/04_Business-Flow.md` に移行し、flowchart または sequenceDiagram を mermaid fence で記述してください。",
      ),
    );
  }

  return issues;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function resolveBusinessFlowPath(root: string): Promise<string | null> {
  for (const fileName of BUSINESS_FLOW_FILE_CANDIDATES) {
    const candidate = path.join(root, BUSINESS_FLOW_SHARED_DIR, fileName);
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
}

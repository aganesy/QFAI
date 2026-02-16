import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import { escapeRegExp } from "../regex.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

const TARGETS = [
  { segments: [".qfai", "specs"] as const, extensions: [".md", ".feature"] },
  { segments: [".qfai", "require"] as const, extensions: [".md"] },
  { segments: [".qfai", "discuss"] as const, extensions: [".md"] },
] as const;

const BUSINESS_FLOW_RELATIVE = path.join(
  ".qfai",
  "specs",
  "_shared",
  "04_Business-flow.md",
);
const MERMAID_KEYWORD_RE =
  /\b(?:sequenceDiagram|flowchart|graph|erDiagram|classDiagram|stateDiagram(?:-v2)?|journey|gantt)\b/i;
const FLOW_OR_SEQUENCE_RE = /\b(?:sequenceDiagram|flowchart)\b/i;

type ScanResult = {
  issues: Issue[];
  mermaidFenceCount: number;
  hasFlowOrSequenceInMermaidFence: boolean;
};

type FenceState = {
  language: string | null;
  closeFenceRe: RegExp;
};

export async function validateMermaidEnforcement(
  root: string,
): Promise<Issue[]> {
  const targetFiles = await collectTargetFiles(root);
  const businessFlowPath = path.join(root, BUSINESS_FLOW_RELATIVE);
  const issues: Issue[] = [];
  const scanResults = new Map<string, ScanResult>();

  for (const filePath of targetFiles) {
    const text = await readFile(filePath, "utf-8");
    const result = scanMermaidUsage(filePath, text);
    scanResults.set(filePath, result);
    issues.push(...result.issues);
  }

  if (await exists(businessFlowPath)) {
    const businessFlowScan =
      scanResults.get(businessFlowPath) ??
      scanMermaidUsage(
        businessFlowPath,
        await readFile(businessFlowPath, "utf-8"),
      );
    if (businessFlowScan.mermaidFenceCount === 0) {
      issues.push(
        issue(
          "QFAI-MMD-003",
          "04_Business-flow.md に mermaid fenced block が見つかりません。",
          "error",
          businessFlowPath,
          "mermaid.businessFlow.required",
          undefined,
          "change",
          "Business Flow は Markdown + Mermaid で記述し、少なくとも1つの mermaid block を追加してください。",
        ),
      );
    } else if (!businessFlowScan.hasFlowOrSequenceInMermaidFence) {
      issues.push(
        issue(
          "QFAI-MMD-004",
          "04_Business-flow.md の mermaid block に flowchart または sequenceDiagram が見つかりません。",
          "error",
          businessFlowPath,
          "mermaid.businessFlow.diagramType",
          undefined,
          "change",
          "Business Flow の mermaid block に flowchart または sequenceDiagram を含めてください。",
        ),
      );
    }
  }

  issues.push(...(await collectDeprecatedBusinessFlowFeatureWarnings(root)));
  return issues;
}

async function collectTargetFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const target of TARGETS) {
    const targetDir = path.join(root, ...target.segments);
    files.push(
      ...(await collectFiles(targetDir, {
        extensions: [...target.extensions],
      })),
    );
  }
  return Array.from(new Set(files))
    .filter((filePath) => path.basename(filePath).toLowerCase() !== "readme.md")
    .sort((a, b) => a.localeCompare(b));
}

function scanMermaidUsage(filePath: string, text: string): ScanResult {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const issues: Issue[] = [];
  let fence: FenceState | null = null;
  let mermaidFenceCount = 0;
  let hasFlowOrSequenceInMermaidFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (fence) {
      if (fence.closeFenceRe.test(line)) {
        fence = null;
        continue;
      }

      if (fence.language === "mermaid") {
        if (FLOW_OR_SEQUENCE_RE.test(line)) {
          hasFlowOrSequenceInMermaidFence = true;
        }
        continue;
      }

      if (
        (fence.language === "text" || fence.language === null) &&
        MERMAID_KEYWORD_RE.test(line)
      ) {
        issues.push(
          issue(
            "QFAI-MMD-001",
            `Mermaid 記法は \`mermaid\` fenced block 内で記述してください（detected=${
              fence.language ?? "(none)"
            }, line=${index + 1}）。`,
            "error",
            filePath,
            "mermaid.fence.required",
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
      continue;
    }

    const startedFence = parseFenceStart(line);
    if (startedFence) {
      if (startedFence.language === "mermaid") {
        mermaidFenceCount += 1;
      }
      fence = {
        language: startedFence.language,
        closeFenceRe: startedFence.closeFenceRe,
      };
      continue;
    }

    if (MERMAID_KEYWORD_RE.test(line)) {
      issues.push(
        issue(
          "QFAI-MMD-002",
          `Mermaid 記法が fenced block 外にあります（line=${index + 1}）。`,
          "error",
          filePath,
          "mermaid.outsideFence.forbidden",
          undefined,
          "change",
          "Mermaid キーワードは ` ```mermaid ` フェンス内に移動してください。",
        ),
      );
    }
  }

  return {
    issues,
    mermaidFenceCount,
    hasFlowOrSequenceInMermaidFence,
  };
}

function parseFenceStart(
  line: string,
): { language: string | null; closeFenceRe: RegExp } | null {
  const startMatch = /^\s*(`{3,}|~{3,})([^\r\n]*)$/.exec(line);
  const fenceToken = startMatch?.[1];
  if (!fenceToken) {
    return null;
  }

  const fenceChar = fenceToken[0];
  if (!fenceChar) {
    return null;
  }

  const info = (startMatch?.[2] ?? "").trim();
  const languageToken = info.split(/\s+/)[0] ?? "";
  const language =
    languageToken.length > 0 ? languageToken.toLowerCase() : null;

  return {
    language,
    closeFenceRe: new RegExp(
      `^\\s*${escapeRegExp(fenceChar)}{${fenceToken.length},}\\s*$`,
    ),
  };
}

async function collectDeprecatedBusinessFlowFeatureWarnings(
  root: string,
): Promise<Issue[]> {
  const sharedDir = path.join(root, ".qfai", "specs", "_shared");
  const featureFiles = await collectFiles(sharedDir, {
    extensions: [".feature"],
  });
  const issues: Issue[] = [];

  for (const filePath of featureFiles) {
    if (!/business-flow/i.test(path.basename(filePath))) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-BFLOW-003",
        "Business Flow の .feature 形式は deprecated です。04_Business-flow.md (mermaid) を使用してください。",
        "warning",
        filePath,
        "businessFlow.feature.deprecated",
        undefined,
        "change",
        "`.qfai/specs/_shared/04_Business-flow.md` に移行し、flowchart または sequenceDiagram を mermaid fence で記述してください。",
      ),
    );
  }

  return issues;
}

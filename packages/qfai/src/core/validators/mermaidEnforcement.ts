import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import { escapeRegExp } from "../regex.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

/**
 * Mermaid fence の走査対象。specs だけでなく evidence と discussion
 * 配下も対象に含める（レビュアーが rendered Markdown として読む
 * 成果物であり、最新以外の discussion pack も GitHub 上では同じく
 * ソースのまま表示されるため）。
 */
const TARGET_DIRS = [
  [".qfai", "specs"],
  [".qfai", "discussion"],
  [".qfai", "evidence"],
] as const;
const TARGET_EXTENSIONS = [".md", ".feature"] as const;

const BUSINESS_FLOW_RELATIVE_CANDIDATES = [
  path.join(".qfai", "specs", "_policies", "04_Business-Flow.md"),
  path.join(".qfai", "specs", "_policies", "04_Business-flow.md"),
] as const;
/**
 * A Mermaid diagram declaration line, used for **both** the fence-external scan
 * and the contents of a non-mermaid fence.
 *
 * Two readings were wrong in opposite directions. A prefix match called
 * `Journey mapping was run ...` a diagram — and a `text` fence holds prose as
 * readily as a `.md` body does, so keeping the loose form there left the same
 * false positive on the evidence tree this validator newly scans. An exact
 * match then missed `graph TD;` and `flowchart LR; A --> B`, which are valid
 * Mermaid and were caught before.
 *
 * What separates the two is what may follow the declaration: nothing, a `;`
 * (with or without the diagram body after it), or a `%%` comment. Prose
 * continues with a word, and that is the whole distinction — so one matcher
 * serves both scans, and neither can drift from the other.
 */
const MERMAID_DECLARATION_RE =
  /^\s*(?:sequenceDiagram|erDiagram|classDiagram|stateDiagram(?:-v2)?|journey|gantt|mindmap|flowchart(?:\s+(?:TB|BT|RL|LR|TD))?|graph\s+(?:TB|BT|RL|LR|TD))\s*(?:;.*|%%.*)?$/i;
// 行頭アンカー必須: 判定したいのは「この図が flowchart / sequenceDiagram である」
// ことなので、mermaid fence 内の `%%` コメントなど単に語を含むだけの行で
// 満たしてはならない。`MERMAID_DECLARATION_RE` と同じ行頭形に揃える。
const FLOW_OR_SEQUENCE_RE = /^\s*(?:sequenceDiagram|flowchart)\b/i;

type ScanResult = {
  issues: Issue[];
  mermaidFenceCount: number;
  hasFlowOrSequenceInMermaidFence: boolean;
};

type FenceState = {
  language: string | null;
  closeFenceRe: RegExp;
};

export async function validateMermaidEnforcement(root: string): Promise<Issue[]> {
  const targetFiles = await collectTargetFiles(root);
  const businessFlowPath = await resolveBusinessFlowPath(root);
  const issues: Issue[] = [];
  const scanResults = new Map<string, ScanResult>();

  for (const filePath of targetFiles) {
    const text = await readFile(filePath, "utf-8");
    const result = scanMermaidUsage(filePath, text);
    scanResults.set(filePath, result);
    issues.push(...result.issues);
  }

  if (businessFlowPath) {
    const businessFlowScan =
      scanResults.get(businessFlowPath) ??
      scanMermaidUsage(businessFlowPath, await readFile(businessFlowPath, "utf-8"));
    if (businessFlowScan.mermaidFenceCount === 0) {
      issues.push(
        issue(
          "QFAI-MMD-003",
          "04_Business-Flow.md に mermaid fenced block が見つかりません。",
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
          "04_Business-Flow.md の mermaid block に flowchart または sequenceDiagram が見つかりません。",
          "error",
          businessFlowPath,
          "mermaid.businessFlow.diagramType",
          undefined,
          "change",
          "Business Flow の mermaid block に flowchart または sequenceDiagram を含めてください。",
        ),
      );
    }

    if (path.basename(businessFlowPath) === "04_Business-flow.md") {
      issues.push(
        issue(
          "QFAI-MMD-005",
          "Business Flow の canonical file 名は 04_Business-Flow.md です。旧名ファイルを検出しました。",
          "warning",
          businessFlowPath,
          "mermaid.businessFlow.fileName",
          undefined,
          "change",
          "`.qfai/specs/_policies/04_Business-Flow.md` へリネームしてください。",
        ),
      );
    }
  }

  issues.push(...(await collectDeprecatedBusinessFlowFeatureWarnings(root)));
  return issues;
}

async function collectTargetFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const segments of TARGET_DIRS) {
    files.push(
      ...(await collectFiles(path.join(root, ...segments), {
        extensions: [...TARGET_EXTENSIONS],
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

      if (MERMAID_DECLARATION_RE.test(line)) {
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
            ["Mermaid 図は必ず次の形式で記述してください:", "```mermaid", "<diagram>", "```"].join(
              "\n",
            ),
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

    if (MERMAID_DECLARATION_RE.test(line)) {
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

function parseFenceStart(line: string): { language: string | null; closeFenceRe: RegExp } | null {
  const startMatch = /^\s*(`{3,}|~{3,})([^\r\n]*)$/.exec(line);
  const fenceToken = startMatch?.[1];
  if (!fenceToken) {
    return null;
  }

  const fenceChar = fenceToken[0];
  if (!fenceChar) {
    return null;
  }

  const info = (startMatch[2] ?? "").trim();
  const languageToken = info.split(/\s+/)[0] ?? "";
  const language = languageToken.length > 0 ? languageToken.toLowerCase() : null;

  return {
    language,
    closeFenceRe: new RegExp(`^\\s*${escapeRegExp(fenceChar)}{${fenceToken.length},}\\s*$`),
  };
}

async function collectDeprecatedBusinessFlowFeatureWarnings(root: string): Promise<Issue[]> {
  const policiesDir = path.join(root, ".qfai", "specs", "_policies");
  const featureFiles = await collectFiles(policiesDir, {
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
        "Business Flow の .feature 形式は deprecated です。04_Business-Flow.md (mermaid) を使用してください。",
        "warning",
        filePath,
        "businessFlow.feature.deprecated",
        undefined,
        "change",
        "`.qfai/specs/_policies/04_Business-Flow.md` に移行し、flowchart または sequenceDiagram を mermaid fence で記述してください。",
      ),
    );
  }

  return issues;
}

async function resolveBusinessFlowPath(root: string): Promise<string | null> {
  for (const relativePath of BUSINESS_FLOW_RELATIVE_CANDIDATES) {
    const target = path.join(root, relativePath);
    if (await exists(target)) {
      return target;
    }
  }
  return null;
}

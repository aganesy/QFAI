import { readFile } from "node:fs/promises";
import path from "node:path";

import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const MERMAID_FENCE_RE = /^\s*(?:`{3,}|~{3,})\s*mermaid\b/im;
const SCREEN_MOCK_HEADING_RE =
  /^\s*#{1,6}\s*screen mock(?:\s*[\u2014\-—]+\s*fallback)?\s*\(html\+css\)\s*$/im;
const HTML_FENCE_RE = /^\s*(?:`{3,}|~{3,})\s*html\b/im;
const CSS_FENCE_RE = /^\s*(?:`{3,}|~{3,})\s*css\b/im;
const UI_HINT_RE =
  /\b(?:ui|ux|screen|screens|page|pages|layout|wireframe|mock|form|button|frontend|navigation)\b|画面|モック|遷移|フォーム|ボタン/i;

export async function validateDiscussionVisuals(root: string): Promise<Issue[]> {
  const discussionRoot = path.join(root, ".qfai", "discussion");
  const latestPackDir = await findLatestDiscussionPackDir(discussionRoot);
  if (!latestPackDir) {
    return [];
  }

  const issues: Issue[] = [];
  const inceptionPath = path.join(latestPackDir, "02_Inception-Deck.md");
  const inceptionText = await readSafe(inceptionPath);
  if (inceptionText !== null && !MERMAID_FENCE_RE.test(inceptionText)) {
    issues.push(
      issue(
        "QFAI-VIS-001",
        "02_Inception-Deck.md に Mermaid 図が見つかりません。",
        "warning",
        inceptionPath,
        "discussionVisuals.inceptionMermaid",
        undefined,
        "change",
        "02_Inception-Deck.md の `Show the Solution` などに ` ```mermaid ` 図を少なくとも1つ追加してください。",
      ),
    );
  }

  const storyWorkshopPath = path.join(latestPackDir, "03_Story-Workshop.md");
  const storyWorkshopText = await readSafe(storyWorkshopPath);
  const storyWorkshopPlainText =
    storyWorkshopText === null ? null : stripFencedCodeBlocks(storyWorkshopText);
  if (storyWorkshopText === null || storyWorkshopPlainText === null) {
    return issues;
  }
  if (!UI_HINT_RE.test(storyWorkshopPlainText)) {
    return issues;
  }

  if (!hasHtmlCssMock(storyWorkshopText)) {
    issues.push(
      issue(
        "QFAI-VIS-002",
        "03_Story-Workshop.md に UI モック（HTML+CSS）が見つかりません。",
        "warning",
        storyWorkshopPath,
        "discussionVisuals.storyWorkshopMock",
        undefined,
        "change",
        "UI 要件がある場合は `Screen Mock (HTML+CSS)` または `Screen Mock — Fallback (HTML+CSS)` セクションを追加し、HTML/CSS モックを記載してください。",
      ),
    );
  }

  return issues;
}

function hasHtmlCssMock(text: string): boolean {
  const hasHeading = SCREEN_MOCK_HEADING_RE.test(text);
  const hasHtml = HTML_FENCE_RE.test(text);
  const hasCss = CSS_FENCE_RE.test(text);
  const hasInlineStyle = /<style[\s>]/i.test(text);
  return hasHeading && hasHtml && (hasCss || hasInlineStyle);
}

function stripFencedCodeBlocks(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  let fence: { closeFenceRe: RegExp } | null = null;

  for (const line of lines) {
    if (fence) {
      if (fence.closeFenceRe.test(line)) {
        fence = null;
      }
      continue;
    }

    const startMatch = /^\s*(`{3,}|~{3,})[^\r\n]*$/.exec(line);
    if (startMatch?.[1]) {
      const token = startMatch[1];
      const fenceChar = token[0];
      if (!fenceChar) {
        continue;
      }
      fence = {
        closeFenceRe: new RegExp(`^\\s*${escapeRegExp(fenceChar)}{${token.length},}\\s*$`),
      };
      continue;
    }

    kept.push(line);
  }

  return kept.join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

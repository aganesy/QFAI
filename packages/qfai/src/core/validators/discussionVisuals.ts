import { readFile } from "node:fs/promises";
import path from "node:path";

import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const MERMAID_FENCE_RE = /^\s*(?:`{3,}|~{3,})\s*mermaid\b/im;
const SCREEN_MOCK_HEADING_RE =
  /^\s*#{1,6}\s*screen mock(?:\s*[-\u2014]+\s*fallback)?\s*\(html\+css\)\s*$/im;
const HTML_FENCE_RE = /^\s*(?:`{3,}|~{3,})\s*html\b/im;
const CSS_FENCE_RE = /^\s*(?:`{3,}|~{3,})\s*css\b/im;
// The last three alternatives are the Japanese spellings of HTML/CSS mock,
// HTML+CSS mock and screen mock, written as escapes.
const MOCK_REFERENCE_RE =
  /\b(?:html\s*\+\s*css\s+(?:mock|screen mock)|html\/css\s+mock|screen mock|fallback mock|visual mock)\b|HTML\/CSS\u30E2\u30C3\u30AF|HTML\+CSS\u30E2\u30C3\u30AF|\u753B\u9762\u30E2\u30C3\u30AF/i;

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
        "No Mermaid diagram was found in 02_Inception-Deck.md.",
        "warning",
        inceptionPath,
        "discussionVisuals.inceptionMermaid",
        undefined,
        "change",
        "Add at least one ` ```mermaid ` diagram to 02_Inception-Deck.md, for example under `Show the Solution`.",
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
  if (!MOCK_REFERENCE_RE.test(storyWorkshopPlainText)) {
    return issues;
  }

  if (!hasHtmlCssMock(storyWorkshopText)) {
    issues.push(
      issue(
        "QFAI-VIS-002",
        "03_Story-Workshop.md references an HTML+CSS mock but has no optional fallback artifact. An HTML+CSS mock is not required by the canonical discussion flow and matters only when it is explicitly referenced.",
        "info",
        storyWorkshopPath,
        "discussionVisuals.storyWorkshopMock",
        undefined,
        "change",
        "If the Story Workshop references an HTML+CSS mock, add the fallback artifact or remove the reference. The sidecar (uiux/) is the primary source of the UI definition.",
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

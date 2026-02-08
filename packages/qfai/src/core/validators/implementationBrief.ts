import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

const REQUIRED_HEADINGS = [
  "Scope & Intent",
  "Architecture / Approach",
  "Implementation Plan",
  "Contracts & Data",
  "Test Strategy",
  "Risks & Mitigations",
  "Open Questions / Spikes",
] as const;

export async function validateImplementationBriefs(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);

  if (entries.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const entry of entries) {
    let text: string;
    try {
      text = await readFile(entry.implementationBriefPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-HOW-001",
            "implementation-brief.md が見つかりません。",
            "error",
            entry.implementationBriefPath,
            "implementationBrief.exists",
          ),
        );
        continue;
      }
      throw error;
    }

    issues.push(
      ...validateImplementationBriefContent(
        text,
        entry.implementationBriefPath,
      ),
    );
  }

  return issues;
}

export function validateImplementationBriefContent(
  text: string,
  file: string,
): Issue[] {
  const normalizedHeadings = extractH2Headings(text).map(normalizeHeading);
  const required = REQUIRED_HEADINGS.map(normalizeHeading);
  const missing = REQUIRED_HEADINGS.filter(
    (heading) => !normalizedHeadings.includes(normalizeHeading(heading)),
  );

  const ordered =
    missing.length === 0
      ? hasRequiredHeadingOrder(normalizedHeadings, required)
      : true;

  if (missing.length === 0 && ordered) {
    return [];
  }

  const details: string[] = [];
  if (missing.length > 0) {
    details.push(`不足見出し: ${missing.join(", ")}`);
  }
  if (!ordered) {
    details.push("必須見出しの順序が固定順と一致していません");
  }

  const detailText = details.length > 0 ? ` (${details.join("; ")})` : "";
  return [
    issue(
      "QFAI-HOW-002",
      `implementation-brief.md の構造が不正です。${detailText}`,
      "error",
      file,
      "implementationBrief.structure",
    ),
  ];
}

function extractH2Headings(text: string): string[] {
  const headings: string[] = [];
  const pattern = /^##\s+(.+?)\s*$/gm;
  for (const match of text.matchAll(pattern)) {
    const heading = match[1];
    if (heading) {
      headings.push(heading);
    }
  }
  return headings;
}

function normalizeHeading(value: string): string {
  return value
    .trim()
    .replace(/^\d+[).:\s-]+/, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function hasRequiredHeadingOrder(
  normalizedHeadings: string[],
  required: string[],
): boolean {
  let cursor = -1;
  for (const heading of required) {
    const next = normalizedHeadings.indexOf(heading, cursor + 1);
    if (next === -1) {
      return false;
    }
    cursor = next;
  }
  return true;
}

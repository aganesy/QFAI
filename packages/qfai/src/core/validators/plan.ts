import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

const REQUIRED_PLAN_HEADINGS = [
  "Metadata",
  "Context & Scope",
  "Goals / Non-goals",
  "Architecture Outline",
  "Verification Strategy",
  "Implementation Plan",
  "Risks & Mitigations",
  "Open Questions / Blockers",
  "Done Checklist",
] as const;

export async function validatePlans(
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
    const planText = await readOptionalText(entry.planPath);
    const legacyText = await readOptionalText(
      entry.legacyImplementationBriefPath,
    );

    if (planText === null && legacyText === null) {
      issues.push(
        issue(
          "QFAI-HOW-001",
          "plan.md が見つかりません（legacy implementation-brief.md も存在しません）。",
          "error",
          entry.planPath,
          "plan.exists",
        ),
      );
      continue;
    }

    if (planText !== null && legacyText !== null) {
      issues.push(
        issue(
          "QFAI-HOW-001",
          "plan.md と implementation-brief.md が同時に存在します。How SSOT は plan.md に統一してください。",
          "error",
          entry.planPath,
          "plan.duplicate",
        ),
      );
      continue;
    }

    if (planText === null && legacyText !== null) {
      issues.push(
        issue(
          "QFAI-HOW-001",
          "implementation-brief.md は廃止されました。plan.md へ移行してください。",
          "error",
          entry.legacyImplementationBriefPath,
          "plan.legacyOnly",
          undefined,
          "compatibility",
          "互換運用は終了しました。次のコマンドで移行してください:\n- mv implementation-brief.md plan.md",
        ),
      );
      continue;
    }

    if (planText === null) {
      continue;
    }

    issues.push(...validatePlanContent(planText, entry.planPath));
  }

  return issues;
}

export function validatePlanContent(text: string, file: string): Issue[] {
  const normalizedHeadings = extractH2Headings(text).map(normalizeHeading);
  const required = REQUIRED_PLAN_HEADINGS.map(normalizeHeading);
  const missing = REQUIRED_PLAN_HEADINGS.filter(
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
      `plan.md の構造が不正です。${detailText}`,
      "error",
      file,
      "plan.structure",
    ),
  ];
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
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

import { access, readFile } from "node:fs/promises";

import type { Issue, IssueCategory, IssueLocation, IssueSeverity } from "../types.js";

export type MarkdownPrefix = "US" | "AC" | "BR" | "TC";

export type MarkdownItem = {
  id: string;
  parent: string | null;
};

export type ScenarioItem = {
  exId: string;
  parent: string | null;
};

export function issue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file?: string,
  rule?: string,
  refs?: string[],
  category: IssueCategory = "canonical",
  suggested_action?: string,
  details?: {
    dl_id?: string;
    /** Other files this finding implicates when `file` is a representative. */
    relatedFiles?: string[];
    /** The CI job the producer reported, for a finding ingested from a lane. */
    job?: string;
    loc?: IssueLocation;
  },
): Issue {
  const issue: Issue = {
    code,
    severity,
    category,
    message,
  };
  if (suggested_action) {
    issue.suggested_action = suggested_action;
  }
  if (file) {
    issue.file = file;
  }
  if (rule) {
    issue.rule = rule;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  if (details?.dl_id) {
    issue.dl_id = details.dl_id;
  }
  if (details?.relatedFiles && details.relatedFiles.length > 0) {
    issue.relatedFiles = details.relatedFiles;
  }
  if (details?.job) {
    issue.job = details.job;
  }
  if (details?.loc) {
    issue.loc = details.loc;
  }
  return issue;
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

export function to4(value: number): string {
  return `${value}`.padStart(4, "0");
}

export function uniqueMatches(text: string, pattern: RegExp): string[] {
  const values: string[] = [];
  for (const match of text.matchAll(cloneGlobal(pattern))) {
    const value = match[0];
    if (!value || values.includes(value)) {
      continue;
    }
    values.push(value.toUpperCase());
  }
  return values;
}

export function collectMarkdownItems(text: string, prefix: MarkdownPrefix): MarkdownItem[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const items: MarkdownItem[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const heading = new RegExp(`^##\\s+(${prefix}-\\d{4})(?:\\s*:\\s*.*)?$`).exec(line.trim());
    if (!heading?.[1]) {
      continue;
    }
    const id = heading[1];
    const parent = findParentLine(lines, index + 1);
    items.push({ id, parent });
  }

  return items;
}

export function collectScenarioItems(text: string): ScenarioItem[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const items: ScenarioItem[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const exIds = uniqueMatches(line, /@EX-\d{4}\b/g);
    if (exIds.length === 0) {
      continue;
    }
    const blockEnd = findNextScenarioTagLine(lines, index + 1);
    const block = lines.slice(index, blockEnd).join("\n");
    const parent = extractParentFromBlock(block);
    for (const exId of exIds) {
      items.push({ exId, parent });
    }
  }

  return items;
}

function findParentLine(lines: string[], startIndex: number): string | null {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^##\s+/.test(line.trim())) {
      return null;
    }
    const matched = /^\s*-\s*Parent\s*:\s*([A-Za-z]+-\d{4})\s*$/i.exec(line);
    if (matched?.[1]) {
      return matched[1].toUpperCase();
    }
  }
  return null;
}

function findNextScenarioTagLine(lines: string[], startIndex: number): number {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (/@EX-\d{4}\b/.test(lines[index] ?? "")) {
      return index;
    }
  }
  return lines.length;
}

function extractParentFromBlock(block: string): string | null {
  const matched = /#\s*Parent\s*:\s*([A-Za-z]+-\d{4})/i.exec(block);
  if (!matched?.[1]) {
    return null;
  }
  return matched[1].toUpperCase();
}

function cloneGlobal(pattern: RegExp): RegExp {
  return new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
}

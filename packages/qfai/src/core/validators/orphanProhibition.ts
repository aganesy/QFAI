import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

type MarkdownItem = {
  id: string;
  parent: string | null;
};

type ScenarioItem = {
  exId: string;
  parent: string | null;
};

export async function validateOrphanProhibition(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredEntries = entries.filter(
    (entry): entry is SpecEntry =>
      entry.layout === "layered" && entry.layeredStyle === "v1417",
  );
  if (layeredEntries.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  const sharedDir =
    layeredEntries[0]?.sharedDir ?? path.join(specsRoot, "_shared");
  const capIds = new Set(
    uniqueMatches(
      await readSafe(path.join(sharedDir, "03_Capabilities.md")),
      /\bCAP-\d{4}\b/g,
    ),
  );

  for (const entry of layeredEntries) {
    const usItems = collectMarkdownItems(
      await readSafe(entry.userStoriesPath),
      "US",
    );
    const acItems = collectMarkdownItems(
      await readSafe(entry.acceptanceCriteriaPath),
      "AC",
    );
    const brItems = collectMarkdownItems(
      await readSafe(entry.businessRulesPath),
      "BR",
    );
    const exItems = collectScenarioItems(await readSafe(entry.examplesPath));
    const tcItems = collectMarkdownItems(
      await readSafe(entry.testCasesPath),
      "TC",
    );

    const usIds = new Set(usItems.map((item) => item.id));
    const acIds = new Set(acItems.map((item) => item.id));
    const brIds = new Set(brItems.map((item) => item.id));
    const exIds = new Set(exItems.map((item) => item.exId));

    issues.push(
      ...validateParentExists({
        filePath: entry.userStoriesPath,
        items: usItems.map((item) => ({ id: item.id, parent: item.parent })),
        parentSet: capIds,
        parentLabel: "CAP",
        rule: "orphanProhibition.usToCap",
        missingCode: "QFAI-ORPHAN-100",
        unknownCode: "QFAI-ORPHAN-101",
      }),
    );
    issues.push(
      ...validateParentExists({
        filePath: entry.acceptanceCriteriaPath,
        items: acItems.map((item) => ({ id: item.id, parent: item.parent })),
        parentSet: usIds,
        parentLabel: "US",
        rule: "orphanProhibition.acToUs",
        missingCode: "QFAI-ORPHAN-102",
        unknownCode: "QFAI-ORPHAN-103",
      }),
    );
    issues.push(
      ...validateParentExists({
        filePath: entry.businessRulesPath,
        items: brItems.map((item) => ({ id: item.id, parent: item.parent })),
        parentSet: acIds,
        parentLabel: "AC",
        rule: "orphanProhibition.brToAc",
        missingCode: "QFAI-ORPHAN-104",
        unknownCode: "QFAI-ORPHAN-105",
      }),
    );
    issues.push(
      ...validateExParentExists(entry.examplesPath, exItems, acIds, brIds),
    );
    issues.push(
      ...validateParentExists({
        filePath: entry.testCasesPath,
        items: tcItems.map((item) => ({ id: item.id, parent: item.parent })),
        parentSet: exIds,
        parentLabel: "EX",
        rule: "orphanProhibition.tcToEx",
        missingCode: "QFAI-ORPHAN-108",
        unknownCode: "QFAI-ORPHAN-109",
      }),
    );
  }

  return issues;
}

function validateParentExists(input: {
  filePath: string;
  items: Array<{ id: string; parent: string | null }>;
  parentSet: Set<string>;
  parentLabel: "CAP" | "US" | "AC" | "EX";
  rule: string;
  missingCode: string;
  unknownCode: string;
}): Issue[] {
  const issues: Issue[] = [];

  for (const item of input.items) {
    if (!item.parent) {
      issues.push(
        issue(
          input.missingCode,
          `${item.id} に Parent がありません。`,
          "error",
          input.filePath,
          input.rule,
          [item.id],
        ),
      );
      continue;
    }

    if (!item.parent.startsWith(`${input.parentLabel}-`)) {
      issues.push(
        issue(
          input.unknownCode,
          `${item.id} の Parent は ${input.parentLabel}-XXXX を参照してください: ${item.parent}`,
          "error",
          input.filePath,
          input.rule,
          [item.id, item.parent],
        ),
      );
      continue;
    }

    if (!input.parentSet.has(item.parent)) {
      issues.push(
        issue(
          input.unknownCode,
          `${item.id} が未定義の親を参照しています: ${item.parent}`,
          "error",
          input.filePath,
          input.rule,
          [item.id, item.parent],
        ),
      );
    }
  }

  return issues;
}

function validateExParentExists(
  filePath: string,
  exItems: ScenarioItem[],
  acIds: Set<string>,
  brIds: Set<string>,
): Issue[] {
  const issues: Issue[] = [];

  for (const item of exItems) {
    if (!item.parent) {
      issues.push(
        issue(
          "QFAI-ORPHAN-106",
          `${item.exId} に Parent コメントがありません。`,
          "error",
          filePath,
          "orphanProhibition.exToUpper",
          [item.exId],
        ),
      );
      continue;
    }

    if (!item.parent.startsWith("BR-") && !item.parent.startsWith("AC-")) {
      issues.push(
        issue(
          "QFAI-ORPHAN-107",
          `${item.exId} の Parent は BR-XXXX または AC-XXXX を参照してください: ${item.parent}`,
          "error",
          filePath,
          "orphanProhibition.exToUpper",
          [item.exId, item.parent],
        ),
      );
      continue;
    }

    if (
      (item.parent.startsWith("BR-") && !brIds.has(item.parent)) ||
      (item.parent.startsWith("AC-") && !acIds.has(item.parent))
    ) {
      issues.push(
        issue(
          "QFAI-ORPHAN-107",
          `${item.exId} が未定義の親を参照しています: ${item.parent}`,
          "error",
          filePath,
          "orphanProhibition.exToUpper",
          [item.exId, item.parent],
        ),
      );
    }
  }

  return issues;
}

function collectMarkdownItems(
  text: string,
  prefix: "US" | "AC" | "BR" | "TC",
): MarkdownItem[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const items: MarkdownItem[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const heading = new RegExp(
      `^##\\s+(${prefix}-\\d{4})(?:\\s*:\\s*.*)?$`,
    ).exec(line.trim());
    if (!heading?.[1]) {
      continue;
    }
    const id = heading[1];
    const parent = findParentLine(lines, index + 1);
    items.push({ id, parent });
  }

  return items;
}

function collectScenarioItems(text: string): ScenarioItem[] {
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

function uniqueMatches(text: string, pattern: RegExp): string[] {
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

function cloneGlobal(pattern: RegExp): RegExp {
  return new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

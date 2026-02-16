import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import type { Issue } from "../types.js";
import {
  collectMarkdownItems,
  collectScenarioItems,
  issue,
  readSafe,
  uniqueMatches,
  type ScenarioItem,
} from "./utils.js";

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

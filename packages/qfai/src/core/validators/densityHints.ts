import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const BR_ID_RE = /\bBR-[A-Za-z0-9-]+\b/g;
const SCENARIO_RE = /^\s*Scenario(?:\s+Outline)?\s*:/gim;
const TC_OR_CASE_RE = /\b(?:TC|CASE)-[A-Za-z0-9-]+\b/g;

export async function validateDensityHints(root: string, config: QfaiConfig): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const issues: Issue[] = [];

  for (const entry of entries) {
    const [brText, examplesText, testCasesText] = await Promise.all([
      readSafe(entry.businessRulesPath),
      readSafe(entry.examplesPath),
      readSafe(entry.testCasesPath),
    ]);

    if (brText.length > 0 && countMatches(brText, BR_ID_RE) === 0) {
      issues.push(
        issue(
          "QFAI-DENSITY-001",
          "Business-rules に BR ID が見つかりません。",
          "warning",
          entry.businessRulesPath,
          "density.businessRules.ids",
          undefined,
          "change",
          "BR Catalog と Rule Definitions を追加し、少なくとも1件の BR ID を定義してください。",
        ),
      );
    }

    if (examplesText.length > 0 && countMatches(examplesText, SCENARIO_RE) === 0) {
      issues.push(
        issue(
          "QFAI-DENSITY-002",
          "Examples.feature に Scenario が見つかりません。",
          "warning",
          entry.examplesPath,
          "density.examples.scenarios",
          undefined,
          "change",
          "Examples.feature に Scenario または Scenario Outline を追加してください。",
        ),
      );
    }

    if (testCasesText.length > 0 && countMatches(testCasesText, TC_OR_CASE_RE) === 0) {
      issues.push(
        issue(
          "QFAI-DENSITY-003",
          "Test-cases に TC/CASE ID が見つかりません。",
          "warning",
          entry.testCasesPath,
          "density.testCases.ids",
          undefined,
          "change",
          "Test-cases に少なくとも1件の TC ID（または CASE ID）を追加してください。",
        ),
      );
    }

    if (testCasesText.length > 0 && isCoverageMatrixEmpty(testCasesText)) {
      issues.push(
        issue(
          "QFAI-DENSITY-004",
          "Test-cases の Coverage Matrix が空、または未定義です。",
          "warning",
          entry.testCasesPath,
          "density.testCases.coverageMatrix",
          undefined,
          "change",
          "Coverage Matrix セクションを作成し、EX/SC と TC/CASE の対応行を追加してください。",
        ),
      );
    }
  }

  return issues;
}

function countMatches(text: string, pattern: RegExp): number {
  const matcher = new RegExp(pattern.source, pattern.flags);
  return Array.from(text.matchAll(matcher)).length;
}

function isCoverageMatrixEmpty(text: string): boolean {
  const normalized = text.replace(/\r\n/g, "\n");
  const headingMatch = /^##\s+Coverage Matrix[^\n]*$/im.exec(normalized);
  if (!headingMatch) {
    return true;
  }

  const sectionStart = headingMatch.index + headingMatch[0].length;
  const remainder = normalized.slice(sectionStart);
  const nextHeading = /\n##\s+/m.exec(remainder);
  const section = (nextHeading ? remainder.slice(0, nextHeading.index) : remainder).trim();

  const tableLines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  if (tableLines.length < 3) {
    return true;
  }

  const dataRows = tableLines.slice(2).filter((line) => !isSeparatorRow(line));
  return dataRows.length === 0;
}

function isSeparatorRow(line: string): boolean {
  return /^\|\s*[-:| ]+\|\s*$/.test(line);
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

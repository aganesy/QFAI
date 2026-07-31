import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import { parseAllMarkdownTables } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const BR_ID_RE = /\bBR-[A-Za-z0-9-]+\b/g;
const SCENARIO_RE = /^\s*Scenario(?:\s+Outline)?\s*:/gim;
const EX_ID_RE = /\bEX-[A-Za-z0-9-]+\b/g;
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

    issues.push(...checkRuleCellOutliers(brText, entry.businessRulesPath));

    if (examplesText.length > 0 && !hasStructuredExamples(examplesText)) {
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

    if (testCasesText.length > 0 && !hasStructuredCoverage(testCasesText)) {
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

/**
 * A `Rule` cell must be at least this many characters before it can be an
 * outlier at all, so a file of one-line rules never trips the check on noise.
 */
const RULE_CELL_MIN_LENGTH = 400;

/** How many times the file's own mean a `Rule` cell may reach before it is flagged. */
const RULE_CELL_OUTLIER_FACTOR = 3;

/**
 * `QFAI-DENSITY-005` — a `Rule` cell that is a size outlier against its own
 * siblings.
 *
 * Referential integrity is trivially satisfied by a single oversized node: a
 * `Rule` cell holding nine independent rule families passes every hop of
 * `US -> AC -> BR -> EX -> TC` and only surfaces once it has been projected
 * 1:1 into one enormous test module.
 *
 * A row is flagged when it is BOTH at least `RULE_CELL_MIN_LENGTH` characters
 * AND at least `RULE_CELL_OUTLIER_FACTOR` times the mean of the OTHER rows in
 * the same file — its siblings, never including itself. Relative to siblings so
 * a project that legitimately writes long rules everywhere is not given a house
 * style it did not ask for; excluding the candidate so one huge cell cannot
 * inflate the baseline past itself. Files with fewer than three qualifying `BR`
 * rows are skipped, since a sibling mean over one row is not a baseline.
 */
/** Header cell as compared: backticks and surrounding whitespace dropped, lowercased. */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/^`+|`+$/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function checkRuleCellOutliers(brText: string, businessRulesPath: string): Issue[] {
  if (brText.length === 0) {
    return [];
  }

  const rows: Array<{ id: string; length: number }> = [];
  for (const table of parseAllMarkdownTables(brText)) {
    // Headers are hand-authored, so match on the normalized form: strip
    // wrapping backticks (`` `BR-ID` ``), collapse inner whitespace, compare
    // case-insensitively. Anything stricter silently skips a table a human
    // reads as correct, and a skipped table is a check that never runs.
    const headers = table.headers.map(normalizeHeader);
    const idIndex = headers.indexOf("br-id");
    const ruleIndex = headers.indexOf("rule");
    if (idIndex < 0 || ruleIndex < 0) {
      continue;
    }
    for (const row of table.rows) {
      const id = (row[idIndex] ?? "").trim();
      const rule = (row[ruleIndex] ?? "").trim();
      if (id.length > 0) {
        rows.push({ id, length: rule.length });
      }
    }
  }

  // Below three rows a "mean of the siblings" is not meaningful.
  if (rows.length < 3) {
    return [];
  }

  const total = rows.reduce((sum, row) => sum + row.length, 0);
  if (total <= 0) {
    return [];
  }

  // Compared against the mean of the OTHER rows: including the candidate in
  // its own baseline lets one huge cell inflate the threshold past itself.
  const siblingMean = (row: { length: number }): number => (total - row.length) / (rows.length - 1);

  const outliers = rows.filter(
    (row) =>
      row.length >= RULE_CELL_MIN_LENGTH &&
      row.length >= siblingMean(row) * RULE_CELL_OUTLIER_FACTOR,
  );
  if (outliers.length === 0) {
    return [];
  }

  // One `BR-ID` can appear in more than one table, so the same id can be
  // flagged twice. Report it once, in id order, so the finding is stable
  // between runs and a downstream consumer keying on `refs` sees no repeats.
  const seen = new Set<string>();
  const uniqueOutliers = outliers
    .filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)))
    .sort((a, b) => a.id.localeCompare(b.id));
  const refs = uniqueOutliers.map((row) => row.id);
  return [
    issue(
      "QFAI-DENSITY-005",
      `Rule セルが同一ファイルの他 BR 平均の ${RULE_CELL_OUTLIER_FACTOR} 倍以上です: ${uniqueOutliers
        .map((row) => `${row.id} (${row.length})`)
        .join(", ")}`,
      "warning",
      businessRulesPath,
      "density.businessRules.ruleCellOutlier",
      refs,
      "change",
      "1 BR = 1 つの独立して反証可能なルールです。Rule セルの半分を削っても残りが完全なルールなら 2 つの BR に分割してください。",
    ),
  ];
}

function countMatches(text: string, pattern: RegExp): number {
  const matcher = new RegExp(pattern.source, pattern.flags);
  return Array.from(text.matchAll(matcher)).length;
}

function hasStructuredExamples(text: string): boolean {
  if (countMatches(text, SCENARIO_RE) > 0) {
    return true;
  }
  if (hasMarkdownTableColumn(text, "EX-ID") && countMatches(text, EX_ID_RE) > 0) {
    return true;
  }
  return /^##\s*EX-[A-Za-z0-9-]+\b/im.test(text);
}

function hasStructuredCoverage(text: string): boolean {
  if (hasMarkdownTableColumn(text, "TC-ID")) {
    return true;
  }
  if (/^##\s*TC-[A-Za-z0-9-]+\b/im.test(text)) {
    return true;
  }
  return !isCoverageMatrixEmpty(text);
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

function hasMarkdownTableColumn(text: string, column: string): boolean {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const nextLine = lines[index + 1]?.trim() ?? "";
    if (!line.startsWith("|") || !nextLine.startsWith("|")) {
      continue;
    }
    if (!isSeparatorRow(nextLine)) {
      continue;
    }
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    return cells.includes(column);
  }
  return false;
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

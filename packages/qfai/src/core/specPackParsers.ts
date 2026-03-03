import { parseScenarioDocument } from "./scenarioModel.js";
import { extractIdsByKind } from "./specPackIds.js";
import type { SpecPackIdKind } from "./specPackIds.js";
import { LAYER_TAGS } from "./testStrategyTags.js";

const FEATURE_LINE_RE = /^\s*Feature:/gm;
const EX_ID_RE = /^EX-\d+$/;
const AC_ID_RE = /^AC-\d+$/;

export type ParsedExamplesScenario = {
  name: string;
  tags: string[];
  exIds: string[];
  acIds: string[];
  layerTags: string[];
};

export type ParsedExamplesFeature = {
  scenarios: ParsedExamplesScenario[];
  errors: string[];
};

export type MarkdownTable = {
  headers: string[];
  rows: string[][];
};

export function parseIdsFromText(text: string, kind: SpecPackIdKind): string[] {
  return extractIdsByKind(text, kind);
}

export function parseAcceptanceCriteriaIds(text: string): string[] {
  return extractIdsByKind(text, "AC");
}

export function parseTestCaseIds(text: string): string[] {
  return extractIdsByKind(text, "TC");
}

export function parseExamplesFeature(text: string, filePath: string): ParsedExamplesFeature {
  const errors: string[] = [];
  const featureCount = text.match(FEATURE_LINE_RE)?.length ?? 0;
  if (featureCount !== 1) {
    errors.push(`Feature 定義は1件のみ許可されます（検出: ${featureCount}）。`);
  }

  const parsed = parseScenarioDocument(text, filePath);
  if (!parsed.document || parsed.errors.length > 0) {
    return {
      scenarios: [],
      errors: [...errors, ...parsed.errors.map((error) => `Gherkin 解析失敗: ${error}`)],
    };
  }

  const scenarios = parsed.document.scenarios.map((scenario) => {
    const tags = scenario.tags;
    return {
      name: scenario.name,
      tags,
      exIds: tags.filter((tag) => EX_ID_RE.test(tag)),
      acIds: tags.filter((tag) => AC_ID_RE.test(tag)),
      layerTags: tags.filter((tag) => tag.startsWith("layer-")),
    };
  });

  return { scenarios, errors };
}

export function resolveAllowedLayerTagsFromPolicy(policyText: string): Set<string> {
  const extracted = new Set<string>();
  for (const match of policyText.matchAll(/@?(layer-[a-z0-9-]+)/gi)) {
    const tag = match[1];
    if (tag) {
      extracted.add(tag.toLowerCase());
    }
  }

  if (extracted.size > 0) {
    return extracted;
  }

  return new Set(Array.from(LAYER_TAGS));
}

export function parseFirstMarkdownTable(text: string): MarkdownTable | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerLine = lines[index] ?? "";
    const separatorLine = lines[index + 1] ?? "";
    if (!looksLikeTableRow(headerLine) || !isTableSeparator(separatorLine)) {
      continue;
    }

    const headers = splitMarkdownRow(headerLine);
    const rows: string[][] = [];
    for (let cursor = index + 2; cursor < lines.length; cursor += 1) {
      const rowLine = lines[cursor] ?? "";
      if (!looksLikeTableRow(rowLine)) {
        break;
      }
      rows.push(splitMarkdownRow(rowLine));
    }
    return { headers, rows };
  }
  return null;
}

export function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimEdgePipes(trimmed);
  const cells: string[] = [];
  let current = "";

  for (let index = 0; index < inner.length; index += 1) {
    const ch = inner[index];
    if (ch === undefined) continue;
    const next = inner[index + 1];
    if (ch === "\\" && next === "|") {
      current += "|";
      index += 1;
      continue;
    }
    if (ch === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function looksLikeTableRow(line: string): boolean {
  return /^\s*\|/.test(line);
}

function isTableSeparator(line: string): boolean {
  if (!looksLikeTableRow(line)) {
    return false;
  }
  const cells = splitMarkdownRow(line).filter((cell) => cell.length > 0);
  if (cells.length === 0) {
    return false;
  }
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function trimEdgePipes(value: string): string {
  let out = value;
  if (out.startsWith("|")) {
    out = out.slice(1);
  }
  if (out.endsWith("|")) {
    out = out.slice(0, -1);
  }
  return out;
}

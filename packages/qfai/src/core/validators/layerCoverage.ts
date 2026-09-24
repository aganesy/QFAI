import path from "node:path";

import { splitMarkdownRow } from "../specPackParsers.js";
import type { SpecEntry } from "../specLayout.js";
import { collectMarkdownItems, collectScenarioItems, readSafe } from "./utils.js";

const ID_PATTERNS = {
  us: /^US-\d{4}(?:-\d{4})?$/,
  ac: /^AC-\d{4}(?:-\d{4})?$/,
  br: /^BR-\d{4}(?:-\d{4})?$/,
  ex: /^EX-\d{4}(?:-\d{4})?$/,
} as const;

const V1421_REFS = {
  ac: /\bAC-\d{4}(?:-\d{4})?\b/gi,
  br: /\bBR-\d{4}(?:-\d{4})?\b/gi,
  ex: /\bEX-\d{4}(?:-\d{4})?\b/gi,
} as const;

type ParseDefinitionOptions = {
  referenceColumns?: readonly string[];
};

/**
 * Parsed AC/BR/EX/TC layer references of one v1421 spec.
 *
 * Exported because the traceability graph writer needs exactly the same walk:
 * duplicating the table parsing there is how the two views of a spec pack drift
 * apart.
 */
export type V1421LayerRefs = {
  acIds: Set<string>;
  brToAcRefs: Map<string, Set<string>>;
  exToBrRefs: Map<string, Set<string>>;
  tcToAcRefs: Map<string, Set<string>>;
  tcToExRefs: Map<string, Set<string>>;
};

/** Reads the four v1421 layer files and returns their definitions and references. */
export async function collectV1421LayerRefs(entry: SpecEntry): Promise<V1421LayerRefs> {
  const [acText, brText, exText, tcText] = await Promise.all([
    readSafe(entry.acceptanceCriteriaPath),
    readSafe(entry.businessRulesPath),
    readSafe(entry.examplesPath),
    readSafe(entry.testCasesPath),
  ]);

  return {
    acIds: parseAcceptanceCriteriaIds(acText),
    brToAcRefs: parseDefinitionRefs(brText, "BR", V1421_REFS.ac, {
      referenceColumns: ["AC-Refs"],
    }),
    exToBrRefs: parseDefinitionRefs(exText, "EX", V1421_REFS.br, {
      referenceColumns: ["BR-Ref"],
    }),
    tcToAcRefs: parseDefinitionRefs(tcText, "TC", V1421_REFS.ac, {
      referenceColumns: ["AC-Refs"],
    }),
    tcToExRefs: parseDefinitionRefs(tcText, "TC", V1421_REFS.ex, {
      referenceColumns: ["EX-Ref"],
    }),
  };
}

/**
 * The same reference graph, read from whichever layout the pack is written in.
 *
 * `collectV1421LayerRefs` reads Markdown definition tables and `## <ID>`
 * headings. On `v1417` / `v1416` the Examples layer is a Gherkin `.feature`
 * file (`specLayout.ts` resolves `examplesPath` to it), whose EX ids are
 * `@EX-NNNN` tags and whose parentage is a `# Parent: BR-NNNN` comment — so
 * that reader returns an empty `exToBrRefs` there rather than an error, and a
 * caller that derives from the graph derives nothing at all. This walk is the
 * one `#validatebrtoexcoverage` and `#validateextotccoverage` already apply to
 * those layouts, so the two cannot disagree about what an EX's parent is.
 *
 * A flat pack keeps the v1421 reader: it has no Gherkin Examples file, and
 * changing what it reads is not this function's subject.
 */
export async function collectLayerRefs(entry: SpecEntry): Promise<V1421LayerRefs> {
  if (entry.layeredStyle !== "v1417" && entry.layeredStyle !== "v1416") {
    return collectV1421LayerRefs(entry);
  }

  const [acText, brText, exText, tcText] = await Promise.all([
    readSafe(entry.acceptanceCriteriaPath),
    readSafe(entry.businessRulesPath),
    readSafe(entry.examplesPath),
    readSafe(entry.testCasesPath),
  ]);

  return {
    acIds: new Set(
      collectMarkdownItems(acText, "AC")
        .map((item) => item.id)
        .filter((id) => ID_PATTERNS.ac.test(id)),
    ),
    brToAcRefs: parentEdges(collectMarkdownItems(brText, "BR"), ID_PATTERNS.ac),
    exToBrRefs: scenarioParentEdges(collectScenarioItems(exText)),
    tcToAcRefs: parentEdges(collectMarkdownItems(tcText, "TC"), ID_PATTERNS.ac),
    tcToExRefs: parentEdges(collectMarkdownItems(tcText, "TC"), ID_PATTERNS.ex),
  };
}

/**
 * One `- Parent: <ID>` edge per definition, kept only where the parent is of
 * the asked-for kind.
 *
 * A definition whose parent is another kind still gets an entry, empty: the
 * consumers read "declared, with no reference of this kind" from an empty set
 * and "not declared" from an absent key, and collapsing the two would report a
 * TC that references an AC as one that references nothing.
 */
function parentEdges(
  items: readonly { id: string; parent: string | null }[],
  pattern: RegExp,
): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>();
  for (const item of items) {
    const refs = edges.get(item.id) ?? new Set<string>();
    if (item.parent !== null && pattern.test(item.parent)) {
      refs.add(item.parent.toUpperCase());
    }
    edges.set(item.id, refs);
  }
  return edges;
}

/** The same, for the `@EX-NNNN` tag and `# Parent: BR-NNNN` comment of a scenario. */
function scenarioParentEdges(
  items: readonly { exId: string; parent: string | null }[],
): Map<string, Set<string>> {
  return parentEdges(
    items.map((item) => ({ id: item.exId.replace(/^@/, ""), parent: item.parent })),
    ID_PATTERNS.br,
  );
}

function parseAcceptanceCriteriaIds(text: string): Set<string> {
  const ids = new Set<string>();
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (const line of lines) {
    const headingMatch = /^##\s*(AC-\d{4}(?:-\d{4})?)\b/i.exec(line.trim());
    if (headingMatch?.[1]) {
      ids.add(headingMatch[1].toUpperCase());
    }

    const commentMatch = /^\s*#\s*(AC-\d{4}(?:-\d{4})?)\b/i.exec(line);
    if (commentMatch?.[1]) {
      ids.add(commentMatch[1].toUpperCase());
    }

    if (line.trim().startsWith("|")) {
      const cells = splitMarkdownRow(line);
      if (isSeparatorRow(cells)) {
        continue;
      }
      const firstCell = normalizeId(cells[0]);
      if (firstCell && ID_PATTERNS.ac.test(firstCell)) {
        ids.add(firstCell);
      }
    }
  }

  return ids;
}

function parseDefinitionRefs(
  text: string,
  prefix: "BR" | "EX" | "TC",
  refPattern: RegExp,
  options: ParseDefinitionOptions = {},
): Map<string, Set<string>> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const refsById = new Map<string, Set<string>>();
  const idPattern = new RegExp(`^${prefix}-\\d{4}(?:-\\d{4})?$`);
  const headingPattern = new RegExp(`^##\\s*(${prefix}-\\d{4}(?:-\\d{4})?)\\b`, "i");
  const referenceColumns = new Set(
    (options.referenceColumns ?? []).map((column) => normalizeColumnName(column)),
  );

  let currentId: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const headingMatch = headingPattern.exec(line.trim());
    if (headingMatch?.[1]) {
      currentId = headingMatch[1].toUpperCase();
      ensureSet(refsById, currentId);
      continue;
    }
    if (/^##\s+/.test(line.trim())) {
      currentId = null;
    }

    const nextLine = lines[index + 1] ?? "";
    if (
      line.trim().startsWith("|") &&
      nextLine.trim().startsWith("|") &&
      isSeparatorRow(splitMarkdownRow(nextLine))
    ) {
      const headerCells = splitMarkdownRow(line);
      const refColumnIndexes = collectReferenceColumnIndexes(headerCells, referenceColumns);
      index += 2;
      for (; index < lines.length; index += 1) {
        const rowLine = lines[index] ?? "";
        if (!rowLine.trim().startsWith("|")) {
          index -= 1;
          break;
        }
        const cells = splitMarkdownRow(rowLine);
        if (isSeparatorRow(cells)) {
          continue;
        }
        const firstCell = normalizeId(cells[0]);
        if (!firstCell || !idPattern.test(firstCell)) {
          continue;
        }
        const refs = extractMatchesFromCells(cells, refColumnIndexes, refPattern);
        refsById.set(firstCell, refs);
        currentId = null;
      }
      continue;
    }

    if (line.trim().startsWith("|")) {
      const cells = splitMarkdownRow(line);
      if (isSeparatorRow(cells)) {
        continue;
      }
      const firstCell = normalizeId(cells[0]);
      if (firstCell && idPattern.test(firstCell)) {
        const refs = extractMatchesFromCells(cells, [], refPattern, referenceColumns.size > 0);
        refsById.set(firstCell, refs);
        currentId = null;
      }
      continue;
    }

    if (currentId) {
      const refs = extractMatches(line, refPattern);
      const current = ensureSet(refsById, currentId);
      for (const ref of refs) {
        current.add(ref);
      }
    }
  }

  return refsById;
}

function collectReferenceColumnIndexes(
  headerCells: string[],
  referenceColumns: Set<string>,
): number[] {
  if (referenceColumns.size === 0) {
    return [];
  }
  const indexes: number[] = [];
  for (let index = 0; index < headerCells.length; index += 1) {
    const normalized = normalizeColumnName(headerCells[index] ?? "");
    if (referenceColumns.has(normalized)) {
      indexes.push(index);
    }
  }
  return indexes;
}

function extractMatchesFromCells(
  cells: string[],
  indexes: number[],
  pattern: RegExp,
  strictColumnMode = false,
): Set<string> {
  if (indexes.length === 0) {
    if (strictColumnMode) {
      return new Set<string>();
    }
    return extractMatches(cells.join(" | "), pattern);
  }
  const refs = new Set<string>();
  for (const index of indexes) {
    const cell = cells[index];
    if (!cell) {
      continue;
    }
    const matched = extractMatches(cell, pattern);
    for (const ref of matched) {
      refs.add(ref);
    }
  }
  return refs;
}

function normalizeColumnName(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Rule code carried by every `## Signals` row so the mandated triage in
 * `qfai-sdd/SKILL.md` and the `warning_signal` entry in `review-gate.rules.yml`
 * refer to something the report actually contains.
 */
export const THIN_COVERAGE_SIGNAL_CODE = "QFAI-COV-207";

/**
 * Single definition of what `QFAI-COV-207` means, so the spec-coverage report
 * and the validate issue catalog cannot drift apart. The code carries the
 * thin-coverage signal the report prints.
 */
export const THIN_COVERAGE_SIGNAL_EXPECTATION =
  "Artifacts covered by exactly 1 downstream case are review signals, not gate failures; triage each one in the spec-coverage report.";

/**
 * Collapses an ID list into contiguous runs on its trailing numeric segment,
 * so `BR-0003-0001 … BR-0003-0009` prints as one range instead of nine
 * identically-shaped lines.
 *
 * The run detection needs the ids in order, and this is exported, so it sorts
 * a copy rather than documenting the requirement and trusting every caller to
 * have met it: an unsorted argument produced silently wrong output — runs
 * broken into fragments — rather than an error anyone would notice. The input
 * array is not mutated.
 */
export function collapseIdRuns(unorderedIds: readonly string[]): string[] {
  const ids = [...unorderedIds].sort((a, b) => a.localeCompare(b));
  const runs: string[] = [];
  let runStart: string | undefined;
  let runEnd: string | undefined;
  let runStem = "";
  let runLast = Number.NaN;

  const flush = (): void => {
    if (runStart === undefined || runEnd === undefined) {
      return;
    }
    runs.push(runStart === runEnd ? runStart : `${runStart}..${runEnd}`);
    runStart = undefined;
    runEnd = undefined;
  };

  for (const id of ids) {
    const match = /^(.*-)(\d+)$/.exec(id);
    const stem = match?.[1] ?? id;
    const last = match?.[2] === undefined ? Number.NaN : Number.parseInt(match[2], 10);
    const contiguous =
      runStart !== undefined && stem === runStem && Number.isFinite(last) && last === runLast + 1;

    if (contiguous) {
      runEnd = id;
    } else {
      flush();
      runStart = id;
      runEnd = id;
    }
    runStem = stem;
    runLast = last;
  }
  flush();

  return runs;
}

/**
 * True for the v1421 table layout. Also accepts an entry whose examples file is
 * markdown, because `05_Examples.md` (rather than the v1416/v1417
 * `Examples.feature`) is the distinguishing artifact of the layout.
 */
export function isV1421LayeredEntry(entry: SpecEntry): boolean {
  if (entry.layeredStyle === "v1421") {
    return true;
  }
  return path.extname(entry.examplesPath).toLowerCase() === ".md";
}

function extractMatches(text: string, pattern: RegExp): Set<string> {
  const matches = new Set<string>();
  const matcher = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );

  for (const match of text.matchAll(matcher)) {
    const value = normalizeId(match[0]);
    if (value) {
      matches.add(value);
    }
  }
  return matches;
}

function ensureSet(map: Map<string, Set<string>>, key: string): Set<string> {
  const current = map.get(key) ?? new Set<string>();
  map.set(key, current);
  return current;
}

function normalizeId(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.toUpperCase();
}

function isSeparatorRow(cells: string[]): boolean {
  if (cells.length === 0) {
    return false;
  }
  return cells
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0)
    .every((cell) => /^:?-{3,}:?$/.test(cell));
}

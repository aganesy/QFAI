/**
 * Canonical UIX trend-axis traceability validators — v1.7.16
 *
 * Implements four canonical rules that validate the traceability chain
 * between Trend Scan entries in 04_Sources.md and TRD axes in
 * uiux/21_design_eval_trend_derived.md:
 *
 * - UIX-VAL-T01 (error)   — Trend Scan entry missing / empty evaluation_connection
 * - UIX-VAL-T02 (error)   — evaluation_connection references a TRD not present in axes file
 * - UIX-VAL-T03 (warning) — TRD axis source_refs references a source id not in 04_Sources.md
 * - UIX-VAL-T04 (warning) — Visual-category Trend Scan entry but no visual axis in TRD
 *
 * All four rules skip with zero issues on non-UI packs. When 04_Sources.md has
 * no ## Trend Scan section, we return [] (already covered by validateTrendScan).
 *
 * Issue output is stably sorted (rule id ascending, then offending id alphabetically)
 * for idempotency (TC-0014-0031).
 *
 * AC-Refs: AC-0014-0015, AC-0014-0016, AC-0014-0017, AC-0014-0018
 * TC-Refs: TC-0014-0020..TC-0014-0025
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

// ---------------------------------------------------------------------------
// File paths
// ---------------------------------------------------------------------------

const SOURCES_FILE = "04_Sources.md";
const TREND_AXES_FILE = "uiux/21_design_eval_trend_derived.md";

// ---------------------------------------------------------------------------
// Trend Scan parsing (adapted from uix/trendScan.ts — local copy preserves
// independence while keeping behavior aligned with the canonical parser).
// ---------------------------------------------------------------------------

type TrendEntry = {
  /** Stable id reported in issue messages: prefer explicit source_id, else category/index. */
  reportedId: string;
  /** The category heading text (lowercased) that owns this entry. */
  category: string;
  /** Explicit `source_id:` value if present, else undefined. */
  sourceId: string | undefined;
  /**
   * evaluation_connection raw value:
   * - undefined: field absent
   * - "": empty string (explicitly empty)
   * - string: the trimmed value
   */
  evaluationConnection: string | undefined;
};

function extractTrendScanSection(content: string): string | null {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim().toLowerCase() === "## trend scan");
  if (start === -1) {
    return null;
  }
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function extractCategoryBlocks(trendSection: string): Array<{ category: string; body: string }> {
  const lines = trendSection.split("\n");
  const blocks: Array<{ category: string; body: string }> = [];
  let currentCategory: string | null = null;
  let currentStart = 0;

  const flush = (endIndex: number): void => {
    if (currentCategory === null) return;
    const body = lines.slice(currentStart, endIndex).join("\n");
    blocks.push({ category: currentCategory, body });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const match = /^###\s+(.+)$/.exec(line.trim());
    if (match?.[1]) {
      flush(index);
      currentCategory = match[1].trim();
      currentStart = index + 1;
    }
  }
  flush(lines.length);
  return blocks;
}

function parseEntryBlocks(categoryBody: string): string[] {
  return categoryBody
    .split(/(?=^####\s+)/m)
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith("#### "));
}

function extractField(entry: string, field: string): string | undefined {
  const match = new RegExp(`^\\s*-\\s*${field}\\s*:(.*)$`, "im").exec(entry);
  if (!match) return undefined;
  return (match[1] ?? "").trim();
}

function extractEntryHeadingId(entry: string): string | undefined {
  const firstLine = entry.split("\n", 1)[0] ?? "";
  const match = /^####\s+Entry\s+(.+?)\s*$/i.exec(firstLine);
  return match?.[1]?.trim();
}

function collectTrendEntries(sourcesContent: string): TrendEntry[] {
  const trendSection = extractTrendScanSection(sourcesContent);
  if (!trendSection) return [];

  const entries: TrendEntry[] = [];
  for (const block of extractCategoryBlocks(trendSection)) {
    const rawEntries = parseEntryBlocks(block.body);
    rawEntries.forEach((rawEntry, entryIndex) => {
      const explicitSourceId = extractField(rawEntry, "source_id");
      const headingId = extractEntryHeadingId(rawEntry);
      const reportedId =
        explicitSourceId && explicitSourceId.length > 0
          ? explicitSourceId
          : headingId && headingId.length > 0
            ? headingId
            : `${block.category.toLowerCase()}/${entryIndex + 1}`;

      const evaluationConnection = extractField(rawEntry, "evaluation_connection");

      entries.push({
        reportedId,
        category: block.category,
        sourceId: explicitSourceId && explicitSourceId.length > 0 ? explicitSourceId : undefined,
        evaluationConnection,
      });
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// TRD axes parsing (uiux/21_design_eval_trend_derived.md)
// ---------------------------------------------------------------------------

type TrdAxis = {
  id: string; // e.g. TRD-01
  body: string; // axis body text for heuristic scans
  sourceRefs: string[];
};

function extractAxesSection(content: string): string {
  // Slice from "## Axes" (if present) to end. If absent, scan the full doc.
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim().toLowerCase() === "## axes");
  if (start === -1) return content;
  return lines.slice(start).join("\n");
}

function parseAxisBlocks(content: string): string[] {
  return content
    .split(/(?=^###\s+Axis\s*:)/im)
    .map((block) => block.trim())
    .filter((block) => /^###\s+Axis\s*:/i.test(block));
}

function extractAxisId(block: string): string | undefined {
  const headingMatch = /^###\s+Axis\s*:\s*\[?\s*(TRD-\d+)\s*\]?/im.exec(block);
  if (headingMatch?.[1]) return headingMatch[1].toUpperCase();
  const fieldMatch = /^\s*-\s*axis_id\s*:\s*(TRD-\d+)/im.exec(block);
  return fieldMatch?.[1]?.toUpperCase();
}

function extractAxisSourceRefs(block: string): string[] {
  const lines = block.split("\n");
  const startIdx = lines.findIndex((line) => /^\s*-\s*source_refs\s*:\s*$/i.test(line));
  if (startIdx === -1) {
    // Could be inline: `- source_refs: [SRC-01, SRC-02]`
    const inline = /^\s*-\s*source_refs\s*:\s*\[(.*)\]\s*$/im.exec(block);
    if (inline?.[1]) {
      return inline[1]
        .split(",")
        .map((token) => stripRefToken(token))
        .filter((token) => token.length > 0);
    }
    return [];
  }
  const refs: string[] = [];
  for (let index = startIdx + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    // Stop when we hit a sibling list item that isn't indented deeper, or a blank followed by another top-level field.
    if (/^\s*-\s*\w+\s*:/.test(line) && !/^\s{2,}-\s+/.test(line)) {
      break;
    }
    const childMatch = /^\s{2,}-\s+(.+?)\s*(?:#.*)?$/.exec(line);
    if (childMatch?.[1]) {
      const token = stripRefToken(childMatch[1]);
      if (token.length > 0) refs.push(token);
    }
  }
  return refs;
}

function stripRefToken(raw: string): string {
  return raw.trim().replace(/^["']/, "").replace(/["']$/, "").replace(/,$/, "").trim();
}

function collectTrdAxes(axesContent: string): TrdAxis[] {
  if (!axesContent) return [];
  const axesSection = extractAxesSection(axesContent);
  const blocks = parseAxisBlocks(axesSection);
  const axes: TrdAxis[] = [];
  for (const block of blocks) {
    const id = extractAxisId(block);
    if (!id) continue;
    axes.push({
      id,
      body: block,
      sourceRefs: extractAxisSourceRefs(block),
    });
  }
  return axes;
}

// ---------------------------------------------------------------------------
// Issue helpers
// ---------------------------------------------------------------------------

function issueOf(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "canonical",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

// ---------------------------------------------------------------------------
// Rule evaluators
// ---------------------------------------------------------------------------

const VISUAL_CATEGORY_RE = /color|typography|visual/i;
const VISUAL_AXIS_RE = /visual/i;
const NONE_PLACEHOLDER_RE = /^(?:none|n\/a|-|tbd|todo)$/i;

function evaluateT01(entries: TrendEntry[]): Issue[] {
  const issues: Issue[] = [];
  for (const entry of entries) {
    const raw = entry.evaluationConnection;
    const missing = raw === undefined || raw.length === 0;
    if (!missing) continue;
    issues.push(
      issueOf(
        "UIX-VAL-T01",
        `Trend Scan entry '${entry.reportedId}' (category '${entry.category}') is missing required field 'evaluation_connection'.`,
        "error",
        SOURCES_FILE,
        `Populate 'evaluation_connection' for Trend Scan entry '${entry.reportedId}' with a TRD-XX axis id.`,
      ),
    );
  }
  return issues;
}

function evaluateT02(entries: TrendEntry[], axes: TrdAxis[]): Issue[] {
  const validTrdIds = new Set(axes.map((axis) => axis.id.toUpperCase()));
  const issues: Issue[] = [];
  const seenDangling = new Set<string>();
  for (const entry of entries) {
    const raw = entry.evaluationConnection;
    if (raw === undefined || raw.length === 0) continue; // T01 handles missing
    const normalized = raw.trim().toUpperCase();
    if (!/^TRD-\d+$/.test(normalized)) continue; // non-TRD tokens fall outside T02 scope
    if (validTrdIds.has(normalized)) continue;
    const dedupeKey = `${entry.reportedId}::${normalized}`;
    if (seenDangling.has(dedupeKey)) continue;
    seenDangling.add(dedupeKey);
    issues.push(
      issueOf(
        "UIX-VAL-T02",
        `Trend Scan entry '${entry.reportedId}' references unknown axis '${normalized}' via evaluation_connection (no such axis in 21_design_eval_trend_derived.md).`,
        "error",
        SOURCES_FILE,
        `Add axis '${normalized}' to 21_design_eval_trend_derived.md or update evaluation_connection in entry '${entry.reportedId}'.`,
      ),
    );
  }
  return issues;
}

function evaluateT03(entries: TrendEntry[], axes: TrdAxis[]): Issue[] {
  const sourceIds = new Set<string>();
  for (const entry of entries) {
    if (entry.sourceId) sourceIds.add(entry.sourceId);
  }
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const axis of axes) {
    for (const ref of axis.sourceRefs) {
      if (NONE_PLACEHOLDER_RE.test(ref)) continue;
      if (!/^SRC[-_]/i.test(ref)) continue; // only enforce on explicit SRC-* tokens
      if (sourceIds.has(ref)) continue;
      const key = `${axis.id}::${ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push(
        issueOf(
          "UIX-VAL-T03",
          `Axis '${axis.id}' source_refs entry '${ref}' does not match any Trend Scan entry id in 04_Sources.md.`,
          "warning",
          TREND_AXES_FILE,
          `Add Trend Scan entry with 'source_id: ${ref}' to 04_Sources.md or update axis '${axis.id}' source_refs.`,
        ),
      );
    }
  }
  return issues;
}

function evaluateT04(entries: TrendEntry[], axes: TrdAxis[]): Issue[] {
  const visualEntries = entries.filter((entry) => VISUAL_CATEGORY_RE.test(entry.category));
  if (visualEntries.length === 0) return [];
  const hasVisualAxis = axes.some((axis) => VISUAL_AXIS_RE.test(axis.body));
  if (hasVisualAxis) return [];

  const offendingIds = visualEntries.map((entry) => entry.reportedId).sort();
  return [
    issueOf(
      "UIX-VAL-T04",
      `Visual Trend Scan entr${visualEntries.length === 1 ? "y" : "ies"} (${offendingIds.join(", ")}) present but no visual axis in 21_design_eval_trend_derived.md.`,
      "warning",
      SOURCES_FILE,
      `Add at least one visual axis (axis_name/origin/intent containing 'visual') to 21_design_eval_trend_derived.md, or reclassify the visual Trend Scan entries.`,
    ),
  ];
}

// ---------------------------------------------------------------------------
// Stable ordering
// ---------------------------------------------------------------------------

const RULE_ORDER: Record<string, number> = {
  "UIX-VAL-T01": 1,
  "UIX-VAL-T02": 2,
  "UIX-VAL-T03": 3,
  "UIX-VAL-T04": 4,
};

function extractOffendingId(issue: Issue): string {
  const match = /'([^']+)'/.exec(issue.message);
  return match?.[1] ?? "";
}

function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((left, right) => {
    const leftRank = RULE_ORDER[left.code] ?? 999;
    const rightRank = RULE_ORDER[right.code] ?? 999;
    if (leftRank !== rightRank) return leftRank - rightRank;
    const leftId = extractOffendingId(left);
    const rightId = extractOffendingId(right);
    if (leftId !== rightId) return leftId.localeCompare(rightId);
    return left.message.localeCompare(right.message);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type TrendAxisTraceabilityBreakdown = {
  t01: Issue[];
  t02: Issue[];
  t03: Issue[];
  t04: Issue[];
};

/**
 * Compute the four rule breakdowns for a given pack root.
 *
 * Returns empty breakdowns when the pack is non-UI-bearing or when the
 * Trend Scan section is missing (the latter is covered by validateTrendScan
 * and must not be double-reported here).
 */
export async function computeTrendAxisTraceability(
  root: string,
): Promise<TrendAxisTraceabilityBreakdown> {
  const empty: TrendAxisTraceabilityBreakdown = { t01: [], t02: [], t03: [], t04: [] };
  if (!(await isUiBearingSpec(root))) {
    return empty;
  }

  const sourcesContent = await readSafe(path.join(root, SOURCES_FILE));
  if (!sourcesContent) {
    return empty;
  }
  const trendSection = extractTrendScanSection(sourcesContent);
  if (!trendSection) {
    return empty;
  }
  const entries = collectTrendEntries(sourcesContent);
  if (entries.length === 0) {
    return empty;
  }

  const axesContent = await readSafe(path.join(root, TREND_AXES_FILE));
  const axes = collectTrdAxes(axesContent);

  return {
    t01: evaluateT01(entries),
    t02: evaluateT02(entries, axes),
    t03: evaluateT03(entries, axes),
    t04: evaluateT04(entries, axes),
  };
}

/**
 * Run the four trend-axis traceability rules and return a stably-ordered
 * merged issue list.
 */
export async function validateTrendAxisTraceability(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  const breakdown = await computeTrendAxisTraceability(root);
  const merged = [...breakdown.t01, ...breakdown.t02, ...breakdown.t03, ...breakdown.t04];
  return sortIssues(merged);
}

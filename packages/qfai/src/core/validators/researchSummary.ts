import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const RESEARCH_SUMMARY_HEADING_RE = /^#{1,3}\s+Research\s+Summary/im;
const SOURCE_ENTRY_RE = /^\s*-\s*id:\s*(\S+)/gm;
const REFLECTION_APPLY_RE = /action:\s*apply/i;
const FULL_DATE_RE = /^\s+published:\s*["']?(\d{4}-\d{2}-\d{2})["']?/m;
const TITLE_VALUE_RE = /^\s+title:\s*(.*)$/m;
const URL_VALUE_RE = /^\s+url:\s*(.*)$/m;
const REASON_VALUE_RE = /^\s*-?\s*reason:\s*(.*)$/gm;
/**
 * Scaffolded values that record nothing: bracketed / angled template slots
 * (`[Source title]`, `<link>`) and the usual "not filled in yet" words. A
 * required field carrying one of these is unfilled, not answered.
 */
const PLACEHOLDER_VALUE_RE = /^(?:\[[^\]]*\]|<[^>]*>|tbd|todo|n\/a|none|placeholder)\.?$/i;

export async function validateResearchSummary(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  // `paths.discussionDir` may be absolute (packs relocated outside <root>);
  // resolve it the same way findLatestDiscussionPackDir's caller does, or the
  // glob would look under <root>/<abs path> and find nothing.
  const discussionRoot = resolvePath(root, config, "discussionDir");
  const pattern = path.posix.join(normalize(discussionRoot), "**/*.md");
  const files = await fg(pattern, { absolute: true });
  const filesWithHeading = new Set<string>();

  for (const filePath of files) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    // One extraction decides both presence and content, so the two can never
    // disagree. It yields nothing when the only heading sits inside a fenced
    // code block (an example, not the pack's own section) and nothing when the
    // heading has an empty body (no protocol recorded). Either way the file
    // stays unregistered, so the pack reports QFAI-RESEARCH-012 rather than the
    // heading buying silence from every rule below.
    const section = extractResearchSummarySection(content);
    if (!section) continue;

    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    filesWithHeading.add(normalize(filePath));

    // Validate only entries under sources:, not other lists that may also use "- id:".
    const sourceEntries = extractSourceEntries(section);
    const sourceIds = sourceEntries.map((entry) => entry.id);
    if (sourceEntries.length === 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-001",
          "Research Summary has no source entries (sources[].id required)",
          "error",
          rel,
          "researchSummary.noSources",
        ),
      );
    }

    for (let i = 0; i < sourceEntries.length; i++) {
      const block = sourceEntries[i]?.block ?? "";

      if (!isFilledValue(TITLE_VALUE_RE.exec(block)?.[1])) {
        issues.push(
          issue(
            "QFAI-RESEARCH-004",
            `Source entry missing or unfilled required field "title": ${sourceIds[i] ?? "(unknown)"}`,
            "error",
            rel,
            "researchSummary.sourceTitle",
          ),
        );
      }
      if (!isFilledValue(URL_VALUE_RE.exec(block)?.[1])) {
        issues.push(
          issue(
            "QFAI-RESEARCH-005",
            `Source entry missing or unfilled required field "url": ${sourceIds[i] ?? "(unknown)"}`,
            "error",
            rel,
            "researchSummary.sourceUrl",
          ),
        );
      }
      if (!FULL_DATE_RE.test(block)) {
        issues.push(
          issue(
            "QFAI-RESEARCH-006",
            `Source entry missing or invalid "published" date (YYYY-MM-DD): ${sourceIds[i] ?? "(unknown)"}`,
            "error",
            rel,
            "researchSummary.sourcePublished",
          ),
        );
      }
    }

    // Check freshness (≥80% within 2 years)
    const referenceNow = resolveFreshnessReferenceNow();
    const twoYearsMs = 1000 * 60 * 60 * 24 * 365 * 2;
    const publishedDates = sourceEntries
      .map((entry) => FULL_DATE_RE.exec(entry.block)?.[1] ?? "")
      .map((dateText) => Date.parse(dateText))
      .filter((ts) => Number.isFinite(ts));

    if (publishedDates.length > 0) {
      const recentCount = publishedDates.filter((ts) => referenceNow - ts <= twoYearsMs).length;
      const freshnessRatio = recentCount / publishedDates.length;
      if (freshnessRatio < 0.8) {
        issues.push(
          issue(
            "QFAI-RESEARCH-002",
            `Research freshness below threshold (${(freshnessRatio * 100).toFixed(0)}% within 2 years, ≥80% required)`,
            "warning",
            rel,
            "researchSummary.freshness",
          ),
        );
      }
    }

    const bestPracticesCount = countYamlListItems(section, "best_practices");
    if (bestPracticesCount === 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-007",
          'Research Summary requires non-empty "best_practices" list',
          "error",
          rel,
          "researchSummary.bestPractices",
        ),
      );
    }

    const antiPatternsCount = countYamlListItems(section, "anti_patterns");
    if (antiPatternsCount === 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-008",
          'Research Summary requires non-empty "anti_patterns" list',
          "error",
          rel,
          "researchSummary.antiPatterns",
        ),
      );
    }

    // Check reflection.apply presence
    const hasApply = REFLECTION_APPLY_RE.test(section);
    const reflectionCount = countYamlListItems(section, "reflection");
    if (reflectionCount === 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-011",
          'Research Summary requires non-empty "reflection" list',
          "error",
          rel,
          "researchSummary.reflectionRequired",
        ),
      );
    } else if (!hasApply) {
      issues.push(
        issue(
          "QFAI-RESEARCH-003",
          "Research Summary has reflection entries but no action: apply. At least one apply entry expected.",
          "error",
          rel,
          "researchSummary.noApply",
        ),
      );
    }

    if (reflectionCount > 0 && !/\baction:\s*(apply|reject|defer)\b/i.test(section)) {
      issues.push(
        issue(
          "QFAI-RESEARCH-009",
          'Each reflection entry should include "action" with apply|reject|defer',
          "error",
          rel,
          "researchSummary.reflectionAction",
        ),
      );
    }
    const hasFilledReason = [...section.matchAll(REASON_VALUE_RE)].some((match) =>
      isFilledValue(match[1]),
    );
    if (reflectionCount > 0 && !hasFilledReason) {
      issues.push(
        issue(
          "QFAI-RESEARCH-010",
          'Each reflection entry should include non-empty "reason" (template placeholders do not count)',
          "error",
          rel,
          "researchSummary.reflectionReason",
        ),
      );
    }
  }

  // `uiux.requireResearchSummary: false` is a project stating the section is
  // not required here, so reporting its absence contradicts the setting — and
  // under `--fail-on warning` or `--strict` it fails the run over a rule the
  // project opted out of. Only the absence rule is governed by it: every rule
  // above judges a section the project chose to write, and declining the
  // requirement is not a licence to record the protocol wrongly.
  if (config.uiux?.requireResearchSummary !== false) {
    const missing = await buildMissingSectionIssue(root, discussionRoot, files, filesWithHeading);
    if (missing) {
      issues.push(missing);
    }
  }

  return issues;
}

function normalize(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/**
 * Quoting a scalar is ordinary YAML, so `title: "[Source title]"` is the same
 * unfilled slot as the bare form. Strip one balanced pair of surrounding
 * quotes; anything else is returned untouched.
 */
function unquoteYamlScalar(value: string): string {
  return /^(["'])[\s\S]*\1$/.test(value) ? value.slice(1, -1) : value;
}

/** A required value counts as answered only when it is neither blank nor a template slot. */
function isFilledValue(value: string | undefined): boolean {
  const trimmed = unquoteYamlScalar((value ?? "").trim()).trim();
  return trimmed.length > 0 && !PLACEHOLDER_VALUE_RE.test(trimmed);
}

/**
 * Every rule above is skipped when a file carries no heading, so omitting the
 * section entirely used to score zero findings while half-writing it scored
 * several errors. Make the omission visible with a single warning on the pack
 * directory when the latest pack has markdown but none of it carries the section.
 */
async function buildMissingSectionIssue(
  root: string,
  discussionRoot: string,
  files: readonly string[],
  filesWithHeading: ReadonlySet<string>,
): Promise<Issue | null> {
  const latestPackDir = await findLatestDiscussionPackDir(discussionRoot);
  if (!latestPackDir) {
    return null;
  }

  const packPrefix = `${normalize(latestPackDir)}/`;
  const packFiles = files.filter((filePath) => normalize(filePath).startsWith(packPrefix));
  if (packFiles.length === 0) {
    return null;
  }
  if (packFiles.some((filePath) => filesWithHeading.has(normalize(filePath)))) {
    return null;
  }

  const rel = path.relative(root, latestPackDir).replace(/\\/g, "/");
  return issue(
    "QFAI-RESEARCH-012",
    'Discussion pack has no "Research Summary" section, so the research-first protocol is never checked',
    "warning",
    rel,
    "researchSummary.sectionMissing",
    undefined,
    "canonical",
    [
      'Add a "## Research Summary" section to a file in the pack (04_Sources.md by default).',
      "Follow the Output Schema in .qfai/assistant/constitution/research-first-protocol.md.",
    ].join("\n"),
  );
}

/**
 * A fenced code block is quoted text, not document structure: a pack that shows
 * the schema in a ```markdown example must not read as owning the section.
 * Blank every fenced line — including the fences — while preserving each
 * character offset, so indices taken from the mask still address the original.
 */
function maskFencedCodeBlocks(content: string): string {
  const lines = content.split("\n");
  let openFence: { marker: string; length: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const fence = parseFenceLine(line);
    const open = openFence;

    if (!open) {
      if (fence) {
        openFence = { marker: fence.marker, length: fence.length };
        lines[i] = " ".repeat(line.length);
      }
      continue;
    }

    // A closing fence is the same marker, at least as long as the opener, and
    // carries no info string.
    if (
      fence &&
      fence.marker === open.marker &&
      fence.length >= open.length &&
      !fence.info.trim()
    ) {
      openFence = null;
    }
    lines[i] = " ".repeat(line.length);
  }

  return lines.join("\n");
}

function parseFenceLine(line: string): { marker: string; length: number; info: string } | null {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  const run = match?.[1];
  if (!run) {
    return null;
  }
  return { marker: run.startsWith("`") ? "`" : "~", length: run.length, info: match[2] ?? "" };
}

function extractResearchSummarySection(content: string): string | null {
  // Locate the heading — and the heading that ends the section — on the masked
  // copy, so fenced examples neither impersonate the section nor truncate it.
  // The body itself comes from the original: the shipped template writes its
  // schema inside a ```yaml fence, and that fence is the section's content.
  const masked = maskFencedCodeBlocks(content);
  const heading = RESEARCH_SUMMARY_HEADING_RE.exec(masked);
  if (!heading) {
    return null;
  }

  const start = heading.index + heading[0].length;
  const nextHeadingOffset = masked.slice(start).search(/^#{1,3}\s+/m);
  const end = nextHeadingOffset === -1 ? content.length : start + nextHeadingOffset;
  return content.slice(start, end).trim();
}

function extractSourceEntries(section: string): Array<{ id: string; block: string }> {
  const sourcesBlock = extractYamlListBlock(section, "sources");
  if (!sourcesBlock) {
    return [];
  }

  const sourceMatches = [...sourcesBlock.matchAll(SOURCE_ENTRY_RE)];
  return sourceMatches.map((match, index) => {
    const start = match.index;
    const end = sourceMatches[index + 1]?.index ?? sourcesBlock.length;
    return {
      id: match[1] || "",
      block: sourcesBlock.slice(start, end),
    };
  });
}

function extractYamlListBlock(section: string, key: string): string | null {
  const lines = section.split(/\r?\n/);
  const keyLineRe = new RegExp(`^(\\s*)${key}\\s*:\\s*$`);
  const keyLineIndex = lines.findIndex((line) => keyLineRe.test(line));
  if (keyLineIndex < 0) {
    return null;
  }

  const keyLineMatch = keyLineRe.exec(lines[keyLineIndex] ?? "");
  if (!keyLineMatch) {
    return null;
  }
  const keyIndent = (keyLineMatch[1] ?? "").length;

  const blockLines: string[] = [];

  for (let i = keyLineIndex + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    const currentIndent = line.length - line.trimStart().length;

    if (!trimmed) {
      blockLines.push(line);
      continue;
    }

    const isYamlKey = /^\s*[A-Za-z0-9_-]+\s*:\s*/.test(line);
    if (isYamlKey && currentIndent <= keyIndent) {
      break;
    }

    blockLines.push(line);
  }

  return blockLines.length > 0 ? blockLines.join("\n") : null;
}

function countYamlListItems(section: string, key: string): number {
  const listBlock = extractYamlListBlock(section, key);
  if (!listBlock) {
    return 0;
  }

  const lines = listBlock.split(/\r?\n/);
  const firstNonEmpty = lines.find((line) => line.trim().length > 0);
  if (!firstNonEmpty) {
    return 0;
  }
  const baseIndent = firstNonEmpty.length - firstNonEmpty.trimStart().length;

  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const currentIndent = line.length - line.trimStart().length;
    if (/^\s*-\s+\S/.test(line) && currentIndent >= baseIndent) {
      count += 1;
    }
  }
  return count;
}

function resolveFreshnessReferenceNow(): number {
  const fromEnv =
    process.env.QFAI_RESEARCH_REFERENCE_DATE ?? process.env.QFAI_VALIDATE_REFERENCE_DATE;
  if (!fromEnv) {
    return Date.now();
  }

  const parsed = Date.parse(fromEnv);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

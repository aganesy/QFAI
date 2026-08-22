import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const RESEARCH_SUMMARY_HEADING_RE = /^#{1,3}\s+Research\s+Summary/im;
const SOURCE_ENTRY_RE = /^\s*-\s*id:\s*(\S+)/gm;
const REFLECTION_APPLY_RE = /action:\s*apply/i;
const FULL_DATE_RE = /^\s+published:\s*["']?(\d{4}-\d{2}-\d{2})["']?/m;
/** ```yaml fence inside the stored section — the prose around it is not data. */
const YAML_FENCE_RE = /^```[^\n]*\n([\s\S]*?)^```/gm;
/** `key: [fill me in]` — a shipped template placeholder that was never replaced. */
const PLACEHOLDER_FIELD_RE = /^[ \t]*(?:-[ \t]*)?([A-Za-z0-9_]+):[ \t]*\[[^\]]*\][ \t]*$/gm;
/** `source_id:` reference carried by best_practices / anti_patterns / reflection entries. */
const SOURCE_ID_REF_RE = /^[ \t]*(?:-[ \t]*)?source_id:[ \t]*(\S+)[ \t]*$/gm;

export async function validateResearchSummary(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const files = await collectResearchSummaryFiles(root, config);

  for (const filePath of files) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    if (!RESEARCH_SUMMARY_HEADING_RE.test(content)) continue;

    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    const section = extractResearchSummarySection(content);
    if (!section) continue;

    // Only the fenced YAML payload is data. The prose that the shipped template
    // wraps around it explains the rules ("at least one entry must carry
    // action: apply") and must never be able to satisfy them.
    const yaml = extractYamlPayload(section);

    // Validate only entries under sources:, not other lists that may also use "- id:".
    const sourceEntries = extractSourceEntries(yaml);
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

      if (!/^\s+title:\s*.+/m.test(block)) {
        issues.push(
          issue(
            "QFAI-RESEARCH-004",
            `Source entry missing required field "title": ${sourceIds[i] ?? "(unknown)"}`,
            "error",
            rel,
            "researchSummary.sourceTitle",
          ),
        );
      }
      if (!/^\s+url:\s*.+/m.test(block)) {
        issues.push(
          issue(
            "QFAI-RESEARCH-005",
            `Source entry missing required field "url": ${sourceIds[i] ?? "(unknown)"}`,
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

    const placeholderKeys = collectPlaceholderKeys(yaml);
    if (placeholderKeys.length > 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-012",
          `Research Summary still carries unreplaced template placeholders (${placeholderKeys.join(", ")}); record the actual protocol run`,
          "error",
          rel,
          "researchSummary.placeholder",
        ),
      );
    }

    for (const unresolved of collectUnresolvedSourceIds(yaml, sourceIds)) {
      issues.push(
        issue(
          "QFAI-RESEARCH-013",
          `"source_id" does not resolve to any sources[].id in the same Research Summary: ${unresolved}`,
          "error",
          rel,
          "researchSummary.sourceIdReference",
        ),
      );
    }

    const bestPracticesCount = countYamlListItems(yaml, "best_practices");
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

    const antiPatternsCount = countYamlListItems(yaml, "anti_patterns");
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

    // Check reflection.apply presence — inside the reflection list only.
    const reflectionBlock = extractYamlListBlock(yaml, "reflection") ?? "";
    const hasApply = REFLECTION_APPLY_RE.test(reflectionBlock);
    const reflectionCount = countYamlListItems(yaml, "reflection");
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

    if (reflectionCount > 0 && !/\baction:\s*(apply|reject|defer)\b/i.test(reflectionBlock)) {
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
    if (reflectionCount > 0 && !/\breason:\s*.+/i.test(reflectionBlock)) {
      issues.push(
        issue(
          "QFAI-RESEARCH-010",
          'Each reflection entry should include non-empty "reason"',
          "error",
          rel,
          "researchSummary.reflectionReason",
        ),
      );
    }
  }

  return issues;
}

/**
 * Files the Research Summary gate reads. Every generated pack now ships the
 * storage slot, so scanning the whole discussion tree would let an abandoned
 * pack keep the gate red forever; like the sibling discussion validators this
 * one looks at the latest pack, falling back to the flat discussion root for
 * layouts that keep no `discussion-<timestamp>` directory at all.
 */
async function collectResearchSummaryFiles(root: string, config: QfaiConfig): Promise<string[]> {
  const discussionRoot = path.resolve(root, config.paths.discussionDir);
  let scanRoot = discussionRoot;
  try {
    scanRoot = (await findLatestDiscussionPackDir(discussionRoot)) ?? discussionRoot;
  } catch {
    scanRoot = discussionRoot;
  }

  const pattern = path.posix.join(scanRoot.replace(/\\/g, "/"), "**/*.md");
  try {
    return await fg(pattern, { absolute: true });
  } catch {
    return [];
  }
}

/**
 * The fenced YAML blocks of the stored section, or the whole section when it
 * carries none (packs written before the template shipped a fence).
 */
function extractYamlPayload(section: string): string {
  const blocks = [...section.matchAll(YAML_FENCE_RE)].map((match) => match[1] ?? "");
  return blocks.length > 0 ? blocks.join("\n") : section;
}

/** Keys whose value is still a `[bracketed]` template placeholder. */
function collectPlaceholderKeys(yaml: string): string[] {
  const keys = new Set<string>();
  for (const match of yaml.matchAll(PLACEHOLDER_FIELD_RE)) {
    const key = match[1];
    if (key) keys.add(key);
  }
  return [...keys];
}

/** `source_id` values that no `sources[].id` in the same summary resolves. */
function collectUnresolvedSourceIds(yaml: string, sourceIds: readonly string[]): string[] {
  if (sourceIds.length === 0) {
    return [];
  }

  const known = new Set(sourceIds);
  const unresolved = new Set<string>();
  for (const match of yaml.matchAll(SOURCE_ID_REF_RE)) {
    const value = match[1];
    // A placeholder value is already reported as QFAI-RESEARCH-012.
    if (!value || value.startsWith("[") || known.has(value)) {
      continue;
    }
    unresolved.add(value);
  }
  return [...unresolved];
}

function extractResearchSummarySection(content: string): string | null {
  const heading = RESEARCH_SUMMARY_HEADING_RE.exec(content);
  if (!heading) {
    return null;
  }

  const start = heading.index + heading[0].length;
  const remainder = content.slice(start);
  const nextHeadingOffset = remainder.search(/^#{1,3}\s+/m);
  const section = nextHeadingOffset === -1 ? remainder : remainder.slice(0, nextHeadingOffset);
  return section.trim();
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

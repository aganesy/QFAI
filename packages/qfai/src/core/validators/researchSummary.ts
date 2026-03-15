import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const RESEARCH_SUMMARY_HEADING_RE = /^#{1,3}\s+Research\s+Summary/im;
const SOURCE_ENTRY_RE = /^\s*-\s*id:\s*(\S+)/gm;
const PUBLISHED_RE = /published:\s*["']?(\d{4})/g;
const REFLECTION_APPLY_RE = /action:\s*apply/gi;
const REFLECTION_RE = /action:\s*(apply|reject|defer)/gi;

export async function validateResearchSummary(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const pattern = path.posix.join(
    root.replace(/\\/g, "/"),
    config.paths.discussionDir,
    "**/*.md",
  );
  const files = await fg(pattern, { absolute: true });

  for (const filePath of files) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    if (!RESEARCH_SUMMARY_HEADING_RE.test(content)) continue;

    const rel = path.relative(root, filePath).replace(/\\/g, "/");

    // Extract Research Summary section
    const sectionStart = content.search(RESEARCH_SUMMARY_HEADING_RE);
    if (sectionStart === -1) continue;

    const nextHeading = content.slice(sectionStart + 1).search(/^#{1,3}\s+/m);
    const section =
      nextHeading === -1
        ? content.slice(sectionStart)
        : content.slice(sectionStart, sectionStart + 1 + nextHeading);

    // Check source citation completeness
    const sourceIds = [...section.matchAll(SOURCE_ENTRY_RE)].map((m) => m[1]);
    if (sourceIds.length === 0) {
      issues.push(
        issue(
          "QFAI-RESEARCH-001",
          "Research Summary has no source entries (sources[].id required)",
          "warning",
          rel,
          "researchSummary.noSources",
        ),
      );
    }

    // Check freshness (≥80% within 2 years)
    const currentYear = new Date().getFullYear();
    const publishedYears = [...section.matchAll(PUBLISHED_RE)]
      .map((m) => parseInt(m[1]!, 10))
      .filter((y) => !isNaN(y));

    if (publishedYears.length > 0) {
      const recentCount = publishedYears.filter((y) => currentYear - y <= 2).length;
      const freshnessRatio = recentCount / publishedYears.length;
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

    // Check reflection.apply presence
    const reflectionEntries = [...section.matchAll(REFLECTION_RE)];
    const hasApply = REFLECTION_APPLY_RE.test(section);
    if (reflectionEntries.length > 0 && !hasApply) {
      issues.push(
        issue(
          "QFAI-RESEARCH-003",
          "Research Summary has reflection entries but no action: apply. At least one apply entry expected.",
          "warning",
          rel,
          "researchSummary.noApply",
        ),
      );
    }
  }

  return issues;
}

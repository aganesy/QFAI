import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * HTML tag patterns that indicate UI-bearing content.
 * DR-0042: Detection by artifact presence, not keyword.
 */
const HTML_TAG_RE = /<(?:style|div|section|span|button|input|form|header|footer|nav|main|aside)\b/i;

/**
 * Mermaid screen flow patterns — stateDiagram/flowchart/graph with screen-like node names.
 * DR-0042: Artifact/section presence based.
 */
const MERMAID_SCREEN_FLOW_RE =
  /```mermaid[\s\S]*?(?:stateDiagram|flowchart|graph)[\s\S]*?(?:Screen|Page|View|Dashboard|Login|Settings|Home)\b/i;

const DDS_HEADING = "## Design Direction Summary";

const DDS_SUBSECTIONS = [
  "Option Comparison",
  "Anchor Screen Selection",
  "Competitive References",
  "CTA Hierarchy",
  "State Coverage",
  "Design Anti-goals",
] as const;

const REQUIRED_STATES = ["empty", "loading", "error", "populated"] as const;

const COMPETITIVE_REF_FIELDS = ["adopted_points", "rejected_points", "local_translation"] as const;

const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|na|xxx|\?\?\?|placeholder)$/i;

// ---------------------------------------------------------------------------
// isUiBearing
// ---------------------------------------------------------------------------

/**
 * Explicit surface classification pattern in 03_Story-Workshop.md metadata table.
 * Matches "| Surface Type | non-ui |" style rows.
 */
const SURFACE_TYPE_RE = /\|\s*Surface Type\s*\|\s*(\S+)\s*\|/i;

/**
 * Determine if a discussion pack is UI-bearing.
 *
 * Two-tier detection (aligned with spec-0027 / DR-0081):
 * 1. Primary: explicit Surface Type in 03_Story-Workshop.md metadata table
 * 2. Fallback: HTML tags or Mermaid screen flow diagrams in content
 *
 * DR-0042: Uses artifact/section presence, never keyword alone.
 * Returns false on missing file (safe-side fallback).
 */
export async function isUiBearing(packRoot: string): Promise<boolean> {
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  if (!content) return false;

  // Tier 1: explicit surface classification
  const surfaceMatch = SURFACE_TYPE_RE.exec(content);
  if (surfaceMatch?.[1]) {
    const surface = surfaceMatch[1].toLowerCase();
    if (surface === "non-ui") return false;
    if (["web-ui", "mobile-ui", "desktop-ui", "mixed"].includes(surface)) return true;
  }

  // Tier 2: content signal fallback
  if (HTML_TAG_RE.test(content)) return true;
  if (MERMAID_SCREEN_FLOW_RE.test(content)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// DDS section parsing helpers
// ---------------------------------------------------------------------------

function extractDdsSection(content: string): string | null {
  const idx = content.indexOf(DDS_HEADING);
  if (idx === -1) return null;
  const start = idx + DDS_HEADING.length;
  const remainder = content.slice(start);
  // DDS ends at next ## heading (same level) or EOF
  const nextH2 = remainder.search(/\n## (?!#)/);
  return nextH2 === -1 ? remainder : remainder.slice(0, nextH2);
}

function extractSubsection(dds: string, name: string): string | null {
  const heading = `### ${name}`;
  const idx = dds.indexOf(heading);
  if (idx === -1) return null;
  const start = idx + heading.length;
  const remainder = dds.slice(start);
  const nextH3 = remainder.search(/\n### /);
  const section = nextH3 === -1 ? remainder : remainder.slice(0, nextH3);
  return section.trim();
}

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === "" || PLACEHOLDER_RE.test(trimmed);
}

/**
 * Extract option names from the Option Comparison section.
 * Matches lines like "- **Option A**: ..." and returns ["Option A", "Option B", ...].
 */
function extractOptionNames(optionSection: string): string[] {
  return optionSection
    .split("\n")
    .filter((l) => /^\s*-\s+\*\*Option\b/i.test(l))
    .map((l) => {
      const m = /\*\*(.+?)\*\*/.exec(l);
      return m ? (m[1] ?? "").trim() : "";
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// QFAI-DDP-019: DDS Presence
// ---------------------------------------------------------------------------

/**
 * Validate that a UI-bearing pack contains the Design Direction Summary section
 * in 03_Story-Workshop.md with all 6 required subsections.
 */
export async function validateDdsPresence(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  const relPath = "03_Story-Workshop.md";

  if (!content || !content.includes(DDS_HEADING)) {
    issues.push(
      issue(
        "QFAI-DDP-019",
        `Design Direction Summary: section not found in 03_Story-Workshop.md. Add a '${DDS_HEADING}' section with all 6 subsections`,
        "error",
        relPath,
        "ddh.ddsPresence",
      ),
    );
    return issues;
  }

  // Fix #1: use === null so heading-only DDS (empty body) still checks subsections
  const dds = extractDdsSection(content);
  if (dds === null) return issues;

  for (const sub of DDS_SUBSECTIONS) {
    if (!dds.includes(`### ${sub}`)) {
      issues.push(
        issue(
          "QFAI-DDP-019",
          `${sub}: subsection missing in Design Direction Summary. Add a '### ${sub}' subsection`,
          "error",
          relPath,
          `ddh.ddsPresence.${sub.replace(/\s+/g, "")}`,
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// QFAI-DDP-020: Option Comparison
// ---------------------------------------------------------------------------

/**
 * Validate that the DDS contains at least 2 distinct design options.
 */
export async function validateOptionComparison(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  if (!content) return issues;

  const dds = extractDdsSection(content);
  if (dds === null) return issues;

  const optionSection = extractSubsection(dds, "Option Comparison");
  // Fix #2: null = heading absent (skip), empty string = heading present but empty (fail)
  if (optionSection === null) return issues;

  // Count distinct option entries using extracted names
  const optionNames = extractOptionNames(optionSection);
  const uniqueOptions = new Set(optionNames);
  if (uniqueOptions.size < 2) {
    issues.push(
      issue(
        "QFAI-DDP-020",
        `Option Comparison: found ${uniqueOptions.size} distinct option(s), minimum 2 required. Add at least 2 distinct design options`,
        "error",
        "03_Story-Workshop.md",
        "ddh.optionComparison",
      ),
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// QFAI-DDP-021: Anchor Screen Selection
// ---------------------------------------------------------------------------

/**
 * Validate that the DDS contains an anchor screen selection referencing
 * one of the compared design options.
 * BR-0023-0007: Placeholder values treated as missing.
 */
export async function validateAnchorScreen(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  if (!content) return issues;

  const dds = extractDdsSection(content);
  if (dds === null) return issues;

  const anchorSection = extractSubsection(dds, "Anchor Screen Selection");
  // Fix #2 + #3: treat null, empty, and placeholder as missing
  // Also detect template-shaped placeholders like "Selected: TBD"
  const anchorValue = anchorSection?.replace(/^Selected\s*:\s*/i, "").trim() ?? "";
  if (anchorSection === null || isPlaceholder(anchorSection) || isPlaceholder(anchorValue)) {
    issues.push(
      issue(
        "QFAI-DDP-021",
        "Anchor Screen Selection: no selection found. Add 'Selected: [Option X] — [reason]' to specify the anchor screen",
        "error",
        "03_Story-Workshop.md",
        "ddh.anchorScreen",
      ),
    );
    return issues;
  }

  // Verify anchor references a compared option
  const optionSection = extractSubsection(dds, "Option Comparison");
  if (optionSection) {
    const optionNames = extractOptionNames(optionSection);
    if (optionNames.length > 0) {
      const anchorLower = anchorSection.toLowerCase();
      const referencesOption = optionNames.some((name) => anchorLower.includes(name.toLowerCase()));
      if (!referencesOption) {
        issues.push(
          issue(
            "QFAI-DDP-021",
            `Anchor Screen Selection: does not reference any compared option (${optionNames.join(", ")}). Update to reference a specific option from Option Comparison`,
            "error",
            "03_Story-Workshop.md",
            "ddh.anchorScreen.noOptionRef",
          ),
        );
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// QFAI-DDP-022: Competitive References
// ---------------------------------------------------------------------------

/**
 * Validate that each competitive reference entry in 04_Sources.md contains
 * adopted_points, rejected_points, and local_translation with substantive content.
 * BR-0023-0007: Placeholder values treated as missing.
 *
 * Fix #4: Blocks within the Competitive Reference Registry section that have
 * a ### heading but zero mandatory fields are also flagged as errors.
 */
export async function validateCompetitiveRefs(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const sourcesPath = path.join(packRoot, "04_Sources.md");
  const content = await readSafe(sourcesPath);
  if (!content) return issues;

  // Scope to the Competitive Reference Registry section (regex for heading variants)
  const registryHeadingRe = /^##\s+Competitive Reference Registry\b.*$/m;
  const registryMatch = registryHeadingRe.exec(content);
  if (!registryMatch) return issues;

  const afterHeading = content.slice(registryMatch.index + registryMatch[0].length);
  const nextH2 = afterHeading.search(/\n## (?!#)/);
  const registrySection = nextH2 === -1 ? afterHeading : afterHeading.slice(0, nextH2);

  // Split into reference blocks by ### headings
  const blocks = registrySection.split(/(?=^### )/m).filter((b) => b.trim());

  for (const block of blocks) {
    if (!/^### /m.test(block)) continue;

    for (const field of COMPETITIVE_REF_FIELDS) {
      const fieldRe = new RegExp(`^\\s*-\\s+${field}\\s*:[ \\t]*(.*)$`, "m");
      const match = fieldRe.exec(block);

      if (!match) {
        issues.push(
          issue(
            "QFAI-DDP-022",
            `Competitive Reference: '${field}' is missing. Add ${field} describing ${fieldGuidance(field)}`,
            "error",
            "04_Sources.md",
            `ddh.competitiveRefs.${field}`,
          ),
        );
      } else {
        const value = (match[1] ?? "").trim();
        if (isPlaceholder(value)) {
          issues.push(
            issue(
              "QFAI-DDP-022",
              `Competitive Reference: '${field}' contains a placeholder value ('${value}'). Replace with substantive content describing ${fieldGuidance(field)}`,
              "error",
              "04_Sources.md",
              `ddh.competitiveRefs.${field}.placeholder`,
            ),
          );
        }
      }
    }
  }

  return issues;
}

function fieldGuidance(field: string): string {
  switch (field) {
    case "adopted_points":
      return "what was adopted from this reference and why";
    case "rejected_points":
      return "what was not adopted and why";
    case "local_translation":
      return "how the adopted points were adapted for this project";
    default:
      return "the relevant details";
  }
}

// ---------------------------------------------------------------------------
// QFAI-DDP-023: CTA Hierarchy
// ---------------------------------------------------------------------------

/**
 * Validate that the DDS defines a CTA hierarchy that includes a primary CTA.
 * BR-0023-0007: Placeholder values treated as missing.
 */
export async function validateCtaHierarchy(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  if (!content) return issues;

  const dds = extractDdsSection(content);
  if (dds === null) return issues;

  const ctaSection = extractSubsection(dds, "CTA Hierarchy");
  if (ctaSection === null) return issues;

  // Empty or whole-section placeholder = no primary CTA
  if (isPlaceholder(ctaSection) || !/primary\b/i.test(ctaSection)) {
    issues.push(
      issue(
        "QFAI-DDP-023",
        "CTA Hierarchy: no primary CTA defined. Add a '- Primary: [CTA label and placement]' entry",
        "error",
        "03_Story-Workshop.md",
        "ddh.ctaHierarchy.primaryMissing",
      ),
    );
    return issues;
  }

  // Detect "- Primary: TBD" where primary line exists but value is placeholder
  const primaryLine = ctaSection.split("\n").find((l) => /^\s*-\s+primary\b/i.test(l));
  if (primaryLine) {
    const primaryValue = primaryLine.replace(/^\s*-\s+primary\s*:\s*/i, "").trim();
    if (isPlaceholder(primaryValue)) {
      issues.push(
        issue(
          "QFAI-DDP-023",
          "CTA Hierarchy: primary CTA contains a placeholder value. Replace with actual CTA label and placement",
          "error",
          "03_Story-Workshop.md",
          "ddh.ctaHierarchy.primaryPlaceholder",
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// QFAI-DDP-024: State Coverage
// ---------------------------------------------------------------------------

/**
 * Validate that the DDS defines all 4 required states:
 * empty, loading, error, populated.
 */
export async function validateStateCoverage(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  if (!content) return issues;

  const dds = extractDdsSection(content);
  if (dds === null) return issues;

  const stateSection = extractSubsection(dds, "State Coverage");
  // Fix #2: null = heading absent, empty = heading present but empty (all 4 states missing)
  if (stateSection === null) return issues;

  const missing = REQUIRED_STATES.filter(
    (state) => !new RegExp(`^\\s*-\\s+${state}\\b`, "im").test(stateSection),
  );

  if (missing.length > 0) {
    issues.push(
      issue(
        "QFAI-DDP-024",
        `State Coverage: missing state(s): ${missing.join(", ")}. Add '- ${missing[0]}: [description]' for each missing state`,
        "error",
        "03_Story-Workshop.md",
        "ddh.stateCoverage.missing",
      ),
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// QFAI-DDP-025: Design Anti-goals
// ---------------------------------------------------------------------------

/**
 * Validate that the DDS defines at least 1 design anti-goal.
 * BR-0023-0007: Placeholder values treated as missing.
 */
export async function validateDesignAntiGoals(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  if (!content) return issues;

  const dds = extractDdsSection(content);
  if (dds === null) return issues;

  const antiGoalSection = extractSubsection(dds, "Design Anti-goals");
  // Fix #2 + #3: null, empty, or placeholder = no anti-goals
  if (antiGoalSection === null || isPlaceholder(antiGoalSection)) {
    issues.push(
      issue(
        "QFAI-DDP-025",
        "Design Anti-goals: no anti-goals defined, minimum 1 required. Add '- Anti-goal: [pattern to avoid and reason]'",
        "error",
        "03_Story-Workshop.md",
        "ddh.designAntiGoals.missing",
      ),
    );
    return issues;
  }

  // Check for at least one non-placeholder list item
  // Strip "Anti-goal:" prefix before placeholder check to catch "- Anti-goal: TBD"
  const listItems = antiGoalSection
    .split("\n")
    .filter((l) => /^\s*-\s+/.test(l))
    .filter((l) => {
      const item = l.replace(/^\s*-\s+/, "");
      const value = item.replace(/^Anti-?goal\s*:\s*/i, "");
      return !isPlaceholder(value) && !isPlaceholder(item);
    });
  if (listItems.length === 0) {
    issues.push(
      issue(
        "QFAI-DDP-025",
        "Design Anti-goals: no anti-goals defined, minimum 1 required. Add '- Anti-goal: [pattern to avoid and reason]'",
        "error",
        "03_Story-Workshop.md",
        "ddh.designAntiGoals.missing",
      ),
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Main entry point for Discussion Design Hardening validators (QFAI-DDP-019..025).
 * Called from validate.ts orchestrator.
 *
 * Only runs on UI-bearing packs (DR-0042). Non-UI packs return empty array (BR-0023-0002).
 * All diagnostics use severity "error" (DR-0045).
 */
export async function validateDiscussionDesignHardening(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const discussionDir = path.join(root, config.paths.discussionDir);
  const packRoot = await findLatestDiscussionPackDir(discussionDir);
  if (!packRoot) return [];

  // DR-0042: Only run on UI-bearing packs
  const uiBearing = await isUiBearing(packRoot);
  if (!uiBearing) return [];

  // Run all 7 validators and collect issues
  const issues: Issue[] = [];
  issues.push(...(await validateDdsPresence(packRoot)));
  issues.push(...(await validateOptionComparison(packRoot)));
  issues.push(...(await validateAnchorScreen(packRoot)));
  issues.push(...(await validateCompetitiveRefs(packRoot)));
  issues.push(...(await validateCtaHierarchy(packRoot)));
  issues.push(...(await validateStateCoverage(packRoot)));
  issues.push(...(await validateDesignAntiGoals(packRoot)));

  return issues;
}

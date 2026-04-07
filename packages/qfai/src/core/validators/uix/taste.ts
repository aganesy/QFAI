/**
 * UIX-VAL taste interview validator - spec-0034
 *
 * Validates that the design taste interview artifact exists
 * and contains all 10 required sections with non-empty content.
 *
 * BR-0034-0001, BR-0034-0002, BR-0034-0003, BR-0034-0004
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

const TASTE_ARTIFACT = "uiux/11_design_taste_interview.md";

const REQUIRED_SECTIONS = [
  "visual_character",
  "emotional_tone",
  "anti_preferences",
  "admired_rejected_references",
  "novelty_vs_safety",
  "density_hierarchy",
  "motion_material",
  "brand_tone",
  "unresolved_taste_questions",
  "taste_reflection_depth",
] as const;
const REQUIRED_SECTION_COUNT = REQUIRED_SECTIONS.length;

function tasteIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "canonical",
    message,
    file: TASTE_ARTIFACT,
    suggested_action: suggestedAction,
  };
}

/**
 * Extract section headings from markdown content.
 * Matches `## section_name` headings and returns the section name lowercased.
 */
function extractSections(content: string): Set<string> {
  const sections = new Set<string>();
  for (const line of content.split("\n")) {
    const match = /^##\s+(\S+)/.exec(line);
    if (match?.[1]) {
      sections.add(match[1].toLowerCase());
    }
  }
  return sections;
}

/**
 * Check that a section has non-empty content (at least 1 non-whitespace line
 * between the heading and the next heading or EOF).
 */
function sectionHasContent(content: string, section: string): boolean {
  const lines = content.split("\n");
  let inSection = false;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (inSection) return false; // reached next heading without content
      if (line.toLowerCase().includes(section)) {
        inSection = true;
        continue;
      }
    }
    if (inSection && line.trim().length > 0) {
      return true;
    }
  }
  return false;
}

export async function validateTasteInterview(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const tastePath = path.join(root, TASTE_ARTIFACT);
  const content = await readSafe(tastePath);

  if (!content) {
    return [
      tasteIssue(
        "UIX-VAL-TASTE-MISSING",
        "UI-bearing spec detected but design taste interview artifact is missing.",
        "error",
        `Create ${TASTE_ARTIFACT} with all ${REQUIRED_SECTION_COUNT} required sections.`,
      ),
    ];
  }

  const found = extractSections(content);
  const missing = REQUIRED_SECTIONS.filter((s) => !found.has(s));

  if (missing.length > 0) {
    return [
      tasteIssue(
        "UIX-VAL-TASTE-INCOMPLETE",
        `Design taste interview is incomplete. Missing sections: ${missing.join(", ")}`,
        "error",
        `Add the missing sections to ${TASTE_ARTIFACT}: ${missing.join(", ")}`,
      ),
    ];
  }

  // Check each section has non-empty content
  const empty = REQUIRED_SECTIONS.filter((s) => found.has(s) && !sectionHasContent(content, s));

  if (empty.length > 0) {
    return [
      tasteIssue(
        "UIX-VAL-TASTE-INCOMPLETE",
        `Design taste interview sections are empty: ${empty.join(", ")}`,
        "error",
        `Add content to the empty sections in ${TASTE_ARTIFACT}: ${empty.join(", ")}`,
      ),
    ];
  }

  return [];
}

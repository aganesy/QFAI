/**
 * Prototyping skill content validator — spec-0035
 *
 * Validates prototyping skill body for:
 * - Banned runtime-heavy phrases
 * - Mode section headings (low-cost, standard, full-harness)
 * - Non-UI n/a documentation
 * - Static-first language alignment
 *
 * BR-0035-0006, BR-0035-0007, BR-0035-0008
 */
import type { Issue, IssueSeverity } from "../../types.js";

const BANNED_PHRASES = [
  "must run runtime checks",
  "ui routes reachable",
  "api non-404",
  "db objects present",
] as const;

const REQUIRED_MODES = ["low-cost", "standard", "full-harness"] as const;

const STATIC_FIRST_INDICATORS = [
  "static-first",
  "static checks",
  "no runtime",
  "file-based",
] as const;

const RUNTIME_HEAVY_INDICATORS = [
  "browser required by default",
  "runtime mandatory",
  "always execute runtime",
] as const;

function skillIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "compatibility",
    message,
    file: "SKILL.md",
    suggested_action: suggestedAction,
  };
}

export type SkillValidationResult = {
  bannedPhraseMatches: string[];
  modesPresent: string[];
  modesMissing: string[];
  hasNonUiNaPath: boolean;
  isStaticFirstAligned: boolean;
  issues: Issue[];
};

/**
 * Scan prototyping skill content for banned phrases.
 * Returns list of matched banned phrases (case-insensitive).
 */
export function scanBannedPhrases(content: string): string[] {
  const lower = content.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

/**
 * Check that all 3 mode sections are present with headings.
 */
export function checkModeHeadings(content: string): { present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];
  for (const mode of REQUIRED_MODES) {
    const pattern = new RegExp(`^#+\\s+.*${mode.replace("-", "[-\\s]")}`, "im");
    if (pattern.test(content)) {
      present.push(mode);
    } else {
      missing.push(mode);
    }
  }
  return { present, missing };
}

/**
 * Check for non-UI n/a path documentation.
 */
export function hasNonUiNaDocumentation(content: string): boolean {
  const lower = content.toLowerCase();
  return lower.includes("n/a") && (lower.includes("non-ui") || lower.includes("non_ui"));
}

/**
 * Check static-first language alignment.
 */
export function isStaticFirstAligned(content: string): boolean {
  const lower = content.toLowerCase();
  const hasStatic = STATIC_FIRST_INDICATORS.some((i) => lower.includes(i));
  const hasRuntime = RUNTIME_HEAVY_INDICATORS.some((i) => lower.includes(i));
  return hasStatic && !hasRuntime;
}

/**
 * Validate prototyping skill content.
 */
export function validatePrototypingSkillContent(content: string): SkillValidationResult {
  const bannedPhraseMatches = scanBannedPhrases(content);
  const { present: modesPresent, missing: modesMissing } = checkModeHeadings(content);
  const nonUiPath = hasNonUiNaDocumentation(content);
  const staticFirst = isStaticFirstAligned(content);
  const issues: Issue[] = [];

  if (bannedPhraseMatches.length > 0) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-BANNED-PHRASE",
        `Prototyping skill contains banned phrases: ${bannedPhraseMatches.join(", ")}`,
        "error",
        "Remove banned runtime-heavy phrases from the prototyping skill body.",
      ),
    );
  }

  if (modesMissing.length > 0) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-MODE-MISSING",
        `Prototyping skill missing mode sections: ${modesMissing.join(", ")}`,
        "error",
        `Add section headings for: ${modesMissing.join(", ")}`,
      ),
    );
  }

  return {
    bannedPhraseMatches,
    modesPresent,
    modesMissing,
    hasNonUiNaPath: nonUiPath,
    isStaticFirstAligned: staticFirst,
    issues,
  };
}

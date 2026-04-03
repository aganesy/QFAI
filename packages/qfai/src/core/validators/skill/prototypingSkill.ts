/**
 * Prototyping skill content validator — spec-0035, spec-0006
 *
 * spec-0035: Banned runtime-heavy phrases, mode section headings,
 *            non-UI n/a documentation, static-first language alignment
 * spec-0006: Aspirational language detection (AC-0006-0022),
 *            routing consistency (AC-0006-0023)
 *
 * BR-0035-0006, BR-0035-0007, BR-0035-0008
 * BR-0006-0023, BR-0006-0024
 */
import type { Issue, IssueSeverity } from "../../types.js";

const BANNED_PHRASES = [
  "must run runtime checks",
  "ui routes reachable",
  "api non-404",
  "db objects present",
] as const;

const REQUIRED_MODES = ["low-cost", "standard", "full-harness"] as const;

const ASPIRATIONAL_PATTERNS = [
  /visual regression/i,
  /pixel-diff comparison/i,
  /real-time performance profiling/i,
  /flame graph analysis/i,
  /ai-powered automatic code generation/i,
  /self-healing tests/i,
  /browser-based visual regression/i,
  /full browser-based/i,
  /live browser/i,
  /\bpuppeteer\b/i,
  /\bplaywright\b/i,
  /automatic code generation/i,
] as const;

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

export type RoutingCondition = {
  mode: string;
  trigger: string;
  target: string;
};

export type RoutingConsistencyResult = {
  consistent: boolean;
  contradictions: string[];
};

export type SkillValidationResult = {
  bannedPhraseMatches: string[];
  aspirationalClaims: string[];
  modesPresent: string[];
  modesMissing: string[];
  hasNonUiNaPath: boolean;
  isStaticFirstAligned: boolean;
  issues: Issue[];
};

/**
 * Scan prototyping skill content for banned phrases.
 * Only checks outside the full-harness section, where runtime-heavy
 * language is expected and permitted.
 * Returns list of matched banned phrases (case-insensitive).
 */
export function scanBannedPhrases(content: string): string[] {
  const stripped = content.replace(/###\s+full-harness\b[\s\S]*?(?=\n##[^#]|$)/i, "");
  const lower = stripped.toLowerCase();
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
 * Scan content for aspirational language describing unimplemented capabilities.
 * Returns matched aspirational phrases (case-insensitive).
 */
export function detectAspirationalClaims(content: string): string[] {
  const matches: string[] = [];
  for (const pattern of ASPIRATIONAL_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

/**
 * Check that SKILL.md content is consistent with implemented routing conditions.
 * For each condition, verifies the document describes the same trigger and target semantics.
 */
export function checkRoutingConsistency(
  content: string,
  conditions: RoutingCondition[],
): RoutingConsistencyResult {
  const contradictions: string[] = [];
  const lower = content.toLowerCase();

  for (const condition of conditions) {
    switch (condition.mode) {
      case "full-harness": {
        // Extract the full-harness section to scope contradiction checks
        const sectionMatch = content.match(/###\s+full-harness\b([\s\S]*?)(?=\n##[^#]|\n###\s|$)/i);
        const section = sectionMatch?.[1] ?? "";

        const hasExplicitOptIn =
          /must\s+be\s+explicitly\s+opted\s+in/i.test(section) ||
          /explicitly\s+selected\s+full-harness/i.test(section) ||
          /mode\s*[:=]\s*full-harness/i.test(section);
        const hasTarget = lower.includes(condition.target.toLowerCase());
        const hasAutomatic =
          /automatically\s+escalates\s+to\s+full-harness/i.test(section) ||
          /score-based\s+automatic\s+full-harness/i.test(section) ||
          /full-harness\s+by\s+default/i.test(section);

        if (!hasExplicitOptIn) {
          contradictions.push(
            `full-harness mode: expected explicit opt-in trigger but document lacks explicit opt-in language`,
          );
        }
        if (hasAutomatic) {
          contradictions.push(
            `full-harness mode: expected explicit opt-in trigger but document contains automatic triggering language`,
          );
        }
        if (!hasTarget) {
          contradictions.push(
            `full-harness mode: expected delegation to ${condition.target} not found in document`,
          );
        }
        break;
      }
      case "standard": {
        if (!lower.includes("static checks")) {
          contradictions.push(
            "standard mode: expected mention of static checks not found in document",
          );
        }
        break;
      }
      case "low-cost": {
        if (!lower.includes("static checks only") && !lower.includes("file-based")) {
          contradictions.push(
            "low-cost mode: expected mention of static/file-based checks not found in document",
          );
        }
        break;
      }
    }
  }

  return { consistent: contradictions.length === 0, contradictions };
}

/**
 * Validate prototyping skill content.
 */
export function validatePrototypingSkillContent(content: string): SkillValidationResult {
  const bannedPhraseMatches = scanBannedPhrases(content);
  const aspirationalClaims = detectAspirationalClaims(content);
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

  if (aspirationalClaims.length > 0) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-ASPIRATIONAL",
        `Prototyping skill contains aspirational claims: ${aspirationalClaims.join(", ")}`,
        "error",
        "Remove aspirational language or qualify with 'future'/'planned'.",
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
    aspirationalClaims,
    modesPresent,
    modesMissing,
    hasNonUiNaPath: nonUiPath,
    isStaticFirstAligned: staticFirst,
    issues,
  };
}

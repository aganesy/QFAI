import type { Issue, IssueSeverity } from "../../types.js";

const BANNED_PHRASES = [
  "must run runtime checks",
  "ui routes reachable",
  "api non-404",
  "db objects present",
  "full-harness by default",
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
  /automatic code generation/i,
] as const;

const STATIC_FIRST_INDICATORS = [
  "static-first",
  "static checks",
  "file-based",
  "no runtime execution",
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
  hasModeSurfaceMatrix: boolean;
  issues: Issue[];
};

export function scanBannedPhrases(content: string): string[] {
  const lower = content.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

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

export function hasNonUiNaDocumentation(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    (lower.includes("non-ui") || lower.includes("non_ui")) &&
    (lower.includes("n/a") ||
      lower.includes("absent is normal") ||
      lower.includes("skip semantics"))
  );
}

export function isStaticFirstAligned(content: string): boolean {
  const lower = content.toLowerCase();
  return STATIC_FIRST_INDICATORS.some((indicator) => lower.includes(indicator));
}

export function hasModeSurfaceMatrix(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes("obligation matrix") &&
    lower.includes("surface / mode") &&
    lower.includes("low-cost") &&
    lower.includes("standard") &&
    lower.includes("full-harness") &&
    lower.includes("non-ui") &&
    lower.includes("ui-bearing")
  );
}

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

export function checkRoutingConsistency(
  content: string,
  conditions: RoutingCondition[],
): RoutingConsistencyResult {
  const lower = content.toLowerCase();
  const contradictions: string[] = [];

  for (const condition of conditions) {
    if (!lower.includes(condition.mode.toLowerCase())) {
      contradictions.push(`${condition.mode}: mode section missing`);
      continue;
    }
    if (condition.mode === "full-harness") {
      if (
        !/explicitly opted in|explicit opt-in only|explicit request|mode=full-harness/i.test(
          content,
        )
      ) {
        contradictions.push("full-harness: explicit opt-in wording missing");
      }
      if (/full-harness by default|automatically triggers .*full-harness/i.test(content)) {
        contradictions.push("full-harness: automatic escalation wording detected");
      }
    }
    if (condition.mode === "standard" && !/static checks/i.test(content)) {
      contradictions.push("standard: static checks wording missing");
    }
    if (condition.mode === "low-cost" && !/static checks only|skeleton/i.test(content)) {
      contradictions.push("low-cost: lightweight obligation wording missing");
    }
  }

  return { consistent: contradictions.length === 0, contradictions };
}

export function validatePrototypingSkillContent(content: string): SkillValidationResult {
  const bannedPhraseMatches = scanBannedPhrases(content);
  const aspirationalClaims = detectAspirationalClaims(content);
  const { present: modesPresent, missing: modesMissing } = checkModeHeadings(content);
  const hasNonUiNaPath = hasNonUiNaDocumentation(content);
  const staticFirst = isStaticFirstAligned(content);
  const matrix = hasModeSurfaceMatrix(content);
  const issues: Issue[] = [];

  if (bannedPhraseMatches.length > 0) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-BANNED-PHRASE",
        `Prototyping skill contains banned phrases: ${bannedPhraseMatches.join(", ")}`,
        "error",
        "runtime-heavy default wording を削除し、mode-aware obligations に置き換えてください。",
      ),
    );
  }

  if (aspirationalClaims.length > 0) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-ASPIRATIONAL",
        `Prototyping skill contains aspirational claims: ${aspirationalClaims.join(", ")}`,
        "error",
        "未実装 capability の断定表現を削除してください。",
      ),
    );
  }

  if (modesMissing.length > 0) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-MODE-MISSING",
        `Prototyping skill missing mode sections: ${modesMissing.join(", ")}`,
        "error",
        `mode section を追加してください: ${modesMissing.join(", ")}`,
      ),
    );
  }

  if (!hasNonUiNaPath) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-NON-UI",
        "Prototyping skill is missing non-ui skip semantics.",
        "error",
        "non-ui では UI 固有 evidence absent を正常扱いする文言を追加してください。",
      ),
    );
  }

  if (!staticFirst) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-STATIC-FIRST",
        "Prototyping skill is missing static-first wording.",
        "error",
        "static-first / file-based default を明記してください。",
      ),
    );
  }

  if (!matrix) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-MATRIX",
        "Prototyping skill is missing a mode/surface obligation matrix.",
        "error",
        "low-cost / standard / full-harness と non-ui / ui-bearing の obligation matrix を追加してください。",
      ),
    );
  }

  return {
    bannedPhraseMatches,
    aspirationalClaims,
    modesPresent,
    modesMissing,
    hasNonUiNaPath,
    isStaticFirstAligned: staticFirst,
    hasModeSurfaceMatrix: matrix,
    issues,
  };
}

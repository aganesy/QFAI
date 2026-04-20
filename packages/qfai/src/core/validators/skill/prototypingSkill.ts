import type { Issue, IssueSeverity } from "../../types.js";

const BANNED_PHRASES = [
  "must run runtime checks",
  "ui routes reachable",
  "api non-404",
  "db objects present",
  "do not default to full-harness",
  "mode=low-cost",
  "mode=standard",
] as const;

const REQUIRED_MODES = ["full-harness"] as const;

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
    category: "canonical",
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
  hasCanonicalSurfaces: boolean;
  hasCliSurface: boolean;
  hasUiBearingFalseExcl: boolean;
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

const CANONICAL_SURFACES = ["web", "mobile", "desktop", "mixed"] as const;

export function hasCanonicalSurfaceDocumentation(content: string): boolean {
  const lower = content.toLowerCase();
  return CANONICAL_SURFACES.every((s) => lower.includes(s));
}

export function hasCliSurfaceDocumentation(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes("cli") &&
    (lower.includes("not execution target") ||
      lower.includes("rejected") ||
      lower.includes("not supported"))
  );
}

export function hasUiBearingFalseExclusion(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    (lower.includes("ui_bearing: false") || lower.includes("ui_bearing:false")) &&
    (lower.includes("not") || lower.includes("exempt") || lower.includes("excluded"))
  );
}

export function hasModeSurfaceMatrix(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes("obligation matrix") &&
    lower.includes("surface / mode") &&
    lower.includes("full-harness") &&
    CANONICAL_SURFACES.every((s) => lower.includes(s))
  );
}

export function isStaticFirstAligned(content: string): boolean {
  const lower = content.toLowerCase();
  return STATIC_FIRST_INDICATORS.some((indicator) => lower.includes(indicator));
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
      if (!/default.*full-harness|full-harness.*default/i.test(content)) {
        contradictions.push("full-harness: default wording missing");
      }
      if (/do not default to full-harness|explicit opt-in only/i.test(content)) {
        contradictions.push("full-harness: stale opt-in wording detected");
      }
    }
  }

  return { consistent: contradictions.length === 0, contradictions };
}

export function validatePrototypingSkillContent(content: string): SkillValidationResult {
  const bannedPhraseMatches = scanBannedPhrases(content);
  const aspirationalClaims = detectAspirationalClaims(content);
  const { present: modesPresent, missing: modesMissing } = checkModeHeadings(content);
  const canonicalSurfaces = hasCanonicalSurfaceDocumentation(content);
  const cliSurface = hasCliSurfaceDocumentation(content);
  const uiBearingFalseExcl = hasUiBearingFalseExclusion(content);
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

  if (!canonicalSurfaces) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-CANONICAL-SURFACE",
        "Prototyping skill must document supported UI prototyping surfaces: web, mobile, desktop, mixed.",
        "error",
        "supported UI surface (web, mobile, desktop, mixed) を明記してください。",
      ),
    );
  }

  if (!cliSurface) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-CLI-SURFACE",
        "Prototyping skill must document that cli surface is rejected from prototyping execution.",
        "error",
        "cli surface は prototyping execution 対象外であることを明記してください。",
      ),
    );
  }

  if (!uiBearingFalseExcl) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-UI-BEARING-FALSE",
        "Prototyping skill must document that ui_bearing: false specs are excluded from prototyping execution.",
        "error",
        "ui_bearing: false spec は prototyping execution 対象外であることを明記してください。",
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
        "web / mobile / desktop / mixed の full-harness obligation matrix を追加してください。",
      ),
    );
  }

  return {
    bannedPhraseMatches,
    aspirationalClaims,
    modesPresent,
    modesMissing,
    hasCanonicalSurfaces: canonicalSurfaces,
    hasCliSurface: cliSurface,
    hasUiBearingFalseExcl: uiBearingFalseExcl,
    isStaticFirstAligned: staticFirst,
    hasModeSurfaceMatrix: matrix,
    issues,
  };
}

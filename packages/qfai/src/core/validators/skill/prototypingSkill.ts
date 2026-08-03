import type { Issue, IssueSeverity } from "../../types.js";

const BANNED_PHRASES = [
  "must run runtime checks",
  "ui routes reachable",
  "api non-404",
  "db objects present",
  "discussion recommendation",
  "recommended_mode",
  "allowed_modes",
  "l1 and l2",
  "weightedtotal",
] as const;

const REQUIRED_SECTIONS = [
  "## Required References",
  "## Required Process",
  "## Evaluator Inputs (Mandatory)",
] as const;

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
  requiredSectionsPresent: string[];
  requiredSectionsMissing: string[];
  hasCanonicalSurfaces: boolean;
  hasCliSurface: boolean;
  hasUiBearingFalseExcl: boolean;
  isStaticFirstAligned: boolean;
  hasDelegationScopeTable: boolean;
  hasMandatoryEvidencePaths: boolean;
  hasEnvironmentPreconditions: boolean;
  hasPreflightGuidance: boolean;
  hasPlaywrightCliFallback: boolean;
  issues: Issue[];
};

export function scanBannedPhrases(content: string): string[] {
  const lower = content.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

export function checkRequiredSections(content: string): { present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];
  for (const section of REQUIRED_SECTIONS) {
    const pattern = new RegExp(`^${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "im");
    if (pattern.test(content)) {
      present.push(section);
    } else {
      missing.push(section);
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
      lower.includes("not execution targets") ||
      lower.includes("not prototyping execution target") ||
      lower.includes("not prototyping execution targets") ||
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

export function hasDelegationScopeTable(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes("delegation scope table") &&
    (lower.includes("evaluation scoring") || lower.includes("evaluation l1-l2")) &&
    (lower.includes("screenshot capture") || lower.includes("playwright cli execution & capture"))
  );
}

export function isStaticFirstAligned(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    STATIC_FIRST_INDICATORS.some((indicator) => lower.includes(indicator)) ||
    lower.includes("do not rely on a cli entrypoint")
  );
}

export function hasMandatoryEvidencePaths(content: string): boolean {
  const lower = content.toLowerCase();
  const hasLegacyAggregatePaths =
    lower.includes(".qfai/evidence/prototyping/screenshots/<screen-id>.png") &&
    lower.includes(".qfai/evidence/prototyping/html/<screen-id>.html");
  const hasV2IterPaths =
    lower.includes(".qfai/evidence/prototyping/iter-nn/<screen>.png") &&
    lower.includes(".qfai/evidence/prototyping/iter-nn/<screen>.html");
  return hasLegacyAggregatePaths || hasV2IterPaths;
}

export function hasEnvironmentPreconditions(content: string): boolean {
  const step2AIndex = content.search(/Step 2-A\s+—\s+Verify Contract Preconditions/i);
  const step2BIndex = content.search(/Step 2-B\s+—\s+Verify Environment Preconditions/i);
  return step2AIndex >= 0 && step2BIndex > step2AIndex;
}

export function hasPreflightGuidance(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes("qfai prototyping preflight") ||
    lower.includes("qfai doctor --profile prototyping")
  );
}

/**
 * Whether the skill documents a launcher invocation that cannot silently
 * install a package.
 *
 * The rule used to require the `playwright-cli` spelling specifically, which
 * became self-contradictory once that launcher reached its sunset: the skill
 * could no longer recommend `playwright-cli`, and this check then failed the
 * skill for saying so. What it actually guards is the `--no-install` /
 * `node_modules/.bin` shape — a bare `npx playwright` reaches the network.
 *
 * The `playwright` spellings are prefixes of the `playwright-cli` ones, so a
 * project still documenting the legacy launcher continues to pass.
 */
export function hasPlaywrightCliFallback(content: string): boolean {
  // Anchored at the end of the launcher name. A substring test accepted
  // `playwright-does-not-exist` and `playwright-wrapper` — any command whose
  // name merely starts with `playwright` — so a skill could satisfy the rule
  // while documenting no working launcher at all. Widening the search from
  // `playwright-cli` to `playwright` is what made that reachable.
  //
  // `playwright-cli` still matches: it is listed explicitly, so a project that
  // has not migrated its docs keeps passing.
  const LAUNCHER = String.raw`playwright(?:-cli)?(?![\w-])`;
  return new RegExp(String.raw`(?:npx\s+--no-install\s+|node_modules/\.bin/)${LAUNCHER}`, "i").test(
    content,
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
    if (
      condition.mode === "standard" &&
      !/default.*standard|standard.*default|surface \/ mode.*standard|standard.*surface \/ mode/i.test(
        content,
      )
    ) {
      contradictions.push("standard: default wording missing");
    }
  }

  return { consistent: contradictions.length === 0, contradictions };
}

export function validatePrototypingSkillContent(content: string): SkillValidationResult {
  const bannedPhraseMatches = scanBannedPhrases(content);
  const aspirationalClaims = detectAspirationalClaims(content);
  const { present: requiredSectionsPresent, missing: requiredSectionsMissing } =
    checkRequiredSections(content);
  const canonicalSurfaces = hasCanonicalSurfaceDocumentation(content);
  const cliSurface = hasCliSurfaceDocumentation(content);
  const uiBearingFalseExcl = hasUiBearingFalseExclusion(content);
  const staticFirst = isStaticFirstAligned(content);
  const delegationScopeTable = hasDelegationScopeTable(content);
  const mandatoryEvidencePaths = hasMandatoryEvidencePaths(content);
  const environmentPreconditions = hasEnvironmentPreconditions(content);
  const preflightGuidance = hasPreflightGuidance(content);
  const playwrightCliFallback = hasPlaywrightCliFallback(content);
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

  if (requiredSectionsMissing.length > 0) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-SECTION-MISSING",
        `Prototyping skill missing required sections: ${requiredSectionsMissing.join(", ")}`,
        "error",
        `required sections を追加してください: ${requiredSectionsMissing.join(", ")}`,
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

  if (!delegationScopeTable) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-DELEGATION",
        "Prototyping skill is missing the delegation scope table for evaluator/capture/build roles.",
        "error",
        "delegation scope table を追加してください。",
      ),
    );
  }

  if (!mandatoryEvidencePaths) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-EVIDENCE-PATHS",
        "Prototyping skill must declare canonical screenshot and HTML evidence paths.",
        "error",
        "canonical screenshot/html evidence path を明記してください。",
      ),
    );
  }

  if (!environmentPreconditions) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-ENV-PRECONDITIONS",
        "Prototyping skill must separate contract preconditions and environment preconditions.",
        "error",
        "Step 2-A / Step 2-B で contract と environment の preconditions を分離してください。",
      ),
    );
  }

  if (!preflightGuidance) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-PREFLIGHT",
        "Prototyping skill must document qfai prototyping preflight or qfai doctor --profile prototyping guidance.",
        "error",
        "preflight 実行導線（qfai prototyping preflight または qfai doctor --profile prototyping）を明記してください。",
      ),
    );
  }

  if (!playwrightCliFallback) {
    issues.push(
      skillIssue(
        "UIX-VAL-SKILL-PLAYWRIGHT-FALLBACK",
        "Prototyping skill must document a safe Playwright invocation path such as npx --no-install playwright.",
        "error",
        "npx --no-install playwright または node_modules/.bin/playwright の経路を明記してください。",
      ),
    );
  }

  return {
    bannedPhraseMatches,
    aspirationalClaims,
    requiredSectionsPresent,
    requiredSectionsMissing,
    hasCanonicalSurfaces: canonicalSurfaces,
    hasCliSurface: cliSurface,
    hasUiBearingFalseExcl: uiBearingFalseExcl,
    isStaticFirstAligned: staticFirst,
    hasDelegationScopeTable: delegationScopeTable,
    hasMandatoryEvidencePaths: mandatoryEvidencePaths,
    hasEnvironmentPreconditions: environmentPreconditions,
    hasPreflightGuidance: preflightGuidance,
    hasPlaywrightCliFallback: playwrightCliFallback,
    issues,
  };
}

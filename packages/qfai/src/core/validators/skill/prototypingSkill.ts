import type { Issue, IssueSeverity } from "../../types.js";

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
  aspirationalClaims: string[];
  requiredSectionsPresent: string[];
  requiredSectionsMissing: string[];
  hasCanonicalSurfaces: boolean;
  hasCliSurface: boolean;
  hasUiContractScope: boolean;
  isStaticFirstAligned: boolean;
  hasDelegationScopeTable: boolean;
  hasEnvironmentPreconditions: boolean;
  hasPreflightGuidance: boolean;
  hasPlaywrightLauncherInvocation: boolean;
  issues: Issue[];
};

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

/**
 * `UI-NNNN` standing on its own. A letter, digit, `_` or `-` on either side makes
 * it part of a longer token, such as `X-UI-NNNN`.
 */
const UI_CONTRACT_ID_PLACEHOLDER = /(?<![\w-])ui-nnnn(?![\w-])/;

export function hasUiContractScope(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    UI_CONTRACT_ID_PLACEHOLDER.test(lower) &&
    lower.includes("screens[]") &&
    (lower.includes("only") || lower.includes("excluded"))
  );
}

export function hasDelegationScopeTable(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes("delegation scope table") &&
    (lower.includes("evaluation scoring") || lower.includes("evaluation l1-l2"))
  );
}

export function isStaticFirstAligned(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    STATIC_FIRST_INDICATORS.some((indicator) => lower.includes(indicator)) ||
    lower.includes("do not rely on a cli entrypoint")
  );
}

export function hasEnvironmentPreconditions(content: string): boolean {
  const step2AIndex = content.search(/Step 2-A\s+—\s+Verify Contract Preconditions/i);
  const step2BIndex = content.search(/Step 2-B\s+—\s+Verify Environment Preconditions/i);
  return step2AIndex >= 0 && step2BIndex > step2AIndex;
}

export function hasPreflightGuidance(content: string): boolean {
  const lower = content.toLowerCase();
  return lower.includes("qfai doctor --profile prototyping");
}

/**
 * Whether the skill documents a launcher invocation that cannot silently
 * install a package.
 *
 * What it guards is the `--no-install` / `node_modules/.bin` shape — a bare
 * `npx playwright` reaches the network.
 */
export function hasPlaywrightLauncherInvocation(content: string): boolean {
  // Anchored at the end of the launcher name. A substring test accepted
  // `playwright-does-not-exist` and `playwright-wrapper` — any command whose
  // name merely starts with `playwright` — so a skill could satisfy the rule
  // while documenting no working launcher at all.
  const LAUNCHER = String.raw`playwright(?![\w-])`;
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
  const aspirationalClaims = detectAspirationalClaims(content);
  const { present: requiredSectionsPresent, missing: requiredSectionsMissing } =
    checkRequiredSections(content);
  const canonicalSurfaces = hasCanonicalSurfaceDocumentation(content);
  const cliSurface = hasCliSurfaceDocumentation(content);
  const uiContractScope = hasUiContractScope(content);
  const staticFirst = isStaticFirstAligned(content);
  const delegationScopeTable = hasDelegationScopeTable(content);
  const environmentPreconditions = hasEnvironmentPreconditions(content);
  const preflightGuidance = hasPreflightGuidance(content);
  const playwrightLauncherInvocation = hasPlaywrightLauncherInvocation(content);
  const issues: Issue[] = [];

  if (aspirationalClaims.length > 0) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-001",
        `Prototyping skill contains aspirational claims: ${aspirationalClaims.join(", ")}`,
        "error",
        "Remove the assertions about capabilities that are not implemented.",
      ),
    );
  }

  if (requiredSectionsMissing.length > 0) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-009",
        `Prototyping skill missing required sections: ${requiredSectionsMissing.join(", ")}`,
        "error",
        `Add the required sections: ${requiredSectionsMissing.join(", ")}`,
      ),
    );
  }

  if (!canonicalSurfaces) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-003",
        "Prototyping skill must document supported UI prototyping surfaces: web, mobile, desktop, mixed.",
        "error",
        "State the supported UI surfaces (web, mobile, desktop, mixed) explicitly.",
      ),
    );
  }

  if (!cliSurface) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-004",
        "Prototyping skill must document that cli surface is rejected from prototyping execution.",
        "error",
        "State explicitly that the cli surface is out of scope for prototyping execution.",
      ),
    );
  }

  if (!uiContractScope) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-011",
        "Prototyping skill must limit execution to UI contracts with a full UI-NNNN ID and non-empty screens[].",
        "error",
        "State that only UI contracts with a full UI-NNNN ID and non-empty screens[] are eligible.",
      ),
    );
  }

  if (!staticFirst) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-010",
        "Prototyping skill is missing static-first wording.",
        "error",
        "State the static-first / file-based default explicitly.",
      ),
    );
  }

  if (!delegationScopeTable) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-005",
        "Prototyping skill is missing the delegation scope table for the generation, evaluation and build roles.",
        "error",
        "Add the delegation scope table.",
      ),
    );
  }

  if (!environmentPreconditions) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-006",
        "Prototyping skill must separate contract preconditions and environment preconditions.",
        "error",
        "Separate the contract and environment preconditions in Step 2-A / Step 2-B.",
      ),
    );
  }

  if (!preflightGuidance) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-008",
        "Prototyping skill must document qfai doctor --profile prototyping guidance.",
        "error",
        "State the preflight entry point explicitly (qfai doctor --profile prototyping).",
      ),
    );
  }

  if (!playwrightLauncherInvocation) {
    issues.push(
      skillIssue(
        "QFAI-PROTOSKILL-007",
        "Prototyping skill must document a safe Playwright invocation path such as npx --no-install playwright.",
        "error",
        "State the npx --no-install playwright or node_modules/.bin/playwright route explicitly.",
      ),
    );
  }

  return {
    aspirationalClaims,
    requiredSectionsPresent,
    requiredSectionsMissing,
    hasCanonicalSurfaces: canonicalSurfaces,
    hasCliSurface: cliSurface,
    hasUiContractScope: uiContractScope,
    isStaticFirstAligned: staticFirst,
    hasDelegationScopeTable: delegationScopeTable,
    hasEnvironmentPreconditions: environmentPreconditions,
    hasPreflightGuidance: preflightGuidance,
    hasPlaywrightLauncherInvocation: playwrightLauncherInvocation,
    issues,
  };
}

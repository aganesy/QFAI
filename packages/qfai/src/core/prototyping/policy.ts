export const PROTOTYPING_DELEGATION_SCOPE = {
  UI実装: ["frontend-engineer", "product-experience-architect"],
  スクリーンショット: ["devops-ci-engineer"],
  評価スコアリング: ["product-surface-reviewer", "product-experience-architect"],
  ビルド: ["devops-ci-engineer", "backend-engineer"],
} as const;

/**
 * Category labels used by the shipped `qfai-prototyping/SKILL.md`
 * Delegation Scope Table, mapped onto the canonical scope keys above.
 *
 * The skill table and `PROTOTYPING_DELEGATION_SCOPE` are two renderings
 * of one policy, so a `delegationMap` written against the shipped table
 * MUST resolve to the same allowed-role set — without this alias layer a
 * table-conformant category is simply unknown to the validator and its
 * assignment is never checked. Keys are normalized (trimmed, lowercased,
 * whitespace-collapsed). Adding a row to the shipped table requires an
 * entry here; `tests/validators/prototyping/delegationMap.test.ts` reads
 * the asset and fails when the two drift apart.
 */
const DELEGATION_CATEGORY_ALIASES: ReadonlyMap<string, string> = new Map([
  ["generation", "UI実装"],
  ["playwright cli execution & capture", "スクリーンショット"],
  ["playwright cli execution and capture", "スクリーンショット"],
  ["evaluation scoring", "評価スコアリング"],
  ["build", "ビルド"],
]);

const DELEGATION_SCOPE_BY_CATEGORY: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries(PROTOTYPING_DELEGATION_SCOPE),
);

function normalizeDelegationCategory(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolves a `delegationMap` category label to its allowed role ids.
 * Accepts both the canonical scope keys and the shipped Delegation Scope
 * Table labels. Returns `undefined` for a category outside the policy —
 * lookups go through `Map`, so prototype-chain keys (`toString`) never
 * resolve.
 */
export function resolveDelegationScope(category: string): readonly string[] | undefined {
  const direct = DELEGATION_SCOPE_BY_CATEGORY.get(category);
  if (direct !== undefined) return direct;
  const canonical = DELEGATION_CATEGORY_ALIASES.get(normalizeDelegationCategory(category));
  return canonical === undefined ? undefined : DELEGATION_SCOPE_BY_CATEGORY.get(canonical);
}

export const PROTOTYPING_REQUIRED_ROLE_IDS = Array.from(
  new Set(Object.values(PROTOTYPING_DELEGATION_SCOPE).flat()),
).sort() as readonly string[];

export const PROTOTYPING_ROLE_WRAPPER_INTEGRATIONS = [
  { id: "claude", dir: ".claude/agents", suffix: ".md", label: "Claude Code" },
  { id: "github", dir: ".github/agents", suffix: ".agent.md", label: "GitHub Copilot" },
] as const;

export type PrototypingRoleWrapperIntegration =
  (typeof PROTOTYPING_ROLE_WRAPPER_INTEGRATIONS)[number];

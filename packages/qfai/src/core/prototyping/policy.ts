// The keys are the canonical Japanese category labels (UI implementation,
// screenshot, evaluation scoring, build), kept as escapes because delegation
// maps are matched against them.
export const PROTOTYPING_DELEGATION_SCOPE = {
  "UI\u5B9F\u88C5": ["frontend-engineer", "product-experience-architect"],
  "\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8": ["devops-ci-engineer"],
  "\u8A55\u4FA1\u30B9\u30B3\u30A2\u30EA\u30F3\u30B0": [
    "product-surface-reviewer",
    "product-experience-architect",
  ],
  "\u30D3\u30EB\u30C9": ["devops-ci-engineer", "backend-engineer"],
} as const;

/**
 * The Delegation Scope Table rendered by the shipped
 * `prototyping-loop/STEP.md`, transcribed row for row: each English label
 * maps to the roles ITS OWN row documents.
 *
 * A `delegationMap` written against the distributed skill uses these labels,
 * so the validator has to recognise them — but it must judge them by the
 * table the author actually read. Translating a label to a canonical key and
 * reusing that key's roles hands the label the wider canonical set and lets
 * through assignments the shipped table forbids (`Generation` ->
 * `frontend-engineer`, `Evaluation scoring` -> `product-experience-architect`).
 *
 * Editing a row in the shipped table means editing this constant:
 * `tests/validators/prototyping/delegationMap.test.ts` parses the asset and
 * fails when the label set or any row's role set drifts apart.
 */
export const SHIPPED_DELEGATION_SCOPE_TABLE: Readonly<Record<string, readonly string[]>> = {
  "Generation and implementation": ["product-experience-architect"],
  "Live Playwright review and evaluation scoring": ["product-surface-reviewer"],
  Build: ["devops-ci-engineer", "backend-engineer"],
  "Optional Playwright CLI execution & capture": ["devops-ci-engineer"],
};

const DELEGATION_SCOPE_BY_CATEGORY: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries(PROTOTYPING_DELEGATION_SCOPE),
);

const SHIPPED_SCOPE_BY_NORMALIZED_LABEL: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries(SHIPPED_DELEGATION_SCOPE_TABLE).map(([label, roles]) => [
    normalizeDelegationCategory(label),
    roles,
  ]),
);

const LEGACY_SCOPE_BY_NORMALIZED_LABEL: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries({
    Generation: ["product-experience-architect"],
    "Evaluation scoring": ["product-surface-reviewer"],
    "Playwright CLI execution & capture": ["devops-ci-engineer"],
  }).map(([label, roles]) => [normalizeDelegationCategory(label), roles]),
);

/** Case / spacing / `&`-vs-`and` insensitive form of a table label. */
function normalizeDelegationCategory(category: string): string {
  return category.trim().toLowerCase().replace(/&/g, " and ").replace(/\s+/g, " ").trim();
}

/**
 * Resolves a `delegationMap` category label to its allowed role ids.
 * Canonical scope keys keep the canonical role set; a shipped Delegation
 * Scope Table label keeps the narrower set printed in its own row. Returns
 * `undefined` for a category outside the policy — lookups go through `Map`,
 * so prototype-chain keys (`toString`) never resolve.
 */
export function resolveDelegationScope(category: string): readonly string[] | undefined {
  const direct = DELEGATION_SCOPE_BY_CATEGORY.get(category);
  if (direct !== undefined) return direct;
  const normalized = normalizeDelegationCategory(category);
  return (
    SHIPPED_SCOPE_BY_NORMALIZED_LABEL.get(normalized) ??
    LEGACY_SCOPE_BY_NORMALIZED_LABEL.get(normalized)
  );
}

export const PROTOTYPING_ALLOWED_ROLE_IDS = Array.from(
  new Set(Object.values(PROTOTYPING_DELEGATION_SCOPE).flat()),
).sort() as readonly string[];

export const PROTOTYPING_REQUIRED_ROLE_IDS = [
  "product-experience-architect",
  "product-surface-reviewer",
] as const;

export const PROTOTYPING_ROLE_WRAPPER_INTEGRATIONS = [
  { id: "claude", dir: ".claude/agents", suffix: ".md", label: "Claude Code" },
  { id: "github", dir: ".github/agents", suffix: ".agent.md", label: "GitHub Copilot" },
] as const;

export type PrototypingRoleWrapperIntegration =
  (typeof PROTOTYPING_ROLE_WRAPPER_INTEGRATIONS)[number];

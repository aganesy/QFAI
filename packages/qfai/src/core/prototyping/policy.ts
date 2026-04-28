export const PROTOTYPING_DELEGATION_SCOPE = {
  UI実装: ["frontend-engineer", "product-experience-architect"],
  スクリーンショット: ["devops-ci-engineer"],
  評価スコアリング: ["product-surface-reviewer", "product-experience-architect"],
  ビルド: ["devops-ci-engineer", "backend-engineer"],
} as const;

export const PROTOTYPING_REQUIRED_ROLE_IDS = Array.from(
  new Set(Object.values(PROTOTYPING_DELEGATION_SCOPE).flat()),
).sort() as readonly string[];

export const PROTOTYPING_ROLE_WRAPPER_INTEGRATIONS = [
  { id: "claude", dir: ".claude/agents", suffix: ".md", label: "Claude Code" },
  { id: "github", dir: ".github/agents", suffix: ".agent.md", label: "GitHub Copilot" },
] as const;

export type PrototypingRoleWrapperIntegration =
  (typeof PROTOTYPING_ROLE_WRAPPER_INTEGRATIONS)[number];

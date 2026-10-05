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

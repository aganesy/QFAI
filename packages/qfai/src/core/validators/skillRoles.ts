import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseSkillRoles } from "../agentFrontmatter.js";
import { resolvePath, type QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * How firmly a phase binds an agent.
 *
 * `required` covers `mandatory_agents` and `blocking_agents`: a compliant run
 * cannot finish without dispatching them, so a skill that never declared them
 * is in unresolvable conflict with the manifest. `conditional` covers
 * `conditional_agents` and `parallel_groups`, where the omission is a
 * documentation gap rather than a broken gate.
 */
export type RoutingBinding = "required" | "conditional";

/** What `agent-routing.yml` says about one skill, collected across its phases. */
export type SkillRouting = {
  agents: Map<string, RoutingBinding>;
  reviewProfile?: string;
};

/**
 * Roles a skill may declare that no routing phase and no review profile
 * selects.
 *
 * `orchestrator` is the invoking agent: it is dispatched by
 * `constitution/shared-skill-delegation-baseline.md`, not by a per-skill
 * routing phase, so six shipped skills declare it and none route it. Without
 * this exemption every one of them would carry a permanent finding.
 */
const MANIFEST_EXTERNAL_ROLES = new Set(["orchestrator"]);

export function emptySkillRouting(): SkillRouting {
  return { agents: new Map() };
}

/**
 * Fold one routing field into a skill's collected agent set. `required` wins
 * over a `conditional` recorded earlier for the same id — an agent listed in
 * both `conditional_agents` and `blocking_agents` is still a gate.
 */
export function recordRoutedAgents(
  entry: SkillRouting,
  value: unknown,
  binding: RoutingBinding,
): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const agent of value) {
    if (typeof agent !== "string" || agent.length === 0) {
      continue;
    }
    if (binding === "required" || !entry.agents.has(agent)) {
      entry.agents.set(agent, binding);
    }
  }
}

/**
 * Compare each routed skill's `roles:` frontmatter with what the manifests
 * select for it, in both directions.
 */
export async function validateSkillRoles(
  root: string,
  config: QfaiConfig,
  routing: Map<string, SkillRouting>,
  profiles: Map<string, Set<string>>,
  issues: Issue[],
): Promise<void> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  for (const [skill, entry] of routing) {
    const skillPath = path.join(skillsDir, skill, "SKILL.md");
    const declared = await readDeclaredRoles(skillPath);
    if (!declared) {
      continue;
    }
    const rel = path.relative(root, skillPath).replace(/\\/g, "/");
    reportUndeclaredRoutedAgents(skill, entry, declared, rel, issues);
    reportUnselectableRoles(skill, entry, declared, profiles, rel, issues);
  }
}

/**
 * `undefined` when the skill ships no `SKILL.md`, when the file cannot be read
 * (a project may have replaced the path with a directory), or when it declares
 * no `roles:` — none of those is a divergence this rule can adjudicate.
 */
async function readDeclaredRoles(skillPath: string): Promise<string[] | undefined> {
  try {
    return parseSkillRoles(await readFile(skillPath, "utf-8"));
  } catch {
    return undefined;
  }
}

function reportUndeclaredRoutedAgents(
  skill: string,
  entry: SkillRouting,
  declared: readonly string[],
  rel: string,
  issues: Issue[],
): void {
  const declaredSet = new Set(declared);
  for (const [agent, binding] of entry.agents) {
    if (declaredSet.has(agent)) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-AGENT-014",
        `${rel} omits routed agent "${agent}" from roles: (agent-routing.yml binds it to ${skill} as ${binding})`,
        binding === "required" ? "error" : "warning",
        rel,
        "agentDefinition.routedAgentNotDeclared",
      ),
    );
  }
}

function reportUnselectableRoles(
  skill: string,
  entry: SkillRouting,
  declared: readonly string[],
  profiles: Map<string, Set<string>>,
  rel: string,
  issues: Issue[],
): void {
  const selectable = new Set(entry.agents.keys());
  const profileName = entry.reviewProfile;
  for (const reviewer of (profileName ? profiles.get(profileName) : undefined) ?? []) {
    selectable.add(reviewer);
  }
  const profileLabel = profileName ? `review profile "${profileName}"` : "declared review profile";
  for (const role of declared) {
    if (selectable.has(role) || MANIFEST_EXTERNAL_ROLES.has(role)) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-AGENT-015",
        `${rel} declares role "${role}" that no ${skill} routing phase and no ${profileLabel} selects`,
        "warning",
        rel,
        "agentDefinition.roleNeverSelected",
      ),
    );
  }
}

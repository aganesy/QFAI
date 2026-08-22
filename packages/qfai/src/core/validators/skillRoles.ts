import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseSkillFrontmatter, type SkillFrontmatter } from "../agentFrontmatter.js";
import { resolvePath, type QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * How firmly a phase or a review profile binds an agent.
 *
 * `required` covers `mandatory_agents`, `blocking_agents` and a profile's
 * `always_required`: a compliant run cannot finish without dispatching them,
 * so a skill that never declared them is in unresolvable conflict with the
 * manifest. `conditional` covers `conditional_agents`, `parallel_groups` and a
 * profile's `conditional_required`, where the omission is a documentation gap
 * rather than a broken gate.
 */
export type RoutingBinding = "required" | "conditional";

/** What `agent-routing.yml` says about one skill, collected across its phases. */
export type SkillRouting = {
  agents: Map<string, RoutingBinding>;
  reviewProfile?: string;
};

/** Every reviewer a review profile can select, with how firmly it binds. */
export type ProfileSelection = Map<string, RoutingBinding>;

/** One agent the manifests select for a skill, and the clause that selects it. */
type Selection = { binding: RoutingBinding; source: string };

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
 * Compare each skill's `roles:` frontmatter with what the manifests select for
 * it, in both directions, and each skill that binds itself to the manifest
 * against the routes the manifest actually declares.
 */
export async function validateSkillRoles(
  root: string,
  config: QfaiConfig,
  routing: Map<string, SkillRouting>,
  profiles: Map<string, ProfileSelection>,
  issues: Issue[],
): Promise<void> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  for (const [skill, entry] of routing) {
    const skillPath = path.join(skillsDir, skill, "SKILL.md");
    const frontmatter = await readSkillFrontmatter(skillPath);
    if (!frontmatter) {
      continue;
    }
    const rel = path.relative(root, skillPath).replace(/\\/g, "/");
    if (frontmatter.rolesError) {
      // Without this the slip reads as "no `roles:` key" and BOTH directions
      // below are skipped, so a missing mandatory routed agent passes.
      issues.push(
        issue(
          "QFAI-AGENT-016",
          `${rel} declares an unusable roles: frontmatter (${frontmatter.rolesError}); the ${skill} routing cross-check cannot run`,
          "error",
          rel,
          "agentDefinition.invalidSkillRoles",
        ),
      );
      continue;
    }
    if (!frontmatter.roles) {
      continue;
    }
    const selected = collectSelections(skill, entry, profiles);
    reportUndeclaredRoutedAgents(selected, frontmatter.roles, rel, issues);
    reportUnselectableRoles(skill, selected, frontmatter.roles, entry.reviewProfile, rel, issues);
  }
  await reportUnroutedSkills(root, skillsDir, routing, issues);
}

/**
 * `undefined` when the skill ships no `SKILL.md`, when the file cannot be read
 * (a project may have replaced the path with a directory), or when it carries
 * no usable frontmatter — none of those is a divergence this rule can
 * adjudicate.
 */
async function readSkillFrontmatter(skillPath: string): Promise<SkillFrontmatter | undefined> {
  try {
    return parseSkillFrontmatter(await readFile(skillPath, "utf-8"));
  } catch {
    return undefined;
  }
}

/**
 * Every agent the manifests can dispatch inside a skill: its routed phases
 * plus the reviewers its `review_profile` selects.
 *
 * A profile-only reviewer belongs on BOTH sides of the cross-check, not just
 * the "is this role reachable" side: the shipped contract makes `roles:` a
 * superset of everything the manifest binds, and `runtime-heavy` selects
 * `implementation-reviewer` that no phase of `qfai-configure` names.
 */
function collectSelections(
  skill: string,
  entry: SkillRouting,
  profiles: Map<string, ProfileSelection>,
): Map<string, Selection> {
  const selected = new Map<string, Selection>();
  for (const [agent, binding] of entry.agents) {
    selected.set(agent, {
      binding,
      source: `agent-routing.yml binds it to ${skill} as ${binding}`,
    });
  }
  const profileName = entry.reviewProfile;
  if (!profileName) {
    return selected;
  }
  for (const [reviewer, binding] of profiles.get(profileName) ?? []) {
    const prior = selected.get(reviewer);
    if (prior && (prior.binding === "required" || binding === "conditional")) {
      continue;
    }
    const clause = binding === "required" ? "always_required" : "conditional_required";
    selected.set(reviewer, {
      binding,
      source: `review profile "${profileName}" selects it as ${clause}`,
    });
  }
  return selected;
}

function reportUndeclaredRoutedAgents(
  selected: Map<string, Selection>,
  declared: readonly string[],
  rel: string,
  issues: Issue[],
): void {
  const declaredSet = new Set(declared);
  for (const [agent, selection] of selected) {
    if (declaredSet.has(agent)) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-AGENT-014",
        `${rel} omits routed agent "${agent}" from roles: (${selection.source})`,
        selection.binding === "required" ? "error" : "warning",
        rel,
        "agentDefinition.routedAgentNotDeclared",
      ),
    );
  }
}

function reportUnselectableRoles(
  skill: string,
  selected: Map<string, Selection>,
  declared: readonly string[],
  profileName: string | undefined,
  rel: string,
  issues: Issue[],
): void {
  const profileLabel = profileName ? `review profile "${profileName}"` : "declared review profile";
  for (const role of declared) {
    if (selected.has(role) || MANIFEST_EXTERNAL_ROLES.has(role)) {
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

/**
 * The missing half of the cross-check: a skill that binds itself to the
 * manifest with `routing-profile:` but that the manifest routes nothing to.
 *
 * Walking the `routing` map alone made the rule one-directional — deleting a
 * whole `- skill:` block, or misspelling its name, left that `SKILL.md`
 * unexamined and every finding above at zero, so the regression guard would
 * have missed a workflow that can no longer dispatch anyone. Skills that
 * declare no `routing-profile:` (the shipped `web-research` is deliberately
 * un-routed) are exempt.
 */
async function reportUnroutedSkills(
  root: string,
  skillsDir: string,
  routing: Map<string, SkillRouting>,
  issues: Issue[],
): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(skillsDir);
  } catch {
    // No skills directory at all, or one replaced by a file: `QFAI-LINK-001`
    // and `validateSkillsIntegrity` own that, not this rule.
    return;
  }
  for (const name of entries.sort()) {
    if (routing.has(name)) {
      continue;
    }
    const skillPath = path.join(skillsDir, name, "SKILL.md");
    const frontmatter = await readSkillFrontmatter(skillPath);
    const profile = frontmatter?.routingProfile;
    if (!profile) {
      continue;
    }
    const rel = path.relative(root, skillPath).replace(/\\/g, "/");
    issues.push(
      issue(
        "QFAI-AGENT-017",
        `${rel} declares routing-profile: ${profile} but agent-routing.yml routes no phases to "${name}"`,
        "error",
        rel,
        "agentDefinition.skillNotRouted",
      ),
    );
  }
}

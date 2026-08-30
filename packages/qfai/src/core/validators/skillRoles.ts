import { readdir, readFile, stat } from "node:fs/promises";
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
  /**
   * How many well-formed phase objects the walk collected for this skill.
   *
   * Presence in the routing map is not the same as being routed: a `- skill:`
   * header alone registers the entry, so `phases: []`, an absent `phases:` key
   * and a non-list value all left the skill looking routed while the manifest
   * can dispatch nobody inside it. `QFAI-AGENT-017` is decided on this count,
   * not on the header.
   */
  phases: number;
  /**
   * Two `- skill:` blocks that named this skill but different review profiles.
   *
   * Recorded during the manifest walk and reported here rather than there:
   * `QFAI-AGENT-018` is this module's code, and one rule code emitted from two
   * modules cannot be grepped, filtered or waived apart.
   */
  reviewProfileConflict?: { first: string; second: string };
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
  return { agents: new Map(), phases: 0 };
}

/**
 * Fold one routing field into a skill's collected agent set. `required` wins
 * over a `conditional` recorded earlier for the same id — an agent listed in
 * both `conditional_agents` and `blocking_agents` is still a gate.
 *
 * `known`, when given, is the agent catalog. An id outside it is counted as a
 * dispatch attempt but never collected: `QFAI-AGENT-008` already reports the
 * dangling reference, and collecting it here would make `QFAI-AGENT-014` tell
 * the operator to add that same non-existent id to the skill's `roles:`.
 *
 * Returns how many syntactically usable ids the field held — non-empty strings
 * in a list — which is what decides whether the phase dispatches anything.
 * Catalog membership is deliberately not part of that count: a phase naming
 * only unknown agents is a broken reference (`QFAI-AGENT-008`), not an
 * unrouted skill (`QFAI-AGENT-017`).
 */
export function recordRoutedAgents(
  entry: SkillRouting,
  value: unknown,
  binding: RoutingBinding,
  known?: ReadonlySet<string>,
): number {
  if (!Array.isArray(value)) {
    return 0;
  }
  let usable = 0;
  for (const agent of value) {
    if (typeof agent !== "string" || agent.length === 0) {
      continue;
    }
    usable += 1;
    if (known && !known.has(agent)) {
      continue;
    }
    if (binding === "required" || !entry.agents.has(agent)) {
      entry.agents.set(agent, binding);
    }
  }
  return usable;
}

/**
 * Compare each skill's `roles:` frontmatter with what the manifests select for
 * it, in both directions, and each skill that binds itself to the manifest
 * against the routes and the review gate the manifest actually declares.
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
    const rel = path.relative(root, skillPath).replace(/\\/g, "/");
    if (entry.reviewProfileConflict) {
      const { first, second } = entry.reviewProfileConflict;
      issues.push(
        issue(
          "QFAI-AGENT-018",
          `agent-routing.yml routes "${skill}" through two different review profiles ("${first}" and "${second}"); one skill has one review gate`,
          "error",
          rel,
          "agentDefinition.conflictingReviewProfile",
        ),
      );
    }
    // A header with no usable phase list dispatches nothing, so neither
    // direction of the cross-check can say anything true about it —
    // `reportUnroutedSkills` reports the header itself as `QFAI-AGENT-017`
    // instead of blaming each declared role for a manifest-level defect.
    if (entry.phases === 0) {
      continue;
    }
    const frontmatter = await readSkillFrontmatter(skillPath);
    if (!frontmatter) {
      continue;
    }
    if (frontmatter.parseError) {
      // A routed skill whose frontmatter cannot be read is not "makes no
      // claim": the assistant cannot load it either, so reporting nothing let
      // one indentation slip pass the whole family as success.
      issues.push(unreadableFrontmatter(rel, skill, frontmatter.parseError));
      continue;
    }
    // Ahead of the `roles:` guards below: which review gate the skill and the
    // manifest each name is a divergence in its own right, and a skill that
    // declares no `roles:` still has to agree about its profile.
    reportProfileDisagreement(skill, entry, frontmatter.routingProfile, profiles, rel, issues);
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

/** `QFAI-AGENT-016` for a `SKILL.md` whose frontmatter block cannot be read. */
function unreadableFrontmatter(rel: string, skill: string, reason: string): Issue {
  return issue(
    "QFAI-AGENT-016",
    `${rel} carries an unreadable frontmatter block (${reason}); the ${skill} routing cross-check cannot run`,
    "error",
    rel,
    "agentDefinition.unreadableSkillFrontmatter",
  );
}

/**
 * `undefined` when the skill ships no `SKILL.md`, when the file cannot be read
 * (a project may have replaced the path with a directory), or when it carries
 * no usable frontmatter — none of those is a divergence this rule can
 * adjudicate.
 */
async function readSkillFrontmatter(skillPath: string): Promise<SkillFrontmatter | undefined> {
  try {
    // `stat` before `readFile`, and only a regular file is read. The
    // pre-flight that stops `qfai validate` on a damaged skills tree
    // (`inspectIntegrationSurface`) knows only the canonical
    // `.qfai/assistant/skills`, so a project that moved `paths.skillsDir`
    // reaches this read with the damage unreported — and `readFile` on a FIFO
    // there waits for a writer that never comes, hanging the whole run instead
    // of failing it. Nothing that is not a regular file carries frontmatter
    // this rule can adjudicate, so the bound costs no coverage.
    if (!(await stat(skillPath)).isFile()) {
      return undefined;
    }
    return parseSkillFrontmatter(await readFile(skillPath, "utf-8"));
  } catch {
    return undefined;
  }
}

/**
 * The review gate the skill names and the gate the manifest routes it through
 * must be the same one, and it must exist.
 *
 * Only `entry.reviewProfile` was ever used, so a skill could declare a
 * `routing-profile:` that `review-profiles.yml` never defines while the
 * manifest sent it through a different profile, and the roles cross-check went
 * green on the manifest's side of the disagreement — the shipped
 * `qfai-prototyping` (`ui-surface-aware` against `ui-bearing`) was in exactly
 * that state.
 *
 * The *agreement* half is checked only when the skill declares
 * `routing-profile:`, the same binding signal `QFAI-AGENT-017` reads: a skill
 * that declares none holds the manifest to nothing, exactly as an absent
 * `roles:` does. The *existence* half is not conditional on that — a route
 * pointing at a profile `review-profiles.yml` never defines is broken whoever
 * declared what, and `collectSelections` silently reads an unknown profile as
 * an empty reviewer set, so leaving it unreported also loses every mandatory
 * reviewer that gate was supposed to bind.
 */
function reportProfileDisagreement(
  skill: string,
  entry: SkillRouting,
  declared: string | undefined,
  profiles: Map<string, ProfileSelection>,
  rel: string,
  issues: Issue[],
): void {
  const routed = entry.reviewProfile;
  if (routed !== undefined && !profiles.has(routed)) {
    issues.push(
      issue(
        "QFAI-AGENT-018",
        `agent-routing.yml routes "${skill}" through review profile "${routed}", which review-profiles.yml does not define`,
        "error",
        rel,
        "agentDefinition.unknownReviewProfile",
      ),
    );
  }
  if (declared === undefined) {
    return;
  }
  if (routed !== declared) {
    const found = routed === undefined ? "declares no review_profile" : `declares ${routed}`;
    issues.push(
      issue(
        "QFAI-AGENT-018",
        `${rel} declares routing-profile: ${declared} but the agent-routing.yml route for "${skill}" ${found}`,
        "error",
        rel,
        "agentDefinition.routingProfileMismatch",
      ),
    );
    return;
  }
  // Both name the same profile. If it does not exist, the manifest-side check
  // above already said so once — a second finding for the same missing
  // definition would only double the work list.
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
 *
 * The test is whether the manifest collected a phase for the skill, not
 * whether it carries a `- skill:` header: emptying the phase list, dropping
 * the `phases:` key or writing a non-list there leaves the same workflow that
 * can dispatch no one, and the header alone used to excuse all three.
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
    if ((routing.get(name)?.phases ?? 0) > 0) {
      continue;
    }
    const skillPath = path.join(skillsDir, name, "SKILL.md");
    const frontmatter = await readSkillFrontmatter(skillPath);
    const rel = path.relative(root, skillPath).replace(/\\/g, "/");
    if (frontmatter?.parseError) {
      // The routed loop reports its own; this covers every other skill dir, so
      // an unloadable `SKILL.md` is named exactly once wherever it sits.
      issues.push(unreadableFrontmatter(rel, name, frontmatter.parseError));
      continue;
    }
    const profile = frontmatter?.routingProfile;
    if (!profile) {
      continue;
    }
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

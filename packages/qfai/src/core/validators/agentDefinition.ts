import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { parseAgentFrontmatter } from "../agentFrontmatter.js";
import type { QfaiConfig } from "../config.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import type { Issue } from "../types.js";
import {
  emptySkillRouting,
  recordRoutedAgents,
  validateSkillRoles,
  type ProfileSelection,
  type RoutingBinding,
  type SkillRouting,
} from "./skillRoles.js";
import { exists, issue } from "./utils.js";

const REQUIRED_AGENT_SECTIONS = [
  "## Mission",
  "## Domain Responsibilities",
  "## Inputs you must read",
  "## Deliverables",
  "## Stop conditions",
  "## Sign-off",
];

type RoutingPhase = {
  mandatory_agents?: unknown;
  conditional_agents?: unknown;
  blocking_agents?: unknown;
  parallel_groups?: unknown;
  iteration?: unknown;
  rerun_policy?: unknown;
};

/**
 * How often a routing phase runs.
 *
 * The schema had no iteration concept at all, so every phase list read as one
 * pass over the whole invocation. That is wrong for `qfai-implement`, which
 * drives the TDD micro-cycle one ledger row at a time: collapsing its phases
 * into a single pass left `qa-gatekeeper` no slot in which a RED state still
 * exists to be observed.
 *
 * The key is optional and `per-invocation` is the default, so manifests that
 * predate it keep their meaning. What is validated is the *value*: a typo like
 * `per-item` would otherwise be read as "no iteration declared" and silently
 * restore the collapsed reading it was added to fix.
 */
const ROUTING_ITERATIONS = new Set(["per-invocation", "per-ledger-item"]);

/**
 * What a phase re-runs when it is entered a second time.
 *
 * The key was on all 23 routed phases, defined nowhere, read by nothing, and
 * absent from this type — so a typo in it was invisible and the two values in
 * use were folklore. It is validated rather than deleted because the Drift
 * Protocol's rerun step needs exactly this vocabulary.
 *
 * - `failed-agents-only` — re-run only the agents that did not return PASS.
 * - `changed-scope-dependents` — re-run every agent whose inputs the change
 *   touched, including ones that passed.
 */
const RERUN_POLICIES = new Set(["failed-agents-only", "changed-scope-dependents"]);

export async function validateAgentDefinition(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const agentsDir = path.join(root, ".qfai", "assistant", "agent");
  if (!(await exists(agentsDir))) {
    return [];
  }
  const agentIds = new Set<string>();
  const reviewerIds = new Set<string>();
  for (const name of await readdir(agentsDir)) {
    if (!name.endsWith(".md")) continue;
    const id = name.slice(0, -3);
    const filePath = path.join(agentsDir, name);
    const rel = `.qfai/assistant/agent/${name}`;
    agentIds.add(id);

    const content = await readFile(filePath, "utf-8");
    const frontmatter = parseAgentFrontmatter(content);
    if (!frontmatter.ok) {
      issues.push(
        issue(
          "QFAI-AGENT-011",
          `Invalid Claude/GitHub Copilot-compatible frontmatter in ${rel}: ${frontmatter.error}`,
          "error",
          rel,
          "agentDefinition.invalidFrontmatter",
        ),
      );
      continue;
    }
    if (frontmatter.frontmatter.name !== id) {
      issues.push(
        issue(
          "QFAI-AGENT-012",
          `Frontmatter name mismatch in ${rel}: expected "${id}", got "${frontmatter.frontmatter.name}"`,
          "error",
          rel,
          "agentDefinition.frontmatterNameMismatch",
        ),
      );
      continue;
    }
    if (frontmatter.frontmatter.kind === "reviewer") reviewerIds.add(id);
    for (const heading of REQUIRED_AGENT_SECTIONS) {
      if (!content.includes(heading)) {
        issues.push(
          issue(
            "QFAI-AGENT-005",
            `Missing required section "${heading}" in ${rel}`,
            "error",
            rel,
            "agentDefinition.missingRequiredSection",
          ),
        );
      }
    }
  }

  const defaultsDir = path.resolve(getInitAssetsDir(), "..", "defaults");
  const routingPath = path.join(defaultsDir, "agent-routing.yml");
  const profilesPath = path.join(defaultsDir, "review-profiles.yml");
  const routing = await validateRouting(routingPath, config.routing ?? [], agentIds, issues);
  const profiles = await validateProfiles(
    profilesPath,
    config.reviewProfiles ?? {},
    reviewerIds,
    issues,
  );
  if (routing !== undefined && profiles !== undefined) {
    await validateSkillRoles(root, config, routing, profiles, issues);
  }

  return issues;
}

async function validateRouting(
  routingPath: string,
  overrides: NonNullable<QfaiConfig["routing"]>,
  agentIds: Set<string>,
  issues: Issue[],
): Promise<Map<string, SkillRouting> | undefined> {
  const rel = "packages/qfai/assets/defaults/agent-routing.yml";
  // Collected during this walk rather than re-parsed by `validateSkillRoles`:
  // the per-skill routed set is exactly what the walk already resolves, and a
  // second parse could disagree with the one these findings came from.
  const routed = new Map<string, SkillRouting>();
  const parsed: unknown = parseYaml(await readFile(routingPath, "utf-8"));
  try {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push(
        issue(
          "QFAI-AGENT-007",
          "agent-routing.yml must parse to an object",
          "error",
          rel,
          "agentDefinition.invalidRoutingShape",
        ),
      );
      return undefined;
    }
    const routingRoot = parsed as Record<string, unknown>;
    if (!Array.isArray(routingRoot.routing)) {
      issues.push(
        issue(
          "QFAI-AGENT-007",
          "agent-routing.yml must contain routing array",
          "error",
          rel,
          "agentDefinition.invalidRoutingShape",
        ),
      );
      return undefined;
    }

    const effective = new Map<string, unknown>();
    for (const route of routingRoot.routing) {
      if (route && typeof route === "object" && !Array.isArray(route)) {
        const skill: unknown = Reflect.get(route, "skill");
        if (typeof skill === "string") effective.set(skill, route);
      }
    }
    for (const route of overrides) effective.set(route.skill, route);
    for (const [routeIndex, route] of [...effective.values()].entries()) {
      if (!route || typeof route !== "object" || Array.isArray(route)) {
        continue;
      }
      const routeObj = route as Record<string, unknown>;
      const source = overrides.some((entry) => entry.skill === routeObj.skill)
        ? "qfai.config.yaml"
        : rel;
      const routedEntry = collectRouteHeader(
        routeObj,
        routed,
        issues,
        source,
        formatSkillLabel(routeObj.skill, routeIndex),
      );
      if (!Array.isArray(routeObj.phases)) {
        continue;
      }
      for (const [phaseIndex, phase] of routeObj.phases.entries()) {
        if (!phase || typeof phase !== "object" || Array.isArray(phase)) {
          continue;
        }
        const phaseObj = phase as RoutingPhase;
        if (phaseObj.iteration !== undefined) {
          const declared = phaseObj.iteration;
          if (typeof declared !== "string" || !ROUTING_ITERATIONS.has(declared)) {
            issues.push(
              issue(
                "QFAI-AGENT-013",
                `${formatSkillLabel(routeObj.skill, routeIndex)} phase[${phaseIndex}] declares iteration ${JSON.stringify(declared)}; allowed: ${[...ROUTING_ITERATIONS].sort().join(", ")}`,
                "error",
                source,
                "agentDefinition.routingIteration",
              ),
            );
          }
        }
        if (phaseObj.rerun_policy !== undefined) {
          const declared = phaseObj.rerun_policy;
          if (typeof declared !== "string" || !RERUN_POLICIES.has(declared)) {
            issues.push(
              issue(
                "QFAI-AGENT-013",
                `${formatSkillLabel(routeObj.skill, routeIndex)} phase[${phaseIndex}] declares rerun_policy ${JSON.stringify(declared)}; allowed: ${[...RERUN_POLICIES].sort().join(", ")}`,
                "error",
                source,
                "agentDefinition.rerunPolicy",
              ),
            );
          }
        }
        validateAgentRefs(
          source,
          phaseObj.mandatory_agents,
          agentIds,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          routeIndex,
          phaseIndex,
          "mandatory_agents",
        );
        validateAgentRefs(
          source,
          phaseObj.conditional_agents,
          agentIds,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          routeIndex,
          phaseIndex,
          "conditional_agents",
        );
        validateAgentRefs(
          source,
          phaseObj.blocking_agents,
          agentIds,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          routeIndex,
          phaseIndex,
          "blocking_agents",
        );
        if (Array.isArray(phaseObj.parallel_groups)) {
          for (const group of phaseObj.parallel_groups) {
            validateAgentRefs(
              source,
              group,
              agentIds,
              issues,
              formatSkillLabel(routeObj.skill, routeIndex),
              routeIndex,
              phaseIndex,
              "parallel_groups",
            );
          }
        }
        // A field that is present but is not a list is dropped by both
        // `validateAgentRefs` and `recordRoutedAgents`, so `mandatory_agents:
        // completion-reviewer` used to route nobody and say nothing.
        validateAgentFieldShapes(
          source,
          phaseObj,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          phaseIndex,
        );
        if (routedEntry) {
          collectPhaseAgents(routedEntry, phaseObj, agentIds);
        }
      }
    }
  } catch {
    issues.push(
      issue(
        "QFAI-AGENT-007",
        "agent-routing.yml could not be parsed",
        "error",
        rel,
        "agentDefinition.routingParse",
      ),
    );
    return undefined;
  }
  return routed;
}

/** The phase fields that name agents directly, in binding order. */
const PHASE_AGENT_FIELDS = [
  ["mandatory_agents", "required"],
  ["blocking_agents", "required"],
  ["conditional_agents", "conditional"],
] as const;

/**
 * Register a routing entry under its skill name and remember the review
 * profile it declares. Unnamed routes are skipped: there is no skill whose
 * `roles:` they could be held against.
 *
 * Two `- skill:` blocks with the same name accumulate their phases and agents,
 * but they cannot both own the review gate. Overwriting silently let the skill
 * satisfy `QFAI-AGENT-019` / `-018` against the last block's profile alone
 * while the first block's reviewers went unlisted, so a conflicting second
 * declaration is recorded for `validateSkillRoles` to report and the first one
 * stands.
 *
 * A `review_profile:` that is present but is not a usable name is reported
 * here and flagged on the entry. Ignoring the value collected the route as one
 * that declares no review gate at all, which is a different manifest: the
 * skill then passed `QFAI-AGENT-019` / `-018` without any of the reviewers the
 * broken key was meant to bind, and nothing named the key.
 */
function collectRouteHeader(
  routeObj: Record<string, unknown>,
  routed: Map<string, SkillRouting>,
  issues: Issue[],
  routingPathRel: string,
  skillLabel: string,
): SkillRouting | undefined {
  if (typeof routeObj.skill !== "string" || routeObj.skill.length === 0) {
    return undefined;
  }
  const entry = routed.get(routeObj.skill) ?? emptySkillRouting();
  const declared = routeObj.review_profile;
  if (typeof declared === "string" && declared.trim().length > 0) {
    const profile = declared.trim();
    if (entry.reviewProfile === undefined) {
      entry.reviewProfile = profile;
    } else if (entry.reviewProfile !== profile) {
      entry.reviewProfileConflict ??= { first: entry.reviewProfile, second: profile };
    }
  } else if (declared !== undefined) {
    entry.reviewProfileUnusable = true;
    issues.push(
      issue(
        "QFAI-AGENT-013",
        `${skillLabel} declares review_profile ${JSON.stringify(declared)}; expected the name of a review-profiles.yml profile`,
        "error",
        routingPathRel,
        "agentDefinition.routingReviewProfileShape",
      ),
    );
  }
  routed.set(routeObj.skill, entry);
  return entry;
}

/**
 * Fold one phase's four agent fields into the skill's collected routed set.
 *
 * The phase counts toward `entry.phases` only when at least one usable agent
 * id came out of it. `QFAI-AGENT-017` asks whether the manifest can dispatch
 * anything inside the skill, and `- id: only` with no agent field — or one
 * whose fields are all scalars — dispatches nobody however well-formed the
 * phase object is.
 */
function collectPhaseAgents(
  entry: SkillRouting,
  phase: RoutingPhase,
  catalogIds: Set<string>,
): void {
  let dispatchable = 0;
  for (const [field, binding] of PHASE_AGENT_FIELDS) {
    dispatchable += recordRoutedAgents(entry, phase[field], binding, catalogIds);
  }
  if (Array.isArray(phase.parallel_groups)) {
    for (const group of phase.parallel_groups) {
      dispatchable += recordRoutedAgents(entry, group, "conditional", catalogIds);
    }
  }
  if (dispatchable > 0) {
    entry.phases += 1;
  }
}

/**
 * Report a phase's agent field that is present but is not a list.
 *
 * Every reader of these fields — `validateAgentRefs`, `recordRoutedAgents` —
 * starts with an `Array.isArray` guard and returns quietly, so a scalar
 * (`mandatory_agents: completion-reviewer`) produced no finding anywhere while
 * silently emptying the gate it was meant to declare.
 */
function validateAgentFieldShapes(
  rel: string,
  phase: RoutingPhase,
  issues: Issue[],
  skill: string,
  phaseIndex: number,
): void {
  const report = (field: string, value: unknown): void => {
    issues.push(
      issue(
        "QFAI-AGENT-013",
        `${skill} phase[${phaseIndex}] declares ${field} ${JSON.stringify(value)}; expected a list of agent ids`,
        "error",
        rel,
        "agentDefinition.routingAgentFieldShape",
      ),
    );
  };
  for (const [field] of PHASE_AGENT_FIELDS) {
    const value = phase[field];
    if (value !== undefined && !Array.isArray(value)) {
      report(field, value);
    }
  }
  const groups = phase.parallel_groups;
  if (groups === undefined) {
    return;
  }
  if (!Array.isArray(groups)) {
    report("parallel_groups", groups);
    return;
  }
  for (const group of groups) {
    if (!Array.isArray(group)) {
      report("parallel_groups entry", group);
    }
  }
}

function validateAgentRefs(
  routingPathRel: string,
  value: unknown,
  catalogIds: Set<string>,
  issues: Issue[],
  skill: string,
  routeIndex: number,
  phaseIndex: number,
  field: string,
): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    if (!catalogIds.has(entry)) {
      issues.push(
        issue(
          "QFAI-AGENT-008",
          `agent-routing.yml references unknown agent "${entry}" in ${skill} phase ${phaseIndex} field ${field}`,
          "error",
          // Sourced from the caller's resolved routing path (manifestPathRel)
          // so the file: argument always points at the actual location read
          // (manifest/ canonical or steering/ legacy fallback).
          routingPathRel,
          "agentDefinition.unknownRoutingAgent",
        ),
      );
    }
  }
}

async function validateProfiles(
  profilesPath: string,
  overrides: NonNullable<QfaiConfig["reviewProfiles"]>,
  reviewerIds: Set<string>,
  issues: Issue[],
): Promise<Map<string, ProfileSelection> | undefined> {
  const rel = "packages/qfai/assets/defaults/review-profiles.yml";
  // A profile selects reviewers a phase list never names, so `QFAI-AGENT-019`
  // and `QFAI-AGENT-015` need this side of the manifest too — the first before
  // it can call a profile-selected reviewer undeclared, the second before it
  // can call a declared role unreachable.
  const selections = new Map<string, ProfileSelection>();
  const parsed: unknown = parseYaml(await readFile(profilesPath, "utf-8"));
  try {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push(
        issue(
          "QFAI-AGENT-009",
          "review-profiles.yml must parse to an object",
          "error",
          rel,
          "agentDefinition.invalidProfilesShape",
        ),
      );
      return undefined;
    }
    const profilesRoot = parsed as Record<string, unknown>;
    if (
      !profilesRoot.profiles ||
      typeof profilesRoot.profiles !== "object" ||
      Array.isArray(profilesRoot.profiles)
    ) {
      issues.push(
        issue(
          "QFAI-AGENT-009",
          "review-profiles.yml must contain profiles object",
          "error",
          rel,
          "agentDefinition.invalidProfilesShape",
        ),
      );
      return undefined;
    }
    const profiles = { ...(profilesRoot.profiles as Record<string, unknown>), ...overrides };
    for (const [profileName, profile] of Object.entries(profiles)) {
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        continue;
      }
      const profileObj = profile as Record<string, unknown>;
      const source = Object.hasOwn(overrides, profileName) ? "qfai.config.yaml" : rel;
      // Before collecting: both readers below guard on `Array.isArray`, so
      // `always_required: completion-reviewer` produced an empty selection set
      // and no finding — a broken mandatory review gate that passed silently.
      // The result is carried on the selection because a truncated reviewer
      // list is not a short one: the roles cross-check has to know it is
      // reading a floor before it tells a skill to drop a declared reviewer.
      const shapesUsable = validateReviewerFieldShapes(profileObj, issues, profileName, source);
      selections.set(profileName, {
        reviewers: collectProfileReviewers(
          profileObj.always_required,
          profileObj.conditional_required,
          reviewerIds,
        ),
        incomplete: !shapesUsable,
      });
      validateReviewerRefs(
        profileObj.always_required,
        reviewerIds,
        issues,
        profileName,
        "always",
        source,
      );
      validateReviewerRefs(
        profileObj.conditional_required,
        reviewerIds,
        issues,
        profileName,
        "conditional",
        source,
      );
    }
  } catch {
    issues.push(
      issue(
        "QFAI-AGENT-009",
        "review-profiles.yml could not be parsed",
        "error",
        rel,
        "agentDefinition.profilesParse",
      ),
    );
    return undefined;
  }
  return selections;
}

/**
 * Every reviewer a profile can select, each kept with how firmly it binds:
 * `always_required` is dispatched on every run, so omitting it from a skill's
 * `roles:` is an error, while `conditional_required` is a warning.
 *
 * An id that is not a catalogued reviewer is left out: `QFAI-AGENT-010`
 * already reports it, and keeping it would make `QFAI-AGENT-019` demand that
 * every skill on the profile add the invalid id to its `roles:`.
 */
function collectProfileReviewers(
  always: unknown,
  conditional: unknown,
  reviewerIds: Set<string>,
): Map<string, RoutingBinding> {
  const reviewers = new Map<string, RoutingBinding>();
  for (const [value, binding] of [
    [conditional, "conditional"],
    [always, "required"],
  ] as const) {
    if (!Array.isArray(value)) {
      continue;
    }
    for (const entry of value) {
      if (typeof entry === "string" && entry.length > 0 && reviewerIds.has(entry)) {
        reviewers.set(entry, binding);
      }
    }
  }
  return reviewers;
}

/**
 * Report an `always_required` / `conditional_required` that is not a list.
 *
 * Returns whether every reviewer field was usable, so the caller can mark the
 * selection it collects as a floor rather than the profile's full membership.
 */
function validateReviewerFieldShapes(
  profileObj: Record<string, unknown>,
  issues: Issue[],
  profileName: string,
  profilesPathRel: string,
): boolean {
  let usable = true;
  for (const field of ["always_required", "conditional_required"] as const) {
    const value = profileObj[field];
    if (value === undefined || Array.isArray(value)) {
      continue;
    }
    usable = false;
    issues.push(
      issue(
        "QFAI-AGENT-009",
        `review-profiles.yml profile "${profileName}" declares ${field} ${JSON.stringify(value)}; expected a list of reviewer ids`,
        "error",
        profilesPathRel,
        "agentDefinition.invalidProfilesShape",
      ),
    );
  }
  return usable;
}

function formatSkillLabel(skill: unknown, routeIndex: number): string {
  return typeof skill === "string" && skill.length > 0 ? skill : `route-${routeIndex}`;
}

function validateReviewerRefs(
  value: unknown,
  reviewerIds: Set<string>,
  issues: Issue[],
  profileName: string,
  field: string,
  profilesPathRel: string,
): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    if (!reviewerIds.has(entry)) {
      issues.push(
        issue(
          "QFAI-AGENT-010",
          `review-profiles.yml profile "${profileName}" references non-reviewer agent "${entry}" in ${field}_required`,
          "error",
          profilesPathRel,
          "agentDefinition.nonReviewerInProfile",
        ),
      );
    }
  }
}

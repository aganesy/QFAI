import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { parseAgentFrontmatter } from "../agentFrontmatter.js";
import type { QfaiConfig } from "../config.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import {
  emptySkillRouting,
  recordRoutedAgents,
  validateSkillRoles,
  type ProfileSelection,
  type RoutingBinding,
  type SkillRouting,
} from "./skillRoles.js";
import { exists, issue } from "./utils.js";

/** The release `QFAI-AGENT-014` stops being a warning at. */
const DEVELOPER_INSTRUCTIONS_PROMOTION = RULE_PROMOTIONS.agentDeveloperInstructionsDrift.promoteAt;

const REQUIRED_AGENT_SECTIONS = [
  "## Mission",
  "## Domain Responsibilities",
  "## Inputs you must read",
  "## Deliverables",
  "## Stop conditions",
  "## Sign-off",
];

type CatalogAgent = {
  id: string;
  kind: "worker" | "reviewer";
  /**
   * The catalog's copy of the agent body. Optional on this type only because
   * the entry may be missing or malformed on disk — QFAI-AGENT-014 reports
   * either. Kept rather than discarded at parse time so that rule can compare
   * it against the source.
   */
  developerInstructions?: string;
  /**
   * Whether the entry carried the key at all, whatever its type. A key that is
   * present but not a string is already reported as a catalog shape error, so
   * QFAI-AGENT-014 must not name it a second time as a missing block.
   */
  hasDeveloperInstructionsKey: boolean;
};

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

/**
 * Resolve a manifest YAML file by checking the new canonical layer first
 * (.qfai/assistant/manifest/) and falling back to the legacy
 * steering/ path during the compatibility window. Returns the
 * absolute path of the first location that exists, or the canonical
 * (manifest/) path if neither exists so the error message points at
 * the post-recut SSOT location.
 */
async function resolveManifestFile(root: string, fileName: string): Promise<string> {
  const canonical = path.join(root, ".qfai", "assistant", "manifest", fileName);
  if (await exists(canonical)) return canonical;
  const legacy = path.join(root, ".qfai", "assistant", "steering", fileName);
  if (await exists(legacy)) return legacy;
  return canonical;
}

function manifestRelativePath(absolute: string, root: string): string {
  return path.relative(root, absolute).replace(/\\/g, "/");
}

/**
 * The canonical agent body: `## Mission` onward, i.e. everything after the
 * frontmatter and the title heading. Returns undefined when the section is
 * absent — QFAI-AGENT-005 already reports that, and a second finding for the
 * same missing heading would only add noise.
 */
function canonicalAgentBody(markdown: string): string | undefined {
  const content = markdown.replace(/\r\n/g, "\n");
  let offset = 0;
  if (content.startsWith("---\n")) {
    // Anchor the search past the frontmatter: a description that merely
    // mentions `## Mission` must not become the start of the body.
    const close = content.indexOf("\n---", "---\n".length - 1);
    if (close >= 0) offset = close + 1;
  }
  const match = /^## Mission[ \t]*$/m.exec(content.slice(offset));
  if (match === null) return undefined;
  return content.slice(offset + match.index);
}

function normalizeBody(body: string): string {
  return body.replace(/\r\n/g, "\n").trim();
}

/**
 * `agent-catalog.yml` embeds a verbatim copy of each agent body under
 * `developer_instructions`. The markdown file is the source; the catalog block
 * is derived. Nothing compared them, so a project that customised an agent
 * silently shipped two disagreeing copies of the same instructions and
 * `qfai validate` reported nothing.
 *
 * Warning, not error: the derived copy is regenerable, and a stale or absent
 * block does not make the tree unusable — it makes it ambiguous, which is
 * exactly what a warning is for.
 *
 * The severity comes from the promotion window rather than a literal, because
 * the rule necessarily lands on catalogs written before the comparison existed:
 * every repository that customised an agent already carries the divergence.
 * `toolVersion` is resolved once per validator run and passed in, so the
 * comparison costs nothing per finding.
 */
function checkDeveloperInstructions(
  agent: CatalogAgent,
  markdown: string,
  agentRel: string,
  catalogRel: string,
  toolVersion: string,
  issues: Issue[],
): void {
  const developerInstructionsSeverity = newRuleSeverity(
    toolVersion,
    DEVELOPER_INSTRUCTIONS_PROMOTION,
  );
  const windowNote =
    developerInstructionsSeverity === "warning"
      ? ` Reported as a warning until the ${DEVELOPER_INSTRUCTIONS_PROMOTION} release, then an error`
      : "";
  const declared = agent.developerInstructions;
  if (declared === undefined) {
    // Present but not a string: QFAI-AGENT-006 already named it at parse time,
    // and a second finding for the same broken block would only add noise.
    if (agent.hasDeveloperInstructionsKey) return;
    // A deleted block is not "this catalog does not duplicate" — it is the
    // cheapest way to defeat the drift comparison, and it silently starves the
    // downstream loaders the field exists for, which read the catalog and
    // nothing else. Warning, like the drift case: the block is derived, so the
    // repair is mechanical.
    issues.push(
      issue(
        "QFAI-AGENT-014",
        `${catalogRel} agent "${agent.id}" has no developer_instructions block; the catalog is contracted to embed the canonical body so a loader that reads only the catalog still gets it — restore the block by copying ${agentRel} from its "## Mission" heading onward, verbatim.${windowNote}`,
        developerInstructionsSeverity,
        catalogRel,
        "agentDefinition.developerInstructionsMissing",
        undefined,
        "canonical",
        undefined,
        { relatedFiles: [agentRel] },
      ),
    );
    return;
  }
  const canonical = canonicalAgentBody(markdown);
  if (canonical === undefined) return;
  if (normalizeBody(declared) === normalizeBody(canonical)) return;
  issues.push(
    issue(
      "QFAI-AGENT-014",
      `${catalogRel} agent "${agent.id}" developer_instructions diverges from the canonical body in ${agentRel}; the markdown file is the source — edit it, then restore the catalog block by copying that file from its "## Mission" heading onward, verbatim.${windowNote}`,
      developerInstructionsSeverity,
      catalogRel,
      "agentDefinition.developerInstructionsDrift",
      undefined,
      "canonical",
      undefined,
      { relatedFiles: [agentRel] },
    ),
  );
}

export async function validateAgentDefinition(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const agentsDir = path.join(root, ".qfai", "assistant", "agents");
  const catalogPath = await resolveManifestFile(root, "agent-catalog.yml");
  const routingPath = await resolveManifestFile(root, "agent-routing.yml");
  const profilesPath = await resolveManifestFile(root, "review-profiles.yml");

  if (!(await exists(agentsDir)) && !(await exists(catalogPath))) {
    return [];
  }

  // Resolved once for the whole run: `resolveToolVersion` reads a file, and the
  // promotion window it feeds is the same for every agent in the catalog.
  const toolVersion = await resolveToolVersion();

  for (const [fileName, code, resolved] of [
    ["agent-catalog.yml", "QFAI-AGENT-001", catalogPath],
    ["agent-routing.yml", "QFAI-AGENT-002", routingPath],
    ["review-profiles.yml", "QFAI-AGENT-003", profilesPath],
  ] as const) {
    if (!(await exists(resolved))) {
      const rel = manifestRelativePath(resolved, root);
      issues.push(
        issue(
          code,
          `Required agent manifest file missing: ${rel} (legacy fallback: .qfai/assistant/steering/${fileName})`,
          "error",
          rel,
          "agentDefinition.missingManifestFile",
        ),
      );
    }
  }

  if (issues.some((entry) => entry.severity === "error")) {
    return issues;
  }

  const catalog = await readCatalog(catalogPath, issues, root);
  if (catalog.length === 0) {
    return issues;
  }

  const catalogRel = manifestRelativePath(catalogPath, root);
  const catalogIds = new Set(catalog.map((agent) => agent.id));
  const reviewerIds = new Set(
    catalog.filter((agent) => agent.kind === "reviewer").map((agent) => agent.id),
  );

  for (const agent of catalog) {
    const filePath = path.join(agentsDir, `${agent.id}.md`);
    const rel = `.qfai/assistant/agents/${agent.id}.md`;
    if (!(await exists(filePath))) {
      issues.push(
        issue(
          "QFAI-AGENT-004",
          `Agent catalog entry "${agent.id}" has no canonical markdown file: ${rel}`,
          "error",
          rel,
          "agentDefinition.missingAgentMarkdown",
        ),
      );
      continue;
    }

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
    if (frontmatter.frontmatter.name !== agent.id) {
      issues.push(
        issue(
          "QFAI-AGENT-012",
          `Frontmatter name mismatch in ${rel}: expected "${agent.id}", got "${frontmatter.frontmatter.name}"`,
          "error",
          rel,
          "agentDefinition.frontmatterNameMismatch",
        ),
      );
    }
    checkDeveloperInstructions(agent, content, rel, catalogRel, toolVersion, issues);
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

  const routing = await validateRouting(routingPath, catalogIds, issues, root);
  const profiles = await validateProfiles(profilesPath, reviewerIds, issues, root);
  // `undefined` means the manifest could not be parsed or has the wrong shape,
  // which `QFAI-AGENT-007` / `QFAI-AGENT-009` already report. Cross-checking
  // `roles:` against the empty result of that failure is not a weaker check but
  // a wrong one: every skill would be told its routes are missing and every
  // declared role called unreachable, sending the operator to seven `SKILL.md`
  // files for one broken manifest.
  if (routing !== undefined && profiles !== undefined) {
    await validateSkillRoles(root, config, routing, profiles, issues);
  }

  return issues;
}

async function readCatalog(
  catalogPath: string,
  issues: Issue[],
  root: string,
): Promise<CatalogAgent[]> {
  // Use the actual resolved catalogPath in finding `file:` arguments so
  // errors point at the location that was actually read (canonical
  // manifest/ first, legacy steering/ as fallback) — not a hard-coded
  // legacy literal.
  const rel = manifestRelativePath(catalogPath, root);
  try {
    const parsed: unknown = parseYaml(await readFile(catalogPath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push(
        issue(
          "QFAI-AGENT-006",
          "agent-catalog.yml must parse to an object",
          "error",
          rel,
          "agentDefinition.invalidCatalogShape",
        ),
      );
      return [];
    }

    const catalogRoot = parsed as Record<string, unknown>;
    if (!Array.isArray(catalogRoot.agents)) {
      issues.push(
        issue(
          "QFAI-AGENT-006",
          "agent-catalog.yml must contain agents array",
          "error",
          rel,
          "agentDefinition.invalidCatalogShape",
        ),
      );
      return [];
    }

    const agents: CatalogAgent[] = [];
    for (const [index, entry] of catalogRoot.agents.entries()) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        issues.push(
          issue(
            "QFAI-AGENT-006",
            `agent-catalog.yml agents[${index}] must be an object`,
            "error",
            rel,
            "agentDefinition.invalidCatalogEntry",
          ),
        );
        continue;
      }

      const agent = entry as Record<string, unknown>;
      if (typeof agent.id !== "string" || (agent.kind !== "worker" && agent.kind !== "reviewer")) {
        issues.push(
          issue(
            "QFAI-AGENT-006",
            `agent-catalog.yml agents[${index}] must include string id and kind worker|reviewer`,
            "error",
            rel,
            "agentDefinition.invalidCatalogEntry",
          ),
        );
        continue;
      }

      // A present-but-non-string block (`null`, a list, a number) is a broken
      // derived copy, not an absent one. Dropping it silently would make the
      // drift rule return as if the catalog simply carried no copy, so the
      // shape error is reported here and the entry keeps its identity for the
      // remaining per-agent rules.
      const declared: unknown = agent.developer_instructions;
      const declaredIsString = typeof declared === "string";
      if (declared !== undefined && !declaredIsString) {
        issues.push(
          issue(
            "QFAI-AGENT-006",
            `agent-catalog.yml agents[${index}] developer_instructions must be a string when present`,
            "error",
            rel,
            "agentDefinition.invalidCatalogEntry",
          ),
        );
      }

      agents.push({
        id: agent.id,
        kind: agent.kind,
        hasDeveloperInstructionsKey: declared !== undefined,
        ...(declaredIsString ? { developerInstructions: declared } : {}),
      });
    }
    return agents;
  } catch {
    issues.push(
      issue(
        "QFAI-AGENT-006",
        "agent-catalog.yml could not be parsed",
        "error",
        rel,
        "agentDefinition.catalogParse",
      ),
    );
    return [];
  }
}

async function validateRouting(
  routingPath: string,
  catalogIds: Set<string>,
  issues: Issue[],
  root: string,
): Promise<Map<string, SkillRouting> | undefined> {
  const rel = manifestRelativePath(routingPath, root);
  // Collected during this walk rather than re-parsed by `validateSkillRoles`:
  // the per-skill routed set is exactly what the walk already resolves, and a
  // second parse could disagree with the one these findings came from.
  const routed = new Map<string, SkillRouting>();
  try {
    const parsed: unknown = parseYaml(await readFile(routingPath, "utf-8"));
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

    for (const [routeIndex, route] of routingRoot.routing.entries()) {
      if (!route || typeof route !== "object" || Array.isArray(route)) {
        continue;
      }
      const routeObj = route as Record<string, unknown>;
      const routedEntry = collectRouteHeader(
        routeObj,
        routed,
        issues,
        rel,
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
                rel,
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
                rel,
                "agentDefinition.rerunPolicy",
              ),
            );
          }
        }
        validateAgentRefs(
          rel,
          phaseObj.mandatory_agents,
          catalogIds,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          routeIndex,
          phaseIndex,
          "mandatory_agents",
        );
        validateAgentRefs(
          rel,
          phaseObj.conditional_agents,
          catalogIds,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          routeIndex,
          phaseIndex,
          "conditional_agents",
        );
        validateAgentRefs(
          rel,
          phaseObj.blocking_agents,
          catalogIds,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          routeIndex,
          phaseIndex,
          "blocking_agents",
        );
        if (Array.isArray(phaseObj.parallel_groups)) {
          for (const group of phaseObj.parallel_groups) {
            validateAgentRefs(
              rel,
              group,
              catalogIds,
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
          rel,
          phaseObj,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          phaseIndex,
        );
        if (routedEntry) {
          collectPhaseAgents(routedEntry, phaseObj, catalogIds);
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
  reviewerIds: Set<string>,
  issues: Issue[],
  root: string,
): Promise<Map<string, ProfileSelection> | undefined> {
  const rel = manifestRelativePath(profilesPath, root);
  // A profile selects reviewers a phase list never names, so `QFAI-AGENT-019`
  // and `QFAI-AGENT-015` need this side of the manifest too — the first before
  // it can call a profile-selected reviewer undeclared, the second before it
  // can call a declared role unreachable.
  const selections = new Map<string, ProfileSelection>();
  try {
    const parsed: unknown = parseYaml(await readFile(profilesPath, "utf-8"));
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
    const profiles = profilesRoot.profiles as Record<string, unknown>;
    for (const [profileName, profile] of Object.entries(profiles)) {
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        continue;
      }
      const profileObj = profile as Record<string, unknown>;
      // Before collecting: both readers below guard on `Array.isArray`, so
      // `always_required: completion-reviewer` produced an empty selection set
      // and no finding — a broken mandatory review gate that passed silently.
      // The result is carried on the selection because a truncated reviewer
      // list is not a short one: the roles cross-check has to know it is
      // reading a floor before it tells a skill to drop a declared reviewer.
      const shapesUsable = validateReviewerFieldShapes(profileObj, issues, profileName, rel);
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
        rel,
      );
      validateReviewerRefs(
        profileObj.conditional_required,
        reviewerIds,
        issues,
        profileName,
        "conditional",
        rel,
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

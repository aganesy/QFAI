import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { parseAgentFrontmatter } from "../agentFrontmatter.js";
import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

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
   * The catalog's copy of the agent body, when the entry carries one. Optional:
   * a catalog that omits the key is not stale, it simply does not duplicate the
   * markdown. Kept rather than discarded at parse time so QFAI-AGENT-014 can
   * compare it against the source.
   */
  developerInstructions?: string;
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
  const missionIndex = markdown.indexOf("## Mission");
  if (missionIndex < 0) return undefined;
  return markdown.slice(missionIndex);
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
 * Warning, not error: the derived copy is regenerable, and a stale block does
 * not make the tree unusable — it makes it ambiguous, which is exactly what a
 * warning is for.
 */
function checkDeveloperInstructions(
  agent: CatalogAgent,
  markdown: string,
  agentRel: string,
  catalogRel: string,
  issues: Issue[],
): void {
  const declared = agent.developerInstructions;
  if (declared === undefined) return;
  const canonical = canonicalAgentBody(markdown);
  if (canonical === undefined) return;
  if (normalizeBody(declared) === normalizeBody(canonical)) return;
  issues.push(
    issue(
      "QFAI-AGENT-014",
      `${catalogRel} agent "${agent.id}" developer_instructions diverges from the canonical body in ${agentRel}; the markdown file is the source, regenerate the catalog block from it`,
      "warning",
      catalogRel,
      "agentDefinition.developerInstructionsDrift",
      undefined,
      "canonical",
      undefined,
      { relatedFiles: [agentRel] },
    ),
  );
}

export async function validateAgentDefinition(root: string, _config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const agentsDir = path.join(root, ".qfai", "assistant", "agents");
  const catalogPath = await resolveManifestFile(root, "agent-catalog.yml");
  const routingPath = await resolveManifestFile(root, "agent-routing.yml");
  const profilesPath = await resolveManifestFile(root, "review-profiles.yml");

  if (!(await exists(agentsDir)) && !(await exists(catalogPath))) {
    return [];
  }

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
    checkDeveloperInstructions(agent, content, rel, catalogRel, issues);
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

  await validateRouting(routingPath, catalogIds, issues, root);
  await validateProfiles(profilesPath, reviewerIds, issues, root);

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

      agents.push({
        id: agent.id,
        kind: agent.kind,
        ...(typeof agent.developer_instructions === "string"
          ? { developerInstructions: agent.developer_instructions }
          : {}),
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
): Promise<void> {
  const rel = manifestRelativePath(routingPath, root);
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
      return;
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
      return;
    }

    for (const [routeIndex, route] of routingRoot.routing.entries()) {
      if (!route || typeof route !== "object" || Array.isArray(route)) {
        continue;
      }
      const routeObj = route as Record<string, unknown>;
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
): Promise<void> {
  const rel = manifestRelativePath(profilesPath, root);
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
      return;
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
      return;
    }
    const profiles = profilesRoot.profiles as Record<string, unknown>;
    for (const [profileName, profile] of Object.entries(profiles)) {
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        continue;
      }
      const profileObj = profile as Record<string, unknown>;
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
  }
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

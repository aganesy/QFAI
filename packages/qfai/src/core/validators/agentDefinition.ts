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
};

type RoutingPhase = {
  mandatory_agents?: unknown;
  conditional_agents?: unknown;
  blocking_agents?: unknown;
  parallel_groups?: unknown;
};

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

  const catalog = await readCatalog(catalogPath, issues);
  if (catalog.length === 0) {
    return issues;
  }

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

  await validateRouting(routingPath, catalogIds, issues);
  await validateProfiles(profilesPath, reviewerIds, issues);

  return issues;
}

async function readCatalog(catalogPath: string, issues: Issue[]): Promise<CatalogAgent[]> {
  try {
    const parsed: unknown = parseYaml(await readFile(catalogPath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push(
        issue(
          "QFAI-AGENT-006",
          "agent-catalog.yml must parse to an object",
          "error",
          ".qfai/assistant/steering/agent-catalog.yml",
          "agentDefinition.invalidCatalogShape",
        ),
      );
      return [];
    }

    const root = parsed as Record<string, unknown>;
    if (!Array.isArray(root.agents)) {
      issues.push(
        issue(
          "QFAI-AGENT-006",
          "agent-catalog.yml must contain agents array",
          "error",
          ".qfai/assistant/steering/agent-catalog.yml",
          "agentDefinition.invalidCatalogShape",
        ),
      );
      return [];
    }

    const agents: CatalogAgent[] = [];
    for (const [index, entry] of root.agents.entries()) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        issues.push(
          issue(
            "QFAI-AGENT-006",
            `agent-catalog.yml agents[${index}] must be an object`,
            "error",
            ".qfai/assistant/steering/agent-catalog.yml",
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
            ".qfai/assistant/steering/agent-catalog.yml",
            "agentDefinition.invalidCatalogEntry",
          ),
        );
        continue;
      }

      agents.push({
        id: agent.id,
        kind: agent.kind,
      });
    }
    return agents;
  } catch {
    issues.push(
      issue(
        "QFAI-AGENT-006",
        "agent-catalog.yml could not be parsed",
        "error",
        ".qfai/assistant/steering/agent-catalog.yml",
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
): Promise<void> {
  try {
    const parsed: unknown = parseYaml(await readFile(routingPath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push(
        issue(
          "QFAI-AGENT-007",
          "agent-routing.yml must parse to an object",
          "error",
          ".qfai/assistant/steering/agent-routing.yml",
          "agentDefinition.invalidRoutingShape",
        ),
      );
      return;
    }
    const root = parsed as Record<string, unknown>;
    if (!Array.isArray(root.routing)) {
      issues.push(
        issue(
          "QFAI-AGENT-007",
          "agent-routing.yml must contain routing array",
          "error",
          ".qfai/assistant/steering/agent-routing.yml",
          "agentDefinition.invalidRoutingShape",
        ),
      );
      return;
    }

    for (const [routeIndex, route] of root.routing.entries()) {
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
        validateAgentRefs(
          phaseObj.mandatory_agents,
          catalogIds,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          routeIndex,
          phaseIndex,
          "mandatory_agents",
        );
        validateAgentRefs(
          phaseObj.conditional_agents,
          catalogIds,
          issues,
          formatSkillLabel(routeObj.skill, routeIndex),
          routeIndex,
          phaseIndex,
          "conditional_agents",
        );
        validateAgentRefs(
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
        ".qfai/assistant/steering/agent-routing.yml",
        "agentDefinition.routingParse",
      ),
    );
  }
}

function validateAgentRefs(
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
          ".qfai/assistant/steering/agent-routing.yml",
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
): Promise<void> {
  try {
    const parsed: unknown = parseYaml(await readFile(profilesPath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push(
        issue(
          "QFAI-AGENT-009",
          "review-profiles.yml must parse to an object",
          "error",
          ".qfai/assistant/steering/review-profiles.yml",
          "agentDefinition.invalidProfilesShape",
        ),
      );
      return;
    }
    const root = parsed as Record<string, unknown>;
    if (!root.profiles || typeof root.profiles !== "object" || Array.isArray(root.profiles)) {
      issues.push(
        issue(
          "QFAI-AGENT-009",
          "review-profiles.yml must contain profiles object",
          "error",
          ".qfai/assistant/steering/review-profiles.yml",
          "agentDefinition.invalidProfilesShape",
        ),
      );
      return;
    }
    const profiles = root.profiles as Record<string, unknown>;
    for (const [profileName, profile] of Object.entries(profiles)) {
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        continue;
      }
      const profileObj = profile as Record<string, unknown>;
      validateReviewerRefs(profileObj.always_required, reviewerIds, issues, profileName, "always");
      validateReviewerRefs(
        profileObj.conditional_required,
        reviewerIds,
        issues,
        profileName,
        "conditional",
      );
    }
  } catch {
    issues.push(
      issue(
        "QFAI-AGENT-009",
        "review-profiles.yml could not be parsed",
        "error",
        ".qfai/assistant/steering/review-profiles.yml",
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
          ".qfai/assistant/steering/review-profiles.yml",
          "agentDefinition.nonReviewerInProfile",
        ),
      );
    }
  }
}

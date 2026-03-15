import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

const REQUIRED_AGENTS = [
  "uiux-expert.md",
  "design-expert.md",
  "screen-transition-expert.md",
  "navigation-expert.md",
  "integrated-uiux-reviewer.md",
];

const REQUIRED_SECTIONS = [
  "## Role",
  "## Responsibilities",
  "## Research-First Protocol",
  "## Phase Activities",
  "## Output Schema",
  "## Collaboration Rules",
];

const REQUIRED_PHASES = ["discussion", "SDD", "prototyping", "ATDD"];

export async function validateAgentDefinition(root: string, _config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const agentsDir = path.join(root, ".qfai", "assistant", "agents");

  // Only validate if agents directory exists (feature opt-in)
  if (!(await exists(agentsDir))) {
    return [];
  }

  // Check if at least one agent file exists to confirm feature adoption
  let anyAgentExists = false;
  for (const agentFile of REQUIRED_AGENTS) {
    if (await exists(path.join(agentsDir, agentFile))) {
      anyAgentExists = true;
      break;
    }
  }
  if (!anyAgentExists) {
    return [];
  }

  // Check all required agent files exist
  for (const agentFile of REQUIRED_AGENTS) {
    const filePath = path.join(agentsDir, agentFile);
    const rel = `.qfai/assistant/agents/${agentFile}`;

    if (!(await exists(filePath))) {
      issues.push(
        issue(
          "QFAI-AGENT-001",
          `Required agent definition file missing: ${rel}`,
          "error",
          rel,
          "agentDefinition.missingFile",
        ),
      );
      continue;
    }

    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      issues.push(
        issue(
          "QFAI-AGENT-002",
          `Agent definition file unreadable: ${rel}`,
          "error",
          rel,
          "agentDefinition.readFile",
        ),
      );
      continue;
    }

    // Check 6 required sections
    for (const section of REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        issues.push(
          issue(
            "QFAI-AGENT-003",
            `Missing required section "${section}" in ${rel}`,
            "error",
            rel,
            "agentDefinition.missingSection",
          ),
        );
      }
    }

    // Check Responsibilities has ≥3 items
    const respSection = extractSection(content, "## Responsibilities");
    if (respSection) {
      const bulletCount = (respSection.match(/^\s*-\s+/gm) ?? []).length;
      if (bulletCount < 3) {
        issues.push(
          issue(
            "QFAI-AGENT-004",
            `Responsibilities section has ${bulletCount} items (≥3 required) in ${rel}`,
            "error",
            rel,
            "agentDefinition.responsibilitiesCount",
          ),
        );
      }
    }

    // Check Phase Activities has 4 phases with ≥1 bullet each
    const phaseSection = extractSection(content, "## Phase Activities");
    if (phaseSection) {
      for (let i = 0; i < REQUIRED_PHASES.length; i++) {
        const phaseName = REQUIRED_PHASES[i];
        if (!phaseName) {
          continue;
        }
        const phaseRe = new RegExp(`###\\s+${phaseName}\\b`, "i");
        if (!phaseRe.test(phaseSection)) {
          issues.push(
            issue(
              "QFAI-AGENT-005",
              `Missing phase "${phaseName}" in Phase Activities of ${rel}`,
              "error",
              rel,
              "agentDefinition.missingPhase",
            ),
          );
        }
      }
    }

    // Check Collaboration Rules soft-separation statement
    const collabSection = extractSection(content, "## Collaboration Rules");
    if (collabSection) {
      const hasCollabStatement =
        /collaborat/i.test(collabSection) ||
        /協調/i.test(collabSection) ||
        /arbitrat/i.test(collabSection);
      if (!hasCollabStatement) {
        issues.push(
          issue(
            "QFAI-AGENT-006",
            `Collaboration Rules section lacks collaborative/arbitration statement in ${rel}`,
            "warning",
            rel,
            "agentDefinition.collaborationRules",
          ),
        );
      }
    }

    // Check integrated-uiux-reviewer specific: service_wide_impact field
    if (agentFile === "integrated-uiux-reviewer.md") {
      const outputSection = extractSection(content, "## Output Schema");
      if (outputSection && !outputSection.includes("service_wide_impact")) {
        issues.push(
          issue(
            "QFAI-AGENT-007",
            `Output Schema of integrated-uiux-reviewer.md must include "service_wide_impact" field`,
            "error",
            rel,
            "agentDefinition.serviceWideImpact",
          ),
        );
      }
    }
  }

  // Check review-roster.yml for integrated-uiux-reviewer entry
  const rosterPath = path.join(root, ".qfai", "assistant", "steering", "review-roster.yml");
  if (await exists(rosterPath)) {
    try {
      const rosterContent = await readFile(rosterPath, "utf-8");
      const roster: unknown = parseYaml(rosterContent);
      if (roster && typeof roster === "object") {
        const rosterObj = roster as Record<string, unknown>;
        const entries = Array.isArray(rosterObj.roster) ? rosterObj.roster : [];
        const hasIntegratedReviewer = entries.some(
          (entry: unknown) =>
            entry &&
            typeof entry === "object" &&
            (entry as Record<string, unknown>).id === "integrated-uiux-reviewer",
        );
        if (!hasIntegratedReviewer) {
          issues.push(
            issue(
              "QFAI-AGENT-008",
              'review-roster.yml is missing entry for "integrated-uiux-reviewer"',
              "warning",
              ".qfai/assistant/steering/review-roster.yml",
              "agentDefinition.rosterEntry",
            ),
          );
        }
      }
    } catch {
      // skip roster parse errors
    }
  }

  return issues;
}

function extractSection(content: string, heading: string): string | null {
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) return null;

  const afterHeading = content.slice(headingIndex + heading.length);
  const nextH2 = afterHeading.search(/^## /m);
  return nextH2 === -1 ? afterHeading : afterHeading.slice(0, nextH2);
}

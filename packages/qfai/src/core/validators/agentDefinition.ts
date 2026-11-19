import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { agentCardBody, parseAgentFrontmatter } from "../agentFrontmatter.js";
import { headingText, parseHeadings } from "../parse/markdown.js";
import { maskNonSpecRegions } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

const REQUIRED_AGENT_SECTIONS = [
  "Mission",
  "Domain Responsibilities",
  "Inputs you must read",
  "Deliverables",
  "Stop conditions",
  "Sign-off",
];

/**
 * The level-2 section titles a card body declares.
 *
 * Only a real heading counts. A required title that appears in prose, in a
 * fenced or indented sample, in an HTML comment or block, or in the frontmatter
 * does not open the section, so matching the raw text let a card pass while
 * missing it.
 */
function cardSectionTitles(content: string): Set<string> {
  const body = maskNonSpecRegions(agentCardBody(content));
  return new Set(
    parseHeadings(body)
      .filter((heading) => heading.level === 2)
      .map((heading) => headingText(heading.title)),
  );
}

export async function validateAgentDefinition(root: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const agentsDir = path.join(root, ".qfai", "assistant", "agent");
  if (!(await exists(agentsDir))) {
    return [];
  }
  for (const name of await readdir(agentsDir)) {
    if (!name.endsWith(".md")) continue;
    const id = name.slice(0, -3);
    const filePath = path.join(agentsDir, name);
    const rel = `.qfai/assistant/agent/${name}`;

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
    const titles = cardSectionTitles(content);
    for (const section of REQUIRED_AGENT_SECTIONS) {
      if (!titles.has(section)) {
        issues.push(
          issue(
            "QFAI-AGENT-005",
            `Missing required section "## ${section}" in ${rel}`,
            "error",
            rel,
            "agentDefinition.missingRequiredSection",
          ),
        );
      }
    }
  }

  return issues;
}

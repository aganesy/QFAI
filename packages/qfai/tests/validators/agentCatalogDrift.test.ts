/**
 * `agent-catalog.yml` embeds a verbatim copy of every agent body under
 * `developer_instructions`, and `qfai init` ships both trees. Nothing compared
 * them: `readCatalog` discarded the field at parse time and the four per-agent
 * rules never looked at it, so a project that customised an agent kept two
 * disagreeing copies of the same instructions and `qfai validate` reported
 * nothing.
 *
 * `QFAI-AGENT-014` is the consumer-side signal. It is a warning because the
 * catalog block is derived and regenerable — a stale one makes the tree
 * ambiguous, not broken.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";

const AGENT_MD = `---
name: qa-gatekeeper
description: "Guard the gates."
tools: [Read]
---

# QA Gatekeeper

## Mission

- Guard the validation gates.

## Domain Responsibilities

- Run the gates.

## Inputs you must read

- .qfai/assistant/constitution/

## Deliverables

- Gate report

## Stop conditions

- Gate evidence missing

## Sign-off

- [ ] Gates are PASS
`;

const CANONICAL_BODY = AGENT_MD.slice(AGENT_MD.indexOf("## Mission")).trimEnd();

const ROUTING = `routing:
  - skill: demo-skill
    phases:
      - id: only
        mandatory_agents: [qa-gatekeeper]
        blocking_agents: [qa-gatekeeper]
    review_profile: default
`;

const PROFILES = `profiles:
  default:
    always_required: [qa-gatekeeper]
`;

function catalogWith(developerInstructions: string | undefined): string {
  const head = `agents:
  - id: qa-gatekeeper
    kind: reviewer
`;
  if (developerInstructions === undefined) return head;
  const block = developerInstructions
    .split("\n")
    .map((line) => (line.length === 0 ? "" : `      ${line}`))
    .join("\n");
  return `${head}    developer_instructions: |\n${block}\n`;
}

async function runCatalog(catalog: string, agentMarkdown: string = AGENT_MD): Promise<Issue[]> {
  const root = path.join(
    os.tmpdir(),
    `qfai-agent-catalog-drift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const manifest = path.join(root, ".qfai", "assistant", "manifest");
  const agents = path.join(root, ".qfai", "assistant", "agents");
  await mkdir(manifest, { recursive: true });
  await mkdir(agents, { recursive: true });
  try {
    await writeFile(path.join(manifest, "agent-catalog.yml"), catalog);
    await writeFile(path.join(manifest, "agent-routing.yml"), ROUTING);
    await writeFile(path.join(manifest, "review-profiles.yml"), PROFILES);
    await writeFile(path.join(agents, "qa-gatekeeper.md"), agentMarkdown);
    return await validateAgentDefinition(root, defaultConfig);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function runWith(
  developerInstructions: string | undefined,
  agentMarkdown: string = AGENT_MD,
): Promise<Issue[]> {
  const issues = await runCatalog(catalogWith(developerInstructions), agentMarkdown);
  return issues.filter((entry) => entry.code === "QFAI-AGENT-014");
}

describe("QFAI-AGENT-014 — agent-catalog developer_instructions drift", () => {
  it("warns when the entry carries no copy at all", async () => {
    // Deleting the block is the cheapest way to defeat the comparison, and it
    // starves the loaders that read the catalog and nothing else. Same warning
    // severity as a stale block: the copy is derived, so the repair is
    // mechanical either way.
    const found = await runWith(undefined);

    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.message).toContain("no developer_instructions block");
    expect(found[0]?.message).toContain("qa-gatekeeper");
    expect(found[0]?.file).toBe(".qfai/assistant/manifest/agent-catalog.yml");
  });

  it("stays silent when the copy matches the canonical body", async () => {
    expect(await runWith(CANONICAL_BODY)).toEqual([]);
  });

  it("tolerates trailing-whitespace and CRLF differences", async () => {
    // The copy travels through a YAML block scalar and, on Windows, through a
    // checkout that rewrites line endings. Neither is a content change.
    const noisy = `${CANONICAL_BODY.replace(/\n/g, "\r\n")}\r\n\r\n`;
    expect(await runWith(noisy)).toEqual([]);
  });

  it("warns when the copy diverges from the canonical body", async () => {
    // The exact case observed in the field: the markdown was edited, the
    // catalog block was not.
    const stale = CANONICAL_BODY.replace("- Guard the validation gates.", "- Guard the old gates.");
    const found = await runWith(stale);

    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.message).toContain("qa-gatekeeper");
    expect(found[0]?.message).toContain(".qfai/assistant/agents/qa-gatekeeper.md");
    // The finding points at the derived copy — the file the author must fix.
    expect(found[0]?.file).toBe(".qfai/assistant/manifest/agent-catalog.yml");
  });

  it("ignores a `## Mission` mentioned inside the frontmatter", async () => {
    // The body starts at the heading *line*, not at the first occurrence of the
    // string: a description that names the section must not drag the
    // frontmatter and the title into the comparison.
    const chatty = AGENT_MD.replace('"Guard the gates."', '"See ## Mission below."');
    const canonical = chatty.slice(chatty.lastIndexOf("\n## Mission") + 1).trimEnd();

    expect(await runWith(canonical, chatty)).toEqual([]);
  });

  it("reports a non-string developer_instructions as a catalog shape error", async () => {
    // `developer_instructions:` with no value parses to null. Dropping it
    // silently would let the drift rule treat a broken derived copy as an
    // absent one, and `qfai validate` would say nothing at all.
    const broken = `agents:
  - id: qa-gatekeeper
    kind: reviewer
    developer_instructions:
`;
    const issues = await runCatalog(broken);
    const shape = issues.filter((entry) => entry.code === "QFAI-AGENT-006");

    expect(shape).toHaveLength(1);
    expect(shape[0]?.severity).toBe("error");
    expect(shape[0]?.message).toContain("developer_instructions must be a string");
    // The entry keeps its identity, so the shape error is the only finding:
    // the routing and profile rules still see qa-gatekeeper in the catalog.
    expect(issues.map((entry) => entry.code)).toEqual(["QFAI-AGENT-006"]);
  });

  it("defers to QFAI-AGENT-005 when the markdown has no ## Mission section", async () => {
    // Two findings for one missing heading would be noise; the required-section
    // rule already names it.
    const withoutMission = AGENT_MD.replace("## Mission", "## Purpose");
    expect(await runWith(CANONICAL_BODY, withoutMission)).toEqual([]);
  });
});

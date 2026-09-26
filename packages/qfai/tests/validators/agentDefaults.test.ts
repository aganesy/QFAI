import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseAgentFrontmatter } from "../../src/core/agentFrontmatter.js";
import { defaultConfig } from "../../src/core/config.js";
import { parseAgentCardKind, renderCodexAgentToml } from "../../src/core/codexAgentToml.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";

const CARD = `---
name: completion-reviewer
description: Reviews completed work.
tools: [Read]
kind: reviewer
domain: quality
mission: Check completion evidence.
replaces: []
owned_artifacts: [review-report]
tool_profile: read-only
permission_profile: read-only
specialization_tags: [review]
---

# Completion Reviewer

## Mission

Check completion evidence.

## Domain Responsibilities

Review the work.

## Inputs you must read

Read the spec.

## Deliverables

Return a verdict.

## Stop conditions

Stop on missing evidence.

## Sign-off

Record the verdict.
`;

const tempRoots: string[] = [];

afterEach(async () => {
  for (const root of tempRoots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-agent-defaults-"));
  tempRoots.push(root);
  const cardDir = path.join(root, ".qfai", "assistant", "agent");
  await mkdir(cardDir, { recursive: true });
  await writeFile(path.join(cardDir, "completion-reviewer.md"), CARD);
  return root;
}

describe("agent cards and package defaults", () => {
  it("requires mission as its own frontmatter key", () => {
    const missing = parseAgentFrontmatter(
      CARD.replace("mission: Check completion evidence.\n", ""),
    );
    expect(missing).toEqual({
      ok: false,
      error: "frontmatter.mission must be a non-empty string",
    });
  });

  it("reports a missing mission on the card", async () => {
    const root = await project();
    await writeFile(
      path.join(root, ".qfai", "assistant", "agent", "completion-reviewer.md"),
      CARD.replace("mission: Check completion evidence.\n", ""),
    );
    const issues = await validateAgentDefinition(root, defaultConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-AGENT-011")).toEqual([
      expect.objectContaining({
        file: ".qfai/assistant/agent/completion-reviewer.md",
        message: expect.stringContaining("frontmatter.mission"),
      }),
    ]);
  });

  it("uses the card kind for reviewer sandboxing", () => {
    expect(parseAgentCardKind(CARD, "completion-reviewer")).toBe("reviewer");
    expect(parseAgentCardKind(CARD, "other")).toBeNull();
    const rendered = renderCodexAgentToml(CARD, "reviewer", "completion-reviewer");
    expect(rendered.ok).toBe(true);
    if (rendered.ok) expect(rendered.toml).toContain('sandbox_mode = "read-only"');
    expect(renderCodexAgentToml(CARD, "worker", "completion-reviewer")).toEqual({
      ok: false,
      error: "frontmatter.kind does not match worker",
    });
  });

  it("uses package defaults without project manifest files and replaces a route whole", async () => {
    const root = await project();
    const issues = await validateAgentDefinition(root, {
      ...defaultConfig,
      routing: [
        {
          skill: "qfai-sdd",
          phases: [{ id: "review", mandatory_agents: ["completion-reviewer"] }],
          review_profile: "default",
        },
      ],
    });
    expect(issues.some((entry) => /^QFAI-AGENT-00[1-3]$/.test(entry.code))).toBe(false);
    expect(
      issues.filter(
        (entry) => entry.code === "QFAI-AGENT-008" && entry.message.includes("qfai-sdd"),
      ),
    ).toEqual([]);
  });

  it("reports an override's unknown agent at qfai.config.yaml", async () => {
    const root = await project();
    const issues = await validateAgentDefinition(root, {
      ...defaultConfig,
      routing: [
        {
          skill: "qfai-sdd",
          phases: [{ id: "review", mandatory_agents: ["missing-reviewer"] }],
          review_profile: "default",
        },
      ],
    });
    expect(
      issues.filter(
        (entry) => entry.code === "QFAI-AGENT-008" && entry.message.includes("missing-reviewer"),
      ),
    ).toEqual([expect.objectContaining({ file: "qfai.config.yaml" })]);
  });
});

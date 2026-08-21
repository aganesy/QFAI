/**
 * A skill's `roles:` frontmatter and `agent-routing.yml` both declare who may
 * act inside that skill, and until now nothing compared them.
 *
 * `QFAI-AGENT-008` checks a routed id against the agent catalog, so the
 * manifest cannot name an agent that does not exist — but a skill could omit
 * an agent the manifest routes to it (including a mandatory, blocking one)
 * and a skill could grant a role no phase and no review profile ever
 * dispatches. Both directions are checked here.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";
import type { Issue } from "../../src/core/types.js";

// tests/validators/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const shippedRoot = path.join(packageRoot, "assets", "init");

const CATALOG = `agents:
  - id: delivery-planner
    kind: worker
  - id: qa-strategist
    kind: worker
  - id: completion-reviewer
    kind: reviewer
  - id: implementation-reviewer
    kind: reviewer
`;

const PROFILES = `profiles:
  demo-profile:
    always_required: [completion-reviewer]
    conditional_required: [implementation-reviewer]
`;

type Fixture = {
  /** Omit to write no SKILL.md at all. */
  roles?: readonly string[];
  mandatory?: readonly string[];
  conditional?: readonly string[];
  blocking?: readonly string[];
};

async function runFixture(fixture: Fixture): Promise<Issue[]> {
  const root = path.join(
    os.tmpdir(),
    `qfai-skill-roles-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const manifest = path.join(root, ".qfai", "assistant", "manifest");
  await mkdir(manifest, { recursive: true });
  await mkdir(path.join(root, ".qfai", "assistant", "agents"), { recursive: true });
  try {
    await writeFile(path.join(manifest, "agent-catalog.yml"), CATALOG, "utf-8");
    await writeFile(path.join(manifest, "review-profiles.yml"), PROFILES, "utf-8");
    await writeFile(
      path.join(manifest, "agent-routing.yml"),
      [
        "routing:",
        "  - skill: demo-skill",
        "    phases:",
        "      - id: only",
        `        mandatory_agents: [${(fixture.mandatory ?? []).join(", ")}]`,
        `        conditional_agents: [${(fixture.conditional ?? []).join(", ")}]`,
        "        parallel_groups: []",
        `        blocking_agents: [${(fixture.blocking ?? []).join(", ")}]`,
        "    review_profile: demo-profile",
        "",
      ].join("\n"),
      "utf-8",
    );
    if (fixture.roles) {
      const skillDir = path.join(root, ".qfai", "assistant", "skills", "demo-skill");
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        path.join(skillDir, "SKILL.md"),
        [
          "---",
          "name: demo-skill",
          `roles: [${fixture.roles.join(", ")}]`,
          "---",
          "",
          "# Demo",
          "",
        ].join("\n"),
        "utf-8",
      );
    }
    const issues = await validateAgentDefinition(root, defaultConfig);
    return issues.filter(
      (entry) => entry.code === "QFAI-AGENT-014" || entry.code === "QFAI-AGENT-015",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("QFAI-AGENT-014 — routed agents must be declared in the skill's roles:", () => {
  it("reports an error when a mandatory routed agent is absent from roles:", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner"],
      mandatory: ["delivery-planner", "completion-reviewer"],
      blocking: ["completion-reviewer"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-014");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toContain("completion-reviewer");
    expect(issues[0]?.file).toBe(".qfai/assistant/skills/demo-skill/SKILL.md");
  });

  it("reports a warning when only a conditional routed agent is absent from roles:", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
      conditional: ["qa-strategist"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-014");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("qa-strategist");
  });

  it("passes when every routed agent is declared", async () => {
    const issues = await runFixture({
      roles: [
        "delivery-planner",
        "qa-strategist",
        "completion-reviewer",
        "implementation-reviewer",
      ],
      mandatory: ["delivery-planner"],
      conditional: ["qa-strategist"],
      blocking: ["delivery-planner"],
    });
    expect(issues).toEqual([]);
  });

  it("stays silent for a routed skill that ships no SKILL.md", async () => {
    const issues = await runFixture({ mandatory: ["delivery-planner"] });
    expect(issues).toEqual([]);
  });
});

describe("QFAI-AGENT-015 — declared roles must be selectable", () => {
  it("reports a warning for a role no phase and no review profile selects", async () => {
    const issues = await runFixture({
      roles: [
        "delivery-planner",
        "completion-reviewer",
        "implementation-reviewer",
        "qa-strategist",
      ],
      mandatory: ["delivery-planner"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-AGENT-015");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("qa-strategist");
  });

  it("accepts a role that only the declared review profile selects", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
    });
    expect(issues).toEqual([]);
  });

  it("accepts orchestrator, which is dispatched outside the routing manifest", async () => {
    const issues = await runFixture({
      roles: ["orchestrator", "delivery-planner", "completion-reviewer", "implementation-reviewer"],
      mandatory: ["delivery-planner"],
    });
    expect(issues).toEqual([]);
  });
});

describe("shipped manifests and skills agree", () => {
  it("emits no roles/routing divergence for the shipped assistant tree", async () => {
    const issues = await validateAgentDefinition(shippedRoot, defaultConfig);
    const divergences = issues
      .filter((entry) => entry.code === "QFAI-AGENT-014" || entry.code === "QFAI-AGENT-015")
      .map((entry) => entry.message);
    expect(divergences).toEqual([]);
  });
});

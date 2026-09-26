import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig, type QfaiRoutingEntry } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";

const AGENTS = [
  ["delivery-planner", "worker"],
  ["completion-reviewer", "reviewer"],
  ["implementation-reviewer", "reviewer"],
] as const;

function card(name: string, kind: "worker" | "reviewer"): string {
  return `---
name: ${name}
description: ${name} card.
tools: [Read]
kind: ${kind}
domain: quality
mission: Perform the assigned role.
replaces: []
owned_artifacts: []
tool_profile: read-only
permission_profile: read-only
specialization_tags: []
---

# ${name}

## Mission

Perform the assigned role.

## Domain Responsibilities

Follow the spec.

## Inputs you must read

Read the inputs.

## Deliverables

Return the result.

## Stop conditions

Stop on missing evidence.

## Sign-off

Record the verdict.
`;
}

type Fixture = {
  roles?: string[] | string;
  routingProfile?: string;
  route?: QfaiRoutingEntry;
  rawSkill?: string;
};

async function runFixture(fixture: Fixture): Promise<Issue[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-skill-roles-"));
  try {
    const agentDir = path.join(root, ".qfai", "assistant", "agent");
    const skillDir = path.join(root, ".qfai", "assistant", "skill", "demo-skill");
    await mkdir(agentDir, { recursive: true });
    await mkdir(skillDir, { recursive: true });
    for (const [name, kind] of AGENTS) {
      await writeFile(path.join(agentDir, `${name}.md`), card(name, kind));
    }
    const rolesLine =
      fixture.roles === undefined
        ? []
        : [
            `roles: ${Array.isArray(fixture.roles) ? `[${fixture.roles.join(", ")}]` : fixture.roles}`,
          ];
    const skill =
      fixture.rawSkill ??
      [
        "---",
        "name: demo-skill",
        ...rolesLine,
        ...(fixture.routingProfile ? [`routing-profile: ${fixture.routingProfile}`] : []),
        "---",
        "",
        "# Demo",
      ].join("\n");
    await writeFile(path.join(skillDir, "SKILL.md"), skill);
    const route = fixture.route ?? {
      skill: "demo-skill",
      phases: [
        {
          id: "review",
          mandatory_agents: ["delivery-planner", "completion-reviewer"],
          conditional_agents: ["implementation-reviewer"],
          blocking_agents: ["completion-reviewer"],
        },
      ],
      review_profile: "demo-profile",
    };
    const issues = await validateAgentDefinition(root, {
      ...defaultConfig,
      routing: [route],
      reviewProfiles: {
        "demo-profile": {
          always_required: ["completion-reviewer"],
          conditional_required: ["implementation-reviewer"],
        },
      },
    });
    return issues.filter(
      (issue) => issue.file?.includes("demo-skill") || issue.file === "qfai.config.yaml",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("skill roles against effective routing", () => {
  it("accepts all required and conditional agents", async () => {
    expect(
      await runFixture({
        roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
        routingProfile: "demo-profile",
      }),
    ).toEqual([]);
  });

  it("rejects a missing required role and warns on a conditional omission", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner"],
      routingProfile: "demo-profile",
    });
    expect(issues.filter((issue) => issue.code === "QFAI-AGENT-019")).toEqual([
      expect.objectContaining({ severity: "error" }),
      expect.objectContaining({ severity: "warning" }),
    ]);
  });

  it("reports a stale role", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer", "unused"],
      routingProfile: "demo-profile",
    });
    expect(issues.filter((issue) => issue.code === "QFAI-AGENT-015")).toEqual([
      expect.objectContaining({ message: expect.stringContaining("unused") }),
    ]);
  });

  it("rejects unusable roles frontmatter", async () => {
    const issues = await runFixture({ roles: "delivery-planner", routingProfile: "demo-profile" });
    expect(issues.some((issue) => issue.code === "QFAI-AGENT-016")).toBe(true);
  });

  it("reports a missing route for a bound skill", async () => {
    const issues = await runFixture({
      roles: ["completion-reviewer"],
      routingProfile: "demo-profile",
      route: { skill: "demo-skill", phases: [], review_profile: "demo-profile" },
    });
    expect(issues.some((issue) => issue.code === "QFAI-AGENT-017")).toBe(true);
  });

  it("reports an inconsistent review profile", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      routingProfile: "different-profile",
    });
    expect(issues.some((issue) => issue.code === "QFAI-AGENT-018")).toBe(true);
  });

  it("reports a route through a profile that does not exist", async () => {
    const issues = await runFixture({
      roles: ["delivery-planner", "completion-reviewer", "implementation-reviewer"],
      route: {
        skill: "demo-skill",
        phases: [{ id: "review", mandatory_agents: ["completion-reviewer"] }],
        review_profile: "missing-profile",
      },
    });
    expect(issues.some((issue) => issue.code === "QFAI-AGENT-018")).toBe(true);
  });

  it("reports an unusable routing-profile declaration", async () => {
    const issues = await runFixture({
      roles: ["completion-reviewer"],
      rawSkill: "---\nname: demo-skill\nroles: [completion-reviewer]\nrouting-profile: []\n---\n",
    });
    expect(issues.some((issue) => issue.code === "QFAI-AGENT-016")).toBe(true);
  });

  it("reports a scalar phase agent list", async () => {
    const issues = await runFixture({
      roles: ["completion-reviewer"],
      route: {
        skill: "demo-skill",
        phases: [{ id: "review", mandatory_agents: "completion-reviewer" }],
        review_profile: "demo-profile",
      },
    });
    expect(issues.some((issue) => issue.code === "QFAI-AGENT-013")).toBe(true);
  });

  it("reports an unknown agent in a project route override", async () => {
    const issues = await runFixture({
      roles: ["completion-reviewer"],
      route: {
        skill: "demo-skill",
        phases: [{ id: "review", mandatory_agents: ["missing-agent"] }],
        review_profile: "demo-profile",
      },
    });
    expect(issues.filter((issue) => issue.code === "QFAI-AGENT-008")).toEqual([
      expect.objectContaining({ file: "qfai.config.yaml" }),
    ]);
  });

  it("allows the invoking orchestrator as an external role", async () => {
    const issues = await runFixture({
      roles: ["orchestrator", "delivery-planner", "completion-reviewer", "implementation-reviewer"],
      routingProfile: "demo-profile",
    });
    expect(issues.filter((issue) => issue.code === "QFAI-AGENT-015")).toEqual([]);
  });
});

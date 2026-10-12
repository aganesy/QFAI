import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readImplementFlowSteps } from "../helpers/implementSteps.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const implementSkillPath = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skill",
  "qfai-implement",
  "SKILL.md",
);
const implementAssistantDir = path.join(templateRoot, ".qfai", "assistant");

describe("E2E: sub-agent roster formalization", () => {
  it("SKILL.md defines a formal routed specialist roster", async () => {
    const content = await readImplementFlowSteps(implementAssistantDir);
    expect(content).toContain("roles:");
    expect(content).toContain("delivery-planner");
    expect(content).toContain("frontend-engineer");
    expect(content).toContain("backend-engineer");
  });
});

describe("E2E: evidence contract hardening", () => {
  it("SKILL.md defines minimum evidence with command+result pairs", async () => {
    const content = await readImplementFlowSteps(implementAssistantDir);
    expect(content).toContain("The stage report gives each example its own");
    expect(content).toContain("RED, GREEN, and Refactor commands and observed results");
    expect(content).toContain("Evidence without a command and result pair does not prove a");
  });
});

describe("E2E: parallel dispatch rules", () => {
  it("SKILL.md defines allow/deny conditions and delivery-planner authority", async () => {
    // Full conditions live in references/parallelization-policy.md.
    const content = await readImplementFlowSteps(implementAssistantDir);
    const policy = (
      await readFile(
        path.join(path.dirname(implementSkillPath), "references", "parallelization-policy.md"),
        "utf-8",
      )
    ).replace(/\s*\n\s*/g, " ");
    expect(content).toContain("Work one EX at a time by default");
    expect(policy).toContain("explicit user approval and a delivery-planner PASS");
    expect(policy).toContain("Deny parallel dispatch when two items write the same shared fixture");
    expect(policy).toMatch(/each worker.*exact file ownership list.*checkout assigned by the host/);
    expect(policy).toMatch(
      /separate worktrees when.*host supports editing.*otherwise.*shared-index mode/,
    );
    expect(policy).toContain(
      ".qfai/assistant/rule/workflow.md#concurrency-stage-independent-mandatory",
    );
    expect(policy).toMatch(/Creating a worktree does not grant edit permission/);
    expect(policy).toMatch(
      /refused edit.*shared-skill-delegation-baseline\.md#worker-edit-boundary/,
    );
    expect(policy).toContain("Workers do not change another worker's files or the story tree.");
    expect(policy).toMatch(
      /orchestrator integrates their results and resolves every overlap before judging either item complete/,
    );
    expect(policy).toContain("After integration, rerun every item selector on the merged tree");
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

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

describe("E2E: sub-agent roster formalization", () => {
  it("SKILL.md defines a formal routed specialist roster", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).toContain("roles:");
    expect(content).toContain("delivery-planner");
    expect(content).toContain("frontend-engineer");
    expect(content).toContain("backend-engineer");
    expect(content).toContain("qa-gatekeeper");
    expect(content).toContain("implementation-reviewer");
    expect(content).toContain("completion-reviewer");
  });
});

describe("E2E: completion contract hardening", () => {
  it("SKILL.md has item completion checklist, spec completion, and prohibition conditions", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).toContain("### Completion gate");
    expect(content).toContain("Report the flow complete only when:");
    expect(content).toContain(
      "Every implemented EX has an observed RED, GREEN and Refactor result",
    );
    expect(content).toContain("A failing or unrun gate cannot be reported as PASS.");
  });
});

describe("E2E: evidence contract hardening", () => {
  it("SKILL.md defines minimum evidence with command+result pairs", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).toContain(".qfai/evidence/implement-BF-NNNN.md");
    expect(content).toContain("RED, GREEN, and Refactor commands and observed results");
    expect(content).toContain("Evidence without a command and result pair does not prove a");
  });
});

describe("E2E: parallel dispatch rules", () => {
  it("SKILL.md defines allow/deny conditions and delivery-planner authority", async () => {
    // Full conditions live in references/parallelization-policy.md.
    const content = await readFile(implementSkillPath, "utf-8");
    const policy = await readFile(
      path.join(path.dirname(implementSkillPath), "references", "parallelization-policy.md"),
      "utf-8",
    );
    expect(content).toContain("Work one EX at a time by default");
    expect(policy).toContain("explicit user approval and a delivery-planner PASS");
    expect(policy).toContain("Deny parallel dispatch when two items write the same shared fixture");
    expect(policy).toContain(
      "Give each worker a separate worktree and an exact file ownership list",
    );
    expect(policy).toContain("After integration, rerun every item selector on the merged tree");
  });
});

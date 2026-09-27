import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const skillPath = "assistant/skill/qfai-implement/SKILL.md";
const policyPath = "assistant/skill/qfai-implement/references/parallelization-policy.md";

const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");

describe.each(trees)("%s — qfai-implement parallel item policy", (tree) => {
  it("starts with one example and requires both independence and consent", async () => {
    const [skill, policy] = await Promise.all([read(tree, skillPath), read(tree, policyPath)]);
    expect(skill).toContain("Work one EX at a time by default.");
    expect(skill).toContain("Parallel work requires disjoint");
    expect(skill).toContain("writes, a passing technical gate, and the required user consent.");
    expect(policy).toContain("Process one open EX at a time in ascending ID order");
    expect(policy).toContain("explicit user approval and a delivery-planner PASS");
    expect(policy).toContain(
      "Parallel role review of one item does not require parallel item authorization.",
    );
  });

  it("checks dependency and shared runtime conflicts before dispatch", async () => {
    const policy = await read(tree, policyPath);
    expect(policy).toContain("Disjoint filenames alone are insufficient");
    for (const dependency of [
      "read and write sets",
      "imports",
      "shared fixtures",
      "persistence",
      "generated assets",
      "external process state",
      "shared resources such as ports",
    ]) {
      expect(policy).toContain(dependency);
    }
    expect(policy).toContain("If any dependency is uncertain, use serial execution.");
  });

  it("isolates workers and keeps one integrator responsible for overlap", async () => {
    const policy = await read(tree, policyPath);
    expect(policy).toContain(
      "Give each worker a separate worktree and an exact file ownership list.",
    );
    expect(policy).toContain("Workers do not change another worker's files or the story tree.");
    expect(policy).toContain(
      "The orchestrator integrates their results and resolves every overlap",
    );
  });

  it("rechecks the merged result and refreshes revision-bound evidence", async () => {
    const [skill, policy] = await Promise.all([read(tree, skillPath), read(tree, policyPath)]);
    expect(skill).toContain("Review the");
    expect(skill).toContain("integrated result after slices join.");
    expect(policy).toContain("rerun every item selector on the merged tree");
    expect(policy).toContain("the relevant suites");
    expect(policy).toContain("qfai validate --profile tdd --fail-on error --flow BF-NNNN");
    expect(policy).toContain("Retake evidence whose source revision changed");
    expect(policy).toContain("A worker's isolated PASS is not an integrated PASS.");
    expect(policy).toContain("stop parallel dispatch and repair serially");
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");

describe.each(trees)("%s — post-integration verification remedy", (tree) => {
  it("verifies the merged tree before accepting worker results", async () => {
    const policy = await read(
      tree,
      "assistant/skill/qfai-implement/references/parallelization-policy.md",
    );
    expect(policy).toContain("rerun every item selector on the merged tree");
    expect(policy).toContain("the relevant suites");
    expect(policy).toContain("qfai validate --profile tdd --fail-on error --flow BF-NNNN");
    expect(policy).toContain("A worker's isolated PASS is not an integrated PASS.");
  });

  it("attributes known defects to the owning item and repairs combination defects serially", async () => {
    const policy = await read(
      tree,
      "assistant/skill/qfai-implement/references/parallelization-policy.md",
    );
    expect(policy).toContain("assign the defect to the owning item when the dependency is known");
    expect(policy).toContain("When the combination itself causes the failure");
    expect(policy).toContain("stop parallel dispatch and repair serially");
    expect(policy).toContain("Record the decision and results in the flow evidence.");
    expect(policy).not.toContain("roll back the merge");
  });

  it("retakes evidence and reviews for changed source revisions", async () => {
    const [policy, skill] = await Promise.all([
      read(tree, "assistant/skill/qfai-implement/references/parallelization-policy.md"),
      read(tree, "assistant/skill/qfai-implement/SKILL.md"),
    ]);
    expect(policy).toContain("Retake evidence whose source revision changed");
    expect(policy).toContain("request the required reviews on that revision");
    expect(skill).toContain("Review the");
    expect(skill).toContain("integrated result after slices join.");
  });
});

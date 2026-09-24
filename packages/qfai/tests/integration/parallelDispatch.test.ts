import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const skillDir = path.join(getInitAssetsDir(), ".qfai", "assistant", "skill", "qfai-implement");
const policyPath = path.join(skillDir, "references", "parallelization-policy.md");

describe("parallel EX dispatch and integration", () => {
  it("requires user approval and delivery-planner PASS before parallel item work", async () => {
    const policy = await readFile(policyPath, "utf-8");
    expect(policy).toMatch(/Process one open EX at a time in ascending ID order/);
    expect(policy).toMatch(
      /Parallel item work requires explicit user approval and a delivery-planner PASS on concrete independence/,
    );
    expect(policy).toMatch(
      /Parallel role review of one item does not require parallel item authorization/,
    );
  });

  it("checks shared dependencies and serializes uncertain work", async () => {
    const policy = await readFile(policyPath, "utf-8");
    expect(policy).toMatch(/Disjoint filenames alone are insufficient/);
    expect(policy).toMatch(
      /compare read and write sets, imports, shared fixtures, persistence, generated assets, and external process state/,
    );
    expect(policy).toMatch(/If any dependency is uncertain, use serial execution/);
  });

  it("separates worktrees, gives exact ownership, and integrates before completion", async () => {
    const policy = await readFile(policyPath, "utf-8");
    expect(policy).toMatch(/Give each worker a separate worktree and an exact file ownership list/);
    expect(policy).toMatch(
      /integrates their results and resolves every overlap before judging either item complete/,
    );
  });

  it("reruns integrated selectors, suites, validation, evidence, and reviews", async () => {
    const policy = await readFile(policyPath, "utf-8");
    expect(policy).toMatch(
      /rerun every item selector on the merged tree, the relevant suites, and qfai validate --profile tdd --fail-on error --flow BF-NNNN/,
    );
    expect(policy).toMatch(
      /Retake evidence whose source revision changed and request the required reviews on that revision/,
    );
    expect(policy).toMatch(/A worker's isolated PASS is not an integrated PASS/);
  });

  it("assigns a known integration defect or stops parallel dispatch for a combination failure", async () => {
    const policy = await readFile(policyPath, "utf-8");
    expect(policy).toMatch(/assign the defect to the owning item when the dependency is known/);
    expect(policy).toMatch(
      /When the combination itself causes the failure, stop parallel dispatch and repair serially/,
    );
    expect(policy).toMatch(/Record the decision and results in the flow evidence/);
  });
});

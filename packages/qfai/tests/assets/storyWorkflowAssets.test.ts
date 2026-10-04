import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readImplementFlowSteps } from "../helpers/implementSteps.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistant = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");

async function read(relative: string): Promise<string> {
  return await readFile(path.join(assistant, relative), "utf8");
}

describe("story-tree acceptance and implementation assets", () => {
  it("selects affected suites through imports and reruns shared consumers", async () => {
    const suite = await read("skill/qfai-implement/references/relevant-test-suite.md");
    expect(suite).toContain("current QFAI:EX annotation");
    expect(suite).toContain("Follow imports and test data consumers");
    expect(suite).toContain("run only the selected example test");
    expect(suite).toContain("Standard commands");
  });

  it("permits parallel EX work only on declared independent seams", async () => {
    const policy = await read("skill/qfai-implement/references/parallelization-policy.md");
    expect(policy).toContain("explicit user approval and a delivery-planner PASS");
    expect(policy).toContain("compare read and write sets");
    expect(policy).toContain("If any dependency is uncertain, use serial execution");
    expect(policy).toContain("A worker's isolated PASS is not an integrated PASS");
  });

  it("traces cross-flow consumers before editing and revalidates each affected BF", async () => {
    const ownership = await read("skill/qfai-implement/references/cross-spec-ownership.md");
    expect(ownership).toContain("Before changing a shared production module");
    expect(ownership).toContain(
      "Follow imports, contract references, test fixtures, and call sites",
    );
    expect(ownership).toContain("Run the scoped validation gate for each affected BF ID");
    expect(ownership).toContain("does not authorize a downstream stage to rewrite the story tree");
  });

  it("proves each runnable entrypoint through an observed smoke response", async () => {
    const skeleton = await read("skill/qfai-implement/references/walking-skeleton.md");
    expect(skeleton).toContain("Skeleton lines in the Standard commands section");
    expect(skeleton).toContain("Skeleton command");
    expect(skeleton).toContain("one observable response");
    expect(skeleton).toContain("A process that merely starts is not a passing skeleton");
    expect(skeleton).toContain("before the first example that depends on that entrypoint");
  });

  it("routes UI effects from contracts and changed paths to captured product review", async () => {
    const ui = await read("skill/qfai-implement/references/ui-affecting.md");
    const gatekeeper = await read("agent/qa-gatekeeper.md");
    expect(ui).toContain("uiux.surfacePaths");
    expect(ui).toContain("UI contracts");
    expect(ui).toContain("rendered surface");
    expect(ui).toContain("product-surface-reviewer");
    expect(ui).toContain("If the implementation or capture changes after the verdict");
    expect(gatekeeper).toContain("For UI work, inspect the rendered surface");
  });

  it("rejects a load error and proves RED came from the selected assertion", async () => {
    const admissibility = await read("skill/qfai-implement/references/red-admissibility.md");
    expect(admissibility).toContain("one example and one test selector");
    expect(admissibility).toContain("A collection error, import error, syntax error");
    expect(admissibility).toContain("same command must pass");
    expect(admissibility).toContain("restore the assertion");
  });

  it("addresses each observation on one final revision", async () => {
    const implement = await read("step/implement-tdd/STEP.md");
    expect(implement).toContain("implementation-reviewer checks code and tests");
    expect(implement).toContain("Each reviewer reads the same final revision");
  });

  it("keeps the assistant file budget and review boundaries explicit", async () => {
    const baseline = await read("rule/shared-skill-operating-baseline.md");
    const implement = await readImplementFlowSteps(assistant);
    expect(baseline).toContain("800 lines per assistant asset file");
    expect(implement).toContain("The author does not certify their own result");
  });
});

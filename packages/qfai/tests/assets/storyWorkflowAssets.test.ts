import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { readRule } from "../helpers/ruleWithReferences.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistant = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");

async function read(relative: string): Promise<string> {
  return await readRule(path.join(assistant, relative));
}

describe("story-tree acceptance and implementation assets", () => {
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
    expect(ownership).toContain("## Finding the dependents");
    expect(ownership).toContain("Search from the changed files outward");
    expect(ownership).toContain("Start from the files the step plans to edit");
    expect(ownership).toContain("List a renamed file under both its old and new path");
    expect(ownership).toContain("Never read that failure as an empty list");
    expect(ownership).toContain("read the `Examples` citations of its rules");
    expect(ownership).toContain("Continue through a runtime");
    expect(ownership).toContain("both give `BF-0007`");
    expect(ownership).toContain("## When the search cannot finish");
    expect(ownership).toContain("the dependent set is unknown, not empty");
    expect(ownership).toContain("unresolved cross-flow obligation");
    expect(ownership).toContain("A passing suite does not replace the per-flow");
    expect(ownership).toContain("Do not report the search");
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

  it("keeps the assistant file budget explicit", async () => {
    const baseline = await read("rule/shared-skill-operating-baseline.md");
    expect(baseline).toContain("500 lines per Markdown assistant asset file");
  });
});

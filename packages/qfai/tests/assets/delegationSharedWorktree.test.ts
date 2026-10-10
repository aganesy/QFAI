import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { readRule } from "../helpers/ruleWithReferences.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const baselinePath = "assistant/rule/shared-skill-delegation-baseline.md";

/** The Orchestrator Protocol, where a delegating agent reads both rules, with wrapping undone. */
async function readProtocol(tree: string): Promise<string> {
  const content = await readRule(path.join(repoRoot, tree, baselinePath));
  const start = content.indexOf("### Orchestrator Protocol");
  const end = content.indexOf("### Capability Probe (MUST)");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return content.slice(start, end).replace(/\s+/g, " ");
}

describe.each(trees)("%s — delegation in a shared worktree", (tree) => {
  it("keeps a read-only agent from checking out and gives each agent its own scratch path", async () => {
    const protocol = await readProtocol(tree);
    expect(protocol).toContain(
      "A read-only agent never runs `git checkout` or `git switch` in a worktree it shares;",
    );
    expect(protocol).toContain("it reads other revisions with `git show <rev>:<path>`.");
    expect(protocol).toContain("Each agent writes scratch files only under a path of its own.");
  });

  // QFAI:EX-0001-0224-12
  it("fixes the commit a reviewer reads before the review starts", async () => {
    const protocol = await readProtocol(tree);
    expect(protocol).toContain(
      "Give each reviewer a fixed commit. Leave the checkout alone until reviews return.",
    );
    expect(protocol).toContain(
      "Only read-only fixed-SHA `git show` reviews permit clean switches.",
    );
    expect(protocol).toContain(
      "Writers, local gates and reviews using live files or checkout-dependent execution must finish first.",
    );
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const baselinePath = "assistant/rule/shared-skill-delegation-baseline.md";
const policyPath = "assistant/skill/qfai-implement/references/parallelization-policy.md";

const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");

/** The text from `heading` up to the next heading at `stop`, with wrapping undone. */
function section(content: string, heading: string, stop: string): string {
  const start = content.indexOf(heading);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const end = content.indexOf(stop, start + heading.length);
  expect(end, stop).toBeGreaterThan(start);
  return content.slice(start, end).replace(/\s+/g, " ");
}

describe.each(trees)("%s — host backstops in the delegation baseline", (tree) => {
  it("states the rule and that QFAI sets no value", async () => {
    const backstops = section(
      await read(tree, baselinePath),
      "### Host backstops above the declared shape",
      "\n## Work Orders Summary",
    );
    expect(backstops).toContain("**A backstop sits above the declared shape, never at it.**");
    expect(backstops).toContain("QFAI sets none of them, so the host defaults stand.");
    expect(backstops).not.toContain("self-verification");
  });

  it("lists the Claude Code controls with their defaults and version", async () => {
    const backstops = section(
      await read(tree, baselinePath),
      "### Host backstops above the declared shape",
      "\n## Work Orders Summary",
    );
    expect(backstops).toContain("Claude Code 2.1.217 or later:");
    for (const row of [
      "| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | 3 (1 in 2.1.217 and 2.1.218) |",
      "| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | 20 |",
      "| `--max-budget-usd` in print mode; `maxBudgetUsd` / `max_budget_usd` in the Agent SDK | none |",
    ]) {
      expect(backstops).toContain(row);
    }
  });

  it("names the other hosts' controls and says where none was confirmed", async () => {
    const backstops = section(
      await read(tree, baselinePath),
      "### Host backstops above the declared shape",
      "\n## Work Orders Summary",
    );
    for (const control of [
      "`agents.max_concurrent_threads_per_session`",
      "`subagents.maxDepth`",
      "`COPILOT_SUBAGENT_MAX_DEPTH`",
      "`subagents.maxConcurrency`",
      "`COPILOT_SUBAGENT_MAX_CONCURRENT`",
      "`--max-ai-credits`",
      "`chat.subagents.allowInvocationsFromSubagents`",
    ]) {
      expect(backstops).toContain(control);
    }
    expect(backstops).toContain(
      "No equivalent was confirmed for nesting depth or for a spend cap.",
    );
    expect(backstops).toContain(
      "No equivalent was confirmed for concurrent sub-agents or for a spend cap.",
    );
  });

  it("keeps the reviewer-gate note beside the independent-reviewer definition", async () => {
    const definition = section(
      await read(tree, baselinePath),
      "### Definition: independent reviewer (NORMATIVE)",
      "\n#### ",
    );
    expect(definition).toContain("**The reviewer gate is not self-verification.**");
    expect(definition).toContain("don't use subagents to verify your own work");
    expect(definition).toContain("excludes an agent reviewing its own output");
    expect(definition).toContain("pinned to a hash of the reviewed state");
  });

  it("points the parallelization policy at the baseline and ships no URL", async () => {
    const [baseline, policy] = await Promise.all([
      read(tree, baselinePath),
      read(tree, policyPath),
    ]);
    expect(policy).toContain(
      "`.qfai/assistant/rule/shared-skill-delegation-baseline.md#host-backstops-above-the-declared-shape`",
    );
    expect(policy).not.toContain("CLAUDE_CODE_MAX");
    for (const content of [baseline, policy]) {
      expect(content).not.toMatch(/https?:\/\//);
    }
  });
});

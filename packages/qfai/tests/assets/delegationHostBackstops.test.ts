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
    expect(backstops).toContain("Leave room for other permitted agents sharing the host limit.");
    expect(backstops).toContain("QFAI sets none of them, so the host defaults stand.");
    expect(backstops).not.toContain("self-verification");
  });

  it("lists the Claude Code controls with their defaults and version", async () => {
    const backstops = section(
      await read(tree, baselinePath),
      "Claude Code 2.1.217 or later:",
      "\nCodex:",
    );
    expect(backstops).toContain("Claude Code 2.1.217 or later:");
    for (const row of [
      "| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | 3 (1 in 2.1.217 and 2.1.218) | How deep delegation nests. `1` turns nesting off |",
      "| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | 20 | When new Agent tool spawns are refused |",
      "| `--max-budget-usd` in print mode; `maxBudgetUsd` / `max_budget_usd` in the Agent SDK | none | What one run may spend, in US dollars, sub-agents included |",
    ]) {
      expect(backstops).toContain(row);
    }
    expect(backstops).toContain(
      "The spawn limit has exceptions for ultracode, `/subtask` forks, and resuming an exited agent.",
    );
  });

  it("names the other hosts' controls and says where none was confirmed", async () => {
    const baseline = await read(tree, baselinePath);
    const codex = section(baseline, "\nCodex:", "\nGitHub Copilot CLI:");
    expect(codex).toContain(
      "| `agents.max_concurrent_threads_per_session` in `config.toml` (alias `agents.max_threads`) | chosen by Codex when unset | How many spawned-agent threads are open at once, the primary excluded |",
    );
    expect(codex).toContain("No equivalent was confirmed for nesting depth or for a spend cap.");
    const copilot = section(
      baseline,
      "\nGitHub Copilot CLI:",
      "\nVS Code Local harness (`runSubagent`):",
    );
    for (const row of [
      "| `subagents.maxDepth` setting | 6 in the limits table | How deep sub-agents nest |",
      "| `COPILOT_SUBAGENT_MAX_DEPTH` | 4 in the environment-variable table | How deep sub-agents nest |",
      "| `subagents.maxConcurrency` setting | set by the Copilot plan, 2 to 32 | How many sub-agents run at once |",
      "| `COPILOT_SUBAGENT_MAX_CONCURRENT` | 32 in the environment-variable table | How many sub-agents run at once |",
      "| `--max-ai-credits` | unset | AI credits per response, as a soft limit |",
    ]) {
      expect(copilot).toContain(row);
    }
    expect(copilot).toContain("The two settings take effect only on usage-based billing plans.");
    expect(copilot).toContain(
      "The depth defaults disagree across the CLI documentation. Which control takes precedence was not confirmed.",
    );
    const vscode = section(
      baseline,
      "\nVS Code Local harness (`runSubagent`):",
      "\n## Work Orders Summary",
    );
    expect(vscode).toContain(
      "| `chat.subagents.allowInvocationsFromSubagents` | `false` | Whether a sub-agent may start sub-agents. Nesting stops at depth five |",
    );
    expect(vscode).toContain(
      "No equivalent was confirmed for concurrent sub-agents or for a spend cap.",
    );
    expect(vscode).toContain("None was confirmed for any of the three in the Copilot cloud agent.");
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
    expect(definition).toContain("The author cannot accept its own output.");
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

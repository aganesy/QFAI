/**
 * What a stage costs, and the levers that change it.
 *
 * The rule maps every role to a reasoning depth and admits a role-specific
 * level only with the measurement that chose it, since a level nobody measured
 * is a guess. The work order carries an advisory time budget and the elapsed
 * line the agent reports against it.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const STAGE_COST = "assistant/rule/stage-cost.md";
const DELEGATION = "assistant/rule/shared-skill-delegation-baseline.md";
const AGENT_CARDS = "assistant/agent";
const EVERY_ROLE = "Every agent card under `agent/`";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

function section(source: string, heading: string): string {
  const start = source.indexOf(`\n${heading}\n`);
  expect(start).toBeGreaterThan(-1);
  const next = source.indexOf("\n## ", start + heading.length + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

/** Body rows of the first table in `text`, as trimmed cells. */
function tableRows(text: string): string[][] {
  return text
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) =>
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
}

function workOrderBlock(source: string): string {
  const heading = source.indexOf("## Work order template");
  expect(heading).toBeGreaterThan(-1);
  const open = source.indexOf("```text", heading);
  const close = source.indexOf("```", open + 7);
  return source.slice(open, close);
}

/** Agent IDs, one per card file under `agent/`. */
async function agentIds(tree: string): Promise<Set<string>> {
  const files = await readdir(path.join(repoRoot, tree, AGENT_CARDS));
  return new Set(files.filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -".md".length)));
}

describe("the stage cost rule", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: every role runs at the host's default until a measurement says otherwise`, async () => {
      const rows = tableRows(section(await read(tree, STAGE_COST), "## Reasoning depth"));

      expect(rows).toContainEqual([EVERY_ROLE, "The host's default", "None yet"]);
    });

    it(`${tree}: a role-specific row names a real role and the measurement behind it`, async () => {
      const [doc, roles] = await Promise.all([read(tree, STAGE_COST), agentIds(tree)]);
      const rows = tableRows(section(doc, "## Reasoning depth")).filter(
        ([role]) => role !== EVERY_ROLE,
      );

      for (const [role, , measurement] of rows) {
        expect(roles).toContain(role?.replace(/`/g, ""));
        expect(measurement).not.toBe("None yet");
        expect(measurement).not.toBe("");
      }
    });

    it(`${tree}: depth is named by the effort setting and its levels`, async () => {
      const depth = flat(section(await read(tree, STAGE_COST), "## Reasoning depth"));

      expect(depth).toContain("The `effort` setting sets how much a model reasons per step.");
      expect(depth).toContain("`low`, `medium`, `high`, `xhigh` and `max`");
      expect(depth).toContain("On another host, the equivalent setting applies.");
    });

    it(`${tree}: the rule cites no external source`, async () => {
      const doc = await read(tree, STAGE_COST);

      expect(doc).not.toContain("## Sources");
      expect(doc).not.toMatch(/https?:\/\//);
    });

    it(`${tree}: no lever is presented as a cap`, async () => {
      const doc = flat(await read(tree, STAGE_COST));

      expect(doc).toContain("None of them is a cap.");
      expect(doc).toContain("Nothing stops at the budget.");
    });

    it(`${tree}: the two counterintuitive costs are recorded`, async () => {
      const doc = flat(await read(tree, STAGE_COST));

      expect(doc).toContain("reasoning and reply share one output limit");
      expect(doc).toContain("A one-line instruction to edit only the lines that change");
    });
  }
});

describe("the work order carries the elapsed line", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: an advisory budget and the line reported against it`, async () => {
      const block = workOrderBlock(await read(tree, DELEGATION));

      expect(block).toContain("Time budget: none | <seconds>");
      expect(block).toContain("advisory: nothing stops at it");
      expect(block).toContain(".qfai/assistant/rule/stage-cost.md");
      expect(block).toContain("`elapsed <seconds>s / <budget>s`");
      expect(block).toContain("`elapsed <seconds>s` when the budget is none");
    });
  }
});

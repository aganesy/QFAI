import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  LEGACY_ASSISTANT_INSTRUCTIONS_DIR,
  LEGACY_ASSISTANT_STEERING_DIR,
} from "../../src/core/paths/assistantPaths.js";

// Anchored to this file, not to `process.cwd()`: vitest runs this suite from
// `packages/qfai`, but a runner launched at the monorepo root would resolve
// `../..` to the directory ABOVE the repo and every read below would fail on a
// path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL_REL = "assistant/skills/qfai-sdd/SKILL.md";

const readSkill = (tree: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, SKILL_REL), "utf-8");

const INPUTS_HEADING = "## Inputs Priority";
const NEXT_HEADING = "## Sub-agent Delegation";

/** The numbered entries under `## Inputs Priority`, in document order. */
function inputsPriorityLines(content: string): string[] {
  // Both markers are asserted before slicing: an `indexOf` miss returns -1 and
  // the slice would then silently cover a different region, so a renamed
  // heading surfaces as the heading that moved rather than as an empty list.
  const start = content.indexOf(INPUTS_HEADING);
  const end = content.indexOf(NEXT_HEADING);
  expect(start, `heading not found: ${INPUTS_HEADING}`).toBeGreaterThan(-1);
  expect(end, `heading not found or out of order: ${NEXT_HEADING}`).toBeGreaterThan(start);
  return content
    .slice(start, end)
    .split(/\r?\n/)
    .filter((line) => /^\d+\.\s/.test(line.trim()));
}

/** Every backtick-quoted span on a line, without the backticks. */
function codeSpans(line: string): string[] {
  return [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
}

/** Splits a `... — formerly ...` annotation into its post- and pre-recut halves. */
function splitFormerly(line: string): { current: string; formerly: string } {
  const marker = line.indexOf("formerly");
  expect(marker, `no "formerly" clause on: ${line}`).toBeGreaterThan(-1);
  return { current: line.slice(0, marker), formerly: line.slice(marker) };
}

describe("the qfai-sdd Inputs Priority keeps the assistant-tree recut legible", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: every "formerly" clause names a different path than the current one`, async () => {
      const annotated = inputsPriorityLines(await readSkill(tree)).filter((line) =>
        line.includes("formerly"),
      );
      expect(annotated.length).toBeGreaterThan(0);
      for (const line of annotated) {
        const { current, formerly } = splitFormerly(line);
        const currentPaths = new Set(codeSpans(current));
        const overlap = codeSpans(formerly).filter((span) => currentPaths.has(span));
        // A rename annotation that repeats its own left-hand side tells a
        // reader migrating an older project nothing about what to look for.
        expect(overlap, `"formerly" repeats the post-recut path on: ${line}`).toEqual([]);
      }
    });

    it(`${tree}: the P1 and P2 clauses name the legacy directories the CLI migrates`, async () => {
      const lines = inputsPriorityLines(await readSkill(tree));
      const p1 = lines.find((line) => line.includes("P1:"));
      const p2 = lines.find((line) => line.includes("P2:"));
      expect(p1, "no P1 entry under Inputs Priority").toBeDefined();
      expect(p2, "no P2 entry under Inputs Priority").toBeDefined();
      // The legacy names are still live: `qfai init --upgrade-assistant-tree`
      // relocates these directories and `D-DEPRECATED-PATH` fires on them.
      expect(splitFormerly(p1 ?? "").formerly).toContain(
        `\`${LEGACY_ASSISTANT_INSTRUCTIONS_DIR}/*\``,
      );
      expect(splitFormerly(p2 ?? "").formerly).toContain(`\`${LEGACY_ASSISTANT_STEERING_DIR}/*\``);
    });
  }
});

/**
 * One stop condition, stated the same way everywhere it is stated.
 *
 * The loop stops when all four ordinal UX scores are exceptional and the
 * latest iteration has `blockingFindings`, `layoutAntiPatternsDetected` and
 * `designMdViolations` all empty. The core convergence check applies this
 * contract. The skill and CLI help must describe it consistently.
 *
 * A description that names a different condition is worse than none. It
 * explains a stop by a gate nobody applied, and leaves a run that keeps going
 * looking unexplained. The descriptions are pinned to both the score and
 * finding requirements.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { EXIT_CODES, formatExitCodesSection } from "../../src/cli/lib/exitCodes.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL_DIR = "assistant/skill/qfai-prototyping";

/** The three arrays, in the order every statement of the condition lists them. */
const FINDING_ARRAYS = [
  "blockingFindings",
  "layoutAntiPatternsDetected",
  "designMdViolations",
] as const;

const read = (relative: string): Promise<string> =>
  readFile(path.join(repoRoot, relative), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("the convergence stop condition is stated as the three finding arrays", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the skill's exit-code line names all three arrays`, async () => {
      const text = flat(await read(path.join(tree, SKILL_DIR, "SKILL.md")));
      const stopLine = text.slice(text.indexOf("**Exit codes**"), text.indexOf("`65`"));

      for (const array of FINDING_ARRAYS) {
        expect(stopLine, `the exit-code line omits ${array}`).toContain(`\`${array}\``);
      }
      expect(stopLine).toContain("all four per-cycle ordinal UX scores `exceptional`");
    });

    it(`${tree}: the loop reference defines exit 64 as the three arrays`, async () => {
      const text = flat(await read(path.join(tree, SKILL_DIR, "references/iteration-loop.md")));
      const stopLine = text.slice(text.indexOf("`64` — convergence"), text.indexOf("`65` —"));

      for (const array of FINDING_ARRAYS) {
        expect(stopLine, `the exit-64 definition omits ${array}`).toContain(`\`${array}\``);
      }
      expect(stopLine).toContain("all four per-cycle ordinal scores are `exceptional`");
    });

    // Naming two of the three is the shape this drifted into last time: the
    // generator could not explain a run that kept going with both named arrays
    // already empty.
    it(`${tree}: the generator prompt counts three, not two`, async () => {
      const text = flat(await read(path.join(tree, SKILL_DIR, "references/generator-prompt.md")));

      expect(text).toContain("**all three finding arrays empty**");
      expect(text).not.toMatch(/both finding arrays/);
    });

    it(`${tree}: the reviewer applies the score and findings together`, async () => {
      const text = flat(await read(path.join(tree, SKILL_DIR, "references/reviewer-prompt.md")));
      expect(text).toContain("Convergence requires all four summary scores to be `exceptional`");
      for (const array of FINDING_ARRAYS) {
        expect(text).toContain(`\`${array}[]\``);
      }
    });
  }

  it("the operator's exit-64 line names the scores and empty findings", () => {
    const help = formatExitCodesSection();
    const iterate = help.slice(
      help.indexOf("prototyping iterate"),
      help.indexOf("prototyping iterate --check-convergence"),
    );
    const stopLine = iterate.slice(
      iterate.indexOf(`${EXIT_CODES.prototypingStop} = STOP`),
      iterate.indexOf(`${EXIT_CODES.prototypingBudgetExhausted} = STOP`),
    );

    expect(stopLine).toContain("no DESIGN.md violation, layout anti-pattern, or blocking finding");
    expect(stopLine).toContain("exceptional");
  });
});

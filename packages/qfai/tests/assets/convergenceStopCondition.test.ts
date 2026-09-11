/**
 * One stop condition, stated the same way everywhere it is stated.
 *
 * The loop stops when the latest iteration has `blockingFindings`,
 * `layoutAntiPatternsDetected` and `designMdViolations` all empty. Two places
 * apply it — `isConverged` in the iterate command and the `QFAI-PROT-005`
 * consistency check — and several more describe it: the skill an agent reads
 * before deciding whether to keep iterating, and the `--help` line an operator
 * reads to interpret exit 64.
 *
 * A description that names a different condition is worse than none. It
 * explains a stop by a gate nobody applied, and leaves a run that keeps going
 * looking unexplained. So the descriptions are pinned to the three arrays, and
 * the rating vocabulary that used to stand in for them is pinned out.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { EXIT_CODES, formatExitCodesSection } from "../../src/cli/lib/exitCodes.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL_DIR = "assistant/skills/qfai-prototyping";

/** The three arrays, in the order every statement of the condition lists them. */
const FINDING_ARRAYS = [
  "blockingFindings",
  "layoutAntiPatternsDetected",
  "designMdViolations",
] as const;

/**
 * The rating that used to decide the stop.
 *
 * Only the ordinal values and the plural noun: `axis` alone survives in the
 * exploration sense ("the IA / flow axes"), which never gated anything.
 */
const RETIRED_RATING = /\b(?:exceptional|four (?:UX )?axes|4 UX axes)\b/i;

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
    });

    it(`${tree}: the loop reference defines exit 64 as the three arrays`, async () => {
      const text = flat(await read(path.join(tree, SKILL_DIR, "references/iteration-loop.md")));
      const stopLine = text.slice(text.indexOf("`64` — convergence"), text.indexOf("`65` —"));

      for (const array of FINDING_ARRAYS) {
        expect(stopLine, `the exit-64 definition omits ${array}`).toContain(`\`${array}\``);
      }
    });

    // Naming two of the three is the shape this drifted into last time: the
    // generator could not explain a run that kept going with both named arrays
    // already empty.
    it(`${tree}: the generator prompt counts three, not two`, async () => {
      const text = flat(await read(path.join(tree, SKILL_DIR, "references/generator-prompt.md")));

      expect(text).toContain("**all three finding arrays empty**");
      expect(text).not.toMatch(/both finding arrays/);
    });

    it(`${tree}: no prototyping document rates the stop`, async () => {
      const files = await fg("**/*.md", {
        cwd: path.join(repoRoot, tree, SKILL_DIR),
        absolute: true,
      });

      const offenders: string[] = [];
      for (const file of files) {
        const found = (await readFile(file, "utf-8")).match(new RegExp(RETIRED_RATING, "gi"));
        if (found) {
          offenders.push(`${path.relative(repoRoot, file)}: ${[...new Set(found)].join(", ")}`);
        }
      }

      expect(offenders, "a shipped document states the stop as a rating").toEqual([]);
    });
  }

  it("the operator's exit-64 line names what is empty, not what scored", () => {
    const help = formatExitCodesSection();
    const iterate = help.slice(
      help.indexOf("prototyping iterate"),
      help.indexOf("prototyping iterate --check-convergence"),
    );
    const stopLine = iterate.slice(iterate.indexOf(`${EXIT_CODES.prototypingStop} = STOP`));

    expect(stopLine).toContain("no blocking findings");
    expect(stopLine).toContain("no layout anti-patterns");
    expect(stopLine).toContain("no DESIGN.md violations");
    expect(iterate).not.toMatch(RETIRED_RATING);
  });
});

/**
 * A gate that fails nondeterministically has a route (#392).
 *
 * The Autorepair Protocol offered `environment/tooling` as a class and attached
 * no action to it: the autonomous-fix line covers two of the five classes, the
 * stop line covered none of them, and "rerun the same failing gate after each
 * fix batch" has no case for a rerun with no fix — which is exactly what a
 * flaky gate needs. The agent could neither fix, nor stop, nor legitimately
 * rerun.
 *
 * Meanwhile the Evidence hard rules are all satisfied by attaching the clean
 * run's command and output, so omitting the two red runs that preceded it was
 * legal. And the one prescribed automatic response — an unconditional
 * post-parallel rollback — then fires on the false signal, discarding correct
 * work.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("nondeterministic gates", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the rerun bullet covers a rerun with no fix, and bounds it`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain(
        "rerun the same failing gate after each fix batch, **and once with no intervening change** when the failure looks nondeterministic",
      );
      // Unbounded, "rerun until green" is the failure mode this invites.
      expect(baseline).toContain(
        "The confirmation rerun is bounded at one: after it the finding is classified, not re-rolled",
      );
    });

    it(`${tree}: a clean rerun is not evidence for the gate`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("### Nondeterministic gates");
      expect(baseline).toContain("A clean rerun on its own is not evidence for that gate.");
      expect(baseline).toContain("**Record it as an `environment/tooling` finding.**");
      expect(baseline).toContain("nothing was fixed between the two runs");
    });

    it(`${tree}: every run must be disclosed`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("**Disclose every run.**");
      expect(baseline).toContain(
        "Report the results of all runs of that gate, in order, with their commands.",
      );
    });

    it(`${tree}: selective reporting is named as invented evidence`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      // The four existing evidence rules are each satisfied by the clean run,
      // which is why this had to be stated separately.
      expect(baseline).toContain("#### Selective reporting is invented evidence");
      expect(baseline).toContain(
        "the evidence rules are satisfied by a clean run's command and output, so nothing else stops it",
      );
      expect(baseline).toContain(
        "omitting runs of the same gate is on the same footing as inventing one",
      );
    });

    it(`${tree}: isolation and a named cause are required, not "flaky"`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("**Re-run the failing selectors in isolation**");
      expect(baseline).toContain(
        "A selector that passes alone and fails in the suite is the signature of shared state",
      );
      expect(baseline).toContain('"Flaky" is not a cause.');
      expect(baseline).toContain("Do not fix the flake by rerunning until green");
    });

    it(`${tree}: a gate reported this way has not passed`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("A gate reported this way has **not passed**.");
      expect(baseline).toContain("it goes in the stop report like any other");
    });

    it(`${tree}: the implement evidence rules forbid selective reporting`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        "**Selective reporting of repeated runs of the same gate is invalid.**",
      );
      expect(skill).toContain(
        "a clean rerun after a red one is an `environment/tooling` finding, not a pass",
      );
    });

    it(`${tree}: the post-parallel rollback needs a reproducible failure`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain("re-run it once with no intervening change before acting");
      expect(skill).toContain("A failure that does **not** reproduce is an");
      expect(skill).toContain("not a rollback trigger");
      expect(skill).toContain(
        "Only a **reproducible** failure flags all slices for re-examination and rolls back the merge",
      );
    });
  }
});

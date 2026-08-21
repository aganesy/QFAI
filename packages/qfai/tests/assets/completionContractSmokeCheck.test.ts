/**
 * The Completion Contract's only executable step keeps its teeth (#576).
 *
 * Three of the four completion bullets are self-inspection — they are satisfied
 * by rereading what the agent just wrote, so an agent that hallucinated an
 * artifact happily confirms its own account of it. The smoke check was the one
 * bullet whose result could contradict that account, and it shipped with a
 * self-served waiver ("or state \"not applicable\" with a short rationale") for
 * a term the shipped tree never defined. The waiver left no artifact, so its
 * use rate was unmeasurable too. The contract now uses the UNRUN vocabulary
 * `quality.md` already defines, and every inheriting skill names its own check.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** Every skill that inherits the shared contract, with the check it must name. */
const INHERITING_SKILLS = [
  { skill: "qfai-atdd", check: "the acceptance tests you just scaffolded" },
  { skill: "qfai-configure", check: "the minimum runnable path you just recorded" },
  { skill: "qfai-implement", check: "the Test command from" },
  { skill: "qfai-verify", check: "the mandatory gate set below" },
];

describe("Completion Contract keeps its executable step executable", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the smoke-check bullet has no self-served waiver`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      // The exact escape clause the issue reported. Any reintroduction of a
      // "declare it away" branch on this bullet fails here.
      expect(baseline).not.toContain('or state "not applicable" with a short rationale');
      expect(baseline).toContain(
        "run the smallest applicable smoke check and report its outcome. Where no smoke check applies, report it as UNRUN with the reason. UNRUN accompanies the completion claim; it does not satisfy this bullet.",
      );
    });

    it(`${tree}: UNRUN accompanies the completion claim rather than standing in for it`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("UNRUN accompanies the completion claim");
      expect(baseline).toContain("it does not satisfy this bullet");
      // Reuses the constitution's existing vocabulary instead of a second
      // concept for the same situation.
      expect(baseline).toContain(
        "UNRUN is the same verdict `.qfai/assistant/constitution/quality.md` gives a gate with no discoverable command",
      );
      expect(baseline).toContain("not passed");
    });

    it(`${tree}: "smallest applicable smoke check" is defined, so a claim is falsifiable`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain(
        "**The smallest applicable smoke check** is the cheapest command that executes what this stage just produced and returns a pass/fail you did not author",
      );
      expect(baseline).toContain("Each skill names its own next to the `Follow` line");
      // A missing override is a finding, not a silent exemption.
      expect(baseline).toContain(
        "A skill that names none has not been granted an exemption — it has an override left unfilled, and that is a finding to report, not a reason to skip the bullet.",
      );
    });

    it(`${tree}: quality.md still carries the UNRUN treatment this bullet now mirrors`, async () => {
      // The tripwire for the other half of the pairing: if quality.md drops
      // UNRUN, the baseline's cross-reference above goes dangling.
      const quality = flat(await read(tree, "assistant/constitution/quality.md"));

      expect(quality).toContain(
        "A capability with no discoverable command is **UNRUN**, not passed",
      );
    });

    for (const { skill, check } of INHERITING_SKILLS) {
      it(`${tree}: ${skill} names its own smallest applicable smoke check`, async () => {
        const body = flat(await read(tree, `assistant/skills/${skill}/SKILL.md`));

        expect(body).toContain("shared-skill-operating-baseline.md#completion-contract-shared");
        expect(body).toContain("**Smallest applicable smoke check** (this skill's override):");
        expect(body).toContain(check);
        expect(body).toContain("is UNRUN, not a pass");
      });
    }
  }
});

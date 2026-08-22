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
 * `quality.md` already defines, only PASS discharges the bullet, and every
 * skill that cites the anchor names its own check.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";
const ANCHOR = "shared-skill-operating-baseline.md#completion-contract-shared";
const OVERRIDE_MARKER = "**Smallest applicable smoke check** (this skill's override):";

/** The inheritors that exist today; discovery must never return fewer than these. */
const KNOWN_INHERITORS = ["qfai-atdd", "qfai-configure", "qfai-implement", "qfai-verify"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/**
 * Skills bound by the shared contract, discovered instead of listed: a new
 * `SKILL.md` that cites the anchor inherits the obligation the moment it lands,
 * and there is no array anyone can forget to extend.
 */
const inheritingSkills = (tree: string): string[] => {
  const skillsDir = path.join(repoRoot, tree, "assistant", "skills");
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      const skillFile = path.join(skillsDir, name, "SKILL.md");
      return existsSync(skillFile) && readFileSync(skillFile, "utf-8").includes(ANCHOR);
    })
    .sort();
};

/** The override sentence itself, so two skills cannot pass on the same boilerplate. */
const overrideSentence = (body: string): string => {
  const line = body.split(/\r?\n/).find((candidate) => candidate.includes(OVERRIDE_MARKER)) ?? "";
  return line.slice(line.indexOf(OVERRIDE_MARKER) + OVERRIDE_MARKER.length).trim();
};

describe("Completion Contract keeps its executable step executable", () => {
  for (const tree of QFAI_TREES) {
    const skills = inheritingSkills(tree);

    it(`${tree}: the smoke-check bullet has no self-served waiver`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      // The exact escape clause the issue reported. Any reintroduction of a
      // "declare it away" branch on this bullet fails here.
      expect(baseline).not.toContain('or state "not applicable" with a short rationale');
      expect(baseline).toContain(
        "run the smallest applicable smoke check and report its outcome. Only PASS satisfies this bullet: FAIL and UNRUN are blockers, so they go in a stop report with the reason, never next to a completion claim.",
      );
    });

    it(`${tree}: FAIL and UNRUN stop the run instead of riding along with completion`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("Only PASS satisfies this bullet");
      // The earlier wording let a non-passing check sit beside the claim.
      expect(baseline).not.toContain("UNRUN accompanies the completion claim");
      expect(baseline).toContain("A smoke check that ran and failed is not passed either.");
      expect(baseline).toContain("do not declare completion on a FAIL or an UNRUN");
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

    it(`${tree}: every skill citing the anchor is discovered`, () => {
      expect(skills).toEqual(expect.arrayContaining(KNOWN_INHERITORS));
    });

    for (const skill of skills) {
      it(`${tree}: ${skill} names its own smallest applicable smoke check`, async () => {
        const body = await read(tree, `assistant/skills/${skill}/SKILL.md`);

        expect(flat(body)).toContain(OVERRIDE_MARKER);
        expect(flat(body)).toContain("is UNRUN, not a pass");
        expect(overrideSentence(body).length).toBeGreaterThan(0);
      });
    }

    it(`${tree}: an override names a target its own legitimate runs can still hit`, async () => {
      // A non-waivable bullet only works if every correct run has something to
      // execute. Two shipped paths otherwise had none: a re-run of an
      // already-terminal ledger moves no item to `done`, and configure may not
      // repair the spec/ATDD/prototyping artifacts a profile-less `validate`
      // judges. Left as-is, each turns a correct run into a permanent
      // UNRUN/FAIL, i.e. a completion blocker with no reachable remedy.
      const implement = flat(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(implement).toContain("A run that moves no item still has a target");
      expect(implement).toContain("A legitimate no-op is never UNRUN for want of a target.");

      const configure = flat(await read(tree, "assistant/skills/qfai-configure/SKILL.md"));
      expect(configure).toContain("**judged only over the findings this skill owns**");
      expect(configure).toContain("rather than read as this bullet's FAIL");
    });

    it(`${tree}: no two inheritors share the same override`, async () => {
      const sentences = await Promise.all(
        skills.map(async (skill) =>
          overrideSentence(await read(tree, `assistant/skills/${skill}/SKILL.md`)),
        ),
      );

      expect(new Set(sentences).size).toBe(sentences.length);
    });
  }
});

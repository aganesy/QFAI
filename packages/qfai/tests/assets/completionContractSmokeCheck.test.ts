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
      // execute, and if what it executes returns a verdict that run owns.
      // Three shipped paths failed one or the other: a re-run of an
      // already-terminal ledger moves no item to `done`; an ATDD run that
      // scaffolds nothing — E2E/API work, or a repair of existing tests — has
      // no "just scaffolded" suite; and configure may not repair the
      // spec/ATDD/prototyping artifacts a profile-less `validate` judges. Left
      // as-is, each turns a correct run into a permanent UNRUN/FAIL, i.e. a
      // completion blocker with no reachable remedy.
      const implement = flat(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      expect(implement).toContain("A run that moves no item still has a target");
      expect(implement).toContain("A legitimate no-op is never UNRUN for want of a target.");

      const atdd = flat(await read(tree, "assistant/skills/qfai-atdd/SKILL.md"));
      // `scaffold` emits Integration-owned TCs only, so "the tests you just
      // scaffolded" was empty on an E2E/API-only run and on any run that only
      // repaired or re-verified existing acceptance tests.
      expect(atdd).toContain("the acceptance tests **this run created or changed**");
      expect(atdd).toContain("A run that wrote no test file still has a target");
      expect(atdd).toContain("the spec's existing acceptance suite");

      const configure = flat(await read(tree, "assistant/skills/qfai-configure/SKILL.md"));
      // The verdict has to be a real command whose exit code no other stage can
      // decide. Naming the scope in prose narrowed nothing: `shouldFail` trips
      // on `counts.error` over every finding, whoever owns it.
      expect(configure).toContain("`npx qfai doctor --fail-on error`");
      expect(configure).toContain("**That exit code is the verdict**");
      expect(configure).toContain(
        "`npx qfai validate --fail-on error` is **not** this bullet's verdict",
      );
      expect(configure).not.toContain("**judged only over the findings this skill owns**");
    });

    it(`${tree}: a run terminalised only by exception still has a smoke target`, async () => {
      // The no-op branch was scoped to a ledger that was *already* terminal on
      // entry. A session that writes its remaining rows `todo` -> `exception`
      // under approved accepted-risk waivers terminalises the ledger itself: it
      // moved nothing to `done` and started on a non-terminal ledger, so it
      // matched neither branch and every such completion was UNRUN, i.e.
      // blocked — although the skill's own Completion step 3 permits it and the
      // checkpoint reference already owes the boundary on that exit.
      const implement = flat(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));

      expect(implement).toContain(
        "**every exit that leaves the ledger terminal without a `done` transition of its own**",
      );
      expect(implement).toContain("`todo` -> `exception`");
      // The narrow reading is what has to stay gone.
      expect(implement).toContain(
        'Reading the branch as "already terminal on entry" made that exit an unconditional UNRUN',
      );
      // The reference this branch defers to must still say the two terminal
      // statuses end the loop alike, or the cross-reference goes dangling.
      const checkpoint = flat(
        await read(tree, "assistant/skills/qfai-implement/references/checkpoint-verification.md"),
      );
      expect(checkpoint).toContain(
        "The last row reaching `exception` ends the loop exactly as `done` does",
      );
    });

    it(`${tree}: the configure verdict fails on the glob defect it owns`, async () => {
      // `doctor --fail-on error` was named as the verdict while
      // `traceability.testGlobs` capped at `warning` for globs that collect no
      // test — so a configuration matching zero files exited 0 and passed the
      // one non-waivable bullet. `doctor` now raises that state as `error`,
      // matching `validate`'s `QFAI-TRACE-124`; the residual `warning` states
      // (unset globs, truncated scan) are read off the same check.
      const configure = flat(await read(tree, "assistant/skills/qfai-configure/SKILL.md"));

      expect(configure).toContain("**and globs it wrote that match no test file**");
      expect(configure).toContain("the same defect `validate` raises as a `QFAI-TRACE-124` error");
      expect(configure).toContain("**`traceability.testGlobs` must report `[ok]`**");
      expect(configure).toContain("Anything but `ok` there is this bullet's FAIL");
      // The stale claim: a scan failure was the only glob state doctor failed on.
      expect(configure).not.toContain(
        "`traceability.testGlobs` (a scan failure in the globs it wrote)",
      );
    });

    it(`${tree}: a reused checkpoint PASS is pinned to the tree it ran against`, async () => {
      // The no-op branch reused a recorded checkpoint result whenever it
      // postdated the last ledger change. A terminal ledger stops moving while
      // the code under it does not, so an all-done re-run could certify a tree
      // the recorded PASS never executed — and the seal only catches an edited
      // record, never code that moved underneath an honest one.
      const implement = flat(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      const checkpoint = flat(
        await read(tree, "assistant/skills/qfai-implement/references/checkpoint-verification.md"),
      );
      const revisionRule = "when the `Revision` recorded beside them is not this tree's";

      expect(implement).toContain(revisionRule);
      expect(checkpoint).toContain(revisionRule);
      expect(checkpoint).toContain("**Ledger state is not tree state.**");
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

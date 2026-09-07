/**
 * The Completion Contract's placeholder scan no longer lists tokens the
 * constitution mandates writing (#525).
 *
 * `TBD` is what Article II and `thinking.md` require for an honestly-unknown
 * fact, and `OQ` / `OPEN QUESTION` are the framework's own ID prefix and the
 * title of a required artifact — the shipped `Open-questions.md` templates
 * contain both while recording zero open questions, so a pristine `qfai init`
 * tripped the scan. The bullet also never said what a hit obligates, so the
 * collision cost nothing and went unnoticed.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";
const SPEC_OPEN_QUESTIONS = "assistant/skills/qfai-sdd/templates/specs/spec/08_Open-questions.md";
const POLICY_OPEN_QUESTIONS =
  "assistant/skills/qfai-sdd/templates/specs/_policies/09_Open-questions.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/**
 * The shape of a QFAI-internal open-question ID: `OQ-` plus two four-character
 * groups, whether spelled with real digits or with a placeholder stand-in.
 * `.agents/rules/distributed-surface.md` forbids that shape in anything `qfai
 * init` copies into a user's tree, and the shipped baseline lives under
 * `assets/`. The leakage guard only greps the digit spelling, so the
 * placeholder spelling reaches users unchallenged — this is the pin for it.
 * The neutral `OQ-ID` the templates use is two characters wide and never
 * matches.
 */
const INTERNAL_OQ_ID_SHAPE = /\bOQ-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}\b/;

/** The single scan bullet, isolated: the carve-outs below it legitimately name `OQ`. */
const scanBullet = (baseline: string): string => {
  const line = baseline
    .split(/\r?\n/)
    .find((l) => l.startsWith("- scan generated artifacts for unresolved placeholders"));
  expect(line, "the Completion Contract must still carry a placeholder-scan bullet").toBeDefined();
  return line ?? "";
};

describe("completion contract placeholder scan", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the scanned-token list drops OQ and OPEN QUESTION`, async () => {
      const bullet = scanBullet(await read(tree, BASELINE));

      expect(bullet).not.toContain("`OQ`");
      expect(bullet).not.toContain("`OPEN QUESTION`");
      // The tokens that genuinely mark unfinished generated content stay.
      for (const token of ["`TODO`", "`TBA`", "`TBC`", "`XXX`", "`???`", "`UNDEFINED`"]) {
        expect(bullet).toContain(token);
      }
      expect(bullet).toContain("`PLACEHOLDER`");
    });

    it(`${tree}: only an undocumented TBD is scanned for`, async () => {
      const bullet = scanBullet(await read(tree, BASELINE));

      expect(bullet).toContain("**undocumented** `TBD`");
    });

    it(`${tree}: the OQ carve-out is scoped to tracking structure only`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("### What the placeholder scan does not flag");
      expect(baseline).toContain(
        "**`OQ` and `OPEN QUESTION` are exempt only as tracking structure.**",
      );
      expect(baseline).toContain("row carrying its tracking fields — ID, owner, status, due");
      expect(baseline).toContain("must never be reported as an unresolved placeholder");
    });

    it(`${tree}: the carve-out names the tracked row without publishing the internal OQ ID format`, async () => {
      const baseline = await read(tree, BASELINE);

      expect(baseline).not.toMatch(INTERNAL_OQ_ID_SHAPE);
      // Over-correction pin: dropping the internal format must not cost the
      // carve-out its precision. The neutral spelling the `Open-questions.md`
      // templates already use stays, and the exemption stays scoped to a row
      // that carries its tracking fields.
      expect(flat(baseline)).toContain("`OQ-ID` table header");
      expect(flat(baseline)).toContain("row carrying its tracking fields");
    });

    it(`${tree}: untracked OQ / OPEN QUESTION occurrences stay scanned`, async () => {
      // The carve-out must not blanket-exempt the strings: a bare value left in
      // spec prose or a contract field is the case the scan still has to catch.
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("Everywhere else the two strings are still scanned");
      expect(baseline).toContain(
        "a bare `OQ` or `OPEN QUESTION` left as a value in generated spec prose or a contract field",
      );
      expect(baseline).toContain("or a row missing its owner, status or due date, is a hit");
    });

    it(`${tree}: a documented TBD must not be deleted`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("**A documented `TBD` is a compliant record.**");
      expect(baseline).toContain("together with a note of what evidence is missing");
      expect(baseline).toContain("deleting it destroys the record of the missing evidence");
      // The exemption needs both halves `thinking.md` requires: the missing-evidence
      // note AND the Open Question. A note-only `TBD` is still a hit.
      expect(baseline).toContain("requires raising the matching Open Question");
      expect(baseline).toContain(
        "A `TBD` missing either half — no note, or no Open Question — is a hit.",
      );
    });

    it(`${tree}: a surviving hit has a stated verdict`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("### What a surviving hit obligates");
      expect(baseline).toContain("A hit is **reported, not silently cleared**");
      expect(baseline).toContain(
        "state for each one whether it is deferred with rationale or recorded as an Open Question",
      );
      expect(baseline).toContain(
        "A completion claim that omits a surviving hit is invalid evidence",
      );
    });

    it(`${tree}: resolved is earned by a re-scan, not claimed over a surviving hit`, async () => {
      // A hit that survives is by definition still readable at that file and
      // line, so letting the report call it `resolved` clears it by assertion:
      // the artifact keeps its unfinished value and the next stage consumes it
      // as finished input. `resolved` has to mean the re-run stopped finding it.
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("**cleared by a re-scan, not by assertion**");
      expect(baseline).toContain(
        "_resolved_ is the verdict for a hit the re-run no longer reports, and that re-run is its evidence",
      );
      expect(baseline).toContain(
        "It is not available for a hit still present at that file and line",
      );
      // The verdict list for a surviving hit must not offer `resolved` back.
      expect(baseline).not.toContain("now resolved, deferred with rationale");
      expect(baseline).not.toContain("Completion is blocked while a hit is none of the three.");
      expect(baseline).toContain(
        "Completion is blocked while a surviving hit is neither of the two.",
      );
    });

    it(`${tree}: withdrawing resolved keeps the other two exits open`, async () => {
      // Over-correction pin: the point is to stop `resolved` being asserted over
      // a live token, not to block completion on every hit. Deferral and the
      // Open Question stay available, and the file/line/token report stays.
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("deferred with rationale");
      expect(baseline).toContain("recorded as an Open Question");
      expect(baseline).toContain(
        "List every hit the re-scan still finds alongside the completion claim — file, line, token",
      );
    });

    it(`${tree}: the severity floor withholds the Open Question verdict`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("**Severity floor on the verdict.**");
      expect(baseline).toContain(
        "_Deferred with rationale_ and _recorded as an Open Question_ are NOT available",
      );
      expect(baseline).toContain(
        "a concrete security defect, data loss or corruption, or a correctness defect that would break a released contract",
      );
      expect(baseline).toContain("cleared only by a named fix or by dropping the item from scope");
    });

    it(`${tree}: the required Open-questions templates still ship the exempted strings`, async () => {
      // This is the reproduction the carve-out has to cover: both required
      // files contain `OQ` and "Open Questions" with zero rows recorded.
      for (const template of [SPEC_OPEN_QUESTIONS, POLICY_OPEN_QUESTIONS]) {
        const body = await read(tree, template);

        expect(body).toContain("OQ-ID");
        expect(body).toContain("Open Questions");
        expect(body).toContain("0 open questions");
      }
    });
  }
});

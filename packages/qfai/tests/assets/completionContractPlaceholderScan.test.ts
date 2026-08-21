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

    it(`${tree}: the carve-out states OQ is a tracked artifact, not a placeholder`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("### What the placeholder scan does not flag");
      expect(baseline).toContain("**`OQ` and `OPEN QUESTION` are not placeholders.**");
      expect(baseline).toContain("a tracked artifact with an owner, a status and a due date");
      expect(baseline).toContain("must never be reported as an unresolved placeholder");
    });

    it(`${tree}: a documented TBD must not be deleted`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("**A documented `TBD` is a compliant record.**");
      expect(baseline).toContain("together with a note of what evidence is missing");
      expect(baseline).toContain("deleting it destroys the record of the missing evidence");
      expect(baseline).toContain("Only a bare `TBD` with no such note is a hit.");
    });

    it(`${tree}: a surviving hit has a stated verdict`, async () => {
      const baseline = flat(await read(tree, BASELINE));

      expect(baseline).toContain("### What a surviving hit obligates");
      expect(baseline).toContain("A hit is **reported, not silently cleared**.");
      expect(baseline).toContain(
        "whether it is now resolved, deferred with rationale, or recorded as an Open Question",
      );
      expect(baseline).toContain("Completion is blocked only while a hit is none of the three.");
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

/**
 * The Completion Checklist routes open questions instead of demanding a
 * forbidden write (#614).
 *
 * Four shipped skills carried an identical mandatory box asking that open
 * questions be logged "to the proper OQ file". None of the four owns an OQ
 * file, and every OQ file the framework ships (`08_Open-questions.md` and the
 * discussion registers) is upstream SSOT that the Drift Protocol bars all four
 * from writing. The box therefore asserted a channel the protocol closes; the
 * `(if applicable)` escape hatch meant the question was silently dropped at the
 * moment the box was ticked. The Drift Protocol already defines the real route
 * — record it as an advisory / Change Request proposal and let `/qfai-sdd`
 * adjudicate it — so the box must name that route, and must limit it to
 * questions that place a new obligation on the product. A skill's own
 * configuration questions (`/qfai-configure` listing an ambiguous test
 * directory, say) belong in that skill's output and to its user, not in an
 * advisory addressed to a phase that does not own the setting.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

/** The skills whose `## Completion Checklist (MUST)` carries the open-question item. */
const SKILLS = ["qfai-atdd", "qfai-configure", "qfai-implement", "qfai-verify"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const skillPath = (skill: string): string => `assistant/skills/${skill}/SKILL.md`;

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

const CHECKLIST_HEADING = "\n## Completion Checklist (MUST)\n";

/** The list under `## Completion Checklist (MUST)`, up to the next H2. */
function completionChecklist(source: string): string {
  const heading = source.indexOf(CHECKLIST_HEADING);
  expect(heading).toBeGreaterThan(-1);
  const next = source.indexOf("\n## ", heading + CHECKLIST_HEADING.length);
  return next === -1 ? source.slice(heading) : source.slice(heading, next);
}

describe("the Completion Checklist routes open questions to the owner phase", () => {
  for (const tree of QFAI_TREES) {
    for (const skill of SKILLS) {
      it(`${tree}/${skill}: the box no longer demands a write to an OQ file`, async () => {
        const checklist = completionChecklist(await read(tree, skillPath(skill)));

        // The exact wording that asserted a channel the Drift Protocol closes.
        expect(flat(checklist)).not.toContain(
          "Open questions were logged to the proper OQ file (if applicable).",
        );
        expect(checklist).not.toContain("the proper OQ file");
      });

      it(`${tree}/${skill}: the box names the route the Drift Protocol defines`, async () => {
        const checklist = flat(completionChecklist(await read(tree, skillPath(skill))));

        expect(checklist).toContain(
          "Open questions that place a **new obligation on the product** were routed to the owner phase (`/qfai-sdd`) as an advisory / Change Request proposal per `constitution/drift-protocol.md#reviewer-originated-obligations`;",
        );
        // A skill's own configuration questions are not reviewer-originated
        // product scope: routing them to the owner phase would misdeliver a
        // question the skill (or its user) has to answer itself.
        expect(checklist).toContain(
          "questions about this skill's own inputs or settings stay in its own output for the user to answer.",
        );
        // Reading the box alone must be enough to know the write is barred.
        expect(checklist).toContain("This skill does not write `08_Open-questions.md`.");
      });
    }

    it(`${tree}: the routing anchor the box cites exists`, async () => {
      const drift = await read(tree, "assistant/constitution/drift-protocol.md");

      expect(drift).toContain("## Reviewer-originated obligations");
    });

    it(`${tree}: qfai-implement's ban and its checklist cross-reference each other`, async () => {
      const source = await read(tree, skillPath("qfai-implement"));
      const ban = flat(source.slice(0, source.indexOf(CHECKLIST_HEADING)));

      // 187 lines separated the two instructions with nothing linking them.
      expect(ban).toContain("Do **not** edit `08_Open-questions.md` here");
      expect(ban).toContain(
        "The open-question item in the closing Completion Checklist below asks for that routing, never for a write to that file.",
      );
    });
  }
});

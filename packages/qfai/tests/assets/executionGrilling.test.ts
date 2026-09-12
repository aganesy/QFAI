/**
 * The execution stages open a grilling round before they modify anything.
 *
 * A run that asked nothing and a run that asked produce the same diff, so
 * nothing downstream can tell them apart. What is pinned here is the wiring
 * that decides which one happened: that the round exists, that its subject is
 * the invocation rather than the spec, that a contradiction found later leaves
 * through the Drift Protocol, and that the method is loaded rather than named.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const STAGES = ["qfai-implement", "qfai-atdd", "qfai-verify"];
const CONSTITUTION = "assistant/constitution/constitution.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

/** The body of the `## Grilling` section, up to the next `## ` heading. */
function grillingSection(skill: string): string {
  const start = skill.indexOf("\n## Grilling\n");
  if (start < 0) return "";
  const rest = skill.slice(start + 1);
  const end = rest.indexOf("\n## ", 1);
  return end < 0 ? rest : rest.slice(0, end);
}

for (const tree of TREES) {
  describe(`${tree}: the execution stages declare a grilling round`, () => {
    for (const stage of STAGES) {
      const rel = `assistant/skills/${stage}/SKILL.md`;

      it(`${stage}: carries the section and loads the method`, async () => {
        const section = grillingSection(await read(tree, rel));
        expect(section, `${stage} has no \`## Grilling\` section`).not.toBe("");

        // Naming a skill does not make its procedure available on a host that
        // loads bodies lazily: the agent gets the reference and improvises the
        // interview, which is the methodless interview this wiring replaces.
        expectPhrase(section, "assistant/skills/qfai-grilling/SKILL.md");
        expectPhrase(section, ".agents/rules/grilling.md");
      });

      it(`${stage}: reads the method before the preflight round`, async () => {
        const skill = await read(tree, rel);
        // The read has to be owed where the stage says what it reads first, or
        // it is owed nowhere a run actually looks.
        const p1 = skill.split(/\r?\n/).find((line) => line.startsWith("- P1: "));
        expect(p1, `${stage} declares no P1 input line`).toBeDefined();
        expectPhrase(p1 ?? "", "assistant/skills/qfai-grilling/SKILL.md");
      });

      it(`${stage}: scopes the session to the invocation, not the settled input`, async () => {
        const section = grillingSection(await read(tree, rel));
        // Re-interviewing the spec every run stops the micro-cycle and reopens
        // decisions somebody already took. The bound is what keeps the round
        // affordable enough to run every time.
        expectPhrase(section, "Declare the session over this invocation");
        expectPhrase(section, "those are settled input");
      });

      it(`${stage}: sends a contradiction through the Drift Protocol`, async () => {
        const section = grillingSection(await read(tree, rel));
        // Grilling decides what the change should ask for. It is not a second
        // route to changing settled input, and a stage that treats it as one
        // produces a spec edit nobody approved.
        expectPhrase(section, "what the change should ask");
        expectPhrase(section, "never over whether to make it");
        expectPhrase(section, "assistant/constitution/drift-protocol.md");
      });

      it(`${stage}: says what a no-question run owes instead`, async () => {
        const section = grillingSection(await read(tree, rel));
        // An assumption with no open question beside it is a decision nobody
        // took wearing the face of one somebody did.
        expectPhrase(section, "recorded as an open question");
        expectPhrase(section, "labelled an assumption");
      });
    }

    it("Article IX anchors the round and bounds its subject", async () => {
      const constitution = await read(tree, CONSTITUTION);
      const article = constitution.slice(
        constitution.indexOf("## Article IX"),
        constitution.indexOf("## Article X"),
      );
      expect(article, "Article IX not found").not.toBe("");
      expectPhrase(article, "targeted questions are one grilling round");
      expectPhrase(article, ".agents/rules/grilling.md");
      expectPhrase(article, "Its subject is this invocation, not the spec");
      expectPhrase(article, "constitution/drift-protocol.md");
    });
  });
}

describe("the two trees carry the same wiring", () => {
  for (const stage of STAGES) {
    it(`${stage}: the mirror's grilling section matches the source`, async () => {
      const [source, mirror] = await Promise.all(
        TREES.map((tree) => read(tree, `assistant/skills/${stage}/SKILL.md`)),
      );
      // `sync:ssot` writes the mirror. A run reads whichever tree it is in, so
      // a difference here is one behaviour in the repository and another in a
      // project that installed it.
      expect(grillingSection(mirror ?? "")).toBe(grillingSection(source ?? ""));
    });
  }
});

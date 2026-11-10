/**
 * The glossary check every grilling session runs: a term that clashes with a glossary is raised
 * when it appears, and a term the session settles is written at once to the glossary its stage owns.
 */
// QFAI:AC-0001-0245-01
// QFAI:AC-0001-0245-02
// QFAI:AC-0001-0245-03

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const MASTERS = [
  ".agents/rules/grilling.md",
  "packages/qfai/assets/init/root/.agents/rules/grilling.md",
];
const SKILLS = [
  "packages/qfai/assets/init/.qfai/assistant/skill/qfai-grilling/SKILL.md",
  ".qfai/assistant/skill/qfai-grilling/SKILL.md",
];

const readRaw = (rel: string): Promise<string> => readFile(path.join(ROOT, rel), "utf-8");

/** Collapse soft wraps so a clause is pinned by its wording, not its wrap column. */
const unwrap = (text: string): string => text.replace(/\s*\n\s*/g, " ");

const read = async (rel: string): Promise<string> => unwrap(await readRaw(rel));

// QFAI:EX-0001-0245-01
// QFAI:EX-0001-0245-02
// QFAI:EX-0001-0245-03
describe.each(MASTERS)("%s raises a term that clashes with a glossary", (rel) => {
  it("checks both glossaries in every session", async () => {
    const master = await read(rel);
    expect(master).toContain("## Terms against the glossary");
    expect(master).toContain(
      "Every session, user or delegated and at every stage, checks the terms it hears against `<specsDir>/01_policy/glossary.md` and, during a discussion, the pack's `08_Glossary.md`.",
    );
  });

  it("raises a clash first in the round and proposes the glossary's term", async () => {
    const master = await read(rel);
    expect(master).toContain(
      "conflicts with, or is a synonym of, a term a glossary defines is raised first in the round it appears in, or the next one when it appears in an answer.",
    );
    expect(master).toContain(
      "Questions whose answer turns on its meaning wait for the next round.",
    );
    expect(master).toContain("The griller proposes the glossary's term.");
    expect(master).toContain(
      "A plain synonym is corrected to it and noted in the round, not asked; a term with two plausible meanings is a decision node.",
    );
  });

  it("raises nothing for a matching term, and asks about an unknown one only when a decision needs it", async () => {
    const master = await read(rel);
    expect(master).toContain("A matching term raises nothing.");
    expect(master).toContain(
      "A term in neither glossary is asked about only when a decision on the tree turns on its meaning.",
    );
  });
});

// QFAI:EX-0001-0245-04
// QFAI:EX-0001-0245-05
describe.each(MASTERS)("%s writes a settled term at once", (rel) => {
  it("writes it to the glossary the stage owns, the stage's evidence or the session record", async () => {
    const master = await read(rel);
    expect(master).toContain(
      "**A settled term is written at once**, not at the end of the session",
    );
    expect(master).toContain(
      "to the pack's `08_Glossary.md` in discussion, a new term to the project glossary where the stage writes the policy layer, otherwise to the stage's evidence, beside its adopted decisions, with a line in its final report, and with no invoking stage to the session record the user reads.",
    );
  });

  it("rewrites a changed pack term, gates a project glossary change, and keeps a definition to what the term is", async () => {
    const master = await read(rel);
    expect(master).toContain("A changed pack term rewrites its row and adds no second one.");
    expect(master).toContain(
      "**Changing what the project glossary already defines contradicts a spec.** It is a critical decision, and its row is rewritten only after the user approves it.",
    );
    expect(master).toContain("A definition says what the term is.");
    expect(master).toContain(
      "A rule, a value set or a procedure belongs in the spec, not in the row.",
    );
  });
});

// QFAI:EX-0001-0245-06
describe.each(SKILLS)("%s carries the check", (rel) => {
  it("points to the master's glossary section", async () => {
    expect(await read(rel)).toContain("`.agents/rules/grilling.md#terms-against-the-glossary`");
  });
});

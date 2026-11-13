/**
 * The glossary check every grilling session runs: a term that clashes with a glossary is raised
 * when it appears, and a term the session settles is written at once to the project glossary or to an
 * open question.
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
/** The procedure the master's glossary section points to, shipped and linked. */
const REFERENCES = [
  "packages/qfai/assets/init/.qfai/assistant/skill/qfai-grilling/references/glossary-check.md",
  ".qfai/assistant/skill/qfai-grilling/references/glossary-check.md",
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
  it("checks only the project glossary in every session", async () => {
    const text = await read(rel);
    expect(text).toContain("## Terms against the glossary");
    expect(text).toContain(
      "Every session, user or delegated and at every stage, checks the terms it hears against `<specsDir>/01_policy/glossary.md`.",
    );
    expect(text).toContain(
      "Read `.qfai/assistant/skill/qfai-grilling/references/glossary-check.md` when a term clashes with the glossary, is missing from it, or is settled in a round",
    );
  });
});

describe.each(REFERENCES)("%s raises a term that clashes with a glossary", (rel) => {
  it("raises a clash first in the round and proposes the glossary's term", async () => {
    const text = await read(rel);
    expect(text).toContain(
      "conflicts with, or is a synonym of, a term the glossary defines is raised first in the round it appears in, or the next one when it appears in an answer.",
    );
    expect(text).toContain("Questions whose answer turns on its meaning wait for the next round.");
    expect(text).toContain("The griller proposes the glossary's term.");
    expect(text).toContain(
      "A plain synonym is corrected to it and noted in the round, not asked; a term with two plausible meanings is a decision node.",
    );
  });

  it("raises nothing for a matching term, and asks about an unknown one only when a decision needs it", async () => {
    const text = await read(rel);
    expect(text).toContain("A matching term raises nothing.");
    expect(text).toContain(
      "A term the glossary does not hold is asked about only when a decision on the tree turns on its meaning.",
    );
  });
});

// QFAI:EX-0001-0245-04
// QFAI:EX-0001-0245-05
describe.each(REFERENCES)("%s writes a settled term at once", (rel) => {
  it("writes it to the project glossary in a policy stage, and otherwise as an open question", async () => {
    const text = await read(rel);
    expect(text).toContain("**A settled term is written at once**, not at the end of the session");
    expect(text).toContain(
      "to the project glossary in a stage that writes the policy layer, and otherwise as an `open-questions.md` row naming the term and its definition, which `/qfai-sdd` writes into the glossary.",
    );
  });

  it("keeps a definition to what the term is", async () => {
    const text = await read(rel);
    expect(text).toContain("A definition says what the term is.");
    expect(text).toContain(
      "A rule, a value set or a procedure belongs in the spec, not in the row.",
    );
  });
});

describe.each(MASTERS)("%s gates a project glossary change", (rel) => {
  it("makes a change to a defined term a critical decision", async () => {
    expect(await read(rel)).toContain(
      "**Changing what the project glossary already defines contradicts a spec.** It is a critical decision, and its row is rewritten only after the user approves it.",
    );
  });
});

// QFAI:EX-0001-0245-06
describe.each(SKILLS)("%s carries the check", (rel) => {
  it("points to the master's glossary section", async () => {
    expect(await read(rel)).toContain("`.agents/rules/grilling.md#terms-against-the-glossary`");
    expect(await read(rel)).toContain("`references/glossary-check.md`");
  });
});

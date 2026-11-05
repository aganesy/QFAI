import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { flat, sectionOf } from "../helpers/shippedAssistant.js";
import { SKILL_MD_MAX_LINES } from "../helpers/skillBudget.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(
  here,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
);

async function skill(): Promise<string> {
  return await readFile(path.join(skillRoot, "SKILL.md"), "utf-8");
}

async function triage(): Promise<string> {
  return await readFile(path.join(skillRoot, "references", "sdd-triage.md"), "utf-8");
}

describe("qfai-sdd triage surface", () => {
  it("keeps the skill within the shared size budget", async () => {
    expect((await skill()).split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
  });

  it("locates classification and decomposition at their shipped paths", async () => {
    const content = await readFile(
      path.join(skillRoot, "..", "..", "step", "sdd-triage", "STEP.md"),
      "utf-8",
    );
    expect(content).toContain(".qfai/assistant/rule/change-classification.md");
    expect(content).toContain("references/requirements-decomposition.md");
  });

  it("records triage, rejected choices, retirement, and open questions in the two tables", async () => {
    const content = flat(await triage());
    expect(content).toContain("<paths.specsDir>/decisions.md");
    expect(content).toContain("<paths.specsDir>/open-questions.md");
    expect(content).toContain("each with exactly ID, Content and Approach");
    expect(content).toContain("retired-story file");
    expect(content).toContain("Content opens `Declined change request:`");
    expect(content).toContain("Both are rejected options and authorize nothing");
    expect(content).toContain(
      "A decisions.md row is appended once the decision is made and is never edited, moved or removed afterwards",
    );
  });

  // QFAI:EX-0001-0007-36
  // QFAI:EX-0001-0008-31
  it("gives a new register row a timestamp ID", async () => {
    const content = flat(await triage());
    expect(content).toContain("`DEC-yyyymmddhhMMss`");
    expect(content).toContain("`OQ-yyyymmddhhMMss`");
    expect(content).toContain("When a row of the same register already holds that second");
  });

  // QFAI:AC-0001-0147-17
  // QFAI:EX-0001-0147-47
  it("resolves a register-only conflict by merging the base, with no row edited", async () => {
    const conflicts = flat(sectionOf(await triage(), "### Register conflicts"));
    expect(conflicts).toContain("`git merge origin/<base>`");
    expect(conflicts).toContain("the union merge keeps both sides' rows. Push the merge.");
    expect(conflicts).toContain(
      "Renumber no row, and edit or move none, except to delete again a question row the union merge kept although one side deleted it",
    );
    expect(conflicts).toMatch(/The row the base holds keeps it/);
    expect(conflicts).toMatch(
      /deletes its own row.*appends it again under a new timestamp ID.*citations of it that the branch added/,
    );
  });

  // QFAI:AC-0001-0147-18
  // QFAI:EX-0001-0147-48
  // QFAI:EX-0001-0147-49
  // QFAI:EX-0001-0147-50
  // QFAI:EX-0001-0147-51
  // QFAI:EX-0001-0147-52
  it("writes a decision's result as the current state, in one place", async () => {
    const lives = flat(sectionOf(await triage(), "## Where a decision's result lives"));
    expect(lives).toContain("write the current state only, and rewrite it in place");
    expect(lives).toContain("No date, approver, quoted request or history");
    expect(lives).toContain("One statement per concept, with at most one sentence of reason.");
    expect(lives).toContain(
      "`01_policy/` holds a result only when it binds more than one flow or the whole product.",
    );
    expect(lives).toContain(
      "A non-functional requirement is a contract BR with a measurable threshold and an example. Only a product-wide one goes to `constraint.md`.",
    );
    expect(lives).toContain(
      "A trivial edit adds no policy or constraint entry and no decision row beyond its change request.",
    );
    expect(lives).toContain("and does not restate the edit");
  });

  // QFAI:EX-0001-0147-06
  it("appends a superseding decision and replaces a deferred question", async () => {
    const content = flat(await triage());
    expect(content).toContain("`Supersedes DEC-…` when it replaces it");
    expect(content).toContain("The earlier row stays as written.");
    expect(content).toContain(
      "delete its row and append a new question row whose Approach names the next decision point and says `Replaces OQ-…`",
    );
  });

  it("stops approval-dependent writes in no-question mode", async () => {
    const content = await triage();
    for (const operation of ["CREATE", "DELETE", "SPLIT", "MERGE", "SUPERSEDE", "UPDATE:REMOVE"]) {
      expect(content).toContain(operation);
    }
    expect(content).toContain("In --auto, ask no question");
    expect(content).toContain("stop before the dependent writes");
    expect(content).toContain("report every pending operation with its target");
  });

  it("traces companion changes through contracts", async () => {
    const content = await triage();
    expect(content).toContain("policy → BF → US → AC → EX → enforcing contract");
    expect(content).toContain("other flow or contract");
    expect(content).toContain("authoritative contract");
  });

  it("does not reuse retired IDs", async () => {
    const content = await triage();
    expect(content).toContain("highest plus one");
    expect(content).toContain("including IDs named by retirement rows");
    expect(content).toContain("Do not reuse an ID");
  });

  it("scopes exceptions and unanswered decisions to explicit rows", async () => {
    const content = await triage();
    expect(content).toContain("Unadjudicated:");
    expect(content).toContain("Test exception:");
    expect(content).toContain("It holds while the row exists");
  });
});

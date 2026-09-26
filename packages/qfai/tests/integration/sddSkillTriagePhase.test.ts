import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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
    const content = await skill();
    expect(content).toContain(".qfai/assistant/rule/change-classification.md");
    expect(content).toContain("references/requirements-decomposition.md");
  });

  it("records triage, rejected choices, retirement, and open questions in the two tables", async () => {
    const content = await triage();
    expect(content).toContain("<paths.specsDir>/decisions.md");
    expect(content).toContain("<paths.specsDir>/open-questions.md");
    expect(content).toContain("ID, Content, Approach, Status");
    expect(content).toContain("retired story");
    expect(content).toContain("Status REJECTED");
    expect(content).toContain("only Status may change");
  });

  it("stops approval-dependent writes in no-question mode", async () => {
    const content = await triage();
    for (const operation of ["CREATE", "DELETE", "SPLIT", "MERGE", "SUPERSEDE", "UPDATE:REMOVE"]) {
      expect(content).toContain(operation);
    }
    expect(content).toContain("In --auto, ask no question");
    expect(content).toContain("stop before their dependent writes");
    expect(content).toContain("report every pending row with its operation and target");
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
    expect(content).toContain("It takes effect only at DONE");
  });
});

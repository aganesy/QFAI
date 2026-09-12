/**
 * The two rounds the execution stages run.
 *
 * These stages take a spec and a test ledger as settled input, so the risk runs
 * both ways: without a round they decide alone what the spec left open, and
 * with a session they re-open a design every run and stop the micro-cycle. Each
 * assertion pins one side of that bound.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const CONSTITUTION = "assistant/constitution/constitution.md";
const STAGES = ["qfai-implement", "qfai-atdd", "qfai-verify"];

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe.each(TREES)("%s — grilling in the execution stages", (tree) => {
  const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, tree, rel), "utf-8");
  const article = async (): Promise<string> => {
    const text = await read(CONSTITUTION);
    const section = /## Article IX([\s\S]*?)^## Article X/m.exec(text);
    expect(section, "Article IX is gone or renamed").not.toBeNull();
    return section?.[1] ?? "";
  };

  it("gives the confidence gate's questions a method", async () => {
    // Article IX already said to ask targeted questions when confidence is low
    // and named no method, which is the same gap the discussion interview had.
    expectPhrase(await article(), '**"Targeted questions" means a grilling round**');
    expectPhrase(await article(), ".agents/rules/grilling.md");
  });

  it("bounds the preflight to one round, and says why", async () => {
    // A session here would re-interview a spec and a ledger that are settled
    // input, stopping the micro-cycle every run. The bound is what makes the
    // round safe to make mandatory.
    const text = await article();
    expectPhrase(text, "One round, not a session");
    expectPhrase(
      text,
      "would stop the micro-cycle and invite the drift these stages exist to avoid",
    );
    // And it covers only what the preflight could not settle.
    expectPhrase(text, "the items above it left uncertain, and nothing else");
  });

  it("runs a round on detection, and says why these stages are where it fires", async () => {
    // This is the case the whole effort exists for: an implement or atdd run
    // reads a spec closely enough for its gaps to show, and the agent that
    // finds one is the least able to judge alone what the spec ought to say.
    const text = await article();
    expectPhrase(text, "**A round also runs on detection.**");
    expectPhrase(text, "stop and grill\nrather than deciding alone");
    expectPhrase(text, "read a spec closely enough for its gaps\nto show");
  });

  it("keeps the round out of the change path", async () => {
    // Without this the round is a second way to change settled input, which is
    // exactly what the Drift Protocol exists to prevent. What it produces is an
    // input to the Change Request, not a substitute for one.
    const text = await article();
    expectPhrase(text, "That round does not change settled input, and is not a second way to.");
    expectPhrase(text, "drift-protocol.md` still governs");
    expectPhrase(text, "stop the\ndependent work, raise the Change Request, and wait for approval");
    // The seam: the round fills the options the approval chooses between.
    expectPhrase(text, "the options and the\nrecommendation its `Approved option` is chosen from");
    expectPhrase(
      text,
      "Grilling decides what the\nchange should be; the protocol decides whether it happens",
    );
  });

  it.each(STAGES)("%s cites the article rather than restating it", async (skill) => {
    // Three skills carrying three copies of one rule is three chances to drift,
    // and the drift surfaces as three agents behaving differently at the same
    // moment.
    const body = await read(`assistant/skills/${skill}/SKILL.md`);
    expectPhrase(body, "## Grilling (MANDATORY)");
    expectPhrase(
      body,
      "Article IX of `.qfai/assistant/constitution/constitution.md` owns both rounds",
    );
    expectPhrase(body, "Neither is\nrestated here.");
    // The three obligations, named where an operator reads the skill.
    expectPhrase(body, "**At the preflight.**");
    expectPhrase(body, "**On detection.**");
    expectPhrase(body, "**Neither round changes settled input.**");
  });

  it.each(STAGES)("%s does not restate the method", async (skill) => {
    // The rule's parts qualify each other, so a partial copy states the
    // opposite of what the rule says.
    const body = await read(`assistant/skills/${skill}/SKILL.md`);
    for (const mechanic of [
      /the whole frontier at once/i,
      /each question numbered/i,
      /empty frontier/i,
    ]) {
      expect(unwrap(body), `${skill} restates the method: ${String(mechanic)}`).not.toMatch(
        mechanic,
      );
    }
  });
});

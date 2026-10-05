/**
 * What the execution stages do when the spec and the work disagree.
 *
 * These stages take a spec and a test ledger as settled input. They hold no
 * grilling session of their own: a contradiction found mid-run stops the work,
 * and only an upstream change goes through the Drift Protocol.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const CONSTITUTION = "assistant/rule/constitution.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe.each(TREES)("%s — the execution stages stop on detection", (tree) => {
  const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, tree, rel), "utf-8");
  const article = async (): Promise<string> => {
    const text = await read(CONSTITUTION);
    const section = /## Article IX([\s\S]*?)^## Article X/m.exec(text);
    expect(section, "Article IX is gone or renamed").not.toBeNull();
    return section?.[1] ?? "";
  };

  it("stops rather than deciding alone, and records nothing beyond the report", async () => {
    const text = await article();
    expectPhrase(text, "**Stop on detection.**");
    expectPhrase(text, "stop rather than deciding alone");
    expectPhrase(text, "A contradiction with the spec is critical.");
    expectPhrase(text, "Nothing is recorded beyond the stage's final report.");
    expect(unwrap(text)).not.toContain("grilling session");
  });

  it("sends only an upstream change through the Drift Protocol", async () => {
    // Not every detection is drift. A dependency that is unavailable, or an
    // approach that failed, is this run's to solve, and routing it through an
    // approval blocks the run on a decision nobody upstream has to make.
    const text = await article();
    expectPhrase(text, "Only one outcome is the Drift Protocol's");
    expectPhrase(text, "Settled input must change");
    expectPhrase(text, "stop the dependent work, raise the Change Request, wait for approval");
    expectPhrase(
      text,
      "The run solves it. Nothing upstream changes, so there is nothing to approve",
    );
  });

  it("gives each drift class what that class asks for", async () => {
    // Intent drift takes options and a recommendation. Defect drift has one
    // correct repair and the protocol records `Approved option: -`, so options
    // there would be invented alternatives dressed as a choice.
    const text = await article();
    expectPhrase(text, "for\nintent drift, the options and the recommendation");
    expectPhrase(text, "for defect drift, the single correct repair");
    expectPhrase(text, "`Approved option: -`");
  });

  it("ends a no-question session on the register write", async () => {
    // Under `--auto` there is a user and the mode forbids asking them, so the
    // confirmation can never arrive. Without another ending, a stage that
    // resolved its whole frontier by inspection waits forever.
    const primitive = await read("assistant/skill/qfai-grilling/SKILL.md");
    expectPhrase(
      primitive,
      "**A session under a no-question mode cannot reach condition 2 either**",
    );
    expectPhrase(primitive, "The register write is the ending");
    expectPhrase(primitive, "would wait forever for a confirmation nobody may give");
  });

  it("verify cites the article rather than holding a session", async () => {
    const body = await read("assistant/step/verify-context/STEP.md");
    expectPhrase(body, "## Stop on detection");
    expectPhrase(body, "Article IX of `.qfai/assistant/rule/constitution.md`");
    expect(body).not.toContain("common-grilling-record");
  });
});

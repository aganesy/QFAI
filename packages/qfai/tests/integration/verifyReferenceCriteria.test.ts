/**
 * What the shipped verify references say, read against the constitution article they restate.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const assistant = path.join(getInitAssetsDir(), ".qfai", "assistant");

/** A shipped Markdown file with soft wraps collapsed, so a sentence matches across line breaks. */
async function readFlat(...segments: string[]): Promise<string> {
  return (await readFile(path.join(assistant, ...segments), "utf8")).replace(/\s+/g, " ");
}

/** The positions of each phrase in the text, which must all be found. */
function positions(text: string, phrases: readonly string[]): number[] {
  const found = phrases.map((phrase) => text.indexOf(phrase));
  expect(found.every((position) => position > -1)).toBe(true);
  return found;
}

describe("verify articles reference", () => {
  // QFAI:AC-0001-0159-02
  // QFAI:EX-0001-0159-02
  it("restates the Article V chain with no TC hop and splits the Tests hop by layer", async () => {
    const articles = await readFlat("skill", "qfai-verify", "references", "articles.md");
    const constitution = await readFlat("rule", "constitution.md");
    const article = constitution.slice(constitution.indexOf("## Article V"));

    const principle = articles.slice(
      articles.indexOf("**Traceability is mandatory**"),
      articles.indexOf("**Evidence over confidence**"),
    );
    expect(principle.length).toBeGreaterThan(0);
    const chain = positions(principle, [
      "business flow",
      "story",
      "acceptance criterion",
      "example",
      "test",
      "code",
      "verification evidence",
    ]);
    expect([...chain].sort((a, b) => a - b)).toEqual(chain);
    expect(articles).not.toMatch(/\bTC\b/);
    expect(articles).not.toContain("test-list");
    expect(articles).not.toContain("tdd/");
    expect(articles).toContain("`.qfai/assistant/rule/constitution.md` Article V");

    expect(articles).toContain(
      "BF is covered by E2E tests, AC by integration or API tests, and EX by a selected non-E2E test.",
    );
    expect(article).toContain("`BF-*` requires a `QFAI:BF-NNNN` annotation in an E2E test.");
    expect(article).toContain(
      "`AC-*` requires a `QFAI:AC-NNNN-NNNN-NN` annotation in an integration or API test.",
    );
    expect(article).toContain(
      "`EX-*` requires a `QFAI:EX-NNNN-NNNN-NN` annotation in a selected non-E2E test file",
    );
  });
});

/**
 * Article VII of the shipped constitution ranks the business-screen floor above
 * itself, so a part every business screen has is never cut as excess scope.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const initRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
);
const read = (relative: string): Promise<string> =>
  readFile(path.join(initRoot, ...relative.split("/")), "utf-8");
const flat = (text: string): string => text.replace(/\s+/g, " ");
const FLOOR = "## What a business screen always has";

/** Article VII's text, from its heading to the next article. */
async function articleSeven(): Promise<string> {
  const text = flat(await read(".qfai/assistant/rule/constitution.md"));
  const start = text.indexOf("## Article VII ");
  return text.slice(start, text.indexOf("## Article VIII", start));
}

// QFAI:EX-0001-0309-01
describe("Article VII ranks the business-screen floor above itself", () => {
  it("lists the floor after the safety floor among what outranks the article", async () => {
    const article = await articleSeven();
    const ranking = article.slice(
      article.indexOf("The safety floor"),
      article.indexOf("outrank this article"),
    );
    expect(ranking).toContain(`\`${FLOOR}\` in \`.agents/rules/interface-clarity.md\``);
    expect(ranking.indexOf("§ 2")).toBeLessThan(ranking.indexOf(FLOOR));
    expect(article).toContain("A part on that list is never scope beyond the minimum");
  });
});

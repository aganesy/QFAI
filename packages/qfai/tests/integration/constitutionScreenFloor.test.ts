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

// QFAI:AC-0001-0309-01
describe("the business-screen list outranks Article VII", () => {
  it("names a heading the shipped interface-clarity rule declares", async () => {
    const rule = await read("root/.agents/rules/interface-clarity.md");
    expect(rule.split(/\r?\n/)).toContain(FLOOR);
    const article = await articleSeven();
    expect(article).toContain(FLOOR);
    expect(article).toContain("how it is built still is");
  });
});

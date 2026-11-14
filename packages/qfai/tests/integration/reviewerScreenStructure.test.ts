/**
 * An installed product-surface reviewer card sends every review through the
 * structure and state sections of design-anti-patterns, and those links land
 * on headings the installed reference declares.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const assistant = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
);
const read = (relative: string): Promise<string> =>
  readFile(path.join(assistant, ...relative.split("/")), "utf-8");

// QFAI:AC-0001-0304-01
describe("the product-surface reviewer checks structure and states on every review", () => {
  it("links each section it requires to a heading of the reference", async () => {
    const card = await read("agent/product-surface-reviewer.md");
    const reference = await read("skill/qfai-sdd/references/design-anti-patterns.md");
    const links = Array.from(
      card.matchAll(/design-anti-patterns\.md#([a-z-]+)/g),
      (match) => match[1] ?? "",
    );
    expect(links).toEqual(
      expect.arrayContaining(["information-architecture-and-flow", "states-and-accessibility"]),
    );
    expect(reference).toContain("## Information architecture and flow");
    expect(reference).toContain("## States and accessibility");
    expect(card).toContain(".qfai/assistant/rule/references/reviewer-findings.md");
  });
});

/**
 * The product-surface reviewer checks the structure and state patterns that
 * design-anti-patterns already names, not only the copy section, and leaves
 * the severity of each finding to the shared reviewer findings rule.
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
const ANTI_PATTERNS = "skill/qfai-sdd/references/design-anti-patterns.md";
const read = (relative: string): Promise<string> =>
  readFile(path.join(assistant, ...relative.split("/")), "utf-8");

/** The GitHub anchor of a Markdown heading. */
const anchor = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/ /g, "-");

// QFAI:EX-0001-0304-01
describe("the product-surface reviewer checks structure and states", () => {
  it("links both sections as checks on every review, by anchors the reference declares", async () => {
    const card = await read("agent/product-surface-reviewer.md");
    const reference = await read(ANTI_PATTERNS);
    const headings = Array.from(reference.matchAll(/^## (.+)$/gm), (match) =>
      anchor(match[1] ?? ""),
    );
    for (const section of ["information-architecture-and-flow", "states-and-accessibility"]) {
      expect(headings).toContain(section);
      expect(card).toContain(`.qfai/assistant/${ANTI_PATTERNS}#${section}`);
    }
    expect(card.replace(/\s+/g, " ")).toContain(
      "on every review, whether or not an acceptance criterion names the part",
    );
  });

  it("leaves each finding's severity to the reviewer findings rule", async () => {
    const card = await read("agent/product-surface-reviewer.md");
    const bullet = card.slice(card.indexOf("#information-architecture-and-flow"));
    const end = bullet.indexOf("\n- ");
    expect(bullet.slice(0, end === -1 ? undefined : end)).toContain(
      ".qfai/assistant/rule/references/reviewer-findings.md",
    );
  });
});

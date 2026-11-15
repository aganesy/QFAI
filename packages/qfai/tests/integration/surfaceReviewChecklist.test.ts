/**
 * An installed product-surface reviewer card sends every screen review through
 * the surface review checklist, the repository's own assistant tree carries the
 * same checklist, and every item the checklist lists names its source.
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
const repoRoot = path.resolve(initRoot, "..", "..", "..", "..");
const CHECKLIST = ".qfai/assistant/rule/references/surface-review-checklist.md";
const CARD = ".qfai/assistant/agent/product-surface-reviewer.md";

// QFAI:AC-0001-0315-01
describe("the product-surface reviewer walks the shipped checklist on every review", () => {
  it("cites an installed checklist whose item sections each name a source", async () => {
    const card = await readFile(path.join(initRoot, CARD), "utf-8");
    expect(card.replace(/\s+/g, " ")).toContain(`\`${CHECKLIST}\` for every screen`);

    const checklist = await readFile(path.join(initRoot, CHECKLIST), "utf-8");
    expect(await readFile(path.join(repoRoot, CHECKLIST), "utf-8")).toBe(checklist);

    const sections = checklist.split(/^## /m).slice(1);
    for (const name of ["Usability heuristics", "Accessibility criteria", "Widget patterns"]) {
      const section = sections.find(
        (body) => body.startsWith(`${name}\n`) || body.startsWith(`${name}\r\n`),
      );
      expect(section, name).toMatch(/^Source: .+/m);
      expect(section, name).toMatch(/<https:\/\/[^>]+>/);
    }
    const heuristics = checklist.match(/^\| `H\d+` +\|/gm) ?? [];
    const criteria = checklist.match(/^\| `WCAG \d+\.\d+\.\d+` +\|/gm) ?? [];
    expect(heuristics).toHaveLength(10);
    expect(criteria).toHaveLength(12);
  });
});

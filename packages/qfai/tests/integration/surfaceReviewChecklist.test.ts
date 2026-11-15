/**
 * An installed product-surface reviewer card sends every screen review through
 * the surface review checklist `qfai init` installs beside it, asks for every
 * item to be reported, and every item section of the checklist names its
 * source.
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
const CARD = ".qfai/assistant/agent/product-surface-reviewer.md";

// QFAI:AC-0001-0304-02
describe("the product-surface reviewer walks the same sourced checklist on every review", () => {
  it("cites an installed checklist whose item sections each name a source", async () => {
    const card = (await readFile(path.join(initRoot, CARD), "utf-8")).replace(/\s+/g, " ");
    const cited = /`(\.qfai\/assistant\/rule\/references\/[a-z-]+\.md)` for every screen/.exec(
      card,
    )?.[1];
    expect(cited).toBeDefined();
    expect(card).toContain("report each item as `pass`, `finding` or `not applicable`");

    const checklist = await readFile(path.join(initRoot, cited ?? ""), "utf-8");
    const sections = checklist.split(/^## /m).slice(1);
    for (const name of ["Usability heuristics", "Accessibility criteria", "Widget patterns"]) {
      const section = sections.find(
        (body) => body.startsWith(`${name}\n`) || body.startsWith(`${name}\r\n`),
      );
      expect(section, name).toMatch(/^Source: .+/m);
    }
    expect(checklist.match(/^\| `H\d+` +\|/gm) ?? []).toHaveLength(10);
    expect(checklist.match(/^\| `WCAG \d+\.\d+\.\d+` +\|/gm) ?? []).toHaveLength(12);
  });
});

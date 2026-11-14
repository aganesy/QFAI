/**
 * The business UI pattern reference.
 *
 * Without a description of what a standard screen of each type contains, the
 * agent's idea of done was the UI contract. The reference lists the parts of
 * each screen type, and the three stages that decide a screen read the same
 * file: the contract step, the implementation step and the screen review.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

const REFERENCE = "skill/qfai-sdd/references/business-ui-patterns.md";
const CITATION = `.qfai/assistant/${REFERENCE}`;

const SCREEN_TYPES = [
  "Every screen",
  "List",
  "Detail",
  "Create and edit form",
  "Settings",
  "Member management",
  "Dashboard",
];

const CITERS = [
  "step/sdd-contract/STEP.md",
  "step/implement-tdd/STEP.md",
  "agent/product-surface-reviewer.md",
];

describe("business UI pattern reference", () => {
  for (const root of ASSISTANT_ROOTS) {
    const tree = path.relative(repoRoot, root);

    it(`${tree}: covers each screen type with its parts and anti-patterns`, async () => {
      const text = await readFile(path.join(root, REFERENCE), "utf-8");
      const headings = Array.from(text.matchAll(/^## (.+)$/gm), (match) => match[1]);

      expect(headings).toEqual(["Contents", ...SCREEN_TYPES, "Using this reference"]);
      const sections = text.split(/^## /m).slice(2, 2 + SCREEN_TYPES.length);
      for (const section of sections) {
        expect(section).toContain("Anti-patterns:");
        expect(section).toContain("Catalogue:");
      }
      expect(text).toContain(".qfai/assistant/rule/ui-procurement.md");
    });

    it(`${tree}: the contract step, the implementation and the screen review cite it`, async () => {
      const missing: string[] = [];
      for (const citer of CITERS) {
        const text = (await readFile(path.join(root, citer), "utf-8")).replace(/\s+/g, " ");
        if (!text.includes(CITATION)) missing.push(citer);
      }
      expect(missing).toEqual([]);
    });
  }
});

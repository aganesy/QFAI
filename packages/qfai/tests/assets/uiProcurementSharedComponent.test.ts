/**
 * Implementation runs one example at a time, so a region is only ever used
 * once at the moment it is written. Rung 1 of the procurement ladder must say
 * that a region two UI contracts name becomes a shared component at its first
 * use, or every screen authors its own copy and the visual language drifts.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const RULE = path.join("assistant", "rule", "ui-procurement.md");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("ui-procurement rung 1 extracts a shared component", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: at first use when two contracts name the region, else at the second screen`, async () => {
      const text = flat(await readFile(path.join(repoRoot, tree, RULE), "utf-8"));

      expect(text).toContain(
        "When two or more UI contracts name the same region, extract a shared component at the region's first use.",
      );
      expect(text).toContain(
        "When a region no second contract names appears on a second screen and no shared component realises it, extract one then.",
      );
      expect(text).toContain("use it on every screen, rather than authoring the region again.");
    });
  }
});

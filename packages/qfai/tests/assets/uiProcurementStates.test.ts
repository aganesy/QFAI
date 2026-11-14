/**
 * The procurement rule says where a state's look comes from (the adopted
 * system's default). It must also say that each data or input region has the
 * states at all: a screen with no success state and one app-wide error
 * fallback followed the look rule and still shipped incomplete.
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

describe("ui-procurement requires each region's states to exist", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: every data or input region lists its states and what realises each`, async () => {
      const text = flat(await readFile(path.join(repoRoot, tree, RULE), "utf-8"));

      expect(text).toContain("## Every state exists");
      expect(text).toContain("Each region that loads data or accepts input lists its states");
      expect(text).toContain("(default, empty, loading, error and success)");
      expect(text).toContain("listed as not applicable, with the reason");
      expect(text).toContain("does not realise a region's loading or error state");
    });
  }
});

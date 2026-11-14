/**
 * A catalogue item that rendered inline styles under a nonce-based content
 * security policy was installed and then removed, and the screen was rebuilt
 * on a native element. The procurement rule now checks each catalogue and item
 * against the constraints `tech.md` records, and tries a native element before
 * the design system.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const RULE = path.join("assistant", "rule", "ui-procurement.md");
const TECH = path.join(
  "assistant",
  "skill",
  "qfai-sdd",
  "templates",
  "spec",
  "03_contract",
  "tech.md",
);

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("ui-procurement checks runtime compatibility", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: a native element is tried before the design system`, async () => {
      const text = flat(await readFile(path.join(repoRoot, tree, RULE), "utf-8"));

      expect(text).toContain("2. **Does a native platform element do it?**");
      expect(text).toContain("3. **Does the project's installed design system already have it?**");
      expect(text).toContain("6. **Only then author it**");
    });

    it(`${tree}: each catalogue and item is held against the UI constraints row`, async () => {
      const text = flat(await readFile(path.join(repoRoot, tree, RULE), "utf-8"));

      expect(text).toContain("Three things decide it, and none is taste:");
      expect(text).toContain("**Does it meet the constraints the project has fixed?**");
      expect(text).toContain("An item that breaks a constraint is not installed");
      expect(text).toContain("naming the item and the constraint it breaks");
      expect(text).toContain("records that it meets each constraint");
    });

    it(`${tree}: the tech.md template carries a UI constraints row`, async () => {
      const text = await readFile(path.join(repoRoot, tree, TECH), "utf-8");

      expect(text).toMatch(/^\| UI constraints +\| `<content security policy, /m);
    });
  }
});

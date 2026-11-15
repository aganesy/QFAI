/**
 * A catalogue item that rendered inline styles under a nonce-based content
 * security policy was installed and then removed, and the screen was rebuilt
 * on a native element. The procurement rule now checks each catalogue and item
 * against the constraints `01_policy/constraint.md` records, and tries a native element before
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
const REVIEWER = path.join(
  "assistant",
  "skill",
  "qfai-prototyping",
  "references",
  "reviewer-prompt.md",
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

    it(`${tree}: each catalogue and item is held against the recorded constraints`, async () => {
      const text = flat(await readFile(path.join(repoRoot, tree, RULE), "utf-8"));

      expect(text).toContain("Three things decide it, and none is taste:");
      expect(text).toContain("**Does it meet the constraints the project has fixed?**");
      expect(text).toContain("An item that breaks a constraint is not installed");
      expect(text).toContain("procurement record names the item and the constraint it breaks");
      expect(text).toContain(
        "`## Technical Constraints` and `## Quality targets` rows of `01_policy/constraint.md`",
      );
      expect(text).toContain("there is nothing to check, and the procurement record says so");
      expect(text).toContain("names the constraints it was checked against");
    });

    it(`${tree}: a known incompatibility reaches the next project that adopts the catalogue`, async () => {
      const text = flat(await readFile(path.join(repoRoot, tree, RULE), "utf-8"));
      expect(text).toContain("`.qfai/assistant/rule/references/catalogue-compatibility.md`");
      const reference = flat(
        await readFile(
          path.join(
            repoRoot,
            tree,
            "assistant",
            "rule",
            "references",
            "catalogue-compatibility.md",
          ),
          "utf-8",
        ),
      );
      expect(reference).toContain("A row is a hint to verify, not a verdict.");
      expect(reference).toContain(
        "| Catalogue | Item | Constraint it breaks | How it breaks | Version checked | Checked on | Source |",
      );
    });

    it(`${tree}: the prototype review does not block a native element`, async () => {
      const text = flat(await readFile(path.join(repoRoot, tree, REVIEWER), "utf-8"));

      expect(text).toContain("where they cover the need and no native element does");
      expect(text).toContain("A native element was used where one does the job");
    });
  }
});

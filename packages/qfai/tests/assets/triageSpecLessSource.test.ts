import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TRIAGE = "assistant/skills/qfai-sdd/references/sdd-triage.md";
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("a source file no spec owns has a triage rule", () => {
  for (const tree of TREES) {
    it(`${tree}: its obligations go to the specs that own each behaviour`, async () => {
      // With no rule here, each project picked one of the three moves below,
      // two of which lose the work or the spec's meaning.
      const triage = await readFile(path.join(repoRoot, tree, TRIAGE), "utf-8");
      const start = triage.indexOf("### A source file no spec owns");
      expect(start).toBeGreaterThan(triage.indexOf("### `Existing Spec` grammar"));
      const section = unwrap(triage.slice(start, triage.indexOf("\n## ", start)));
      expect(section).toContain(
        "**Split its obligations by behaviour, and give each one a row on the spec that already owns that behaviour**",
      );
      for (const move of [
        "| Name a spec that owns none of it |",
        "| Target `_policies` |",
        "| Raise a new spec for the file |",
      ]) {
        expect(section.replace(/ {2,}/g, " ")).toContain(move);
      }
      expect(section).toContain(
        "A behaviour no spec owns is a missing capability, not a file problem.",
      );
    });
  }
});

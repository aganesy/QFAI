import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * Every shipped surface that names the `UPDATE:<SUB-OP>` colon form, in both
 * the packaged tree and the generated root mirror.
 */
const SURFACES = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md",
  ".qfai/assistant/skills/qfai-sdd/SKILL.md",
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/_policies/11_Slice-Policy.md",
  ".qfai/assistant/skills/qfai-sdd/templates/specs/_policies/11_Slice-Policy.md",
];

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("the colon form is taught as prose shorthand, not as a cell value", () => {
  for (const relativePath of SURFACES) {
    it(`${relativePath}: does not claim the colon form is what validators consume`, async () => {
      const content = unwrap(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      // `QFAI-TRIAGE-003` is a membership test over
      // CREATE / UPDATE / DELETE / SPLIT / MERGE / SUPERSEDE, so an author
      // who typed `UPDATE:APPEND` into `Operation` got a hard error.
      expect(content).not.toContain("is the canonical SSOT used by validators");
      expect(content).not.toContain("is the canonical SSOT for validators");
      expect(content).not.toContain("the colon-separated form (no space)");
      expect(content).not.toContain("the colon-separated form, no space,");
    });

    it(`${relativePath}: names both cells and the validator the colon form trips`, async () => {
      const content = unwrap(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      expect(content).toContain("prose");
      expect(content).toContain("shorthand");
      expect(content).toContain("never a cell value");
      expect(content).toContain("`Operation` = `UPDATE`");
      expect(content).toContain("`Sub-op` = `APPEND` / `MODIFY` / `REMOVE`");
      expect(content).toContain(
        "Writing `UPDATE:APPEND` into the `Operation` cell fails `QFAI-TRIAGE-003`",
      );
      // The row shape lives in the triage reference, so point there.
      expect(content).toContain("references/sdd-triage.md");
    });
  }
});

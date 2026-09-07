import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const CAPABILITY_TEMPLATES = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/_policies/03_Capabilities.md",
  ".qfai/assistant/skills/qfai-sdd/templates/specs/_policies/03_Capabilities.md",
];
const SLICE_TEMPLATES = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/_policies/11_Slice-Policy.md",
  ".qfai/assistant/skills/qfai-sdd/templates/specs/_policies/11_Slice-Policy.md",
];
const TRIAGE_REFERENCES = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md",
  ".qfai/assistant/skills/qfai-sdd/references/sdd-triage.md",
];
// Every shipped CREATE procedure. Each one has to name the `Spec` cell, or an
// agent follows it, leaves the cell blank, clears QFAI-TRIAGE-006, and only
// then trips QFAI-SPLIT-106 at the final gate with no instruction to fall back on.
const CREATE_PROCEDURES = [
  ...TRIAGE_REFERENCES,
  ...SLICE_TEMPLATES,
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md",
  ".qfai/assistant/skills/qfai-sdd/SKILL.md",
];

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = async (relativePath: string): Promise<string> =>
  readFile(path.join(repoRoot, relativePath), "utf-8");

describe("the CAP catalog declares the spec mapping the gap policy depends on", () => {
  for (const relativePath of CAPABILITY_TEMPLATES) {
    it(`${relativePath}: the catalog table carries a Spec column`, async () => {
      const content = await read(relativePath);
      // Without this column `validateSpecSplitByCapability` derives the spec
      // directory from row order, and an approved DELETE that leaves a gap
      // raises QFAI-SPLIT-103/104/105 with no legal edit that clears them.
      expect(content).toContain("| CAP ID   | Spec      |");
      expect(content).toContain("| CAP-0001 | spec-0001 |");
      expect(content).toContain("| CAP-0002 | spec-0002 |");
    });

    it(`${relativePath}: the mapping is named as the SSOT, not the row order`, async () => {
      const content = unwrap(await read(relativePath));
      expect(content).not.toContain(
        "Spec directories are generated from this order (`spec-0001`, `spec-0002`, ...)",
      );
      expect(content).toContain(
        "The `Spec` column declares which spec directory owns each capability",
      );
      expect(content).toContain("validateSpecSplitByCapability");
      expect(content).toContain("QFAI-SPLIT-106");
    });
  }

  for (const relativePath of SLICE_TEMPLATES) {
    it(`${relativePath}: the gap policy names the validator codes it interacts with`, async () => {
      const content = unwrap(await read(relativePath));
      expect(content).toContain("A gap is legal only because the mapping is declared");
      expect(content).toContain("QFAI-SPLIT-103");
      expect(content).toContain("QFAI-SPLIT-105");
      expect(content).toContain("QFAI-SPLIT-106");
    });

    it(`${relativePath}: DELETE also drops the capability row`, async () => {
      const content = unwrap(await read(relativePath));
      expect(content).toContain(
        "DELETE removes the spec directory entirely and drops the capability's row from `_policies/03_Capabilities.md`",
      );
      // The ID-stability rule must stay: a DELETE never renumbers survivors.
      expect(content).toContain("Do not renumber surviving specs only to close gaps");
    });
  }

  // Every shipped SPLIT procedure. An approved SPLIT moves capabilities between
  // directories, so a step that only creates the new spec leaves the moved CAP
  // row pointing at the old one and strands the run on QFAI-SPLIT-106/104/105.
  for (const relativePath of [...SLICE_TEMPLATES, ...TRIAGE_REFERENCES]) {
    it(`${relativePath}: the SPLIT step reassigns each moved CAP row's Spec cell`, async () => {
      const content = unwrap(await read(relativePath));
      expect(content).toContain("`Spec` cell of every moved `CAP-NNNN` row");
      expect(content).toContain("QFAI-SPLIT-104");
      expect(content).toContain("QFAI-SPLIT-105");
      expect(content).toContain("QFAI-SPLIT-106");
    });
  }

  for (const relativePath of TRIAGE_REFERENCES) {
    it(`${relativePath}: the DELETE lifecycle step also drops the CAP row`, async () => {
      const content = unwrap(await read(relativePath));
      // SKILL.md points at this file as the precise procedure, so a DELETE step
      // that only removes the directory leaves the CAP row behind and strands
      // the run on a QFAI-SPLIT-103 it was never told to clear.
      expect(content).toContain(
        "DELETE removes the spec directory entirely and drops the capability's row from `_policies/03_Capabilities.md`",
      );
      expect(content).toContain("QFAI-SPLIT-103");
    });
  }

  for (const relativePath of SLICE_TEMPLATES) {
    it(`${relativePath}: no rule still promises sequential directory names`, async () => {
      const content = unwrap(await read(relativePath));
      // The gap policy legalises `spec-0001` + `spec-0003`; a surviving
      // "sequential directory names" claim would justify renumbering them back.
      expect(content).not.toContain("sequential directory names");
      expect(content).toContain("each CAP row declares exactly one directory in the `Spec` column");
      expect(content).toContain("never a row-order sequence");
    });
  }

  for (const relativePath of CREATE_PROCEDURES) {
    it(`${relativePath}: the CREATE step fills the Spec cell too`, async () => {
      const content = unwrap(await read(relativePath));
      expect(content).toContain("fill its `Spec` cell with the next unused `spec-NNNN`");
      expect(content).toContain("QFAI-SPLIT-106");
    });

    // These procedures used to end "an empty `Spec` cell fails `QFAI-SPLIT-106`
    // at the final gate". It does not: the code is inside its promotion window
    // (`sunset.ts#RULE_PROMOTIONS.specSplitDeclaredMapping`), so it is emitted
    // at `warning` and `validate --fail-on error` exits 0 — and a blank cell
    // suppresses 103/104/105 for that row, so nothing else stands in for it. An
    // agent trusting the old sentence would read the exit code, see success, and
    // call an undeclared catalog complete. Say what actually stops it: read the
    // findings.
    it(`${relativePath}: the CREATE step does not call the warning a gate failure`, async () => {
      const content = unwrap(await read(relativePath));
      expect(content).not.toContain("empty `Spec` cell fails `QFAI-SPLIT-106` at the final gate");
      expect(content).toMatch(/promotion window/);
      expect(content).toMatch(/exits? 0/);
    });
  }
});

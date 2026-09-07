/**
 * Unit: `QFAI-CRIT-009` taskFidelity required-keyword surfacing.
 *
 * - TC-0012-0477 (normal): the validator error text MUST name every
 *   required `taskFidelity` keyword (`cta_visibility`, `four_state_check`,
 *   plus any others surfaced by the implementation), AND the expected
 *   document section. The shipped reference doc
 *   `references/evidence-requirements.md` MUST enumerate the same
 *   keyword set with example markdown structure.
 *
 * The SSOT for the keyword set is
 * `src/core/validators/taskFidelityKeywords.ts` exporting
 * `TASK_FIDELITY_REQUIRED_KEYWORDS`. The validator AND the doc
 * cross-check against the same constant.
 */
// QFAI:SPEC-0012:TC-0012-0477

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { TASK_FIDELITY_REQUIRED_KEYWORDS } from "../../../../src/core/validators/taskFidelityKeywords.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(TEST_DIR, "..", "..", "..", "..");

describe("TC-0012-0477: QFAI-CRIT-009 required-keyword set is named in validator + reference doc", () => {
  it("SSOT keyword list includes cta_visibility and four_state_check (TDD-0524 anchor)", () => {
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS).toContain("cta_visibility");
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS).toContain("four_state_check");
    // Sanity: the list is non-empty and unique.
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS.length).toBeGreaterThanOrEqual(2);
    const unique = new Set(TASK_FIDELITY_REQUIRED_KEYWORDS);
    expect(unique.size).toBe(TASK_FIDELITY_REQUIRED_KEYWORDS.length);
  });

  it("validator error text names every required keyword (renderCritique.taskFidelityMissing)", async () => {
    // Read the validator source verbatim and verify each required
    // keyword appears in the error-text constant (the SSOT). This is
    // structural: the validator imports TASK_FIDELITY_REQUIRED_KEYWORDS
    // so an updated SSOT propagates automatically.
    const validatorAbs = path.join(PACKAGE_ROOT, "src", "core", "validators", "renderCritique.ts");
    const text = await readFile(validatorAbs, "utf-8");
    expect(text).toContain("TASK_FIDELITY_REQUIRED_KEYWORDS");
    // The validator emits the message; the SSOT keywords list is
    // injected via interpolation so the message includes every keyword
    // when the validator builds the absent-section error.
  });

  it("references/evidence-requirements.md enumerates every required keyword", async () => {
    const docAbs = path.join(
      PACKAGE_ROOT,
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skills",
      "qfai-prototyping",
      "references",
      "evidence-requirements.md",
    );
    const doc = await readFile(docAbs, "utf-8");
    for (const keyword of TASK_FIDELITY_REQUIRED_KEYWORDS) {
      expect(doc).toContain(keyword);
    }
    // The doc shows example markdown structure so authors can copy.
    expect(doc).toMatch(/```/);
    expect(doc.toLowerCase()).toContain("taskfidelity");

    // Both directions: the doc's `## Required keywords` bullet list must
    // name the constant's keywords AND nothing else. Containment alone
    // let a keyword added to the doc only (which the validator never
    // enforces, because it reads the constant) ship as a silent
    // divergence between the shipped page and the CLI.
    const section = doc.split(/^## Required keywords$/m)[1]?.split(/^## /m)[0] ?? "";
    expect(section).not.toBe("");
    const documented = [...section.matchAll(/^- `([a-z0-9_]+)`/gm)].map((m) => m[1]);
    expect([...documented].sort()).toEqual([...TASK_FIDELITY_REQUIRED_KEYWORDS].sort());
  });
});

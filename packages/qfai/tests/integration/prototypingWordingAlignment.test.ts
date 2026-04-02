// QFAI:SPEC-0012:TC-0012-0014
// QFAI:SPEC-0012:TC-0012-0015
// QFAI:SPEC-0012:TC-0012-0016
// QFAI:SPEC-0012:TC-0012-0042
// QFAI:SPEC-0012:TC-0012-0043
// QFAI:SPEC-0012:TC-0012-0044
// QFAI:SPEC-0012:TC-0012-0045
//
// TDD-0015 — Wording alignment integration tests for prototyping SKILL.md.
// TDD-0016 — Routing condition consistency verification for prototyping SKILL.md.
// Verifies that documented capability claims match implemented behavior
// and that aspirational language is detected and flagged.

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  checkModeHeadings,
  checkRoutingConsistency,
  detectAspirationalClaims,
} from "../../src/core/validators/skill/prototypingSkill.js";
import type { RoutingCondition } from "../../src/core/validators/skill/prototypingSkill.js";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Resolve project root (two levels above packages/qfai). */
function projectRoot(): string {
  return resolve(import.meta.dirname, "..", "..", "..", "..");
}

/** Read the real prototyping SKILL.md from the repository. */
async function readSkillMd(): Promise<string> {
  const skillPath = resolve(
    projectRoot(),
    ".qfai",
    "assistant",
    "skills",
    "qfai-prototyping",
    "SKILL.md",
  );
  return readFile(skillPath, "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// TC-0012-0042: Wording alignment — standard mode verification
// ═══════════════════════════════════════════════════════════════════════════

describe("TC-0012-0042: Wording alignment — standard mode verification", () => {
  it("detects zero aspirational claims in the current SKILL.md", async () => {
    const content = await readSkillMd();

    const claims = detectAspirationalClaims(content);

    expect(claims).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TC-0012-0043: Aspirational language detection
// ═══════════════════════════════════════════════════════════════════════════

describe("TC-0012-0043: Aspirational language detection", () => {
  it("flags injected aspirational language in SKILL.md content", async () => {
    const original = await readSkillMd();

    // Inject aspirational language: replace a real capability description
    // with an unimplemented claim.
    const modified = original.replace(
      "Static checks plus optional light validation",
      "full browser-based visual regression testing with pixel-diff comparison",
    );

    // Sanity: confirm we actually mutated the content
    expect(modified).not.toEqual(original);

    const claims = detectAspirationalClaims(modified);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims.some((c) => /visual regression/i.test(c))).toBe(true);
  });

  it("flags multiple aspirational phrases when several are injected", async () => {
    const original = await readSkillMd();

    const modified = original
      .replace(
        "Static checks plus optional light validation",
        "AI-powered automatic code generation with self-healing tests",
      )
      .replace(
        "Static checks only: file existence, route declaration, schema presence",
        "full real-time performance profiling with flame graph analysis",
      );

    expect(modified).not.toEqual(original);

    const claims = detectAspirationalClaims(modified);

    expect(claims.length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TC-0012-0044: Routing consistency — conditions match
// ═══════════════════════════════════════════════════════════════════════════

// QFAI:SPEC-0012:TC-0012-0044
describe("TC-0012-0044: Routing consistency — conditions match", () => {
  const implementedRouting: RoutingCondition[] = [
    {
      mode: "full-harness",
      trigger: "explicit --mode full-harness",
      target: "runtime-heavy obligations",
    },
    {
      mode: "standard",
      trigger: "system default or discussion recommendation",
      target: "static checks + light validation",
    },
    {
      mode: "low-cost",
      trigger: "explicit --mode low-cost",
      target: "static checks only",
    },
  ];

  it("real SKILL.md routing conditions are consistent with implementation", async () => {
    const content = await readSkillMd();

    const result = checkRoutingConsistency(content, implementedRouting);

    expect(result.consistent).toBe(true);
    expect(result.contradictions).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TC-0012-0045: Routing consistency — contradiction detection
// ═══════════════════════════════════════════════════════════════════════════

// QFAI:SPEC-0012:TC-0012-0045
describe("TC-0012-0045: Routing consistency — contradiction detection", () => {
  const implementedRouting: RoutingCondition[] = [
    {
      mode: "full-harness",
      trigger: "explicit --mode full-harness",
      target: "runtime-heavy obligations",
    },
    {
      mode: "standard",
      trigger: "system default or discussion recommendation",
      target: "static checks + light validation",
    },
    {
      mode: "low-cost",
      trigger: "explicit --mode low-cost",
      target: "static checks only",
    },
  ];

  it("detects contradiction when SKILL.md routing diverges from implementation", async () => {
    const original = await readSkillMd();

    // Inject contradictory routing: full-harness should require explicit opt-in,
    // but we replace that with an automatic trigger condition.
    const modified = original.replace(
      "Must be explicitly opted in by the user (never auto-activated).",
      "automatically triggers when evidence score is below threshold",
    );

    // Sanity: confirm mutation actually happened
    expect(modified).not.toEqual(original);

    const result = checkRoutingConsistency(modified, implementedRouting);

    expect(result.consistent).toBe(false);
    expect(result.contradictions.length).toBeGreaterThan(0);
    expect(result.contradictions.some((c) => /full-harness/i.test(c))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TC-0012-0014: No CLI references in active documents
// ═══════════════════════════════════════════════════════════════════════════

// QFAI:SPEC-0012:TC-0012-0014
describe("TC-0012-0014: No CLI references in active documents", () => {
  it("SKILL.md does not reference 'qfai prototyping' as a CLI command", async () => {
    const content = await readSkillMd();

    // SKILL.md should not contain direct CLI invocation syntax
    expect(content).not.toMatch(/\bqfai\s+prototyping\b/);
    expect(content).not.toMatch(/\$\s+qfai\b/);
    expect(content).not.toMatch(/npx\s+qfai\s+prototyping\b/);
  });

  it("steering/policies files do not contain CLI invocations for prototyping", async () => {
    const root = projectRoot();
    const steeringDir = resolve(root, ".qfai", "assistant", "steering");
    let files: string[];
    try {
      files = await readdir(steeringDir);
    } catch {
      // steering dir may not exist in all setups
      return;
    }
    for (const file of files) {
      if (!file.endsWith(".md") && !file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
      const content = await readFile(resolve(steeringDir, file), "utf-8");
      // Check for actual CLI command invocation syntax, not skill name references
      expect(content).not.toMatch(/\$\s+qfai\s+prototyping\b/);
      expect(content).not.toMatch(/npx\s+qfai\s+prototyping\b/);
      expect(content).not.toMatch(/pnpm\s+(?:exec\s+)?qfai\s+prototyping\b/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TC-0012-0015: Skill contract SSOT verification
// ═══════════════════════════════════════════════════════════════════════════

// QFAI:SPEC-0012:TC-0012-0015
describe("TC-0012-0015: Skill contract SSOT verification", () => {
  it("prototyping SKILL.md exists and is the sole interface definition", async () => {
    const content = await readSkillMd();

    // SKILL.md must exist and have frontmatter with name
    expect(content).toMatch(/^---\s*\n/);
    expect(content).toMatch(/name:\s*qfai-prototyping/);

    // Must contain SSOT marker
    expect(content).toMatch(/SSOT|Skill Body/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TC-0012-0016: Static-first mode-aware contract
// ═══════════════════════════════════════════════════════════════════════════

// QFAI:SPEC-0012:TC-0012-0016
describe("TC-0012-0016: Static-first mode-aware contract", () => {
  it("SKILL.md contains all 3 mode sections (low-cost, standard, full-harness)", async () => {
    const content = await readSkillMd();

    const result = checkModeHeadings(content);
    expect(result.missing).toHaveLength(0);
    expect(result.present).toContain("low-cost");
    expect(result.present).toContain("standard");
    expect(result.present).toContain("full-harness");
  });

  it("SKILL.md has static-first semantics for standard and low-cost modes", async () => {
    const content = await readSkillMd();

    // Standard/low-cost must reference static checks
    expect(content).toMatch(/[Ss]tatic checks/);
    expect(content).toMatch(/[Ss]tatic-first|file-based/);
  });
});

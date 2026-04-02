// QFAI:SPEC-0012:TC-0012-0042
// QFAI:SPEC-0012:TC-0012-0043
// QFAI:SPEC-0012:TC-0012-0044
// QFAI:SPEC-0012:TC-0012-0045
//
// TDD-0015 — Wording alignment integration tests for prototyping SKILL.md.
// TDD-0016 — Routing condition consistency verification for prototyping SKILL.md.
// Verifies that documented capability claims match implemented behavior
// and that aspirational language is detected and flagged.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
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

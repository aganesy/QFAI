/**
 * Archetype tie-breaker — spec-0010 TDD-0034
 *
 * QFAI:SPEC-0010:TC-0010-0034
 */

import { describe, expect, it } from "vitest";

import { type ArchetypeScore, breakTie } from "../../src/core/skill/archetypeTieBreaker.js";

function make(name: string, score: number, visualTheme: number): ArchetypeScore {
  return { name, score, dimensionWeights: { visualTheme } };
}

describe("breakTie — archetype scoring tie-breaker", () => {
  // QFAI:SPEC-0010:TC-0010-0034
  it("returns the sole top-scorer when there is no tie", () => {
    const candidates = [
      make("Bold", 4.5, 0.3),
      make("Minimal", 3.8, 0.5),
      make("Corporate", 2.0, 0.2),
    ];
    const result = breakTie(candidates);
    expect(result.winner.name).toBe("Bold");
    expect(result.isTie).toBe(false);
    expect(result.tieBreakReason).toBeNull();
  });

  // QFAI:SPEC-0010:TC-0010-0034 (tie on score, resolved by visual-theme weight)
  it("resolves a score tie using the highest visual-theme weight", () => {
    const candidates = [
      make("Minimal", 4.0, 0.5),
      make("Elegant", 4.0, 0.8),
      make("Organic", 4.0, 0.2),
    ];
    const result = breakTie(candidates);
    expect(result.winner.name).toBe("Elegant");
    expect(result.isTie).toBe(true);
    expect(result.tieBreakReason).toMatch(/visual-theme weight/);
  });

  // QFAI:SPEC-0010:TC-0010-0034 (tie on score and visual-theme weight, resolved alphabetically)
  it("resolves a score + visual-theme tie using alphabetical name (ascending)", () => {
    const candidates = [
      make("Playful", 4.0, 0.6),
      make("Bold", 4.0, 0.6),
      make("Casual", 4.0, 0.6),
    ];
    const result = breakTie(candidates);
    expect(result.winner.name).toBe("Bold");
    expect(result.isTie).toBe(true);
    expect(result.tieBreakReason).toMatch(/alphabetical/);
  });

  // QFAI:SPEC-0010:TC-0010-0034 (determinism across repeated calls)
  it("is deterministic — same inputs produce the same winner across multiple calls", () => {
    const candidates = [
      make("Tech", 3.9, 0.7),
      make("Corporate", 3.9, 0.7),
      make("Minimal", 3.9, 0.7),
    ];
    const first = breakTie(candidates);
    const second = breakTie(candidates);
    const third = breakTie(candidates);
    expect(first.winner.name).toBe(second.winner.name);
    expect(second.winner.name).toBe(third.winner.name);
  });

  it("throws when given an empty candidate list", () => {
    expect(() => breakTie([])).toThrow();
  });
});

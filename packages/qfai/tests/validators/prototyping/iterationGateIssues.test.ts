/**
 * Tests for validateIterationGateIssues (v1.8.4 Phase 3).
 *
 * spec-0012 TC-0012-0287 / AC-0012-0172
 */
import { describe, expect, it } from "vitest";

import { validateIterationGateIssues } from "../../../src/core/validators/prototyping/iterationGate.js";

describe("validateIterationGateIssues", () => {
  const path = ".qfai/evidence/prototyping.json";

  it("returns empty for an empty iterations array", () => {
    expect(validateIterationGateIssues([], path)).toEqual([]);
  });

  it("returns empty when iteration 1 is not converged", () => {
    const iterations = [
      { iterationCount: 1, converged: false },
      { iterationCount: 2, converged: true },
    ];
    expect(validateIterationGateIssues(iterations, path)).toEqual([]);
  });

  it("returns empty when iteration 1 has no converged field at all", () => {
    const iterations = [{ iterationCount: 1 }];
    expect(validateIterationGateIssues(iterations, path)).toEqual([]);
  });

  it("emits QFAI-PROT-333 (error) when iteration 1 is marked converged=true", () => {
    const iterations = [{ iterationCount: 1, converged: true }];
    const issues = validateIterationGateIssues(iterations, path);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-333");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.category).toBe("canonical");
    expect(issues[0]?.file).toBe(path);
    expect(issues[0]?.message).toMatch(/minimum 2 iterations/);
  });

  it("returns empty when only iteration 2+ is converged", () => {
    const iterations = [
      { iterationCount: 1, converged: false },
      { iterationCount: 2, converged: true },
    ];
    expect(validateIterationGateIssues(iterations, path)).toEqual([]);
  });
});

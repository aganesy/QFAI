/**
 * Tests for the spec-0017 mode invariant validator.
 *
 * QFAI:SPEC-0017:TC-0017-0013 — maxCycles mismatch emits QFAI-PROT-MODE-001
 */
import { describe, expect, it } from "vitest";

import { validateModeInvariant } from "../../../src/core/validators/prototyping/modeInvariant.js";

describe("spec-0017 validateModeInvariant", () => {
  // TC-0017-0013 — maxCycles mismatch emits QFAI-PROT-MODE-001
  it("emits QFAI-PROT-MODE-001 when maxCycles mismatches mode (REQ-0001)", () => {
    const record = {
      mode: { effective: "standard", source: "config", rationale: "default" },
      maxCycles: 20, // wrong — standard should be 3
    };

    const issues = validateModeInvariant(record);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-MODE-001");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toMatch(/maxCycles only/);
    expect(issues[0]?.message).toMatch(/standard/);
    expect(issues[0]?.message).toMatch(/=3/);
    expect(issues[0]?.message).toMatch(/got 20/);
  });

  it("emits QFAI-PROT-MODE-001 for each of the 3 modes (low-cost=1, standard=3, full-harness=20)", () => {
    const cases: Array<{ mode: string; wrong: number; expected: number }> = [
      { mode: "low-cost", wrong: 3, expected: 1 },
      { mode: "standard", wrong: 1, expected: 3 },
      { mode: "full-harness", wrong: 3, expected: 20 },
    ];

    for (const { mode, wrong, expected } of cases) {
      const record = {
        mode: { effective: mode, source: "test", rationale: "test" },
        maxCycles: wrong,
      };
      const issues = validateModeInvariant(record);
      expect(issues, `mode=${mode} should emit QFAI-PROT-MODE-001`).toHaveLength(1);
      expect(issues[0]?.message).toMatch(new RegExp(`=${expected}`));
    }
  });

  it("also accepts maxIterations as an alias when maxCycles is absent", () => {
    const record = {
      mode: { effective: "standard", source: "test", rationale: "test" },
      maxIterations: 99,
    };

    const issues = validateModeInvariant(record);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-MODE-001");
  });

  it("passes when maxCycles matches the mode", () => {
    for (const { mode, value } of [
      { mode: "low-cost", value: 1 },
      { mode: "standard", value: 3 },
      { mode: "full-harness", value: 20 },
    ]) {
      const record = {
        mode: { effective: mode, source: "test", rationale: "test" },
        maxCycles: value,
      };
      expect(validateModeInvariant(record)).toEqual([]);
    }
  });

  it("is silent when the evidence record is not an object", () => {
    expect(validateModeInvariant(null)).toEqual([]);
    expect(validateModeInvariant(undefined)).toEqual([]);
    expect(validateModeInvariant("not an object")).toEqual([]);
    expect(validateModeInvariant([])).toEqual([]);
  });

  it("is silent when mode is missing (other validators cover that case)", () => {
    expect(validateModeInvariant({ maxCycles: 3 })).toEqual([]);
  });

  it("emits QFAI-PROT-MODE-001 when browserTool is not playwright-cli (REQ-0002)", () => {
    const record = {
      mode: { effective: "standard", source: "test", rationale: "test" },
      maxCycles: 3,
      browserTool: "playwright-mcp",
    };

    const issues = validateModeInvariant(record);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-MODE-001");
    expect(issues[0]?.message).toMatch(/browserTool/);
    expect(issues[0]?.message).toMatch(/playwright-cli/);
  });

  it("passes when browserTool is playwright-cli", () => {
    const record = {
      mode: { effective: "full-harness", source: "test", rationale: "test" },
      maxCycles: 20,
      browserTool: "playwright-cli",
    };
    expect(validateModeInvariant(record)).toEqual([]);
  });

  it("passes when browserTool field is absent (legacy evidence without it)", () => {
    const record = {
      mode: { effective: "standard", source: "test", rationale: "test" },
      maxCycles: 3,
    };
    expect(validateModeInvariant(record)).toEqual([]);
  });

  it("detects a top-level mode string when mode is not an object", () => {
    const record = {
      mode: "standard",
      maxCycles: 3,
    };
    expect(validateModeInvariant(record)).toEqual([]);
  });

  it("uses the provided evidencePathForIssue in the issue file field", () => {
    const record = {
      mode: { effective: "standard", source: "test", rationale: "test" },
      maxCycles: 99,
    };
    const issues = validateModeInvariant(record, ".qfai/evidence/custom.json");
    expect(issues[0]?.file).toBe(".qfai/evidence/custom.json");
  });
});

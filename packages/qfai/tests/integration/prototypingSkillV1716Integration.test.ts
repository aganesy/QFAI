/**
 * qfai-prototyping v1.7.16 integration tests — spec-0012
 *
 * QFAI:SPEC-0012:TC-0012-0286
 * QFAI:SPEC-0012:TC-0012-0287
 * QFAI:SPEC-0012:TC-0012-0288
 * QFAI:SPEC-0012:TC-0012-0290
 * QFAI:SPEC-0012:TC-0012-0294
 * QFAI:SPEC-0012:TC-0012-0295
 * QFAI:SPEC-0012:TC-0012-0299
 * QFAI:SPEC-0012:TC-0012-0300
 * QFAI:SPEC-0012:TC-0012-0301
 * QFAI:SPEC-0012:TC-0012-0302
 * QFAI:SPEC-0012:TC-0012-0303
 * QFAI:SPEC-0012:TC-0012-0304
 * QFAI:SPEC-0012:TC-0012-0305
 *
 * TC-0288 is a documentation-layer assertion: it verifies SKILL.md declares
 * the iteration gate (no live runner required).
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { validateDelegationMap } from "../../src/core/validators/prototyping/delegationMap.js";
import { validateIterationGate } from "../../src/core/validators/prototyping/iterationGate.js";
import type { FullHarnessIterationEntry } from "../../src/core/validators/prototyping/iterationGate.js";
import { validateExecutionPlan } from "../../src/core/validators/prototyping/executionPlan.js";
import { validateScreenshotDir } from "../../src/core/validators/prototyping/screenshotDir.js";
import { validateLighthouseGate } from "../../src/core/validators/prototyping/lighthouseGate.js";
import {
  validateDesignSystemThreshold,
  DS_PASS_THRESHOLD,
} from "../../src/core/validators/prototyping/designSystemThreshold.js";
import { applyCalibrationOverrides } from "../../src/core/calibration/overrides.js";
import type { CalibrationPack } from "../../src/core/calibration/types.js";

// ─── Temp dir helpers ─────────────────────────────────────────────────────────

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-prot-v1716-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

// ─── Fixture builders ─────────────────────────────────────────────────────────

function makeBasePack(overrides: Partial<CalibrationPack> = {}): CalibrationPack {
  return {
    version: "1.0.0",
    examples: [],
    thresholds: { accept: 0.8, refine: 0.5 },
    maxIterations: 5,
    plateauDelta: 0.02,
    plateauLookback: 3,
    ...overrides,
  };
}

// ─── TC-0012-0286: Delegation violation detected ──────────────────────────────

describe("TC-0012-0286 — Delegation violation detected by reviewer", () => {
  // QFAI:SPEC-0012:TC-0012-0286
  it("delegationMap with invalid role for UI実装 emits violation finding", () => {
    const delegationMap = {
      UI実装: "generic-code-writer",
      スクリーンショット: "devops-ci-engineer",
    };

    const issues = validateDelegationMap(delegationMap);
    const violations = issues.filter((i) => i.rule === "PROT-DELEGATION");

    expect(violations.length, "Expected violation for UI実装").toBeGreaterThan(0);

    const uiViolation = violations.find((v) => v.category === "UI実装");
    expect(uiViolation).toBeDefined();
    expect(uiViolation?.invalidRole).toBe("generic-code-writer");
    expect(uiViolation?.message).toMatch(/generic-code-writer/);
    expect(uiViolation?.message).toMatch(/UI実装/);
  });

  it("valid delegation map produces no violations", () => {
    const delegationMap = {
      UI実装: "frontend-engineer",
      スクリーンショット: "devops-ci-engineer",
      "評価 L1-L2": "product-surface-reviewer",
      ビルド: "devops-ci-engineer",
    };

    const issues = validateDelegationMap(delegationMap);
    expect(issues).toHaveLength(0);
  });
});

// ─── TC-0012-0287: Iteration gate rejects iter=1+converged ───────────────────

describe("TC-0012-0287 — Iteration gate rejects iterationCount==1 && converged", () => {
  // QFAI:SPEC-0012:TC-0012-0287
  it("single iteration with converged=true raises PROT-ITER-GATE error", () => {
    const iterations: FullHarnessIterationEntry[] = [{ iterationCount: 1, converged: true }];

    const issues = validateIterationGate(iterations);

    expect(issues.length, "Expected PROT-ITER-GATE issue").toBeGreaterThan(0);
    expect(issues[0].rule).toBe("PROT-ITER-GATE");
    expect(issues[0].message).toMatch(/minimum 2 iterations/i);
  });

  it("two iterations with converged=true on iter=2 passes", () => {
    const iterations: FullHarnessIterationEntry[] = [
      { iterationCount: 1, converged: false },
      { iterationCount: 2, converged: true },
    ];

    const issues = validateIterationGate(iterations);
    expect(issues).toHaveLength(0);
  });
});

// ─── TC-0012-0288: Iteration gate blocks phase transition (doc layer) ─────────

describe("TC-0012-0288 — Cycle gate blocks phase transition (documentation-layer)", () => {
  // QFAI:SPEC-0012:TC-0012-0288 (superseded by spec-0017 REQ-0004 — "Iteration Gate" → "Cycle Gate")
  it("SKILL.md declares the cycle gate blocking rule", async () => {
    const skillPath = path.resolve(
      import.meta.dirname,
      "../../assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");

    // spec-0017 renames the section to "Cycle Gate" and replaces "minimum 2 iterations"
    // with the semantic requirement "at least one polish cycle after winner selection".
    expect(content).toMatch(/Cycle Gate|Iteration Gate/i);
    expect(content).toMatch(/polish cycle|minimum 2 iterations/i);
    expect(content).toMatch(/terminationCondition|phase transition|cycle gate/i);
  });
});

// ─── TC-0012-0290: Missing executionPlan → validator error ───────────────────

describe("TC-0012-0290 — Missing executionPlan in full-harness → PROT-EXEC-PLAN error", () => {
  // QFAI:SPEC-0012:TC-0012-0290
  it("prototyping.json with mode=full-harness and no executionPlan raises error", () => {
    const prototypingJson = {
      mode: "full-harness",
      surface: "web",
      // no executionPlan
    };

    const issues = validateExecutionPlan(prototypingJson);

    expect(issues.length, "Expected PROT-EXEC-PLAN issue").toBeGreaterThan(0);
    expect(issues[0].rule).toBe("PROT-EXEC-PLAN");
    expect(issues[0].message).toMatch(/executionPlan.*required.*full-harness/i);
  });

  it("prototyping.json with executionPlan present passes", () => {
    const prototypingJson = {
      mode: "full-harness",
      executionPlan: {
        targetIterations: 3,
        evaluationAxesSource: "20/21/22/23",
        delegationMap: { UI実装: "frontend-engineer" },
        plannedAt: "2026-04-18T00:00:00.000Z",
      },
    };

    const issues = validateExecutionPlan(prototypingJson);
    expect(issues).toHaveLength(0);
  });

  it("non-full-harness mode skips executionPlan check", () => {
    const prototypingJson = { mode: "standard" };
    const issues = validateExecutionPlan(prototypingJson);
    expect(issues).toHaveLength(0);
  });
});

// ─── TC-0012-0294: scoringTrace.screenshotDir recorded per iteration ──────────

describe("TC-0012-0294 — scoringTrace.screenshotDir recorded per iteration", () => {
  // QFAI:SPEC-0012:TC-0012-0294
  it("3 iterations each with distinct screenshotDir pass validation", () => {
    const scoringTrace = [
      { screenshotDir: "/tmp/iter1/screenshots", score: 0.72 },
      { screenshotDir: "/tmp/iter2/screenshots", score: 0.78 },
      { screenshotDir: "/tmp/iter3/screenshots", score: 0.85 },
    ];

    const issues = validateScreenshotDir(scoringTrace, "full-harness");
    expect(issues).toHaveLength(0);

    // Verify dirs are distinct
    const dirs = scoringTrace.map((e) => e.screenshotDir);
    const unique = new Set(dirs);
    expect(unique.size).toBe(3);
  });
});

// ─── TC-0012-0295: screenshotDir missing → validator error ───────────────────

describe("TC-0012-0295 — screenshotDir missing → PROT-SCREENSHOT-DIR error", () => {
  // QFAI:SPEC-0012:TC-0012-0295
  it("scoringTrace entry without screenshotDir raises PROT-SCREENSHOT-DIR", () => {
    const scoringTrace = [
      { screenshotDir: "/tmp/iter1", score: 0.72 },
      { score: 0.78 }, // missing screenshotDir
    ];

    const issues = validateScreenshotDir(scoringTrace, "full-harness");

    const missing = issues.filter((i) => i.rule === "PROT-SCREENSHOT-DIR");
    expect(missing.length, "Expected PROT-SCREENSHOT-DIR issue").toBeGreaterThan(0);
    expect(missing[0].index).toBe(1);
    expect(missing[0].message).toMatch(/screenshotDir.*missing|missing.*screenshotDir/i);
  });

  it("non-full-harness mode skips screenshotDir check", () => {
    const scoringTrace = [{ score: 0.8 }];
    const issues = validateScreenshotDir(scoringTrace, "standard");
    expect(issues).toHaveLength(0);
  });
});

// ─── TC-0012-0299: Lighthouse MUST — happy path ──────────────────────────────

describe("TC-0012-0299 — Lighthouse MUST happy path", () => {
  // QFAI:SPEC-0012:TC-0012-0299
  it("full-harness web run with Lighthouse report passes reviewer gate", () => {
    const prototypingJson = {
      mode: "full-harness",
      surface: "web",
      lighthouseReport: { performance: 0.92, accessibility: 0.88 },
    };

    const issues = validateLighthouseGate(prototypingJson);
    expect(issues).toHaveLength(0);
  });
});

// ─── TC-0012-0300: Lighthouse absent web full-harness → error ────────────────

describe("TC-0012-0300 — Lighthouse absent on web full-harness → PROT-LIGHTHOUSE error", () => {
  // QFAI:SPEC-0012:TC-0012-0300
  it("full-harness web run without Lighthouse report raises PROT-LIGHTHOUSE", () => {
    const prototypingJson = {
      mode: "full-harness",
      surface: "web",
      // no lighthouseReport
    };

    const issues = validateLighthouseGate(prototypingJson);

    expect(issues.length, "Expected PROT-LIGHTHOUSE issue").toBeGreaterThan(0);
    expect(issues[0].rule).toBe("PROT-LIGHTHOUSE");
    expect(issues[0].message).toMatch(/Lighthouse Gate is MUST/i);
  });

  it("non-web surface skips Lighthouse gate", () => {
    const prototypingJson = { mode: "full-harness", surface: "mobile" };
    const issues = validateLighthouseGate(prototypingJson);
    expect(issues).toHaveLength(0);
  });
});

// ─── TC-0012-0301: designSystemCompliance 85% — passes ──────────────────────

describe("TC-0012-0301 — designSystemCompliance 85% — no L1 finding", () => {
  // QFAI:SPEC-0012:TC-0012-0301
  it("score 0.85 >= threshold produces no PROT-DS-THRESHOLD issue", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "uiux"), { recursive: true });
    await writeFile(path.join(root, "uiux", "12_design_system.md"), "## Visual Theme\n", "utf-8");

    const prototypingRecord = {
      scoringTrace: { designSystemCompliance: 0.85 },
    };

    const issues = await validateDesignSystemThreshold(root, prototypingRecord);
    expect(issues).toHaveLength(0);
    expect(0.85).toBeGreaterThanOrEqual(DS_PASS_THRESHOLD);
  });
});

// ─── TC-0012-0302: designSystemCompliance 65% — L1 finding ──────────────────

describe("TC-0012-0302 — designSystemCompliance 65% — PROT-DS-THRESHOLD finding", () => {
  // QFAI:SPEC-0012:TC-0012-0302
  it("score 0.65 < threshold raises PROT-DS-THRESHOLD with immediateFixRequired=true", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "uiux"), { recursive: true });
    await writeFile(path.join(root, "uiux", "12_design_system.md"), "## Visual Theme\n", "utf-8");

    const prototypingRecord = {
      scoringTrace: { designSystemCompliance: 0.65 },
    };

    const issues = await validateDesignSystemThreshold(root, prototypingRecord);

    expect(issues.length, "Expected PROT-DS-THRESHOLD issue").toBeGreaterThan(0);
    expect(issues[0].rule).toBe("PROT-DS-THRESHOLD");
    expect(issues[0].score).toBe(0.65);
    expect(issues[0].immediateFixRequired).toBe(true);
    expect(0.65).toBeLessThan(DS_PASS_THRESHOLD);
  });
});

// ─── TC-0012-0303: designSystemCompliance skipped without 12_design_system.md ─

describe("TC-0012-0303 — designSystemCompliance skipped without 12_design_system.md", () => {
  // QFAI:SPEC-0012:TC-0012-0303
  it("absent 12_design_system.md causes no finding regardless of score", async () => {
    const root = await newTempDir();
    // deliberately do NOT create uiux/12_design_system.md

    const prototypingRecord = {
      scoringTrace: { designSystemCompliance: 0.5 },
    };

    const issues = await validateDesignSystemThreshold(root, prototypingRecord);
    expect(issues).toHaveLength(0);
  });
});

// ─── TC-0012-0304: calibration.overrides applied ─────────────────────────────

describe("TC-0012-0304 — calibration.overrides applied via project config", () => {
  // QFAI:SPEC-0012:TC-0012-0304
  it("overrides.perAxisMinimum and maxIterationsByMode.full-harness are applied", () => {
    const pack = makeBasePack();

    const overrides = {
      perAxisMinimum: 0.92,
      maxIterationsByMode: { "full-harness": 20 },
    };

    const effective = applyCalibrationOverrides(pack, overrides);

    expect(effective.perAxisMinimum).toBe(0.92);
    expect(effective.maxIterationsByMode["full-harness"]).toBe(20);
  });
});

// ─── TC-0012-0305: calibration.overrides absent — defaults preserved ──────────

describe("TC-0012-0305 — calibration.overrides absent — defaults preserved", () => {
  // QFAI:SPEC-0012:TC-0012-0305
  it("calibration loader with no overrides uses system defaults without error", () => {
    const pack = makeBasePack();

    // Call applyCalibrationOverrides with no overrides argument
    const effective = applyCalibrationOverrides(pack);

    expect(effective.maxIterations).toBe(pack.maxIterations);
    expect(typeof effective.perAxisMinimum).toBe("number");
    expect(effective.maxIterationsByMode).toEqual({});
  });

  it("pack.overrides absent does not throw", () => {
    const pack = makeBasePack({ overrides: undefined });
    expect(() => applyCalibrationOverrides(pack)).not.toThrow();
  });
});

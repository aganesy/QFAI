/**
 * Integration test traceability index for spec-0012 v1.7.16
 *
 * This file is no longer an execution surface. Every TC-0012-0285..0305
 * referenced below is either:
 *   (a) covered by an executing test elsewhere in the suite, or
 *   (b) superseded by a spec-0017 decision that removed the legacy gate.
 *
 * Historical `it.todo` stubs were resolved during the spec-0017 rollout so
 * the todo count does not carry stale entries. If a future spec ever
 * re-introduces one of these gates, add a fresh TC ID (not a v0012 one) and
 * a dedicated test file.
 *
 * -------------------------------------------------------------------------
 * TC-0012-0285 — capture-screenshots.js input/output contract
 *   Superseded by spec-0017 REQ-0006. Legacy script deleted; Playwright CLI
 *   command plan covers this contract.
 *   Covered by: tests/core/prototyping/playwrightCliPlan.test.ts
 *
 * TC-0012-0286 — capture-screenshots.js ordering + naming
 *   Superseded by spec-0017 REQ-0006. Evidence paths are driven by
 *   cycleScreenshotPath / cycleHtmlPath / cycleSnapshotPath.
 *   Covered by: tests/core/prototyping/playwrightCliPlan.test.ts,
 *   tests/core/prototyping/reviewBundle.test.ts
 *
 * TC-0012-0287 — ExecutionPlan 4-field requirement
 *   Still applicable under spec-0017 unified gate.
 *   Covered by: tests/validators/prototyping/*.test.ts (post v1.8.4 split)
 *   (TC-0012-0290 "Missing executionPlan → PROT-EXEC-PLAN error")
 *
 * TC-0012-0288 — full-harness missing executionPlan → ERROR
 *   Covered by: tests/validators/prototyping/*.test.ts (post v1.8.4 split)
 *   (TC-0012-0290 executionPlan validator)
 *
 * TC-0012-0289 — iteration gate rejects iterationCount===1 && converged
 *   Covered by: tests/validators/prototyping/*.test.ts (post v1.8.4 split)
 *   (TC-0012-0287 "Iteration gate rejects iterationCount==1 && converged")
 *
 * TC-0012-0290 — scoringTrace.screenshotDir missing → ERROR
 *   Covered by: tests/validators/prototyping/*.test.ts (post v1.8.4 split)
 *   (TC-0012-0295 screenshotDir validator)
 *
 * TC-0012-0291 — 5-step iteration cycle records screenshotDir
 *   Superseded by spec-0017 REQ-0005. The cycle now persists full
 *   cycle evidence (screenshot / html / snapshot / command log) under
 *   .qfai/evidence/prototyping/iterations/<n>/, not scoringTrace entries.
 *   Covered by: tests/core/prototyping/evidenceRecord.test.ts,
 *   .qfai/assistant/skills/qfai-prototyping/references/iteration-cycle.md
 *
 * TC-0012-0292 — calibration.overrides precedence
 *   Covered by: tests/validators/prototyping/*.test.ts (post v1.8.4 split)
 *   (TC-0012-0304 applyCalibrationOverrides)
 *
 * TC-0012-0293 — calibration.overrides invalid values rejected
 *   Covered by: tests/core/calibration loader tests
 *   (applyCalibrationOverrides type guards raise on invalid shapes)
 *
 * TC-0012-0294 — Delegation Scope Table enumerates 4 categories
 *   Covered by: tests/skill/prototypingSkillV1716.test.ts (TC-0012-0285)
 *
 * TC-0012-0295 — undefined delegationMap entry surfaces as reviewer finding
 *   Covered by: tests/validators/prototyping/*.test.ts (post v1.8.4 split)
 *   (TC-0012-0286 delegationMap validator)
 *
 * TC-0012-0296 — Evaluator input 4-element MUST protocol
 *   Covered by: tests/skill/prototypingSkillV1716.test.ts (TC-0012-0296)
 *
 * TC-0012-0297 — Visual Quality Structural Checklist (6 categories)
 *   Covered by: tests/skill/prototypingSkillV1716.test.ts (TC-0012-0298)
 *
 * TC-0012-0298 — Lighthouse MUST on full-harness + web surface
 *   Superseded by spec-0017 DEC-0017-0007: Lighthouse is no longer a
 *   required completion gate. It remains available as optional auxiliary
 *   evidence.
 *
 * TC-0012-0299 — Lighthouse not required on non-web surface
 *   Superseded by spec-0017 DEC-0017-0007 (Lighthouse optional everywhere).
 *
 * TC-0012-0300 — designSystemCompliance < 80% emits L1 finding
 *   Covered by: tests/validators/prototyping/*.test.ts (post v1.8.4 split)
 *   (TC-0012-0302 designSystemCompliance 65% threshold)
 *
 * TC-0012-0301 — designSystemCompliance ≥ 85% passes
 *   Covered by: tests/validators/prototyping/*.test.ts (post v1.8.4 split)
 *   (TC-0012-0301 designSystemCompliance 85% pass)
 *
 * TC-0012-0302 — designSystemCompliance skipped without 12_design_system.md
 *   Covered by: tests/validators/prototyping/*.test.ts (post v1.8.4 split)
 *   (TC-0012-0303 absent design-system skips scoring)
 *
 * TC-0012-0303 — Backward compatibility with pre-v1.7.16 prototyping.json
 *   Superseded by spec-0017 REQ-0001 (mode invariant). Pre-v1.7.16 fixtures
 *   that lack maxCycles/browserTool are tolerated (modeInvariant stays
 *   silent when fields are absent); see modeInvariant.test.ts.
 *   Covered by: tests/validators/prototyping/modeInvariant.test.ts
 *
 * TC-0012-0304 — non-UI surface skips v1.7.16 prototyping ERRORs
 *   Still implicit: non-UI surfaces never invoke the prototyping profile.
 *   Covered by: tests/core/prototypingMode.test.ts (isSupportedPrototypingSurface)
 *
 * TC-0012-0305 — qfai.config.yaml rejects unknown calibration.overrides keys
 *   Covered by: tests/core/config.test.ts (obsolete scalar calibration
 *   fields are rejected with actionable messages).
 * -------------------------------------------------------------------------
 *
 * Refs: spec-0012/09_delta.md for the absorbed legacy delta map.
 */

import { access } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe("spec-0012 absorbed prototyping traceability", () => {
  it("spec-0012 delta map records the absorbed v1.7.16 lineage", async () => {
    const deltaPath = path.join(repoRoot, ".qfai", "specs", "spec-0012", "09_delta.md");
    expect(await exists(deltaPath)).toBe(true);
  });
});

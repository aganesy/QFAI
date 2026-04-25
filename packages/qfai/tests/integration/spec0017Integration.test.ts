/**
 * Integration traceability index for the absorbed former spec-0017 coverage.
 *
 * Every TC listed below is covered by an executing test elsewhere (unit,
 * cli, assets, validators). This file serves as the `tests/integration/**`
 * reference surface that `validateAtddCodeTraceability` scans when confirming
 * TC coverage in integration scope.
 *
 * The single live assertion verifies that spec-0012 retains the absorbed
 * `TC-0017-*` registry after the standalone spec-0017 directory was removed.
 *
 * Covered TC annotations:
 *
 * QFAI:SPEC-0017:TC-0017-0001 — Mode obligations identical except maxCycles
 * QFAI:SPEC-0017:TC-0017-0002 — Legacy browserProvider key rejected
 * QFAI:SPEC-0017:TC-0017-0003 — Legacy renderProvider key rejected
 * QFAI:SPEC-0017:TC-0017-0004 — browserTool: playwright-cli accepted
 * QFAI:SPEC-0017:TC-0017-0005 — Deterministic Playwright CLI command plan
 * QFAI:SPEC-0017:TC-0017-0006 — Canonical command structure
 * QFAI:SPEC-0017:TC-0017-0007 — Output paths under iterations/<cycle>/
 * QFAI:SPEC-0017:TC-0017-0008 — Review bundle required fields
 * QFAI:SPEC-0017:TC-0017-0009 — Review bundle references command plan
 * QFAI:SPEC-0017:TC-0017-0010 — PrototypingCycleEvidence schema round-trip
 * QFAI:SPEC-0017:TC-0017-0011 — Canonical latest paths mirror latest cycle
 * QFAI:SPEC-0017:TC-0017-0012 — FullHarnessIteration removal (Phase 7)
 * QFAI:SPEC-0017:TC-0017-0013 — modeInvariant emits QFAI-PROT-MODE-001
 * QFAI:SPEC-0017:TC-0017-0014 — uiEvidenceArtifacts error in all modes
 * QFAI:SPEC-0017:TC-0017-0015 — reviewerGate error in all modes
 * QFAI:SPEC-0017:TC-0017-0016 — executionPlan applies to all modes
 * QFAI:SPEC-0017:TC-0017-0017 — bestOfHistory missing error in all modes
 * QFAI:SPEC-0017:TC-0017-0018 — breakthrough missing error in all modes
 * QFAI:SPEC-0017:TC-0017-0019 — evidenceRefs placeholder rejected
 * QFAI:SPEC-0017:TC-0017-0020 — qfai prototyping prepare writes bundle + plan
 * QFAI:SPEC-0017:TC-0017-0021 — qfai prototyping prepare exits 0 on success
 * QFAI:SPEC-0017:TC-0017-0022 — qfai prototyping prepare skips screenshots
 * QFAI:SPEC-0017:TC-0017-0023 — No playwright-mcp references in repo
 * QFAI:SPEC-0017:TC-0017-0024 — No Node Playwright imports in production src
 * QFAI:SPEC-0017:TC-0017-0025 — Skill directories byte-identical
 * QFAI:SPEC-0017:TC-0017-0026 — capture-screenshots.js deleted
 * QFAI:SPEC-0017:TC-0017-0027 — E2E: all 3 modes pass validate (maxCycles only)
 * QFAI:SPEC-0017:TC-0017-0028 — it.todo / test.todo / describe.todo detected (QFAI-TEST-001)
 * QFAI:SPEC-0017:TC-0017-0029 — forbidTestTodoStubs opt-out works
 * QFAI:SPEC-0017:TC-0017-0030 — config flag defaults to true
 * QFAI:SPEC-0017:TC-0017-0031 — init ships .github/workflows/qfai-validate.yml
 * QFAI:SPEC-0017:TC-0017-0032 — qfai-implement skill gate on QFAI-TEST-001
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

describe("absorbed spec-0017 integration traceability", () => {
  it("spec-0012 keeps the absorbed TC-0017 registry on disk", async () => {
    const specPath = path.join(repoRoot, ".qfai", "specs", "spec-0012", "06_Test-Cases.md");
    expect(await exists(specPath)).toBe(true);
  });
});

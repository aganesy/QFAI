/**
 * WS-E: uiFidelity validator tests
 *
 * Verifies that the prototyping evidence validator correctly enforces
 * uiFidelity mode policy per the obligation matrix.
 */

import { describe, it, expect } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";
import { defaultConfig } from "../../src/core/config.js";

function makeEvidence(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    surface: "web",
    specs: [
      {
        specId: "spec-0001",
        declared: { uiRoutes: 1, apiEndpoints: 0, dbObjects: 0 },
        checked: { uiOk: 1, apiNon404: 0, dbPresent: 0 },
        missing: { uiRoutes: [], apiEndpoints: [], dbObjects: [] },
      },
    ],
    mode: {
      effective: "standard",
      source: "explicit-request",
      rationale: "test",
    },
    meta: {
      generatedAt: new Date().toISOString(),
      toolVersion: "1.7.13",
      commands: ["qfai prototyping run --mode standard"],
    },
    ...overrides,
  };
}

async function setupRoot(): Promise<string> {
  const root = path.join(tmpdir(), `qfai-uf-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
  await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai", "specs", "spec-0001", "01_Requirements.md"),
    "# Requirements\n\n- REQ-0001: Test requirement\n",
  );
  return root;
}

async function runValidation(
  root: string,
  evidence: Record<string, unknown>,
): Promise<Array<{ code: string; severity: string; message: string }>> {
  const evidencePath = path.join(root, ".qfai", "evidence", "prototyping.json");
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  const issues = await validatePrototypingEvidence(root, defaultConfig);
  return issues.map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
  }));
}

describe("uiFidelity validator", () => {
  let root: string;

  beforeEach(async () => {
    root = await setupRoot();
  });

  afterEach(async () => {
    try {
      await rm(root, { recursive: true, force: true });
    } catch {
      // cleanup best-effort
    }
  });

  it("standard + UI-bearing + skeleton → error QFAI-PROT-271", async () => {
    const evidence = makeEvidence({
      uiFidelity: { mode: "skeleton", screens: [] },
    });
    const issues = await runValidation(root, evidence);
    const skeletonErrors = issues.filter((issue) => issue.code === "QFAI-PROT-271");
    expect(skeletonErrors.length).toBeGreaterThanOrEqual(1);
    expect(skeletonErrors[0].severity).toBe("error");
  });

  it("full-harness + UI-bearing + skeleton → error QFAI-PROT-271", async () => {
    const evidence = makeEvidence({
      mode: {
        effective: "full-harness",
        source: "explicit-request",
        rationale: "test",
      },
      uiFidelity: { mode: "skeleton", screens: [] },
      fullHarness: {
        enabled: true,
        available: true,
        runId: "run-001",
        iterationCount: 1,
        bestIteration: 1,
        terminationReason: "converged",
        reviewerSignoff: { status: "approved", reviewer: "test", timestamp: new Date().toISOString() },
        scoringTrace: [{ iteration: 1, weightedTotal: 0.9, decision: "accept" }],
      },
    });
    const issues = await runValidation(root, evidence);
    const skeletonErrors = issues.filter((issue) => issue.code === "QFAI-PROT-271");
    expect(skeletonErrors.length).toBeGreaterThanOrEqual(1);
  });

  it("low-cost + UI-bearing + skeleton → no skeleton error", async () => {
    const evidence = makeEvidence({
      mode: {
        effective: "low-cost",
        source: "explicit-request",
        rationale: "test",
      },
      uiFidelity: { mode: "skeleton", screens: [] },
    });
    const issues = await runValidation(root, evidence);
    const skeletonErrors = issues.filter((issue) => issue.code === "QFAI-PROT-271");
    expect(skeletonErrors).toHaveLength(0);
  });

  it("standard + UI-bearing + interactive + screens empty → error QFAI-PROT-238", async () => {
    const evidence = makeEvidence({
      uiFidelity: { mode: "interactive", screens: [] },
    });
    const issues = await runValidation(root, evidence);
    const emptyErrors = issues.filter((issue) => issue.code === "QFAI-PROT-238");
    expect(emptyErrors.length).toBeGreaterThanOrEqual(1);
    expect(emptyErrors[0].severity).toBe("error");
  });

  it("standard + UI-bearing + uiFidelity absent → error QFAI-PROT-270", async () => {
    const evidence = makeEvidence();
    // No uiFidelity field
    const issues = await runValidation(root, evidence);
    const absentErrors = issues.filter((issue) => issue.code === "QFAI-PROT-270");
    expect(absentErrors.length).toBeGreaterThanOrEqual(1);
    expect(absentErrors[0].severity).toBe("error");
  });

  it("non-ui + standard + uiFidelity absent → no uiFidelity error", async () => {
    const evidence = makeEvidence({
      surface: "non-ui",
    });
    const issues = await runValidation(root, evidence);
    const uiFidelityErrors = issues.filter(
      (issue) => issue.code === "QFAI-PROT-270" || issue.code === "QFAI-PROT-271",
    );
    expect(uiFidelityErrors).toHaveLength(0);
  });
});

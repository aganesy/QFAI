/**
 * Regression coverage for PR #210 wave-2 C1+C2 fixes plus wave-18
 * active-loop signal refinement.
 *
 * Two paired defects in the original implementation:
 *   C1 — detectCertifyVerifyCircular read prototyping state from
 *        the legacy path `.qfai/output/prototyping.json`, but the
 *        iterate pipeline writes to the canonical path
 *        `.qfai/evidence/prototyping/prototyping.json`
 *        (PROTOTYPING_JSON_REL). The legacy lookup always missed
 *        in real runs, so R-CERTIFY-VERIFY-CIRCULAR was never
 *        emitted and the phase-isolation guard was a no-op.
 *   C2 — isPrototypingPhase required `prototyping.json#phase ===
 *        "prototyping"`, but writeSeedMetadata explicitly deletes
 *        `body.phase`. No current writer restores it, so the
 *        guard was bypassed even when the canonical path was read.
 *
 * Wave-2 fix: read from PROTOTYPING_JSON_REL and treat any well-formed
 * object at that path as a prototyping context.
 *
 * Wave-18 refinement: presence-only was too loose — once a prior loop
 * left a `prototyping.json` behind, every subsequent verify.json with
 * scope=atdd|full|implement triggered the finding as a false-positive.
 * The active-loop signal is now structural: `stopReason === null` AND
 * `acceptedIterationIndex === null`. A completed loop populates both
 * slots, a never-started loop has neither, and the gate only fires
 * while the loop is mid-flight.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { validateReviewerGate } from "../../../src/core/validators/reviewerGate.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-rg-canonical-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

const STUB_CONFIG = {
  paths: { contractsDir: ".qfai/contracts" },
} as unknown as QfaiConfig;

async function writeVerify(root: string, scope: string): Promise<void> {
  await mkdir(path.join(root, ".qfai/output"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/output/verify.json"),
    JSON.stringify({ status: "PASS", scope }),
    "utf-8",
  );
}

async function writeCanonicalPrototyping(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai/evidence/prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "prototyping.json"), JSON.stringify(body), "utf-8");
}

async function writeLegacyPrototyping(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai/output");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "prototyping.json"), JSON.stringify(body), "utf-8");
}

describe("R-CERTIFY-VERIFY-CIRCULAR — canonical-path regression coverage", () => {
  it("emits the finding for scope=atdd when canonical prototyping.json marks an in-flight loop (stopReason=null, acceptedIterationIndex=null)", async () => {
    const root = await newTempDir();
    await writeVerify(root, "atdd");
    // No `phase` field — matches the real-world output of
    // writeSeedMetadata, which deletes body.phase on every cycle 0.
    // Per-loop state slots both null = loop is iterating.
    await writeCanonicalPrototyping(root, {
      runId: "regression-1",
      iterations: [],
      stopReason: null,
      acceptedIterationIndex: null,
    });
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toHaveLength(1);
    expect(circular[0]?.message).toMatch(/scope="atdd"/);
  });

  it("emits the finding for scope=implement when the canonical state marks an in-flight loop", async () => {
    const root = await newTempDir();
    await writeVerify(root, "implement");
    await writeCanonicalPrototyping(root, {
      runId: "regression-2",
      iterations: [],
      stopReason: null,
      acceptedIterationIndex: null,
    });
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toHaveLength(1);
    expect(circular[0]?.message).toMatch(/scope="implement"/);
  });

  it("emits the finding for scope=full when the canonical state marks an in-flight loop", async () => {
    const root = await newTempDir();
    await writeVerify(root, "full");
    await writeCanonicalPrototyping(root, {
      runId: "regression-3",
      iterations: [],
      stopReason: null,
      acceptedIterationIndex: null,
    });
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toHaveLength(1);
    expect(circular[0]?.message).toMatch(/scope="full"/);
  });

  it("does NOT emit when only the legacy path is seeded (canonical missing) — confirms reads come from canonical path only", async () => {
    const root = await newTempDir();
    await writeVerify(root, "atdd");
    // Legacy-only seed should NOT trigger the finding now that the
    // validator reads exclusively from the canonical path.
    await writeLegacyPrototyping(root, { phase: "prototyping", runId: "legacy-only" });
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toEqual([]);
  });

  // Wave-18: presence-only was a persistent false-positive once a
  // previous loop left prototyping.json on disk. The four cases below
  // pin the active-loop signal so the gate fires for in-flight loops
  // and stays silent for any terminal / absent state.

  it("does NOT emit when the loop converged (stopReason=axes-exceptional, acceptedIterationIndex=3)", async () => {
    const root = await newTempDir();
    await writeVerify(root, "atdd");
    await writeCanonicalPrototyping(root, {
      runId: "completed-converged",
      iterations: [{}, {}, {}, {}],
      stopReason: "axes-exceptional",
      acceptedIterationIndex: 3,
    });
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toEqual([]);
  });

  it("does NOT emit when the loop hit a terminal stop without convergence (stopReason=max-iterations, acceptedIterationIndex=null)", async () => {
    const root = await newTempDir();
    await writeVerify(root, "atdd");
    await writeCanonicalPrototyping(root, {
      runId: "stopped-max-iterations",
      iterations: [{}, {}, {}],
      stopReason: "max-iterations",
      acceptedIterationIndex: null,
    });
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toEqual([]);
  });

  it("does NOT emit when prototyping.json is missing entirely (no loop ever started)", async () => {
    const root = await newTempDir();
    await writeVerify(root, "atdd");
    // Intentionally no writeCanonicalPrototyping call.
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toEqual([]);
  });

  // Wave-19: writeSeedMetadata persists acceptedIterationIndex=0 at
  // cycle 0 even while the loop is still iterating. The wave-18
  // predicate (stopReason=null AND acceptedIterationIndex=null) was
  // too strict and skipped real in-flight runs in this common state.
  // The refined predicate is `stopReason === null` alone — terminal
  // cause is the only structural signal the pipeline writes when (and
  // only when) the loop actually finishes.
  it("emits the finding when the cycle-0 seed has populated acceptedIterationIndex but stopReason is still null (wave-19 regression)", async () => {
    const root = await newTempDir();
    await writeVerify(root, "atdd");
    await writeCanonicalPrototyping(root, {
      runId: "active-seed",
      iterations: [{ index: 0 }],
      stopReason: null,
      acceptedIterationIndex: 0,
    });
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toHaveLength(1);
    expect(circular[0]?.message).toMatch(/scope="atdd"/);
  });
});

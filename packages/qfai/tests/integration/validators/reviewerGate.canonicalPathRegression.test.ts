/**
 * Regression coverage for PR #210 wave-2 C1+C2 fixes.
 *
 * Two paired defects in the prior implementation:
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
 * Fix: read from PROTOTYPING_JSON_REL and treat any well-formed
 * object at that path as a prototyping context (option (a) in the
 * review thread). These tests pin the new behavior so a future
 * regression on either path or the structural-signal rule fails
 * immediately.
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
  it("emits the finding for scope=atdd when canonical prototyping.json exists WITHOUT a phase field (C1+C2 fix)", async () => {
    const root = await newTempDir();
    await writeVerify(root, "atdd");
    // No `phase` field — matches the real-world output of
    // writeSeedMetadata, which deletes body.phase on every cycle 0.
    await writeCanonicalPrototyping(root, { runId: "regression-1", iterations: [] });
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toHaveLength(1);
    expect(circular[0]?.message).toMatch(/scope="atdd"/);
  });

  it("emits the finding for scope=implement at canonical path (no phase field)", async () => {
    const root = await newTempDir();
    await writeVerify(root, "implement");
    await writeCanonicalPrototyping(root, { runId: "regression-2", iterations: [] });
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toHaveLength(1);
    expect(circular[0]?.message).toMatch(/scope="implement"/);
  });

  it("emits the finding for scope=full at canonical path (no phase field)", async () => {
    const root = await newTempDir();
    await writeVerify(root, "full");
    await writeCanonicalPrototyping(root, { runId: "regression-3", iterations: [] });
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
});

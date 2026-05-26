/**
 * R-CERTIFY-VERIFY-CIRCULAR consolidation pointer for spec-0012
 * (Phase 3 / REQ-0012-0064).
 *
 * The structural SSOT for this rule lives in spec-0015
 * (`tests/integration/reviewerGatePromptScannerDrift.test.ts` +
 * sibling rule fixtures); this anchor test exercises the same
 * `validateReviewerGate` machinery with a thin pair scenario so the
 * TC-0012-0446 traceability chain resolves to an executable surface
 * without duplicating the spec-0015 fixture matrix.
 *
 * Inherited-GREEN from spec-0015: the
 * `detectCertifyVerifyCircular` helper is already in production at
 * `core/validators/reviewerGate.ts`. This file is a re-anchor only.
 */

// QFAI:SPEC-0012:TC-0012-0446

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { validateReviewerGate } from "../../../src/core/validators/reviewerGate.ts";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-rg-circular-"));
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

async function seedPair(root: string, scope: string, phase: string): Promise<void> {
  await mkdir(path.join(root, ".qfai/output"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/output/verify.json"),
    JSON.stringify({ status: "PASS", scope }),
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai/output/prototyping.json"),
    JSON.stringify({ phase }),
    "utf-8",
  );
}

describe("R-CERTIFY-VERIFY-CIRCULAR — spec-0012 anchor", () => {
  it("emits the finding when verify.json#scope=atdd and prototyping.json#phase=prototyping", async () => {
    const root = await newTempDir();
    await seedPair(root, "atdd", "prototyping");
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toHaveLength(1);
    expect(circular[0]?.message).toMatch(/scope="atdd"/);
  });

  it("does NOT emit when verify.json#scope=prototyping (positive case for Phase 3)", async () => {
    const root = await newTempDir();
    await seedPair(root, "prototyping", "prototyping");
    const issues = await validateReviewerGate(root, STUB_CONFIG);
    const circular = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(circular).toEqual([]);
  });
});

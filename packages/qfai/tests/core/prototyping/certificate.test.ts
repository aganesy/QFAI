/**
 * Tests for completion-certificate build / write / load / check
 * (v1.8.4 Phase 5).
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildCompletionCertificate,
  checkCompletionCertificate,
  COMPLETION_CERTIFICATE_REL_PATH,
  loadCompletionCertificate,
  writeCompletionCertificate,
} from "../../../src/core/prototyping/certificate.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cert-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function seedEvidence(root: string, files: Record<string, string>): Promise<string> {
  const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(evidenceRoot, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body, "utf-8");
  }
  return evidenceRoot;
}

const baseInputs = (evidenceRoot: string) => ({
  runId: "run-2026-04-27-abc",
  toolVersion: "1.8.4",
  evidenceRoot,
  validateRun: { errorCount: 0 as const, ranAt: "2026-04-27T00:00:00Z" },
  verifyRun: { status: "PASS" as const, ranAt: "2026-04-27T00:01:00Z" },
  reviewerSignoff: {
    reviewerId: "test-reviewer",
    approved: true as const,
    timestamp: "2026-04-27T00:02:00Z",
  },
  iterationCount: 4,
  specsCovered: ["0017"],
});

describe("buildCompletionCertificate", () => {
  it("collects sha256 digests of every evidence file (sorted by path)", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "rounds/r5/harvest.json": "{}\n",
      "rounds/r3/absorption-plan.json": "{}\n",
      "screenshots/order_list.png": "fakepng",
    });

    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    expect(cert.evidenceDigests).toHaveLength(3);
    const paths = cert.evidenceDigests.map((e) => e.path);
    expect(paths).toEqual([...paths].sort());
    for (const entry of cert.evidenceDigests) {
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("preserves runId and reviewerSignoff fields verbatim", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "rounds/r5/harvest.json": "{}\n",
    });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    expect(cert.runId).toBe("run-2026-04-27-abc");
    expect(cert.reviewerSignoff.reviewerId).toBe("test-reviewer");
    expect(cert.specsCovered).toEqual(["0017"]);
  });
});

describe("write / load round-trip", () => {
  it("writes to canonical path and load returns the same object", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "rounds/r5/harvest.json": "{}\n",
    });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    const written = await writeCompletionCertificate(root, cert);
    expect(written).toBe(path.join(root, COMPLETION_CERTIFICATE_REL_PATH));
    const loaded = await loadCompletionCertificate(root);
    expect(loaded).toEqual(cert);
  });

  it("write produces canonical JSON with sorted keys (deterministic)", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, { "rounds/r5/harvest.json": "{}\n" });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    await writeCompletionCertificate(root, cert);
    const body = await readFile(path.join(root, COMPLETION_CERTIFICATE_REL_PATH), "utf-8");
    // Top-level keys appear in alphabetical order
    const topKeysOrdered = [
      "evidenceDigests",
      "generatedAt",
      "generator",
      "iterationCount",
      "reviewerSignoff",
      "runId",
      "specsCovered",
      "validateRun",
      "verifyRun",
    ];
    let lastIndex = -1;
    for (const k of topKeysOrdered) {
      const idx = body.indexOf(`"${k}"`);
      expect(idx, `key ${k} present`).toBeGreaterThan(-1);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });
});

describe("checkCompletionCertificate", () => {
  it("returns ok=true immediately after write", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "rounds/r5/harvest.json": "{}\n",
      "rounds/r3/absorption-plan.json": "{}\n",
    });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    await writeCompletionCertificate(root, cert);
    const result = await checkCompletionCertificate(root);
    expect(result.ok).toBe(true);
  });

  it("returns ok=false with reasons when the certificate is absent", async () => {
    const root = await newTempDir();
    const result = await checkCompletionCertificate(root);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons[0]).toMatch(/not found/);
    }
  });

  it("returns ok=false when an evidence file is modified after certify", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "rounds/r5/harvest.json": "{}\n",
    });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    await writeCompletionCertificate(root, cert);

    // Mutate the evidence after certify.
    await writeFile(
      path.join(evidenceRoot, "rounds/r5/harvest.json"),
      '{"changed": true}\n',
      "utf-8",
    );

    const result = await checkCompletionCertificate(root);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r) => /digest mismatch/.test(r))).toBe(true);
    }
  });

  it("returns ok=false when a new evidence file is added after certify", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "rounds/r5/harvest.json": "{}\n",
    });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    await writeCompletionCertificate(root, cert);

    await mkdir(path.join(evidenceRoot, "rounds/r3"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "rounds/r3/absorption-plan.json"), "{}\n", "utf-8");

    const result = await checkCompletionCertificate(root);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r) => /not in certificate/.test(r))).toBe(true);
    }
  });

  it("excludes the certificate file itself from the digest tree", async () => {
    // If the certificate file were included in its own digest tree, every
    // check would fail. Verify exclusion.
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "rounds/r5/harvest.json": "{}\n",
    });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    expect(
      cert.evidenceDigests.find((e) => e.path.endsWith("completion-certificate.json")),
    ).toBeUndefined();
  });

  it("loads legacy reviewer field as canonical reviewerId", async () => {
    const root = await newTempDir();
    const certPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
    await mkdir(path.dirname(certPath), { recursive: true });
    await writeFile(
      certPath,
      `${JSON.stringify({
        runId: "legacy-run",
        generatedAt: "2026-04-27T00:00:00Z",
        generator: { tool: "qfai", version: "2.0.0" },
        evidenceDigests: [],
        validateRun: { errorCount: 0, ranAt: "2026-04-27T00:00:00Z" },
        verifyRun: { status: "PASS", ranAt: "2026-04-27T00:00:00Z" },
        reviewerSignoff: {
          reviewer: "legacy-reviewer",
          approved: true,
          timestamp: "2026-04-27T00:00:00Z",
        },
        iterationCount: 0,
        specsCovered: [],
      })}\n`,
      "utf-8",
    );

    const loaded = await loadCompletionCertificate(root);

    expect(loaded?.reviewerSignoff.reviewerId).toBe("legacy-reviewer");
  });

  // ────────────────────────────────────────────────────────────────────
  // TC-3.6.7..9 — DESIGN.md binding on CompletionCertificate
  // ────────────────────────────────────────────────────────────────────

  it("TC-3.6.7: buildCompletionCertificate stores designMd { path, sha256 }", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, { "rounds/r5/harvest.json": "{}\n" });
    const designMdPath = path.join(root, "DESIGN.md");
    await writeFile(designMdPath, "---\nbrand: x\n---\n\nbody\n", "utf-8");
    const cert = await buildCompletionCertificate({
      ...baseInputs(evidenceRoot),
      designMd: { path: "DESIGN.md", sha256: "f".repeat(64) },
    });
    expect(cert.designMd).toEqual({ path: "DESIGN.md", sha256: "f".repeat(64) });
  });

  it("TC-3.6.8: write/load round-trip preserves designMd", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, { "rounds/r5/harvest.json": "{}\n" });
    const cert = await buildCompletionCertificate({
      ...baseInputs(evidenceRoot),
      designMd: { path: "DESIGN.md", sha256: "a".repeat(64) },
    });
    await writeCompletionCertificate(root, cert);
    const loaded = await loadCompletionCertificate(root);
    expect(loaded?.designMd).toEqual({ path: "DESIGN.md", sha256: "a".repeat(64) });
  });

  it("TC-3.6.9: checkCompletionCertificate fails when DESIGN.md changes", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, { "rounds/r5/harvest.json": "{}\n" });
    const text = "---\nbrand: x\n---\n\nbody\n";
    await writeFile(path.join(root, "DESIGN.md"), text, "utf-8");
    // Compute the canonical sha and persist a matching cert.
    const { hashDesignMd } = await import("../../../src/core/design/designMd.js");
    const cert = await buildCompletionCertificate({
      ...baseInputs(evidenceRoot),
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(text) },
    });
    await writeCompletionCertificate(root, cert);
    expect((await checkCompletionCertificate(root)).ok).toBe(true);

    // Mutate DESIGN.md → check should fail.
    await writeFile(path.join(root, "DESIGN.md"), `${text}\n`, "utf-8");
    const result = await checkCompletionCertificate(root);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r) => /DESIGN\.md sha256 mismatch/.test(r))).toBe(true);
    }
  });

  it("returns null when required completion-certificate fields are missing", async () => {
    const root = await newTempDir();
    const certPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
    await mkdir(path.dirname(certPath), { recursive: true });
    await writeFile(
      certPath,
      `${JSON.stringify({
        runId: "broken-run",
        evidenceDigests: [],
        validateRun: { errorCount: 0, ranAt: "2026-04-27T00:00:00Z" },
        verifyRun: { status: "PASS", ranAt: "2026-04-27T00:00:00Z" },
        reviewerSignoff: {
          reviewerId: "reviewer",
          approved: true,
          timestamp: "2026-04-27T00:00:00Z",
        },
      })}\n`,
      "utf-8",
    );

    const loaded = await loadCompletionCertificate(root);

    expect(loaded).toBeNull();
  });
});

/**
 * Tests for completion-certificate build / write / load / check
 * (v1.8.4 Phase 5).
 */
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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
import { readUiContractsCovered } from "../../../src/core/prototyping/specsCovered.js";

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
  uiContractsCovered: ["CON-UI-0017"],
  convergedUiContracts: ["CON-UI-0017"],
  laggingUiContracts: [],
});

describe("buildCompletionCertificate", () => {
  it("requires a canonical, distinct partition of covered UI contracts", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {});
    await expect(
      buildCompletionCertificate({
        ...baseInputs(evidenceRoot),
        uiContractsCovered: ["0017"],
        convergedUiContracts: ["0017"],
      }),
    ).rejects.toThrow(/CON-UI-NNNN/);
    await expect(
      buildCompletionCertificate({
        ...baseInputs(evidenceRoot),
        laggingUiContracts: ["CON-UI-0017"],
      }),
    ).rejects.toThrow(/partition/);
  });

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
    expect(cert.uiContractsCovered).toEqual(["CON-UI-0017"]);
  });
});

describe("write / load round-trip", () => {
  it("rejects certificates with legacy spec fields", async () => {
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {});
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    const certPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
    await mkdir(path.dirname(certPath), { recursive: true });
    await writeFile(certPath, JSON.stringify({ ...cert, specsCovered: ["0017"] }), "utf-8");
    expect(await loadCompletionCertificate(root)).toBeNull();
  });

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
      "convergedUiContracts",
      "evidenceDigests",
      "generatedAt",
      "generator",
      "iterationCount",
      "laggingUiContracts",
      "reviewerSignoff",
      "runId",
      "uiContractsCovered",
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

  // QFAI:EX-0001-0140-02
  it("leaves a cycle-0 reset's backups out of the digest tree", async () => {
    // They hold the previous loop's evidence, and removing one after certify
    // must not read as this loop's evidence changing.
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "iter-00/home.review.json": "{}\n",
      "iter-00.backup-2026-01-01T00-00-00-000Z/old.review.json": "{}\n",
      "aggregate.backup-2026-01-01T00-00-00-000Z/screenshots/home.png": "old",
      // Named like a backup, but a file a reset never writes: still evidence.
      "aggregate.backup-summary.json": "{}\n",
      // A reset backs up `iter-00` only, so this is a directory someone made.
      "iter-01.backup-2026-01-01T00-00-00-000Z/kept.review.json": "{}\n",
    });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    expect(cert.evidenceDigests.map((entry) => entry.path)).toEqual([
      "aggregate.backup-summary.json",
      "iter-00/home.review.json",
      "iter-01.backup-2026-01-01T00-00-00-000Z/kept.review.json",
    ]);
    await writeCompletionCertificate(root, cert);

    await rm(path.join(evidenceRoot, "aggregate.backup-2026-01-01T00-00-00-000Z"), {
      recursive: true,
    });
    expect((await checkCompletionCertificate(root)).ok).toBe(true);
  });

  it("leaves a backup out whatever the entry turns out to be", async () => {
    // A reset renames the `iter-00` entry whatever it points at, so a backup can
    // be a link to a regular file. Resolved rather than read by name, the target
    // was hashed as one of this loop's own files, and a later change to it
    // failed a check of a loop nothing had touched.
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, { "iter-00/home.review.json": "{}\n" });
    const target = path.join(root, "linked-seed.json");
    await writeFile(target, "{}\n", "utf-8");
    try {
      await symlink(target, path.join(evidenceRoot, "iter-00.backup-2026-01-01T00-00-00-000Z"));
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }

    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    expect(cert.evidenceDigests.map((entry) => entry.path)).toEqual(["iter-00/home.review.json"]);
    await writeCompletionCertificate(root, cert);

    await writeFile(target, '{"changed": true}\n', "utf-8");
    expect((await checkCompletionCertificate(root)).ok).toBe(true);
  });

  it("verifies a certificate that lists a backup by its own name", async () => {
    // A scanner that followed a link sealed the backup's name as a file, with no
    // path under it. Filtered only as a prefix, that entry read as evidence the
    // scan no longer holds, and every check of an untouched loop reported it
    // removed.
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, { "iter-00/home.review.json": "{}\n" });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    await writeCompletionCertificate(root, {
      ...cert,
      evidenceDigests: [
        ...cert.evidenceDigests,
        { path: "iter-00.backup-2026-01-01T00-00-00-000Z", sha256: "0".repeat(64) },
      ],
    });

    expect((await checkCompletionCertificate(root)).ok).toBe(true);
  });

  it("verifies a certificate that lists files under a reset's backups", async () => {
    // Such a certificate was sealed with the backups inside its digest tree,
    // and the scan now leaves them out: compared as they stand, every one would
    // read as removed.
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "iter-00/home.review.json": "{}\n",
      "iter-00.backup-2026-01-01T00-00-00-000Z/old.review.json": "changed since",
    });
    const cert = await buildCompletionCertificate(baseInputs(evidenceRoot));
    await writeCompletionCertificate(root, {
      ...cert,
      evidenceDigests: [
        ...cert.evidenceDigests,
        {
          path: "aggregate.backup-2026-01-01T00-00-00-000Z/html/home.html",
          sha256: "0".repeat(64),
        },
        { path: "iter-00.backup-2026-01-01T00-00-00-000Z/old.review.json", sha256: "0".repeat(64) },
      ],
    });

    expect(await checkCompletionCertificate(root)).toEqual({ ok: true });
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
        uiContractsCovered: ["CON-UI-0001"],
        convergedUiContracts: ["CON-UI-0001"],
        laggingUiContracts: [],
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

// ─────────────────────────────────────────────────────────────────────────
// Frozen UI contract evidence drives certify aggregation.
// ─────────────────────────────────────────────────────────────────────────

describe("readUiContractsCovered drives certify aggregation", () => {
  it("preserves the frozen UI contract iteration order verbatim", async () => {
    // The reader consumes the cycle-0 frozen UI contract set and the
    // certify aggregation loop honours that order verbatim (it does not re-sort,
    // re-dedupe, or re-resolve from disk). This unit test pins the predicate: a
    // mock prototyping.json record with a non-lexicographic order
    // (e.g. ["CON-UI-0099", "CON-UI-0001"]) returns the same order — proving the
    // reader does not silently re-sort.
    //
    // The certify call site (prototypingCertify.ts:314) passes the
    // returned array verbatim into `buildCompletionCertificate({
    // uiContractsCovered })`, which uses `[...inputs.uiContractsCovered]` to
    // preserve order. Together these two facts mean a certify
    // iteration over `cert.uiContractsCovered` walks the UI contract set in
    // frozen-set order.
    const frozen = ["CON-UI-0099", "CON-UI-0001", "CON-UI-0042"];
    const result = readUiContractsCovered({ uiContractsCovered: frozen });
    // Preservation of input order (NOT sorted) — defends against a
    // future refactor that silently sorts the array.
    expect(result).toEqual({ kind: "ok", value: ["CON-UI-0099", "CON-UI-0001", "CON-UI-0042"] });
    // Confirm non-mutation of the input.
    expect(frozen).toEqual(["CON-UI-0099", "CON-UI-0001", "CON-UI-0042"]);
  });

  it("the certificate receives the same frozen UI contract iteration order", async () => {
    // End-to-end on the unit boundary: read frozen → pass into
    // buildCompletionCertificate → confirm cert.uiContractsCovered preserves
    // the iteration order. This pins the contract between
    // `uiContractsCovered.ts` and `certificate.ts` so a future change to
    // either side that silently re-orders is caught.
    const root = await newTempDir();
    const evidenceRoot = await seedEvidence(root, {
      "rounds/r5/harvest.json": "{}\n",
    });
    const frozenInRecord = { uiContractsCovered: ["CON-UI-0099", "CON-UI-0001", "CON-UI-0042"] };
    const frozenResult = readUiContractsCovered(frozenInRecord);
    if (frozenResult.kind !== "ok") throw new Error("frozen UI contract list unexpectedly invalid");
    const frozen = frozenResult.value;

    const cert = await buildCompletionCertificate({
      ...baseInputs(evidenceRoot),
      uiContractsCovered: frozen,
      convergedUiContracts: frozen,
    });
    expect(cert.uiContractsCovered).toEqual(["CON-UI-0099", "CON-UI-0001", "CON-UI-0042"]);
  });
});

describe("frozen UI contract evidence remains immutable across reads", () => {
  it("reads frozen uiContractsCovered from evidence, not live in-memory mutations", async () => {
    // The cycle-0 frozen UI contract set is recorded once and consumed by subsequent
    // reads. Mutating an in-memory
    // "live" copy of the UI contract set must not affect what subsequent
    // reads return — readUiContractsCovered always produces a defensive
    // copy from the persisted record.
    //
    // Setup: persist a "cycle 0 evidence" record with frozen set
    // ["CON-UI-0001"]. Then mutate an in-memory "live" array. Re-read the
    // frozen set — must still be ["CON-UI-0001"], not the mutated value.
    const recorded = { uiContractsCovered: ["CON-UI-0001"] };
    const liveInMemory: string[] = [...recorded.uiContractsCovered];

    // Cycle 0: read the frozen set.
    const cycle0 = readUiContractsCovered(recorded);
    expect(cycle0).toEqual({ kind: "ok", value: ["CON-UI-0001"] });

    // Mutate the in-memory live copy AND attempt to mutate cycle0
    // (which must not back-write to the record).
    liveInMemory.push("CON-UI-0099");
    if (cycle0.kind === "ok") {
      cycle0.value.push("CON-UI-0042");
    }

    // Cycle 1 re-reads the frozen set — still ["CON-UI-0001"].
    const cycle1 = readUiContractsCovered(recorded);
    expect(cycle1).toEqual({ kind: "ok", value: ["CON-UI-0001"] });
    // Confirm the persisted record was NOT mutated by the cycle-0
    // consumer (defensive-copy contract).
    expect(recorded.uiContractsCovered).toEqual(["CON-UI-0001"]);
  });

  it("preserves the frozenLicenseCatalog shape across reads", async () => {
    // The license catalog companion to the frozen UI contract set is
    // recorded once at cycle 0 and read on every subsequent cycle.
    // This unit test pins JSON round-trip of the catalog shape
    // (allowedSources + licenseTiers), without claiming that the
    // iterate command persisted or consumed it.
    //
    // No public reader API for frozenLicenseCatalog exists; this
    // exercises only the serialization boundary.
    const catalog = {
      allowedSources: ["unsplash", "pexels"] as const,
      licenseTiers: {
        unsplash: ["unsplash-license", "free"] as const,
        pexels: ["pexels-free"] as const,
      },
    };
    const persisted = JSON.parse(JSON.stringify(catalog)) as typeof catalog;
    expect(persisted.allowedSources).toEqual(["unsplash", "pexels"]);
    expect(persisted.licenseTiers.unsplash).toEqual(["unsplash-license", "free"]);
    expect(persisted.licenseTiers.pexels).toEqual(["pexels-free"]);
    // Mutating the parsed copy must not back-write to the original.
    persisted.licenseTiers.unsplash.push("mutated");
    expect(catalog.licenseTiers.unsplash).toEqual(["unsplash-license", "free"]);
  });
});

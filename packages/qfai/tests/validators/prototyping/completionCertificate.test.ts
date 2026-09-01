/**
 * Tests for validateCompletionCertificateIssues (v1.8.4 Phase 5).
 *
 * QFAI-PROT-335: certificate absent while completion is claimed
 * QFAI-PROT-336: certificate present but digest mismatch
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import {
  buildCompletionCertificate,
  writeCompletionCertificate,
} from "../../../src/core/prototyping/certificate.js";
import { validateCompletionCertificateIssues } from "../../../src/core/validators/prototyping/completionCertificate.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cert-validator-"));
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

function makeConfig(): QfaiConfig {
  return {
    paths: {
      contractsDir: ".qfai/contracts",
      specsDir: ".qfai/specs",
      discussionDir: ".qfai/discussion",
      outDir: ".qfai/out",
      skillsDir: ".qfai/assistant/skills",
      promptsDir: ".qfai/assistant/skills",
      srcDir: "src",
      testsDir: "tests",
    },
    validation: {
      failOn: "error",
      require: { specSections: [] },
      testStrategy: {
        requireLayerTags: false,
        requireSizeTags: false,
        maxE2eScenarioRatio: null,
        maxE2eScenarioCount: null,
        forbidTestTodoStubs: true,
      },
      traceability: {
        brMustHaveSc: true,
        scMustHaveTest: true,
        testFileGlobs: [],
        testFileExcludeGlobs: [],
        scNoTestSeverity: "error",
        orphanContractsPolicy: "error",
        unknownContractIdSeverity: "warning",
      },
    },
    output: { validateJsonPath: ".qfai/output/validate.json" },
  };
}

async function seedPrototypingJson(root: string, body: unknown): Promise<void> {
  // Seed at the canonical path that iterate / certify use; the
  // legacy '.qfai/evidence/prototyping.json' was a stale fixture path
  // that happened to match the validator's broken read in pre-PR
  // code. The validator now reads PROTOTYPING_JSON_REL.
  await mkdir(path.join(root, ".qfai/evidence/prototyping"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
    JSON.stringify(body, null, 2),
    "utf-8",
  );
}

describe("validateCompletionCertificateIssues", () => {
  it("returns empty when prototyping.json is absent and no completion claimed", async () => {
    const root = await newTempDir();
    expect(await validateCompletionCertificateIssues(root, makeConfig())).toEqual([]);
  });

  it("returns empty when completion is not claimed", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
      // no completionClaimed, no phase, no completionCertificate
    });
    expect(await validateCompletionCertificateIssues(root, makeConfig())).toEqual([]);
  });

  it("emits QFAI-PROT-335 when completionClaimed=true but certificate is absent", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
      completionClaimed: true,
    });
    const issues = await validateCompletionCertificateIssues(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-335");
    expect(issues[0]?.severity).toBe("error");
  });

  it("emits QFAI-PROT-335 when phase=completed but certificate is absent", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
      phase: "completed",
    });
    const issues = await validateCompletionCertificateIssues(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-335");
  });

  it("returns empty when claim is present and certificate digests match", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
      completionClaimed: true,
    });
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "rounds/r5"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "rounds/r5/harvest.json"), "{}\n", "utf-8");
    const cert = await buildCompletionCertificate({
      runId: "test-run",
      toolVersion: "1.8.4",
      evidenceRoot,
      validateRun: { errorCount: 0, ranAt: "2026-04-27T00:00:00Z" },
      verifyRun: { status: "PASS", ranAt: "2026-04-27T00:01:00Z" },
      reviewerSignoff: {
        reviewerId: "test",
        approved: true,
        timestamp: "2026-04-27T00:02:00Z",
      },
      iterationCount: 1,
      polishCycleCount: 0,
      specsCovered: ["0012"],
    });
    await writeCompletionCertificate(root, cert);

    expect(await validateCompletionCertificateIssues(root, makeConfig())).toEqual([]);
  });

  it("emits QFAI-PROT-336 when certificate exists but evidence has been modified", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
      completionClaimed: true,
    });
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "rounds/r5"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "rounds/r5/harvest.json"), "{}\n", "utf-8");
    const cert = await buildCompletionCertificate({
      runId: "test-run",
      toolVersion: "1.8.4",
      evidenceRoot,
      validateRun: { errorCount: 0, ranAt: "2026-04-27T00:00:00Z" },
      verifyRun: { status: "PASS", ranAt: "2026-04-27T00:01:00Z" },
      reviewerSignoff: {
        reviewerId: "test",
        approved: true,
        timestamp: "2026-04-27T00:02:00Z",
      },
      iterationCount: 1,
      polishCycleCount: 0,
      specsCovered: ["0012"],
    });
    await writeCompletionCertificate(root, cert);

    // Tamper with evidence
    await writeFile(path.join(evidenceRoot, "rounds/r5/harvest.json"), '{"changed":1}\n', "utf-8");

    const issues = await validateCompletionCertificateIssues(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-336");
    expect(issues[0]?.message).toMatch(/digest mismatch/);
  });
});

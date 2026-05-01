import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validatePrototypingEvidenceV3 } from "../../src/core/validators/prototypingEvidenceV3.js";
import type { QfaiConfig } from "../../src/core/config.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-protov3-"));
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
        requireApiAtdd: false,
        requireE2eAtdd: false,
        requireIntegrationAtdd: false,
        requireUnitTdd: false,
        requireSpecTagBlock: false,
        requireRoutingProfile: false,
      },
    },
  };
}

async function seedPrototypingJson(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai/evidence/prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "prototyping.json"), JSON.stringify(body), "utf-8");
}

const validIter = (index: number, allExceptional = false, slop: string[] = []) => ({
  index,
  commitSha: "a".repeat(40),
  scores: allExceptional
    ? {
        designQuality: "exceptional" as const,
        originality: "exceptional" as const,
        craft: "exceptional" as const,
        functionality: "exceptional" as const,
      }
    : {
        designQuality: "acceptable" as const,
        originality: "acceptable" as const,
        craft: "acceptable" as const,
        functionality: "acceptable" as const,
      },
  proseCritique: "x".repeat(1500),
  slopPatternsDetected: slop,
  pivotDirective: "continue" as const,
  evidenceRefs: {
    screenshot: `.qfai/evidence/prototyping/iter-${String(index).padStart(2, "0")}/home.png`,
    html: `.qfai/evidence/prototyping/iter-${String(index).padStart(2, "0")}/home.html`,
  },
});

describe("validatePrototypingEvidenceV3", () => {
  it("emits no issues when prototyping.json is missing (silent)", async () => {
    const root = await newTempDir();
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues).toEqual([]);
  });

  // QFAI:SPEC-0017:TC-0017-0015
  it("emits QFAI-PROT2-001 when prototyping.json is unparseable", async () => {
    const root = await newTempDir();
    const dir = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "prototyping.json"), "{not json", "utf-8");
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT2-001")).toBe(true);
  });

  // QFAI:SPEC-0017:TC-0017-0016
  it("emits QFAI-PROT2-002 when schemaVersion is not 3.0", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      schemaVersion: "2.0",
      specsCovered: ["0017"],
      iterations: [validIter(0)],
      acceptedIterationIndex: 0,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT2-002")).toBe(true);
  });

  it("emits QFAI-PROT2-003 when iterations[] is empty", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: [],
      acceptedIterationIndex: -1,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT2-003")).toBe(true);
  });

  // QFAI:SPEC-0017:TC-0017-0017
  it("emits QFAI-PROT2-004 when iterations[i].index is non-contiguous", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: [validIter(0), { ...validIter(1), index: 5 }],
      acceptedIterationIndex: 1,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT2-004")).toBe(true);
  });

  it("emits QFAI-PROT2-005 when stopReason=max-iterations but last index !== 14", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: [validIter(0)],
      acceptedIterationIndex: 0,
      stopReason: "max-iterations",
    });
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT2-005")).toBe(true);
  });

  it("emits QFAI-PROT2-005 when stopReason=axes-exceptional but last iter not all exceptional", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: [validIter(0, false)],
      acceptedIterationIndex: 0,
      stopReason: "axes-exceptional",
    });
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT2-005")).toBe(true);
  });

  it("emits structured issues instead of throwing when stopReason=axes-exceptional and the last iter is malformed", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: [validIter(0), { index: 1, commitSha: "b".repeat(40), scores: null }],
      acceptedIterationIndex: 1,
      stopReason: "axes-exceptional",
    });
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT2-002")).toBe(true);
    expect(issues.some((i) => i.code === "QFAI-PROT2-005")).toBe(true);
  });

  it("emits QFAI-PROT2-006 when iterations.length > 15", async () => {
    const root = await newTempDir();
    const iters = Array.from({ length: 16 }, (_, i) => validIter(i));
    await seedPrototypingJson(root, {
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: iters,
      acceptedIterationIndex: 15,
      stopReason: null,
    });
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT2-006")).toBe(true);
  });

  it("emits QFAI-PROT2-007 when acceptedIterationIndex is not iterations.length-1", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: [validIter(0), validIter(1)],
      acceptedIterationIndex: 0, // should be 1
      stopReason: null,
    });
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-PROT2-007")).toBe(true);
  });

  it("returns no issues for a valid 3.0 record", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: [validIter(0), validIter(1, true)],
      acceptedIterationIndex: 1,
      stopReason: "axes-exceptional",
    });
    const issues = await validatePrototypingEvidenceV3(root, makeConfig());
    expect(issues).toEqual([]);
  });
});

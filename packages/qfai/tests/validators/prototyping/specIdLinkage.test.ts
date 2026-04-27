/**
 * Tests for validateSpecIdLinkage (v1.8.4 Phase 7).
 *
 * QFAI-PROT-LINK-001: prototyping.json.specs[].specId → missing spec
 * QFAI-PROT-LINK-002: review-bundle.json.spec → missing spec
 * QFAI-PROT-LINK-003: candidate artifact dir missing
 * QFAI-PROT-LINK-004: polish cycle iteration dir missing
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { validateSpecIdLinkage } from "../../../src/core/validators/prototyping/specIdLinkage.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-spec-link-"));
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

async function seedSpec(root: string, specNumber: string): Promise<void> {
  const dir = path.join(root, ".qfai/specs", `spec-${specNumber}`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "01_Spec.md"), `# spec-${specNumber}\n`, "utf-8");
  await writeFile(path.join(dir, "02_User-stories.md"), "# stories\n", "utf-8");
}

async function seedPrototypingJson(root: string, body: unknown): Promise<void> {
  await mkdir(path.join(root, ".qfai/evidence"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping.json"),
    JSON.stringify(body, null, 2),
    "utf-8",
  );
}

describe("validateSpecIdLinkage", () => {
  it("returns empty when no prototyping.json exists", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai/specs"), { recursive: true });
    expect(await validateSpecIdLinkage(root, makeConfig())).toEqual([]);
  });

  it("emits QFAI-PROT-LINK-001 when specs[].specId references a missing spec", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001");
    await seedPrototypingJson(root, {
      specs: [{ specId: "spec-9999" }, { specId: "0001" }],
    });
    const issues = await validateSpecIdLinkage(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-LINK-001");
    expect(issues[0]?.message).toMatch(/9999/);
  });

  it("emits QFAI-PROT-LINK-002 when review-bundle.spec references a missing spec", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001");
    await seedPrototypingJson(root, {});
    // Seed a review-bundle.json that references a missing spec
    const bundleDir = path.join(root, ".qfai/evidence/prototyping/rounds/r5");
    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      path.join(bundleDir, "review-bundle.json"),
      JSON.stringify({ spec: "0099", round: "r5", candidates: [] }),
      "utf-8",
    );

    const issues = await validateSpecIdLinkage(root, makeConfig());
    const linkIssue = issues.find((i) => i.code === "QFAI-PROT-LINK-002");
    expect(linkIssue).toBeDefined();
    expect(linkIssue?.message).toMatch(/0099/);
  });

  it("emits QFAI-PROT-LINK-003 when a candidate artifact dir is missing", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001");
    await seedPrototypingJson(root, {
      rounds: [
        {
          round: "r5",
          candidates: [{ candidateId: "c1" }, { candidateId: "c2" }],
        },
      ],
    });
    // Only seed candidate c1's dir; c2 is missing
    await mkdir(
      path.join(root, ".qfai/evidence/prototyping/rounds/r5/candidates/c1"),
      { recursive: true },
    );

    const issues = await validateSpecIdLinkage(root, makeConfig());
    const dirIssues = issues.filter((i) => i.code === "QFAI-PROT-LINK-003");
    expect(dirIssues).toHaveLength(1);
    expect(dirIssues[0]?.message).toMatch(/c2/);
  });

  it("emits QFAI-PROT-LINK-004 when a polish cycle iteration dir is missing", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001");
    await seedPrototypingJson(root, {
      polishCycles: [{ cycle: 1, kind: "polish" }, { cycle: 2, kind: "completed" }],
    });
    // Only seed iteration 1 dir; 2 is missing
    await mkdir(
      path.join(root, ".qfai/evidence/prototyping/iterations/1"),
      { recursive: true },
    );

    const issues = await validateSpecIdLinkage(root, makeConfig());
    const dirIssues = issues.filter((i) => i.code === "QFAI-PROT-LINK-004");
    expect(dirIssues).toHaveLength(1);
    expect(dirIssues[0]?.message).toMatch(/cycle=2/);
  });

  it("returns empty when all spec linkages resolve", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001");
    await seedSpec(root, "0007");
    await seedPrototypingJson(root, {
      specs: [{ specId: "0001" }, { specId: "0007" }],
    });
    expect(await validateSpecIdLinkage(root, makeConfig())).toEqual([]);
  });
});

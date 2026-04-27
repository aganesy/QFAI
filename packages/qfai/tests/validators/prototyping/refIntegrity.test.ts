/**
 * Tests for validatePrototypingArtifactRefIntegrity (v1.8.4 Phase 7).
 *
 * QFAI-PROT-REF-001: dangling artifact ref (string OK but file does not
 * exist on disk).
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { validatePrototypingArtifactRefIntegrity } from "../../../src/core/validators/prototyping/refIntegrity.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ref-int-"));
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
  await mkdir(path.join(root, ".qfai/evidence"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping.json"),
    JSON.stringify(body, null, 2),
    "utf-8",
  );
}

async function seedFile(root: string, relPath: string, body = "{}\n"): Promise<void> {
  const full = path.join(root, relPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body, "utf-8");
}

describe("validatePrototypingArtifactRefIntegrity", () => {
  it("returns empty when prototyping.json is absent", async () => {
    const root = await newTempDir();
    expect(await validatePrototypingArtifactRefIntegrity(root, makeConfig())).toEqual([]);
  });

  it("returns empty when every ref points to an existing file", async () => {
    const root = await newTempDir();
    await seedFile(root, ".qfai/evidence/prototyping/rounds/r3/absorption-plan.json");
    await seedFile(root, ".qfai/evidence/prototyping/rounds/r3/reimplementation.json");
    await seedPrototypingJson(root, {
      rounds: [
        {
          round: "r3",
          absorptionPlanRef: ".qfai/evidence/prototyping/rounds/r3/absorption-plan.json",
          reimplementationRef: ".qfai/evidence/prototyping/rounds/r3/reimplementation.json",
        },
      ],
    });
    expect(await validatePrototypingArtifactRefIntegrity(root, makeConfig())).toEqual([]);
  });

  it("emits QFAI-PROT-REF-001 for a dangling absorptionPlanRef", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      rounds: [
        {
          round: "r3",
          absorptionPlanRef:
            ".qfai/evidence/prototyping/rounds/r3/absorption-plan.json",
        },
      ],
    });
    const issues = await validatePrototypingArtifactRefIntegrity(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-REF-001");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toMatch(/absorptionPlanRef/);
    expect(issues[0]?.message).toMatch(/does not exist/);
  });

  it("emits QFAI-PROT-REF-001 for a dangling polishCycle reviewerGateRef", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      polishCycles: [
        {
          cycle: 1,
          reviewerGateRef: ".qfai/evidence/prototyping/polish/1/gate.json",
        },
      ],
    });
    const issues = await validatePrototypingArtifactRefIntegrity(root, makeConfig());
    const ref = issues.find((i) => i.message.includes("reviewerGateRef"));
    expect(ref).toBeDefined();
    expect(ref?.code).toBe("QFAI-PROT-REF-001");
  });

  it("emits QFAI-PROT-REF-001 for dangling fullHarness evidence refs", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      fullHarness: {
        iterations: [
          {
            iteration: 1,
            evidenceRefs: {
              render: [".qfai/evidence/render/1.png"],
              browserQa: [".qfai/evidence/qa/1.json"],
            },
          },
        ],
      },
    });
    const issues = await validatePrototypingArtifactRefIntegrity(root, makeConfig());
    expect(issues.length).toBe(2);
    expect(issues.every((i) => i.code === "QFAI-PROT-REF-001")).toBe(true);
  });

  it("emits QFAI-PROT-REF-001 for dangling review-bundle.json refs", async () => {
    const root = await newTempDir();
    await seedFile(
      root,
      ".qfai/evidence/prototyping/rounds/r5/review-bundle.json",
      JSON.stringify({
        spec: "0001",
        round: "r5",
        candidates: [],
        commandPlanRef: ".qfai/evidence/prototyping/rounds/r5/command-plans.json",
        axisDefsRef: ".qfai/contracts/design/evaluation-rubric.yaml",
        designSystemChecklistRef: ".qfai/contracts/design/design-system.yaml",
      }),
    );
    const issues = await validatePrototypingArtifactRefIntegrity(root, makeConfig());
    // 3 dangling refs: commandPlan, axisDefs, designSystemChecklist
    expect(issues.length).toBe(3);
    expect(issues.every((i) => i.code === "QFAI-PROT-REF-001")).toBe(true);
  });

  it("emits QFAI-PROT-REF-001 for dangling breakthrough.json branchRefs", async () => {
    const root = await newTempDir();
    await seedFile(
      root,
      ".qfai/evidence/prototyping/breakthrough.json",
      JSON.stringify({
        latestIteration: 3,
        triggerResult: true,
        branchCount: 2,
        branchRefs: [
          ".qfai/evidence/prototyping/branches/a.json",
          ".qfai/evidence/prototyping/branches/b.json",
        ],
      }),
    );
    const issues = await validatePrototypingArtifactRefIntegrity(root, makeConfig());
    expect(issues.length).toBe(2);
    expect(issues.every((i) => i.code === "QFAI-PROT-REF-001")).toBe(true);
  });
});

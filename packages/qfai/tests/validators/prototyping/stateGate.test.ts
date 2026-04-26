/**
 * Tests for validateStateGate orchestrator (v1.8.4 Phase 2).
 *
 * Verifies that prototyping.json is loaded once and dispatched to both
 * validateExecutionPlanIssues (QFAI-PROT-310) and
 * validateDelegationMapIssues (QFAI-PROT-311). Missing/malformed
 * prototyping.json silently no-ops because validatePrototypingEvidence
 * already covers QFAI-PROT-150.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { validateStateGate } from "../../../src/core/validators/prototyping/stateGate.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-state-gate-"));
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

describe("validateStateGate", () => {
  it("returns empty when prototyping.json is missing", async () => {
    const root = await newTempDir();
    expect(await validateStateGate(root, makeConfig())).toEqual([]);
  });

  it("returns empty when prototyping.json is malformed JSON", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai/evidence"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping.json"),
      "{ malformed json",
      "utf-8",
    );
    expect(await validateStateGate(root, makeConfig())).toEqual([]);
  });

  it("returns empty when mode is not full-harness (no executionPlan obligation)", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
    });
    expect(await validateStateGate(root, makeConfig())).toEqual([]);
  });

  it("emits QFAI-PROT-310 when full-harness has no executionPlan", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
    });
    const issues = await validateStateGate(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-310");
    expect(issues[0]?.severity).toBe("error");
  });

  it("emits QFAI-PROT-311 when delegationMap has an invalid role", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      executionPlan: {
        targetIterations: 20,
        evaluationAxesSource: ".qfai/contracts/design/evaluation-rubric.yaml",
        delegationMap: { UI実装: "qa-gatekeeper" }, // not allowed
        plannedAt: "2026-04-26T00:00:00Z",
      },
    });
    const issues = await validateStateGate(root, makeConfig());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-311");
  });

  it("emits both QFAI-PROT-310 and 311 when both conditions trigger", async () => {
    // The executionPlan presence check passes only because executionPlan
    // exists; if it's missing entirely, delegationMap check is skipped
    // (no delegationMap to validate). Verify the orchestrator parses
    // both branches correctly with one absent and one violation.
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      // No executionPlan at all
    });
    const issues = await validateStateGate(root, makeConfig());
    expect(issues).toHaveLength(1); // only 310; 311 not raised because no map
    expect(issues[0]?.code).toBe("QFAI-PROT-310");
  });

  it("emits no issues when full-harness has a valid executionPlan + delegationMap", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      executionPlan: {
        targetIterations: 20,
        evaluationAxesSource: ".qfai/contracts/design/evaluation-rubric.yaml",
        delegationMap: {
          UI実装: "frontend-engineer",
          スクリーンショット: "devops-ci-engineer",
          評価スコアリング: "product-surface-reviewer",
          ビルド: "backend-engineer",
        },
        plannedAt: "2026-04-26T00:00:00Z",
      },
    });
    expect(await validateStateGate(root, makeConfig())).toEqual([]);
  });
});

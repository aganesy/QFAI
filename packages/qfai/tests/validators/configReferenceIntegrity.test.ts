/**
 * Tests for validateConfigReferenceIntegrity (v1.8.4 Phase 7).
 *
 * Verifies the three QFAI-CFG-LINK-* codes:
 *   001: primarySpecId points to a missing spec dir
 *   002: paths.* points to a missing directory (warning)
 *   003: calibration.packPath points to a missing dir
 */
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../src/core/config.js";
import { validateConfigReferenceIntegrity } from "../../src/core/validators/configReferenceIntegrity.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cfg-link-"));
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

function makeConfig(overrides: { primarySpecId?: string; packPath?: string } = {}): QfaiConfig {
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
    prototyping: {
      ...(overrides.primarySpecId !== undefined ? { primarySpecId: overrides.primarySpecId } : {}),
      ...(overrides.packPath !== undefined
        ? { calibration: { packPath: overrides.packPath } }
        : {}),
    },
  };
}

async function seedDirs(root: string, paths: string[]): Promise<void> {
  for (const p of paths) {
    await mkdir(path.join(root, p), { recursive: true });
  }
}

describe("validateConfigReferenceIntegrity", () => {
  it("returns empty when all paths exist and primarySpecId resolves", async () => {
    const root = await newTempDir();
    await seedDirs(root, [
      ".qfai/specs/spec-0012",
      ".qfai/contracts",
      ".qfai/discussion",
      ".qfai/assistant/skills",
      "src",
      "tests",
    ]);
    const issues = await validateConfigReferenceIntegrity(
      root,
      makeConfig({ primarySpecId: "0012" }),
    );
    expect(issues).toEqual([]);
  });

  it("emits QFAI-CFG-LINK-001 (error) when primarySpecId points to missing spec", async () => {
    const root = await newTempDir();
    await seedDirs(root, [
      ".qfai/specs",
      ".qfai/contracts",
      ".qfai/discussion",
      ".qfai/assistant/skills",
      "src",
      "tests",
    ]);
    const issues = await validateConfigReferenceIntegrity(
      root,
      makeConfig({ primarySpecId: "9999" }),
    );
    const linkIssue = issues.find((i) => i.code === "QFAI-CFG-LINK-001");
    expect(linkIssue).toBeDefined();
    expect(linkIssue?.severity).toBe("error");
    expect(linkIssue?.message).toMatch(/9999/);
  });

  it("emits QFAI-CFG-LINK-002 (warning) for missing non-default generated paths", async () => {
    const root = await newTempDir();
    // specs/contracts/discussion use default skill-created paths, so their
    // absence is no longer a config-reference warning after clean init.
    const issues = await validateConfigReferenceIntegrity(root, makeConfig());
    const warningIssues = issues.filter((i) => i.code === "QFAI-CFG-LINK-002");
    expect(warningIssues.map((i) => i.rule).sort()).toEqual([
      "config.paths.skillsDir.reality",
      "config.paths.srcDir.reality",
      "config.paths.testsDir.reality",
    ]);
    for (const i of warningIssues) {
      expect(i.severity).toBe("warning");
    }
  });

  it("still warns when a custom workflow artifact path is missing", async () => {
    const root = await newTempDir();
    const config = makeConfig();
    config.paths.contractsDir = "custom-contracts";

    const issues = await validateConfigReferenceIntegrity(root, config);
    expect(issues.some((i) => i.rule === "config.paths.contractsDir.reality")).toBe(true);
  });

  it("emits QFAI-CFG-LINK-003 (error) when calibration.packPath is missing", async () => {
    const root = await newTempDir();
    await seedDirs(root, [
      ".qfai/specs",
      ".qfai/contracts",
      ".qfai/discussion",
      ".qfai/assistant/skills",
      "src",
      "tests",
    ]);
    const issues = await validateConfigReferenceIntegrity(
      root,
      makeConfig({ packPath: "missing-pack-dir" }),
    );
    const linkIssue = issues.find((i) => i.code === "QFAI-CFG-LINK-003");
    expect(linkIssue).toBeDefined();
    expect(linkIssue?.severity).toBe("error");
  });

  it("does not require the default calibration pack on a fresh init workspace", async () => {
    const root = await newTempDir();
    await seedDirs(root, [
      ".qfai/specs",
      ".qfai/contracts",
      ".qfai/discussion",
      ".qfai/assistant/skills",
      "src",
      "tests",
    ]);
    const issues = await validateConfigReferenceIntegrity(
      root,
      makeConfig({ packPath: ".qfai/evidence/calibration.yaml" }),
    );
    expect(issues.some((i) => i.code === "QFAI-CFG-LINK-003")).toBe(false);
  });

  it("treats outDir absence as silent (lazy creation)", async () => {
    const root = await newTempDir();
    await seedDirs(root, [
      ".qfai/specs",
      ".qfai/contracts",
      ".qfai/discussion",
      ".qfai/assistant/skills",
      "src",
      "tests",
      // No `.qfai/out`
    ]);
    const issues = await validateConfigReferenceIntegrity(root, makeConfig());
    // outDir is excluded from VERIFIED_PATH_KEYS; should not produce an issue.
    const outDirIssues = issues.filter(
      (i) => i.code === "QFAI-CFG-LINK-002" && i.message.includes("outDir"),
    );
    expect(outDirIssues).toEqual([]);
  });
});

/**
 * Tests for resolvePrimaryPrototypingSpec (v1.8.4).
 *
 * Resolution order:
 *   1. config.prototyping.primarySpecId
 *   2. Marker scan (surface_type: ui-bearing or "prototyping" in title)
 *   3. undefined
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { resolvePrimaryPrototypingSpec } from "../../../src/core/prototyping/specResolution.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-spec-res-"));
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

function makeConfig(overrides: Partial<QfaiConfig["prototyping"]> = {}): QfaiConfig {
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
    prototyping: { ...overrides },
  };
}

async function seedSpec(root: string, specNumber: string, body: string): Promise<void> {
  const specDir = path.join(root, ".qfai/specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), body, "utf-8");
  // Also seed the second required layered file so collectSpecEntries
  // recognises it as a layered spec.
  await writeFile(path.join(specDir, "02_User-stories.md"), "# stories\n", "utf-8");
}

describe("resolvePrimaryPrototypingSpec", () => {
  it("returns undefined when no specs exist", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai/specs"), { recursive: true });
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result).toBeUndefined();
  });

  it("uses config.prototyping.primarySpecId when explicit", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n\nNo prototyping.\n");
    await seedSpec(root, "0042", "# spec-0042\n\nAnother spec.\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig({ primarySpecId: "0042" }));
    expect(result).toEqual(
      expect.objectContaining({
        specId: "0042",
        source: "config",
      }),
    );
    expect(result?.specMdPath.endsWith(path.join("spec-0042", "01_Spec.md"))).toBe(true);
  });

  it("returns undefined when explicit primarySpecId references a missing spec", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig({ primarySpecId: "9999" }));
    expect(result).toBeUndefined();
  });

  it("falls back to marker scan when no explicit override is set", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n\nNon-prototyping content.\n");
    await seedSpec(
      root,
      "0012",
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0012\n\nPrototyping harness.\n",
    );
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result).toEqual(
      expect.objectContaining({
        specId: "0012",
        source: "marker-scan",
      }),
    );
  });

  it("matches title-based marker (heading containing 'prototyping')", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0007", "# Prototyping Harness Spec\n\nBody.\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result?.specId).toBe("0007");
    expect(result?.source).toBe("marker-scan");
  });

  it("picks the smallest spec ID among multiple marker matches", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0099", "---\nsurface_type: ui-bearing\n---\n\n# spec-0099\n");
    await seedSpec(root, "0012", "---\nsurface_type: ui-bearing\n---\n\n# spec-0012\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result?.specId).toBe("0012");
  });

  it("returns undefined when no spec has the marker", async () => {
    const root = await newTempDir();
    await seedSpec(root, "0001", "# spec-0001\n\nNo marker.\n");
    await seedSpec(root, "0002", "# spec-0002\n\nAlso no marker.\n");
    const result = await resolvePrimaryPrototypingSpec(root, makeConfig());
    expect(result).toBeUndefined();
  });
});

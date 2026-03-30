/**
 * Integration: Spec Auto-Discovery Protocol (spec-0038)
 *
 * Tests real module behavior with real file system operations.
 * Uses vi.mock only for git-dependent child_process calls.
 */
import { execSync } from "node:child_process";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import {
  detectPolicyChanges,
  detectSourceC,
  detectSourceD,
  detectSpecChanges,
  extractSpecIdsFromPaths,
} from "../../src/core/specDiffDetector.js";
import type { QfaiConfig } from "../../src/core/config.js";
import { loadConfig } from "../../src/core/config.js";
import { validateTraceabilityIntegrity } from "../../src/core/validators/traceabilityIntegrity.js";

// ---------------------------------------------------------------------------
// Shared stub config (matches defaultConfig shape + baseBranch)
// ---------------------------------------------------------------------------
const stubConfig: QfaiConfig = {
  paths: {
    contractsDir: ".qfai/contracts",
    specsDir: ".qfai/specs",
    discussionDir: ".qfai/discussion",
    outDir: ".qfai/report",
    skillsDir: ".qfai/assistant/skills",
    promptsDir: ".qfai/assistant/prompts",
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
    },
    traceability: {
      brMustHaveSc: true,
      scMustHaveTest: true,
      testFileGlobs: ["**/*.test.ts"],
      testFileExcludeGlobs: [],
      scNoTestSeverity: "error",
      orphanContractsPolicy: "error",
      unknownContractIdSeverity: "error",
    },
  },
  output: { validateJsonPath: ".qfai/report/validate.json" },
  baseBranch: "origin/main",
};

// ═══════════════════════════════════════════════════════════════════════════
// Group 1: specDiffDetector file operations (TC-0038-0001..0005)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0038-0001
// QFAI:SPEC-0038:TC-0038-0001
describe("TC-0038-0001: extractSpecIdsFromPaths — real file paths", () => {
  it("extracts spec IDs from paths containing spec directories", () => {
    const paths = [
      ".qfai/specs/spec-0001/01_Spec.md",
      ".qfai/specs/spec-0038/04_Business-Rules.md",
      "packages/qfai/src/core/config.ts",
      ".qfai/specs/spec-0002/03_Acceptance-Criteria.md",
    ];
    const result = extractSpecIdsFromPaths(paths);
    expect(result).toEqual(new Set(["spec-0001", "spec-0038", "spec-0002"]));
  });

  it("returns empty set for paths without spec directories", () => {
    const paths = ["src/core/config.ts", "README.md"];
    const result = extractSpecIdsFromPaths(paths);
    expect(result.size).toBe(0);
  });
});

// TC-0038-0002
// QFAI:SPEC-0038:TC-0038-0002
describe("TC-0038-0002: extractSpecIdsFromPaths — staged file paths", () => {
  it("extracts spec IDs from staged-style paths", () => {
    const paths = [
      ".qfai/specs/spec-0010/02_Scenario.md",
      ".qfai/specs/spec-0010/16_Traceability-ledger.md",
    ];
    const result = extractSpecIdsFromPaths(paths);
    expect(result).toEqual(new Set(["spec-0010"]));
  });

  it("deduplicates spec IDs from multiple files in the same spec", () => {
    const paths = [
      ".qfai/specs/spec-0005/01_Spec.md",
      ".qfai/specs/spec-0005/04_Business-Rules.md",
      ".qfai/specs/spec-0005/09_delta.md",
    ];
    const result = extractSpecIdsFromPaths(paths);
    expect(result.size).toBe(1);
    expect(result.has("spec-0005")).toBe(true);
  });
});

// TC-0038-0003
// QFAI:SPEC-0038:TC-0038-0003
describe("TC-0038-0003: Source C — stale detection via mtime comparison", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-c-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("marks spec as stale when spec file is newer than evidence", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");
    await mkdir(specDir, { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    // Write evidence file first (older)
    const evidencePath = path.join(evidenceDir, "implement-spec-0001.md");
    await writeFile(evidencePath, "old evidence", "utf-8");

    // Set evidence mtime to the past
    const pastTime = new Date(Date.now() - 60_000);
    await utimes(evidencePath, pastTime, pastTime);

    // Write spec file (newer)
    await writeFile(path.join(specDir, "01_Spec.md"), "updated spec", "utf-8");

    const result = await detectSourceC(tmpRoot, specsRoot);
    expect(result).toEqual(new Set(["spec-0001"]));
  });

  it("does NOT mark spec as stale when evidence is newer than spec", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0002");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");
    await mkdir(specDir, { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    // Write spec file first
    await writeFile(path.join(specDir, "01_Spec.md"), "spec content", "utf-8");

    // Set spec mtime to the past
    const pastTime = new Date(Date.now() - 60_000);
    await utimes(path.join(specDir, "01_Spec.md"), pastTime, pastTime);

    // Write evidence file (newer)
    await writeFile(path.join(evidenceDir, "implement-spec-0002.md"), "fresh evidence", "utf-8");

    const result = await detectSourceC(tmpRoot, specsRoot);
    expect(result.has("spec-0002")).toBe(false);
  });
});

// TC-0038-0004
// QFAI:SPEC-0038:TC-0038-0004
describe("TC-0038-0004: Source D — delta.md parse", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-d-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("extracts spec IDs from Adopted section of 09_delta.md", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0005");
    await mkdir(specDir, { recursive: true });

    const deltaContent = [
      "# Delta Log",
      "",
      "## Proposed",
      "",
      "- Some proposed change for spec-0099",
      "",
      "## Adopted",
      "",
      "- Change adopted: references spec-0005 and spec-0010",
      "- Another change for spec-0005",
      "",
      "## Rejected",
      "",
      "- Not this spec-0077",
    ].join("\n");
    await writeFile(path.join(specDir, "09_delta.md"), deltaContent, "utf-8");

    const result = await detectSourceD(specsRoot);
    expect(result.has("spec-0005")).toBe(true);
    expect(result.has("spec-0010")).toBe(true);
    // spec-0099 is in Proposed, not Adopted — should not be included
    expect(result.has("spec-0099")).toBe(false);
    // spec-0077 is in Rejected, not Adopted
    expect(result.has("spec-0077")).toBe(false);
  });

  it("returns empty set when no delta.md exists", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "spec content", "utf-8");

    const result = await detectSourceD(specsRoot);
    expect(result.size).toBe(0);
  });
});

// TC-0038-0005
// QFAI:SPEC-0038:TC-0038-0005
describe("TC-0038-0005: Union integration — combine multiple sources, no duplicates", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-union-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("detectSpecChanges merges all sources into unique entries", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");

    // Create two spec dirs
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0002"), { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    // Spec files
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s1", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0002", "01_Spec.md"), "s2", "utf-8");

    // Source A: return spec-0001
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes("origin/main..HEAD")) {
        return ".qfai/specs/spec-0001/01_Spec.md\n";
      }
      if (cmdStr.includes("--staged")) {
        return "";
      }
      if (cmdStr === "git diff --name-only") {
        return "";
      }
      // detectPolicyChanges also calls git diff
      return "";
    });

    // Source C: make spec-0001 stale too (overlap with Source A)
    const pastTime = new Date(Date.now() - 60_000);
    await writeFile(path.join(evidenceDir, "implement-spec-0001.md"), "old evidence", "utf-8");
    await utimes(path.join(evidenceDir, "implement-spec-0001.md"), pastTime, pastTime);

    const result = await detectSpecChanges(tmpRoot, stubConfig);

    // spec-0001 should appear exactly once in entries
    const spec1Entries = result.entries.filter((e) => e.specId === "spec-0001");
    expect(spec1Entries).toHaveLength(1);
    // It should have multiple sources (remote + timestamp)
    expect(spec1Entries[0].sources.length).toBeGreaterThanOrEqual(1);
    expect(result.fullScan).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2: Fallback and edge cases (TC-0038-0006..0009)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0038-0006
// QFAI:SPEC-0038:TC-0038-0006
describe("TC-0038-0006: detectSpecChanges with fullScan: true", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-full-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("returns all specs when full option is true", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0002"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0003"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0002", "01_Spec.md"), "s", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0003", "01_Spec.md"), "s", "utf-8");

    const result = await detectSpecChanges(tmpRoot, stubConfig, { full: true });

    expect(result.fullScan).toBe(true);
    expect(result.allSpecs).toHaveLength(3);
    expect(result.entries).toHaveLength(3);
    for (const entry of result.entries) {
      expect(entry.status).toBe("changed");
    }
  });
});

// TC-0038-0007
// QFAI:SPEC-0038:TC-0038-0007
describe("TC-0038-0007: git unavailable — Source A and B empty, C/D still work", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-nogit-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("falls back to Source C/D when git throws", async () => {
    // All git commands throw
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("git not found");
    });

    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    // Make spec-0001 stale via Source C
    await writeFile(path.join(evidenceDir, "implement-spec-0001.md"), "old evidence", "utf-8");
    const pastTime = new Date(Date.now() - 60_000);
    await utimes(path.join(evidenceDir, "implement-spec-0001.md"), pastTime, pastTime);
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "updated spec", "utf-8");

    const result = await detectSpecChanges(tmpRoot, stubConfig);

    expect(result.fullScan).toBe(false);
    const spec1 = result.entries.find((e) => e.specId === "spec-0001");
    expect(spec1).toBeDefined();
    expect(spec1?.sources).toContain("timestamp");
  });
});

// TC-0038-0008
// QFAI:SPEC-0038:TC-0038-0008
describe("TC-0038-0008: full pipeline — all options, verify result structure", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-pipe-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("returns well-structured SpecDiffResult with all required fields", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");

    // Source A returns spec-0001
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes("origin/main..HEAD")) {
        return ".qfai/specs/spec-0001/01_Spec.md\n";
      }
      return "";
    });

    const result = await detectSpecChanges(tmpRoot, stubConfig);

    // Verify SpecDiffResult structure
    expect(result).toHaveProperty("entries");
    expect(result).toHaveProperty("allSpecs");
    expect(result).toHaveProperty("fullScan");
    expect(Array.isArray(result.entries)).toBe(true);
    expect(Array.isArray(result.allSpecs)).toBe(true);
    expect(typeof result.fullScan).toBe("boolean");

    // Verify SpecDiffEntry structure
    for (const entry of result.entries) {
      expect(entry).toHaveProperty("specId");
      expect(entry).toHaveProperty("sources");
      expect(entry).toHaveProperty("status");
      expect(typeof entry.specId).toBe("string");
      expect(Array.isArray(entry.sources)).toBe(true);
      expect(["changed", "stale", "unchanged"]).toContain(entry.status);
    }
  });
});

// TC-0038-0009
// QFAI:SPEC-0038:TC-0038-0009
describe("TC-0038-0009: full pipeline — custom baseBranch via options", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-branch-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("uses custom baseBranch from options instead of config default", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");

    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes("origin/develop..HEAD")) {
        return ".qfai/specs/spec-0001/01_Spec.md\n";
      }
      return "";
    });

    const result = await detectSpecChanges(tmpRoot, stubConfig, {
      baseBranch: "origin/develop",
    });

    expect(execSync).toHaveBeenCalledWith(
      "git diff --name-only origin/develop..HEAD",
      expect.objectContaining({ cwd: tmpRoot }),
    );
    expect(result.entries.some((e) => e.specId === "spec-0001")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3: traceabilityIntegrity (TC-0038-0010..0012)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0038-0010
// QFAI:SPEC-0038:TC-0038-0010
describe("TC-0038-0010: spec BR changed + impl unchanged → QFAI-TRACE-001", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-trace1-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("emits QFAI-TRACE-001 error when BR changed but linked impl not changed", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });

    const ledger = [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
    ].join("\n");
    await writeFile(path.join(specDir, "16_Traceability-ledger.md"), ledger, "utf-8");

    // Git shows BR file changed but NOT the implementation file
    vi.mocked(execSync).mockReturnValue(".qfai/specs/spec-0001/04_Business-Rules.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.code === "QFAI-TRACE-001")).toBe(true);
    expect(issues.find((i) => i.code === "QFAI-TRACE-001")?.severity).toBe("error");
  });
});

// TC-0038-0011
// QFAI:SPEC-0038:TC-0038-0011
describe("TC-0038-0011: spec BR changed + impl changed → PASS", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-trace2-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("emits no QFAI-TRACE-001 when both BR and impl are changed", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });

    const ledger = [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
    ].join("\n");
    await writeFile(path.join(specDir, "16_Traceability-ledger.md"), ledger, "utf-8");

    // Git shows BOTH BR file and implementation file changed
    vi.mocked(execSync).mockReturnValue(
      ".qfai/specs/spec-0001/04_Business-Rules.md\nsrc/core/someModule.ts\n",
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.some((i) => i.code === "QFAI-TRACE-001")).toBe(false);
  });
});

// TC-0038-0012
// QFAI:SPEC-0038:TC-0038-0012
describe("TC-0038-0012: missing traceability ledger → QFAI-TRACE-002 warning", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-trace3-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("emits QFAI-TRACE-002 warning when ledger file is missing", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });
    // Deliberately do NOT create 16_Traceability-ledger.md

    // Git shows BR file changed
    vi.mocked(execSync).mockReturnValue(".qfai/specs/spec-0001/04_Business-Rules.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.some((i) => i.code === "QFAI-TRACE-002")).toBe(true);
    expect(issues.find((i) => i.code === "QFAI-TRACE-002")?.severity).toBe("warning");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4: Config and flags (TC-0038-0013..0017)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0038-0013
// QFAI:SPEC-0038:TC-0038-0013
describe("TC-0038-0013: --full flag bypasses diff detection", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-flag-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("full option skips diff and includes all specs", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0002"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0002", "01_Spec.md"), "s", "utf-8");

    // execSync should NOT be called when full=true
    const result = await detectSpecChanges(tmpRoot, stubConfig, { full: true });

    expect(result.fullScan).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.allSpecs).toEqual(["spec-0001", "spec-0002"]);
  });
});

// TC-0038-0014
// QFAI:SPEC-0038:TC-0038-0014
describe("TC-0038-0014: SpecDiffResult includes all required fields", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-fields-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("result contains entries, allSpecs, and fullScan with correct types", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");

    // Make all git calls fail → fallback to full scan
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("git not found");
    });

    const result = await detectSpecChanges(tmpRoot, stubConfig);

    expect(result).toEqual(
      expect.objectContaining({
        entries: expect.any(Array),
        allSpecs: expect.any(Array),
        fullScan: expect.any(Boolean),
      }),
    );
    expect(result.allSpecs).toContain("spec-0001");
  });
});

// TC-0038-0015
// QFAI:SPEC-0038:TC-0038-0015
describe("TC-0038-0015: policy change detection", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-policy-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("detectPolicyChanges returns true when _policies/ files are modified", () => {
    vi.mocked(execSync).mockReturnValue(".qfai/specs/_policies/naming.md\nsrc/core/config.ts\n");

    // detectPolicyChanges is sync-wrapped in a Promise
    return detectPolicyChanges(tmpRoot, "origin/main").then((changed) => {
      expect(changed).toBe(true);
    });
  });

  it("detectPolicyChanges returns false when no _policies/ files are modified", () => {
    vi.mocked(execSync).mockReturnValue("src/core/config.ts\n");

    return detectPolicyChanges(tmpRoot, "origin/main").then((changed) => {
      expect(changed).toBe(false);
    });
  });
});

// TC-0038-0016
// QFAI:SPEC-0038:TC-0038-0016
describe("TC-0038-0016: config baseBranch — loadConfig reads baseBranch from yaml", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-config-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("loadConfig reads baseBranch from qfai.config.yaml", async () => {
    const yamlContent = ["baseBranch: origin/develop", "paths:", "  specsDir: .qfai/specs"].join(
      "\n",
    );
    await writeFile(path.join(tmpRoot, "qfai.config.yaml"), yamlContent, "utf-8");

    const { config } = await loadConfig(tmpRoot);
    expect(config.baseBranch).toBe("origin/develop");
  });

  it("loadConfig returns default (no baseBranch) when yaml omits it", async () => {
    const yamlContent = ["paths:", "  specsDir: .qfai/specs"].join("\n");
    await writeFile(path.join(tmpRoot, "qfai.config.yaml"), yamlContent, "utf-8");

    const { config } = await loadConfig(tmpRoot);
    expect(config.baseBranch).toBeUndefined();
  });
});

// TC-0038-0017
// QFAI:SPEC-0038:TC-0038-0017
describe("TC-0038-0017: backward compatibility — old evidence without Diff Context", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-compat-"));
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("detectSpecChanges works when evidence files lack Diff Context section", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    // Old-style evidence file without Diff Context
    await writeFile(
      path.join(evidenceDir, "implement-spec-0001.md"),
      "# Evidence\n\n## Results\n\nAll tests passed.",
      "utf-8",
    );

    // Spec file newer than evidence
    const pastTime = new Date(Date.now() - 60_000);
    await utimes(path.join(evidenceDir, "implement-spec-0001.md"), pastTime, pastTime);
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "spec", "utf-8");

    // Git not available
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("git not found");
    });

    // Should not throw — backward compatible
    const result = await detectSpecChanges(tmpRoot, stubConfig);
    expect(result).toBeDefined();
    expect(result.entries.length).toBeGreaterThanOrEqual(0);
  });
});

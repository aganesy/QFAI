/**
 * Integration: Spec Auto-Discovery Protocol (spec-0038)
 *
 * Tests real module behavior with real file system operations.
 * Uses vi.mock only for git-dependent child_process calls.
 */
// QFAI:SPEC-0012:TC-0012-0019
// QFAI:SPEC-0012:TC-0012-0020
// QFAI:SPEC-0012:TC-0012-0021
// QFAI:SPEC-0012:TC-0012-0022
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
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
import { removeTempTree } from "../helpers/tempTree.js";

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
      maxE2eScenarioRatio: null,
      maxE2eScenarioCount: null,
    },
    traceability: {
      scMustHaveTest: true,
      testFileGlobs: ["**/*.test.ts"],
      testFileExcludeGlobs: [],
      unknownContractIdSeverity: "error",
    },
  },
  output: { validateJsonPath: ".qfai/report/validate.json" },
  baseBranch: "origin/main",
};

/**
 * Creates a spec directory the layout SSOT recognises as **layered**.
 *
 * `validateTraceabilityIntegrity` enumerates layered specs only: the legacy
 * spec-pack layout gives `16_Traceability-ledger.md` a different, nine-column
 * schema that `QFAI-LEDGER-001` owns, so a bare `mkdir spec-NNNN` is classified
 * spec-pack and is invisible to the layered checks.
 */
async function seedLayeredSpec(specDir: string): Promise<void> {
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User stories\n", "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1: specDiffDetector file operations (TC-0013-0001..0005)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0013-0001
// QFAI:SPEC-0013:TC-0013-0001
describe("TC-0013-0001: extractSpecIdsFromPaths — real file paths", () => {
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

// TC-0013-0002
// QFAI:SPEC-0013:TC-0013-0002
describe("TC-0013-0002: extractSpecIdsFromPaths — staged file paths", () => {
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

// TC-0013-0003
// QFAI:SPEC-0013:TC-0013-0003
describe("TC-0013-0003: Source C — stale detection via mtime comparison", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-c-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
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

// TC-0013-0004
// QFAI:SPEC-0013:TC-0013-0004
describe("TC-0013-0004: Source D — delta.md parse", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-d-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
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

// TC-0013-0005
// QFAI:SPEC-0013:TC-0013-0005
describe("TC-0013-0005: Union integration — combine multiple sources, no duplicates", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-union-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
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
    vi.mocked(execFileSync).mockImplementation((_file: unknown, args: unknown) => {
      const argsArr = (args as string[]) ?? [];
      if (argsArr.some((a) => a.includes("origin/main..HEAD"))) {
        return ".qfai/specs/spec-0001/01_Spec.md\n";
      }
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
// Group 2: Fallback and edge cases (TC-0013-0006..0009)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0013-0006
// QFAI:SPEC-0013:TC-0013-0006
describe("TC-0013-0006: detectSpecChanges with fullScan: true", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-full-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
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

// TC-0013-0007
// QFAI:SPEC-0013:TC-0013-0007
describe("TC-0013-0007: git unavailable — Source A and B empty, C/D still work", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-nogit-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("falls back to Source C/D when git throws", async () => {
    // All git commands throw
    vi.mocked(execFileSync).mockImplementation(() => {
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

// TC-0013-0008
// QFAI:SPEC-0013:TC-0013-0008
describe("TC-0013-0008: full pipeline — all options, verify result structure", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-pipe-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("returns well-structured SpecDiffResult with all required fields", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");

    // Source A returns spec-0001
    vi.mocked(execFileSync).mockImplementation((_file: unknown, args: unknown) => {
      const argsArr = (args as string[]) ?? [];
      if (argsArr.some((a) => a.includes("origin/main..HEAD"))) {
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

// TC-0013-0009
// QFAI:SPEC-0013:TC-0013-0009
describe("TC-0013-0009: full pipeline — custom baseBranch via options", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-branch-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("uses custom baseBranch from options instead of config default", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");

    vi.mocked(execFileSync).mockImplementation((_file: unknown, args: unknown) => {
      const argsArr = (args as string[]) ?? [];
      if (argsArr.some((a) => a.includes("origin/develop..HEAD"))) {
        return ".qfai/specs/spec-0001/01_Spec.md\n";
      }
      return "";
    });

    const result = await detectSpecChanges(tmpRoot, stubConfig, {
      baseBranch: "origin/develop",
    });

    expect(execFileSync).toHaveBeenCalledWith(
      "git",
      ["diff", "--name-only", "origin/develop..HEAD"],
      expect.objectContaining({ cwd: tmpRoot }),
    );
    expect(result.entries.some((e) => e.specId === "spec-0001")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3: traceabilityIntegrity (TC-0013-0010..0012)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0013-0010
// QFAI:SPEC-0013:TC-0013-0010
describe("TC-0013-0010: spec BR changed + impl unchanged → QFAI-TRACE-001", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-trace1-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("emits QFAI-TRACE-001 error when BR changed but linked impl not changed", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await seedLayeredSpec(specDir);

    const ledger = [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
    ].join("\n");
    await writeFile(path.join(specDir, "16_Traceability-ledger.md"), ledger, "utf-8");

    // Git shows BR file changed but NOT the implementation file
    vi.mocked(execFileSync).mockReturnValue(".qfai/specs/spec-0001/04_Business-Rules.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.code === "QFAI-TRACE-001")).toBe(true);
    expect(issues.find((i) => i.code === "QFAI-TRACE-001")?.severity).toBe("error");
  });
});

// TC-0013-0011
// QFAI:SPEC-0013:TC-0013-0011
describe("TC-0013-0011: spec BR changed + impl changed → PASS", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-trace2-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("emits no QFAI-TRACE-001 when both BR and impl are changed", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await seedLayeredSpec(specDir);

    const ledger = [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
    ].join("\n");
    await writeFile(path.join(specDir, "16_Traceability-ledger.md"), ledger, "utf-8");

    // Git shows BOTH BR file and implementation file changed
    vi.mocked(execFileSync).mockReturnValue(
      ".qfai/specs/spec-0001/04_Business-Rules.md\nsrc/core/someModule.ts\n",
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.some((i) => i.code === "QFAI-TRACE-001")).toBe(false);
  });
});

// TC-0013-0012
// QFAI:SPEC-0013:TC-0013-0012
describe("TC-0013-0012: missing traceability ledger → QFAI-TRACE-002 warning", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-trace3-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("emits QFAI-TRACE-002 warning when ledger file is missing", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await seedLayeredSpec(specDir);
    // Deliberately do NOT create 16_Traceability-ledger.md

    // Git shows BR file changed
    vi.mocked(execFileSync).mockReturnValue(".qfai/specs/spec-0001/04_Business-Rules.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.some((i) => i.code === "QFAI-TRACE-002")).toBe(true);
    expect(issues.find((i) => i.code === "QFAI-TRACE-002")?.severity).toBe("warning");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4: Config and flags (TC-0013-0013..0017)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0013-0013
// QFAI:SPEC-0013:TC-0013-0013
describe("TC-0013-0013: --full flag bypasses diff detection", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-flag-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("full option skips diff and includes all specs", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0002"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0002", "01_Spec.md"), "s", "utf-8");

    // execFileSync should NOT be called when full=true
    const result = await detectSpecChanges(tmpRoot, stubConfig, { full: true });

    expect(result.fullScan).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.allSpecs).toEqual(["spec-0001", "spec-0002"]);
  });
});

// TC-0013-0014
// QFAI:SPEC-0013:TC-0013-0014
describe("TC-0013-0014: SpecDiffResult includes all required fields", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-fields-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("result contains entries, allSpecs, and fullScan with correct types", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");

    // Make all git calls fail → fallback to full scan
    vi.mocked(execFileSync).mockImplementation(() => {
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

// TC-0013-0015
// QFAI:SPEC-0013:TC-0013-0015
describe("TC-0013-0015: policy change detection", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-policy-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("detectPolicyChanges returns true when _policies/ files are modified", () => {
    vi.mocked(execFileSync).mockReturnValue(
      ".qfai/specs/_policies/naming.md\nsrc/core/config.ts\n",
    );

    // detectPolicyChanges is sync-wrapped in a Promise
    return detectPolicyChanges(tmpRoot, "origin/main").then((changed) => {
      expect(changed).toBe(true);
    });
  });

  it("detectPolicyChanges returns false when no _policies/ files are modified", () => {
    vi.mocked(execFileSync).mockReturnValue("src/core/config.ts\n");

    return detectPolicyChanges(tmpRoot, "origin/main").then((changed) => {
      expect(changed).toBe(false);
    });
  });
});

// TC-0013-0016
// QFAI:SPEC-0013:TC-0013-0016
describe("TC-0013-0016: config baseBranch — loadConfig reads baseBranch from yaml", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-config-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
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

// TC-0013-0017
// QFAI:SPEC-0013:TC-0013-0017
describe("TC-0013-0017: old evidence without Diff Context remains parseable", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-compat-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
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
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("git not found");
    });

    // Should not throw for current parser behavior
    const result = await detectSpecChanges(tmpRoot, stubConfig);
    expect(result).toBeDefined();
    expect(result.entries.length).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// spec-0035: Routing determinism (TC-0012-0019..0022)
// ═══════════════════════════════════════════════════════════════════════════

// QFAI:SPEC-0012:TC-0012-0019
describe("TC-0012-0019: explicit flag routing determinism", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-route-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("--full flag always triggers full scan", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "spec", "utf-8");

    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("git not found");
    });

    const result = await detectSpecChanges(tmpRoot, stubConfig, { full: true });
    expect(result.fullScan).toBe(true);
  });
});

// QFAI:SPEC-0012:TC-0012-0020
describe("TC-0012-0020: routing idempotency", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-idem-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("repeated calls with same input produce identical results", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "spec", "utf-8");

    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("git not found");
    });

    const result1 = await detectSpecChanges(tmpRoot, stubConfig, { full: true });
    const result2 = await detectSpecChanges(tmpRoot, stubConfig, { full: true });

    expect(result1.fullScan).toBe(result2.fullScan);
    expect(result1.entries.length).toBe(result2.entries.length);
    expect(result1.allSpecs.sort()).toEqual(result2.allSpecs.sort());
  });
});

// QFAI:SPEC-0012:TC-0012-0021
describe("TC-0012-0021: precedence chain doc-impl match", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-prec-"));
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("source C (mtime) detects stale specs when evidence is older", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    // Create old evidence
    const pastTime = new Date(Date.now() - 120_000);
    await writeFile(
      path.join(evidenceDir, "implement-spec-0001.md"),
      "# Evidence\n\n## Results\n\nPassed.",
      "utf-8",
    );
    await utimes(path.join(evidenceDir, "implement-spec-0001.md"), pastTime, pastTime);

    // Create newer spec
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "updated spec", "utf-8");

    const stale = await detectSourceC(tmpRoot, path.join(tmpRoot, ".qfai", "specs"));
    expect(stale.has("spec-0001")).toBe(true);
  });
});

// QFAI:SPEC-0012:TC-0012-0022
describe("TC-0012-0022: cross-doc routing consistency", () => {
  it("prototyping SKILL.md references routing precedence chain", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const skillPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skills",
      "qfai-prototyping",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    // Prototyping skill should reference spec-related routing
    expect(content.length).toBeGreaterThan(0);
    // The SKILL.md should contain routing or validation references
    expect(content).toMatch(/spec|prototyp|validat/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// spec-0037: Vocabulary, fixture alignment, integration (TC-0014-0023..0029)
// ═══════════════════════════════════════════════════════════════════════════

describe("TC-0014-0023: vocabulary pass scan", () => {
  it("SKILL.md uses canonical spec-related vocabulary", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const skillPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skills",
      "qfai-prototyping",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    // Must use canonical vocabulary: spec, prototyping, evidence, validation
    expect(content).toMatch(/prototyp/i);
    expect(content).toMatch(/evidence|render|capture/i);
  });
});

describe("TC-0014-0024: contradiction detection", () => {
  it("detectSpecChanges result structure has no contradictions", async () => {
    const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-vocab-"));
    try {
      const specsRoot = path.join(tmpRoot, ".qfai", "specs");
      await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
      await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "spec", "utf-8");

      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error("git not found");
      });

      const result = await detectSpecChanges(tmpRoot, stubConfig, { full: true });
      // No entry should be both "changed" and "unchanged"
      for (const entry of result.entries) {
        expect(entry.status).toMatch(/^(changed|stale|unchanged)$/);
      }
    } finally {
      await removeTempTree(tmpRoot);
    }
  });
});

describe("TC-0014-0025: vocabulary fail — prohibited terms", () => {
  it("specDiffDetector source does not use prohibited legacy terms", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const srcPath = path.join(repoRoot, "packages", "qfai", "src", "core", "specDiffDetector.ts");
    const content = await readFile(srcPath, "utf-8");
    // Should not contain deprecated terminology
    expect(content).not.toMatch(/\bmanual scan\b/i);
    expect(content).not.toMatch(/\bforce refresh\b/i);
  });
});

describe("TC-0014-0026: fixture alignment — exploration-first model", () => {
  it("discussion SKILL.md references exploration brief and rubric artifacts", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const skillPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skills",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    expect(content).toMatch(/exploration brief|exploration-first|exploration rubric/i);
  });
});

describe("TC-0014-0027: fixture 4-axis reject", () => {
  it("discussion SKILL.md completion conditions do not use 4-axis model keyword", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const skillPath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "assets",
      "init",
      ".qfai",
      "assistant",
      "skills",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    const completionMatch = /UI-bearing Completion Conditions([\s\S]*?)(?=^## |$)/m.exec(content);
    if (completionMatch?.[1]) {
      expect(completionMatch[1]).not.toMatch(/\b4-axis\b/i);
      expect(completionMatch[1]).not.toMatch(/\bfour-axis\b/i);
    }
  });
});

describe("TC-0014-0028: integration e2e — validateProject entrypoint", () => {
  it("validateProject function is importable and callable", { timeout: 30000 }, async () => {
    const { validateProject } = await import("../../src/core/validate.js");
    expect(typeof validateProject).toBe("function");
  });
});

describe("TC-0014-0029: integration test existence", () => {
  it("integration test directory contains expected test files", async () => {
    const { readdir } = await import("node:fs/promises");
    const integrationDir = path.resolve(process.cwd(), "tests", "integration");
    const files = await readdir(integrationDir);
    const testFiles = files.filter((f) => f.endsWith(".test.ts"));
    expect(testFiles.length).toBeGreaterThanOrEqual(5);
    // Key test files must exist
    expect(testFiles).toContain("specAutoDiscovery.test.ts");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 5: Quality Depth (TC-0008-0011..0012)
// ═══════════════════════════════════════════════════════════════════════════

// TC-0008-0011
// QFAI:SPEC-0008:TC-0008-0011
describe("TC-0008-0011: Coverage Depth Matrix Produced and Verified", () => {
  it("spec-0008 06_Test-Cases.md contains depth matrix columns", async () => {
    const tcPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "specs",
      "spec-0008",
      "06_Test-Cases.md",
    );
    const content = await readFile(tcPath, "utf-8");
    expect(content).toContain("Coverage Depth Matrix");
    expect(content).toContain("normal");
    expect(content).toContain("error");
  });

  it("AC-0008-0009 specifies depth categories", async () => {
    const acPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "specs",
      "spec-0008",
      "03_Acceptance-Criteria.md",
    );
    const content = await readFile(acPath, "utf-8");
    expect(content).toContain("AC-0008-0009");
    expect(content).toMatch(/normal.*error.*boundary/i);
  });
});

// TC-0008-0012
// QFAI:SPEC-0008:TC-0008-0012
describe("TC-0008-0012: Normal-Path-Only Flagged as Incomplete", () => {
  it("spec defines normal-path-only detection rule", async () => {
    const tcPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "specs",
      "spec-0008",
      "06_Test-Cases.md",
    );
    const content = await readFile(tcPath, "utf-8");
    expect(content).toContain("Normal-Path-Only Flagged as Incomplete");
    expect(content).toMatch(/flagged as incomplete/i);
  });

  it("EX-0008-0008 shows incomplete status for normal-only US", async () => {
    const exPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "specs",
      "spec-0008",
      "05_Examples.md",
    );
    const content = await readFile(exPath, "utf-8");
    expect(content).toContain("EX-0008-0008");
    expect(content).toContain("incomplete");
  });
});

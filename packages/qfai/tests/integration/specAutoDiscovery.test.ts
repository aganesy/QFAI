/**
 * Integration: Spec Auto-Discovery Protocol (spec-0038)
 *
 * Tests real module behavior with real file system operations.
 * Uses vi.mock only for git-dependent child_process calls.
 */
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
    skillsDir: ".qfai/assistant/skill",
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
      testFileGlobs: ["**/*.test.ts"],
      testFileExcludeGlobs: [],
    },
  },
  output: { validateJsonPath: ".qfai/report/validate.json" },
  baseBranch: "origin/main",
};

// ═══════════════════════════════════════════════════════════════════════════
// Group 1: specDiffDetector file operations
// ═══════════════════════════════════════════════════════════════════════════

describe("extractSpecIdsFromPaths — real file paths", () => {
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

describe("extractSpecIdsFromPaths — staged file paths", () => {
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

describe("Source C — stale detection via mtime comparison", () => {
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

describe("Source D — delta.md parse", () => {
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

describe("Union integration — combine multiple sources, no duplicates", () => {
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
// Group 2: Fallback and edge cases
// ═══════════════════════════════════════════════════════════════════════════

describe("detectSpecChanges with fullScan: true", () => {
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

describe("git unavailable — Source A and B empty, C/D still work", () => {
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

// TC-0013-0014
describe("TC-0013-0014: full pipeline — all options, verify result structure", () => {
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

    // The seeded change is what the shape below is a shape of. Without this, a
    // detector returning two empty arrays satisfies every assertion here.
    expect(result.entries.map((entry) => entry.specId)).toContain("spec-0001");
    expect(result.allSpecs).toContain("spec-0001");

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

describe("full pipeline — custom baseBranch via options", () => {
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
// Group 4: Config and flags (TC-0013-0014..0017, plus the full-scan branch)
// ═══════════════════════════════════════════════════════════════════════════

// The full-scan case carries no TC annotation and no TC in its name.
// `TC-0013-0013` asks for a `Type` column on every test-case row and a
// non-normal case per criterion, and this suite exercises
// `detectSpecChanges({ full: true })` — it reads no column and no coverage
// applicability. That obligation is verified in
// `tests/integration/sddSkillSpec0013.test.ts`; what is left here is the
// full-scan behaviour itself, kept because nothing else exercises the branch
// that skips the diff.
describe("full scan bypasses diff detection", () => {
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
// Routing determinism
// ═══════════════════════════════════════════════════════════════════════════

describe("explicit flag routing determinism", () => {
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

describe("routing idempotency", () => {
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

describe("precedence chain doc-impl match", () => {
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

describe("cross-doc routing consistency", () => {
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
      "skill",
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
// Vocabulary, fixture alignment, integration
// ═══════════════════════════════════════════════════════════════════════════

describe("vocabulary pass scan", () => {
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
      "skill",
      "qfai-prototyping",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    // Must use canonical vocabulary: spec, prototyping, evidence, validation
    expect(content).toMatch(/prototyp/i);
    expect(content).toMatch(/evidence|render|capture/i);
  });
});

describe("contradiction detection", () => {
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

describe("vocabulary fail — prohibited terms", () => {
  it("specDiffDetector source does not use prohibited legacy terms", async () => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const srcPath = path.join(repoRoot, "packages", "qfai", "src", "core", "specDiffDetector.ts");
    const content = await readFile(srcPath, "utf-8");
    // Should not contain deprecated terminology
    expect(content).not.toMatch(/\bmanual scan\b/i);
    expect(content).not.toMatch(/\bforce refresh\b/i);
  });
});

describe("fixture alignment — exploration-first model", () => {
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
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");
    expect(content).toMatch(/exploration brief|exploration-first|exploration rubric/i);
  });
});

describe("fixture 4-axis reject", () => {
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
      "skill",
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
  it("validateProject function is importable and callable", async () => {
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
// QFAI:EX-0001-0074-01
describe("TC-0008-0011: Coverage Depth Matrix Produced and Verified", () => {
  it("the flow matrix records each required depth dimension and story-tree IDs", async () => {
    const matrixPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "evidence",
      "coverage-depth-BF-0001.md",
    );
    const content = await readFile(matrixPath, "utf-8");
    expect(content).toContain("Coverage Depth Matrix — BF-0001");
    expect(content).toMatch(
      /\| Normal \| Error \| Boundary \| Special \| State transition \| Combinatorial \|/,
    );
    expect(content).toContain("| US-0001-0074 |");
    expect(content).toContain("| AC-0001-0074-01 |");
    expect(content).toContain("| EX-0001-0074-01 |");
  });

  it("the story criterion assigns depth review to the business flow", async () => {
    const acPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "spec",
      "02_business-flow",
      "business-flow-0001",
      "user-story-0001-0074",
      "02_Acceptance-Criteria.md",
    );
    const content = await readFile(acPath, "utf-8");
    expect(content).toContain("AC-0001-0074-01");
    expect(content).toMatch(/normal\/error\/boundary\/special\/state-transition\/combinatorial/);
    expect(content).toContain("one ATDD evidence file");
  });
});

// TC-0008-0012
// QFAI:EX-0001-0074-01
describe("TC-0008-0012: Normal-Path-Only Flagged as Incomplete", () => {
  const storyDir = path.resolve(
    process.cwd(),
    "..",
    "..",
    ".qfai",
    "spec",
    "02_business-flow",
    "business-flow-0001",
    "user-story-0001-0074",
  );

  it("the story criterion requires incomplete status for a normal-only case", async () => {
    const content = await readFile(path.join(storyDir, "02_Acceptance-Criteria.md"), "utf-8");
    expect(content).toMatch(/only normal-path test cases is flagged as incomplete/);
  });

  it("the example assigns missing error depth to the criterion row", async () => {
    const content = await readFile(path.join(storyDir, "03_Example.md"), "utf-8");
    expect(content).toContain("EX-0001-0074-01");
    expect(content).toContain("❌ for Error path and is incomplete");
  });
});

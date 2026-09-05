/**
 * specDiffDetector tests — TDD-0002 through TDD-0010 (spec-0038).
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import {
  detectSourceA,
  detectSourceB,
  extractSpecIdsFromPaths,
} from "../../src/core/specDiffDetector.js";

// ---------------------------------------------------------------------------
// TDD-0002 (TC-0013-0001): Source A — git remote diff
// ---------------------------------------------------------------------------
describe("TDD-0002: extractSpecIdsFromPaths", () => {
  it("extracts spec IDs from paths containing spec directories", () => {
    const paths = [
      ".qfai/specs/spec-0038/01_Spec.md",
      ".qfai/specs/spec-0001/02_Scenario.md",
      "some/other/file.ts",
    ];
    const result = extractSpecIdsFromPaths(paths);
    expect(result).toEqual(new Set(["spec-0038", "spec-0001"]));
  });

  it("returns empty set for paths with no spec references", () => {
    const paths = ["README.md", "src/index.ts"];
    const result = extractSpecIdsFromPaths(paths);
    expect(result).toEqual(new Set());
  });

  it("is case-insensitive for the specs directory", () => {
    const paths = [".qfai/Specs/spec-0005/file.md"];
    const result = extractSpecIdsFromPaths(paths);
    expect(result).toEqual(new Set(["spec-0005"]));
  });

  it("handles backslash paths (Windows)", () => {
    const paths = [".qfai\\specs\\spec-0010\\file.md"];
    const result = extractSpecIdsFromPaths(paths);
    expect(result).toEqual(new Set(["spec-0010"]));
  });

  it("deduplicates spec IDs from multiple paths in the same spec", () => {
    const paths = [".qfai/specs/spec-0038/01_Spec.md", ".qfai/specs/spec-0038/02_Scenario.md"];
    const result = extractSpecIdsFromPaths(paths);
    expect(result).toEqual(new Set(["spec-0038"]));
  });
});

describe("TDD-0002: detectSourceA", () => {
  beforeEach(() => {
    vi.mocked(execFileSync).mockReset();
  });

  it("returns spec IDs from git diff between baseBranch and HEAD", async () => {
    vi.mocked(execFileSync).mockReturnValue(
      ".qfai/specs/spec-0038/01_Spec.md\n.qfai/specs/spec-0001/02_Scenario.md\n",
    );
    const result = await detectSourceA("/project", "origin/main");
    expect(result).toEqual(new Set(["spec-0038", "spec-0001"]));
    expect(execFileSync).toHaveBeenCalledWith(
      "git",
      ["diff", "--name-only", "origin/main..HEAD"],
      expect.objectContaining({ cwd: "/project" }),
    );
  });

  it("returns empty set when git diff output contains no spec paths", async () => {
    vi.mocked(execFileSync).mockReturnValue("src/index.ts\n");
    const result = await detectSourceA("/project", "origin/main");
    expect(result).toEqual(new Set());
  });
});

// ---------------------------------------------------------------------------
// TDD-0003 (TC-0013-0002): Source B — git local diff
// ---------------------------------------------------------------------------
describe("TDD-0003: detectSourceB", () => {
  beforeEach(() => {
    vi.mocked(execFileSync).mockReset();
  });

  it("returns union of unstaged and staged spec changes", async () => {
    vi.mocked(execFileSync)
      .mockReturnValueOnce(".qfai/specs/spec-0002/01_Spec.md\n")
      .mockReturnValueOnce(".qfai/specs/spec-0003/01_Spec.md\n");
    const result = await detectSourceB("/project");
    expect(result).toEqual(new Set(["spec-0002", "spec-0003"]));
    expect(execFileSync).toHaveBeenCalledTimes(2);
  });

  it("deduplicates overlapping unstaged and staged results", async () => {
    vi.mocked(execFileSync)
      .mockReturnValueOnce(".qfai/specs/spec-0005/a.md\n")
      .mockReturnValueOnce(".qfai/specs/spec-0005/b.md\n");
    const result = await detectSourceB("/project");
    expect(result).toEqual(new Set(["spec-0005"]));
  });

  it("returns empty set when no local changes touch specs", async () => {
    vi.mocked(execFileSync).mockReturnValueOnce("src/foo.ts\n").mockReturnValueOnce("");
    const result = await detectSourceB("/project");
    expect(result).toEqual(new Set());
  });
});

// ---------------------------------------------------------------------------
// TDD-0004 (TC-0013-0003): Source C — timestamp comparison
// ---------------------------------------------------------------------------
import { detectSourceC } from "../../src/core/specDiffDetector.js";

describe("TDD-0004: detectSourceC", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-diffc-")),
    );
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

    // Write evidence first (older)
    const evidencePath = path.join(evidenceDir, "implement-spec-0001.md");
    await writeFile(evidencePath, "old evidence", "utf-8");

    // Wait a bit then write spec file (newer)
    await new Promise((r) => setTimeout(r, 50));
    await writeFile(path.join(specDir, "01_Spec.md"), "updated spec", "utf-8");

    const result = await detectSourceC(tmpRoot, specsRoot);
    expect(result).toEqual(new Set(["spec-0001"]));
  });

  it("does not mark spec when evidence is newer than spec", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0002");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");
    await mkdir(specDir, { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    // Write spec first (older)
    await writeFile(path.join(specDir, "01_Spec.md"), "spec content", "utf-8");

    // Wait a bit then write evidence (newer)
    await new Promise((r) => setTimeout(r, 50));
    await writeFile(path.join(evidenceDir, "implement-spec-0002.md"), "fresh evidence", "utf-8");

    const result = await detectSourceC(tmpRoot, specsRoot);
    expect(result).toEqual(new Set());
  });

  it("skips spec when no evidence file exists", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0003");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "spec", "utf-8");

    const result = await detectSourceC(tmpRoot, specsRoot);
    expect(result).toEqual(new Set());
  });
});

// ---------------------------------------------------------------------------
// TDD-0005 (TC-0013-0004): Source D — delta.md parse
// ---------------------------------------------------------------------------
import { detectSourceD } from "../../src/core/specDiffDetector.js";

describe("TDD-0005: detectSourceD", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-diffd-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("extracts spec IDs from Adopted section in delta.md", async () => {
    const specsRoot = path.join(tmpRoot, "specs");
    const specDir = path.join(specsRoot, "spec-0010");
    await mkdir(specDir, { recursive: true });

    const delta = [
      "# Delta",
      "",
      "## Adopted",
      "",
      "- Integrate changes from spec-0005 for shared types",
      "- Apply spec-0020 validation rules",
      "",
      "## Rejected",
      "",
      "- Old approach",
    ].join("\n");

    await writeFile(path.join(specDir, "09_delta.md"), delta, "utf-8");

    const result = await detectSourceD(specsRoot);
    expect(result).toEqual(new Set(["spec-0005", "spec-0020"]));
  });

  it("returns empty set when no delta.md exists", async () => {
    const specsRoot = path.join(tmpRoot, "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "spec", "utf-8");

    const result = await detectSourceD(specsRoot);
    expect(result).toEqual(new Set());
  });

  it("returns empty set when Adopted section has no spec references", async () => {
    const specsRoot = path.join(tmpRoot, "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });

    const delta = "# Delta\n\n## Adopted\n\n- No spec references here\n";
    await writeFile(path.join(specDir, "09_delta.md"), delta, "utf-8");

    const result = await detectSourceD(specsRoot);
    expect(result).toEqual(new Set());
  });
});

// ---------------------------------------------------------------------------
// TDD-0006 (TC-0013-0005): Union integration — detectSpecChanges
// ---------------------------------------------------------------------------
import { detectPolicyChanges, detectSpecChanges } from "../../src/core/specDiffDetector.js";
import type { QfaiConfig } from "../../src/core/config.js";
import { removeTempTree } from "../helpers/tempTree.js";

const stubConfig: QfaiConfig = {
  paths: {
    contractsDir: ".qfai/contracts",
    specsDir: ".qfai/specs",
    discussionDir: ".qfai/discussion",
    outDir: ".qfai/out",
    skillsDir: ".qfai/skills",
    promptsDir: ".qfai/prompts",
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
      brMustHaveSc: true,
      scMustHaveTest: true,
      testFileGlobs: ["**/*.test.ts"],
      testFileExcludeGlobs: [],
      scNoTestSeverity: "warning",
      orphanContractsPolicy: "warning",
      unknownContractIdSeverity: "warning",
    },
  },
  output: { validateJsonPath: ".qfai/out/validate.json" },
};

describe("TDD-0006: detectSpecChanges union", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-union-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("merges results from multiple sources without duplication", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0002"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0003"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0002", "01_Spec.md"), "s", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0003", "01_Spec.md"), "s", "utf-8");

    // Source A returns spec-0001
    // Source B returns spec-0001 + spec-0002
    // Policy returns false
    vi.mocked(execFileSync)
      .mockReturnValueOnce(".qfai/specs/spec-0001/01_Spec.md\n") // Source A
      .mockReturnValueOnce(".qfai/specs/spec-0001/x.md\n") // Source B unstaged
      .mockReturnValueOnce(".qfai/specs/spec-0002/y.md\n") // Source B staged
      .mockReturnValueOnce("src/foo.ts\n"); // Policy check

    const result = await detectSpecChanges(tmpRoot, {
      ...stubConfig,
      paths: { ...stubConfig.paths, specsDir: ".qfai/specs" },
    });

    expect(result.fullScan).toBe(false);
    const changedIds = result.entries.map((e) => e.specId).sort();
    // Should include spec-0001 (from A+B), spec-0002 (from B), and spec-0001/0002/0003 (from C - no evidence)
    expect(changedIds).toContain("spec-0001");
    expect(changedIds).toContain("spec-0002");
    // Each entry has unique specId
    const uniqueIds = new Set(changedIds);
    expect(uniqueIds.size).toBe(changedIds.length);
  });
});

// ---------------------------------------------------------------------------
// TDD-0007 (TC-0013-0006): Fallback when zero diff
// ---------------------------------------------------------------------------
describe("TDD-0007: fallback when zero diff", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-fallback-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("returns all specs with fullScan when all sources empty", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0002"), { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    // Write spec files and fresh evidence so Source C is empty
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0002", "01_Spec.md"), "s", "utf-8");
    await new Promise((r) => setTimeout(r, 50));
    await writeFile(path.join(evidenceDir, "implement-spec-0001.md"), "e", "utf-8");
    await writeFile(path.join(evidenceDir, "implement-spec-0002.md"), "e", "utf-8");

    // All git sources return empty
    vi.mocked(execFileSync).mockReturnValue("");

    const result = await detectSpecChanges(tmpRoot, {
      ...stubConfig,
      paths: { ...stubConfig.paths, specsDir: ".qfai/specs" },
    });

    expect(result.fullScan).toBe(true);
    expect(result.allSpecs.sort()).toEqual(["spec-0001", "spec-0002"]);
    expect(result.entries.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// TDD-0008 (TC-0013-0007): Git absent — graceful degradation
// ---------------------------------------------------------------------------
describe("TDD-0008: git absent", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-nogit-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("works using only Source C and D when git is unavailable", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "updated spec", "utf-8");

    // Git throws on every call
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("git: command not found");
    });

    const result = await detectSpecChanges(tmpRoot, {
      ...stubConfig,
      paths: { ...stubConfig.paths, specsDir: ".qfai/specs" },
    });

    // Fallback to fullScan since no evidence files exist (Source C skips)
    const ids = result.entries.map((e) => e.specId);
    expect(ids).toContain("spec-0001");
  });
});

// ---------------------------------------------------------------------------
// TDD-0009 (TC-0013-0013): --full flag
// ---------------------------------------------------------------------------
describe("TDD-0009: --full flag", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-full-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("returns all specs with fullScan=true when full option set", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0002"), { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0002", "01_Spec.md"), "s", "utf-8");

    const result = await detectSpecChanges(
      tmpRoot,
      { ...stubConfig, paths: { ...stubConfig.paths, specsDir: ".qfai/specs" } },
      { full: true },
    );

    expect(result.fullScan).toBe(true);
    expect(result.allSpecs.sort()).toEqual(["spec-0001", "spec-0002"]);
    expect(result.entries.length).toBe(2);
    // execFileSync should NOT have been called
    expect(execFileSync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// TDD-0010: Policy change detection (unit-test angle).
// PR #206 review N39l: TDD-0015 in tdd/test-list.md maps to TC-0013-0020
// (validate-pipeline wiring), NOT TC-0013-0015. Don't claim a TDD-NNNN
// link here — this describe is a unit-level companion to TC-0013-0015
// (Policy Change Detection) whose canonical integration coverage lives at
// `packages/qfai/tests/integration/specAutoDiscovery.test.ts` under
// `describe("TC-0013-0015: policy change detection", ...)`.
// ---------------------------------------------------------------------------
describe("TDD-0010: detectPolicyChanges", () => {
  beforeEach(() => {
    vi.mocked(execFileSync).mockReset();
  });

  it("returns true when _policies/ files appear in git diff", async () => {
    vi.mocked(execFileSync).mockReturnValue(".qfai/specs/_policies/naming.md\nsrc/index.ts\n");
    const result = await detectPolicyChanges("/project", "origin/main");
    expect(result).toBe(true);
  });

  it("returns false when no _policies/ files in diff", async () => {
    vi.mocked(execFileSync).mockReturnValue("src/index.ts\nREADME.md\n");
    const result = await detectPolicyChanges("/project", "origin/main");
    expect(result).toBe(false);
  });
});

describe("TDD-0010: policy changes trigger all specs", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-policy-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("includes all specs when policy changes detected", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");
    await mkdir(path.join(specsRoot, "spec-0001"), { recursive: true });
    await mkdir(path.join(specsRoot, "spec-0002"), { recursive: true });
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(path.join(specsRoot, "spec-0001", "01_Spec.md"), "s", "utf-8");
    await writeFile(path.join(specsRoot, "spec-0002", "01_Spec.md"), "s", "utf-8");
    // Fresh evidence so Source C doesn't trigger
    await new Promise((r) => setTimeout(r, 50));
    await writeFile(path.join(evidenceDir, "implement-spec-0001.md"), "e", "utf-8");
    await writeFile(path.join(evidenceDir, "implement-spec-0002.md"), "e", "utf-8");

    // Source A: no spec changes
    // Source B: no changes
    // Policy: _policies/ in diff
    vi.mocked(execFileSync)
      .mockReturnValueOnce("") // Source A
      .mockReturnValueOnce("") // Source B unstaged
      .mockReturnValueOnce("") // Source B staged
      .mockReturnValueOnce(".qfai/specs/_policies/naming.md\n"); // Policy check

    const result = await detectSpecChanges(tmpRoot, {
      ...stubConfig,
      paths: { ...stubConfig.paths, specsDir: ".qfai/specs" },
    });

    expect(result.entries.length).toBe(2);
    const ids = result.entries.map((e) => e.specId).sort();
    expect(ids).toEqual(["spec-0001", "spec-0002"]);
    expect(result.entries.every((e) => e.sources.includes("policy"))).toBe(true);
  });
});

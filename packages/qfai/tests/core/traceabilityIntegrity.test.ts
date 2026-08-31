/**
 * traceabilityIntegrity tests — TDD-0011 through TDD-0015 (spec-0038).
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import { validateTraceabilityIntegrity } from "../../src/core/validators/traceabilityIntegrity.js";
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
      scNoTestSeverity: "warning",
      orphanContractsPolicy: "warning",
      unknownContractIdSeverity: "warning",
    },
  },
  output: { validateJsonPath: ".qfai/out/validate.json" },
  baseBranch: "origin/main",
};

// ---------------------------------------------------------------------------
// TDD-0011 (TC-0013-0010): Spec BR changed + impl unchanged → QFAI-TRACE-001
// ---------------------------------------------------------------------------
describe("TDD-0011: spec BR changed + impl unchanged", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-trace-int-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("emits QFAI-TRACE-001 when spec BR changed but linked impl not changed", async () => {
    // Set up spec directory with traceability ledger
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

    // Git diff shows BR file changed but NOT the implementation file
    vi.mocked(execFileSync).mockReturnValue(".qfai/specs/spec-0001/04_Business-Rules.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.code === "QFAI-TRACE-001")).toBe(true);
    expect(issues.find((i) => i.code === "QFAI-TRACE-001")?.severity).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// TDD-0012 (TC-0013-0011): Spec BR changed + impl changed → PASS
// ---------------------------------------------------------------------------
describe("TDD-0012: spec BR changed + impl changed", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-trace-int-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("returns no issues when spec BR changed and linked impl also changed", async () => {
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

    // Git diff shows BOTH the spec BR file AND the implementation file changed
    vi.mocked(execFileSync).mockReturnValue(
      ".qfai/specs/spec-0001/04_Business-Rules.md\nsrc/core/someModule.ts\n",
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The shipped template promises "the first Markdown table in this file is the
// one the validator reads". The reader used to scan every `|` line in the
// document, so a supplementary table whose first cell looked like a BR/AC ID
// produced a false QFAI-TRACE-001 against whatever its second cell held.
// ---------------------------------------------------------------------------
describe("ledger reads only the first Markdown table", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-trace-int-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("ignores BR/AC-shaped rows in a supplementary table below the ledger", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });

    const ledger = [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
      "",
      "## Historical mapping (documentation only)",
      "",
      "| BR/AC | Superseded by | Notes |",
      "| --- | --- | --- |",
      "| AC-0001-0009 | src/core/retiredModule.ts | moved in v1.2 |",
    ].join("\n");
    await writeFile(path.join(specDir, "16_Traceability-ledger.md"), ledger, "utf-8");

    // The real linked implementation changed; the retired path did not.
    vi.mocked(execFileSync).mockReturnValue(
      ".qfai/specs/spec-0001/04_Business-Rules.md\nsrc/core/someModule.ts\n",
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toEqual([]);
  });

  it("still reports the first table's unchanged implementation files", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });

    const ledger = [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
      "",
      "| BR/AC | Superseded by | Notes |",
      "| --- | --- | --- |",
      "| AC-0001-0009 | src/core/retiredModule.ts | moved in v1.2 |",
    ].join("\n");
    await writeFile(path.join(specDir, "16_Traceability-ledger.md"), ledger, "utf-8");

    vi.mocked(execFileSync).mockReturnValue(".qfai/specs/spec-0001/04_Business-Rules.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    const trace001 = issues.filter((entry) => entry.code === "QFAI-TRACE-001");
    expect(trace001).toHaveLength(1);
    expect(trace001[0]?.file).toBe("src/core/someModule.ts");
  });
});

// ---------------------------------------------------------------------------
// TDD-0013 (TC-0013-0012): Ledger absent → warning + skip
// ---------------------------------------------------------------------------
describe("TDD-0013: ledger absent", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-trace-int-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("emits warning and skips when 16_Traceability-ledger.md is missing", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });
    // No ledger file created

    vi.mocked(execFileSync).mockReturnValue(".qfai/specs/spec-0001/04_Business-Rules.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.length).toBe(1);
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.code).toBe("QFAI-TRACE-002");
    // Should NOT have QFAI-TRACE-001 errors
    expect(issues.some((i) => i.code === "QFAI-TRACE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TDD-0014 → TC-0013-0021 (Type=boundary): the SUT here is
// `validateTraceabilityIntegrity` (a validator), not `detectSpecChanges`,
// so the spec-0038 forward-compat TC (TC-0013-0017, auto-discovery) is
// the WRONG anchor — that lives in specAutoDiscovery.test.ts:699. This
// describe exercises the traceability validator's forward-compat
// boundary against old evidence files. (PR #206 review N32O / N34p / N35m)
// QFAI:SPEC-0013:TC-0013-0021
// ---------------------------------------------------------------------------
describe("TDD-0014: evidence without Diff Context", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-trace-int-")),
    );
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("does not error when evidence file exists but lacks Diff Context section", async () => {
    const specsRoot = path.join(tmpRoot, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    const evidenceDir = path.join(tmpRoot, ".qfai", "evidence");
    await mkdir(specDir, { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    // Write an evidence file WITHOUT a Diff Context section
    const evidence = [
      "# Evidence: spec-0001",
      "",
      "## Summary",
      "Implementation complete.",
      "",
      "## Files Changed",
      "- src/core/someModule.ts",
    ].join("\n");
    await writeFile(path.join(evidenceDir, "implement-spec-0001.md"), evidence, "utf-8");

    // Ledger exists and links to impl file that IS in the diff
    const ledger = [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
    ].join("\n");
    await writeFile(path.join(specDir, "16_Traceability-ledger.md"), ledger, "utf-8");

    // Both spec and impl in diff
    vi.mocked(execFileSync).mockReturnValue(
      ".qfai/specs/spec-0001/04_Business-Rules.md\nsrc/core/someModule.ts\n",
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    // No errors — the validator doesn't require Diff Context to exist
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// TDD-0015 → TC-0013-0020 (Type=normal): the SUT here is the structural
// wiring between `validate.ts` and `validators/index` for
// `validateTraceabilityIntegrity` — NOT the SpecDiffResult shape (which
// is TC-0013-0014, exercised by specAutoDiscovery.test.ts:596). This
// guards the validator-registration wiring under AC-0013-0014 (Validate
// Pipeline Validator Registration Integrity) / BR-0013-0011 (Validator
// Registry Wiring); AC-0013-0007 (Validate Gate error=0) remains the
// behavioral post-condition whose forward-compat boundary is covered by
// TC-0013-0021. (PR #206 review N32O / N34p / N35m / N65f / N9dn)
// QFAI:SPEC-0013:TC-0013-0020
// ---------------------------------------------------------------------------
describe("TDD-0015: validate pipeline integration", () => {
  it("validateTraceabilityIntegrity is exported from validators/index", async () => {
    const validatorIndex = await import("../../src/core/validators/index.js");
    expect(typeof validatorIndex.validateTraceabilityIntegrity).toBe("function");
  });

  it("validate.ts imports and calls traceabilityIntegrity in findings", async () => {
    // Read validate.ts source and verify the integration is present
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const validateSrc = await readFile(resolve(__dirname, "../../src/core/validate.ts"), "utf-8");
    expect(validateSrc).toContain("validateTraceabilityIntegrity");
    expect(validateSrc).toContain("await validateTraceabilityIntegrity(root, config)");
  });
});

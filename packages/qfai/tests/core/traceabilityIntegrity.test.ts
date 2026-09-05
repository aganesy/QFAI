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
      maxE2eScenarioRatio: null,
      maxE2eScenarioCount: null,
    },
    traceability: {
      scMustHaveTest: true,
      testFileGlobs: ["**/*.test.ts"],
      testFileExcludeGlobs: [],
      unknownContractIdSeverity: "warning",
    },
  },
  output: { validateJsonPath: ".qfai/out/validate.json" },
  baseBranch: "origin/main",
};

/**
 * Creates a spec directory the layout SSOT recognises as **layered**.
 *
 * `16_Traceability-ledger.md` names two unrelated schemas: the layered
 * `BR/AC | Implementation File | …` table this validator reads, and the legacy
 * spec-pack nine-column SSOT ledger owned by `QFAI-LEDGER-001`. The validator
 * only enumerates layered specs, so a fixture that is only `mkdir spec-NNNN` is
 * classified spec-pack and is deliberately invisible to it.
 */
async function seedLayeredSpec(specDir: string): Promise<void> {
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User stories\n", "utf-8");
}

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
    await seedLayeredSpec(specDir);

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
    await seedLayeredSpec(specDir);

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
    await seedLayeredSpec(specDir);

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
    await seedLayeredSpec(specDir);

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
    await seedLayeredSpec(specDir);
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
    await seedLayeredSpec(specDir);
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

// ---------------------------------------------------------------------------
// #536: ledger presence is a property of the working tree, not of the branch
// diff. The whole validator used to return early when the diff was empty, so a
// trunk-based repo (HEAD == origin/main), a shallow CI clone and a repo with no
// remote never saw QFAI-TRACE-002 — the warning the shipped /qfai-sdd docs
// promise as the only signal that the artifact is missing.
// ---------------------------------------------------------------------------
describe("ledger presence is checked without a branch diff", () => {
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

  async function seedSpecDirs(...specIds: string[]): Promise<void> {
    for (const specId of specIds) {
      await seedLayeredSpec(path.join(tmpRoot, ".qfai", "specs", specId));
    }
  }

  it("emits QFAI-TRACE-002 for every ledger-less spec when the diff is empty", async () => {
    await seedSpecDirs("spec-0001", "spec-0002");
    vi.mocked(execFileSync).mockReturnValue("");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    const missing = issues.filter((entry) => entry.code === "QFAI-TRACE-002");
    expect(missing).toHaveLength(2);
    expect(missing.every((entry) => entry.severity === "warning")).toBe(true);
    expect(issues.some((entry) => entry.code === "QFAI-TRACE-001")).toBe(false);
  });

  it("checks specs the diff never mentions", async () => {
    await seedSpecDirs("spec-0001", "spec-0002");
    // Only spec-0001 is in the diff; spec-0002's missing ledger is still a fact.
    vi.mocked(execFileSync).mockReturnValue(".qfai/specs/spec-0001/04_Business-Rules.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    const files = issues
      .filter((entry) => entry.code === "QFAI-TRACE-002")
      .map((entry) => entry.file);
    expect(files).toHaveLength(2);
    expect(files.some((file) => file?.includes("spec-0002"))).toBe(true);
  });

  it("flags an unexpected ledger format outside the diff too", async () => {
    await seedSpecDirs("spec-0002");
    const ledger = ["# Traceability Ledger", "", "| BR/AC | Notes |", "| --- | --- |", ""].join(
      "\n",
    );
    await writeFile(
      path.join(tmpRoot, ".qfai", "specs", "spec-0002", "16_Traceability-ledger.md"),
      ledger,
      "utf-8",
    );
    vi.mocked(execFileSync).mockReturnValue("");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TRACE-002");
    expect(issues[0]?.rule).toBe("traceability.integrity.ledgerFormatMismatch");
  });

  it("does not raise QFAI-TRACE-001 for a spec that is not in the diff", async () => {
    await seedSpecDirs("spec-0001");
    const ledger = [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
    ].join("\n");
    await writeFile(
      path.join(tmpRoot, ".qfai", "specs", "spec-0001", "16_Traceability-ledger.md"),
      ledger,
      "utf-8",
    );
    // A change somewhere else entirely: no BR/AC moved, so nothing is owed.
    vi.mocked(execFileSync).mockReturnValue("README.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toEqual([]);
  });

  it("ignores non-spec directories under specsDir", async () => {
    await seedSpecDirs("spec-0001");
    await mkdir(path.join(tmpRoot, ".qfai", "specs", "_policies"), { recursive: true });
    await mkdir(path.join(tmpRoot, ".qfai", "specs", "spec-XXXX"), { recursive: true });
    vi.mocked(execFileSync).mockReturnValue("");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.file).toContain("spec-0001");
  });

  it("reports no issues when specsDir does not exist", async () => {
    vi.mocked(execFileSync).mockReturnValue("");
    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// #536: "git could not answer" used to be indistinguishable from "nothing
// changed", so a missing base ref silently disabled the error-severity
// QFAI-TRACE-001 gate without a word in the report.
// ---------------------------------------------------------------------------
describe("an unavailable diff is reported, not swallowed", () => {
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

  it("emits QFAI-TRACE-003 (info) when git cannot resolve the base ref", async () => {
    await seedLayeredSpec(path.join(tmpRoot, ".qfai", "specs", "spec-0001"));
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("fatal: ambiguous argument 'origin/main..HEAD'");
    });

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    const skipped = issues.find((entry) => entry.code === "QFAI-TRACE-003");
    expect(skipped?.severity).toBe("info");
    expect(skipped?.rule).toBe("traceability.integrity.diffUnavailable");
    expect(skipped?.message).toContain("origin/main");
    // `baseBranch` is normalized from the document root (config.ts#306), never
    // from `validation`, so the repair instruction has to say top level.
    expect(skipped?.message).toContain("top-level baseBranch");
    // Ledger presence does not depend on the diff, so it is still reported.
    expect(issues.some((entry) => entry.code === "QFAI-TRACE-002")).toBe(true);
  });

  it("does not emit QFAI-TRACE-003 when git answers with an empty diff", async () => {
    vi.mocked(execFileSync).mockReturnValue("");
    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.some((entry) => entry.code === "QFAI-TRACE-003")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PR #856 review: the unconditional scan must not reach past the layered
// layout, must not open a non-regular file, and must not put the history-based
// gate in front of `/qfai-sdd`.
// ---------------------------------------------------------------------------
describe("the unconditional scan stays inside its own layout and profile", () => {
  let tmpRoot: string;
  let specsRoot: string;

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    tmpRoot = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-trace-int-")),
    );
    specsRoot = path.join(tmpRoot, ".qfai", "specs");
  });

  afterEach(async () => {
    await removeTempTree(tmpRoot);
  });

  it("does not judge a legacy spec-pack ledger against the layered schema", async () => {
    // A valid spec-pack: its required 16_Traceability-ledger.md is the
    // nine-column SSOT ledger QFAI-LEDGER-001 owns. It has no
    // "Implementation File" column and never will.
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_Objective.md"), "# 02 Objective\n", "utf-8");
    await writeFile(
      path.join(specDir, "16_Traceability-ledger.md"),
      [
        "# 16 Traceability Ledger (SSOT)",
        "",
        "| trace_id | obj_id | init_id | cap_id | flow_id | us_id | ac_id | ex_ids | tc_ids |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
        "| TR-0001 | OBJ-0001 | INIT-0001 | CAP-0001 | FLOW-0001 | US-0001 | AC-0001 | EX-0001 | TC-0001 |",
      ].join("\n"),
      "utf-8",
    );
    vi.mocked(execFileSync).mockReturnValue("");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toEqual([]);
  });

  it("reports a non-regular ledger path instead of opening it", async () => {
    // A directory stands in for the FIFO the reviewer named: both are
    // non-regular, and only the directory case is portable to Windows. The
    // point is that `stat` decides, so `readFile` never runs — on a FIFO that
    // call would block until a writer appeared and hang the whole run.
    const specDir = path.join(specsRoot, "spec-0001");
    await seedLayeredSpec(specDir);
    await mkdir(path.join(specDir, "16_Traceability-ledger.md"), { recursive: true });
    vi.mocked(execFileSync).mockReturnValue("");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TRACE-002");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.rule).toBe("traceability.integrity.ledgerNotAFile");
  });

  it("skips the history gate entirely when includeImplementationDiff is false", async () => {
    const specDir = path.join(specsRoot, "spec-0001");
    await seedLayeredSpec(specDir);
    await writeFile(
      path.join(specDir, "16_Traceability-ledger.md"),
      [
        "# Traceability Ledger",
        "",
        "| BR/AC | Implementation File | Test File |",
        "| --- | --- | --- |",
        "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
      ].join("\n"),
      "utf-8",
    );
    // Exactly what `/qfai-sdd` leaves behind: BR/AC moved, implementation not.
    vi.mocked(execFileSync).mockReturnValue(".qfai/specs/spec-0001/04_Business-Rules.md\n");

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig, {
      includeImplementationDiff: false,
    });
    expect(issues).toEqual([]);
    // The diff is not merely ignored — it is never asked for.
    expect(vi.mocked(execFileSync)).not.toHaveBeenCalled();
  });

  it("still reports a missing ledger when includeImplementationDiff is false", async () => {
    await seedLayeredSpec(path.join(specsRoot, "spec-0001"));

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig, {
      includeImplementationDiff: false,
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TRACE-002");
    expect(issues[0]?.rule).toBe("traceability.integrity.ledgerMissing");
  });

  it("reports a spec the diff names but the working tree no longer carries", async () => {
    // Whole-spec DELETE: the diff still shows 04_Business-Rules.md, but the
    // directory (and the ledger inside it) is gone, so nothing on disk can be
    // enumerated for it. Silence here would let both QFAI-TRACE-001 and
    // QFAI-TRACE-002 vanish for the deleted spec.
    await seedLayeredSpec(path.join(specsRoot, "spec-0001"));
    vi.mocked(execFileSync).mockReturnValue(
      [".qfai/specs/spec-0002/04_Business-Rules.md", ".qfai/specs/spec-0002/01_Spec.md"].join("\n"),
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    const removed = issues.find(
      (entry) => entry.rule === "traceability.integrity.specNotInWorkingTree",
    );
    expect(removed?.code).toBe("QFAI-TRACE-003");
    expect(removed?.severity).toBe("info");
    expect(removed?.message).toContain("spec-0002");
    expect(removed?.file).toContain("spec-0002");
  });

  it("does not report a spec the diff names and the working tree still carries", async () => {
    const specDir = path.join(specsRoot, "spec-0001");
    await seedLayeredSpec(specDir);
    await writeFile(
      path.join(specDir, "16_Traceability-ledger.md"),
      [
        "# Traceability Ledger",
        "",
        "| BR/AC | Implementation File | Test File |",
        "| --- | --- | --- |",
        "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
      ].join("\n"),
      "utf-8",
    );
    vi.mocked(execFileSync).mockReturnValue(
      [".qfai/specs/spec-0001/04_Business-Rules.md", "src/core/someModule.ts"].join("\n"),
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toEqual([]);
  });

  it("does not emit QFAI-TRACE-003 for sdd when git cannot answer", async () => {
    await seedLayeredSpec(path.join(specsRoot, "spec-0001"));
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("fatal: ambiguous argument 'origin/main..HEAD'");
    });

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig, {
      includeImplementationDiff: false,
    });
    // QFAI-TRACE-003 only ever explains why QFAI-TRACE-001 was skipped; the
    // sdd profile never asks for that check, so the notice would be noise.
    expect(issues.some((entry) => entry.code === "QFAI-TRACE-003")).toBe(false);
  });
});

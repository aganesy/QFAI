/**
 * traceabilityIntegrity tests — TDD-0011 through TDD-0015 (spec-0038).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import { validateTraceabilityIntegrity } from "../../src/core/validators/traceabilityIntegrity.js";
import type { QfaiConfig } from "../../src/core/config.js";
import { gitDiffListings as rawGitDiffListings } from "../helpers/gitDiffMock.js";
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
  const number = path.basename(specDir).slice(-4);
  await writeFile(
    path.join(specDir, "04_Business-Rules.md"),
    [
      "# Business Rules",
      "",
      "| BR-ID | Rule |",
      "| --- | --- |",
      `| BR-${number}-0001 | The current rule is satisfied. |`,
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "03_Acceptance-Criteria.md"),
    [
      "# Acceptance Criteria",
      "",
      "| AC-ID | Title | Notes | Priority |",
      "| --- | --- | --- | --- |",
      `| AC-${number}-0001 | The current outcome is observed. | - | Must |`,
    ].join("\n"),
    "utf-8",
  );
  const root = path.resolve(specDir, "..", "..", "..");
  await mkdir(path.join(root, "src", "core"), { recursive: true });
  await writeFile(
    path.join(root, "src", "core", "someModule.ts"),
    "export const value = 1;\n",
    "utf-8",
  );
}

/** The old fixtures still exercise real changed IDs under the new merge-base contract. */
function gitDiffListings(listings: Parameters<typeof rawGitDiffListings>[0] = {}) {
  const diff = rawGitDiffListings(listings);
  return (...call: unknown[]): string => {
    const args = Array.isArray(call[1]) ? call[1].map(String) : [];
    if (args[0] === "merge-base") return "fixture-merge-base\n";
    if (args[0] === "ls-tree") return "present\0";
    if (args[0] === "show") {
      const object = args[1] ?? "";
      const specNumber = /spec-(\d{4})/.exec(object)?.[1] ?? "0001";
      if (object.endsWith("/04_Business-Rules.md")) {
        return [
          "# Business Rules",
          "",
          "| BR-ID | Rule |",
          "| --- | --- |",
          `| BR-${specNumber}-0001 | The prior rule was satisfied. |`,
        ].join("\n");
      }
      if (object.endsWith("/03_Acceptance-Criteria.md")) {
        return [
          "# Acceptance Criteria",
          "",
          "| AC-ID | Title | Notes | Priority |",
          "| --- | --- | --- | --- |",
          `| AC-${specNumber}-0001 | The prior outcome was observed. | - | Must |`,
        ].join("\n");
      }
      throw new Error(`unexpected git show ${object}`);
    }
    return diff(...call);
  };
}

// ---------------------------------------------------------------------------
// TDD-0011: Spec BR changed + impl unchanged → QFAI-TRACE-001
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
    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({ changed: ["1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md"] }),
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.code === "QFAI-TRACE-001")).toBe(true);
    expect(issues.find((i) => i.code === "QFAI-TRACE-001")?.severity).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// TDD-0012: Spec BR changed + impl changed → PASS
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
    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({
        changed: [
          "1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md",
          "1\t1\tsrc/core/someModule.ts",
        ],
      }),
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
    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({
        changed: [
          "1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md",
          "1\t1\tsrc/core/someModule.ts",
        ],
      }),
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

    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({ changed: ["1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md"] }),
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    const trace001 = issues.filter((entry) => entry.code === "QFAI-TRACE-001");
    expect(trace001).toHaveLength(1);
    expect(trace001[0]?.file).toBe("src/core/someModule.ts");
  });
});

// ---------------------------------------------------------------------------
// TDD-0013: Ledger absent → warning + skip
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

    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({ changed: ["1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md"] }),
    );

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
// boundary against old evidence files.
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
    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({
        changed: [
          "1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md",
          "1\t1\tsrc/core/someModule.ts",
        ],
      }),
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
// TC-0013-0021.
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
// Ledger presence is a property of the working tree, not of the branch
// diff. A validator that returns early when the diff is empty would never
// surface QFAI-TRACE-002 for a trunk-based repo (HEAD == origin/main), a
// shallow CI clone, or a repo with no remote — the warning the shipped
// /qfai-sdd docs promise as the only signal that the artifact is missing.
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
    vi.mocked(execFileSync).mockImplementation(gitDiffListings());

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    const missing = issues.filter((entry) => entry.code === "QFAI-TRACE-002");
    expect(missing).toHaveLength(2);
    expect(missing.every((entry) => entry.severity === "warning")).toBe(true);
    expect(issues.some((entry) => entry.code === "QFAI-TRACE-001")).toBe(false);
  });

  it("checks specs the diff never mentions", async () => {
    await seedSpecDirs("spec-0001", "spec-0002");
    // Only spec-0001 is in the diff; spec-0002's missing ledger is still a fact.
    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({ changed: ["1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md"] }),
    );

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
    vi.mocked(execFileSync).mockImplementation(gitDiffListings());

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TRACE-002");
    expect(issues[0]?.severity).toBe("warning");
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
    vi.mocked(execFileSync).mockImplementation(gitDiffListings({ changed: ["1\t1\tREADME.md"] }));

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toEqual([]);
  });

  it("ignores non-spec directories under specsDir", async () => {
    await seedSpecDirs("spec-0001");
    await mkdir(path.join(tmpRoot, ".qfai", "specs", "_policies"), { recursive: true });
    await mkdir(path.join(tmpRoot, ".qfai", "specs", "spec-XXXX"), { recursive: true });
    vi.mocked(execFileSync).mockImplementation(gitDiffListings());

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.file).toContain("spec-0001");
  });

  it("says so when specsDir does not exist, rather than reporting nothing", async () => {
    // Silence here is the one answer a configuration error must not produce:
    // every gate keyed on the directory evaluates an empty set, and the run
    // reads exactly like a project whose specs are all clean.
    vi.mocked(execFileSync).mockImplementation(gitDiffListings());

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TRACE-003");
    expect(issues[0]?.rule).toBe("traceability.integrity.specsDirMissing");
    expect(issues[0]?.severity).toBe("info");
    expect(issues[0]?.message).toContain("ran over nothing");
  });
});

// ---------------------------------------------------------------------------
// Treating "git could not answer" as indistinguishable from "nothing
// changed" would let a missing base ref silently disable the error-severity
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

  it("emits QFAI-TRACE-003 (error) when git cannot resolve the base ref", async () => {
    await seedLayeredSpec(path.join(tmpRoot, ".qfai", "specs", "spec-0001"));
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("fatal: ambiguous argument 'origin/main..HEAD'");
    });

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    const skipped = issues.find((entry) => entry.code === "QFAI-TRACE-003");
    expect(skipped?.severity).toBe("error");
    expect(skipped?.rule).toBe("traceability.integrity.diffUnavailable");
    expect(skipped?.message).toContain("origin/main");
    // `baseBranch` is normalized from the document root (config.ts#306), never
    // from `validation`, so the repair instruction has to say top level.
    expect(skipped?.message).toContain("top-level baseBranch");
    // Ledger presence does not depend on the diff, so it is still reported.
    expect(issues.some((entry) => entry.code === "QFAI-TRACE-002")).toBe(true);
  });

  it("does not emit QFAI-TRACE-003 when git answers with an empty diff", async () => {
    // The specs directory is there and empty, which is the case this is about:
    // git answered, and its answer named no spec. A directory that is not
    // there is a different finding and would mask this one.
    await mkdir(path.join(tmpRoot, ".qfai", "specs"), { recursive: true });
    vi.mocked(execFileSync).mockImplementation(gitDiffListings());

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);

    expect(issues.some((entry) => entry.code === "QFAI-TRACE-003")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The unconditional scan must not reach past the layered
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
    vi.mocked(execFileSync).mockImplementation(gitDiffListings());

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
    vi.mocked(execFileSync).mockImplementation(gitDiffListings());

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
    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({ changed: ["1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md"] }),
    );

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
    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({
        changed: [
          "1\t1\t.qfai/specs/spec-0002/04_Business-Rules.md",
          "1\t1\t.qfai/specs/spec-0002/01_Spec.md",
        ],
      }),
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
    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({
        changed: [
          "1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md",
          "1\t1\tsrc/core/someModule.ts",
        ],
      }),
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    expect(issues).toEqual([]);
  });

  it("reads a removed implementation as removed, not as modified", async () => {
    // The row's file is in the diff because the branch DELETED it. Reading the
    // listing alone made the stalest possible ledger — one still naming a path
    // that no longer exists — the single case that passed.
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
    vi.mocked(execFileSync).mockImplementation(
      gitDiffListings({
        changed: [
          "1\t1\t.qfai/specs/spec-0001/04_Business-Rules.md",
          "0\t9\tsrc/core/someModule.ts",
        ],
        removed: ["src/core/someModule.ts"],
      }),
    );

    const issues = await validateTraceabilityIntegrity(tmpRoot, stubConfig);
    const stale = issues.filter((entry) => entry.code === "QFAI-TRACE-001");
    expect(stale).toHaveLength(1);
    expect(stale[0]?.file).toBe("src/core/someModule.ts");
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

// A branch diff names files, not obligations. These fixtures return the base
// document from git so the validator must identify which ID's content moved.
describe("changed obligations and their bindings", () => {
  let root: string;
  const specId = "spec-0099";
  const specPath = `.qfai/specs/${specId}`;
  const brPath = `${specPath}/04_Business-Rules.md`;
  const acPath = `${specPath}/03_Acceptance-Criteria.md`;
  const oldRules = [
    "# Business Rules",
    "",
    "| BR-ID | Rule |",
    "| --- | --- |",
    "| BR-0099-0001 | First behavior stays true. |",
    "| BR-0099-0002 | Second behavior stays true. |",
  ].join("\n");
  const oldCriteria = [
    "# Acceptance Criteria",
    "",
    "| AC-ID | Title | Notes | Priority |",
    "| --- | --- | --- | --- |",
    "| AC-0099-0001 | First outcome | Existing | Must |",
  ].join("\n");
  const pythonConfig: QfaiConfig = {
    ...stubConfig,
    validation: {
      ...stubConfig.validation,
      traceability: {
        ...stubConfig.validation.traceability,
        testFileGlobs: ["**/*.test.ts", "**/*_test.py"],
      },
    },
  };

  beforeEach(async () => {
    vi.mocked(execFileSync).mockReset();
    root = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-trace-obligation-")),
    );
    await seedLayeredSpec(path.join(root, specPath));
    await writeFile(path.join(root, brPath), oldRules, "utf-8");
    await writeFile(path.join(root, acPath), oldCriteria, "utf-8");
    for (const file of ["src/first.ts", "src/second.ts"]) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), "export const value = true;\n", "utf-8");
    }
  });

  afterEach(async () => {
    await removeTempTree(root);
  });

  async function ledger(rows: readonly string[], planned: readonly string[] = []): Promise<void> {
    const contents = [
      "# Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File | Notes | Proof |",
      "| --- | --- | --- | --- | --- |",
      ...rows,
      "",
      "### Planned bindings",
      "",
      "| Implementation File | State today | BR / AC it will realize | Test File (planned) | Promotion trigger |",
      "| --- | --- | --- | --- | --- |",
      ...planned,
    ].join("\n");
    await writeFile(path.join(root, specPath, "16_Traceability-ledger.md"), contents, "utf-8");
  }

  function mockHistory(
    changed: readonly string[],
    options: { baseRules?: string; baseCriteria?: string; baseUnavailable?: boolean } = {},
  ): void {
    const listings = gitDiffListings({ changed });
    vi.mocked(execFileSync).mockImplementation((...call) => {
      const args = Array.isArray(call[1]) ? call[1].map(String) : [];
      if (args[0] === "merge-base") {
        if (options.baseUnavailable) throw new Error("base is unavailable");
        return "fixture-merge-base\n";
      }
      if (args[0] === "show") {
        const object = args[1] ?? "";
        if (object.endsWith(`:${brPath}`)) return options.baseRules ?? oldRules;
        if (object.endsWith(`:${acPath}`)) return options.baseCriteria ?? oldCriteria;
        throw new Error(`unexpected git show ${object}`);
      }
      if (args[0] === "ls-tree") return "present\0";
      return listings(...call);
    });
  }

  const active = (
    id: string,
    file: string,
    proof = "-",
    testFile = "tests/core/behavior.test.ts",
  ): string => `| ${id} | ${file} | ${testFile} | - | ${proof} |`;

  it("checks only the edited rule, leaving its unchanged sibling's unchanged file alone", async () => {
    await writeFile(
      path.join(root, brPath),
      oldRules.replace("First behavior stays true.", "First behavior now rejects false."),
      "utf-8",
    );
    await ledger([active("BR-0099-0001", "src/first.ts"), active("BR-0099-0002", "src/second.ts")]);
    mockHistory([`1\t1\t${brPath}`, "1\t1\tsrc/first.ts"]);

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-001")).toEqual([]);
  });

  it("does not treat a rule table reordering as a changed obligation", async () => {
    await writeFile(
      path.join(root, brPath),
      oldRules.replace(
        "| BR-0099-0001 | First behavior stays true. |\n| BR-0099-0002 | Second behavior stays true. |",
        "| BR-0099-0002 | Second behavior stays true. |\n| BR-0099-0001 | First behavior stays true. |",
      ),
      "utf-8",
    );
    await ledger([active("BR-0099-0001", "src/first.ts")]);
    mockHistory([`2\t2\t${brPath}`]);

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-001")).toEqual([]);
  });

  it("rejects a changed rule with no active or planned binding", async () => {
    await writeFile(
      path.join(root, brPath),
      `${oldRules}\n| BR-0099-0003 | New behavior. |`,
      "utf-8",
    );
    await ledger([active("BR-0099-0001", "src/first.ts")]);
    mockHistory([`1\t0\t${brPath}`]);

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some(
        (entry) => entry.code === "QFAI-TRACE-001" && entry.message.includes("BR-0099-0003"),
      ),
    ).toBe(true);
  });

  it("accepts an explicit planned binding for a new rule whose file is absent", async () => {
    await writeFile(
      path.join(root, brPath),
      `${oldRules}\n| BR-0099-0003 | New behavior. |`,
      "utf-8",
    );
    await ledger(
      [active("BR-0099-0001", "src/first.ts")],
      ["| `src/future.ts` | absent | BR-0099-0003 | `tests/core/future.test.ts` | File creation |"],
    );
    mockHistory([`1\t0\t${brPath}`]);

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-001")).toEqual([]);
  });

  it("rejects an ambiguous active binding that repeats one rule and path", async () => {
    await writeFile(
      path.join(root, brPath),
      oldRules.replace("First behavior stays true.", "First behavior now rejects false."),
      "utf-8",
    );
    await ledger([active("BR-0099-0001", "src/first.ts"), active("BR-0099-0001", "src/first.ts")]);
    mockHistory([`1\t1\t${brPath}`, "1\t1\tsrc/first.ts"]);

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some(
        (entry) => entry.code === "QFAI-TRACE-001" && entry.message.includes("BR-0099-0001"),
      ),
    ).toBe(true);
  });

  it("rejects an active binding whose implementation path has been removed", async () => {
    await writeFile(
      path.join(root, brPath),
      oldRules.replace("First behavior stays true.", "First behavior now rejects false."),
      "utf-8",
    );
    await ledger([active("BR-0099-0001", "src/missing.ts")]);
    mockHistory([`1\t1\t${brPath}`]);

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.file === "src/missing.ts"),
    ).toBe(true);
  });

  it("treats a present ledger with an invalid first table as an error", async () => {
    await writeFile(
      path.join(root, specPath, "16_Traceability-ledger.md"),
      [
        "# Traceability Ledger",
        "",
        "| BR/AC | Notes |",
        "| --- | --- |",
        "| BR-0099-0001 | no implementation column |",
      ].join("\n"),
      "utf-8",
    );
    mockHistory([`1\t1\t${brPath}`]);

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-002" && entry.severity === "error"),
    ).toBe(true);
  });

  it("rejects a ledger that swaps the implementation and test columns", async () => {
    await writeFile(
      path.join(root, specPath, "16_Traceability-ledger.md"),
      [
        "# Traceability Ledger",
        "",
        "| BR/AC | Test File | Implementation File | Notes | Proof |",
        "| --- | --- | --- | --- | --- |",
        "| BR-0099-0001 | tests/core/behavior.test.ts | src/first.ts | - | - |",
      ].join("\n"),
      "utf-8",
    );
    mockHistory([`1\t1\t${brPath}`]);

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some(
        (entry) =>
          entry.code === "QFAI-TRACE-002" &&
          entry.severity === "error" &&
          entry.rule === "traceability.integrity.ledgerFormatMismatch",
      ),
    ).toBe(true);
  });

  it("fails closed in the implementation profile when the merge base is unavailable", async () => {
    await ledger([active("BR-0099-0001", "src/first.ts")]);
    mockHistory([`1\t1\t${brPath}`], { baseUnavailable: true });

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-003" && entry.severity === "error"),
    ).toBe(true);
  });

  it("fails closed when the base document exists but git cannot read it", async () => {
    await ledger([active("BR-0099-0001", "src/first.ts")]);
    const listings = gitDiffListings({ changed: [`1\t1\t${brPath}`] });
    vi.mocked(execFileSync).mockImplementation((...call) => {
      const args = Array.isArray(call[1]) ? call[1].map(String) : [];
      if (args[0] === "show") throw new Error("object read failed");
      return listings(...call);
    });

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-003" && entry.severity === "error"),
    ).toBe(true);
  });

  it("does not require a merge base in the spec authoring profile", async () => {
    await ledger([active("BR-0099-0001", "src/first.ts")]);
    mockHistory([`1\t1\t${brPath}`], { baseUnavailable: true });

    const issues = await validateTraceabilityIntegrity(root, stubConfig, {
      includeImplementationDiff: false,
    });
    expect(issues).toEqual([]);
    expect(vi.mocked(execFileSync)).not.toHaveBeenCalled();
  });

  it("compares acceptance-criterion text as well as business-rule text", async () => {
    await writeFile(
      path.join(root, acPath),
      oldCriteria.replace("First outcome", "First outcome now has a stronger boundary"),
      "utf-8",
    );
    await ledger([active("AC-0099-0001", "src/first.ts")]);
    mockHistory([`1\t1\t${acPath}`]);

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some(
        (entry) => entry.code === "QFAI-TRACE-001" && entry.message.includes("AC-0099-0001"),
      ),
    ).toBe(true);
  });

  const headingForms: [level: string, title: string][] = [
    ["#", ": Title"],
    ["#", ""],
    ["##", ": Title"],
    ["##", ""],
  ];

  it.each(headingForms)(
    "compares acceptance-criterion headings shaped '%s AC-NNNN%s' without a catalog table",
    async (level, title) => {
      const before = [
        "# Acceptance Criteria",
        "",
        `${level} AC-0099-0001${title}`,
        "",
        "The initial boundary applies.",
        "",
        `${level} AC-0099-0002${title}`,
        "",
        "The stable boundary applies.",
      ].join("\n");
      const after = before.replace(
        "The initial boundary applies.",
        "The stronger boundary applies.",
      );
      await writeFile(path.join(root, acPath), after, "utf-8");
      await ledger([
        active("AC-0099-0001", "src/first.ts"),
        active("AC-0099-0002", "src/second.ts"),
      ]);
      mockHistory([`1\t1\t${acPath}`], { baseCriteria: before });

      const issues = await validateTraceabilityIntegrity(root, stubConfig);
      const drift = issues.filter((entry) => entry.code === "QFAI-TRACE-001");
      expect(drift.map((entry) => entry.refs)).toEqual([["AC-0099-0001"]]);
    },
  );

  it.each(headingForms)(
    "compares business-rule headings shaped '%s BR-NNNN%s' without a rule table",
    async (level, title) => {
      const before = [
        "# Business Rules",
        "",
        `${level} BR-0099-0001${title}`,
        "",
        "The initial rule applies.",
        "",
        `${level} BR-0099-0002${title}`,
        "",
        "The stable rule applies.",
      ].join("\n");
      const after = before.replace("The initial rule applies.", "The stronger rule applies.");
      await writeFile(path.join(root, brPath), after, "utf-8");
      await ledger([
        active("BR-0099-0001", "src/first.ts"),
        active("BR-0099-0002", "src/second.ts"),
      ]);
      mockHistory([`1\t1\t${brPath}`], { baseRules: before });

      const issues = await validateTraceabilityIntegrity(root, stubConfig);
      const drift = issues.filter((entry) => entry.code === "QFAI-TRACE-001");
      expect(drift.map((entry) => entry.refs)).toEqual([["BR-0099-0001"]]);
    },
  );

  async function compareCriteria(before: string, after: string): Promise<string[][]> {
    await writeFile(path.join(root, acPath), after, "utf-8");
    await ledger([active("AC-0099-0001", "src/first.ts"), active("AC-0099-0002", "src/second.ts")]);
    mockHistory([`1\t1\t${acPath}`], { baseCriteria: before });

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-003")).toEqual([]);
    return issues.filter((entry) => entry.code === "QFAI-TRACE-001").map((entry) => entry.refs);
  }

  it("compares criteria written as the template's Gherkin scenarios", async () => {
    const before = [
      "# 03 Acceptance Criteria",
      "",
      "## AC Gherkin (required)",
      "",
      "```gherkin",
      "# AC-0099-0001",
      "Scenario: First outcome",
      "  Then the initial result appears",
      "```",
      "",
      "```gherkin",
      "# AC-0099-0002",
      "Scenario: Second outcome",
      "  Then the stable result appears",
      "```",
    ].join("\n");
    const after = before.replace("the initial result", "the stronger result");

    expect(await compareCriteria(before, after)).toEqual([["AC-0099-0001"]]);
  });

  it("reads a Gherkin comment inside its own criterion's section as that criterion", async () => {
    const before = [
      "# 03 Acceptance Criteria",
      "",
      "## AC-0099-0001: First outcome",
      "",
      "```gherkin",
      "# AC-0099-0001",
      "Scenario: First outcome",
      "  Then the initial result appears",
      "```",
      "",
      "## AC-0099-0002: Second outcome",
      "",
      "The stable boundary applies.",
    ].join("\n");
    const after = before.replace("the initial result", "the stronger result");

    expect(await compareCriteria(before, after)).toEqual([["AC-0099-0001"]]);
  });

  async function proofFixture(
    overrides: {
      proof?: string;
      satisfiedBy?: string;
      restoredHash?: string;
      redHash?: string;
      green?: string;
      qa?: string;
      tc?: string;
      selector?: string;
      alsoCriterion?: boolean;
      tcAcRefs?: string;
      tcTitle?: string;
      testAnnotationTc?: string;
      testBody?: string;
      testFile?: string;
      rowSelector?: string;
      tddId?: string;
      runCommand?: string;
      falsifiabilityCommand?: string;
      greenCommand?: string;
    } = {},
  ): Promise<void> {
    const id = "BR-0099-0003";
    const tddId = overrides.tddId ?? "TDD-0001";
    const testFile = overrides.testFile ?? "tests/core/behavior.test.ts";
    const rowSelector = overrides.rowSelector ?? "existing behavior is verified";
    const runCommand =
      overrides.runCommand ??
      (testFile.endsWith(".py")
        ? `pytest -q ${rowSelector}`
        : `vitest run ${testFile} --testNamePattern=${tddId}`);
    const testAnnotationTc = overrides.testAnnotationTc ?? "TC-0099-0001";
    const testText =
      overrides.testBody ??
      [
        `// QFAI:SPEC-0099:${testAnnotationTc}`,
        `it("${testAnnotationTc} (${tddId}): existing behavior is verified", () => expect(true).toBe(true));`,
        "",
      ].join("\n");
    await mkdir(path.dirname(path.join(root, testFile)), { recursive: true });
    await writeFile(path.join(root, testFile), testText, "utf-8");
    const fileHash = createHash("sha256").update(testText).digest("hex");
    const testHash = createHash("sha256")
      .update([testFile, "file", "100644", fileHash].join("\0"))
      .digest("hex");
    const sourceHash = createHash("sha256")
      .update(await readFile(path.join(root, "src", "first.ts")))
      .digest("hex");
    await writeFile(
      path.join(root, brPath),
      `${oldRules}\n| ${id} | Existing behavior is required. |`,
      "utf-8",
    );
    if (overrides.alsoCriterion) {
      await writeFile(
        path.join(root, acPath),
        oldCriteria.replace("First outcome", "First outcome requires the existing behavior"),
        "utf-8",
      );
    }
    await ledger([
      active(id, "src/first.ts", overrides.proof ?? tddId, testFile),
      ...(overrides.alsoCriterion
        ? [active("AC-0099-0001", "src/first.ts", overrides.proof ?? tddId, testFile)]
        : []),
    ]);
    await mkdir(path.join(root, specPath, "tdd"), { recursive: true });
    await writeFile(
      path.join(root, specPath, "tdd", "test-list.md"),
      [
        "# Test list",
        "",
        "| TDD-ID | TC-Refs | Test file | Selector | Evidence | BR-Ref |",
        "| --- | --- | --- | --- | --- | --- |",
        `| ${tddId} | ${overrides.tc ?? "TC-0099-0001"} | ${testFile} | ${rowSelector} | [ATDD](../../../evidence/atdd-spec-0099.md#${tddId.toLowerCase()}) | ${id} |`,
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(root, specPath, "06_Test-Cases.md"),
      [
        "# Test cases",
        "",
        "| TC-ID | Title | AC-Refs | BR-Refs |",
        "| --- | --- | --- | --- |",
        `| TC-0099-0001 | ${overrides.tcTitle ?? "Existing behavior"} | ${overrides.tcAcRefs ?? "AC-0099-0001"} | ${id} |`,
      ].join("\n"),
      "utf-8",
    );
    await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "evidence", "atdd-spec-0099.md"),
      [
        "# ATDD Evidence",
        "",
        `### ${tddId}`,
        "",
        `- TDD-ID: ${tddId}`,
        `- Test file: \`${testFile}\``,
        `- Selector: \`${overrides.selector ?? rowSelector}\``,
        `- TC-ref: ${overrides.tc ?? "TC-0099-0001"}`,
        `- Round 1: RED test hash: ${overrides.redHash ?? testHash}`,
        "- Round 1: RED test manifest:",
        "",
        "```text",
        testFile,
        "```",
        "",
        `- Satisfied-by: \`${overrides.satisfiedBy ?? "src/first.ts::value"}\``,
        `- Mutant SHA-256: ${"a".repeat(64)}. Restored SHA-256: ${overrides.restoredHash ?? sourceHash}.`,
        `- Falsifiability command: \`${overrides.falsifiabilityCommand ?? runCommand}\``,
        "- Falsifiability result: exit 1; Tests 1 failed.",
        `- GREEN command: \`${overrides.greenCommand ?? runCommand}\``,
        `- GREEN result: ${overrides.green ?? "exit 0; Tests 1 passed"}.`,
        `- qa-gatekeeper: ${overrides.qa ?? "PASS"}`,
        `- qa-gatekeeper live mutation review: \`${overrides.qa ?? "PASS"}\`; independent same-command assertion=True; exit=1.`,
      ].join("\n"),
      "utf-8",
    );
    mockHistory([`1\t0\t${brPath}`, ...(overrides.alsoCriterion ? [`1\t1\t${acPath}`] : [])]);
  }

  it("accepts current independent proof for an unchanged implementation", async () => {
    await proofFixture();
    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-001")).toEqual([]);
  });

  it("allows one reviewed test to prove the same unchanged file for its BR and AC bindings", async () => {
    await proofFixture({ alsoCriterion: true });
    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-001")).toEqual([]);
  });

  it("does not count a TC title as an AC reference for proof", async () => {
    await proofFixture({
      alsoCriterion: true,
      tcAcRefs: "-",
      tcTitle: "AC-0099-0001 appears only in this title",
    });
    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    const drift = issues.filter((entry) => entry.code === "QFAI-TRACE-001");
    expect(drift.map((entry) => entry.refs)).toEqual([["AC-0099-0001"]]);
  });

  it("rejects proof when the test still names and annotates an earlier TC", async () => {
    await proofFixture({ testAnnotationTc: "TC-0099-0002" });
    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.severity === "error"),
    ).toBe(true);
  });

  it("rejects a runnable test with no TC annotation", async () => {
    await proofFixture({
      testBody: [
        'it("TC-0099-0001 (TDD-0001): existing behavior is verified", () => expect(true).toBe(true));',
        "",
      ].join("\n"),
    });

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.severity === "error"),
    ).toBe(true);
  });

  it("does not accept a commented-out test as runnable proof", async () => {
    await proofFixture({
      testBody: [
        "// QFAI:SPEC-0099:TC-0099-0001",
        '// it("TC-0099-0001 (TDD-0001): existing behavior is verified", () => expect(true).toBe(true));',
        "",
      ].join("\n"),
    });

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.severity === "error"),
    ).toBe(true);
  });

  it("accepts a current pytest class and method selector as proof", async () => {
    await proofFixture({
      testFile: "tests/x_test.py",
      rowSelector: "tests/x_test.py::TestA::test_b",
      testBody: [
        "class TestA:",
        "    # QFAI:SPEC-0099:TC-0099-0001",
        "    def test_b(self):",
        "        assert True",
        "",
      ].join("\n"),
    });

    const issues = await validateTraceabilityIntegrity(root, pythonConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-001")).toEqual([]);
  });

  it("rejects full-file pytest commands when the selected method appears only in a comment", async () => {
    await proofFixture({
      testFile: "tests/x_test.py",
      rowSelector: "tests/x_test.py::TestA::test_b",
      runCommand: "pytest -q tests/x_test.py",
      testBody: [
        "class TestA:",
        "    # QFAI:SPEC-0099:TC-0099-0001",
        "    # test_b was removed",
        "    def test_other(self):",
        "        assert True",
        "",
      ].join("\n"),
    });

    const issues = await validateTraceabilityIntegrity(root, pythonConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.severity === "error"),
    ).toBe(true);
  });

  it.each(["falsifiabilityCommand", "greenCommand"] as const)(
    "requires the %s to target the pytest selector",
    async (commandField) => {
      await proofFixture({
        testFile: "tests/x_test.py",
        rowSelector: "tests/x_test.py::TestA::test_b",
        [commandField]: "pytest -q tests/x_test.py",
        testBody: [
          "class TestA:",
          "    # QFAI:SPEC-0099:TC-0099-0001",
          "    def test_b(self):",
          "        assert True",
          "",
        ].join("\n"),
      });

      const issues = await validateTraceabilityIntegrity(root, pythonConfig);
      expect(
        issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.severity === "error"),
      ).toBe(true);
    },
  );

  it("rejects pytest proof when the selected method was renamed", async () => {
    await proofFixture({
      testFile: "tests/x_test.py",
      rowSelector: "tests/x_test.py::TestA::test_b",
      testBody: [
        "class TestA:",
        "    # QFAI:SPEC-0099:TC-0099-0001",
        "    def test_old(self):",
        "        assert True",
        "",
      ].join("\n"),
    });

    const issues = await validateTraceabilityIntegrity(root, pythonConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.severity === "error"),
    ).toBe(true);
  });

  it("rejects a runnable pytest method without its TC annotation", async () => {
    await proofFixture({
      testFile: "tests/x_test.py",
      rowSelector: "tests/x_test.py::TestA::test_b",
      testBody: ["class TestA:", "    def test_b(self):", "        assert True", ""].join("\n"),
    });

    const issues = await validateTraceabilityIntegrity(root, pythonConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.severity === "error"),
    ).toBe(true);
  });

  it("accepts a parameterized Vitest test as proof", async () => {
    await proofFixture({
      testBody: [
        "// QFAI:SPEC-0099:TC-0099-0001",
        'it.each([[1]])("TC-0099-0001 (TDD-0001): existing behavior is verified", (value) => expect(value).toBe(1));',
        "",
      ].join("\n"),
    });

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-001")).toEqual([]);
  });

  it("accepts a Vitest command filtered to the row's TDD ID", async () => {
    await proofFixture({ tddId: "TDD-0107" });
    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(issues.filter((entry) => entry.code === "QFAI-TRACE-001")).toEqual([]);
  });

  it("does not borrow an earlier round's manifest and GREEN review for the final RED hash", async () => {
    await proofFixture();
    const evidencePath = path.join(root, ".qfai", "evidence", "atdd-spec-0099.md");
    const prior = await readFile(evidencePath, "utf-8");
    const currentHash = /Round 1: RED test hash: ([a-f0-9]{64})/.exec(prior)?.[1];
    expect(currentHash).toBeDefined();
    const stalePrior = prior.replace(
      `Round 1: RED test hash: ${currentHash}`,
      `Round 1: RED test hash: ${"b".repeat(64)}`,
    );
    await writeFile(
      evidencePath,
      `${stalePrior}\n- Round 2: RED test hash: ${currentHash}\n`,
      "utf-8",
    );

    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.severity === "error"),
    ).toBe(true);
  });

  it.each([
    { name: "missing proof", proof: "-" },
    { name: "stale source hash", restoredHash: "b".repeat(64) },
    { name: "stale test hash", redHash: "b".repeat(64) },
    { name: "different implementation", satisfiedBy: "src/second.ts::value" },
    { name: "failed GREEN", green: "exit 1; Tests 1 failed" },
    { name: "failed QA", qa: "FAIL" },
    { name: "wrong test case", tc: "TC-0099-0002" },
    { name: "wrong selector", selector: "different test" },
  ])("rejects $name for an unchanged implementation", async (overrides) => {
    await proofFixture(overrides);
    const issues = await validateTraceabilityIntegrity(root, stubConfig);
    expect(
      issues.some((entry) => entry.code === "QFAI-TRACE-001" && entry.severity === "error"),
    ).toBe(true);
  });
});

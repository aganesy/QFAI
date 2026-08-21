/**
 * The Coverage Depth Matrix is a Mandatory Output of `/qfai-atdd` that no
 * mechanical gate ever opened.
 *
 * `qa-gatekeeper` REVISEs a missing matrix and `completion-reviewer` reviews it
 * whole, but both read prose — and the audit record list omits an absent
 * artifact rather than recording it as missing, so a spec with no matrix hashed
 * clean and passed. "No matrix at all" and "a matrix with no unjustified cell"
 * were the same observable state.
 *
 * These tests pin the three file-level checks that make the difference
 * observable: the matrix exists, it is not swallowed by `.gitignore`, and the
 * stage evidence links it instead of inlining the table into a file the ignore
 * rules delete from history.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { defaultConfig } from "../../src/core/config.js";
import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";
import { validateProject } from "../../src/core/validate.js";
import { validateAtddCoverageDepth } from "../../src/core/validators/atddCoverageDepth.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

type Seed = {
  /** Written to `tests/integration/spec-0001/a.test.ts` when true. */
  annotated?: boolean;
  /** Body of `.qfai/evidence/coverage-depth-spec-0001.md`, or absent. */
  matrix?: string;
  /** Body of `.qfai/evidence/atdd-spec-0001.md`, or absent. */
  stageEvidence?: string;
  /** Root `.gitignore`; defaults to the managed block `qfai init` writes. */
  gitignore?: string;
};

async function seedProject(seed: Seed): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-coverage-depth-"));
  tempDirs.push(root);
  await writeFile(path.join(root, ".gitignore"), seed.gitignore ?? QFAI_GITIGNORE_BLOCK, "utf-8");

  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
  await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
  await writeFile(
    path.join(specDir, "06_Test-Cases.md"),
    [
      "# 06 Test Cases",
      "",
      "## Test Case Table",
      "",
      "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
      "| ----- | ----- | ------- | ------ | ----- | -------- |",
      "| TC-0001 | L3 | AC-0001 | EX-0001 | s | e |",
      "",
    ].join("\n"),
    "utf-8",
  );

  if (seed.annotated ?? true) {
    const testDir = path.join(root, "tests", "integration", "spec-0001");
    await mkdir(testDir, { recursive: true });
    await writeFile(
      path.join(testDir, "a.test.ts"),
      "// QFAI:SPEC-0001:TC-0001\nit('covers', () => {});\n",
      "utf-8",
    );
  }

  const evidenceDir = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  if (seed.matrix !== undefined) {
    await writeFile(path.join(evidenceDir, "coverage-depth-spec-0001.md"), seed.matrix, "utf-8");
  }
  if (seed.stageEvidence !== undefined) {
    await writeFile(path.join(evidenceDir, "atdd-spec-0001.md"), seed.stageEvidence, "utf-8");
  }
  return root;
}

async function codesFor(seed: Seed): Promise<string[]> {
  const root = await seedProject(seed);
  const evaluated = await evaluateAtddCodeTraceability(root, defaultConfig);
  const issues = await validateAtddCoverageDepth(root, evaluated);
  return issues.map((entry) => entry.code);
}

const MATRIX = "# Coverage Depth Matrix\n\n| TC | Normal |\n| -- | ------ |\n| TC-0001 | OK |\n";

const LINKED_SECTION = [
  "# ATDD",
  "",
  "## Coverage Depth Matrix",
  "",
  "See `.qfai/evidence/coverage-depth-spec-0001.md` (committed). Totals: 7 / 0 / 0.",
  "",
  "## Final status (PASS/FAIL) + who confirmed",
  "",
].join("\n");

const INLINE_SECTION = [
  "# ATDD",
  "",
  "## Coverage Depth Matrix",
  "",
  "| Obligation | Layer | Depth |",
  "| ---------- | ----- | ----- |",
  "| `TC-0001`  | Integration | D3 |",
  "",
].join("\n");

describe("QFAI-ATDD-131: the matrix must exist for a spec with ATDD-owned tests", () => {
  it("reports the spec whose matrix is absent", async () => {
    expect(await codesFor({})).toContain("QFAI-ATDD-131");
  });

  it("stays silent once the matrix is written", async () => {
    expect(await codesFor({ matrix: MATRIX })).not.toContain("QFAI-ATDD-131");
  });

  it("demands nothing from a spec with no ATDD-owned test", async () => {
    // The obligation follows the tests, not the spec directory: a spec whose
    // ATDD stage has not started owes no matrix.
    expect(await codesFor({ annotated: false })).not.toContain("QFAI-ATDD-131");
  });

  it("names the spec directory so `--spec` scoping can own the finding", async () => {
    const root = await seedProject({});
    const evaluated = await evaluateAtddCodeTraceability(root, defaultConfig);
    const finding = (await validateAtddCoverageDepth(root, evaluated)).find(
      (entry) => entry.code === "QFAI-ATDD-131",
    );

    expect(finding?.severity).toBe("warning");
    expect(finding?.file).toContain(path.join(".qfai", "specs", "spec-0001"));
    expect(finding?.suggested_action).toContain("coverage-depth-spec-0001.md");
  });
});

describe("QFAI-ATDD-132: the matrix must survive `.gitignore`", () => {
  it("passes under the managed block, whose negation re-includes it", async () => {
    expect(await codesFor({ matrix: MATRIX })).not.toContain("QFAI-ATDD-132");
  });

  it("reports a project whose ignore block predates the negation", async () => {
    // Exactly the state `qfai init` migrates away from: the stage-evidence
    // ignore with no `!.qfai/evidence/coverage-depth-*.md` under it.
    const codes = await codesFor({
      matrix: MATRIX,
      gitignore: ".qfai/report/*\n.qfai/evidence/*\n",
    });

    expect(codes).toContain("QFAI-ATDD-132");
  });

  it("reports a later project line that outranks the negation", async () => {
    // git applies the last matching pattern, so a project rule appended after
    // the managed block re-ignores what the block re-included.
    const codes = await codesFor({
      matrix: MATRIX,
      gitignore: `${QFAI_GITIGNORE_BLOCK}\n.qfai/evidence/**/*.md\n`,
    });

    expect(codes).toContain("QFAI-ATDD-132");
  });

  it("reports an ignored ancestor directory, which git never descends into", async () => {
    const codes = await codesFor({ matrix: MATRIX, gitignore: ".qfai/\n" });

    expect(codes).toContain("QFAI-ATDD-132");
  });
});

describe("QFAI-ATDD-133: the stage evidence links the matrix instead of inlining it", () => {
  it("reports an inline table in `## Coverage Depth Matrix`", async () => {
    const codes = await codesFor({ matrix: MATRIX, stageEvidence: INLINE_SECTION });

    expect(codes).toContain("QFAI-ATDD-133");
  });

  it("reports a section that links nothing", async () => {
    const codes = await codesFor({
      matrix: MATRIX,
      stageEvidence: "# ATDD\n\n## Coverage Depth Matrix\n\nTotals: 7 / 0 / 0.\n",
    });

    expect(codes).toContain("QFAI-ATDD-133");
  });

  it("accepts the template shape: a link plus totals", async () => {
    const codes = await codesFor({ matrix: MATRIX, stageEvidence: LINKED_SECTION });

    expect(codes).not.toContain("QFAI-ATDD-133");
  });

  it("does not read a table belonging to the next section", async () => {
    const codes = await codesFor({
      matrix: MATRIX,
      stageEvidence: `${LINKED_SECTION}\n| Gate | Result |\n| ---- | ------ |\n| full | PASS |\n`,
    });

    expect(codes).not.toContain("QFAI-ATDD-133");
  });

  it("says nothing about a spec with no stage evidence file", async () => {
    expect(await codesFor({ matrix: MATRIX })).not.toContain("QFAI-ATDD-133");
  });
});

describe("profile wiring", () => {
  it("surfaces the matrix gate from `--profile atdd`", async () => {
    // The gate is only real if the profile `/qfai-atdd` names actually runs it.
    const root = await seedProject({});
    const result = await validateProject(root, undefined, { profile: "atdd" });

    expect(result.issues.map((entry) => entry.code)).toContain("QFAI-ATDD-131");
  });
});

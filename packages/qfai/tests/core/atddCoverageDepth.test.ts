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

import { execFileSync } from "node:child_process";
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
  /** Body of `.qfai/evidence/.gitignore` — the legacy nested file — or absent. */
  nestedEvidenceGitignore?: string;
  /**
   * Declares `CON-API-0001` and annotates it from `tests/api/**`, the shape an
   * API-only spec has: no `TC-*` anywhere, because `test-layers.md` forbids one
   * there.
   */
  apiTest?: boolean;
  /** Body of `.qfai/specs/spec-0001/tdd/test-list.md`, or absent. */
  ledger?: string;
  /**
   * Puts the project at `packages/app-a/` of a git worktree whose root carries
   * this `.gitignore` — the monorepo shape, where git applies the parent file
   * to the matrix and a project-root-only enumeration never opens it.
   */
  worktreeGitignore?: string;
  /** Runs `git init` + `git add -f` on the matrix, so the index tracks it. */
  trackMatrix?: boolean;
};

async function seedProject(seed: Seed): Promise<string> {
  const base = await mkdtemp(path.join(os.tmpdir(), "qfai-coverage-depth-"));
  tempDirs.push(base);
  const root = seed.worktreeGitignore === undefined ? base : path.join(base, "packages", "app-a");
  if (seed.worktreeGitignore !== undefined) {
    // A bare marker is enough: the walk stops at the first `.git`, and it is
    // `path.dirname` that decides where the chain ends, not git itself.
    await mkdir(path.join(base, ".git"), { recursive: true });
    await writeFile(path.join(base, ".gitignore"), seed.worktreeGitignore, "utf-8");
    await mkdir(root, { recursive: true });
  }
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

  if (seed.ledger !== undefined) {
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "tdd", "test-list.md"), seed.ledger, "utf-8");
  }

  if (seed.annotated ?? true) {
    const testDir = path.join(root, "tests", "integration", "spec-0001");
    await mkdir(testDir, { recursive: true });
    await writeFile(
      path.join(testDir, "a.test.ts"),
      "// QFAI:SPEC-0001:TC-0001\nit('covers', () => {});\n",
      "utf-8",
    );
  }

  if (seed.apiTest ?? false) {
    const apiContractDir = path.join(root, ".qfai", "contracts", "api");
    await mkdir(apiContractDir, { recursive: true });
    await writeFile(
      path.join(apiContractDir, "widgets.yaml"),
      "# QFAI-CONTRACT-ID: CON-API-0001\nopenapi: 3.1.0\npaths: {}\n",
      "utf-8",
    );
    const apiTestDir = path.join(root, "tests", "api");
    await mkdir(apiTestDir, { recursive: true });
    await writeFile(
      path.join(apiTestDir, "widgets.test.ts"),
      "/* QFAI:CON-API-0001 */\nit('contracts', () => {});\n",
      "utf-8",
    );
  }

  const evidenceDir = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  if (seed.nestedEvidenceGitignore !== undefined) {
    await writeFile(path.join(evidenceDir, ".gitignore"), seed.nestedEvidenceGitignore, "utf-8");
  }
  if (seed.matrix !== undefined) {
    await writeFile(path.join(evidenceDir, "coverage-depth-spec-0001.md"), seed.matrix, "utf-8");
  }
  if (seed.stageEvidence !== undefined) {
    await writeFile(path.join(evidenceDir, "atdd-spec-0001.md"), seed.stageEvidence, "utf-8");
  }
  if (seed.trackMatrix ?? false) {
    const git = (args: string[]): void => {
      execFileSync("git", args, { cwd: root, stdio: ["ignore", "ignore", "ignore"] });
    };
    git(["init"]);
    // `-f` is the whole point: the file is ignored, and this is the project
    // that committed it anyway before the ignore line arrived.
    git(["add", "-f", "--", ".qfai/evidence/coverage-depth-spec-0001.md"]);
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
  // Verbatim the shape `qfai-atdd/SKILL.md` ships in its evidence template.
  "See `.qfai/evidence/coverage-depth-spec-0001.md` (committed). Totals: ✅ 7 / ⚠️ 0 / ❌ 0.",
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

  it("lets the legacy nested file re-include what a root block without the negation ignores", async () => {
    // Exactly this repository's state, and every project `qfai init` migrated:
    // the root block predates `!.qfai/evidence/coverage-depth-*.md`, and the
    // nested file re-includes the matrix. Git reports it as tracked — reading
    // the root file alone reported a `QFAI-ATDD-132` that `git check-ignore`
    // contradicts.
    const codes = await codesFor({
      matrix: MATRIX,
      gitignore: ".qfai/report/*\n.qfai/evidence/*\n",
      nestedEvidenceGitignore: "*\n!.gitignore\n!coverage-depth-*.md\n",
    });

    expect(codes).not.toContain("QFAI-ATDD-132");
  });

  it("reports a parent `.gitignore` above the project root", async () => {
    // A monorepo project root is not the worktree root, and git applies every
    // `.gitignore` from the worktree root down — so a parent rule really does
    // keep the matrix out of history while an enumeration that starts at the
    // project root sees nothing wrong.
    const codes = await codesFor({
      matrix: MATRIX,
      gitignore: ".qfai/report/*\n.qfai/evidence/*\n",
      worktreeGitignore: "packages/*/.qfai/evidence/coverage-depth-*.md\n",
    });

    expect(codes).toContain("QFAI-ATDD-132");
  });

  it("lets the project's own negation outrank that parent rule", async () => {
    // The other half of the same precedence rule: the deeper file has the last
    // word, so the managed block at the project root re-includes what the
    // worktree root ignored — and git agrees.
    const codes = await codesFor({
      matrix: MATRIX,
      worktreeGitignore: "packages/*/.qfai/evidence/coverage-depth-*.md\n",
    });

    expect(codes).not.toContain("QFAI-ATDD-132");
  });

  it("accepts a matrix git already tracks despite a matching ignore line", async () => {
    // `.gitignore` does not untrack anything: the audit record is in history
    // and its edits still stage, so erroring here would block a project for a
    // state git itself considers fine.
    const codes = await codesFor({
      matrix: MATRIX,
      gitignore: ".qfai/report/*\n.qfai/evidence/*\n",
      trackMatrix: true,
    });

    expect(codes).not.toContain("QFAI-ATDD-132");
  });

  it("reports a nested re-ignore that outranks the root negation", async () => {
    // The other direction, and the one a root-only read silently missed: the
    // deepest matching file has the last word, so a nested `*` with no
    // `!coverage-depth-*.md` under it swallows a matrix the managed block
    // re-included.
    const codes = await codesFor({
      matrix: MATRIX,
      nestedEvidenceGitignore: "*\n!.gitignore\n!decision-*.md\n",
    });

    expect(codes).toContain("QFAI-ATDD-132");
  });
});

describe("QFAI-ATDD-131 over an API-only spec", () => {
  const API_LEDGER = [
    "# test-list",
    "",
    "## Ledger",
    "",
    "| TDD-ID | TC-Refs | US-Refs | CON-API-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
    "| ------ | ------- | ------- | ------------ | ----- | --------- | -------- | ------ | ----- | -------- |",
    "| TDD-0001 | - | - | CON-API-0001 | API | tests/api/widgets.test.ts | contracts | done | - | GREEN pass |",
    "",
  ].join("\n");

  it("reports the missing matrix for a spec whose only ATDD test is an API one", async () => {
    // `QFAI:CON-API-*` names a contract, never a spec, so `refs.us` / `refs.tc`
    // stay empty here. The ledger's `CON-API-Refs` cell is what ties the test
    // back to the spec that owes the matrix.
    const codes = await codesFor({ annotated: false, apiTest: true, ledger: API_LEDGER });

    expect(codes).toContain("QFAI-ATDD-131");
  });

  it("stays silent once that spec's matrix is written", async () => {
    const codes = await codesFor({
      annotated: false,
      apiTest: true,
      ledger: API_LEDGER,
      matrix: MATRIX,
    });

    expect(codes).not.toContain("QFAI-ATDD-131");
  });

  it("demands nothing from a ledger row whose contract has no test", async () => {
    // The bar is the same one the US/TC side applies: a test the scan found,
    // not an obligation somebody wrote down.
    const codes = await codesFor({ annotated: false, ledger: API_LEDGER });

    expect(codes).not.toContain("QFAI-ATDD-131");
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

  it("reports a link with no totals beside it", async () => {
    // The section owes both halves. A bare pointer leaves the reviewer with no
    // coverage summary at all, which is the half the template puts here so the
    // matrix does not have to be opened to see the shape of the result.
    const codes = await codesFor({
      matrix: MATRIX,
      stageEvidence: "# ATDD\n\n## Coverage Depth Matrix\n\nSee coverage-depth-spec-0001.md\n",
    });

    expect(codes).toContain("QFAI-ATDD-133");
  });

  it("reports an evidence file with no `## Coverage Depth Matrix` section at all", async () => {
    // The section is a required output of the stage, so a file that never
    // wrote one is the most incomplete shape there is — not the one shape the
    // gate skips.
    const codes = await codesFor({
      matrix: MATRIX,
      stageEvidence: "# ATDD\n\n## Final status (PASS/FAIL) + who confirmed\n\nPASS\n",
    });

    expect(codes).toContain("QFAI-ATDD-133");
  });

  it("reports a legend that carries the three signs but no counts", async () => {
    const codes = await codesFor({
      matrix: MATRIX,
      stageEvidence: [
        "# ATDD",
        "",
        "## Coverage Depth Matrix",
        "",
        "See `.qfai/evidence/coverage-depth-spec-0001.md`; Legend: ✅ covered / ⚠ partial / ❌ missing",
        "",
      ].join("\n"),
    });

    expect(codes).toContain("QFAI-ATDD-133");
  });

  it("reports a reference that only contains the file name as a substring", async () => {
    const codes = await codesFor({
      matrix: MATRIX,
      stageEvidence: [
        "# ATDD",
        "",
        "## Coverage Depth Matrix",
        "",
        "See `.qfai/evidence/coverage-depth-spec-0001.md.bak`. Totals: ✅ 7 / ⚠️ 0 / ❌ 0.",
        "",
      ].join("\n"),
    });

    expect(codes).toContain("QFAI-ATDD-133");
  });

  it("reports prose that names the matrix without pointing at it", async () => {
    const codes = await codesFor({
      matrix: MATRIX,
      stageEvidence: [
        "# ATDD",
        "",
        "## Coverage Depth Matrix",
        "",
        "coverage-depth-spec-0001.md は使用しない。Totals: ✅ 7 / ⚠️ 0 / ❌ 0.",
        "",
      ].join("\n"),
    });

    expect(codes).toContain("QFAI-ATDD-133");
  });

  it("accepts a markdown link written relative to the evidence directory", async () => {
    const codes = await codesFor({
      matrix: MATRIX,
      stageEvidence: [
        "# ATDD",
        "",
        "## Coverage Depth Matrix",
        "",
        "See [matrix](coverage-depth-spec-0001.md) (committed). Totals: ✅ 7 / ⚠️ 0 / ❌ 0.",
        "",
      ].join("\n"),
    });

    expect(codes).not.toContain("QFAI-ATDD-133");
  });

  it("accepts a bare ⚠ without the variation selector", async () => {
    const codes = await codesFor({
      matrix: MATRIX,
      stageEvidence: [
        "# ATDD",
        "",
        "## Coverage Depth Matrix",
        "",
        "See `.qfai/evidence/coverage-depth-spec-0001.md` (committed). Totals: ✅ 7 / ⚠ 0 / ❌ 0.",
        "",
      ].join("\n"),
    });

    expect(codes).not.toContain("QFAI-ATDD-133");
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

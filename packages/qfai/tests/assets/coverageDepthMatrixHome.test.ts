/**
 * `/qfai-atdd` gates completion on the Coverage Depth Matrix in three places —
 * Mandatory Output 2, a Definition-of-Done condition and a Not-done criterion —
 * and `qa-gatekeeper` REVISEs when it is missing. Nothing said where it goes.
 *
 * The only file the skill mandated writing is `.qfai/evidence/atdd-<spec-id>.md`,
 * whose eleven Required sections had no slot for it, and which the managed
 * `.gitignore` block ignores. So the judgement that discharges the gate — *why*
 * a `❌` cell is acceptable — was guaranteed never to reach a commit, and at any
 * later commit "unjustified ❌" was unfalsifiable.
 *
 * The matrix now has its own committed home. These tests pin the negation and
 * the three places that have to agree with it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_RECOMMENDED_ENTRIES,
} from "../../src/core/gitignore.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const MATRIX_HOME = ".qfai/evidence/coverage-depth-*.md";
const NEGATION = `!${MATRIX_HOME}`;

const SKILL = "assistant/skills/qfai-atdd/SKILL.md";
const CHECKLIST = "assistant/skills/qfai-atdd/references/test-case-depth-checklist.md";
const GATEKEEPER = "assistant/agents/qa-gatekeeper.md";
const ANALYST = "assistant/agents/test-design-analyst.md";
const CATALOG = "assistant/manifest/agent-catalog.yml";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

describe("the matrix's home is a committed path", () => {
  it("is negated in the managed block", () => {
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain(NEGATION);
    expect(QFAI_GITIGNORE_BLOCK).toContain(NEGATION);
  });

  it("is negated after the ignore line it undoes, so git's last-match rule keeps it", () => {
    // A negation placed above `.qfai/evidence/*` is inert — the exact failure
    // `governanceNegationsEffective` exists to catch.
    const lines = QFAI_GITIGNORE_BLOCK.split("\n");
    expect(lines.indexOf(NEGATION)).toBeGreaterThan(lines.indexOf(".qfai/evidence/*"));
  });

  it("stays out of the recommended entries, so an existing project keeps its own choices", () => {
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain(NEGATION);
  });
});

describe.each(TREES)("%s", (tree) => {
  it("names the file as Mandatory Output 2", async () => {
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "**Coverage Depth Matrix**, written to `.qfai/evidence/coverage-depth-<spec-id>.md`",
    );
  });

  it("gives the stage evidence a section that links out instead of restating", async () => {
    // The eleven Required sections had no matrix slot at all, which is why the
    // matrix landed in free-form body text in the first place.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "**Coverage Depth Matrix** — a link to `.qfai/evidence/coverage-depth-<spec-id>.md`",
    );
    expect(skill).toContain("## Coverage Depth Matrix");
  });

  it("says why the matrix is not regenerable stage evidence", async () => {
    // The skill keeps the obligation; the reasoning moved to the checklist that
    // owns the matrix, under the 500-line ceiling.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("**The matrix is a governance record, not a log**, so it is committed");
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("## Where the matrix lives");
    // `*why*`, not `_why_`: prettier normalises markdown emphasis, so pinning
    // the wrong form would fail the moment `format:check` ran.
    expect(checklist).toContain("It does not recompute _why_ an uncoverable obligation was");
  });

  it("the depth checklist states the home and that a justification must survive", async () => {
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("**Home: `.qfai/evidence/coverage-depth-<spec-id>.md`.**");
    expect(checklist).toContain("**A justification counts only where it survives.**");
  });

  it("qa-gatekeeper reads the committed file and calls the other one missing", async () => {
    for (const rel of [GATEKEEPER, CATALOG]) {
      const text = flat(await read(tree, rel));
      expect(text).toContain(
        "Confirm a Coverage Depth Matrix exists at `.qfai/evidence/coverage-depth-<spec-id>.md`",
      );
      expect(text).toContain(
        "A matrix that exists only inside `.qfai/evidence/atdd-<spec-id>.md` is a **missing** matrix",
      );
    }
  });

  it("does not describe committed item evidence as ignored", async () => {
    for (const rel of [GATEKEEPER, CATALOG]) {
      const text = flat(await read(tree, rel));
      expect(text).toContain(
        "a committed governance path alongside `implement-<spec-id>.md` and `atdd-<spec-id>.md`",
      );
      expect(text).toContain("Only run-scoped evidence remains ignored");
      expect(text).not.toContain("a committed path, unlike the rest of `.qfai/evidence/**`");
    }
  });

  it("test-design-analyst writes it there, in both its copies", async () => {
    for (const rel of [ANALYST, CATALOG]) {
      const text = flat(await read(tree, rel));
      expect(text).toContain("Destination: `.qfai/evidence/coverage-depth-<spec-id>.md`");
      expect(text).not.toContain(
        "Destination: `.qfai/evidence/atdd-<spec-id>.md` from the ATDD stage onward",
      );
    }
  });
});

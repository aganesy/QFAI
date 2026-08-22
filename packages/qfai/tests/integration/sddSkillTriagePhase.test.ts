import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SKILL_MD_MAX_LINES } from "../helpers/skillBudget.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = path.resolve(
  here,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-sdd",
  "SKILL.md",
);
const TRIAGE_REF_PATH = path.resolve(
  here,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-sdd",
  "references",
  "sdd-triage.md",
);

const REQUIRED_OPS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "SPLIT",
  "MERGE",
  "SUPERSEDE",
  "APPEND",
  "MODIFY",
  "REMOVE",
] as const;

describe("qfai-sdd SKILL.md surface", () => {
  it("declares Stage 1 Triage in the workflow header", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    expect(skill).toMatch(/Stage 1 Triage/);
    expect(skill).toMatch(/Stage 0 Preflight/);
    expect(skill).toMatch(/Phase 0 Contracts-first/);
  });

  it("lists every triage operation and sub-op", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    for (const op of REQUIRED_OPS) {
      expect(skill, `missing operation token "${op}"`).toMatch(new RegExp(`\\b${op}\\b`));
    }
  });

  it("references the spec status enum values", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    for (const status of ["active", "superseded", "deprecated", "removed"]) {
      expect(skill, `missing status "${status}"`).toMatch(new RegExp(`\\b${status}\\b`));
    }
  });

  it("links to the Stage 1 Triage reference doc", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    expect(skill).toMatch(/references\/sdd-triage\.md/);
  });

  it("calls out the QFAI-STATUS and QFAI-TRIAGE validator code prefixes", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    expect(skill).toMatch(/QFAI-STATUS-001/);
    expect(skill).toMatch(/QFAI-TRIAGE-001/);
    expect(skill).toMatch(/QFAI-TRIAGE-006/);
  });

  it("documents the append-first principle in Stage 1 Triage", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    expect(skill).toMatch(/[Aa]ppend-first/);
  });

  it("stays under the SKILL.md size budget", async () => {
    const skill = await readFile(SKILL_PATH, "utf-8");
    const lines = skill.split(/\r?\n/);
    // Same ceiling as every other skill (see SKILL_MD_MAX_LINES). This number
    // had been raised 280 -> 310 on its own while three other files carried
    // different values for the same kind of file.
    expect(lines.length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
  });
});

describe("references/sdd-triage.md", () => {
  it("documents the 8 operations and their approval status", async () => {
    const ref = await readFile(TRIAGE_REF_PATH, "utf-8");
    for (const op of [
      "CREATE",
      "DELETE",
      "SPLIT",
      "MERGE",
      "SUPERSEDE",
      "APPEND",
      "MODIFY",
      "REMOVE",
    ]) {
      expect(ref, `triage ref missing "${op}"`).toMatch(new RegExp(`\\b${op}\\b`));
    }
    expect(ref).toMatch(/Approved By/);
    expect(ref).toMatch(/QFAI-TRIAGE-005/);
    expect(ref).toMatch(/QFAI-TRIAGE-006/);
  });

  it("tells SUPERSEDE / deprecation to migrate the ledger before retiring", async () => {
    // Without this step, demoting a retired spec's ledger findings to `info`
    // silently strands its unfinished rows instead of moving them.
    const ref = await readFile(TRIAGE_REF_PATH, "utf-8");
    expect(ref).toMatch(/tdd\/test-list\.md/);
    expect(ref).toMatch(/exception/);
    expect(ref).toMatch(/`done` rows/);
    expect(ref).toMatch(/info/);
  });

  it("lists every non-done ledger status as live work to migrate", async () => {
    // `blocked` (never started) and `review-fix` (a reviewer's REVISE still
    // owed) are obligations too: omitted from the migration, they are retired
    // along with the spec and nothing asks for them again.
    const ref = await readFile(TRIAGE_REF_PATH, "utf-8");
    for (const status of ["todo", "blocked", "red", "green", "refactor", "review-fix"]) {
      expect(ref).toContain(`\`${status}\``);
    }
  });

  it("tells the migration to remap TC-Refs into the successor's namespace", async () => {
    // TC IDs are spec-namespaced, so TC-Refs copied verbatim fail
    // `TDDLIST_UNKNOWN_REF` in the successor and leave its own TCs uncovered.
    const ref = await readFile(TRIAGE_REF_PATH, "utf-8");
    expect(ref).toMatch(/TC-Refs/);
    expect(ref).toMatch(/TDDLIST_UNKNOWN_REF/);
    expect(ref).toMatch(/06_Test-Cases\.md/);
  });

  it("tells the migration to remap US-Refs too", async () => {
    // A `Layer=E2E` row carries its obligation in `US-Refs`, and US IDs are
    // spec-namespaced the same way TC IDs are. Nothing catches a copied one:
    // `validateObligationColumn()` checks shape and Layer, not existence, so
    // the migrated row keeps pointing at the retired spec's user story.
    const ref = await readFile(TRIAGE_REF_PATH, "utf-8");
    expect(ref).toMatch(/US-Refs/);
    expect(ref).toMatch(/02_User-stories\.md/);
    expect(ref).toMatch(/Layer=E2E/);
  });

  it("tells the migration to renumber TDD-IDs in the successor", async () => {
    // `TDD-NNNN` is ledger-local, so two ledgers both starting at `TDD-0001`
    // collide on copy: the migrated row fails `TDDLIST_DUPLICATE_ID` while the
    // source row is already demoted to `info`.
    const ref = await readFile(TRIAGE_REF_PATH, "utf-8");
    expect(ref).toMatch(/TDDLIST_DUPLICATE_ID/);
    expect(ref).toMatch(/TDD-ID/);
  });

  it("requires Superseded-by to name an active spec other than the source", async () => {
    // A missing, self- or already-retired successor inherits nothing, so the
    // source keeps gating — the operator has to know that before rewriting
    // `Status:`.
    const ref = await readFile(TRIAGE_REF_PATH, "utf-8");
    expect(ref).toMatch(/Superseded-by/);
    expect(ref).toMatch(/\*\*active\*\*/);
  });

  it("documents the append-first principle and impact cascade", async () => {
    const ref = await readFile(TRIAGE_REF_PATH, "utf-8");
    expect(ref).toMatch(/append-first/i);
    expect(ref).toMatch(/[Ii]mpact cascade/);
  });
});

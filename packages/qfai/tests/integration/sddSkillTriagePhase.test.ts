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

  it("documents the append-first principle and impact cascade", async () => {
    const ref = await readFile(TRIAGE_REF_PATH, "utf-8");
    expect(ref).toMatch(/append-first/i);
    expect(ref).toMatch(/[Ii]mpact cascade/);
  });
});

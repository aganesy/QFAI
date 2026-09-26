/**
 * Integration test for spec-0013 CHG-005 TC-0013-0025.
 *
 * Verifies that every screen in the shipped /qfai-sdd UI contract template
 * carries a `primary_tasks` key holding a list, and that the
 * requirements-analyst agent guide instructs authors to give each screen at
 * least one primary task.
 *
 * The key has to be present and be a list; what the template puts in it is
 * not this test's subject. It ships filled entries, because a template that
 * emits an empty list hands the author a document that does not validate.
 */
// QFAI:EX-0001-0159-01

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

const TEMPLATE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
  "templates",
  "contracts",
  "ui-contract.sample.yaml",
);

const AGENT_GUIDE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "agent",
  "requirements-analyst.md",
);

type ParsedScreens = {
  screens?: Array<Record<string, unknown>>;
};

describe("TC-0013-0025: shipped ui-contract.sample.yaml carries a primary_tasks list per screen", () => {
  it("template parses with every screens[] entry exposing a primary_tasks slot", async () => {
    const raw = await readFile(TEMPLATE_PATH, "utf-8");
    const parsed = parseYaml(raw) as ParsedScreens;

    expect(parsed).toBeTruthy();
    expect(Array.isArray(parsed.screens)).toBe(true);
    expect((parsed.screens ?? []).length).toBeGreaterThan(0);

    for (const screen of parsed.screens ?? []) {
      expect(Object.hasOwn(screen, "primary_tasks")).toBe(true);
      // The slot must be an array (possibly empty placeholder), not null/string.
      expect(Array.isArray(screen.primary_tasks)).toBe(true);
    }
  });

  it("requirements-analyst guide instructs >=1 primary_task per screen", async () => {
    const content = await readFile(AGENT_GUIDE_PATH, "utf-8");
    // The optional backtick admits the field name written as code, which is
    // how the rest of the guide writes one. Without it the assertion fails
    // on correct formatting, which says nothing about the instruction.
    const pattern = /(>=\s*1|≥\s*1|at least one)\s*`?primary[_\s-]?task/i;
    expect(content).toMatch(pattern);
  });
});

const SDD_SKILL_DIR = path.resolve(TEMPLATE_PATH, "..", "..", "..");

const LEGACY_DESIGN_CONTRACTS = [
  "exploration-brief.yaml",
  "evaluation-rubric.yaml",
  "evaluator-calibration.yaml",
  "selected-direction.yaml",
  "reference-pool.yaml",
  "brand-design.yaml",
];

describe("shipped primary_tasks ceiling", () => {
  // QFAI:AC-0001-0161-01
  // QFAI:EX-0001-0161-01
  it("documents a ceiling of 7 and no floor in the template and the guide", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf-8");
    expect(template).toContain("Recommended ceiling: at most 7 entries per screen (QFAI-AUD-020).");

    const guide = await readFile(
      path.join(SDD_SKILL_DIR, "references", "ui-contract-guide.md"),
      "utf-8",
    );
    expect(guide).toContain("## Recommended ceiling: at most 7");
    expect(guide).toMatch(/\| 1\.\.7 +\| passes silently/);
    expect(guide).toMatch(/\| 8\+ +\| `QFAI-AUD-020` warning/);
  });
});

describe("shipped qfai-sdd design contracts", () => {
  // QFAI:EX-0001-0158-01
  // QFAI:EX-0001-0158-02
  it("writes no legacy design contract and lists the removed ones", async () => {
    const templates = await readdir(path.join(SDD_SKILL_DIR, "templates"), { recursive: true });
    const names = templates.map((entry) => path.basename(entry));
    for (const legacy of LEGACY_DESIGN_CONTRACTS) {
      expect(names).not.toContain(legacy);
    }

    const normalization = await readFile(
      path.join(SDD_SKILL_DIR, "references", "ui-design-contract-normalization.md"),
      "utf-8",
    );
    expect(normalization).toContain("MUST NOT be generated");
    expect(normalization).toContain("Add the lock YAML to `<paths.contractsDir>/contracts.md`");
    expect(normalization).toContain("design-system.yaml");
    expect(normalization).toContain("prototype-handoff.yaml");
  });
});

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
// QFAI:SPEC-0013:TC-0013-0025

import { readFile } from "node:fs/promises";
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
  "skills",
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
  "agents",
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

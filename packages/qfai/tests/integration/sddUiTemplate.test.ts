/**
 * Integration test for spec-0013 CHG-005 TC-0013-0025.
 *
 * Verifies that the shipped /qfai-sdd UI contract template exposes a
 * `primary_tasks: []` slot per screen, and that the requirements-analyst
 * agent guide instructs authors to populate at least one primary task per
 * screen.
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

describe("TC-0013-0025: shipped ui-contract.sample.yaml carries primary_tasks: [] slot per screen", () => {
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
    const pattern = /(>=\s*1|≥\s*1|at least one)\s*primary[_\s-]?task/i;
    expect(content).toMatch(pattern);
  });
});

/**
 * Validator: skillDocReferences (.qfai/assistant/skills/<skill>/SKILL.md).
 *
 * Covers TC-0004-0023 (project_memory enforcement) and TC-0004-0024
 * (W-SKILL-DOC-BROKEN-REF).
 */
// QFAI:SPEC-0004:TC-0004-0023
// QFAI:SPEC-0004:TC-0004-0024
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateSkillDocReferences } from "../../src/core/validators/skillDocReferences.js";
import { loadConfig } from "../../src/core/config.js";

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-${prefix}-`));
}

async function seedSkill(root: string, id: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), body, "utf-8");
}

async function getConfig(root: string) {
  const r = await loadConfig(root);
  return r.config;
}

describe("skillDocReferences validator", () => {
  it("returns no issues when no skills dir exists", async () => {
    const root = await newRoot("skill-absent");
    try {
      const issues = await validateSkillDocReferences(root, await getConfig(root));
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0023: project_memory required
  it("TC-0004-0023: emits warning when qfai-implement/SKILL.md is missing project_memory:", async () => {
    const root = await newRoot("skill-projmem");
    try {
      await seedSkill(
        root,
        "qfai-implement",
        ["## /qfai-implement", "", "body content without trailing project_memory block.", ""].join(
          "\n",
        ),
      );
      const issues = await validateSkillDocReferences(root, await getConfig(root));
      const projMem = issues.filter((i) => i.rule === "skillDocReferences.projectMemory");
      expect(projMem.length).toBe(1);
      expect(projMem[0]?.message).toContain("qfai-implement");
      expect(projMem[0]?.message).toContain("project_memory");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not emit project_memory warning when the block is present", async () => {
    const root = await newRoot("skill-projmem-ok");
    try {
      await seedSkill(
        root,
        "qfai-implement",
        [
          "## /qfai-implement",
          "",
          "body content here.",
          "",
          "project_memory:",
          "  - one liner remembered context",
          "",
        ].join("\n"),
      );
      const issues = await validateSkillDocReferences(root, await getConfig(root));
      const projMem = issues.filter((i) => i.rule === "skillDocReferences.projectMemory");
      expect(projMem.length).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0024: W-SKILL-DOC-BROKEN-REF
  it("TC-0004-0024: emits W-SKILL-DOC-BROKEN-REF for legacy .qfai/assistant/steering/ refs in a SKILL.md", async () => {
    const root = await newRoot("skill-brokenref");
    try {
      await seedSkill(
        root,
        "qfai-sdd",
        [
          "## /qfai-sdd",
          "",
          "Route specialist reviewers from `.qfai/assistant/steering/agent-routing.yml`.",
          "",
          "project_memory:",
          "  - none",
        ].join("\n"),
      );
      const issues = await validateSkillDocReferences(root, await getConfig(root));
      const broken = issues.filter((i) => i.code === "W-SKILL-DOC-BROKEN-REF");
      expect(broken.length).toBe(1);
      expect(broken[0]?.message).toContain("agent-routing.yml has moved");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

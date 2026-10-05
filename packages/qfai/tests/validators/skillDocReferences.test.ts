/**
 * Validator: skillDocReferences (.qfai/assistant/skill/<skill>/SKILL.md).
 *
 * Covers TC-0004-0023 (project_memory shape).
 */
// QFAI:EX-0001-0045-02
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
  const dir = path.join(root, ".qfai", "assistant", "skill", id);
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

  // QFAI:EX-0001-0045-02
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

  // TC-0004-0023 (mid-file project_memory): block not at SKILL.md tail fires
  // QFAI:EX-0001-0045-02
  it("TC-0004-0023 (mid-file): project_memory: block followed by another heading fires the not-trailing warning", async () => {
    const root = await newRoot("skill-projmem-midfile");
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
          "## Trailing Section After project_memory",
          "",
          "This breaks the trailing invariant; the block is no longer at the tail.",
        ].join("\n"),
      );
      const issues = await validateSkillDocReferences(root, await getConfig(root));
      const projMem = issues.filter((i) => i.rule === "skillDocReferences.projectMemory");
      expect(projMem.length).toBe(1);
      expect(projMem[0]?.code).toBe("W-SKILL-PROJECT-MEMORY");
      expect(projMem[0]?.severity).toBe("warning");
      expect(projMem[0]?.message).toContain("qfai-implement");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0023 (prose-mention): mid-file project_memory: declaration line
  // does NOT shadow the real trailing block. Use a fixture where the FIRST
  // occurrence is itself at start-of-line (so it matches the regex), but a
  // markdown heading appears AFTER it, AND a real `project_memory:` block
  // follows at the tail. The "last occurrence" branch is the only thing
  // that makes this case pass.
  it("TC-0004-0023 (prose-mention): mid-file project_memory: line followed by heading + real trailing block does NOT mis-flag", async () => {
    const root = await newRoot("skill-projmem-prose");
    try {
      await seedSkill(
        root,
        "qfai-implement",
        [
          "## /qfai-implement",
          "",
          "Example of a project_memory: declaration:",
          "",
          // First occurrence — mid-file, matches `^\s*project_memory:`.
          // Without "last occurrence" logic, the post-block walk would
          // hit the `## Real Body` heading below and false-fire.
          "project_memory:",
          "  - example placeholder",
          "",
          "## Real Body",
          "",
          "More body.",
          "",
          // Real trailing block (must be picked by "last occurrence").
          "project_memory:",
          "  - real declaration",
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

  // TC-0004-0023 (mapping-form): YAML mapping form is accepted as a valid trailing block
  it("TC-0004-0023 (mapping-form): YAML mapping form trailing block does NOT fire the warning", async () => {
    const root = await newRoot("skill-projmem-mapping");
    try {
      await seedSkill(
        root,
        "qfai-implement",
        [
          "## /qfai-implement",
          "",
          "body content.",
          "",
          "project_memory:",
          "  scope: spec-0003",
          "  notes: remembers the recut layer mapping",
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

  // TC-0004-0023 (indented-prose): indented prose continuation is NOT accepted as YAML
  it("TC-0004-0023 (indented-prose): indented prose paragraph after a list item still fires the warning", async () => {
    const root = await newRoot("skill-projmem-indented-prose");
    try {
      await seedSkill(
        root,
        "qfai-implement",
        [
          "## /qfai-implement",
          "",
          "body content.",
          "",
          "project_memory:",
          "  - real list item",
          "  And a continuation paragraph that is actually prose, indented for readability.",
          "",
        ].join("\n"),
      );
      const issues = await validateSkillDocReferences(root, await getConfig(root));
      const projMem = issues.filter((i) => i.rule === "skillDocReferences.projectMemory");
      expect(projMem.length).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

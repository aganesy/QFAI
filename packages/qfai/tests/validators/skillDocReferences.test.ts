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

import {
  brokenRefSeverity,
  validateSkillDocReferences,
} from "../../src/core/validators/skillDocReferences.js";
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

  // TC-0004-0024 (severity): W-SKILL-DOC-BROKEN-REF severity branches per running tool version
  it("TC-0004-0024 (severity): W-SKILL-DOC-BROKEN-REF severity is warning|error and message branches with it", async () => {
    const root = await newRoot("skill-brokenref-sev");
    try {
      await seedSkill(
        root,
        "qfai-sdd",
        [
          "## /qfai-sdd",
          "",
          "See `.qfai/assistant/steering/agent-catalog.yml`.",
          "",
          "project_memory:",
          "  - none",
        ].join("\n"),
      );
      const issues = await validateSkillDocReferences(root, await getConfig(root));
      const broken = issues.filter((i) => i.code === "W-SKILL-DOC-BROKEN-REF");
      expect(broken.length).toBe(1);
      const severity = broken[0]?.severity;
      expect(["warning", "error"]).toContain(severity);
      // Headline shape MUST track the severity so consumers know which
      // mode fired (warning during window, error past sunset).
      if (severity === "error") {
        expect(broken[0]?.message).toContain("past the announced sunset");
      } else {
        expect(broken[0]?.message).toContain("Read-compatible only");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0023 (mid-file project_memory): block not at SKILL.md tail still fires
  it("TC-0004-0023 (mid-file): project_memory: block followed by another heading still fires the missing-trailing warning", async () => {
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

  // TC-0004-0024 (severity-helper): unit-level pre/post/boundary mode
  it("TC-0004-0024 (severity-helper): brokenRefSeverity returns warning pre-sunset, error at-or-past sunset", () => {
    // sunset is 1.10.0 (LEGACY_STEERING_SUNSET)
    expect(brokenRefSeverity("1.9.0")).toBe("warning");
    expect(brokenRefSeverity("1.9.99")).toBe("warning");
    // boundary: sunset minor exactly
    expect(brokenRefSeverity("1.10.0")).toBe("error");
    expect(brokenRefSeverity("1.10.5")).toBe("error");
    // major past sunset
    expect(brokenRefSeverity("2.0.0")).toBe("error");
    // malformed → warning (defensive default)
    expect(brokenRefSeverity("not-a-version")).toBe("warning");
  });

  // TC-0004-0024 (qfai-scope): user-defined non-qfai-* skill is NOT flagged
  it("TC-0004-0024 (qfai-scope): non-qfai-* skill does NOT fire W-SKILL-DOC-BROKEN-REF", async () => {
    const root = await newRoot("skill-brokenref-scope");
    try {
      await seedSkill(
        root,
        "my-custom-skill",
        ["## /my-custom-skill", "", "Loads `.qfai/assistant/steering/agent-catalog.yml`.", ""].join(
          "\n",
        ),
      );
      const issues = await validateSkillDocReferences(root, await getConfig(root));
      const broken = issues.filter((i) => i.code === "W-SKILL-DOC-BROKEN-REF");
      expect(broken.length).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

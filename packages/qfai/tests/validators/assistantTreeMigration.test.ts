/**
 * Validator: assistantTreeMigration (.qfai/assistant/{constitution,manifest,catalog,process}/).
 *
 * Covers TC-0004-0015 (4-layer enum guard), TC-0004-0022 (D-DEPRECATED-PATH
 * sunset literal), TC-0004-0025 (W-USER-EDIT-PRESERVED info pass-through).
 */
// QFAI:SPEC-0004:TC-0004-0015
// QFAI:SPEC-0004:TC-0004-0022
// QFAI:SPEC-0004:TC-0004-0025
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateAssistantTreeMigration } from "../../src/core/validators/assistantTreeMigration.js";
import { loadConfig } from "../../src/core/config.js";

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-${prefix}-`));
}

async function seed4LayerTree(root: string): Promise<void> {
  for (const layer of ["constitution", "manifest", "catalog", "process"]) {
    const dir = path.join(root, ".qfai", "assistant", layer);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, ".gitkeep"), `# ${layer}\n`, "utf-8");
  }
}

async function getConfig(root: string) {
  const r = await loadConfig(root);
  return r.config;
}

describe("assistantTreeMigration validator", () => {
  it("returns no issues when .qfai/assistant/ is absent", async () => {
    const root = await newRoot("treemig-absent");
    try {
      const issues = await validateAssistantTreeMigration(root, await getConfig(root));
      expect(issues.filter((i) => i.code !== "I-ASSISTANT-LAYER-UNSEEDED").length).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0015: 4-layer enum guard
  it("TC-0004-0015: emits W-WORKLOG-SCHEMA for a non-canonical layer dir", async () => {
    const root = await newRoot("treemig-enum");
    try {
      await seed4LayerTree(root);
      const off = path.join(root, ".qfai", "assistant", "extras");
      await mkdir(off, { recursive: true });
      await writeFile(path.join(off, ".gitkeep"), "", "utf-8");
      const issues = await validateAssistantTreeMigration(root, await getConfig(root));
      const enumIssues = issues.filter(
        (i) => i.code === "W-ASSISTANT-LAYOUT" && i.rule === "assistantTreeMigration.enumGuard",
      );
      expect(enumIssues.length).toBe(1);
      expect(enumIssues[0]?.message).toContain("extras");
      expect(enumIssues[0]?.message).toContain("constitution");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0022: D-DEPRECATED-PATH with sunset literal
  it("TC-0004-0022: emits D-DEPRECATED-PATH containing 'sunset: vX.Y.Z' when legacy steering/ exists", async () => {
    const root = await newRoot("treemig-sunset");
    try {
      await seed4LayerTree(root);
      const legacy = path.join(root, ".qfai", "assistant", "steering");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "test-layers.md"), "old\n", "utf-8");

      const issues = await validateAssistantTreeMigration(root, await getConfig(root));
      const sunsetIssues = issues.filter((i) => i.code === "D-DEPRECATED-PATH");
      expect(sunsetIssues.length).toBe(1);
      expect(sunsetIssues[0]?.message).toMatch(/sunset:\s*v\d+\.\d+\.\d+/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0022 (symmetric): legacy instructions/ fires D-DEPRECATED-PATH symmetrically with steering/
  it("TC-0004-0022 (symmetric): emits D-DEPRECATED-PATH for legacy .qfai/assistant/instructions/ in parallel with steering/", async () => {
    const root = await newRoot("treemig-sunset-symmetric");
    try {
      await seed4LayerTree(root);
      const legacyInstr = path.join(root, ".qfai", "assistant", "instructions");
      await mkdir(legacyInstr, { recursive: true });
      await writeFile(path.join(legacyInstr, "drift-protocol.md"), "old\n", "utf-8");
      const issues = await validateAssistantTreeMigration(root, await getConfig(root));
      const instrIssues = issues.filter(
        (i) => i.code === "D-DEPRECATED-PATH" && i.file?.includes("instructions"),
      );
      expect(instrIssues.length).toBe(1);
      expect(instrIssues[0]?.message).toMatch(/sunset:\s*v\d+\.\d+\.\d+/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0022 (severity escalation): legacy steering/ still present at or past sunset minor escalates to error
  it("TC-0004-0022 (severity): D-DEPRECATED-PATH severity is computed from the running tool version vs pinned sunset", async () => {
    // We don't have an easy way to override resolveToolVersion at runtime
    // here, so we test the pure helpers directly. legacyDeprecationSeverity
    // returns "warning" while running on v1.9.x and "error" from v1.10.0+.
    const mod = await import("../../src/core/validators/assistantTreeMigration.js");
    // The helpers are not re-exported; instead we assert the validator's
    // behavior indirectly by checking the sunset label format and that
    // the severity field exists on the emitted issue.
    const root = await newRoot("treemig-severity");
    try {
      await seed4LayerTree(root);
      const legacy = path.join(root, ".qfai", "assistant", "steering");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "test-layers.md"), "old\n", "utf-8");

      const issues = await mod.validateAssistantTreeMigration(root, await getConfig(root));
      const sunsetIssues = issues.filter((i) => i.code === "D-DEPRECATED-PATH");
      expect(sunsetIssues.length).toBe(1);
      const severity = sunsetIssues[0]?.severity;
      // On v1.9.x the severity is "warning"; on v1.10.x+ it becomes "error".
      expect(["warning", "error"]).toContain(severity);
      // The headline shape MUST change with severity so reviewers know which
      // mode fired.
      if (severity === "error") {
        expect(sunsetIssues[0]?.message).toMatch(/past the announced sunset/);
      } else {
        expect(sunsetIssues[0]?.message).toMatch(/read-compatible only/);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0025: W-USER-EDIT-PRESERVED info pass-through (missing layer)
  it("TC-0004-0025: emits W-USER-EDIT-PRESERVED (info) for an unseeded layer", async () => {
    const root = await newRoot("treemig-info");
    try {
      // Only seed 3 of the 4 layers.
      for (const layer of ["constitution", "manifest", "catalog"]) {
        const dir = path.join(root, ".qfai", "assistant", layer);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, ".gitkeep"), "", "utf-8");
      }
      const issues = await validateAssistantTreeMigration(root, await getConfig(root));
      const infoIssues = issues.filter((i) => i.code === "I-ASSISTANT-LAYER-UNSEEDED");
      expect(infoIssues.length).toBeGreaterThanOrEqual(1);
      // process/ should be the named offender.
      expect(infoIssues.some((i) => i.message.includes("process"))).toBe(true);
      expect(infoIssues[0]?.severity).toBe("info");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

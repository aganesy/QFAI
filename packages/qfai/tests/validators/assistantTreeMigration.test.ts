/**
 * Validator: assistantTreeMigration (.qfai/assistant/{rule,skill,agent,prompt}/).
 *
 * Covers TC-0004-0015 (4-layer enum guard) and TC-0004-0025 (W-USER-EDIT-PRESERVED
 * info pass-through).
 */
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
  for (const layer of ["rule", "skill", "step", "agent", "prompt"]) {
    const dir = path.join(root, ".qfai", "assistant", layer);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, ".gitkeep"), `# ${layer}\n`, "utf-8");
  }
}

async function getConfig(root: string) {
  const r = await loadConfig(root);
  return r.config;
}

// QFAI:EX-0001-0046-02
describe("assistantTreeMigration validator", () => {
  it("returns no issues when .qfai/assistant/ is absent", async () => {
    const root = await newRoot("treemig-absent");
    try {
      const issues = await validateAssistantTreeMigration(root, await getConfig(root));
      expect(issues.filter((i) => i.code !== "QFAI-ASSISTANT-002").length).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0015: 4-layer enum guard
  // QFAI:EX-0001-0012-05
  it("TC-0004-0015: reports a non-canonical layer dir", async () => {
    const root = await newRoot("treemig-enum");
    try {
      await seed4LayerTree(root);
      const off = path.join(root, ".qfai", "assistant", "extras");
      await mkdir(off, { recursive: true });
      await writeFile(path.join(off, ".gitkeep"), "", "utf-8");
      const issues = await validateAssistantTreeMigration(root, await getConfig(root));
      const enumIssues = issues.filter(
        (i) => i.code === "QFAI-ASSISTANT-001" && i.rule === "assistantTreeMigration.enumGuard",
      );
      expect(enumIssues.length).toBe(1);
      expect(enumIssues[0]?.message).toContain("extras");
      expect(enumIssues[0]?.message).toContain("rule");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0025: W-USER-EDIT-PRESERVED info pass-through (missing layer)
  it("TC-0004-0025: emits W-USER-EDIT-PRESERVED (info) for an unseeded layer", async () => {
    const root = await newRoot("treemig-info");
    try {
      // Only seed 3 of the 4 layers.
      for (const layer of ["rule", "skill", "agent"]) {
        const dir = path.join(root, ".qfai", "assistant", layer);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, ".gitkeep"), "", "utf-8");
      }
      const issues = await validateAssistantTreeMigration(root, await getConfig(root));
      const infoIssues = issues.filter((i) => i.code === "QFAI-ASSISTANT-002");
      expect(infoIssues.length).toBeGreaterThanOrEqual(1);
      // prompt/ should be the named offender.
      expect(infoIssues.some((i) => i.message.includes("prompt"))).toBe(true);
      expect(infoIssues[0]?.severity).toBe("info");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:EX-0001-0043-01
  it("allows step and skill.local and reports a directory outside the layers", async () => {
    const root = await newRoot("treemig-catalog");
    try {
      await seed4LayerTree(root);
      const assistant = path.join(root, ".qfai", "assistant");
      await mkdir(path.join(assistant, "skill.local"));
      const catalog = path.join(assistant, "notes");
      await mkdir(catalog);
      await writeFile(path.join(catalog, "product.md"), "# Old\n", "utf-8");
      await mkdir(path.join(assistant, "extras"));
      const changed = await validateAssistantTreeMigration(root, await getConfig(root));
      expect(
        changed.filter((found) => found.code === "QFAI-ASSISTANT-001").map((found) => found.file),
      ).toEqual([".qfai/assistant/extras/", ".qfai/assistant/notes/"]);
      const catalogIssue = changed.find((found) => found.file === ".qfai/assistant/notes/");
      expect(catalogIssue?.severity).toBe("warning");
      expect(catalogIssue?.message).toContain("rule, skill, step, agent, prompt");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

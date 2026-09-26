/** Unit coverage for required taskFidelity keywords and their guidance. */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../../../../src/core/config.js";
import { validateRenderCritique } from "../../../../src/core/validators/renderCritique.js";
import {
  TASK_FIDELITY_REQUIRED_KEYWORDS,
  TASK_FIDELITY_SECTION_NAME,
} from "../../../../src/core/validators/taskFidelityKeywords.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(TEST_DIR, "..", "..", "..", "..");

describe("QFAI-CRIT-009 required taskFidelity keywords", () => {
  it("keeps the required keyword set non-empty and unique", () => {
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS).toContain("cta_visibility");
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS).toContain("four_state_check");
    // Sanity: the list is non-empty and unique.
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS.length).toBeGreaterThanOrEqual(2);
    const unique = new Set(TASK_FIDELITY_REQUIRED_KEYWORDS);
    expect(unique.size).toBe(TASK_FIDELITY_REQUIRED_KEYWORDS.length);
  });

  // QFAI:EX-0001-0150-01
  it("names every missing keyword and section in the actual finding and matching guidance", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-task-fidelity-"));
    try {
      const evidenceDir = path.join(root, ".qfai", "evidence");
      await mkdir(evidenceDir, { recursive: true });
      await writeFile(
        path.join(evidenceDir, "prototyping-review.md"),
        [
          "# Review",
          "date: 2026-01-01",
          "viewport: desktop",
          "verdict: PASS",
          "findings: none",
          "rubric: task fidelity",
          TASK_FIDELITY_SECTION_NAME,
          "cta_visibility: visible",
        ].join("\n"),
        "utf8",
      );
      const { config } = await loadConfig(root);
      const issues = await validateRenderCritique(root, config);
      const finding = issues.find(
        (item) =>
          item.code === "QFAI-CRIT-009" && item.rule === "renderCritique.taskFidelityMissing",
      );
      expect(finding).toBeDefined();
      expect(finding?.message).toContain("four_state_check");
      expect(finding?.message).toContain(TASK_FIDELITY_SECTION_NAME);
      for (const keyword of TASK_FIDELITY_REQUIRED_KEYWORDS) {
        expect(finding?.message).toContain(keyword);
      }

      const docAbs = path.join(
        PACKAGE_ROOT,
        "assets",
        "init",
        ".qfai",
        "assistant",
        "skill",
        "qfai-prototyping",
        "references",
        "evidence-requirements.md",
      );
      const doc = await readFile(docAbs, "utf8");
      expect(doc).toContain(TASK_FIDELITY_SECTION_NAME);
      expect(doc).toMatch(/```/u);
      const section = doc.split(/^## Required keywords$/mu)[1]?.split(/^## /mu)[0] ?? "";
      expect(section).not.toBe("");
      const documented = [...section.matchAll(/^- `([a-z0-9_]+)`/gmu)].map((match) => match[1]);
      expect([...documented].sort()).toEqual([...TASK_FIDELITY_REQUIRED_KEYWORDS].sort());
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

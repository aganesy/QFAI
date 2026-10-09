/**
 * `/qfai-prototyping` single-spec public surface (spec-0012 Phase 3).
 *
 * Asserts that SKILL.md, its steps and every file under references/ contain zero
 * references to `resolveSurfaceUnion`. The helper remains exported
 * from `core/prototyping/specResolution.ts` for validators /
 * `show-spec` consumers, but the public skill surface must speak the
 * single-spec language without naming the multi-spec internal helper.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SKILL_ROOT = path.resolve(
  process.cwd(),
  "assets/init/.qfai/assistant/skill/qfai-prototyping",
);

const STEP_ROOT = path.resolve(process.cwd(), "assets/init/.qfai/assistant/step");

async function listStepFiles(): Promise<string[]> {
  const entries = await readdir(STEP_ROOT);
  return entries
    .filter((name) => name.startsWith("prototyping-"))
    .map((name) => path.join(STEP_ROOT, name, "STEP.md"));
}

async function listReferenceFiles(): Promise<string[]> {
  const refDir = path.join(SKILL_ROOT, "references");
  const entries = await readdir(refDir);
  return entries.filter((name) => name.endsWith(".md")).map((name) => path.join(refDir, name));
}

// QFAI:EX-0001-0134-01
describe("/qfai-prototyping public surface — single-spec alignment", () => {
  it("SKILL.md contains zero references to resolveSurfaceUnion", async () => {
    const content = await readFile(path.join(SKILL_ROOT, "SKILL.md"), "utf-8");
    expect(content.includes("resolveSurfaceUnion")).toBe(false);
  });

  it("every prototyping step contains zero references to resolveSurfaceUnion", async () => {
    const files = await listStepFiles();
    expect(files.length).toBeGreaterThan(0);
    const hits: string[] = [];
    for (const file of files) {
      if ((await readFile(file, "utf-8")).includes("resolveSurfaceUnion")) {
        hits.push(path.relative(STEP_ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it("every references/*.md contains zero references to resolveSurfaceUnion", async () => {
    const files = await listReferenceFiles();
    expect(files.length).toBeGreaterThan(0);
    const hits: string[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf-8");
      if (content.includes("resolveSurfaceUnion")) {
        hits.push(path.relative(SKILL_ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });

  // QFAI:AC-0001-0134-01
  it("SKILL.md names the UI contract as its unit and selects no primary spec", async () => {
    const content = await readFile(path.join(SKILL_ROOT, "SKILL.md"), "utf-8");
    expect(content).toContain("UI-NNNN");
    expect(content).toContain("screens[]");
    expect(content).toContain("primaryUiContract");
    expect(content).not.toContain("primarySpecId");
    expect(content).not.toMatch(/select (?:a|the) primary spec/i);
  });

  it("specResolution.ts still exports resolveSurfaceUnion for internal consumers", async () => {
    // The helper REMAINS for validators / show-spec. Removing it from
    // the public skill surface must not cascade into removing the core
    // export.
    const sourcePath = path.resolve(process.cwd(), "src/core/prototyping/specResolution.ts");
    const source = await readFile(sourcePath, "utf-8");
    expect(source).toMatch(/export\s+(?:async\s+)?function\s+resolveSurfaceUnion/);
  });
});

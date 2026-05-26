/**
 * `/qfai-prototyping` single-spec public surface (spec-0012 Phase 3).
 *
 * Asserts that SKILL.md + every file under references/ contains zero
 * references to `resolveSurfaceUnion`. The helper remains exported
 * from `core/prototyping/specResolution.ts` for validators /
 * `show-spec` consumers, but the public skill surface must speak the
 * single-spec language without naming the multi-spec internal helper.
 */

// QFAI:SPEC-0012:TC-0012-0447

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SKILL_ROOT = path.resolve(
  process.cwd(),
  "assets/init/.qfai/assistant/skills/qfai-prototyping",
);

async function listReferenceFiles(): Promise<string[]> {
  const refDir = path.join(SKILL_ROOT, "references");
  const entries = await readdir(refDir);
  return entries.filter((name) => name.endsWith(".md")).map((name) => path.join(refDir, name));
}

describe("/qfai-prototyping public surface — single-spec alignment", () => {
  it("SKILL.md contains zero references to resolveSurfaceUnion", async () => {
    const content = await readFile(path.join(SKILL_ROOT, "SKILL.md"), "utf-8");
    expect(content.includes("resolveSurfaceUnion")).toBe(false);
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

  it("specResolution.ts still exports resolveSurfaceUnion for internal consumers", async () => {
    // The helper REMAINS for validators / show-spec. Removing it from
    // the public skill surface must not cascade into removing the core
    // export.
    const sourcePath = path.resolve(process.cwd(), "src/core/prototyping/specResolution.ts");
    const source = await readFile(sourcePath, "utf-8");
    expect(source).toMatch(/export\s+(?:async\s+)?function\s+resolveSurfaceUnion/);
  });
});

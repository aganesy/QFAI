import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

describe("brand catalog step anchor", { timeout: 15000 }, () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const assetsRoot = path.resolve(repoRoot, "packages", "qfai", "assets");
  const discussionSkillDir = path.join(
    assetsRoot,
    "init",
    ".qfai",
    "assistant",
    "skills",
    "qfai-discussion",
  );
  const catalogPath = path.join(discussionSkillDir, "references", "design-md-brand-catalog.md");
  const skillMdPath = path.join(discussionSkillDir, "SKILL.md");

  it("no shipped asset routes work to the retired `Step 11.3` address", async () => {
    // `/qfai-discussion`'s Required Process is a flat 11-item list with
    // no sub-steps. Any surviving `Step 11.3` reference sends the agent
    // looking for a step that no shipped artifact defines.
    // `dot: true` is required: the shipped skill tree lives under
    // `assets/init/.qfai/`, which fast-glob skips by default.
    const allMd = await fg(["**/*.md"], { cwd: assetsRoot, absolute: true, dot: true });
    const dangling = /Step\s+11\.3/i;
    const hits: string[] = [];
    for (const file of allMd) {
      const text = await readFile(file, "utf-8");
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line === undefined) continue;
        if (dangling.test(line)) {
          hits.push(`${path.relative(assetsRoot, file)}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("the catalog routes archetype selection to Required Process step 9", async () => {
    const catalog = await readFile(catalogPath, "utf-8");
    // Opening line and Selection Guide must both name the step that
    // actually writes `brand.archetype`.
    expect(catalog).toMatch(/Required Process\s+step 9[^\n]*Phase A/);
    expect(catalog).toMatch(/Use this catalog during Required Process step 9[^\n]*Phase A/);
    expect(catalog).toMatch(/Phase B of step 9/);
    // The output mapping the catalog defers to must exist by anchor.
    expect(catalog).toContain("design-dna-intake.md#output-mapping-new-ssot-path");
  });

  it("SKILL.md step 9 defines the Phase A → Phase B split the catalog cites", async () => {
    const skillMd = await readFile(skillMdPath, "utf-8");
    const step9 = skillMd
      .split("\n")
      .find((line) => line.startsWith("9. ") && line.includes("DESIGN.md"));
    expect(step9).toBeDefined();
    const line = step9 ?? "";
    const phaseAIdx = line.indexOf("Phase A");
    const phaseBIdx = line.indexOf("Phase B");
    expect(phaseAIdx).toBeGreaterThan(-1);
    expect(phaseBIdx).toBeGreaterThan(phaseAIdx);
    expect(line).toContain("design-md-brand-catalog.md");
  });

  it("the intake reference still carries the anchor the catalog links to", async () => {
    const intake = await readFile(
      path.join(discussionSkillDir, "references", "design-dna-intake.md"),
      "utf-8",
    );
    expect(intake).toContain("## Output Mapping (new SSOT path)");
  });
});

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

  it("no discussion-skill asset routes work to the retired `Step 11.3` address", async () => {
    // `/qfai-discussion`'s Required Process is a flat 11-item list with
    // no sub-steps, so `Step 11.3` addresses nothing this skill defines.
    // Scope: the discussion skill tree only. Step numbers are per-skill
    // local names, not a shipped-wide namespace, so scanning every asset
    // Markdown file would fail CI the moment another skill legitimately
    // numbered a step `11.3` — exactly as `qfai-verify/SKILL.md` already
    // defines its own `Step 0.5`.
    const discussionMd = await fg(["**/*.md"], { cwd: discussionSkillDir, absolute: true });
    expect(discussionMd.length).toBeGreaterThan(0);
    const dangling = /Step\s+11\.3/i;
    const hits: string[] = [];
    for (const file of discussionMd) {
      const text = await readFile(file, "utf-8");
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line === undefined) continue;
        if (dangling.test(line)) {
          hits.push(`${path.relative(discussionSkillDir, file)}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("the retired-address scan stays inside the discussion skill tree", async () => {
    // Over-correction pin. Re-widening the scan to `assetsRoot` would pull
    // in sibling skills whose step numbers are their own local namespace.
    // `qfai-verify/SKILL.md` is the live proof: it defines `## Step 0.5`,
    // which is valid there and says nothing about discussion's step 9.
    const verifySkillMd = path.join(
      assetsRoot,
      "init",
      ".qfai",
      "assistant",
      "skills",
      "qfai-verify",
      "SKILL.md",
    );
    expect(await readFile(verifySkillMd, "utf-8")).toMatch(/^##\s+Step 0\.5\b/m);

    const scanned = await fg(["**/*.md"], { cwd: discussionSkillDir, absolute: true });
    expect(scanned).not.toContain(verifySkillMd);
    for (const file of scanned) {
      expect(file.startsWith(discussionSkillDir + path.sep)).toBe(true);
    }
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

  it("Phase B routes the archetype `interaction` default to `accessibility.motion`", async () => {
    // `visual` rejects unknown keys (`readVisual` in
    // `src/core/design/designMd.ts` allows only
    // colors | typography | radius | shadow | spacing), so an agent told
    // to fold every `aesthetic_properties` entry into `visual.*` would
    // emit `visual.motion` / `visual.interaction` and fail DESIGN.md
    // parsing. Each Phase B instruction must name the split explicitly.
    const skillMd = await readFile(skillMdPath, "utf-8");
    const step9 =
      skillMd.split("\n").find((line) => line.startsWith("9. ") && line.includes("DESIGN.md")) ??
      "";
    expect(step9).toContain("visual.*");
    expect(step9).toContain("accessibility.motion");

    const catalog = await readFile(catalogPath, "utf-8");
    const catalogStep5 =
      catalog.split("\n").find((line) => line.includes("Phase B of step 9")) ?? "";
    expect(catalogStep5).toContain("visual.*");
    expect(catalogStep5).toContain("accessibility.motion");

    // The intake reference is the mapping SSOT the catalog defers to, so
    // the same split has to be written there too.
    const intake = await readFile(
      path.join(discussionSkillDir, "references", "design-dna-intake.md"),
      "utf-8",
    );
    expect(intake).toContain("accessibility.motion");
  });

  it("step 9 keeps archetype selection inside the planner-first boundary", async () => {
    // `brand.archetype` is a hard-required DESIGN.md field
    // (`validateDesignMd` in `src/core/design/designMd.ts` raises
    // `missing-required` on `brand.archetype`), and the root DESIGN.md
    // draft is a mandatory UI-bearing discussion output. So step 9 must
    // keep telling the agent to fill it — but it must also say what the
    // fill is NOT, or the instruction reads as the superseded
    // archetype-driven design-system generation that discussion no longer
    // does. `discussion-completion-matrix.md` carries both halves at once:
    // the full `visual.*` tree is required, AND directions stay unranked.
    const skillMd = await readFile(skillMdPath, "utf-8");
    const step9 =
      skillMd.split("\n").find((line) => line.startsWith("9. ") && line.includes("DESIGN.md")) ??
      "";
    expect(step9).toMatch(/required `brand\.archetype`/);
    expect(step9).toMatch(/draft brand SSOT only/);
    expect(step9).toMatch(/exploration directions stay unranked/);
    expect(step9).toMatch(/design system is not finalized here/);
    // The word discussion never earns: an autonomous winner pick.
    expect(step9).not.toMatch(/autonomous/i);

    // The catalog is read standalone during Phase A, so the same boundary
    // has to be legible there and must not resurrect the retired framing.
    const catalog = await readFile(catalogPath, "utf-8");
    expect(catalog).toMatch(/required `brand\.archetype`/);
    expect(catalog).toMatch(/does not rank the\s+exploration directions/);
    expect(catalog).toMatch(/does not finalize the design system/);
    expect(catalog).not.toMatch(/autonomous/i);
  });

  it("the completion matrix still requires the DESIGN.md front-matter step 9 fills", async () => {
    // Over-correction pin. Deleting archetype selection from step 9 would
    // strand this obligation: the matrix blocks completion until root
    // DESIGN.md parses with `brand` present, and `brand.archetype` is
    // required inside it. The unranked-directions rule below it is a
    // separate axis, not a licence to drop the field.
    const matrix = await readFile(
      path.join(discussionSkillDir, "references", "discussion-completion-matrix.md"),
      "utf-8",
    );
    expect(matrix).toMatch(/Root `DESIGN\.md` exists[\s\S]*?`brand`/);
    expect(matrix).toMatch(/Exploration directions are carried unranked/);
  });

  it("keeps the tie-break decidable from the inputs Phase A actually has", async () => {
    // "highest visual-theme weight wins" named a number the catalog does not
    // publish for any archetype, and nothing in step 9 or the intake produces
    // one — `src/core/skill/archetypeTieBreaker.ts` takes it from a caller that
    // does not exist. Two agents on the same discussion could therefore pick
    // different archetypes and different draft tokens.
    const catalog = await readFile(catalogPath, "utf-8");
    expect(catalog).not.toMatch(/visual-theme weight wins/);
    expect(catalog).toMatch(/contradict fewer entries of `audience\.do_not_look_like`/);
    expect(catalog).toMatch(/alphabetical archetype name/);
    // Over-correction pin: the scoring step still reads the three intake
    // fields, so the tie-break is a tail rule and not a replacement for fit.
    expect(catalog).toMatch(/`brand\.voice`, `audience\.emotion`, `audience\.do_not_look_like`/);
  });

  it("the intake reference still carries the anchor the catalog links to", async () => {
    const intake = await readFile(
      path.join(discussionSkillDir, "references", "design-dna-intake.md"),
      "utf-8",
    );
    expect(intake).toContain("## Output Mapping (new SSOT path)");
  });
});

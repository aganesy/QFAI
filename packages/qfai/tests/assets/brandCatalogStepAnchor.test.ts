import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

describe("brand catalog step anchor", () => {
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
  const sddSkillDir = path.join(assetsRoot, "init", ".qfai", "assistant", "skills", "qfai-sdd");
  const catalogPath = path.join(sddSkillDir, "references", "design-md-brand-catalog.md");
  const skillMdPath = path.join(sddSkillDir, "SKILL.md");

  /**
   * Phase 0's DESIGN.md step, as one string.
   *
   * The step is a numbered item spanning several paragraphs, so a line lookup
   * would read only its first sentence. Sliced between the step's opening and
   * the step that follows it, with both ends asserted: an `indexOf` miss
   * returns -1, and `slice(-1, -1)` is an empty string every assertion below
   * would pass vacuously against.
   */
  async function readAuthoringStep(): Promise<string> {
    const skillMd = await readFile(skillMdPath, "utf-8");
    const start = skillMd.indexOf("1. Read root `DESIGN.md` at");
    const end = skillMd.indexOf("2. Call `isUnreplacedDesignMdSample(text)`");
    expect(start, "Phase 0's DESIGN.md step opening moved").toBeGreaterThanOrEqual(0);
    expect(end, "the step after Phase 0's DESIGN.md step moved").toBeGreaterThan(start);
    return skillMd.slice(start, end);
  }

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

    // `fast-glob` returns POSIX-separated paths even with `absolute: true`, and even on
    // Windows. Both sides of every comparison below are therefore normalised to `/`
    // rather than to `path.sep`, which is what the two assertions used to do.
    //
    // Neither of them worked on Windows, and they failed in opposite directions. The
    // `startsWith` check compared a `/`-separated result against a `\`-separated prefix,
    // so it could never be true and the row failed on a tree nobody had touched. The
    // `not.toContain` check compared against a `\`-separated absolute path, so it could
    // never match — always passing, checking nothing. A row that cannot fail is the worse
    // of the two, because it reports as coverage.
    const posix = (p: string): string => p.split(path.sep).join("/");
    const root = posix(discussionSkillDir);

    const scanned = (await fg(["**/*.md"], { cwd: discussionSkillDir, absolute: true })).map(posix);
    expect(
      scanned,
      "a sibling skill's file must not be in the scan: its step numbers are its own namespace",
    ).not.toContain(posix(verifySkillMd));
    expect(scanned.length, "the scan must have found files for this to be about").toBeGreaterThan(
      0,
    );
    for (const file of scanned) {
      expect(file.startsWith(`${root}/`)).toBe(true);
    }
  });

  it("the catalog routes archetype selection to Phase 0 step 1", async () => {
    const catalog = await readFile(catalogPath, "utf-8");
    // Opening line and Selection Guide must both name the step that
    // actually writes `brand.archetype`.
    expect(catalog).toMatch(/Phase 0\s+step 1[^\n]*Phase A/);
    expect(catalog).toMatch(/Use this catalog during Phase 0 step 1[^\n]*Phase A/);
    expect(catalog).toMatch(/Phase B then customizes/);
    // The output mapping the catalog defers to must exist by anchor.
    expect(catalog).toContain("design-dna-intake.md#output-mapping-new-ssot-path");
  });

  it("SKILL.md Phase 0 defines the Phase A → Phase B split the catalog cites", async () => {
    const line = await readAuthoringStep();
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
    const step = await readAuthoringStep();
    expect(step).toContain("visual.*");
    expect(step).toContain("accessibility.motion");

    const catalog = await readFile(catalogPath, "utf-8");
    const catalogStep5 =
      catalog.split("\n").find((line) => line.includes("Phase B then customizes")) ?? "";
    expect(catalogStep5).toContain("visual.*");
    expect(catalogStep5).toContain("accessibility.motion");

    // The intake reference is the mapping SSOT the catalog defers to, so
    // the same split has to be written there too.
    const intake = await readFile(
      path.join(sddSkillDir, "references", "design-dna-intake.md"),
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
    const step = await readAuthoringStep();
    expect(step).toMatch(/required `brand\.archetype`/);
    expect(step).toMatch(/draft brand SSOT only/);
    expect(step).toMatch(/exploration directions stay unranked/);
    expect(step).toMatch(/design system is not finalized here/);
    // The word no stage earns here: an autonomous winner pick.
    expect(step).not.toMatch(/autonomous/i);

    // The catalog is read standalone during Phase A, so the same boundary
    // has to be legible there and must not resurrect the retired framing.
    const catalog = await readFile(catalogPath, "utf-8");
    expect(catalog).toMatch(/required `brand\.archetype`/);
    expect(catalog).toMatch(/does not rank the\s+exploration directions/);
    expect(catalog).toMatch(/does not finalize the design system/);
    expect(catalog).not.toMatch(/autonomous/i);
  });

  it("both halves of the obligation survive the move to the authoring stage", async () => {
    // Over-correction pin, in two places because the obligation now spans two
    // skills. Deleting archetype selection from the authoring step would
    // strand the field: `brand.archetype` is required inside the `brand`
    // front-matter the step fills. And the discussion still owes the intent
    // that step reads, plus the unranked-directions rule — a separate axis,
    // not a licence to drop either.
    const step = await readAuthoringStep();
    expect(step).toMatch(/`brand\.archetype`/);

    const matrix = await readFile(
      path.join(discussionSkillDir, "references", "discussion-completion-matrix.md"),
      "utf-8",
    );
    expect(matrix).toMatch(/The brand intent is captured in the `uiux\/` sidecars/);
    expect(matrix).toMatch(/Exploration directions are carried unranked/);
    // And the discussion must not have kept a root-level obligation it no
    // longer owns: a matrix still blocking on the file would re-block every
    // pack the move was meant to unblock.
    expect(matrix).not.toMatch(/Root `DESIGN\.md` exists/);
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
      path.join(sddSkillDir, "references", "design-dna-intake.md"),
      "utf-8",
    );
    expect(intake).toContain("## Output Mapping (new SSOT path)");
  });
});

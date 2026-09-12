import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

describe("brand catalog step anchor", () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const assetsRoot = path.resolve(repoRoot, "packages", "qfai", "assets");
  const skillsRoot = path.join(assetsRoot, "init", ".qfai", "assistant", "skills");
  const discussionSkillDir = path.join(skillsRoot, "qfai-discussion");
  const sddReferences = path.join(skillsRoot, "qfai-sdd", "references");
  const catalogPath = path.join(sddReferences, "design-md-brand-catalog.md");
  const authoringPath = path.join(sddReferences, "design-md-authoring.md");
  const sddSkillMdPath = path.join(skillsRoot, "qfai-sdd", "SKILL.md");

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
    // which is valid there and says nothing about discussion's steps.
    const verifySkillMd = path.join(skillsRoot, "qfai-verify", "SKILL.md");
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

  it("the catalog routes archetype selection to the phase that writes the field", async () => {
    const catalog = await readFile(catalogPath, "utf-8");
    // Opening line and Selection Guide must both name the phase that
    // actually writes `brand.archetype`.
    expect(catalog).toMatch(/Phase 0 DESIGN\.md Freeze picks one/);
    expect(catalog).toMatch(/Use this catalog during Phase 0 DESIGN\.md Freeze[^\n]*qfai-sdd/);
    // The output mapping the catalog defers to must exist by anchor.
    expect(catalog).toContain("design-md-authoring.md#output-mapping");
  });

  it("only one skill authors root DESIGN.md, and it is the one holding the catalog", async () => {
    // The catalog, the mapping and the instruction to write the file have to
    // travel together. A discussion step that still emits the draft would put
    // two skills on the same artifact, and the second writer would overwrite a
    // brand the first had already frozen.
    const sddSkill = await readFile(sddSkillMdPath, "utf-8");
    const freezeStart = sddSkill.indexOf("## Phase 0 DESIGN.md Freeze");
    expect(freezeStart, "qfai-sdd has no Phase 0 DESIGN.md Freeze section").toBeGreaterThan(-1);
    const freezeEnd = sddSkill.indexOf("\n## ", freezeStart + 1);
    const freeze = sddSkill.slice(freezeStart, freezeEnd === -1 ? undefined : freezeEnd);
    expect(freeze).toMatch(/author it here per `references\/design-md-authoring\.md`/);

    // A Required Process step is written as an imperative, so the test reads
    // the step's own opening verb rather than anywhere `DESIGN.md` appears —
    // step 9 legitimately names the file when it hands it to the next skill.
    const discussionSkill = await readFile(path.join(discussionSkillDir, "SKILL.md"), "utf-8");
    const authoringSteps = discussionSkill
      .split("\n")
      .filter((line) =>
        /^\d+\.\s+(?:\*\*)?(Emit|Author|Generate|Write|Draft|Produce)\b[^\n]*DESIGN\.md/i.test(
          line,
        ),
      );
    expect(authoringSteps, "discussion must not carry a DESIGN.md authoring step").toEqual([]);

    // And it must not block on the file either: a completion condition on an
    // artifact the skill no longer writes can never be satisfied from inside
    // the run that has to satisfy it.
    expect(discussionSkill).not.toMatch(/root `DESIGN\.md` draft exists/);
  });

  // The same claim one layer down. Moving the step in the skills left the
  // source saying the old thing, and one of those sentences is not a comment:
  // `QFAI-DCON-034`'s remediation told an operator to run `/qfai-discussion`
  // to get a draft it no longer emits, which is an instruction that cannot be
  // followed.
  it("no source file attributes root DESIGN.md authoring to the discussion stage", async () => {
    const files = await fg("**/*.ts", {
      cwd: path.join(repoRoot, "packages", "qfai", "src"),
      absolute: true,
    });
    expect(files.length, "the sweep must have found source to be about").toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const lines = (await readFile(file, "utf-8")).split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? "";
        // The SKILL name, not the stage. A remediation may say the direction
        // came from "the discussion pack" — that is where it was recorded, and
        // recording is not authoring — so the pattern is the invocable name.
        // No exemption beyond that: these strings run to a couple of hundred
        // characters, and a phrase-level carve-out would exempt the whole line.
        if (!/qfai-discussion/.test(line)) continue;
        if (!/DESIGN\.md|brand intent/i.test(line)) continue;
        offenders.push(`${path.relative(repoRoot, file).replace(/\\/g, "/")}:${i + 1}`);
      }
    }

    expect(offenders, "source naming the discussion stage as DESIGN.md's author").toEqual([]);
  });

  it("the archetype `interaction` default is routed to `accessibility.motion`", async () => {
    // `visual` rejects unknown keys (`readVisual` in
    // `src/core/design/designMd.ts` allows only
    // colors | typography | radius | shadow | spacing), so an agent told
    // to fold every `aesthetic_properties` entry into `visual.*` would
    // emit `visual.motion` / `visual.interaction` and fail DESIGN.md
    // parsing. Both files an author reads must name the split.
    const catalog = await readFile(catalogPath, "utf-8");
    const catalogRouting = catalog
      .split("\n")
      .find((line) => line.includes("split by destination"));
    expect(catalogRouting).toBeDefined();
    expect(catalogRouting ?? "").toContain("visual.*");
    expect(catalogRouting ?? "").toContain("accessibility.motion");

    const authoring = await readFile(authoringPath, "utf-8");
    expect(authoring).toContain("accessibility.motion");
    expect(authoring).toMatch(/`visual\.motion`[\s\S]{0,80}fails DESIGN\.md validation/);
  });

  it("the authoring reference keeps the field required and says where its answer comes from", async () => {
    // `brand.archetype` is a hard-required DESIGN.md field
    // (`validateDesignMd` in `src/core/design/designMd.ts` raises
    // `missing-required` on it), so the reference that replaces the old
    // discussion step must still tell the author to fill it — and must name
    // the recorded direction it is filled from, or the author invents one.
    const authoring = await readFile(authoringPath, "utf-8");
    // The answer comes from the theme the user chose, not from the assistant
    // scoring the product's prose. Scoring survives as the fallback for a pack
    // that recorded no theme, and the reference says whose answer that is.
    expect(authoring).toMatch(/Brand archetype → `brand\.archetype`/);
    expect(authoring).toContain("design-md-brand-catalog.md");
    expect(authoring).toContain("04_Sources.md");
  });

  it("discussion still records what Phase 0 authors from", async () => {
    // Over-correction pin. Moving the artifact must not take its inputs with
    // it: Phase 0 has nothing to write from unless discussion still captures
    // the direction, and the unranked-directions rule is a separate axis that
    // the move does not touch.
    const matrix = await readFile(
      path.join(discussionSkillDir, "references", "discussion-completion-matrix.md"),
      "utf-8",
    );
    expect(matrix).toMatch(/reference registries in `04_Sources\.md` are complete/);
    expect(matrix).toMatch(/Exploration directions are carried unranked/);
  });

  it("keeps the tie-break decidable from the inputs the selection actually has", async () => {
    // "highest visual-theme weight wins" named a number the catalog does not
    // publish for any archetype, and nothing in the authoring reference or the
    // intake produces one. Two agents on the same pack could therefore pick
    // different archetypes and different tokens. The helper that consumed that
    // number is gone; the tie-break the Selection Guide states is what an agent
    // reads, and this row is what holds it.
    const catalog = await readFile(catalogPath, "utf-8");
    expect(catalog).not.toMatch(/visual-theme weight wins/);
    expect(catalog).toMatch(/contradict fewer entries of `audience\.do_not_look_like`/);
    expect(catalog).toMatch(/alphabetical archetype name/);
    // Over-correction pin: the scoring step still reads the three intake
    // fields, so the tie-break is a tail rule and not a replacement for fit.
    expect(catalog).toMatch(/`brand\.voice`, `audience\.emotion`, `audience\.do_not_look_like`/);
  });
});

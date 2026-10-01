import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

describe("uiux sidecar templates", () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const templateDir = path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skill",
    "qfai-discussion",
    "templates",
  );
  const uiuxDir = path.join(templateDir, "uiux");
  const skillMdPath = path.join(templateDir, "..", "SKILL.md");

  async function readTemplate(filename: string): Promise<string> {
    return readFile(path.join(uiuxDir, filename), "utf-8");
  }

  async function readCoreTemplate(filename: string): Promise<string> {
    return readFile(path.join(templateDir, filename), "utf-8");
  }

  it("retired-sidecar references are absent from distributed assets (no `exploration brief|rubric` / `evaluator calibration`)", async () => {
    // Guard against partial-fix regressions: any `assets/` doc that
    // tells operators to author the retired sidecar files would lead
    // them into the `^3[34]_.*\.md$` forbidden-pattern hard-fail in
    // threeLayer.ts. The guard whitelists only `00_index.md`, where
    // the names are mentioned as Forbidden Legacy Files (the
    // documented anti-pattern), not as instructions to create.
    const assetsRoot = path.resolve(repoRoot, "packages", "qfai", "assets");
    const allMd = await fg(["**/*.md"], { cwd: assetsRoot, absolute: true });
    const forbidden =
      /(?:exploration\s+(?:brief|rubric)|evaluator\s+calibration|33_exploration_rubric|34_evaluator_calibration)/i;
    const hits: Array<{ file: string; line: number; text: string }> = [];
    for (const file of allMd) {
      const text = await readFile(file, "utf-8");
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line === undefined) continue;
        if (forbidden.test(line)) {
          hits.push({ file, line: i + 1, text: line.trim() });
        }
      }
    }
    // Only the Forbidden Legacy Files list in 00_index.md may mention
    // the retired sidecar names — that text is a warning, not an
    // instruction. Allow exactly those two lines and reject everything
    // else.
    const indexFile = path.join(
      assetsRoot,
      "init",
      ".qfai",
      "assistant",
      "skill",
      "qfai-discussion",
      "templates",
      "uiux",
      "00_index.md",
    );
    const allowedHits = hits.filter(
      (h) =>
        h.file === indexFile &&
        (h.text.startsWith("- `33_exploration_rubric.md`") ||
          h.text.startsWith("- `34_evaluator_calibration.md`")),
    );
    const unexpected = hits.filter((h) => !allowedHits.includes(h));
    expect(unexpected).toEqual([]);
  });

  // QFAI:EX-0001-0085-01
  it("ships the UI-bearing sidecar family (the brand SSOT is the root DESIGN.md)", async () => {
    const files = await fg(["*.md"], { cwd: uiuxDir, absolute: false });
    // Brand-level inputs moved to root DESIGN.md; only screen-level
    // sidecars remain.
    expect(files).toContain("40_screen_contracts.md");
    expect(files).toContain("50_review_input_bundle.md");
    expect(files).not.toContain("33_exploration_rubric.md");
    expect(files).not.toContain("34_evaluator_calibration.md");
  });

  it("40_screen_contracts.md keeps the strong screen-contract schema", async () => {
    const content = await readTemplate("40_screen_contracts.md");
    expect(content).toContain("### Screen:");
    expect(content).toMatch(/- screen_id:/);
    expect(content).toMatch(/- route:/);
    expect(content).toMatch(/- purpose:/);
    expect(content).toMatch(/- actor:/);
    expect(content).toMatch(/- primary_tasks:/);
    expect(content).toMatch(/- required_states:/);
  });

  // QFAI:EX-0001-0086-01
  it("50_review_input_bundle.md states best-of-history explicitly", async () => {
    const content = await readTemplate("50_review_input_bundle.md");
    expect(content).toMatch(/best-of-history/i);
  });

  it("SKILL.md explains the UI-bearing completion condition", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    // Brand SSOT is root DESIGN.md, frozen by /qfai-sdd Phase 0.
    expect(content).toMatch(/DESIGN\.md/);
    expect(content).toMatch(/non-ui|skip/i);
  });

  it("03_Story-Workshop.md keeps the optional fallback and Behavior Obligations", async () => {
    const content = await readCoreTemplate("03_Story-Workshop.md");
    expect(content).toMatch(/Behavior Obligations/i);
    expect(content).toMatch(/optional fallback/i);
  });

  it("04_Sources.md has the reference translation schema", async () => {
    const content = await readCoreTemplate("04_Sources.md");
    expect(content).toContain("adopted_points");
    expect(content).toContain("rejected_points");
    expect(content).toContain("local_translation");
  });

  it("04_Sources.md carries as many reference blocks as the default competitive_refs_min", async () => {
    const content = await readCoreTemplate("04_Sources.md");
    const blocks = content.match(/^###\s+Reference:/gim) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    expect(content).toContain("uiux.competitive_refs_min");
  });

  it("the Trend Scan in 04_Sources.md does not require the retired TRD-XX or the unnumbered UIX-VAL-T01", async () => {
    // The Trend Scan moved from `uiux/20_trend_scan.md` to 04_Sources.md, and
    // the same recut retired the `TRD-XX` evaluation-axis scheme
    // (see 'Trend Scan SSOT' in references/ui-bearing-playbook.md).
    // No validator emits `UIX-VAL-T01`, so leaving it blank raises no
    // finding. The template must not promise behavior that does not exist.
    const content = await readCoreTemplate("04_Sources.md");
    expect(content).not.toMatch(/TRD-/);
    expect(content).not.toMatch(/UIX-VAL-T01/);

    // Every evaluation_connection must ask "how is this evaluated in the design review?"
    // in the same form (the six categories such as color/typography are no exception).
    const evaluationLines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- evaluation_connection:"));
    expect(evaluationLines).toHaveLength(10);
    for (const line of evaluationLines) {
      expect(line).toMatch(
        /^- evaluation_connection: \[How the .+ should be evaluated in design review\]$/,
      );
    }
  });
});

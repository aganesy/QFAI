import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

describe("uiux sidecar templates", { timeout: 15000 }, () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const templateDir = path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skills",
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
      "skills",
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

  it("UI-bearing sidecar family を配布する (brand SSOT は root DESIGN.md)", async () => {
    const files = await fg(["*.md"], { cwd: uiuxDir, absolute: false });
    // Brand-level inputs moved to root DESIGN.md; only screen-level
    // sidecars remain.
    expect(files).toContain("40_screen_contracts.md");
    expect(files).toContain("50_review_input_bundle.md");
    expect(files).not.toContain("33_exploration_rubric.md");
    expect(files).not.toContain("34_evaluator_calibration.md");
  });

  it("40_screen_contracts.md は screen contract 強スキーマを維持する", async () => {
    const content = await readTemplate("40_screen_contracts.md");
    expect(content).toContain("### Screen:");
    expect(content).toMatch(/- screen_id:/);
    expect(content).toMatch(/- route:/);
    expect(content).toMatch(/- purpose:/);
    expect(content).toMatch(/- actor:/);
    expect(content).toMatch(/- primary_tasks:/);
    expect(content).toMatch(/- required_states:/);
  });

  it("50_review_input_bundle.md が best-of-history を明記する", async () => {
    const content = await readTemplate("50_review_input_bundle.md");
    expect(content).toMatch(/best-of-history/i);
  });

  it("SKILL.md が UI-bearing completion condition を説明している", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    // Brand SSOT is root DESIGN.md, frozen by /qfai-sdd Phase 0.
    expect(content).toMatch(/DESIGN\.md/);
    expect(content).toMatch(/non-ui|skip/i);
  });

  it("03_Story-Workshop.md は optional fallback と Behavior Obligations を維持する", async () => {
    const content = await readCoreTemplate("03_Story-Workshop.md");
    expect(content).toMatch(/Behavior Obligations/i);
    expect(content).toMatch(/optional fallback/i);
  });

  it("04_Sources.md は reference translation schema を持つ", async () => {
    const content = await readCoreTemplate("04_Sources.md");
    expect(content).toContain("adopted_points");
    expect(content).toContain("rejected_points");
    expect(content).toContain("local_translation");
  });

  it("04_Sources.md の Trend Scan は廃止済み TRD-XX / 未採番 UIX-VAL-T01 を要求しない", async () => {
    // Trend Scan は `uiux/20_trend_scan.md` から 04_Sources.md へ移設され、
    // 同じ recut で `TRD-XX` 評価軸スキームは廃止された
    // (references/ui-bearing-playbook.md の 'Trend Scan SSOT')。
    // `UIX-VAL-T01` はどの validator も emit しないため、空欄にしても
    // 指摘は返らない。テンプレートが存在しない挙動を約束しないこと。
    const content = await readCoreTemplate("04_Sources.md");
    expect(content).not.toMatch(/TRD-/);
    expect(content).not.toMatch(/UIX-VAL-T01/);

    // 全 evaluation_connection が「design review でどう評価するか」を問う
    // 同一形式に揃っていること (color/typography など 6 分類も例外にしない)。
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

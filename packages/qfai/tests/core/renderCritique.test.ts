import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { validateRenderCritique } from "../../src/core/validators/renderCritique.js";

function makeConfig(overrides?: Partial<QfaiConfig>): QfaiConfig {
  return { ...defaultConfig, ...overrides };
}

describe("Render Critique Loop validation", { timeout: 15000 }, () => {
  let root: string;

  beforeEach(async () => {
    root = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-render-critique-")),
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function seedSkillPrompt(name: string, content: string): Promise<void> {
    const dir = path.join(root, ".qfai", "assistant", "skills", name);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "SKILL.md"), content, "utf-8");
  }

  async function seedEvidence(name: string, content: string): Promise<void> {
    const dir = path.join(root, ".qfai", "evidence");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), content, "utf-8");
  }

  async function seedContracts(): Promise<void> {
    const designDir = path.join(root, ".qfai", "contracts", "design");
    const uiDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(designDir, { recursive: true });
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(designDir, "design-system.yaml"),
      "checklist:\n  color: []\n  typography: []\n  spacing: []\n  border_radius: []\n  shadow: []\n  dos_and_donts: []\n  component_tone: []\n  motion_rules: []\n",
      "utf-8",
    );
    await writeFile(
      path.join(uiDir, "ui-0001-dashboard.yaml"),
      "screens:\n  - id: dashboard\n    title: Dashboard\n    route: /dashboard\n",
      "utf-8",
    );
  }

  it("renders/screenshot/HTML への言及がなければ QFAI-CRIT-001 を返す", async () => {
    await seedSkillPrompt(
      "qfai-prototyping",
      "# Prototyping Skill\n\nReview the code diff carefully.",
    );
    const issues = await validateRenderCritique(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-CRIT-001")).toBe(true);
  });

  it("read order with spec / DESIGN.md / ui contracts keeps QFAI-CRIT-002 and 005 silent", async () => {
    await seedContracts();
    await seedSkillPrompt(
      "qfai-prototyping",
      [
        "# Prototyping Skill",
        "",
        "Take a screenshot of the rendered page and review it in the browser.",
        "",
        "Read order: `.qfai/specs/spec-0001/01_Spec.md` -> `DESIGN.md` -> `.qfai/contracts/ui/*.yaml`.",
      ].join("\n"),
    );
    const issues = await validateRenderCritique(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-CRIT-002")).toBe(false);
    expect(issues.some((i) => i.code === "QFAI-CRIT-005")).toBe(false);
  });

  it("missing DESIGN.md in read order raises QFAI-CRIT-002 and QFAI-CRIT-005", async () => {
    await seedContracts();
    await seedSkillPrompt(
      "qfai-prototyping",
      [
        "# Prototyping Skill",
        "",
        "Review the rendered HTML and screenshot output in the browser.",
        "",
        "Read order: `.qfai/specs/spec-0001/01_Spec.md` -> `.qfai/contracts/ui/*.yaml`.",
      ].join("\n"),
    );

    const issues = await validateRenderCritique(root, makeConfig());

    expect(issues.some((i) => i.code === "QFAI-CRIT-002")).toBe(true);
    expect(issues.some((i) => i.code === "QFAI-CRIT-005")).toBe(true);
  });

  it("critique evidence に viewport/date/verdict/findings/rubric が揃っていれば必須項目エラーを返さない", async () => {
    await seedEvidence(
      "critique-001.md",
      [
        "# Desktop critique",
        "date: 2026-04-23",
        "viewport: desktop 1440px",
        "verdict: PASS",
        "findings: hierarchy is clear",
        "rubric: design quality and originality",
        "",
        "# Mobile critique",
        "date: 2026-04-23",
        "viewport: mobile 390px",
        "verdict: PASS",
        "findings: CTA remains visible",
        "rubric: design quality and originality",
        "",
        "## taskFidelity",
        "step_count: 3",
        "max_primary_steps: 5",
        "cta_visibility: visible",
        "four_state_check: ok",
      ].join("\n"),
    );
    const issues = await validateRenderCritique(root, makeConfig());
    expect(issues.some((i) => i.code === "QFAI-CRIT-006")).toBe(false);
    expect(issues.some((i) => i.code === "QFAI-CRIT-007")).toBe(false);
    expect(issues.some((i) => i.code === "QFAI-CRIT-009")).toBe(false);
    expect(issues.some((i) => i.code === "QFAI-CRIT-010")).toBe(false);
  });

  it("reads viewports from canonical PROTOTYPING_JSON_REL path (.qfai/evidence/prototyping/prototyping.json)", async () => {
    // Codex 6c6l: pre-1.8.9 the path was `.qfai/evidence/prototyping.json`.
    // After the SSOT move, viewport metadata written by iterate /
    // validate at the canonical path was invisible to render-critique
    // and surfaced as spurious QFAI-CRIT-003/004. This test pins that
    // viewports recorded under the canonical path satisfy the
    // viewport-coverage gates without any markdown-section evidence.
    await seedSkillPrompt(
      "qfai-prototyping",
      [
        "# Prototyping Skill",
        "",
        "Take a screenshot of the rendered page and review it in the browser.",
      ].join("\n"),
    );
    // Seed the canonical path (NOT the legacy one).
    const canonicalDir = path.join(root, ".qfai", "evidence", "prototyping");
    await mkdir(canonicalDir, { recursive: true });
    await writeFile(
      path.join(canonicalDir, "prototyping.json"),
      JSON.stringify({
        uiFidelity: {
          screens: [
            {
              renders: [{ viewport: "desktop" }, { viewport: "mobile" }],
            },
          ],
        },
      }),
      "utf-8",
    );
    // ALSO seed an empty legacy file to prove renderCritique does not
    // fall back to it. If the helper still read the legacy path, it
    // would see no viewports and fire CRIT-003/004.
    await writeFile(
      path.join(root, ".qfai", "evidence", "prototyping.json"),
      JSON.stringify({ uiFidelity: { screens: [] } }),
      "utf-8",
    );
    const issues = await validateRenderCritique(root, makeConfig());
    // Both viewports present at the canonical path -> CRIT-003/004 silent.
    expect(issues.some((i) => i.code === "QFAI-CRIT-003")).toBe(false);
    expect(issues.some((i) => i.code === "QFAI-CRIT-004")).toBe(false);
  });
});

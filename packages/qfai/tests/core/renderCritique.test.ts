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

  // Defense-in-depth for the `--capture` skeleton emitter: even
  // when an evidence file lands at the root scan target with a
  // syntactically-complete `## taskFidelity` section + all required
  // keyword tokens, unfilled `TODO` / `FIXME` / `<placeholder>` /
  // empty values MUST be rejected as `QFAI-CRIT-009` so the
  // operator cannot accidentally satisfy the gate with the
  // skeleton's own values copied verbatim. Mirrors the
  // captureTemplate.ts skeleton emission.
  it("rejects taskFidelity sections whose required-keyword values are TODO / FIXME / <placeholder> / empty", async () => {
    await seedSkillPrompt(
      "qfai-prototyping",
      [
        "# Prototyping Skill",
        "",
        "Render screenshots and review HTML; honor spec / DESIGN.md / .qfai/contracts/ui.",
      ].join("\n"),
    );
    // Seed an evidence file at the SCAN ROOT (matches the pattern
    // `.qfai/evidence/prototyping*.md`). The body has `## taskFidelity`
    // + all required keywords AND verdict markers — pre-fix this
    // would silently pass; post-fix the TODO / FIXME / <placeholder> /
    // empty-value detector surfaces CRIT-009.
    await seedEvidence(
      "prototyping_unfilled.md",
      [
        "# Prototyping Iter (desktop 1024 / mobile 480 verdict: PASS)",
        "",
        "## taskFidelity",
        "",
        "- cta_visibility: TODO",
        "- four_state_check: FIXME",
        "- step_count: <placeholder>",
        "- max_primary_steps: ",
        "",
      ].join("\n"),
    );
    const issues = await validateRenderCritique(root, makeConfig());
    const placeholderFinding = issues.find(
      (i) =>
        i.code === "QFAI-CRIT-009" &&
        typeof i.message === "string" &&
        i.message.includes("placeholders not filled"),
    );
    expect(placeholderFinding).toBeDefined();
    expect(placeholderFinding?.severity).toBe("error");
    expect(placeholderFinding?.message ?? "").toMatch(/cta_visibility/);
    expect(placeholderFinding?.message ?? "").toMatch(/four_state_check/);
  });

  // Pin the empty-value + `<placeholder>` detection on the SSOT
  // required-keyword set itself (cta_visibility / four_state_check).
  // The prior test placed `<placeholder>` on `step_count` and the
  // empty value on `max_primary_steps`, which are NOT in
  // `TASK_FIDELITY_REQUIRED_KEYWORDS` — so those branches of
  // `TODO_PLACEHOLDER_RE` were not exercised on the SSOT walk path.
  // Catches a regression where the colon-trailing `\s*` (vs `[ \t]*`)
  // would consume newlines and miss the empty-value case.
  it("flags required-keyword empty values and <placeholder> markers via the SSOT walk", async () => {
    await seedSkillPrompt(
      "qfai-prototyping",
      [
        "# Prototyping Skill",
        "",
        "Render screenshots and review HTML; honor spec / DESIGN.md / .qfai/contracts/ui.",
      ].join("\n"),
    );
    await seedEvidence(
      "prototyping_required_empty.md",
      [
        "# Prototyping Iter (desktop 1024 / mobile 480 verdict: PASS)",
        "",
        "## taskFidelity",
        "",
        // Empty value: line ends right after the colon. The capture
        // must produce "" so TODO_PLACEHOLDER_RE matches.
        "- cta_visibility:",
        // <placeholder> on a required keyword.
        "- four_state_check: <placeholder>",
        "",
      ].join("\n"),
    );
    const issues = await validateRenderCritique(root, makeConfig());
    const placeholderFinding = issues.find(
      (i) =>
        i.code === "QFAI-CRIT-009" &&
        typeof i.message === "string" &&
        i.message.includes("placeholders not filled"),
    );
    expect(placeholderFinding).toBeDefined();
    // BOTH required keywords must surface — the prior test only
    // covered the TODO / FIXME shapes on required keywords, leaving
    // empty + `<placeholder>` rejection unverified at the SSOT layer.
    expect(placeholderFinding?.message ?? "").toMatch(/cta_visibility/);
    expect(placeholderFinding?.message ?? "").toMatch(/four_state_check/);
  });

  // Pin the SAFE PLACEMENT INVARIANT (layer-1 of the
  // captureTemplate.ts defense): the skeleton emitted under
  // `.qfai/evidence/prototyping/iter-NN/task-fidelity-template.md`
  // must NOT be matched by validateRenderCritique's evidence glob
  // (`.qfai/evidence/{prototyping*,critique-*}.md` — direct
  // children only). If a future change widens the glob to
  // `**/*.md` or moves the template into the scanned root, this
  // test fails and the contract is surfaced before any silent-pass
  // regression lands.
  it("does NOT match the iter-NN task-fidelity-template.md from the scan glob (layer-1 placement invariant)", async () => {
    const { writeTaskFidelityTemplate } =
      await import("../../src/core/prototyping/captureTemplate.js");
    await seedSkillPrompt(
      "qfai-prototyping",
      [
        "# Prototyping Skill",
        "",
        "Render screenshots and review HTML; honor spec / DESIGN.md / .qfai/contracts/ui.",
      ].join("\n"),
    );
    // Seed the iter directory and let the emitter write the
    // skeleton exactly where the real `--capture` path does.
    const iterDir = path.join(root, ".qfai", "evidence", "prototyping", "iter-00");
    await mkdir(iterDir, { recursive: true });
    await writeTaskFidelityTemplate(iterDir);
    // Seed a minimal evidence file at the scan root with viewport
    // markers but NO taskFidelity content. If layer-1 were broken
    // (template matched by the glob), the template's
    // `cta_visibility: TODO` / `four_state_check: TODO` lines
    // would land in the scan and we'd surface CRIT-009 with the
    // placeholder message. With the intact glob the template is
    // invisible, so the placeholder branch does NOT fire.
    await seedEvidence(
      "prototyping_iter.md",
      [
        "# Iteration evidence",
        "",
        "## Desktop viewport >= 1024px",
        "verdict: PASS",
        "",
        "## Mobile viewport <= 480px",
        "verdict: PASS",
        "",
      ].join("\n"),
    );
    const issues = await validateRenderCritique(root, makeConfig());
    const placeholderFinding = issues.find(
      (i) =>
        i.code === "QFAI-CRIT-009" &&
        typeof i.message === "string" &&
        i.message.includes("placeholders not filled"),
    );
    // Placeholder branch MUST NOT fire — the template lives outside
    // the scan glob, so its `TODO` values cannot have been observed.
    expect(placeholderFinding).toBeUndefined();
  });
});

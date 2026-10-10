/**
 * TC-3.8.x — designContractReadiness validator.
 *
 * Root DESIGN.md at the sdd and prototyping stages (QFAI-DCON-030 / 033 /
 * 034).
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { writeDiscussionCurrentId } from "../../../src/core/state.js";
import { validateDesignContractReadiness } from "../../../src/core/validators/designContractReadiness.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-dcon-"));
  tempDirs.push(dir);
  return dir;
}

const VALID_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
].join("\n");

async function seedUiBearingProject(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai/spec/03_contract/ui"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/spec/03_contract/ui/ui-0001.yaml"),
    "# QFAI-CONTRACT-ID: UI-0001\nscreens:\n  - id: home\n    title: Home\n    route: /\n",
    "utf-8",
  );
}

async function seedDesignMd(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), VALID_DESIGN_MD, "utf-8");
}

describe("validateDesignContractReadiness (TC-3.8.x)", () => {
  // QFAI:EX-0001-0042-14
  it("TC-3.8.1: an authored root DESIGN.md passes (no issues)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMd(root);
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  // QFAI:EX-0001-0042-03
  it("TC-3.8.2: missing root DESIGN.md → DCON-030", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("QFAI-DCON-030");
    const dcon030 = issues.find((i) => i.code === "QFAI-DCON-030");
    expect(dcon030?.file).toBe("DESIGN.md");
    expect(dcon030?.severity).toBe("error");
  });

  // QFAI:EX-0001-0042-03
  it("malformed root DESIGN.md surfaces DCON-033 (parse error)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    // Author a malformed DESIGN.md (missing front-matter delimiter).
    await writeFile(path.join(root, "DESIGN.md"), "no front matter here\n", "utf-8");
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-DCON-033"]);
    expect(issues[0]?.severity).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// QFAI-DCON-034 — unreplaced sample DESIGN.md.
//
// The sample gate has to fire BEFORE the UI-contract gate: a copied sample
// can be in place from the first commit, `contracts/ui/**` is authored later
// in SDD, and a prototyping loop records the file's sha256 after that.
// ---------------------------------------------------------------------------

/**
 * The sample brand the package ships, as the prototyping template.
 *
 * `qfai init` writes no root `DESIGN.md`, so a project only holds this text
 * because someone put it there — copied from the template, or seeded by a
 * release that still did. Both are what this gate exists to catch, so the
 * sample is still the fixture; only where it ships has moved.
 */
const SHIPPED_DESIGN_MD_SAMPLE = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skill",
  "qfai-prototyping",
  "templates",
  "DESIGN.md.sample",
);

describe("validateDesignContractReadiness — unreplaced sample (QFAI-DCON-034)", () => {
  async function readShippedSample(): Promise<string> {
    return readFile(SHIPPED_DESIGN_MD_SAMPLE, "utf-8");
  }

  it("reports DCON-034 before any UI contract exists (fresh init)", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    const dcon034 = issues.filter((i) => i.code === "QFAI-DCON-034");
    expect(dcon034).toHaveLength(1);
    expect(dcon034[0]?.file).toBe("DESIGN.md");
    // Warning, not error: a project that ships no UI freezes nothing, so the
    // sample costs it nothing yet. An error would stop a project that never
    // opted into the design surface at all.
    expect(dcon034[0]?.severity).toBe("warning");
    expect(dcon034[0]?.suggested_action).toContain(
      ".qfai/assistant/skill/qfai-prototyping/templates/DESIGN.md.sample",
    );
  });

  it("escalates DCON-034 to error once the project is UI-bearing", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    const dcon034 = issues.filter((i) => i.code === "QFAI-DCON-034");
    expect(dcon034).toHaveLength(1);
    expect(dcon034[0]?.severity).toBe("error");
  });

  it("does not escalate on a retired spec-level surface marker", async () => {
    // Only a declared UI contract with screens is UI-bearing on the story
    // tree. Legacy spec-level markers cannot turn on a visual design gate.
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0001/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# 01 Spec\n\n- Spec: spec-0001\n",
      "utf-8",
    );
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    const dcon034 = issues.filter((i) => i.code === "QFAI-DCON-034");
    expect(dcon034).toHaveLength(1);
    expect(dcon034[0]?.severity).toBe("warning");
  });

  it("stays a warning when a UI contract has no screens", async () => {
    const root = await newTempDir();
    const uiDir = path.join(root, ".qfai/spec/03_contract/ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(uiDir, "ui-0001.yaml"),
      "# QFAI-CONTRACT-ID: UI-0001\nscreens: []\n",
      "utf-8",
    );
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    expect(issues.find((i) => i.code === "QFAI-DCON-034")?.severity).toBe("warning");
  });

  it("stays silent for an authored DESIGN.md with no UI contracts", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "DESIGN.md"), VALID_DESIGN_MD, "utf-8");
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("stays silent when root DESIGN.md is absent and no UI contracts exist", async () => {
    const root = await newTempDir();
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("reports DCON-034 from the prototyping stage as well", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await writeFile(path.join(root, "DESIGN.md"), await readShippedSample(), "utf-8");
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    expect(issues.map((i) => i.code)).toContain("QFAI-DCON-034");
  });
});

/**
 * The story tree has no spec-level UI marker. A declared UI contract with
 * screens is the design-readiness signal. A discussion pack still guides SDD,
 * but it cannot override a live UI contract when validation runs.
 */
describe("story-tree visual design readiness", () => {
  async function seedDiscussionPack(root: string, primarySurface: string): Promise<void> {
    const id = "discussion-20260101000000000";
    const dir = path.join(root, ".qfai/discussion", id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "01_Context.md"),
      [
        "# 01 Context",
        "",
        "## UI-bearing Classification",
        "",
        "- ui_bearing: true",
        `- primary_surface: ${primarySurface}`,
        "- secondary_surfaces: []",
        "- classification_rationale: fixture",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeDiscussionCurrentId(root, id);
  }

  it("a cli-only discussion without UI contracts requires no root DESIGN.md", async () => {
    const root = await newTempDir();
    await seedDiscussionPack(root, "cli");
    const codes = (await validateDesignContractReadiness(root, defaultConfig)).map(
      (issue) => issue.code,
    );
    expect(codes).not.toContain("QFAI-DCON-030");
  });

  it("an unreplaced sample without a UI contract only warns", async () => {
    const root = await newTempDir();
    await seedDiscussionPack(root, "cli");
    await writeFile(
      path.join(root, "DESIGN.md"),
      await readFile(SHIPPED_DESIGN_MD_SAMPLE, "utf-8"),
    );
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    expect(issues.map((issue) => [issue.code, issue.severity])).toEqual([
      ["QFAI-DCON-034", "warning"],
    ]);
  });

  it("an active cli pack cannot suppress a UI contract with screens", async () => {
    const root = await newTempDir();
    await seedDiscussionPack(root, "cli");
    await seedUiBearingProject(root);
    const codes = (await validateDesignContractReadiness(root, defaultConfig)).map(
      (issue) => issue.code,
    );
    expect(codes).toContain("QFAI-DCON-030");
  });

  it("a web discussion alone does not invent a UI contract", async () => {
    const root = await newTempDir();
    await seedDiscussionPack(root, "web");
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("a UI contract without screens does not require visual design artifacts", async () => {
    const root = await newTempDir();
    const uiDir = path.join(root, ".qfai/spec/03_contract/ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(uiDir, "ui-0001.yaml"),
      "# QFAI-CONTRACT-ID: UI-0001\nscreens: []\n",
      "utf-8",
    );
    const issues = await validateDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });
});

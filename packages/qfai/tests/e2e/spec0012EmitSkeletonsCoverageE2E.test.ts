/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0138
 * (`qfai prototyping iterate --cycle 0 --emit-skeletons` cross-spec
 * coverage of the frozen surface union).
 *
 * Converted from `.skip` test-first skeleton to a deterministic
 * temp-fixture exercise of the production iterate driver. The
 * default-OFF posture is asserted in addition to the opt-in normal
 * path so the v1.9.1 no-regression contract has a sticky test.
 */
// QFAI:SPEC-0012:US-0012-0138

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../src/cli/commands/prototypingIterate.js";

const E2E_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme"',
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
  "# Brand",
  "",
  "Calm.",
].join("\n");

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const d = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-spec0012-emit-skel-"));
  tempDirs.push(d);
  return d;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d) await rm(d, { recursive: true, force: true });
  }
});

async function seedProjectWithUiContracts(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), E2E_DESIGN_MD, "utf-8");
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/out",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  failOn: error",
    ].join("\n"),
    "utf-8",
  );
  const specDir = path.join(root, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "# 01\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
  // Seed a UI contract so resolveSurfaceUnion has a non-empty union
  // for the emit-skeletons coverage path.
  const uiDir = path.join(root, ".qfai/contracts/ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(
    path.join(uiDir, "home.yaml"),
    [
      "screens:",
      "  - id: home",
      "    route: /",
      "  - id: settings",
      "    route: /settings",
    ].join("\n"),
    "utf-8",
  );
}

describe("US-0012-0138 — iterate --cycle 0 --emit-skeletons normal path", () => {
  it("emits one DESIGN.md-token placeholder HTML per frozenSurfaceUnion screen", async () => {
    const root = await newTempDir();
    await seedProjectWithUiContracts(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      emitSkeletons: true,
    });
    expect(exit).toBe(0);
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    const entries = await readdir(iter00);
    // Each declared screen acquires a .html file under iter-00/.
    const htmls = entries.filter((e) => e.endsWith(".html"));
    expect(htmls.length).toBeGreaterThanOrEqual(2);
    expect(htmls.sort()).toContain("home.html");
    expect(htmls.sort()).toContain("settings.html");
    // Token consumption: the typography token leaks into each
    // placeholder body.
    const home = await readFile(path.join(iter00, "home.html"), "utf-8");
    expect(home).toContain("Inter");
  });
});

describe("US-0012-0138 — boundary: --emit-skeletons absent preserves v1.9.1 behavior", () => {
  it("zero skeleton HTMLs are written when the flag is absent", async () => {
    const root = await newTempDir();
    await seedProjectWithUiContracts(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      // emitSkeletons absent — bit-for-bit v1.9.1 behavior.
    });
    expect(exit).toBe(0);
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    const entries = await readdir(iter00);
    // No per-screen .html written (only iterate-plan.json and
    // similar driver artifacts).
    const htmls = entries.filter((e) => e.endsWith(".html"));
    expect(htmls).toEqual([]);
  });
});

describe("US-0012-0138 — error: --skeleton-mode stub emits the minimal marker (no styling)", () => {
  it("stub mode writes a minimal <!doctype html> placeholder (consumer opts into the bare marker)", async () => {
    const root = await newTempDir();
    await seedProjectWithUiContracts(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      emitSkeletons: true,
      skeletonMode: "stub",
    });
    expect(exit).toBe(0);
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    const home = await readFile(path.join(iter00, "home.html"), "utf-8");
    expect(home).toContain("<!doctype html>");
    // Stub mode does NOT bake tokens into the body.
    expect(home).not.toContain("Inter");
  });
});

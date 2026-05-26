/**
 * `iterate --capture` mirrors accepted-iter content to the
 * project-wide aggregate dirs using underscore-cased screen ids
 * (spec-0012 Phase 3 / REQ-0012-0066 D).
 *
 * Asserts:
 *   (a) After a successful `--capture` cycle the
 *       `.qfai/evidence/prototyping/screenshots/<id>.png` and
 *       `.qfai/evidence/prototyping/html/<id>.html` files exist with
 *       byte-equivalent content to the per-iter source.
 *   (b) The mirror uses the screen id as-is (underscore casing
 *       preserved end-to-end).
 */

// QFAI:SPEC-0012:TC-0012-0448

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";

const CERT_DESIGN_MD = [
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
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-aggmirror-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedProject(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), CERT_DESIGN_MD, "utf-8");
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
}

describe("iterate --capture aggregate-mirror (underscore casing)", () => {
  it("mirrors home_page.png and settings_panel.html into screenshots/ and html/ aggregate dirs", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      screens: [
        { id: "home_page", url: "/" },
        { id: "settings_panel", url: "/settings" },
      ],
      captureScreen: async ({ screenId, pngPath, htmlPath }) => {
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, screenId.length]));
        await writeFile(
          htmlPath,
          `<!doctype html><html><body data-id="${screenId}">${screenId}</body></html>`,
        );
        return { ok: true, durationMs: 5 };
      },
    });
    expect(exit).toBe(0);

    const screenshotsDir = path.join(root, ".qfai/evidence/prototyping/screenshots");
    const htmlDir = path.join(root, ".qfai/evidence/prototyping/html");
    // PNG mirror — byte-equivalent to the iter-00 source
    const mirroredPng = await readFile(path.join(screenshotsDir, "home_page.png"));
    const sourcePng = await readFile(
      path.join(root, ".qfai/evidence/prototyping/iter-00/home_page.png"),
    );
    expect(mirroredPng.equals(sourcePng)).toBe(true);
    // HTML mirror — preserves underscore casing
    const mirroredHtml = await readFile(path.join(htmlDir, "settings_panel.html"), "utf-8");
    expect(mirroredHtml).toContain("settings_panel");
  });

  it("does NOT create aggregate dirs when --capture is OFF (no screens to mirror)", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);
    const screenshotsDir = path.join(root, ".qfai/evidence/prototyping/screenshots");
    // Aggregate dirs are not pre-created on the default-OFF path.
    await expect(readFile(path.join(screenshotsDir, "anything.png"))).rejects.toThrow();
  });
});

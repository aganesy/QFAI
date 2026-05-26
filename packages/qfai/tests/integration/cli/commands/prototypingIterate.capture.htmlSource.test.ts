/**
 * `--capture` `htmlSourceCopy: true` byte-equivalent guarantee
 * (REQ-0012-0061 / TC-0012-0461).
 *
 * When the per-screen `htmlSourceCopy` flag is set, iterate copies
 * the source HTML at `.qfai/prototypes/iter-NN/<id>.html`
 * byte-for-byte (sha256 match) and does NOT inject runtime style
 * blocks (the `<style>` count must match exactly).
 *
 * This pins the contract that the htmlSourceCopy path bypasses any
 * `page.content()`-style live extraction (which would add
 * Playwright's own runtime style injections).
 */

// QFAI:SPEC-0012:TC-0012-0461

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-capture-htmlsrc-"));
  tempDirs.push(dir);
  return dir;
}

const CANONICAL_DESIGN_MD = [
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

async function seedMinimal(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), CANONICAL_DESIGN_MD, "utf-8");
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
    "# 01 Spec — t\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
}

describe("iterate --capture htmlSourceCopy byte-equivalent + zero injected <style>", () => {
  it("output html sha256 matches source AND has the same <style> tag count", async () => {
    const root = await newTempDir();
    await seedMinimal(root);

    const sourceDir = path.join(root, ".qfai/prototypes/iter-00");
    await mkdir(sourceDir, { recursive: true });
    // Source HTML with exactly 2 <style> blocks — the byte-equivalent
    // copy MUST also have exactly 2; any runtime injection from a
    // Playwright `page.content()` path would surface as a count mismatch.
    const sourceHtml = [
      "<!doctype html>",
      "<html><head>",
      "<style>body{margin:0}</style>",
      "<style>.x{color:#111}</style>",
      "</head><body><h1>Home</h1></body></html>",
    ].join("");
    const sourcePath = path.join(sourceDir, "home.html");
    await writeFile(sourcePath, sourceHtml, "utf-8");

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      screens: [{ id: "home", url: "/", htmlSourceCopy: true }],
      captureScreen: async ({ pngPath }) => {
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        return { ok: true, durationMs: 5 };
      },
    });
    expect(exit).toBe(0);

    const outPath = path.join(root, ".qfai/evidence/prototyping/iter-00/home.html");
    const outBytes = await readFile(outPath);
    const srcBytes = await readFile(sourcePath);

    const sha = (b: Buffer): string => createHash("sha256").update(b).digest("hex");
    expect(sha(outBytes)).toBe(sha(srcBytes));

    const countStyle = (s: string): number => (s.match(/<style[\s>]/gi) ?? []).length;
    const outStr = outBytes.toString("utf-8");
    expect(countStyle(outStr)).toBe(countStyle(sourceHtml));
    expect(countStyle(outStr)).toBe(2);
  });
});

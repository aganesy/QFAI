/**
 * `iterate --capture` opt-in flag (default OFF).
 *
 * 3 `it` blocks:
 *   (a) default invocation writes zero `.png` / `.html` artifacts
 *       (DR-0012-0029 preserved; amendment pinned by DR-0012-0031).
 *   (b) `--capture` writes one .png + .html per `iterate-plan.json#screens[]`.
 *   (c) `htmlSourceCopy: true` produces byte-equivalent .html to the
 *       `.qfai/prototypes/iter-NN/<screen-id>.html` source (sha256 match).
 *
 * Capture is driven through an injectable `captureScreen` callback so
 * the test does not spawn real Playwright; the integration scope is
 * the flag plumbing + per-screen iteration + htmlSourceCopy byte-copy.
 */

// QFAI:SPEC-0012:TC-0012-0440

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-capture-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

const CANONICAL_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "audience:",
  '  emotion: ["confident comparison"]',
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
  "Restrained, calm, sober.",
  "",
].join("\n");

async function seedMinimalProject(root: string): Promise<void> {
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

describe("iterate --capture default OFF", () => {
  it("writes zero PNG/HTML when --capture is NOT passed", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);
    const iterDir = path.join(root, ".qfai/evidence/prototyping/iter-00");
    const entries = await readdir(iterDir);
    expect(entries.some((e) => e.endsWith(".png"))).toBe(false);
    expect(entries.some((e) => e.endsWith(".html"))).toBe(false);
  });
});

describe("iterate --capture ON writes per iterate-plan.json#screens[]", () => {
  it("writes one .png + .html per screen when --capture flag is true", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);

    // Inject a deterministic capture runner so the test does not
    // spawn real Playwright. The runner receives the resolved screen
    // descriptor and writes synthetic bytes; iterate is responsible
    // for invoking it once per screen.
    const calls: Array<{ screenId: string; pngPath: string; htmlPath: string }> = [];
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      screens: [
        { id: "home", url: "/" },
        { id: "settings", url: "/settings" },
      ],
      captureScreen: async ({ screenId, pngPath, htmlPath }) => {
        calls.push({ screenId, pngPath, htmlPath });
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, `<!doctype html><html><body>${screenId}</body></html>`);
        return { ok: true, durationMs: 12 };
      },
    });
    expect(exit).toBe(0);
    expect(calls.map((c) => c.screenId).sort()).toEqual(["home", "settings"]);

    const iterDir = path.join(root, ".qfai/evidence/prototyping/iter-00");
    const entries = await readdir(iterDir);
    expect(entries.filter((e) => e.endsWith(".png")).sort()).toEqual(["home.png", "settings.png"]);
    expect(entries.filter((e) => e.endsWith(".html")).sort()).toEqual([
      "home.html",
      "settings.html",
    ]);
  });
});

describe("iterate --capture with htmlSourceCopy: true is byte-equivalent", () => {
  it("copies the .qfai/prototypes/iter-NN/<screen>.html source byte-for-byte (sha256 match)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);

    // Seed a source HTML at .qfai/prototypes/iter-00/home.html
    const sourceDir = path.join(root, ".qfai/prototypes/iter-00");
    await mkdir(sourceDir, { recursive: true });
    const sourceHtml = "<!doctype html><html><body>SRC content</body></html>";
    const sourcePath = path.join(sourceDir, "home.html");
    await writeFile(sourcePath, sourceHtml, "utf-8");

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      screens: [{ id: "home", url: "/", htmlSourceCopy: true }],
      // When htmlSourceCopy is true, iterate must copy the source
      // file directly — no need to call captureScreen for HTML, but
      // captureScreen is still invoked for the PNG side.
      captureScreen: async ({ pngPath }) => {
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        return { ok: true, durationMs: 7 };
      },
    });
    expect(exit).toBe(0);

    const outPath = path.join(root, ".qfai/evidence/prototyping/iter-00/home.html");
    const outBytes = await readFile(outPath);
    const srcBytes = await readFile(sourcePath);
    const sha = (b: Buffer): string => createHash("sha256").update(b).digest("hex");
    expect(sha(outBytes)).toBe(sha(srcBytes));
  });
});

/**
 * `--capture` per-screen 30s soft-warning budget (NFR-0107).
 *
 * When a screen's capture runner reports `durationMs > 30_000`,
 * iterate emits a soft warning (does NOT hard-fail the run; exit
 * remains 0 absent any other failure).
 *
 * Implementation uses the runner's reported `durationMs`; iterate
 * does not measure clock time itself for this gate. The test passes
 * `captureBudgetMs: 100` to keep wall-clock fast while still pinning
 * the comparison semantics.
 */

// QFAI:SPEC-0012:TC-0012-0441

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-capture-budget-"));
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

describe("iterate --capture budget — over-budget emits soft warning, run continues", () => {
  it("emits warning when durationMs > captureBudgetMs but exits 0", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const writes: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((c) => {
      writes.push(String(c));
      return true;
    });
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((c) => {
      writes.push(String(c));
      return true;
    });
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:5173",
        capture: true,
        captureBudgetMs: 100,
        screens: [{ id: "slow", url: "/" }],
        captureScreen: async ({ pngPath, htmlPath }) => {
          await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
          await writeFile(htmlPath, "<html></html>");
          // Report a duration that deliberately exceeds the 100ms test
          // budget. The runner itself returns quickly so the test does
          // not actually wait 32 seconds.
          return { ok: true, durationMs: 32_000 };
        },
      });
      expect(exit, writes.join("\n")).toBe(0);
      expect(writes.join("\n")).toMatch(/exceeded 100ms budget/);
      expect(writes.join("\n")).toMatch(/soft warning/);
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });

  it("does NOT warn when durationMs <= captureBudgetMs", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:5173",
        capture: true,
        captureBudgetMs: 100,
        screens: [{ id: "fast", url: "/" }],
        captureScreen: async ({ pngPath, htmlPath }) => {
          await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
          await writeFile(htmlPath, "<html></html>");
          return { ok: true, durationMs: 4 };
        },
      });
      expect(exit).toBe(0);
      const writes = stdoutSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(writes).not.toMatch(/exceeded.*budget/);
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});

/**
 * `--auto-serve` SIGINT graceful teardown within 2s (TC-0012-0462).
 *
 * Implementation contract (NFR-0106):
 *   - When iterate is running with `--auto-serve` AND a SIGINT
 *     arrives mid-run, iterate MUST invoke the runner's `teardown`
 *     within 2s. The runner is responsible for `tree-kill` (POSIX)
 *     or `taskkill /F /T` (Windows).
 *
 * Test scope: pure-logic verification — we DO NOT raise a real OS
 * signal. The test asserts that the SIGINT handler (installed by
 * iterate when `autoServe: true`) is wired AND that invoking it
 * resolves the teardown callback. Cross-platform tree-kill /
 * taskkill behaviour is the runner's responsibility (mocked here).
 */

// QFAI:SPEC-0012:TC-0012-0462

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
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-autoserve-sigint-"));
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

describe("iterate --auto-serve SIGINT teardown", () => {
  it("installs a SIGINT handler after the runner returns and removes it after cycle completion", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const sigintListenersBefore = process.listenerCount("SIGINT");

    let listenersDuringCapture = -1;
    const teardown = vi.fn(async () => {});
    const runner = vi.fn(async () => ({ ok: true, teardown, pid: 11111 }) as const);

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      autoServe: true,
      capture: true,
      screens: [{ id: "home", url: "/" }],
      captureScreen: async ({ pngPath, htmlPath }) => {
        listenersDuringCapture = process.listenerCount("SIGINT");
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, "<html></html>");
        return { ok: true, durationMs: 5 };
      },
      serverRunner: runner,
    });

    expect(exit).toBe(0);
    expect(teardown).toHaveBeenCalledTimes(1);
    // During the capture phase the SIGINT listener count MUST be one
    // higher than the baseline; iterate installed exactly one handler
    // for the auto-serve teardown path.
    expect(listenersDuringCapture).toBe(sigintListenersBefore + 1);
    // After a clean cycle completion the SIGINT handler MUST be
    // removed so a follow-up `runPrototypingIterate` invocation in
    // the same process does not pile up duplicate listeners.
    expect(process.listenerCount("SIGINT")).toBe(sigintListenersBefore);
  });

  it("teardown executes within 2s when SIGINT is dispatched mid-run", async () => {
    const root = await newTempDir();
    await seedMinimal(root);

    const teardownStartedAt: number[] = [];
    const teardownEndedAt: number[] = [];
    const teardown = vi.fn(async () => {
      teardownStartedAt.push(Date.now());
      // simulate quick tree-kill / taskkill within the 2s NFR-0106 bound
      await new Promise((r) => setTimeout(r, 5));
      teardownEndedAt.push(Date.now());
    });
    const runner = vi.fn(async () => ({ ok: true, teardown, pid: 22222 }) as const);

    // Capture runner emits SIGINT in the middle of its execution. The
    // SIGINT handler installed by iterate (during the auto-serve
    // setup) must reach the teardown within 2s.
    const sigintDispatchedAt: number[] = [];
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      autoServe: true,
      capture: true,
      screens: [{ id: "home", url: "/" }],
      captureScreen: async ({ pngPath, htmlPath }) => {
        sigintDispatchedAt.push(Date.now());
        process.emit("SIGINT");
        // Yield to let the handler run.
        await new Promise((r) => setTimeout(r, 10));
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, "<html></html>");
        return { ok: true, durationMs: 5 };
      },
      serverRunner: runner,
    });

    expect(exit).toBe(0);
    // Teardown should have run AT LEAST once. SIGINT-driven teardown
    // semantics: iterate must not call teardown twice on the same
    // resolved teardown — once via SIGINT, then a second time at
    // cycle end would be a double-close defect on real resources.
    expect(teardown).toHaveBeenCalledTimes(1);
    const teardownEnd = teardownEndedAt[0];
    const sigintStart = sigintDispatchedAt[0];
    if (typeof sigintStart === "number" && typeof teardownEnd === "number") {
      expect(teardownEnd - sigintStart).toBeLessThan(2_000);
    }
  });
});

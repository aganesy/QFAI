/**
 * `iterate --auto-serve` opt-in flag with foreign-process protection
 * (REQ-0012-0062 / NFR-0106).
 *
 * 4 `it` blocks via injected ServerRunner:
 *   (a) default invocation spawns no server (DR-0012-0029 preserved).
 *   (b) `--auto-serve` invokes the runner; teardown invoked once at
 *       cycle end.
 *   (c) stale prior-iterate owner: runner returns `{ ok: true }`
 *       (recovery path) — iterate proceeds and ultimately invokes
 *       teardown. The stale-owner recovery contract is owned by the
 *       runner (test injects the recovery semantics directly).
 *   (d) foreign-process owner: runner returns
 *       `{ ok: false, reason: "<PID + command>"} ` — iterate returns
 *       exit 2 with the PID/command surfaced on stderr.
 */

// QFAI:SPEC-0012:TC-0012-0442

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
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-auto-serve-"));
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

describe("iterate --auto-serve default OFF", () => {
  it("does not invoke the server runner when --auto-serve is absent", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const runner = vi.fn();
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      serverRunner: runner,
    });
    expect(exit).toBe(0);
    expect(runner).not.toHaveBeenCalled();
  });
});

describe("iterate --auto-serve ON invokes runner + teardown", () => {
  it("calls the runner once and invokes the returned teardown at cycle end", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const teardown = vi.fn(async () => {});
    const runner = vi.fn(async () => ({ ok: true, teardown, pid: 12345 }) as const);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      autoServe: true,
      serverRunner: runner,
    });
    expect(exit).toBe(0);
    expect(runner).toHaveBeenCalledTimes(1);
    expect(teardown).toHaveBeenCalledTimes(1);
  });
});

describe("iterate --auto-serve stale prior-iterate owner recovers", () => {
  it("accepts runner.ok=true (recovery path) and continues to cycle completion", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    // The runner simulates "stale port owner was a previous iterate;
    // force-killed cleanly, now we own the port" — runner returns ok.
    const teardown = vi.fn(async () => {});
    const runner = vi.fn(async () => ({ ok: true, teardown, pid: 67890 }) as const);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      autoServe: true,
      serverRunner: runner,
    });
    expect(exit).toBe(0);
    expect(teardown).toHaveBeenCalledTimes(1);
  });
});

describe("iterate --auto-serve foreign-process refusal", () => {
  it("returns exit 2 with PID + owning command on stderr when runner refuses", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const stderrChunks: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((c) => {
      stderrChunks.push(String(c));
      return true;
    });
    try {
      const runner = vi.fn(
        async () =>
          ({
            ok: false,
            reason: "foreign process owns port 5173 (pid=4242, cmd=nginx)",
            foreignPid: 4242,
          }) as const,
      );
      const exit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:5173",
        autoServe: true,
        serverRunner: runner,
      });
      expect(exit).toBe(2);
      const joined = stderrChunks.join("");
      expect(joined).toMatch(/foreign process/);
      expect(joined).toMatch(/4242/);
      expect(joined).toMatch(/nginx/);
    } finally {
      stderrSpy.mockRestore();
    }
  });
});

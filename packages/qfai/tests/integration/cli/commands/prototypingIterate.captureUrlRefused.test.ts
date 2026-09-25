/**
 * `iterate --capture` refusing a screen whose URL cannot be composed
 * (TC-0012-0495).
 *
 * Two URLs cannot be composed: a route-relative screen URL with no
 * `--target-url`, and a screen URL and `--target-url` that do not form a URL.
 * For each, iterate exits 2 with a reason on stderr naming the screen and
 * `--target-url`, and captures nothing.
 */

// QFAI:SPEC-0012:TC-0012-0495

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, type Mock, vi } from "vitest";

import {
  runPrototypingIterate,
  type CaptureScreenFn,
} from "../../../../src/cli/commands/prototypingIterate.js";
import { captureStderr } from "../../../helpers/stderr.js";
import { captureStdout } from "../../../helpers/stdout.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-capture-url-refused-"));
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

type RefusedRun = {
  readonly exit: number;
  readonly stderr: string;
};

/** Run one `--capture` cycle, returning its exit code and what it wrote to stderr. */
async function runCapture(
  options: Parameters<typeof runPrototypingIterate>[0],
): Promise<RefusedRun> {
  let exit = -1;
  let stderr = "";
  await captureStdout(async () => {
    stderr = await captureStderr(async () => {
      exit = await runPrototypingIterate(options);
    });
  });
  return { exit, stderr };
}

function okRunner(): Mock<CaptureScreenFn> {
  return vi.fn<CaptureScreenFn>(() => Promise.resolve({ ok: true, durationMs: 1 }));
}

describe("iterate --capture refuses a screen whose URL cannot be composed", () => {
  // QFAI:SPEC-0012:TC-0012-0495
  it("exits 2 naming the screen and --target-url when a route-relative URL has no --target-url", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    // Cycle 0 requires --target-url, so cycle 0 runs with one and cycle 1,
    // the run under test, runs without.
    const seed = await runCapture({ root, cycle: 0, targetUrl: "http://localhost:5173/app/" });
    expect(seed.exit).toBe(0);

    const captureScreen = okRunner();
    const run = await runCapture({
      root,
      cycle: 1,
      capture: true,
      screens: [{ id: "home", url: "/" }],
      captureScreen,
    });

    expect(run.exit).toBe(2);
    expect(run.stderr).toMatch(/\bscreen home\b/);
    expect(run.stderr).toMatch(/--target-url/);
    expect(captureScreen).not.toHaveBeenCalled();
  });

  // QFAI:SPEC-0012:TC-0012-0495
  it("exits 2 naming the screen and --target-url when the screen URL and --target-url do not compose", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const captureScreen = okRunner();
    // `new URL("/", "not a url")` throws: the base is not a URL.
    const run = await runCapture({
      root,
      cycle: 0,
      targetUrl: "not a url",
      capture: true,
      screens: [{ id: "home", url: "/" }],
      captureScreen,
    });

    expect(run.exit).toBe(2);
    expect(run.stderr).toMatch(/\bscreen home\b/);
    expect(run.stderr).toMatch(/--target-url/);
    expect(captureScreen).not.toHaveBeenCalled();
  });
});

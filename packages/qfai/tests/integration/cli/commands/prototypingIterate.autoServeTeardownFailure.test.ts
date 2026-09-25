/**
 * `--auto-serve` teardown that rejects (TC-0012-0490).
 *
 * When the teardown the server runner returns rejects, iterate prints
 * `qfai prototyping iterate --auto-serve: teardown failed (<reason>)` on
 * stdout and returns the exit code the cycle returns when the teardown
 * resolves. The case runs the same cycle twice, once with each teardown, and
 * compares the two.
 */

// QFAI:SPEC-0012:TC-0012-0490

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  runPrototypingIterate,
  type ServerRunnerResult,
} from "../../../../src/cli/commands/prototypingIterate.js";
import { captureStdout } from "../../../helpers/stdout.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-autoserve-teardown-"));
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

type CycleRun = {
  readonly exit: number;
  readonly stdout: string;
  readonly teardownCalls: number;
};

/** Run one `--auto-serve` cycle on a fresh tree with the given teardown. */
async function runCycle(teardown: () => Promise<void>): Promise<CycleRun> {
  const root = await newTempDir();
  await seedMinimal(root);
  const teardownSpy = vi.fn(teardown);
  const result: ServerRunnerResult = { ok: true, teardown: teardownSpy, pid: 3000 };
  const runner = vi.fn(() => Promise.resolve(result));
  let exit = -1;
  const stdout = await captureStdout(async () => {
    exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:3000",
      autoServe: true,
      serverRunner: runner,
    });
  });
  return { exit, stdout, teardownCalls: teardownSpy.mock.calls.length };
}

function teardownFailureLines(stdout: string): string[] {
  return stdout.split("\n").filter((line) => line.includes("teardown failed"));
}

describe("iterate --auto-serve teardown that rejects", () => {
  // QFAI:SPEC-0012:TC-0012-0490
  it("reports a rejected auto-serve teardown on stdout and keeps the exit code of a resolving teardown", async () => {
    const resolved = await runCycle(async () => {});
    const rejected = await runCycle(() => Promise.reject(new Error("port 3000 still bound")));

    // The control: the same cycle with a teardown that resolves.
    expect(resolved.teardownCalls).toBe(1);
    expect(teardownFailureLines(resolved.stdout)).toEqual([]);

    // The teardown ran and rejected, and stdout names the `--auto-serve`
    // teardown as what failed, with the rejection's reason.
    expect(rejected.teardownCalls).toBe(1);
    expect(teardownFailureLines(rejected.stdout)).toEqual([
      "qfai prototyping iterate --auto-serve: teardown failed (Error: port 3000 still bound)",
    ]);

    // The rejection leaves the exit code where the resolving teardown left it.
    expect(rejected.exit).toBe(resolved.exit);
    expect(rejected.exit).toBe(0);
  });
});

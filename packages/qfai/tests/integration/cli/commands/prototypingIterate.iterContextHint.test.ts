/**
 * iter-NN/iterate-context.json structured prior-cycle hint
 * (spec-0012 Phase 4 / REQ-0012-0072 / TC-0012-0456).
 *
 * On cycle >= 1, iterate writes `iter-NN/iterate-context.json` with
 * `{priorCycle, priorScores, openBlockers, priorTailwindContract}`.
 * The file is advisory-only (certify ignores presence/absence).
 */

// QFAI:SPEC-0012:TC-0012-0456

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";
import {
  ITERATE_CONTEXT_KEYS,
  isIterateContext,
} from "../../../../src/core/prototyping/iterateContext.js";

const DESIGN_MD = [
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
  "# Brand",
  "Calm.",
].join("\n");

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-iterctx-"));
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
  await writeFile(path.join(root, "DESIGN.md"), DESIGN_MD, "utf-8");
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

describe("iter-NN/iterate-context.json", () => {
  it("writes the advisory file with the locked 4-key schema on cycle >= 1", async () => {
    const root = await newTempDir();
    await seedProject(root);
    // Cycle 0 seeds prototyping.json with one stub iteration (index=0)
    // whose scores are all `weak` (so the loop continues at cycle 1).
    const c0 = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(c0).toBe(0);

    // Cycle 1 then writes iter-01/iterate-context.json from the prior
    // recorded iteration.
    const c1 = await runPrototypingIterate({
      root,
      cycle: 1,
      targetUrl: "http://localhost:5173",
    });
    expect(c1).toBe(0);

    const ctxPath = path.join(
      root,
      ".qfai/evidence/prototyping/iter-01/iterate-context.json",
    );
    const ctxText = await readFile(ctxPath, "utf-8");
    const ctx = JSON.parse(ctxText);
    expect(isIterateContext(ctx)).toBe(true);
    expect(Object.keys(ctx).sort()).toEqual([...ITERATE_CONTEXT_KEYS].sort());
    expect(ctx.priorCycle).toBe(0);
    expect(typeof ctx.priorTailwindContract).toBe("string");
    expect(Array.isArray(ctx.openBlockers)).toBe(true);
  });
});

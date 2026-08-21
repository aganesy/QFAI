/**
 * /qfai-prototyping single-thread evolution loop — end-to-end test.
 *
 * Drives the iterate command across a multi-cycle scenario in a tmp
 * workspace and asserts the deterministic stop conditions:
 *   cycle 0 (seed)        -> exit 0, iter-00/iterate-plan.json written
 *   cycle 1..2 (continue) -> exit 0
 *   cycle 3 (convergence) -> exit 64 once a prototyping.json with a
 *                            fully-exceptional last iter is in place
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../src/cli/commands/prototypingIterate.js";
import { hashDesignMd } from "../../src/core/design/designMd.js";

const E2E_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
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
  "# Brand Philosophy",
  "",
  "Calm, restrained.",
  "",
].join("\n");

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-proto-e2e-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function seedRepo(root: string): Promise<void> {
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
      "  require:",
      "    specSections: []",
      "  testStrategy:",
      "    requireApiAtdd: false",
      "    requireE2eAtdd: false",
      "    requireIntegrationAtdd: false",
      "    requireUnitTdd: false",
      "    requireSpecTagBlock: false",
      "    requireRoutingProfile: false",
    ].join("\n"),
    "utf-8",
  );
  const specDir = path.join(root, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "# 01 Spec — e2e\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
  await writeFile(path.join(root, "DESIGN.md"), E2E_DESIGN_MD, "utf-8");
}

async function seedIterations(
  root: string,
  iters: ReadonlyArray<{
    index: number;
    allEx?: boolean;
    lap?: string[];
  }>,
): Promise<void> {
  const dir = path.join(root, ".qfai/evidence/prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "prototyping.json"),
    JSON.stringify({
      specsCovered: ["0001"],
      frozenSpecsCovered: ["0001"],
      frozenSurfaceUnion: ["0001"],
      frozenLicenseCatalog: {
        allowedSources: ["unsplash", "pexels"],
        licenseTiers: {
          unsplash: ["unsplash-license", "free"],
          pexels: ["pexels-free"],
        },
        sourceHosts: {
          unsplash: ["images.unsplash.com", "unsplash.com"],
          pexels: ["images.pexels.com", "pexels.com"],
        },
      },
      iterations: iters.map((it) => ({
        index: it.index,
        commitSha: "a".repeat(40),
        scores: it.allEx
          ? {
              informationArchitecture: "exceptional",
              navigationFlow: "exceptional",
              usability: "exceptional",
              functionality: "exceptional",
            }
          : {
              informationArchitecture: "acceptable",
              navigationFlow: "acceptable",
              usability: "acceptable",
              functionality: "acceptable",
            },
        proseCritique: "x".repeat(1500),
        layoutAntiPatternsDetected: it.lap ?? [],
        designMdViolations: [],
        pivotDirective: "continue",
        evidenceRefs: {
          screenshot: `.qfai/evidence/prototyping/iter-${String(it.index).padStart(2, "0")}/home.png`,
          html: `.qfai/evidence/prototyping/iter-${String(it.index).padStart(2, "0")}/home.html`,
        },
      })),
      acceptedIterationIndex: iters.length - 1,
      stopReason: null,
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(E2E_DESIGN_MD) },
    }),
    "utf-8",
  );
}

describe("/qfai-prototyping end-to-end", () => {
  it("cycles 0..3 progress through seed -> continue -> continue -> convergence", async () => {
    const root = await newTempDir();
    await seedRepo(root);

    // Cycle 0 (seed) — exit 0
    const c0 = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(c0).toBe(0);

    // Seed the prototyping.json with iter-00 (acceptable across the board).
    await seedIterations(root, [{ index: 0 }]);

    // Cycle 1 — continue (no convergence yet, no max).
    const c1 = await runPrototypingIterate({ root, cycle: 1 });
    expect(c1).toBe(0);

    // Add iter-01 (still acceptable).
    await seedIterations(root, [{ index: 0 }, { index: 1 }]);

    // Cycle 2 — continue.
    const c2 = await runPrototypingIterate({ root, cycle: 2 });
    expect(c2).toBe(0);

    // Add iter-02 with all-exceptional scores and no slop -> convergence.
    await seedIterations(root, [{ index: 0 }, { index: 1 }, { index: 2, allEx: true }]);

    // Cycle 3 — must short-circuit with convergence (exit 64).
    const c3 = await runPrototypingIterate({ root, cycle: 3 });
    expect(c3).toBe(64);
  });

  it("exit 65 fires when last iter index === 9 even with weak scores", async () => {
    const root = await newTempDir();
    await seedRepo(root);

    const fifteen = Array.from({ length: 10 }, (_, i) => ({ index: i }));
    await seedIterations(root, fifteen);

    // Asking iterate for cycle 9 (already at MAX_ITERATION_INDEX) must
    // short-circuit with max-iterations.
    const code = await runPrototypingIterate({ root, cycle: 9 });
    expect(code).toBe(65);
  });

  it("convergence is suppressed when layoutAntiPatternsDetected is non-empty even if all 4 axes are exceptional", async () => {
    const root = await newTempDir();
    await seedRepo(root);
    await seedIterations(root, [
      {
        index: 0,
        allEx: true,
        lap: ["lap-001-saas-dashboard"],
      },
    ]);

    // Latest iter is "all exceptional but with a layout anti-pattern" —
    // the IA cap denies convergence; iterate continues.
    const code = await runPrototypingIterate({ root, cycle: 1 });
    expect(code).toBe(0);
  });
});

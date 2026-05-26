/**
 * `qfai prototyping iterate` emits a validate-conformant
 * prototyping.json (spec-0012 Phase 3 / REQ-0012-0063).
 *
 * Asserts that after `iterate --cycle 0` completes,
 * `validatePrototypingEvidence` returns zero `error`-severity issues
 * without any orchestrator post-processing. The seed iteration entry
 * carries all schema-required fields:
 *   - non-null commitSha (accepts "uncommitted" sentinel)
 *   - 200..500-word proseCritique
 *   - 4-axis scores
 *   - layoutAntiPatternsDetected: []
 *   - designMdViolations: []
 *   - pivotDirective
 *   - reviewerId
 *   - evidenceRefs[] bijecting with declared screens[].id
 * Plus top-level `acceptedIterationIndex` + `stopReason`.
 */

// QFAI:SPEC-0012:TC-0012-0443

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";
import { loadConfig } from "../../../../src/core/config.js";
import { validatePrototypingEvidence } from "../../../../src/core/validators/prototypingEvidence.ts";

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
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-iterate-vconf-"));
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

describe("iterate cycle 0 emits validate-conformant prototyping.json", () => {
  it("validatePrototypingEvidence returns zero error-severity issues post-cycle-0 (default-OFF capture)", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);
    const { config } = await loadConfig(root);
    const issues = await validatePrototypingEvidence(root, config);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("validatePrototypingEvidence returns zero error-severity issues with declared screens (--capture path)", async () => {
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
      captureScreen: async ({ pngPath, htmlPath }) => {
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, "<html></html>");
        return { ok: true, durationMs: 4 };
      },
    });
    expect(exit).toBe(0);
    const { config } = await loadConfig(root);
    const issues = await validatePrototypingEvidence(root, config);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("seed iteration carries evidenceRefs bijecting with declared screens", async () => {
    const root = await newTempDir();
    await seedProject(root);
    await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      screens: [
        { id: "home_page", url: "/" },
        { id: "settings_panel", url: "/settings" },
      ],
      captureScreen: async ({ pngPath, htmlPath }) => {
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, "<html></html>");
        return { ok: true, durationMs: 4 };
      },
    });
    const protoJsonRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      "utf-8",
    );
    const parsed = JSON.parse(protoJsonRaw) as {
      iterations: Array<{
        index: number;
        commitSha: string;
        evidenceRefs: Array<{ kind: string; path: string }>;
        reviewerId: string;
      }>;
      acceptedIterationIndex: number;
      stopReason: string | null;
    };
    expect(parsed.iterations).toHaveLength(1);
    expect(parsed.iterations[0]?.commitSha).toBe("uncommitted");
    expect(parsed.iterations[0]?.reviewerId).toBe("iterate-seed");
    expect(parsed.iterations[0]?.evidenceRefs).toEqual([
      { kind: "screenshot", path: "iter-00/home_page.png" },
      { kind: "html", path: "iter-00/home_page.html" },
      { kind: "screenshot", path: "iter-00/settings_panel.png" },
      { kind: "html", path: "iter-00/settings_panel.html" },
    ]);
    expect(parsed.acceptedIterationIndex).toBe(0);
    expect(parsed.stopReason).toBe(null);
  });
});

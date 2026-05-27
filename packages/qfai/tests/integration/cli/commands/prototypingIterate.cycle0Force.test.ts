/**
 * `iterate --cycle 0 --force` destructive-rerun backup
 * (spec-0012 Phase 3 / REQ-0012-0067).
 *
 * Asserts:
 *   (a) Without `--force`: an existing iter-00 dir triggers exit 2
 *       with a recovery hint that names `--force` + the offending
 *       path.
 *   (b) With `--force`: iter-00 is RENAMED to
 *       `iter-00.backup-<ISO>` BEFORE clearEvidenceIterDirs runs;
 *       backup byte-equivalence is preserved.
 */

// QFAI:SPEC-0012:TC-0012-0449

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";

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
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cycle0-force-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  vi.restoreAllMocks();
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

async function seedExistingIter00(root: string, contents: string): Promise<string> {
  const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
  await mkdir(iter00, { recursive: true });
  const markerPath = path.join(iter00, "prior-loop.marker");
  await writeFile(markerPath, contents, "utf-8");
  return markerPath;
}

function captureStderr(): string[] {
  const lines: string[] = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown): boolean => {
    lines.push(String(chunk));
    return true;
  });
  return lines;
}

describe("iterate --cycle 0 destructive-rerun gate", () => {
  it("refuses without --force when iter-00 already exists (exit 2 + recovery hint)", async () => {
    const root = await newTempDir();
    await seedProject(root);
    await seedExistingIter00(root, "prior loop seed");
    const stderr = captureStderr();
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(2);
    const joined = stderr.join("");
    expect(joined).toMatch(/--force/);
    expect(joined).toMatch(/iter-00/);
  });

  it("backs up iter-00 to iter-00.backup-<ISO> with --force; backup is byte-equivalent", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const PRIOR_CONTENT = "byte-equivalent marker for the prior loop seed";
    await seedExistingIter00(root, PRIOR_CONTENT);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });
    expect(exit).toBe(0);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    const entries = await readdir(evidenceRoot);
    const backup = entries.find((e) => e.startsWith("iter-00.backup-"));
    expect(backup).toBeDefined();
    const backedUp = await readFile(
      path.join(evidenceRoot, backup as string, "prior-loop.marker"),
      "utf-8",
    );
    expect(backedUp).toBe(PRIOR_CONTENT);
    // The new iter-00 must also exist (cycle 0 re-seeded).
    expect(entries).toContain("iter-00");
  });

  it("does NOT refuse when iter-00 does not exist (fresh project default path)", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);
  });
});

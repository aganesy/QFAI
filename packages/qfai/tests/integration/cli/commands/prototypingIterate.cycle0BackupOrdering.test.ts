/**
 * `iterate --cycle 0 --force` ordering invariant
 * (spec-0012 Phase 3 / REQ-0012-0067).
 *
 * The Phase 3 contract requires that the rename
 * `iter-00 → iter-00.backup-<ISO>` resolves BEFORE any
 * `clearEvidenceIterDirs` rm pass. This guarantees that a failure on
 * the rename aborts the cycle WITHOUT destroying the prior loop's
 * evidence.
 *
 * The test verifies this in two complementary ways:
 *   (a) Observable on-disk state: after a `--force` re-run the
 *       backup dir is present alongside the fresh iter-00. If rm
 *       had run BEFORE rename, the backup would be missing.
 *   (b) Spy on `fs/promises.rename` failing → assert no iter-NN
 *       directory was deleted (the on-disk dir is preserved AND the
 *       command returns exit 2 with the abort diagnostic).
 */

// QFAI:SPEC-0012:TC-0012-0465

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
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cycle0-order-"));
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
  const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
  await mkdir(iter00, { recursive: true });
  await writeFile(path.join(iter00, "prior-loop.marker"), "prior-content", "utf-8");
}

describe("iterate --cycle 0 --force backup-before-clear ordering", () => {
  it("preserves the prior iter-00 content under iter-00.backup-<ISO> after --force re-run", async () => {
    const root = await newTempDir();
    await seedProject(root);
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
    // Byte-equivalence check: backup carries the prior marker file.
    const marker = await readFile(
      path.join(evidenceRoot, backup as string, "prior-loop.marker"),
      "utf-8",
    );
    expect(marker).toBe("prior-content");
    // Fresh iter-00 was created by the re-seed.
    expect(entries).toContain("iter-00");
  });

  it("aborts WITHOUT clearing evidence when the rename target collides (exit 2)", async () => {
    // The rename throws naturally when its destination already exists
    // on a directory write (Windows EEXIST / POSIX rename-to-existing
    // dir). We pre-create a same-prefix backup dir whose timestamp
    // collides with the new ISO timestamp by spying on Date#toISOString,
    // forcing rename to fail and the abort-before-destroy contract to
    // engage.
    const root = await newTempDir();
    await seedProject(root);
    const markerPath = path.join(
      root,
      ".qfai/evidence/prototyping/iter-00/prior-loop.marker",
    );

    // Pin the ISO timestamp to a constant value so we can pre-create a
    // colliding backup directory whose contents are NON-empty
    // (renaming onto a non-empty target dir is rejected on every major
    // platform).
    const FIXED_ISO = "2026-01-01T00:00:00.000Z";
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue(FIXED_ISO);
    const collidingBackup = path.join(
      root,
      `.qfai/evidence/prototyping/iter-00.backup-${FIXED_ISO.replace(/[:.]/g, "-")}`,
    );
    await mkdir(collidingBackup, { recursive: true });
    await writeFile(path.join(collidingBackup, "stop-rename.marker"), "x", "utf-8");

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });
    expect(exit).toBe(2);
    // The prior iter-00 marker MUST still exist (no destructive clear).
    const surviving = await readFile(markerPath, "utf-8");
    expect(surviving).toBe("prior-content");
    // The colliding backup dir is also untouched (rename onto non-empty
    // target dir fails).
    const collidingMarker = await readFile(
      path.join(collidingBackup, "stop-rename.marker"),
      "utf-8",
    );
    expect(collidingMarker).toBe("x");
  });
});

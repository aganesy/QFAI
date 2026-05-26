/**
 * --license-patch add-only diff + audit row
 * (spec-0012 Phase 4 / REQ-0012-0071 / TC-0012-0455).
 *
 * Applies an add-only diff to the frozen license catalog and appends a
 * `licensePatchAudit[]` row with `{appliedAt, patchSha256, addedSources}`.
 * Deletion / modification patches are rejected with exit 2.
 */

// QFAI:SPEC-0012:TC-0012-0455

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";
import { isLicensePatchAuditRow } from "../../../../src/core/prototyping/licensePatchAudit.js";

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
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-licensepatch-"));
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

describe("iterate --license-patch add-only diff", () => {
  it("applies an add-only diff + records a licensePatchAudit[] row with `{appliedAt, patchSha256, addedSources}`", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const patch = { addedSources: ["wikimedia-commons"] };
    const patchPath = path.join(root, "patch.json");
    await writeFile(patchPath, JSON.stringify(patch), "utf-8");

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      licensePatch: "patch.json",
    });
    expect(exit).toBe(0);

    const proto = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/prototyping/prototyping.json"), "utf-8"),
    );
    expect(Array.isArray(proto.licensePatchAudit)).toBe(true);
    expect(proto.licensePatchAudit.length).toBe(1);
    const row = proto.licensePatchAudit[0];
    expect(isLicensePatchAuditRow(row)).toBe(true);
    expect(row.addedSources).toEqual(["wikimedia-commons"]);
    expect(proto.frozenLicenseCatalog.allowedSources).toContain("wikimedia-commons");
  });

  it("rejects a deletion patch with exit 2", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const patchPath = path.join(root, "patch.json");
    await writeFile(patchPath, JSON.stringify({ removeSources: ["pexels"] }), "utf-8");
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      licensePatch: "patch.json",
    });
    expect(exit).toBe(2);
  });

  it("rejects a modification patch (modify key) with exit 2", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const patchPath = path.join(root, "patch.json");
    await writeFile(patchPath, JSON.stringify({ modify: { unsplash: ["new-license"] } }), "utf-8");
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      licensePatch: "patch.json",
    });
    expect(exit).toBe(2);
  });
});

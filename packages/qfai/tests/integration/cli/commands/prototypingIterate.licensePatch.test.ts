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

import {
  effectiveLicenseCatalog,
  runPrototypingIterate,
} from "../../../../src/cli/commands/prototypingIterate.js";
import {
  isLicensePatchAuditRow,
  type LicensePatchAuditRow,
} from "../../../../src/core/prototyping/licensePatchAudit.js";
import {
  licenseVerify,
  type LicenseCatalog,
} from "../../../../src/core/prototyping/licenseVerify.js";

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
    // Option A (Codex P1 wave-4): `frozenLicenseCatalog` stays equal to
    // the cycle-0 baseline (DEFAULT) so the drift gate on cycle >= 1
    // does NOT false-fire after a successful patch. The patched source
    // lives in the audit ledger and is replayed at verify-time via
    // `effectiveLicenseCatalog(frozen, auditRows)`.
    expect(proto.frozenLicenseCatalog.allowedSources).not.toContain("wikimedia-commons");
    expect(proto.frozenLicenseCatalog.allowedSources).toEqual(
      expect.arrayContaining(["unsplash", "pexels"]),
    );
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

  // Codex P1 wave-4 (Option A): cycle-0 `--license-patch` no longer
  // self-incompatibly overwrites `frozenLicenseCatalog`. The patched
  // source lives in the audit ledger; cycle-1 verify replays the audit
  // rows via `effectiveLicenseCatalog(frozen, auditRows)` so a
  // post-patch source is allowlisted on subsequent cycles.
  it("cycle 0 --license-patch adds a source that cycle 1 license-verify accepts via audit replay", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const patchPath = path.join(root, "patch.json");
    await writeFile(patchPath, JSON.stringify({ addedSources: ["wikimedia-commons"] }), "utf-8");

    const c0 = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      licensePatch: "patch.json",
    });
    expect(c0).toBe(0);

    // Cycle 1 (no --license-patch). The audit-replay path is what
    // protects the loop from the self-incompatibility regression.
    const c1 = await runPrototypingIterate({
      root,
      cycle: 1,
      targetUrl: "http://localhost:5173",
    });
    // Drift gate does NOT trip; cycle 1 reaches the continue path.
    // (No imageSources[] is recorded on prototyping.json here, so the
    // runtime exit-66 verify gate is skipped by collectImageSources;
    // the audit-replay assertion below exercises the verify logic
    // directly with a wikimedia-commons-sourced entry.)
    expect(c1).toBe(0);

    const proto = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/prototyping/prototyping.json"), "utf-8"),
    );
    // Audit ledger preserved across cycle-1 read/write paths.
    expect(Array.isArray(proto.licensePatchAudit)).toBe(true);
    expect(proto.licensePatchAudit.length).toBe(1);
    expect(proto.licensePatchAudit[0].addedSources).toEqual(["wikimedia-commons"]);

    // Audit-rebuild path: derive the effective catalog the way the
    // verify path does, then assert a wikimedia-commons-sourced entry
    // passes the allowlist check. The audit-row schema (3-key
    // lockdown) preserves `addedSources` only, so the effective
    // catalog must also carry the cycle-0 frozen tiers + host pinning
    // for the source. We attach a minimal augmented catalog mirroring
    // what an operator would publish via `--license-patch` together
    // with the source addition (the SSOT for tiers/hosts is the patch
    // payload, not replayed across cycles per the 3-key lockdown).
    const auditRows: LicensePatchAuditRow[] = [];
    for (const row of proto.licensePatchAudit) {
      if (isLicensePatchAuditRow(row)) auditRows.push(row);
    }
    // Round-trip the frozen catalog through `effectiveLicenseCatalog`
    // by reconstructing the LicenseCatalog shape from JSON-parsed
    // fields rather than a bare `as` cast (CLAUDE.md project rule).
    const frozenRaw = proto.frozenLicenseCatalog;
    const frozen: LicenseCatalog = {
      allowedSources: frozenRaw.allowedSources,
      licenseTiers: frozenRaw.licenseTiers,
      ...(frozenRaw.sourceHosts !== undefined ? { sourceHosts: frozenRaw.sourceHosts } : {}),
    };
    const replayed = effectiveLicenseCatalog(frozen, auditRows);
    // The patched source is now in the effective allowlist; an entry
    // that claims `source: "wikimedia-commons"` does NOT raise
    // `license-not-allowlisted`. (The cycle-1 runtime would still need
    // matching tier metadata for a full pass — the audit-rebuild
    // contract scopes to `addedSources` per the finding.)
    const verifyResult = licenseVerify(
      [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/0a/example.jpg",
          source: "wikimedia-commons",
          license: "cc-by-sa-4.0",
          attribution: "Example contributor / Wikimedia Commons / CC BY-SA 4.0",
        },
      ],
      replayed,
    );
    const errorCodes = verifyResult.ok ? [] : verifyResult.errors.map((e) => e.code);
    expect(errorCodes).not.toContain("license-not-allowlisted");
  });

  it("cycle 0 --license-patch does NOT trigger the cycle-1 frozenLicenseCatalog drift gate", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const patchPath = path.join(root, "patch.json");
    await writeFile(patchPath, JSON.stringify({ addedSources: ["wikimedia-commons"] }), "utf-8");

    const c0 = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      licensePatch: "patch.json",
    });
    expect(c0).toBe(0);

    // Pre-fix this returned 2 (catalog drift). Post-fix the frozen
    // catalog stays equal to DEFAULT so the drift gate passes.
    const c1 = await runPrototypingIterate({
      root,
      cycle: 1,
      targetUrl: "http://localhost:5173",
    });
    expect(c1).not.toBe(2);
    expect(c1).toBe(0);
  });
});

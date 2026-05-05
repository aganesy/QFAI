/**
 * TC-3.8.x — designContractReadiness validator (Phase 3b).
 *
 * Asserts the new required-files set:
 *   - root DESIGN.md
 *   - .qfai/contracts/design/DESIGN.md.lock.yaml
 *
 * Plus preserved checks:
 *   - REQUIRED_PROTOTYPING_DESIGN_FILES (design-system.yaml, prototype-handoff.yaml)
 *   - DCON-019 premature prototyping contract (sdd stage)
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { hashDesignMd } from "../../../src/core/design/designMd.js";
import {
  validatePrototypingDesignContractReadiness,
  validateSddDesignContractReadiness,
} from "../../../src/core/validators/designContractReadiness.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-dcon-"));
  tempDirs.push(dir);
  return dir;
}

const VALID_DESIGN_MD = [
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
].join("\n");

async function seedUiBearingProject(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai/contracts/ui"), { recursive: true });
  await mkdir(path.join(root, ".qfai/contracts/design"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/contracts/ui/ui-0001.yaml"),
    "screens:\n  - id: home\n    title: Home\n    route: /\n",
    "utf-8",
  );
}

async function seedDesignMdAndLock(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), VALID_DESIGN_MD, "utf-8");
  await writeFile(
    path.join(root, ".qfai/contracts/design/DESIGN.md.lock.yaml"),
    [
      'designMdPath: "DESIGN.md"',
      `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
      'frozenAt: "2026-05-05T00:00:00Z"',
      "",
    ].join("\n"),
    "utf-8",
  );
}

async function seedPrototypingDesignYamls(root: string): Promise<void> {
  const dir = path.join(root, ".qfai/contracts/design");
  await writeFile(
    path.join(dir, "design-system.yaml"),
    "checklist:\n  color: [primary]\n  typography: [Inter]\n  spacing: [4px]\n  border_radius: [0.25rem]\n  shadow: [sm]\n  dos_and_donts: [be calm]\n  motion_rules: [reduce]\n  component_tone: [restrained]\n",
    "utf-8",
  );
  await writeFile(
    path.join(dir, "prototype-handoff.yaml"),
    [
      "sourcePrototypeRefs:",
      "  - .qfai/prototypes/final/index.html",
      "surfaceProfiles:",
      "  - desktop",
      "screens:",
      "  - home",
      "visualDna:",
      "  - calm",
      "implementationHandoff:",
      "  - tailwind",
      "",
    ].join("\n"),
    "utf-8",
  );
}

describe("validateSddDesignContractReadiness (TC-3.8.x)", () => {
  it("TC-3.8.1: new file set passes (no issues)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("TC-3.8.2: missing root DESIGN.md → DCON-030", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await rm(path.join(root, "DESIGN.md"), { force: true });
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("QFAI-DCON-030");
    const dcon030 = issues.find((i) => i.code === "QFAI-DCON-030");
    expect(dcon030?.file).toBe("DESIGN.md");
    expect(dcon030?.severity).toBe("error");
  });

  it("TC-3.8.3: missing DESIGN.md.lock.yaml → DCON-031", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await rm(path.join(root, ".qfai/contracts/design/DESIGN.md.lock.yaml"), { force: true });
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    expect(issues.map((i) => i.code)).toContain("QFAI-DCON-031");
  });

  it("TC-3.8.5: REQUIRED_PROTOTYPING_DESIGN_FILES preserved (prototyping stage)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    // No prototyping yamls seeded → should raise DCON-001 for each.
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon001 = issues.filter((i) => i.code === "QFAI-DCON-001");
    expect(dcon001.length).toBeGreaterThanOrEqual(2);
    const files = dcon001.map((i) => i.file).filter(Boolean) as string[];
    expect(files.some((f) => f.endsWith("design-system.yaml"))).toBe(true);
    expect(files.some((f) => f.endsWith("prototype-handoff.yaml"))).toBe(true);
  });

  it("TC-3.8.6: SDD vs prototyping stage divergence", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    // No DESIGN.md, no lock, no prototyping yamls.
    const sddIssues = await validateSddDesignContractReadiness(root, defaultConfig);
    const protoIssues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    expect(sddIssues.map((i) => i.code)).toContain("QFAI-DCON-030");
    expect(sddIssues.map((i) => i.code)).toContain("QFAI-DCON-031");
    expect(sddIssues.map((i) => i.code)).not.toContain("QFAI-DCON-001");
    expect(protoIssues.map((i) => i.code)).toContain("QFAI-DCON-030");
    expect(protoIssues.map((i) => i.code)).toContain("QFAI-DCON-031");
    expect(protoIssues.map((i) => i.code)).toContain("QFAI-DCON-001");
  });

  it("TC-3.8.7: multi-issue aggregation (no short-circuit)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    // Missing DESIGN.md + missing lock + missing prototyping yamls
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const codes = new Set(issues.map((i) => i.code));
    expect(codes.has("QFAI-DCON-030")).toBe(true);
    expect(codes.has("QFAI-DCON-031")).toBe(true);
    expect(codes.has("QFAI-DCON-001")).toBe(true);
  });

  it("validatePrototypingDesignContractReadiness emits DCON-032 on sha mismatch", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    // Mutate DESIGN.md to invalidate the lock sha.
    await writeFile(path.join(root, "DESIGN.md"), `${VALID_DESIGN_MD}\n`, "utf-8");
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    expect(issues.map((i) => i.code)).toContain("QFAI-DCON-032");
  });
});

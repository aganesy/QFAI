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

// Verbatim mirror of VALID_DESIGN_MD's visual.* tokens, in YAML form
// suitable for `.qfai/contracts/design/design-system.yaml`. Tests that
// want the full mirror (post-1.8.9 contract) seed this; tests that
// want a partial mirror to exercise DCON-005 hand-construct their own.
const VALID_MIRROR_YAML = [
  "visual:",
  "  colors:",
  '    primary: "#1F2937"',
  '    secondary: "#6366F1"',
  '    accent: "#D97706"',
  '    surface: "#FFFFFF"',
  '    surface_muted: "#F3F4F6"',
  '    text: "#111827"',
  '    text_muted: "#6B7280"',
  '    danger: "#DC2626"',
  '    warning: "#F59E0B"',
  '    success: "#10B981"',
  '    border: "#E5E7EB"',
  '    overlay: "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans: "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono: "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm: "0.25rem"',
  '    md: "0.5rem"',
  '    lg: "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "",
].join("\n");

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
      // New post-1.8.9 single-thread loop handoff contract. Legacy
      // multi-option fields (sourcePrototypeRefs / surfaceProfiles /
      // screens / visualDna / implementationHandoff) are retired.
      "finalIterIndex: 1",
      'finalArtifact: ".qfai/prototypes/final/index.html"',
      'designMdPath: "DESIGN.md"',
      `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
      'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
      "implementationNotes: |",
      "  Reviewed final iter has clear navigation, four-state coverage, and",
      "  compliant DESIGN.md token use; no further hand-tweaks required.",
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

  it("well-formed prototype-handoff.yaml does NOT emit DCON-013 (numeric finalIterIndex accepted)", async () => {
    // Regression: `finalIterIndex` is a YAML number, but earlier code
    // forwarded it through `hasMeaningfulContractContent`, which only
    // accepted strings/arrays/records — so a spec-conformant handoff
    // (with `finalIterIndex: 1`) was always rejected. The fix path-
    // splits the numeric field from the string fields.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013 = issues.filter((i) => i.code === "QFAI-DCON-013");
    expect(dcon013).toEqual([]);
  });

  it("non-integer finalIterIndex is rejected with DCON-013", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    // Override with a non-integer value.
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        'finalIterIndex: "not-a-number"',
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013 = issues.filter((i) => i.code === "QFAI-DCON-013");
    expect(dcon013.length).toBeGreaterThan(0);
    expect(dcon013[0]?.message).toContain("finalIterIndex");
    // Distinct phrasing: present-but-invalid is "must be ... (got ...)",
    // not "missing required field" — Principle of Least Astonishment.
    expect(dcon013[0]?.message).toContain("must be a non-negative integer");
    expect(dcon013[0]?.message).not.toContain("is missing required field");
  });

  it("array-shaped finalIterIndex surfaces as '(got <array>)' (not opaque JSON)", async () => {
    // Aganesy 5zGh: pin describeValueForDiagnostic's array branch
    // (designContractReadiness.ts L472) so a future refactor that
    // collapses the helper back to a JSON.stringify cannot regress
    // the operator-facing diagnostic to `(got [1,2])`.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        "finalIterIndex:",
        "  - 1",
        "  - 2",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013 = issues.filter(
      (i) =>
        i.code === "QFAI-DCON-013" &&
        i.message.includes("finalIterIndex") &&
        i.message.includes("non-negative integer"),
    );
    expect(dcon013.length).toBeGreaterThan(0);
    expect(dcon013[0]?.message).toContain("(got <array>)");
    expect(dcon013[0]?.message).not.toContain("[1,2]");
  });

  it("object-shaped finalIterIndex surfaces as '(got <object>)' (not opaque JSON)", async () => {
    // Aganesy 5zGh: pin describeValueForDiagnostic's `<typeof>`
    // branch for non-array non-primitive values (objects).
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        "finalIterIndex:",
        "  foo: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013 = issues.filter(
      (i) =>
        i.code === "QFAI-DCON-013" &&
        i.message.includes("finalIterIndex") &&
        i.message.includes("non-negative integer"),
    );
    expect(dcon013.length).toBeGreaterThan(0);
    expect(dcon013[0]?.message).toContain("(got <object>)");
    expect(dcon013[0]?.message).not.toContain("{\"foo\":1}");
  });

  it("missing finalIterIndex is rejected with DCON-013 (and uses the missing-field phrasing)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    // Override with the field absent.
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013 = issues.filter((i) => i.code === "QFAI-DCON-013");
    expect(dcon013.some((i) => i.message.includes("missing required field 'finalIterIndex'"))).toBe(
      true,
    );
  });

  it("non-string handoff field (finalArtifact as object) is rejected with DCON-013", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        "finalArtifact:", // mapping-shaped value
        '  uri: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013 = issues.filter((i) => i.code === "QFAI-DCON-013");
    expect(
      dcon013.some(
        (i) =>
          i.message.includes("finalArtifact") && i.message.includes("must be a non-empty string"),
      ),
    ).toBe(true);
  });

  it("non-string handoff field (designSystemMirror as array) is rejected with DCON-013", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        "designSystemMirror:",
        '  - ".qfai/contracts/design/design-system.yaml"',
        '  - ".qfai/contracts/design/another.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013 = issues.filter((i) => i.code === "QFAI-DCON-013");
    expect(
      dcon013.some(
        (i) =>
          i.message.includes("designSystemMirror") &&
          i.message.includes("must be a non-empty string"),
      ),
    ).toBe(true);
  });

  it("design-system.yaml mirror with optional visual.spacing also passes (spacing not required)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    const designDir = path.join(root, ".qfai/contracts/design");
    // Full mirror (so the value cross-check passes) plus a non-empty
    // visual.spacing block to assert spacing remains optional /
    // non-blocking after the cross-check landed.
    await writeFile(
      path.join(designDir, "design-system.yaml"),
      VALID_MIRROR_YAML.replace(
        "  radius:",
        '  spacing:\n    base: "8px"\n  radius:',
      ),
      "utf-8",
    );
    await writeFile(
      path.join(designDir, "prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon005 = issues.filter((i) => i.code === "QFAI-DCON-005");
    expect(dcon005).toEqual([]);
  });

  it("design-system.yaml as DESIGN.md mirror passes validation (post-1.8.9 contract)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    // Replace the legacy checklist-shaped design-system.yaml with the
    // post-1.8.9 mirror shape — full verbatim copy of DESIGN.md tokens
    // so both the shape gate and the value cross-check pass.
    const designDir = path.join(root, ".qfai/contracts/design");
    await writeFile(path.join(designDir, "design-system.yaml"), VALID_MIRROR_YAML, "utf-8");
    // Also seed the prototype-handoff so the suite passes end-to-end.
    await writeFile(
      path.join(designDir, "prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon005 = issues.filter((i) => i.code === "QFAI-DCON-005");
    // Mirror shape requires visual.colors / typography / radius / shadow
    // — all present here, so no DCON-005 should fire.
    expect(dcon005).toEqual([]);
  });

  it("design-system.yaml mirror with diverging color value → DCON-005 with diff diagnostic", async () => {
    // Codex 5zDx: the mirror is contractually a verbatim DESIGN.md
    // copy. A hand-authored mirror that disagrees with DESIGN.md must
    // be rejected so downstream `/qfai-implement` cannot bind to a
    // tampered identity.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    const designDir = path.join(root, ".qfai/contracts/design");
    await writeFile(
      path.join(designDir, "design-system.yaml"),
      VALID_MIRROR_YAML.replace('primary: "#1F2937"', 'primary: "#FF0000"'),
      "utf-8",
    );
    await writeFile(
      path.join(designDir, "prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon005 = issues.filter((i) => i.code === "QFAI-DCON-005");
    expect(dcon005.length).toBeGreaterThanOrEqual(1);
    expect(dcon005[0]?.message).toContain("visual.colors.primary");
    expect(dcon005[0]?.message).toContain("#FF0000");
    expect(dcon005[0]?.message).toContain("#1F2937");
  });

  it("design-system.yaml mirror with extra fabricated key → DCON-005 (mirror must be verbatim)", async () => {
    // Aganesy 6ll8: bidirectional cross-check. A hand-authored
    // mirror with `visual.colors.fabricated_token: "#FF00FF"` must
    // be rejected even when every DESIGN.md token is faithfully
    // copied — the mirror is contractually a verbatim copy, so
    // extra keys break the set-equal invariant.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    const designDir = path.join(root, ".qfai/contracts/design");
    await writeFile(
      path.join(designDir, "design-system.yaml"),
      VALID_MIRROR_YAML.replace(
        '    overlay: "rgba(0,0,0,0.5)"',
        '    overlay: "rgba(0,0,0,0.5)"\n    fabricated_token: "#FF00FF"',
      ),
      "utf-8",
    );
    await writeFile(
      path.join(designDir, "prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon005 = issues.filter((i) => i.code === "QFAI-DCON-005");
    expect(
      dcon005.some(
        (i) =>
          i.message.includes("visual.colors.fabricated_token") &&
          i.message.includes("not a DESIGN.md token"),
      ),
    ).toBe(true);
  });

  it("malformed root DESIGN.md WITHOUT lock yaml still surfaces DCON-033 (parse error)", async () => {
    // Codex 668Z: pre-fix, parseDesignMd was nested under
    // `designMdText !== null && lockText !== null`, so a project
    // with a malformed DESIGN.md and no lock yet (the common
    // initial state) saw only DCON-031 and missed the parse error.
    // Post-fix, parseDesignMd runs whenever DESIGN.md is readable,
    // so DCON-033 fires regardless of lock state.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    // Author a malformed DESIGN.md (missing front-matter delimiter).
    await writeFile(path.join(root, "DESIGN.md"), "no front matter here\n", "utf-8");
    // Do NOT seed the lock — common pre-Phase-0 state.
    const issues = await validateSddDesignContractReadiness(root, defaultConfig);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("QFAI-DCON-031"); // missing lock
    expect(codes).toContain("QFAI-DCON-033"); // parse failure now also surfaced
  });

  it("design-system.yaml mirror missing one DESIGN.md sub-key → DCON-005 missing-key diagnostic", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    const designDir = path.join(root, ".qfai/contracts/design");
    // Drop visual.radius.full from the mirror — DESIGN.md still has
    // it, so the cross-check must surface it as missing.
    await writeFile(
      path.join(designDir, "design-system.yaml"),
      VALID_MIRROR_YAML.replace('    full: "9999px"\n', ""),
      "utf-8",
    );
    await writeFile(
      path.join(designDir, "prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon005 = issues.filter((i) => i.code === "QFAI-DCON-005");
    expect(
      dcon005.some(
        (i) => i.message.includes("visual.radius.full") && i.message.includes("missing"),
      ),
    ).toBe(true);
  });

  it("prototype-handoff.yaml designMdPath !== root DESIGN.md → DCON-013", async () => {
    // Codex 55GV: a handoff that points at an alternate file must be
    // rejected so downstream `/qfai-implement` cannot bind to a
    // non-SSOT design identity.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "docs/alternate-DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013 = issues.filter((i) => i.code === "QFAI-DCON-013");
    expect(
      dcon013.some(
        (i) =>
          i.message.includes("designMdPath") &&
          i.message.includes("DESIGN.md") &&
          i.message.includes("docs/alternate-DESIGN.md"),
      ),
    ).toBe(true);
  });

  it("prototype-handoff.yaml designMdPath './DESIGN.md' is accepted (normalized)", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "./DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013Path = issues.filter(
      (i) => i.code === "QFAI-DCON-013" && i.message.includes("designMdPath"),
    );
    expect(dcon013Path).toEqual([]);
  });

  it("prototype-handoff.yaml designMdSha256 not 64-hex → DCON-013", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        'designMdSha256: "not-a-real-sha"',
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013Sha = issues.filter(
      (i) =>
        i.code === "QFAI-DCON-013" &&
        i.message.includes("designMdSha256") &&
        i.message.includes("64-char"),
    );
    expect(dcon013Sha.length).toBeGreaterThanOrEqual(1);
  });

  it("prototype-handoff.yaml designMdSha256 stale (valid hex but != lock) → DCON-013", async () => {
    // Codex 55GV second arm: a syntactically-valid-but-wrong sha must
    // be cross-checked against DESIGN.md.lock.yaml#designMdSha256.
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    const stale = "0".repeat(64);
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${stale}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013Sha = issues.filter(
      (i) =>
        i.code === "QFAI-DCON-013" &&
        i.message.includes("designMdSha256") &&
        i.message.includes("does not match"),
    );
    expect(dcon013Sha.length).toBeGreaterThanOrEqual(1);
    expect(dcon013Sha[0]?.message).toContain(stale);
    expect(dcon013Sha[0]?.message).toContain(hashDesignMd(VALID_DESIGN_MD));
  });

  it("negative finalIterIndex is rejected with DCON-013", async () => {
    const root = await newTempDir();
    await seedUiBearingProject(root);
    await seedDesignMdAndLock(root);
    await seedPrototypingDesignYamls(root);
    await writeFile(
      path.join(root, ".qfai/contracts/design/prototype-handoff.yaml"),
      [
        "finalIterIndex: -1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${hashDesignMd(VALID_DESIGN_MD)}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
    const dcon013 = issues.filter((i) => i.code === "QFAI-DCON-013");
    expect(dcon013.length).toBeGreaterThan(0);
  });
});

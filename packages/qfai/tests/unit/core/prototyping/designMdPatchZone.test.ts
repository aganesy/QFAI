/**
 * Unit: DESIGN.md front-matter `patch_zone:` semantic.
 *
 * - TC-0012-0473 (normal): an edit fully contained in the `patch_zone:`
 *   block updates ONLY `patchHash`. `majorHash` (the existing
 *   sha256-of-bytes) is byte-stable and prototyping evidence remains
 *   valid.
 * - TC-0012-0474 (error): an out-of-zone edit (or removal of the
 *   `patch_zone:` block) invalidates evidence (majorHash changes) AND
 *   emits Reviewer Gate finding `R-DESIGN-MD-PATCH-OUT-OF-ZONE`
 *   (severity warning) with non-empty justification (file, zone bounds,
 *   offending lines).
 *
 * The patch zone is declared by the DESIGN.md author via a
 * front-matter mapping:
 *   ```
 *   patch_zone:
 *     tokens:
 *       - --color-accent
 *       - --radius-md
 *   ```
 * The token names list keys whose value may change without bumping
 * `majorHash`. Edits to any other token (or removal of the patch_zone
 * block itself) bump `majorHash` and surface the reviewer finding.
 */
// QFAI:SPEC-0012:TC-0012-0473
// QFAI:SPEC-0012:TC-0012-0474

import { describe, expect, it } from "vitest";

import {
  computeDesignMdHashes,
  parseDesignMdPatchZone,
} from "../../../../src/core/design/designMdPatchZone.js";
import { detectDesignMdPatchOutOfZone } from "../../../../src/core/validators/designMdPatchZone.js";

const BASE_FRONT_MATTER = `---
brand:
  name: "Acme"
  archetype: minimal
visual:
  colors:
    primary: "#2563eb"
    secondary: "#10b981"
    accent: "#f59e0b"
    surface: "#ffffff"
    surface_muted: "#f3f4f6"
    text: "#111827"
    text_muted: "#6b7280"
    danger: "#dc2626"
    warning: "#d97706"
    success: "#16a34a"
    border: "#e5e7eb"
    overlay: "rgba(0,0,0,0.5)"
  typography:
    family_sans: "Inter"
    family_display: "Inter"
    family_mono: "JetBrains Mono"
  radius:
    sm: "4px"
    md: "8px"
    lg: "16px"
    full: "9999px"
  shadow:
    sm: "0 1px 2px rgba(0,0,0,0.05)"
    md: "0 4px 6px rgba(0,0,0,0.1)"
    lg: "0 10px 15px rgba(0,0,0,0.15)"
patch_zone:
  tokens:
    - visual.colors.accent
    - visual.radius.md
---
# DESIGN.md body content
`;

function withAccent(text: string, hex: string): string {
  return text.replace(/(accent:\s*)"#[0-9a-fA-F]{6}"/u, `$1"${hex}"`);
}

function withRadiusMd(text: string, value: string): string {
  return text.replace(/(\s)md:\s*"8px"/u, `$1md: "${value}"`);
}

function withSecondary(text: string, hex: string): string {
  return text.replace(/(secondary:\s*)"#[0-9a-fA-F]{6}"/u, `$1"${hex}"`);
}

function stripPatchZone(text: string): string {
  return text.replace(/\npatch_zone:[\s\S]*?(?=---)/u, "\n");
}

describe("TC-0012-0473: in-zone edit updates patchHash only (majorHash stable)", () => {
  it("parses the patch_zone block from front-matter", () => {
    const parsed = parseDesignMdPatchZone(BASE_FRONT_MATTER);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.zone.tokens).toContain("visual.colors.accent");
      expect(parsed.zone.tokens).toContain("visual.radius.md");
    }
  });

  it("in-zone edit changes patchHash but keeps majorHash byte-stable", () => {
    const before = computeDesignMdHashes(BASE_FRONT_MATTER);
    const edited = withAccent(BASE_FRONT_MATTER, "#abcdef");
    const after = computeDesignMdHashes(edited);
    expect(after.majorHash).toBe(before.majorHash);
    expect(after.patchHash).not.toBe(before.patchHash);
  });

  it("in-zone radius edit also keeps majorHash byte-stable", () => {
    const before = computeDesignMdHashes(BASE_FRONT_MATTER);
    const edited = withRadiusMd(BASE_FRONT_MATTER, "10px");
    const after = computeDesignMdHashes(edited);
    expect(after.majorHash).toBe(before.majorHash);
    expect(after.patchHash).not.toBe(before.patchHash);
  });

  // Pin the first-child placeholder-replacement fix. The
  // `replaceTokenValueWithPlaceholder` regex required a preceding `\n`
  // before the leaf line, which silently skipped the FIRST scalar
  // under its parent (e.g. `visual.colors.primary`, the first child
  // of `visual.colors:`). The fix (regex `(^|\n)(<indent><key>:...)`)
  // accepts the start-of-segment anchor that the parent-walk cursor
  // lands at when the leaf is the first child. Pre-fix this test
  // would have observed `majorHash` changing for an in-zone first-
  // child edit; post-fix `majorHash` is byte-stable.
  it("in-zone edit on the FIRST scalar under its parent (visual.colors.primary) keeps majorHash byte-stable", () => {
    const withPrimaryInZone = BASE_FRONT_MATTER.replace(
      "    - visual.radius.md",
      "    - visual.radius.md\n    - visual.colors.primary",
    );
    const before = computeDesignMdHashes(withPrimaryInZone);
    const editedPrimary = withPrimaryInZone.replace(
      /(primary:\s*)"#[0-9a-fA-F]{6}"/u,
      `$1"#abcdef"`,
    );
    const after = computeDesignMdHashes(editedPrimary);
    // Pre-fix: regex required preceding `\n`, primary was the first
    // child under `colors:` so the parent-walk cursor pointed
    // directly at the primary line with no preceding `\n` in the
    // sliced segment. The placeholder was not substituted, so the
    // primary value bytes remained in the canonicalized text →
    // majorHash changed. Post-fix the `(^|\n)` alternation matches.
    expect(after.majorHash).toBe(before.majorHash);
    expect(after.patchHash).not.toBe(before.patchHash);
  });
});

describe("TC-0012-0474: out-of-zone edit invalidates evidence and surfaces R-DESIGN-MD-PATCH-OUT-OF-ZONE", () => {
  it("majorHash changes when an out-of-zone token is edited", () => {
    const before = computeDesignMdHashes(BASE_FRONT_MATTER);
    const edited = withSecondary(BASE_FRONT_MATTER, "#123456");
    const after = computeDesignMdHashes(edited);
    expect(after.majorHash).not.toBe(before.majorHash);
  });

  it("removing the patch_zone block itself invalidates majorHash", () => {
    const before = computeDesignMdHashes(BASE_FRONT_MATTER);
    const edited = stripPatchZone(BASE_FRONT_MATTER);
    const after = computeDesignMdHashes(edited);
    expect(after.majorHash).not.toBe(before.majorHash);
  });

  it("detectDesignMdPatchOutOfZone fires (warning) for an out-of-zone diff with non-empty justification", () => {
    const issues = detectDesignMdPatchOutOfZone({
      filePath: "DESIGN.md",
      before: BASE_FRONT_MATTER,
      after: withSecondary(BASE_FRONT_MATTER, "#123456"),
    });
    const finding = issues.find((i) => i.code === "R-DESIGN-MD-PATCH-OUT-OF-ZONE");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("warning");
    // Non-empty justification names the file, the zone token list, and at least one offending token.
    expect(finding?.message).toMatch(/DESIGN\.md/);
    expect(finding?.message).toMatch(/visual\.colors\.accent/);
    expect(finding?.message).toMatch(/visual\.colors\.secondary/);
  });

  it("does NOT fire for an in-zone diff", () => {
    const issues = detectDesignMdPatchOutOfZone({
      filePath: "DESIGN.md",
      before: BASE_FRONT_MATTER,
      after: withAccent(BASE_FRONT_MATTER, "#abcdef"),
    });
    expect(issues.filter((i) => i.code === "R-DESIGN-MD-PATCH-OUT-OF-ZONE")).toEqual([]);
  });

  it("fires (warning) when the patch_zone block is removed", () => {
    const issues = detectDesignMdPatchOutOfZone({
      filePath: "DESIGN.md",
      before: BASE_FRONT_MATTER,
      after: stripPatchZone(BASE_FRONT_MATTER),
    });
    const finding = issues.find((i) => i.code === "R-DESIGN-MD-PATCH-OUT-OF-ZONE");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("warning");
    expect(finding?.message).toMatch(/patch_zone/);
  });
});

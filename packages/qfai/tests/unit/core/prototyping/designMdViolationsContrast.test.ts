/**
 * The contrast floor a project declares is the one it is measured against.
 *
 * `accessibility.contrast_ratio_min` was parsed, checked for finiteness and
 * hashed into the lock, and nothing read it as a threshold. The one check that
 * computed contrast — `QFAI-MOCK-008` — compared against a hard-coded AA
 * constant and ran over HTML blocks inside documents, never over an iteration
 * capture. So a project declaring a stricter ratio was measured against AA, and
 * a project declaring AA had no capture measured at all.
 *
 * Both directions are pinned here. A declared floor governs, and a page that
 * meets it is reported as nothing — because a clause that fires on conformant
 * markup would be turned off rather than satisfied.
 *
 * The judged set is deliberately narrow: a pair is read only when both sides
 * resolve to a color `computeContrastRatio` accepts. A ratio computed from a
 * color the scanner guessed at is a finding its author cannot reproduce, so an
 * unreadable pair is skipped rather than reported either way.
 */

import { describe, expect, it } from "vitest";

import type { DesignMd } from "../../../../src/core/design/designMd.js";
import { findDesignMdViolations } from "../../../../src/core/prototyping/designMdViolations.js";

/** Every token the page below uses, so only the contrast clause can fire. */
function designMd(contrastRatioMin?: number): DesignMd {
  const dm: DesignMd = {
    brand: { name: "Sample", archetype: "tech" },
    visual: {
      colors: {
        primary: "#1f2937",
        secondary: "#374151",
        accent: "#2563eb",
        surface: "#ffffff",
        surface_muted: "#f3f4f6",
        text: "#767676",
        text_muted: "#999999",
        danger: "#b91c1c",
        warning: "#b45309",
        success: "#15803d",
        border: "#e5e7eb",
        overlay: "rgba(17,24,39,0.5)",
      },
      typography: {
        family_sans: "Inter, system-ui, sans-serif",
        family_display: "Inter, system-ui, sans-serif",
        family_mono: "JetBrains Mono, ui-monospace, monospace",
      },
      radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem", full: "9999px" },
      shadow: {
        sm: "0 1px 2px rgba(15,23,42,0.05)",
        md: "0 4px 6px rgba(15,23,42,0.07)",
        lg: "0 10px 15px rgba(15,23,42,0.1)",
      },
    },
  };
  return contrastRatioMin === undefined
    ? dm
    : { ...dm, accessibility: { contrast_ratio_min: contrastRatioMin } };
}

const contrast = (html: string, dm: DesignMd): string[] =>
  findDesignMdViolations(html, dm)
    .filter((v) => v.kind === "contrast")
    .map((v) => v.found);

// 4.54:1 — passes AA, fails a floor of 7.
const NEAR_AA = `<body><p style="color:#767676;background-color:#ffffff">text</p></body>`;
// 2.85:1 — fails both.
const FAILS_AA = `<body><p style="color:#999999;background-color:#ffffff">text</p></body>`;

describe("a declared contrast floor governs", () => {
  it("reports a pair below the declared floor that AA would pass", () => {
    const found = contrast(NEAR_AA, designMd(7));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/below 7:1/);
    expect(found[0]).toContain("#767676 on #ffffff");
  });

  it("reports nothing when the same pair meets the declared floor", () => {
    expect(contrast(NEAR_AA, designMd(4.5))).toEqual([]);
  });

  it("falls back to AA when the pack declares no floor", () => {
    // The key is optional in a parsed record, and a pack without it still gets
    // a floor — otherwise omitting the key would switch the clause off.
    expect(contrast(FAILS_AA, designMd())).toHaveLength(1);
    expect(contrast(NEAR_AA, designMd())).toEqual([]);
  });

  it("reads a pair stated in a rule body, not only an inline attribute", () => {
    const html = [
      "<html><head><style>",
      ".note { color: #999999; background: #ffffff; }",
      "</style></head><body><p class='note'>text</p></body></html>",
    ].join("\n");
    expect(contrast(html, designMd())).toHaveLength(1);
  });

  it("resolves both sides through a :root token", () => {
    const html = [
      "<html><head><style>",
      ":root { --ink: #999999; --paper: #ffffff; }",
      ".note { color: var(--ink); background-color: var(--paper); }",
      "</style></head><body><p class='note'>text</p></body></html>",
    ].join("\n");
    expect(contrast(html, designMd())).toHaveLength(1);
  });

  it("expands a three-digit hex rather than discarding the pair", () => {
    // `#999` is what an author types; dropping it would leave the clause
    // reading only machine-generated markup.
    const html = `<body><p style="color:#999;background-color:#fff">text</p></body>`;
    expect(contrast(html, designMd())).toHaveLength(1);
  });

  it("judges no pair whose colors it cannot read", () => {
    const unreadable = [
      // A named color.
      `<body><p style="color:gray;background-color:#ffffff">t</p></body>`,
      // The space-separated rgb form, which carries an alpha slot.
      `<body><p style="color:rgb(153 153 153);background-color:#ffffff">t</p></body>`,
      // A shorthand with more than a color in it.
      `<body><p style="color:#999999;background:#ffffff url(x.png) repeat">t</p></body>`,
      // An unresolvable token, with no fallback to stand in for it.
      `<body><p style="color:var(--absent);background-color:#ffffff">t</p></body>`,
    ];
    for (const html of unreadable) {
      expect(contrast(html, designMd()), html).toEqual([]);
    }
  });

  it("reports one finding for a pair that repeats", () => {
    // The scanner's contract is one entry per distinct {kind, found}: a token
    // that drifts on a thousand elements is one finding, not a thousand.
    const html = `<body>${`<p style="color:#999999;background-color:#ffffff">t</p>`.repeat(5)}</body>`;
    expect(contrast(html, designMd())).toHaveLength(1);
  });

  it("reads no pair out of a background declaration that is not a color", () => {
    const html = `<body><p style="color:#999999;background-image:url(x.png)">t</p></body>`;
    expect(contrast(html, designMd())).toEqual([]);
  });
});

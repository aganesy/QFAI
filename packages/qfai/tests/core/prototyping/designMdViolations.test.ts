import { describe, expect, it } from "vitest";

import type { DesignMd } from "../../../src/core/design/designMd.js";
import { findDesignMdViolations } from "../../../src/core/prototyping/designMdViolations.js";

const sampleDesignMd = (overrides: Partial<DesignMd["visual"]> = {}): DesignMd => ({
  brand: { name: "Sample", archetype: "tech" },
  visual: {
    colors: {
      primary: "#1F2937",
      secondary: "#6366F1",
      accent: "#D97706",
      surface: "#FFFFFF",
      surface_muted: "#F3F4F6",
      text: "#111827",
      text_muted: "#6B7280",
      danger: "#DC2626",
      warning: "#F59E0B",
      success: "#10B981",
      border: "#E5E7EB",
      overlay: "rgba(0,0,0,0.5)",
    },
    typography: {
      family_sans: "Inter, system-ui, sans-serif",
      family_display: "Inter, system-ui, sans-serif",
      family_mono: "JetBrains Mono, ui-monospace, monospace",
    },
    radius: {
      sm: "0.25rem",
      md: "0.5rem",
      lg: "0.75rem",
      full: "9999px",
    },
    shadow: {
      sm: "0 1px 2px rgba(15,23,42,0.05)",
      md: "0 4px 6px rgba(15,23,42,0.08)",
      lg: "0 12px 24px rgba(15,23,42,0.10)",
    },
    ...overrides,
  },
});

describe("findDesignMdViolations — color (TC-3.2.1..9)", () => {
  // TC-3.2.1
  it("hex equal to a DESIGN.md color → no violation", () => {
    const html = '<div class="bg-[#1F2937]"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.2
  it("hex NOT in DESIGN.md.colors → kind:color violation (lowercased)", () => {
    const html = '<div style="color:#abcdef"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out).toEqual([{ kind: "color", found: "#abcdef" }]);
  });

  // TC-3.2.3
  it("3-letter hex #FFF → violation (allowedColors only contains 6/8-digit)", () => {
    const html = '<span style="color:#FFF"></span>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0]).toEqual({ kind: "color", found: "#fff" });
  });

  // TC-3.2.4
  it("rgba on a primary value not declared in DESIGN.md → violation", () => {
    const dm = sampleDesignMd();
    dm.visual.colors.overlay = "rgba(0,0,0,0.7)";
    const html = '<i style="background: rgba(0,0,0,0.5)"></i>';
    const out = findDesignMdViolations(html, dm);
    expect(out.some((v) => v.kind === "color")).toBe(true);
  });

  // TC-3.2.5
  it("8-digit hex match in DESIGN.md → no violation", () => {
    const dm = sampleDesignMd();
    dm.visual.colors.primary = "#1F2937FF";
    const html = '<div style="color:#1F2937FF"></div>';
    expect(findDesignMdViolations(html, dm)).toEqual([]);
  });

  // TC-3.2.6
  it("case-insensitive color match", () => {
    const html = '<div style="color:#1f2937"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.7
  it("rgba on overlay → no violation when DESIGN.md overlay matches", () => {
    const html = '<div style="background-color: rgba(0,0,0,0.5);"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.8 — engineer choice: rgba comparison is case-insensitive on both sides.
  // The regex matches rgba/RGBA (case-sensitive) but lowercasing both sides
  // normalizes the comparison.
  it("mixed-case RGBA match against DESIGN.md is normalized", () => {
    const html = '<div style="background-color: RGBA(0,0,0,0.5);"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.9
  it("multiple unknown colors all returned (no short-circuit)", () => {
    const html = `
      <div style="color:#aaaaaa"></div>
      <div style="background:#bbbbbb"></div>
      <div style="border-color:#cccccc"></div>
    `;
    const out = findDesignMdViolations(html, sampleDesignMd());
    const founds = out.filter((v) => v.kind === "color").map((v) => v.found);
    expect(founds).toEqual(["#aaaaaa", "#bbbbbb", "#cccccc"]);
  });
});

describe("findDesignMdViolations — font (TC-3.2.10..15)", () => {
  // TC-3.2.10
  it("font-family matches DESIGN.md family_sans exactly → no violation", () => {
    const html = "<style>body{font-family: Inter, system-ui, sans-serif;}</style>";
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.11
  it("font-family Comic Sans → violation (quotes stripped)", () => {
    const html = '<style>p{font-family: "Comic Sans";}</style>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out).toEqual([{ kind: "font", found: "Comic Sans" }]);
  });

  // TC-3.2.12
  it("single-token Inter matches via startsWith", () => {
    const html = '<p style="font-family: Inter"></p>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.13
  it("font-family with single-quotes stripped", () => {
    const html = "<p style=\"font-family: 'Inter'\"></p>";
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.14
  it("font-family with double-quotes stripped", () => {
    const html = "<p style='font-family: \"Inter\"'></p>";
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  it("inline style with no trailing semicolon stops at the outer attribute quote (no false-positive)", () => {
    // Without the boundary fix, the FONT_RE captured through the next
    // attribute as `Inter" class="card"`, and fontMatches rejected it
    // because the first family token ended up as `Inter" class="card"`
    // — making compliant generated HTML fail certify.
    const html = '<div style="font-family: Inter" class="card">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "font")).toEqual([]);
  });

  it("inline style with quoted family name + class attr after style closes", () => {
    const html = '<div style="font-family: \'Inter\'" class="hero">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "font")).toEqual([]);
  });

  it("inline style with comma-separated stack containing a quoted family name", () => {
    const html = '<style>body { font-family: "Inter", system-ui, sans-serif; }</style>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "font")).toEqual([]);
  });

  // TC-3.2.15
  it("multiple font-family declarations: only invalid one returns a violation", () => {
    const html = `
      <style>body{font-family: Inter, system-ui, sans-serif;}</style>
      <style>p{font-family: "Times New Roman";}</style>
    `;
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "font")).toEqual([
      { kind: "font", found: "Times New Roman" },
    ]);
  });
});

describe("findDesignMdViolations — radius (TC-3.2.16..20)", () => {
  // TC-3.2.16
  it("border-radius 0.25rem matches DESIGN.md.radius.sm → no violation", () => {
    const html = '<div style="border-radius: 0.25rem"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.17
  it("border-radius 1.5rem not in DESIGN.md → violation", () => {
    const html = '<div style="border-radius: 1.5rem"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out).toEqual([{ kind: "radius", found: "1.5rem" }]);
  });

  // TC-3.2.18
  it("border-radius 0 is a safe literal → no violation", () => {
    const html = '<div style="border-radius: 0"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.19 (boundary duplicate of TC-3.2.16)
  it("border-radius 0.25rem matches DESIGN.md (boundary)", () => {
    const html = '<div style="border-radius: 0.25rem"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.20
  it("border-radius 9999px matches DESIGN.md.radius.full → no violation", () => {
    const html = '<div style="border-radius: 9999px"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });
});

describe("findDesignMdViolations — shadow (TC-3.2.21..24)", () => {
  // TC-3.2.21
  it("box-shadow matching DESIGN.md.shadow.sm → no violation", () => {
    const html = '<div style="box-shadow: 0 1px 2px rgba(15,23,42,0.05)"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.22
  it("box-shadow not in DESIGN.md → violation", () => {
    const html = '<div style="box-shadow: 0 0 99px red"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "shadow" && v.found === "0 0 99px red")).toBe(true);
  });

  // TC-3.2.23
  it("box-shadow none is a safe literal → no violation", () => {
    const html = '<div style="box-shadow: none"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.24
  it("multi-token shadow exact-string match → no violation", () => {
    const html = '<div style="box-shadow: 0 4px 6px rgba(15,23,42,0.08)"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });
});

describe("findDesignMdViolations — aggregation (TC-3.2.25..28)", () => {
  // TC-3.2.25
  it("empty html → empty violations", () => {
    expect(findDesignMdViolations("", sampleDesignMd())).toEqual([]);
  });

  // TC-3.2.26
  it("no short-circuit: violations across all 4 kinds returned together", () => {
    const html = `
      <style>body{font-family: "Comic Sans";}</style>
      <div style="color:#abcdef"></div>
      <div style="border-radius: 1.5rem"></div>
      <div style="box-shadow: 0 0 99px red"></div>
    `;
    const out = findDesignMdViolations(html, sampleDesignMd());
    const kinds = new Set(out.map((v) => v.kind));
    expect(kinds.has("color")).toBe(true);
    expect(kinds.has("font")).toBe(true);
    expect(kinds.has("radius")).toBe(true);
    expect(kinds.has("shadow")).toBe(true);
  });

  // TC-3.2.27
  it("inline style and <style> block both scanned", () => {
    const html = `
      <div style="color:#abcdef"></div>
      <style>p{color:#abcdef;}</style>
    `;
    const out = findDesignMdViolations(html, sampleDesignMd());
    const colorHits = out.filter((v) => v.kind === "color" && v.found === "#abcdef");
    expect(colorHits.length).toBe(2);
  });

  // TC-3.2.28
  it("combinatorial: color + font + radius + shadow all violated together", () => {
    const html = `
      <style>body{font-family: "Comic Sans";}</style>
      <div style="color:#abcdef; border-radius: 1.5rem; box-shadow: 0 0 99px red"></div>
    `;
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(new Set(out.map((v) => v.kind))).toEqual(new Set(["color", "font", "radius", "shadow"]));
  });
});

/**
 * Tailwind preflight allowlist + head-stylesheet scanner behaviour.
 *
 * Pins:
 *   - 4 sentinel literals (`#fff`, `#9ca3af`, `#e5e7eb`, `rgb(59 130 246 / 0.5)`)
 *     are safe across `scanColors` regardless of DESIGN.md content.
 *   - Custom properties whose name matches `/^--tw-/` (the Tailwind
 *     internal property family) are stripped from the scan surface
 *     at the declaration-level pass (`SHADOW_DECL_STRIP_RE`).
 *   - Head `<style>` blocks ARE scanned (PR #210 wave-12 Codex P2 fix);
 *     a Tailwind preflight `<style>` block placed in `<head>` is
 *     excluded only by the two primary signatures: banner comment
 *     (`/* tailwindcss v* /`) OR universal-reset selector
 *     (`*, ::before, ::after { box-sizing... }`). The `--tw-` prefix
 *     alone is intentionally NOT a block-level classifier (PR #210
 *     wave-14 false-negative fix) — operator-authored stylesheets in
 *     `<head>` that happen to carry a single `--tw-*` declaration
 *     stay in scope so color literals surface as DESIGN.md drift.
 */

import { describe, expect, it } from "vitest";

import type { DesignMd } from "../../../../src/core/design/designMd.js";
import { findDesignMdViolations } from "../../../../src/core/prototyping/designMdViolations.js";

const baseDesignMd = (): DesignMd => ({
  brand: { name: "Sample", archetype: "tech" },
  visual: {
    colors: {
      primary: "#1F2937",
      surface: "#FFFFFF",
      text: "#111827",
      border: "#E5E7EB",
    },
    typography: {
      family_sans: "Inter, system-ui, sans-serif",
      family_display: "Inter, system-ui, sans-serif",
      family_mono: "JetBrains Mono, ui-monospace, monospace",
    },
    radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem", full: "9999px" },
    shadow: { sm: "0 1px 2px rgba(15,23,42,0.05)" },
  },
});

describe("Tailwind preflight allowlist", () => {
  it("treats the four sentinel preflight literals as safe in scanColors", () => {
    const html = `<body><div style="color:#fff; border-color:#9ca3af; outline-color:#e5e7eb; background-color: rgb(59 130 246 / 0.5)"></div></body>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("strips `--tw-*` custom property declarations before color scanning", () => {
    const html = `<body><style>:root { --tw-shadow-color: rgba(0,0,0,0.3); --tw-ring-color: #abcdef; }</style></body>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("does NOT strip non-tw custom property declarations carrying rgba", () => {
    // Sanity: regression guard so the --tw-* strip isn't over-broad.
    // `--unrelated-token: #abcdef;` should still surface (CSS context).
    const html = `<body><style>:root { --unrelated-token: #abcdef; }</style></body>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#abcdef")).toBe(true);
  });
});

describe("Head stylesheet scanning (PR #210 wave-12 Codex P2)", () => {
  it("flags color literals authored in <head><style> by the operator", () => {
    // Operator-authored stylesheet in <head> is in scope: a hex
    // literal that does not appear in DESIGN.md.colors must surface
    // as DESIGN.md drift, not be silently allowed. Pre-fix the whole
    // <head> region was skipped, so e.g. `.brand { color: #abcdef; }`
    // bypassed `designMdViolations` and made non-conformant CSS look
    // compliant.
    const html = `<!doctype html><html><head><style>.brand { color: #abcdef; }</style></head><body><div class="brand"></div></body></html>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#abcdef")).toBe(true);
  });

  it("excludes a Tailwind preflight <head><style> block by banner signature", () => {
    // Preflight signature `/* tailwindcss v3.x */` plus the universal
    // box-sizing reset; whatever literals live in the block must not
    // surface as DESIGN.md drift.
    const html = `<!doctype html><html><head><style>/* tailwindcss v3.4.1 */ *, ::before, ::after { box-sizing: border-box; border-color: #e5e7eb; }</style></head><body></body></html>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("does not surface color literals nested inside --tw-* declarations (declaration-level strip)", () => {
    // No banner comment and no universal-reset selector, so post-wave-14
    // the block is NOT classified as preflight at the block level. The
    // `--tw-ring-color: #abcdef;` and `--tw-shadow-color: rgba(...);`
    // declarations are still stripped from the scan surface by
    // `SHADOW_DECL_STRIP_RE` (declaration-level pass), so the inner
    // color literals do not surface as DESIGN.md drift.
    const html = `<!doctype html><html><head><style>:root { --tw-ring-color: #abcdef; --tw-shadow-color: rgba(0,0,0,0.3); }</style></head><body></body></html>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("flags operator-authored color literals in a head block that ALSO carries a --tw-* declaration (PR #210 wave-14 false-negative fix)", () => {
    // Pre-wave-14 the bare presence of `--tw-` anywhere in the block
    // classified the entire <style> as Tailwind preflight and dropped
    // it from the scan surface. That allowed an operator-authored
    // `color: #ff0000;` (NOT in DESIGN.md) sitting next to a single
    // `--tw-ring-offset-width: 0px;` declaration to silently pass the
    // drift check. Post-wave-14 the block is kept (no banner, no
    // universal-reset) and `SHADOW_DECL_STRIP_RE` strips only the
    // `--tw-*: ...` declaration, leaving the operator-authored
    // `color: #ff0000;` in scope where it surfaces as drift.
    const html = `<!doctype html><html><head><style>.brand { --tw-ring-offset-width: 0px; color: #ff0000; }</style></head><body><div class="brand"></div></body></html>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#ff0000")).toBe(true);
  });

  it("still excludes a head block carrying the banner comment even when an operator-authored color sits next to it", () => {
    // Counterpart to the wave-14 false-negative fix: banner = strong
    // signal, block-level skip stays in force. An operator who places
    // their own color literal INSIDE a preflight-banner block is
    // explicitly opting that block out of the scan; the banner is the
    // contract boundary.
    const html = `<!doctype html><html><head><style>/* tailwindcss v3.4.1 */ .brand { color: #ff0000; }</style></head><body></body></html>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("still flags color literals INSIDE <body>", () => {
    // Regression guard: head-scanning addition must not silence body CSS.
    const html = `<html><head><style>p{color:#000000}</style></head><body><div style="color:#abcdef"></div></body></html>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#abcdef")).toBe(true);
  });
});

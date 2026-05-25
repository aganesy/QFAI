/**
 * Tailwind preflight allowlist + body-scope scanner behaviour.
 *
 * Pins:
 *   - 4 sentinel literals (`#fff`, `#9ca3af`, `#e5e7eb`, `rgb(59 130 246 / 0.5)`)
 *     are safe across `scanColors` regardless of DESIGN.md content.
 *   - Custom properties whose name matches `/^--tw-/` (the Tailwind
 *     internal property family) are stripped from the scan surface.
 *   - CSS extraction narrows the scanned region to `<body>...</body>` —
 *     a Tailwind preflight `<style>` block placed before `<body>` does
 *     not surface its color literals as DESIGN.md drift.
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

describe("Body-scope narrowing", () => {
  it("ignores color literals in <style> blocks placed BEFORE <body>", () => {
    // Tailwind CDN preflight: utility classes and resets live in
    // `<head><style>...</style></head>`. The scanner must not surface
    // those literals as DESIGN.md drift.
    const html = `<!doctype html><html><head><style>html { color: #abcdef; }</style></head><body><div></div></body></html>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.filter((v) => v.kind === "color" && v.found === "#abcdef")).toEqual([]);
  });

  it("still flags color literals INSIDE <body>", () => {
    // Regression guard: body-scope narrowing must not silence body CSS.
    const html = `<html><head><style>p{color:#000000}</style></head><body><div style="color:#abcdef"></div></body></html>`;
    const out = findDesignMdViolations(html, baseDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#abcdef")).toBe(true);
  });
});

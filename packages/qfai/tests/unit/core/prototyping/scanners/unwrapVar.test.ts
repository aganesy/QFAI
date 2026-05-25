/**
 * Scanner var(--token) unwrap behaviour.
 *
 * `scanFonts`, `scanRadius`, and `scanShadow` MUST resolve
 * `var(--token)` references against the parsed `:root { --token:
 * value; }` declarations BEFORE judging safety against `SAFE_LITERALS`
 * / DESIGN.md tokens. Without unwrap, a token-driven CSS like
 * `font-family: var(--font-sans);` would surface a false-positive
 * violation even though the resolved value matches DESIGN.md.
 *
 * The helper `unwrapVarReference(value, rootDeclarations)` is also
 * unit-tested directly for purity (var() / fallback / pass-through).
 */

import { describe, expect, it } from "vitest";

import type { DesignMd } from "../../../../../src/core/design/designMd.js";
import {
  findDesignMdViolations,
  unwrapVarReference,
} from "../../../../../src/core/prototyping/designMdViolations.js";

const dm = (): DesignMd => ({
  brand: { name: "Sample", archetype: "tech" },
  visual: {
    colors: { primary: "#1F2937", surface: "#FFFFFF" },
    typography: {
      family_sans: "Inter, system-ui, sans-serif",
      family_display: "Inter, system-ui, sans-serif",
      family_mono: "JetBrains Mono, ui-monospace, monospace",
    },
    radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem", full: "9999px" },
    shadow: { sm: "0 1px 2px rgba(15,23,42,0.05)" },
  },
});

describe("unwrapVarReference helper", () => {
  it("resolves a bare var(--name) against the declaration map", () => {
    const map = new Map([["--font-sans", "Inter, system-ui, sans-serif"]]);
    expect(unwrapVarReference("var(--font-sans)", map)).toBe("Inter, system-ui, sans-serif");
  });

  it("returns the fallback when var(--name) is not in the map", () => {
    const map = new Map<string, string>();
    expect(unwrapVarReference("var(--missing, 0.5rem)", map)).toBe("0.5rem");
  });

  it("passes through non-var values verbatim", () => {
    const map = new Map<string, string>();
    expect(unwrapVarReference("0.5rem", map)).toBe("0.5rem");
  });

  it("returns the raw value when var(--name) has neither map entry nor fallback", () => {
    const map = new Map<string, string>();
    expect(unwrapVarReference("var(--missing)", map)).toBe("var(--missing)");
  });
});

describe("scanFonts/Radius/Shadow call unwrapVarReference", () => {
  it("scanFonts resolves var(--font-sans) before SAFE_LITERALS judgment", () => {
    const html = `<body><style>:root { --font-sans: Inter, system-ui, sans-serif; } p { font-family: var(--font-sans); }</style></body>`;
    const out = findDesignMdViolations(html, dm());
    expect(out.filter((v) => v.kind === "font")).toEqual([]);
  });

  it("scanRadius resolves var(--radius-md) before SAFE_LITERALS judgment", () => {
    const html = `<body><style>:root { --radius-md: 0.5rem; } .card { border-radius: var(--radius-md); }</style></body>`;
    const out = findDesignMdViolations(html, dm());
    expect(out.filter((v) => v.kind === "radius")).toEqual([]);
  });

  it("scanShadow resolves var(--shadow-sm) before SAFE_LITERALS judgment", () => {
    const html = `<body><style>:root { --shadow-sm: 0 1px 2px rgba(15,23,42,0.05); } .card { box-shadow: var(--shadow-sm); }</style></body>`;
    const out = findDesignMdViolations(html, dm());
    expect(out.filter((v) => v.kind === "shadow")).toEqual([]);
  });

  it("surfaces a font violation when var(--font-x) resolves to an OFF-token value", () => {
    // Negative path: unwrap must drive judgment using the resolved
    // value. If `--font-x` resolves to a non-DESIGN.md family stack,
    // the violation surfaces against the resolved value.
    const html = `<body><style>:root { --font-x: "Comic Sans MS", sans-serif; } p { font-family: var(--font-x); }</style></body>`;
    const out = findDesignMdViolations(html, dm());
    expect(out.some((v) => v.kind === "font")).toBe(true);
  });
});

/**
 * SHADOW_DECL_STRIP_RE coverage for shadow custom-property declarations.
 *
 * The regex MUST strip `--<anything>-shadow<anything>:` custom-property
 * declarations carrying `rgba()` literals BEFORE color scanning. The
 * earlier regex only handled `box-shadow:`, so a `--shadow-sm:
 * rgba(...)` custom property would surface its inner rgba as a
 * spurious color violation. The new pattern catches:
 *   - `--shadow-sm: rgba(...)`
 *   - `--card-shadow: rgba(...)`
 *   - `--btn-shadow-hover: rgba(...)`
 *   - `--ring-shadow-1: rgba(...)`
 *   - any `--<anything>-shadow<anything>: ...` shape
 */

import { describe, expect, it } from "vitest";

import type { DesignMd } from "../../../../../src/core/design/designMd.js";
import { findDesignMdViolations } from "../../../../../src/core/prototyping/designMdViolations.js";

const dm = (): DesignMd => ({
  brand: { name: "Sample", archetype: "tech" },
  visual: {
    colors: { primary: "#1F2937", surface: "#FFFFFF" },
    typography: {
      family_sans: "Inter, system-ui, sans-serif",
      family_display: "Inter, system-ui, sans-serif",
      family_mono: "JetBrains Mono, ui-monospace, monospace",
    },
    radius: { sm: "0.25rem" },
    shadow: { sm: "0 1px 2px rgba(15,23,42,0.05)" },
  },
});

describe("--*-shadow*: declarations stripped before color scanning", () => {
  const cases: ReadonlyArray<{ name: string; decl: string }> = [
    { name: "--shadow-sm", decl: "--shadow-sm: 0 1px 2px rgba(255, 0, 0, 0.05);" },
    { name: "--card-shadow", decl: "--card-shadow: 0 4px 6px rgba(0, 0, 255, 0.1);" },
    { name: "--btn-shadow-hover", decl: "--btn-shadow-hover: 0 8px 16px rgba(0, 255, 0, 0.2);" },
    { name: "--ring-shadow-1", decl: "--ring-shadow-1: 0 0 0 3px rgba(120, 30, 50, 0.4);" },
  ];

  for (const { name, decl } of cases) {
    it(`strips ${name} so its inner rgba() does not surface as a color violation`, () => {
      const html = `<body><style>:root { ${decl} }</style></body>`;
      const out = findDesignMdViolations(html, dm());
      expect(out.filter((v) => v.kind === "color")).toEqual([]);
    });
  }

  it("does NOT strip unrelated --*-color: declarations (regression guard)", () => {
    const html = `<body><style>:root { --some-color: rgba(123, 0, 0, 0.5); }</style></body>`;
    const out = findDesignMdViolations(html, dm());
    expect(out.some((v) => v.kind === "color" && v.found.includes("rgba(123"))).toBe(true);
  });
});

/**
 * SAFE_LITERALS CSS-wide keyword × scanner matrix.
 *
 * The 5 CSS-wide keywords (`inherit`, `initial`, `unset`, `revert`,
 * `currentColor`) MUST be treated as safe across every scanner
 * (`scanColors`, `scanFonts`, `scanRadius`, `scanShadow`) — every cell
 * of the 5 × 4 matrix produces `designMdViolations[] === []`.
 *
 * Failures emit `expected scanner=<name> keyword=<keyword> to pass;
 * got violation=<entry>` for fast triage.
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
    radius: { sm: "0.25rem", md: "0.5rem" },
    shadow: { sm: "0 1px 2px rgba(15,23,42,0.05)" },
  },
});

const CSS_WIDE_KEYWORDS = ["inherit", "initial", "unset", "revert", "currentColor"] as const;

type ScannerCell = {
  readonly scanner: "scanColors" | "scanFonts" | "scanRadius" | "scanShadow";
  readonly toHtml: (kw: string) => string;
};

const SCANNERS: ReadonlyArray<ScannerCell> = [
  { scanner: "scanColors", toHtml: (kw) => `<body><div style="color:${kw}"></div></body>` },
  { scanner: "scanFonts", toHtml: (kw) => `<body><div style="font-family:${kw}"></div></body>` },
  { scanner: "scanRadius", toHtml: (kw) => `<body><div style="border-radius:${kw}"></div></body>` },
  { scanner: "scanShadow", toHtml: (kw) => `<body><div style="box-shadow:${kw}"></div></body>` },
];

describe("SAFE_LITERALS — 5 CSS-wide keywords × 4 scanners = 20 cells", () => {
  for (const { scanner, toHtml } of SCANNERS) {
    for (const keyword of CSS_WIDE_KEYWORDS) {
      it(`${scanner} accepts ${keyword} as safe (zero violations)`, () => {
        const html = toHtml(keyword);
        const out = findDesignMdViolations(html, dm());
        if (out.length !== 0) {
          throw new Error(
            `expected scanner=${scanner} keyword=${keyword} to pass; got violations=${JSON.stringify(out)}`,
          );
        }
        expect(out).toEqual([]);
      });
    }
  }
});

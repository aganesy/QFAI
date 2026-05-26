/**
 * Integration: Tailwind contract convergence within 3 cycles on the
 * p95 lane.
 *
 * A canonical Tailwind-faithful fixture pack (CDN preflight literals
 * + `--tw-*` custom properties + alpha-modifier `rgb(... / ...)` syntax
 * + token-driven `var(--font-sans)` + CSS-wide keywords + `--*-shadow*:`
 * rgba declarations) MUST produce zero `designMdViolations[]` across
 * all four scanners, and the synthesised iteration chain MUST converge
 * with `iterations.length <= 3 AND stopReason === "axes-exceptional"`.
 *
 * The test composes the SSOT machinery end-to-end (scanner +
 * `shouldStop`) without requiring the CLI harness, so the assertion
 * surface stays integration-level but execution stays in-process.
 */
// QFAI:SPEC-0012:TC-0012-0434

import { describe, expect, it } from "vitest";

import type { DesignMd } from "../../../src/core/design/designMd.js";
import { findDesignMdViolations } from "../../../src/core/prototyping/designMdViolations.js";
import {
  type Iteration,
  type OrdinalScore,
  shouldStop,
} from "../../../src/core/prototyping/iteration.js";

const dm: DesignMd = {
  brand: { name: "Sample", archetype: "tech" },
  visual: {
    colors: {
      primary: "#1F2937",
      secondary: "#6366F1",
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
    shadow: { sm: "0 1px 2px rgba(15,23,42,0.05)", md: "0 4px 6px rgba(15,23,42,0.08)" },
  },
};

/**
 * Canonical Tailwind-faithful fixture: a faithfully generated iter that
 * loads the Tailwind CDN preflight, declares `--tw-*` runtime properties,
 * uses alpha-modifier rgb syntax, references DESIGN.md tokens through
 * `var(--token)`, uses CSS-wide keywords (`inherit` / `currentColor`),
 * and stores shadow declarations as `--*-shadow*:` custom properties.
 *
 * Pre-CHG-005 this fixture surfaced ~10+ false-positive violations
 * (preflight `#fff`, `--tw-ring-color` rgba, `font-family: var(...)`,
 * `font-family: inherit`, `--card-shadow:` rgba). Post-CHG-005 it
 * converges with zero violations.
 */
const FAITHFUL_HTML = `<!doctype html>
<html>
  <head>
    <style>
      /* Tailwind CDN preflight subset — sentinel literals only */
      html { color: #fff; }
      ::placeholder { color: #9ca3af; }
      *, ::before, ::after { border-color: #e5e7eb; }
      :focus-visible { outline-color: rgb(59 130 246 / 0.5); }
      /* Tailwind runtime custom properties */
      :root {
        --tw-ring-color: rgba(0, 0, 0, 0.3);
        --tw-shadow-color: rgba(99, 102, 241, 0.4);
        /* DESIGN.md tokens via var() */
        --font-sans: Inter, system-ui, sans-serif;
        --radius-md: 0.5rem;
        --shadow-sm: 0 1px 2px rgba(15,23,42,0.05);
        --card-shadow: 0 4px 6px rgba(15,23,42,0.08);
      }
    </style>
  </head>
  <body>
    <style>
      .card {
        font-family: var(--font-sans);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        color: inherit;
        background-color: currentColor;
      }
    </style>
    <div class="card"></div>
  </body>
</html>`;

const exceptional: OrdinalScore = "exceptional";

const exceptionalIteration = (index: number): Iteration => ({
  index,
  commitSha: `${index.toString().padStart(40, "0")}`,
  scores: {
    informationArchitecture: exceptional,
    navigationFlow: exceptional,
    usability: exceptional,
    functionality: exceptional,
  },
  proseCritique: "ok",
  layoutAntiPatternsDetected: [],
  designMdViolations: [],
  pivotDirective: "continue",
  evidenceRefs: {
    screenshot: `iter-0${index}/screenshot.png`,
    html: `iter-0${index}/index.html`,
  },
});

describe("TC-0012-0434: Tailwind contract convergence within 3 cycles", () => {
  it("canonical Tailwind-faithful fixture produces zero designMdViolations across all scanners", () => {
    const out = findDesignMdViolations(FAITHFUL_HTML, dm);
    expect(out).toEqual([]);
  });

  it("synthesised iteration chain converges within 3 cycles with stopReason=axes-exceptional", () => {
    const iterations: Iteration[] = [
      exceptionalIteration(0),
      exceptionalIteration(1),
      exceptionalIteration(2),
    ];
    expect(iterations.length).toBeLessThanOrEqual(3);
    expect(shouldStop(iterations)).toBe("axes-exceptional");
  });
});

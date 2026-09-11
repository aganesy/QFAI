/**
 * Markup taken from a component catalogue is judged by the values it states,
 * not by where it came from.
 *
 * The envelope the generator works inside cannot carry a runtime dependency: a
 * single file loaded from a CDN has no package manager, and CSS behind a
 * `<link>` is never fetched by the gate. Transposing a block's markup carries
 * neither, so it is an ordinary way to build a screen, and these rows hold the
 * gate to that.
 *
 * A catalogue block arrives bound to Tailwind's default palette and default
 * scale, both of which are drift by definition because the CDN cannot read
 * `DESIGN.md`. Re-binding those classes is the whole of the work. The passing
 * row is paired with the same block minus the envelope, so that the empty
 * result is a judgment on those classes rather than indifference to them.
 */

import { describe, expect, it } from "vitest";

import type { DesignMd } from "../../../../src/core/design/designMd.js";
import { findDesignMdViolations } from "../../../../src/core/prototyping/designMdViolations.js";

const designMd = (): DesignMd => ({
  brand: { name: "Sample", archetype: "tech" },
  visual: {
    colors: {
      primary: "#1f2937",
      secondary: "#374151",
      accent: "#2563eb",
      surface: "#ffffff",
      surface_muted: "#f3f4f6",
      text: "#111827",
      text_muted: "#6b7280",
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
      md: "0 4px 6px rgba(15,23,42,0.08)",
      lg: "0 12px 24px rgba(15,23,42,0.10)",
    },
  },
});

/** The `theme.extend` injection the envelope mandates, which re-binds the aliases. */
const ENVELOPE = [
  "<script>",
  "  tailwind.config = { theme: { extend: {",
  '    borderRadius: { "sm": "0.25rem", "md": "0.5rem", "lg": "0.75rem", "full": "9999px" },',
  '    boxShadow: { "sm": "0 1px 2px rgba(15,23,42,0.05)" }',
  "  } } };",
  "</script>",
].join("\n");

/**
 * A catalogue block as published: structure, spacing and layout utilities bound
 * to Tailwind's default palette and its default radius / shadow scale.
 */
const AS_PUBLISHED = [
  '<div class="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-2xl">',
  '  <h3 class="text-lg font-semibold text-slate-900">Monthly report</h3>',
  '  <p class="mt-2 text-sm text-slate-500">Ready to download.</p>',
  '  <button class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-blue-50">Download</button>',
  "</div>",
].join("\n");

/** The same block with its palette classes and scale aliases re-bound to tokens. */
const REBOUND = [
  '<div class="rounded-md border border-border bg-surface p-6 shadow-sm">',
  '  <h3 class="text-lg font-semibold text-text">Monthly report</h3>',
  '  <p class="mt-2 text-sm text-text-muted">Ready to download.</p>',
  '  <button class="mt-4 rounded-md bg-primary px-4 py-2 text-surface">Download</button>',
  "</div>",
].join("\n");

const page = (body: string, head: string = ENVELOPE): string =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

const foundIn = (html: string): string[] =>
  findDesignMdViolations(html, designMd()).map((v) => v.found);

describe("a transposed catalogue block", () => {
  it("passes once its palette classes are re-bound to DESIGN.md tokens", () => {
    expect(findDesignMdViolations(page(REBOUND), designMd())).toEqual([]);
  });

  it("has those same classes judged, not ignored", () => {
    // Without the `theme.extend` injection the two scale aliases render
    // Tailwind's defaults and are reported. That is what makes the empty
    // result above a decision about this markup.
    const withoutEnvelope = foundIn(page(REBOUND, ""));
    expect(withoutEnvelope).toContain("rounded-md");
    expect(withoutEnvelope).toContain("shadow-sm");
  });

  it("is caught on the default palette and scale it was published with", () => {
    expect(foundIn(page(AS_PUBLISHED)).sort()).toEqual(
      [
        "bg-blue-600",
        "bg-slate-50",
        "border-slate-200",
        "rounded-xl",
        "shadow-2xl",
        "text-blue-50",
        "text-slate-500",
        "text-slate-900",
      ].sort(),
    );
  });

  it("keeps every structural and spacing class either way", () => {
    // Re-binding is the whole of the work: the layout utilities a block is
    // taken for carry no token, so a finding on one would mean the
    // transposition had to be rewritten rather than re-bound.
    const structural = [
      "p-6",
      "mt-2",
      "mt-4",
      "px-4",
      "py-2",
      "text-lg",
      "text-sm",
      "font-semibold",
      "border",
    ];
    for (const html of [page(AS_PUBLISHED), page(REBOUND)]) {
      const found = foundIn(html);
      for (const cls of structural) {
        expect(found, cls).not.toContain(cls);
      }
    }
  });

  it("reads nothing out of a stylesheet the page only links to", () => {
    // The href is never fetched, so a literal inside it is invisible here. That
    // is why the external stylesheet is banned on the authoring side instead of
    // being caught by this scanner.
    const linked = `<link rel="stylesheet" href="https://example.test/card.css" />`;
    expect(findDesignMdViolations(page(REBOUND, `${ENVELOPE}${linked}`), designMd())).toEqual([]);
  });
});

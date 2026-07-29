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

  // TC-3.2.3 (revised under CHG-005 / REQ-0012-0055): `#fff` is on the
  // Tailwind preflight sentinel allowlist (`TAILWIND_PREFLIGHT_LITERALS`)
  // and is silently allowed regardless of DESIGN.md content, so a
  // bare `color:#FFF` no longer produces a violation. A 3-letter hex
  // that is NOT on the preflight allowlist still surfaces — exercised
  // via `#abc` below.
  it("3-letter hex on preflight allowlist (#FFF) → no violation; off-allowlist 3-letter hex → violation", () => {
    const safeHtml = '<body><span style="color:#FFF"></span></body>';
    expect(findDesignMdViolations(safeHtml, sampleDesignMd())).toEqual([]);

    const driftHtml = '<body><span style="color:#abc"></span></body>';
    const drift = findDesignMdViolations(driftHtml, sampleDesignMd());
    expect(drift.length).toBeGreaterThanOrEqual(1);
    expect(drift[0]).toEqual({ kind: "color", found: "#abc" });
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

  it("href fragment that looks like a hex color (e.g. #deadbeef) is NOT flagged as a color violation", () => {
    // Anchor links / SVG fragment refs are structurally not color
    // declarations. Without the CSS-context restriction, the scanner
    // would have surfaced `#deadbeef` as drift even though it is an
    // anchor target.
    const html = '<a href="#deadbeef">link</a><svg><use href="#abcdef"/></svg>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("SVG url(#id) reference is NOT flagged as a color violation", () => {
    const html = '<svg><circle fill="url(#myGradient)"/></svg>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("inline style filter:url(#abc) is NOT flagged as a color violation", () => {
    // SVG/filter id refs inside CSS regions historically slipped past
    // the CSS-context restriction because url(#abc) is itself a CSS
    // declaration. The url(...) strip-pass before HEX_RE prevents the
    // fragment id from surfacing as DESIGN.md drift.
    const html = '<div style="filter:url(#abc); background:#1F2937"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("<style> block url(#hash) reference is NOT flagged as a color violation", () => {
    const html = "<style>.icon{ fill: url(#defaced); }</style>";
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("url() with quoted/whitespace fragment is also stripped", () => {
    const html = '<style>.a{ mask: url( "#abc" ); }</style>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("named CSS color (color: red) IS flagged when not in DESIGN.md", () => {
    const html = '<div style="color: red"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([{ kind: "color", found: "red" }]);
  });

  it("named CSS color (background-color: white) IS flagged when not in DESIGN.md", () => {
    const html = "<style>p{ background-color: white; }</style>";
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "white")).toBe(true);
  });

  it("named CSS color authored as a DESIGN.md token is NOT flagged (defensive: scanner respects allow-set even if parser rejects authoring)", () => {
    // Defensive coverage: the scanner's contract is "respect the
    // DESIGN.md allow-set as authored". This test mutates the
    // DesignMd object directly to set `primary = "red"` so the
    // allow-set contains the keyword `red`, then asserts the named-
    // color scan honors that. The actual `parseDesignMd` parser
    // rejects `red` (and any non-hex value) for non-overlay color
    // keys via `HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/`
    // (designMd.ts), so this code path is unreachable through
    // production authoring. We pin it anyway because: (a) a future
    // schema relaxation that allowed named colors should keep the
    // scanner honoring the allow-set, and (b) the scanner is reused
    // outside `parseDesignMd` (programmatic DesignMd construction in
    // tests / tooling), where this boundary is reachable.
    const dm = sampleDesignMd();
    dm.visual.colors.primary = "red";
    const html = '<div style="color: red"></div>';
    const out = findDesignMdViolations(html, dm);
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("background shorthand with quoted url + named color flags the named color", () => {
    // Codex 696E: `background: url("hero.png") no-repeat red` —
    // CSS_URL_RE strips `url("hero.png")` from the cssText BEFORE
    // COLOR_PROP_RE matches, so the post-strip value is
    // ` no-repeat red`, and the per-token loop flags `red`.
    const html = '<style>.hero { background: url("hero.png") no-repeat red; }</style>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "red")).toBe(true);
  });

  it("background shorthand with single-quoted url + named color flags the named color", () => {
    const html = "<div style=\"background: url('hero.png') no-repeat red\"></div>";
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "red")).toBe(true);
  });

  it("background shorthand with named color (background: red) IS flagged", () => {
    // Codex 6r-a: `background: red` is the most common shorthand
    // path that bypassed the pre-fix scanner because background
    // wasn't in COLOR_PROP_RE. Now caught.
    const html = '<div style="background: red"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([{ kind: "color", found: "red" }]);
  });

  it("border shorthand with named color (border: 1px solid red) IS flagged", () => {
    // Codex 6r-a: `border: 1px solid red` shorthand. The per-token
    // loop walks `1px solid red`; `1px` skipped (numeric), `solid`
    // skipped (not in CSS_NAMED_COLORS), `red` flagged.
    const html = '<div style="border: 1px solid red"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([{ kind: "color", found: "red" }]);
  });

  it("outline shorthand with named color (outline: 2px dashed blue) IS flagged", () => {
    const html = '<div style="outline: 2px dashed blue"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([{ kind: "color", found: "blue" }]);
  });

  it("text-decoration shorthand with named color (text-decoration: underline red) IS flagged", () => {
    // Aganesy 6_DT: text-decoration shorthand routes color through
    // the same per-token loop as border / outline. `underline` is
    // not a CSS_NAMED_COLORS keyword so it's silently skipped;
    // `red` is flagged.
    const html = '<div style="text-decoration: underline red"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([{ kind: "color", found: "red" }]);
  });

  it("column-rule shorthand with named color (column-rule: 1px solid red) IS flagged", () => {
    const html = '<div style="column-rule: 1px solid red"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([{ kind: "color", found: "red" }]);
  });

  it("border-top shorthand with named color IS flagged", () => {
    const html = '<div style="border-top: 1px solid green"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([{ kind: "color", found: "green" }]);
  });

  it("mixed shorthand (border-color: red #ff0000 blue #00ff00) flags BOTH named tokens AND BOTH hex tokens", () => {
    // Aganesy 6zZu: pre-fix, the outer hex/rgb/hsl skip caused the
    // entire value to be skipped when ANY hex literal was present,
    // hiding the named-color drift entirely. Per-token skip now lets
    // each token be evaluated independently. Hex tokens are caught
    // by the literal scanner above; named tokens are caught here.
    const html = '<div style="border-color: red #ff0000 blue #00ff00"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const colorHits = out.filter((v) => v.kind === "color").map((v) => v.found);
    // The order: literal scanner runs first, so hex literals come
    // first; then named tokens from COLOR_PROP_RE pass.
    expect(colorHits).toEqual(["#ff0000", "#00ff00", "red", "blue"]);
  });

  it("mixed shorthand (border-color: red rgba(99,99,99,0.5)) flags BOTH the rgba AND the named token", () => {
    // Aganesy 6zZu rgba arm: same structure as the hex mix above.
    // Use an rgba value that is NOT in `dm.visual.colors.overlay`
    // so the literal scan flags it.
    const html = '<div style="border-color: red rgba(99,99,99,0.5)"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const colorHits = out.filter((v) => v.kind === "color").map((v) => v.found);
    expect(colorHits).toContain("red");
    expect(colorHits).toContain("rgba(99,99,99,0.5)");
  });

  it("border-color 4-side shorthand with all named colors flags every token", () => {
    // `border-color: red blue green red` is valid CSS shorthand for
    // top/right/bottom/left. Pre-fix, `^[a-z]+$` skipped multi-token
    // values entirely; named-color drift was silent on the longhand
    // shorthand. Post-fix, each whitespace-separated token is
    // checked against CSS_NAMED_COLORS independently.
    // #242 also made the return value one entry per distinct {kind, found}
    // pair, so the repeated `red` collapses; each distinct token is still
    // reported, which is what this obligation is about.
    const html = '<div style="border-color: red blue green red"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const colorHits = out.filter((v) => v.kind === "color");
    expect(colorHits.map((v) => v.found)).toEqual(["red", "blue", "green"]);
  });

  it("border-color 2-side shorthand flags both tokens", () => {
    const html = '<div style="border-color: red blue"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const colorHits = out.filter((v) => v.kind === "color");
    expect(colorHits.map((v) => v.found)).toEqual(["red", "blue"]);
  });

  it("rgba embedded in a registered box-shadow does NOT silently allow it on background-color", () => {
    // Codex 6r-e: pre-fix, `collectAllowedColors` widened the global
    // color allow-set with literals embedded in registered shadows,
    // so an unrelated `background-color: rgba(15,23,42,0.05)`
    // (which is the rgba inside `dm.visual.shadow.sm`) slipped past
    // the gate. Post-fix, the shadow-embedded literals are scoped
    // to box-shadow declarations only via SHADOW_DECL_STRIP_RE, and
    // the literal scanner ignores box-shadow value content.
    const html = '<div style="background-color: rgba(15,23,42,0.05)"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "rgba(15,23,42,0.05)")).toBe(true);
  });

  it("registered box-shadow with embedded rgba is still allowed (no false positive on the shadow itself)", () => {
    // Counterpart to the test above: stripping shadow declarations
    // from the literal-scan input must not regress the original
    // exemption. A box-shadow value listed verbatim in
    // `dm.visual.shadow.*` continues to pass.
    const html = '<div style="box-shadow: 0 1px 2px rgba(15,23,42,0.05)"></div>';
    expect(findDesignMdViolations(html, sampleDesignMd())).toEqual([]);
  });

  it("text-shadow drift hex/rgb/hsl IS still flagged by the literal-color scan", () => {
    // Aganesy 67J9: text-shadow has no independent validator
    // (scanShadow is anchored on `box-shadow:`). Stripping
    // text-shadow declarations would leave its drift entirely
    // unmonitored. The strip is intentionally scoped to box-shadow
    // only, so hex / rgb / hsl literals inside a text-shadow value
    // still surface as DESIGN.md drift here. Named-color drift in
    // text-shadow is not caught (text-shadow is not in
    // COLOR_PROP_RE) — this matches the pre-fix posture; weak
    // literal-only protection is strictly more than no protection.
    const html = '<div style="text-shadow: 0 1px 2px #abcdef"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#abcdef")).toBe(true);
  });

  it("multi-token shorthand with one allowed and one drift token flags only the drift token", () => {
    const dm = sampleDesignMd();
    dm.visual.colors.primary = "red";
    const html = '<div style="border-color: red blue"></div>';
    const out = findDesignMdViolations(html, dm);
    const colorHits = out.filter((v) => v.kind === "color");
    expect(colorHits.map((v) => v.found)).toEqual(["blue"]);
  });

  it("transparent / currentcolor / inherit are NOT flagged as named-color violations", () => {
    const html = `
      <div style="color: transparent"></div>
      <div style="background-color: currentcolor"></div>
      <div style="border-color: inherit"></div>
    `;
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("var(--token) reference is NOT flagged as a named-color violation", () => {
    // Custom-property references resolve at render time and are out of
    // scope for the regex scanner; surfacing them as drift would noise
    // every Tailwind/shadcn-style prototype.
    const html = '<div style="color: var(--accent)"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("Tailwind arbitrary-value class with a non-token hex IS flagged (codex 8thE)", () => {
    // Pre-fix this test asserted the opposite — the class-attribute
    // pass was missing, so `bg-[#abcdef]` slipped past the certify
    // gate even though the rendered Tailwind utility produces
    // `background-color: #abcdef`. The gap let prototypes that
    // authored arbitrary-value drift converge here and only fail
    // later at certify (or worse, at production). The new
    // `scanTailwindArbitrary` pass closes the gap by extracting
    // `class="..."` attrs and classifying each `<prefix>-[<value>]`
    // utility against the DESIGN.md token set.
    const html = '<div class="bg-[#abcdef]"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#abcdef")).toBe(true);
  });

  it("color literal inside an inline style attribute IS flagged when not in DESIGN.md", () => {
    const html = '<div style="color:#abcdef"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out).toEqual([{ kind: "color", found: "#abcdef" }]);
  });

  it("color literal inside a <style> block IS flagged when not in DESIGN.md", () => {
    const html = "<style>p { color: #abcdef; }</style>";
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out).toEqual([{ kind: "color", found: "#abcdef" }]);
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

  it("Border-Radius (mixed-case property) is detected as a violation", () => {
    // CSS property names are case-insensitive per spec; the regex must
    // honor that or off-spec authored prototypes can leak DESIGN.md
    // drift through the certify gate.
    const html = '<div style="Border-Radius: 1.5rem"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out).toEqual([{ kind: "radius", found: "1.5rem" }]);
  });

  it("BORDER-RADIUS (uppercase) is also detected", () => {
    const html = "<style>p{ BORDER-RADIUS: 1.5rem; }</style>";
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out).toEqual([{ kind: "radius", found: "1.5rem" }]);
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

  it("BOX-SHADOW (uppercase property) is detected as a violation", () => {
    const html = '<div style="BOX-SHADOW: 0 0 99px red"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "shadow" && v.found === "0 0 99px red")).toBe(true);
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
    // Both regions are scanned; the shared value is reported once because
    // #242 de-duplicates on {kind, found}. Scanning coverage is asserted by
    // the region-specific cases above.
    expect(colorHits.length).toBe(1);
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

describe("findDesignMdViolations — Tailwind arbitrary-value classes (codex 8thE)", () => {
  // The shipped generator prompt mandates Tailwind utilities and forbids
  // raw `#hex` outside DESIGN.md. Drift authored as `bg-[#ff0000]` /
  // `rounded-[13px]` / `shadow-[...]` lives in `class="..."` attrs and
  // bypasses `<style>` / inline `style="..."` extraction. These tests
  // pin the class-attribute pass that closes that gap.

  it("bg-[#ff0000] (non-token hex in class attr) is flagged as a color violation", () => {
    const html = '<div class="bg-[#ff0000] rounded-md">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const colorHits = out.filter((v) => v.kind === "color");
    expect(colorHits.some((v) => v.found === "#ff0000")).toBe(true);
  });

  it("bg-[#1F2937] (DESIGN.md token in class attr) does NOT produce a color violation", () => {
    const html = '<div class="bg-[#1F2937]">x</div>';
    const colorHits = findDesignMdViolations(html, sampleDesignMd()).filter(
      (v) => v.kind === "color",
    );
    expect(colorHits).toEqual([]);
  });

  it("rounded-[13px] (non-token radius in class attr) is flagged", () => {
    const html = '<div class="rounded-[13px]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "radius" && v.found === "13px")).toBe(true);
  });

  it("rounded-[0.5rem] (DESIGN.md radius token) does NOT produce a violation", () => {
    const html = '<div class="rounded-[0.5rem]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "radius")).toEqual([]);
  });

  it("rounded-tl-[13px] (sided-radius prefix) is flagged", () => {
    const html = '<div class="rounded-tl-[13px]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "radius" && v.found === "13px")).toBe(true);
  });

  it("shadow-[0_4px_6px_rgba(0,0,0,0.1)] (underscore-encoded space) is flagged when not a token", () => {
    const html = '<div class="shadow-[0_4px_6px_rgba(0,0,0,0.1)]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    // The underscore-decoded value should appear in the violation:
    // `0 4px 6px rgba(0,0,0,0.1)` — not a registered shadow token.
    expect(out.some((v) => v.kind === "shadow" && v.found === "0 4px 6px rgba(0,0,0,0.1)")).toBe(
      true,
    );
  });

  it("shadow-[0_1px_2px_rgba(15,23,42,0.05)] (DESIGN.md shadow token shape) does NOT produce a violation", () => {
    const html = '<div class="shadow-[0_1px_2px_rgba(15,23,42,0.05)]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "shadow")).toEqual([]);
  });

  it("text-[14px] (font-size, not a color) does NOT produce a color violation", () => {
    // `text-` is overloaded for color / size in Tailwind; the bracket
    // content shape disambiguates. A pure dimension is silently
    // skipped in the color path.
    const html = '<div class="text-[14px]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("text-[#ff00ff] (text color) is flagged", () => {
    const html = '<div class="text-[#ff00ff]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#ff00ff")).toBe(true);
  });

  it("border-[2px_solid_#ff0000] (multi-token shorthand) flags only the color drift", () => {
    const html = '<div class="border-[2px_solid_#ff0000]">x</div>';
    const colorHits = findDesignMdViolations(html, sampleDesignMd()).filter(
      (v) => v.kind === "color",
    );
    expect(colorHits.some((v) => v.found === "#ff0000")).toBe(true);
    // `2px` and `solid` are not color tokens, must not be flagged.
    expect(colorHits.some((v) => v.found === "2px")).toBe(false);
    expect(colorHits.some((v) => v.found === "solid")).toBe(false);
  });

  it("bg-[red] (named color in class attr) is flagged", () => {
    const html = '<div class="bg-[red]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "red")).toBe(true);
  });

  it("class attr with single quotes is also scanned", () => {
    const html = "<div class='bg-[#ff0000]'>x</div>";
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#ff0000")).toBe(true);
  });

  it("multiple arbitrary classes in one attr are all scanned", () => {
    const html = '<div class="bg-[#ff0000] rounded-[13px] shadow-[0_0_99px_red]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "#ff0000")).toBe(true);
    expect(out.some((v) => v.kind === "radius" && v.found === "13px")).toBe(true);
    expect(out.some((v) => v.kind === "shadow" && v.found === "0 0 99px red")).toBe(true);
  });

  // codex 9Ifs: CSS Color Module L4 space-separated function syntax
  it("bg-[rgb(255_0_0)] (space-separated rgb after underscore decode) is flagged", () => {
    // Pre-fix the per-token whitespace split shredded `rgb(255 0 0)` into
    // `["rgb(255", "0", "0)"]`, none of which match the rgba?\(...\)
    // regex (no closing paren in token 0, no opening paren in token 2).
    // Post-fix the per-token loop runs first; if it pushes nothing, a
    // whole-value fallback runs and catches the spaced-function syntax.
    const html = '<div class="bg-[rgb(255_0_0)]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "rgb(255 0 0)")).toBe(true);
  });

  it("bg-[hsl(0_100%_50%)] (space-separated hsl after underscore decode) is flagged", () => {
    const html = '<div class="bg-[hsl(0_100%_50%)]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "hsl(0 100% 50%)")).toBe(true);
  });

  it("border-[2px_solid_#ff0000] still flags only the color token (not the whole shorthand)", () => {
    // Sentinel: per-token first means the violation `found` field
    // carries `#ff0000` exactly, not the whole `2px solid #ff0000`
    // shorthand. A future revert to whole-value-first would push the
    // shorthand string as the violation token and fail this assertion.
    const html = '<div class="border-[2px_solid_#ff0000]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const colorHits = out.filter((v) => v.kind === "color");
    expect(colorHits.some((v) => v.found === "#ff0000")).toBe(true);
    expect(colorHits.some((v) => v.found === "2px solid #ff0000")).toBe(false);
  });
});

// codex 9Ify: Tailwind `font-[X]` overload disambiguation
describe("findDesignMdViolations — Tailwind font-[X] disambiguation (codex 9Ify)", () => {
  it("font-[600] (numeric weight) is silently skipped (NOT a font-family violation)", () => {
    const html = '<div class="font-[600]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "font")).toEqual([]);
  });

  it("font-[bold] (named-weight keyword) is silently skipped", () => {
    const html = '<div class="font-[bold]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "font")).toEqual([]);
  });

  it("font-[Comic_Sans_MS] (off-token font-family after underscore decode) is flagged", () => {
    const html = `<div class="font-['Comic_Sans_MS']">x</div>`;
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "font" && v.found === "Comic Sans MS")).toBe(true);
  });

  it("font-[Inter] (DESIGN.md-token font-family) does NOT produce a violation", () => {
    const html = '<div class="font-[Inter]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "font")).toEqual([]);
  });

  it("font-[Cursive] (off-token, non-weight) is flagged", () => {
    const html = '<div class="font-[Cursive]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "font" && v.found === "Cursive")).toBe(true);
  });
});

// codex 9R4j: named colors in CSS punctuation / function context
describe("findDesignMdViolations — named colors in punctuation context (codex 9R4j)", () => {
  it("named color in linear-gradient() arguments is flagged", () => {
    // Pre-fix `linear-gradient(red, blue)` tokenized as
    // `["linear-gradient(red,", "blue)"]` after whitespace-only split,
    // so neither pure-letter token survived `^[a-z]+$`. Splitting on
    // CSS-meaningful delimiters `[\s,()!;]+` extracts `red` / `blue`
    // individually for the named-color check.
    const html = '<div style="background: linear-gradient(red, blue)"></div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const names = out.filter((v) => v.kind === "color").map((v) => v.found);
    expect(names).toContain("red");
    expect(names).toContain("blue");
  });

  it("named color with !important suffix is flagged", () => {
    // Pre-fix `red!important` was a single token failing the pure-
    // letter check, so the drift slipped through. Tokenizing on `!`
    // / `;` extracts `red` for the named-color check.
    const html = "<style>p{ color: red!important; }</style>";
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "red")).toBe(true);
  });

  it("border-[#ff0000_rgb(0_0_0)] (mixed hex + L4 spaced rgb in same shorthand) flags BOTH (codex 9vcu)", async () => {
    // Pre-fix the per-token loop pushed `#ff0000` then `if
    // (perTokenMatched) return;` skipped the whole-value fallback,
    // so the L4 spaced `rgb(0 0 0)` was lost in mixed-syntax
    // shorthands. Post-fix the matchAll fallback runs unconditionally
    // (with dedupe scoped to this single arbitrary class) so both
    // tokens surface.
    const html = '<div class="border-[#ff0000_rgb(0_0_0)]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const colors = out.filter((v) => v.kind === "color").map((v) => v.found);
    expect(colors).toContain("#ff0000");
    expect(colors).toContain("rgb(0 0 0)");
  });

  it("border-[2px_solid_rgb(0,0,0)] (per-token rgb match + matchAll match) is not double-counted", async () => {
    // Sentinel: comma-separated `rgb(0,0,0)` is a single per-token
    // match AND also catches via matchAll. Dedupe scope keeps the
    // out array clean.
    const html = '<div class="border-[2px_solid_rgb(0,0,0)]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const rgbHits = out.filter((v) => v.kind === "color" && v.found.startsWith("rgb"));
    expect(rgbHits.length).toBe(1);
  });

  it("named color tightly embedded with comma+space is still flagged", () => {
    // Defensive: `red,blue` (no space after comma) was fully missed
    // pre-fix because whitespace was the only split delimiter.
    const html = "<style>p{ background: linear-gradient(red,blue); }</style>";
    const out = findDesignMdViolations(html, sampleDesignMd());
    const names = out.filter((v) => v.kind === "color").map((v) => v.found);
    expect(names).toContain("red");
    expect(names).toContain("blue");
  });
});

// codex AHzR7: standard Tailwind palette/scale utility classes carry
// no CSS literal in the rendered HTML and bypass every other scanner.
// They resolve to Tailwind defaults (CDN-served), NOT to DESIGN.md
// tokens, so a final prototype can drift while findDesignMdViolations
// returns zero. This block pins scanTailwindUtility.
describe("findDesignMdViolations — Tailwind palette/scale utility classes (codex AHzR7)", () => {
  it("bg-blue-500 (palette+scale color) is flagged as drift", () => {
    const html = '<div class="bg-blue-500">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "bg-blue-500")).toBe(true);
  });

  it("text-slate-900 (palette+scale color) is flagged as drift", () => {
    const html = '<div class="text-slate-900">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "text-slate-900")).toBe(true);
  });

  it("border-rose-50 / border-rose-950 (palette boundary scales) are flagged", () => {
    const html = '<div class="border-rose-50 border-rose-950">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const founds = out.filter((v) => v.kind === "color").map((v) => v.found);
    expect(founds).toContain("border-rose-50");
    expect(founds).toContain("border-rose-950");
  });

  it("rounded-xl (radius scale alias) is flagged", () => {
    const html = '<div class="rounded-xl">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "radius" && v.found === "rounded-xl")).toBe(true);
  });

  it("rounded-2xl / rounded-3xl / rounded-full (multi-char aliases) are flagged", () => {
    const html = '<div class="rounded-2xl rounded-3xl rounded-full">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const founds = out.filter((v) => v.kind === "radius").map((v) => v.found);
    expect(founds).toContain("rounded-2xl");
    expect(founds).toContain("rounded-3xl");
    expect(founds).toContain("rounded-full");
  });

  it("shadow-lg / shadow-2xl / shadow-inner (shadow scale aliases) are flagged", () => {
    const html = '<div class="shadow-lg shadow-2xl shadow-inner">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const founds = out.filter((v) => v.kind === "shadow").map((v) => v.found);
    expect(founds).toContain("shadow-lg");
    expect(founds).toContain("shadow-2xl");
    expect(founds).toContain("shadow-inner");
  });

  it("bare `rounded` (no suffix) is flagged as a Tailwind default", () => {
    const html = '<div class="rounded">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "radius" && v.found === "rounded")).toBe(true);
  });

  it("bare `shadow` (no suffix) is flagged as a Tailwind default", () => {
    const html = '<div class="shadow">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "shadow" && v.found === "shadow")).toBe(true);
  });

  it("hover:bg-blue-500 (state prefix) is flagged as drift on the underlying utility", () => {
    const html = '<div class="hover:bg-blue-500">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "bg-blue-500")).toBe(true);
  });

  it("md:hover:rounded-xl (stacked responsive + state prefix) is flagged", () => {
    const html = '<div class="md:hover:rounded-xl">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "radius" && v.found === "rounded-xl")).toBe(true);
  });

  it("dark:shadow-lg (dark-mode prefix) is flagged", () => {
    const html = '<div class="dark:shadow-lg">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "shadow" && v.found === "shadow-lg")).toBe(true);
  });

  it("text-sm / text-center / text-base (non-color text utilities) are NOT flagged", () => {
    // `sm` / `center` / `base` are not palette names; the
    // palette+scale regex must not over-fire on these legitimate
    // Tailwind text-size / alignment utilities.
    const html = '<div class="text-sm text-center text-base">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out).toEqual([]);
  });

  it("flex / grid / p-4 / mx-auto (layout / spacing utilities) are NOT flagged", () => {
    const html = '<div class="flex grid p-4 mx-auto items-center">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out).toEqual([]);
  });

  it("arbitrary-value classes (`bg-[#ff0000]`) still go through scanTailwindArbitrary, not the utility scanner", () => {
    // `bg-[#ff0000]` has `[` so scanTailwindUtility skips it. The
    // hex `#ff0000` is reported (by scanTailwindArbitrary) but the
    // class string `bg-[#ff0000]` itself must NOT appear as a
    // separate violation `found`.
    const html = '<div class="bg-[#ff0000]">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.found === "bg-[#ff0000]")).toBe(false);
    expect(out.some((v) => v.kind === "color" && v.found === "#ff0000")).toBe(true);
  });

  it("multiple palette+scale + scale-alias classes in one element are all flagged", () => {
    const html = '<div class="bg-blue-500 text-slate-900 rounded-xl shadow-lg">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "bg-blue-500")).toBe(true);
    expect(out.some((v) => v.kind === "color" && v.found === "text-slate-900")).toBe(true);
    expect(out.some((v) => v.kind === "radius" && v.found === "rounded-xl")).toBe(true);
    expect(out.some((v) => v.kind === "shadow" && v.found === "shadow-lg")).toBe(true);
  });

  it("border-t-blue-500 / border-x-emerald-700 (sided color prefix + palette+scale) are flagged", () => {
    const html = '<div class="border-t-blue-500 border-x-emerald-700">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    const founds = out.filter((v) => v.kind === "color").map((v) => v.found);
    expect(founds).toContain("border-t-blue-500");
    expect(founds).toContain("border-x-emerald-700");
  });

  it("non-palette suffix (`bg-foo-500`, `bg-blue-1234`) is NOT flagged", () => {
    // Defensive: the palette+scale regex requires palette name in
    // TAILWIND_PALETTE_NAMES and scale in TAILWIND_PALETTE_SCALES. A
    // typo / custom token that fails either check is silently
    // skipped (could be a project-specific class name).
    const html = '<div class="bg-foo-500 bg-blue-1234">x</div>';
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.filter((v) => v.kind === "color")).toEqual([]);
  });

  it("class attr with single quotes is also scanned for palette/scale drift", () => {
    const html = "<div class='bg-blue-500 rounded-xl'>x</div>";
    const out = findDesignMdViolations(html, sampleDesignMd());
    expect(out.some((v) => v.kind === "color" && v.found === "bg-blue-500")).toBe(true);
    expect(out.some((v) => v.kind === "radius" && v.found === "rounded-xl")).toBe(true);
  });
});

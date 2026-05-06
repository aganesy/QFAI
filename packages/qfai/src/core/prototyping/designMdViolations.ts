/**
 * Pure scanner for DESIGN.md compliance violations in iter HTML.
 *
 * Scans an HTML string for color / font / radius / shadow values and
 * compares them against the allowed token set in a DesignMd record.
 * Returns one violation per occurrence (no de-duplication, no
 * short-circuit). Used by the certify gate to block convergence when a
 * generated prototype drifts from the SSOT design tokens.
 */

import type { DesignMd } from "../design/designMd.js";

export type DesignMdViolation = {
  readonly kind: "color" | "font" | "radius" | "shadow";
  readonly found: string;
};

// CSS hex colors are 3 / 4 / 6 / 8 nibbles only — never 5 or 7. The
// regex enumerates the valid lengths longest-first so the engine
// prefers the longer match (e.g. `#1F2937FF` over `#1F2937`). Matching
// `{3,8}` would accept 5/7-digit substrings of unrelated hashes (e.g.
// `#abcde` from a commit-hash prefix) as colors.
const HEX_RE = /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})\b/g;
const RGB_RE = /rgba?\([^)]*\)/gi;
const HSL_RE = /hsla?\([^)]*\)/gi;
// `url(...)` in CSS carries SVG/filter/mask references whose `#fragment`
// is an element-id selector, not a color literal. The arg can be quoted
// (`url("#abc")` / `url('#abc')`) or unquoted (`url(#abc)`), and CSS
// allows whitespace inside the parens. Strip the entire `url(...)`
// invocation before HEX_RE / RGB_RE / HSL_RE run so e.g.
// `filter:url(#abc)` does not surface `#abc` as a DESIGN.md drift.
const CSS_URL_RE = /\burl\s*\([^)]*\)/gi;
// Color-bearing CSS property declarations whose value is interpreted as
// a <color>. Named-color keywords (`red`, `white`, …) and the
// system-color keyword `transparent` are valid here. Hex/rgb/hsl are
// covered by the literal scanner; this regex catches the
// keyword-as-value path so `color: red` cannot slip past certify just
// because the literal isn't hex/rgb/hsl. The list includes both the
// dedicated *-color longhands AND the common shorthands (`background`,
// `border`, `border-{top,right,bottom,left}`, `outline`) — the
// shorthand grammar lets a named color sit anywhere in the value
// (e.g. `border: 1px solid red`, `background: red url(...) repeat`),
// and the per-token loop in scanColors splits the captured value on
// whitespace to find the color token among non-color shorthand
// tokens (`1px`, `solid`, `repeat`, etc., which are silently ignored
// because they aren't in CSS_NAMED_COLORS).
const COLOR_PROP_RE =
  /\b(?:color|background|background-color|border|border-top|border-right|border-bottom|border-left|border-color|border-top-color|border-right-color|border-bottom-color|border-left-color|outline|outline-color|fill|stroke|caret-color|text-decoration|text-decoration-color|column-rule|column-rule-color)\s*:\s*([^;}<>"']+)/gi;
// Property-value regexes capture up to the next `;`, `}`, `<`, `>`, or
// containing-attr quote boundary. Inline `style="..."` boundaries are
// handled by stopping at the outer attribute quote, so the value class
// excludes `"` and `'` for shadow/radius (which never need quotes), but
// font-family CAN have quoted family names (e.g., `"Comic Sans"`), so
// the font regex tolerates quotes within the value.
// `i` flag: CSS property names are case-insensitive per CSS spec
// (`Border-Radius: 12px` and `BOX-SHADOW: 0 0 8px red` are valid),
// so the matcher must accept any casing or off-spec authored prototypes
// can leak DESIGN.md drift through the gate.
const RADIUS_RE = /border-radius\s*:\s*([^;}<>"']+)/gi;
const SHADOW_RE = /box-shadow\s*:\s*([^;}<>"']+)/gi;
// font-family supports quoted family names (`"Comic Sans MS"`) but the
// value still must stop at the enclosing inline-style quote. CSS
// font-family is a comma-separated list where each entry is either a
// fully-quoted string or an unquoted token. The regex models that
// shape, so a stray `"` (the inline-style attribute boundary) cannot
// drag the next attribute into the captured value:
//   `<div style="font-family: Inter" class="card">` → captures `Inter`
//   `<style>p{ font-family: "Comic Sans", Inter; }` → captures
//     `"Comic Sans", Inter`.
const FONT_FAMILY_TOKEN = `(?:"[^"]*"|'[^']*'|[^;}<>"',]+)`;
const FONT_RE = new RegExp(
  `font-family\\s*:\\s*(${FONT_FAMILY_TOKEN}(?:\\s*,\\s*${FONT_FAMILY_TOKEN})*)`,
  "gi",
);

const SAFE_LITERALS: ReadonlySet<string> = new Set([
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
  "0",
  "none",
]);

// Single-shot test variants of HEX / RGB / HSL regexes — `g`-flagged
// regexes are stateful when reused with `.test()`, so dedicated
// test-only copies avoid that footgun. Co-located with HEX_RE / RGB_RE
// / HSL_RE rather than scattered after the scan helpers, so a future
// reader sees all color-literal regexes at the top of the file.
const HEX_RE_TEST = /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})\b/;
const RGB_RE_TEST = /rgba?\([^)]*\)/i;
const HSL_RE_TEST = /hsla?\([^)]*\)/i;

// CSS named-color keywords (CSS Color Module Level 4 + legacy). The set
// is closed: any keyword not here is either a non-color identifier
// (e.g. `inherit`, `var(...)`) or a typo. SAFE_LITERALS (`transparent`,
// `currentcolor`, etc.) is intentionally NOT a subset — those are
// system / inheritance keywords, not color literals, and have a
// dedicated allow path in scanColors.
const CSS_NAMED_COLORS: ReadonlySet<string> = new Set([
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure",
  "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet",
  "brown", "burlywood", "cadetblue", "chartreuse", "chocolate",
  "coral", "cornflowerblue", "cornsilk", "crimson", "cyan",
  "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen",
  "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen",
  "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
  "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise",
  "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey",
  "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia",
  "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green",
  "greenyellow", "grey", "honeydew", "hotpink", "indianred", "indigo",
  "ivory", "khaki", "lavender", "lavenderblush", "lawngreen",
  "lemonchiffon", "lightblue", "lightcoral", "lightcyan",
  "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey",
  "lightpink", "lightsalmon", "lightseagreen", "lightskyblue",
  "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow",
  "lime", "limegreen", "linen", "magenta", "maroon",
  "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple",
  "mediumseagreen", "mediumslateblue", "mediumspringgreen",
  "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream",
  "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive",
  "olivedrab", "orange", "orangered", "orchid", "palegoldenrod",
  "palegreen", "paleturquoise", "palevioletred", "papayawhip",
  "peachpuff", "peru", "pink", "plum", "powderblue", "purple",
  "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown",
  "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver",
  "skyblue", "slateblue", "slategray", "slategrey", "snow",
  "springgreen", "steelblue", "tan", "teal", "thistle", "tomato",
  "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow",
  "yellowgreen",
]);

function lowercaseValues(values: ReadonlyArray<string>): Set<string> {
  const out = new Set<string>();
  for (const value of values) {
    out.add(value.toLowerCase());
  }
  return out;
}

function stripQuotes(input: string): string {
  return input.replace(/^["']|["']$/g, "");
}

function firstFamilyToken(stack: string): string {
  return stripQuotes(stack.split(",")[0]?.trim() ?? "")
    .trim()
    .toLowerCase();
}

function fontMatches(value: string, allowedStacks: ReadonlyArray<string>): boolean {
  const normalizedValue = value.trim().toLowerCase();
  const valueFirstFamily = firstFamilyToken(value);
  for (const stack of allowedStacks) {
    if (normalizedValue === stack.trim().toLowerCase()) return true;
    const allowedFirstFamily = firstFamilyToken(stack);
    // Compare the first family as an exact token. `startsWith` would
    // misclassify e.g. "Interstate" as compliant when only "Inter, ..."
    // is allowed.
    if (allowedFirstFamily.length > 0 && allowedFirstFamily === valueFirstFamily) {
      return true;
    }
  }
  return false;
}

function collectAllowedColors(dm: DesignMd): Set<string> {
  // Allowed color literals are the explicit `visual.colors.*` values
  // only. Pre-1.8.9 this set was widened to include color literals
  // embedded in registered shadow values (so a valid
  // `box-shadow: 0 1px 2px rgba(15,23,42,0.05)` would not produce a
  // spurious violation for the inner rgba), but that allowance leaked:
  // an unrelated `background-color: rgba(15,23,42,0.05)` would also
  // pass even though that rgba was never declared as a color token.
  // The fix is to scope the shadow-embedded literals to box-shadow /
  // text-shadow declarations only. `scanColors` strips those
  // declarations from the cssText before the literal scan, so this
  // function no longer needs the shadow-embedded fallback. Radius
  // values are dimensionless and contribute no color literals.
  return lowercaseValues(Object.values(dm.visual.colors));
}

// Strip `box-shadow: ...;` declarations from a CSS region before
// literal color scanning. Without this, color literals inside a
// registered shadow value would either (a) be flagged spuriously
// when scanColors recognized the rgba/hex inside the shadow value
// but not the box-shadow property anchor, or (b) require a global
// shadow-color allow that bleeds into unrelated declarations (the
// pre-1.8.9 behavior caught by codex 6r-e). scanShadow continues to
// validate the full shadow value against `dm.visual.shadow` tokens
// independently, so legitimate registered shadows still pass.
//
// Scope is intentionally box-shadow only — `text-shadow` is NOT
// stripped. There is no independent text-shadow validator
// (scanShadow is anchored on `box-shadow:`), so stripping
// text-shadow would leave its drift entirely unmonitored. By
// keeping text-shadow in the literal-color input, hex / rgb / hsl
// literals inside a `text-shadow` value still surface as DESIGN.md
// drift through scanColors. (Named-color drift in text-shadow is
// not caught — text-shadow is not in COLOR_PROP_RE — but this
// matches the pre-fix posture: weak literal-only protection is
// strictly more than no protection.) If a future spec adds a
// `dm.visual.textShadow` token contract, this scope can widen.
const SHADOW_DECL_STRIP_RE = /\bbox-shadow\s*:[^;}<>"']+/gi;

// Capture CSS-context regions so the color scanner does not flag
// non-CSS hex / rgb / hsl substrings (e.g. `<a href="#deadbeef">`,
// `url(#abc)` SVG references, commit-hash prose) as DESIGN.md drift.
// Two contexts cover authored CSS:
//   1. `<style>...</style>` blocks
//   2. inline `style="..."` / `style='...'` attribute values
//
// Known limitations of the regex approach (deliberate KISS choice;
// real prototype HTML rarely hits these and the cost is a precise
// false-positive only, not a missed violation):
//   * Literal `<style>` text inside HTML comments or
//     `<script>` / `<pre><code>` content is treated as a real
//     `<style>` block. A tutorial doc with `<!-- <style>...</style> -->`
//     surfaces those colors. If this becomes load-bearing, swap in
//     a parse5-class HTML parser.
const STYLE_BLOCK_RE = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
const INLINE_STYLE_RE = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

function extractCssRegions(html: string): string {
  const parts: string[] = [];
  for (const match of html.matchAll(STYLE_BLOCK_RE)) {
    if (match[1]) parts.push(match[1]);
  }
  for (const match of html.matchAll(INLINE_STYLE_RE)) {
    const value = match[1] ?? match[2];
    if (value) parts.push(value);
  }
  return parts.join("\n");
}

function scanColors(html: string, dm: DesignMd, out: DesignMdViolation[]): void {
  const allowed = collectAllowedColors(dm);
  // Restrict color literal scanning to CSS-context regions only.
  // `<a href="#deadbeef">` and SVG `url(#abc)` references are
  // structurally not color declarations and must not surface as
  // DESIGN.md violations.
  //
  // Note the asymmetry with `scanFonts` / `scanRadius` / `scanShadow`:
  // those three regexes are anchored on a CSS property prefix
  // (`font-family:`, `border-radius:`, `box-shadow:`), which is a
  // strong CSS-context signal — false-positive risk in non-CSS prose
  // is very low (a markdown tutorial that writes
  // `<code>border-radius: 12px</code>` inline can still match, but
  // that is the rare edge case, not the common case). Hex / rgb /
  // hsl literals don't have such an anchor — they look like color
  // declarations only when they sit inside a CSS context, hence the
  // explicit `extractCssRegions` step here.
  //
  // Within CSS regions, strip `url(...)` invocations and shadow
  // declarations before literal scanning. `filter:url(#abc)` /
  // `mask:url("#defaced")` must not surface their fragment-id as a
  // color violation, and color literals embedded in registered
  // box-shadow values must not be flagged by the literal scanner
  // (scanShadow validates the shadow string independently). The
  // named-color pass below uses a property-anchored regex and is
  // unaffected by either strip pass.
  const cssText = extractCssRegions(html)
    .replace(CSS_URL_RE, "")
    .replace(SHADOW_DECL_STRIP_RE, "");
  for (const match of cssText.matchAll(HEX_RE)) {
    const literal = match[0].toLowerCase();
    if (!allowed.has(literal)) {
      out.push({ kind: "color", found: literal });
    }
  }
  for (const match of cssText.matchAll(RGB_RE)) {
    const literal = match[0].toLowerCase();
    if (!allowed.has(literal)) {
      out.push({ kind: "color", found: literal });
    }
  }
  for (const match of cssText.matchAll(HSL_RE)) {
    const literal = match[0].toLowerCase();
    if (!allowed.has(literal)) {
      out.push({ kind: "color", found: literal });
    }
  }
  // Named-color keyword pass. CSS allows `color: red` as a valid color
  // value, but hex/rgb/hsl literal regexes never match it. Without this
  // pass, a prototype that authored `color: red` (or `background: white`
  // via a *-color longhand) would slip past certify even though the
  // rendered token is not in DESIGN.md.
  for (const match of cssText.matchAll(COLOR_PROP_RE)) {
    const captured = match[1] ?? "";
    const value = captured.trim().toLowerCase();
    if (value.length === 0) continue;
    // Skip CSS variable references at the value level. They resolve
    // at render time and are out of scope for the regex-based scanner.
    if (value.startsWith("var(")) continue;
    // Per-token named-color check. CSS allows multi-token color
    // shorthand values on most COLOR_PROP_RE-captured properties:
    //   `border-color: red blue green red`  (4-side longhand)
    //   `border: 1px solid red`             (border shorthand)
    //   `background: red url(...) repeat`   (background shorthand)
    // Splitting on whitespace and checking each token catches every
    // off-spec named color in the shorthand. A single-token value
    // (`color: red`) is just the 1-token case of the same loop.
    //
    // Hex / rgb / hsl tokens are skipped INSIDE the per-token loop
    // (not at the value level) so a mixed shorthand like
    // `border-color: red #ff0000 blue #00ff00` still surfaces the
    // named drift on `red` / `blue` even when literal tokens are
    // present (the literal scanner above handles `#ff0000` /
    // `#00ff00` separately, so no double-count).
    //
    // Non-color shorthand tokens (`1px`, `solid`, `dashed`, `repeat`,
    // `no-repeat`, etc. — anything NOT in `CSS_NAMED_COLORS`) are
    // silently ignored by the final `CSS_NAMED_COLORS.has(token)`
    // gate. Tokens that aren't pure `[a-z]+` identifiers (e.g.
    // `1px`, `0.5em`, `50%`) are filtered out earlier so the
    // CSS_NAMED_COLORS lookup is only reached by clean keyword
    // candidates — guarding against future authoring mistakes (e.g.
    // a project that adds a numeric value where a color is expected).
    for (const token of value.split(/\s+/)) {
      if (token.length === 0) continue;
      if (SAFE_LITERALS.has(token)) continue;
      if (allowed.has(token)) continue;
      // Skip hex / rgb / hsl tokens — already counted by the literal
      // scanner above. Doing this per-token (rather than at the
      // value level) keeps named-color drift visible in mixed
      // shorthands.
      if (HEX_RE_TEST.test(token) || RGB_RE_TEST.test(token) || HSL_RE_TEST.test(token)) {
        continue;
      }
      if (token.startsWith("var(")) continue;
      if (!/^[a-z]+$/.test(token)) continue;
      if (CSS_NAMED_COLORS.has(token)) {
        out.push({ kind: "color", found: token });
      }
    }
  }
}

function scanRadius(html: string, dm: DesignMd, out: DesignMdViolation[]): void {
  const allowed = new Set<string>(Object.values(dm.visual.radius));
  for (const match of html.matchAll(RADIUS_RE)) {
    const captured = match[1] ?? "";
    const value = captured.trim();
    if (value.length === 0) continue;
    if (SAFE_LITERALS.has(value.toLowerCase())) continue;
    if (allowed.has(value)) continue;
    out.push({ kind: "radius", found: value });
  }
}

function scanShadow(html: string, dm: DesignMd, out: DesignMdViolation[]): void {
  const allowed = new Set<string>(Object.values(dm.visual.shadow));
  for (const match of html.matchAll(SHADOW_RE)) {
    const captured = match[1] ?? "";
    const value = captured.trim();
    if (value.length === 0) continue;
    if (SAFE_LITERALS.has(value.toLowerCase())) continue;
    if (allowed.has(value)) continue;
    out.push({ kind: "shadow", found: value });
  }
}

function scanFonts(html: string, dm: DesignMd, out: DesignMdViolation[]): void {
  const stacks: string[] = [
    dm.visual.typography.family_sans,
    dm.visual.typography.family_display,
    dm.visual.typography.family_mono,
  ];
  for (const match of html.matchAll(FONT_RE)) {
    const captured = match[1] ?? "";
    const trimmed = captured.trim();
    if (trimmed.length === 0) continue;
    const value = stripQuotes(trimmed);
    if (!fontMatches(value, stacks)) {
      out.push({ kind: "font", found: value });
    }
  }
}

/**
 * Scan `html` for DESIGN.md token violations. Returns a flat array of
 * violations, one per occurrence, preserving source order within each
 * scan kind. The function is pure (no I/O, no global state).
 */
export function findDesignMdViolations(html: string, dm: DesignMd): DesignMdViolation[] {
  const out: DesignMdViolation[] = [];
  if (typeof html !== "string" || html.length === 0) return out;
  scanColors(html, dm, out);
  scanFonts(html, dm, out);
  scanRadius(html, dm, out);
  scanShadow(html, dm, out);
  return out;
}

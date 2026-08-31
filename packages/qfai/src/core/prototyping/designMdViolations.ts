/**
 * Pure scanner for DESIGN.md compliance violations in iter HTML.
 *
 * Scans an HTML string for color / font / radius / shadow values and
 * compares them against the allowed token set in a DesignMd record.
 * Returns one violation per distinct `{kind, found}` pair (no
 * short-circuit): a token that drifts on every one of a thousand CSS
 * occurrences is one finding, not a thousand, so the operator sees the
 * distinct offending values. Used by the certify gate to block
 * convergence when a generated prototype drifts from the SSOT design
 * tokens.
 *
 * Input tree: both production call sites feed this scanner the CAPTURE
 * fan-out under `.qfai/evidence/prototyping/iter-NN/` — `prototypingCertify`
 * via `findIterationHtmlFiles(evidenceRoot, …)`, and
 * `prototypingIterate#recomputeFinalIterDesignMdViolations` via the same
 * evidence path. The authored tree the generator writes
 * (`.qfai/prototypes/iter-NN/index.html`) is NOT scanned today; a violation
 * that the capture step never renders is therefore not caught. The two trees
 * and their writers are documented in
 * `generator-prompt.md#output-layout--two-trees-two-shapes`; this file and
 * that prompt are an SSOT-sync pair (see `../validators/promptScannerPairs.ts`).
 *
 * The capture fan-out is not the only writer of the scanned tree:
 * `--emit-skeletons` also writes `<screenId>.html` into the SAME
 * `.qfai/evidence/prototyping/iter-00/` directory (`iterationDir(0)`), not
 * into the authored `.qfai/prototypes/` tree. A cycle-0 skeleton left in
 * place is therefore scanned here like any captured snapshot, so its
 * placeholder CSS must stay inside the DESIGN.md token set.
 *
 * Because the input is the capture fan-out, the routing shape the generator
 * declares decides which screens this scanner ever sees. Under `--auto-serve`
 * that shape is SPA-style: `defaultServerRunner.ts#resolveServablePath` serves
 * `index.html` to a document request (GET/HEAD carrying `text/html` in
 * `Accept`) that matches no file, so path routes, `history.pushState` shells
 * and parameterized contract routes render and their CSS reaches these
 * scanners. Only sub-resource requests — no `text/html` in `Accept` — still
 * 404, behind the path-traversal 403 guard. The routing-shapes list in
 * `generator-prompt.md` states the same contract for the generator; as the
 * paired halves of that SSOT, the two move together.
 *
 * Both trees are written by the CLI the prompt prescribes: the capture fan-out
 * by `npx qfai prototyping iterate --capture`, and this scanner runs under
 * `npx qfai prototyping certify`. `npx` is not cosmetic — qfai is a project
 * dependency, so a bare `qfai …` exits 127 on a normal local install and the
 * gate never runs at all. `canonicalQfaiLauncher.test.ts` enforces the launcher
 * across the shipped surface, which is what put those two commands in the
 * prompt in this form.
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
// `rgb()` / `hsl()` arguments can themselves contain a parenthesized
// CSS function — Tailwind's rendered DOM uses the opacity-variable form
// `rgb(23 56 77 / var(--tw-bg-opacity, 1))`. A `[^)]*` body cannot
// cross a `)`, so it stops one paren short and reports a `found` string
// that is unbalanced, invalid CSS, and absent from the source. The body
// therefore admits one level of nesting: either a non-paren character,
// or a complete `(...)` group. The two alternatives start with disjoint
// characters, so the engine never backtracks between them.
const RGB_RE = /rgba?\((?:[^()]|\([^()]*\))*\)/gi;
const HSL_RE = /hsla?\((?:[^()]|\([^()]*\))*\)/gi;
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
// dedicated *-color longhands AND the common shorthands
// (`background`, `border`, `border-{top,right,bottom,left}`,
// `outline`, `text-decoration`, `column-rule`) — the shorthand
// grammar lets a named color sit anywhere in the value (e.g.
// `border: 1px solid red`, `background: red url(...) repeat`,
// `text-decoration: underline red`, `column-rule: 1px solid red`),
// and the per-token loop in scanColors splits the captured value on
// whitespace to find the color token among non-color shorthand
// tokens (`1px`, `solid`, `repeat`, `underline`, etc., which are
// silently ignored because they aren't in CSS_NAMED_COLORS).
//
// `border-image` is intentionally NOT included — its color slot is
// rare in real prototypes and the value grammar is more complex
// (4-slice numeric tokens). Can revisit if real authoring patterns
// require it.
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
  "currentColor".toLowerCase(),
  "inherit",
  "initial",
  "unset",
  "revert",
  "0",
  "none",
]);

// Tailwind preflight sentinel color literals. These four values appear
// in the Tailwind CDN preflight stylesheet and on the rendered DOM of
// any faithful Tailwind iter. They are intentionally allowlisted as
// safe across `scanColors` regardless of DESIGN.md content — without
// this allowlist, an iter that simply loads the Tailwind CDN script
// produces spurious `designMdViolations[]` entries that block
// convergence at certify.
//
// Members (lowercased for case-insensitive comparison):
//   - `#fff`             — preflight `color: inherit` chain default
//   - `#9ca3af`          — placeholder-color default (gray-400)
//   - `#e5e7eb`          — border-color default (gray-200)
//   - `rgb(59 130 246 / 0.5)` — focus ring default (blue-500 / 50%)
const TAILWIND_PREFLIGHT_LITERALS: ReadonlySet<string> = new Set([
  "#fff",
  "#9ca3af",
  "#e5e7eb",
  "rgb(59 130 246 / 0.5)",
]);

// Single-shot test variants of HEX / RGB / HSL regexes — `g`-flagged
// regexes are stateful when reused with `.test()`, so dedicated
// test-only copies avoid that footgun. Co-located with HEX_RE / RGB_RE
// / HSL_RE rather than scattered after the scan helpers, so a future
// reader sees all color-literal regexes at the top of the file.
const HEX_RE_TEST = /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})\b/;
const RGB_RE_TEST = /rgba?\((?:[^()]|\([^()]*\))*\)/i;
const HSL_RE_TEST = /hsla?\((?:[^()]|\([^()]*\))*\)/i;

// CSS named-color keywords (CSS Color Module Level 4 + legacy). The set
// is closed: any keyword not here is either a non-color identifier
// (e.g. `inherit`, `var(...)`) or a typo. SAFE_LITERALS (`transparent`,
// `currentcolor`, etc.) is intentionally NOT a subset — those are
// system / inheritance keywords, not color literals, and have a
// dedicated allow path in scanColors.
const CSS_NAMED_COLORS: ReadonlySet<string> = new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
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
// Strip declaration shapes whose value's color literals must NOT
// surface as DESIGN.md drift before `scanColors` runs:
//
//   - `box-shadow: …`         (legacy CSS shadow declaration)
//   - `--*-shadow*: …`        (Tailwind / custom-token shadow custom
//                              properties, e.g. `--shadow-sm`,
//                              `--card-shadow`, `--btn-shadow-hover`,
//                              `--ring-shadow-1`)
//   - `--tw-*: …`             (Tailwind internal custom-property
//                              family, e.g. `--tw-shadow-color`,
//                              `--tw-ring-color`; preflight emits
//                              these regardless of DESIGN.md content)
//
// scanShadow validates registered `box-shadow` values independently
// against `dm.visual.shadow`, so legitimate shadow drift still
// surfaces through that channel.
// `\b` anchors `box-shadow`; the two custom-property branches lead
// with `--`, which is `\W\W` so the `\b` would not fire there. The
// alternation pattern explicitly groups: `\bbox-shadow` (word-boundary
// before letter) OR `--tw-…` (literal `--` start) OR `--…shadow…`
// (literal `--` start). All three carry the `:` value-prefix sentinel.
const SHADOW_DECL_STRIP_RE = /(?:\bbox-shadow|--tw-[\w-]+|--[\w-]*shadow[\w-]*)\s*:[^;}<>"']+/gi;

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

// Narrow `html` to the `<body>...</body>` region when present, so
// inline `style="..."` attributes only see CSS that participates in
// the rendered DOM surface. `<style>` blocks (both in `<head>` and
// `<body>`) are collected separately and filtered against Tailwind
// preflight signatures so the operator's own stylesheet authored in
// `<head><style>` is still scanned for non-DESIGN.md color literals
// (previously the entire `<head>` region was skipped, allowing color
// drift in head stylesheets to bypass `designMdViolations`).
//
// When no `<body>` element is present (e.g. a fragment under test),
// fall back to scanning the full input so the legacy regression
// surface (inline-style fragments without an outer body) keeps
// behaving as before.
const BODY_BLOCK_RE = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i;

function narrowToBody(html: string): string {
  const m = BODY_BLOCK_RE.exec(html);
  if (!m) return html;
  return m[1] ?? "";
}

// Tailwind preflight `<style>` block signature heuristics. A faithful
// Tailwind CDN preflight stylesheet always carries one of two strong
// markers — the banner comment or the universal-reset selector — so a
// `<style>` block matching either is classified as preflight and
// excluded from drift scanning. An operator-authored stylesheet (even
// when placed in `<head>`) will not carry these markers and remains
// in scope.
//
// Primary signatures (either alone is sufficient):
//   - `/* tailwindcss v` or `/*! tailwindcss v` — Tailwind banner
//     comment (CDN + standalone CLI both emit this).
//   - `*, ::before, ::after` followed by `box-sizing` — the
//     preflight universal-reset selector (signature unique to the
//     preflight block).
//
// `--tw-` (Tailwind internal custom-property prefix) is intentionally
// NOT a primary signature anymore. An operator who copy-pastes a
// single `--tw-ring-offset-width: 0px;` declaration into a head
// stylesheet would otherwise mask color literals in the same block.
// The `--tw-*: ...` declaration family is still stripped from the
// scan surface by `SHADOW_DECL_STRIP_RE` so legitimate
// Tailwind runtime values still don't surface as DESIGN.md drift —
// the loss of `--tw-` as a block-level classifier is therefore
// recovered at the declaration-level strip pass. See PR #210
// wave-14 architecture-reviewer thread for the false-negative
// rationale (`--tw-` block-level alone is too broad).
const TAILWIND_BANNER_RE = /\/\*!?\s*tailwindcss\s+v/i;
const TAILWIND_UNIVERSAL_RESET_RE = /\*,\s*::before,\s*::after\s*\{[^}]*box-sizing/i;

function isTailwindPreflightBlock(css: string): boolean {
  return TAILWIND_BANNER_RE.test(css) || TAILWIND_UNIVERSAL_RESET_RE.test(css);
}

function extractCssRegions(html: string): string {
  const parts: string[] = [];
  // Collect ALL `<style>` blocks (head + body) and filter out only
  // Tailwind preflight signatures. Operator-authored stylesheets in
  // `<head>` are kept in scope so color literals there surface as
  // DESIGN.md drift instead of being silently allowed.
  for (const match of html.matchAll(STYLE_BLOCK_RE)) {
    const block = match[1];
    if (!block) continue;
    if (isTailwindPreflightBlock(block)) continue;
    parts.push(block);
  }
  // Inline `style="..."` attributes are body-scoped: a head-only
  // inline-style attr is structurally not on the rendered DOM. Mirror
  // the previous behaviour for inline-style scanning.
  const scopedBody = narrowToBody(html);
  for (const match of scopedBody.matchAll(INLINE_STYLE_RE)) {
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
  const cssText = extractCssRegions(html).replace(CSS_URL_RE, "").replace(SHADOW_DECL_STRIP_RE, "");
  for (const match of cssText.matchAll(HEX_RE)) {
    const literal = match[0].toLowerCase();
    if (TAILWIND_PREFLIGHT_LITERALS.has(literal)) continue;
    if (!allowed.has(literal)) {
      out.push({ kind: "color", found: literal });
    }
  }
  for (const match of cssText.matchAll(RGB_RE)) {
    const literal = match[0].toLowerCase();
    if (TAILWIND_PREFLIGHT_LITERALS.has(literal)) continue;
    if (!allowed.has(literal)) {
      out.push({ kind: "color", found: literal });
    }
  }
  for (const match of cssText.matchAll(HSL_RE)) {
    const literal = match[0].toLowerCase();
    if (TAILWIND_PREFLIGHT_LITERALS.has(literal)) continue;
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
    //
    // Tokenize on CSS-meaningful delimiters, not whitespace alone.
    // Pre-fix only `\s+` was used, so `linear-gradient(red, blue)`
    // tokenized as `["linear-gradient(red,", "blue)"]` and
    // `color:red!important` as `["color:red!important"]`. Neither
    // pure-letter token survives `^[a-z]+$`, so the named drift
    // slipped past the scanner. Splitting on the broader
    // CSS-grammar set `[\s,()!;]+` extracts each identifier even
    // inside CSS functions / `!important` markers / nested commas.
    // codex 9R4j.
    for (const token of value.split(/[\s,()!;]+/)) {
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
      // The `linear-gradient` / `radial-gradient` / `conic-gradient`
      // function names are themselves CSS keywords (post-tokenization
      // they appear as e.g. `linear-gradient`); pure-letter check
      // (`/^[a-z]+$/`) already filters them because they contain
      // `-`. Defensive: a future schema relaxation that admitted
      // hyphens here would still be guarded by the closed
      // CSS_NAMED_COLORS lookup.
      if (!/^[a-z]+$/.test(token)) continue;
      if (CSS_NAMED_COLORS.has(token)) {
        out.push({ kind: "color", found: token });
      }
    }
  }
}

/**
 * Resolve a CSS value's `var(--token[, fallback])` reference against
 * a previously-parsed `:root { --token: value; }` declaration map.
 *
 * Behaviour:
 *   - `var(--name)` with `--name` in `rootDeclarations` → return the
 *     declared value.
 *   - `var(--name, fallback)` with `--name` not in the map → return
 *     the fallback (trimmed).
 *   - `var(--name)` with no match and no fallback → return the input
 *     verbatim (no resolution possible; downstream judgment remains
 *     unchanged).
 *   - Non-`var(...)` input → returned verbatim.
 *
 * Pure function: zero I/O, single-pass regex, no recursion (nested
 * `var()` is out of scope and resolves to the input verbatim).
 */
export function unwrapVarReference(
  value: string,
  rootDeclarations: ReadonlyMap<string, string>,
): string {
  const trimmed = value.trim();
  const m = /^var\(\s*(--[^,)\s]+)\s*(?:,\s*([^)]+))?\)$/.exec(trimmed);
  if (!m) return value;
  const tokenName = (m[1] ?? "").trim();
  const fallback = m[2]?.trim();
  const resolved = rootDeclarations.get(tokenName);
  if (resolved !== undefined) return resolved;
  if (fallback !== undefined && fallback.length > 0) return fallback;
  return value;
}

// Parse `:root { --token: value; ... }` blocks from CSS text into a
// flat `Map<string, string>` keyed by token name (including the
// leading `--`). Multiple `:root` blocks are merged in source order
// — the last declaration wins (matches CSS cascade behaviour).
//
// Scope is intentionally narrow: only `:root` blocks are mined.
// `html:root`, `[data-theme="dark"]:root`, and class-scoped tokens
// require selector resolution at render time and are out of scope
// for the regex-based scanner. The common case (a single `:root`
// block in `<head>` or near the top of `<style>`) is fully covered.
const ROOT_BLOCK_RE = /:root\s*\{([^}]*)\}/gi;
const DECL_RE = /(--[\w-]+)\s*:\s*([^;]+)/g;

function parseRootDeclarations(cssText: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const block of cssText.matchAll(ROOT_BLOCK_RE)) {
    const body = block[1] ?? "";
    for (const decl of body.matchAll(DECL_RE)) {
      const name = (decl[1] ?? "").trim();
      const value = (decl[2] ?? "").trim();
      if (name.length === 0 || value.length === 0) continue;
      out.set(name, value);
    }
  }
  return out;
}

// Collect ALL `<style>` block + inline-style content across the
// document, NOT just the body-scoped slice. `:root` declarations
// commonly live in `<head><style>`; the unwrap map must see them so
// `font-family: var(--font-sans)` resolves correctly when the body
// references a head-defined token. This is intentionally asymmetric
// from `extractCssRegions` (body-scoped, drives violation surface):
// declarations are trusted *inputs* to the unwrap step, not part of
// the scan surface where drift can land.
function allCssRegions(html: string): string {
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

// Normalize a CSS dimension-bearing value so the *rendered* form and
// the *authored* DESIGN.md token compare equal. A browser re-serializes
// what it parsed: `0.375rem` is minified to `.375rem`, inter-token
// whitespace is collapsed, and unit casing is normalized. Comparing raw
// strings therefore reports drift for values that are byte-identical
// once normalized — a `DESIGN.md` declaring `radius.md: "0.375rem"`
// surfaces as `kind=radius found=".375rem"`. Applied to BOTH sides of
// the comparison, so the canonical form chosen here is arbitrary as
// long as it is stable.
//
//   `0.375rem`    -> `.375rem`   (redundant leading zero dropped)
//   `0 0  12px`   -> `0 0 12px`  (whitespace collapsed)
//   `12PX`        -> `12px`      (case-folded)
//   `10.5rem`     -> `10.5rem`   (significant leading digits kept)
function normalizeDimensionValue(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      // Only a zero that is redundant is dropped: the number must start
      // at a value boundary (string start, whitespace, `,`, `(`, `/`, or
      // a leading `-`), so `10.5rem` and `1.5rem` are untouched.
      .replace(/(^|[\s,(/-])0+\.(\d)/g, "$1.$2")
  );
}

function scanRadius(html: string, dm: DesignMd, out: DesignMdViolation[]): void {
  const allowed = new Set<string>(
    Object.values(dm.visual.radius).map((token) => normalizeDimensionValue(token)),
  );
  const rootDecls = parseRootDeclarations(allCssRegions(html));
  for (const match of html.matchAll(RADIUS_RE)) {
    const captured = match[1] ?? "";
    const raw = captured.trim();
    if (raw.length === 0) continue;
    const value = unwrapVarReference(raw, rootDecls).trim();
    if (value.length === 0) continue;
    if (SAFE_LITERALS.has(value.toLowerCase())) continue;
    // Compare normalized, report raw: the operator needs to see the
    // string that is actually in the document.
    if (allowed.has(normalizeDimensionValue(value))) continue;
    out.push({ kind: "radius", found: value });
  }
}

function scanShadow(html: string, dm: DesignMd, out: DesignMdViolation[]): void {
  const allowed = new Set<string>(Object.values(dm.visual.shadow));
  const rootDecls = parseRootDeclarations(allCssRegions(html));
  for (const match of html.matchAll(SHADOW_RE)) {
    const captured = match[1] ?? "";
    const raw = captured.trim();
    if (raw.length === 0) continue;
    const value = unwrapVarReference(raw, rootDecls).trim();
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
  const rootDecls = parseRootDeclarations(allCssRegions(html));
  for (const match of html.matchAll(FONT_RE)) {
    const captured = match[1] ?? "";
    const trimmed = captured.trim();
    if (trimmed.length === 0) continue;
    const resolved = unwrapVarReference(trimmed, rootDecls).trim();
    // CSS-wide keywords (`inherit`, `initial`, `unset`, `revert`,
    // `currentColor`) are SAFE_LITERALS — never a font-family
    // candidate to compare against DESIGN.md stacks. Without this
    // gate, `font-family: inherit` surfaces as drift.
    if (SAFE_LITERALS.has(resolved.toLowerCase())) continue;
    const value = stripQuotes(resolved);
    if (!fontMatches(value, stacks)) {
      out.push({ kind: "font", found: value });
    }
  }
}

// Tailwind arbitrary-value class extractor. Tailwind utilities of the
// form `<prefix>-[<value>]` (e.g. `bg-[#ff0000]`, `rounded-[13px]`,
// `shadow-[0_4px_6px_rgba(0,0,0,0.1)]`) embed arbitrary CSS values
// directly in the `class="..."` attribute. The CSS-region pass below
// only sees `<style>` blocks and inline `style="..."` declarations,
// so without a class-attribute pass these arbitrary values would
// slip past the certify gate even though they drift from DESIGN.md.
//
// The shipped generator prompt mandates Tailwind utilities and
// forbids raw `#hex` outside DESIGN.md; this scanner is the runtime
// guard that enforces that contract on the rendered HTML.
//
// Tailwind encodes whitespace in arbitrary values as `_` (e.g.
// `shadow-[0_4px_6px_rgba(0,0,0,0.1)]`), so the scanner decodes
// underscores back to spaces before token lookup.
const CLASS_ATTR_RE = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const TAILWIND_ARBITRARY_RE = /\b([a-z][a-z-]*)-\[([^\]]+)\]/gi;

const TAILWIND_COLOR_PREFIXES: ReadonlySet<string> = new Set([
  "bg",
  "text",
  "border",
  "border-t",
  "border-r",
  "border-b",
  "border-l",
  "border-x",
  "border-y",
  "border-s",
  "border-e",
  "from",
  "to",
  "via",
  "outline",
  "ring",
  "ring-offset",
  "divide",
  "divide-x",
  "divide-y",
  "placeholder",
  "accent",
  "caret",
  "decoration",
  "fill",
  "stroke",
]);

const TAILWIND_RADIUS_PREFIXES: ReadonlySet<string> = new Set([
  "rounded",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
  "rounded-tl",
  "rounded-tr",
  "rounded-bl",
  "rounded-br",
  "rounded-s",
  "rounded-e",
  "rounded-ss",
  "rounded-se",
  "rounded-es",
  "rounded-ee",
]);

const TAILWIND_SHADOW_PREFIXES: ReadonlySet<string> = new Set(["shadow", "drop-shadow"]);

const TAILWIND_FONT_PREFIXES: ReadonlySet<string> = new Set(["font"]);

// Tailwind `font-[N]` is overloaded for font-family vs font-weight.
// Numeric (100..900 in Tailwind's stepped form) and the named-weight
// keywords below are weight tokens — NOT font-family drift. Anything
// else routed through `font-[X]` is treated as a font-family
// candidate and compared against DESIGN.md's family stacks. codex 9Ify.
const TAILWIND_FONT_WEIGHT_KEYWORDS: ReadonlySet<string> = new Set([
  "thin",
  "extralight",
  "light",
  "normal",
  "medium",
  "semibold",
  "bold",
  "extrabold",
  "black",
]);

function isFontWeightArbitrary(value: string): boolean {
  if (/^\d+$/.test(value)) return true;
  return TAILWIND_FONT_WEIGHT_KEYWORDS.has(value.toLowerCase());
}

// Tailwind palette names from the default theme. Any class shaped
// `<prefix>-<palette>-<scale>` (e.g. `bg-blue-500`, `text-slate-900`)
// resolves to a Tailwind built-in color, NOT a DESIGN.md token. Since
// the shipped prototype generator uses the Tailwind CDN (no theme
// override possible), every palette+scale class on the rendered DOM
// is by definition drift from DESIGN.md. codex AHzR7.
const TAILWIND_PALETTE_NAMES: ReadonlySet<string> = new Set([
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
]);

const TAILWIND_PALETTE_SCALES: ReadonlySet<string> = new Set([
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
]);

// Tailwind built-in scale aliases for radius / shadow utilities.
//
// An alias in this set resolves to Tailwind's own scale (e.g.
// `rounded-xl`, `shadow-inner`) UNLESS `DESIGN.md` declares a
// `visual.radius` / `visual.shadow` key of the same name. The mandated
// envelope in `generator-prompt.md` injects those keys into
// `tailwind.config.theme.extend.{borderRadius,boxShadow}`, and
// `theme.extend` overrides the built-in entry of the same name — so
// once the envelope has run, `rounded-md` cannot resolve to anything
// other than the DESIGN.md token. `scanTailwindUtility` therefore
// consults `dm` before flagging; this set is the candidate surface,
// not the verdict.
//
// The distinction matters because the DESIGN.md schema fixes the legal
// key names (`RADIUS_KEYS = sm|md|lg|full`, `SHADOW_KEYS = sm|md|lg`),
// which are a strict subset of this list. Flagging the set
// unconditionally left no Tailwind utility class able to reference a
// DESIGN.md radius or shadow token at all.
//
// Bare `rounded` / `shadow` (no suffix) resolve to Tailwind's `DEFAULT`
// theme key, which the DESIGN.md schema cannot declare, so they remain
// unconditional drift and are matched separately below. codex AHzR7.
const TAILWIND_RADIUS_SCALE_ALIASES: ReadonlySet<string> = new Set([
  "none",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "full",
]);

const TAILWIND_SHADOW_SCALE_ALIASES: ReadonlySet<string> = new Set([
  "none",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "inner",
]);

// Strip Tailwind state / responsive / dark-mode prefixes (e.g.
// `hover:`, `md:`, `dark:`, `group-hover:`) before matching the
// underlying utility. Tailwind allows multiple stacked prefixes
// (`md:hover:bg-blue-500`); the `+` quantifier strips them all.
const TAILWIND_STATE_PREFIX_RE = /^(?:[a-z0-9-]+:)+/;

function pushIfColorDrift(
  token: string,
  allowed: ReadonlySet<string>,
  out: DesignMdViolation[],
): boolean {
  const lower = token.toLowerCase();
  if (SAFE_LITERALS.has(lower)) return false;
  if (allowed.has(lower)) return false;
  if (HEX_RE_TEST.test(token) || RGB_RE_TEST.test(token) || HSL_RE_TEST.test(token)) {
    out.push({ kind: "color", found: lower });
    return true;
  }
  if (/^[a-z]+$/.test(lower) && CSS_NAMED_COLORS.has(lower)) {
    out.push({ kind: "color", found: lower });
    return true;
  }
  return false;
}

function scanTailwindArbitraryColor(
  value: string,
  allowed: ReadonlySet<string>,
  out: DesignMdViolation[],
): void {
  const before = out.length;
  // Per-token pass: multi-token shorthand values like
  // `border-[2px_solid_#ff0000]` decode to `border-[2px solid #ff0000]`;
  // split on whitespace and check each token individually so the
  // color drift on `#ff0000` surfaces *as `#ff0000`*. For `text-`,
  // the bracket content can be either a color (`text-[#ff0000]`) or
  // a non-color size (`text-[14px]`); the per-token regex test only
  // fires on tokens shaped like a color literal, so a pure dimension
  // value is silently skipped (correct for our scope).
  for (const token of value.split(/\s+/)) {
    if (token.length === 0) continue;
    pushIfColorDrift(token, allowed, out);
  }
  // Whole-value rgb()/hsl() matchAll fallback: catches CSS Color
  // Module L4 space-separated function syntax —
  // `rgb(255 0 0)` / `hsl(0 100% 50%)`, authored by Tailwind as
  // `bg-[rgb(255_0_0)]` / `bg-[hsl(0_100%_50%)]` and decoded to
  // space-separated form before this scanner runs. The
  // whitespace-split above shreds those into half-paren tokens
  // (`rgb(255`, `0`, `0)`) that no color regex matches.
  //
  // Run unconditionally (not as a "no per-token match" fallback)
  // so mixed-syntax shorthands like `border-[#ff0000_rgb(0_0_0)]`
  // (decoded: `#ff0000 rgb(0 0 0)`) flag BOTH `#ff0000` (per-token)
  // AND `rgb(0 0 0)` (matchAll) instead of dropping the L4 syntax
  // when per-token already pushed something. codex 9vcu.
  //
  // RGB_RE / HSL_RE are global-flagged by design (used by the CSS
  // region scanner). Reusing them here keeps the L4 detection
  // pattern in one place; resetting `lastIndex` is unnecessary
  // because `String.matchAll` ignores it.
  for (const match of value.matchAll(RGB_RE)) {
    pushIfColorDrift(match[0], allowed, out);
  }
  for (const match of value.matchAll(HSL_RE)) {
    pushIfColorDrift(match[0], allowed, out);
  }
  // Dedupe contributions within this single arbitrary-class scope
  // so a `rgb(...)` token that the per-token loop matched on a
  // comma-separated literal (e.g. `border-[2px_solid_rgb(0,0,0)]`)
  // doesn't surface twice when the matchAll pass also catches it.
  // Scope is local — `out` entries pushed by earlier scanners /
  // earlier classes in this HTML are preserved untouched.
  if (out.length > before + 1) {
    const seen = new Set<string>();
    let writeIdx = before;
    for (let i = before; i < out.length; i++) {
      const v = out[i];
      if (v === undefined) continue;
      const key = `${v.kind}:${v.found}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out[writeIdx++] = v;
    }
    out.length = writeIdx;
  }
}

// Known limitation (deliberate KISS choice; matches the pre-existing
// posture of STYLE_BLOCK_RE in `extractCssRegions`): `<pre>` /
// `<code>` blocks in tutorial / docs prototypes that author literal
// HTML samples (e.g. `<div class="bg-[#abcdef]">`) surface their
// classes here as real class attrs and produce DESIGN.md-drift
// findings. The cost is a precise false positive only, never a
// missed violation — and the runtime certify gate's contract is
// "tokens that the rendered DOM uses must come from DESIGN.md", so
// the tutorial-content edge case is rare in practice. Swap in a
// parse5-class HTML parser if it becomes load-bearing. codex 9If2.
function scanTailwindArbitrary(html: string, dm: DesignMd, out: DesignMdViolation[]): void {
  const allowedColors = collectAllowedColors(dm);
  const allowedRadii = new Set<string>(Object.values(dm.visual.radius));
  const allowedShadows = new Set<string>(Object.values(dm.visual.shadow));
  const fontStacks: string[] = [
    dm.visual.typography.family_sans,
    dm.visual.typography.family_display,
    dm.visual.typography.family_mono,
  ];

  for (const classMatch of html.matchAll(CLASS_ATTR_RE)) {
    const classes = classMatch[1] ?? classMatch[2] ?? "";
    if (classes.length === 0) continue;
    for (const tokenMatch of classes.matchAll(TAILWIND_ARBITRARY_RE)) {
      const prefix = (tokenMatch[1] ?? "").toLowerCase();
      const rawValue = tokenMatch[2] ?? "";
      // Decode the underscore-as-space convention. Tailwind authors
      // `shadow-[0_4px_6px_rgba(0,0,0,0.1)]`; the rendered shadow value
      // is `0 4px 6px rgba(0,0,0,0.1)`, which is what DESIGN.md tokens
      // are compared against.
      const value = rawValue.replace(/_/g, " ").trim();
      if (value.length === 0) continue;

      if (TAILWIND_COLOR_PREFIXES.has(prefix)) {
        scanTailwindArbitraryColor(value, allowedColors, out);
        continue;
      }
      if (TAILWIND_RADIUS_PREFIXES.has(prefix)) {
        if (SAFE_LITERALS.has(value.toLowerCase())) continue;
        if (allowedRadii.has(value)) continue;
        out.push({ kind: "radius", found: value });
        continue;
      }
      if (TAILWIND_SHADOW_PREFIXES.has(prefix)) {
        if (SAFE_LITERALS.has(value.toLowerCase())) continue;
        if (allowedShadows.has(value)) continue;
        out.push({ kind: "shadow", found: value });
        continue;
      }
      if (TAILWIND_FONT_PREFIXES.has(prefix)) {
        // Tailwind overloads `font-[X]` for both font-family
        // (`font-[Inter]`) and font-weight (`font-[600]`).
        // Disambiguate by value shape: numeric (100..900 stepped) or
        // a known font-weight keyword → weight (silently skipped — out
        // of scope); anything else is treated as a font-family
        // candidate and compared against DESIGN.md's family stacks.
        // codex 9Ify.
        if (isFontWeightArbitrary(value)) continue;
        if (SAFE_LITERALS.has(value.toLowerCase())) continue;
        const stripped = stripQuotes(value).trim();
        if (stripped.length === 0) continue;
        if (!fontMatches(stripped, fontStacks)) {
          out.push({ kind: "font", found: stripped });
        }
        continue;
      }
    }
  }
}

// Tailwind built-in palette/scale utility classes (`bg-blue-500`,
// `text-slate-900`, `rounded-xl`, `shadow-lg`, bare `rounded`, bare
// `shadow`) carry no CSS literal in the rendered HTML, so the four
// CSS-region scanners and the arbitrary-value scanner all miss them.
// They resolve to Tailwind's default theme, NOT to DESIGN.md tokens —
// the shipped prototype generator uses the CDN with no theme
// override, so every such class is by definition drift from
// DESIGN.md. This scanner closes that gap. codex AHzR7.
//
// Scope is intentionally narrow:
//   - color palette+scale: `<prefix>-<palette>-<scale>` (e.g.
//     `bg-blue-500`) where prefix is in TAILWIND_COLOR_PREFIXES,
//     palette is in TAILWIND_PALETTE_NAMES, scale is in
//     TAILWIND_PALETTE_SCALES. Catches the explicit Tailwind palette;
//     NOT meant to catch every theme-default keyword class
//     (`bg-white`, `bg-current`) — those are covered indirectly by
//     the named-color scanner once they hit the rendered CSS.
//   - radius / shadow scale alias: `<prefix>-<alias>` (e.g.
//     `rounded-xl`, `shadow-lg`) where prefix is in
//     TAILWIND_RADIUS_PREFIXES / TAILWIND_SHADOW_PREFIXES and the
//     alias is in TAILWIND_RADIUS_SCALE_ALIASES /
//     TAILWIND_SHADOW_SCALE_ALIASES.
//   - bare `rounded` / `shadow` (no suffix): Tailwind defaults the
//     value, so the rendered DOM diverges from DESIGN.md too.
//
// Arbitrary-value classes (`bg-[#ff0000]`, `rounded-[13px]`) keep
// going through scanTailwindArbitrary — they DO contain a literal
// and the existing scanner already validates them against
// DESIGN.md. Skipping `[`-bearing tokens here avoids double-flagging.
//
// State / responsive prefixes (`hover:`, `md:`, `dark:`,
// `group-hover:`) are stripped before the utility lookup so
// `hover:bg-blue-500` is detected.

/**
 * Read one `tailwind.config.theme.extend.<section>` map out of the html
 * envelope, as `alias -> literal value`.
 *
 * Only the LAST assignment of the section is read. A later script that
 * re-assigns `tailwind.config` replaces the section wholesale, so a key
 * present in an earlier block but absent from the last one is no longer
 * bound at render time; merging the blocks would credit the iter with a
 * binding the browser never applies. A section the html never assigns
 * yields an empty map, which is the conservative answer: no alias is
 * treated as re-bound and the pre-existing "Tailwind default" verdict
 * stands.
 *
 * Deliberately a text scan, not an evaluator: the envelope is inert
 * markup at this point and must never be executed to be validated.
 * Anything the scan cannot read (computed keys, spread syntax, a value
 * built at runtime) simply does not register as a re-binding, which
 * fails toward flagging rather than toward silent approval.
 */
function readThemeExtendMap(html: string, section: string): Map<string, string> {
  const out = new Map<string, string>();
  // Scope to the `tailwind.config` assignment first. `borderRadius` and
  // `boxShadow` are ordinary identifiers, so an unrelated object elsewhere in
  // the document (an app-level settings literal, an inline data blob) would
  // otherwise register as a re-binding and grant `rounded-md` / `shadow-lg` an
  // allowance while the browser still renders Tailwind's defaults — a silent
  // approval of exactly the drift this scanner exists to catch.
  const config = readTailwindConfigBlock(html);
  if (config === null) return out;
  const sectionRe = new RegExp(`\\b${section}\\s*:\\s*\\{`, "g");
  let lastBlock: string | null = null;
  for (const match of config.matchAll(sectionRe)) {
    const openIndex = match.index + match[0].length - 1;
    const block = extractBraceBlock(config, openIndex);
    if (block !== null) lastBlock = block;
  }
  if (lastBlock === null) return out;
  for (const entry of lastBlock.matchAll(THEME_ENTRY_RE)) {
    const key = entry[1] ?? entry[2] ?? entry[3];
    const value = entry[4] ?? entry[5];
    if (key !== undefined && value !== undefined) {
      out.set(key.toLowerCase(), value.trim());
    }
  }
  return out;
}

// `"md": "0.5rem"`, `'md': '0.5rem'`, `md: "0.5rem"`. Only string
// values are read — a nested object or an identifier reference is not a
// literal re-binding this scanner can vouch for.
//
// The unquoted-key alternative is a JavaScript identifier, so it excludes `-`:
// `foo-bar: "…"` does not parse as an object literal, and the browser would
// never apply it, so treating it as a re-binding would grant an allowance the
// render never honours. A key that needs a hyphen has to be quoted, which the
// first two alternatives already cover.
//
// Excluding `-` from the identifier is not enough on its own: without the
// lookbehind the scan would simply start one character later and read
// `rounded-md: "0.5rem"` as a binding of `md`, reinstating the allowance
// through the very syntax being rejected. The guard anchors the identifier to
// a real token start.
const THEME_ENTRY_RE =
  /(?:"([^"]+)"|'([^']+)'|(?<![-\w$])([A-Za-z_$][\w$]*))\s*:\s*(?:"([^"]*)"|'([^']*)')/g;

// `tailwind.config = {` — the assignment the mandated envelope performs.
const TAILWIND_CONFIG_ASSIGN_RE = /\btailwind\s*\.\s*config\s*=\s*\{/g;

/**
 * Body of the LAST `tailwind.config = {...}` assignment, or null when the
 * document makes none. Last wins for the same reason `readThemeExtendMap`
 * takes the last section block: a later assignment replaces the earlier one at
 * render time.
 */
function readTailwindConfigBlock(html: string): string | null {
  let lastBlock: string | null = null;
  for (const match of html.matchAll(TAILWIND_CONFIG_ASSIGN_RE)) {
    const openIndex = match.index + match[0].length - 1;
    const block = extractBraceBlock(html, openIndex);
    if (block !== null) lastBlock = block;
  }
  return lastBlock;
}

/** Body of the `{...}` starting at `openIndex`, or null when unbalanced. */
function extractBraceBlock(text: string, openIndex: number): string | null {
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex + 1, i);
    }
  }
  return null;
}

/**
 * Alias names the html re-binds to the DESIGN.md token of the same
 * name. Value equality is required, not just key presence: an envelope
 * that maps `md` to something other than `visual.radius.md` renders a
 * value DESIGN.md never declared, which is exactly the drift this
 * scanner exists to catch.
 */
function reboundAliasNames(
  tokens: Record<string, string>,
  rebinds: Map<string, string>,
): ReadonlySet<string> {
  const allowed = new Set<string>();
  for (const [key, value] of Object.entries(tokens)) {
    const lowerKey = key.toLowerCase();
    if (rebinds.get(lowerKey) === value) {
      allowed.add(lowerKey);
    }
  }
  return allowed;
}

function scanTailwindUtility(html: string, dm: DesignMd, out: DesignMdViolation[]): void {
  // The contract is name-anchored: drift is the class shape, not the
  // value it happens to render to. But the name space is shared. The
  // mandated `tailwind.config.theme.extend.{borderRadius,boxShadow}`
  // injection re-binds exactly the alias names DESIGN.md declares, so
  // for radius / shadow the class identifier DOES reference a
  // DESIGN.md token whenever the alias has actually been re-bound.
  //
  // "Actually" is the operative word: DESIGN.md declaring a key `md`
  // says nothing about what THIS html does. An iter whose envelope is
  // missing, whose `borderRadius` map omits `md`, or which re-binds
  // `md` to some other value renders Tailwind's default for
  // `rounded-md` — a non-compliant prototype that certify would pass
  // if the allowance were granted on the DESIGN.md key alone
  // (`prototypingCertify` feeds each html straight to
  // `findDesignMdViolations` and does not separately verify the
  // envelope). So the allowance is granted per class name only when
  // this html re-binds that name to that DESIGN.md token value.
  //
  // Color utilities are NOT treated this way: `bg-blue-500` names a
  // Tailwind palette entry, and `theme.extend.colors` adds names
  // rather than re-binding the built-in palette scale, so a
  // `<palette>-<scale>` class is drift regardless of DESIGN.md.
  const radiusKeys = reboundAliasNames(dm.visual.radius, readThemeExtendMap(html, "borderRadius"));
  const shadowKeys = reboundAliasNames(dm.visual.shadow, readThemeExtendMap(html, "boxShadow"));

  for (const classMatch of html.matchAll(CLASS_ATTR_RE)) {
    const classes = classMatch[1] ?? classMatch[2] ?? "";
    if (classes.length === 0) continue;
    for (const rawToken of classes.split(/\s+/)) {
      if (rawToken.length === 0) continue;
      // Arbitrary-value classes have a literal payload and are the
      // domain of scanTailwindArbitrary; skip them here.
      if (rawToken.includes("[")) continue;
      const cls = rawToken.replace(TAILWIND_STATE_PREFIX_RE, "");
      if (cls.length === 0) continue;

      // Bare `rounded` / `shadow` (no suffix) → Tailwind defaults.
      if (TAILWIND_RADIUS_PREFIXES.has(cls)) {
        out.push({ kind: "radius", found: cls });
        continue;
      }
      if (TAILWIND_SHADOW_PREFIXES.has(cls)) {
        out.push({ kind: "shadow", found: cls });
        continue;
      }

      // Color palette+scale: `<prefix>-<palette>-<scale>`.
      const palette = /^([a-z][a-z-]*)-([a-z]+)-(\d{2,3})$/.exec(cls);
      if (palette) {
        const prefix = palette[1] ?? "";
        const name = palette[2] ?? "";
        const scale = palette[3] ?? "";
        if (
          TAILWIND_COLOR_PREFIXES.has(prefix) &&
          TAILWIND_PALETTE_NAMES.has(name) &&
          TAILWIND_PALETTE_SCALES.has(scale)
        ) {
          out.push({ kind: "color", found: cls });
          continue;
        }
      }

      // Radius / shadow scale alias: `<prefix>-<alias>`. Naming a
      // DESIGN.md key is necessary but not sufficient: `radiusKeys` /
      // `shadowKeys` hold only the aliases THIS document's
      // `tailwind.config` re-binds AND binds to the matching DESIGN.md
      // value. An alias with no key at all (`rounded-xl`,
      // `shadow-inner`, …), one the envelope omits, and one the envelope
      // binds to some other value are all drift.
      const aliasMatch = /^([a-z][a-z-]*)-([a-z0-9]+)$/.exec(cls);
      if (aliasMatch) {
        const prefix = aliasMatch[1] ?? "";
        const suffix = aliasMatch[2] ?? "";
        if (TAILWIND_RADIUS_PREFIXES.has(prefix) && TAILWIND_RADIUS_SCALE_ALIASES.has(suffix)) {
          if (radiusKeys.has(suffix)) continue;
          out.push({ kind: "radius", found: cls });
          continue;
        }
        if (TAILWIND_SHADOW_PREFIXES.has(prefix) && TAILWIND_SHADOW_SCALE_ALIASES.has(suffix)) {
          // `drop-shadow-*` resolves through `theme.dropShadow`, which
          // the mandated envelope does not inject, so it stays drift
          // even when the alias matches a `visual.shadow` key.
          if (prefix === "shadow" && shadowKeys.has(suffix)) continue;
          out.push({ kind: "shadow", found: cls });
          continue;
        }
      }
    }
  }
}

// Collapse repeats of the same `{kind, found}` pair, keeping the first
// occurrence. What that preserves is the order of the array this module
// built — scanner by scanner, and within a scanner the order its regex
// walked the document — not the order the values appear in the HTML, since
// the scanners each sweep the whole document in turn. Every downstream reader
// (`certify`'s exit-2 gate, `isConverged`, the reviewer-facing
// `designMdViolations[]` array) treats the list as a set of distinct
// offending values; before de-duplication a handful of drifting tokens
// rendered across N screens produced hundreds of identical entries,
// burying the actual finding count.
function dedupeViolations(violations: readonly DesignMdViolation[]): DesignMdViolation[] {
  const seen = new Set<string>();
  const out: DesignMdViolation[] = [];
  for (const violation of violations) {
    // `kind` is a closed enum with no whitespace in any member, so the
    // first space is an unambiguous field separator even though `found`
    // (a CSS value) may itself contain spaces.
    const key = `${violation.kind} ${violation.found}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(violation);
  }
  return out;
}

/**
 * Scan `html` for DESIGN.md token violations. Returns a flat array of
 * violations, one per distinct `{kind, found}` pair, preserving source
 * order within each scan kind. The function is pure (no I/O, no global
 * state).
 */
export function findDesignMdViolations(html: string, dm: DesignMd): DesignMdViolation[] {
  const out: DesignMdViolation[] = [];
  if (typeof html !== "string" || html.length === 0) return out;
  scanColors(html, dm, out);
  scanFonts(html, dm, out);
  scanRadius(html, dm, out);
  scanShadow(html, dm, out);
  // Tailwind arbitrary-value classes appear in `class="..."` attrs,
  // outside the CSS regions covered by the four scanners above. The
  // certify gate must catch drift authored as e.g. `bg-[#ff0000]` or
  // `rounded-[13px]` even when `<style>` / `style="..."` is empty.
  scanTailwindArbitrary(html, dm, out);
  // Tailwind built-in palette/scale classes (`bg-blue-500`,
  // `rounded-xl`, etc.) carry no CSS literal in the rendered HTML
  // and would otherwise slip past every other scanner above.
  scanTailwindUtility(html, dm, out);
  // The doc contract above promises one entry per distinct {kind, found}
  // pair; without this call the helper was dead code and the promise was
  // not kept.
  return dedupeViolations(out);
}

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
// Property-value regexes capture up to the next `;`, `}`, `<`, `>`, or
// containing-attr quote boundary. Inline `style="..."` boundaries are
// handled by stopping at the outer attribute quote, so the value class
// excludes `"` and `'` for shadow/radius (which never need quotes), but
// font-family CAN have quoted family names (e.g., `"Comic Sans"`), so
// the font regex tolerates quotes within the value.
const RADIUS_RE = /border-radius\s*:\s*([^;}<>"']+)/g;
const SHADOW_RE = /box-shadow\s*:\s*([^;}<>"']+)/g;
const FONT_RE = /font-family\s*:\s*([^;}<>]+)/g;

const SAFE_LITERALS: ReadonlySet<string> = new Set([
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
  "0",
  "none",
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
  // Allowed color literals are the explicit `visual.colors.*` values plus
  // any color literals embedded in registered shadow values (so that a
  // valid `box-shadow: 0 1px 2px rgba(15,23,42,0.05)` does not produce a
  // spurious color violation for the inner rgba). Radius values are
  // dimensionless and contribute no color literals.
  const allowed = lowercaseValues(Object.values(dm.visual.colors));
  for (const value of Object.values(dm.visual.shadow)) {
    for (const match of value.matchAll(HEX_RE)) allowed.add(match[0].toLowerCase());
    for (const match of value.matchAll(RGB_RE)) allowed.add(match[0].toLowerCase());
    for (const match of value.matchAll(HSL_RE)) allowed.add(match[0].toLowerCase());
  }
  return allowed;
}

function scanColors(html: string, dm: DesignMd, out: DesignMdViolation[]): void {
  const allowed = collectAllowedColors(dm);
  for (const match of html.matchAll(HEX_RE)) {
    const literal = match[0].toLowerCase();
    if (!allowed.has(literal)) {
      out.push({ kind: "color", found: literal });
    }
  }
  for (const match of html.matchAll(RGB_RE)) {
    const literal = match[0].toLowerCase();
    if (!allowed.has(literal)) {
      out.push({ kind: "color", found: literal });
    }
  }
  for (const match of html.matchAll(HSL_RE)) {
    const literal = match[0].toLowerCase();
    if (!allowed.has(literal)) {
      out.push({ kind: "color", found: literal });
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

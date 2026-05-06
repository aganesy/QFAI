import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ARCHETYPES,
  COLOR_KEYS,
  FONT_KEYS,
  RADIUS_KEYS,
  SHADOW_KEYS,
  hashDesignMd,
  parseDesignMd,
  validateDesignMd,
  type DesignMd,
} from "../../../src/core/design/designMd.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function buildValidDesignMd(): DesignMd {
  return {
    brand: {
      name: "Acme Ledger",
      archetype: "tech",
      voice: ["calm", "sharp"],
    },
    audience: {
      emotion: ["confident comparison"],
      do_not_look_like: ["generic SaaS dashboard"],
    },
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
    },
  };
}

const VALID_FRONT_MATTER = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  '  voice: ["calm", "sharp"]',
  "audience:",
  '  emotion: ["confident comparison"]',
  '  do_not_look_like: ["generic SaaS dashboard"]',
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
].join("\n");

const VALID_BODY = ["", "# Brand Philosophy", "", "Calm and sharp.", ""].join("\n");

const VALID_SAMPLE = `${VALID_FRONT_MATTER}\n${VALID_BODY}`;

// Helper: build a sample whose front-matter is mutated in a single field.
function sampleWithColor(key: string, value: string): string {
  return VALID_SAMPLE.replace(new RegExp(`(${key}:\\s*)"[^"]*"`), `$1"${value}"`);
}

function sampleWithoutLine(needle: string): string {
  return VALID_SAMPLE.split("\n")
    .filter((line) => !line.includes(needle))
    .join("\n");
}

// ---------------------------------------------------------------------------
// TC-1.1.x parseDesignMd
// ---------------------------------------------------------------------------

describe("parseDesignMd (TC-1.1.x)", () => {
  it("TC-1.1.1: valid full sample returns DesignMd + body", () => {
    const result = parseDesignMd(VALID_SAMPLE);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.data.brand.name).toBe("Acme Ledger");
    expect(result.data.brand.archetype).toBe("tech");
    expect(result.data.visual.colors.primary).toBe("#1F2937");
    expect(result.body).toContain("# Brand Philosophy");
  });

  it("TC-1.1.2: missing required key brand.archetype returns error at brand.archetype", () => {
    const text = sampleWithoutLine("archetype: tech");
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.path).toBe("brand.archetype");
    expect(result.error.code).toBe("missing-required");
  });

  it("TC-1.1.3: invalid archetype value (neon) returns invalid-enum at brand.archetype", () => {
    const text = VALID_SAMPLE.replace("archetype: tech", "archetype: neon");
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.path).toBe("brand.archetype");
    expect(result.error.code).toBe("invalid-enum");
    for (const a of ARCHETYPES) {
      expect(result.error.message).toContain(a);
    }
  });

  it("TC-1.1.4: LF and CRLF inputs both parse to deep-equal data", () => {
    const lf = VALID_SAMPLE;
    const crlf = VALID_SAMPLE.replace(/\n/g, "\r\n");
    const a = parseDesignMd(lf);
    const b = parseDesignMd(crlf);
    expect("error" in a).toBe(false);
    expect("error" in b).toBe(false);
    if ("error" in a || "error" in b) return;
    expect(a.data).toEqual(b.data);
  });

  it("TC-1.1.5: 3-letter hex shorthand #FFF is rejected", () => {
    const text = sampleWithColor("primary", "#FFF");
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.path).toBe("visual.colors.primary");
    expect(result.error.code).toBe("invalid-color-format");
    expect(result.error.message.toLowerCase()).toContain("6 or 8");
  });

  it("TC-1.1.6: 8-digit hex #1F2937FF is accepted", () => {
    const text = sampleWithColor("primary", "#1F2937FF");
    const result = parseDesignMd(text);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.data.visual.colors.primary).toBe("#1F2937FF");
  });

  it("TC-1.1.7: empty input returns empty-input error", () => {
    const result = parseDesignMd("");
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("empty-input");
  });

  it("TC-1.1.8: input without front-matter delimiters returns missing-front-matter", () => {
    const result = parseDesignMd("# Brand\n\nbody only");
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("missing-front-matter");
  });

  it("TC-1.1.9: input with UTF-8 BOM still parses", () => {
    const result = parseDesignMd("﻿" + VALID_SAMPLE);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.data.brand.name).toBe("Acme Ledger");
  });

  it("TC-1.1.10: valid front-matter with empty body parses with body === ''", () => {
    const result = parseDesignMd(VALID_FRONT_MATTER + "\n");
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.body).toBe("");
  });

  it("TC-1.1.11: multiple --- in body do not confuse the front-matter terminator", () => {
    const body = "\n# Heading\n\n---\n\nMore body after a horizontal rule.\n";
    const text = VALID_FRONT_MATTER + body;
    const result = parseDesignMd(text);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.body).toContain("---");
    expect(result.body).toContain("More body after a horizontal rule");
  });

  it("TC-1.1.12: body without # Brand Philosophy heading still parses", () => {
    const text = VALID_FRONT_MATTER + "\nNo heading here, just prose.\n";
    const result = parseDesignMd(text);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.body).toContain("No heading here");
  });

  it("TC-1.1.13: unknown top-level visual key (gradients) rejected with unknown-key", () => {
    const text = VALID_FRONT_MATTER.replace(
      'overlay:        "rgba(0,0,0,0.5)"',
      'overlay:        "rgba(0,0,0,0.5)"\n  gradients:\n    primary: "linear-gradient(...)"',
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("visual.gradients");
  });

  it("TC-1.1.14: unknown top-level visual key (motion) rejected before downstream validation", () => {
    // Strip `colors` entirely so a downstream colors-missing error
    // would otherwise dominate. Then re-inject `motion`. The unknown-
    // key check MUST fire first, returning a parse-level ParseError
    // (visual.motion / unknown-key), not a colors-related issue.
    const text = VALID_FRONT_MATTER.replace(/  colors:\n(?:    [^\n]+\n)+/, "").replace(
      "  typography:",
      "  motion:\n    duration: 300ms\n  typography:",
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("visual.motion");
  });

  it("TC-1.1.15: unknown typography key (font_pairing) rejected with unknown-key", () => {
    const text = VALID_FRONT_MATTER.replace(
      '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
      '    family_mono:    "JetBrains Mono, ui-monospace, monospace"\n    font_pairing:   "harmonic"',
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("visual.typography.font_pairing");
  });

  it("TC-1.1.16: unknown typography key (fallback_policy) rejected with unknown-key", () => {
    const text = VALID_FRONT_MATTER.replace(
      '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
      '    family_mono:    "JetBrains Mono, ui-monospace, monospace"\n    fallback_policy: "system"',
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("visual.typography.fallback_policy");
  });

  it("TC-1.1.17: unknown audience key (references) rejected with unknown-key", () => {
    const text = VALID_FRONT_MATTER.replace(
      '  do_not_look_like: ["generic SaaS dashboard"]',
      '  do_not_look_like: ["generic SaaS dashboard"]\n  references: ["acme.com"]',
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("audience.references");
  });

  it("TC-1.1.18: unknown root key (platform) rejected with unknown-key", () => {
    const text = VALID_FRONT_MATTER.replace("brand:", "platform: ios\nbrand:");
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("platform");
  });

  it("TC-1.1.19: unknown root key (references) rejected with unknown-key", () => {
    const text = VALID_FRONT_MATTER.replace("brand:", 'references:\n  - "acme.com"\nbrand:');
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("references");
  });

  it("TC-1.1.22: unknown visual.colors key (gradients) at parse time rejected with unknown-key", () => {
    // Inject an array-shaped unknown directive under visual.colors —
    // readStringRecord would silently drop arrays before validateColors
    // ever sees them, so we need a parse-time reject.
    const lastColorLine = '    overlay:        "rgba(0,0,0,0.5)"';
    const text = VALID_FRONT_MATTER.replace(
      lastColorLine,
      `${lastColorLine}\n    gradients:\n      - "linear-gradient(...)"`,
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("visual.colors.gradients");
  });

  it("TC-1.1.23: unknown visual.radius key (breakpoints) at parse time rejected with unknown-key", () => {
    const lastRadiusLine = '    full: "9999px"';
    const text = VALID_FRONT_MATTER.replace(
      lastRadiusLine,
      `${lastRadiusLine}\n    breakpoints:\n      sm: "0.5rem"`,
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("visual.radius.breakpoints");
  });

  it("TC-1.1.24: unknown visual.shadow key (gradients) at parse time rejected with unknown-key", () => {
    const lastShadowLine = '    lg: "0 12px 24px rgba(15,23,42,0.10)"';
    const text = VALID_FRONT_MATTER.replace(
      lastShadowLine,
      `${lastShadowLine}\n    gradients:\n      - "linear-gradient(...)"`,
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("visual.shadow.gradients");
  });

  it("TC-1.1.21: unknown visual.spacing key (gutter) rejected with unknown-key", () => {
    const lastShadowLine = '    lg: "0 12px 24px rgba(15,23,42,0.10)"';
    const text = VALID_FRONT_MATTER.replace(
      lastShadowLine,
      `${lastShadowLine}\n  spacing:\n    base: "8px"\n    gutter: "16px"`,
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("visual.spacing.gutter");
  });

  it("TC-1.1.20: unknown accessibility key (focus_ring) rejected with unknown-key", () => {
    // Inject the accessibility block before the closing front-matter
    // delimiter (the last line of VALID_FRONT_MATTER is `---`).
    const lastShadowLine = '    lg: "0 12px 24px rgba(15,23,42,0.10)"';
    const text = VALID_FRONT_MATTER.replace(
      lastShadowLine,
      `${lastShadowLine}\naccessibility:\n  contrast_ratio_min: 4.5\n  focus_ring: "2px"`,
    );
    const result = parseDesignMd(text);
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.code).toBe("unknown-key");
    expect(result.error.path).toBe("accessibility.focus_ring");
  });
});

// ---------------------------------------------------------------------------
// TC-1.2.x validateDesignMd
// ---------------------------------------------------------------------------

describe("validateDesignMd archetype (TC-1.2.1..1.2.5)", () => {
  it.each(ARCHETYPES.map((a) => [a]))("TC-1.2.1: archetype '%s' is accepted", (archetype) => {
    const d = buildValidDesignMd();
    d.brand.archetype = archetype;
    expect(validateDesignMd(d)).toEqual([]);
  });

  it("TC-1.2.2: unknown archetype rejected", () => {
    const d = buildValidDesignMd();
    // Bypass type-narrowing by widening; intentional invalid value.
    (d.brand as { archetype: unknown }).archetype = "neon";
    const issues = validateDesignMd(d);
    expect(issues.some((i) => i.path === "brand.archetype" && i.code === "invalid-enum")).toBe(
      true,
    );
  });

  it("TC-1.2.3: missing archetype rejected", () => {
    const d = buildValidDesignMd();
    (d.brand as { archetype: unknown }).archetype = undefined;
    const issues = validateDesignMd(d);
    expect(issues.some((i) => i.path === "brand.archetype" && i.code === "missing-required")).toBe(
      true,
    );
  });

  it("TC-1.2.4: archetype is case-sensitive (Tech rejected)", () => {
    const d = buildValidDesignMd();
    (d.brand as { archetype: unknown }).archetype = "Tech";
    const issues = validateDesignMd(d);
    expect(issues.some((i) => i.path === "brand.archetype" && i.code === "invalid-enum")).toBe(
      true,
    );
  });

  it("TC-1.2.5: archetype + arbitrary voice combo accepted", () => {
    const d = buildValidDesignMd();
    d.brand.archetype = "minimal";
    d.brand.voice = ["bold", "loud"];
    expect(validateDesignMd(d)).toEqual([]);
  });
});

describe("validateDesignMd colors (TC-1.2.6..1.2.13)", () => {
  it("TC-1.2.6: full 12-color set with valid hex accepted", () => {
    expect(validateDesignMd(buildValidDesignMd())).toEqual([]);
  });

  it.each(COLOR_KEYS.map((k) => [k]))("TC-1.2.7: missing color key '%s' is rejected", (key) => {
    const d = buildValidDesignMd();
    Reflect.deleteProperty(d.visual.colors, key);
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === `visual.colors.${key}` && i.code === "missing-required"),
    ).toBe(true);
  });

  it("TC-1.2.8: unknown extra color key 'foo' is rejected with unknown-key", () => {
    const d = buildValidDesignMd();
    (d.visual.colors as Record<string, string>).foo = "#FFFFFF";
    const issues = validateDesignMd(d);
    expect(issues.some((i) => i.path === "visual.colors.foo" && i.code === "unknown-key")).toBe(
      true,
    );
  });

  it("TC-1.2.9: 3-letter hex on a non-overlay color rejected", () => {
    const d = buildValidDesignMd();
    d.visual.colors.primary = "#FFF";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.colors.primary" && i.code === "invalid-color-format"),
    ).toBe(true);
  });

  it("TC-1.2.10: 6-digit and 8-digit hex accepted", () => {
    const d = buildValidDesignMd();
    d.visual.colors.primary = "#1F2937";
    d.visual.colors.secondary = "#1F2937AA";
    expect(validateDesignMd(d)).toEqual([]);
  });

  it("TC-1.2.11a: rgba accepted only for overlay", () => {
    const d = buildValidDesignMd();
    d.visual.colors.overlay = "rgba(0,0,0,0.5)";
    expect(validateDesignMd(d)).toEqual([]);
  });

  it("TC-1.2.11b: rgba on a non-overlay color is rejected", () => {
    const d = buildValidDesignMd();
    d.visual.colors.primary = "rgba(0,0,0,0.5)";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.colors.primary" && i.code === "invalid-color-format"),
    ).toBe(true);
  });

  it("TC-1.2.11c: rgb(...) on overlay is rejected (alpha required)", () => {
    const d = buildValidDesignMd();
    d.visual.colors.overlay = "rgb(0,0,0)";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.colors.overlay" && i.code === "invalid-color-format"),
    ).toBe(true);
  });

  it("TC-1.2.11d: 8-digit hex on overlay is rejected (rgba-only)", () => {
    const d = buildValidDesignMd();
    d.visual.colors.overlay = "#1F2937FF";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.colors.overlay" && i.code === "invalid-color-format"),
    ).toBe(true);
  });

  it("TC-1.2.11e: 6-digit hex on overlay is rejected (rgba-only)", () => {
    const d = buildValidDesignMd();
    d.visual.colors.overlay = "#000000";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.colors.overlay" && i.code === "invalid-color-format"),
    ).toBe(true);
  });

  it("TC-1.2.11f: rgba(...) values out of 0..255 range on overlay are rejected", () => {
    const d = buildValidDesignMd();
    d.visual.colors.overlay = "rgba(256,0,0,0.5)";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.colors.overlay" && i.code === "invalid-color-format"),
    ).toBe(true);
  });

  it("TC-1.2.11g: rgba(...) alpha=1.0 / 1.00 on overlay is accepted (CSS-equivalent to 1)", () => {
    const d1 = buildValidDesignMd();
    d1.visual.colors.overlay = "rgba(0,0,0,1.0)";
    expect(validateDesignMd(d1)).toEqual([]);
    const d2 = buildValidDesignMd();
    d2.visual.colors.overlay = "rgba(0,0,0,1.00)";
    expect(validateDesignMd(d2)).toEqual([]);
  });

  it("TC-1.2.11h: rgba(...) alpha=.5 (no leading zero) on overlay is accepted", () => {
    const d = buildValidDesignMd();
    d.visual.colors.overlay = "rgba(0,0,0,.5)";
    expect(validateDesignMd(d)).toEqual([]);
  });

  it("TC-1.2.12: leading/trailing whitespace in color value is rejected", () => {
    const d = buildValidDesignMd();
    d.visual.colors.primary = "  #1F2937  ";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.colors.primary" && i.code === "invalid-color-format"),
    ).toBe(true);
  });

  it("TC-1.2.13: multi-issue aggregation (no short-circuit)", () => {
    const d = buildValidDesignMd();
    (d.brand as { archetype: unknown }).archetype = "neon";
    Reflect.deleteProperty(d.visual.colors, "primary");
    Reflect.deleteProperty(d.visual.radius, "full");
    const issues = validateDesignMd(d);
    const paths = issues.map((i) => i.path);
    expect(paths).toContain("brand.archetype");
    expect(paths).toContain("visual.colors.primary");
    expect(paths).toContain("visual.radius.full");
  });
});

describe("validateDesignMd fonts (TC-1.2.14..1.2.16)", () => {
  it("TC-1.2.14: valid 3 font families accepted", () => {
    expect(validateDesignMd(buildValidDesignMd())).toEqual([]);
  });

  it.each(FONT_KEYS.map((k) => [k]))("TC-1.2.15: missing font family '%s' is rejected", (key) => {
    const d = buildValidDesignMd();
    (d.visual.typography as Record<string, unknown>)[key] = "";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === `visual.typography.${key}` && i.code === "missing-required"),
    ).toBe(true);
  });

  it("TC-1.2.16: font family value can be single token or comma-separated stack", () => {
    const d1 = buildValidDesignMd();
    d1.visual.typography.family_sans = "Inter";
    expect(validateDesignMd(d1)).toEqual([]);

    const d2 = buildValidDesignMd();
    d2.visual.typography.family_sans = "Inter, system-ui, sans-serif";
    expect(validateDesignMd(d2)).toEqual([]);
  });
});

describe("validateDesignMd radius (TC-1.2.17..1.2.19)", () => {
  it("TC-1.2.17: valid 4 radii accepted", () => {
    expect(validateDesignMd(buildValidDesignMd())).toEqual([]);
  });

  it.each(RADIUS_KEYS.map((k) => [k]))("TC-1.2.18: missing radius key '%s' is rejected", (key) => {
    const d = buildValidDesignMd();
    Reflect.deleteProperty(d.visual.radius, key);
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === `visual.radius.${key}` && i.code === "missing-required"),
    ).toBe(true);
  });

  it("TC-1.2.19: radius value boundary — 0, 9999px, 100% accepted; -1px rejected", () => {
    const ok = ["0", "9999px", "100%"];
    for (const v of ok) {
      const d = buildValidDesignMd();
      d.visual.radius.sm = v;
      expect(validateDesignMd(d)).toEqual([]);
    }
    const d = buildValidDesignMd();
    d.visual.radius.sm = "-1px";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.radius.sm" && i.code === "invalid-radius-format"),
    ).toBe(true);
  });
});

describe("validateDesignMd shadow (TC-1.2.20..1.2.22)", () => {
  it("TC-1.2.20: valid 3 shadows accepted", () => {
    expect(validateDesignMd(buildValidDesignMd())).toEqual([]);
  });

  it.each(SHADOW_KEYS.map((k) => [k]))("TC-1.2.21: missing shadow key '%s' is rejected", (key) => {
    const d = buildValidDesignMd();
    Reflect.deleteProperty(d.visual.shadow, key);
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === `visual.shadow.${key}` && i.code === "missing-required"),
    ).toBe(true);
  });

  it("TC-1.2.22: empty-string shadow rejected", () => {
    const d = buildValidDesignMd();
    d.visual.shadow.sm = "";
    const issues = validateDesignMd(d);
    expect(issues.some((i) => i.path === "visual.shadow.sm" && i.code === "missing-required")).toBe(
      true,
    );
  });

  it("TC-1.2.23: leading whitespace in shadow value is rejected (byte-anchored)", () => {
    const d = buildValidDesignMd();
    d.visual.shadow.sm = " 0 1px 2px rgba(15,23,42,0.05)";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.shadow.sm" && i.code === "invalid-shadow-format"),
    ).toBe(true);
  });

  it("TC-1.2.24: trailing whitespace in shadow value is rejected", () => {
    const d = buildValidDesignMd();
    d.visual.shadow.md = "0 4px 6px rgba(15,23,42,0.08)\t";
    const issues = validateDesignMd(d);
    expect(
      issues.some((i) => i.path === "visual.shadow.md" && i.code === "invalid-shadow-format"),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-1.3.x hashDesignMd
// ---------------------------------------------------------------------------

describe("hashDesignMd (TC-1.3.x)", () => {
  it("TC-1.3.1: deterministic for identical input and matches a known sha256", () => {
    const fixture = "fixed-fixture-string";
    const expected = createHash("sha256").update(fixture, "utf8").digest("hex");
    expect(hashDesignMd(fixture)).toBe(expected);
    expect(hashDesignMd(fixture)).toBe(hashDesignMd(fixture));
  });

  it("TC-1.3.2: different inputs produce different hashes", () => {
    expect(hashDesignMd("a")).not.toBe(hashDesignMd("b"));
  });

  it("TC-1.3.3: LF vs CRLF differ (no normalization)", () => {
    expect(hashDesignMd("a\nb")).not.toBe(hashDesignMd("a\r\nb"));
  });

  it("TC-1.3.4: empty-string hash matches the standard sha256 of ''", () => {
    expect(hashDesignMd("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("TC-1.3.5: front-matter key reorder produces different hash", () => {
    const a = VALID_SAMPLE;
    const b = VALID_SAMPLE.replace(
      'name: "Acme Ledger"\n  archetype: tech',
      'archetype: tech\n  name: "Acme Ledger"',
    );
    expect(a).not.toBe(b);
    const pa = parseDesignMd(a);
    const pb = parseDesignMd(b);
    expect("error" in pa).toBe(false);
    expect("error" in pb).toBe(false);
    if (!("error" in pa) && !("error" in pb)) {
      expect(pa.data).toEqual(pb.data);
    }
    expect(hashDesignMd(a)).not.toBe(hashDesignMd(b));
  });
});

// ---------------------------------------------------------------------------
// Sanity: the shipped DESIGN.md template parses + validates cleanly.
// ---------------------------------------------------------------------------

describe("shipped DESIGN.md template", () => {
  it("parses and validates the shipped assets/init/root/DESIGN.md", async () => {
    const file = path.join(getInitAssetsDir(), "root", "DESIGN.md");
    const text = await readFile(file, "utf-8");
    const result = parseDesignMd(text);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(validateDesignMd(result.data)).toEqual([]);
  });
});

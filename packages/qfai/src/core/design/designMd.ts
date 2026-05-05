import { createHash } from "node:crypto";

import { parse as parseYaml } from "yaml";

export const ARCHETYPES = [
  "minimal",
  "bold",
  "corporate",
  "playful",
  "organic",
  "tech",
  "elegant",
  "casual",
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export const COLOR_KEYS = [
  "primary",
  "secondary",
  "accent",
  "surface",
  "surface_muted",
  "text",
  "text_muted",
  "danger",
  "warning",
  "success",
  "border",
  "overlay",
] as const;

export type ColorKey = (typeof COLOR_KEYS)[number];

export const FONT_KEYS = ["family_sans", "family_display", "family_mono"] as const;
export type FontKey = (typeof FONT_KEYS)[number];

export const RADIUS_KEYS = ["sm", "md", "lg", "full"] as const;
export type RadiusKey = (typeof RADIUS_KEYS)[number];

export const SHADOW_KEYS = ["sm", "md", "lg"] as const;
export type ShadowKey = (typeof SHADOW_KEYS)[number];

export type DesignMdColors = Record<ColorKey, string>;
export type DesignMdFonts = Record<FontKey, string>;
export type DesignMdRadius = Record<RadiusKey, string>;
export type DesignMdShadow = Record<ShadowKey, string>;

export type DesignMd = {
  brand: {
    name: string;
    archetype: Archetype;
    voice?: string[];
  };
  audience?: {
    emotion?: string[];
    do_not_look_like?: string[];
  };
  visual: {
    colors: DesignMdColors;
    typography: {
      family_sans: string;
      family_display: string;
      family_mono: string;
      scale?: Record<string, string>;
      weight?: Record<string, number>;
    };
    spacing?: {
      base?: string;
      scale?: Array<number | string>;
    };
    radius: DesignMdRadius;
    shadow: DesignMdShadow;
  };
  accessibility?: {
    contrast_ratio_min?: number;
    motion?: string;
  };
};

export type ParseError = {
  path: string;
  code: string;
  message: string;
};

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ParseResult = { data: DesignMd; body: string } | { error: ParseError };

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
const RGBA_COLOR_RE = /^rgba?\([^)]*\)$/;
const RADIUS_VALUE_RE = /^(?:0|\d+(?:\.\d+)?(?:px|rem|em|%)|9999px)$/;

// ---------------------------------------------------------------------------
// Front-matter extraction
// ---------------------------------------------------------------------------

type FrontMatterSplit =
  | { ok: true; yaml: string; body: string }
  | { ok: false; error: ParseError };

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function splitFrontMatter(input: string): FrontMatterSplit {
  if (input.length === 0) {
    return {
      ok: false,
      error: {
        path: "",
        code: "empty-input",
        message: "Input is empty; expected a YAML front-matter block delimited by '---'.",
      },
    };
  }

  const text = stripBom(input);
  const newlineRe = /\r\n|\n|\r/g;
  // Locate opening delimiter (must start at byte 0).
  if (!text.startsWith("---")) {
    return {
      ok: false,
      error: {
        path: "",
        code: "missing-front-matter",
        message: "Input does not begin with a '---' front-matter delimiter.",
      },
    };
  }
  // First newline after the opening delimiter
  newlineRe.lastIndex = 3;
  const firstNl = newlineRe.exec(text);
  if (firstNl === null) {
    return {
      ok: false,
      error: {
        path: "",
        code: "missing-front-matter",
        message: "Front-matter opener has no following newline.",
      },
    };
  }
  // The first three chars must be ONLY '---' on the opening line.
  const openLine = text.slice(0, firstNl.index);
  if (openLine.trim() !== "---") {
    return {
      ok: false,
      error: {
        path: "",
        code: "missing-front-matter",
        message: "Opening line is not exactly '---'.",
      },
    };
  }
  const yamlStart = firstNl.index + firstNl[0].length;
  // Find next line that is exactly '---' (terminator).
  const closeIdx = findClosingDelimiter(text, yamlStart);
  if (closeIdx === -1) {
    return {
      ok: false,
      error: {
        path: "",
        code: "missing-front-matter",
        message: "Front-matter closing '---' not found.",
      },
    };
  }
  const yaml = text.slice(yamlStart, closeIdx.start);
  const body = text.slice(closeIdx.afterClose);
  return { ok: true, yaml, body };
}

function findClosingDelimiter(
  text: string,
  fromIndex: number,
): { start: number; afterClose: number } | -1 {
  let cursor = fromIndex;
  while (cursor < text.length) {
    // Find next newline
    const nlMatch = /\r\n|\n|\r/.exec(text.slice(cursor));
    const lineEnd = nlMatch ? cursor + nlMatch.index : text.length;
    const line = text.slice(cursor, lineEnd);
    if (line.trim() === "---") {
      const afterClose = nlMatch ? lineEnd + nlMatch[0].length : text.length;
      return { start: cursor, afterClose };
    }
    if (!nlMatch) {
      return -1;
    }
    cursor = lineEnd + nlMatch[0].length;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// parseDesignMd
// ---------------------------------------------------------------------------

export function parseDesignMd(text: string): ParseResult {
  if (typeof text !== "string") {
    return {
      error: { path: "", code: "invalid-input", message: "Input must be a string." },
    };
  }

  const split = splitFrontMatter(text);
  if (!split.ok) {
    return { error: split.error };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(split.yaml);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      error: {
        path: "",
        code: "yaml-parse-error",
        message: `Failed to parse front-matter YAML: ${detail}`,
      },
    };
  }

  if (parsed === null || parsed === undefined) {
    return {
      error: {
        path: "",
        code: "empty-front-matter",
        message: "Front-matter parsed to null or undefined.",
      },
    };
  }

  const built = buildDesignMd(parsed);
  if ("error" in built) {
    return { error: built.error };
  }

  const issues = validateDesignMd(built.data);
  if (issues.length > 0) {
    const first = issues[0];
    if (first !== undefined) {
      return { error: { path: first.path, code: first.code, message: first.message } };
    }
  }

  return { data: built.data, body: split.body };
}

type BuildResult = { data: DesignMd } | { error: ParseError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildDesignMd(raw: unknown): BuildResult {
  if (!isRecord(raw)) {
    return {
      error: {
        path: "",
        code: "invalid-shape",
        message: "Front-matter root must be a mapping.",
      },
    };
  }

  const brand = readBrand(raw.brand);
  if ("error" in brand) return { error: brand.error };
  const visual = readVisual(raw.visual);
  if ("error" in visual) return { error: visual.error };

  const data: DesignMd = {
    brand: brand.value,
    visual: visual.value,
  };
  if (isRecord(raw.audience)) {
    const aud: DesignMd["audience"] = {};
    if (Array.isArray(raw.audience.emotion)) {
      aud.emotion = raw.audience.emotion.filter((v): v is string => typeof v === "string");
    }
    if (Array.isArray(raw.audience.do_not_look_like)) {
      aud.do_not_look_like = raw.audience.do_not_look_like.filter(
        (v): v is string => typeof v === "string",
      );
    }
    data.audience = aud;
  }
  if (isRecord(raw.accessibility)) {
    const acc: NonNullable<DesignMd["accessibility"]> = {};
    if (typeof raw.accessibility.contrast_ratio_min === "number") {
      acc.contrast_ratio_min = raw.accessibility.contrast_ratio_min;
    }
    if (typeof raw.accessibility.motion === "string") {
      acc.motion = raw.accessibility.motion;
    }
    data.accessibility = acc;
  }
  return { data };
}

function readBrand(raw: unknown): { value: DesignMd["brand"] } | { error: ParseError } {
  if (!isRecord(raw)) {
    return {
      error: { path: "brand", code: "missing-required", message: "'brand' section missing." },
    };
  }
  const name = typeof raw.name === "string" ? raw.name : "";
  // archetype may be missing/invalid — we keep raw value through to validator
  // by storing a placeholder string when not a string.
  const archetypeRaw = raw.archetype;
  const archetype =
    typeof archetypeRaw === "string" ? (archetypeRaw as Archetype) : (undefined as unknown as Archetype);
  const voice = Array.isArray(raw.voice)
    ? raw.voice.filter((v): v is string => typeof v === "string")
    : undefined;
  const value: DesignMd["brand"] = { name, archetype };
  if (voice !== undefined) value.voice = voice;
  // unknown extra keys
  const extras = Object.keys(raw).filter((k) => k !== "name" && k !== "archetype" && k !== "voice");
  if (extras.length > 0) {
    return {
      error: {
        path: `brand.${extras[0] ?? ""}`,
        code: "unknown-key",
        message: `Unknown key 'brand.${extras[0] ?? ""}' in front-matter.`,
      },
    };
  }
  return { value };
}

function readVisual(raw: unknown): { value: DesignMd["visual"] } | { error: ParseError } {
  if (!isRecord(raw)) {
    return {
      error: { path: "visual", code: "missing-required", message: "'visual' section missing." },
    };
  }
  const colors = readStringRecord(raw.colors);
  const typographyRaw = isRecord(raw.typography) ? raw.typography : {};
  const radius = readStringRecord(raw.radius);
  const shadow = readStringRecord(raw.shadow);

  const typography: DesignMd["visual"]["typography"] = {
    family_sans: typeof typographyRaw.family_sans === "string" ? typographyRaw.family_sans : "",
    family_display:
      typeof typographyRaw.family_display === "string" ? typographyRaw.family_display : "",
    family_mono: typeof typographyRaw.family_mono === "string" ? typographyRaw.family_mono : "",
  };
  if (isRecord(typographyRaw.scale)) {
    typography.scale = readStringRecord(typographyRaw.scale);
  }
  if (isRecord(typographyRaw.weight)) {
    const weights: Record<string, number> = {};
    for (const [k, v] of Object.entries(typographyRaw.weight)) {
      if (typeof v === "number") weights[k] = v;
    }
    typography.weight = weights;
  }

  const value: DesignMd["visual"] = {
    colors: colors as DesignMdColors,
    typography,
    radius: radius as DesignMdRadius,
    shadow: shadow as DesignMdShadow,
  };
  if (isRecord(raw.spacing)) {
    const sp: NonNullable<DesignMd["visual"]["spacing"]> = {};
    if (typeof raw.spacing.base === "string") sp.base = raw.spacing.base;
    if (Array.isArray(raw.spacing.scale)) {
      sp.scale = raw.spacing.scale.filter(
        (v): v is number | string => typeof v === "number" || typeof v === "string",
      );
    }
    value.spacing = sp;
  }
  return { value };
}

function readStringRecord(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number") out[k] = String(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// validateDesignMd
// ---------------------------------------------------------------------------

export function validateDesignMd(d: DesignMd): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  validateBrand(d, issues);
  validateColors(d, issues);
  validateFonts(d, issues);
  validateRadius(d, issues);
  validateShadow(d, issues);
  return issues;
}

function validateBrand(d: DesignMd, issues: ValidationIssue[]): void {
  const archetype = d.brand?.archetype;
  if (archetype === undefined || archetype === null || archetype === "") {
    issues.push({
      path: "brand.archetype",
      code: "missing-required",
      message: "'brand.archetype' is required.",
    });
    return;
  }
  if (typeof archetype !== "string") {
    issues.push({
      path: "brand.archetype",
      code: "invalid-type",
      message: "'brand.archetype' must be a string.",
    });
    return;
  }
  if (!ARCHETYPES.includes(archetype as Archetype)) {
    issues.push({
      path: "brand.archetype",
      code: "invalid-enum",
      message: `'brand.archetype' must be one of: ${ARCHETYPES.join(", ")}.`,
    });
  }
}

function validateColors(d: DesignMd, issues: ValidationIssue[]): void {
  const colors = d.visual?.colors;
  if (!colors || typeof colors !== "object") {
    issues.push({
      path: "visual.colors",
      code: "missing-required",
      message: "'visual.colors' is required.",
    });
    return;
  }
  for (const key of COLOR_KEYS) {
    const value = (colors as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === "") {
      issues.push({
        path: `visual.colors.${key}`,
        code: "missing-required",
        message: `Color '${key}' is required.`,
      });
      continue;
    }
    if (typeof value !== "string") {
      issues.push({
        path: `visual.colors.${key}`,
        code: "invalid-type",
        message: `Color '${key}' must be a string.`,
      });
      continue;
    }
    validateColorValue(key, value, issues);
  }
  // Unknown extra keys
  for (const key of Object.keys(colors)) {
    if (!COLOR_KEYS.includes(key as ColorKey)) {
      issues.push({
        path: `visual.colors.${key}`,
        code: "unknown-key",
        message: `Unknown color key '${key}'. Allowed: ${COLOR_KEYS.join(", ")}.`,
      });
    }
  }
}

function validateColorValue(key: string, value: string, issues: ValidationIssue[]): void {
  // Reject leading/trailing whitespace (schema is byte-anchored).
  if (value !== value.trim()) {
    issues.push({
      path: `visual.colors.${key}`,
      code: "invalid-color-format",
      message: `Color '${key}' has leading or trailing whitespace; values are byte-anchored.`,
    });
    return;
  }
  if (key === "overlay") {
    if (HEX_COLOR_RE.test(value) || RGBA_COLOR_RE.test(value)) return;
    issues.push({
      path: `visual.colors.${key}`,
      code: "invalid-color-format",
      message: `Color 'overlay' must be a 6 or 8-digit hex (e.g. #1F2937 / #1F2937FF) or rgba(...).`,
    });
    return;
  }
  if (HEX_COLOR_RE.test(value)) return;
  issues.push({
    path: `visual.colors.${key}`,
    code: "invalid-color-format",
    message: `Color '${key}' must be a 6 or 8-digit hex; use 6 or 8-digit hex (got '${value}').`,
  });
}

function validateFonts(d: DesignMd, issues: ValidationIssue[]): void {
  const typography = d.visual?.typography;
  if (!typography || typeof typography !== "object") {
    issues.push({
      path: "visual.typography",
      code: "missing-required",
      message: "'visual.typography' is required.",
    });
    return;
  }
  for (const key of FONT_KEYS) {
    const value = (typography as Record<string, unknown>)[key];
    if (typeof value !== "string" || value === "") {
      issues.push({
        path: `visual.typography.${key}`,
        code: "missing-required",
        message: `Font family '${key}' is required.`,
      });
      continue;
    }
    if (value !== value.trim()) {
      issues.push({
        path: `visual.typography.${key}`,
        code: "invalid-font-format",
        message: `Font family '${key}' has leading or trailing whitespace.`,
      });
    }
  }
}

function validateRadius(d: DesignMd, issues: ValidationIssue[]): void {
  const radius = d.visual?.radius;
  if (!radius || typeof radius !== "object") {
    issues.push({
      path: "visual.radius",
      code: "missing-required",
      message: "'visual.radius' is required.",
    });
    return;
  }
  for (const key of RADIUS_KEYS) {
    const value = (radius as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === "") {
      issues.push({
        path: `visual.radius.${key}`,
        code: "missing-required",
        message: `Radius '${key}' is required.`,
      });
      continue;
    }
    if (typeof value !== "string") {
      issues.push({
        path: `visual.radius.${key}`,
        code: "invalid-type",
        message: `Radius '${key}' must be a string.`,
      });
      continue;
    }
    validateRadiusValue(key, value, issues);
  }
  for (const key of Object.keys(radius)) {
    if (!RADIUS_KEYS.includes(key as RadiusKey)) {
      issues.push({
        path: `visual.radius.${key}`,
        code: "unknown-key",
        message: `Unknown radius key '${key}'. Allowed: ${RADIUS_KEYS.join(", ")}.`,
      });
    }
  }
}

function validateRadiusValue(key: string, value: string, issues: ValidationIssue[]): void {
  if (value !== value.trim()) {
    issues.push({
      path: `visual.radius.${key}`,
      code: "invalid-radius-format",
      message: `Radius '${key}' has leading or trailing whitespace.`,
    });
    return;
  }
  if (value.startsWith("-")) {
    issues.push({
      path: `visual.radius.${key}`,
      code: "invalid-radius-format",
      message: `Radius '${key}' must be non-negative (got '${value}').`,
    });
    return;
  }
  if (!RADIUS_VALUE_RE.test(value)) {
    issues.push({
      path: `visual.radius.${key}`,
      code: "invalid-radius-format",
      message: `Radius '${key}' must match a CSS length (px/rem/em/%) or '0' (got '${value}').`,
    });
  }
}

function validateShadow(d: DesignMd, issues: ValidationIssue[]): void {
  const shadow = d.visual?.shadow;
  if (!shadow || typeof shadow !== "object") {
    issues.push({
      path: "visual.shadow",
      code: "missing-required",
      message: "'visual.shadow' is required.",
    });
    return;
  }
  for (const key of SHADOW_KEYS) {
    const value = (shadow as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === "") {
      issues.push({
        path: `visual.shadow.${key}`,
        code: "missing-required",
        message: `Shadow '${key}' is required.`,
      });
      continue;
    }
    if (typeof value !== "string") {
      issues.push({
        path: `visual.shadow.${key}`,
        code: "invalid-type",
        message: `Shadow '${key}' must be a string.`,
      });
    }
  }
  for (const key of Object.keys(shadow)) {
    if (!SHADOW_KEYS.includes(key as ShadowKey)) {
      issues.push({
        path: `visual.shadow.${key}`,
        code: "unknown-key",
        message: `Unknown shadow key '${key}'. Allowed: ${SHADOW_KEYS.join(", ")}.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// hashDesignMd
// ---------------------------------------------------------------------------

export function hashDesignMd(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

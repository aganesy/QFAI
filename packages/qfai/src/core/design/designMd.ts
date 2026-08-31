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
    /**
     * Optional at the type layer because parseDesignMd intentionally
     * preserves the raw (possibly undefined / invalid) archetype value
     * so validateDesignMd can emit a precise `missing-required` /
     * `invalid-enum` issue. Downstream consumers MUST treat
     * `archetype: undefined` as a parse-defect surface (not a valid
     * brand) and rely on validateDesignMd to gate.
     */
    archetype?: Archetype;
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
      // Per the canonical design-md-spec.md, `scale` is `number[]`.
      // Mixed-type arrays are rejected at parse-time.
      scale?: number[];
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
// Strict rgba(R,G,B,A) literal for `visual.colors.overlay`. Alpha is
// REQUIRED (no rgb(...) fallback) so authors cannot freeze a non-
// transparent overlay token. R/G/B accept 0..255; alpha accepts:
//   - the integer `0` or `1`
//   - `1.0`, `1.00`, ... (CSS-equivalent to `1`)
//   - `0?.<digits>` (so both `0.5` and `.5` match the same branch).
// Whitespace inside the parens is tolerated; whitespace around the
// literal is rejected upstream.
const RGBA_OVERLAY_RE =
  /^rgba\(\s*(?:25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\s*,\s*(?:25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\s*,\s*(?:25[0-5]|2[0-4]\d|1\d\d|\d{1,2})\s*,\s*(?:0|1(?:\.0+)?|0?\.\d+)\s*\)$/;
const RADIUS_VALUE_RE = /^(?:0|\d+(?:\.\d+)?(?:px|rem|em|%)|9999px)$/;

// ---------------------------------------------------------------------------
// Front-matter extraction
// ---------------------------------------------------------------------------

type FrontMatterSplit = { ok: true; yaml: string; body: string } | { ok: false; error: ParseError };

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

/**
 * Scope descriptor for `rejectUnknownKeys`. The discriminated union
 * forces callers to declare front-matter ROOT vs nested SECTION
 * scopes at the type level, so the dead `name: ""` placeholder that
 * older shapes carried for the root call is structurally impossible.
 */
type RejectScope =
  | { readonly kind: "root" }
  | { readonly kind: "section"; readonly name: string; readonly path: string };

/**
 * Single shape for unknown-key reject across every front-matter level
 * (root, `brand`, `visual`, `visual.colors`, `visual.typography`,
 * `visual.radius`, `visual.shadow`, `visual.spacing`, `audience`,
 * `accessibility`). Returns null when every key is allowed; otherwise
 * returns a ParseError naming the FIRST unknown key.
 *
 * @param record  The record being scanned.
 * @param allowed The allowlist of keys for this scope.
 * @param scope   Scope descriptor (see {@link RejectScope}).
 */
function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  scope: RejectScope,
): ParseError | null {
  const [first] = Object.keys(record).filter((k) => !allowed.has(k));
  if (first === undefined) return null;
  if (scope.kind === "root") {
    return {
      path: first,
      code: "unknown-key",
      message: `Unknown root DESIGN.md key '${first}'. Allowed: ${[...allowed].join(", ")}.`,
    };
  }
  return {
    path: `${scope.path}.${first}`,
    code: "unknown-key",
    message: `Unknown '${scope.name}' key '${first}'. Allowed: ${[...allowed].join(", ")}.`,
  };
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

  // Reject unknown root-level keys. The distributed DESIGN.md spec
  // forbids unknown keys at any level, and silently dropping an
  // authored top-level directive (e.g. `platform:`, `references:`)
  // lets it hash into the lock while never reaching the parsed
  // tokens. Allowlist must be kept in sync with the optional sections
  // copied below (`audience`, `accessibility`).
  const ROOT_ALLOWED_KEYS = new Set(["brand", "visual", "audience", "accessibility"]);
  const rootError = rejectUnknownKeys(raw, ROOT_ALLOWED_KEYS, { kind: "root" });
  if (rootError) return { error: rootError };

  const brand = readBrand(raw.brand);
  if ("error" in brand) return { error: brand.error };
  const visual = readVisual(raw.visual);
  if ("error" in visual) return { error: visual.error };

  const data: DesignMd = {
    brand: brand.value,
    visual: visual.value,
  };
  // codex AHcvl: reject present-but-non-record `audience`. Same
  // SSOT-divergence pattern as accessibility (AHHiE) / visual.spacing
  // (AHHiH) / typography token blocks (AG08u): pre-fix
  // `if (isRecord(raw.audience))` silently skipped scalars / arrays
  // (`audience: "..."`, `audience: ["foo"]`), letting the invalid
  // value hash into the lock while downstream iterate / certify
  // saw `audience: undefined` and lost the brand-context tokens.
  if ("audience" in raw && raw.audience !== undefined && !isRecord(raw.audience)) {
    return {
      error: {
        path: "audience",
        code: "invalid-type",
        message: `'audience' must be a mapping (got ${describeValueShape(raw.audience)}).`,
      },
    };
  }
  if (isRecord(raw.audience)) {
    // Reject unknown keys under `audience` for the same reason as
    // `visual` and `visual.typography`: the distributed DESIGN.md
    // spec forbids unknown keys at any level, and silently dropping
    // an authored directive (e.g. `audience.references`) lets it
    // hash into the lock while never reaching the parsed tokens.
    const AUDIENCE_ALLOWED_KEYS = new Set(["emotion", "do_not_look_like"]);
    const audienceError = rejectUnknownKeys(raw.audience, AUDIENCE_ALLOWED_KEYS, {
      kind: "section",
      name: "audience",
      path: "audience",
    });
    if (audienceError) return { error: audienceError };
    const aud: DesignMd["audience"] = {};
    // The distributed DESIGN.md spec defines `audience.emotion` and
    // `audience.do_not_look_like` as `string[]`. Pre-fix, both fields
    // were silently filtered (`.filter(typeof v === "string")` /
    // `Array.isArray` check), which let scalar / mixed-type authoring
    // hash into the DESIGN.md.lock raw bytes while the parsed brand
    // context dropped the offending entries. Reject non-array values
    // and non-string entries with explicit invalid-type errors so the
    // brand SSOT enforces the contract upstream of the lock.
    if ("emotion" in raw.audience && raw.audience.emotion !== undefined) {
      const emotionError = parseDesignMdStringArrayField(raw.audience.emotion, "audience.emotion");
      if ("error" in emotionError) return emotionError;
      aud.emotion = emotionError.value;
    }
    if ("do_not_look_like" in raw.audience && raw.audience.do_not_look_like !== undefined) {
      const dnllError = parseDesignMdStringArrayField(
        raw.audience.do_not_look_like,
        "audience.do_not_look_like",
      );
      if ("error" in dnllError) return dnllError;
      aud.do_not_look_like = dnllError.value;
    }
    data.audience = aud;
  }
  // codex AHHiE: reject present-but-non-record `accessibility`. Pre-fix
  // `if (isRecord(raw.accessibility))` silently skipped a scalar/array
  // (`accessibility: false`, `accessibility: "wcag-aa"`), letting the
  // invalid value hash into the lock while downstream iterate / certify
  // saw `accessibility: undefined` — the same SSOT-divergence pattern
  // the typography token-block fix (AG08u) closed.
  if ("accessibility" in raw && raw.accessibility !== undefined && !isRecord(raw.accessibility)) {
    return {
      error: {
        path: "accessibility",
        code: "invalid-type",
        message: `'accessibility' must be a mapping (got ${describeValueShape(raw.accessibility)}).`,
      },
    };
  }
  if (isRecord(raw.accessibility)) {
    // Reject unknown keys under `accessibility` for the same reason as
    // every other section: silently dropping authoring directives lets
    // them freeze into the lock hash while never reaching the parsed
    // tokens consumed by iteration / certify.
    const ACCESSIBILITY_ALLOWED_KEYS = new Set(["contrast_ratio_min", "motion"]);
    const accessibilityError = rejectUnknownKeys(raw.accessibility, ACCESSIBILITY_ALLOWED_KEYS, {
      kind: "section",
      name: "accessibility",
      path: "accessibility",
    });
    if (accessibilityError) return { error: accessibilityError };
    const acc: NonNullable<DesignMd["accessibility"]> = {};
    // Strict-parse: reject present-but-wrong-type values the same way
    // audience arrays / typography scale+weight / spacing scale are
    // rejected. Pre-fix the type-mismatch branches silently dropped
    // the authored value, so e.g. `contrast_ratio_min: "4.5"` (string
    // instead of number) or `motion: false` (boolean instead of
    // string) hashed into DESIGN.md.lock while iterate / certify saw
    // a clean DesignMd with the accessibility constraint missing.
    // codex 9KB8.
    if ("contrast_ratio_min" in raw.accessibility) {
      const v = raw.accessibility.contrast_ratio_min;
      if (v !== undefined) {
        if (typeof v !== "number" || !Number.isFinite(v)) {
          return {
            error: {
              path: "accessibility.contrast_ratio_min",
              code: "invalid-type",
              message: `'accessibility.contrast_ratio_min' must be a finite number (got ${describeValueShape(v)}).`,
            },
          };
        }
        acc.contrast_ratio_min = v;
      }
    }
    if ("motion" in raw.accessibility) {
      const v = raw.accessibility.motion;
      if (v !== undefined) {
        if (typeof v !== "string") {
          return {
            error: {
              path: "accessibility.motion",
              code: "invalid-type",
              message: `'accessibility.motion' must be a string (got ${describeValueShape(v)}).`,
            },
          };
        }
        acc.motion = v;
      }
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
  // Keep the raw archetype value through to validateDesignMd. The
  // Archetype literal cast still applies on the string branch, but the
  // non-string branch is now an honest `undefined` (matched by the
  // Optional shape on DesignMd['brand']) instead of a double cast.
  const archetype: Archetype | undefined =
    typeof archetypeRaw === "string" ? (archetypeRaw as Archetype) : undefined;
  // Strict-parse `brand.voice`. Pre-fix the parser silently filtered
  // non-string entries and accepted scalars / dropped non-arrays,
  // letting malformed authoring hash into the DESIGN.md lock while
  // downstream consumers saw a different brand context. Symmetric
  // with `parseDesignMdStringArrayField` (codex 8A6f) and the typography
  // / spacing strict-parse paths. codex 9R4e.
  let voice: string[] | undefined;
  if ("voice" in raw && raw.voice !== undefined) {
    const voiceParsed = parseDesignMdStringArrayField(raw.voice, "brand.voice");
    if ("error" in voiceParsed) return { error: voiceParsed.error };
    voice = voiceParsed.value;
  }
  const value: DesignMd["brand"] = archetype !== undefined ? { name, archetype } : { name };
  if (voice !== undefined) value.voice = voice;
  // unknown extra keys
  const BRAND_ALLOWED_KEYS = new Set(["name", "archetype", "voice"]);
  const brandError = rejectUnknownKeys(raw, BRAND_ALLOWED_KEYS, {
    kind: "section",
    name: "brand",
    path: "brand",
  });
  if (brandError) return { error: brandError };
  return { value };
}

function readVisual(raw: unknown): { value: DesignMd["visual"] } | { error: ParseError } {
  if (!isRecord(raw)) {
    return {
      error: { path: "visual", code: "missing-required", message: "'visual' section missing." },
    };
  }
  // Reject unknown top-level keys under `visual` so authors who add
  // freelance directives (e.g. `visual.gradients`, `visual.motion`) get
  // a parse error instead of a silent drop. Allowed keys are listed in
  // the distributed DESIGN.md spec; the value is still hashed in the
  // lock so prototyping would freeze a directive that the parser
  // discards.
  const VISUAL_ALLOWED_KEYS = new Set(["colors", "typography", "radius", "shadow", "spacing"]);
  const visualError = rejectUnknownKeys(raw, VISUAL_ALLOWED_KEYS, {
    kind: "section",
    name: "visual",
    path: "visual",
  });
  if (visualError) return { error: visualError };
  // Nested unknown-key reject for the scalar token sections
  // (`visual.colors`, `visual.radius`, `visual.shadow`). `readStringRecord`
  // only carries strings/numbers forward; without a parse-time reject
  // an authored array/object directive (e.g. `visual.colors.gradients:
  // [...]`, `visual.radius.breakpoints: {...}`) would be dropped before
  // `validate*` ever sees it, even though the spec rejects unknown keys
  // at any level.
  if (isRecord(raw.colors)) {
    const colorsKeys = new Set<string>(COLOR_KEYS);
    const colorsError = rejectUnknownKeys(raw.colors, colorsKeys, {
      kind: "section",
      name: "visual.colors",
      path: "visual.colors",
    });
    if (colorsError) return { error: colorsError };
  }
  if (isRecord(raw.radius)) {
    const radiusKeys = new Set<string>(RADIUS_KEYS);
    const radiusError = rejectUnknownKeys(raw.radius, radiusKeys, {
      kind: "section",
      name: "visual.radius",
      path: "visual.radius",
    });
    if (radiusError) return { error: radiusError };
  }
  if (isRecord(raw.shadow)) {
    const shadowKeys = new Set<string>(SHADOW_KEYS);
    const shadowError = rejectUnknownKeys(raw.shadow, shadowKeys, {
      kind: "section",
      name: "visual.shadow",
      path: "visual.shadow",
    });
    if (shadowError) return { error: shadowError };
  }
  const colorsResult = readStringRecordStrict(raw.colors, "visual.colors");
  if ("error" in colorsResult) return colorsResult;
  const colors = colorsResult.value;
  const typographyRaw = isRecord(raw.typography) ? raw.typography : {};
  // Reject unknown keys under `visual.typography` for the same reason
  // as the visual top level: silently dropping authoring directives
  // (e.g. `font_pairing`, `fallback_policy`) lets them freeze into the
  // lock while never reaching the parsed tokens consumed by iteration
  // / certification.
  const TYPOGRAPHY_ALLOWED_KEYS = new Set([
    "family_sans",
    "family_display",
    "family_mono",
    "scale",
    "weight",
  ]);
  const typographyError = rejectUnknownKeys(typographyRaw, TYPOGRAPHY_ALLOWED_KEYS, {
    kind: "section",
    name: "visual.typography",
    path: "visual.typography",
  });
  if (typographyError) return { error: typographyError };
  const radiusResult = readStringRecordStrict(raw.radius, "visual.radius");
  if ("error" in radiusResult) return radiusResult;
  const radius = radiusResult.value;
  const shadowResult = readStringRecordStrict(raw.shadow, "visual.shadow");
  if ("error" in shadowResult) return shadowResult;
  const shadow = shadowResult.value;

  const typography: DesignMd["visual"]["typography"] = {
    family_sans: typeof typographyRaw.family_sans === "string" ? typographyRaw.family_sans : "",
    family_display:
      typeof typographyRaw.family_display === "string" ? typographyRaw.family_display : "",
    family_mono: typeof typographyRaw.family_mono === "string" ? typographyRaw.family_mono : "",
  };
  // The distributed DESIGN.md spec fixes the type-scale and weight
  // tokens. Allow the canonical names only — anything else is rejected
  // at parse time so an authored extra (`scale.hero`, `weight.black`)
  // does not freeze into the lock while iteration / certify ignore it.
  const TYPOGRAPHY_SCALE_ALLOWED_KEYS = new Set(["xs", "sm", "base", "lg", "xl", "2xl", "3xl"]);
  const TYPOGRAPHY_WEIGHT_ALLOWED_KEYS = new Set(["regular", "medium", "bold"]);
  // codex AG08u: reject present-but-non-record `scale` / `weight` blocks.
  // Pre-fix `if (isRecord(typographyRaw.scale))` silently skipped a
  // string / array authored under `scale:` (`scale: "1rem"` or
  // `scale: [1, 2]`), so an invalid DESIGN.md hashed into the lock
  // while `designTokens.typography.scale` was missing for downstream
  // consumers. Same fix below for `weight`.
  if (
    "scale" in typographyRaw &&
    typographyRaw.scale !== undefined &&
    !isRecord(typographyRaw.scale)
  ) {
    return {
      error: {
        path: "visual.typography.scale",
        code: "invalid-type",
        message: `'visual.typography.scale' must be a mapping of token keys to length values (got ${describeValueShape(typographyRaw.scale)}).`,
      },
    };
  }
  if (isRecord(typographyRaw.scale)) {
    const scaleError = rejectUnknownKeys(typographyRaw.scale, TYPOGRAPHY_SCALE_ALLOWED_KEYS, {
      kind: "section",
      name: "visual.typography.scale",
      path: "visual.typography.scale",
    });
    if (scaleError) return { error: scaleError };
    // Strict-parse each scale value. The distributed DESIGN.md spec
    // requires CSS length tokens (e.g. `base: "1rem"`); pre-fix
    // `readStringRecord` (a) coerced numbers to strings (`1` -> `"1"`)
    // and (b) accepted padded values (`" 1rem "`). Both leak into
    // the lock and the design-system.yaml mirror as "validated"
    // tokens that downstream CSS engines reject. Reject non-string
    // and padded / empty values at the brand SSOT.
    const scaleValues: Record<string, string> = {};
    for (const [k, v] of Object.entries(typographyRaw.scale)) {
      if (typeof v !== "string") {
        return {
          error: {
            path: `visual.typography.scale.${k}`,
            code: "invalid-type",
            message: `'visual.typography.scale.${k}' must be a string (got ${describeValueShape(v)}).`,
          },
        };
      }
      if (v.length === 0 || v.trim() !== v) {
        return {
          error: {
            path: `visual.typography.scale.${k}`,
            code: "invalid-format",
            message: `'visual.typography.scale.${k}' must be a non-empty string with no leading / trailing whitespace.`,
          },
        };
      }
      scaleValues[k] = v;
    }
    typography.scale = scaleValues;
  }
  if (
    "weight" in typographyRaw &&
    typographyRaw.weight !== undefined &&
    !isRecord(typographyRaw.weight)
  ) {
    return {
      error: {
        path: "visual.typography.weight",
        code: "invalid-type",
        message: `'visual.typography.weight' must be a mapping of token keys to numeric weights (got ${describeValueShape(typographyRaw.weight)}).`,
      },
    };
  }
  if (isRecord(typographyRaw.weight)) {
    const weightError = rejectUnknownKeys(typographyRaw.weight, TYPOGRAPHY_WEIGHT_ALLOWED_KEYS, {
      kind: "section",
      name: "visual.typography.weight",
      path: "visual.typography.weight",
    });
    if (weightError) return { error: weightError };
    const weights: Record<string, number> = {};
    // The distributed DESIGN.md spec fixes typography.weight values
    // as numeric tokens (`regular: 400`, `medium: 500`, `bold: 700`).
    // A non-number value (e.g. `regular: "400"` quoted as a string)
    // would silently drop here pre-1.8.9, leaving the resulting
    // weight record empty or partial — and the mirror cross-check
    // would then accept a handoff that lost authored weight tokens
    // (because `expected` would also be empty/partial). Reject
    // non-number values at parse-time so the contract is enforced
    // at the brand SSOT.
    for (const [k, v] of Object.entries(typographyRaw.weight)) {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        return {
          error: {
            path: `visual.typography.weight.${k}`,
            code: "invalid-type",
            message: `'visual.typography.weight.${k}' must be a finite number (got ${describeValueShape(v)}).`,
          },
        };
      }
      weights[k] = v;
    }
    typography.weight = weights;
  }

  const value: DesignMd["visual"] = {
    colors: colors as DesignMdColors,
    typography,
    radius: radius as DesignMdRadius,
    shadow: shadow as DesignMdShadow,
  };
  // codex AHHiH: reject present-but-non-record `visual.spacing`. Pre-fix
  // `if (isRecord(raw.spacing))` silently skipped a scalar/array
  // (`spacing: "0.25rem"`, `spacing: [0,4,8]`), letting the invalid
  // value hash into the lock while the parsed DesignMd had no spacing
  // tokens — the mirror cross-check would then accept a handoff that
  // omitted spacing entirely. Same SSOT-divergence pattern the
  // typography token-block fix (AG08u) and accessibility section fix
  // (AHHiE) close.
  if ("spacing" in raw && raw.spacing !== undefined && !isRecord(raw.spacing)) {
    return {
      error: {
        path: "visual.spacing",
        code: "invalid-type",
        message: `'visual.spacing' must be a mapping (got ${describeValueShape(raw.spacing)}).`,
      },
    };
  }
  if (isRecord(raw.spacing)) {
    const SPACING_ALLOWED_KEYS = new Set(["base", "scale"]);
    const spacingError = rejectUnknownKeys(raw.spacing, SPACING_ALLOWED_KEYS, {
      kind: "section",
      name: "visual.spacing",
      path: "visual.spacing",
    });
    if (spacingError) return { error: spacingError };
    const sp: NonNullable<DesignMd["visual"]["spacing"]> = {};
    // `visual.spacing.base` is a CSS length token. Strict parse: must
    // be a non-empty string with no leading / trailing whitespace,
    // and not a placeholder. The downstream design-system.yaml mirror
    // is a verbatim copy, so accepting `" 0.25rem "` here would
    // freeze padded tokens into the lock and surface as render-time
    // surprises (`padding: " 0.25rem ";` is rejected by every CSS
    // engine). Keep value-shape (rem / px / etc.) loose so authors
    // can use any CSS length unit.
    if ("base" in raw.spacing && raw.spacing.base !== undefined) {
      const baseValue = raw.spacing.base;
      if (typeof baseValue !== "string") {
        return {
          error: {
            path: "visual.spacing.base",
            code: "invalid-type",
            message: "'visual.spacing.base' must be a string.",
          },
        };
      }
      if (baseValue.length === 0 || baseValue.trim() !== baseValue) {
        return {
          error: {
            path: "visual.spacing.base",
            code: "invalid-format",
            message:
              "'visual.spacing.base' must be a non-empty string with no leading / trailing whitespace.",
          },
        };
      }
      sp.base = baseValue;
    }
    // Per `qfai-prototyping/references/design-md-spec.md`,
    // `visual.spacing.scale` is `number[]`. Mixed-type arrays
    // (`[0, "wide"]`, `["4", 8]`) are rejected at parse so an
    // invalid mirror cannot silently freeze into the lock and
    // travel to `/qfai-implement` as validated content.
    if ("scale" in raw.spacing && raw.spacing.scale !== undefined) {
      const scaleValue: unknown = raw.spacing.scale;
      if (!Array.isArray(scaleValue)) {
        return {
          error: {
            path: "visual.spacing.scale",
            code: "invalid-type",
            message: "'visual.spacing.scale' must be an array of numbers.",
          },
        };
      }
      const scaleArray: readonly unknown[] = scaleValue;
      const validated: number[] = [];
      for (let i = 0; i < scaleArray.length; i += 1) {
        const entry = scaleArray[i];
        if (typeof entry !== "number" || !Number.isFinite(entry)) {
          return {
            error: {
              path: `visual.spacing.scale[${i}]`,
              code: "invalid-type",
              message: `'visual.spacing.scale[${i}]' must be a finite number (got ${describeValueShape(entry)}).`,
            },
          };
        }
        validated.push(entry);
      }
      sp.scale = validated;
    }
    value.spacing = sp;
  }
  return { value };
}

/**
 * Diagnostic-only helper for parse-time `invalid-type` messages.
 * Used by the strict-parse paths for `visual.typography.scale` /
 * `visual.typography.weight` / `visual.spacing.scale`. Each call site
 * carries the same intent ("describe what we got, in operator-
 * readable form, when the expected primitive type was wrong"), so
 * one shared helper avoids the byte-identical duplicate-function
 * footgun where a future tweak to one would silently diverge from
 * the other.
 */
/**
 * Strict-parse a DESIGN.md `string[]` field. Returns `{ value }` on
 * success or `{ error }` when the input is not an array or contains
 * a non-string entry. Previously the parser silently filtered
 * non-strings and accepted scalars, which let malformed authoring
 * hash into the DESIGN.md lock while downstream consumers saw a
 * different brand context.
 *
 * Used by:
 *   - `audience.emotion` / `audience.do_not_look_like` (codex 8A6f)
 *   - `brand.voice` (codex 9R4e)
 *
 * The helper deliberately ignores the field's semantic role; any
 * future `string[]` field on DesignMd can call this directly.
 * codex 9vcp.
 */
function parseDesignMdStringArrayField(
  raw: unknown,
  fieldPath: string,
): { value: string[] } | { error: ParseError } {
  if (!Array.isArray(raw)) {
    return {
      error: {
        path: fieldPath,
        code: "invalid-type",
        message: `'${fieldPath}' must be a string array (got ${describeValueShape(raw)}).`,
      },
    };
  }
  const out: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const entry: unknown = raw[i];
    if (typeof entry !== "string") {
      return {
        error: {
          path: `${fieldPath}[${i}]`,
          code: "invalid-type",
          message: `'${fieldPath}[${i}]' must be a string (got ${describeValueShape(entry)}).`,
        },
      };
    }
    out.push(entry);
  }
  return { value: out };
}

function describeValueShape(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return `string ${JSON.stringify(value)}`;
  if (Array.isArray(value)) return "<array>";
  if (typeof value === "object") return "<object>";
  return `<${typeof value}>`;
}

/**
 * Strict reader for token value sections (`visual.colors`,
 * `visual.radius`, `visual.shadow`). The distributed DESIGN.md spec
 * defines these values as strings; pre-fix the historical
 * `readStringRecord` coerced numbers (`shadow.sm: 0` became `"0"`),
 * letting validate pass on a parsed token that differed from the raw
 * DESIGN.md bytes frozen in the lock. This rejects non-strings with
 * `invalid-type` at parse-time so the brand SSOT enforces the
 * contract upstream of the lock. codex AHcvm.
 */
function readStringRecordStrict(
  raw: unknown,
  sectionPath: string,
): { value: Record<string, string> } | { error: ParseError } {
  if (!isRecord(raw)) return { value: {} };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== "string") {
      return {
        error: {
          path: `${sectionPath}.${k}`,
          code: "invalid-type",
          message: `'${sectionPath}.${k}' must be a string (got ${describeValueShape(v)}).`,
        },
      };
    }
    out[k] = v;
  }
  return { value: out };
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
  // Read through `unknown` so the runtime checks below still catch
  // malformed inputs that bypassed parseDesignMd (the static type
  // promises an Archetype literal, but validateDesignMd is also called
  // defensively against reloaded JSON).
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  const name: unknown = d.brand?.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    issues.push({
      path: "brand.name",
      code: "missing-required",
      message: "'brand.name' is required (non-empty string).",
    });
  }
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  const archetype: unknown = d.brand?.archetype;
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
  // Defensive: validateDesignMd may receive runtime-malformed shapes
  // (reloaded JSON, test fixtures with deleted keys). Static types
  // promise non-nullable structure, so the next two lines look like
  // dead code per the type system; both are intentional.
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  const colors = d.visual?.colors;
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
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
    // Per the distributed DESIGN.md spec / sample, `overlay` is reserved
    // for `rgba(...)` form only — it is the only color slot that
    // expresses transparency by design. Hex (even 8-digit) is rejected
    // here so that authoring noise (e.g. `#1F2937FF`) does not leak
    // into the lock as a non-conforming overlay value.
    if (RGBA_OVERLAY_RE.test(value)) return;
    issues.push({
      path: `visual.colors.${key}`,
      code: "invalid-color-format",
      message: `Color 'overlay' must be an rgba(...) value (e.g. rgba(0,0,0,0.5)). Hex values are not allowed for overlay.`,
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
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  const typography = d.visual?.typography;
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
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
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  const radius = d.visual?.radius;
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
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
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  const shadow = d.visual?.shadow;
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
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
      continue;
    }
    // Reject leading/trailing whitespace — token values are byte-anchored.
    // Otherwise certify's box-shadow comparison can flag compliant CSS as
    // drift because the token froze a stray-whitespace variant.
    if (value !== value.trim()) {
      issues.push({
        path: `visual.shadow.${key}`,
        code: "invalid-shadow-format",
        message: `Shadow '${key}' has leading or trailing whitespace; values are byte-anchored.`,
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

// ---------------------------------------------------------------------------
// Unreplaced-sample detection
// ---------------------------------------------------------------------------

/**
 * Sentinel carried by every DESIGN.md the package ships as a sample:
 *   - `assets/init/root/DESIGN.md` (seeded into the project root by `qfai init`)
 *   - `assets/init/.qfai/assistant/skills/qfai-prototyping/templates/DESIGN.md.sample`
 *
 * The two files are the same fictional brand but are NOT byte-identical
 * (they differ in front-matter whitespace alignment), so a sha256-equality
 * guard would have to enumerate — and keep in sync — one digest per shipped
 * sample. A marker is content-addressed instead of byte-addressed: it
 * survives whitespace edits, covers both samples with one constant, and
 * keeps covering any future sample that carries it.
 *
 * The marker lives in the markdown body, so `parseDesignMd` (which only
 * reads front-matter) is unaffected: an unreplaced sample still parses and
 * validates, and is rejected by identity instead.
 */
export const DESIGN_MD_SAMPLE_MARKER = "QFAI-SAMPLE-DESIGN-MD";

/**
 * Fingerprint of the sample brand as it shipped BEFORE
 * `DESIGN_MD_SAMPLE_MARKER` existed.
 *
 * A marker-only test cannot see the installed base this gate exists to
 * rescue: `qfai init` copies the whole root asset tree create-only — every
 * existing file there is skipped, `--force` included (see
 * `src/cli/commands/init.ts`) — so a project that initialized on an older
 * release keeps its marker-less copy of `assets/init/root/DESIGN.md` even
 * across `qfai init --force`. Those projects are exactly the ones at risk
 * of freezing an unauthored brand.
 *
 * BOTH signals are required — the front-matter brand name AND the opening
 * sentence of the shipped brand-philosophy body. Requiring both keeps the
 * migration test conservative: a project that adopted the sample as a
 * starting point and then authored its own identity (renamed `brand.name`
 * OR rewrote the philosophy body) is no longer "unreplaced" and is not
 * flagged. Only a copy that still carries both halves verbatim is.
 */
const LEGACY_SAMPLE_BRAND_NAME_RE = /^\s{0,4}name:\s*["']?Acme Ledger["']?\s*$/m;
const LEGACY_SAMPLE_BODY_PHRASE = "Acme Ledger is a calm, confident financial comparison surface";

/**
 * True when `text` is still (or is derived from) a DESIGN.md the package
 * ships as a sample. Used to stop `/qfai-sdd` Phase 0 from sha256-freezing
 * an unauthored brand as the project's brand contract, and to surface the
 * same condition from `qfai validate` (QFAI-DCON-034).
 *
 * Two detectors, because the marker only covers samples seeded by releases
 * that carry it:
 *   1. `DESIGN_MD_SAMPLE_MARKER` — current samples, survives any edit that
 *      leaves the comment in place.
 *   2. Legacy content fingerprint — samples seeded before the marker
 *      existed, which `qfai init` will never overwrite.
 *
 * `text` is `unknown` rather than `string` because this is re-exported from
 * `core/index.ts` and so is reachable from untyped JavaScript, where a caller
 * can hand over the result of a read that failed or a value that was never a
 * file body. The guard below is what makes that safe; typing the parameter
 * `string` would have made it dead code that only looked defensive. Internal
 * callers pass a string and are unaffected.
 */
export function isUnreplacedDesignMdSample(text: unknown): boolean {
  if (typeof text !== "string") return false;
  if (text.includes(DESIGN_MD_SAMPLE_MARKER)) return true;
  return LEGACY_SAMPLE_BRAND_NAME_RE.test(text) && text.includes(LEGACY_SAMPLE_BODY_PHRASE);
}

/**
 * Unified surface type detection — spec-0035
 *
 * Single shared module for classifying discussion/spec packs as
 * UI-bearing or non-UI. All consumers must import from here instead
 * of performing inline detection logic.
 *
 * BR-0035-0001, BR-0035-0002, BR-0035-0003
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import { readSafe } from "../validators/utils.js";

export type SurfaceType = "web" | "mobile" | "desktop" | "cli" | "mixed" | "non-ui";

/** @deprecated Use canonical SurfaceType values (web, mobile, desktop, cli, mixed, non-ui) */
export type LegacySurfaceType = "web-ui" | "mobile-ui" | "desktop-ui";

const VALID_SURFACES = new Set<SurfaceType>([
  "web",
  "mobile",
  "desktop",
  "cli",
  "mixed",
  "non-ui",
]);

/** Surfaces that bear a user interface — canonical truth for UI-bearing detection. */
export const UI_BEARING_SURFACES = new Set<SurfaceType>(["web", "mobile", "desktop", "mixed"]);

/** Surfaces that do NOT bear a user interface. */
export const NON_UI_SURFACES = new Set<SurfaceType>(["cli", "non-ui"]);

/** Maps legacy surface names to canonical values. */
const LEGACY_SURFACE_MAP: Record<string, SurfaceType> = {
  "web-ui": "web",
  "mobile-ui": "mobile",
  "desktop-ui": "desktop",
};

/**
 * Explicit UI-bearing classification block in 01_Context.md.
 */
export type UiBearingClassification = {
  ui_bearing: boolean;
  primary_surface: SurfaceType;
  secondary_surfaces: string[];
  classification_rationale: string;
};

/** Parse the explicit UI-bearing classification block from 01_Context.md */
const UI_BEARING_RE = /^\s*-\s*ui_bearing:\s*(\S+)/im;
const PRIMARY_SURFACE_RE = /^\s*-\s*primary_surface:\s*(\S+)/im;

export function parseClassificationBlock(content: string): UiBearingClassification | null {
  const uiBearingMatch = UI_BEARING_RE.exec(content);
  if (!uiBearingMatch?.[1]) return null;

  const rawBool = uiBearingMatch[1].toLowerCase();
  if (rawBool !== "true" && rawBool !== "false") return null;
  const ui_bearing = rawBool === "true";

  const surfaceMatch = PRIMARY_SURFACE_RE.exec(content);
  const rawSurface = surfaceMatch?.[1]?.toLowerCase() ?? "";
  const primary_surface = parseSurface(rawSurface) ?? (ui_bearing ? "web" : "non-ui");

  // Parse secondary_surfaces (nested bullet list)
  const secondarySurfacesRe = /^\s*-\s*secondary_surfaces:\s*$/im;
  const secondary_surfaces: string[] = [];
  const lines = content.split("\n");
  let inSecondary = false;
  for (const line of lines) {
    if (secondarySurfacesRe.test(line)) {
      inSecondary = true;
      continue;
    }
    if (inSecondary) {
      const childMatch = /^\s{2,}-\s+(\S+)/.exec(line);
      if (childMatch?.[1] && childMatch[1] !== "[optional]") {
        secondary_surfaces.push(childMatch[1]);
      } else if (line.trim() !== "" && !childMatch) {
        inSecondary = false;
      }
    }
  }

  // Parse classification_rationale
  const rationaleRe = /^\s*-\s*classification_rationale:\s*(.+)/im;
  const rationaleMatch = rationaleRe.exec(content);
  const classification_rationale = rationaleMatch?.[1]?.trim() ?? "";

  return { ui_bearing, primary_surface, secondary_surfaces, classification_rationale };
}

const HTML_TAG_RE = /<(?:style|div|section|span|button|input|form|header|footer|nav|main|aside)\b/i;

/** Mermaid screen flow patterns with screen-like node names. */
const MERMAID_SCREEN_FLOW_RE =
  /```mermaid[\s\S]*?(?:stateDiagram|flowchart|graph)[\s\S]*?(?:Screen|Page|View|Dashboard|Login|Settings|Home)\b/i;

/** YAML-style surface declaration: `- surface: web-ui` or `- surface_type: web-ui` */
const YAML_SURFACE_RE = /^\s*-\s*surface(?:_type)?:\s*(\S+)/im;

/** Markdown table surface declaration: `| Surface Type | web-ui |` */
const TABLE_SURFACE_RE = /\|\s*Surface Type\s*\|\s*(\S+)\s*\|/i;

/** Screen contract YAML pattern. */
const SCREEN_CONTRACT_YAML_RE = /screens:\s*\n\s*-\s*route:/;

function parseSurface(raw: string): SurfaceType | undefined {
  const lower = raw.toLowerCase();
  // Check canonical values first
  if (VALID_SURFACES.has(lower as SurfaceType)) return lower as SurfaceType;
  // Fallback: map legacy values
  const mapped = LEGACY_SURFACE_MAP[lower];
  if (mapped) return mapped;
  return undefined;
}

/**
 * Detect the surface type of a spec/discussion pack.
 *
 * Priority:
 * 1. Explicit `ui_bearing` / `primary_surface` classification block in 01_Context.md
 * 2. Explicit `surface:` declaration in 01_Spec.md / 01_Context.md (YAML) or
 *    `| Surface Type | … |` in 03_Story-Workshop.md (table)
 * 3. Content heuristics (uiux/ dir, screen contracts, HTML tags, Mermaid flows) — fallback
 * 4. Default: non-ui
 */
export async function detectSurfaceType(root: string): Promise<SurfaceType> {
  // Tier 0: Explicit UI-bearing classification block in 01_Context.md
  const contextContent = await readSafe(path.join(root, "01_Context.md"));
  if (contextContent) {
    const classification = parseClassificationBlock(contextContent);
    if (classification) {
      return classification.primary_surface;
    }
  }

  // Tier 1a: Explicit YAML surface declaration
  for (const fileName of ["01_Spec.md", "01_Context.md"]) {
    const content = fileName === "01_Context.md" ? contextContent : await readSafe(path.join(root, fileName));
    const match = YAML_SURFACE_RE.exec(content);
    if (match?.[1]) {
      const surface = parseSurface(match[1]);
      if (surface) return surface;
    }
  }

  // Tier 1b: Explicit table surface declaration in 03_Story-Workshop.md
  const storyContent = await readSafe(path.join(root, "03_Story-Workshop.md"));
  if (storyContent) {
    const tableMatch = TABLE_SURFACE_RE.exec(storyContent);
    if (tableMatch?.[1]) {
      const surface = parseSurface(tableMatch[1]);
      if (surface) return surface;
    }
  }

  // Tier 2: Content heuristics (fallback)
  try {
    await readdir(path.join(root, "uiux"));
    return "web";
  } catch {
    // uiux/ doesn't exist
  }

  // Screen contract YAML in uiux/40_screen_contracts.md (canonical) or 40_contracts.md (legacy)
  for (const contractFile of ["40_screen_contracts.md", "40_contracts.md"]) {
    const contractsContent = await readSafe(path.join(root, "uiux", contractFile));
    if (contractsContent && SCREEN_CONTRACT_YAML_RE.test(contractsContent)) return "web";
  }

  // HTML tags and Mermaid screen flows in 03_Story-Workshop.md
  if (storyContent) {
    const stripped = storyContent.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
    if (HTML_TAG_RE.test(stripped)) return "web";
    if (MERMAID_SCREEN_FLOW_RE.test(storyContent)) return "web";
  }

  // Default: non-ui
  return "non-ui";
}

/**
 * Convenience: returns true when the surface type is UI-bearing.
 * Uses the canonical UI_BEARING_SURFACES set — `cli` is non-ui.
 */
export async function isUiBearingSurface(root: string): Promise<boolean> {
  const surface = await detectSurfaceType(root);
  return UI_BEARING_SURFACES.has(surface);
}

/**
 * Synchronous check: given a SurfaceType value, returns true if UI-bearing.
 * Canonical shared helper for classification validator and prototyping mode.
 */
export function isUiBearingSurfaceType(surface: SurfaceType): boolean {
  return UI_BEARING_SURFACES.has(surface);
}

/**
 * Read the explicit classification block from 01_Context.md if present.
 */
export async function readClassificationBlock(root: string): Promise<UiBearingClassification | null> {
  const content = await readSafe(path.join(root, "01_Context.md"));
  if (!content) return null;
  return parseClassificationBlock(content);
}

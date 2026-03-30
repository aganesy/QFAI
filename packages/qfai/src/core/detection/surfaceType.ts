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

export type SurfaceType = "web-ui" | "mobile-ui" | "desktop-ui" | "mixed" | "non-ui";

const VALID_SURFACES = new Set<SurfaceType>([
  "web-ui",
  "mobile-ui",
  "desktop-ui",
  "mixed",
  "non-ui",
]);

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
  const s = raw.toLowerCase() as SurfaceType;
  return VALID_SURFACES.has(s) ? s : undefined;
}

/**
 * Detect the surface type of a spec/discussion pack.
 *
 * Priority:
 * 1. Explicit `surface:` declaration in 01_Spec.md / 01_Context.md (YAML) or
 *    `| Surface Type | … |` in 03_Story-Workshop.md (table)
 * 2. Content heuristics (uiux/ dir, screen contracts, HTML tags, Mermaid flows)
 * 3. Default: non-ui
 */
export async function detectSurfaceType(root: string): Promise<SurfaceType> {
  // Tier 1a: Explicit YAML surface declaration
  for (const fileName of ["01_Spec.md", "01_Context.md"]) {
    const content = await readSafe(path.join(root, fileName));
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

  // Tier 2: Content heuristics
  try {
    await readdir(path.join(root, "uiux"));
    return "web-ui";
  } catch {
    // uiux/ doesn't exist
  }

  // Screen contract YAML in uiux/40_contracts.md
  const contractsContent = await readSafe(path.join(root, "uiux", "40_contracts.md"));
  if (contractsContent && SCREEN_CONTRACT_YAML_RE.test(contractsContent)) return "web-ui";

  // HTML tags and Mermaid screen flows in 03_Story-Workshop.md
  if (storyContent) {
    const stripped = storyContent.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
    if (HTML_TAG_RE.test(stripped)) return "web-ui";
    if (MERMAID_SCREEN_FLOW_RE.test(storyContent)) return "web-ui";
  }

  // Default: non-ui
  return "non-ui";
}

/**
 * Convenience: returns true when the surface type is UI-bearing.
 */
export async function isUiBearingSurface(root: string): Promise<boolean> {
  const surface = await detectSurfaceType(root);
  return surface !== "non-ui";
}

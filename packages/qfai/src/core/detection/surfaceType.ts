import { readdir } from "node:fs/promises";
import path from "node:path";

import {
  isCanonicalPrototypingSurface,
  requiresVisualBrowserEvidenceSurface,
} from "../domain/surface.js";
import type { CanonicalPrototypingSurface } from "../domain/surface.js";
import { readSafe } from "../validators/utils.js";

export type SurfaceType = CanonicalPrototypingSurface | "non-ui";

export const DISCUSSION_UI_BEARING_SURFACES = new Set<SurfaceType>([
  "web",
  "mobile",
  "desktop",
  "cli",
  "mixed",
]);
export const DISCUSSION_NON_UI_SURFACES = new Set<SurfaceType>(["non-ui"]);
export const VISUAL_BROWSER_SURFACES = new Set<SurfaceType>(["web", "mobile", "desktop", "mixed"]);

export type UiBearingClassification = {
  ui_bearing: boolean;
  primary_surface: SurfaceType;
  secondary_surfaces: SurfaceType[];
  classification_rationale: string;
};

export type ParsedClassificationBlock = {
  uiBearingRaw?: string;
  primarySurfaceRaw?: string;
  secondarySurfacesRaw?: string;
  classificationRationaleRaw?: string;
  uiBearing?: boolean;
  primarySurface?: SurfaceType;
  secondarySurfacesRawEntries: string[];
  secondarySurfaces: SurfaceType[];
  invalidSecondarySurfaces: string[];
  duplicateSecondarySurfaces: string[];
  classificationRationale?: string;
  missingFields: Array<
    "ui_bearing" | "primary_surface" | "secondary_surfaces" | "classification_rationale"
  >;
};

const UI_BEARING_RE = /^\s*-\s*ui_bearing:\s*(\S+)/im;
const PRIMARY_SURFACE_RE = /^\s*-\s*primary_surface:\s*(\S+)/im;
const SECONDARY_SURFACES_RE = /^\s*-\s*secondary_surfaces:\s*(.*)$/im;
const CLASSIFICATION_RATIONALE_RE = /^\s*-\s*classification_rationale:\s*(.*)$/im;

export function parseClassificationBlock(content: string): ParsedClassificationBlock | null {
  const uiBearingMatch = UI_BEARING_RE.exec(content);
  const surfaceMatch = PRIMARY_SURFACE_RE.exec(content);
  const secondaryMatch = SECONDARY_SURFACES_RE.exec(content);
  const rationaleMatch = CLASSIFICATION_RATIONALE_RE.exec(content);
  if (!uiBearingMatch && !surfaceMatch && !secondaryMatch && !rationaleMatch) {
    return null;
  }

  const missingFields: ParsedClassificationBlock["missingFields"] = [];
  const uiBearingRaw = uiBearingMatch?.[1]?.trim();
  const primarySurfaceRaw = surfaceMatch?.[1]?.trim();
  const secondarySurfacesRaw = secondaryMatch?.[1]?.trim() ?? (secondaryMatch ? "" : undefined);
  const classificationRationaleRaw =
    rationaleMatch?.[1]?.trim() ?? (rationaleMatch ? "" : undefined);

  if (!uiBearingRaw) missingFields.push("ui_bearing");
  if (!primarySurfaceRaw) missingFields.push("primary_surface");
  if (!secondaryMatch) missingFields.push("secondary_surfaces");
  if (classificationRationaleRaw === undefined) missingFields.push("classification_rationale");

  let uiBearing: boolean | undefined;
  if (uiBearingRaw === "true" || uiBearingRaw === "false") {
    uiBearing = uiBearingRaw === "true";
  }

  const primarySurface = primarySurfaceRaw ? parseSurface(primarySurfaceRaw) : undefined;
  const secondarySurfacesRawEntries: string[] = [];
  const secondarySurfaces: SurfaceType[] = [];
  const invalidSecondarySurfaces: string[] = [];
  const lines = content.split("\n");
  let inSecondary = false;
  for (const line of lines) {
    if (/^\s*-\s*secondary_surfaces:\s*$/.test(line)) {
      inSecondary = true;
      continue;
    }
    if (!inSecondary) {
      continue;
    }

    const childMatch = /^\s{2,}-\s+(\S+)/.exec(line);
    if (childMatch?.[1] && childMatch[1] !== "[optional]") {
      const rawEntry = childMatch[1].trim();
      secondarySurfacesRawEntries.push(rawEntry);
      const parsed = parseSurface(rawEntry);
      if (parsed) {
        secondarySurfaces.push(parsed);
      } else {
        invalidSecondarySurfaces.push(rawEntry);
      }
      continue;
    }
    if (line.trim() !== "") {
      inSecondary = false;
    }
  }

  const duplicateSecondarySurfaces = collectDuplicateValues(
    secondarySurfacesRawEntries.map((entry) => entry.toLowerCase()),
  );

  return {
    ...(uiBearingRaw ? { uiBearingRaw } : {}),
    ...(primarySurfaceRaw ? { primarySurfaceRaw } : {}),
    ...(secondarySurfacesRaw !== undefined ? { secondarySurfacesRaw } : {}),
    ...(classificationRationaleRaw !== undefined ? { classificationRationaleRaw } : {}),
    ...(uiBearing !== undefined ? { uiBearing } : {}),
    ...(primarySurface ? { primarySurface } : {}),
    secondarySurfacesRawEntries,
    secondarySurfaces,
    invalidSecondarySurfaces,
    duplicateSecondarySurfaces,
    ...(classificationRationaleRaw !== undefined && classificationRationaleRaw.length > 0
      ? { classificationRationale: classificationRationaleRaw }
      : {}),
    missingFields,
  };
}

const HTML_TAG_RE = /<(?:style|div|section|span|button|input|form|header|footer|nav|main|aside)\b/i;
const MERMAID_SCREEN_FLOW_RE =
  /```mermaid[\s\S]*?(?:stateDiagram|flowchart|graph)[\s\S]*?(?:Screen|Page|View|Dashboard|Login|Settings|Home)\b/i;
const YAML_SURFACE_RE = /^\s*-\s*surface(?:_type)?:\s*(\S+)/im;
const TABLE_SURFACE_RE = /\|\s*Surface Type\s*\|\s*(\S+)\s*\|/i;
const SCREEN_CONTRACT_YAML_RE = /screens:\s*\n\s*-\s*route:/;

function parseSurface(raw: string): SurfaceType | undefined {
  const lower = raw.trim().toLowerCase();
  return lower === "non-ui" || isCanonicalPrototypingSurface(lower) ? lower : undefined;
}

export async function detectSurfaceType(root: string): Promise<SurfaceType> {
  const contextContent = await readSafe(path.join(root, "01_Context.md"));
  if (contextContent) {
    const classification = parseClassificationBlock(contextContent);
    if (classification?.primarySurface) {
      return classification.primarySurface;
    }
  }

  for (const fileName of ["01_Spec.md", "01_Context.md"]) {
    const content =
      fileName === "01_Context.md" ? contextContent : await readSafe(path.join(root, fileName));
    const match = YAML_SURFACE_RE.exec(content);
    if (match?.[1]) {
      const surface = parseSurface(match[1]);
      if (surface) {
        return surface;
      }
    }
  }

  const storyContent = await readSafe(path.join(root, "03_Story-Workshop.md"));
  if (storyContent) {
    const tableMatch = TABLE_SURFACE_RE.exec(storyContent);
    if (tableMatch?.[1]) {
      const surface = parseSurface(tableMatch[1]);
      if (surface) {
        return surface;
      }
    }
  }

  try {
    await readdir(path.join(root, "uiux"));
    return "web";
  } catch {
    // ignore
  }

  const contractsContent = await readSafe(path.join(root, "uiux", "40_screen_contracts.md"));
  if (contractsContent && SCREEN_CONTRACT_YAML_RE.test(contractsContent)) {
    return "web";
  }

  if (storyContent) {
    const stripped = storyContent.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
    if (HTML_TAG_RE.test(stripped) || MERMAID_SCREEN_FLOW_RE.test(storyContent)) {
      return "web";
    }
  }

  return "non-ui";
}

export async function isDiscussionUiBearingPack(root: string): Promise<boolean> {
  const surface = await detectSurfaceType(root);
  return isDiscussionUiBearingSurfaceType(surface);
}

export function isDiscussionUiBearingSurfaceType(surface: SurfaceType): boolean {
  return DISCUSSION_UI_BEARING_SURFACES.has(surface);
}

export function isNonUiDiscussionSurface(surface: SurfaceType): boolean {
  return DISCUSSION_NON_UI_SURFACES.has(surface);
}

export function requiresVisualBrowserEvidence(surface: SurfaceType): boolean {
  return surface !== "non-ui" && requiresVisualBrowserEvidenceSurface(surface);
}

export async function readClassificationBlock(
  root: string,
): Promise<UiBearingClassification | null> {
  const content = await readSafe(path.join(root, "01_Context.md"));
  if (!content) {
    return null;
  }
  const parsed = parseClassificationBlock(content);
  if (
    !parsed?.uiBearingRaw ||
    !parsed.primarySurface ||
    parsed.secondarySurfacesRaw === undefined ||
    parsed.classificationRationaleRaw === undefined ||
    parsed.uiBearing === undefined ||
    parsed.invalidSecondarySurfaces.length > 0 ||
    parsed.duplicateSecondarySurfaces.length > 0
  ) {
    return null;
  }
  return {
    ui_bearing: parsed.uiBearing,
    primary_surface: parsed.primarySurface,
    secondary_surfaces: parsed.secondarySurfaces,
    classification_rationale: parsed.classificationRationale ?? "",
  };
}

function collectDuplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }
    seen.add(value);
  }
  return [...duplicates].sort((left, right) => left.localeCompare(right));
}

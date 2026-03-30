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

/**
 * Detect the surface type of a spec/discussion pack.
 *
 * Priority:
 * 1. Explicit `surface:` declaration in 01_Spec.md or 01_Context.md
 * 2. Content heuristics (uiux/ dir, HTML tags, Mermaid screen flows)
 * 3. Default: non-ui
 */
export async function detectSurfaceType(root: string): Promise<SurfaceType> {
  // Tier 1: Explicit surface declaration
  for (const fileName of ["01_Spec.md", "01_Context.md"]) {
    const content = await readSafe(path.join(root, fileName));
    const match = /^\s*-\s*surface(?:_type)?:\s*(\S+)/im.exec(content);
    if (match?.[1]) {
      const surface = match[1].toLowerCase() as SurfaceType;
      if (VALID_SURFACES.has(surface)) return surface;
    }
  }

  // Tier 2: Content heuristics
  try {
    await readdir(path.join(root, "uiux"));
    return "web-ui";
  } catch {
    // uiux/ doesn't exist
  }

  // Check for HTML content signals in story workshop
  const storyContent = await readSafe(path.join(root, "03_Story-Workshop.md"));
  if (storyContent) {
    // Strip code blocks
    const stripped = storyContent.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
    if (HTML_TAG_RE.test(stripped)) return "web-ui";
  }

  // Default: non-ui
  return "non-ui";
}

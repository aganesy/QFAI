/**
 * UIX-VAL UI-bearing spec detection.
 *
 * Implements the two-tier detection model from spec-0027:
 * 1. Primary SSOT: explicit `surface:` declaration in 01_Spec.md
 * 2. Fallback: content signals (Mermaid screen flows, uiux/ dir, screen contracts)
 *
 * Negative overrides: HTML/code tags inside fenced code blocks or inline code
 * are excluded from content signal detection.
 *
 * BR-0027-0001, BR-0027-0002, BR-0027-0012
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import { readSafe } from "./utils.js";

// Surface types that classify as UI-bearing (BR-0027-0001)
const UI_BEARING_SURFACES = new Set(["web-ui", "mobile-ui", "desktop-ui", "mixed"]);
const NON_UI_SURFACES = new Set(["non-ui"]);

/**
 * Strip fenced code blocks (```...```) and inline code (`...`) from markdown
 * to prevent false positive detection of HTML tags in code examples.
 */
function stripCodeBlocks(content: string): string {
  // Remove fenced code blocks first (greedy within blocks)
  let stripped = content.replace(/```[\s\S]*?```/g, "");
  // Remove inline code
  stripped = stripped.replace(/`[^`]+`/g, "");
  return stripped;
}

/**
 * HTML tag patterns that indicate UI-bearing content (outside code blocks).
 */
const HTML_TAG_RE =
  /<(?:style|div|section|span|button|input|form|header|footer|nav|main|aside)\b/i;

/**
 * Mermaid screen flow patterns — stateDiagram with screen-like node names.
 * Only matches when screen-flow labels (Screen, Page, View, Dashboard, Login, etc.) are present.
 */
const MERMAID_SCREEN_FLOW_RE =
  /```mermaid[\s\S]*?(?:stateDiagram)[\s\S]*?(?:Screen|Page|View|Dashboard|Login|Settings|Home)\b/i;

/**
 * Screen contract YAML pattern in uiux/40_contracts.md.
 */
const SCREEN_CONTRACT_YAML_RE = /screens:\s*\n\s*-\s*route:/;

/**
 * Determine if a spec/discussion pack is UI-bearing using two-tier detection.
 *
 * Tier 1 (Primary SSOT): Read `01_Spec.md` for explicit `surface:` field.
 * Tier 2 (Fallback): If no explicit surface, check content signals.
 *
 * @param root - Root directory of the spec or discussion pack
 * @returns true if UI-bearing, false otherwise
 */
export async function isUiBearingSpec(root: string): Promise<boolean> {
  // Tier 1: Explicit surface classification
  const specContent = await readSafe(path.join(root, "01_Spec.md"));
  const surfaceMatch = /^\s*-\s*surface:\s*(\S+)/im.exec(specContent);

  if (surfaceMatch?.[1]) {
    const surface = surfaceMatch[1].toLowerCase();
    if (UI_BEARING_SURFACES.has(surface)) return true;
    if (NON_UI_SURFACES.has(surface)) return false;
    // Unknown surface value — fall through to content signals
  }

  // Tier 2: Fallback content signals (only when no explicit surface)

  // Signal 1: uiux/ directory presence (even if empty)
  try {
    await readdir(path.join(root, "uiux"));
    return true;
  } catch {
    // uiux/ doesn't exist — continue checking other signals
  }

  // Signal 2: Screen contract YAML in uiux/40_contracts.md
  const contractsContent = await readSafe(path.join(root, "uiux", "40_contracts.md"));
  if (contractsContent && SCREEN_CONTRACT_YAML_RE.test(contractsContent)) return true;

  // Signal 3: Narrative HTML tags and Mermaid screen flows in 03_Story-Workshop.md
  const storyContent = await readSafe(path.join(root, "03_Story-Workshop.md"));
  if (storyContent) {
    // Strip code blocks/inline code to prevent false positives (BR-0027-0002)
    const stripped = stripCodeBlocks(storyContent);
    if (HTML_TAG_RE.test(stripped)) return true;

    // Mermaid screen flow — check original content (```mermaid blocks are the signal)
    if (MERMAID_SCREEN_FLOW_RE.test(storyContent)) return true;
  }

  return false;
}

import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

const EXPLORATION_SECTIONS = [
  "product_intent",
  "product intent",
  "brand_signals",
  "brand signals",
  "anti_goals",
  "anti-goals",
  "axes",
  "information architecture",
  "informationarchitecture",
  "navigation flow",
  "navigationflow",
  "usability",
  "functionality",
  "good critique examples",
  "good critique",
  "best-of-history summary",
] as const;

const LEGACY_FOUR_AXIS_SECTIONS = [
  "consistency",
  "accessibility",
  "delight",
  "craft",
  "originality",
  "design quality",
];

// Brand-level inputs (product intent / brand signals / anti-goals / reference
// pool) now live in root DESIGN.md and are validated separately via
// designContractReadiness. The legacy `33_exploration_rubric.md` and
// `34_evaluator_calibration.md` sidecars were removed when DESIGN.md
// became the brand SSOT and the evaluator axes were fixed in
// `core/prototyping/evaluatorReview.ts` (`ORDINAL_AXES`); they are no
// longer shipped by `qfai init`. Only screen-level UX sidecars remain
// in the required family.
const CANONICAL_REQUIRED_SIDECAR_FILES = [
  "00_index.md",
  "40_screen_contracts.md",
  "50_review_input_bundle.md",
] as const;

/**
 * Sidecar filenames `qfai validate` rejects under `uiux/`.
 *
 * Exported so the shipped-template sweep in
 * `tests/integration/discussionSkillTemplateIntegration.test.ts` can check its
 * representative filenames against this list rather than keeping a second,
 * hand-maintained copy that silently falls behind.
 */
export const FORBIDDEN_LEGACY_PATTERNS = [
  /^30_.*comparison.*\.md$/i,
  /^31_.*anchor.*\.md$/i,
  // 33_exploration_rubric.md / 34_evaluator_calibration.md were retired
  // when DESIGN.md became the brand SSOT and the evaluator axes were
  // fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`. They
  // are no longer in the canonical family AND must not be created by
  // operators following stale docs.
  /^3[34]_.*\.md$/i,
  /^1[0-2]_.*(?:strategy|taste|system).*\.md$/i,
  /^2[0-4]_.*(?:eval|axis|aggregate|override).*\.md$/i,
  /^40_contracts\.md$/i,
  /^50_review_bundle\.md$/i,
  /^60_critique_loop\.md$/i,
];

function threeLayerIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "canonical",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

function extractHeadings(content: string): string[] {
  return content
    .split("\n")
    .map((line) => /^##\s+(.+)$/.exec(line)?.[1]?.trim().toLowerCase() ?? "")
    .filter(Boolean);
}

export async function validateThreeLayerModel(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const issues: Issue[] = [];
  for (const sidecar of CANONICAL_REQUIRED_SIDECAR_FILES) {
    const content = await readSafe(path.join(root, "uiux", sidecar));
    if (!content) {
      continue;
    }

    const headings = extractHeadings(content);
    const hasExplorationStructure = headings.some((heading) =>
      EXPLORATION_SECTIONS.some((section) => heading.includes(section)),
    );
    const legacySections = headings.filter((heading) =>
      LEGACY_FOUR_AXIS_SECTIONS.includes(heading),
    );
    const relPath = `uiux/${sidecar}`;

    if (hasExplorationStructure && legacySections.length > 0) {
      issues.push(
        threeLayerIssue(
          "UIX-VAL-3LAYER-MIXED-FORMAT",
          `Inconsistent exploration-first sidecar: mixed exploration headings and legacy evaluation headings found in ${relPath}.`,
          "error",
          relPath,
          "Remove legacy evaluation headings and keep exploration-first sections only.",
        ),
      );
      continue;
    }

    if (legacySections.length > 0) {
      issues.push(
        threeLayerIssue(
          "UIX-VAL-3LAYER-LEGACY-FORMAT",
          `Legacy evaluation headings are not allowed in ${relPath}; use exploration brief, rubric, calibration, and screen contracts instead.`,
          "error",
          relPath,
          "Replace legacy evaluation headings with exploration-first sidecar content.",
        ),
      );
    }
  }

  return issues;
}

export async function validateForbiddenLegacyFiles(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  let entries: string[] = [];
  try {
    entries = await readdir(path.join(root, "uiux"));
  } catch {
    return [];
  }

  return entries
    .filter((entry) => FORBIDDEN_LEGACY_PATTERNS.some((pattern) => pattern.test(entry)))
    .map((entry) =>
      threeLayerIssue(
        "UIX-VAL-3LAYER-FORBIDDEN-FILE",
        `Forbidden legacy file detected: uiux/${entry}. This file is no longer part of the exploration-first canonical family.`,
        "error",
        `uiux/${entry}`,
        `Remove uiux/${entry} and migrate content into the exploration-first artifact family.`,
      ),
    );
}

export async function validateThreeLayerFamilyCompleteness(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // `00_index.md` is the first entry of the required family, so it is reported
  // by the loop like any other member. Reading it up front and returning clean
  // on absence made the gate unable to report the very file it triggered on —
  // and disabled the checks for the other two members along with it.
  // `isUiBearingSpec` above is what scopes this check.
  const issues: Issue[] = [];
  for (const required of CANONICAL_REQUIRED_SIDECAR_FILES) {
    const content = await readSafe(path.join(root, "uiux", required));
    if (!content) {
      issues.push(
        threeLayerIssue(
          "UIX-VAL-3LAYER-INCOMPLETE-FAMILY",
          `Required canonical sidecar file missing: uiux/${required}.`,
          "error",
          `uiux/${required}`,
          `Create uiux/${required} using the exploration-first template.`,
        ),
      );
    }
  }
  return issues;
}

export const validateCanonicalSidecarFamilyCompleteness = validateThreeLayerFamilyCompleteness;

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isUiBearingSurface } from "../detection/surfaceType.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue, IssueSeverity } from "../types.js";
import { issue, readSafe } from "./utils.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_STATES = ["default", "loading", "empty", "error"] as const;

const COMPETITIVE_REF_FIELDS = ["adopted_points", "rejected_points", "local_translation"] as const;

const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|na|xxx|\?\?\?|placeholder)$/i;

const DDH_SIDECAR_PRIMARY_TRUTH = "UIX-VAL-DDH-SIDECAR-PRIMARY-TRUTH";
const DDH_OPTION_COMPARISON = "UIX-VAL-DDH-OPTION-COMPARISON";
const DDH_SELECTED_DIRECTION = "UIX-VAL-DDH-SELECTED-DIRECTION";
const DDH_COMPETITIVE_REFERENCES = "UIX-VAL-DDH-COMPETITIVE-REFERENCES";
const DDH_INTERACTION_HANDOFF = "UIX-VAL-DDH-INTERACTION-HANDOFF";
const DDH_STATE_COVERAGE = "UIX-VAL-DDH-STATE-COVERAGE";
const DDH_DESIGN_ANTI_GOALS = "UIX-VAL-DDH-DESIGN-ANTI-GOALS";
const DDH_TREND_REVIEW_FOCUS = "UIX-VAL-DDH-TREND-REVIEW-FOCUS";

// ---------------------------------------------------------------------------
// isUiBearing
// ---------------------------------------------------------------------------

/**
 * Determine if a discussion pack is UI-bearing.
 *
 * Delegates to the shared surface type detection module (spec-0035).
 * Returns false on missing file (safe-side fallback via shared module default).
 */
export async function isUiBearing(packRoot: string): Promise<boolean> {
  return isUiBearingSurface(packRoot);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === "" || PLACEHOLDER_RE.test(trimmed);
}

function canonicalIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  rule: string,
): Issue {
  return issue(code, message, severity, file, rule, undefined, "canonical");
}

/**
 * Extract a ## section body from markdown content.
 */
function extractH2Section(content: string, heading: string): string | null {
  const idx = content.indexOf(`## ${heading}`);
  if (idx === -1) return null;
  const start = idx + `## ${heading}`.length;
  const remainder = content.slice(start);
  const nextH2 = remainder.search(/\n## (?!#)/);
  return nextH2 === -1 ? remainder : remainder.slice(0, nextH2);
}

/**
 * Extract a ### subsection body from a parent section.
 */
function extractSubsection(section: string, name: string): string | null {
  const heading = `### ${name}`;
  const idx = section.indexOf(heading);
  if (idx === -1) return null;
  const start = idx + heading.length;
  const remainder = section.slice(start);
  const nextH3 = remainder.search(/\n### /);
  const body = nextH3 === -1 ? remainder : remainder.slice(0, nextH3);
  return body.trim();
}

/**
 * Extract option names from a comparison section.
 * Matches lines like "- **Option A**: ..." and returns ["Option A", "Option B", ...].
 */
function extractOptionNames(section: string): string[] {
  return section
    .split("\n")
    .filter((l) => /^\s*-\s+\*\*Option\b/i.test(l))
    .map((l) => {
      const m = /\*\*(.+?)\*\*/.exec(l);
      return m ? (m[1] ?? "").trim() : "";
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Discussion hardening: Sidecar family primary truth
// ---------------------------------------------------------------------------

/**
 * Validate that a UI-bearing pack has the sidecar family as primary truth.
 * Checks that the uiux/ directory is present and contains the canonical files.
 */
export async function validateSidecarPrimaryTruth(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Check that uiux/ directory has key canonical files
  const canonicalFiles = [
    "uiux/10_implementation_strategy.md",
    "uiux/30_option_comparison.md",
    "uiux/31_selected_anchor_screen.md",
    "uiux/40_screen_contracts.md",
    "uiux/50_review_input_bundle.md",
  ];
  for (const relPath of canonicalFiles) {
    const content = await readSafe(path.join(packRoot, relPath));
    if (!content) {
      issues.push(
        canonicalIssue(
          DDH_SIDECAR_PRIMARY_TRUTH,
          `Sidecar primary truth: ${relPath} not found or empty. UI-bearing packs require the canonical sidecar family`,
          "error",
          relPath,
          "ddh.sidecarPrimaryTruth",
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Discussion hardening: Option comparison
// ---------------------------------------------------------------------------

/**
 * Validate that 30_option_comparison.md contains at least 2 distinct design options.
 */
export async function validateOptionComparison(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const comparisonPath = path.join(packRoot, "uiux", "30_option_comparison.md");
  const content = await readSafe(comparisonPath);
  if (!content) {
    issues.push(
      canonicalIssue(
        DDH_OPTION_COMPARISON,
        "Option Comparison: 30_option_comparison.md not found. Create the file with at least 2 design options",
        "error",
        "uiux/30_option_comparison.md",
        "ddh.optionComparison.missing",
      ),
    );
    return issues;
  }

  // Count distinct option entries in the entire file
  const optionNames = extractOptionNames(content);
  const uniqueOptions = new Set(optionNames);
  if (uniqueOptions.size < 2) {
    issues.push(
      canonicalIssue(
        DDH_OPTION_COMPARISON,
        `Option Comparison: found ${uniqueOptions.size} distinct option(s) in 30_option_comparison.md, minimum 2 required. Add at least 2 distinct design options`,
        "error",
        "uiux/30_option_comparison.md",
        "ddh.optionComparison",
      ),
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Discussion hardening: Selected direction
// ---------------------------------------------------------------------------

/**
 * Validate that 31_selected_anchor_screen.md contains the selected option
 * and rationale. Direction selection has moved from 30 to 31.
 */
export async function validateSelectedDirection(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const anchorPath = path.join(packRoot, "uiux", "31_selected_anchor_screen.md");
  const content = await readSafe(anchorPath);
  if (!content) {
    issues.push(
      canonicalIssue(
        DDH_SELECTED_DIRECTION,
        "Selected Anchor: 31_selected_anchor_screen.md not found or empty. Create the file with selected_option, why_selected, and rejected/deferred options",
        "error",
        "uiux/31_selected_anchor_screen.md",
        "ddh.selectedDirection",
      ),
    );
    return issues;
  }

  if (!/selected_option\s*:/i.test(content)) {
    issues.push(
      canonicalIssue(
        DDH_SELECTED_DIRECTION,
        "Selected Anchor: selected_option field not found in 31_selected_anchor_screen.md",
        "error",
        "uiux/31_selected_anchor_screen.md",
        "ddh.selectedDirection.noOption",
      ),
    );
  }

  if (!/why_selected\s*:/i.test(content)) {
    issues.push(
      canonicalIssue(
        DDH_SELECTED_DIRECTION,
        "Selected Anchor: why_selected field not found in 31_selected_anchor_screen.md",
        "error",
        "uiux/31_selected_anchor_screen.md",
        "ddh.selectedDirection.noRationale",
      ),
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Discussion hardening: Competitive references
// ---------------------------------------------------------------------------

/**
 * Validate that each competitive reference entry in 04_Sources.md contains
 * adopted_points, rejected_points, and local_translation with substantive content.
 * BR-0023-0007: Placeholder values treated as missing.
 *
 * Fix #4: Blocks within the Competitive Reference Registry section that have
 * a ### heading but zero mandatory fields are also flagged as errors.
 */
export async function validateCompetitiveRefs(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const sourcesPath = path.join(packRoot, "04_Sources.md");
  const content = await readSafe(sourcesPath);
  if (!content) return issues;

  // Scope to the Competitive Reference Registry section (regex for heading variants)
  const registryHeadingRe = /^##\s+Competitive Reference Registry\b.*$/m;
  const registryMatch = registryHeadingRe.exec(content);
  if (!registryMatch) return issues;

  const afterHeading = content.slice(registryMatch.index + registryMatch[0].length);
  const nextH2 = afterHeading.search(/\n## (?!#)/);
  const registrySection = nextH2 === -1 ? afterHeading : afterHeading.slice(0, nextH2);

  // Split into reference blocks by ### headings
  const blocks = registrySection.split(/(?=^### )/m).filter((b) => b.trim());

  for (const block of blocks) {
    if (!/^### /m.test(block)) continue;

    const referenceMatch = /^\s*-\s+reference\s*:\s*(.*)$/im.exec(block);
    if (!referenceMatch?.[1] || isPlaceholder(referenceMatch[1])) {
      issues.push(
        canonicalIssue(
          DDH_COMPETITIVE_REFERENCES,
          "Competitive Reference: 'reference' is required for each entry and must not be placeholder content.",
          "error",
          "04_Sources.md",
          "ddh.competitiveRefs.reference",
        ),
      );
    }

    for (const field of COMPETITIVE_REF_FIELDS) {
      const fieldRe = new RegExp(`^\\s*-\\s+${field}\\s*:[ \\t]*(.*)$`, "m");
      const match = fieldRe.exec(block);

      if (!match) {
        issues.push(
          canonicalIssue(
            DDH_COMPETITIVE_REFERENCES,
            `Competitive Reference: '${field}' is missing. Add ${field} describing ${fieldGuidance(field)}`,
            "error",
            "04_Sources.md",
            `ddh.competitiveRefs.${field}`,
          ),
        );
      } else {
        const value = (match[1] ?? "").trim();
        if (isPlaceholder(value)) {
          issues.push(
            canonicalIssue(
              DDH_COMPETITIVE_REFERENCES,
              `Competitive Reference: '${field}' contains a placeholder value ('${value}'). Replace with substantive content describing ${fieldGuidance(field)}`,
              "error",
              "04_Sources.md",
              `ddh.competitiveRefs.${field}.placeholder`,
            ),
          );
        }
      }
    }
  }

  return issues;
}

export async function validateTrendReviewFocus(packRoot: string): Promise<Issue[]> {
  const bundlePath = path.join(packRoot, "uiux", "50_review_input_bundle.md");
  const content = await readSafe(bundlePath);
  if (!content) return [];
  if (!/^##\s+Trend-derived review focus\b/im.test(content)) {
    return [
      canonicalIssue(
        DDH_TREND_REVIEW_FOCUS,
        "Review Input Bundle is missing the required 'Trend-derived review focus' section.",
        "error",
        "uiux/50_review_input_bundle.md",
        "ddh.trendReviewFocus",
      ),
    ];
  }
  return [];
}

function fieldGuidance(field: string): string {
  switch (field) {
    case "adopted_points":
      return "what was adopted from this reference and why";
    case "rejected_points":
      return "what was not adopted and why";
    case "local_translation":
      return "how the adopted points were adapted for this project";
    default:
      return "the relevant details";
  }
}

// ---------------------------------------------------------------------------
// Discussion hardening: Primary action handoff clarity
// ---------------------------------------------------------------------------

/**
 * Validate that 03_Story-Workshop.md Behavior Obligations makes the primary task or
 * primary action handoff readable from Interaction Contracts or compatible legacy wording.
 * BR-0023-0007: Placeholder values treated as missing.
 */
export async function validateInteractionPriorityHandoff(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  if (!content) return issues;

  // Look in Behavior Obligations section first, then fall back to full content
  const behaviorSection = extractH2Section(content, "Behavior Obligations");
  const searchContent = behaviorSection ?? content;

  const interactionContracts = extractSubsection(searchContent, "Interaction Contracts");
  const actionHandoffContent = interactionContracts ?? searchContent;
  const meaningfulActionHandoff = actionHandoffContent
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line !== "" &&
        !/^\|\s*[-:| ]+\|?$/.test(line) &&
        !/^\|\s*(primary task|key action|priority hint|expected result|error handling)\b/i.test(
          line,
        ),
    )
    .join("\n");
  // Canonical interaction signals (current v1.7.14 naming only)
  const signalsMainAction =
    /\bprimary\s+(?:task|action|operation)\b/i.test(meaningfulActionHandoff) ||
    /\bkey\s+(?:action|actions|operation|operations)\b/i.test(meaningfulActionHandoff) ||
    /\baction\s+priority\b/i.test(meaningfulActionHandoff) ||
    /\bpriority\s+hint\b/i.test(meaningfulActionHandoff) ||
    /^\|[^|\n]+?\|[^|\n]+?\|\s*(?:primary|high|main|p0)\s*\|/im.test(actionHandoffContent) ||
    /\bpriority\b[\s|:;-]{0,16}(?:primary|high|p0|main)\b/i.test(meaningfulActionHandoff);

  if (!actionHandoffContent || !signalsMainAction) {
    issues.push(
      canonicalIssue(
        DDH_INTERACTION_HANDOFF,
        "Interaction Contracts: the primary task or primary action handoff is unclear. Add a primary task, key action, or interaction priority hint, and hand off screen contract details to uiux/40_screen_contracts.md",
        "error",
        "03_Story-Workshop.md",
        "ddh.primaryAction.missing",
      ),
    );
    return issues;
  }

  // Canonical labels only for placeholder detection
  const placeholderLine = meaningfulActionHandoff
    .split("\n")
    .find((line) =>
      /\b(?:primary\s+(?:task|action|operation)|key\s+(?:action|operation)|priority(?:\s+hint)?)\b/i.test(
        line,
      ),
    );
  if (placeholderLine) {
    const placeholderValue = placeholderLine
      .replace(/^[-|\s]*/g, "")
      .replace(
        /^(?:primary\s+(?:task|action|operation)|key\s+(?:action|operation)|priority(?:\s+hint)?)\s*:\s*/i,
        "",
      )
      .replace(/\|/g, " ")
      .trim();
    if (isPlaceholder(placeholderValue)) {
      issues.push(
        canonicalIssue(
          DDH_INTERACTION_HANDOFF,
          "Interaction Contracts: the primary task or action handoff contains a placeholder value. Replace it with the actual primary task, key action, or interaction priority hint and keep screen contract details in uiux/40_screen_contracts.md",
          "error",
          "03_Story-Workshop.md",
          "ddh.primaryAction.placeholder",
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Discussion hardening: State coverage
// ---------------------------------------------------------------------------

/**
 * Validate that 03_Story-Workshop.md provides state-risk discovery and clearly hands off
 * the required state contract to uiux/40_screen_contracts.md. Canonical enforcement of the
 * four required states lives in screenContract.ts.
 */
export async function validateStateCoverage(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  if (!content) return issues;

  // Look in Behavior Obligations section
  const behaviorSection = extractH2Section(content, "Behavior Obligations");
  const searchContent = behaviorSection ?? content;

  const stateSection = extractSubsection(searchContent, "State Coverage");
  if (stateSection === null) {
    issues.push(
      canonicalIssue(
        DDH_STATE_COVERAGE,
        "State Coverage: state-risk discovery or contract handoff is missing. Add state risk notes and point the final required_states contract to uiux/40_screen_contracts.md",
        "error",
        "03_Story-Workshop.md",
        "ddh.stateCoverage.handoffMissing",
      ),
    );
    return issues;
  }

  const hasStateSignal =
    /\bstate\b/i.test(stateSection) ||
    REQUIRED_STATES.some((state) => new RegExp(`\\b${state}\\b`, "i").test(stateSection));
  const hasRiskSignal = /\b(risk|failure|empty|loading|error|fallback|retry|trigger)\b/i.test(
    stateSection,
  );
  const hasContractHandoff =
    /uiux\/40_screen_contracts\.md/i.test(stateSection) ||
    /\brequired_states\b/i.test(stateSection);

  if (!hasStateSignal || !hasRiskSignal || !hasContractHandoff) {
    issues.push(
      canonicalIssue(
        DDH_STATE_COVERAGE,
        "State Coverage: state-risk discovery is incomplete or the handoff to uiux/40_screen_contracts.md is not explicit. Add state risks and note that required_states is finalized in uiux/40_screen_contracts.md",
        "error",
        "03_Story-Workshop.md",
        "ddh.stateCoverage.handoffQuality",
      ),
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Discussion hardening: Design anti-goals
// ---------------------------------------------------------------------------

/**
 * Validate that at least 1 design anti-goal is defined.
 * Checks Behavior Obligations in 03_Story-Workshop.md or sidecar 30_option_comparison.md.
 * BR-0023-0007: Placeholder values treated as missing.
 */
export async function validateDesignAntiGoals(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Check 03_Story-Workshop.md Behavior Obligations first
  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const storyContent = await readSafe(storyPath);

  let antiGoalSection: string | null = null;
  let sourceFile = "03_Story-Workshop.md";

  if (storyContent) {
    const behaviorSection = extractH2Section(storyContent, "Behavior Obligations");
    if (behaviorSection) {
      antiGoalSection = extractSubsection(behaviorSection, "Design Anti-goals");
    }
  }

  // Fall back to 30_option_comparison.md or 31_selected_anchor_screen.md
  if (antiGoalSection === null) {
    for (const sidecarFile of ["30_option_comparison.md", "31_selected_anchor_screen.md"]) {
      const sidecarPath = path.join(packRoot, "uiux", sidecarFile);
      const sidecarContent = await readSafe(sidecarPath);
      if (sidecarContent) {
        antiGoalSection =
          extractH2Section(sidecarContent, "Design Anti-goals") ??
          extractSubsection(sidecarContent, "Design Anti-goals");
        if (antiGoalSection !== null) {
          sourceFile = `uiux/${sidecarFile}`;
          break;
        }
      }
    }
  }

  if (antiGoalSection === null || isPlaceholder(antiGoalSection)) {
    issues.push(
      canonicalIssue(
        DDH_DESIGN_ANTI_GOALS,
        "Design Anti-goals: no anti-goals defined, minimum 1 required. Add '- Anti-goal: [pattern to avoid and reason]'",
        "error",
        sourceFile,
        "ddh.designAntiGoals.missing",
      ),
    );
    return issues;
  }

  // Check for at least one non-placeholder list item
  const listItems = antiGoalSection
    .split("\n")
    .filter((l) => /^\s*-\s+/.test(l))
    .filter((l) => {
      const item = l.replace(/^\s*-\s+/, "");
      const value = item.replace(/^Anti-?goal\s*:\s*/i, "");
      return !isPlaceholder(value) && !isPlaceholder(item);
    });
  if (listItems.length === 0) {
    issues.push(
      canonicalIssue(
        DDH_DESIGN_ANTI_GOALS,
        "Design Anti-goals: no anti-goals defined, minimum 1 required. Add '- Anti-goal: [pattern to avoid and reason]'",
        "error",
        sourceFile,
        "ddh.designAntiGoals.missing",
      ),
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Main entry point for discussion design hardening validators.
 * Called from validate.ts orchestrator.
 *
 * v1.7.14: Rewritten for sidecar-first model.
 * - Sidecar family primary truth
 * - Option comparison (30_option_comparison.md)
 * - Selected direction (30_option_comparison.md)
 * - Competitive references (04_Sources.md)
 * - Primary action handoff clarity (Behavior Obligations discovery surface)
 * - State handoff quality (Behavior Obligations -> 40_screen_contracts.md SSOT)
 * - Design anti-goals (Behavior Obligations or sidecar)
 *
 * Only runs on UI-bearing packs (DR-0042). Non-UI packs return empty array (BR-0023-0002).
 * All diagnostics use severity "error" (DR-0045).
 */
export async function validateDiscussionDesignHardening(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const discussionDir = path.join(root, config.paths.discussionDir);
  const packRoot = await findLatestDiscussionPackDir(discussionDir);
  if (!packRoot) return [];

  // DR-0042: Only run on UI-bearing packs
  const uiBearing = await isUiBearing(packRoot);
  if (!uiBearing) return [];

  // Run all validators and collect issues
  const issues: Issue[] = [];
  issues.push(...(await validateSidecarPrimaryTruth(packRoot)));
  issues.push(...(await validateOptionComparison(packRoot)));
  issues.push(...(await validateSelectedDirection(packRoot)));
  issues.push(...(await validateCompetitiveRefs(packRoot)));
  issues.push(...(await validateInteractionPriorityHandoff(packRoot)));
  issues.push(...(await validateStateCoverage(packRoot)));
  issues.push(...(await validateDesignAntiGoals(packRoot)));
  issues.push(...(await validateTrendReviewFocus(packRoot)));

  return issues;
}

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isUiBearingSurface } from "../detection/surfaceType.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_STATES = ["default", "loading", "empty", "error"] as const;

const COMPETITIVE_REF_FIELDS = ["adopted_points", "rejected_points", "local_translation"] as const;

const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|na|xxx|\?\?\?|placeholder)$/i;

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
// QFAI-DDP-019: Sidecar Family Primary Truth
// ---------------------------------------------------------------------------

/**
 * Validate that a UI-bearing pack has the sidecar family as primary truth.
 * Checks that the uiux/ directory is present and contains the canonical files.
 */
export async function validateSidecarPrimaryTruth(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Check that uiux/ directory has key canonical files
  const canonicalFiles = ["uiux/10_strategy.md", "uiux/30_comparison.md", "uiux/40_contracts.md"];
  for (const relPath of canonicalFiles) {
    const content = await readSafe(path.join(packRoot, relPath));
    if (!content) {
      issues.push(
        issue(
          "QFAI-DDP-019",
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
// QFAI-DDP-020: Option Comparison (retargeted to 30_comparison.md)
// ---------------------------------------------------------------------------

/**
 * Validate that 30_comparison.md contains at least 2 distinct design options.
 */
export async function validateOptionComparison(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const comparisonPath = path.join(packRoot, "uiux", "30_comparison.md");
  const content = await readSafe(comparisonPath);
  if (!content) return issues;

  // Count distinct option entries in the entire file
  const optionNames = extractOptionNames(content);
  const uniqueOptions = new Set(optionNames);
  if (uniqueOptions.size < 2) {
    issues.push(
      issue(
        "QFAI-DDP-020",
        `Option Comparison: found ${uniqueOptions.size} distinct option(s) in 30_comparison.md, minimum 2 required. Add at least 2 distinct design options`,
        "error",
        "uiux/30_comparison.md",
        "ddh.optionComparison",
      ),
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// QFAI-DDP-021: Selected Direction (replaces Anchor Screen Selection)
// ---------------------------------------------------------------------------

/**
 * Validate that 30_comparison.md contains a Selected Direction section
 * referencing one of the compared options.
 */
export async function validateSelectedDirection(packRoot: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const comparisonPath = path.join(packRoot, "uiux", "30_comparison.md");
  const content = await readSafe(comparisonPath);
  if (!content) return issues;

  // Look for ## Selected Direction section
  const directionSection = extractH2Section(content, "Selected Direction");
  if (directionSection === null || isPlaceholder(directionSection)) {
    issues.push(
      issue(
        "QFAI-DDP-021",
        "Selected Direction: section not found or empty in 30_comparison.md. Add a '## Selected Direction' section with the chosen option and rationale",
        "error",
        "uiux/30_comparison.md",
        "ddh.selectedDirection",
      ),
    );
    return issues;
  }

  // Verify it references a compared option
  const optionNames = extractOptionNames(content);
  if (optionNames.length > 0) {
    const directionLower = directionSection.toLowerCase();
    const referencesOption = optionNames.some((name) =>
      directionLower.includes(name.toLowerCase()),
    );
    if (!referencesOption) {
      issues.push(
        issue(
          "QFAI-DDP-021",
          `Selected Direction: does not reference any compared option (${optionNames.join(", ")}). Update to reference a specific option from the comparison`,
          "error",
          "uiux/30_comparison.md",
          "ddh.selectedDirection.noOptionRef",
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// QFAI-DDP-022: Competitive References
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

    for (const field of COMPETITIVE_REF_FIELDS) {
      const fieldRe = new RegExp(`^\\s*-\\s+${field}\\s*:[ \\t]*(.*)$`, "m");
      const match = fieldRe.exec(block);

      if (!match) {
        issues.push(
          issue(
            "QFAI-DDP-022",
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
            issue(
              "QFAI-DDP-022",
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
// QFAI-DDP-023: Primary action handoff clarity
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
  // Canonical interaction signals (current v1.7.13 naming only)
  const signalsMainAction =
    /\bprimary\s+(?:task|action|operation)\b/i.test(meaningfulActionHandoff) ||
    /\bkey\s+(?:action|actions|operation|operations)\b/i.test(meaningfulActionHandoff) ||
    /\baction\s+priority\b/i.test(meaningfulActionHandoff) ||
    /\bpriority\s+hint\b/i.test(meaningfulActionHandoff) ||
    /^\|[^|\n]+?\|[^|\n]+?\|\s*(?:primary|high|main|p0)\s*\|/im.test(actionHandoffContent) ||
    /\bpriority\b[\s|:;-]{0,16}(?:primary|high|p0|main)\b/i.test(meaningfulActionHandoff);

  if (!actionHandoffContent || !signalsMainAction) {
    issues.push(
      issue(
        "QFAI-DDP-023",
        "Interaction Contracts: the primary task or primary action handoff is unclear. Add a primary task, key action, or interaction priority hint, and hand off screen contract details to uiux/40_contracts.md",
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
        issue(
          "QFAI-DDP-023",
          "Interaction Contracts: the primary task or action handoff contains a placeholder value. Replace it with the actual primary task, key action, or interaction priority hint and keep screen contract details in uiux/40_contracts.md",
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
// QFAI-DDP-024: State Coverage
// ---------------------------------------------------------------------------

/**
 * Validate that 03_Story-Workshop.md provides state-risk discovery and clearly hands off
 * the required state contract to uiux/40_contracts.md. Canonical enforcement of the
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
      issue(
        "QFAI-DDP-024",
        "State Coverage: state-risk discovery or contract handoff is missing. Add state risk notes and point the final required_states contract to uiux/40_contracts.md",
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
    /uiux\/40_contracts\.md/i.test(stateSection) || /\brequired_states\b/i.test(stateSection);

  if (!hasStateSignal || !hasRiskSignal || !hasContractHandoff) {
    issues.push(
      issue(
        "QFAI-DDP-024",
        "State Coverage: state-risk discovery is incomplete or the handoff to uiux/40_contracts.md is not explicit. Add state risks and note that required_states is finalized in uiux/40_contracts.md",
        "error",
        "03_Story-Workshop.md",
        "ddh.stateCoverage.handoffQuality",
      ),
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// QFAI-DDP-025: Design Anti-goals
// ---------------------------------------------------------------------------

/**
 * Validate that at least 1 design anti-goal is defined.
 * Checks Behavior Obligations in 03_Story-Workshop.md or sidecar 30_comparison.md.
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

  // Fall back to 30_comparison.md
  if (antiGoalSection === null) {
    const comparisonPath = path.join(packRoot, "uiux", "30_comparison.md");
    const comparisonContent = await readSafe(comparisonPath);
    if (comparisonContent) {
      antiGoalSection =
        extractH2Section(comparisonContent, "Design Anti-goals") ??
        extractSubsection(comparisonContent, "Design Anti-goals");
      if (antiGoalSection !== null) {
        sourceFile = "uiux/30_comparison.md";
      }
    }
  }

  if (antiGoalSection === null || isPlaceholder(antiGoalSection)) {
    issues.push(
      issue(
        "QFAI-DDP-025",
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
      issue(
        "QFAI-DDP-025",
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
 * Main entry point for Discussion Design Hardening validators (QFAI-DDP-019..025).
 * Called from validate.ts orchestrator.
 *
 * v1.7.13: Rewritten for sidecar-first model.
 * - QFAI-DDP-019: Sidecar family primary truth
 * - QFAI-DDP-020: Option Comparison (30_comparison.md)
 * - QFAI-DDP-021: Selected Direction (30_comparison.md)
 * - QFAI-DDP-022: Competitive References (04_Sources.md)
 * - QFAI-DDP-023: Primary action handoff clarity (Behavior Obligations discovery surface)
 * - QFAI-DDP-024: State handoff quality (Behavior Obligations -> 40_contracts.md SSOT)
 * - QFAI-DDP-025: Design Anti-goals (Behavior Obligations or sidecar)
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

  return issues;
}

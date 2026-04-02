/**
 * UIX-VAL validators for spec-0027.
 *
 * All validators follow the async pattern: (root, config) => Promise<Issue[]>
 * Non-UI projects skip entirely (empty array).
 * All issue codes use the UIX-VAL-* prefix.
 *
 * TDD-0004 through TDD-0018
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue, IssueSeverity } from "../types.js";
import { isUiBearingSpec } from "./uixDetection.js";
import {
  validateForbiddenLegacyFiles,
  validateThreeLayerFamilyCompleteness,
  validateThreeLayerModel,
} from "./uix/threeLayer.js";
import { readSafe } from "./utils.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function uixIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "compatibility",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

/**
 * Parse a YAML front-matter / body block from a markdown file.
 * Returns key-value pairs extracted from lines matching:
 *   - `key: value` (YAML-style)
 *   - `| Key | Value |` (markdown table rows)
 *   - `- Key: value` (markdown bullet items)
 * Keys are normalised to snake_case lowercase for consistent lookup.
 */
function parseSimpleYaml(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const store = (rawKey: string, value: string): void => {
    const key = rawKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (key && value) result[key] = value;
  };

  for (const line of content.split("\n")) {
    // YAML-style: `key: value`
    const yamlMatch = /^\s*(\w[\w_]*):\s*(.*)$/.exec(line);
    if (yamlMatch?.[1] !== undefined && yamlMatch[2] !== undefined) {
      store(yamlMatch[1], yamlMatch[2].trim());
      continue;
    }
    // Markdown bullet item: `- Key: value` or `- Key name: value`
    const bulletMatch = /^\s*-\s+([\w][\w\s]*?):\s+(.+)$/.exec(line);
    if (bulletMatch?.[1] !== undefined && bulletMatch[2] !== undefined) {
      store(bulletMatch[1], bulletMatch[2].trim());
      continue;
    }
    // Markdown table row: `| Key | Value |`
    const tableMatch = /^\s*\|\s*(\w[\w\s_]*?)\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (tableMatch?.[1] !== undefined && tableMatch[2] !== undefined) {
      // Skip separator rows and header rows
      if (!/^[-:]+$/.test(tableMatch[2].trim())) {
        store(tableMatch[1], tableMatch[2].trim());
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// TDD-0004: validateSidecarMissing (TC-0027-0009, TC-0027-0010)
// ---------------------------------------------------------------------------

export async function validateSidecarMissing(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  try {
    await readdir(path.join(root, "uiux"));
    return [];
  } catch {
    return [
      uixIssue(
        "UIX-VAL-SIDECAR-MISSING",
        "UI-bearing spec detected but uiux/ sidecar directory is missing.",
        "error",
        "uiux/",
        "Create the uiux/ directory and populate it with the sidecar template files.",
      ),
    ];
  }
}

// ---------------------------------------------------------------------------
// TDD-0005: validateStrategyCompleteness (TC-0027-0011..0014)
// ---------------------------------------------------------------------------

// Old-style required fields (legacy schema).
const STRATEGY_REQUIRED_FIELDS_LEGACY = [
  "selection_required",
  "candidate_options",
  "chosen_option",
  "verification_expectations",
  "none_as_legitimate_outcome",
] as const;

// New-style required fields (current YAML-block template).
const STRATEGY_REQUIRED_FIELDS_CURRENT = ["surface_type", "approach", "rationale"] as const;

const STRATEGY_MIN_LENGTH_FIELDS = ["rationale", "approach"] as const;
const STRATEGY_MIN_LENGTH = 20;

export async function validateStrategyCompleteness(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const strategyPath = path.join(root, "uiux", "10_strategy.md");
  const content = await readSafe(strategyPath);
  if (!content) return [];

  const parsed = parseSimpleYaml(content);
  const issues: Issue[] = [];
  const relPath = "uiux/10_strategy.md";

  // Detect format: `surface_type` is unique to the current YAML-block template.
  // `approach`/`rationale` appear in both formats, so use `surface_type` as discriminator.
  const isCurrentFormat = parsed["surface_type"] !== undefined;
  const requiredFields: readonly string[] = isCurrentFormat
    ? STRATEGY_REQUIRED_FIELDS_CURRENT
    : STRATEGY_REQUIRED_FIELDS_LEGACY;

  for (const field of requiredFields) {
    const value = parsed[field];
    if (value === undefined || value === "") {
      issues.push(
        uixIssue(
          "UIX-VAL-STRATEGY-INCOMPLETE",
          `Strategy field '${field}' is missing or empty in 10_strategy.md.`,
          "error",
          relPath,
          `Add the '${field}' field to uiux/10_strategy.md with a valid value.`,
        ),
      );
    }
  }

  for (const field of STRATEGY_MIN_LENGTH_FIELDS) {
    const value = parsed[field];
    if (value === undefined || value.length < STRATEGY_MIN_LENGTH) {
      issues.push(
        uixIssue(
          "UIX-VAL-STRATEGY-INCOMPLETE",
          `Strategy field '${field}' must be at least ${STRATEGY_MIN_LENGTH} characters (current: ${value?.length ?? 0}).`,
          "error",
          relPath,
          `Expand the '${field}' field in uiux/10_strategy.md to at least ${STRATEGY_MIN_LENGTH} characters.`,
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// TDD-0006: validateScoringAxes (TC-0027-0015, TC-0027-0016)
// ---------------------------------------------------------------------------

export async function validateScoringAxes(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // Try single file first, then concatenate split axis files as fallback
  const singlePath = path.join(root, "uiux", "20_eval_axes.md");
  let content = await readSafe(singlePath);
  let relPath = "uiux/20_eval_axes.md";

  if (!content) {
    const splitFiles = [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ] as const;
    const parts: string[] = [];
    for (const f of splitFiles) {
      const c = await readSafe(path.join(root, "uiux", f));
      if (c) parts.push(c);
    }
    if (parts.length > 0) {
      content = parts.join("\n");
      relPath = "uiux/20_design_eval_*.md";
    }
  }

  if (!content) return [];

  const issues: Issue[] = [];

  // Check that trend-derived rows have source_translation
  const lines = content.split("\n");
  let inTrendSection = false;
  for (const line of lines) {
    if (/trend[_-]derived/i.test(line)) {
      inTrendSection = true;
      continue;
    }
    if (inTrendSection && /^#+\s/.test(line)) {
      inTrendSection = false;
      continue;
    }
    const isBulletRow = /^\s*-\s/.test(line);
    const isTableRow = /^\s*\|/.test(line) && !/^\s*\|[\s-:|]+\|[\s-:|]*$/.test(line);
    if (inTrendSection && (isBulletRow || isTableRow)) {
      if (!/source_translation/i.test(line)) {
        issues.push(
          uixIssue(
            "UIX-VAL-SCORING-AXIS-INCOMPLETE",
            "Trend-derived scoring axis row is missing source_translation field.",
            "error",
            relPath,
            "Add source_translation to each trend-derived evaluation axis row.",
          ),
        );
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// TDD-0007: validateAggregateScoringRules (TC-0027-0017, TC-0027-0018)
// ---------------------------------------------------------------------------

const AGGREGATE_REQUIRED_FIELDS = ["weights", "normalization", "threshold"] as const;

export async function validateAggregateScoringRules(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // Primary: 3-layer canonical aggregate file
  const canonicalPath = path.join(root, "uiux", "23_design_eval_aggregate.md");
  const canonicalContent = await readSafe(canonicalPath);
  let content = "";
  let relPath = "uiux/23_design_eval_aggregate.md";

  if (canonicalContent) {
    const lines = canonicalContent.split("\n");
    let inSection = false;
    const sectionLines: string[] = [];
    for (const line of lines) {
      if (/^#+\s*Aggregate\s+Scoring/i.test(line)) {
        inSection = true;
        continue;
      }
      if (inSection && /^#+\s/.test(line)) break;
      if (inSection) sectionLines.push(line);
    }
    content = sectionLines.length > 0 ? sectionLines.join("\n") : canonicalContent;
  } else {
    // Fallback: legacy aggregate scoring file
    const legacyPath = path.join(root, "uiux", "21_aggregate_scoring.md");
    content = await readSafe(legacyPath);
    relPath = "uiux/21_aggregate_scoring.md";
  }

  if (!content) return [];

  const parsed = parseSimpleYaml(content);
  const issues: Issue[] = [];

  for (const field of AGGREGATE_REQUIRED_FIELDS) {
    // Accept plural alias (e.g., "thresholds" for "threshold")
    const value = parsed[field] ?? parsed[`${field}s`];
    if (value === undefined || value === "") {
      issues.push(
        uixIssue(
          "UIX-VAL-AGGREGATE-SCORING-INCOMPLETE",
          `Aggregate scoring field '${field}' is missing in ${relPath}.`,
          "error",
          relPath,
          `Add the '${field}' field to ${relPath}.`,
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// TDD-0008: validateOptionComparison (TC-0027-0019..0021)
// ---------------------------------------------------------------------------

export async function validateOptionComparison(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const issues: Issue[] = [];

  // Check 30_comparison.md for 2+ options
  const compPath = path.join(root, "uiux", "30_comparison.md");
  const compContent = await readSafe(compPath);
  if (compContent) {
    // Count heading-based options (## Option A, ## Option B)
    const headingOptions = compContent.match(/^##\s+Option\b/gim);
    // Count table-column options (Option A: ..., Option B: ..., | Option A |)
    const tableOptions = compContent.match(/\bOption\s+[A-Z]\b/gim);
    const uniqueTableOptions = tableOptions
      ? new Set(tableOptions.map((m) => m.trim().toUpperCase())).size
      : 0;
    const optionCount = Math.max(headingOptions?.length ?? 0, uniqueTableOptions);
    if (optionCount < 2) {
      issues.push(
        uixIssue(
          "UIX-VAL-COMPARISON-INSUFFICIENT",
          "30_comparison.md must contain at least 2 options for meaningful comparison.",
          "error",
          "uiux/30_comparison.md",
          "Add at least 2 '## Option' sections to uiux/30_comparison.md.",
        ),
      );
    }
  }

  // Check 31_anchor.md for selected anchor
  const anchorPath = path.join(root, "uiux", "31_anchor.md");
  const anchorContent = await readSafe(anchorPath);
  if (anchorContent) {
    if (
      !/selected_anchor\s*:/i.test(anchorContent) &&
      !/chosen\s*:/i.test(anchorContent) &&
      !/source\s+option\s*:/i.test(anchorContent)
    ) {
      issues.push(
        uixIssue(
          "UIX-VAL-ANCHOR-MISSING",
          "31_anchor.md is missing a selected anchor declaration.",
          "error",
          "uiux/31_anchor.md",
          "Add a 'selected_anchor:' field to uiux/31_anchor.md.",
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// TDD-0009: validateScreenContracts (TC-0027-0022, TC-0027-0023)
// ---------------------------------------------------------------------------

const SCREEN_CONTRACT_REQUIRED_FIELDS = [
  "route",
  "actor",
  "purpose",
  "primary_tasks",
  "required_states",
  "transitions",
  "observable_outcomes",
] as const;

export async function validateScreenContracts(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const contractsPath = path.join(root, "uiux", "40_contracts.md");
  const content = await readSafe(contractsPath);
  if (!content) return [];

  const parsed = parseSimpleYaml(content);
  const issues: Issue[] = [];
  const relPath = "uiux/40_contracts.md";

  // Map required fields to heading/section patterns in the template format.
  // Template uses `- Route:`, `- Actor:`, `- Purpose:` bullets AND
  // `#### Primary Tasks`, `#### Required States`, etc. section headings.
  const sectionHeadings: Record<string, RegExp> = {
    primary_tasks: /^#{3,4}\s+Primary\s+Tasks/im,
    required_states: /^#{3,4}\s+Required\s+States/im,
    transitions: /^#{3,4}\s+Transitions/im,
    observable_outcomes: /^#{3,4}\s+Observable\s+Outcomes/im,
  };

  for (const field of SCREEN_CONTRACT_REQUIRED_FIELDS) {
    const value = parsed[field];
    const hasValue = value !== undefined && value !== "";
    // Also accept section-heading presence for table-based fields.
    const headingPattern = sectionHeadings[field];
    const hasHeading = headingPattern ? headingPattern.test(content) : false;

    if (!hasValue && !hasHeading) {
      issues.push(
        uixIssue(
          "UIX-VAL-SCREEN-CONTRACT-INCOMPLETE",
          `Screen contract field '${field}' is missing in 40_contracts.md.`,
          "error",
          relPath,
          `Add the '${field}' field to screen contracts in uiux/40_contracts.md.`,
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// TDD-0010: validateOqClosure (TC-0027-0024, TC-0027-0025)
// ---------------------------------------------------------------------------

export async function validateOqClosure(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // Template places 11_OQ-Register.md at pack root; legacy puts it under uiux/.
  const rootOqPath = path.join(root, "11_OQ-Register.md");
  const uiuxOqPath = path.join(root, "uiux", "11_OQ-Register.md");
  const rootContent = await readSafe(rootOqPath);
  const content = rootContent || (await readSafe(uiuxOqPath));
  if (!content) return [];

  const issues: Issue[] = [];
  const relPath = rootContent ? "11_OQ-Register.md" : "uiux/11_OQ-Register.md";

  // Match OQ entries: "OQ-XXXX" followed by status indicators
  // Pattern: OQ-NNNN ... status: open ... severity: critical/blocking
  const oqBlocks = content.split(/(?=^##\s+OQ-\d{4})/m);
  for (const block of oqBlocks) {
    const idMatch = /^##\s+(OQ-\d{4})/m.exec(block);
    if (!idMatch?.[1]) continue;

    const oqId = idMatch[1];
    const isOpen = /status\s*:\s*open/i.test(block);
    const isCritical = /severity\s*:\s*(?:critical|blocking)/i.test(block);

    if (isOpen && isCritical) {
      issues.push(
        uixIssue(
          "UIX-VAL-OQ-OPEN-CRITICAL",
          `Open critical OQ found: ${oqId}. Must be resolved before proceeding.`,
          "error",
          relPath,
          `Resolve or downgrade ${oqId} in uiux/11_OQ-Register.md before validation can pass.`,
        ),
      );
    }
  }

  // Also detect OQ entries in table format: | OQ-NNNN | ... | disposition | ...
  const tableRowRegex = /^\s*\|\s*(OQ-\d{4})\s*\|/;
  for (const line of content.split("\n")) {
    const rowMatch = tableRowRegex.exec(line);
    if (!rowMatch?.[1]) continue;
    const oqId = rowMatch[1];
    // Split table columns
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    // Template columns: OQ-ID(0), Title(1), Gate(2), Disposition(3), ...
    const disposition = cols[3]?.toLowerCase();
    if (disposition === "open") {
      // Check if there's a severity-like indicator in remaining columns
      const fullRow = line.toLowerCase();
      if (/critical|blocking/i.test(fullRow)) {
        issues.push(
          uixIssue(
            "UIX-VAL-OQ-OPEN-CRITICAL",
            `Open critical OQ found: ${oqId}. Must be resolved before proceeding.`,
            "error",
            relPath,
            `Resolve or downgrade ${oqId} in ${relPath} before validation can pass.`,
          ),
        );
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// TDD-0012/0013: reviewStrategy
// ---------------------------------------------------------------------------

export type ReviewVerdict = "accept" | "refine" | "pivot";

export type ReviewResult = {
  verdict: ReviewVerdict;
  rationale: string;
};

/**
 * Review a strategy document and return a deterministic verdict.
 * This is a static/rule-based review (no LLM).
 */
export function reviewStrategy(strategy: string): ReviewResult {
  const parsed = parseSimpleYaml(strategy);

  // Check completeness — detect format like validateStrategyCompleteness.
  const isCurrentFormat = parsed["surface_type"] !== undefined;
  const requiredFields: readonly string[] = isCurrentFormat
    ? STRATEGY_REQUIRED_FIELDS_CURRENT
    : STRATEGY_REQUIRED_FIELDS_LEGACY;
  const missingRequired = requiredFields.filter((f) => !parsed[f] || parsed[f] === "");
  if (missingRequired.length > 0) {
    return {
      verdict: "pivot",
      rationale: `Missing required fields: ${missingRequired.join(", ")}. Strategy is incomplete and needs fundamental rework.`,
    };
  }

  // Check rationale/approach length
  const shortFields = STRATEGY_MIN_LENGTH_FIELDS.filter(
    (f) => !parsed[f] || parsed[f].length < STRATEGY_MIN_LENGTH,
  );
  if (shortFields.length > 0) {
    return {
      verdict: "refine",
      rationale: `Fields need more detail: ${shortFields.join(", ")}. Each must be at least ${STRATEGY_MIN_LENGTH} characters.`,
    };
  }

  return {
    verdict: "accept",
    rationale: "Strategy meets all completeness and depth requirements.",
  };
}

// ---------------------------------------------------------------------------
// TDD-0014: validateMigration (TC-0027-0035..0037)
// ---------------------------------------------------------------------------

const CURRENT_SIDECAR_VERSION = "1.0.0";

export async function validateMigration(root: string, config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const strict = config.uiux?.migration?.strict === true;
  const issues: Issue[] = [];

  // Check for missing uiux/ directory
  try {
    await readdir(path.join(root, "uiux"));
  } catch {
    issues.push(
      uixIssue(
        "UIX-VAL-MIGRATION-SIDECAR-MISSING",
        "UI-bearing spec detected but uiux/ sidecar directory is missing. Migration required.",
        strict ? "error" : "warning",
        "uiux/",
        "Run the UIX sidecar migration to create the uiux/ directory structure.",
      ),
    );
    return issues;
  }

  // Check sidecar template version
  const versionPath = path.join(root, "uiux", ".sidecar-version");
  const versionContent = await readSafe(versionPath);
  if (versionContent) {
    const version = versionContent.trim();
    if (version && version !== CURRENT_SIDECAR_VERSION) {
      issues.push(
        uixIssue(
          "UIX-VAL-MIGRATION-STALE-VERSION",
          `Sidecar template version '${version}' is outdated (current: ${CURRENT_SIDECAR_VERSION}).`,
          "warning",
          "uiux/.sidecar-version",
          `Upgrade sidecar template from ${version} to ${CURRENT_SIDECAR_VERSION}. Run the migration tool for upgrade steps.`,
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// TDD-0018: validatePhase1Ratchet (TC-0027-0047, TC-0027-0048)
// ---------------------------------------------------------------------------

/**
 * Within Phase 1 (30 days of release), all UIX-VAL issues are downgraded
 * to warning-only regardless of configuration.
 */
export function applyPhase1Ratchet(
  issues: Issue[],
  releaseDate: Date,
  now: Date = new Date(),
): Issue[] {
  const phase1EndMs = releaseDate.getTime() + 30 * 24 * 60 * 60 * 1000;
  if (now.getTime() > phase1EndMs) return issues;

  return issues.map((iss) => {
    if (iss.code.startsWith("UIX-VAL-") && iss.severity === "error") {
      return { ...iss, severity: "warning" as const };
    }
    return iss;
  });
}

// ---------------------------------------------------------------------------
// Aggregate runner
// ---------------------------------------------------------------------------

/**
 * Run all UIX-VAL validators and return combined issues.
 * Resolves the latest discussion pack when root is a repo root.
 * When `config.uiux.phase1ReleaseDate` is set, applies the phase-1 ratchet.
 */
export async function runAllUixValidators(root: string, config: QfaiConfig): Promise<Issue[]> {
  // Resolve the effective validation root: if root contains 01_Spec.md directly
  // (test scenario / direct pack), use it. Otherwise resolve the latest discussion pack.
  let effectiveRoot = root;
  const directSpec = await readSafe(path.join(root, "01_Spec.md"));
  if (!directSpec) {
    const discussionDir = path.join(root, config.paths.discussionDir);
    const packRoot = await findLatestDiscussionPackDir(discussionDir);
    if (!packRoot) return [];
    effectiveRoot = packRoot;
  }

  const validators = [
    validateSidecarMissing,
    validateStrategyCompleteness,
    validateScoringAxes,
    validateAggregateScoringRules,
    validateOptionComparison,
    validateScreenContracts,
    validateOqClosure,
    validateMigration,
    validateThreeLayerModel,
    validateForbiddenLegacyFiles,
    validateThreeLayerFamilyCompleteness,
  ];

  const results = await Promise.all(validators.map((v) => v(effectiveRoot, config)));
  let issues = results.flat();

  const relDateStr = config.uiux?.phase1ReleaseDate;
  if (relDateStr) {
    const releaseDate = new Date(relDateStr);
    if (!isNaN(releaseDate.getTime())) {
      issues = applyPhase1Ratchet(issues, releaseDate);
    }
  }

  return issues;
}

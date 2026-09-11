import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import {
  readUiContractScreenContracts,
  type CanonicalScreenContract,
  type PrimaryTaskShapeFinding,
} from "../contracts/screenContracts.js";
import { isDiscussionUiBearingPack } from "../detection/surfaceType.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue, IssueSeverity } from "../types.js";
import { issue, readSafe } from "./utils.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DesignAuditConfig = {
  enabled: boolean;
  slopDetection: boolean;
  qualityProfile: "default" | "high" | "strict";
  maxPrimaryCtas: number;
  maxRawTokenLiteralWarnings: number;
  maxDuplicateFindingsPerRule: number;
};

export type DesignFinding = {
  ruleId: string;
  dimension: string;
  severityTier: 1 | 2 | 3;
  message: string;
  why: string;
  evidence: string[];
  guidance: string;
  file?: string;
  /**
   * Optional severity override that bypasses the standard tier-mapping
   * path. Used by the QFAI-AUD-001 deprecation-window emission to surface
   * legacy slot-less UI contracts at severity=info while preserving the
   * default tier-mapping for the rest of the rule set.
   */
  severityOverride?: IssueSeverity;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COSMETIC_CATEGORIES = ["generic-shell", "stock-imagery", "placeholder-copy"];

/**
 * Recommended ceiling on `screens[].primary_tasks`: at most 7.
 * A count above it raises `QFAI-AUD-020` at severity=warning.
 *
 * There is no floor. Seven tasks on one screen weakens focus; one task on
 * one screen is focus, and a rule that reported it as weak told the author
 * to add tasks to a screen that needed none. `QFAI-AUD-001` still reports a
 * `primary_tasks` list with nothing in it, so a screen that declares no task
 * at all is caught.
 *
 * The wording is surfaced in the shipped UI contract template comments and
 * in the authoring guide, so authors learn the ceiling from the same string
 * the validator finally cites.
 */
export const PRIMARY_TASKS_MAX = 7;
export const PRIMARY_TASKS_MAX_LABEL = `at most ${PRIMARY_TASKS_MAX}`;

// ---------------------------------------------------------------------------
// Config Resolution
// ---------------------------------------------------------------------------

export function resolveAuditConfig(config: QfaiConfig): DesignAuditConfig {
  const audit = config.uiux?.audit;
  const profile = config.uiux?.qualityProfile ?? "default";
  return {
    enabled: audit?.enabled ?? true,
    slopDetection: audit?.slopDetection ?? true,
    qualityProfile: profile,
    maxPrimaryCtas: audit?.maxPrimaryCtas ?? 1,
    maxRawTokenLiteralWarnings: audit?.maxRawTokenLiteralWarnings ?? 5,
    maxDuplicateFindingsPerRule: audit?.maxDuplicateFindingsPerRule ?? 5,
  };
}

// ---------------------------------------------------------------------------
// Severity Mapping
// ---------------------------------------------------------------------------

export function mapSeverity(tier: number, profile: string, category?: string): IssueSeverity {
  if (tier === 1) return "error";
  if (tier === 2) return profile === "strict" ? "error" : "warning";
  // Tier 3
  if (profile === "default") {
    return category && COSMETIC_CATEGORIES.includes(category) ? "info" : "warning";
  }
  return "warning";
}

// ---------------------------------------------------------------------------
// Finding → Issue Conversion
// ---------------------------------------------------------------------------

export function findingToIssue(
  finding: DesignFinding,
  profile: string,
  rulePrefix = "audit",
): Issue {
  const severity =
    finding.severityOverride ?? mapSeverity(finding.severityTier, profile, finding.dimension);
  return issue(
    finding.ruleId,
    finding.message,
    severity,
    finding.file,
    `${rulePrefix}.${finding.dimension}`,
    finding.evidence.length > 0 ? finding.evidence : undefined,
    "canonical",
    finding.guidance,
  );
}

// ---------------------------------------------------------------------------
// Section Extraction
// ---------------------------------------------------------------------------

function _extractSection(content: string, heading: string): string | null {
  const idx = content.indexOf(heading);
  if (idx === -1) return null;
  const start = idx + heading.length;
  const headingLevel = heading.match(/^#+/)?.[0]?.length ?? 3;
  const rest = content.slice(start);
  const headingPattern = new RegExp(`^#{1,${headingLevel}} `, "m");
  const nextHeadingMatch = headingPattern.exec(rest);
  const sectionContent = nextHeadingMatch ? rest.slice(0, nextHeadingMatch.index) : rest;
  return sectionContent.trim() || null;
}

// ---------------------------------------------------------------------------
// Contracts / Selected Direction Checks
// ---------------------------------------------------------------------------

function parseScreenBlocks(
  content: string,
): Array<{ screenId: string; primaryTasks: string[]; primaryTasksKeyPresent: boolean }> {
  const blocks: Array<{
    screenId: string;
    primaryTasks: string[];
    primaryTasksKeyPresent: boolean;
  }> = [];
  const sections = content.split(/(?=^###\s+Screen:)/m);
  for (const section of sections) {
    if (!/^###\s+Screen:/m.test(section)) {
      continue;
    }
    const lines = section.split("\n");
    const screenId =
      lines
        .map((line) => /^\s*-\s+screen_id:\s*(.+)$/.exec(line)?.[1]?.trim() ?? "")
        .find(Boolean) ?? "unknown";
    const primaryTasks: string[] = [];
    let primaryTasksKeyPresent = false;

    let inPrimaryTasks = false;
    for (const line of lines) {
      if (/^\s*-\s+primary_tasks:\s*$/i.test(line)) {
        inPrimaryTasks = true;
        primaryTasksKeyPresent = true;
        continue;
      }
      if (!inPrimaryTasks) {
        continue;
      }
      if (/^\s*-\s+\w[\w_]*:\s*/.test(line) || /^###\s+Screen:/i.test(line)) {
        break;
      }
      const primaryTaskMatch = /^\s{2,}-\s+(.+)$/.exec(line);
      if (primaryTaskMatch?.[1]) {
        primaryTasks.push(primaryTaskMatch[1].trim());
      }
    }

    blocks.push({
      screenId,
      primaryTasks,
      primaryTasksKeyPresent,
    });
  }
  return blocks;
}

function checkContractsHierarchy(
  contractsContent: string,
  auditConfig: DesignAuditConfig,
  file: string,
): DesignFinding[] {
  const findings: DesignFinding[] = [];
  const screens = parseScreenBlocks(contractsContent);
  for (const screen of screens) {
    if (screen.primaryTasks.length === 0) {
      if (screen.primaryTasksKeyPresent) {
        // key-empty: slot authored but left as `primary_tasks: []`. Treat as
        // intentional violation, emit severity=error (blocking).
        findings.push({
          ruleId: "QFAI-AUD-001",
          dimension: "visualHierarchy",
          severityTier: 1,
          message: `[QFAI-AUD-001] ${file}: screen '${screen.screenId}' has empty primary_tasks; add at least one primary_task entry`,
          why: "Each screen contract needs a clear primary task to anchor the core user action",
          evidence: [file, screen.screenId, "QFAI-AUD-001"],
          guidance: "Add at least one primary_tasks entry to the screen contract.",
          file,
        });
      } else {
        // key-absent: legacy contract predates the primary_tasks slot. The
        // retirement the message names has passed, so this is an error.
        findings.push({
          ruleId: "QFAI-AUD-001",
          dimension: "visualHierarchy",
          severityTier: 3,
          severityOverride: "error",
          message: `[QFAI-AUD-001] ${file}: screen '${screen.screenId}' uses a legacy UI contract that predates the primary_tasks slot; add the slot during your next \`/qfai-sdd\` cycle (sunset: qfai 1.10.0)`,
          why: "Legacy contracts authored before the primary_tasks lane lack the slot; this is a deprecation-window signal, not a violation",
          evidence: [file, screen.screenId, "QFAI-AUD-001"],
          guidance:
            "Add a `primary_tasks` slot (with at least one task) to the screen entry in the UI contract during your next `/qfai-sdd` cycle. Sunset: qfai 1.10.0.",
          file,
        });
      }
      continue;
    }
    const bandFinding = bandFindingFor(screen.screenId, screen.primaryTasks, file, file);
    if (bandFinding) {
      findings.push(bandFinding);
    }
  }

  return findings;
}

function bandFindingFor(
  screenId: string,
  primaryTasks: string[],
  file: string,
  fileForFinding: string,
): DesignFinding | null {
  const count = primaryTasks.length;
  if (count <= PRIMARY_TASKS_MAX) {
    return null;
  }
  return {
    ruleId: "QFAI-AUD-020",
    dimension: "visualHierarchy",
    severityTier: 2,
    message: `[QFAI-AUD-020] ${file}: screen '${screenId}' primary_tasks count ${count} is over the recommended ${PRIMARY_TASKS_MAX_LABEL}`,
    why: `more than ${PRIMARY_TASKS_MAX} primary tasks on one screen weakens its focus`,
    evidence: primaryTasks,
    guidance: `Move some of screen '${screenId}' primary_tasks to another screen, or fold them into fewer tasks, until ${PRIMARY_TASKS_MAX_LABEL} remain.`,
    file: fileForFinding,
  };
}

function checkContractHierarchyFromScreens(
  screens: CanonicalScreenContract[],
  _auditConfig: DesignAuditConfig,
): DesignFinding[] {
  const findings: DesignFinding[] = [];
  for (const screen of screens) {
    if (screen.primaryTasks.length === 0) {
      // sourceRef is `<rel-path>#<screenId>` — split so the message names
      // the file path explicitly. Falls back gracefully when sourceRef is
      // empty (e.g. directly-constructed screens with no source location).
      const [filePath = "<unknown-file>"] = screen.sourceRef.split("#");
      // Emit QFAI-AUD-021 shape findings BEFORE the empty-primary-tasks
      // branch's `continue` — otherwise a screen whose every
      // primary_task is a malformed structured object (extractPrimaryTasks
      // recorded shape findings but the parsed list ended up empty) would
      // surface only the generic "empty primary_tasks" QFAI-AUD-001
      // diagnostic and the closed-schema detail would be hidden.
      for (const shape of screen.primaryTaskShapeFindings) {
        findings.push(shapeFindingFor(screen.screenId, shape, filePath, screen.sourceRef));
      }
      if (screen.primaryTasksKeyPresent) {
        // key-empty: slot authored but left as `primary_tasks: []`. Treat as
        // intentional violation, emit severity=error (blocking).
        findings.push({
          ruleId: "QFAI-AUD-001",
          dimension: "visualHierarchy",
          severityTier: 1,
          message: `[QFAI-AUD-001] ${filePath}: screen '${screen.screenId}' has empty primary_tasks; add at least one primary_task entry`,
          why: "Each screen contract needs a clear primary task to anchor the core user action",
          evidence: [filePath, screen.screenId, "QFAI-AUD-001"],
          guidance: "Add at least one primary_tasks entry to the screen contract.",
          file: screen.sourceRef,
        });
      } else {
        // key-absent: legacy contract predates the primary_tasks slot. The
        // retirement the message names has passed, so this is an error.
        findings.push({
          ruleId: "QFAI-AUD-001",
          dimension: "visualHierarchy",
          severityTier: 3,
          severityOverride: "error",
          message: `[QFAI-AUD-001] ${filePath}: screen '${screen.screenId}' uses a legacy UI contract that predates the primary_tasks slot; add the slot during your next \`/qfai-sdd\` cycle (sunset: qfai 1.10.0)`,
          why: "Legacy contracts authored before the primary_tasks lane lack the slot; this is a deprecation-window signal, not a violation",
          evidence: [filePath, screen.screenId, "QFAI-AUD-001"],
          guidance:
            "Add a `primary_tasks` slot (with at least one task) to the screen entry in the UI contract during your next `/qfai-sdd` cycle. Sunset: qfai 1.10.0.",
          file: screen.sourceRef,
        });
      }
      continue;
    }
    const [filePath = "<unknown-file>"] = screen.sourceRef.split("#");
    const bandFinding = bandFindingFor(
      screen.screenId,
      screen.primaryTasks,
      filePath,
      screen.sourceRef,
    );
    if (bandFinding) {
      findings.push(bandFinding);
    }
    for (const shape of screen.primaryTaskShapeFindings) {
      findings.push(shapeFindingFor(screen.screenId, shape, filePath, screen.sourceRef));
    }
  }

  return findings;
}

function shapeFindingFor(
  screenId: string,
  shape: PrimaryTaskShapeFinding,
  filePath: string,
  fileForFinding: string,
): DesignFinding {
  const detail =
    shape.reason === "missing-required-key"
      ? `missing required key(s): ${shape.missingKeys.join(", ")}`
      : shape.reason === "extra-key"
        ? `carries extra key(s) not permitted by the closed schema: ${shape.extraKeys.join(", ")}`
        : "must be either a string (legacy) or a {id, label, acceptance} object (closed schema)";
  return {
    ruleId: "QFAI-AUD-021",
    dimension: "visualHierarchy",
    severityTier: 1,
    message: `[QFAI-AUD-021] ${filePath}: screen '${screenId}' primary_task ${shape.taskRef} ${detail}`,
    why: "Structured primary_tasks entries must conform to the closed {id, label, acceptance} schema so downstream ATDD scaffolding can anchor on a stable, complete shape",
    evidence: [filePath, screenId, shape.taskRef, ...shape.missingKeys, ...shape.extraKeys],
    guidance:
      "Author each structured primary_task entry as exactly {id, label, acceptance} (all-required). Remove any extra keys; populate any missing ones.",
    file: fileForFinding,
  };
}

// ---------------------------------------------------------------------------
// Token Drift Check
// ---------------------------------------------------------------------------

const RAW_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;

async function checkTokenDrift(
  root: string,
  auditConfig: DesignAuditConfig,
  cfg: QfaiConfig,
): Promise<DesignFinding[]> {
  const findings: DesignFinding[] = [];
  // Align with designToken.ts default: contractsDir/design
  const configuredDir = cfg.uiux?.designTokensDir;
  const tokensDir = configuredDir
    ? path.resolve(root, configuredDir)
    : path.join(root, cfg.paths.contractsDir, "design");

  let hasTokenFiles = false;
  try {
    const entries = await readdir(tokensDir);
    hasTokenFiles = entries.some((e) => /\.ya?ml$/i.test(e));
  } catch {
    return findings;
  }
  if (!hasTokenFiles) return findings;

  const contractsUiDir = path.join(root, cfg.paths.contractsDir, "ui");
  let htmlFiles: string[] = [];
  try {
    const entries = await readdir(contractsUiDir);
    htmlFiles = entries.filter((e) => /\.html?$/i.test(e));
  } catch {
    return findings;
  }

  // Count total occurrences (not unique) - AC-0025-0005 is occurrence-based
  let rawCount = 0;
  const sampleLiterals: string[] = [];
  for (const htmlFile of htmlFiles) {
    const content = await readSafe(path.join(contractsUiDir, htmlFile));
    if (!content) continue;
    const matches = content.match(RAW_COLOR_RE);
    if (matches) {
      rawCount += matches.length;
      for (const m of matches) {
        if (sampleLiterals.length < 10) {
          sampleLiterals.push(m.toLowerCase());
        }
      }
    }
  }

  if (rawCount > auditConfig.maxRawTokenLiteralWarnings) {
    findings.push({
      ruleId: "QFAI-AUD-004",
      dimension: "tokenDiscipline",
      severityTier: 1,
      message: `Token drift: ${rawCount} raw color literal occurrences found (threshold: ${auditConfig.maxRawTokenLiteralWarnings})`,
      why: "Raw color values bypass design tokens, causing visual inconsistency",
      evidence: sampleLiterals,
      guidance: "Replace raw color literals with design token references",
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

export function deduplicateFindings(issues: Issue[], maxPerRule: number): Issue[] {
  const counts = new Map<string, number>();
  const result: Issue[] = [];

  for (const iss of issues) {
    const count = counts.get(iss.code) ?? 0;
    if (count < maxPerRule) {
      result.push(iss);
    }
    counts.set(iss.code, count + 1);
  }

  for (const [code, count] of counts) {
    if (count > maxPerRule) {
      result.push({
        code,
        severity: "info",
        category: "canonical",
        message: `${count - maxPerRule} additional "${code}" finding(s) suppressed (max ${maxPerRule} per rule)`,
        rule: `audit.dedup.${code}`,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main Validator
// ---------------------------------------------------------------------------

export async function validateDesignAudit(root: string, config: QfaiConfig): Promise<Issue[]> {
  const auditConfig = resolveAuditConfig(config);
  if (!auditConfig.enabled) return [];

  const discussionDir = path.join(root, config.paths.discussionDir);
  const uiContractScreens = await readUiContractScreenContracts(root, config.paths.contractsDir);
  const packRoot = await findLatestDiscussionPackDir(discussionDir);
  if (uiContractScreens.length === 0) {
    if (!packRoot) return [];
    const uiBearing = await isDiscussionUiBearingPack(packRoot);
    if (!uiBearing) return [];
  }

  const contractsPath = packRoot ? path.join(packRoot, "uiux", "40_screen_contracts.md") : null;
  const contractsContent = contractsPath ? await readSafe(contractsPath) : "";
  // The audit decides early-return based on UI contracts and screen
  // contracts only.
  if (uiContractScreens.length === 0 && !contractsContent) return [];

  const findings: DesignFinding[] = [];

  if (uiContractScreens.length > 0) {
    findings.push(...checkContractHierarchyFromScreens(uiContractScreens, auditConfig));
  } else if (contractsContent) {
    findings.push(
      ...checkContractsHierarchy(contractsContent, auditConfig, "uiux/40_screen_contracts.md"),
    );
  }

  // Token drift check
  findings.push(...(await checkTokenDrift(root, auditConfig, config)));

  const issues = findings.map((f) => findingToIssue(f, auditConfig.qualityProfile));
  return deduplicateFindings(issues, auditConfig.maxDuplicateFindingsPerRule);
}

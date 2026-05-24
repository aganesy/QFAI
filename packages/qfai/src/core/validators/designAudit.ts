import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import {
  readUiContractScreenContracts,
  type CanonicalScreenContract,
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
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COSMETIC_CATEGORIES = ["generic-shell", "stock-imagery", "placeholder-copy"];

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
  const severity = mapSeverity(finding.severityTier, profile, finding.dimension);
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

function parseScreenBlocks(content: string): Array<{ screenId: string; primaryTasks: string[] }> {
  const blocks: Array<{ screenId: string; primaryTasks: string[] }> = [];
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

    let inPrimaryTasks = false;
    for (const line of lines) {
      if (/^\s*-\s+primary_tasks:\s*$/i.test(line)) {
        inPrimaryTasks = true;
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
      continue;
    }
    if (screen.primaryTasks.length > auditConfig.maxPrimaryCtas) {
      findings.push({
        ruleId: "QFAI-AUD-020",
        dimension: "visualHierarchy",
        severityTier: 2,
        message: `Screen '${screen.screenId}' defines multiple primary tasks (${screen.primaryTasks.length} > ${auditConfig.maxPrimaryCtas})`,
        why: "Multiple primary tasks weaken the selected direction and blur the intended primary action",
        evidence: screen.primaryTasks,
        guidance: "Reduce primary_tasks to the single most important user action for this screen.",
        file,
      });
    }
  }

  return findings;
}

function checkContractHierarchyFromScreens(
  screens: CanonicalScreenContract[],
  auditConfig: DesignAuditConfig,
): DesignFinding[] {
  const findings: DesignFinding[] = [];
  for (const screen of screens) {
    if (screen.primaryTasks.length === 0) {
      // sourceRef is `<rel-path>#<screenId>` — split so the message names
      // the file path explicitly. Falls back gracefully when sourceRef is
      // empty (e.g. directly-constructed screens with no source location).
      const [filePath = "<unknown-file>"] = screen.sourceRef.split("#");
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
      continue;
    }
    if (screen.primaryTasks.length > auditConfig.maxPrimaryCtas) {
      findings.push({
        ruleId: "QFAI-AUD-020",
        dimension: "visualHierarchy",
        severityTier: 2,
        message: `Screen '${screen.screenId}' defines multiple primary tasks (${screen.primaryTasks.length} > ${auditConfig.maxPrimaryCtas})`,
        why: "Multiple primary tasks weaken the selected direction and blur the intended primary action",
        evidence: screen.primaryTasks,
        guidance: "Reduce primary_tasks to the single most important user action for this screen.",
        file: screen.sourceRef,
      });
    }
  }

  return findings;
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

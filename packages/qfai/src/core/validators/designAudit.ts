import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue, IssueSeverity } from "../types.js";
import { isUiBearing } from "./discussionDesignHardening.js";
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
    "compatibility",
    finding.guidance,
  );
}

// ---------------------------------------------------------------------------
// Section Extraction
// ---------------------------------------------------------------------------

function extractSection(content: string, heading: string): string | null {
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
// CTA Hierarchy Check
// ---------------------------------------------------------------------------

function checkCtaHierarchy(
  content: string,
  auditConfig: DesignAuditConfig,
  file: string,
): DesignFinding[] {
  const findings: DesignFinding[] = [];
  const ctaSection = extractSection(content, "### CTA Hierarchy");
  if (!ctaSection) return findings;

  const primaryLines = ctaSection.match(/^-\s*Primary:/gm) || [];
  const primaryCount = primaryLines.length;

  if (primaryCount === 0) {
    findings.push({
      ruleId: "QFAI-AUD-001",
      dimension: "visualHierarchy",
      severityTier: 1,
      message: "No primary CTA defined in CTA Hierarchy",
      why: "Every UI screen needs a clear primary action to guide users",
      evidence: [],
      guidance: "Define at least one primary CTA in the CTA Hierarchy section",
      file,
    });
  }

  if (primaryCount > auditConfig.maxPrimaryCtas) {
    findings.push({
      ruleId: "QFAI-AUD-020",
      dimension: "visualHierarchy",
      severityTier: 2,
      message: `Multiple primary CTAs detected (${primaryCount} > ${auditConfig.maxPrimaryCtas})`,
      why: "Multiple primary CTAs create decision paralysis and weaken visual hierarchy",
      evidence: primaryLines.map((l) => l.trim()),
      guidance: "Reduce to a single primary CTA per screen; demote others to secondary",
      file,
    });
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
  const tokensDir = path.join(root, cfg.uiux?.designTokensDir ?? ".qfai/uiux/design-tokens");

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

  const rawLiterals = new Set<string>();
  for (const htmlFile of htmlFiles) {
    const content = await readSafe(path.join(contractsUiDir, htmlFile));
    if (!content) continue;
    const matches = content.match(RAW_COLOR_RE);
    if (matches) {
      for (const m of matches) {
        rawLiterals.add(m.toLowerCase());
      }
    }
  }

  if (rawLiterals.size > auditConfig.maxRawTokenLiteralWarnings) {
    findings.push({
      ruleId: "QFAI-AUD-004",
      dimension: "tokenDiscipline",
      severityTier: 2,
      message: `Token drift: ${rawLiterals.size} raw color literals found (threshold: ${auditConfig.maxRawTokenLiteralWarnings})`,
      why: "Raw color values bypass design tokens, causing visual inconsistency",
      evidence: [...rawLiterals].slice(0, 10),
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
        category: "compatibility",
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
  const packRoot = await findLatestDiscussionPackDir(discussionDir);
  if (!packRoot) return [];

  const uiBearing = await isUiBearing(packRoot);
  if (!uiBearing) return [];

  const storyPath = path.join(packRoot, "03_Story-Workshop.md");
  const content = await readSafe(storyPath);
  if (!content) return [];

  const findings: DesignFinding[] = [];

  // CTA Hierarchy checks
  findings.push(...checkCtaHierarchy(content, auditConfig, "03_Story-Workshop.md"));

  // Token drift check
  findings.push(...(await checkTokenDrift(root, auditConfig, config)));

  const issues = findings.map((f) => findingToIssue(f, auditConfig.qualityProfile));
  return deduplicateFindings(issues, auditConfig.maxDuplicateFindingsPerRule);
}

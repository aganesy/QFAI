import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

const DDP_HEADING_RE = /^#{1,3}\s+Design\s+Direction\s+Pack/im;

const DDP_REQUIRED_FIELDS = [
  "visual_thesis",
  "content_plan",
  "interaction_thesis",
  "anti_goals",
  "cta_hierarchy",
] as const;

const DDP_THEME_FIELDS = ["theme", "mood", "taste", "material", "energy", "visual_anchor"] as const;

const UI_BEARING_KEYWORDS_RE = /\b(screen|ui|interface|mock|layout|design)\b/i;

const FIGMA_URL_RE = /https?:\/\/(?:www\.)?figma\.com\/[^\s)]+/i;

let _bannedPatterns: string[] | null = null;

async function loadBannedPatterns(): Promise<string[]> {
  if (_bannedPatterns !== null) return _bannedPatterns;
  try {
    const thisDir = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(thisDir, "..", "ddpBannedPatterns.txt");
    const content = await readFile(filePath, "utf-8");
    _bannedPatterns = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
  } catch {
    _bannedPatterns = [];
  }
  return _bannedPatterns;
}

/** Reset cached patterns (for testing). */
export function resetBannedPatternsCache(): void {
  _bannedPatterns = null;
}

/**
 * Legacy compatibility validator only.
 *
 * Deprecated DDP-based packs may still be checked by direct tests or
 * migration tooling, but this validator is intentionally excluded from the
 * production validateProject() path. Canonical package validation is driven
 * by the sidecar-first validators.
 */
export async function validateLegacyDdpFields(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const pattern = path.posix.join(root.replace(/\\/g, "/"), config.paths.discussionDir, "**/*.md");
  const files = await fg(pattern, { absolute: true });

  let ddpFound = false;
  let isUiBearing = false;

  // Check if the project is UI-bearing by examining 03_Story-Workshop.md
  for (const filePath of files) {
    const basename = path.basename(filePath);
    if (basename === "03_Story-Workshop.md") {
      try {
        const storyContent = await readFile(filePath, "utf-8");
        if (UI_BEARING_KEYWORDS_RE.test(storyContent)) {
          isUiBearing = true;
        }
      } catch {
        // ignore
      }
    }
  }

  for (const filePath of files) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    if (!DDP_HEADING_RE.test(content)) continue;

    ddpFound = true;
    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    const section = extractDdpSection(content);
    if (!section) continue;

    // TDD-0001: Required field checks
    for (const field of DDP_REQUIRED_FIELDS) {
      if (!hasNonEmptyField(section, field)) {
        issues.push(
          issue(
            "QFAI-DDP-001",
            `DDP required field missing: ${field}`,
            "error",
            rel,
            `ddp.requiredField.${field}`,
          ),
        );
      }
    }

    // TDD-0002: Visual thesis format check
    const visualThesisValue = getFieldValue(section, "visual_thesis");
    if (visualThesisValue) {
      // Check if bullet-only (no sentence, starts with -)
      const trimmed = visualThesisValue.trim();
      if (/^-\s/.test(trimmed) && !/[.!?]/.test(trimmed)) {
        issues.push(
          issue(
            "QFAI-DDP-002",
            "Visual thesis should be a single descriptive sentence, not bullet points",
            "warning",
            rel,
            "ddp.visualThesisFormat",
          ),
        );
      }
    }

    // TDD-0002: Theme field completeness check
    const themeBlock = extractNestedBlock(section, "theme");
    if (themeBlock !== null) {
      for (const tf of DDP_THEME_FIELDS) {
        if (!hasSubField(themeBlock, tf)) {
          issues.push(
            issue(
              "QFAI-DDP-003",
              `DDP theme field missing: ${tf}`,
              "error",
              rel,
              `ddp.themeField.${tf}`,
            ),
          );
        }
      }
    }

    // TDD-0003: Primary action handoff checks
    const ctaBlock = extractNestedBlock(section, "cta_hierarchy");
    if (ctaBlock !== null) {
      if (!hasSubField(ctaBlock, "primary")) {
        issues.push(
          issue(
            "QFAI-DDP-004",
            "Primary action handoff must identify at least one primary task or action",
            "error",
            rel,
            "ddp.ctaPrimaryMissing",
          ),
        );
      }
      if (!hasSubField(ctaBlock, "placement")) {
        issues.push(
          issue(
            "QFAI-DDP-005",
            "CTA placement not specified",
            "warning",
            rel,
            "ddp.ctaPlacementMissing",
          ),
        );
      }
    } else {
      // cta_hierarchy field is present but as inline value — check inline for "primary"
      const ctaInline = getFieldValue(section, "cta_hierarchy");
      if (ctaInline && !ctaInline.toLowerCase().includes("primary")) {
        issues.push(
          issue(
            "QFAI-DDP-004",
            "Primary action handoff must identify at least one primary task or action",
            "error",
            rel,
            "ddp.ctaPrimaryMissing",
          ),
        );
      }
    }

    // TDD-0004: Content plan section count check
    const contentPlanItems = collectListItems(section, "content_plan");
    if (contentPlanItems.length > 0 && contentPlanItems.length < 2) {
      issues.push(
        issue(
          "QFAI-DDP-007",
          "Content plan should have at least 2 sections",
          "warning",
          rel,
          "ddp.contentPlanSections",
        ),
      );
    }

    // TDD-0005: Interaction thesis principle count check
    const interactionItems = collectListItems(section, "interaction_thesis");
    if (interactionItems.length > 0 && interactionItems.length < 2) {
      issues.push(
        issue(
          "QFAI-DDP-008",
          "Interaction thesis should contain 2-3 motion principles",
          "warning",
          rel,
          "ddp.interactionThesisPrinciples",
        ),
      );
    }

    // TDD-0005: Anti-goals banned patterns check
    const antiGoalItems = collectListItems(section, "anti_goals");
    const bannedPatterns = await loadBannedPatterns();
    const hasBannedPattern = antiGoalItems.some((item) =>
      bannedPatterns.some((bp) => item.toLowerCase().includes(bp.toLowerCase())),
    );
    if (hasNonEmptyField(section, "anti_goals") && antiGoalItems.length > 0 && !hasBannedPattern) {
      issues.push(
        issue(
          "QFAI-DDP-009",
          "DDP anti-goals should contain at least one banned generic pattern",
          "warning",
          rel,
          "ddp.antiGoalsBannedPattern",
        ),
      );
    }

    // TDD-0006: Tool independence — check for Figma URL hard references
    if (FIGMA_URL_RE.test(section)) {
      issues.push(
        issue(
          "QFAI-DDP-010",
          "DDP contains hard reference to external tool (Figma URL); DDP should be tool-independent",
          "error",
          rel,
          "ddp.externalToolDependency",
        ),
      );
    }
  }

  // TDD-0004: UI-bearing artifact without DDP → error
  if (isUiBearing && !ddpFound) {
    issues.push(
      issue(
        "QFAI-DDP-006",
        "UI-bearing artifact detected but no Design Direction Pack found",
        "error",
        undefined,
        "ddp.uiBearingNoDdp",
      ),
    );
  }

  // TDD-0007: Research-to-Constraint conversion + traceability
  await validateResearchTraceability(root, config, issues);

  // TDD-0008: List/Form template completeness + anti-pattern detection
  await validateStoryWorkshopTemplates(root, config, issues, files);

  // TDD-0009: Config uiux policy + multiple option comparison
  validateQualityProfile(config, issues);
  await validateOptionComparison(root, config, issues);

  // TDD-0010: Competitive references validation
  await validateCompetitiveRefs(root, config, issues);

  return issues;
}

// ---------------------------------------------------------------------------
// TDD-0007: Research traceability
// ---------------------------------------------------------------------------

const LIST_TEMPLATE_REQUIRED_FIELDS = [
  "screen_type",
  "items_source",
  "empty_state",
  "sort_filter_controls",
  "pagination_or_infinite_scroll",
  "primary_cta",
] as const;

const FORM_TEMPLATE_REQUIRED_FIELDS = [
  "screen_type",
  "fields",
  "required_fields_count",
  "submit_cta",
  "validation_feedback",
  "cancel_or_back_action",
] as const;

const ANTI_PATTERN_CHECKS: Array<{
  pattern: RegExp;
  id: string;
  message: string;
  guidance?: string;
}> = [
  {
    pattern: /dual\s+primary\s+CTA|two\s+primary\s+CTA|2\s+primary\s+CTA/i,
    id: "dual-primary-cta",
    message: "Anti-pattern detected: multiple competing primary actions",
    guidance: "A screen should have exactly one primary task or action to avoid user confusion.",
  },
  {
    pattern: /required.fields.*(?:[89]|\d{2,})|required_fields_count\s*:\s*(?:[89]|\d{2,})/i,
    id: "too-many-required-fields",
    message: "Anti-pattern detected: form has more than 7 required fields",
    guidance: "Keep required fields to 7 or fewer to reduce form abandonment.",
  },
  {
    pattern: /empty.state(?:(?!action|cta|button|link).)*$/im,
    id: "empty-state-no-action",
    message: "Anti-pattern detected: empty state without action",
    guidance: "Empty states should include an actionable CTA to guide users forward.",
  },
];

async function validateResearchTraceability(
  root: string,
  config: QfaiConfig,
  issues: Issue[],
): Promise<void> {
  // Check if requireResearchSummary is set
  const requireResearchSummary = config.uiux?.requireResearchSummary === true;

  // Scan discussion pack for research_summary
  const discussionPattern = path.posix.join(
    root.replace(/\\/g, "/"),
    config.paths.discussionDir,
    "**/*.md",
  );
  const discussionFiles = await fg(discussionPattern, { absolute: true });
  let hasResearchSummary = false;

  for (const filePath of discussionFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      if (/research_summary\s*:/m.test(content)) {
        hasResearchSummary = true;
        break;
      }
    } catch {
      // ignore
    }
  }

  if (requireResearchSummary && !hasResearchSummary) {
    issues.push(
      issue(
        "QFAI-DDP-012",
        "Research summary required by config (requireResearchSummary=true) but not found in discussion pack",
        "error",
        undefined,
        "ddp.researchSummaryRequired",
      ),
    );
  }

  // Scan contracts/design/*.yaml for rules without source_research
  const contractPattern = path.posix.join(
    root.replace(/\\/g, "/"),
    config.paths.contractsDir,
    "design",
    "*.yaml",
  );
  const contractFiles = await fg(contractPattern, { absolute: true });

  for (const filePath of contractFiles) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }
    const rel = path.relative(root, filePath).replace(/\\/g, "/");

    // Parse rules (simple YAML-like: lines starting with "- rule:" or "  id:")
    const ruleBlocks = content.split(/(?=^-\s+(?:rule|id)\s*:)/m).filter((b) => b.trim());
    for (const block of ruleBlocks) {
      const idMatch = /(?:^|\n)\s*(?:-\s+)?id\s*:\s*(\S+)/m.exec(block);
      const ruleId = idMatch?.[1] ?? "unknown";
      if (!/source_research\s*:/m.test(block) && /(?:rule|id)\s*:/m.test(block)) {
        issues.push(
          issue(
            "QFAI-DDP-011",
            `Design contract rule '${ruleId}' missing source_research traceability field`,
            "warning",
            rel,
            `ddp.researchTraceability.${ruleId}`,
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// TDD-0008: Story Workshop template validation
// ---------------------------------------------------------------------------

async function validateStoryWorkshopTemplates(
  root: string,
  config: QfaiConfig,
  issues: Issue[],
  discussionFiles: string[],
): Promise<void> {
  for (const filePath of discussionFiles) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    const rel = path.relative(root, filePath).replace(/\\/g, "/");

    // Check for list template
    if (/screen_type\s*:\s*list/im.test(content)) {
      for (const field of LIST_TEMPLATE_REQUIRED_FIELDS) {
        if (!hasNonEmptyField(content, field)) {
          issues.push(
            issue(
              "QFAI-DDP-013",
              `List template missing required field: ${field}`,
              "error",
              rel,
              `ddp.listTemplate.${field}`,
            ),
          );
        }
      }
      // density_rationale empty check: field key exists but value is empty
      if (
        hasFieldKey(content, "density_rationale") &&
        !hasNonEmptyField(content, "density_rationale")
      ) {
        issues.push(
          issue(
            "QFAI-DDP-013",
            "List template density_rationale is empty",
            "error",
            rel,
            "ddp.listTemplate.density_rationale",
          ),
        );
      }
    }

    // Check for form template
    if (/screen_type\s*:\s*form/im.test(content)) {
      for (const field of FORM_TEMPLATE_REQUIRED_FIELDS) {
        if (!hasNonEmptyField(content, field)) {
          issues.push(
            issue(
              "QFAI-DDP-013",
              `Form template missing required field: ${field}`,
              "error",
              rel,
              `ddp.formTemplate.${field}`,
            ),
          );
        }
      }
      // states.error missing check
      const statesBlock = extractNestedBlock(content, "states");
      if (statesBlock !== null && !hasSubField(statesBlock, "error")) {
        issues.push(
          issue(
            "QFAI-DDP-013",
            "Form template states.error is missing",
            "error",
            rel,
            "ddp.formTemplate.states.error",
          ),
        );
      }
    }

    // Anti-pattern detection
    detectAntiPatterns(content, rel, issues);
  }
}

function detectAntiPatterns(content: string, rel: string, issues: Issue[]): void {
  for (const check of ANTI_PATTERN_CHECKS) {
    if (check.pattern.test(content)) {
      issues.push(
        issue(
          "QFAI-DDP-014",
          check.message,
          "error",
          rel,
          `ddp.antiPattern.${check.id}`,
          undefined,
          "compatibility",
          check.guidance,
        ),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// TDD-0009: Quality profile + option comparison
// ---------------------------------------------------------------------------

function validateQualityProfile(config: QfaiConfig, issues: Issue[]): void {
  const profile = config.uiux?.qualityProfile;
  if (profile === "strict") {
    // Strict mode: all warnings become errors — emit a notice
    issues.push(
      issue(
        "QFAI-DDP-015",
        "Quality profile is set to 'strict': all DDP warnings are enforced as errors",
        "info",
        undefined,
        "ddp.qualityProfile.strict",
      ),
    );
  } else if (profile === "high") {
    issues.push(
      issue(
        "QFAI-DDP-015",
        "Quality profile is set to 'high': all DDP warnings are shown",
        "info",
        undefined,
        "ddp.qualityProfile.high",
      ),
    );
  }
  // "default" or undefined: no action needed
}

async function validateOptionComparison(
  root: string,
  config: QfaiConfig,
  issues: Issue[],
): Promise<void> {
  const contractPattern = path.posix.join(
    root.replace(/\\/g, "/"),
    config.paths.contractsDir,
    "design",
    "*.yaml",
  );
  const contractFiles = await fg(contractPattern, { absolute: true });

  for (const filePath of contractFiles) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }
    const rel = path.relative(root, filePath).replace(/\\/g, "/");

    // Count design options (lines like "- option:" or "option_N:" pattern)
    const optionMatches = content.match(/(?:^|\n)\s*-\s+option\s*:/gm) ?? [];
    const numberedOptions = content.match(/(?:^|\n)\s*option_\d+\s*:/gm) ?? [];
    const totalOptions = optionMatches.length + numberedOptions.length;

    if (totalOptions === 1) {
      issues.push(
        issue(
          "QFAI-DDP-016",
          "Design contract has only 1 option; at least 2 options are required for comparison",
          "error",
          rel,
          "ddp.optionComparison.insufficient",
        ),
      );
    } else if (totalOptions >= 2) {
      // Check if any option has empty pros — scan line-by-line
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const prosMatch = /^\s*pros\s*:\s*(.*)$/m.exec(line);
        if (prosMatch && prosMatch[1]?.trim() === "") {
          issues.push(
            issue(
              "QFAI-DDP-016",
              "Design option has empty pros field",
              "warning",
              rel,
              "ddp.optionComparison.emptyPros",
            ),
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// TDD-0010: Competitive references validation
// ---------------------------------------------------------------------------

async function validateCompetitiveRefs(
  root: string,
  config: QfaiConfig,
  issues: Issue[],
): Promise<void> {
  const minRefs = config.uiux?.competitive_refs_min ?? 3;

  const contractPattern = path.posix.join(
    root.replace(/\\/g, "/"),
    config.paths.contractsDir,
    "design",
    "*.yaml",
  );
  const contractFiles = await fg(contractPattern, { absolute: true });

  for (const filePath of contractFiles) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }
    const rel = path.relative(root, filePath).replace(/\\/g, "/");

    // Count competitive_refs entries
    const refsBlock = extractNestedBlock(content, "competitive_refs");
    if (refsBlock !== null) {
      const refItems = refsBlock.split(/\n/).filter((l) => /^\s*-\s/.test(l));
      if (refItems.length < minRefs) {
        issues.push(
          issue(
            "QFAI-DDP-017",
            `Competitive references insufficient: found ${refItems.length}, minimum ${minRefs} required`,
            "error",
            rel,
            "ddp.competitiveRefs.insufficient",
          ),
        );
      }
    } else {
      // Check for inline competitive_refs field
      const inlineRefs = getFieldValue(content, "competitive_refs");
      if (inlineRefs !== null) {
        // Single inline ref counts as 1
        if (1 < minRefs) {
          issues.push(
            issue(
              "QFAI-DDP-017",
              `Competitive references insufficient: found 1, minimum ${minRefs} required`,
              "error",
              rel,
              "ddp.competitiveRefs.insufficient",
            ),
          );
        }
      }
    }

    // Check for translation_policy
    if (/competitive_refs/m.test(content) && !/translation_policy\s*:/m.test(content)) {
      issues.push(
        issue(
          "QFAI-DDP-018",
          "Translation policy missing in design contract with competitive references",
          "warning",
          rel,
          "ddp.translationPolicy.missing",
        ),
      );
    }
  }
}

function extractDdpSection(content: string): string | null {
  const heading = DDP_HEADING_RE.exec(content);
  if (!heading) return null;

  const start = heading.index + heading[0].length;
  const remainder = content.slice(start);
  const nextHeadingOffset = remainder.search(/^#{1,3}\s+/m);
  const section = nextHeadingOffset === -1 ? remainder : remainder.slice(0, nextHeadingOffset);
  return section.trim();
}

function hasFieldKey(section: string, field: string): boolean {
  const re = new RegExp(`^${field}\\s*:`, "m");
  return re.test(section);
}

function hasNonEmptyField(section: string, field: string): boolean {
  const re = new RegExp(`^${field}\\s*:(.*)`, "m");
  const match = re.exec(section);
  if (!match) return false;

  // Check inline value
  const inlineValue = (match[1] ?? "").trim();
  if (inlineValue) return true;

  // Check indented block (multi-line value)
  const matchEnd = match.index + match[0].length;
  const remainder = section.slice(matchEnd);
  const lines = remainder.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // If next line is indented (starts with space/tab and has content), it's a block value
    if (/^\s+/.test(line) && trimmed.length > 0) return true;
    // If next line is a new field at same level, stop
    break;
  }

  return false;
}

function getFieldValue(section: string, field: string): string | null {
  const re = new RegExp(`^${field}\\s*:(.*)`, "m");
  const match = re.exec(section);
  if (!match) return null;

  const inlineValue = (match[1] ?? "").trim();
  if (inlineValue) return inlineValue;

  // Check indented block
  const matchEnd = match.index + match[0].length;
  const remainder = section.slice(matchEnd);
  const lines = remainder.split(/\r?\n/);
  const blockLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed && blockLines.length === 0) continue;
    if (/^\s+/.test(line) && trimmed.length > 0) {
      blockLines.push(trimmed);
    } else if (blockLines.length > 0 || (!trimmed && blockLines.length === 0)) {
      if (!trimmed && blockLines.length === 0) continue;
      break;
    } else {
      break;
    }
  }
  return blockLines.length > 0 ? blockLines.join("\n") : null;
}

function extractNestedBlock(section: string, field: string): string | null {
  const re = new RegExp(`^${field}\\s*:(.*)`, "m");
  const match = re.exec(section);
  if (!match) return null;

  const inlineValue = (match[1] ?? "").trim();
  if (inlineValue) return null; // Not a block, it's an inline value

  const matchEnd = match.index + match[0].length;
  const remainder = section.slice(matchEnd);
  const lines = remainder.split(/\r?\n/);
  const blockLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed && blockLines.length === 0) continue;
    if (/^\s+/.test(line) && trimmed.length > 0) {
      blockLines.push(line);
    } else if (blockLines.length > 0) {
      break;
    } else if (trimmed) {
      break;
    }
  }
  return blockLines.length > 0 ? blockLines.join("\n") : null;
}

function hasSubField(block: string, subField: string): boolean {
  const re = new RegExp(`^\\s*${subField}\\s*:\\s*\\S`, "m");
  return re.test(block);
}

function collectListItems(section: string, field: string): string[] {
  const re = new RegExp(`^${field}\\s*:(.*)`, "m");
  const match = re.exec(section);
  if (!match) return [];

  const matchEnd = match.index + match[0].length;
  const remainder = section.slice(matchEnd);
  const lines = remainder.split(/\r?\n/);
  const items: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed && items.length === 0) continue;
    if (/^\s+-\s/.test(line)) {
      items.push(trimmed.replace(/^-\s*/, ""));
    } else if (/^\s+\S/.test(line) && items.length > 0) {
      // continuation of a list item's sub-fields (e.g. "role: ...")
      continue;
    } else if (trimmed && !/^\s/.test(line)) {
      break;
    } else if (!trimmed && items.length > 0) {
      break;
    }
  }
  return items;
}

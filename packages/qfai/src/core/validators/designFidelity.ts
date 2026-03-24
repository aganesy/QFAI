import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import type { Issue, IssueSeverity } from "../types.js";
import { issue } from "./utils.js";

// ── Constants ────────────────────────────────────────────────────────────────

const SCORECARD_HEADING_RE = /^#{1,3}\s+Fidelity\s+Scorecard/im;

const BASE_DIMENSIONS = ["hierarchy", "clarity", "accessibility", "responsive"] as const;

const TASK_FIDELITY_REQUIRED_FIELDS = [
  "step_count",
  "cta_visibility",
  "empty_state",
  "error_state",
  "primary_flow_clicks",
] as const;

const PASS_THRESHOLD = 70;

/** Issue codes that are escalated from warning to error by default. */
const ESCALATED_CODES = [
  "dual_primary_cta",
  "empty_state_without_action",
  "error_without_recovery",
  "placeholder_or_lorem",
  "cta_visibility_fail",
  "scorecard_dimension_missing",
] as const;

// ── Public API ───────────────────────────────────────────────────────────────

export async function validateDesignFidelity(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Scan evidence and review directories for markdown files with scorecard
  const evidenceDirs = [".qfai/evidence", ".qfai/review"];
  const allFiles: string[] = [];

  for (const dir of evidenceDirs) {
    const pattern = path.posix.join(root.replace(/\\/g, "/"), dir, "**/*.md");
    const files = await fg(pattern, { absolute: true });
    allFiles.push(...files);
  }

  for (const filePath of allFiles) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    if (!SCORECARD_HEADING_RE.test(content)) continue;

    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    const section = extractScorecardSection(content);
    if (!section) continue;

    // Parse dimensions from section
    const dimensions = parseDimensions(section);
    const _verdict = parseVerdict(section);

    // ── TDD-0001: 4 base dimensions + score/prose ──────────────────────
    for (const dim of BASE_DIMENSIONS) {
      if (!dimensions.has(dim)) {
        issues.push(
          issue(
            "QFAI-FID-001",
            `Fidelity scorecard missing dimension: ${dim}`,
            "error",
            rel,
            `fidelity.dimension.${dim}`,
          ),
        );
      } else {
        const d = dimensions.get(dim);
        if (d && (d.score === null || d.comment === null)) {
          issues.push(
            issue(
              "QFAI-FID-002",
              `Fidelity dimension '${dim}' missing ${d.score === null ? "score" : "prose comment"}`,
              "error",
              rel,
              `fidelity.scoreOrProse.${dim}`,
            ),
          );
        }
      }
    }

    // ── TDD-0002: PASS/FAIL threshold ──────────────────────────────────
    const scores: number[] = [];
    for (const dim of BASE_DIMENSIONS) {
      const d = dimensions.get(dim);
      if (d?.score !== null && d?.score !== undefined) {
        scores.push(d.score);
        if (d.score < PASS_THRESHOLD) {
          issues.push(
            issue(
              "QFAI-FID-003",
              `Dimension '${dim}' score ${d.score} is below threshold ${PASS_THRESHOLD}`,
              "error",
              rel,
              `fidelity.threshold.${dim}`,
            ),
          );
        }
      }
    }
    // Also check taskFidelity if present
    const taskFid = dimensions.get("taskFidelity");
    if (taskFid?.score !== null && taskFid?.score !== undefined) {
      scores.push(taskFid.score);
      if (taskFid.score < PASS_THRESHOLD) {
        issues.push(
          issue(
            "QFAI-FID-003",
            `Dimension 'taskFidelity' score ${taskFid.score} is below threshold ${PASS_THRESHOLD}`,
            "error",
            rel,
            "fidelity.threshold.taskFidelity",
          ),
        );
      }
    }

    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < PASS_THRESHOLD) {
        issues.push(
          issue(
            "QFAI-FID-003",
            `Overall average score ${avg.toFixed(1)} is below threshold ${PASS_THRESHOLD}`,
            "error",
            rel,
            "fidelity.threshold.average",
          ),
        );
      }
    }

    // ── TDD-0003: FAIL improvement guidance + responsive viewport ──────
    for (const dim of BASE_DIMENSIONS) {
      const d = dimensions.get(dim);
      if (d?.score !== null && d?.score !== undefined && d.score < PASS_THRESHOLD) {
        if (!d.improvement || !d.alternative) {
          issues.push(
            issue(
              "QFAI-FID-004",
              `FAIL dimension '${dim}' missing ${!d.improvement ? "improvement instructions" : "alternative suggestion"}`,
              "error",
              rel,
              `fidelity.improvement.${dim}`,
            ),
          );
        }
      }
    }

    // Responsive dimension must mention desktop and mobile
    const responsive = dimensions.get("responsive");
    if (responsive) {
      if (!responsive.desktop || !responsive.mobile) {
        issues.push(
          issue(
            "QFAI-FID-005",
            `Responsive dimension missing ${!responsive.desktop ? "desktop" : "mobile"} viewport results`,
            "error",
            rel,
            "fidelity.viewport.responsive",
          ),
        );
      }
    }

    // ── TDD-0004: Breaking delta + reproducibility ─────────────────────
    const delta = parseDelta(section);
    if (delta.hasBreaking) {
      if (!delta.content || !delta.impact || !delta.migration) {
        const missing: string[] = [];
        if (!delta.content) missing.push("content");
        if (!delta.impact) missing.push("impact");
        if (!delta.migration) missing.push("migration steps");
        issues.push(
          issue(
            "QFAI-FID-006",
            `Breaking delta missing: ${missing.join(", ")}`,
            "error",
            rel,
            "fidelity.breakingDelta",
          ),
        );
      }
    }

    // Rubric must be documented for reproducibility
    if (!hasRubric(section)) {
      issues.push(
        issue(
          "QFAI-FID-007",
          "Scorecard rubric not documented; results are not reproducible",
          "error",
          rel,
          "fidelity.rubricMissing",
        ),
      );
    }

    // ── TDD-0005: taskFidelity 5th dimension ───────────────────────────
    const requiresTaskFidelity = hasTaskFidelityRequirement(content);
    if (requiresTaskFidelity) {
      if (!dimensions.has("taskFidelity")) {
        issues.push(
          issue(
            "QFAI-FID-008",
            "Spec requires taskFidelity dimension but it is not present in scorecard",
            "error",
            rel,
            "fidelity.taskFidelity.missing",
          ),
        );
      } else {
        const tf = dimensions.get("taskFidelity");
        for (const field of TASK_FIDELITY_REQUIRED_FIELDS) {
          if (tf && !tf.fields.has(field)) {
            issues.push(
              issue(
                "QFAI-FID-009",
                `taskFidelity missing required field: ${field}`,
                "error",
                rel,
                `fidelity.taskFidelity.field.${field}`,
              ),
            );
          }
        }
      }
    }

    // ── TDD-0006: Warning→error escalation ─────────────────────────────
    const overrides = config.uiux?.warning_as_error_override ?? [];
    for (const code of ESCALATED_CODES) {
      if (hasAntiPatternMention(section, code)) {
        const isOverridden = overrides.includes(code);
        const severity: IssueSeverity = isOverridden ? "warning" : "error";
        const issueCode = isOverridden ? "QFAI-FID-011" : "QFAI-FID-010";
        const suffix = isOverridden ? " (overridden to warning by config)" : "";
        issues.push(
          issue(
            issueCode,
            `Escalated validation: ${code}${suffix}`,
            severity,
            rel,
            `fidelity.escalation.${code}`,
          ),
        );
      }
    }
  }

  return issues;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

type DimensionInfo = {
  score: number | null;
  comment: string | null;
  improvement: string | null;
  alternative: string | null;
  desktop: string | null;
  mobile: string | null;
  fields: Map<string, string>;
};

function extractScorecardSection(content: string): string | null {
  const heading = SCORECARD_HEADING_RE.exec(content);
  if (!heading) return null;

  const start = heading.index + heading[0].length;
  const remainder = content.slice(start);
  const nextHeadingOffset = remainder.search(/^#{1,3}\s+/m);
  const section = nextHeadingOffset === -1 ? remainder : remainder.slice(0, nextHeadingOffset);
  return section.trim();
}

function parseDimensions(section: string): Map<string, DimensionInfo> {
  const dims = new Map<string, DimensionInfo>();
  const lines = section.split(/\r?\n/);

  let currentDim: string | null = null;
  let currentInfo: DimensionInfo | null = null;

  for (const line of lines) {
    // Top-level dimension: "hierarchy:" or "taskFidelity:"
    const dimMatch = /^(\w+)\s*:(.*)$/.exec(line);
    if (dimMatch && !line.startsWith(" ") && !line.startsWith("\t")) {
      if (currentDim && currentInfo) {
        dims.set(currentDim, currentInfo);
      }

      const name = dimMatch[1] ?? "";
      const inlineValue = (dimMatch[2] ?? "").trim();

      // Skip non-dimension top-level fields
      if (["verdict", "rubric", "delta", "breaking_delta"].includes(name)) {
        currentDim = null;
        currentInfo = null;
        continue;
      }

      currentDim = name;
      currentInfo = {
        score: null,
        comment: null,
        improvement: null,
        alternative: null,
        desktop: null,
        mobile: null,
        fields: new Map(),
      };

      // Handle inline score if present (e.g., "hierarchy: 85")
      if (inlineValue && /^\d+$/.test(inlineValue)) {
        currentInfo.score = parseInt(inlineValue, 10);
      }
      continue;
    }

    // Sub-field of current dimension
    if (currentDim && currentInfo && /^\s+/.test(line)) {
      const subMatch = /^\s+(\w+)\s*:\s*(.*)$/.exec(line);
      if (subMatch) {
        const key = subMatch[1] ?? "";
        const value = (subMatch[2] ?? "").trim();
        switch (key) {
          case "score":
            currentInfo.score = value ? parseInt(value, 10) : null;
            break;
          case "comment":
            currentInfo.comment = value || null;
            break;
          case "improvement":
            currentInfo.improvement = value || null;
            break;
          case "alternative":
            currentInfo.alternative = value || null;
            break;
          case "desktop":
            currentInfo.desktop = value || null;
            break;
          case "mobile":
            currentInfo.mobile = value || null;
            break;
          default:
            currentInfo.fields.set(key, value);
            break;
        }
      }
    }
  }

  // Save the last dimension
  if (currentDim && currentInfo) {
    dims.set(currentDim, currentInfo);
  }

  return dims;
}

function parseVerdict(section: string): string | null {
  const match = /^verdict\s*:\s*(\S+)/m.exec(section);
  return match?.[1] ?? null;
}

type DeltaInfo = {
  hasBreaking: boolean;
  content: boolean;
  impact: boolean;
  migration: boolean;
};

function parseDelta(section: string): DeltaInfo {
  // Look for breaking_delta or delta section with "breaking" mentioned
  const hasBreaking =
    /breaking_delta\s*:/m.test(section) ||
    (/delta\s*:/m.test(section) && /breaking/im.test(section));

  if (!hasBreaking) {
    return { hasBreaking: false, content: false, impact: false, migration: false };
  }

  return {
    hasBreaking: true,
    content: /content\s*:/m.test(section),
    impact: /impact\s*:/m.test(section),
    migration: /migration\s*:/m.test(section),
  };
}

function hasRubric(section: string): boolean {
  return /rubric\s*:/m.test(section);
}

function hasTaskFidelityRequirement(content: string): boolean {
  // Check if the document mentions that taskFidelity is required
  return /taskFidelity\s*:\s*required/im.test(content) || /require.*taskFidelity/im.test(content);
}

function hasAntiPatternMention(section: string, code: string): boolean {
  // Check if the section mentions the anti-pattern code
  return new RegExp(`\\b${code.replace(/_/g, "[_ ]")}\\b`, "i").test(section);
}

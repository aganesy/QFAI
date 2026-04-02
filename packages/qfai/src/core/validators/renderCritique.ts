import path from "node:path";
import { readFile } from "node:fs/promises";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

/**
 * Render Critique Loop validator (SPEC-0021).
 *
 * Ensures that prototyping / implement skill prompts and evidence files
 * follow the Render Critique Loop process:
 *   - Reviews reference rendered output (not code-only)
 *   - Desktop and mobile viewports are critiqued
 *   - Canonical sidecar artifacts are read first in downstream skills
 *   - Critique evidence has required fields
 *   - Iterative loop completes when both viewports PASS
 *   - taskFidelity is recorded
 */

const RENDERED_KEYWORDS_RE = /\b(rendered|screenshot|html\b|preview|visual\s*review)/i;
const SIDECAR_DIRECTION_RE = /\b(sidecar|selected\s*direction|30_comparison|comparison)\b/i;
const STRATEGY_RE = /\b(strategy|10_strategy)\b/i;
const CONTRACTS_RE = /\b(screen\s*contract|40_contracts|contracts)\b/i;
const TASTE_RE = /\b(taste|11_design_taste_interview)\b/i;
const TREND_RE = /\b(trend|04_sources|trend\s*scan)\b/i;
const EVAL_FAMILY_RE =
  /\b(3-layer|three-layer|20-24|20_design_eval_invariant|21_design_eval_trend_derived|22_design_eval_product_specific|23_design_eval_aggregate|24_design_eval_dynamic_overrides|evaluation\s*family|supporting\s*evaluation)\b/i;

const DESKTOP_RE = /\b(desktop|1024\s*px|1280\s*px|1440\s*px|viewport\s*[≥>=]+\s*1024)\b/i;
const MOBILE_RE = /\b(mobile|480\s*px|375\s*px|390\s*px|viewport\s*[≤<=]+\s*480)\b/i;

const EVIDENCE_DATE_RE = /\bdate\s*:/i;
const EVIDENCE_VIEWPORT_RE = /\bviewport\s*:/i;
const EVIDENCE_VERDICT_RE = /\bverdict\s*:\s*(PASS|REVISE)\b/i;
const EVIDENCE_FINDINGS_RE = /\bfindings\s*:/i;
const RUBRIC_RE = /\b(rubric|evaluation\s*criteria|scoring\s*guide)\b/i;

const TASK_FIDELITY_SECTION_RE = /\btaskFidelity\b/i;
const STEP_COUNT_RE = /\bstep_count\s*:\s*(\d+)/i;
const CTA_VISIBILITY_RE = /\bcta_visibility\s*:/i;
const FOUR_STATE_CHECK_RE = /\bfour_state_check\s*:/i;
const MAX_PRIMARY_STEPS_RE = /\bmax_primary_steps\s*:\s*(\d+)/i;

export async function validateRenderCritique(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const discussionDir = path.join(root, config.paths.discussionDir).replace(/\\/g, "/");
  const discussionFiles = await fg(path.posix.join(discussionDir, "**/*.md"), { absolute: true });
  const canonicalArtifacts = [
    path.join(discussionDir, "**/uiux/10_strategy.md").replace(/\\/g, "/"),
    path.join(discussionDir, "**/uiux/30_comparison.md").replace(/\\/g, "/"),
    path.join(discussionDir, "**/uiux/40_contracts.md").replace(/\\/g, "/"),
    path.join(discussionDir, "**/04_Sources.md").replace(/\\/g, "/"),
  ];
  const matchedArtifacts = await fg(canonicalArtifacts, { absolute: true });
  const hasCanonicalArtifacts = matchedArtifacts.length > 0;
  const hasDiscussionContent = discussionFiles.length > 0;
  if (!hasCanonicalArtifacts && !hasDiscussionContent) return issues;

  const skillsDir = path.join(root, config.paths.skillsDir).replace(/\\/g, "/");
  const evidenceDir = path.join(root, ".qfai", "evidence").replace(/\\/g, "/");
  const renderEvidenceViewports = await collectRenderEvidenceViewports(root);

  // Collect skill prompt files
  const skillPromptPattern = path.posix.join(skillsDir, "qfai-{prototyping,implement}*/SKILL.md");
  const skillFiles = await fg(skillPromptPattern, { dot: true });

  // Collect evidence files
  const evidencePattern = path.posix.join(evidenceDir, "{prototyping*,critique-*}.md");
  const evidenceFiles = await fg(evidencePattern, { dot: true });

  // --- TDD-0001: Code-only rejection (QFAI-CRIT-001) ---
  for (const sf of skillFiles) {
    const content = await readSafe(sf);
    if (content.length > 0 && !RENDERED_KEYWORDS_RE.test(content)) {
      issues.push(
        issue(
          "QFAI-CRIT-001",
          `Skill prompt does not mention rendered/screenshot/HTML review: ${path.relative(root, sf)}`,
          "error",
          sf,
          "renderCritique.codeOnly",
          undefined,
          "change",
          "Add rendered output review requirement (e.g. 'screenshot', 'rendered', 'HTML') to the skill prompt.",
        ),
      );
    }
  }

  // --- TDD-0001: Canonical sidecar reference missing in downstream (QFAI-CRIT-002) ---
  for (const sf of skillFiles) {
    const content = await readSafe(sf);
    if (
      content.length > 0 &&
      (!SIDECAR_DIRECTION_RE.test(content) ||
        !STRATEGY_RE.test(content) ||
        !CONTRACTS_RE.test(content))
    ) {
      issues.push(
        issue(
          "QFAI-CRIT-002",
          `Downstream skill prompt missing canonical sidecar references: ${path.relative(root, sf)}`,
          "error",
          sf,
          "renderCritique.sidecarMissing",
          undefined,
          "change",
          "Reference selected direction/comparison, strategy, and screen contracts in the downstream skill prompt.",
        ),
      );
    }
  }

  // --- TDD-0002: Desktop critique missing (QFAI-CRIT-003) ---
  const allEvidenceContent = await collectContent(evidenceFiles);
  if (
    evidenceFiles.length > 0 &&
    !DESKTOP_RE.test(allEvidenceContent) &&
    !renderEvidenceViewports.has("desktop")
  ) {
    issues.push(
      issue(
        "QFAI-CRIT-003",
        "No desktop viewport critique found in evidence files (viewport >= 1024px required).",
        "error",
        evidenceDir,
        "renderCritique.desktopMissing",
        undefined,
        "change",
        "Add desktop viewport critique (>= 1024px) to evidence files.",
      ),
    );
  }

  // --- TDD-0002: Mobile critique missing (QFAI-CRIT-004) ---
  if (
    evidenceFiles.length > 0 &&
    !MOBILE_RE.test(allEvidenceContent) &&
    !renderEvidenceViewports.has("mobile")
  ) {
    issues.push(
      issue(
        "QFAI-CRIT-004",
        "No mobile viewport critique found in evidence files (viewport <= 480px required).",
        "error",
        evidenceDir,
        "renderCritique.mobileMissing",
        undefined,
        "change",
        "Add mobile viewport critique (<= 480px) to evidence files.",
      ),
    );
  }

  // --- TDD-0003: Read order (QFAI-CRIT-005) ---
  // Sidecar-first model: require semantic tokens for strategy, taste/trend/evaluation inputs,
  // selected direction, and screen contracts instead of old DDP-first wording.
  for (const sf of skillFiles) {
    const content = await readSafe(sf);
    if (content.length > 0) {
      const hasSidecar = SIDECAR_DIRECTION_RE.test(content);
      const hasStrategy = STRATEGY_RE.test(content);
      const hasContracts = CONTRACTS_RE.test(content);
      const hasTasteTrendFamily =
        (TASTE_RE.test(content) || TREND_RE.test(content)) && EVAL_FAMILY_RE.test(content);
      if (!hasSidecar || !hasStrategy || !hasContracts || !hasTasteTrendFamily) {
        const missing: string[] = [];
        if (!hasSidecar) missing.push("sidecar/selected direction");
        if (!hasStrategy) missing.push("strategy");
        if (!hasTasteTrendFamily) missing.push("taste/trend/3-layer evaluation family");
        if (!hasContracts) missing.push("contracts");
        issues.push(
          issue(
            "QFAI-CRIT-005",
            `Read order missing required tokens (${missing.join(", ")}): ${path.relative(root, sf)}`,
            "error",
            sf,
            "renderCritique.readOrder",
            undefined,
            "change",
            "Specify read order with strategy, taste/trend plus 3-layer evaluation family, selected direction, and screen contracts.",
          ),
        );
      }
    }
  }

  // --- TDD-0004: Evidence recording (QFAI-CRIT-006) ---
  for (const ef of evidenceFiles) {
    const content = await readSafe(ef);
    if (content.length === 0) continue;
    const hasDate = EVIDENCE_DATE_RE.test(content);
    const hasViewport = EVIDENCE_VIEWPORT_RE.test(content);
    const hasVerdict = EVIDENCE_VERDICT_RE.test(content);
    const hasFindings = EVIDENCE_FINDINGS_RE.test(content);
    if (!hasDate || !hasViewport || !hasVerdict || !hasFindings) {
      const missing: string[] = [];
      if (!hasDate) missing.push("date");
      if (!hasViewport) missing.push("viewport");
      if (!hasVerdict) missing.push("verdict");
      if (!hasFindings) missing.push("findings");
      issues.push(
        issue(
          "QFAI-CRIT-006",
          `Critique evidence incomplete (missing: ${missing.join(", ")}): ${path.relative(root, ef)}`,
          "error",
          ef,
          "renderCritique.incompleteEvidence",
          undefined,
          "change",
          "Ensure evidence includes date, viewport, verdict (PASS/REVISE), and findings.",
        ),
      );
    }
  }

  // --- TDD-0004: Rubric not documented (QFAI-CRIT-007) ---
  if (evidenceFiles.length > 0 && !RUBRIC_RE.test(allEvidenceContent)) {
    issues.push(
      issue(
        "QFAI-CRIT-007",
        "Rubric / evaluation criteria not documented in evidence files.",
        "warning",
        evidenceDir,
        "renderCritique.rubricMissing",
        undefined,
        "change",
        "Document the rubric or evaluation criteria in evidence files for reproducibility.",
      ),
    );
  }

  // --- TDD-0005: Loop completion (QFAI-CRIT-008) ---
  if (evidenceFiles.length > 0) {
    const desktopPass = hasViewportPass(allEvidenceContent, "desktop");
    const mobilePass = hasViewportPass(allEvidenceContent, "mobile");
    if (!desktopPass || !mobilePass) {
      issues.push(
        issue(
          "QFAI-CRIT-008",
          `Iterative loop not completed: ${!desktopPass ? "desktop" : ""}${!desktopPass && !mobilePass ? " and " : ""}${!mobilePass ? "mobile" : ""} viewport not PASS.`,
          "error",
          evidenceDir,
          "renderCritique.loopNotCompleted",
          undefined,
          "change",
          "Both desktop and mobile viewports must have verdict: PASS for the loop to complete.",
        ),
      );
    }
  }

  // --- TDD-0006: taskFidelity not recorded (QFAI-CRIT-009) ---
  if (evidenceFiles.length > 0 && !TASK_FIDELITY_SECTION_RE.test(allEvidenceContent)) {
    issues.push(
      issue(
        "QFAI-CRIT-009",
        "taskFidelity evaluation not recorded in evidence files.",
        "error",
        evidenceDir,
        "renderCritique.taskFidelityMissing",
        undefined,
        "change",
        "Add taskFidelity section with step_count, cta_visibility, and four_state_check.",
      ),
    );
  }

  // --- TDD-0006: taskFidelity FAIL (QFAI-CRIT-010) ---
  if (evidenceFiles.length > 0 && TASK_FIDELITY_SECTION_RE.test(allEvidenceContent)) {
    const stepCountMatch = STEP_COUNT_RE.exec(allEvidenceContent);
    const maxStepsMatch = MAX_PRIMARY_STEPS_RE.exec(allEvidenceContent);
    const hasCta = CTA_VISIBILITY_RE.test(allEvidenceContent);
    const hasFourState = FOUR_STATE_CHECK_RE.test(allEvidenceContent);

    if (!hasCta || !hasFourState) {
      issues.push(
        issue(
          "QFAI-CRIT-009",
          `taskFidelity section incomplete (missing: ${[!hasCta ? "cta_visibility" : "", !hasFourState ? "four_state_check" : ""].filter(Boolean).join(", ")}).`,
          "error",
          evidenceDir,
          "renderCritique.taskFidelityMissing",
          undefined,
          "change",
          "Add missing taskFidelity fields: step_count, cta_visibility, four_state_check.",
        ),
      );
    }

    if (stepCountMatch && maxStepsMatch) {
      const stepCount = parseInt(stepCountMatch[1] ?? "0", 10);
      const maxSteps = parseInt(maxStepsMatch[1] ?? "0", 10);
      if (stepCount > maxSteps) {
        issues.push(
          issue(
            "QFAI-CRIT-010",
            `taskFidelity FAIL: step_count (${stepCount}) exceeds max_primary_steps (${maxSteps}).`,
            "error",
            evidenceDir,
            "renderCritique.taskFidelityFail",
            undefined,
            "change",
            "Reduce step_count to be within max_primary_steps, or revise the flow.",
          ),
        );
      }
    }
  }

  return issues;
}

/**
 * Split evidence into sections (by heading) and check if a viewport has verdict PASS.
 * A section "belongs" to a viewport if it mentions the viewport keyword (desktop/1024 or mobile/480).
 * The verdict in that same section must be PASS.
 */
function hasViewportPass(content: string, viewport: "desktop" | "mobile"): boolean {
  const vpRe = viewport === "desktop" ? DESKTOP_RE : MOBILE_RE;
  // Split by markdown headings to isolate sections
  const sections = content.split(/(?=^#{1,3}\s)/m);
  for (const section of sections) {
    if (vpRe.test(section) && /verdict\s*:\s*PASS/i.test(section)) {
      return true;
    }
  }
  return false;
}

async function collectContent(files: string[]): Promise<string> {
  const contents: string[] = [];
  for (const f of files) {
    contents.push(await readSafe(f));
  }
  return contents.join("\n---\n");
}

async function collectRenderEvidenceViewports(root: string): Promise<Set<string>> {
  const prototypingJsonPath = path.join(root, ".qfai", "evidence", "prototyping.json");
  try {
    const raw = await readFile(prototypingJsonPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return new Set();
    }
    const uiFidelity = (parsed as { uiFidelity?: unknown }).uiFidelity;
    if (!uiFidelity || typeof uiFidelity !== "object" || Array.isArray(uiFidelity)) {
      return new Set();
    }
    const screens = (uiFidelity as { screens?: unknown }).screens;
    if (!Array.isArray(screens)) {
      return new Set();
    }

    const viewports = new Set<string>();
    for (const screen of screens) {
      if (!screen || typeof screen !== "object" || Array.isArray(screen)) {
        continue;
      }
      const renders = (screen as { renders?: unknown }).renders;
      if (!Array.isArray(renders)) {
        continue;
      }
      for (const render of renders) {
        if (!render || typeof render !== "object" || Array.isArray(render)) {
          continue;
        }
        const viewport = (render as { viewport?: unknown }).viewport;
        if (typeof viewport === "string" && viewport.trim().length > 0) {
          viewports.add(viewport.trim().toLowerCase());
        }
      }
    }
    return viewports;
  } catch {
    return new Set();
  }
}

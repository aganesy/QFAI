import path from "node:path";

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
 *   - DDP is read first in downstream skills
 *   - Critique evidence has required fields
 *   - Iterative loop completes when both viewports PASS
 *   - taskFidelity is recorded
 */

const RENDERED_KEYWORDS_RE = /\b(rendered|screenshot|html\b|preview|visual\s*review)/i;
const DDP_REFERENCE_RE = /\b(ddp|design\s*direction\s*pack)\b/i;
const READ_ORDER_RE =
  /DDP[\s\S]{0,40}Design\s*Token[\s\S]{0,40}UI\s*Contract[\s\S]{0,40}HTML\s*Mock[\s\S]{0,40}Flow/i;

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

  // Guard: only run critique checks when DDP exists in discussion packs
  // (indicates v1.6.5 critique process is active)
  const discussionDir = path.join(root, config.paths.discussionDir).replace(/\\/g, "/");
  const discussionFiles = await fg(path.posix.join(discussionDir, "**/*.md"), { absolute: true });
  let hasDdp = false;
  for (const df of discussionFiles) {
    const content = await readSafe(df);
    if (/^#{1,3}\s+Design\s+Direction\s+Pack/im.test(content)) {
      hasDdp = true;
      break;
    }
  }
  if (!hasDdp) return issues;

  const skillsDir = path.join(root, config.paths.skillsDir).replace(/\\/g, "/");
  const evidenceDir = path.join(root, ".qfai", "evidence").replace(/\\/g, "/");

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

  // --- TDD-0001: DDP missing in downstream (QFAI-CRIT-002) ---
  for (const sf of skillFiles) {
    const content = await readSafe(sf);
    if (content.length > 0 && !DDP_REFERENCE_RE.test(content)) {
      issues.push(
        issue(
          "QFAI-CRIT-002",
          `Downstream skill prompt missing DDP reference: ${path.relative(root, sf)}`,
          "error",
          sf,
          "renderCritique.ddpMissing",
          undefined,
          "change",
          "Add DDP (Design Direction Pack) reference to the downstream skill prompt.",
        ),
      );
    }
  }

  // --- TDD-0002: Desktop critique missing (QFAI-CRIT-003) ---
  const allEvidenceContent = await collectContent(evidenceFiles);
  if (evidenceFiles.length > 0 && !DESKTOP_RE.test(allEvidenceContent)) {
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
  if (evidenceFiles.length > 0 && !MOBILE_RE.test(allEvidenceContent)) {
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
  for (const sf of skillFiles) {
    const content = await readSafe(sf);
    if (content.length > 0 && !READ_ORDER_RE.test(content)) {
      issues.push(
        issue(
          "QFAI-CRIT-005",
          `Read order not specified (DDP → Design Token → UI Contract → HTML Mock → Flow): ${path.relative(root, sf)}`,
          "error",
          sf,
          "renderCritique.readOrder",
          undefined,
          "change",
          "Specify the read order: DDP → Design Token → UI Contract → HTML Mock → Flow.",
        ),
      );
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

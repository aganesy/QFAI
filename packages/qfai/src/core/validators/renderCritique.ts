import path from "node:path";
import { readFile } from "node:fs/promises";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import { PROTOTYPING_JSON_REL } from "../prototyping/paths.js";
import { escapeRegExp } from "../regex.js";
import type { Issue } from "../types.js";
import {
  TASK_FIDELITY_REQUIRED_KEYWORDS,
  TASK_FIDELITY_SECTION_NAME,
} from "./taskFidelityKeywords.js";
import { issue, readSafe } from "./utils.js";

/**
 * Render Critique Loop validator.
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
const SPEC_RE = /\b(01_spec|03_acceptance-criteria|spec-|\bspec\b)\b/i;
// DESIGN.md is the brand SSOT (replaces the legacy exploration-brief /
// brand-design / reference-pool sidecars); design-system.yaml and
// prototype-handoff.yaml are produced AFTER prototyping completes, so
// they are not required references in the upstream skill prompts.
const DESIGN_MD_RE = /\bDESIGN\.md\b/;
const UI_CONTRACTS_RE = /\b(contracts\/ui|ui\s*contracts|screen\s*contracts)\b/i;

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
/**
 * Unfilled-placeholder markers that the `--capture` skeleton template
 * (`core/prototyping/captureTemplate.ts`) emits next to each required
 * keyword. The skeleton lives under `iter-NN/task-fidelity-template.md`
 * which is OUTSIDE the renderCritique evidence-pattern scan (direct
 * children of `.qfai/evidence/` only), so the template alone cannot
 * trip CRIT-009 today. But if an operator copies the template's
 * placeholder values into a scanned evidence file
 * (`.qfai/evidence/prototyping*.md` or `critique-*.md`), the bare-
 * keyword regex above would still PASS the section. This SSOT regex
 * detects the unfilled markers so a placeholder-only section
 * surfaces as CRIT-009 even after the file is reachable.
 *
 * Treat `TODO`, `FIXME`, `XXX`, `TBD`, `<placeholder>`, and empty
 * (whitespace-only) values as unfilled.
 *
 * Exported so the Stage 0 steering scan in `assistantAssets.ts`
 * (`QFAI-ASSETS-003`) reuses this spelling instead of introducing a
 * third one. Non-global, so callers share it without `lastIndex`
 * interference.
 */
export const TODO_PLACEHOLDER_RE = /^(?:\s*(?:TODO|FIXME|XXX|TBD|<placeholder>)\s*|\s*)$/i;
const MAX_PRIMARY_STEPS_RE = /\bmax_primary_steps\s*:\s*(\d+)/i;

export async function validateRenderCritique(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const skillsDir = path.join(root, config.paths.skillsDir).replace(/\\/g, "/");
  const evidenceDir = path.join(root, ".qfai", "evidence").replace(/\\/g, "/");
  const skillPromptPattern = path.posix.join(skillsDir, "qfai-{prototyping,implement}*/SKILL.md");
  const skillFiles = await fg(skillPromptPattern, { dot: true });
  const evidencePattern = path.posix.join(evidenceDir, "{prototyping*,critique-*}.md");
  const evidenceFiles = await fg(evidencePattern, { dot: true });
  if (skillFiles.length === 0 && evidenceFiles.length === 0) return issues;

  const renderEvidenceViewports = await collectRenderEvidenceViewports(root);

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

  // --- Canonical spec/contract reference missing in downstream (QFAI-CRIT-002) ---
  // Required: spec inputs + root DESIGN.md (brand SSOT) + UI contracts.
  for (const sf of skillFiles) {
    const content = await readSafe(sf);
    if (
      content.length > 0 &&
      (!SPEC_RE.test(content) || !DESIGN_MD_RE.test(content) || !UI_CONTRACTS_RE.test(content))
    ) {
      issues.push(
        issue(
          "QFAI-CRIT-002",
          `Downstream skill prompt missing canonical spec/contract references: ${path.relative(root, sf)}`,
          "error",
          sf,
          "renderCritique.contractMissing",
          undefined,
          "change",
          "Reference spec inputs, root DESIGN.md, and UI contracts in the downstream skill prompt.",
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
  // Contract-first model: require semantic tokens for spec inputs, the
  // root DESIGN.md brand SSOT, and UI contracts.
  for (const sf of skillFiles) {
    const content = await readSafe(sf);
    if (content.length > 0) {
      const hasSpec = SPEC_RE.test(content);
      const hasDesignMd = DESIGN_MD_RE.test(content);
      const hasUiContracts = UI_CONTRACTS_RE.test(content);
      if (!hasSpec || !hasDesignMd || !hasUiContracts) {
        const missing: string[] = [];
        if (!hasSpec) missing.push("spec inputs");
        if (!hasDesignMd) missing.push("DESIGN.md");
        if (!hasUiContracts) missing.push("ui contracts");
        issues.push(
          issue(
            "QFAI-CRIT-005",
            `Read order missing required tokens (${missing.join(", ")}): ${path.relative(root, sf)}`,
            "error",
            sf,
            "renderCritique.readOrder",
            undefined,
            "change",
            "Specify read order with spec inputs, root DESIGN.md, and UI contracts.",
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
    // Use TASK_FIDELITY_REQUIRED_KEYWORDS (SSOT) so the error text
    // surfaces every required keyword and the operator-facing doc
    // (references/evidence-requirements.md) cannot drift from the
    // validator. Naming the section explicitly removes the need for
    // the operator to grep for the expected document anchor.
    const keywordList = TASK_FIDELITY_REQUIRED_KEYWORDS.join(", ");
    issues.push(
      issue(
        "QFAI-CRIT-009",
        `taskFidelity evaluation not recorded in evidence files. ` +
          `Required keywords: ${keywordList}. Expected section: ${TASK_FIDELITY_SECTION_NAME}.`,
        "error",
        evidenceDir,
        "renderCritique.taskFidelityMissing",
        undefined,
        "change",
        `Add ${TASK_FIDELITY_SECTION_NAME} section with: ${keywordList}.`,
      ),
    );
  }

  // --- TDD-0006: taskFidelity FAIL (QFAI-CRIT-010) ---
  if (evidenceFiles.length > 0 && TASK_FIDELITY_SECTION_RE.test(allEvidenceContent)) {
    const stepCountMatch = STEP_COUNT_RE.exec(allEvidenceContent);
    const maxStepsMatch = MAX_PRIMARY_STEPS_RE.exec(allEvidenceContent);
    const hasCta = CTA_VISIBILITY_RE.test(allEvidenceContent);
    const hasFourState = FOUR_STATE_CHECK_RE.test(allEvidenceContent);

    // Defense-in-depth: detect unfilled placeholder values for the
    // required keywords. Even when the section heading + keyword
    // tokens are present, a value like `TODO` / `FIXME` / `<placeholder>`
    // (or empty) means the operator has not actually recorded the
    // task-fidelity evaluation — emit CRIT-009 so the placeholder
    // evidence cannot advance through validation. Mirrors the
    // captureTemplate.ts skeleton emission so the skeleton + this
    // check stay aligned at the SSOT level.
    const placeholderKeywords: string[] = [];
    for (const keyword of TASK_FIDELITY_REQUIRED_KEYWORDS) {
      // Capture the value bytes after `<keyword>:` for SSOT keywords.
      //   - `[ \t]*` (NOT `\s*`) after the colon so an EMPTY value
      //     (`cta_visibility:` followed by a newline) captures the
      //     empty string here, not the next line's content. `\s`
      //     would include `\n` and let the capture greedily walk
      //     past the line, producing a false-negative for the empty
      //     placeholder class.
      //   - `[^\r\n]*` for the capture so we never cross a line.
      //   - `escapeRegExp` (canonical SSOT in `core/regex.ts`) so a
      //     future keyword containing regex metacharacters does not
      //     silently break the extraction. Today's keywords are
      //     `[a-z_]` only, but the SSOT is open-ended; reusing the
      //     repo-wide canonical helper keeps the escape semantics
      //     in lockstep with the other consumer sites that already
      //     import from `core/regex.ts`.
      const valueRe = new RegExp(`\\b${escapeRegExp(keyword)}[ \\t]*:[ \\t]*([^\\r\\n]*)`, "i");
      const m = valueRe.exec(allEvidenceContent);
      const valueText = m?.[1] ?? "";
      if (m && TODO_PLACEHOLDER_RE.test(valueText)) {
        placeholderKeywords.push(keyword);
      }
    }
    if (placeholderKeywords.length > 0) {
      const keywordList = TASK_FIDELITY_REQUIRED_KEYWORDS.join(", ");
      issues.push(
        issue(
          "QFAI-CRIT-009",
          `taskFidelity placeholders not filled — placeholder markers (TODO / ` +
            `FIXME / XXX / TBD / <placeholder>) or empty values detected for: ` +
            `${placeholderKeywords.join(", ")}. The --capture skeleton seeds ` +
            `these markers; replace each with the recorded evaluation before ` +
            `sealing the iteration. ` +
            `Required keywords: ${keywordList}. Expected section: ${TASK_FIDELITY_SECTION_NAME}.`,
          "error",
          evidenceDir,
          "renderCritique.taskFidelityPlaceholder",
          undefined,
          "change",
          `Replace placeholder markers (TODO / FIXME / XXX / TBD / <placeholder>) or empty values for ${placeholderKeywords.join(", ")} with the actual recorded evaluation.`,
        ),
      );
    }

    if (!hasCta || !hasFourState) {
      // Reuse TASK_FIDELITY_REQUIRED_KEYWORDS so any new required
      // keyword (added by spec ledger updates) shows up in the error
      // text automatically — the validator never naming-drifts from
      // the SSOT keyword list.
      const allKeywords = TASK_FIDELITY_REQUIRED_KEYWORDS.join(", ");
      issues.push(
        issue(
          "QFAI-CRIT-009",
          `taskFidelity section incomplete (missing: ${[!hasCta ? "cta_visibility" : "", !hasFourState ? "four_state_check" : ""].filter(Boolean).join(", ")}). ` +
            `Required keywords: ${allKeywords}. Expected section: ${TASK_FIDELITY_SECTION_NAME}.`,
          "error",
          evidenceDir,
          "renderCritique.taskFidelityMissing",
          undefined,
          "change",
          `Add missing taskFidelity fields: ${allKeywords}.`,
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
  // SSOT: read the canonical prototyping.json path. Until 1.8.9 this
  // helper hard-coded `.qfai/evidence/prototyping.json`, but the
  // canonical path moved under `.qfai/evidence/prototyping/` together
  // with the rest of the loop evidence. A stale literal here meant
  // viewport metadata written by iterate / validate (under the new
  // path) was not visible to render-critique, surfacing as spurious
  // QFAI-CRIT-003/004 even though the iter HTML had the right viewport
  // entries.
  const prototypingJsonPath = path.join(root, PROTOTYPING_JSON_REL);
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

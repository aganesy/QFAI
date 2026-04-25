/**
 * Mode invariant validator (spec-0017 REQ-0001, REQ-0002).
 *
 * Enforces the Prototyping Mode Invariant: modes may differ only in
 * `maxCycles`. Any other mode-dependent value in `prototyping.json`
 * — browserTool, evidence obligations, gate severity — is a violation.
 *
 * Emits QFAI-PROT-MODE-001.
 */

import {
  PROTOTYPING_MAX_CYCLES,
  isValidPrototypingMode,
  type PrototypingMode,
} from "../../review/prototyping.js";
import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type DetectedMode = { mode: PrototypingMode; source: "string" | "object" } | null;

function detectMode(raw: unknown): DetectedMode {
  if (!isRecord(raw)) return null;
  if (typeof raw.mode === "string" && isValidPrototypingMode(raw.mode)) {
    return { mode: raw.mode, source: "string" };
  }
  if (isRecord(raw.mode) && typeof raw.mode.effective === "string") {
    const effective = raw.mode.effective;
    if (isValidPrototypingMode(effective)) {
      return { mode: effective, source: "object" };
    }
  }
  return null;
}

/**
 * Validate the prototyping.json mode invariant.
 *
 * Required: `maxCycles` matches PROTOTYPING_MAX_CYCLES[mode.effective]
 * and `browserTool` equals `"playwright-cli"` (or is absent, to allow
 * incremental adoption while legacy fixtures without browserTool still
 * flow through validators landing in later phases).
 *
 * @param raw parsed `prototyping.json` content
 * @param evidencePathForIssue rel path used in issue.path; caller typically
 *   passes `.qfai/evidence/prototyping.json`
 */
export function validateModeInvariant(
  raw: unknown,
  evidencePathForIssue = ".qfai/evidence/prototyping.json",
): Issue[] {
  if (!isRecord(raw)) {
    // Higher-level validators handle "not an object"; mode invariant stays silent here.
    return [];
  }

  const detected = detectMode(raw);
  if (!detected) {
    return [];
  }

  const issues: Issue[] = [];
  const expectedMaxCycles = PROTOTYPING_MAX_CYCLES[detected.mode];

  // Mode invariant treats `maxIterations` as a deprecated alias of `maxCycles`.
  // If both are present they MUST agree; otherwise budget/gate decisions
  // disagree between readers and the canonical mode invariant is violated.
  if (
    raw.maxCycles !== undefined &&
    raw.maxIterations !== undefined &&
    raw.maxCycles !== raw.maxIterations
  ) {
    issues.push(
      issue(
        "QFAI-PROT-MODE-001",
        `prototyping.json declares both maxCycles and maxIterations with conflicting values ` +
          `(maxCycles=${JSON.stringify(raw.maxCycles)}, maxIterations=${JSON.stringify(raw.maxIterations)}). ` +
          `They must agree (maxIterations is a deprecated alias).`,
        "error",
        evidencePathForIssue,
        "prototyping.modeInvariant.maxCyclesAlias",
        [JSON.stringify(raw.maxCycles), JSON.stringify(raw.maxIterations)],
        "canonical",
        "Remove the redundant key or align both values; prefer maxCycles (spec-0017 REQ-0001).",
      ),
    );
  }

  const maxCyclesRaw = raw.maxCycles ?? raw.maxIterations;
  if (maxCyclesRaw !== undefined) {
    if (
      typeof maxCyclesRaw !== "number" ||
      !Number.isInteger(maxCyclesRaw) ||
      maxCyclesRaw !== expectedMaxCycles
    ) {
      const maxCyclesDisplay = JSON.stringify(maxCyclesRaw);
      issues.push(
        issue(
          "QFAI-PROT-MODE-001",
          `Mode differences are limited to maxCycles only. ` +
            `Expected maxCycles=${expectedMaxCycles} for mode=${detected.mode}, got ${maxCyclesDisplay}.`,
          "error",
          evidencePathForIssue,
          "prototyping.modeInvariant",
          [detected.mode, String(expectedMaxCycles), maxCyclesDisplay],
          "canonical",
          `Set prototyping.json maxCycles to ${expectedMaxCycles} ` +
            `to match PROTOTYPING_MAX_CYCLES[${detected.mode}], ` +
            `or switch the mode if a different budget is desired (spec-0017 REQ-0001).`,
        ),
      );
    }
  }

  if (raw.browserTool !== undefined) {
    if (raw.browserTool !== "playwright-cli") {
      const browserToolDisplay = JSON.stringify(raw.browserTool);
      issues.push(
        issue(
          "QFAI-PROT-MODE-001",
          `browserTool must be "playwright-cli" (spec-0017 REQ-0002). Got: ${browserToolDisplay}`,
          "error",
          evidencePathForIssue,
          "prototyping.modeInvariant.browserTool",
          [browserToolDisplay],
          "canonical",
          'Set prototyping.json browserTool to "playwright-cli". ' +
            "Playwright MCP and legacy providers are not supported in the standard harness.",
        ),
      );
    }
  }

  return issues;
}

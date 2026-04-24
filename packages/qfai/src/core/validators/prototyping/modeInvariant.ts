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

  const maxCyclesRaw = raw.maxCycles ?? raw.maxIterations;
  if (maxCyclesRaw !== undefined) {
    if (
      typeof maxCyclesRaw !== "number" ||
      !Number.isInteger(maxCyclesRaw) ||
      maxCyclesRaw !== expectedMaxCycles
    ) {
      issues.push(
        issue(
          "QFAI-PROT-MODE-001",
          `Mode differences are limited to maxCycles only. ` +
            `Expected maxCycles=${expectedMaxCycles} for mode=${detected.mode}, got ${String(
              maxCyclesRaw,
            )}.`,
          "error",
          evidencePathForIssue,
          "prototyping.modeInvariant",
          [detected.mode, String(expectedMaxCycles), String(maxCyclesRaw)],
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
      issues.push(
        issue(
          "QFAI-PROT-MODE-001",
          `browserTool must be "playwright-cli" (spec-0017 REQ-0002). Got: ${JSON.stringify(
            raw.browserTool,
          )}`,
          "error",
          evidencePathForIssue,
          "prototyping.modeInvariant.browserTool",
          [String(raw.browserTool)],
          "canonical",
          'Set prototyping.json browserTool to "playwright-cli". ' +
            "Playwright MCP and legacy providers are not supported in the standard harness.",
        ),
      );
    }
  }

  return issues;
}

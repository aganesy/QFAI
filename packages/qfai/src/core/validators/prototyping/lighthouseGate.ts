/**
 * Lighthouse gate validator — enforces that a Lighthouse report is present
 * when mode=full-harness and surface=web.
 *
 * v1.8.4 Phase 9 BREAKING: removed the legacy `validateLighthouseGate` /
 * `LighthouseGateIssue` exports; callers MUST use
 * `validateLighthouseGateIssues` which returns standard `Issue[]`.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function detectMode(raw: unknown): string {
  if (!isRecord(raw)) return "other";
  if (typeof raw.mode === "string") return raw.mode;
  if (isRecord(raw.mode) && typeof raw.mode.effective === "string") {
    return raw.mode.effective;
  }
  return "other";
}

function detectSurface(raw: unknown): string {
  if (!isRecord(raw)) return "unknown";
  if (typeof raw.surface === "string") return raw.surface;
  return "unknown";
}

function hasLighthouseReport(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  const report = raw.lighthouseReport ?? raw.lighthouse;
  if (!report) return false;
  if (isRecord(report)) return Object.keys(report).length > 0;
  if (typeof report === "string") return report.trim().length > 0;
  return false;
}

/**
 * Issues `QFAI-PROT-332` when full-harness + web surface lacks a
 * lighthouse report.
 */
export function validateLighthouseGateIssues(
  prototypingJson: unknown,
  prototypingJsonPath: string,
): Issue[] {
  const mode = detectMode(prototypingJson);
  const surface = detectSurface(prototypingJson);

  if (mode !== "full-harness" || surface !== "web") {
    return [];
  }

  if (hasLighthouseReport(prototypingJson)) {
    return [];
  }

  return [
    issue(
      "QFAI-PROT-332",
      "Lighthouse Gate is MUST for full-harness + web surface: no Lighthouse report found in prototyping evidence.",
      "error",
      prototypingJsonPath,
      "prototyping.lighthouseReport",
      undefined,
      "canonical",
      "full-harness + web surface では `prototyping.json.lighthouseReport` (または `lighthouse`) を記録してください。",
    ),
  ];
}

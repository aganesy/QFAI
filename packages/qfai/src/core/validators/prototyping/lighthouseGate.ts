/**
 * Lighthouse gate validator — enforces that a Lighthouse report is present
 * when mode=full-harness and surface=web.
 *
 * spec-0012 TC-0012-0299 / TC-0012-0300 / AC-0012-0182
 *
 * v1.8.4 Phase 3: wired into validateStateGate via validateLighthouseGateIssues.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

/**
 * @deprecated v1.8.4: use `validateLighthouseGateIssues`. Will be removed
 * in Phase 8.
 */
export interface LighthouseGateIssue {
  readonly rule: "PROT-LIGHTHOUSE";
  readonly message: string;
}

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
 * @deprecated v1.8.4: use `validateLighthouseGateIssues`.
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated -- self-reference inside deprecated function
export function validateLighthouseGate(prototypingJson: unknown): LighthouseGateIssue[] {
  const mode = detectMode(prototypingJson);
  const surface = detectSurface(prototypingJson);

  if (mode !== "full-harness" || surface !== "web") {
    return [];
  }

  if (hasLighthouseReport(prototypingJson)) {
    return [];
  }

  return [
    {
      rule: "PROT-LIGHTHOUSE",
      message:
        "Lighthouse Gate is MUST for full-harness + web surface: no Lighthouse report found in prototyping evidence.",
    },
  ];
}

/**
 * v1.8.4 standard adapter. Returns `Issue[]`.
 *
 * Issued code: `QFAI-PROT-332` (single issue when full-harness + web surface
 * has no lighthouse report).
 */
export function validateLighthouseGateIssues(
  prototypingJson: unknown,
  prototypingJsonPath: string,
): Issue[] {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- adapter intentionally bridges legacy implementation
  return validateLighthouseGate(prototypingJson).map((custom) =>
    issue(
      "QFAI-PROT-332",
      custom.message,
      "error",
      prototypingJsonPath,
      "prototyping.lighthouseReport",
      undefined,
      "canonical",
      "full-harness + web surface では `prototyping.json.lighthouseReport` (または `lighthouse`) を記録してください。",
    ),
  );
}

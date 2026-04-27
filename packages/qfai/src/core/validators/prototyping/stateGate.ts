/**
 * Prototyping state-gate orchestrator (v1.8.4).
 *
 * Reads .qfai/evidence/prototyping.json once and dispatches it to the
 * standalone presence/threshold validators that share the document:
 *
 *   - validateExecutionPlanIssues          (QFAI-PROT-310)
 *   - validateDelegationMapIssues          (QFAI-PROT-311)
 *   - validateScreenshotDirIssues          (QFAI-PROT-331)  — Phase 3
 *   - validateLighthouseGateIssues         (QFAI-PROT-332)  — Phase 3
 *   - validateIterationGateIssues          (QFAI-PROT-333)  — Phase 3
 *   - validateDesignSystemThresholdIssues  (QFAI-PROT-334)  — Phase 3
 *
 * Wired into runPrototypingValidators (validate.ts). The orchestrator pattern
 * avoids parsing prototyping.json multiple times and keeps each individual
 * validator independently unit-testable.
 *
 * If prototyping.json is absent or malformed, no issues are emitted from this
 * orchestrator — `validatePrototypingEvidence` already raises QFAI-PROT-150.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { validateDelegationMapIssues } from "./delegationMap.js";
import { validateDesignSystemThresholdIssues } from "./designSystemThreshold.js";
import { validateExecutionPlanIssues } from "./executionPlan.js";
import { validateIterationGateIssues, type FullHarnessIterationEntry } from "./iterationGate.js";
import { validateLighthouseGateIssues } from "./lighthouseGate.js";
import { validateScreenshotDirIssues } from "./screenshotDir.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractDelegationMap(prototypingJson: unknown): Record<string, unknown> | undefined {
  if (!isRecord(prototypingJson)) return undefined;
  const executionPlan = prototypingJson.executionPlan;
  if (!isRecord(executionPlan)) return undefined;
  const delegationMap = executionPlan.delegationMap;
  if (!isRecord(delegationMap)) return undefined;
  // Pass entries through verbatim — non-string values must be flagged by
  // validateDelegationMapIssues, not silently dropped here. (Codex review
  // on PR #201: malformed entries like { UI実装: 123 } previously slipped
  // past the state gate.)
  return delegationMap;
}

function extractMode(prototypingJson: unknown): string {
  if (!isRecord(prototypingJson)) return "other";
  if (typeof prototypingJson.mode === "string") return prototypingJson.mode;
  if (isRecord(prototypingJson.mode) && typeof prototypingJson.mode.effective === "string") {
    return prototypingJson.mode.effective;
  }
  return "other";
}

function extractScoringTrace(prototypingJson: unknown): readonly unknown[] {
  if (!isRecord(prototypingJson)) return [];
  const fullHarness = prototypingJson.fullHarness;
  if (!isRecord(fullHarness)) return [];
  const trace = fullHarness.scoringTrace;
  return Array.isArray(trace) ? (trace as readonly unknown[]) : [];
}

function extractFullHarnessIterations(
  prototypingJson: unknown,
): readonly FullHarnessIterationEntry[] {
  if (!isRecord(prototypingJson)) return [];
  const fullHarness = prototypingJson.fullHarness;
  if (!isRecord(fullHarness)) return [];
  const iterations = fullHarness.iterations;
  if (!Array.isArray(iterations)) return [];
  // Filter to entries that look like FullHarnessIterationEntry. We need
  // iterationCount: number; converged is optional. Wrong-shape entries
  // are dropped silently — other validators (e.g. prototypingEvidence)
  // own structural checks for full-harness iterations.
  return iterations.filter(
    (entry): entry is FullHarnessIterationEntry =>
      isRecord(entry) && typeof entry.iterationCount === "number",
  );
}

function resolveCalibrationPackDir(root: string, config: QfaiConfig): string | undefined {
  const packPath = config.prototyping?.calibration?.packPath;
  if (!packPath || typeof packPath !== "string") return undefined;
  return path.resolve(root, packPath);
}

export async function validateStateGate(root: string, config: QfaiConfig): Promise<Issue[]> {
  const evidenceRoot = path.join(
    path.dirname(path.resolve(root, config.paths.specsDir)),
    "evidence",
  );
  const prototypingJsonPath = path.join(evidenceRoot, "prototyping.json");

  let raw: string;
  try {
    raw = await readFile(prototypingJsonPath, "utf-8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const relPath = path.relative(root, prototypingJsonPath).replace(/\\/g, "/");
  const mode = extractMode(parsed);
  const issues: Issue[] = [];

  // Phase 2 wiring
  issues.push(...validateExecutionPlanIssues(parsed, relPath));
  issues.push(...validateDelegationMapIssues(extractDelegationMap(parsed), relPath));

  // Phase 3 wiring
  issues.push(...validateScreenshotDirIssues(extractScoringTrace(parsed), mode, relPath));
  issues.push(...validateIterationGateIssues(extractFullHarnessIterations(parsed), relPath));
  issues.push(...validateLighthouseGateIssues(parsed, relPath));

  const packDir = resolveCalibrationPackDir(root, config);
  if (packDir) {
    issues.push(...(await validateDesignSystemThresholdIssues(packDir, parsed, relPath)));
  }

  return issues;
}

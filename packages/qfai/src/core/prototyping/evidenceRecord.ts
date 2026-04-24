/**
 * prototyping.json rollup writer (spec-0017 REQ-0005).
 *
 * Builds and persists the cycle-centric `PrototypingEvidenceRecord` that
 * validators consume to enforce the unified strictest completion gate.
 * This is the top-level evidence record; per-cycle review bundles /
 * command plans / evaluator reviews live under
 * `.qfai/evidence/prototyping/iterations/<cycle>/`.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PROTOTYPING_MAX_CYCLES,
  type PrototypingMode,
} from "../review/prototyping.js";

import {
  cycleCommandLogPath,
  cycleCommandPlanPath,
  cycleEvaluatorReviewPath,
  cycleHtmlPath,
  cycleReviewBundlePath,
  cycleScreenshotPath,
  cycleSnapshotPath,
  type PrototypingCycleEvidence,
  type PrototypingCyclePhase,
  type PrototypingEvidenceRecord,
} from "./types.js";

export type BuildCycleEvidenceInput = {
  cycle: number;
  kind: PrototypingCyclePhase;
  screens: Array<{ screenId: string }>;
  reviewerScores?: PrototypingCycleEvidence["reviewerScores"];
  allReviewerAxesPerfect100?: boolean;
};

/**
 * Build a PrototypingCycleEvidence using the canonical evidence paths.
 * Callers pass reviewer scores from the AI evaluator output; QFAI fills in
 * the path refs.
 */
export function buildCycleEvidence(
  input: BuildCycleEvidenceInput,
): PrototypingCycleEvidence {
  if (!Number.isInteger(input.cycle) || input.cycle < 1) {
    throw new Error(
      `buildCycleEvidence: cycle must be a positive integer, got ${input.cycle}`,
    );
  }

  return {
    cycle: input.cycle,
    kind: input.kind,
    commandPlanRef: cycleCommandPlanPath(input.cycle),
    reviewBundleRef: cycleReviewBundlePath(input.cycle),
    evaluatorReviewRef: cycleEvaluatorReviewPath(input.cycle),
    screenEvidence: input.screens.map((screen) => ({
      screenId: screen.screenId,
      screenshotRef: cycleScreenshotPath(input.cycle, screen.screenId),
      htmlRef: cycleHtmlPath(input.cycle, screen.screenId),
      snapshotRef: cycleSnapshotPath(input.cycle, screen.screenId),
      commandLogRef: cycleCommandLogPath(input.cycle, screen.screenId),
    })),
    reviewerScores: input.reviewerScores ?? [],
    allReviewerAxesPerfect100: input.allReviewerAxesPerfect100 ?? false,
  };
}

export type BuildPrototypingEvidenceRecordInput = {
  surface: PrototypingEvidenceRecord["surface"];
  mode: PrototypingMode;
  modeSource: string;
  modeRationale: string;
  cycles: PrototypingCycleEvidence[];
  bestOfHistory: PrototypingEvidenceRecord["bestOfHistory"];
  breakthrough: PrototypingEvidenceRecord["breakthrough"];
  reviewerGate: PrototypingEvidenceRecord["reviewerGate"];
  completionClaimed?: boolean;
};

/**
 * Build the top-level prototyping.json record (no I/O).
 */
export function buildPrototypingEvidenceRecord(
  input: BuildPrototypingEvidenceRecordInput,
): PrototypingEvidenceRecord {
  return {
    surface: input.surface,
    mode: {
      effective: input.mode,
      source: input.modeSource,
      rationale: input.modeRationale,
    },
    browserTool: "playwright-cli",
    maxCycles: PROTOTYPING_MAX_CYCLES[input.mode],
    cycles: input.cycles,
    bestOfHistory: input.bestOfHistory,
    breakthrough: input.breakthrough,
    reviewerGate: input.reviewerGate,
    completionClaimed: input.completionClaimed ?? false,
  };
}

export type WritePrototypingEvidenceRecordInput = BuildPrototypingEvidenceRecordInput & {
  /** Repo root (absolute path) where the .qfai tree lives. */
  root: string;
};

/**
 * Persist the prototyping evidence record at `.qfai/evidence/prototyping.json`.
 *
 * Returns the absolute path of the written file and the in-memory record.
 */
export async function writePrototypingEvidenceRecord(
  input: WritePrototypingEvidenceRecordInput,
): Promise<{ path: string; record: PrototypingEvidenceRecord }> {
  const record = buildPrototypingEvidenceRecord(input);

  const evidenceDir = path.join(input.root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });

  const recordPath = path.join(evidenceDir, "prototyping.json");
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf-8");

  return { path: recordPath, record };
}

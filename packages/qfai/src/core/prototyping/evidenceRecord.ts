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

import { PROTOTYPING_MAX_CYCLES, type PrototypingMode } from "../review/prototyping.js";

import type { Candidate } from "./candidate.js";
import type { ExplorationRound } from "./round.js";
import {
  isAbsorptionRound,
  isHarvestableExplorationRound,
  roundAbsorptionPlanPath,
  roundCandidateEvidencePath,
  roundEvaluatorReviewPath,
  roundHarvestPath,
  roundNarrowDecisionPath,
  roundReimplementationPath,
} from "./round.js";
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

export type ScreenArtifactRefsV2 = {
  screenId: string;
  screenshotRef: string;
  htmlRef: string;
  snapshotRef: string;
  commandLogRef: string;
};

export type PrototypingRoundEvidence = {
  round: ExplorationRound;
  candidates: Candidate[];
  screenEvidenceByCandidate: Record<string, ScreenArtifactRefsV2[]>;
  evaluatorReviewRefsByCandidate: Record<string, string>;
  harvestRef: string | null;
  narrowDecisionRef: string | null;
  absorptionPlanRef: string | null;
  reimplementationRef: string | null;
  allAxesPerfect100: boolean;
};

export type PrototypingPolishCycleEvidenceV2 = {
  cycle: number;
  kind: "polish" | "branch" | "reviewer_gate" | "completed";
  screenEvidence: ScreenArtifactRefsV2[];
  evaluatorReviewRef: string;
  breakthroughRef: string | null;
  reviewerGateRef: string | null;
  allAxesPerfect100: boolean;
};

export type PrototypingEvidenceRecordV2 = {
  schemaVersion: "2.0";
  surface: PrototypingEvidenceRecord["surface"];
  mode: PrototypingEvidenceRecord["mode"];
  browserTool: "playwright-cli";
  maxCycles: number;
  rounds: PrototypingRoundEvidence[];
  polishCycles: PrototypingPolishCycleEvidenceV2[];
  bestOfHistory: PrototypingEvidenceRecord["bestOfHistory"];
  breakthrough: PrototypingEvidenceRecord["breakthrough"];
  reviewerGate: PrototypingEvidenceRecord["reviewerGate"];
  completionClaimed: boolean;
};

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
export function buildCycleEvidence(input: BuildCycleEvidenceInput): PrototypingCycleEvidence {
  if (!Number.isInteger(input.cycle) || input.cycle < 1) {
    throw new Error(`buildCycleEvidence: cycle must be a positive integer, got ${input.cycle}`);
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

export type BuildRoundEvidenceInput = {
  round: ExplorationRound;
  candidates: Candidate[];
  screens: Array<{ screenId: string }>;
  allAxesPerfect100?: boolean;
};

export function buildRoundEvidence(input: BuildRoundEvidenceInput): PrototypingRoundEvidence {
  const screenEvidenceByCandidate: Record<string, ScreenArtifactRefsV2[]> = {};
  const evaluatorReviewRefsByCandidate: Record<string, string> = {};

  for (const candidate of input.candidates) {
    screenEvidenceByCandidate[candidate.candidateId] = input.screens.map((screen) => ({
      screenId: screen.screenId,
      screenshotRef: roundCandidateEvidencePath(
        input.round,
        candidate.candidateId,
        screen.screenId,
        "png",
      ),
      htmlRef: roundCandidateEvidencePath(
        input.round,
        candidate.candidateId,
        screen.screenId,
        "html",
      ),
      snapshotRef: roundCandidateEvidencePath(
        input.round,
        candidate.candidateId,
        screen.screenId,
        "snapshot.txt",
      ),
      commandLogRef: roundCandidateEvidencePath(
        input.round,
        candidate.candidateId,
        screen.screenId,
        "commands.json",
      ),
    }));
    evaluatorReviewRefsByCandidate[candidate.candidateId] = roundEvaluatorReviewPath(
      input.round,
      candidate.candidateId,
    );
  }

  return {
    round: input.round,
    candidates: [...input.candidates],
    screenEvidenceByCandidate,
    evaluatorReviewRefsByCandidate,
    harvestRef: isHarvestableExplorationRound(input.round) ? roundHarvestPath(input.round) : null,
    narrowDecisionRef: isHarvestableExplorationRound(input.round)
      ? roundNarrowDecisionPath(input.round)
      : null,
    absorptionPlanRef: isAbsorptionRound(input.round) ? roundAbsorptionPlanPath(input.round) : null,
    reimplementationRef: isAbsorptionRound(input.round)
      ? roundReimplementationPath(input.round)
      : null,
    allAxesPerfect100: input.allAxesPerfect100 ?? false,
  };
}

export type BuildPrototypingEvidenceRecordV2Input = {
  surface: PrototypingEvidenceRecordV2["surface"];
  mode: PrototypingMode;
  modeSource: string;
  modeRationale: string;
  rounds: PrototypingRoundEvidence[];
  polishCycles: PrototypingPolishCycleEvidenceV2[];
  bestOfHistory: PrototypingEvidenceRecordV2["bestOfHistory"];
  breakthrough: PrototypingEvidenceRecordV2["breakthrough"];
  reviewerGate: PrototypingEvidenceRecordV2["reviewerGate"];
  completionClaimed?: boolean;
};

export function buildPrototypingEvidenceRecordV2(
  input: BuildPrototypingEvidenceRecordV2Input,
): PrototypingEvidenceRecordV2 {
  return {
    schemaVersion: "2.0",
    surface: input.surface,
    mode: {
      effective: input.mode,
      source: input.modeSource,
      rationale: input.modeRationale,
    },
    browserTool: "playwright-cli",
    maxCycles: PROTOTYPING_MAX_CYCLES[input.mode],
    rounds: [...input.rounds],
    polishCycles: [...input.polishCycles],
    bestOfHistory: input.bestOfHistory,
    breakthrough: input.breakthrough,
    reviewerGate: input.reviewerGate,
    completionClaimed: input.completionClaimed ?? false,
  };
}

export type WritePrototypingEvidenceRecordV2Input = BuildPrototypingEvidenceRecordV2Input & {
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

export async function writePrototypingEvidenceRecordV2(
  input: WritePrototypingEvidenceRecordV2Input,
): Promise<{ path: string; record: PrototypingEvidenceRecordV2 }> {
  const record = buildPrototypingEvidenceRecordV2(input);

  const evidenceDir = path.join(input.root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });

  const recordPath = path.join(evidenceDir, "prototyping.json");
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf-8");

  return { path: recordPath, record };
}

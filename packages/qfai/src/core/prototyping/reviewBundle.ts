/**
 * Review bundle writer (spec-0017 REQ-0006, REQ-0007).
 *
 * Builds and persists the evaluator input bundle (`review-bundle.json`)
 * and the Playwright CLI command plan (`playwright-commands.json`) for a
 * single cycle. QFAI writes these deterministically; AI evaluator sub-agents
 * consume them.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CanonicalScreenContract } from "../contracts/screenContracts.js";
import type { PrototypingMode } from "../review/prototyping.js";
import { PROTOTYPING_MAX_CYCLES } from "../review/prototyping.js";

import type { CandidateId } from "./candidate.js";
import { candidateConceptPath } from "./candidateConcept.js";
import {
  buildCandidatePlaywrightCliCommandPlans,
  buildPlaywrightCliCommandPlans,
  type CandidatePlaywrightCliCommandPlan,
} from "./playwrightCliPlan.js";
import {
  candidateRoutePath,
  previousExplorationRound,
  roundCandidateEvidencePath,
  roundCommandPlansPath,
  roundDir,
  roundEvaluatorReviewPath,
  type ExplorationRound,
} from "./round.js";
import {
  cycleCommandLogPath,
  cycleCommandPlanPath,
  cycleEvaluatorReviewPath,
  cycleHtmlPath,
  cycleScreenshotPath,
  cycleSnapshotPath,
  type PlaywrightCliCommandPlan,
  type ReviewBundle,
} from "./types.js";

/**
 * Paths to the design rubric and design system contracts used by
 * evaluator sub-agents. These live in `.qfai/contracts/design/`.
 */
const DEFAULT_AXIS_DEFS_REF = ".qfai/contracts/design/evaluation-rubric.yaml";
const DEFAULT_DESIGN_SYSTEM_CHECKLIST_REF = ".qfai/contracts/design/design-system.yaml";

export type BuildReviewBundleInput = {
  targetUrl: string;
  cycle: number;
  mode: PrototypingMode;
  screens: CanonicalScreenContract[];
  /**
   * Resolved primary spec ID (4-digit string, e.g. "0012"). v1.8.4 added.
   * Caller obtains via `resolvePrimaryPrototypingSpec`. Hardcoding spec
   * literals in shipped templates is forbidden by the package self-containment
   * lint (Phase 7).
   */
  primarySpecId: string;
  /** Optional override for the rubric ref (defaults to canonical path). */
  axisDefsRef?: string;
  /** Optional override for the design system ref (defaults to canonical path). */
  designSystemChecklistRef?: string;
  /**
   * Ref to the prior cycle's evaluator-review.json, or `null` when this is
   * cycle 1. Most callers can leave this to `deriveDefaultPreviousScoreRef`.
   */
  previousScoreRef?: string | null;
};

/**
 * Build (but do not persist) a review bundle in-memory.
 */
export function buildReviewBundle(input: BuildReviewBundleInput): ReviewBundle {
  if (!Number.isInteger(input.cycle) || input.cycle < 1) {
    throw new Error(`buildReviewBundle: cycle must be a positive integer, got ${input.cycle}`);
  }

  const maxCycles = PROTOTYPING_MAX_CYCLES[input.mode];
  const previousScoreRef =
    input.previousScoreRef !== undefined
      ? input.previousScoreRef
      : deriveDefaultPreviousScoreRef(input.cycle);

  return {
    spec: input.primarySpecId,
    cycle: input.cycle,
    mode: input.mode,
    maxCycles,
    targetUrl: input.targetUrl,
    screens: input.screens.map((screen) => ({
      screenId: screen.screenId,
      route: screen.route,
      primaryTasks: [...screen.primaryTasks],
      sourceRef: screen.sourceRef,
      expectedEvidence: {
        screenshotPath: cycleScreenshotPath(input.cycle, screen.screenId),
        htmlPath: cycleHtmlPath(input.cycle, screen.screenId),
        snapshotPath: cycleSnapshotPath(input.cycle, screen.screenId),
        commandLogPath: cycleCommandLogPath(input.cycle, screen.screenId),
      },
    })),
    commandPlanRef: cycleCommandPlanPath(input.cycle),
    axisDefsRef: input.axisDefsRef ?? DEFAULT_AXIS_DEFS_REF,
    designSystemChecklistRef: input.designSystemChecklistRef ?? DEFAULT_DESIGN_SYSTEM_CHECKLIST_REF,
    previousScoreRef,
    evaluatorReviewOutputPath: cycleEvaluatorReviewPath(input.cycle),
  };
}

export type WriteReviewBundlesInput = BuildReviewBundleInput & {
  /** Repo root (absolute path) where the .qfai tree lives. */
  root: string;
};

export type WrittenReviewBundle = {
  reviewBundlePath: string;
  commandPlanPath: string;
  reviewBundle: ReviewBundle;
  commandPlans: PlaywrightCliCommandPlan[];
};

/**
 * Build the review bundle and command plan for a cycle, then persist them
 * to the canonical paths under `<root>/.qfai/evidence/prototyping/iterations/<cycle>/`.
 */
export async function writeReviewBundles(
  input: WriteReviewBundlesInput,
): Promise<WrittenReviewBundle> {
  const bundle = buildReviewBundle(input);
  const commandPlans = buildPlaywrightCliCommandPlans({
    targetUrl: input.targetUrl,
    cycle: input.cycle,
    screens: input.screens,
  });

  const iterationDir = path.join(
    input.root,
    ".qfai",
    "evidence",
    "prototyping",
    "iterations",
    String(input.cycle),
  );
  await mkdir(iterationDir, { recursive: true });

  const reviewBundlePath = path.join(iterationDir, "review-bundle.json");
  const commandPlanPath = path.join(iterationDir, "playwright-commands.json");

  await Promise.all([
    writeFile(reviewBundlePath, `${JSON.stringify(bundle, null, 2)}\n`, "utf-8"),
    writeFile(commandPlanPath, `${JSON.stringify(commandPlans, null, 2)}\n`, "utf-8"),
  ]);

  return { reviewBundlePath, commandPlanPath, reviewBundle: bundle, commandPlans };
}

export type RoundReviewBundle = {
  /**
   * Resolved primary spec ID. v1.8.4 widened from the "0017" literal — see
   * `ReviewBundle.spec` for migration notes.
   */
  spec: string;
  round: ExplorationRound;
  mode: PrototypingMode;
  maxCycles: number;
  targetUrl: string;
  candidates: Array<{
    candidateId: CandidateId;
    conceptRef: string;
    previousEvaluatorReviewRef: string | null;
    evaluatorReviewOutputPath: string;
    screens: Array<{
      screenId: string;
      route: string;
      candidateRoute: string;
      primaryTasks: string[];
      sourceRef: string;
      expectedEvidence: {
        screenshotPath: string;
        htmlPath: string;
        snapshotPath: string;
        commandLogPath: string;
      };
    }>;
  }>;
  commandPlanRef: string;
  axisDefsRef: string;
  designSystemChecklistRef: string;
};

export type BuildRoundReviewBundleInput = {
  targetUrl: string;
  round: ExplorationRound;
  mode: PrototypingMode;
  candidateIds: CandidateId[];
  screens: CanonicalScreenContract[];
  /**
   * Resolved primary spec ID (v1.8.4 added). Caller obtains via
   * `resolvePrimaryPrototypingSpec`. See `BuildReviewBundleInput.primarySpecId`.
   */
  primarySpecId: string;
  axisDefsRef?: string;
  designSystemChecklistRef?: string;
};

export function buildRoundReviewBundle(input: BuildRoundReviewBundleInput): RoundReviewBundle {
  return {
    spec: input.primarySpecId,
    round: input.round,
    mode: input.mode,
    maxCycles: PROTOTYPING_MAX_CYCLES[input.mode],
    targetUrl: input.targetUrl,
    candidates: input.candidateIds.map((candidateId) => ({
      candidateId,
      conceptRef: candidateConceptPath(input.round, candidateId),
      previousEvaluatorReviewRef: derivePreviousCandidateReviewRef(input.round, candidateId),
      evaluatorReviewOutputPath: roundEvaluatorReviewPath(input.round, candidateId),
      screens: input.screens.map((screen) => ({
        screenId: screen.screenId,
        route: screen.route,
        candidateRoute: candidateRoutePath(candidateId, screen.route),
        primaryTasks: [...screen.primaryTasks],
        sourceRef: screen.sourceRef,
        expectedEvidence: {
          screenshotPath: roundCandidateEvidencePath(
            input.round,
            candidateId,
            screen.screenId,
            "png",
          ),
          htmlPath: roundCandidateEvidencePath(input.round, candidateId, screen.screenId, "html"),
          snapshotPath: roundCandidateEvidencePath(
            input.round,
            candidateId,
            screen.screenId,
            "snapshot.txt",
          ),
          commandLogPath: roundCandidateEvidencePath(
            input.round,
            candidateId,
            screen.screenId,
            "commands.json",
          ),
        },
      })),
    })),
    commandPlanRef: roundCommandPlansPath(input.round),
    axisDefsRef: input.axisDefsRef ?? DEFAULT_AXIS_DEFS_REF,
    designSystemChecklistRef: input.designSystemChecklistRef ?? DEFAULT_DESIGN_SYSTEM_CHECKLIST_REF,
  };
}

export type WriteRoundReviewBundleInput = BuildRoundReviewBundleInput & {
  root: string;
};

export type WrittenRoundReviewBundle = {
  reviewBundlePath: string;
  commandPlanPath: string;
  reviewBundle: RoundReviewBundle;
  commandPlans: CandidatePlaywrightCliCommandPlan[];
};

export async function writeRoundReviewBundle(
  input: WriteRoundReviewBundleInput,
): Promise<WrittenRoundReviewBundle> {
  const reviewBundle = buildRoundReviewBundle(input);
  const commandPlans = buildCandidatePlaywrightCliCommandPlans({
    targetUrl: input.targetUrl,
    round: input.round,
    candidateIds: input.candidateIds,
    screens: input.screens,
  });

  const roundEvidenceDir = path.join(input.root, ...roundDir(input.round).split("/"));
  await mkdir(roundEvidenceDir, { recursive: true });

  const reviewBundlePath = path.join(roundEvidenceDir, "review-bundle.json");
  const commandPlanPath = path.join(roundEvidenceDir, "command-plans.json");

  await Promise.all([
    writeFile(reviewBundlePath, `${JSON.stringify(reviewBundle, null, 2)}\n`, "utf-8"),
    writeFile(commandPlanPath, `${JSON.stringify(commandPlans, null, 2)}\n`, "utf-8"),
  ]);

  return { reviewBundlePath, commandPlanPath, reviewBundle, commandPlans };
}

/**
 * Default previousScoreRef: cycle 1 has none; later cycles point at the
 * prior cycle's evaluator-review.json.
 */
export function deriveDefaultPreviousScoreRef(cycle: number): string | null {
  if (cycle <= 1) {
    return null;
  }
  return cycleEvaluatorReviewPath(cycle - 1);
}

export function derivePreviousCandidateReviewRef(
  round: ExplorationRound,
  candidateId: CandidateId,
): string | null {
  if (round === "r5") {
    return null;
  }

  return roundEvaluatorReviewPath(previousExplorationRound(round), candidateId);
}

/** Path helpers re-exported for convenience. */
export { cycleReviewBundlePath, cycleCommandPlanPath, cycleEvaluatorReviewPath } from "./types.js";
export { roundReviewBundlePath } from "./round.js";

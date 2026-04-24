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

import { buildPlaywrightCliCommandPlans } from "./playwrightCliPlan.js";
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
    throw new Error(
      `buildReviewBundle: cycle must be a positive integer, got ${input.cycle}`,
    );
  }

  const maxCycles = PROTOTYPING_MAX_CYCLES[input.mode];
  const previousScoreRef =
    input.previousScoreRef !== undefined
      ? input.previousScoreRef
      : deriveDefaultPreviousScoreRef(input.cycle);

  return {
    spec: "0017",
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
    designSystemChecklistRef:
      input.designSystemChecklistRef ?? DEFAULT_DESIGN_SYSTEM_CHECKLIST_REF,
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

/** Path helpers re-exported for convenience. */
export {
  cycleReviewBundlePath,
  cycleCommandPlanPath,
  cycleEvaluatorReviewPath,
} from "./types.js";

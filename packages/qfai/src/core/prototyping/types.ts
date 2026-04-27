/**
 * Prototyping harness types (spec-0017 REQ-0005, REQ-0006).
 *
 * These types describe the deterministic evaluator harness artifacts QFAI
 * produces per cycle. QFAI pre-assigns every evidence path here so the AI
 * evaluator sub-agent never has to invent paths. QFAI does not score
 * visual quality; it only standardizes the harness surface.
 */

import type { PrototypingMode } from "../review/prototyping.js";

export type PrototypingCyclePhase =
  | "explore"
  | "remix"
  | "select"
  | "polish"
  | "branch"
  | "reviewer_gate"
  | "completed";

/**
 * A single Playwright CLI command the AI evaluator sub-agent must run
 * (or, for `interaction`, interpret) for a specific screen in a cycle.
 */
export type PlaywrightCliCommandPurpose =
  | "goto"
  | "snapshot"
  | "screenshot"
  | "html"
  | "interaction";

export type PlaywrightCliCommand = {
  purpose: PlaywrightCliCommandPurpose;
  /**
   * For executable commands (goto/snapshot/screenshot/html), a shell-ready
   * Playwright CLI invocation. For interaction entries, a comment placeholder
   * that signals "evaluator interprets the note".
   */
  command: string;
  /**
   * Absolute-from-repo-root path where the command's output MUST land.
   * Always POSIX-separated to keep the plan portable.
   */
  outputPath?: string;
  /**
   * Natural-language hint for interaction commands (derived from the
   * screen contract's `primaryTasks`).
   */
  note?: string;
};

/**
 * Full Playwright CLI plan for one screen in one cycle. Multiple screens
 * in the same cycle each get their own plan. QFAI emits these deterministically
 * so the same `(targetUrl, cycle, screen)` always yields byte-identical output.
 */
export type PlaywrightCliCommandPlan = {
  cycle: number;
  screenId: string;
  route: string;
  targetUrl: string;
  /** Ordered commands: goto → snapshot → interaction* → screenshot → html. */
  commands: PlaywrightCliCommand[];
};

/**
 * Review input bundle consumed by the AI evaluator sub-agent for one cycle.
 * Contains references to every artifact the evaluator needs, plus the
 * expected output path for `evaluator-review.json`.
 */
export type ReviewBundle = {
  /**
   * Resolved primary spec ID (4-digit string). v1.8.4 widened from the
   * "0017" literal: spec-0017 was absorbed into spec-0012 in v1.8.3 and the
   * concrete value is now resolved at runtime via
   * `resolvePrimaryPrototypingSpec`. The reader accepts any non-empty string.
   */
  spec: string;
  cycle: number;
  mode: PrototypingMode;
  maxCycles: number;
  targetUrl: string;
  screens: Array<{
    screenId: string;
    route: string;
    primaryTasks: string[];
    sourceRef: string;
    expectedEvidence: {
      screenshotPath: string;
      htmlPath: string;
      snapshotPath: string;
      commandLogPath: string;
    };
  }>;
  /** Path (relative to repo root) to `playwright-commands.json` for this cycle. */
  commandPlanRef: string;
  /** Path (relative to repo root) to the evaluation rubric contract. */
  axisDefsRef: string;
  /** Path (relative to repo root) to the design system contract. */
  designSystemChecklistRef: string;
  /**
   * Path to the prior cycle's `evaluator-review.json`, or `null` for cycle 1.
   * The evaluator reads this to maintain best-of-history rationale.
   */
  previousScoreRef: string | null;
  /**
   * Path the evaluator MUST write to when it finishes reviewing.
   */
  evaluatorReviewOutputPath: string;
};

/**
 * Evidence path helpers — single source of truth so validators and writers
 * agree on where artifacts live.
 */
export function iterationDir(cycle: number): string {
  return `.qfai/evidence/prototyping/iterations/${cycle}`;
}

export function cycleScreenshotPath(cycle: number, screenId: string): string {
  return `${iterationDir(cycle)}/${screenId}.png`;
}

export function cycleHtmlPath(cycle: number, screenId: string): string {
  return `${iterationDir(cycle)}/${screenId}.html`;
}

export function cycleSnapshotPath(cycle: number, screenId: string): string {
  return `${iterationDir(cycle)}/${screenId}.snapshot.txt`;
}

export function cycleCommandLogPath(cycle: number, screenId: string): string {
  return `${iterationDir(cycle)}/${screenId}.commands.json`;
}

export function cycleCommandPlanPath(cycle: number): string {
  return `${iterationDir(cycle)}/playwright-commands.json`;
}

export function cycleReviewBundlePath(cycle: number): string {
  return `${iterationDir(cycle)}/review-bundle.json`;
}

export function cycleEvaluatorReviewPath(cycle: number): string {
  return `${iterationDir(cycle)}/evaluator-review.json`;
}

export function canonicalLatestScreenshotPath(screenId: string): string {
  return `.qfai/evidence/prototyping/screenshots/${screenId}.png`;
}

export function canonicalLatestHtmlPath(screenId: string): string {
  return `.qfai/evidence/prototyping/html/${screenId}.html`;
}

// ─── Cycle-centric evidence record (spec-0017 REQ-0005) ────────────────────

/**
 * Per-cycle evidence record written into `prototyping.json` under `cycles[]`.
 *
 * Shape mirrors the spec-0017 obligation to keep review-cycle completeness
 * machine-verifiable: every cycle must reference the command plan, review
 * bundle, evaluator review output, and per-screen artifacts.
 */
export type PrototypingCycleEvidence = {
  cycle: number;
  kind: PrototypingCyclePhase;
  commandPlanRef: string;
  reviewBundleRef: string;
  evaluatorReviewRef: string;
  screenEvidence: Array<{
    screenId: string;
    screenshotRef: string;
    htmlRef: string;
    snapshotRef: string;
    commandLogRef: string;
  }>;
  reviewerScores: Array<{
    reviewerId: string;
    scores: Array<{
      axisId: string;
      score: number;
      rationale: string;
      evidenceRefs: string[];
    }>;
  }>;
  allReviewerAxesPerfect100: boolean;
};

export type PrototypingBestOfHistoryRef = {
  cycle: number;
  evidenceRef: string;
};

export type PrototypingBreakthroughRef = {
  checked: boolean;
  evidenceRef: string;
};

export type PrototypingReviewerGateRef = {
  result: "PASS" | "REVISE";
  evidenceRef: string;
};

/**
 * Top-level `prototyping.json` schema (spec-0017 REQ-0005).
 *
 * Kept cycle-centric so validators can enforce the strictest completion
 * gate uniformly across modes: the only mode-dependent value is
 * `maxCycles`, which must match `PROTOTYPING_MAX_CYCLES[mode.effective]`
 * or `QFAI-PROT-MODE-001` is raised.
 */
export type PrototypingEvidenceRecord = {
  surface: "web" | "mobile" | "desktop" | "mixed";
  mode: {
    effective: PrototypingMode;
    source: string;
    rationale: string;
  };
  browserTool: "playwright-cli";
  maxCycles: number;
  // Field is named `iterations` (not `cycles`) to match validatePrototypingEvidence
  // and the on-disk URL convention (.qfai/evidence/prototyping/iterations/<n>/...).
  // Each element is still a PrototypingCycleEvidence — the "cycle" terminology
  // refers to the inner step, while the outer record exposes its history of
  // iterations.
  iterations: PrototypingCycleEvidence[];
  bestOfHistory: PrototypingBestOfHistoryRef;
  breakthrough: PrototypingBreakthroughRef;
  reviewerGate: PrototypingReviewerGateRef;
  completionClaimed: boolean;
};

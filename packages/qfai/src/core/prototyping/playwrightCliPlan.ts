/**
 * Playwright CLI command plan builder (spec-0017 REQ-0006).
 *
 * Given a target URL, cycle number, and canonical screen contract, produce
 * the deterministic Playwright CLI command plan the AI evaluator sub-agent
 * must execute to capture evidence for that screen. QFAI pre-assigns every
 * output path so the evaluator never invents paths (spec-0017 BR-0017-0003).
 */

import type { CanonicalScreenContract } from "../contracts/screenContracts.js";

import type { CandidateId } from "./candidate.js";
import type { ExplorationRound } from "./round.js";
import { candidateRoutePath, roundCandidateEvidencePath } from "./round.js";
import {
  cycleHtmlPath,
  cycleScreenshotPath,
  cycleSnapshotPath,
  type PlaywrightCliCommand,
  type PlaywrightCliCommandPlan,
} from "./types.js";

export type CandidatePlaywrightCliCommandPlan = {
  round: ExplorationRound;
  candidateId: CandidateId;
  screenId: string;
  route: string;
  candidateRoute: string;
  targetUrl: string;
  commands: PlaywrightCliCommand[];
};

export type BuildPlaywrightCliCommandPlanInput = {
  targetUrl: string;
  cycle: number;
  screen: CanonicalScreenContract;
};

/**
 * Build the Playwright CLI command plan for one screen in one cycle.
 *
 * The plan is deterministic for a given `(targetUrl, cycle, screen)` triple:
 * command order, shell quoting, and output paths do not vary across calls.
 */
export function buildPlaywrightCliCommandPlan(
  input: BuildPlaywrightCliCommandPlanInput,
): PlaywrightCliCommandPlan {
  if (!Number.isInteger(input.cycle) || input.cycle < 1) {
    throw new Error(
      `buildPlaywrightCliCommandPlan: cycle must be a positive integer, got ${input.cycle}`,
    );
  }

  const { screenId, route, primaryTasks } = input.screen;
  const absoluteUrl = resolveAbsoluteUrl(input.targetUrl, route);
  const commands = buildCommands({
    absoluteUrl,
    primaryTasks,
    screenshotPath: cycleScreenshotPath(input.cycle, screenId),
    htmlPath: cycleHtmlPath(input.cycle, screenId),
    snapshotPath: cycleSnapshotPath(input.cycle, screenId),
  });

  return {
    cycle: input.cycle,
    screenId,
    route,
    targetUrl: absoluteUrl,
    commands,
  };
}

export type BuildCandidatePlaywrightCliCommandPlanInput = {
  targetUrl: string;
  round: ExplorationRound;
  candidateId: CandidateId;
  screen: CanonicalScreenContract;
};

export function buildCandidatePlaywrightCliCommandPlan(
  input: BuildCandidatePlaywrightCliCommandPlanInput,
): CandidatePlaywrightCliCommandPlan {
  const { screenId, route, primaryTasks } = input.screen;
  const candidateRoute = candidateRoutePath(input.candidateId, route);
  const absoluteUrl = resolveAbsoluteUrl(input.targetUrl, candidateRoute);

  const commands = buildCommands({
    absoluteUrl,
    primaryTasks,
    screenshotPath: roundCandidateEvidencePath(input.round, input.candidateId, screenId, "png"),
    htmlPath: roundCandidateEvidencePath(input.round, input.candidateId, screenId, "html"),
    snapshotPath: roundCandidateEvidencePath(
      input.round,
      input.candidateId,
      screenId,
      "snapshot.txt",
    ),
  });

  return {
    round: input.round,
    candidateId: input.candidateId,
    screenId,
    route,
    candidateRoute,
    targetUrl: absoluteUrl,
    commands,
  };
}

export type BuildPlaywrightCliCommandPlansInput = {
  targetUrl: string;
  cycle: number;
  screens: CanonicalScreenContract[];
};

export function buildPlaywrightCliCommandPlans(
  input: BuildPlaywrightCliCommandPlansInput,
): PlaywrightCliCommandPlan[] {
  return input.screens.map((screen) =>
    buildPlaywrightCliCommandPlan({
      targetUrl: input.targetUrl,
      cycle: input.cycle,
      screen,
    }),
  );
}

export type BuildCandidatePlaywrightCliCommandPlansInput = {
  targetUrl: string;
  round: ExplorationRound;
  candidateIds: CandidateId[];
  screens: CanonicalScreenContract[];
};

export function buildCandidatePlaywrightCliCommandPlans(
  input: BuildCandidatePlaywrightCliCommandPlansInput,
): CandidatePlaywrightCliCommandPlan[] {
  return input.candidateIds.flatMap((candidateId) =>
    input.screens.map((screen) =>
      buildCandidatePlaywrightCliCommandPlan({
        targetUrl: input.targetUrl,
        round: input.round,
        candidateId,
        screen,
      }),
    ),
  );
}

/**
 * Resolve a route against a target URL base. Tolerates both absolute routes
 * (starting with `/`) and bare segments.
 */
function resolveAbsoluteUrl(targetUrl: string, route: string): string {
  const base = targetUrl.endsWith("/") ? targetUrl : `${targetUrl}/`;
  try {
    return new URL(route, base).toString();
  } catch {
    throw new Error(
      `buildPlaywrightCliCommandPlan: invalid targetUrl or route (targetUrl=${targetUrl}, route=${route})`,
    );
  }
}

function buildCommands(input: {
  absoluteUrl: string;
  primaryTasks: string[];
  screenshotPath: string;
  htmlPath: string;
  snapshotPath: string;
}): PlaywrightCliCommand[] {
  return [
    {
      purpose: "goto",
      command: `playwright-cli goto ${quote(input.absoluteUrl)}`,
    },
    {
      purpose: "snapshot",
      command: `playwright-cli snapshot --save ${quote(input.snapshotPath)}`,
      outputPath: input.snapshotPath,
    },
    ...input.primaryTasks.map<PlaywrightCliCommand>((task) => ({
      purpose: "interaction",
      command:
        "# evaluator: perform the primary task below via playwright-cli click/fill/goto as appropriate",
      note: task,
    })),
    {
      purpose: "screenshot",
      command: `playwright-cli screenshot --full-page --save ${quote(input.screenshotPath)}`,
      outputPath: input.screenshotPath,
    },
    {
      purpose: "html",
      command:
        `playwright-cli eval "document.documentElement.outerHTML" ` + `> ${quote(input.htmlPath)}`,
      outputPath: input.htmlPath,
    },
  ];
}

function quote(value: string): string {
  return JSON.stringify(value);
}

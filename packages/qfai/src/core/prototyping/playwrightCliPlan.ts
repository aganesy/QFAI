/**
 * Playwright CLI command plan builder (spec-0017 REQ-0006).
 *
 * Given a target URL, cycle number, and canonical screen contract, produce
 * the deterministic Playwright CLI command plan the AI evaluator sub-agent
 * must execute to capture evidence for that screen. QFAI pre-assigns every
 * output path so the evaluator never invents paths (spec-0017 BR-0017-0003).
 */

import type { CanonicalScreenContract } from "../contracts/screenContracts.js";

import {
  cycleHtmlPath,
  cycleScreenshotPath,
  cycleSnapshotPath,
  type PlaywrightCliCommand,
  type PlaywrightCliCommandPlan,
} from "./types.js";

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

  const screenshotPath = cycleScreenshotPath(input.cycle, screenId);
  const htmlPath = cycleHtmlPath(input.cycle, screenId);
  const snapshotPath = cycleSnapshotPath(input.cycle, screenId);

  const commands: PlaywrightCliCommand[] = [
    {
      purpose: "goto",
      command: `playwright-cli goto ${quote(absoluteUrl)}`,
    },
    {
      purpose: "snapshot",
      command: `playwright-cli snapshot --save ${quote(snapshotPath)}`,
      outputPath: snapshotPath,
    },
    ...primaryTasks.map<PlaywrightCliCommand>((task) => ({
      purpose: "interaction",
      command:
        "# evaluator: perform the primary task below via playwright-cli click/fill/goto as appropriate",
      note: task,
    })),
    {
      purpose: "screenshot",
      command: `playwright-cli screenshot --full-page --save ${quote(screenshotPath)}`,
      outputPath: screenshotPath,
    },
    {
      purpose: "html",
      command:
        `playwright-cli eval "document.documentElement.outerHTML" ` +
        `> ${quote(htmlPath)}`,
      outputPath: htmlPath,
    },
  ];

  return {
    cycle: input.cycle,
    screenId,
    route,
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

function quote(value: string): string {
  return JSON.stringify(value);
}

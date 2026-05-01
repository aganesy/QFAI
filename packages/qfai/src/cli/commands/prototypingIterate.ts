/**
 * `qfai prototyping iterate --cycle <n>` CLI command (spec-0017 v2.0).
 *
 * Single-thread evolution loop driver. The skill (`/qfai-prototyping`)
 * calls this command before each iteration:
 *
 *   - At cycle 0: assigns paths for the seed iteration. Requires
 *     `--target-url` so the capture role knows where to load the
 *     prototype HTML from.
 *   - At cycle >= 1: first checks the latest iteration in
 *     `prototyping.json#iterations[]` against the deterministic stop
 *     condition (shouldStop()) and exits 64 (convergence) or 65
 *     (max-iterations) when applicable. Otherwise assigns paths for the
 *     next iteration and exits 0 to signal "continue".
 *
 * Exit codes:
 *   0   continue to this cycle
 *   64  STOP: all 4 axes exceptional + slop=0 in the latest iter
 *   65  STOP: latest iter index === MAX_ITERATION_INDEX (14)
 *   2   input error (--cycle out of range, missing --target-url at cycle 0,
 *       no UI-bearing specs found, etc.)
 *
 * Per-cycle artifact: writes `iter-NN/iterate-plan.json` so the capture
 * role and the next generator step both have a single document
 * referencing the assigned paths and target URL.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { error, info } from "../lib/logger.js";
import { loadConfig } from "../../core/config.js";
import { resolvePrimaryPrototypingSpec } from "../../core/prototyping/specResolution.js";
import {
  MAX_ITERATIONS,
  MAX_ITERATION_INDEX,
  iterationDir,
  iterationReviewPath,
  iterationHtmlPath,
  iterationScreenshotPath,
  shouldStop,
  type Iteration,
  type StopReason,
} from "../../core/prototyping/iteration.js";

export type RunPrototypingIterateOptions = {
  root: string;
  cycle: number;
  targetUrl?: string;
};

export type IteratePlan = {
  schemaVersion: "1.0";
  cycle: number;
  specs: string[];
  paths: {
    iterationDir: string;
    reviewJson: string;
    /**
     * Per-screen evidence path templates. Use `{screen}` as the
     * placeholder; the capture role substitutes the actual screen-id
     * from `.qfai/contracts/ui/*.yaml` before invoking playwright-cli.
     */
    htmlTemplate: string;
    screenshotTemplate: string;
  };
  targetUrl: string | null;
  nextActions: string[];
};

const PROTOTYPING_JSON_REL = ".qfai/evidence/prototyping/prototyping.json";

export async function runPrototypingIterate(
  options: RunPrototypingIterateOptions,
): Promise<number> {
  if (
    !Number.isInteger(options.cycle) ||
    options.cycle < 0 ||
    options.cycle > MAX_ITERATION_INDEX
  ) {
    error(
      `qfai prototyping iterate: --cycle must be 0..${MAX_ITERATION_INDEX} (got ${String(options.cycle)}).`,
    );
    return 2;
  }

  const configResult = await loadConfig(options.root);

  const resolved = await resolvePrimaryPrototypingSpec(options.root, configResult.config);
  if (!resolved) {
    error(
      "qfai prototyping iterate: no primary UI-bearing prototyping spec found. " +
        "Set qfai.config.yaml: prototyping.primarySpecId, or add `surface_type: ui-bearing` " +
        "to one of your specs' 01_Spec.md.",
    );
    return 2;
  }
  const specs = [resolved.specId];

  // 1) Stop-condition check at cycle >= 1: read the latest iteration and
  //    short-circuit with exit 64/65 when the deterministic gate fires.
  if (options.cycle >= 1) {
    const iterations = await readIterations(path.join(options.root, PROTOTYPING_JSON_REL));
    const stop = shouldStop(iterations);
    if (stop !== null) {
      return emitStop(stop);
    }
  }

  // 2) Cycle 0 requires --target-url so the seed generator knows where
  //    to write iter-00/index.html and the capture role knows where to
  //    point playwright-cli.
  if (options.cycle === 0 && !options.targetUrl) {
    error("qfai prototyping iterate --cycle 0: --target-url is required.");
    return 2;
  }

  // 3) Assign paths and write iterate-plan.json.
  const dir = path.join(options.root, iterationDir(options.cycle));
  await mkdir(dir, { recursive: true });

  const plan: IteratePlan = {
    schemaVersion: "1.0",
    cycle: options.cycle,
    specs,
    paths: {
      iterationDir: iterationDir(options.cycle),
      reviewJson: iterationReviewPath(options.cycle),
      htmlTemplate: iterationHtmlPath(options.cycle, "{screen}"),
      screenshotTemplate: iterationScreenshotPath(options.cycle, "{screen}"),
    },
    targetUrl: options.targetUrl ?? null,
    nextActions: nextActionsFor(options.cycle),
  };

  await writeFile(
    path.join(dir, "iterate-plan.json"),
    `${JSON.stringify(plan, null, 2)}\n`,
    "utf-8",
  );

  info(
    `qfai prototyping iterate: iter-${String(options.cycle).padStart(2, "0")} ready ` +
      `(specs=${specs.length}, plan at ${plan.paths.iterationDir}/iterate-plan.json).`,
  );
  return 0;
}

async function readIterations(prototypingJsonAbs: string): Promise<Iteration[]> {
  try {
    const raw = await readFile(prototypingJsonAbs, "utf-8");
    const parsed = JSON.parse(raw) as { iterations?: Iteration[] };
    return Array.isArray(parsed.iterations) ? parsed.iterations : [];
  } catch {
    return [];
  }
}

function emitStop(reason: StopReason): number {
  if (reason === "axes-exceptional") {
    info(
      "qfai prototyping iterate: convergence reached (all 4 axes exceptional, " +
        "slopPatternsDetected=[]). Run `qfai prototyping certify` to seal the run.",
    );
    return 64;
  }
  info(
    `qfai prototyping iterate: max iterations (${MAX_ITERATIONS}) reached. ` +
      "Run `qfai prototyping certify` to seal the run.",
  );
  return 65;
}

function nextActionsFor(cycle: number): string[] {
  if (cycle === 0) {
    return ["generator-seed", "capture", "review", "iterate --cycle 1"];
  }
  return ["generator-iterate", "capture", "review", `iterate --cycle ${cycle + 1}`];
}

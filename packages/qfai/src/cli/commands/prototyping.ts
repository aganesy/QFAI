/**
 * `qfai prototyping prepare` CLI command (spec-0017 REQ-0007).
 *
 * Generates the per-cycle Playwright CLI command plan and evaluator review
 * bundle for all declared screens. Does NOT evaluate, does NOT capture
 * evidence — those are the AI evaluator sub-agent's responsibility.
 */

import { loadConfig } from "../../core/config.js";
import { readUiContractScreenContracts } from "../../core/contracts/screenContracts.js";
import { writeReviewBundles } from "../../core/prototyping/reviewBundle.js";
import type { PrototypingMode } from "../../core/review/prototyping.js";
import { error, info } from "../lib/logger.js";

export type RunPrototypingPrepareOptions = {
  root: string;
  targetUrl: string;
  mode: PrototypingMode;
  cycle: number;
};

/**
 * Run `qfai prototyping prepare`. Returns a process exit code.
 */
export async function runPrototypingPrepare(
  options: RunPrototypingPrepareOptions,
): Promise<number> {
  const configResult = await loadConfig(options.root);

  const screens = await readUiContractScreenContracts(
    options.root,
    configResult.config.paths.contractsDir,
  );

  if (screens.length === 0) {
    error(
      `qfai prototyping prepare: no screens declared under ${configResult.config.paths.contractsDir}/ui/*.yaml. ` +
        "Add at least one UI contract with screens[] before running prepare.",
    );
    return 2;
  }

  const result = await writeReviewBundles({
    root: options.root,
    targetUrl: options.targetUrl,
    mode: options.mode,
    cycle: options.cycle,
    screens,
  });

  info(
    `qfai prototyping prepare: wrote review-bundle + command plan ` +
      `for ${result.commandPlans.length} screens at cycle ${options.cycle} ` +
      `(mode=${options.mode}, targetUrl=${options.targetUrl}).`,
  );
  info(`- review-bundle: ${result.reviewBundlePath}`);
  info(`- command-plan:  ${result.commandPlanPath}`);

  return 0;
}

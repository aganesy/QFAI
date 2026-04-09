import { info } from "../lib/logger.js";
import { loadConfig, resolvePath } from "../../core/config.js";
import { readValidatedClassification } from "../../core/detection/surfaceType.js";
import { findLatestDiscussionPackDir } from "../../core/discussionPack.js";
import { assertCanonicalPrototypingSurface } from "../../core/domain/surface.js";
import {
  derivePrototypingObligations,
  FULL_HARNESS_INVALID_COMBINATION_MESSAGE,
} from "../../core/prototyping/mode.js";
import { runPrototypingExecution } from "../../core/prototyping/execution.js";

export async function runPrototypingCommand(options: {
  root: string;
  mode?: "low-cost" | "standard" | "full-harness";
  targetUrl?: string;
  browserProvider?: string;
  renderProvider?: string;
  reviewer?: string;
  changeSummary?: string[];
  limitations?: string[];
}): Promise<void> {
  if (options.mode === "full-harness") {
    const resolved = await loadConfig(options.root);
    const discussionRoot = resolvePath(options.root, resolved.config, "discussionDir");
    const latestPack = await findLatestDiscussionPackDir(discussionRoot);
    const classification = await readValidatedClassification(latestPack ?? options.root);
    if (classification) {
      const obligations = derivePrototypingObligations({
        surface: assertCanonicalPrototypingSurface(classification.primary_surface),
        effectiveMode: "full-harness",
      });
      if (!obligations.validCombination) {
        throw new Error(obligations.invalidReason ?? FULL_HARNESS_INVALID_COMBINATION_MESSAGE);
      }
    }
  }

  const result = await runPrototypingExecution({
    root: options.root,
    ...(options.mode ? { requestedMode: options.mode } : {}),
    ...(options.targetUrl ? { targetUrl: options.targetUrl } : {}),
    ...(options.browserProvider ? { browserQaProviderId: options.browserProvider } : {}),
    ...(options.renderProvider ? { renderProviderId: options.renderProvider } : {}),
    ...(options.reviewer ? { reviewer: options.reviewer } : {}),
    ...(options.changeSummary ? { changeSummary: options.changeSummary } : {}),
    ...(options.limitations ? { limitations: options.limitations } : {}),
  });

  info(`mode: ${result.mode}`);
  info(`surface: ${result.surface}`);
  info(`prototyping: ${result.evidencePaths.prototyping}`);
  info(`render: ${result.evidencePaths.render}`);
  info(`browser-qa: ${result.evidencePaths.browserQa}`);
}

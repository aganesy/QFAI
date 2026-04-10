import { info } from "../lib/logger.js";
import { loadConfig, resolvePath } from "../../core/config.js";
import { readValidatedClassification } from "../../core/detection/surfaceType.js";
import { findLatestDiscussionPackDir } from "../../core/discussionPack.js";
import { assertCanonicalPrototypingSurface } from "../../core/domain/surface.js";
import type { RenderCaptureAdapter } from "../../core/evidence/types.js";
import type { ProviderRegistry } from "../../core/providers/registry.js";
import {
  derivePrototypingObligations,
  NON_UI_PROTOTYPING_SURFACE_MESSAGE,
} from "../../core/prototyping/mode.js";
import { runPrototypingExecution } from "../../core/prototyping/execution.js";

export async function runPrototypingCommand(options: {
  root: string;
  mode?: "full-harness";
  targetUrl?: string;
  browserProvider?: string;
  renderProvider?: string;
  reviewer?: string;
  changeSummary?: string[];
  limitations?: string[];
  providerRegistry?: ProviderRegistry;
  renderAdapter?: RenderCaptureAdapter;
}): Promise<void> {
  const resolved = await loadConfig(options.root);
  const discussionRoot = resolvePath(options.root, resolved.config, "discussionDir");
  const latestPack = await findLatestDiscussionPackDir(discussionRoot);
  const classification = await readValidatedClassification(latestPack ?? options.root);
  if (classification) {
    if (!classification.ui_bearing || classification.primary_surface === "non-ui") {
      throw new Error(NON_UI_PROTOTYPING_SURFACE_MESSAGE);
    }
    const obligations = derivePrototypingObligations({
      surface: assertCanonicalPrototypingSurface(classification.primary_surface),
      effectiveMode: options.mode ?? "full-harness",
    });
    if (!obligations.validCombination) {
      throw new Error(obligations.invalidReason ?? NON_UI_PROTOTYPING_SURFACE_MESSAGE);
    }
  } else if (options.mode) {
    // Execution does the strict contract check, but keep CLI rejection aligned when the mode is explicit.
    const fallbackObligations = derivePrototypingObligations({
      surface: "web",
      effectiveMode: options.mode,
    });
    if (!fallbackObligations.validCombination) {
      throw new Error(fallbackObligations.invalidReason ?? NON_UI_PROTOTYPING_SURFACE_MESSAGE);
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
    ...(options.providerRegistry ? { providerRegistry: options.providerRegistry } : {}),
    ...(options.renderAdapter ? { renderAdapter: options.renderAdapter } : {}),
  });

  info(`mode: ${result.mode}`);
  info(`surface: ${result.surface}`);
  info(`prototyping: ${result.evidencePaths.prototyping}`);
  info(`render: ${result.evidencePaths.render}`);
  info(`browser-qa: ${result.evidencePaths.browserQa}`);
}

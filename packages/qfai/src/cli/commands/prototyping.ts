import { info } from "../lib/logger.js";
import { runPrototypingExecution } from "../../core/prototyping/execution.js";

export async function runPrototypingCommand(options: {
  root: string;
  mode?: "low-cost" | "standard" | "full-harness";
  targetUrl?: string;
  browserProvider?: string;
  renderProvider?: string;
  reviewer?: string;
}): Promise<void> {
  const result = await runPrototypingExecution({
    root: options.root,
    ...(options.mode ? { requestedMode: options.mode } : {}),
    ...(options.targetUrl ? { targetUrl: options.targetUrl } : {}),
    ...(options.browserProvider ? { browserQaProviderId: options.browserProvider } : {}),
    ...(options.renderProvider ? { renderProviderId: options.renderProvider } : {}),
    ...(options.reviewer ? { reviewer: options.reviewer } : {}),
  });

  info(`mode: ${result.mode}`);
  info(`surface: ${result.surface}`);
  info(`prototyping: ${result.evidencePaths.prototyping}`);
  info(`render: ${result.evidencePaths.render}`);
  info(`browser-qa: ${result.evidencePaths.browserQa}`);
}

import { info } from "../lib/logger.js";
import { runPrototypingExecution } from "../../core/prototyping/execution.js";

export async function runPrototypingCommand(options: {
  root: string;
  mode?: "low-cost" | "standard" | "full-harness";
}): Promise<void> {
  const result = await runPrototypingExecution({
    root: options.root,
    ...(options.mode ? { requestedMode: options.mode } : {}),
  });

  info(`mode: ${result.mode}`);
  info(`surface: ${result.surface}`);
  info(`prototyping: ${result.evidencePaths.prototyping}`);
  info(`render: ${result.evidencePaths.render}`);
  info(`browser-qa: ${result.evidencePaths.browserQa}`);
}

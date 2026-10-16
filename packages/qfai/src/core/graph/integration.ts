import { prepareGraphRuntimes, type GraphPreparation } from "./prepare.js";
import { runGraphProcess, type GraphProcess } from "./process.js";
import { installGraphEntrypoints } from "./entrypoints.js";
import { ensureGraphGitignore } from "./ignore.js";
import { inspectInstalledGraphHosts } from "./hostConfiguration.js";
import type { GraphHostProtection } from "./hosts.js";
import { composeGraphDenialHooks, type GraphSettingsComposition } from "./hostSettings.js";

export type GraphIntegrationPreparation = GraphPreparation &
  GraphSettingsComposition & {
    hosts: GraphHostProtection[];
  };

export async function prepareGraphIntegration(
  root: string,
  run: GraphProcess = runGraphProcess,
): Promise<GraphIntegrationPreparation> {
  // Before preparation: a failed download still leaves its cache under .qfai/tools/, and an
  // unignored cache is what `git add -A` stages.
  const ignore = await ensureGraphGitignore(root, run);
  const preparation = await prepareGraphRuntimes(root, run);
  if (preparation.failedStep)
    return {
      ...preparation,
      files: ignore.files,
      conflicts: ignore.conflicts,
      hosts: await inspectInstalledGraphHosts(root, run),
    };
  const entries = await installGraphEntrypoints(root);
  if (entries.conflicts.length > 0)
    return {
      ...preparation,
      files: ignore.files,
      conflicts: [...ignore.conflicts, ...entries.conflicts],
      hosts: await inspectInstalledGraphHosts(root, run),
    };
  const hooks = await composeGraphDenialHooks(root);
  return {
    ...preparation,
    files: [...ignore.files, ...entries.files, ...hooks.files],
    conflicts: [...ignore.conflicts, ...hooks.conflicts],
    hosts: await inspectInstalledGraphHosts(root, run),
  };
}

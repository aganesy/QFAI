import { prepareGraphRuntimes, type GraphPreparation } from "./prepare.js";
import { runGraphProcess, type GraphProcess } from "./process.js";
import { installGraphEntrypoints } from "./entrypoints.js";
import { ensureGraphGitignore, type GraphSettingsComposition } from "./ignore.js";

export type GraphIntegrationPreparation = GraphPreparation & GraphSettingsComposition;

export async function prepareGraphIntegration(
  root: string,
  run: GraphProcess = runGraphProcess,
): Promise<GraphIntegrationPreparation> {
  // Before preparation: a failed download still leaves its cache under .qfai/tools/, and an
  // unignored cache is what `git add -A` stages.
  const ignore = await ensureGraphGitignore(root, run);
  const preparation = await prepareGraphRuntimes(root, run);
  if (preparation.failedStep)
    return { ...preparation, files: ignore.files, conflicts: ignore.conflicts };
  const entries = await installGraphEntrypoints(root);
  return {
    ...preparation,
    files: [...ignore.files, ...entries.files],
    conflicts: [...ignore.conflicts, ...entries.conflicts],
  };
}

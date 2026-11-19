import { prepareGraphRuntimes, type GraphPreparation } from "./prepare.js";
import { runGraphProcess, type GraphProcess } from "./process.js";
import { installGraphEntrypoints } from "./entrypoints.js";
import { ensureGraphGitignore, type GraphPreparedFiles } from "./ignore.js";
import { withGraphLock } from "./locks.js";

export type GraphIntegrationPreparation = GraphPreparation & GraphPreparedFiles;

/**
 * Prepares the graph tools under the worktree's graph lock, the one graph queries and analysis
 * preparation hold, so runtime activation never runs beside them or beside another init.
 */
export async function prepareGraphIntegration(
  root: string,
  run: GraphProcess = runGraphProcess,
): Promise<GraphIntegrationPreparation> {
  // Before the lock and before preparation: the lock file and a failed download's cache both live
  // under .qfai/tools/, and an unignored file there is what `git add -A` stages.
  const ignore = await ensureGraphGitignore(root, run);
  return withGraphLock(root, async () => {
    const preparation = await prepareGraphRuntimes(root, run);
    if (preparation.failedStep)
      return { ...preparation, files: ignore.files, conflicts: ignore.conflicts };
    const entries = await installGraphEntrypoints(root);
    return {
      ...preparation,
      files: [...ignore.files, ...entries.files],
      conflicts: [...ignore.conflicts, ...entries.conflicts],
    };
  });
}

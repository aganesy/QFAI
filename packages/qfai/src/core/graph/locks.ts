import path from "node:path";
import { withOwnerLock } from "../fs/ownerLock.js";
import { graphEnvironmentKey } from "./layout.js";
import {
  graphStateDirectory,
  GraphLocalStateError,
  GRAPH_STATE_BYTES,
  invalidGraphState,
} from "./localFiles.js";

export async function withGraphLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const directory = await graphStateDirectory(root);
  return withOwnerLock(
    path.join(directory, "analysis.lock"),
    {
      kind: "graph-lock",
      maxBytes: GRAPH_STATE_BYTES,
      invalid: invalidGraphState,
      refused: (active, cause) =>
        new GraphLocalStateError(
          `Project graph analysis lock ${active ? "is contended" : "requires manual recovery"}.`,
          active
            ? "Retry after the active worktree graph operation (a graph query, analysis preparation or qfai init) finishes; retain its lock."
            : `Retain and inspect .qfai/tools/state/${graphEnvironmentKey()}/analysis.lock; remove only a confirmed abandoned worktree lock before retrying.`,
          { cause },
        ),
      changed: () =>
        new GraphLocalStateError(
          "Project graph lock ownership changed.",
          "Retain the lock and repair the worktree graph state before retrying.",
        ),
    },
    action,
  );
}

import path from "node:path";
import { withOwnerLock } from "../fs/ownerLock.js";
import { GRAPH_LOCK_FILE } from "./layout.js";
import {
  graphStateDirectory,
  GraphLocalStateError,
  GRAPH_STATE_BYTES,
  invalidGraphState,
} from "./localFiles.js";

export async function withGraphLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const lockFile = path.join(await graphStateDirectory(root), GRAPH_LOCK_FILE);
  return withOwnerLock(
    lockFile,
    {
      kind: "graph-lock",
      maxBytes: GRAPH_STATE_BYTES,
      invalid: invalidGraphState,
      refused: (active, cause) =>
        new GraphLocalStateError(
          `Project graph analysis lock ${active ? "is contended" : "requires manual recovery"}.`,
          active
            ? "Retry after the active worktree graph operation (a graph query, analysis preparation or qfai init) finishes; retain its lock."
            : `Retain and inspect ${path.relative(root, lockFile).split(path.sep).join("/")}; remove only a confirmed abandoned worktree lock before retrying.`,
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

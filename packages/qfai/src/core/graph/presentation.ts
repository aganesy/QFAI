import { safeLstat } from "../init/fsGuards.js";
import { graphRuntimePaths, type GraphPreparation } from "./prepare.js";
import { DOCUMENT_PROCESSING_SETUP } from "./documents.js";

/** `.qfai/tools/` is git-ignored, so another clone or worktree has no graph CLI until init runs there. */
const GRAPH_TOOLS_LOCAL_NOTE =
  ".qfai/tools/ is local to this checkout: run qfai init in each other clone or worktree.";

export async function renderGraphPreview(root: string): Promise<string> {
  const paths = graphRuntimePaths(root);
  const codegraph = (await safeLstat(paths.codegraph)) !== undefined;
  const graphify = (await safeLstat(paths.python)) !== undefined;
  return [
    "Graph tools preview",
    "Planned actions",
    "  Verify compatible local runtimes; prepare missing CodeGraph and Graphify components.",
    "  Prepare the project graph CLI.",
    "Observed status",
    `  CodeGraph: ${codegraph ? "present (compatibility unverified)" : "not-ready"}`,
    `  Graphify: ${graphify ? "present (compatibility unverified)" : "not-ready"}`,
    "  Analysis: unverified; preview runs no graph verification.",
    "Preview only. No files, downloads, analysis or processes were changed.",
  ].join("\n");
}

export function renderGraphPreparation(preparation: GraphPreparation): string {
  const lines = [
    "Graph tools",
    "Tools",
    `  CodeGraph: ${preparation.tools?.codegraph ?? preparation.runtime}`,
    `  Graphify: ${preparation.tools?.graphify ?? preparation.runtime}`,
    "Analysis",
    `  ${preparation.code}`,
    `  ${preparation.documents}`,
    "Document analysis is not ready. Select a processing destination before analyzing documents.",
    DOCUMENT_PROCESSING_SETUP,
    GRAPH_TOOLS_LOCAL_NOTE,
  ];
  if (preparation.failedStep) {
    lines.push(
      `Failed step: ${preparation.failedStep}`,
      preparation.rerun
        ? `Recovery: Run ${preparation.rerun.command} to see the cause, fix it, then run qfai init again. Then delete ${preparation.rerun.directory}.`
        : "Recovery: Preparation failed. Fix the cause, then run qfai init again.",
    );
    if (preparation.recovery) lines.push(preparation.recovery);
    lines.push(`Previous installation: ${preparation.previousInstallation ?? "none"}`);
  }
  return lines.join("\n");
}

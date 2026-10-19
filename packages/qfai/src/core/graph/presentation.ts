import { safeLstat } from "../init/fsGuards.js";
import { graphRuntimePaths, type GraphPreparation } from "./prepare.js";
import type { GraphHostProtection } from "./hosts.js";
import { DOCUMENT_PROCESSING_SETUP } from "./documents.js";

/**
 * The host settings are committed while `.qfai/tools/` is not, so another clone or worktree has the
 * hook entries without the script they run.
 */
const GRAPH_TOOLS_LOCAL_NOTE =
  ".qfai/tools/ is local to this checkout: run npx qfai init in each other clone or worktree.";

export async function renderGraphPreview(root: string): Promise<string> {
  const paths = graphRuntimePaths(root);
  const codegraph = (await safeLstat(paths.codegraph)) !== undefined;
  const graphify = (await safeLstat(paths.python)) !== undefined;
  return [
    "Graph tools preview",
    "Planned actions",
    "  Verify compatible local runtimes; prepare missing CodeGraph and Graphify components.",
    "  Prepare the project CLI and separate search-denial entries; retain adopter settings.",
    "Observed status",
    `  CodeGraph: ${codegraph ? "present (compatibility unverified)" : "not-ready"}`,
    `  Graphify: ${graphify ? "present (compatibility unverified)" : "not-ready"}`,
    "  Analysis and protection: unverified; preview runs no graph or host verification.",
    "Preview only. No files, downloads, analysis or processes were changed.",
  ].join("\n");
}

export function renderGraphPreparation(
  preparation: GraphPreparation,
  hosts: readonly GraphHostProtection[] = [],
): string {
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
  ];
  lines.push("Protection");
  for (const host of hosts) {
    lines.push(`  ${host.host} (${host.version ?? "version unknown"}): ${host.state}`);
    if (host.configuration)
      lines.push(`  Project settings: ${host.configuration}; trust: ${host.trust ?? "unknown"}.`);
    lines.push(`  ${host.recovery}`);
  }
  lines.push(
    "Configuration alone does not verify search protection. Check trust and runtime verification for each host.",
    GRAPH_TOOLS_LOCAL_NOTE,
  );
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

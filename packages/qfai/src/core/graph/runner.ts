import { prepareNotCurrentCodeAnalysisLocked } from "./codePreparation.js";
import { prepareNotCurrentDocumentAnalysisLocked } from "./documents.js";
import { withGraphLock } from "./locks.js";
import { exploreGraph, type GraphAnswer, type GraphQuestion } from "./query.js";
import { runGraphProcess, type GraphProcess } from "./process.js";

export async function queryPreparedGraph(
  root: string,
  request: GraphQuestion,
  run: GraphProcess = runGraphProcess,
): Promise<GraphAnswer> {
  return withGraphLock(root, async () => {
    const initial = await exploreGraph(root, request, run);
    if (initial.status !== "not-ready") return initial;
    const preparation =
      request.domain === "code"
        ? await prepareNotCurrentCodeAnalysisLocked(root, run)
        : await prepareNotCurrentDocumentAnalysisLocked(root, run);
    if (preparation.status !== "prepared")
      return {
        ...initial,
        status: preparation.status === "failed" ? "failed" : "not-ready",
        ...(preparation.status === "failed"
          ? {
              failure: `${initial.engine === "codegraph" ? "CodeGraph" : "Graphify"} analysis preparation failed.`,
            }
          : {}),
        ...(preparation.recovery ? { recovery: preparation.recovery } : {}),
      };
    return exploreGraph(root, request, run);
  });
}

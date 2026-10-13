import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { getInitAssetsDir } from "../../shared/assets.js";
import { codegraphEnvironment, type GraphProcess } from "./process.js";
import {
  publishCompletedCodeAnalysis,
  restoreCompletedCodeAnalysis,
  type GraphReuseEnvironment,
} from "./reuse.js";
import { graphAnalysisRoot, graphRuntimePaths } from "./layout.js";
import {
  inspectCodeAnalysisAt,
  inspectCurrentCodeAnalysis,
  mirrorGraphCorpus,
} from "./analysis.js";
import {
  assertGraphStoragePath,
  assertIndependentAnalysis,
  replaceGraphDirectory,
} from "./storage.js";

export interface CodePreparation {
  status: "prepared" | "failed";
  source?: "generated" | "restored" | "current";
  recovery?: string;
  reuse?: "published" | "unavailable";
}

export async function prepareCodeAnalysis(
  root: string,
  run: GraphProcess,
  environment?: GraphReuseEnvironment,
): Promise<CodePreparation> {
  const current = graphAnalysisRoot(root, "codegraph");
  const staged = path.join(path.dirname(current), `.preparing-codegraph-${randomUUID()}`);
  let created = false;
  try {
    if (await inspectCurrentCodeAnalysis(root, run))
      return { status: "prepared", source: "current" };
    if ((await restoreCompletedCodeAnalysis(root, run, environment)) === "restored")
      return { status: "prepared", source: "restored" };
    await assertGraphStoragePath(root, staged);
    await mkdir(staged, { recursive: true });
    created = true;
    await mirrorGraphCorpus(root, staged);
    const runtime = graphRuntimePaths(root);
    const result = await run(
      runtime.codegraphNode,
      [
        "--liftoff-only",
        path.resolve(getInitAssetsDir(), "..", "graph", "codegraph-native.mjs"),
        runtime.codegraphSdk,
        staged,
      ],
      { cwd: staged, env: codegraphEnvironment(root) },
    );
    if (result.exitCode !== 0 || !(await inspectCodeAnalysisAt(root, staged, run))) return failed();
    await assertIndependentAnalysis(staged);
    await replaceGraphDirectory(staged, current, root);
    return {
      status: "prepared",
      source: "generated",
      reuse: await publishCompletedCodeAnalysis(root, run, environment),
    };
  } catch {
    return failed();
  } finally {
    if (created) await rm(staged, { recursive: true, force: true });
  }
}

function failed(): CodePreparation {
  return {
    status: "failed",
    recovery: "Repair the local CodeGraph runtime and prepare independent analysis.",
  };
}

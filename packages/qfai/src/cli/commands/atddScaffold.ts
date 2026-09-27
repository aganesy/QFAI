import path from "node:path";

import { deriveAtddFilePattern } from "../../core/atddTraceability.js";
import {
  buildSkeleton,
  emitSkeleton,
  isScaffoldTarget,
  scaffoldDestPath,
  type ScaffoldTarget,
} from "../../core/atdd/scaffold.js";
import { resolveScaffoldDialect, SCAFFOLD_RUNNERS } from "../../core/atdd/scaffoldDialect.js";
import {
  recordScaffoldAttempt,
  resetScaffoldAttempt,
  resolveEscalateThreshold,
  shouldEscalate,
} from "../../core/atdd/scaffoldEscalation.js";
import { loadConfig } from "../../core/config.js";
import { isStoryTreeId } from "../../core/storyTree/ids.js";
import { readStoryTreeModel } from "../../core/storyTree/tree.js";
import { error as logError, info as logInfo } from "../lib/logger.js";

export type AtddScaffoldOptions = {
  root: string;
  storyId?: string;
  flowId?: string;
  /** Kept only to emit the migration refusal for an explicit --spec. */
  specId?: string;
  write?: (message: string) => void;
  writeErr?: (message: string) => void;
};

function targetsForStory(
  storyId: string,
  criteria: readonly { id: string; storyId: string }[],
): ScaffoldTarget[] {
  return criteria
    .filter((item) => item.storyId === storyId)
    .map((item) => item.id)
    .sort()
    .map((id) => ({ id, kind: "AC" as const, storyId }));
}

export async function runAtddScaffold(options: AtddScaffoldOptions): Promise<number> {
  const write = options.write ?? logInfo;
  const writeErr = options.writeErr ?? logError;
  if (options.specId !== undefined) {
    writeErr("qfai atdd scaffold: --spec is retired; use --story US-NNNN-NNNN or --flow BF-NNNN.");
    return 2;
  }
  if ((options.storyId === undefined) === (options.flowId === undefined)) {
    writeErr("qfai atdd scaffold: specify exactly one of --story US-NNNN-NNNN or --flow BF-NNNN.");
    return 2;
  }
  const storyId = options.storyId;
  const flowId = options.flowId;
  if (
    (storyId !== undefined && !isStoryTreeId(storyId, "US")) ||
    (flowId !== undefined && !isStoryTreeId(flowId, "BF"))
  ) {
    writeErr("qfai atdd scaffold: malformed --story or --flow ID.");
    return 2;
  }

  try {
    const { config } = await loadConfig(options.root);
    const model = await readStoryTreeModel(options.root, config);
    let targets: ScaffoldTarget[];
    if (storyId !== undefined) {
      if (!model.stories.some((story) => story.id === storyId)) {
        writeErr(`qfai atdd scaffold: story ${storyId} is not defined in the story tree.`);
        return 2;
      }
      targets = targetsForStory(storyId, model.acceptanceCriteria);
      const ids = targets.map((target) => target.id);
      if (new Set(ids).size !== ids.length || targets.some((target) => !isScaffoldTarget(target))) {
        writeErr(`qfai atdd scaffold: ${storyId} has duplicate or malformed AC declarations.`);
        return 2;
      }
    } else {
      if (flowId === undefined || !model.flows.some((flow) => flow.id === flowId)) {
        writeErr(`qfai atdd scaffold: flow ${flowId ?? ""} is not defined in the story tree.`);
        return 2;
      }
      targets = [{ id: flowId, kind: "BF" }];
    }

    const testsDir = config.paths.testsDir;
    const testFileGlobs = config.validation.traceability.testFileGlobs;
    const excludeGlobs = config.validation.traceability.testFileExcludeGlobs;
    const probeTarget = targets[0];
    if (probeTarget === undefined) {
      write(`qfai atdd scaffold: ${storyId} defines no AC; nothing to emit.`);
      return 0;
    }
    const probePath = scaffoldDestPath(options.root, probeTarget, testsDir);
    const relativeDir = path.relative(options.root, path.dirname(probePath)).replace(/\\/g, "/");
    const comparable =
      relativeDir !== ".." && !relativeDir.startsWith("../") && !path.isAbsolute(relativeDir);
    const resolution = resolveScaffoldDialect(testFileGlobs, {
      ...(comparable ? { scaffoldDir: relativeDir } : {}),
      excludeGlobs,
      ids: targets.map((target) => target.id),
    });
    if (resolution.outcome === "unsupported-stack") {
      writeErr(
        `qfai atdd scaffold: no skeleton dialect for ${deriveAtddFilePattern(testFileGlobs)}; supported runners: ${SCAFFOLD_RUNNERS.join(", ")}.`,
      );
      return 2;
    }
    if (resolution.outcome === "naming-mismatch") {
      writeErr(
        `qfai atdd scaffold: no generated test path matches testFileGlobs (${testFileGlobs.join(", ")}); candidates: ${resolution.shapes.join(", ")}.`,
      );
      return 2;
    }
    const dialect = resolution.dialect;
    const threshold = resolveEscalateThreshold(config.atdd?.scaffoldEscalateCycles);
    const summary: string[] = [];
    for (const target of targets) {
      const destination = scaffoldDestPath(options.root, target, testsDir, dialect);
      const outcome = await emitSkeleton(target, destination, buildSkeleton(target, dialect));
      if (outcome.alreadyProgressed) await resetScaffoldAttempt(options.root, target.id);
      else {
        const cycles = await recordScaffoldAttempt(options.root, target.id);
        if (shouldEscalate(cycles, threshold)) {
          writeErr(
            `qfai atdd scaffold: escalation — ${target.id} remains a placeholder after ${cycles} scaffold runs.`,
          );
        }
      }
      summary.push(
        `${target.id}: ${outcome.wrote ? "created" : outcome.alreadyPlaceholder ? "existing placeholder" : "existing test"} (${path.relative(options.root, destination).replace(/\\/g, "/")})`,
      );
    }
    write(`qfai atdd scaffold: ${summary.length} target(s) processed.\n${summary.join("\n")}`);
    return 0;
  } catch (caught) {
    writeErr(`qfai atdd scaffold: ${caught instanceof Error ? caught.message : String(caught)}`);
    return 1;
  }
}

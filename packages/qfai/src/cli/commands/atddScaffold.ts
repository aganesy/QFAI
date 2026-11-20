import { readFile } from "node:fs/promises";
import path from "node:path";

import { deriveAtddFilePattern } from "../../core/atddTraceability.js";
import {
  buildSkeleton,
  emitSkeleton,
  isScaffoldTarget,
  scaffoldDestPath,
  type ScaffoldTarget,
} from "../../core/atdd/scaffold.js";
import {
  detectJsTestRunner,
  type JsTestRunner,
  type PackageModuleType,
  applyJsRunner,
  readPackageModuleType,
  resolveScaffoldDialect,
  SCAFFOLD_RUNNERS,
} from "../../core/atdd/scaffoldDialect.js";
import { loadConfig } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { isStoryTreeId } from "../../core/storyTree/ids.js";
import { readStoryTreeModel } from "../../core/storyTree/tree.js";
import { error as logError, info as logInfo } from "../../core/logger.js";
import { parseJsonText } from "../../shared/jsonText.js";

export type AtddScaffoldOptions = {
  root: string;
  storyId?: string;
  flowId?: string;
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

/**
 * The runner the nearest deciding `package.json` declares, searched from
 * `fromDir` up to `root`, so a workspace member's manifest decides for its own
 * tests. A manifest naming no runner leaves the answer to the next one up:
 * `none` when every manifest on the path named none, `unknown` when the path
 * holds no manifest.
 */
async function readJsTestRunner(root: string, fromDir: string): Promise<JsTestRunner> {
  let found: JsTestRunner = "unknown";
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    const manifest = await readManifest(dir);
    if (manifest !== undefined) {
      const runner = detectJsTestRunner(manifest.value);
      if (runner !== "none") return runner;
      found = runner;
    }
    if (path.relative(root, dir) === "" || path.dirname(dir) === dir) return found;
  }
}

/**
 * The `type` of the `package.json` nearest `fromDir`, searched up to `root`,
 * which is the one Node reads to decide how it loads a `.js` file there.
 */
async function readNearestPackageType(root: string, fromDir: string): Promise<PackageModuleType> {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    const manifest = await readManifest(dir);
    if (manifest !== undefined) return readPackageModuleType(manifest.value);
    if (path.relative(root, dir) === "" || path.dirname(dir) === dir) return "unset";
  }
}

/** The parsed `package.json` in `dir`, or `undefined` when there is none. */
async function readManifest(dir: string): Promise<{ value: unknown } | undefined> {
  const manifestPath = path.join(dir, "package.json");
  let text: string;
  try {
    text = await readFile(manifestPath, "utf8");
  } catch (caught) {
    if (isEnoent(caught)) return undefined;
    throw caught;
  }
  try {
    return { value: parseJsonText(text) };
  } catch (caught) {
    throw new Error(
      `${manifestPath} is not valid JSON: ${caught instanceof Error ? caught.message : String(caught)}`,
      { cause: caught },
    );
  }
}

export async function runAtddScaffold(options: AtddScaffoldOptions): Promise<number> {
  const write = options.write ?? logInfo;
  const writeErr = options.writeErr ?? logError;
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
    const globResolution = resolveScaffoldDialect(testFileGlobs, {
      ...(comparable ? { scaffoldDir: relativeDir } : {}),
      excludeGlobs,
      ids: targets.map((target) => target.id),
    });
    const manifestDir = comparable ? path.dirname(probePath) : options.root;
    const resolution =
      globResolution.outcome === "resolved" && globResolution.dialect.id === "js-ts"
        ? applyJsRunner(
            globResolution.dialect,
            await readJsTestRunner(options.root, manifestDir),
            await readNearestPackageType(options.root, manifestDir),
          )
        : globResolution;
    if (resolution.outcome === "unsupported-stack") {
      writeErr(
        `qfai atdd scaffold: no skeleton dialect for ${deriveAtddFilePattern(testFileGlobs)}; supported runners: ${SCAFFOLD_RUNNERS.join(", ")}.`,
      );
      return 2;
    }
    if (resolution.outcome === "unsupported-runner") {
      writeErr(
        `qfai atdd scaffold: ${resolution.runner === "none" ? "package.json names no test runner" : `package.json runs tests with ${resolution.runner}, which has no skeleton dialect`}; supported runners: ${SCAFFOLD_RUNNERS.join(", ")}. Declare vitest in devDependencies, or run node --test from a package.json script.`,
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
    const summary: string[] = [];
    for (const target of targets) {
      const destination = scaffoldDestPath(options.root, target, testsDir, dialect);
      const outcome = await emitSkeleton(target, destination, buildSkeleton(target, dialect));
      summary.push(
        `${target.id}: ${outcome.wrote ? "created" : "existing test"} (${path.relative(options.root, destination).replace(/\\/g, "/")})`,
      );
      if (outcome.leftBehind !== undefined) {
        summary.push(
          `${target.id}: could not remove the staging file ${path.relative(options.root, outcome.leftBehind).replace(/\\/g, "/")}; delete it.`,
        );
      }
    }
    write(`qfai atdd scaffold: ${targets.length} target(s) processed.\n${summary.join("\n")}`);
    return 0;
  } catch (caught) {
    writeErr(`qfai atdd scaffold: ${caught instanceof Error ? caught.message : String(caught)}`);
    return 1;
  }
}

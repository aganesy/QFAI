import { readFile } from "node:fs/promises";
import path from "node:path";

import { createTestLayerRoots, resolveTestKind, type AtddTestKind } from "../atddTraceability.js";
import { resolvePath, type QfaiConfig } from "../config.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import { parseStoryTestAnnotations } from "../storyTree/ids.js";
import { classifyRecordRow } from "../storyTree/tables.js";
import { readStoryTreeModel, type StoryTreeModel } from "../storyTree/tree.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "../traceability.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

export type StoryTestFile = {
  file: string;
  content: string;
  kind: AtddTestKind | null;
  selectedForExample: boolean;
};

export type StoryObligationProfile = "atdd" | "tdd";

/** Whether an EX annotation in this file covers its example: a selected test outside E2E. */
export function countsForExample(file: StoryTestFile): boolean {
  return file.selectedForExample && file.kind !== "e2e";
}

/** Evaluates coverage using the layer assigned by the existing ATDD crosswalk. */
export function validateStoryTreeObligationsModel(
  model: StoryTreeModel,
  files: readonly StoryTestFile[],
  profile: StoryObligationProfile,
): Issue[] {
  const issues: Issue[] = [];
  const known = {
    BF: new Set(model.flows.map(({ id }) => id)),
    AC: new Set(model.acceptanceCriteria.map(({ id }) => id)),
    EX: new Set(model.examples.map(({ id }) => id)),
  };
  const covered = { BF: new Set<string>(), AC: new Set<string>(), EX: new Set<string>() };
  for (const file of files) {
    const annotations = parseStoryTestAnnotations(file.content);
    for (const id of annotations.BF) {
      if (!known.BF.has(id)) {
        issues.push(
          issue(
            "QFAI-STORY-008",
            `Undeclared annotation ${id} in ${file.file}`,
            "error",
            file.file,
            "storyTree.undeclaredAnnotation",
            [id],
          ),
        );
      }
      if (profile === "atdd" && file.kind !== "e2e") {
        issues.push(
          issue(
            "QFAI-STORY-007",
            `QFAI:${id} is misplaced in ${file.file}; BF requires E2E`,
            "error",
            file.file,
            "storyTree.misplacedAnnotation",
            [id],
          ),
        );
      }
      if (file.kind === "e2e") covered.BF.add(id);
    }
    for (const id of annotations.AC) {
      if (!known.AC.has(id)) {
        issues.push(
          issue(
            "QFAI-STORY-008",
            `Undeclared annotation ${id} in ${file.file}`,
            "error",
            file.file,
            "storyTree.undeclaredAnnotation",
            [id],
          ),
        );
      }
      if (profile === "atdd" && file.kind !== "integration" && file.kind !== "api") {
        issues.push(
          issue(
            "QFAI-STORY-007",
            `QFAI:${id} is misplaced in ${file.file}; AC requires integration or API`,
            "error",
            file.file,
            "storyTree.misplacedAnnotation",
            [id],
          ),
        );
      }
      if (file.kind === "integration" || file.kind === "api") covered.AC.add(id);
    }
    for (const id of annotations.EX) {
      if (!known.EX.has(id)) {
        issues.push(
          issue(
            "QFAI-STORY-008",
            `Undeclared annotation ${id} in ${file.file}`,
            "error",
            file.file,
            "storyTree.undeclaredAnnotation",
            [id],
          ),
        );
      }
      if (profile === "tdd" && file.kind === "e2e") {
        issues.push(
          issue(
            "QFAI-STORY-007",
            `QFAI:${id} is misplaced in ${file.file}; EX requires a test outside E2E`,
            "error",
            file.file,
            "storyTree.misplacedAnnotation",
            [id],
          ),
        );
      }
      if (countsForExample(file)) covered.EX.add(id);
    }
  }

  const exceptions = new Map<string, string>();
  for (const row of model.decisions?.rows ?? []) {
    const classified = classifyRecordRow(row);
    if (classified.kind !== "test-exception" || !classified.inForce) continue;
    for (const id of classified.refs) {
      if (known.BF.has(id) || known.AC.has(id) || known.EX.has(id)) {
        exceptions.set(id, row.id);
      }
    }
  }
  for (const [id, decision] of exceptions) {
    issues.push(
      issue(
        "QFAI-STORY-009",
        `${id} is exempted by ${decision}`,
        "info",
        model.decisionFile ?? undefined,
        "storyTree.testException",
        [id, decision],
      ),
    );
  }
  const owed =
    profile === "atdd"
      ? [
          ...model.flows.map((entry) => ({ ...entry, kind: "BF" as const, target: "E2E" })),
          ...model.acceptanceCriteria.map((entry) => ({
            ...entry,
            kind: "AC" as const,
            target: "integration or API",
          })),
        ]
      : model.examples.map((entry) => ({ ...entry, kind: "EX" as const, target: "test" }));
  for (const entry of owed) {
    if (covered[entry.kind].has(entry.id) || exceptions.has(entry.id)) continue;
    issues.push(
      issue(
        "QFAI-STORY-006",
        `${entry.id} is missing a ${entry.target} test annotation`,
        "error",
        entry.file,
        "storyTree.testObligation",
        [entry.id],
      ),
    );
  }
  return issues;
}

function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}

/** Reads acceptance layers and the configured EX test selectors once per run. */
export async function readStoryTests(
  root: string,
  config: QfaiConfig,
): Promise<{ files: StoryTestFile[]; truncated: boolean }> {
  const testsRoot = resolvePath(root, config, "testsDir");
  const relativeTests = toPosix(path.relative(root, testsRoot)).replace(/\/$/, "");
  const layerGlobs = ["e2e", "integration", "api"].map((kind) => `${relativeTests}/${kind}/**/*`);
  const configured = config.validation.traceability.testFileGlobs;
  const negatives = configured
    .filter((pattern) => pattern.startsWith("!"))
    .map((pattern) => pattern.slice(1));
  const positive = configured.filter((pattern) => !pattern.startsWith("!"));
  const ignore = [
    ...DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
    ...config.validation.traceability.testFileExcludeGlobs,
    ...negatives,
  ];
  const [acceptance, examples] = await Promise.all([
    collectFilesByGlobs(root, {
      globs: [...layerGlobs, ...positive],
      ignore,
      limit: DEFAULT_GLOB_FILE_LIMIT,
    }),
    positive.length > 0
      ? collectFilesByGlobs(root, { globs: positive, ignore, limit: DEFAULT_GLOB_FILE_LIMIT })
      : Promise.resolve({ files: [], truncated: false }),
  ]);
  const examplePaths = new Set(examples.files.map((file) => path.resolve(file)));
  const roots = createTestLayerRoots(root, config);
  const files = await Promise.all(
    [...new Set([...acceptance.files, ...examples.files].map((file) => path.resolve(file)))].map(
      async (file) => ({
        file,
        content: await readFile(file, "utf8"),
        kind: resolveTestKind(file, roots),
        selectedForExample: examplePaths.has(file),
      }),
    ),
  );
  return { files, truncated: acceptance.truncated || examples.truncated };
}

export async function validateStoryTreeObligations(
  root: string,
  config: QfaiConfig,
  profile: StoryObligationProfile,
  model?: StoryTreeModel,
): Promise<Issue[]> {
  const tree = model ?? (await readStoryTreeModel(root, config));
  let scan: Awaited<ReturnType<typeof readStoryTests>>;
  try {
    scan = await readStoryTests(root, config);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [
      issue(
        "QFAI-SCAN-002",
        `Story-tree test scan failed: ${reason}`,
        "error",
        root,
        "storyTree.testScan",
      ),
    ];
  }
  if (scan.truncated) {
    return [
      issue(
        "QFAI-SCAN-002",
        `Story-tree test scan stopped at the ${DEFAULT_GLOB_FILE_LIMIT} file limit; coverage is incomplete`,
        "error",
        root,
        "storyTree.testScan",
      ),
    ];
  }
  return validateStoryTreeObligationsModel(tree, scan.files, profile);
}

import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { isStoryTreeId, storyIdMatchesFlow } from "./ids.js";

export const POLICY_FILES = [
  "objective.md",
  "initiative.md",
  "principle.md",
  "glossary.md",
  "constraint.md",
] as const;

export const STORY_FILES = [
  "01_User-story.md",
  "02_Acceptance-Criteria.md",
  "03_Example.md",
] as const;

export const BUSINESS_FLOW_FILES = ["business-flow.md", "user-stories.md"] as const;

export const CONTRACT_LAYER_FILES = ["contracts.md", "tech.md"] as const;
export const CONTRACT_KIND_DIRS = ["api", "db", "ui", "cli"] as const;

/** The form a contract takes in each kind directory that holds no Markdown contract. */
export const NON_MARKDOWN_CONTRACT_FORMS = {
  api: "OpenAPI YAML or JSON",
  db: "SQL",
  ui: "YAML",
} as const;

/**
 * The kind directory of a Markdown file under `api/`, `db/` or `ui/`, which is
 * not a contract, or `null` for any other path. `relative` is posix and
 * relative to the contracts directory.
 */
export function markdownOutsideContractForm(
  relative: string,
): keyof typeof NON_MARKDOWN_CONTRACT_FORMS | null {
  const match = /^(api|db|ui)\/.+\.[mM][dD]$/.exec(relative);
  const directory = match?.[1];
  return directory === "api" || directory === "db" || directory === "ui" ? directory : null;
}

/**
 * The directory of a file under the contracts directory that is not a kind
 * directory, or `null` for a file at its root or in a kind directory.
 * `relative` is posix and relative to the contracts directory.
 */
export function directoryOutsideContractKinds(relative: string): string | null {
  const [directory, ...rest] = relative.split("/");
  if (rest.length === 0 || directory === undefined) return null;
  return CONTRACT_KIND_DIRS.some((kind) => kind === directory) ? null : directory;
}

export const STORY_TREE_ROOT_ENTRIES = [
  "decisions.md",
  "open-questions.md",
  "01_policy",
  "02_business-flow",
] as const;

export type StoryTreeRoots = { specsDir: string; contractsDir: string };

export function resolveStoryTreeRoots(root: string, config: QfaiConfig): StoryTreeRoots {
  return {
    specsDir: resolvePath(root, config, "specsDir"),
    contractsDir: resolvePath(root, config, "contractsDir"),
  };
}

function isLegacySpecPackEntry(entry: string): boolean {
  return entry === "_policies" || /^spec-[^/\\]+$/.test(entry);
}

export function hasLegacySpecPackEntries(entries: readonly string[]): boolean {
  return entries.some(isLegacySpecPackEntry);
}

/** Every file under the spec-pack and policy directories of an old layout, project-relative. */
export async function listLegacySpecPackFiles(
  root: string,
  layoutRoot: string,
  entries: readonly string[],
): Promise<string[]> {
  const files: string[] = [];
  for (const entry of entries.filter(isLegacySpecPackEntry)) {
    const entryPath = path.join(layoutRoot, entry);
    if (!(await lstat(entryPath)).isDirectory()) {
      files.push(entryPath);
      continue;
    }
    for (const found of await readdir(entryPath, { recursive: true, withFileTypes: true })) {
      if (!found.isDirectory()) files.push(path.join(found.parentPath, found.name));
    }
  }
  return files.map((file) => path.relative(root, file).split(path.sep).join("/")).sort();
}

/** The message of the one error an old layout raises: where it is, what remains, how to finish. */
export function oldLayoutMessage(layoutRoot: string, files: readonly string[]): string {
  return [
    `Old spec-pack layout at ${layoutRoot}. These files remain under its spec-*/ and _policies/ directories:`,
    ...files,
    "Run /qfai-migration-v1-to-v2 and place what it lists through /qfai-sdd; delete a file only once the migration has archived it under .qfai/evidence/migration-spec-to-story/retired/.",
  ].join("\n");
}

export function hasStoryTreeEntries(entries: readonly string[]): boolean {
  return STORY_TREE_ROOT_ENTRIES.some((entry) => entries.includes(entry));
}

/** Detect the story-tree layout through the configured specs directory. */
export async function isStoryTreeProject(root: string, config: QfaiConfig): Promise<boolean> {
  const specsDir = resolveStoryTreeRoots(root, config).specsDir;
  try {
    return hasStoryTreeEntries(await readdir(specsDir));
  } catch (caught: unknown) {
    if (caught instanceof Error && "code" in caught && caught.code === "ENOENT") return false;
    throw caught;
  }
}

export function storyTreeMarkdownPatterns(specsDir: string, contractsDir: string): string[] {
  const specs = specsDir.replace(/\\/g, "/").replace(/\/$/, "");
  const contracts = contractsDir.replace(/\\/g, "/").replace(/\/$/, "");
  const flow = `${specs}/02_business-flow/business-flow-*`;
  const story = `${flow}/user-story-*`;
  return [
    `${specs}/decisions.md`,
    `${specs}/open-questions.md`,
    ...POLICY_FILES.map((name) => `${specs}/01_policy/${name}`),
    `${specs}/02_business-flow/business-flows.md`,
    ...BUSINESS_FLOW_FILES.map((name) => `${flow}/${name}`),
    ...STORY_FILES.map((name) => `${story}/${name}`),
    ...CONTRACT_LAYER_FILES.map((name) => `${contracts}/${name}`),
  ];
}

export function storyPaths(
  specsDir: string,
  flowId: string,
  storyId: string,
): {
  flowDir: string;
  storyDir: string;
  files: readonly string[];
} {
  if (!isStoryTreeId(flowId, "BF") || !storyIdMatchesFlow(storyId, flowId)) {
    throw new TypeError("Story and flow IDs must be valid and have the same flow number");
  }
  const flowNumber = flowId.replace(/^BF-/, "");
  const storyNumber = storyId.replace(/^US-/, "");
  const flowDir = path.join(specsDir, "02_business-flow", `business-flow-${flowNumber}`);
  const storyDir = path.join(flowDir, `user-story-${storyNumber}`);
  return {
    flowDir: flowDir.replace(/\\/g, "/"),
    storyDir: storyDir.replace(/\\/g, "/"),
    files: STORY_FILES.map((name) => path.join(storyDir, name).replace(/\\/g, "/")),
  };
}

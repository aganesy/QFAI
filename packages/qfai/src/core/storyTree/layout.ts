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

export const CONTRACT_LAYER_FILES = ["contracts.md", "tech.md", "structure.md"] as const;
export const CONTRACT_KIND_DIRS = ["api", "db", "ui", "cli", "design"] as const;
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

export function hasLegacySpecPackEntries(entries: readonly string[]): boolean {
  return entries.some((entry) => entry === "_policies" || /^spec-[^/\\]+$/.test(entry));
}

export function hasStoryTreeEntries(entries: readonly string[]): boolean {
  return STORY_TREE_ROOT_ENTRIES.some((entry) => entries.includes(entry));
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

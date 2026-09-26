import { parseTestFlowRefs } from "../businessFlow.js";

export type StoryTreeIdKind = "BF" | "US" | "AC" | "EX" | "BR" | "DEC" | "OQ";

const ID_PATTERNS: Record<StoryTreeIdKind, RegExp> = {
  BF: /^BF-\d{4}$/,
  US: /^US-\d{4}-\d{4}$/,
  AC: /^AC-\d{4}-\d{4}-\d{2}$/,
  EX: /^EX-\d{4}-\d{4}-\d{2}$/,
  BR: /^BR-\d{4}$/,
  DEC: /^DEC-\d{4}$/,
  OQ: /^OQ-\d{4}$/,
};

export const STORY_TEST_ANNOTATIONS = {
  BF: /\bQFAI:(BF-\d{4})(?![\d-])/g,
  AC: /\bQFAI:(AC-\d{4}-\d{4}-\d{2})(?![\d-])/g,
  EX: /\bQFAI:(EX-\d{4}-\d{4}-\d{2})(?![\d-])/g,
} as const;

export function isStoryTreeId(value: string, kind: StoryTreeIdKind): boolean {
  return ID_PATTERNS[kind].test(value);
}

export function storyIdMatchesFlow(storyId: string, flowId: string): boolean {
  return (
    isStoryTreeId(storyId, "US") &&
    isStoryTreeId(flowId, "BF") &&
    storyId.slice(3, 7) === flowId.slice(3, 7)
  );
}

export function itemIdMatchesStory(itemId: string, storyId: string): boolean {
  return (
    (isStoryTreeId(itemId, "AC") || isStoryTreeId(itemId, "EX")) &&
    isStoryTreeId(storyId, "US") &&
    itemId.slice(3, 12) === storyId.slice(3)
  );
}

export function nextId(
  kind: StoryTreeIdKind,
  namedIds: readonly string[],
  parentId?: string,
): string {
  const nested = kind === "US" || kind === "AC" || kind === "EX";
  const parentKind = kind === "US" ? "BF" : "US";
  if (nested && (!parentId || !isStoryTreeId(parentId, parentKind))) {
    throw new TypeError(`${kind} requires a valid ${parentKind} parent ID`);
  }
  if (!nested && parentId !== undefined) {
    throw new TypeError(`${kind} has no parent ID`);
  }
  const prefix = nested ? `${kind}-${parentId?.slice(3)}-` : `${kind}-`;
  const width = kind === "AC" || kind === "EX" ? 2 : 4;
  const highest = namedIds
    .filter((id) => isStoryTreeId(id, kind) && id.startsWith(prefix))
    .reduce((max, id) => Math.max(max, Number(id.slice(-width))), 0);
  if (highest >= 10 ** width - 1) {
    throw new RangeError(`${kind} ID space is exhausted under ${parentId ?? "the tree"}`);
  }
  return `${prefix}${String(highest + 1).padStart(width, "0")}`;
}

export function parseStoryTestAnnotations(text: string): Record<"BF" | "AC" | "EX", string[]> {
  const exactFlowIds = new Set(
    [...text.matchAll(STORY_TEST_ANNOTATIONS.BF)].map((match) => match[1] ?? ""),
  );
  return {
    BF: parseTestFlowRefs(text).filter((id) => exactFlowIds.has(id)),
    AC: [...new Set([...text.matchAll(STORY_TEST_ANNOTATIONS.AC)].map((match) => match[1] ?? ""))]
      .filter(Boolean)
      .sort(),
    EX: [...new Set([...text.matchAll(STORY_TEST_ANNOTATIONS.EX)].map((match) => match[1] ?? ""))]
      .filter(Boolean)
      .sort(),
  };
}

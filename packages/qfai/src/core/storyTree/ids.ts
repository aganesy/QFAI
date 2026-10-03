import { parseTestFlowRefs } from "../businessFlow.js";

export type StoryTreeIdKind = "BF" | "US" | "AC" | "EX" | "BR" | "DEC" | "OQ";

const ID_PATTERNS: Record<StoryTreeIdKind, RegExp> = {
  BF: /^BF-\d{4}$/,
  US: /^US-\d{4}-\d{4}$/,
  AC: /^AC-\d{4}-\d{4}-\d{2}$/,
  EX: /^EX-\d{4}-\d{4}-\d{2}$/,
  BR: /^BR-\d{4}-\d{4}$/,
  DEC: /^DEC-\d{4}$/,
  OQ: /^OQ-\d{4}$/,
};

/** A contract ID: the kind its directory names, then a number unique across kinds. */
const CONTRACT_ID = /^(?:CLI|API|DB|UI)-(\d{4})$/;

/** The contract kind each directory under `paths.contractsDir` holds. */
export const CONTRACT_KIND_BY_DIR = {
  cli: "CLI",
  api: "API",
  db: "DB",
  ui: "UI",
} as const;

export function isContractId(value: string): boolean {
  return CONTRACT_ID.test(value);
}

/** The number of a contract ID, or `null` when the value is not one. */
export function contractNumber(contractId: string): string | null {
  return CONTRACT_ID.exec(contractId)?.[1] ?? null;
}

/** The contract number a `BR-NNNN-NNNN` carries, or `null` for any other value. */
export function ruleContractNumber(ruleId: string): string | null {
  return /^BR-(\d{4})-\d{4}$/.exec(ruleId)?.[1] ?? null;
}

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

function allocationScope(
  kind: StoryTreeIdKind,
  parentId: string | undefined,
): { prefix: string; width: number } {
  if (kind === "BR") {
    const number = contractNumber(parentId ?? "");
    if (!number) throw new TypeError("BR requires a valid contract parent ID");
    return { prefix: `BR-${number}-`, width: 4 };
  }
  const nested = kind === "US" || kind === "AC" || kind === "EX";
  const parentKind = kind === "US" ? "BF" : "US";
  if (nested && (!parentId || !isStoryTreeId(parentId, parentKind))) {
    throw new TypeError(`${kind} requires a valid ${parentKind} parent ID`);
  }
  if (!nested && parentId !== undefined) {
    throw new TypeError(`${kind} has no parent ID`);
  }
  return {
    prefix: nested ? `${kind}-${parentId?.slice(3)}-` : `${kind}-`,
    width: kind === "AC" || kind === "EX" ? 2 : 4,
  };
}

/**
 * The highest ID the list names under the parent's prefix, plus one. A BR takes
 * the contract that declares it as its parent.
 */
export function nextId(
  kind: StoryTreeIdKind,
  namedIds: readonly string[],
  parentId?: string,
): string {
  const { prefix, width } = allocationScope(kind, parentId);
  const shape = new RegExp(`^${prefix}\\d{${width}}$`);
  const highest = namedIds
    .filter((id) => shape.test(id))
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

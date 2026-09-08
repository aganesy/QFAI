/**
 * Business flows, and the edge that binds a story to one.
 *
 * `_policies/04_Business-Flow.md` is shipped as the SSOT for how the system is
 * used end to end — Main Flow, Alternate and Exception Flows. Until a flow had
 * an ID, nothing could cite one, so the document was read by no gate and the
 * E2E obligation was keyed on `US-*` alone. Story count is not flow count, and
 * a tree of one E2E test per story is the shape that produces.
 *
 * ## The direction of the edge
 *
 * A story names its flows; a flow does not name its stories. That is not a
 * preference — `_policies/**` must not define or own a lower-layer item, and a
 * `BF-0001 -> US-0001-0002` edge written in the flow document would be exactly
 * that (see `qfai-sdd/references/spec-traceability-rules.md`). The legal
 * direction is the one every other edge already runs: upward, from the item to
 * what governs it, like `- Parent: CAP-0001`.
 *
 * One consequence is worth stating because it decides what a missing edge
 * means. The obligation cannot move onto `BF-*`, since the flow document is not
 * allowed to know which stories exist. So `QFAI-ATDD-111` stays keyed on `US-*`
 * — which is also where acceptance lives — and a flow annotation is an
 * additional way to DISCHARGE that obligation, never a replacement for it. A
 * story that names no flow keeps the obligation it already had.
 */
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { collectSpecEntries } from "./specLayout.js";
import { readSafe } from "./validators/utils.js";

/** A flow the policy document declares. */
export type BusinessFlowDefinition = {
  id: string;
  /** 1-based line in `04_Business-Flow.md`, for a finding that can be opened. */
  line: number;
};

/** A `- Flow:` citation, kept with the story that wrote it. */
export type StoryFlowRef = {
  specId: string;
  usId: string;
  flowId: string;
  file: string;
  line: number;
};

export type BusinessFlowScan = {
  /** The flow document, whether or not it exists. */
  flowPath: string;
  /** Declared flows, in document order. */
  definitions: BusinessFlowDefinition[];
  /** Ids declared more than once, sorted. */
  duplicateIds: string[];
  /** Every `- Flow:` citation across the spec set. */
  storyRefs: StoryFlowRef[];
};

/**
 * A declaration: the ID opens a list item or a heading.
 *
 * Anchored on purpose. The flow document is prose with diagrams, and a `BF-*`
 * written mid-sentence is a citation of a flow declared elsewhere in the file,
 * not a second declaration of it — counting those would report a duplicate for
 * every flow the Notes section mentions.
 */
const FLOW_DEFINITION_RE = /^\s*(?:[-*+]\s+|#{1,6}\s+)(BF-\d{4})\b/;

/** `- Flow: BF-0001, BF-0004` inside a story block. */
const STORY_FLOW_LINE_RE = /^\s*[-*+]\s*Flow\s*:\s*(.+)$/i;

/** A `## US-0001` / `### US-0001-0002` heading opens the block the line belongs to. */
const US_HEADING_RE = /^#{2,6}\s+(US-\d{4}(?:-\d{4})?)\b/;

const BF_ID_RE = /\bBF-\d{4}\b/g;

/** `QFAI:BF-0001` — the annotation form, in a test. */
const TEST_FLOW_ANNOTATION_RE = /\bQFAI:(BF-\d{4})\b/g;

/**
 * The flows a test annotates.
 *
 * Read by the ATDD scan, which resolves each to the stories that cite it. An id
 * no flow declares resolves to no story, so the stories it was meant to cover
 * stay uncovered and `QFAI-ATDD-111` names them — the annotation is not
 * silently credited, and the finding an author sees is about the obligation
 * rather than about the token. `QFAI-BFLOW-005` covers the same typo on the
 * story side, where the edge is authored.
 */
export function parseTestFlowRefs(text: string): string[] {
  return [...new Set([...text.matchAll(TEST_FLOW_ANNOTATION_RE)].map((match) => match[1] ?? ""))]
    .filter((id) => id.length > 0)
    .sort();
}

/** Every story that cites each flow, keyed by flow id. */
export function storiesByFlow(scan: BusinessFlowScan): Map<string, StoryFlowRef[]> {
  const map = new Map<string, StoryFlowRef[]>();
  for (const ref of scan.storyRefs) {
    map.set(ref.flowId, [...(map.get(ref.flowId) ?? []), ref]);
  }
  return map;
}

/**
 * Read the flow document and every story that cites one.
 *
 * Returns an empty scan when there is no flow document. A spec set that has not
 * adopted flow IDs is not in error: the edge is additive, and a project on the
 * story-grain obligation is the state every project starts in.
 */
export async function scanBusinessFlows(
  root: string,
  config: QfaiConfig,
): Promise<BusinessFlowScan> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const flowPath = entries[0]?.flowPath ?? path.join(specsRoot, "_policies", "04_Business-Flow.md");

  const { definitions, duplicateIds } = parseFlowDefinitions(await readSafe(flowPath));

  const storyRefs: StoryFlowRef[] = [];
  for (const entry of entries) {
    const text = await readSafe(entry.userStoriesPath);
    if (text.length === 0) {
      continue;
    }
    storyRefs.push(...parseStoryFlowRefs(text, entry.specNumber, entry.userStoriesPath));
  }

  return { flowPath, definitions, duplicateIds, storyRefs };
}

/** Declarations in `04_Business-Flow.md`, and the ids declared twice. */
export function parseFlowDefinitions(text: string): {
  definitions: BusinessFlowDefinition[];
  duplicateIds: string[];
} {
  const definitions: BusinessFlowDefinition[] = [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  let lineNumber = 0;
  for (const line of stripFences(text)) {
    lineNumber += 1;
    const id = FLOW_DEFINITION_RE.exec(line)?.[1];
    if (id === undefined) {
      continue;
    }
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
    definitions.push({ id, line: lineNumber });
  }

  return { definitions, duplicateIds: [...duplicates].sort() };
}

/**
 * `- Flow:` citations in one `02_User-stories.md`, attributed to their story.
 *
 * A line before the first `US-*` heading is skipped rather than attributed to
 * nothing. It is the same rule `- x-qfai-status: planned` follows: a meta line
 * belongs to the block it is written in, and one written above every block
 * would otherwise speak for the whole file.
 */
export function parseStoryFlowRefs(text: string, specId: string, file: string): StoryFlowRef[] {
  const refs: StoryFlowRef[] = [];
  let currentUs: string | undefined;

  let lineNumber = 0;
  for (const line of stripFences(text)) {
    lineNumber += 1;

    const heading = US_HEADING_RE.exec(line)?.[1];
    if (heading !== undefined) {
      currentUs = heading;
      continue;
    }

    const value = STORY_FLOW_LINE_RE.exec(line)?.[1];
    if (value === undefined || currentUs === undefined) {
      continue;
    }
    for (const flowId of new Set(value.match(BF_ID_RE) ?? [])) {
      refs.push({ specId, usId: currentUs, flowId, file, line: lineNumber });
    }
  }

  return refs;
}

/**
 * The document's lines with fenced blocks blanked, keeping the line count.
 *
 * The flow document's whole point is its Mermaid diagram, and a participant
 * named `BF-0001` inside one is a drawing, not a declaration. Blanking rather
 * than dropping keeps every reported line number the one a reader will open.
 */
function stripFences(text: string): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      out.push("");
      continue;
    }
    out.push(inFence ? "" : line);
  }
  return out;
}

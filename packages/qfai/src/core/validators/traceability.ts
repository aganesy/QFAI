import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { extractIds } from "../ids.js";
import { parseScenarioDocument, type ScenarioNode } from "../scenarioModel.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import { collectFilesByGlobs } from "../fs.js";
import {
  collectScTestReferences,
  DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
  normalizeGlobs,
} from "../traceability.js";
import type { Issue } from "../types.js";
import { collectV1421LayerRefs, isV1421LayeredEntry } from "./layerCoverage.js";
import { collectMarkdownItems, collectScenarioItems, issue } from "./utils.js";

const SC_TAG_RE = /^SC-\d{4}-\d{4}$/;
const SC_TAG_RE_GLOBAL = /\bSC-\d{4}-\d{4}\b/g;
const SPEC_TAG_RE = /^SPEC-\d{4}$/;
const US_ID_RE = /\bUS-\d{4}-\d{4}\b/g;
const AC_ID_RE = /\bAC-\d{4}-\d{4}\b/g;
const DOWNSTREAM_ID_RE = /\b(?:US|AC|BR|SC|CASE)-\d{4}-\d{4}\b/g;
/** v1421 accepts both the short and spec-local composite US id forms. */
const V1421_US_ID_RE = /\bUS-\d{4}(?:-\d{4})?\b/g;

type LayeredEdgeData = {
  usIds: Set<string>;
  acIds: Set<string>;
  brIds: Set<string>;
  scIds: Set<string>;
  caseIds: Set<string>;
  acToUs: Map<string, Set<string>>;
  brToAc: Map<string, Set<string>>;
  scToAc: Map<string, Set<string>>;
  caseToSc: Map<string, Set<string>>;
};

export async function validateTraceability(
  root: string,
  config: QfaiConfig,
  options: { includeCodeReferences: boolean },
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredEntries = entries.filter(
    (entry) => entry.layout === "layered" && entry.layeredStyle === "v1416",
  );

  // Diagnose the test-glob configuration for every layout, before the v1416 filter below.
  // A v1417/v1421 project never reaches `validateLayeredScCodeReferences`, so keeping the
  // diagnosis there meant the one class of project that most needs it — a modern layout with
  // `scMustHaveTest: true` and globs matching nothing — got a clean `--fail-on error` run.
  if (options.includeCodeReferences) {
    issues.push(...(await validateTestFileGlobsConfiguration(root, config, entries)));
  }

  if (layeredEntries.length === 0) {
    return issues;
  }

  const policiesDir = layeredEntries[0]?.sharedDir ?? path.join(specsRoot, "_policies");
  const capabilitiesPath = path.join(policiesDir, "03_Capabilities.md");
  const capabilitiesExists = await exists(capabilitiesPath);
  const capabilitiesText = await readSafe(capabilitiesPath);
  const capIds = new Set(extractIds(capabilitiesText, "CAP"));
  const capSpecNumbers = new Set(
    Array.from(capIds)
      .map((capId) => capId.match(/^CAP-(\d{4})$/)?.[1])
      .filter((value): value is string => Boolean(value)),
  );
  const specNumbers = new Set(layeredEntries.map((entry) => entry.specNumber));

  if (!capabilitiesExists) {
    issues.push(
      issue(
        "QFAI-TRACE-100",
        "_policies/03_Capabilities.md が見つかりません。Layered Traceability を検証できません。",
        "error",
        capabilitiesPath,
        "traceability.layered.capabilitiesRequired",
      ),
    );
  } else if (capabilitiesText.trim().length === 0) {
    issues.push(
      issue(
        "QFAI-TRACE-100",
        "_policies/03_Capabilities.md が空です。Layered Traceability を検証できません。",
        "error",
        capabilitiesPath,
        "traceability.layered.capabilitiesRequired",
      ),
    );
  }

  const missingSpecNumbers = Array.from(capSpecNumbers).filter(
    (specNumber) => !specNumbers.has(specNumber),
  );
  if (missingSpecNumbers.length > 0) {
    issues.push(
      issue(
        "QFAI-TRACE-101",
        `CAP に対応する spec ディレクトリがありません: ${missingSpecNumbers
          .map((specNumber) => `CAP-${specNumber} -> spec-${specNumber}`)
          .join(", ")}`,
        "error",
        capabilitiesPath,
        "traceability.layered.capToSpec",
      ),
    );
  }

  const missingCapNumbers = Array.from(specNumbers).filter(
    (specNumber) => !capSpecNumbers.has(specNumber),
  );
  if (missingCapNumbers.length > 0) {
    issues.push(
      issue(
        "QFAI-TRACE-102",
        `spec ディレクトリに対応する CAP が _policies/03_Capabilities.md にありません: ${missingCapNumbers
          .map((specNumber) => `spec-${specNumber} -> CAP-${specNumber}`)
          .join(", ")}`,
        "error",
        specsRoot,
        "traceability.layered.specToCap",
      ),
    );
  }

  issues.push(...(await validatePoliciesLayerDownRef(policiesDir)));

  const allLayeredScIds = new Set<string>();
  for (const entry of layeredEntries) {
    const edgeData = await collectLayeredEdgeData(entry, issues);
    edgeData.scIds.forEach((id) => allLayeredScIds.add(id));
    issues.push(...validateLayeredEdges(entry, edgeData));
    issues.push(...validateLayeredHeuristics(entry, edgeData));
  }

  if (options.includeCodeReferences && allLayeredScIds.size > 0) {
    issues.push(
      ...(await validateLayeredScCodeReferences(root, config, allLayeredScIds, specsRoot)),
    );
  }

  return issues;
}

export type TraceabilityGraphNode = {
  id: string;
  layer: string;
  path?: string;
};

export type TraceabilityGraphEdge = {
  from: string;
  to: string;
  type: string;
};

export type TraceabilityGraph = {
  nodes: TraceabilityGraphNode[];
  edges: TraceabilityGraphEdge[];
};

/**
 * Builds the requirement graph from the parsed spec pack.
 *
 * Exposed so the per-run `traceability.json` artifact can be populated from the specs themselves
 * rather than from the refs of emitted findings. Deriving it from findings inverted the artifact's
 * intent: it was empty precisely when the spec pack was healthy, and populated only with IDs that
 * failed.
 *
 * Every layered style `collectSpecEntries` recognises is walked, because restricting this to the
 * v1416 style `validateTraceability` gates would leave the artifact empty for every spec written
 * in the current v1421 layout. The layer vocabulary differs per style — v1416 links
 * `US -> AC -> BR -> SC -> CASE`, v1417/v1421 link `US -> AC -> BR -> EX -> TC` — so the edge
 * types differ too; the node/edge shape does not.
 *
 * Emits no issues; parse problems are reported by `validateTraceability` and
 * `validateLayerCoverage` on the same inputs.
 */
export async function buildLayeredTraceabilityGraph(
  root: string,
  config: QfaiConfig,
): Promise<TraceabilityGraph> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredEntries = entries.filter((entry) => entry.layout === "layered");

  const builder = createGraphBuilder(root);

  for (const entry of layeredEntries) {
    const scoped = builder.forSpec(entry.specNumber);
    if (isV1421LayeredEntry(entry)) {
      await addV1421Entry(scoped, entry);
      continue;
    }
    if (entry.layeredStyle === "v1417") {
      await addV1417Entry(scoped, entry);
      continue;
    }
    await addV1416Entry(scoped, entry);
  }

  return builder.build();
}

/** Node and edge sink for one spec. Ids are spec-qualified on the way in. */
type SpecScopedBuilder = {
  addNodes: (ids: Iterable<string>, layer: string, filePath: string) => void;
  addEdges: (refs: Map<string, Set<string>>, type: string) => void;
};

type GraphBuilder = {
  forSpec: (specNumber: string) => SpecScopedBuilder;
  build: () => TraceabilityGraph;
};

/** `US-0006-0001` — the spec number is already the first numeric segment. */
const COMPOSITE_ID_RE = /^[A-Za-z]+-\d{4}-\d{4}$/;

/**
 * Make an item ID unique across the pack.
 *
 * Item IDs are file-local (`spec-traceability-rules.md`, "ID and Parent
 * Rules") and the shipped templates start every spec at `US-0001` / `AC-0001`,
 * so two specs using the short form collide. Keying the graph on the raw ID
 * silently dropped the second spec's nodes and overwrote its same-shaped edges,
 * leaving `traceability.json` holding only the first spec's paths.
 *
 * The composite form already carries its spec number, so it is left untouched —
 * qualifying it would rewrite every ID in the packs that actually ship today
 * for no gain.
 */
export function qualifyId(specNumber: string, id: string): string {
  return COMPOSITE_ID_RE.test(id) ? id : `spec-${specNumber}/${id}`;
}

/** `.../.qfai/specs/spec-0003/03_Acceptance-Criteria.md` -> `0003`. */
const SPEC_DIR_IN_PATH_RE = /(?:^|[/\\])spec-(\d{4})(?:[/\\]|$)/;

/**
 * The spec number owning `filePath`, or `null` for a repo-level file.
 *
 * Exported next to {@link qualifyId} because every producer of graph IDs has to
 * namespace them the same way. A finding-derived node built from a raw short ID
 * lands beside — not on — the `spec-NNNN/AC-0001` node the edges point at, and
 * two specs' findings then merge onto the same unqualified node.
 */
export function specNumberForPath(filePath: string | undefined): string | null {
  if (!filePath) {
    return null;
  }
  return SPEC_DIR_IN_PATH_RE.exec(filePath)?.[1] ?? null;
}

function createGraphBuilder(root: string): GraphBuilder {
  const nodes = new Map<string, TraceabilityGraphNode>();
  const edges = new Map<string, TraceabilityGraphEdge>();

  return {
    forSpec: (specNumber) => ({
      addNodes: (ids, layer, filePath) => {
        for (const rawId of ids) {
          const id = qualifyId(specNumber, rawId);
          if (nodes.has(id)) {
            continue;
          }
          nodes.set(id, { id, layer, path: toGraphPath(root, filePath) });
        }
      },
      addEdges: (refs, type) => {
        for (const [rawFrom, parents] of refs.entries()) {
          const from = qualifyId(specNumber, rawFrom);
          for (const rawTo of parents) {
            const to = qualifyId(specNumber, rawTo);
            edges.set(`${from}->${to}:${type}`, { from, to, type });
          }
        }
      },
    }),
    build: () => ({
      nodes: Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id)),
      // `type` is a tie-breaker, not decoration: one `from`/`to` pair can carry
      // two edges — v1417 gives an EX both `EX_TO_BR` and `EX_TO_AC` — and
      // sorting on the pair alone left their order at insertion order, so
      // `traceability.json` diffed against itself between runs.
      edges: Array.from(edges.values()).sort(
        (a, b) =>
          a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.type.localeCompare(b.type),
      ),
    }),
  };
}

/** v1416: markdown tables, `SC`/`CASE` layer names, composite `XX-nnnn-nnnn` IDs. */
async function addV1416Entry(builder: SpecScopedBuilder, entry: SpecEntry): Promise<void> {
  // Parse findings are the business of validateTraceability, which walks the same files.
  const discarded: Issue[] = [];
  const data = await collectLayeredEdgeData(entry, discarded);
  builder.addNodes(data.usIds, "US", entry.userStoriesPath);
  builder.addNodes(data.acIds, "AC", entry.acceptanceCriteriaPath);
  builder.addNodes(data.brIds, "BR", entry.businessRulesPath);
  builder.addNodes(data.scIds, "SC", entry.examplesPath);
  builder.addNodes(data.caseIds, "CASE", entry.testCasesPath);
  builder.addEdges(data.acToUs, "AC_TO_US");
  builder.addEdges(data.brToAc, "BR_TO_AC");
  builder.addEdges(data.scToAc, "SC_TO_AC");
  builder.addEdges(data.caseToSc, "CASE_TO_SC");
}

/**
 * v1421: every layer is a markdown table keyed by its own ID column, with the
 * parents in named reference columns (`AC-Refs`, `BR-Ref`, `EX-Ref`). The layout
 * carries no AC->US column, so no `AC_TO_US` edge is emitted for it; that link
 * is not recorded in the format rather than missing from this walk.
 */
async function addV1421Entry(builder: SpecScopedBuilder, entry: SpecEntry): Promise<void> {
  const refs = await collectV1421LayerRefs(entry);
  const userStoriesText = await readSafe(entry.userStoriesPath);

  // Both the short (`US-0001`) and spec-local composite (`US-0006-0001`) forms are
  // valid v1421 IDs, so the strict composite-only matcher in `../ids.js` would drop
  // half the catalogs. `02_User-stories.md` is a prose catalog, not a table, so the
  // IDs are read directly rather than through a column parser.
  builder.addNodes(userStoriesText.match(V1421_US_ID_RE) ?? [], "US", entry.userStoriesPath);
  builder.addNodes(refs.acIds, "AC", entry.acceptanceCriteriaPath);
  builder.addNodes(refs.brToAcRefs.keys(), "BR", entry.businessRulesPath);
  builder.addNodes(refs.exToBrRefs.keys(), "EX", entry.examplesPath);
  builder.addNodes(refs.tcToExRefs.keys(), "TC", entry.testCasesPath);
  builder.addNodes(refs.tcToAcRefs.keys(), "TC", entry.testCasesPath);
  builder.addEdges(refs.brToAcRefs, "BR_TO_AC");
  builder.addEdges(refs.exToBrRefs, "EX_TO_BR");
  builder.addEdges(refs.tcToAcRefs, "TC_TO_AC");
  builder.addEdges(refs.tcToExRefs, "TC_TO_EX");
}

/**
 * v1417: `## XX-nnnn` headings with a `- Parent: YY-nnnn` line, and a gherkin
 * `05_Examples.feature` whose `@EX-nnnn` tags carry the same parent comment.
 */
async function addV1417Entry(builder: SpecScopedBuilder, entry: SpecEntry): Promise<void> {
  const [usText, acText, brText, exText, tcText] = await Promise.all([
    readSafe(entry.userStoriesPath),
    readSafe(entry.acceptanceCriteriaPath),
    readSafe(entry.businessRulesPath),
    readSafe(entry.examplesPath),
    readSafe(entry.testCasesPath),
  ]);

  const usItems = collectMarkdownItems(usText, "US");
  const acItems = collectMarkdownItems(acText, "AC");
  const brItems = collectMarkdownItems(brText, "BR");
  const tcItems = collectMarkdownItems(tcText, "TC");
  const exItems = collectScenarioItems(exText);

  builder.addNodes(
    usItems.map((item) => item.id),
    "US",
    entry.userStoriesPath,
  );
  builder.addNodes(
    acItems.map((item) => item.id),
    "AC",
    entry.acceptanceCriteriaPath,
  );
  builder.addNodes(
    brItems.map((item) => item.id),
    "BR",
    entry.businessRulesPath,
  );
  builder.addNodes(
    exItems.map((item) => item.exId.replace(/^@/, "")),
    "EX",
    entry.examplesPath,
  );
  builder.addNodes(
    tcItems.map((item) => item.id),
    "TC",
    entry.testCasesPath,
  );

  builder.addEdges(toParentRefs(acItems.map((item) => [item.id, item.parent])), "AC_TO_US");
  builder.addEdges(toParentRefs(brItems.map((item) => [item.id, item.parent])), "BR_TO_AC");
  // `validateExamplesParentFormat` accepts `BR-XXXX` **or** `AC-XXXX` as an
  // EX parent, so tagging every EX edge `EX_TO_BR` left edges whose `to` is an
  // AC node claiming a BR target — a hierarchy any consumer of `type` reads
  // wrong. Split by the parent's own layer; a parent of neither shape is
  // already an error from that validator and contributes no edge.
  const exParents: Array<[string, string | null]> = exItems.map((item) => [
    item.exId.replace(/^@/, ""),
    item.parent,
  ]);
  builder.addEdges(
    toParentRefs(exParents.filter(([, parent]) => isLayerId(parent, "BR"))),
    "EX_TO_BR",
  );
  builder.addEdges(
    toParentRefs(exParents.filter(([, parent]) => isLayerId(parent, "AC"))),
    "EX_TO_AC",
  );
  builder.addEdges(toParentRefs(tcItems.map((item) => [item.id, item.parent])), "TC_TO_EX");
}

/** True when `id` is a `<layer>-NNNN` / `<layer>-NNNN-NNNN` ID of that layer. */
function isLayerId(id: string | null, layer: string): boolean {
  return id !== null && new RegExp(`^${layer}-\\d{4}(?:-\\d{4})?$`, "i").test(id);
}

/** Collapses `[childId, parentId | null]` pairs into the ref-map shape `addEdges` takes. */
function toParentRefs(pairs: Array<[string, string | null]>): Map<string, Set<string>> {
  const refs = new Map<string, Set<string>>();
  for (const [child, parent] of pairs) {
    if (!parent) {
      continue;
    }
    const existing = refs.get(child) ?? new Set<string>();
    existing.add(parent);
    refs.set(child, existing);
  }
  return refs;
}

function toGraphPath(root: string, filePath: string): string {
  return path.relative(root, filePath).split(path.sep).join("/");
}

async function validatePoliciesLayerDownRef(policiesDir: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const targets = [
    "01_Objective.md",
    "02_Initiative.md",
    "03_Capabilities.md",
    "04_Business-flow.md",
  ];

  for (const fileName of targets) {
    const targetPath = path.join(policiesDir, fileName);
    const text = await readSafe(targetPath);
    if (text.length === 0) {
      continue;
    }
    const downstreamIds = extractMatches(text, DOWNSTREAM_ID_RE);
    if (downstreamIds.length === 0) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-TRACE-103",
        `${fileName} で下位 ID の参照は禁止です: ${downstreamIds.join(", ")}`,
        "error",
        targetPath,
        "traceability.layered.downRefForbidden",
        downstreamIds,
      ),
    );
  }

  return issues;
}

async function collectLayeredEdgeData(entry: SpecEntry, issues: Issue[]): Promise<LayeredEdgeData> {
  const userStoriesText = await readSafe(entry.userStoriesPath);
  const acceptanceCriteriaText = await readSafe(entry.acceptanceCriteriaPath);
  const businessRulesText = await readSafe(entry.businessRulesPath);
  const examplesText = await readSafe(entry.examplesPath);
  const testCasesText = await readSafe(entry.testCasesPath);

  const usIds = extractTableDefinitionIds(userStoriesText, /^US-\d{4}-\d{4}$/);
  const { definitions: acIds, refsByDefinition: acToUs } = extractTableDefinitionRefs(
    acceptanceCriteriaText,
    /^AC-\d{4}-\d{4}$/,
    US_ID_RE,
  );
  const { definitions: brIds, refsByDefinition: brToAc } = extractTableDefinitionRefs(
    businessRulesText,
    /^BR-\d{4}-\d{4}$/,
    AC_ID_RE,
  );
  const { scIds, scToAc } = parseScenarioRefs(entry, examplesText, issues);
  const { definitions: caseIds, refsByDefinition: caseToSc } = extractTableDefinitionRefs(
    testCasesText,
    /^CASE-\d{4}-\d{4}$/,
    SC_TAG_RE_GLOBAL,
  );

  return {
    usIds,
    acIds,
    brIds,
    scIds,
    caseIds,
    acToUs,
    brToAc,
    scToAc,
    caseToSc,
  };
}

function validateLayeredEdges(entry: SpecEntry, data: LayeredEdgeData): Issue[] {
  const issues: Issue[] = [];
  const { usIds, acIds, brIds, scIds, caseIds, acToUs, brToAc, scToAc, caseToSc } = data;

  for (const usId of usIds) {
    const linked = Array.from(acToUs.values()).some((refs) => refs.has(usId));
    if (!linked) {
      issues.push(
        issue(
          "QFAI-TRACE-104",
          `US に対応する AC がありません: ${usId}`,
          "error",
          entry.acceptanceCriteriaPath,
          "traceability.layered.usToAc",
          [usId],
        ),
      );
    }
  }

  for (const acId of acIds) {
    const parents = acToUs.get(acId) ?? new Set<string>();
    if (parents.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-105",
          `AC が親 US を参照していません: ${acId}`,
          "error",
          entry.acceptanceCriteriaPath,
          "traceability.layered.acToUs",
          [acId],
        ),
      );
      continue;
    }
    const unknownUs = Array.from(parents).filter((id) => !usIds.has(id));
    if (unknownUs.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-106",
          `AC が未定義の US を参照しています: ${acId} -> ${unknownUs.join(", ")}`,
          "error",
          entry.acceptanceCriteriaPath,
          "traceability.layered.acParentExists",
          [acId, ...unknownUs],
        ),
      );
    }
  }

  for (const acId of acIds) {
    const linked = Array.from(brToAc.values()).some((refs) => refs.has(acId));
    if (!linked) {
      issues.push(
        issue(
          "QFAI-TRACE-107",
          `AC に対応する BR がありません: ${acId}`,
          "error",
          entry.businessRulesPath,
          "traceability.layered.acToBr",
          [acId],
        ),
      );
    }
  }

  for (const brId of brIds) {
    const refs = brToAc.get(brId) ?? new Set<string>();
    if (refs.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-108",
          `BR が AC を参照していません: ${brId}`,
          "error",
          entry.businessRulesPath,
          "traceability.layered.brToAc",
          [brId],
        ),
      );
      continue;
    }
    const unknownAc = Array.from(refs).filter((id) => !acIds.has(id));
    if (unknownAc.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-109",
          `BR が未定義の AC を参照しています: ${brId} -> ${unknownAc.join(", ")}`,
          "error",
          entry.businessRulesPath,
          "traceability.layered.brParentExists",
          [brId, ...unknownAc],
        ),
      );
    }
  }

  for (const scId of scIds) {
    const refs = scToAc.get(scId) ?? new Set<string>();
    if (refs.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-110",
          `SC が AC を参照していません: ${scId}`,
          "error",
          entry.examplesPath,
          "traceability.layered.scToAc",
          [scId],
        ),
      );
      continue;
    }
    const unknownAc = Array.from(refs).filter((id) => !acIds.has(id));
    if (unknownAc.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-111",
          `SC が未定義の AC を参照しています: ${scId} -> ${unknownAc.join(", ")}`,
          "error",
          entry.examplesPath,
          "traceability.layered.scParentExists",
          [scId, ...unknownAc],
        ),
      );
    }
  }

  for (const acId of acIds) {
    const linked = Array.from(scToAc.values()).some((refs) => refs.has(acId));
    if (!linked) {
      issues.push(
        issue(
          "QFAI-TRACE-112",
          `AC に対応する SC がありません: ${acId}`,
          "error",
          entry.examplesPath,
          "traceability.layered.acToSc",
          [acId],
        ),
      );
    }
  }

  for (const caseId of caseIds) {
    const refs = caseToSc.get(caseId) ?? new Set<string>();
    if (refs.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-113",
          `CASE が SC を参照していません: ${caseId}`,
          "error",
          entry.testCasesPath,
          "traceability.layered.caseToSc",
          [caseId],
        ),
      );
      continue;
    }
    const unknownSc = Array.from(refs).filter((id) => !scIds.has(id));
    if (unknownSc.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-114",
          `CASE が未定義の SC を参照しています: ${caseId} -> ${unknownSc.join(", ")}`,
          "error",
          entry.testCasesPath,
          "traceability.layered.caseParentExists",
          [caseId, ...unknownSc],
        ),
      );
    }
  }

  return issues;
}

function validateLayeredHeuristics(entry: SpecEntry, data: LayeredEdgeData): Issue[] {
  const issues: Issue[] = [];

  if (data.brIds.size < data.acIds.size) {
    issues.push(
      issue(
        "QFAI-TRACE-115",
        `BR 件数が AC 件数より少ないため仕様が薄い可能性があります (BR=${data.brIds.size}, AC=${data.acIds.size})`,
        "warning",
        entry.businessRulesPath,
        "traceability.layered.brCoverageHeuristic",
      ),
    );
  }

  if (data.scIds.size < data.brIds.size) {
    issues.push(
      issue(
        "QFAI-TRACE-116",
        `SC 件数が BR 件数より少ないため具体例が不足している可能性があります (SC=${data.scIds.size}, BR=${data.brIds.size})`,
        "warning",
        entry.examplesPath,
        "traceability.layered.scCoverageHeuristic",
      ),
    );
  }

  return issues;
}

/**
 * Reports `validation.traceability.testFileGlobs` that cannot do their job.
 *
 * This is a configuration diagnosis, not a coverage finding, so it is layout-independent: it
 * runs for v1416, v1417 and v1421 spec packs alike. Two states are reported under
 * `scMustHaveTest: true`, because in both of them the SC→test gate is on but inert:
 *
 * - unset (`[]`) — nothing is scanned at all. Reported as a `warning`: the project may simply
 *   not have configured QFAI yet, and a fresh `qfai init` ships this value empty on purpose.
 * - configured but matching zero files — the operator believes the gate is running. Reported as
 *   an `error`, so an otherwise clean `--fail-on error` run cannot absorb it.
 *
 * Silent when `scMustHaveTest` is off (the gate is deliberately disabled) or when the project
 * has no spec pack at all (nothing to trace yet).
 */
/** Message half of a caught scan error, without leaking a stack trace into a finding. */
function formatScanError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function validateTestFileGlobsConfiguration(
  root: string,
  config: QfaiConfig,
  entries: SpecEntry[],
): Promise<Issue[]> {
  if (!config.validation.traceability.scMustHaveTest || entries.length === 0) {
    return [];
  }

  // Normalize before the emptiness test, and scan with the same array. Testing
  // the raw array made `["  "]` a "0 files matched" error: `normalizeGlobs`
  // drops blank entries, so the scan ran with nothing and the gate was in fact
  // unset. The two must agree on what "unset" means.
  const globs = normalizeGlobs(config.validation.traceability.testFileGlobs);
  const configPath = path.join(root, "qfai.config.yaml");
  const fix =
    "/qfai-configure を実行し、validation.traceability.testFileGlobs を実際のテストパスに合わせて設定してください。";

  if (globs.length === 0) {
    return [
      issue(
        "QFAI-TRACE-124",
        "validation.traceability.testFileGlobs が未設定のため、scMustHaveTest: true でも SC のコード参照は一切検査されていません。" +
          "リポジトリの実テストレイアウトに合わせて設定してください (/qfai-configure)。",
        "warning",
        configPath,
        "traceability.layered.testFileGlobsUnset",
        undefined,
        "canonical",
        fix,
      ),
    ];
  }

  let scan: Awaited<ReturnType<typeof collectFilesByGlobs>>;
  try {
    scan = await collectFilesByGlobs(root, {
      globs,
      ignore: Array.from(
        new Set([
          ...DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
          ...normalizeGlobs(config.validation.traceability.testFileExcludeGlobs),
        ]),
      ),
      // This check only asks "did anything match at all", so it stops at the
      // first hit rather than walking the whole tree a second time — the real
      // scan already happens in `collectScTestReferences` /
      // `validateLayeredScCodeReferences`. At DEFAULT_GLOB_FILE_LIMIT this
      // duplicated the full traversal on every `validate` run.
      limit: 1,
    });
  } catch (error) {
    // A scan that throws — an invalid pattern (`["\0"]` is valid YAML but makes
    // fast-glob throw) or a filesystem error — means the gate could not run at
    // all. Swallowing it returned "no finding", which reads as "configuration
    // fine" and let `--fail-on error` pass over a gate that never executed.
    // `doctor.ts` already reports this class as `error`; validate now agrees.
    return [
      issue(
        "QFAI-TRACE-124",
        `validation.traceability.testFileGlobs の走査に失敗しました ` +
          `(globs: ${globs.join(", ")}): ${formatScanError(error)}。` +
          `パターンが不正か、ファイルシステムエラーです。SC のコード参照検査は実行されていません。`,
        "error",
        configPath,
        "traceability.layered.testFileGlobsScanFailed",
        globs,
        "canonical",
        fix,
      ),
    ];
  }

  if (scan.files.length > 0) {
    return [];
  }

  return [
    issue(
      "QFAI-TRACE-124",
      `validation.traceability.testFileGlobs が 1 ファイルにも一致しませんでした ` +
        `(globs: ${globs.join(", ")})。設定が実際のテストレイアウトと一致していないため、` +
        `SC のコード参照検査 (QFAI-TRACE-117) はすべて未参照として報告されます。` +
        `/qfai-configure で調整してください。`,
      "error",
      configPath,
      "traceability.layered.testFileGlobsNoMatch",
      globs,
      "canonical",
      fix,
    ),
  ];
}

async function validateLayeredScCodeReferences(
  root: string,
  config: QfaiConfig,
  scIds: Set<string>,
  specsRoot: string,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const globs = config.validation.traceability.testFileGlobs;

  // Unset globs are diagnosed by `validateTestFileGlobsConfiguration`, which runs for every
  // spec layout. Nothing left to check here.
  if (globs.length === 0) {
    return issues;
  }

  const refsResult = await collectScTestReferences(
    root,
    globs,
    config.validation.traceability.testFileExcludeGlobs,
  );
  const refs = refsResult.refs;

  const missing = Array.from(scIds).filter((id) => !refs.has(id));
  if (missing.length > 0) {
    issues.push(
      issue(
        "QFAI-TRACE-117",
        `SC がコード/テスト注釈（QFAI:SC-...）から参照されていません: ${missing.join(", ")}`,
        "warning",
        specsRoot,
        "traceability.layered.scCodeReference",
        missing,
      ),
    );
  }

  return issues;
}

function parseScenarioRefs(
  entry: SpecEntry,
  text: string,
  issues: Issue[],
): { scIds: Set<string>; scToAc: Map<string, Set<string>> } {
  const scIds = new Set<string>();
  const scToAc = new Map<string, Set<string>>();
  const { document, errors } = parseScenarioDocument(text, entry.examplesPath);
  if (!document || errors.length > 0) {
    for (const errorMessage of errors) {
      issues.push(
        issue(
          "QFAI-TRACE-118",
          `Examples の Gherkin 解析に失敗しました: ${errorMessage}`,
          "error",
          entry.examplesPath,
          "traceability.layered.examplesParse",
        ),
      );
    }
    return { scIds, scToAc };
  }

  const featureSpecTags = new Set<string>();
  for (const scenario of document.scenarios) {
    scenario.tags
      .filter((tag) => SPEC_TAG_RE.test(tag))
      .forEach((tag) => {
        featureSpecTags.add(tag);
      });
  }
  const expectedSpecTag = `SPEC-${entry.specNumber}`;
  if (featureSpecTags.size !== 1 || !featureSpecTags.has(expectedSpecTag)) {
    issues.push(
      issue(
        "QFAI-TRACE-119",
        `04_Examples.feature の @SPEC タグは ${expectedSpecTag} を1件だけ指定してください。検出: ${
          Array.from(featureSpecTags).join(", ") || "(none)"
        }`,
        "error",
        entry.examplesPath,
        "traceability.layered.specTagSingle",
      ),
    );
  }

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const spans = buildScenarioSpans(document.scenarios, lines.length);
  for (const span of spans) {
    const scenario = span.scenario;
    const specTags = scenario.tags.filter((tag) => SPEC_TAG_RE.test(tag));
    const scTags = scenario.tags.filter((tag) => SC_TAG_RE.test(tag));
    if (specTags.length !== 1 || specTags[0] !== expectedSpecTag) {
      issues.push(
        issue(
          "QFAI-TRACE-120",
          `Scenario の @SPEC タグが不正です: ${scenario.name} (${specTags.join(", ") || "(none)"})`,
          "error",
          entry.examplesPath,
          "traceability.layered.scenarioSpecTag",
        ),
      );
    }
    if (scTags.length !== 1) {
      issues.push(
        issue(
          "QFAI-TRACE-121",
          `Scenario は @SC-XXXX-YYYY を1件だけ持つ必要があります: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "traceability.layered.scenarioScTag",
        ),
      );
      continue;
    }
    const scId = scTags[0];
    if (!scId) {
      continue;
    }
    if (!scId.startsWith(`SC-${entry.specNumber}-`)) {
      issues.push(
        issue(
          "QFAI-TRACE-122",
          `Scenario の SC ID namespace が spec 番号と一致しません: ${scId} (expected: SC-${entry.specNumber}-****)`,
          "error",
          entry.examplesPath,
          "traceability.layered.scNamespace",
          [scId],
        ),
      );
    }
    scIds.add(scId);

    const block = lines.slice(span.start, span.end).join("\n");
    const acRefs = new Set(extractMatches(block, AC_ID_RE));
    if (acRefs.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-123",
          `Scenario が AC を参照していません。コメントで AC を明示してください: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "traceability.layered.scenarioAcReference",
          [scId],
        ),
      );
      continue;
    }
    scToAc.set(scId, acRefs);
  }

  return { scIds, scToAc };
}

function buildScenarioSpans(
  scenarios: ScenarioNode[],
  lineCount: number,
): Array<{ scenario: ScenarioNode; start: number; end: number }> {
  const enriched = scenarios.map((scenario, index) => ({
    scenario,
    index,
    line: scenario.line ?? index + 1,
  }));
  enriched.sort((a, b) => a.line - b.line);
  const spans: Array<{ scenario: ScenarioNode; start: number; end: number }> = [];
  for (let index = 0; index < enriched.length; index += 1) {
    const current = enriched[index];
    const next = enriched[index + 1];
    const start = Math.max((current?.line ?? 1) - 1, 0);
    const end = Math.max(next ? next.line - 1 : lineCount, start + 1);
    if (!current) {
      continue;
    }
    spans.push({
      scenario: current.scenario,
      start,
      end,
    });
  }
  return spans;
}

function extractTableDefinitionIds(text: string, idRe: RegExp): Set<string> {
  const set = new Set<string>();
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const firstCell = extractFirstTableCell(line);
    if (!firstCell || !idRe.test(firstCell)) {
      continue;
    }
    set.add(firstCell);
  }
  return set;
}

function extractTableDefinitionRefs(
  text: string,
  definitionRe: RegExp,
  refRe: RegExp,
): { definitions: Set<string>; refsByDefinition: Map<string, Set<string>> } {
  const definitions = new Set<string>();
  const refsByDefinition = new Map<string, Set<string>>();
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const firstCell = extractFirstTableCell(line);
    if (!firstCell || !definitionRe.test(firstCell)) {
      continue;
    }
    definitions.add(firstCell);
    const refs = new Set(extractMatches(line, refRe));
    refsByDefinition.set(firstCell, refs);
  }
  return { definitions, refsByDefinition };
}

function extractFirstTableCell(line: string): string | null {
  if (!line.trim().startsWith("|")) {
    return null;
  }
  const match = /^\s*\|\s*([^|]+?)\s*\|/.exec(line);
  if (!match?.[1]) {
    return null;
  }
  return match[1].trim();
}

function extractMatches(text: string, re: RegExp): string[] {
  const values: string[] = [];
  for (const match of text.matchAll(cloneGlobal(re))) {
    const value = match[0];
    if (value) {
      values.push(normalizeScAnnotation(value));
    }
  }
  return Array.from(new Set(values));
}

function normalizeScAnnotation(value: string): string {
  const annotationMatch = /\bQFAI:SC-(\d{4}-\d{4})\b/.exec(value);
  if (!annotationMatch?.[1]) {
    return value;
  }
  return `SC-${annotationMatch[1]}`;
}

function cloneGlobal(re: RegExp): RegExp {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return new RegExp(re.source, flags);
}

async function readSafe(target: string): Promise<string> {
  try {
    return await readFile(target, "utf-8");
  } catch {
    return "";
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

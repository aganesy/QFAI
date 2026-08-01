import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { extractDeclaredContractIds } from "./contractsDecl.js";
import { collectApiContractFiles } from "./discovery.js";
import {
  collectFilesByGlobs,
  DEFAULT_GLOB_FILE_LIMIT,
  type CollectFilesByGlobsResult,
} from "./fs.js";
import { collectSpecEntries } from "./specLayout.js";
import { resolveSurfaceUnion } from "./prototyping/specResolution.js";
import { parseAllMarkdownTables } from "./specPackParsers.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "./traceability.js";
import { collectMarkdownItems, uniqueMatches } from "./validators/utils.js";

const US_TEST_ANNOTATION_RE = /\bQFAI:SPEC-(\d{4}):US-(\d{4}(?:-\d{4})?)\b/g;
const TC_TEST_ANNOTATION_RE = /\bQFAI:SPEC-(\d{4}):TC-(\d{4}(?:-\d{4})?)\b/g;
const API_TEST_ANNOTATION_RE = /\bQFAI:CON-API-(\d+)\b/g;

const US_ID_RE = /^US-\d{4}(?:-\d{4})?$/;
const TC_ID_RE = /^TC-\d{4}(?:-\d{4})?$/;
/** Heading form of a test case, e.g. `## TC-0001-0002: title`. */
const TC_HEADING_RE = /^##\s+(TC-\d{4}(?:-\d{4})?)(?:\s*[:：]\s*.*)?$/;
/** `- Level: L4` meta line inside a heading-form test case block. */
const LEVEL_META_LINE_RE = /^[-*]\s+Level\s*[:：]\s*(.+?)\s*$/i;
/** Parses a `SPEC-0001:TC-0002` ref produced by `formatTcRef`. */
const MISSING_TC_REF_RE = /^SPEC-(\d{4}):TC-(\d{4}(?:-\d{4})?)$/;
const API_CONTRACT_ID_RE = /^CON-API-\d+$/;
/**
 * Extension set used when the project declares no
 * `validation.traceability.testFileGlobs`. It is a fallback, not the rule: its
 * code extensions are all JavaScript/TypeScript, so a Python / Go / Java /
 * Ruby / Rust repository matched none of its executable test files under it.
 * (`feature` / `md` / `markdown` still match, but those are annotation
 * carriers, not test code — a repo with no Gherkin or markdown ledger matches
 * nothing at all.) `QFAI-ATDD-111/112/113` therefore reported obligations as
 * uncovered no matter how many correctly annotated tests existed.
 */
const DEFAULT_TEST_FILE_GLOB = "**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,feature,md,markdown}";

export type AtddTestKind = "e2e" | "api" | "integration";

export type AtddUnknownRefKind = "us" | "tc" | "conApi";

export type AtddUnknownRef = {
  file: string;
  token: string;
  kind: AtddUnknownRefKind;
};

export type AtddForbiddenRef = {
  file: string;
  ids: string[];
};

export type AtddSpecRefs = Map<string, Map<string, Set<string>>>;

export type AtddTraceabilityScan = {
  globs: string[];
  matchedFileCount: number;
  truncated: boolean;
  limit: number;
};

export type AtddTraceabilityMissing = {
  us: string[];
  tc: string[];
  conApi: string[];
};

export type AtddCodeTraceabilityResult = {
  specsRoot: string;
  contractsApiRoot: string;
  specUsIds: Map<string, Set<string>>;
  specTcIds: Map<string, Set<string>>;
  /**
   * Every declared `CON-API-*`, active and deferred alike. This is the public
   * meaning the field has always had — adding `x-qfai-status: planned` defers
   * the test obligation, it does not un-declare the contract, so an external
   * consumer using this set for "is this ID declared?" must keep seeing it.
   */
  apiContractIds: Set<string>;
  /** The subset that carries the `QFAI-ATDD-113` obligation. */
  activeApiContractIds: Set<string>;
  /**
   * `CON-API-*` IDs excluded from the `QFAI-ATDD-113` obligation because their
   * contract declares `x-qfai-status: planned`. Reported as `info` so the
   * deferral stays visible instead of silently shrinking the gate.
   */
  deferredApiContractIds: Set<string>;
  refs: {
    us: AtddSpecRefs;
    tc: AtddSpecRefs;
    api: Map<string, Set<string>>;
  };
  unknown: AtddUnknownRef[];
  forbidden: {
    tcInApi: AtddForbiddenRef[];
    tcInE2e: AtddForbiddenRef[];
    /** TC annotated under integration although its declared Level routes elsewhere. */
    tcInIntegration: AtddForbiddenRef[];
  };
  missing: AtddTraceabilityMissing;
  /**
   * Formatted missing TC ref -> the test kind its declared `Level` routes to.
   * Lets the CLI phrase `QFAI-ATDD-112` (message, `suggested_action`, report)
   * per declared layer instead of naming `tests/integration/**` for every TC.
   */
  missingTcHomes: Map<string, AtddTestKind>;
  scan: AtddTraceabilityScan;
};

/** Test directory each `AtddTestKind` owns, for user-facing messages. */
export const ATDD_TEST_KIND_DIRS: Record<AtddTestKind, string> = {
  integration: "tests/integration/**",
  api: "tests/api/**",
  e2e: "tests/e2e/**",
};

/**
 * The same map rendered against the project's configured `paths.testsDir`.
 *
 * The scan already follows `testsDir`, so a project that renamed it to e.g.
 * `spec-tests` would otherwise be told by `QFAI-ATDD-112` to annotate
 * `tests/api/**` — a directory the scan never reads, leaving the finding
 * unclearable. A root-level layout (`testsDir: "."`) is the same trap in the
 * other direction: the scan reads `api/**` at the repository root, so the
 * `tests/` segment must be dropped rather than kept.
 * {@link ATDD_TEST_KIND_DIRS} stays as the default-shaped fallback for callers
 * with no config in hand.
 */
export function atddTestKindDirs(testsDirRelative: string): Record<AtddTestKind, string> {
  const base = toPosixPath(testsDirRelative).replace(/\/+$/, "");
  if (base === "tests") {
    return ATDD_TEST_KIND_DIRS;
  }
  const prefix = base.length === 0 || base === "." ? "" : `${base}/`;
  return {
    integration: `${prefix}integration/**`,
    api: `${prefix}api/**`,
    e2e: `${prefix}e2e/**`,
  };
}

export async function evaluateAtddCodeTraceability(
  root: string,
  config: QfaiConfig,
): Promise<AtddCodeTraceabilityResult> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const contractsApiRoot = path.join(contractsRoot, "api");

  const [specRefs, collectedApiContracts] = await Promise.all([
    collectSpecRefs(specsRoot),
    collectApiContractIds(contractsApiRoot),
  ]);
  // `active` drives the missing-coverage gate; `declared` (active ∪ deferred)
  // drives the "is this ID known?" check.
  const activeApiContractIds = collectedApiContracts.active;
  const deferredApiContractIds = collectedApiContracts.deferred;
  const declaredApiContractIds = new Set([...activeApiContractIds, ...deferredApiContractIds]);

  // `QFAI-ATDD-111` (US -> tests/e2e/**) is scoped by surface type, reusing the
  // resolution `/qfai-prototyping` already performs. A spec that declares no
  // user-facing surface owes no E2E reference — enforcing it there is the
  // "convert all obligations into E2E" anti-pattern `test-layers.md` forbids.
  //
  // Scoping applies ONLY when the project actually uses surface typing (at
  // least one spec declares a UI-bearing surface). A project that has never
  // declared a surface has not opted in, so the obligation is unchanged for it
  // rather than silently disappearing.
  const uiBearingSpecs = await resolveUiBearingScope(root, config);

  const testsRoot = resolvePath(root, config, "testsDir");
  const e2eRoot = path.join(testsRoot, "e2e");
  const apiRoot = path.join(testsRoot, "api");
  const integrationRoot = path.join(testsRoot, "integration");

  const scanGlobs = buildAtddTestGlobs(
    root,
    testsRoot,
    deriveAtddFilePattern(config.validation.traceability.testFileGlobs),
  );
  const scanResult = await collectTestFiles(root, scanGlobs);

  const usRefs: AtddSpecRefs = new Map<string, Map<string, Set<string>>>();
  const tcRefs: AtddSpecRefs = new Map<string, Map<string, Set<string>>>();
  const apiRefs = new Map<string, Set<string>>();

  const unknown: AtddUnknownRef[] = [];
  const unknownDedup = new Set<string>();

  const forbiddenTcInApi = new Map<string, Set<string>>();
  const forbiddenTcInE2e = new Map<string, Set<string>>();
  const forbiddenTcInIntegration = new Map<string, Set<string>>();

  const specUsIds = specRefs.us;
  const specTcIds = specRefs.tc;
  const tcLevels = specRefs.tcLevels;

  for (const file of scanResult.files) {
    const kind = resolveTestKind(file, {
      e2eRoot,
      apiRoot,
      integrationRoot,
    });
    if (!kind) {
      continue;
    }

    const text = await readSafe(file);
    const usAnnotations = extractSpecScopedAnnotations(text, US_TEST_ANNOTATION_RE);
    const tcAnnotations = extractSpecScopedAnnotations(text, TC_TEST_ANNOTATION_RE);
    const apiAnnotations = extractApiContractAnnotations(text);

    for (const ref of usAnnotations) {
      const token = formatUsToken(ref.spec, ref.id);
      const known = hasSpecId(specUsIds, ref.spec, `US-${ref.id}`);
      if (!known) {
        pushUnknown(unknown, unknownDedup, file, token, "us");
        continue;
      }
      if (kind === "e2e") {
        recordSpecRef(usRefs, ref.spec, `US-${ref.id}`, file);
      }
    }

    for (const ref of tcAnnotations) {
      const token = formatTcToken(ref.spec, ref.id);
      const known = hasSpecId(specTcIds, ref.spec, `TC-${ref.id}`);
      if (!known) {
        pushUnknown(unknown, unknownDedup, file, token, "tc");
      }
      const homeKind = resolveTcHomeKind(tcLevels, ref.spec, `TC-${ref.id}`);
      if (kind === homeKind && known) {
        recordSpecRef(tcRefs, ref.spec, `TC-${ref.id}`, file);
      }
      // Only flag a placement that is NOT the TC's declared home. Reporting an
      // annotation as forbidden while also declining to count it produced two
      // errors from one correct action.
      if (kind === "api" && homeKind !== "api") {
        recordForbidden(forbiddenTcInApi, file, formatTcRef(ref.spec, ref.id));
      }
      if (kind === "e2e" && homeKind !== "e2e") {
        recordForbidden(forbiddenTcInE2e, file, formatTcRef(ref.spec, ref.id));
      }
      // Symmetry: a TC whose declared home is api/e2e is equally misplaced when
      // it is (still) annotated under integration. Without this, a migration
      // that added the correct `tests/api/**` annotation and left the old
      // `tests/integration/**` one behind validated clean, contradicting the
      // shipped rule that a TC annotation belongs to exactly one directory.
      if (kind === "integration" && homeKind !== "integration") {
        recordForbidden(forbiddenTcInIntegration, file, formatTcRef(ref.spec, ref.id));
      }
    }

    for (const contractId of apiAnnotations) {
      // Declared = active ∪ deferred. `x-qfai-status: planned` defers the
      // API-test *obligation*; it does not un-declare the contract, so writing
      // the test ahead of the slice must not become a `QFAI-ATDD-103` unknown
      // reference.
      const known = declaredApiContractIds.has(contractId);
      if (!known) {
        pushUnknown(unknown, unknownDedup, file, `QFAI:${contractId}`, "conApi");
        continue;
      }
      if (kind === "api") {
        recordApiRef(apiRefs, contractId, file);
      }
    }
  }

  const missing = buildMissingRefs({
    specUsIds,
    usObligationScope: uiBearingSpecs,
    specTcIds,
    apiContractIds: activeApiContractIds,
    usRefs,
    tcRefs,
    apiRefs,
  });
  const missingTcHomes = buildMissingTcHomes(missing.tc, tcLevels);

  return {
    specsRoot,
    contractsApiRoot,
    specUsIds,
    specTcIds,
    apiContractIds: declaredApiContractIds,
    activeApiContractIds,
    deferredApiContractIds,
    refs: {
      us: usRefs,
      tc: tcRefs,
      api: apiRefs,
    },
    unknown: unknown.sort(compareUnknownRef),
    forbidden: {
      tcInApi: toForbiddenList(forbiddenTcInApi),
      tcInE2e: toForbiddenList(forbiddenTcInE2e),
      tcInIntegration: toForbiddenList(forbiddenTcInIntegration),
    },
    missing,
    missingTcHomes,
    scan: {
      globs: scanGlobs,
      matchedFileCount: scanResult.matchedFileCount,
      truncated: scanResult.truncated,
      limit: scanResult.limit,
    },
  };
}

type SpecScopedRef = {
  spec: string;
  id: string;
};

async function collectSpecRefs(specsRoot: string): Promise<{
  us: Map<string, Set<string>>;
  tc: Map<string, Set<string>>;
  /** `spec -> TC-ID -> declared Level`, lower-cased. Absent when no Level column. */
  tcLevels: Map<string, Map<string, string>>;
}> {
  const entries = await collectSpecEntries(specsRoot);
  const us = new Map<string, Set<string>>();
  const tc = new Map<string, Set<string>>();
  const tcLevels = new Map<string, Map<string, string>>();

  for (const entry of entries) {
    const [usText, tcText] = await Promise.all([
      readSafe(entry.userStoriesPath),
      readSafe(entry.testCasesPath),
    ]);

    const usIds = collectShortIds(usText, "US");
    const tcIds = collectShortIds(tcText, "TC");

    if (usIds.size > 0) {
      us.set(entry.specNumber, usIds);
    }
    if (tcIds.size > 0) {
      tc.set(entry.specNumber, tcIds);
    }

    const levels = collectTcLevels(tcText);
    if (levels.size > 0) {
      tcLevels.set(entry.specNumber, levels);
    }
  }

  return { us, tc, tcLevels };
}

/**
 * Reads the declared `Level` of every TC in `06_Test-Cases.md` so the TC
 * obligation can be routed by declared layer instead of being hard-pinned to
 * `tests/integration/**`.
 *
 * Both shipped shapes are read, matching `parseTestCases` in
 * `core/atdd/scaffold.ts`: the heading form (`## TC-NNNN` plus `- Level: L4`
 * meta lines) and the table form. Heading form wins on duplicates; within the
 * table form the first declaration wins. Every `TC-ID` table is scanned, not
 * just the first — a spec may split its catalogue across several tables, and
 * only scanning the first silently dropped the later tables' layers.
 */
function collectTcLevels(tcText: string): Map<string, string> {
  const levels = new Map<string, string>();
  for (const [id, level] of collectHeadingTcLevels(tcText)) {
    levels.set(id, level);
  }
  for (const [id, level] of collectTableTcLevels(tcText)) {
    if (!levels.has(id)) {
      levels.set(id, level);
    }
  }
  return levels;
}

function collectTableTcLevels(tcText: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const table of parseAllMarkdownTables(tcText)) {
    // Header matching is case-insensitive, like the heading-form `- Level:`
    // parser and every `Level` *value* comparison downstream. A case-sensitive
    // match made a table headed `level` fall through to the integration
    // default silently, which is the failure mode this routing exists to end.
    const headers = table.headers.map((header: string) => header.trim().toLowerCase());
    const idIndex = headers.indexOf("tc-id");
    const levelIndex = headers.indexOf("level");
    if (idIndex < 0 || levelIndex < 0) {
      continue;
    }
    for (const row of table.rows) {
      const id = (row[idIndex] ?? "").trim().toUpperCase();
      const level = (row[levelIndex] ?? "").trim().toLowerCase();
      if (id.length > 0 && level.length > 0) {
        pairs.push([id, level]);
      }
    }
  }
  return pairs;
}

function collectHeadingTcLevels(tcText: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  let currentId: string | null = null;

  for (const rawLine of tcText.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const heading = TC_HEADING_RE.exec(line);
    if (heading?.[1] !== undefined) {
      currentId = heading[1].toUpperCase();
      continue;
    }
    if (line.startsWith("#")) {
      // Any other heading closes the current TC block.
      currentId = null;
      continue;
    }
    if (currentId === null) {
      continue;
    }
    const level = LEVEL_META_LINE_RE.exec(line)?.[1]?.trim().toLowerCase();
    if (level !== undefined && level.length > 0) {
      // First `- Level:` line of the block wins.
      pairs.push([currentId, level]);
      currentId = null;
    }
  }

  return pairs;
}

/** Test directory a declared `Level` routes its TC obligation to. */
const LEVEL_TO_TEST_KIND: Record<string, AtddTestKind | undefined> = {
  l3: "integration",
  integration: "integration",
  l4: "api",
  api: "api",
  l5: "e2e",
  e2e: "e2e",
};

/**
 * Where a TC's annotation legally lives.
 *
 * Defaults to `integration` — the historical hard-coded answer — so a spec
 * with no `Level` column behaves exactly as before. A TC that declares an
 * API-level obligation routes to `tests/api/**`, which was previously both
 * uncounted and reported as forbidden: two errors from one correct placement.
 */
function resolveTcHomeKind(
  tcLevels: Map<string, Map<string, string>>,
  spec: string,
  tcId: string,
): AtddTestKind {
  const level = tcLevels.get(spec)?.get(tcId.toUpperCase());
  if (level === undefined) {
    return "integration";
  }
  return LEVEL_TO_TEST_KIND[level] ?? "integration";
}

/**
 * Resolves the home kind of every missing TC so `QFAI-ATDD-112` can name the
 * directory the TC's declared `Level` actually routes to.
 */
function buildMissingTcHomes(
  missingTc: string[],
  tcLevels: Map<string, Map<string, string>>,
): Map<string, AtddTestKind> {
  const homes = new Map<string, AtddTestKind>();
  for (const ref of missingTc) {
    const parsed = MISSING_TC_REF_RE.exec(ref);
    const spec = parsed?.[1];
    const id = parsed?.[2];
    if (spec === undefined || id === undefined) {
      homes.set(ref, "integration");
      continue;
    }
    homes.set(ref, resolveTcHomeKind(tcLevels, spec, `TC-${id}`));
  }
  return homes;
}

export const PLANNED_CONTRACT_KEY = "x-qfai-status";
const PLANNED_CONTRACT_VALUE = "planned";

/**
 * Fallback marker for a document that does not parse: an unindented
 * `x-qfai-status: planned`, optionally as a comment. Column 0 is required, so
 * the marker cannot be mistaken for one nested under an operation.
 */
/** Quote a value for literal use inside a RegExp source. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Both interpolations are escaped. They are plain identifiers today, so this
// changes nothing now; it keeps a future key containing `.` or `-`-in-a-class
// from silently turning into a pattern that matches more than the literal.
const PLANNED_CONTRACT_RE = new RegExp(
  `^(?:#[ \\t]*)?["']?${escapeRegExp(PLANNED_CONTRACT_KEY)}["']?[ \\t]*:[ \\t]*["']?${escapeRegExp(
    PLANNED_CONTRACT_VALUE,
  )}["']?[ \\t]*$`,
  "im",
);

/**
 * True when the contract declares itself not yet implemented.
 *
 * `/qfai-sdd` authors contracts in Phase 0 (Contracts-first) but slices them in
 * Phase 2, so between the second contract and the last slice every declared
 * `CON-API-*` would otherwise be a `QFAI-ATDD-113` error. The marker makes the
 * deferral explicit and reviewable in the contract itself.
 *
 * The marker is only honoured at the **document root**. A text scan that
 * accepted any indentation would let an `x-qfai-status: planned` on a single
 * OpenAPI operation defer the whole file, silently dropping the API-test
 * obligation for every other `CON-API-*` it declares. The document is therefore
 * parsed (YAML is a superset of JSON, so both contract formats go through the
 * same path) and only a top-level key counts. An unparseable document falls
 * back to a column-0 text match, which cannot see a nested key either.
 */
export function isPlannedApiContract(text: string): boolean {
  // The overwhelmingly common contract does not carry the marker at all, and
  // this runs once per contract file during collection. A substring test skips
  // the parse for those: the key must appear literally somewhere for any of the
  // paths below to return true, so a miss here is a definitive `false`.
  if (!text.includes(PLANNED_CONTRACT_KEY)) {
    return false;
  }

  let parsed: unknown;
  try {
    // `maxAliasCount: 0` disables alias expansion. Contracts are repository
    // files, but they are also the one input a PR author fully controls, and
    // an alias bomb (`*a` referenced repeatedly through nested anchors) turns a
    // small document into an out-of-memory CI failure. No contract format needs
    // aliases; a document that uses them is rejected and falls through to the
    // column-0 text match below.
    parsed = parseYaml(text, { maxAliasCount: 0 });
  } catch {
    // Malformed contract: other validators report the syntax error. Here the
    // conservative reading is the column-0 marker only.
    return PLANNED_CONTRACT_RE.test(text);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return PLANNED_CONTRACT_RE.test(text);
  }
  if (!(PLANNED_CONTRACT_KEY in parsed)) {
    // A commented-out marker survives parsing as nothing at all, so still allow
    // the column-0 comment form.
    return PLANNED_CONTRACT_RE.test(text);
  }
  const status: unknown = Reflect.get(parsed, PLANNED_CONTRACT_KEY);
  return typeof status === "string" && status.trim().toLowerCase() === PLANNED_CONTRACT_VALUE;
}

type CollectedApiContracts = {
  active: Set<string>;
  deferred: Set<string>;
};

async function collectApiContractIds(apiRoot: string): Promise<CollectedApiContracts> {
  const files = await collectApiContractFiles(apiRoot);
  const active = new Set<string>();
  const deferred = new Set<string>();

  for (const file of files) {
    const text = await readSafe(file);
    const planned = isPlannedApiContract(text);
    const declared = extractDeclaredContractIds(text);
    for (const id of declared) {
      const normalized = id.toUpperCase();
      if (API_CONTRACT_ID_RE.test(normalized)) {
        (planned ? deferred : active).add(normalized);
      }
    }
  }

  return { active, deferred };
}

/**
 * Resolves the set of spec numbers that owe a `US-*` E2E reference.
 *
 * Uses `resolveSurfaceUnion` — the same SSOT `/qfai-prototyping` enforces
 * (`prototypingIterate`'s drift gate and `prototypingCertify`'s `liveUiBearing`
 * both read it) — rather than the strict frontmatter-only
 * `resolveAllUiBearingSpecs`. The union also admits a spec pinned by
 * `qfai.config.yaml#prototyping.primarySpecId` and the legacy
 * `# … prototyping …` heading; scoping on the narrower set would drop such a
 * spec out of `QFAI-ATDD-111` as soon as any other spec declared
 * `surface_type: ui-bearing`, silently passing its unreferenced US.
 *
 * Returns `null` when no spec in the project declares a user-facing surface —
 * i.e. the project has not opted into surface typing — so the obligation
 * remains project-wide and this change relaxes nothing for it. Failure to
 * resolve also returns `null`, keeping the gate at its stricter setting.
 */
async function resolveUiBearingScope(
  root: string,
  config: QfaiConfig,
): Promise<ReadonlySet<string> | null> {
  try {
    const uiBearing = await resolveSurfaceUnion(root, config);
    return uiBearing.length === 0 ? null : new Set(uiBearing);
  } catch (error) {
    // `null` is also the "no spec declared a surface" path, so a swallowed
    // failure here is indistinguishable from a project that simply never opted
    // in — and the only visible effect is that the gate stayed project-wide.
    // Named on stderr so the reason is recoverable; the return value is
    // unchanged, keeping the gate at its stricter setting either way.
    process.stderr.write(
      `qfai: surface-type resolution failed; QFAI-ATDD-111 stays project-wide ` +
        `(${error instanceof Error ? error.message : String(error)})\n`,
    );
    return null;
  }
}

function collectShortIds(text: string, prefix: "US" | "TC"): Set<string> {
  const ids = new Set<string>();
  const headingIds = collectMarkdownItems(text, prefix).map((item) => item.id);
  const pattern = prefix === "US" ? /\bUS-\d{4}(?:-\d{4})?\b/g : /\bTC-\d{4}(?:-\d{4})?\b/g;
  const looseIds = uniqueMatches(text, pattern);
  for (const id of [...headingIds, ...looseIds]) {
    const normalized = id.toUpperCase();
    if (
      (prefix === "US" && US_ID_RE.test(normalized)) ||
      (prefix === "TC" && TC_ID_RE.test(normalized))
    ) {
      ids.add(normalized);
    }
  }
  return ids;
}

/**
 * Extensions the ATDD scan must always read, whatever the project configures.
 *
 * `validation.traceability.testFileGlobs` describes executable test *code*, but
 * annotations also legitimately live in Gherkin features and in markdown
 * traceability files (this repository carries its own `US-*` annotations in
 * `tests/e2e/qfai-traceability.md`). These are annotation carriers, not code,
 * so they are unioned in rather than replaced.
 */
const STRUCTURAL_ANNOTATION_EXTENSIONS = ["feature", "md", "markdown"] as const;

/**
 * Derives the per-layer file pattern from the project's configured
 * `testFileGlobs`, so a non-JS repository is scanned with its own extensions.
 *
 * Configured globs describe whole paths (`tests/**\/*.py`); the ATDD scan needs
 * a pattern to append under `tests/{e2e,api,integration}/`. The extension set is
 * therefore lifted out of them, unioned with the structural annotation carriers
 * above, and recombined. When no extension can be recovered, the JS/TS default
 * is used.
 */
export function deriveAtddFilePattern(testFileGlobs: readonly string[]): string {
  const extensions = new Set<string>();
  for (const glob of testFileGlobs) {
    for (const match of glob.matchAll(/\.\{([^}]+)\}$/g)) {
      for (const ext of (match[1] ?? "").split(",")) {
        const trimmed = ext.trim();
        if (trimmed.length > 0) extensions.add(trimmed);
      }
    }
    const single = /\.([A-Za-z0-9]+)$/.exec(glob);
    if (single?.[1]) {
      extensions.add(single[1]);
    }
  }
  if (extensions.size === 0) {
    return DEFAULT_TEST_FILE_GLOB;
  }
  for (const ext of STRUCTURAL_ANNOTATION_EXTENSIONS) {
    extensions.add(ext);
  }
  // Always the brace form: the loop above unions in
  // STRUCTURAL_ANNOTATION_EXTENSIONS, three entries, so a non-empty set can
  // never have one member and a `**/*.<ext>` branch would be dead code.
  const sorted = Array.from(extensions).sort();
  return `**/*.{${sorted.join(",")}}`;
}

function buildAtddTestGlobs(root: string, testsRoot: string, filePattern: string): string[] {
  const relativeTestsRoot = path.relative(root, testsRoot);
  const isInsideRoot =
    relativeTestsRoot.length === 0 ||
    (!relativeTestsRoot.startsWith("..") && !path.isAbsolute(relativeTestsRoot));
  const base = isInsideRoot
    ? toPosixPath(relativeTestsRoot.length === 0 ? "." : relativeTestsRoot)
    : toPosixPath(testsRoot);
  const normalizedBase = base.replace(/\/+$/, "");
  return [
    `${normalizedBase}/e2e/${filePattern}`,
    `${normalizedBase}/api/${filePattern}`,
    `${normalizedBase}/integration/${filePattern}`,
  ];
}

async function collectTestFiles(root: string, globs: string[]): Promise<CollectFilesByGlobsResult> {
  return collectFilesByGlobs(root, {
    globs,
    ignore: DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
    limit: DEFAULT_GLOB_FILE_LIMIT,
  });
}

function resolveTestKind(
  filePath: string,
  roots: { e2eRoot: string; apiRoot: string; integrationRoot: string },
): AtddTestKind | null {
  if (isWithinPath(roots.e2eRoot, filePath)) {
    return "e2e";
  }
  if (isWithinPath(roots.apiRoot, filePath)) {
    return "api";
  }
  if (isWithinPath(roots.integrationRoot, filePath)) {
    return "integration";
  }
  return null;
}

function isWithinPath(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  if (relative === "") {
    return true;
  }
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function extractSpecScopedAnnotations(text: string, pattern: RegExp): SpecScopedRef[] {
  const refs: SpecScopedRef[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(cloneGlobal(pattern))) {
    const spec = match[1];
    const id = match[2];
    if (!spec || !id) {
      continue;
    }
    const key = `${spec}:${id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push({ spec, id });
  }

  return refs;
}

function extractApiContractAnnotations(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.matchAll(cloneGlobal(API_TEST_ANNOTATION_RE))) {
    const short = match[1];
    if (!short) {
      continue;
    }
    ids.add(`CON-API-${short}`);
  }
  return Array.from(ids).sort((left, right) => left.localeCompare(right));
}

function recordSpecRef(refs: AtddSpecRefs, specNumber: string, id: string, file: string): void {
  const bySpec = refs.get(specNumber) ?? new Map<string, Set<string>>();
  const files = bySpec.get(id) ?? new Set<string>();
  files.add(path.normalize(file));
  bySpec.set(id, files);
  refs.set(specNumber, bySpec);
}

function recordApiRef(refs: Map<string, Set<string>>, id: string, file: string): void {
  const files = refs.get(id) ?? new Set<string>();
  files.add(path.normalize(file));
  refs.set(id, files);
}

function recordForbidden(refs: Map<string, Set<string>>, file: string, id: string): void {
  const files = refs.get(path.normalize(file)) ?? new Set<string>();
  files.add(id);
  refs.set(path.normalize(file), files);
}

function pushUnknown(
  unknown: AtddUnknownRef[],
  dedup: Set<string>,
  file: string,
  token: string,
  kind: AtddUnknownRefKind,
): void {
  const normalizedFile = path.normalize(file);
  const key = `${kind}|${normalizedFile}|${token}`;
  if (dedup.has(key)) {
    return;
  }
  dedup.add(key);
  unknown.push({
    file: normalizedFile,
    token,
    kind,
  });
}

function buildMissingRefs(input: {
  specUsIds: Map<string, Set<string>>;
  /**
   * Spec numbers that owe a `US-*` E2E reference, or `null` when the project
   * does not use surface typing and every spec owes one.
   */
  usObligationScope: ReadonlySet<string> | null;
  specTcIds: Map<string, Set<string>>;
  apiContractIds: Set<string>;
  usRefs: AtddSpecRefs;
  tcRefs: AtddSpecRefs;
  apiRefs: Map<string, Set<string>>;
}): AtddTraceabilityMissing {
  const missingUs: string[] = [];
  for (const [spec, ids] of input.specUsIds.entries()) {
    if (input.usObligationScope !== null && !input.usObligationScope.has(spec)) {
      continue;
    }
    const refsBySpec = input.usRefs.get(spec);
    for (const id of sortStrings(ids)) {
      const matchedFiles = refsBySpec?.get(id);
      if (!matchedFiles || matchedFiles.size === 0) {
        missingUs.push(formatUsRef(spec, id.replace(/^US-/, "")));
      }
    }
  }

  const missingTc: string[] = [];
  for (const [spec, ids] of input.specTcIds.entries()) {
    const refsBySpec = input.tcRefs.get(spec);
    for (const id of sortStrings(ids)) {
      const matchedFiles = refsBySpec?.get(id);
      if (!matchedFiles || matchedFiles.size === 0) {
        missingTc.push(formatTcRef(spec, id.replace(/^TC-/, "")));
      }
    }
  }

  const missingConApi = sortStrings(input.apiContractIds).filter((id) => {
    const matchedFiles = input.apiRefs.get(id);
    return !matchedFiles || matchedFiles.size === 0;
  });

  return {
    us: missingUs.sort((left, right) => left.localeCompare(right)),
    tc: missingTc.sort((left, right) => left.localeCompare(right)),
    conApi: missingConApi.sort((left, right) => left.localeCompare(right)),
  };
}

function hasSpecId(target: Map<string, Set<string>>, specNumber: string, id: string): boolean {
  return target.get(specNumber)?.has(id.toUpperCase()) ?? false;
}

function toForbiddenList(refs: Map<string, Set<string>>): AtddForbiddenRef[] {
  return Array.from(refs.entries())
    .map(([file, ids]) => ({
      file,
      ids: sortStrings(ids),
    }))
    .sort((left, right) => left.file.localeCompare(right.file));
}

function formatUsToken(spec: string, id: string): string {
  return `QFAI:SPEC-${spec}:US-${id}`;
}

function formatTcToken(spec: string, id: string): string {
  return `QFAI:SPEC-${spec}:TC-${id}`;
}

function formatUsRef(spec: string, id: string): string {
  return `SPEC-${spec}:US-${id}`;
}

function formatTcRef(spec: string, id: string): string {
  return `SPEC-${spec}:TC-${id}`;
}

function compareUnknownRef(left: AtddUnknownRef, right: AtddUnknownRef): number {
  if (left.kind !== right.kind) {
    return left.kind.localeCompare(right.kind);
  }
  if (left.file !== right.file) {
    return left.file.localeCompare(right.file);
  }
  return left.token.localeCompare(right.token);
}

function sortStrings(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function cloneGlobal(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

async function readSafe(target: string): Promise<string> {
  try {
    return await readFile(target, "utf-8");
  } catch {
    return "";
  }
}

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { extractDeclaredContractIds } from "./contractsDecl.js";
import { collectApiContractFiles, collectDbContractFiles } from "./discovery.js";
import {
  collectFilesByGlobs,
  DEFAULT_GLOB_FILE_LIMIT,
  type CollectFilesByGlobsResult,
} from "./fs.js";
import { collectSpecEntries } from "./specLayout.js";
import { resolveSurfaceUnion } from "./prototyping/specResolution.js";
import {
  extractTestCaseTableSection,
  maskNonSpecRegions,
  parseAllMarkdownTables,
  resolveTestCaseTables,
} from "./specPackParsers.js";
import { UNIT_COMPONENT_LAYERS } from "./tddHelpers.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "./traceability.js";
import { collectMarkdownItems, uniqueMatches } from "./validators/utils.js";

// The short form carries `(?!-)`; the long form does not.
//
// Written as `(?:-\d{4})?`, the optional half let a test that validates its own
// annotations — `/^QFAI:SPEC-0001:TC-0001-\d{4}$/`, the shape a self-checking
// deferral ledger reaches for — match as the FOUR-DIGIT-SHORT prefix of itself:
// the optional half cannot consume `-\d`, the short form succeeds, and `\b` is
// satisfied because `-` is not a word character. The scanner then reported a TC
// id four digits short, unregistered BY CONSTRUCTION because the truncation
// invented it (#1123).
//
// This paragraph deliberately spells no complete short-form id. Naming one
// would make the comment itself an annotation — the other half of what #1123
// reports, an explanation of the hazard re-triggering it. The illustration
// above is safe for the reason the fix turns on: it continues with `-`.
//
// Both lengths stay legal: `TC-0001` and `TC-0001-0002` are accepted by
// `TC_ID_RE`, `TC_REF_SHAPE` and `TC_ID_TOKEN` alike, so requiring eight digits
// would reject real annotations. What is not legal is a short form the text
// then continues with `-`, because a real one is followed by whitespace, a
// quote, `)` or end of line.
//
// The guard sits on the short alternative only, so a complete-but-malformed
// annotation (`TC-0001-0002-foo`) still matches and is still reported as an
// unknown reference. Trading a false report for a silent miss is the worse
// direction in a validator.
const US_TEST_ANNOTATION_RE = /\bQFAI:SPEC-(\d{4}):US-(\d{4}-\d{4}|\d{4}(?!-))\b/g;
const TC_TEST_ANNOTATION_RE = /\bQFAI:SPEC-(\d{4}):TC-(\d{4}-\d{4}|\d{4}(?!-))\b/g;
const API_TEST_ANNOTATION_RE = /\bQFAI:CON-API-(\d+)\b/g;
/**
 * `CON-DB-*` annotation, the DB peer of the API form above.
 *
 * `CON-DB-*` was a first-class authored contract kind with no downstream test
 * obligation: no annotation form, no coverage rule, and — because
 * `AtddUnknownRefKind` had no DB member — not even an unknown-reference report.
 * A `QFAI:CON-DB-0002` written into a test was silently invisible.
 */
const DB_TEST_ANNOTATION_RE = /\bQFAI:CON-DB-(\d+)\b/g;

const US_ID_RE = /^US-\d{4}(?:-\d{4})?$/;
const TC_ID_RE = /^TC-\d{4}(?:-\d{4})?$/;
/** Heading form of a test case, e.g. `## TC-0001-0002: title`. */
const TC_HEADING_RE = /^##\s+(TC-\d{4}(?:-\d{4})?)(?:\s*[:：]\s*.*)?$/;
/** `- Level: L4` meta line inside a heading-form test case block. */
const LEVEL_META_LINE_RE = /^[-*]\s+Level\s*[:：]\s*(.+?)\s*$/i;
/** Parses a `SPEC-0001:TC-0002` ref produced by `formatTcRef`. */
const MISSING_TC_REF_RE = /^SPEC-(\d{4}):TC-(\d{4}(?:-\d{4})?)$/;
const API_CONTRACT_ID_RE = /^CON-API-\d+$/;
const DB_CONTRACT_ID_RE = /^CON-DB-\d+$/;
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

export type AtddUnknownRefKind = "us" | "tc" | "conApi" | "conDb";

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
  conDb: string[];
};

export type AtddCodeTraceabilityResult = {
  specsRoot: string;
  /**
   * The configured tests directory, resolved.
   *
   * The bound on the per-spec owner scan. Test paths are absolute, so a
   * checkout that itself lives under `/srv/integration/spec-0002/repo` has an
   * ancestor pair that reads exactly like the canonical layout, and a flat
   * `tests/integration/a.test.ts` inside it was attributed to `0002`.
   */
  testsRoot: string;
  contractsApiRoot: string;
  /**
   * Spec number -> the directory `collectSpecEntries` enumerated for it.
   *
   * Two questions, one map. **Existence** is not the same as `specUsIds.has(n)`:
   * a spec created moments ago has a directory and empty catalogues, and scope
   * logic that asks the id maps treats it as nonexistent — so a typo naming it
   * is handled as repo-wide when that spec's own gate would in fact own it.
   * **Its path** is the enumerated one, never `spec-${n}` rebuilt from the
   * number: on a case-sensitive filesystem a `SPEC-0001/` directory is valid and
   * kept verbatim by `listSpecDirs`, and a synthesised lower-case path would
   * send the CLI report and the GitHub annotation at a file that is not there.
   */
  declaredSpecDirs: Map<string, string>;
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
  contractsDbRoot: string;
  /** Every declared `CON-DB-*`, active and deferred alike. */
  dbContractIds: Set<string>;
  /** The subset that carries the `QFAI-ATDD-115` obligation. */
  activeDbContractIds: Set<string>;
  /** `CON-DB-*` deferred by `-- x-qfai-status: planned`; reported at `info`. */
  deferredDbContractIds: Set<string>;
  refs: {
    us: AtddSpecRefs;
    tc: AtddSpecRefs;
    api: Map<string, Set<string>>;
    /**
     * `CON-DB-*` references found in integration tests. L3 Integration is the
     * layer whose declared scope is real-infrastructure integration including
     * the database, so it is the one that can actually exercise a DB contract.
     */
    db: Map<string, Set<string>>;
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
  /**
   * `TC-*` refs excluded from the `QFAI-ATDD-112` obligation because their
   * declared `Level` is Unit or Component. Reported at `info`
   * (`QFAI-ATDD-117`) so the exclusion is visible rather than silent — the
   * shape a coverage scan must never take, since "nothing owed" and "nothing
   * scanned" are otherwise indistinguishable. `/qfai-implement`'s ledger gate
   * (`TDDLIST_TC_NOT_COVERED`) is what covers them.
   */
  unitComponentTcIds: string[];
  /** Test files outside the scanned roots; surfaced instead of dropped. */
  skippedTestFiles: string[];
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
  const contractsDbRoot = path.join(contractsRoot, "db");

  const [specRefs, collectedApiContracts, collectedDbContracts] = await Promise.all([
    collectSpecRefs(specsRoot),
    collectApiContractIds(contractsApiRoot),
    collectDbContractIds(contractsDbRoot),
  ]);
  const activeDbContractIds = collectedDbContracts.active;
  const deferredDbContractIds = collectedDbContracts.deferred;
  const declaredDbContractIds = new Set([...activeDbContractIds, ...deferredDbContractIds]);
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
  const dbRefs = new Map<string, Set<string>>();

  const skippedTestFiles: string[] = [];
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
      // Recorded, not dropped. A correctly annotated test outside the three
      // scanned roots contributes nothing to coverage and used to vanish with
      // no diagnostic — which is how `qfai atdd scaffold` could write files
      // that every gate then reported as zero coverage.
      skippedTestFiles.push(toPosixPath(path.relative(root, file)));
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
      if (homeKind === null) {
        // Unit / Component: no ATDD annotation obligation, and therefore no
        // forbidden placement either. Annotating a `tests/integration/**` test
        // with an L1 TC is a project's own choice, not a rule violation — the
        // rule that owns L1/L2 is `TDDLIST_TC_NOT_COVERED` on the ledger.
        continue;
      }
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
        recordContractRef(apiRefs, contractId, file);
      }
    }

    for (const contractId of extractDbContractAnnotations(text)) {
      // Declared = active ∪ deferred, for the same reason as CON-API: a
      // deferral suspends the obligation, it does not un-declare the contract.
      if (!declaredDbContractIds.has(contractId)) {
        pushUnknown(unknown, unknownDedup, file, `QFAI:${contractId}`, "conDb");
        continue;
      }
      // Only an integration test counts. A DB contract is exercised against
      // real infrastructure, which is L3's declared scope; counting a `CON-DB`
      // annotation from `tests/e2e/**` would let an end-to-end assertion that
      // never touches the schema close the obligation.
      if (kind === "integration") {
        recordContractRef(dbRefs, contractId, file);
      }
    }
  }

  // Test files that carry a QFAI annotation but sit outside the three scanned
  // roots. They contribute nothing to coverage and used to vanish without a
  // diagnostic — which is how `qfai atdd scaffold` could write files that every
  // gate then reported as zero coverage. Probed separately because the main
  // scan is glob-scoped to the three roots and never sees them. `tcLevels` is
  // passed because "contributes nothing" is not the same as "should be moved":
  // an L1/L2 annotation is owed to no ATDD directory at all.
  skippedTestFiles.push(...(await collectUncountedTestFiles(root, testsRoot, tcLevels)));

  const missing = buildMissingRefs({
    specUsIds,
    usObligationScope: uiBearingSpecs,
    specTcIds,
    apiContractIds: activeApiContractIds,
    dbContractIds: activeDbContractIds,
    usRefs,
    tcRefs,
    apiRefs,
    dbRefs,
  });
  const { owed: owedTc, unitComponent: unitComponentTc } = partitionMissingTcByObligation(
    missing.tc,
    tcLevels,
  );
  missing.tc = owedTc;
  const missingTcHomes = buildMissingTcHomes(missing.tc, tcLevels);

  return {
    declaredSpecDirs: specRefs.declaredSpecDirs,
    unitComponentTcIds: unitComponentTc,
    specsRoot,
    testsRoot,
    contractsApiRoot,
    specUsIds,
    specTcIds,
    apiContractIds: declaredApiContractIds,
    activeApiContractIds,
    deferredApiContractIds,
    contractsDbRoot,
    dbContractIds: declaredDbContractIds,
    activeDbContractIds,
    deferredDbContractIds,
    refs: {
      us: usRefs,
      tc: tcRefs,
      api: apiRefs,
      db: dbRefs,
    },
    unknown: unknown.sort(compareUnknownRef),
    forbidden: {
      tcInApi: toForbiddenList(forbiddenTcInApi),
      tcInE2e: toForbiddenList(forbiddenTcInE2e),
      tcInIntegration: toForbiddenList(forbiddenTcInIntegration),
    },
    missing,
    missingTcHomes,
    skippedTestFiles: skippedTestFiles.sort(),
    scan: {
      globs: scanGlobs,
      matchedFileCount: scanResult.matchedFileCount,
      truncated: scanResult.truncated,
      limit: scanResult.limit,
    },
  };
}

/**
 * Annotated test files under `testsDir` that no scanned root owns.
 *
 * Deliberately scoped to the directories qfai itself has written to, rather
 * than walking the whole tree: the point is to surface output the toolkit
 * produced and then ignored, not to audit a project's own layout.
 */
const UNCOUNTED_TEST_DIRS = ["atdd"];

/** Any QFAI test annotation, in any of its forms. */
const ANY_QFAI_ANNOTATION = /\bQFAI:(?:SPEC-\d{4}:(?:US|TC)-|CON-(?:API|DB)-)/;

/** Any QFAI annotation whose obligation is fixed by its ID type, not by a `Level`. */
const LEVEL_INDEPENDENT_ANNOTATION = /\bQFAI:(?:SPEC-\d{4}:US-|CON-(?:API|DB)-)/;

/**
 * Whether a legacy file's annotations are all ones ATDD no longer owes.
 *
 * `QFAI-ATDD-105` tells the operator to move the file into
 * `integration` / `api` / `e2e`, which is right for anything ATDD counts. For a
 * file carrying nothing but L1/L2 `TC-*` annotations it is wrong twice over: the
 * TC owes no ATDD annotation at all, so moving it counts towards nothing, and
 * `catalog/test-layers.md` states outright that an L1/L2 annotation is neither
 * required nor misplaced wherever it lands. The advice would push a project back
 * into the all-integration collapse the exclusion exists to undo.
 *
 * Conservative on every uncertainty: a `US-*` or `CON-*` annotation is
 * `Level`-independent and still owed, and an unknown or level-less `TC-*`
 * resolves to the default home rather than to "no obligation", so only a file
 * whose every annotation is provably outside ATDD goes quiet.
 */
function carriesOnlyExcludedAnnotations(
  text: string,
  tcLevels: Map<string, Map<string, string>>,
): boolean {
  if (LEVEL_INDEPENDENT_ANNOTATION.test(text)) {
    return false;
  }
  const tcAnnotations = extractSpecScopedAnnotations(text, TC_TEST_ANNOTATION_RE);
  if (tcAnnotations.length === 0) {
    return false;
  }
  return tcAnnotations.every(
    (ref) => resolveTcHomeKind(tcLevels, ref.spec, `TC-${ref.id}`) === null,
  );
}

async function collectUncountedTestFiles(
  root: string,
  testsRoot: string,
  tcLevels: Map<string, Map<string, string>>,
): Promise<string[]> {
  const patterns = UNCOUNTED_TEST_DIRS.map(
    (dir) =>
      `${toPosixPath(path.join(testsRoot, dir)).replace(/\/+$/, "")}/**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,feature,md,markdown}`,
  );
  let files: string[];
  try {
    const collected = await collectFilesByGlobs(root, {
      globs: patterns,
      ignore: DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
      limit: DEFAULT_GLOB_FILE_LIMIT,
    });
    files = collected.files;
  } catch {
    // A probe that only annotates the scan must not be able to fail it.
    return [];
  }
  const annotated: string[] = [];
  for (const file of files) {
    const text = await readSafe(file);
    if (!ANY_QFAI_ANNOTATION.test(text)) continue;
    if (carriesOnlyExcludedAnnotations(text, tcLevels)) continue;
    annotated.push(toPosixPath(path.relative(root, file)));
  }
  return annotated.sort();
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
  /** Spec number -> the directory enumerated for it. */
  declaredSpecDirs: Map<string, string>;
}> {
  const entries = await collectSpecEntries(specsRoot);
  const us = new Map<string, Set<string>>();
  const tc = new Map<string, Set<string>>();
  const tcLevels = new Map<string, Map<string, string>>();
  const declaredSpecDirs = new Map(entries.map((entry) => [entry.specNumber, entry.dir]));

  for (const entry of entries) {
    const [usText, tcText] = await Promise.all([
      readSafe(entry.userStoriesPath),
      readSafe(entry.testCasesPath),
    ]);

    const usIds = collectShortIds(maskNonSpecRegions(usText), "US");
    // From the same authoritative shapes `collectTcLevels` reads, not from the
    // whole document. Two ways that diverged: an id that appears only in a
    // fenced sample or an HTML comment (masking fixes that), and an id in an
    // appendix or illustrative table written as ordinary markdown *outside*
    // `## Test Case Table` — which `resolveTestCaseTables` does not read but
    // `collectShortIds` did. Either way the id landed in the declared set with
    // no `Level`, fell through to the integration default, and
    // `QFAI-ATDD-112` raised a hard error against a TC that does not exist.
    const tcIds = collectDeclaredTcIds(tcText);

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

  return { us, tc, tcLevels, declaredSpecDirs };
}

/**
 * Reads the declared `Level` of every TC in `06_Test-Cases.md` so the TC
 * obligation can be routed by declared layer instead of being hard-pinned to
 * `tests/integration/**`.
 *
 * Both shipped shapes are read, matching `parseTestCases` in
 * `core/atdd/scaffold.ts`: the heading form (`## TC-NNNN` plus `- Level: L4`
 * meta lines) and the table form. Heading form wins on duplicates; within
 * either form the first declaration wins. Every `TC-ID` table is scanned, not
 * just the first — a spec may split its catalogue across several tables, and
 * only scanning the first silently dropped the later tables' layers.
 */
export function collectTcLevels(rawTcText: string): Map<string, string> {
  // Fenced samples and HTML comments are not the spec. Without this, a
  // commented-out old table or a format example declaring `TC-0001` as `L1`
  // wins under first-declaration-wins and silently removes the real row's
  // `QFAI-ATDD-112` obligation — a hole that only opened once L1/L2 stopped
  // being an obligation of their own.
  const tcText = maskNonSpecRegions(rawTcText);
  const levels = new Map<string, string>();
  // First-seen, not last: `set` on every pair made the *last* duplicate heading
  // win here while the ledger gate kept the first, so a TC headed `L1` and then
  // `L1`-superseded-by-`L3` was excluded from `QFAI-ATDD-112` by one collector
  // and claimed by `TDDLIST_TC_NOT_COVERED` by the other — owed twice, which is
  // the two-gates-disagree failure this routing exists to remove. The table pass
  // below and `resolveTestCaseTables` already resolve duplicates first-seen, so
  // the heading pass was the one shape out of step.
  for (const [id, level] of collectHeadingTcLevels(tcText)) {
    if (!levels.has(id)) {
      levels.set(id, level);
    }
  }
  for (const [id, level] of collectTableTcLevels(tcText)) {
    if (!levels.has(id)) {
      levels.set(id, level);
    }
  }
  return levels;
}

/**
 * Table-form levels, read from the same tables `resolveTestCaseTables` reads.
 *
 * These two collectors decide the same TC's fate from opposite ends —
 * `QFAI-ATDD-112` excludes an L1/L2 TC, `TDDLIST_TC_NOT_COVERED` demands a
 * ledger row for it — so they must agree on which tables are authoritative.
 * Scanning every table in the document meant an explanatory table above the
 * `## Test Case Table` heading won under first-declaration-wins: an example
 * row saying `TC-0001 | L1` excluded the TC from `QFAI-ATDD-112`, while the
 * section-scoped ledger gate read the real `L3` row and did not claim it
 * either. Full validation then passed with no test at all.
 */
function collectTableTcLevels(tcText: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const table of resolveTestCaseTables(tcText)) {
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

/**
 * Heading-form TC levels only (`## TC-0001` + `- Level:`), with non-spec
 * regions masked.
 *
 * Exported for `validateTddList`: its table reader is deliberately
 * section-scoped, so the heading shape needs collecting separately. Using the
 * combined `collectTcLevels` there would re-admit every table in the document,
 * including an Appendix one the section scoping exists to keep out.
 */
export function collectHeadingTcLevelsFrom(rawTcText: string): Array<[string, string]> {
  return collectHeadingTcLevels(maskNonSpecRegions(rawTcText));
}

/**
 * The TC ids a spec pack declares, from the shapes that carry authority.
 *
 * The union of the heading form and the `TC-ID` column of the tables
 * `resolveTestCaseTables` admits — the same two passes {@link collectTcLevels}
 * makes, so the declared set and the level map cannot disagree about which ids
 * exist. Anything outside them is illustration: a fenced sample, an HTML
 * comment, or an appendix table sitting outside `## Test Case Table`.
 */
const TC_TOKEN_RE = /\bTC-\d{4}(?:-\d{4})?\b/g;

export function collectDeclaredTcIds(rawTcText: string): Set<string> {
  const ids = new Set(collectHeadingTcIdsFrom(rawTcText));
  // The section, not `resolveTestCaseTables`: that filter is case-exact on the
  // `TC-ID` header, and a mistyped `tc-id` must still *declare* its ids — the
  // ledger reports `TDDLIST_TC_TABLE_UNRESOLVED` and ATDD keeps the default
  // obligation, so fixing the header clears both. What the section boundary
  // excludes is the appendix table, which declares nothing.
  const masked = maskNonSpecRegions(rawTcText);
  const section = extractTestCaseTableSection(masked) ?? masked;
  for (const table of parseAllMarkdownTables(section)) {
    const idIndex = table.headers.findIndex((header) => header.trim().toUpperCase() === "TC-ID");
    if (idIndex < 0) {
      // The header is mistyped — `TC Id`, say — so this table is unresolvable
      // and `TDDLIST_TC_TABLE_UNRESOLVED` reports it. Its ids are still
      // **declared**: dropping them removed the obligation entirely, and with
      // no ledger `TDDLIST_MISSING` is only a warning, so a spec could pass
      // `--profile full --fail-on error` with neither a test nor a ledger row.
      // Conservative here, loud there — keeping the tokens preserves the
      // obligation while the header is what gets fixed.
      for (const row of table.rows) {
        for (const value of row) {
          for (const match of value.matchAll(TC_TOKEN_RE)) {
            ids.add(match[0].toUpperCase());
          }
        }
      }
      continue;
    }
    for (const row of table.rows) {
      const id = /\bTC-\d{4}(?:-\d{4})?\b/.exec((row[idIndex] ?? "").trim())?.[0];
      if (id !== undefined) ids.add(id.toUpperCase());
    }
  }
  return ids;
}

/**
 * Every heading-form TC id, whether or not the block declares a `Level`.
 *
 * `collectHeadingTcLevelsFrom` yields a pair only when a `- Level:` line
 * follows the heading, so it cannot answer "does this spec declare this TC?" —
 * a level-less TC is still declared. `validateTddList` needs both questions
 * answered from the same shape: the id set decides whether a ledger `TC-Refs`
 * value is known, the level pairs decide whether it is a coverage target.
 */
export function collectHeadingTcIdsFrom(rawTcText: string): string[] {
  const ids: string[] = [];
  for (const rawLine of maskNonSpecRegions(rawTcText).replace(/\r\n/g, "\n").split("\n")) {
    const id = TC_HEADING_RE.exec(rawLine.trim())?.[1];
    if (id !== undefined) {
      ids.push(id.toUpperCase());
    }
  }
  return ids;
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

/**
 * Test directory a declared `Level` routes its TC obligation to.
 *
 * A `Map`, not an object literal, because the key comes out of a spec document.
 * `Record<string, …>` inherits `Object.prototype`, so a `Level` cell spelled
 * `constructor` or `__proto__` resolved to an inherited value instead of
 * `undefined` and never reached {@link DEFAULT_ATDD_HOME_KIND} — the TC was
 * then neither counted where it was annotated nor accepted there, which is the
 * two-errors-from-one-correct-action shape this routing exists to remove.
 */
const LEVEL_TO_TEST_KIND = new Map<string, AtddTestKind>([
  ["l3", "integration"],
  ["integration", "integration"],
  ["l4", "api"],
  ["api", "api"],
  ["l5", "e2e"],
  ["e2e", "e2e"],
]);

/**
 * Where a `Level` this file cannot read routes to.
 *
 * The historical hard-coded answer, and deliberately the conservative one: a
 * cell qfai does not understand keeps its obligation rather than discharging
 * it. If an unreadable cell silently cleared `QFAI-ATDD-112`, `L1/L2` would be
 * a one-keystroke way to delete any TC from the gate. Reached by a spec with no
 * `Level` column, by a multi-valued cell (`L3/L5` — illegal, see
 * `catalog/test-layers.md`) and by a typo alike.
 */
const DEFAULT_ATDD_HOME_KIND: AtddTestKind = "integration";

/** The one normalization every `Level` comparison in this module applies. */
function normalizeLevel(level: string): string {
  return level.trim().toLowerCase();
}

/**
 * `Level` values that carry no ATDD annotation obligation.
 *
 * `qfai-atdd/SKILL.md` puts Unit and Component out of its scope, and
 * `catalog/test-layers.md` gives L1/L2 no mandated directory — only L3-L5 are
 * directory-pinned, and only those three roots are ever scanned. L1/L2 used to
 * fall through `LEVEL_TO_TEST_KIND`'s `?? "integration"`, which is the fallback
 * for a spec with *no* `Level` column, so every declared Unit and Component TC
 * was reported by `QFAI-ATDD-112` as uncovered in `tests/integration/**` — a
 * directory its own layer policy says is not its home.
 *
 * That was unsatisfiable and unwaivable: `QFAI-ATDD-112` is `error`, and
 * `QFAI-WAIVER-002` refuses every waiver on an `error` rule. A project that
 * filed unit tests where `test-layers.md` says to had no exit, and the only
 * validator-clean path was to duplicate every L1/L2 annotation into
 * `tests/integration/**` — the all-integration collapse the layer model exists
 * to prevent.
 *
 * These obligations are not unguarded: `tdd/test-list.md` carries a row per
 * coverage-target TC and `TDDLIST_TC_NOT_COVERED` (`error`) reports a missing
 * one, which is `/qfai-implement`'s gate and the stage that owns Unit and
 * Component.
 *
 * **One vocabulary, not two.** This is `UNIT_COMPONENT_LAYERS` itself, not a
 * second copy of its members. The handoff above is the whole safety argument
 * for dropping the ATDD obligation, and it only holds while the set ATDD stops
 * owing is the set the ledger starts owing: a spelling in one and not the
 * other is a `Level` owed by no gate at all, which is the hole this exclusion
 * was written to avoid opening. Two literals with the same members and two
 * private normalizations is exactly how `resolveAtddHomeKind` came to have
 * three answers, so the vocabulary is imported rather than restated. The two
 * modules still ask different questions of it — "does this owe an ATDD
 * annotation" here, "is this a ledger coverage target" there — and those
 * predicates stay separate; only the word list is shared. Both normalize with
 * `trim().toLowerCase()`, which `tddHelpers` documents as the membership
 * contract of the set.
 */
const NO_ATDD_OBLIGATION_LEVELS = UNIT_COMPONENT_LAYERS;

/**
 * Where a declared `Level` routes its ATDD annotation obligation, or `null`
 * when it owes none at all (Unit / Component).
 *
 * **The single answer to "what does this `Level` mean for ATDD".** It used to
 * be three: `resolveTcHomeKind` matched `NO_ATDD_OBLIGATION_LEVELS` against the
 * raw value, `isOutsideAtddObligation` against a trimmed and lower-cased one,
 * and `qfai atdd scaffold` kept a third set with a third inline normalization.
 * One question answered in three places is three chances for the routing rule
 * and the exclusion rule to disagree about the same cell — which is the defect
 * class this routing exists to remove, so it must not be reintroduced by the
 * removal itself.
 *
 * `undefined` means the spec declares no `Level` for the TC (no column, no
 * row): that is not "no obligation", it is the default home.
 */
export function resolveAtddHomeKind(level: string | undefined): AtddTestKind | null {
  if (level === undefined) {
    return DEFAULT_ATDD_HOME_KIND;
  }
  const normalized = normalizeLevel(level);
  if (NO_ATDD_OBLIGATION_LEVELS.has(normalized)) {
    return null;
  }
  return LEVEL_TO_TEST_KIND.get(normalized) ?? DEFAULT_ATDD_HOME_KIND;
}

/**
 * True when a declared `Level` puts the TC outside every ATDD obligation.
 *
 * Exported so the rules that fire on ATDD artefacts agree on one answer.
 * `validateScaffoldPlaceholder` needs it: a skeleton generated for an L1 TC
 * would otherwise keep escalating to `error` and block
 * `validate --profile atdd` for a TC that ATDD no longer owes anything for.
 */
export function isOutsideAtddObligation(level: string | undefined): boolean {
  return resolveAtddHomeKind(level) === null;
}

/**
 * Where a TC's annotation legally lives, or `null` when the declared `Level`
 * owes no ATDD annotation at all.
 *
 * A TC that declares an API-level obligation routes to `tests/api/**`, which
 * was previously both uncounted and reported as forbidden: two errors from one
 * correct placement.
 */
function resolveTcHomeKind(
  tcLevels: Map<string, Map<string, string>>,
  spec: string,
  tcId: string,
): AtddTestKind | null {
  return resolveAtddHomeKind(tcLevels.get(spec)?.get(tcId.toUpperCase()));
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
      homes.set(ref, DEFAULT_ATDD_HOME_KIND);
      continue;
    }
    // Every ref reaching here has already been filtered to one that owes an
    // annotation, so `null` cannot occur; fall back rather than assert.
    homes.set(ref, resolveTcHomeKind(tcLevels, spec, `TC-${id}`) ?? DEFAULT_ATDD_HOME_KIND);
  }
  return homes;
}

/**
 * Splits missing TC refs into those that owe an ATDD annotation and those whose
 * declared `Level` is Unit or Component.
 *
 * The second group is reported separately at `info` (`QFAI-ATDD-117`) rather
 * than dropped: a silent exclusion is indistinguishable from a scan that found
 * nothing, which is how the previous glob defect went unnoticed for a release.
 */
function partitionMissingTcByObligation(
  missingTc: readonly string[],
  tcLevels: Map<string, Map<string, string>>,
): { owed: string[]; unitComponent: string[] } {
  const owed: string[] = [];
  const unitComponent: string[] = [];
  for (const ref of missingTc) {
    const parsed = MISSING_TC_REF_RE.exec(ref);
    const spec = parsed?.[1];
    const id = parsed?.[2];
    if (spec === undefined || id === undefined) {
      owed.push(ref);
      continue;
    }
    if (resolveTcHomeKind(tcLevels, spec, `TC-${id}`) === null) {
      unitComponent.push(ref);
    } else {
      owed.push(ref);
    }
  }
  return { owed, unitComponent };
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

/**
 * A contract kind's declared IDs, split by whether they still carry the
 * coverage obligation. Shared by the API and DB collectors: the shape is the
 * same and duplicating it would let the two drift.
 */
type CollectedContractIds = {
  active: Set<string>;
  deferred: Set<string>;
};

async function collectApiContractIds(apiRoot: string): Promise<CollectedContractIds> {
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
 * The `x-qfai-status: planned` deferral in SQL comment form.
 *
 * A DB contract is `.sql`, so the YAML-parse path `isPlannedApiContract` uses
 * cannot apply. The marker is matched on its own comment line only: accepting
 * it mid-statement would let a stray mention inside a `CREATE TABLE` body defer
 * every `CON-DB-*` the file declares.
 */
const PLANNED_DB_CONTRACT_RE = new RegExp(
  `^[ \\t]*--[ \\t]*${escapeRegExp(PLANNED_CONTRACT_KEY)}[ \\t]*:[ \\t]*${escapeRegExp(
    PLANNED_CONTRACT_VALUE,
  )}[ \\t]*$`,
  "im",
);

async function collectDbContractIds(dbRoot: string): Promise<CollectedContractIds> {
  const files = await collectDbContractFiles(dbRoot);
  const active = new Set<string>();
  const deferred = new Set<string>();

  for (const file of files) {
    const text = await readSafe(file);
    const planned = PLANNED_DB_CONTRACT_RE.test(text);
    for (const id of extractDeclaredContractIds(text)) {
      const normalized = id.toUpperCase();
      if (DB_CONTRACT_ID_RE.test(normalized)) {
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
 * Lifts the bare extension set out of the project's configured `testFileGlobs`
 * (`tests/**\/*.py` -> `py`). Empty when nothing could be recovered.
 *
 * Exported because the scaffold writer selects its skeleton dialect from the
 * same set (`core/atdd/scaffoldDialect.ts`): the command that PRODUCES ATDD
 * tests and the scan that CONSUMES them must read this config key identically,
 * or the writer emits an extension the scan never opens.
 */
export function deriveTestFileExtensions(testFileGlobs: readonly string[]): Set<string> {
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
  return extensions;
}

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
  const extensions = deriveTestFileExtensions(testFileGlobs);
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

function extractDbContractAnnotations(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.matchAll(cloneGlobal(DB_TEST_ANNOTATION_RE))) {
    const short = match[1];
    if (!short) {
      continue;
    }
    ids.add(`CON-DB-${short}`);
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

/** Records `id -> file` for any contract kind; not API-specific. */
function recordContractRef(refs: Map<string, Set<string>>, id: string, file: string): void {
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
  dbContractIds: Set<string>;
  usRefs: AtddSpecRefs;
  tcRefs: AtddSpecRefs;
  apiRefs: Map<string, Set<string>>;
  dbRefs: Map<string, Set<string>>;
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

  const missingConDb = sortStrings(input.dbContractIds).filter((id) => {
    const matchedFiles = input.dbRefs.get(id);
    return !matchedFiles || matchedFiles.size === 0;
  });

  return {
    us: missingUs.sort((left, right) => left.localeCompare(right)),
    tc: missingTc.sort((left, right) => left.localeCompare(right)),
    conApi: missingConApi.sort((left, right) => left.localeCompare(right)),
    conDb: missingConDb.sort((left, right) => left.localeCompare(right)),
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

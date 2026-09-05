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
import { maskJsNonCode } from "./validators/jsSourceMask.js";

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
/**
 * Extensions whose literals {@link maskTestSource} can blank.
 *
 * The scan walks whatever a project puts under its test roots. A JS lexer over
 * a `.py` or `.rb` file would blank spans by JS's rules, and over-blanking here
 * hides a real annotation — the one failure this must not introduce.
 */
const JS_TEST_EXTENSIONS: ReadonlySet<string> = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

/**
 * A test file's text with its string, template and regex literals blanked.
 *
 * Comments are kept, because an annotation is written in one. Without this the
 * scanner could not tell a reference from an id a fixture holds as DATA — a
 * generator suite, or a self-validating deferral ledger quoting the id it is
 * about — and reported `QFAI-ATDD-101` / `-102` (`error`) against a file that
 * never claimed the reference (#1141).
 *
 * `maskJsNonCode` replaces one character for one, so a match offset and the
 * line a finding names are unchanged.
 */
function maskTestSource(file: string, text: string): string {
  if (!JS_TEST_EXTENSIONS.has(path.extname(file).toLowerCase())) {
    return text;
  }
  return maskJsNonCode(text, { comments: false });
}

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

/**
 * Obligation refs bucketed by ID kind.
 *
 * Shared by the two partitions the coverage result reports: `missing` (owed and
 * referenced nowhere) and `coveredByCarrierOnly` (owed, referenced, but from no
 * carrier that declares a runnable test).
 */
export type AtddObligationRefs = {
  us: string[];
  tc: string[];
  conApi: string[];
  conDb: string[];
};

export type AtddTraceabilityMissing = AtddObligationRefs;

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
  /**
   * Every declared `US-*`, active and deferred alike — the same
   * declared-not-owed distinction the contract sets draw. A deferred story is
   * still a known id, so an E2E test written ahead of its slice must not become
   * a `QFAI-ATDD-101` unknown reference.
   */
  specUsIds: Map<string, Set<string>>;
  /**
   * `US-*` refs excluded from the `QFAI-ATDD-111` obligation because their
   * story declares `- x-qfai-status: planned`, formatted as `SPEC-NNNN:US-…`.
   * Reported at `info` (`QFAI-ATDD-118`) so the deferral stays visible rather
   * than silently shrinking the gate — the same treatment `QFAI-ATDD-114` and
   * `-116` give the two contract kinds.
   *
   * Restricted to specs that owe `QFAI-ATDD-111` at all: under surface typing a
   * non-UI-bearing spec's stories are already outside the E2E gate, so nothing
   * there is deferred by the marker.
   */
  deferredUsIds: string[];
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
   * Owed obligations whose every carrier declares no test a runner collects.
   *
   * Satisfaction is a text match, and the scan deliberately reads past test
   * code so a Gherkin feature or a markdown ledger can carry annotations. The
   * consequence is that a bullet list of IDs discharges `QFAI-ATDD-111` /
   * `-112` / `-113` / `-115` exactly as an executable acceptance test does, and
   * `missing: []` cannot tell the two apart. Reported at `info`
   * (`QFAI-ATDD-119`) and persisted into the summary artifact for the same
   * reason `unitComponentTcIds` is: a coverage scan must never leave "covered
   * by a test" and "covered by an ID written down" indistinguishable.
   *
   * Membership is decided per carrier by {@link hasRunnableTestStructure}, not
   * by extension: markdown never qualifies, a `.feature` with a `Scenario:`
   * does, and a `.test.ts` holding only an annotation comment does not — so
   * renaming the ledger cannot clear the obligation. Skip state is out of
   * scope, so this asserts a test is *declared*, never that it is enabled.
   *
   * Empty whenever `scan.truncated` is set: an executable carrier may sit past
   * the file limit, so the claim is unproven and suppressed rather than guessed.
   */
  coveredByCarrierOnly: AtddObligationRefs;
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
  // Scanned files that declare a test a runner would collect. Filled while the
  // bodies are already in hand, and read only by `buildCarrierOnlyRefs`.
  const executableCarriers = new Set<string>();

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

    // Two readings of the same file, and they must not be the same string.
    // `text` is masked so an id inside a literal is not read as an annotation;
    // the carrier-kind check below needs the RAW body, because it runs its own
    // tokenizer and that one knows a `/.../` after a control header is a regex
    // rather than a division. Handing it the masked text let a blanked span
    // swallow the `it(` beside it and reported a real test as annotation-only.
    const raw = await readSafe(file);
    const text = maskTestSource(file, raw);
    const usAnnotations = extractSpecScopedAnnotations(text, US_TEST_ANNOTATION_RE);
    const tcAnnotations = extractSpecScopedAnnotations(text, TC_TEST_ANNOTATION_RE);
    const apiAnnotations = extractApiContractAnnotations(text);
    const dbAnnotations = extractDbContractAnnotations(text);
    // Only a file that carries an annotation can ever be looked up in
    // `executableCarriers`, so classifying the rest is work with no reader —
    // and the classification tokenizes the whole body, which on a monorepo of
    // twenty thousand test files is the difference between a cheap scan and a
    // CI timeout. Deliberately ordered after the extractions for that reason.
    if (
      (usAnnotations.length > 0 ||
        tcAnnotations.length > 0 ||
        apiAnnotations.length > 0 ||
        dbAnnotations.length > 0) &&
      hasRunnableTestStructure(file, raw)
    ) {
      // `path.normalize`, because that is the key `recordSpecRef` /
      // `recordContractRef` store — fast-glob yields POSIX separators even on
      // Windows, so the raw path would never match the recorded one there.
      executableCarriers.add(path.normalize(file));
    }

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

    for (const contractId of dbAnnotations) {
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

  // Active = declared minus deferred, mirroring the contract collectors:
  // `x-qfai-status: planned` suspends the E2E obligation for that one story, it
  // does not un-declare it.
  const { active: activeUsIds, deferred: deferredUsIds } = partitionDeclaredUs(
    specUsIds,
    specRefs.usPlanned,
    uiBearingSpecs,
  );

  const missing = buildMissingRefs({
    specUsIds: activeUsIds,
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
  // A truncated scan cannot support the negative claim this partition makes.
  // `collectFilesByGlobs` stops at the limit, so the executable test that
  // references the same ID may simply sit past the cut — reporting the
  // obligation as carrier-only would then be a false "nothing runs for this".
  // Suppressed rather than guessed; `scan.truncated` is already warned on by
  // the CLI and persisted into the summary artifact, so a downstream gate reads
  // an indeterminate scan there instead of an empty list it can trust.
  const coveredByCarrierOnly = scanResult.truncated
    ? { us: [], tc: [], conApi: [], conDb: [] }
    : buildCarrierOnlyRefs({
        usRefs,
        usObligationScope: uiBearingSpecs,
        tcRefs,
        apiRefs,
        apiContractIds: activeApiContractIds,
        dbRefs,
        dbContractIds: activeDbContractIds,
        executableCarriers,
      });

  return {
    declaredSpecDirs: specRefs.declaredSpecDirs,
    unitComponentTcIds: unitComponentTc,
    specsRoot,
    testsRoot,
    contractsApiRoot,
    specUsIds,
    deferredUsIds,
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
    coveredByCarrierOnly,
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
    const text = maskTestSource(file, await readSafe(file));
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
  /** `spec -> US-ID` deferred by `- x-qfai-status: planned`; a subset of `us`. */
  usPlanned: Map<string, Set<string>>;
  tc: Map<string, Set<string>>;
  /** `spec -> TC-ID -> declared Level`, lower-cased. Absent when no Level column. */
  tcLevels: Map<string, Map<string, string>>;
  /** Spec number -> the directory enumerated for it. */
  declaredSpecDirs: Map<string, string>;
}> {
  const entries = await collectSpecEntries(specsRoot);
  const us = new Map<string, Set<string>>();
  const usPlanned = new Map<string, Set<string>>();
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

    // Intersected with the declared set, never taken on its own: a marker under
    // a heading no collector recognises as a story would otherwise report a
    // deferral for an id that carries no obligation to defer.
    const plannedUsIds = new Set(
      Array.from(collectPlannedUsIds(usText)).filter((id) => usIds.has(id)),
    );
    if (plannedUsIds.size > 0) {
      usPlanned.set(entry.specNumber, plannedUsIds);
    }
    if (tcIds.size > 0) {
      tc.set(entry.specNumber, tcIds);
    }

    const levels = collectTcLevels(tcText);
    if (levels.size > 0) {
      tcLevels.set(entry.specNumber, levels);
    }
  }

  return { us, usPlanned, tc, tcLevels, declaredSpecDirs };
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

/**
 * Splits the declared `US-*` ids into those that still owe an E2E reference and
 * those a `- x-qfai-status: planned` marker defers.
 *
 * The deferred half is returned as formatted `SPEC-NNNN:US-…` refs — the shape
 * `narrowToScope` filters and the CLI prints — so a `--spec` run reports its own
 * deferrals only, exactly as it does for `QFAI-ATDD-117`.
 *
 * Only a spec inside `usObligationScope` can defer anything. A non-UI-bearing
 * spec's stories are already outside `QFAI-ATDD-111` under surface typing, so
 * reporting them at `QFAI-ATDD-118` would claim an obligation was suspended
 * that never existed — and its remediation would tell the implementer to add an
 * E2E annotation there, the annotation-only E2E that the surface-scope rule
 * exists to prevent.
 */
function partitionDeclaredUs(
  specUsIds: Map<string, Set<string>>,
  plannedBySpec: Map<string, Set<string>>,
  usObligationScope: ReadonlySet<string> | null,
): { active: Map<string, Set<string>>; deferred: string[] } {
  const active = new Map<string, Set<string>>();
  const deferred: string[] = [];
  for (const [spec, ids] of specUsIds.entries()) {
    const planned = plannedBySpec.get(spec);
    const owesE2e = usObligationScope === null || usObligationScope.has(spec);
    if (planned === undefined || planned.size === 0 || !owesE2e) {
      active.set(spec, ids);
      continue;
    }
    const remaining = new Set<string>();
    for (const id of ids) {
      if (planned.has(id)) {
        deferred.push(formatUsRef(spec, id.replace(/^US-/, "")));
      } else {
        remaining.add(id);
      }
    }
    if (remaining.size > 0) {
      active.set(spec, remaining);
    }
  }
  return { active, deferred: deferred.sort((left, right) => left.localeCompare(right)) };
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

/**
 * Heading form of a user story, e.g. `## US-0001-0002: title`.
 *
 * The compound id is admitted as well as the short one: a layered spec pack
 * numbers its stories `US-<spec>-<serial>`, and matching only `US-\d{4}` would
 * leave every real project's stories unable to carry the marker below.
 *
 * Any depth from `##` down is a story heading, because the declaring collector
 * ({@link collectShortIds}) accepts an id at any depth via its loose scan — real
 * packs write `### US-…` far more often than `## US-…`. Recognising only `##`
 * here left those stories unable to defer at all, and in an H2/H3 document it
 * also mis-attributed an H3 story's marker to the preceding H2 story, because
 * the `###` line neither opened a block nor closed the open one.
 */
const US_HEADING_RE = /^#{2,6}\s+(US-\d{4}(?:-\d{4})?)(?:\s*[:：]\s*.*)?$/;

/** Any ATX heading — the block terminator paired with {@link US_HEADING_RE}. */
const ANY_HEADING_RE = /^#{1,6}\s+/;

/** Markdown's bullet list markers, as a regex character class. */
const BULLET_MARKER = "[-*+]";

/** Markdown's ordered list marker — `1.` or `1)`, at its nine-digit ceiling. */
const ORDERED_MARKER = "\\d{1,9}[.)]";

/**
 * Catalog form of a user story, e.g. `- US-0001: summary`.
 *
 * {@link collectShortIds} declares an id from this line too, so a pack whose
 * stories live only in the `## US Catalog` list — no per-story heading — owed
 * `QFAI-ATDD-111` with no way to defer. The id must *open* the item, not merely
 * appear in it: `- Goal: as described in US-0002` is prose about another story,
 * not a declaration of one, and treating it as a block opener would hand the
 * next marker to the wrong id.
 *
 * Every list form Markdown writes opens a block, not just `-` and `*`. The
 * declaring collector is not list-aware at all — its loose scan lifts the id out
 * of `+ US-0001: …` and `1. US-0001: …` exactly as it does out of `- US-0001: …`
 * — so a narrower opener here left a catalog written in either of those forms
 * declared, owed and undeferrable.
 *
 * Group 1 is the prefix (indent, marker, and the whitespace after it), whose
 * width is the item's content column; group 2 is the id.
 */
const US_LIST_ITEM_RE = new RegExp(
  `^([ \\t]*(?:${BULLET_MARKER}|${ORDERED_MARKER})[ \\t]+)(US-\\d{4}(?:-\\d{4})?)[ \\t]*[:：]?`,
);

/**
 * The `x-qfai-status: planned` deferral in user-story meta-line form.
 *
 * The same token both contract kinds use, written as one of the `- Key: value`
 * meta lines a `## US-NNNN` / `### US-NNNN` block already carries (`- Parent:`,
 * `- Goal:`).
 * Matched on its own line only, and attributed to the block it sits in — a
 * marker written once at the top of the document must not be able to defer
 * every story the file declares, which is the nesting mistake
 * {@link isPlannedApiContract} guards against on the contract side.
 *
 * Only the canonical meta line is accepted, because a match silently removes a
 * `QFAI-ATDD-111` error: whitespace after the list marker is required (so the
 * non-list `-x-qfai-status: planned` is not a deferral), and a quoted key or
 * value must carry the *same* quote character at both ends (so neither the
 * unterminated `- x-qfai-status: 'planned` nor a mixed `"…'` pair defers a
 * story). A typo in a meta line has to fail loudly rather than pass as a
 * deferral.
 *
 * The bullet class is the one {@link US_LIST_ITEM_RE} opens catalog entries
 * with, so a pack that writes its lists with `+` can write this line the same
 * way. An ordered marker is deliberately not accepted: a meta line is a bullet
 * in every shipped template, and `1. x-qfai-status: planned` is a numbered step,
 * not a story attribute.
 */
const PLANNED_US_META_LINE_RE = (() => {
  const key = escapeRegExp(PLANNED_CONTRACT_KEY);
  const value = escapeRegExp(PLANNED_CONTRACT_VALUE);
  /** Bare, or wrapped in a matched pair of the same quote character. */
  const quoted = (token: string): string => `(?:"${token}"|'${token}'|${token})`;
  return new RegExp(
    `^[ \\t]*${BULLET_MARKER}[ \\t]+${quoted(key)}[ \\t]*:[ \\t]*${quoted(value)}[ \\t]*$`,
    "i",
  );
})();

/** Markdown's tab stop: a tab advances to the next multiple of four columns. */
const TAB_WIDTH = 4;

/**
 * Column reached after `prefix`, on Markdown's own accounting.
 *
 * A tab advances to the next tab stop rather than a flat four columns, so the
 * content of `-\tUS-0001: …` starts at column 4 and a child line indented with
 * one tab reaches it.
 */
function columnAfter(prefix: string): number {
  let column = 0;
  for (const char of prefix) {
    column += char === "\t" ? TAB_WIDTH - (column % TAB_WIDTH) : 1;
  }
  return column;
}

/** Indent column of a line — where its first non-whitespace character sits. */
function indentColumn(line: string): number {
  return columnAfter(/^[ \t]*/.exec(line)?.[0] ?? "");
}

/**
 * The `US-*` ids a spec pack defers from the `QFAI-ATDD-111` obligation.
 *
 * A story whose acceptance cannot be observed at E2E in this slice had no
 * in-band way to say so: `CON-API-*` and `CON-DB-*` both defer with
 * `x-qfai-status: planned`, while a `US-*` could only be left uncovered (a hard
 * `QFAI-ATDD-111` error), covered by a test asserting nothing, or erased by
 * declaring the whole spec non-user-facing. This is the per-story counterpart.
 *
 * Fenced samples and HTML comments are masked first, on the same terms as
 * {@link collectTcLevels}: an illustrative block showing the marker must not
 * silently drop a real story's obligation.
 *
 * A block opens at either shape {@link collectShortIds} declares an id from — a
 * `##`-or-deeper heading ({@link US_HEADING_RE}) or a catalog list entry
 * ({@link US_LIST_ITEM_RE}) — and closes at the next opener or any heading, so
 * every declared story can carry the marker and none inherits a neighbour's.
 *
 * A catalog entry closes on its Markdown item boundary as well: its block ends
 * at the first non-blank line that does not reach the entry's *content* column —
 * the column its marker plus the whitespace after it ends at, which is where
 * Markdown puts the item's own children. Without that, prose or a blank line
 * after `- US-0001: …` left the entry open to the next heading, and a
 * document-level `- x-qfai-status: planned` written well outside it deferred
 * US-0001 — the very leak the document-root rule closes on the heading side.
 *
 * Comparing against the *marker* column instead would leave a narrower version
 * of the same leak: under a column-0 `- US-0001: …` a one-space-indented
 * ` - x-qfai-status: planned` clears the marker column while falling short of
 * the two columns a child needs, so Markdown reads it as a separate list item
 * and the entry must already be closed by then. The marker has to sit *inside*
 * the entry, indented to its content.
 */
export function collectPlannedUsIds(rawUsText: string): Set<string> {
  const planned = new Set<string>();
  const lines = maskNonSpecRegions(rawUsText).replace(/\r\n/g, "\n").split("\n");
  let current: string | null = null;
  /** Content column of the catalog entry that opened `current`; `null` for a heading. */
  let entryContentColumn: number | null = null;
  const close = (): void => {
    current = null;
    entryContentColumn = null;
  };
  for (const line of lines) {
    const trimmed = line.trim();
    const heading = US_HEADING_RE.exec(trimmed);
    if (heading?.[1]) {
      current = heading[1].toUpperCase();
      entryContentColumn = null;
      continue;
    }
    // Any other heading closes the block, at every depth: the marker belongs to
    // the story it is written under, not to whatever story came before it in
    // the file, and a non-story subsection (`#### Notes`) ends the block too.
    if (ANY_HEADING_RE.test(trimmed)) {
      close();
      continue;
    }
    // A catalog entry opens a block of its own, so the marker reaches a story
    // that has no heading. Checked after the heading arms and before the marker
    // arm: the marker's own line does not open with a `US-*` id, so the two
    // list forms cannot collide.
    // Read from the raw line, not the trimmed one: the entry's own indent is
    // part of the content column its children have to reach.
    const listItem = US_LIST_ITEM_RE.exec(line);
    if (listItem?.[2]) {
      current = listItem[2].toUpperCase();
      entryContentColumn = columnAfter(listItem[1] ?? "");
      continue;
    }
    // Left the catalog entry: a sibling list item, a paragraph, or any other
    // content short of its content column is no longer inside it.
    if (entryContentColumn !== null && trimmed !== "" && indentColumn(line) < entryContentColumn) {
      close();
      continue;
    }
    if (current !== null && PLANNED_US_META_LINE_RE.test(line)) {
      planned.add(current);
      close();
    }
  }
  return planned;
}

/**
 * True when a DB contract declares itself not yet implemented.
 *
 * The counterpart of `isPlannedApiContract`, and deliberately a different rule:
 * the API marker counts at the document root only, while this one counts on any
 * line of the file. Exported so the shipped estimator procedure, which has to
 * describe both forms, can be pinned against the behaviour rather than restate
 * it and drift.
 */
export function isPlannedDbContract(text: string): boolean {
  return PLANNED_DB_CONTRACT_RE.test(text);
}

async function collectDbContractIds(dbRoot: string): Promise<CollectedContractIds> {
  const files = await collectDbContractFiles(dbRoot);
  const active = new Set<string>();
  const deferred = new Set<string>();

  for (const file of files) {
    const text = await readSafe(file);
    const planned = isPlannedDbContract(text);
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
 * The subset of {@link STRUCTURAL_ANNOTATION_EXTENSIONS} that no runner runs.
 *
 * A bare `.md` is prose whatever it contains — a fenced `it(...)` sample in a
 * ledger is documentation, not a suite — so markdown is settled by extension
 * and never inspected further. Every other extension is decided by
 * {@link hasRunnableTestStructure}, because the extension alone cannot say
 * whether anything runs.
 */
const PROSE_CARRIER_EXTENSIONS: ReadonlySet<string> = new Set(["md", "markdown"]);

/**
 * Chain segments that still leave a call declaring a test or a suite.
 *
 * An open `[\w$]+` chain accepted the configuration and hook forms too, and
 * those declare nothing: a Playwright file holding only `test.use(...)`,
 * `test.beforeEach(...)` and `test.describe.configure(...)` collects no test
 * yet read as an executable carrier, which took every obligation in it out of
 * `coveredByCarrierOnly`. Only modifiers a runner still collects through are
 * listed, so `test.describe.serial(` matches and `test.describe.configure(`
 * does not.
 */
const TEST_MODIFIER_SEGMENT =
  "skip|only|todo|fails|failing|concurrent|sequential|serial|parallel|each|for|runIf|skipIf|describe";

/**
 * xUnit / BDD call form with the modifier chains the frameworks allow:
 * `it(`, `test.each(`, `describe.skip(`, `it.concurrent.each(`.
 */
const CALL_FORM_PATTERN = new RegExp(
  `(?:^|[^\\w$.])(?:it|test|describe|context|specify|suite|scenario)(?:\\s*\\.\\s*(?:${TEST_MODIFIER_SEGMENT}))*\\s*\\(`,
);

/**
 * Runners whose entry point is a property, so {@link CALL_FORM_PATTERN} rejects
 * them on the `.` before `test`: Deno's built-in runner and QUnit.
 */
const NAMESPACED_CALL_PATTERN =
  /(?:^|[^\w$.])(?:Deno\s*\.\s*test|QUnit\s*\.\s*(?:test|only|todo|skip))(?:\s*\.\s*(?:only|skip|ignore|each))*\s*\(/;

/**
 * JUnit 5's collectable annotations, listed rather than matched by prefix so a
 * lifecycle or container annotation is not read as a declaration.
 */
const JVM_ANNOTATION_PATTERN =
  /^\s*@(?:Test|ParameterizedTest|RepeatedTest|TestFactory|TestTemplate)\b/m;

/**
 * NUnit / xUnit.net attributes that name a collected case.
 *
 * `[TestFixture]` is deliberately absent: it marks the class, and a fixture
 * holding no case declares nothing a runner collects.
 */
const DOTNET_ATTRIBUTE_PATTERN = /^\s*\[\s*(?:Test|TestCase|TestCaseSource|Fact|Theory)\s*[\]([]/m;

/** Rust's `#[test]`, including the framework-qualified `#[tokio::test]` form. */
const RUST_ATTRIBUTE_PATTERN = /^\s*#\[\s*(?:\w+::)?test\s*\]/m;

/**
 * The `def test...` convention pytest and minitest both collect on.
 *
 * The form stops at the name rather than requiring `(`, because Ruby's
 * parameter list is optional and minitest collects `def test_serves_story` as
 * written; Python, where the parentheses are mandatory, is unaffected.
 */
const DEF_NAMING_PATTERN = /^\s*(?:async\s+)?def\s+test\w*\b/m;

/** PHPUnit's `test*` method convention. */
const PHP_NAMING_PATTERN = /^\s*(?:public\s+)?function\s+test\w*\s*\(/m;

/** The Go names `go test` collects and always runs. */
const GO_NAMING_PATTERN = /^\s*func\s+(?:Test|Benchmark|Fuzz)\w*\s*\(/m;

/**
 * Go's `Example` names, kept apart because the form alone settles nothing.
 *
 * `go doc testing`: an example without an output comment is compiled and never
 * run, so the function on its own declares no test — see
 * {@link GO_OUTPUT_COMMENT_RE}.
 */
const GO_EXAMPLE_PATTERN = /^\s*func\s+Example\w*\s*\(/m;

/**
 * The comment that makes a Go example executable.
 *
 * Read off the raw body, because {@link stripCommentsAndLiterals} blanks it
 * along with every other comment. `go/doc` matches this prefix
 * case-insensitively, so this does too.
 */
const GO_OUTPUT_COMMENT_RE = /^[ \t]*\/\/[ \t]*(?:unordered[ \t]+)?output[ \t]*:/im;

/**
 * The declaration forms each language's runner collects, keyed by extension.
 *
 * An extension is not executability — a `.test.ts` whose whole body is an
 * annotation comment is prose that happens to end in `.ts`, and classifying by
 * extension alone would let a markdown ledger clear the same obligation with
 * the same bytes simply by being renamed. But the extension *is* the language,
 * and a form written for one language reads noise in another: PHPUnit's
 * `function test\w*(` convention matched a plain TypeScript helper named
 * `testData`, which took every obligation in that file out of the partition
 * with no test collected anywhere. Each carrier is therefore read with its own
 * language's forms only. Gherkin has its own set again — see
 * {@link GHERKIN_STRUCTURE_PATTERNS}.
 *
 * Container and lifecycle forms are excluded throughout on the same terms as
 * the hook chains above: an `[TestFixture]` on an otherwise empty class and a
 * `@pytest.mark.integration` on a plain helper declare nothing a runner
 * collects, and pytest's own collection is the `def test\w*` convention anyway.
 *
 * Deliberately blind to skip state — `describe.skip(` matches. The claim these
 * support is "a test is declared here", not "it is enabled" or "it passes": a
 * disabled skeleton is owned by the scaffold placeholder gate, and a green run
 * is owned by the test command itself.
 */
const TEST_PATTERNS_BY_LANGUAGE: readonly (readonly [readonly string[], readonly RegExp[]])[] = [
  [
    ["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"],
    [CALL_FORM_PATTERN, NAMESPACED_CALL_PATTERN],
  ],
  [["py"], [DEF_NAMING_PATTERN]],
  // RSpec declares with the call form, minitest with the naming convention.
  [["rb"], [CALL_FORM_PATTERN, DEF_NAMING_PATTERN]],
  [["go"], [GO_NAMING_PATTERN]],
  // JUnit's annotations, plus the call form Kotest / Spock / ScalaTest use.
  [
    ["java", "kt", "kts", "groovy", "scala"],
    [JVM_ANNOTATION_PATTERN, CALL_FORM_PATTERN],
  ],
  [["cs", "fs", "vb"], [DOTNET_ATTRIBUTE_PATTERN]],
  [["rs"], [RUST_ATTRIBUTE_PATTERN]],
  [["php"], [PHP_NAMING_PATTERN]],
];

const TEST_PATTERNS_BY_EXTENSION: ReadonlyMap<string, readonly RegExp[]> = new Map(
  TEST_PATTERNS_BY_LANGUAGE.flatMap(([extensions, patterns]) =>
    extensions.map((extension): readonly [string, readonly RegExp[]] => [extension, patterns]),
  ),
);

/**
 * Every code form, for a carrier whose extension names no language above.
 *
 * The pre-split reading, kept for the unrecognised case on purpose: over-
 * counting a carrier costs a finding that would not have been raised, while
 * narrowing a language the scan cannot name would report a suite its runner
 * does execute as unwritten. {@link GO_EXAMPLE_PATTERN} stays out — it is the
 * one form that needs a second condition before it means anything.
 */
const EVERY_TEST_PATTERN: readonly RegExp[] = [
  ...new Set(TEST_PATTERNS_BY_LANGUAGE.flatMap(([, patterns]) => patterns)),
];

/** The declaration forms a runner for a carrier of `extension` collects. */
function runnableTestPatterns(extension: string, text: string): readonly RegExp[] {
  const patterns = TEST_PATTERNS_BY_EXTENSION.get(extension) ?? EVERY_TEST_PATTERN;
  if (extension === "go" && GO_OUTPUT_COMMENT_RE.test(text)) {
    return [...patterns, GO_EXAMPLE_PATTERN];
  }
  return patterns;
}

/**
 * The declarations a Gherkin runner collects — the whole of a `.feature`'s say.
 *
 * A feature body is not code, so the code forms above read its prose: an
 * ordinary step such as `Given test(account) is open` matched the xUnit call
 * form, which let a feature holding only a `Background:` count as executable
 * while Cucumber collected nothing from it. A `.feature` is therefore judged on
 * scenario structure alone.
 *
 * `Background:` is deliberately absent — it is the shared preamble those
 * scenarios run, not a scenario a runner collects, so a feature that has only
 * one declares no test.
 *
 * `Scenario Template` is the English dialect's standard alias of
 * `Scenario Outline`, and `Example` of `Scenario`; a feature written with the
 * alias collects exactly the same scenarios.
 */
const GHERKIN_STRUCTURE_PATTERNS: readonly RegExp[] = [
  /^\s*(?:Scenario Outline|Scenario Template|Scenario|Example)\s*:/m,
];

/**
 * A `.feature` written in a Gherkin dialect this scan cannot read English.
 *
 * Cucumber resolves `Scenario:` through the `# language:` header, so a feature
 * declaring `ja` collects `シナリオ:` and matches no English keyword above.
 * Carrying a keyword table for seventy dialects is not this scan's job, so a
 * non-English feature is taken at its word and counted as declaring a test:
 * over-counting one file costs a finding that would not have been raised,
 * while under-counting reports a suite the runner does execute as unwritten.
 */
const LOCALISED_GHERKIN_RE = /^\s*#\s*language\s*:\s*(?!en\s*$)[A-Za-z]/im;

/**
 * Blanks a comment or literal span, keeping its newlines.
 *
 * The patterns above anchor on `^`/`m`, so a span must be replaced with
 * something of the same line shape rather than deleted: collapsing the lines
 * would slide an unrelated declaration up behind a stripped prefix.
 */
/**
 * Removes comments and string literals so a declaration is only read from code.
 *
 * Applying {@link TEST_PATTERNS_BY_LANGUAGE} to the raw body made an
 * annotation-only file executable as soon as it mentioned the shape it lacks:
 * `// TODO: add test("story", ...)` matched the call form, so a ledger renamed
 * to `.test.ts` cleared the obligation with a comment. Comments and literals
 * are therefore blanked first.
 *
 * ## One tokenizer, and what the options are for
 *
 * This used to be a second lexer, local to this file, and #1154 is what that
 * cost: the two disagreed about whether a `/` after a control statement's
 * header opens a regex, and only this one knew that it does. Composing two
 * green branches produced a real miss — a file holding a live `it(` reported as
 * an annotation-only carrier — because the other reader had the older rule.
 * The rule now lives in {@link maskJsNonCode} and there is one of it.
 *
 * The options are not a compromise between the two: they are the language
 * dimension the merge had to keep. This scan walks whatever a project puts
 * under its test roots, so `//` and slash-star are the C family (TS/JS, Java,
 * C#, Go, Rust, Kotlin, Swift, PHP), `#` is the hash family (Python, Ruby,
 * Gherkin) minus Rust's `#[test]` attribute and a shebang, and triple quotes
 * blank a Python docstring whole. The JS-only caller in this file
 * ({@link maskTestSource}) leaves both off, because `#` is not a comment in
 * JavaScript — it opens a private field, and `this.#count` under a hash-comment
 * rule loses the rest of its line.
 *
 * Regex literals are tracked for one reason: a backtick inside one (`/^\s*```/`
 * is real code in this repository) would otherwise open a template literal and
 * blank every line up to the next backtick, taking a genuine declaration with
 * it.
 */
function stripCommentsAndLiterals(text: string): string {
  return maskJsNonCode(text, { hashComments: true, tripleQuoted: true });
}

/** True when `file` is a carrier a runner could execute, judged on its body. */
function hasRunnableTestStructure(file: string, text: string): boolean {
  const extension = path.extname(file).slice(1).toLowerCase();
  if (PROSE_CARRIER_EXTENSIONS.has(extension)) {
    return false;
  }
  if (extension === "feature") {
    // Read off the raw body: the header is a `#` comment, which the tokenizer
    // below blanks along with every other one.
    if (LOCALISED_GHERKIN_RE.test(text)) {
      return true;
    }
    return matchesAny(GHERKIN_STRUCTURE_PATTERNS, text);
  }
  return matchesAny(runnableTestPatterns(extension, text), text);
}

/** True when any of `patterns` matches `text` once its non-code spans are gone. */
function matchesAny(patterns: readonly RegExp[], text: string): boolean {
  const code = stripCommentsAndLiterals(text);
  return patterns.some((pattern) => pattern.test(code));
}

/**
 * True when no recorded carrier for an obligation declares a runnable test.
 *
 * `executableCarriers` holds the scanned files {@link hasRunnableTestStructure}
 * accepted, so an obligation lands here when its every carrier is a prose file
 * or a code-extension file with no test declaration in it.
 */
function isAnnotationOnlyCarrier(
  files: ReadonlySet<string>,
  executableCarriers: ReadonlySet<string>,
): boolean {
  if (files.size === 0) {
    return false;
  }
  for (const file of files) {
    if (executableCarriers.has(file)) {
      return false;
    }
  }
  return true;
}

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

/**
 * The refs no runnable carrier references, bucketed like `missing`.
 *
 * Read off the same `*Refs` maps `buildMissingRefs` reads, so the two
 * partitions cannot drift: an owed obligation is in exactly one of `missing`
 * (no carrier), `coveredByCarrierOnly` (carriers, none of which declares a
 * test), or neither (at least one carrier that does). Only owed obligations are
 * considered — `tcRefs` already holds none for a Unit/Component TC, and the US
 * and contract sets are narrowed to their obligation scope here.
 */
function buildCarrierOnlyRefs(input: {
  usRefs: AtddSpecRefs;
  usObligationScope: ReadonlySet<string> | null;
  tcRefs: AtddSpecRefs;
  apiRefs: Map<string, Set<string>>;
  apiContractIds: Set<string>;
  dbRefs: Map<string, Set<string>>;
  dbContractIds: Set<string>;
  executableCarriers: ReadonlySet<string>;
}): AtddObligationRefs {
  const { executableCarriers } = input;
  return {
    us: carrierOnlySpecRefs(input.usRefs, input.usObligationScope, formatUsRef, executableCarriers),
    tc: carrierOnlySpecRefs(input.tcRefs, null, formatTcRef, executableCarriers),
    conApi: carrierOnlyContractRefs(input.apiRefs, input.apiContractIds, executableCarriers),
    conDb: carrierOnlyContractRefs(input.dbRefs, input.dbContractIds, executableCarriers),
  };
}

function carrierOnlySpecRefs(
  refs: AtddSpecRefs,
  obligationScope: ReadonlySet<string> | null,
  format: (spec: string, id: string) => string,
  executableCarriers: ReadonlySet<string>,
): string[] {
  const carrierOnly: string[] = [];
  for (const [spec, byId] of refs.entries()) {
    if (obligationScope !== null && !obligationScope.has(spec)) {
      continue;
    }
    for (const [id, files] of byId.entries()) {
      if (isAnnotationOnlyCarrier(files, executableCarriers)) {
        carrierOnly.push(format(spec, id.replace(/^(?:US|TC)-/, "")));
      }
    }
  }
  return carrierOnly.sort((left, right) => left.localeCompare(right));
}

function carrierOnlyContractRefs(
  refs: Map<string, Set<string>>,
  owed: Set<string>,
  executableCarriers: ReadonlySet<string>,
): string[] {
  return sortStrings(owed).filter((id) => {
    const files = refs.get(id);
    return files !== undefined && isAnnotationOnlyCarrier(files, executableCarriers);
  });
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

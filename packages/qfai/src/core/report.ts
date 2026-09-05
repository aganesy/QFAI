import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildContractIndex } from "./contractIndex.js";
import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import { collectSpecEntries, type SpecEntry } from "./specLayout.js";
import { collectTddCoverage } from "./reportTddCoverage.js";
import {
  collectDeltaFiles as collectSpecDeltaFiles,
  collectContractFiles,
  collectScenarioFiles,
  collectSpecFiles,
} from "./discovery.js";
import { collectFiles } from "./fs.js";
import { buildSpecScope, isPathInSpecScope, isSpecInScope, type SpecScope } from "./specScope.js";
import { ID_PREFIXES, extractAllIds, extractIds, type IdPrefix } from "./ids.js";
import { normalizeValidationResult } from "./normalize.js";
import { parseSpec } from "./parse/spec.js";
import { parseScenarioDocument } from "./scenarioModel.js";
import { parseFirstMarkdownTable } from "./specPackParsers.js";
import { classifyLayer, classifySize } from "./testStrategyTags.js";
import { toRelativePath } from "./paths.js";
import { PROTOTYPING_JSON_REL } from "./prototyping/paths.js";
import {
  isPlaceholderDeltaMeta,
  normalizeCompat,
  normalizePrimary,
  REQUIRED_DELTA_META_KEYS,
  normalizeTag,
  parseDeltaV1,
  toDeltaMeta,
  type DeltaDecisionEntry,
  type DeltaMeta,
} from "./deltaV1.js";
import {
  loadDecisionGuardrails,
  normalizeDecisionGuardrails,
  sortDecisionGuardrails,
  type GuardrailType,
} from "./decisionGuardrails.js";
import {
  collectScIdSourcesFromScenarioFiles,
  type ScCoverage,
  type TestFileScan,
} from "./traceability.js";
import type {
  Issue,
  ValidationCounts,
  ValidationProfile,
  ValidationResult,
  ValidationWaiverEntry,
  ValidationWaiverSuppressed,
} from "./types.js";
import { validateProject } from "./validate.js";
import { applyWaiversToExtraFindings } from "./waivers.js";
import { resolveToolVersion } from "./version.js";
import { resolvePrimaryPrototypingSpec } from "./prototyping/specResolution.js";

export type ReportSummary = {
  specs: number;
  scenarios: number;
  contracts: {
    api: number;
    ui: number;
    db: number;
    thema: number;
  };
  counts: ValidationCounts;
};

export type ReportIds = {
  spec: string[];
  br: string[];
  sc: string[];
  ac: string[];
  case: string[];
  ui: string[];
  api: string[];
  db: string[];
  thema: string[];
};

export type ReportContractCoverage = {
  total: number;
  referenced: number;
  orphan: number;
  idToSpecs: Record<string, string[]>;
};

export type ReportSpecCoverage = {
  contractRefMissing: number;
  missingRefSpecs: string[];
  specToContracts: Record<string, ReportSpecContractRefs>;
};

export type ReportSpecContractRefs = {
  status: "missing" | "declared";
  ids: string[];
};

export type ReportTraceability = {
  upstreamIdsFound: number;
  referencedInCodeOrTests: boolean;
  sc: ScCoverage;
  scSources: Record<string, string[]>;
  testFiles: TestFileScan;
  contracts: ReportContractCoverage;
  specs: ReportSpecCoverage;
};

export type ReportTestStrategy = {
  totalScenarios: number;
  limit: number;
  /**
   * Where the layer buckets came from.
   *
   * `scenario-tags` is the Gherkin `@layer-*` path, which only exists for the
   * legacy `scenario.feature` layout. On the v1421 layered layout
   * `examplesPath` is the **Markdown** `05_Examples.md`, so the parse failed,
   * the error was swallowed by `continue`, and every bucket printed 0 — while
   * the toolkit mandates layer routing and gates completion on it.
   * `ledger-layer` is the `Layer` column of `tdd/test-list.md`, which is the
   * artifact the shipped templates actually produce.
   */
  layerSource: "scenario-tags" | "ledger-layer" | "none";
  /** Scenario files that failed to parse; reported instead of silently zeroed. */
  unparsedScenarioFiles: string[];
  layer: Record<"unit" | "component" | "integration" | "api" | "e2e" | "none" | "unknown", number>;
  size: Record<"s" | "m" | "l" | "none" | "unknown", number>;
  missing: {
    layer: { total: number; samples: string[]; truncated: boolean };
    size: { total: number; samples: string[]; truncated: boolean };
  };
  e2e: {
    count: number;
    ratio: number;
    maxRatio: number | null;
    maxCount: number | null;
    ratioExceeded: boolean;
    countExceeded: boolean;
  };
};

export type ReportGuardrailItem = {
  id: string;
  type: GuardrailType;
  guardrail: string;
  rationale?: string;
  reconsider?: string;
  related?: string;
  source: { file: string; line: number };
};

export type ReportGuardrails = {
  total: number;
  max: number;
  truncated: boolean;
  byType: { nonGoal: number; notNow: number; tradeOff: number };
  items: ReportGuardrailItem[];
  scanErrors: Array<{ path: string; message: string }>;
};

/** One `### DL-` entry the Change Type counters skipped. */
export type ReportDeltaScanEntry = {
  /**
   * The entry's `### DL-` heading, which is also the id a waiver names in
   * `match.dl_ids`.
   *
   * Suffixed with `#<position>` when the same heading appears twice in one
   * file, so one waiver entry can never cover both: an id that identifies two
   * rows is the over-suppression this key exists to prevent.
   */
  dlId: string;
  /**
   * `unparsed` — no complete `#### Meta` block, so the parser cannot see it.
   * `placeholder` — it parsed but is still the shipped skeleton (see
   * {@link isPlaceholderDeltaMeta}), so counting it would publish a decision
   * nobody made.
   */
  reason: "unparsed" | "placeholder";
};

/** A delta file that holds `### DL-` entries the counters could not use. */
export type ReportDeltaScanGap = {
  /** Root-relative path of the delta file. */
  file: string;
  /**
   * What is wrong with the entries this file could not contribute — the union
   * of {@link uncountedEntries}' own reasons, or `unparsed` when the file holds
   * no `### DL-` entry at all.
   */
  reason: "unparsed" | "placeholder" | "mixed";
  /**
   * `### DL-` entries in this file that reached the counters.
   *
   * Positive means the file is only *partly* uncounted: it was tracked because
   * of the entries beside them, not because the whole file is invisible.
   */
  countedEntries: number;
  /**
   * The `### DL-` entries in this file the counters skipped, in file order.
   *
   * Empty together with `countedEntries: 0` is the empty case — the file holds
   * no `### DL-` entry the parser recognises at all, so there is no row to name
   * and the finding is raised against the file itself.
   *
   * Per entry rather than a count so each one gets its own `QFAI-CTYPE-004`
   * finding carrying its `dl_id`: a single per-file finding lets a
   * `scope.paths` waiver accept one deliberately unfilled entry and silently
   * take every broken — and every future — entry beside it with it.
   */
  uncountedEntries: ReportDeltaScanEntry[];
};

export type ReportChangeTypeSummary = {
  /**
   * How many delta files were opened. `totalEntries: 0` means "nothing parsed"
   * when this is positive and "nothing to parse" when it is zero; without it
   * the two are the same report.
   */
  deltaFilesScanned: number;
  /**
   * The delta files holding at least one entry the counters skipped, one row
   * per file, each carrying its own counted/uncounted entry split.
   *
   * Tracked per entry rather than inferred from `totalEntries === 0` or from
   * "this file counted for nothing". Both coarser tests go quiet on the case
   * that actually under-reports: as soon as one entry in the file is complete,
   * the file looks healthy while the broken entries beside it vanish from the
   * counters and from `QFAI-CTYPE-004` alike.
   */
  uncountedDeltaFiles: ReportDeltaScanGap[];
  totalEntries: number;
  primary: Record<"Initial" | "Behavior" | "Structural" | "Ops" | "unknown", number>;
  tags: Record<"@api" | "@db" | "@nfr" | "@docs" | "@test", number>;
  compat: Record<"Compatibility" | "Improvement" | "Change" | "Bug-for-bug" | "unknown", number>;
};

export type ReportChangeTypeWarning = {
  file: string;
  suspectedMismatch: string;
  suggestion?: string;
  refs: string[];
};

export type ReportRuleFinding = {
  code: string;
  severity: "error" | "warning" | "info";
  file?: string;
  message: string;
  suggestion?: string;
  refs: string[];
};

export type ReportDeltaCoverage = {
  missingUpdateIssues: number;
  /**
   * How many delta files hold decision entries the counters could not use, once
   * the project's waivers have had their say.
   *
   * Part of the coverage verdict, not only of the Markdown prose: a tree whose
   * deltas cannot be counted has no delta coverage, and a dashboard that still
   * says `OK` under it reports a defect as a clean run.
   */
  uncountedDeltaFiles: number;
  status: "ok" | "missing-delta-update" | "delta-not-counted";
};

export type ReportChangeType = {
  summary: ReportChangeTypeSummary;
  ctypeWarnings: ReportChangeTypeWarning[];
  compatFindings: ReportRuleFinding[];
  scopeMismatches: ReportRuleFinding[];
  verificationFindings: ReportRuleFinding[];
  deltaCoverage: ReportDeltaCoverage;
};

export type ReportWaivers = {
  active: ValidationWaiverEntry[];
  suppressed: {
    total: number;
    byWaiver: Record<string, number>;
    byRule: Record<string, number>;
  };
  expired: ReportRuleFinding[];
};

export type ReportTddCoverageSpec = {
  specNumber: string;
  /**
   * Set when the spec's coverage cannot be assessed, naming why.
   *
   * A report is an audit artifact, and `0 done / 0 open` is a claim: it says
   * the spec owes nothing. For a spec whose `06_Test-Cases.md` has no readable
   * `TC-ID` table (`TDDLIST_TC_TABLE_UNRESOLVED`), or whose ledger's first
   * table is missing required columns (`TDDLIST_REQUIRED_COLUMN_MISSING`, on
   * which the validator stops before checking anything else), that claim is
   * unfounded — and printed beside a failing gate it reads as the gate being
   * wrong. The counts are omitted and this is printed instead.
   */
  unassessable?: string;
  /**
   * The counts, present only when {@link unassessable} is absent.
   *
   * Optional rather than zeroed: `report --format json` serializes this
   * object verbatim, so a zero here is a published claim that the spec owes
   * nothing. Omitting them makes the JSON say what the markdown says.
   */
  unitComponentTotal?: number;
  doneCount?: number;
  /** Has a passing test, has not cleared its blocking reviewers / checkpoint. */
  inReviewCount?: number;
  exceptionCount?: number;
  openCount?: number;
  /** Open rows that cannot be started, reported apart from "not started yet". */
  blockedCount?: number;
  missingTcRefs?: string[];
  exceptionRows: Array<{ tddId: string; drId: string }>;
};

export type ReportTddCoverage = {
  specs: ReportTddCoverageSpec[];
};

export type ReportSurfaceClassification = {
  primarySurface: string;
  uiBearing: boolean;
  secondarySurfaces?: string[];
  classificationRationale?: string;
};

export type ReportFullHarnessExecution = {
  // The only supported mode is the single-thread loop.
  mode: "single-thread-loop";
  iterations: number;
  terminationReason: string;
  finalScore: number;
  bestIteration: number;
  renderCaptured: number;
  renderSkipped: number;
  renderFailed: number;
  browserQaPhasesExecuted: number;
  browserQaPhasesSkipped: number;
  browserQaTotalFindings: number;
};

export type ReportRoundLifecycle = {
  iterations: number;
};

export type ReportPrototypingSummary = {
  surfaceClassification?: ReportSurfaceClassification;
  fullHarnessExecution?: ReportFullHarnessExecution;
  roundLifecycle?: ReportRoundLifecycle;
  mode: {
    requested?: string;
    effective: string;
    source: string;
    rationale: string;
    surface: string;
  };
  evidence: {
    specsCoverageStatus: "complete" | "incomplete";
    specsCoverage?: {
      expectedSpecIds: string[];
      observedSpecIds: string[];
      missingSpecIds: string[];
      unexpectedSpecIds: string[];
    };
    runtimeGate: { present: boolean; required: boolean };
    uiFidelity: { present: boolean; required: boolean };
    renderBundle: { present: boolean; required: boolean };
    browserQaBundle: { present: boolean; required: boolean };
    obligationProfile: string;
  };
  fullHarness?: {
    enabled: boolean;
    runId?: string;
    calibrationRef?: {
      configPath: string;
      packPath: string;
      packVersion: string;
    };
    iterationCount?: number;
    bestIteration?: number;
    status?: string;
    terminationReason?: string;
    reviewerId?: string;
    reviewerSignoffStatus?: string;
    scoringTraceCount?: number;
    latestScoredIteration?: number;
    limitations?: string[];
    reviewerLogsCount?: number;
  };
  render?: {
    status?: string;
    requested?: boolean;
    captured: number;
    skipped: number;
    failed: number;
    malformed: boolean;
    inlinePayloadViolation?: boolean;
  };
  browserQa?: {
    status?: string;
    executed?: boolean;
    findingsBySeverity: Record<"error" | "warning" | "info", number>;
    findingsByCategory?: Record<string, number>;
    summaryAggregates?: {
      totalPassed: number;
      totalFailed: number;
    };
    phaseSummary?: Record<
      string,
      {
        status: string;
        findingsCount: number;
        checksCount: number;
        passed?: number;
        failed?: number;
      }
    >;
    modeMismatch?: boolean;
  };
  calibration?: {
    configPresent: boolean;
    thresholdSummary?: {
      accept: number;
      refine: number;
    };
    scoringTraceAvailable: boolean;
    belowThresholdWarning?: boolean;
  };
  warnings: string[];
};

export type ReportData = {
  tool: "qfai";
  version: string;
  generatedAt: string;
  root: string;
  configPath: string;
  /**
   * どの profile の validate 出力から生成したレポートか。
   * 成果物だけを見て profile の取り違えを検出できるようにするための記録で、
   * 入力に profile が無い場合は省略される。
   */
  profile?: ValidationProfile;
  summary: ReportSummary;
  ids: ReportIds;
  traceability: ReportTraceability;
  testStrategy: ReportTestStrategy;
  tddCoverage: ReportTddCoverage;
  prototyping?: ReportPrototypingSummary;
  guardrails: ReportGuardrails;
  changeType: ReportChangeType;
  waivers: ReportWaivers;
  issues: Issue[];
};

const REPORT_GUARDRAILS_MAX = 20;
const REPORT_TEST_STRATEGY_SAMPLE_LIMIT = 20;
const SC_TAG_RE = /^SC-\d{4}-\d{4}$/;

export type CreateReportDataOptions = {
  /**
   * `--spec <id>` values; empty / absent = the whole repo.
   *
   * Scoping the rendered report is not cosmetic. `report --spec 0004` names its
   * output `report.spec-0004.md`, but the body was still assembled from a fresh
   * repo-wide walk, so a slice worker's own report counted every sibling spec —
   * including specs another worker was mid-edit on. The scope narrows the
   * spec-owned inputs (`collectSpecEntries` / `collectSpecFiles` /
   * `collectScenarioFiles` and the delta + ledger walks) to the named specs.
   *
   * Repo-level inputs are deliberately NOT narrowed: contracts, `_policies/**`
   * and the decision guardrails are shared by every spec, and a worker that
   * ignored them would render a report that hid its own violations. This is the
   * same ownership split `isFindingInSpecScope` applies to validate findings.
   */
  specIds?: readonly string[];
};

export async function createReportData(
  root: string,
  validation?: ValidationResult,
  configResult?: ConfigLoadResult,
  options: CreateReportDataOptions = {},
): Promise<ReportData> {
  const resolvedRoot = path.resolve(root);
  const resolved = configResult ?? (await loadConfig(resolvedRoot));
  const config = resolved.config;
  const configPath = resolved.configPath;

  const specsRoot = resolvePath(resolvedRoot, config, "specsDir");
  const contractsRoot = resolvePath(resolvedRoot, config, "contractsDir");
  const apiRoot = path.join(contractsRoot, "api");
  const uiRoot = path.join(contractsRoot, "ui");
  const dbRoot = path.join(contractsRoot, "db");
  const srcRoot = resolvePath(resolvedRoot, config, "srcDir");
  const testsRoot = resolvePath(resolvedRoot, config, "testsDir");

  const specScope = buildSpecScope(options.specIds);
  const scopeRoots = { root: resolvedRoot, specsRoot };
  const specEntries = (await collectSpecEntries(specsRoot)).filter((entry) =>
    isSpecInScope(entry.specNumber, specScope),
  );
  const specFiles = (await collectSpecFiles(specsRoot)).filter((file) =>
    isPathInSpecScope(file, scopeRoots, specScope),
  );
  const scenarioFiles = (await collectScenarioFiles(specsRoot)).filter((file) =>
    isPathInSpecScope(file, scopeRoots, specScope),
  );
  const scenarioCount = await countScenarios(scenarioFiles);
  const testStrategy = await collectTestStrategy(
    scenarioFiles,
    resolvedRoot,
    config,
    REPORT_TEST_STRATEGY_SAMPLE_LIMIT,
    specsRoot,
    specScope,
  );
  const {
    api: apiFiles,
    ui: uiFiles,
    db: dbFiles,
    thema: themaFiles,
  } = await collectContractFiles(uiRoot, apiRoot, dbRoot);
  const contractIndex = await buildContractIndex(resolvedRoot, config);
  const contractIdList = Array.from(contractIndex.ids);
  const specContractRefs = await collectSpecContractRefs(specFiles, contractIdList);
  const referencedContracts = new Set<string>();
  for (const entry of specContractRefs.specToContracts.values()) {
    entry.ids.forEach((id) => referencedContracts.add(id));
  }
  const referencedContractCount = contractIdList.filter((id) => referencedContracts.has(id)).length;
  const orphanContractCount = contractIdList.filter((id) => !referencedContracts.has(id)).length;
  const contractIdToSpecsRecord = mapToSortedRecord(specContractRefs.idToSpecs);
  const specToContractsRecord = mapToSpecContractRecord(specContractRefs.specToContracts);

  const idsByPrefix = await collectIds([
    ...specFiles,
    ...scenarioFiles,
    ...apiFiles,
    ...uiFiles,
    ...dbFiles,
    ...themaFiles,
  ]);

  const upstreamIds = await collectUpstreamIds([...specFiles, ...scenarioFiles]);
  const traceability = await evaluateTraceability(upstreamIds, srcRoot, testsRoot);
  const resolvedValidationRaw =
    validation ??
    (await validateProject(
      resolvedRoot,
      resolved,
      options.specIds && options.specIds.length > 0 ? { specIds: options.specIds } : {},
    ));
  const normalizedValidation = normalizeValidationResult(resolvedRoot, resolvedValidationRaw);
  const scCoverage = normalizedValidation.traceability.sc;
  const testFiles = normalizedValidation.traceability.testFiles;
  const scSources = await collectScIdSourcesFromScenarioFiles(scenarioFiles);
  const scSourceRecord = mapToSortedRecord(normalizeScSources(resolvedRoot, scSources));

  const guardrailsLoad = await loadDecisionGuardrails(resolvedRoot, {
    specsRoot,
  });
  const guardrailsAll = sortDecisionGuardrails(normalizeDecisionGuardrails(guardrailsLoad.entries));
  const guardrailsDisplay = guardrailsAll.slice(0, REPORT_GUARDRAILS_MAX);
  const guardrailsByType = { nonGoal: 0, notNow: 0, tradeOff: 0 };
  for (const item of guardrailsAll) {
    if (item.type === "non-goal") {
      guardrailsByType.nonGoal += 1;
    } else if (item.type === "not-now") {
      guardrailsByType.notNow += 1;
    } else {
      guardrailsByType.tradeOff += 1;
    }
  }
  const guardrailsErrors = guardrailsLoad.errors.map((item) => ({
    path: toRelativePath(resolvedRoot, item.path),
    message: item.message,
  }));
  const scannedChangeTypeSummary = await collectChangeTypeSummary(
    resolvedRoot,
    specsRoot,
    specScope,
  );
  // `validateProject` already ran its waiver pass by the time the report adds
  // findings of its own, so run the same pass over these: a finding appended
  // afterwards could be neither suppressed nor downgraded, and a project that
  // keeps an unfilled delta on purpose would have no way to accept it.
  const deltaScan = await applyWaiversToExtraFindings(
    resolvedRoot,
    buildDeltaScanIssues(scannedChangeTypeSummary.uncountedDeltaFiles),
  );
  const deltaScanGaps = selectUnwaivedDeltaScanGaps(
    scannedChangeTypeSummary.uncountedDeltaFiles,
    deltaScan.issues,
  );
  const changeTypeSummary: ReportChangeTypeSummary = {
    ...scannedChangeTypeSummary,
    uncountedDeltaFiles: deltaScanGaps,
  };
  const reportIssues = [...normalizedValidation.issues, ...deltaScan.issues];
  const reportCounts = addIssueCounts(normalizedValidation.counts, deltaScan.issues);
  const ctypeWarnings = normalizedValidation.issues
    .filter((item) => item.code === "QFAI-CTYPE-002")
    .map((item) => {
      const warning: ReportChangeTypeWarning = {
        file: item.file ? toRelativePath(resolvedRoot, item.file) : "(unknown)",
        suspectedMismatch: item.message,
        refs: item.refs ?? [],
      };
      if (item.suggested_action) {
        warning.suggestion = item.suggested_action;
      }
      return warning;
    });
  const toReportRuleFinding = (item: Issue): ReportRuleFinding => {
    const finding: ReportRuleFinding = {
      code: item.code,
      severity: item.severity,
      message: item.message,
      refs: item.refs ?? [],
    };
    if (item.file) {
      finding.file = toRelativePath(resolvedRoot, item.file);
    }
    if (item.suggested_action) {
      finding.suggestion = item.suggested_action;
    }
    return finding;
  };
  const compatFindings = normalizedValidation.issues
    .filter((item) => /^QFAI-COMPAT-\d+$/.test(item.code))
    .map((item) => toReportRuleFinding(item));
  const scopeMismatches = normalizedValidation.issues
    .filter((item) => item.code === "QFAI-SCOPE-001" || item.code === "QFAI-SCOPE-002")
    .map((item) => toReportRuleFinding(item));
  const verificationFindings = normalizedValidation.issues
    .filter((item) => /^QFAI-VFY-\d+$/.test(item.code))
    .map((item) => toReportRuleFinding(item));
  const missingDeltaUpdateIssues = normalizedValidation.issues.filter(
    (item) => item.code === "QFAI-CTYPE-003",
  ).length;
  const waiverState = normalizedValidation.waivers ?? {
    active: [],
    suppressed: {
      total: 0,
      byWaiver: {},
      byRule: {},
    },
  };
  // Whatever the delta scan's own waiver pass suppressed belongs in the same
  // totals: a suppression the report never reports is a waiver the operator
  // cannot see working.
  const suppressedWaivers = mergeSuppressedWaivers(waiverState.suppressed, deltaScan.suppressed);
  // The waivers that pass loaded belong there too. `validation` can be a stored
  // `validate.json` with no `waivers` block at all, and then the active list is
  // empty while the suppressed total is not — `active 0 / suppressed 1`, naming
  // no waiver for the suppression the same report just performed.
  const activeWaivers = mergeActiveWaivers(waiverState.active, deltaScan.active);
  const expiredWaivers = normalizedValidation.issues
    .filter((item) => item.code === "QFAI-WAIVER-003")
    .map((item) => toReportRuleFinding(item));

  const tddCoverage = await collectTddCoverage(specEntries);
  const prototyping = await collectPrototypingSummary(resolvedRoot, config, specEntries);

  const version = await resolveToolVersion();
  const displayRoot = toRelativePath(resolvedRoot, resolvedRoot);
  const displayConfigPath = toRelativePath(resolvedRoot, configPath);

  return {
    tool: "qfai",
    version,
    generatedAt: new Date().toISOString(),
    root: displayRoot,
    configPath: displayConfigPath,
    ...(normalizedValidation.profile ? { profile: normalizedValidation.profile } : {}),
    summary: {
      specs: specFiles.length,
      scenarios: scenarioCount,
      contracts: {
        api: apiFiles.length,
        ui: uiFiles.length,
        db: dbFiles.length,
        thema: themaFiles.length,
      },
      counts: reportCounts,
    },
    ids: {
      spec: idsByPrefix.SPEC,
      br: idsByPrefix.BR,
      sc: idsByPrefix.SC,
      ac: idsByPrefix.AC,
      case: idsByPrefix.CASE,
      ui: idsByPrefix.UI,
      api: idsByPrefix.API,
      db: idsByPrefix.DB,
      thema: idsByPrefix.THEMA,
    },
    traceability: {
      upstreamIdsFound: upstreamIds.size,
      referencedInCodeOrTests: traceability,
      sc: scCoverage,
      scSources: scSourceRecord,
      testFiles,
      contracts: {
        total: contractIdList.length,
        referenced: referencedContractCount,
        orphan: orphanContractCount,
        idToSpecs: contractIdToSpecsRecord,
      },
      specs: {
        contractRefMissing: specContractRefs.missingRefSpecs.size,
        missingRefSpecs: toSortedArray(specContractRefs.missingRefSpecs),
        specToContracts: specToContractsRecord,
      },
    },
    testStrategy,
    tddCoverage,
    ...(prototyping ? { prototyping } : {}),
    guardrails: {
      total: guardrailsAll.length,
      max: REPORT_GUARDRAILS_MAX,
      truncated: guardrailsAll.length > guardrailsDisplay.length,
      byType: guardrailsByType,
      items: guardrailsDisplay.map((item) => {
        const entry: ReportGuardrailItem = {
          id: item.id,
          type: item.type,
          guardrail: item.guardrail,
          source: {
            file: toRelativePath(resolvedRoot, item.source.file),
            line: item.source.line,
          },
        };
        if (item.rationale) {
          entry.rationale = item.rationale;
        }
        if (item.reconsider) {
          entry.reconsider = item.reconsider;
        }
        if (item.related) {
          entry.related = item.related;
        }
        return entry;
      }),
      scanErrors: guardrailsErrors,
    },
    changeType: {
      summary: changeTypeSummary,
      ctypeWarnings,
      compatFindings,
      scopeMismatches,
      verificationFindings,
      deltaCoverage: {
        missingUpdateIssues: missingDeltaUpdateIssues,
        uncountedDeltaFiles: changeTypeSummary.uncountedDeltaFiles.length,
        status: resolveDeltaCoverageStatus(
          missingDeltaUpdateIssues,
          changeTypeSummary.uncountedDeltaFiles.length,
        ),
      },
    },
    waivers: {
      active: activeWaivers,
      suppressed: {
        total: suppressedWaivers.total,
        byWaiver: Object.fromEntries(
          Object.entries(suppressedWaivers.byWaiver).sort(([a], [b]) => a.localeCompare(b)),
        ),
        byRule: Object.fromEntries(
          Object.entries(suppressedWaivers.byRule).sort(([a], [b]) => a.localeCompare(b)),
        ),
      },
      expired: expiredWaivers,
    },
    issues: reportIssues,
  };
}

/**
 * The rule id for "a delta file was read and counted for nothing".
 *
 * Raised here rather than in `validate.ts` because the delta scan itself lives
 * here: `report` is the only caller of `parseDeltaV1`, and this is the number
 * whose silence the finding is about.
 */
const DELTA_SCAN_ISSUE_CODE = "QFAI-CTYPE-004";

/**
 * Turns each uncounted delta entry into a finding the machine-readable outputs
 * carry.
 *
 * A Markdown NOTE alone leaves `issues`, `summary.counts` and
 * `deltaCoverage.status` untouched, so `report --format json` shows no finding
 * and the Dashboard still prints `fail-on=warning: PASS` — a defect reported as
 * a clean run for every consumer that reads anything but the prose.
 *
 * One finding per `### DL-` entry, each carrying its `dl_id`, so a waiver is
 * scoped to the entry the operator actually accepted. Aggregated per file, a
 * `scope.paths` waiver for one deliberately unfilled entry also cleared every
 * broken entry beside it and every entry added to that file afterwards — and
 * with the whole gap gone the Dashboard read `delta coverage: OK`.
 *
 * A file the parser finds no `### DL-` entry in has no row to name, so it keeps
 * a file-wide finding with no `dl_id`; `waivers.ts#matchesWaiver` lets a
 * `scope.paths` waiver reach exactly those.
 */
function buildDeltaScanIssues(gaps: readonly ReportDeltaScanGap[]): Issue[] {
  const issues: Issue[] = [];
  for (const gap of gaps) {
    if (gap.uncountedEntries.length === 0) {
      issues.push({
        code: DELTA_SCAN_ISSUE_CODE,
        severity: "warning",
        category: "change",
        rule: "CTYPE-004",
        file: gap.file,
        message:
          "delta ファイルから `#### Meta` の 7 キーが揃った `### DL-` entry を 1 件も読み取れないため、Change Type の集計対象になりません。",
        suggested_action: DELTA_SCAN_STRUCTURE_ACTION,
      });
      continue;
    }
    for (const entry of gap.uncountedEntries) {
      issues.push({
        code: DELTA_SCAN_ISSUE_CODE,
        severity: "warning",
        category: "change",
        rule: "CTYPE-004",
        file: gap.file,
        dl_id: entry.dlId,
        message: describeDeltaScanEntry(gap, entry),
        suggested_action: suggestDeltaScanEntryFix(entry),
      });
    }
  }
  return issues;
}

/** Why the skipped entry was skipped, in the finding's own language. */
const DELTA_SCAN_ENTRY_CAUSE: Record<ReportDeltaScanEntry["reason"], string> = {
  unparsed: "`#### Meta` の 7 キーが揃っていない",
  placeholder: "テンプレートの未入力値（date / scope / notes）のまま",
};

/**
 * Names the entry that went uncounted and how much of its file went with it.
 *
 * The surrounding counts are the point: a file with one real decision and three
 * skeletons is not "an unparsable delta", it is a Change Type total that is
 * short by three — and the message has to say so, because nothing else in the
 * report distinguishes the two.
 */
function describeDeltaScanEntry(gap: ReportDeltaScanGap, entry: ReportDeltaScanEntry): string {
  const total = gap.countedEntries + gap.uncountedEntries.length;
  const partial =
    gap.countedEntries > 0
      ? `同じファイルの残り ${gap.countedEntries} 件は集計済みのため、ファイル単位では正常に見えます。`
      : "";
  return `\`### ${entry.dlId}\` は${DELTA_SCAN_ENTRY_CAUSE[entry.reason]}ため、Change Type の集計対象になりません（このファイルの \`### DL-\` entry ${total} 件のうち ${gap.uncountedEntries.length} 件が集計対象外）。${partial}`;
}

const DELTA_SCAN_FILL_ACTION =
  "決定を記録した上で `date` / `scope` / `notes` を実際の値に置き換えてください。まだ決定がないなら、この entry は未記入のままで構いません（この warning は未記入である事実の通知です）。";
const DELTA_SCAN_STRUCTURE_ACTION =
  "`## Decision Log` -> `### DL-NNNN` -> `#### Meta` (id / date / primary / tags / compat / scope / notes) の構造に揃えてください。テンプレート: `assistant/skills/qfai-sdd/templates/specs/spec/09_delta.md`。";

/** How to accept one entry without accepting the rest of its file. */
function describeDeltaScanWaiver(entry: ReportDeltaScanEntry): string {
  return `恒久的に許容するなら \`.qfai/waivers.yml\` に rule: ${DELTA_SCAN_ISSUE_CODE} の waiver を登録し、\`match.dl_ids\` にこの entry の ID (\`${entry.dlId}\`) だけを列挙してください（\`scope.paths\` だけでは同じファイルの他の entry や後から追加される entry まで抑制されるため適用されません）。`;
}

function suggestDeltaScanEntryFix(entry: ReportDeltaScanEntry): string {
  const repair =
    entry.reason === "placeholder" ? DELTA_SCAN_FILL_ACTION : DELTA_SCAN_STRUCTURE_ACTION;
  return `${repair} ${describeDeltaScanWaiver(entry)}`;
}

/**
 * Drops the gaps and the individual entries whose finding a waiver suppressed.
 *
 * Keeping them would leave `delta coverage: NG` and a NOTE naming entries the
 * project has already accepted — a waiver that silences the finding but not the
 * verdict it drives is not a waiver. Per entry, because the findings are: a
 * waiver naming one `dl_id` must leave the uncounted entries beside it standing,
 * gap row and coverage verdict included.
 */
function selectUnwaivedDeltaScanGaps(
  gaps: readonly ReportDeltaScanGap[],
  findings: readonly Issue[],
): ReportDeltaScanGap[] {
  const suppressedFiles = new Set<string>();
  const suppressedEntries = new Set<string>();
  for (const item of findings) {
    if (!item.suppressed) {
      continue;
    }
    const file = item.file ?? "";
    if (item.dl_id === undefined) {
      suppressedFiles.add(file);
    } else {
      suppressedEntries.add(deltaScanEntryKey(file, item.dl_id));
    }
  }
  if (suppressedFiles.size === 0 && suppressedEntries.size === 0) {
    return [...gaps];
  }

  const kept: ReportDeltaScanGap[] = [];
  for (const gap of gaps) {
    if (gap.uncountedEntries.length === 0) {
      if (!suppressedFiles.has(gap.file)) {
        kept.push(gap);
      }
      continue;
    }
    const remaining = gap.uncountedEntries.filter(
      (entry) => !suppressedEntries.has(deltaScanEntryKey(gap.file, entry.dlId)),
    );
    if (remaining.length === 0) {
      continue;
    }
    kept.push({
      ...gap,
      reason: resolveDeltaScanGapReason(remaining),
      uncountedEntries: remaining,
    });
  }
  return kept;
}

/** `dl_id` is unique per file, not per tree, so the file has to be part of the key. */
function deltaScanEntryKey(file: string, dlId: string): string {
  return JSON.stringify([file, dlId]);
}

/**
 * Folds the report's own findings into the validation counts.
 *
 * Severity is read off each finding *after* its waiver pass, and a suppressed
 * one adds nothing — the same arithmetic `validate` does, so a waiver that
 * clears `fail-on=warning` there clears it here too.
 */
function addIssueCounts(base: ValidationCounts, extra: readonly Issue[]): ValidationCounts {
  const counts: ValidationCounts = {
    info: base.info,
    warning: base.warning,
    error: base.error,
  };
  for (const item of extra) {
    if (item.suppressed) {
      continue;
    }
    counts[item.severity] += 1;
  }
  return counts;
}

/**
 * Unions the two waiver passes' active lists, keyed by waiver id.
 *
 * Both passes read the same `.qfai/waivers.yml`, so in the common case the
 * extra pass returns waivers the validation result already listed and the dedup
 * is the whole job. It is not redundant, though: a `ValidationResult` handed in
 * from outside — a stored `validate.json` written before waivers were reported —
 * carries no active list, and dropping the extra pass's would publish
 * suppressions attributed to no waiver at all.
 *
 * The validation pass wins a collision: it is the run whose findings the rest of
 * the report is built from.
 */
function mergeActiveWaivers(
  base: readonly ValidationWaiverEntry[],
  extra: readonly ValidationWaiverEntry[],
): ValidationWaiverEntry[] {
  const byId = new Map<string, ValidationWaiverEntry>();
  for (const waiver of [...extra, ...base]) {
    byId.set(waiver.id, waiver);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function mergeSuppressedWaivers(
  base: ValidationWaiverSuppressed,
  extra: ValidationWaiverSuppressed,
): ValidationWaiverSuppressed {
  if (extra.total === 0) {
    return base;
  }
  return {
    total: base.total + extra.total,
    byWaiver: addNumericRecords(base.byWaiver, extra.byWaiver),
    byRule: addNumericRecords(base.byRule, extra.byRule),
  };
}

function addNumericRecords(
  base: Record<string, number>,
  extra: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
}

function resolveDeltaCoverageStatus(
  missingUpdateIssues: number,
  uncountedDeltaFiles: number,
): ReportDeltaCoverage["status"] {
  if (missingUpdateIssues > 0) {
    return "missing-delta-update";
  }
  return uncountedDeltaFiles > 0 ? "delta-not-counted" : "ok";
}

type ReportMarkdownOptions = {
  baseUrl?: string;
};

export function formatReportMarkdown(
  data: ReportData,
  options: ReportMarkdownOptions = {},
): string {
  const lines: string[] = [];
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  lines.push("# QFAI Report");
  lines.push("");
  lines.push(`- 生成日時: ${data.generatedAt}`);
  lines.push(`- ルート: ${formatPathLink(data.root, baseUrl)}`);
  lines.push(`- 設定: ${formatPathLink(data.configPath, baseUrl)}`);
  lines.push(`- 版: ${data.version}`);
  if (data.profile) {
    lines.push(`- profile: ${data.profile}`);
  }
  lines.push("");

  const severityOrder: Record<string, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  const categoryOrder: Record<string, number> = {
    canonical: 0,
    change: 1,
  };

  const issuesByCategory = {
    canonical: [] as Issue[],
    change: [] as Issue[],
  };
  for (const issue of data.issues) {
    const cat = issue.category;
    if (cat === "change") {
      issuesByCategory.change.push(issue);
    } else {
      issuesByCategory.canonical.push(issue);
    }
  }

  const countIssuesBySeverity = (issues: Issue[]): ValidationCounts =>
    issues.reduce<ValidationCounts>(
      (acc, i) => {
        if (i.suppressed) {
          return acc;
        }
        acc[i.severity] += 1;
        return acc;
      },
      { info: 0, warning: 0, error: 0 },
    );
  const countFindingsBySeverity = (findings: ReportRuleFinding[]): ValidationCounts =>
    findings.reduce<ValidationCounts>(
      (acc, finding) => {
        acc[finding.severity] += 1;
        return acc;
      },
      { info: 0, warning: 0, error: 0 },
    );

  const canonicalCounts = countIssuesBySeverity(issuesByCategory.canonical);
  const changeCounts = countIssuesBySeverity(issuesByCategory.change);
  const compatFindingCounts = countFindingsBySeverity(data.changeType.compatFindings);
  const scopeMismatchCounts = countFindingsBySeverity(data.changeType.scopeMismatches);
  const verificationFindingCounts = countFindingsBySeverity(data.changeType.verificationFindings);

  lines.push("## Dashboard");
  lines.push("");

  lines.push("### Summary");
  lines.push("");
  lines.push(`- specs: ${data.summary.specs}`);
  lines.push(`- scenarios: ${data.summary.scenarios}`);
  lines.push(
    `- contracts: api ${data.summary.contracts.api} / ui ${data.summary.contracts.ui} / db ${data.summary.contracts.db} / thema ${data.summary.contracts.thema}`,
  );
  lines.push(
    `- issues(total): info ${data.summary.counts.info} / warning ${data.summary.counts.warning} / error ${data.summary.counts.error}`,
  );
  lines.push(
    `- issues(canonical): info ${canonicalCounts.info} / warning ${canonicalCounts.warning} / error ${canonicalCounts.error}`,
  );
  lines.push(
    `- issues(change): info ${changeCounts.info} / warning ${changeCounts.warning} / error ${changeCounts.error}`,
  );
  lines.push(
    `- compat findings: info ${compatFindingCounts.info} / warning ${compatFindingCounts.warning} / error ${compatFindingCounts.error}`,
  );
  lines.push(
    `- scope mismatch: warning ${scopeMismatchCounts.warning} / info ${scopeMismatchCounts.info}`,
  );
  lines.push(
    `- verification findings: info ${verificationFindingCounts.info} / warning ${verificationFindingCounts.warning} / error ${verificationFindingCounts.error}`,
  );
  lines.push(
    `- delta coverage: ${data.changeType.deltaCoverage.status === "ok" ? "OK" : "NG"} (missing update issues: ${data.changeType.deltaCoverage.missingUpdateIssues} / uncounted delta files: ${data.changeType.deltaCoverage.uncountedDeltaFiles})`,
  );
  lines.push(
    `- waivers: active ${data.waivers.active.length} / suppressed ${data.waivers.suppressed.total} / expired ${data.waivers.expired.length}`,
  );
  lines.push(`- fail-on=error: ${data.summary.counts.error > 0 ? "FAIL" : "PASS"}`);
  lines.push(
    `- fail-on=warning: ${data.summary.counts.error + data.summary.counts.warning > 0 ? "FAIL" : "PASS"}`,
  );
  lines.push("");

  lines.push("### Next Actions");
  lines.push("");
  if (data.summary.counts.error > 0) {
    lines.push(
      "- error があるため、まず `qfai validate --fail-on error` を通るまで修正してください。",
    );
    lines.push(
      "- 次の手順: `qfai doctor --fail-on error` → `qfai validate --fail-on error` → `qfai report`",
    );
  } else if (data.summary.counts.warning > 0) {
    lines.push("- warning の扱いはチーム判断です。`--fail-on warning` 運用なら修正してください。");
    lines.push(
      "- 次の手順: `qfai doctor --fail-on error` → `qfai validate --fail-on error` → `qfai report`",
    );
  } else {
    lines.push("- issue はありません。運用テンプレに沿って継続してください。");
    lines.push("- 次の手順: `qfai doctor` → `qfai validate` → `qfai report`（定期的に実行）");
  }
  lines.push("");

  lines.push("### Index");
  lines.push("");
  lines.push("- [Canonical Issues](#canonical-issues)");
  lines.push("- [Change Issues](#change-issues)");
  lines.push("- [Design Audit Findings](#design-audit-findings)");
  lines.push("- [Slop Guardrails Findings](#slop-guardrails-findings)");
  lines.push("- [Change Type](#change-type)");
  lines.push("- [Waivers](#waivers)");
  lines.push("- [Decision Guardrails](#decision-guardrails)");
  lines.push("- [IDs](#ids)");
  lines.push("- [Traceability](#traceability)");
  lines.push("- [Test Strategy](#test-strategy)");
  lines.push("- [TDD Coverage](#tdd-coverage)");
  lines.push("- [Prototyping](#prototyping)");
  lines.push("- [Contract Coverage](#contract-coverage)");
  lines.push("- [SC Coverage](#sc-coverage)");
  lines.push("- [SC → Referenced Tests](#sc--referenced-tests)");
  lines.push("- [Duplicate SC IDs](#duplicate-sc-ids)");
  lines.push("- [Hotspots](#hotspots)");
  lines.push("");

  const formatIssueSummaryTable = (issues: Issue[]): string[] => {
    const issueKeyToCount = new Map<
      string,
      { category: string; severity: string; code: string; count: number }
    >();
    for (const issue of issues) {
      if (issue.suppressed) {
        continue;
      }
      const key = `${issue.category}|${issue.severity}|${issue.code}`;
      const current = issueKeyToCount.get(key);
      if (current) {
        current.count += 1;
        continue;
      }
      issueKeyToCount.set(key, {
        category: issue.category,
        severity: issue.severity,
        code: issue.code,
        count: 1,
      });
    }
    const rows = Array.from(issueKeyToCount.values())
      .sort((a, b) => {
        const ca = categoryOrder[a.category] ?? 999;
        const cb = categoryOrder[b.category] ?? 999;
        if (ca !== cb) return ca - cb;
        const sa = severityOrder[a.severity] ?? 999;
        const sb = severityOrder[b.severity] ?? 999;
        if (sa !== sb) return sa - sb;
        return a.code.localeCompare(b.code);
      })
      .map((x) => [x.severity, x.code, String(x.count)]);
    return rows.length === 0
      ? ["- (none)"]
      : formatMarkdownTable(["Severity", "Code", "Count"], rows);
  };

  const formatIssueCards = (issues: Issue[]): string[] => {
    const sorted = [...issues].sort((a, b) => {
      const sa = severityOrder[a.severity] ?? 999;
      const sb = severityOrder[b.severity] ?? 999;
      if (sa !== sb) return sa - sb;
      const code = a.code.localeCompare(b.code);
      if (code !== 0) return code;
      const fileA = a.file ?? "";
      const fileB = b.file ?? "";
      const file = fileA.localeCompare(fileB);
      if (file !== 0) return file;
      const lineA = a.loc?.line ?? 0;
      const lineB = b.loc?.line ?? 0;
      return lineA - lineB;
    });

    if (sorted.length === 0) {
      return ["- (none)"];
    }

    const out: string[] = [];
    for (const item of sorted) {
      const suppressedLabel = item.suppressed ? " [suppressed=true]" : "";
      out.push(
        `#### ${item.severity.toUpperCase()} [${item.code}] ${item.message}${suppressedLabel}`,
      );
      if (item.file) {
        out.push(`- file: ${formatPathWithLine(item.file, item.loc, baseUrl)}`);
      }
      if (item.rule) {
        out.push(`- rule: ${item.rule}`);
      }
      if (item.refs && item.refs.length > 0) {
        out.push(`- refs: ${item.refs.join(", ")}`);
      }
      if (item.suggested_action) {
        out.push("- suggested_action:");
        // suggested_action is typed as `string | undefined`; the truthiness check above
        // guarantees it is a string. Input shape is validated at the report --in boundary.
        const actionLines = item.suggested_action.split("\n");
        for (const line of actionLines) {
          out.push(`  ${line}`);
        }
      }
      out.push("");
    }
    return out;
  };

  const formatRuleFindings = (findings: ReportRuleFinding[]): string[] => {
    if (findings.length === 0) {
      return ["- (none)"];
    }
    const sorted = [...findings].sort((a, b) => {
      const sa = severityOrder[a.severity] ?? 999;
      const sb = severityOrder[b.severity] ?? 999;
      if (sa !== sb) return sa - sb;
      const code = a.code.localeCompare(b.code);
      if (code !== 0) return code;
      return (a.file ?? "").localeCompare(b.file ?? "");
    });
    const out: string[] = [];
    for (const item of sorted) {
      const fileLabel = item.file ? formatPathLink(item.file, baseUrl) : "(unknown)";
      out.push(`- [${item.severity.toUpperCase()}][${item.code}] ${fileLabel} -> ${item.message}`);
      if (item.suggestion) {
        out.push(`  suggestion: ${item.suggestion}`);
      }
      if (item.refs.length > 0) {
        out.push(`  refs: ${item.refs.join(", ")}`);
      }
    }
    return out;
  };

  const formatWaiverMatch = (waiver: ValidationWaiverEntry): string => {
    // scope.paths is guaranteed non-null by ValidationWaiverEntry type;
    // input shape is validated at the report --in boundary.
    const scopePaths =
      waiver.scope.paths.length > 0 ? waiver.scope.paths : (waiver.match?.paths ?? []);
    const parts: string[] = [];
    if (scopePaths.length > 0) {
      parts.push(`paths=${scopePaths.join(",")}`);
    }
    if (waiver.match?.dl_ids && waiver.match.dl_ids.length > 0) {
      parts.push(`dl_ids=${waiver.match.dl_ids.join(",")}`);
    }
    return parts.length > 0 ? parts.join(" | ") : "(none)";
  };

  const formatSuppressedCount = (record: Record<string, number>): string[] => {
    const rows = Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
    if (rows.length === 0) {
      return ["- (none)"];
    }
    return rows.map(([key, count]) => `- ${key}: ${count}`);
  };

  lines.push("## Canonical Issues");
  lines.push("");
  lines.push("### Summary");
  lines.push("");
  lines.push(...formatIssueSummaryTable(issuesByCategory.canonical));
  lines.push("");
  lines.push("### Issues");
  lines.push("");
  lines.push(...formatIssueCards(issuesByCategory.canonical));

  lines.push("## Change Issues");
  lines.push("");
  lines.push("### Summary");
  lines.push("");
  lines.push(...formatIssueSummaryTable(issuesByCategory.change));
  lines.push("");
  lines.push("### Issues");
  lines.push("");
  lines.push(...formatIssueCards(issuesByCategory.change));

  // Design Audit Findings (conditional — only when QFAI-AUD-* issues exist)
  const auditIssues = data.issues.filter((i) => /^QFAI-AUD-/.test(i.code));
  if (auditIssues.length > 0) {
    lines.push("## Design Audit Findings");
    lines.push("");
    const byDimension = new Map<string, Issue[]>();
    for (const iss of auditIssues) {
      const dim = iss.rule?.replace(/^audit\./, "").split(".")[0] ?? "unknown";
      const group = byDimension.get(dim) ?? [];
      group.push(iss);
      byDimension.set(dim, group);
    }
    for (const [dim, dimIssues] of byDimension) {
      lines.push(`### ${dim}`);
      lines.push("");
      for (const iss of dimIssues) {
        lines.push(`- **${iss.severity.toUpperCase()}** [${iss.code}] ${iss.message}`);
      }
      lines.push("");
    }
  }

  // Slop Guardrails Findings (conditional — only when SLP-* issues exist)
  const slopIssues = data.issues.filter((i) => /^SLP-/.test(i.code));
  if (slopIssues.length > 0) {
    lines.push("## Slop Guardrails Findings");
    lines.push("");
    const byCategory = new Map<string, Issue[]>();
    for (const iss of slopIssues) {
      const cat = iss.rule?.replace(/^slop\./, "").split(".")[0] ?? "unknown";
      const group = byCategory.get(cat) ?? [];
      group.push(iss);
      byCategory.set(cat, group);
    }
    for (const [cat, catIssues] of byCategory) {
      lines.push(`### ${cat}`);
      lines.push("");
      for (const iss of catIssues) {
        lines.push(`- **${iss.severity.toUpperCase()}** [${iss.code}] ${iss.message}`);
      }
      lines.push("");
    }
  }

  lines.push("## Change Type");
  lines.push("");
  lines.push("### Summary");
  lines.push("");
  lines.push(...formatDeltaScanLines(data.changeType.summary, baseUrl));
  lines.push(
    `- primary: Initial ${data.changeType.summary.primary.Initial} / Behavior ${data.changeType.summary.primary.Behavior} / Structural ${data.changeType.summary.primary.Structural} / Ops ${data.changeType.summary.primary.Ops} / unknown ${data.changeType.summary.primary.unknown}`,
  );
  lines.push(
    `- tags: @api ${data.changeType.summary.tags["@api"]} / @db ${data.changeType.summary.tags["@db"]} / @nfr ${data.changeType.summary.tags["@nfr"]} / @docs ${data.changeType.summary.tags["@docs"]} / @test ${data.changeType.summary.tags["@test"]}`,
  );
  lines.push(
    `- compat: Compatibility ${data.changeType.summary.compat.Compatibility} / Improvement ${data.changeType.summary.compat.Improvement} / Change ${data.changeType.summary.compat.Change} / Bug-for-bug ${data.changeType.summary.compat["Bug-for-bug"]} / unknown ${data.changeType.summary.compat.unknown}`,
  );
  lines.push(
    `- compat findings: info ${compatFindingCounts.info} / warning ${compatFindingCounts.warning} / error ${compatFindingCounts.error}`,
  );
  lines.push(
    `- scope mismatch: warning ${scopeMismatchCounts.warning} / info ${scopeMismatchCounts.info}`,
  );
  lines.push(
    `- verification findings: info ${verificationFindingCounts.info} / warning ${verificationFindingCounts.warning} / error ${verificationFindingCounts.error}`,
  );
  lines.push(
    `- delta coverage: ${data.changeType.deltaCoverage.status} (issues=${data.changeType.deltaCoverage.missingUpdateIssues}, uncounted=${data.changeType.deltaCoverage.uncountedDeltaFiles})`,
  );
  lines.push("");

  lines.push("### CTYPE-002 warnings");
  lines.push("");
  if (data.changeType.ctypeWarnings.length === 0) {
    lines.push("- (none)");
  } else {
    for (const warning of data.changeType.ctypeWarnings) {
      lines.push(
        `- ${formatPathLink(warning.file, baseUrl)} -> ${warning.suspectedMismatch} -> ${warning.suggestion ?? "(no suggestion)"}`,
      );
      if (warning.refs.length > 0) {
        lines.push(`  refs: ${warning.refs.join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("### COMPAT findings");
  lines.push("");
  lines.push(...formatRuleFindings(data.changeType.compatFindings));
  lines.push("");

  lines.push("### Scope mismatch");
  lines.push("");
  lines.push(...formatRuleFindings(data.changeType.scopeMismatches));
  lines.push("");

  lines.push("### Verification findings");
  lines.push("");
  lines.push(...formatRuleFindings(data.changeType.verificationFindings));
  lines.push("");

  lines.push("## Waivers");
  lines.push("");

  lines.push("### Expired Waivers");
  lines.push("");
  lines.push(...formatRuleFindings(data.waivers.expired));
  lines.push("");

  lines.push("### Active Waivers");
  lines.push("");
  if (data.waivers.active.length === 0) {
    lines.push("- (none)");
  } else {
    for (const waiver of data.waivers.active) {
      const rule = waiver.rule || waiver.rule_id || "(unknown)";
      const expires = waiver.expires || waiver.expires_on || "(unknown)";
      const downgrade =
        waiver.action === "downgrade" ? ` -> ${waiver.downgrade_to ?? "(unset)"}` : "";
      lines.push(
        `- [${waiver.id}] rule=${rule} action=${waiver.action}${downgrade} expires=${expires}`,
      );
      lines.push(`  scope: ${formatWaiverMatch(waiver)}`);
      lines.push(`  reason: ${waiver.reason}`);
      lines.push(`  evidence: ${waiver.evidence || "(none)"}`);
      if (waiver.owner) {
        lines.push(`  owner: ${waiver.owner}`);
      }
    }
  }
  lines.push("");

  lines.push("### Suppressed Summary");
  lines.push("");
  lines.push(`- total: ${data.waivers.suppressed.total}`);
  lines.push("");
  lines.push("#### By waiver");
  lines.push("");
  lines.push(...formatSuppressedCount(data.waivers.suppressed.byWaiver));
  lines.push("");
  lines.push("#### By rule");
  lines.push("");
  lines.push(...formatSuppressedCount(data.waivers.suppressed.byRule));
  lines.push("");

  lines.push("## Decision Guardrails");
  lines.push("");
  lines.push(`- total: ${data.guardrails.total}`);
  lines.push(
    `- types: non-goal ${data.guardrails.byType.nonGoal} / not-now ${data.guardrails.byType.notNow} / trade-off ${data.guardrails.byType.tradeOff}`,
  );
  if (data.guardrails.truncated) {
    lines.push(`- truncated: true (max=${data.guardrails.max})`);
  }
  if (data.guardrails.scanErrors.length > 0) {
    lines.push(`- scanErrors: ${data.guardrails.scanErrors.length}`);
  }
  lines.push("");
  if (data.guardrails.items.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of data.guardrails.items) {
      lines.push(`- [${item.id}][${item.type}] ${item.guardrail}`);
      lines.push(
        `  - source: ${formatPathWithLine(item.source.file, { line: item.source.line }, baseUrl)}`,
      );
      if (item.rationale) {
        lines.push(`  - Rationale: ${item.rationale}`);
      }
      if (item.reconsider) {
        lines.push(`  - Reconsider: ${item.reconsider}`);
      }
      if (item.related) {
        lines.push(`  - Related: ${item.related}`);
      }
    }
  }
  if (data.guardrails.scanErrors.length > 0) {
    lines.push("");
    lines.push("### Scan errors");
    lines.push("");
    for (const errorItem of data.guardrails.scanErrors) {
      lines.push(`- ${formatPathLink(errorItem.path, baseUrl)}: ${errorItem.message}`);
    }
  }
  lines.push("");

  lines.push("## IDs");
  lines.push("");
  lines.push(formatIdLine("SPEC", data.ids.spec));
  lines.push(formatIdLine("BR", data.ids.br));
  lines.push(formatIdLine("SC", data.ids.sc));
  lines.push(formatIdLine("AC", data.ids.ac));
  lines.push(formatIdLine("CASE", data.ids.case));
  lines.push(formatIdLine("UI", data.ids.ui));
  lines.push(formatIdLine("API", data.ids.api));
  lines.push(formatIdLine("DB", data.ids.db));
  lines.push(formatIdLine("THEMA", data.ids.thema));
  lines.push("");

  lines.push("## Traceability");
  lines.push("");
  lines.push(`- 上流ID検出数: ${data.traceability.upstreamIdsFound}`);
  lines.push(`- コード/テスト参照: ${data.traceability.referencedInCodeOrTests ? "あり" : "なし"}`);
  lines.push("");

  lines.push("## Test Strategy");
  lines.push("");

  lines.push("### Layer distribution");
  lines.push("");
  lines.push(
    `- unit: ${data.testStrategy.layer.unit} / component: ${data.testStrategy.layer.component} / integration: ${data.testStrategy.layer.integration} / api: ${data.testStrategy.layer.api} / e2e: ${data.testStrategy.layer.e2e} / none: ${data.testStrategy.layer.none} / unknown: ${data.testStrategy.layer.unknown}`,
  );
  lines.push("");
  lines.push(`- source: ${describeLayerSource(data.testStrategy.layerSource)}`);
  if (data.testStrategy.unparsedScenarioFiles.length > 0) {
    lines.push(
      `- unparsed scenario files (excluded from the counts above): ${data.testStrategy.unparsedScenarioFiles.join(", ")}`,
    );
  }
  lines.push("");

  lines.push("### Size distribution");
  lines.push("");
  lines.push(
    `- s: ${data.testStrategy.size.s} / m: ${data.testStrategy.size.m} / l: ${data.testStrategy.size.l} / none: ${data.testStrategy.size.none} / unknown: ${data.testStrategy.size.unknown}`,
  );
  lines.push("");

  const e2eHeading =
    data.testStrategy.e2e.ratioExceeded || data.testStrategy.e2e.countExceeded
      ? "### E2E guardrails (warning)"
      : "### E2E guardrails";
  lines.push(e2eHeading);
  lines.push("");
  lines.push(
    `- e2e: ${data.testStrategy.e2e.count} / ${data.testStrategy.totalScenarios} (ratio=${formatPercent(data.testStrategy.e2e.ratio)})`,
  );
  lines.push(`- maxRatio: ${formatOptionalPercent(data.testStrategy.e2e.maxRatio)}`);
  lines.push(`- maxCount: ${formatOptionalNumber(data.testStrategy.e2e.maxCount)}`);
  if (data.testStrategy.e2e.ratioExceeded || data.testStrategy.e2e.countExceeded) {
    if (data.testStrategy.e2e.ratioExceeded) {
      lines.push("- warning: layer-e2e の比率が上限を超過しています。");
    }
    if (data.testStrategy.e2e.countExceeded) {
      lines.push("- warning: layer-e2e の件数が上限を超過しています。");
    }
  }
  lines.push("");

  lines.push("### Missing layer tags");
  lines.push("");
  lines.push(
    `- total: ${data.testStrategy.missing.layer.total} (limit=${data.testStrategy.limit})`,
  );
  if (data.testStrategy.missing.layer.samples.length === 0) {
    lines.push("- (none)");
  } else {
    for (const sample of data.testStrategy.missing.layer.samples) {
      lines.push(`- ${sample}`);
    }
  }
  if (data.testStrategy.missing.layer.truncated) {
    lines.push(`- truncated: true (limit=${data.testStrategy.limit})`);
  }
  lines.push("");

  lines.push("### Missing size tags");
  lines.push("");
  lines.push(`- total: ${data.testStrategy.missing.size.total} (limit=${data.testStrategy.limit})`);
  if (data.testStrategy.missing.size.samples.length === 0) {
    lines.push("- (none)");
  } else {
    for (const sample of data.testStrategy.missing.size.samples) {
      lines.push(`- ${sample}`);
    }
  }
  if (data.testStrategy.missing.size.truncated) {
    lines.push(`- truncated: true (limit=${data.testStrategy.limit})`);
  }
  lines.push("");

  lines.push("## TDD Coverage");
  lines.push("");
  if (data.tddCoverage.specs.length === 0) {
    lines.push("- (no specs with unit/component TCs)");
  } else {
    for (const spec of data.tddCoverage.specs) {
      lines.push(`### spec-${spec.specNumber}`);
      lines.push("");
      if (spec.unassessable !== undefined) {
        lines.push(`- coverage cannot be assessed: ${spec.unassessable}`);
        // The parked rows are still printed below when the ledger was readable
        // enough to find them — an unapproved `exception` is exactly what an
        // auditor needs to see, and it does not depend on the coverage set.
        if (spec.exceptionRows.length > 0) {
          lines.push("- exception rows:");
          for (const row of spec.exceptionRows) {
            lines.push(`  - ${row.tddId}: DR-ID=${row.drId || "(empty)"}`);
          }
        }
        lines.push("");
        continue;
      }
      lines.push(`- coverage-target TCs: ${spec.unitComponentTotal}`);
      lines.push(
        `- done: ${spec.doneCount} / in-review: ${spec.inReviewCount} / exception: ${spec.exceptionCount} / open: ${spec.openCount} (blocked: ${spec.blockedCount})`,
      );
      const missingTcRefs = spec.missingTcRefs ?? [];
      if (missingTcRefs.length > 0) {
        lines.push(`- missing TC refs (add to test-list.md): ${missingTcRefs.join(", ")}`);
      }
      if (spec.exceptionRows.length > 0) {
        lines.push("- exception rows:");
        for (const row of spec.exceptionRows) {
          lines.push(`  - ${row.tddId}: DR-ID=${row.drId || "(empty)"}`);
        }
      }
      lines.push("");
    }
  }
  lines.push("");

  lines.push("## Prototyping");
  lines.push("");
  if (!data.prototyping) {
    lines.push("- (none)");
  } else {
    // WS-F: Surface classification summary
    if (data.prototyping.surfaceClassification) {
      lines.push("### prototyping.surfaceClassification");
      lines.push("");
      lines.push(`- primary surface: ${data.prototyping.surfaceClassification.primarySurface}`);
      lines.push(`- UI-bearing: ${data.prototyping.surfaceClassification.uiBearing}`);
      if (data.prototyping.surfaceClassification.secondarySurfaces?.length) {
        lines.push(
          `- secondary surfaces: ${data.prototyping.surfaceClassification.secondarySurfaces.join(", ")}`,
        );
      }
      if (data.prototyping.surfaceClassification.classificationRationale) {
        lines.push(
          `- rationale: ${data.prototyping.surfaceClassification.classificationRationale}`,
        );
      }
      lines.push("");
    }

    // WS-F: Full-harness execution summary
    if (data.prototyping.fullHarnessExecution) {
      const fhe = data.prototyping.fullHarnessExecution;
      lines.push("### prototyping.fullHarnessExecution");
      lines.push("");
      lines.push(`- mode: ${fhe.mode}`);
      lines.push(`- iterations: ${fhe.iterations}`);
      lines.push(`- termination reason: ${fhe.terminationReason}`);
      lines.push(`- final score: ${fhe.finalScore.toFixed(3)}`);
      lines.push(`- best iteration: ${fhe.bestIteration}`);
      lines.push(
        `- render: captured ${fhe.renderCaptured} / skipped ${fhe.renderSkipped} / failed ${fhe.renderFailed}`,
      );
      lines.push(
        `- browser QA: phases executed ${fhe.browserQaPhasesExecuted} / skipped ${fhe.browserQaPhasesSkipped} / findings ${fhe.browserQaTotalFindings}`,
      );
      lines.push("");
    }

    if (data.prototyping.roundLifecycle) {
      const lifecycle = data.prototyping.roundLifecycle;
      lines.push("### prototyping.lifecycle");
      lines.push("");
      lines.push(`- iterations: ${lifecycle.iterations}`);
      lines.push("");
    }

    lines.push("### prototyping.mode");
    lines.push("");
    lines.push(`- requested: ${data.prototyping.mode.requested ?? "(none)"}`);
    lines.push(`- effective: ${data.prototyping.mode.effective}`);
    lines.push(`- source: ${data.prototyping.mode.source}`);
    lines.push(`- rationale: ${data.prototyping.mode.rationale}`);
    lines.push(`- surface: ${data.prototyping.mode.surface}`);
    lines.push("");
    lines.push("### prototyping.evidence");
    lines.push("");
    lines.push(`- specs coverage status: ${data.prototyping.evidence.specsCoverageStatus}`);
    if (data.prototyping.evidence.specsCoverage) {
      const cov = data.prototyping.evidence.specsCoverage;
      lines.push(`- specs expected: ${cov.expectedSpecIds.length}`);
      lines.push(`- specs observed: ${cov.observedSpecIds.length}`);
      if (cov.missingSpecIds.length > 0) {
        lines.push(`- specs missing: ${cov.missingSpecIds.join(", ")}`);
      }
      if (cov.unexpectedSpecIds.length > 0) {
        lines.push(`- specs unexpected: ${cov.unexpectedSpecIds.join(", ")}`);
      }
    }
    lines.push(
      `- runtimeGate: present=${data.prototyping.evidence.runtimeGate.present} required=${data.prototyping.evidence.runtimeGate.required}`,
    );
    lines.push(
      `- uiFidelity: present=${data.prototyping.evidence.uiFidelity.present} required=${data.prototyping.evidence.uiFidelity.required}`,
    );
    lines.push(
      `- render bundle: present=${data.prototyping.evidence.renderBundle.present} required=${data.prototyping.evidence.renderBundle.required}`,
    );
    lines.push(
      `- browser QA bundle: present=${data.prototyping.evidence.browserQaBundle.present} required=${data.prototyping.evidence.browserQaBundle.required}`,
    );
    lines.push(`- obligation profile: ${data.prototyping.evidence.obligationProfile}`);
    if (data.prototyping.fullHarness) {
      const fh = data.prototyping.fullHarness;
      lines.push("");
      lines.push("### prototyping.fullHarness");
      lines.push("");
      lines.push(`- enabled: ${fh.enabled}`);
      lines.push(`- runId: ${fh.runId ?? "(none)"}`);
      lines.push(`- status: ${fh.status ?? "(none)"}`);
      lines.push(`- iterationCount: ${fh.iterationCount ?? "(none)"}`);
      lines.push(`- bestIteration: ${fh.bestIteration ?? "(none)"}`);
      lines.push(`- terminationReason: ${fh.terminationReason ?? "(none)"}`);
      lines.push(`- reviewerId: ${fh.reviewerId ?? "(none)"}`);
      lines.push(`- reviewerSignoff.status: ${fh.reviewerSignoffStatus ?? "(none)"}`);
      if (fh.calibrationRef) {
        lines.push(`- calibrationRef.configPath: ${fh.calibrationRef.configPath}`);
        lines.push(`- calibrationRef.packPath: ${fh.calibrationRef.packPath}`);
        lines.push(`- calibrationRef.packVersion: ${fh.calibrationRef.packVersion}`);
      }
      if (fh.latestScoredIteration !== undefined) {
        lines.push(`- latest scored iteration: ${fh.latestScoredIteration}`);
      }
      if (fh.scoringTraceCount !== undefined) {
        lines.push(`- scoringTrace: ${fh.scoringTraceCount} entries`);
      }
      if (fh.reviewerLogsCount !== undefined) {
        lines.push(`- reviewerLogs: ${fh.reviewerLogsCount} entries`);
      }
      if (fh.limitations && fh.limitations.length > 0) {
        lines.push(`- limitations: ${fh.limitations.length} items`);
      }
    }
    if (data.prototyping.render) {
      lines.push("");
      lines.push("### prototyping.render");
      lines.push("");
      lines.push(`- status: ${data.prototyping.render.status ?? "(none)"}`);
      lines.push(`- requested: ${data.prototyping.render.requested ?? "(none)"}`);
      lines.push(`- captured: ${data.prototyping.render.captured}`);
      lines.push(`- skipped: ${data.prototyping.render.skipped}`);
      lines.push(`- failed: ${data.prototyping.render.failed}`);
      lines.push(`- malformed: ${data.prototyping.render.malformed}`);
      if (data.prototyping.render.inlinePayloadViolation) {
        lines.push(`- inline payload violation: true`);
      }
    }
    if (data.prototyping.browserQa) {
      lines.push("");
      lines.push("### prototyping.browserQa");
      lines.push("");
      lines.push(`- status: ${data.prototyping.browserQa.status ?? "(none)"}`);
      lines.push(`- executed: ${data.prototyping.browserQa.executed ?? "(none)"}`);
      lines.push(
        `- findings by severity: error ${data.prototyping.browserQa.findingsBySeverity.error} / warning ${data.prototyping.browserQa.findingsBySeverity.warning} / info ${data.prototyping.browserQa.findingsBySeverity.info}`,
      );
      if (data.prototyping.browserQa.findingsByCategory) {
        const cats = Object.entries(data.prototyping.browserQa.findingsByCategory)
          .map(([cat, count]) => `${cat}=${count}`)
          .join(", ");
        lines.push(`- findings by category: ${cats}`);
      }
      if (data.prototyping.browserQa.summaryAggregates) {
        lines.push(
          `- summary aggregates: passed=${data.prototyping.browserQa.summaryAggregates.totalPassed} failed=${data.prototyping.browserQa.summaryAggregates.totalFailed}`,
        );
      }
      if (data.prototyping.browserQa.phaseSummary) {
        lines.push(`- phase summary:`);
        for (const [phase, counts] of Object.entries(data.prototyping.browserQa.phaseSummary)) {
          const c = counts as { passed: number; failed: number };
          lines.push(`  - ${phase}: passed=${c.passed} failed=${c.failed}`);
        }
      }
      if (data.prototyping.browserQa.modeMismatch) {
        lines.push(`- mode mismatch: true`);
      }
    }
    if (data.prototyping.calibration) {
      lines.push("");
      lines.push("### prototyping.calibration");
      lines.push("");
      lines.push(`- config present: ${data.prototyping.calibration.configPresent}`);
      if (data.prototyping.calibration.thresholdSummary) {
        lines.push(
          `- thresholds: accept=${data.prototyping.calibration.thresholdSummary.accept} refine=${data.prototyping.calibration.thresholdSummary.refine}`,
        );
      }
      lines.push(
        `- scoring trace available: ${data.prototyping.calibration.scoringTraceAvailable}`,
      );
      if (data.prototyping.calibration.belowThresholdWarning) {
        lines.push(`- below threshold warning: true`);
      }
    }
    // WS-8: Observability note
    lines.push("");
    lines.push("### prototyping.observability");
    lines.push("");
    lines.push("- status: foundation-only (not integrated into blocking validation)");
    // Warnings
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (data.prototyping.warnings && data.prototyping.warnings.length > 0) {
      lines.push("");
      lines.push("### prototyping.warnings");
      lines.push("");
      for (const warning of data.prototyping.warnings) {
        lines.push(`- ${warning}`);
      }
    }
  }
  lines.push("");

  lines.push("## Contract Coverage");
  lines.push("");
  lines.push(`- total: ${data.traceability.contracts.total}`);
  lines.push(`- referenced: ${data.traceability.contracts.referenced}`);
  lines.push(`- orphan: ${data.traceability.contracts.orphan}`);
  lines.push(`- specContractRefMissing: ${data.traceability.specs.contractRefMissing}`);
  lines.push("");

  lines.push("### Contract → Spec");
  lines.push("");
  const contractToSpecs = data.traceability.contracts.idToSpecs;
  const contractIds = Object.keys(contractToSpecs).sort((a, b) => a.localeCompare(b));
  if (contractIds.length === 0) {
    lines.push("- (none)");
  } else {
    for (const contractId of contractIds) {
      const specs = contractToSpecs[contractId] ?? [];
      if (specs.length === 0) {
        lines.push(`- ${contractId}: (none)`);
      } else {
        lines.push(`- ${contractId}: ${specs.join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("### Spec → Contracts");
  lines.push("");
  const specToContracts = data.traceability.specs.specToContracts;
  const specIds = Object.keys(specToContracts).sort((a, b) => a.localeCompare(b));
  if (specIds.length === 0) {
    lines.push("- (none)");
  } else {
    const rows = specIds.map((specId) => {
      const entry = specToContracts[specId];
      const contracts =
        entry?.status === "missing"
          ? "(missing)"
          : entry && entry.ids.length > 0
            ? entry.ids.join(", ")
            : "(none)";
      const status = entry?.status ?? "missing";
      return [specId, status, contracts];
    });
    lines.push(...formatMarkdownTable(["Spec", "Status", "Contracts"], rows));
  }
  lines.push("");

  lines.push("### Specs missing contract-ref");
  lines.push("");
  const missingRefSpecs = data.traceability.specs.missingRefSpecs;
  if (missingRefSpecs.length === 0) {
    lines.push("- (none)");
  } else {
    for (const specId of missingRefSpecs) {
      lines.push(`- ${specId}`);
    }
  }
  lines.push("");

  lines.push("## SC Coverage");
  lines.push("");
  lines.push(`- total: ${data.traceability.sc.total}`);
  lines.push(`- covered: ${data.traceability.sc.covered}`);
  lines.push(`- missing: ${data.traceability.sc.missing}`);
  lines.push(`- testFileGlobs: ${formatList(data.traceability.testFiles.globs)}`);
  lines.push(`- testFileExcludeGlobs: ${formatList(data.traceability.testFiles.excludeGlobs)}`);
  lines.push(`- testFileCount: ${data.traceability.testFiles.matchedFileCount}`);
  if (data.traceability.testFiles.truncated) {
    lines.push(`- testFileTruncated: true (limit=${data.traceability.testFiles.limit})`);
  }
  if (data.traceability.sc.missingIds.length === 0) {
    lines.push("- missingIds: (none)");
  } else {
    const sources = data.traceability.scSources;
    const missingWithSources = data.traceability.sc.missingIds.map((id) => {
      const files = sources[id] ?? [];
      if (files.length === 0) {
        return id;
      }
      const formattedFiles = files.map((file) => formatPathLink(file, baseUrl));
      return `${id} (${formattedFiles.join(", ")})`;
    });
    lines.push(`- missingIds: ${missingWithSources.join(", ")}`);
  }
  lines.push("");

  lines.push("## SC → Referenced Tests");
  lines.push("");
  const scRefs = data.traceability.sc.refs;
  const scIds = Object.keys(scRefs).sort((a, b) => a.localeCompare(b));
  if (scIds.length === 0) {
    lines.push("- (none)");
  } else {
    for (const scId of scIds) {
      const refs = scRefs[scId] ?? [];
      if (refs.length === 0) {
        lines.push(`- ${scId}: (none)`);
      } else {
        const formattedRefs = refs.map((ref) => formatPathLink(ref, baseUrl));
        lines.push(`- ${scId}: ${formattedRefs.join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("## Duplicate SC IDs");
  lines.push("");
  const duplicateScIssues = data.issues.filter((item) => item.code === "QFAI-TRACE-035");
  if (duplicateScIssues.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of duplicateScIssues) {
      const location = item.file ?? "(unknown)";
      const formattedLocation =
        location === "(unknown)" ? location : formatPathLink(location, baseUrl);
      const refs = item.refs && item.refs.length > 0 ? item.refs.join(", ") : item.message;
      lines.push(`- ${formattedLocation}: ${refs}`);
    }
  }
  lines.push("");

  lines.push("## Hotspots");
  lines.push("");
  const hotspots = buildHotspots(data.issues);
  if (hotspots.length === 0) {
    lines.push("- (none)");
  } else {
    for (const spot of hotspots) {
      lines.push(
        `- ${formatPathLink(spot.file, baseUrl)}: total ${spot.total} (error ${spot.error} / warning ${spot.warning} / info ${spot.info})`,
      );
    }
  }
  lines.push("");

  lines.push("## Guidance");
  lines.push("");

  lines.push(
    "- 次の手順: `qfai doctor --fail-on error` → `qfai validate --fail-on error` → `qfai report`",
  );
  if (data.summary.counts.error > 0) {
    lines.push("- error があるため、まず error から修正してください。");
  } else if (data.summary.counts.warning > 0) {
    lines.push("- warning の扱い（Hard Gate にするか）は運用で決めてください。");
  } else {
    lines.push("- issue は検出されませんでした。運用テンプレに沿って継続してください。");
  }
  const renderEvidenceIssues = data.issues.filter((item) =>
    [
      "QFAI-PROT-101",
      "QFAI-PROT-244",
      "QFAI-PROT-245",
      "QFAI-PROT-251",
      "QFAI-PROT-252",
      "QFAI-PROT-253",
      "QFAI-PROT-254",
    ].includes(item.code),
  );
  if (renderEvidenceIssues.length > 0) {
    lines.push(
      "- render evidence が不足または不完全です。viewport coverage と artifact path を確認してください。",
    );
    lines.push(
      "- recover: `/qfai-prototyping` を再実行し、宣言された screen ごとの screenshot と HTML snapshot を再取得してください。",
    );
    lines.push(
      "- why it matters: screenshot / HTML evidence は validate と verify の gate 判定に使われます。",
    );
  }
  const calibrationIssues = data.issues.filter((item) =>
    ["QFAI-PROT-271", "QFAI-PROT-272"].includes(item.code),
  );
  if (calibrationIssues.length > 0) {
    lines.push(
      "- legacy calibration setting incomplete (mode-tier calibration is no longer supported).",
    );
  }
  // The legacy fullHarness incompleteness banner (PROT-264/281/282/283/
  // 295..299) was retired with the UX-loop schema rewrite; no validator
  // emits those codes any more.
  lines.push("- 変更内容・受入観点は `.qfai/specs/*/18_delta.md` に記録します。");
  lines.push("- 参照ルールの正本: `.qfai/assistant/constitution/constitution.md`");

  return lines.join("\n");
}

export function formatReportJson(data: ReportData): string {
  return JSON.stringify(data, null, 2);
}

type SpecContractRefsResult = {
  specToContracts: Map<string, SpecContractRefEntry>;
  idToSpecs: Map<string, Set<string>>;
  missingRefSpecs: Set<string>;
};

type SpecContractRefEntry = {
  status: "missing" | "declared";
  ids: Set<string>;
};

async function collectChangeTypeSummary(
  root: string,
  specsRoot: string,
  scope: SpecScope | undefined,
): Promise<ReportChangeTypeSummary> {
  const summary: ReportChangeTypeSummary = {
    deltaFilesScanned: 0,
    uncountedDeltaFiles: [],
    totalEntries: 0,
    primary: {
      Initial: 0,
      Behavior: 0,
      Structural: 0,
      Ops: 0,
      unknown: 0,
    },
    tags: {
      "@api": 0,
      "@db": 0,
      "@nfr": 0,
      "@docs": 0,
      "@test": 0,
    },
    compat: {
      Compatibility: 0,
      Improvement: 0,
      Change: 0,
      "Bug-for-bug": 0,
      unknown: 0,
    },
  };

  // Delta entries are spec-owned, so a scoped run must not count a sibling's.
  const deltaFiles = (await collectSpecDeltaFiles(specsRoot)).filter((file) =>
    isPathInSpecScope(file, { root: specsRoot, specsRoot }, scope),
  );
  // Counted after the scope filter, so `deltaFilesScanned` reports what this run
  // actually opened rather than what the repo holds.
  summary.deltaFilesScanned = deltaFiles.length;

  for (const deltaFile of deltaFiles) {
    const text = await readFile(deltaFile, "utf-8");
    const partition = partitionDeltaEntries(parseDeltaV1(text).entries);

    for (const meta of partition.counted) {
      summary.totalEntries += 1;

      const primary = normalizePrimary(meta.primary) ?? "unknown";
      summary.primary[primary] += 1;

      const compat = normalizeCompat(meta.compat) ?? "unknown";
      summary.compat[compat] += 1;

      for (const tag of meta.tags) {
        const normalized = normalizeTag(tag);
        if (!normalized) {
          continue;
        }
        summary.tags[normalized] += 1;
      }
    }

    const gap = toDeltaScanGap(toRelativePath(root, deltaFile), partition);
    if (gap) {
      summary.uncountedDeltaFiles.push(gap);
    }
  }

  return summary;
}

/** One delta file's `### DL-` entries, split by whether the counters can use them. */
type DeltaEntryPartition = {
  counted: DeltaMeta[];
  uncounted: ReportDeltaScanEntry[];
};

/**
 * Splits a file's `### DL-` entries into the countable and the skipped.
 *
 * Per entry, not per file: a file that mixes one complete decision with three
 * skeletons used to read as fully counted, because a single countable entry was
 * enough to clear the file-level check — and those three were exactly the
 * decisions the Dashboard then under-reported, with nothing anywhere saying so.
 *
 * The skipped ones keep their heading id, so each becomes a finding a waiver
 * can accept on its own.
 */
function partitionDeltaEntries(entries: readonly DeltaDecisionEntry[]): DeltaEntryPartition {
  const partition: DeltaEntryPartition = { counted: [], uncounted: [] };
  const seenHeadings = new Set<string>();
  entries.forEach((entry, index) => {
    // A duplicated `### DL-0001` would otherwise hand two rows the same waiver
    // key, so the second one gets its position appended.
    const heading = entry.heading.trim();
    const dlId = seenHeadings.has(heading) ? `${heading}#${index + 1}` : heading;
    seenHeadings.add(heading);

    const record = entry.meta;
    const hasAllKeys =
      record !== null &&
      REQUIRED_DELTA_META_KEYS.every((key) => Object.prototype.hasOwnProperty.call(record, key));
    if (record === null || !hasAllKeys) {
      partition.uncounted.push({ dlId, reason: "unparsed" });
      return;
    }

    const meta = toDeltaMeta(record);
    if (isPlaceholderDeltaMeta(meta)) {
      partition.uncounted.push({ dlId, reason: "placeholder" });
      return;
    }
    partition.counted.push(meta);
  });
  return partition;
}

/**
 * Describes what a file failed to contribute, or `null` when it contributed
 * everything it holds.
 *
 * A file with no recognisable entry at all is a gap too: `countedEntries: 0`
 * with an empty `uncountedEntries` is "nothing here parsed", which is the shape
 * the old shipped template produced (#545).
 */
function toDeltaScanGap(file: string, partition: DeltaEntryPartition): ReportDeltaScanGap | null {
  const countedEntries = partition.counted.length;
  if (partition.uncounted.length === 0 && countedEntries > 0) {
    return null;
  }
  return {
    file,
    reason: resolveDeltaScanGapReason(partition.uncounted),
    countedEntries,
    uncountedEntries: partition.uncounted,
  };
}

/** `mixed` only when both kinds are present; an empty file reads as `unparsed`. */
function resolveDeltaScanGapReason(
  uncounted: readonly ReportDeltaScanEntry[],
): ReportDeltaScanGap["reason"] {
  const hasPlaceholder = uncounted.some((entry) => entry.reason === "placeholder");
  const hasUnparsed = uncounted.some((entry) => entry.reason === "unparsed");
  if (hasPlaceholder && hasUnparsed) {
    return "mixed";
  }
  return hasPlaceholder ? "placeholder" : "unparsed";
}

async function collectPrototypingSummary(
  root: string,
  config: ConfigLoadResult["config"],
  specEntries: readonly SpecEntry[],
): Promise<ReportPrototypingSummary | undefined> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path.join(root, PROTOTYPING_JSON_REL), "utf-8"));
  } catch {
    return undefined;
  }

  const doc = asRecord(parsed);
  if (!doc) {
    return undefined;
  }

  const iterations = Array.isArray(doc.iterations) ? doc.iterations : [];
  const observedSpecIds = readStringArray(doc.specsCovered).map(normalizeSpecNumber).sort();
  const primaryPrototypingSpec = await resolvePrimaryPrototypingSpec(root, config);
  const expectedSpecIds = primaryPrototypingSpec
    ? [primaryPrototypingSpec.specId]
    : specEntries.map((entry) => entry.specNumber).sort();
  const missingSpecIds = expectedSpecIds.filter((id) => !observedSpecIds.includes(id));
  const unexpectedSpecIds = observedSpecIds.filter((id) => !expectedSpecIds.includes(id));
  const specsCoverageStatus =
    expectedSpecIds.length > 0 && missingSpecIds.length === 0 ? "complete" : "incomplete";

  const warnings: string[] = [];
  if (iterations.length === 0) {
    warnings.push("prototyping.json has no iterations.");
  }

  return {
    roundLifecycle: {
      iterations: iterations.length,
    },
    mode: {
      effective: "single-thread-loop",
      source: PROTOTYPING_JSON_REL,
      rationale: "the single-thread iteration loop is fixed.",
      surface: config.uiux?.platform ?? "unknown",
    },
    evidence: {
      specsCoverageStatus,
      specsCoverage: {
        expectedSpecIds,
        observedSpecIds,
        missingSpecIds,
        unexpectedSpecIds,
      },
      runtimeGate: { present: false, required: false },
      uiFidelity: { present: false, required: false },
      renderBundle: { present: false, required: false },
      browserQaBundle: { present: false, required: false },
      obligationProfile: "single-thread-loop",
    },
    warnings,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeSpecNumber(value: string): string {
  return value.replace(/^spec-/iu, "");
}

async function collectSpecContractRefs(
  specFiles: string[],
  contractIdList: string[],
): Promise<SpecContractRefsResult> {
  const specToContracts = new Map<string, SpecContractRefEntry>();
  const idToSpecs = new Map<string, Set<string>>();
  const missingRefSpecs = new Set<string>();

  for (const contractId of contractIdList) {
    idToSpecs.set(contractId, new Set<string>());
  }

  for (const file of specFiles) {
    const text = await readFile(file, "utf-8");
    const parsed = parseSpec(text, file);
    const specKey = parsed.specId;
    if (!specKey) {
      continue;
    }
    const refs = parsed.contractRefs;

    if (refs.lines.length === 0) {
      missingRefSpecs.add(specKey);
      specToContracts.set(specKey, { status: "missing", ids: new Set() });
      continue;
    }

    const current =
      specToContracts.get(specKey) ??
      ({
        status: "declared",
        ids: new Set<string>(),
      } satisfies SpecContractRefEntry);
    for (const id of refs.ids) {
      current.ids.add(id);
      const specs = idToSpecs.get(id);
      if (specs) {
        specs.add(specKey);
      }
    }
    specToContracts.set(specKey, current);
  }

  return {
    specToContracts,
    idToSpecs,
    missingRefSpecs,
  };
}

async function collectIds(files: string[]): Promise<Record<IdPrefix, string[]>> {
  const result = {} as Record<IdPrefix, Set<string>>;
  for (const prefix of ID_PREFIXES) {
    result[prefix] = new Set<string>();
  }

  for (const file of files) {
    const text = await readFile(file, "utf-8");
    for (const prefix of ID_PREFIXES) {
      const ids = extractIds(text, prefix);
      ids.forEach((id) => result[prefix].add(id));
    }
  }

  const sorted = {} as Record<IdPrefix, string[]>;
  for (const prefix of ID_PREFIXES) {
    sorted[prefix] = toSortedArray(result[prefix]);
  }
  return sorted;
}

async function collectUpstreamIds(files: string[]): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => ids.add(id));
  }
  return ids;
}

async function evaluateTraceability(
  upstreamIds: Set<string>,
  srcRoot: string,
  testsRoot: string,
): Promise<boolean> {
  if (upstreamIds.size === 0) {
    return false;
  }

  const codeFiles = await collectFiles(srcRoot, {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  });
  const testFiles = await collectFiles(testsRoot, {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  });
  const targetFiles = [...codeFiles, ...testFiles];

  if (targetFiles.length === 0) {
    return false;
  }

  const pattern = buildIdPattern(Array.from(upstreamIds));

  for (const file of targetFiles) {
    const text = await readFile(file, "utf-8");
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

function buildIdPattern(ids: string[]): RegExp {
  const escaped = ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`);
}

/** How many uncounted delta files the NOTE names before it summarises the rest. */
const REPORT_DELTA_SCAN_GAP_MAX = 10;

/**
 * Names the input the Change Type counters were computed from.
 *
 * `decision entries: N` alone reads as "this is what the tree classified",
 * which is the same output as "some deltas were read and counted for nothing" —
 * the second is a defect in the files, and it must not report as a clean run.
 * Driven by the per-entry split, not by `totalEntries === 0` and not by "this
 * file counted for nothing": one spec adopting the current template is enough
 * to take the total positive, and one complete entry is enough to make the file
 * around it look healthy, while the entries beside it stay silently uncounted.
 */
function formatDeltaScanLines(summary: ReportChangeTypeSummary, baseUrl?: string): string[] {
  const lines = [
    `- delta files scanned: ${summary.deltaFilesScanned}`,
    `- decision entries: ${summary.totalEntries}`,
  ];
  const gaps = summary.uncountedDeltaFiles;
  if (gaps.length === 0) {
    return lines;
  }
  const uncountedEntries = gaps.reduce((acc, gap) => acc + gap.uncountedEntries.length, 0);
  lines.push(
    `- NOTE: ${gaps.length} of ${summary.deltaFilesScanned} delta file(s) hold decision entries the counters could not use` +
      `${uncountedEntries > 0 ? ` (${uncountedEntries} entr${uncountedEntries === 1 ? "y" : "ies"} skipped)` : ""}. ` +
      "The counters above cover the rest of the tree only — they are not evidence that nothing changed. " +
      `See [${DELTA_SCAN_ISSUE_CODE}](#change-issues).`,
  );
  for (const gap of gaps.slice(0, REPORT_DELTA_SCAN_GAP_MAX)) {
    lines.push(`  - ${formatPathLink(gap.file, baseUrl)}: ${formatDeltaScanGapDetail(gap)}`);
  }
  if (gaps.length > REPORT_DELTA_SCAN_GAP_MAX) {
    lines.push(`  - ... and ${gaps.length - REPORT_DELTA_SCAN_GAP_MAX} more`);
  }
  return lines;
}

/** Reason text per gap, in the prose the Markdown body speaks. */
const DELTA_SCAN_GAP_DETAIL: Record<ReportDeltaScanGap["reason"], string> = {
  unparsed: "incomplete `#### Meta`",
  placeholder: "still the unfilled template (`date` / `scope` / `notes`)",
  mixed: "incomplete `#### Meta` or still the unfilled template",
};

/**
 * Spells out how much of one file went uncounted, and which entries.
 *
 * `2/5 entries uncounted` and "this whole file is invisible" are different
 * repairs, and a partly counted file is the one a reader would otherwise never
 * look at — its `delta coverage` row and its Change Type totals both look fine.
 * The ids are named because they are what a waiver has to list in
 * `match.dl_ids`.
 */
function formatDeltaScanGapDetail(gap: ReportDeltaScanGap): string {
  if (gap.uncountedEntries.length === 0) {
    return "no `### DL-` entry with a complete `#### Meta` block";
  }
  const total = gap.countedEntries + gap.uncountedEntries.length;
  const ids = gap.uncountedEntries.map((entry) => `\`${entry.dlId}\``).join(", ");
  return `${gap.uncountedEntries.length}/${total} entries uncounted (${DELTA_SCAN_GAP_DETAIL[gap.reason]}): ${ids}`;
}

function formatIdLine(label: string, values: string[]): string {
  if (values.length === 0) {
    return `- ${label}: (none)`;
  }
  return `- ${label}: ${values.join(", ")}`;
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return "(none)";
  }
  return values.join(", ");
}

function formatOptionalPercent(value: number | null): string {
  if (value === null) {
    return "(unset)";
  }
  return formatPercent(value);
}

function formatOptionalNumber(value: number | null): string {
  if (value === null) {
    return "(unset)";
  }
  return String(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function formatMarkdownTable(headers: string[], rows: string[][]): string[] {
  const widths = headers.map((header, index) => {
    const candidates = rows.map((row) => row[index] ?? "");
    return Math.max(header.length, ...candidates.map((item) => item.length));
  });

  const formatRow = (cells: string[]): string => {
    const padded = cells.map((cell, index) => cell.padEnd(widths[index] ?? 0));
    return `| ${padded.join(" | ")} |`;
  };

  const separator = `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`;

  return [formatRow(headers), separator, ...rows.map(formatRow)];
}

function normalizeBaseUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/\/+$/, "");
}

function formatPathLink(value: string, baseUrl?: string): string {
  if (!baseUrl) {
    return value;
  }
  if (value === ".") {
    return `[${value}](${baseUrl})`;
  }
  const encoded = encodePathForUrl(value);
  if (!encoded) {
    return value;
  }
  return `[${value}](${baseUrl}/${encoded})`;
}

function formatPathWithLine(
  value: string,
  loc: Issue["loc"] | undefined,
  baseUrl?: string,
): string {
  const link = formatPathLink(value, baseUrl);
  const line = loc?.line ? `:${loc.line}` : "";
  return `${link}${line}`;
}

function encodePathForUrl(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  if (normalized === ".") {
    return "";
  }
  return normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toSortedArray(values: Set<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function mapToSortedRecord(values: Map<string, Set<string>>): Record<string, string[]> {
  const record: Record<string, string[]> = {};
  for (const [key, files] of values.entries()) {
    record[key] = Array.from(files).sort((a, b) => a.localeCompare(b));
  }
  return record;
}

function mapToSpecContractRecord(
  values: Map<string, SpecContractRefEntry>,
): Record<string, ReportSpecContractRefs> {
  const record: Record<string, ReportSpecContractRefs> = {};
  for (const [key, entry] of values.entries()) {
    record[key] = {
      status: entry.status,
      ids: toSortedArray(entry.ids),
    };
  }
  return record;
}

function normalizeScSources(
  root: string,
  sources: Map<string, Set<string>>,
): Map<string, Set<string>> {
  const normalized = new Map<string, Set<string>>();
  for (const [id, files] of sources.entries()) {
    const mapped = new Set<string>();
    for (const file of files) {
      mapped.add(toRelativePath(root, file));
    }
    normalized.set(id, mapped);
  }
  return normalized;
}

async function countScenarios(scenarioFiles: string[]): Promise<number> {
  let total = 0;
  for (const file of scenarioFiles) {
    const text = await readFile(file, "utf-8");
    const { document, errors } = parseScenarioDocument(text, file);
    if (!document || errors.length > 0) {
      continue;
    }
    total += document.scenarios.length;
  }
  return total;
}

/** Human-readable provenance for the layer buckets, printed under them. */
function describeLayerSource(source: ReportTestStrategy["layerSource"]): string {
  switch (source) {
    case "scenario-tags":
      return "Gherkin `@layer-*` scenario tags";
    case "ledger-layer":
      return "`Layer` column of `tdd/test-list.md`";
    default:
      // Zeros with no source named read as "no tests at any layer", which is a
      // different claim from "nothing could be read".
      return "none — no Gherkin `@layer-*` tags and no readable `Layer` column";
  }
}

/**
 * Layer buckets read from every spec's `tdd/test-list.md` `Layer` column.
 *
 * `Layer` is a hard-required column — `qfai validate` refuses a ledger without
 * the header — and until now no code in the package resolved its index or read
 * a cell for reporting. The one layer surface qfai ships was computed from
 * Gherkin `@layer-*` tags in `entry.examplesPath`, which on the v1421 layered
 * layout is the Markdown `05_Examples.md`; the parse failed and every bucket
 * printed 0.
 */
async function collectLedgerLayerCounts(
  specsRoot: string,
  scope: SpecScope | undefined,
): Promise<{
  total: number;
  counts: Record<"unit" | "component" | "integration" | "api" | "e2e" | "none" | "unknown", number>;
}> {
  const counts = {
    unit: 0,
    component: 0,
    integration: 0,
    api: 0,
    e2e: 0,
    none: 0,
    unknown: 0,
  };
  let total = 0;

  for (const entry of await collectSpecEntries(specsRoot)) {
    if (!isSpecInScope(entry.specNumber, scope)) {
      continue;
    }
    const ledgerPath = path.join(entry.dir, "tdd", "test-list.md");
    let text: string;
    try {
      text = await readFile(ledgerPath, "utf-8");
    } catch {
      continue;
    }
    const table = parseFirstMarkdownTable(text);
    if (!table) continue;
    const layerIndex = table.headers.map((header: string) => header.trim()).indexOf("Layer");
    if (layerIndex < 0) continue;
    for (const row of table.rows) {
      const raw = (row[layerIndex] ?? "").trim();
      total += 1;
      if (raw.length === 0 || raw === "-") {
        counts.none += 1;
        continue;
      }
      const normalized = raw.toLowerCase();
      if (normalized in counts && normalized !== "none" && normalized !== "unknown") {
        counts[normalized as keyof typeof counts] += 1;
      } else {
        // A value outside the declared vocabulary. `TDDLIST_UNKNOWN_LAYER`
        // already reports it; here it must not be silently dropped from the
        // total, or the distribution would understate the ledger.
        counts.unknown += 1;
      }
    }
  }

  return { total, counts };
}

async function collectTestStrategy(
  scenarioFiles: string[],
  root: string,
  config: ConfigLoadResult["config"],
  limit: number,
  specsRoot: string,
  scope: SpecScope | undefined,
): Promise<ReportTestStrategy> {
  const layerCounts = {
    unit: 0,
    component: 0,
    integration: 0,
    api: 0,
    e2e: 0,
    none: 0,
    unknown: 0,
  };
  const sizeCounts = {
    s: 0,
    m: 0,
    l: 0,
    none: 0,
    unknown: 0,
  };
  const missingLayer: string[] = [];
  const missingSize: string[] = [];
  const unparsedScenarioFiles: string[] = [];
  let totalScenarios = 0;
  let e2eCount = 0;

  for (const file of scenarioFiles) {
    const text = await readFile(file, "utf-8");
    const { document, errors } = parseScenarioDocument(text, file);
    if (!document || errors.length > 0) {
      // Recorded, not swallowed. A `continue` here is why the distribution
      // reported zeros rather than "there was nothing to read".
      unparsedScenarioFiles.push(toRelativePath(root, file));
      continue;
    }

    for (const scenario of document.scenarios) {
      totalScenarios += 1;
      const label = buildScenarioLabel(root, file, scenario.tags, scenario.name);

      const layerBucket = classifyLayer(scenario.tags);
      layerCounts[layerBucket] += 1;
      if (layerBucket === "none") {
        missingLayer.push(label);
      }
      if (layerBucket === "e2e") {
        e2eCount += 1;
      }

      const sizeBucket = classifySize(scenario.tags);
      sizeCounts[sizeBucket] += 1;
      if (sizeBucket === "none") {
        missingSize.push(label);
      }
    }
  }

  // Fall back to the ledger when the Gherkin path yielded nothing. `Layer` is a
  // hard-required column of every `tdd/test-list.md`, so on the layered layout
  // it is the only place a layer can actually be read from.
  let layerSource: ReportTestStrategy["layerSource"] =
    totalScenarios > 0 ? "scenario-tags" : "none";
  if (totalScenarios === 0) {
    const fromLedger = await collectLedgerLayerCounts(specsRoot, scope);
    if (fromLedger.total > 0) {
      layerSource = "ledger-layer";
      for (const [bucket, count] of Object.entries(fromLedger.counts)) {
        layerCounts[bucket as keyof typeof layerCounts] += count;
      }
    }
  }

  const layerSamples = missingLayer.slice(0, limit);
  const sizeSamples = missingSize.slice(0, limit);
  const ratio = totalScenarios === 0 ? 0 : e2eCount / totalScenarios;
  const maxRatio = config.validation.testStrategy.maxE2eScenarioRatio;
  const maxCount = config.validation.testStrategy.maxE2eScenarioCount;

  return {
    totalScenarios,
    limit,
    layerSource,
    unparsedScenarioFiles,
    layer: layerCounts,
    size: sizeCounts,
    missing: {
      layer: {
        total: missingLayer.length,
        samples: layerSamples,
        truncated: missingLayer.length > layerSamples.length,
      },
      size: {
        total: missingSize.length,
        samples: sizeSamples,
        truncated: missingSize.length > sizeSamples.length,
      },
    },
    e2e: {
      count: e2eCount,
      ratio,
      maxRatio,
      maxCount,
      ratioExceeded: maxRatio !== null && ratio > maxRatio,
      countExceeded: maxCount !== null && e2eCount > maxCount,
    },
  };
}

function buildScenarioLabel(root: string, file: string, tags: string[], name: string): string {
  const scTag = tags.find((tag) => SC_TAG_RE.test(tag));
  if (scTag) {
    return scTag;
  }
  const relative = toRelativePath(root, file);
  const scenarioName = name.trim().length > 0 ? name : "(unknown)";
  return `${relative}:${scenarioName}`;
}

type Hotspot = {
  file: string;
  total: number;
  error: number;
  warning: number;
  info: number;
};

function buildHotspots(issues: Issue[]): Hotspot[] {
  const map = new Map<string, Hotspot>();
  for (const issue of issues) {
    if (!issue.file) {
      continue;
    }
    const current =
      map.get(issue.file) ??
      ({
        file: issue.file,
        total: 0,
        error: 0,
        warning: 0,
        info: 0,
      } satisfies Hotspot);
    current.total += 1;
    current[issue.severity] += 1;
    map.set(issue.file, current);
  }

  return Array.from(map.values()).sort((a, b) =>
    b.total !== a.total ? b.total - a.total : a.file.localeCompare(b.file),
  );
}

// Reviewed 2026-06-01: canonical traceability ledger refreshed; no behavioral changes required this cycle.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildContractIndex } from "./contractIndex.js";
import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import { collectSpecEntries, type SpecEntry } from "./specLayout.js";
import { parseFirstMarkdownTable } from "./specPackParsers.js";
import {
  isCoverageTargetLevel,
  TDD_DONE_STATUSES,
  splitTcRefs,
  resolveParentTcId,
} from "./tddHelpers.js";
import {
  collectDeltaFiles as collectSpecDeltaFiles,
  collectContractFiles,
  collectScenarioFiles,
  collectSpecFiles,
} from "./discovery.js";
import { collectFiles } from "./fs.js";
import { ID_PREFIXES, extractAllIds, extractIds, type IdPrefix } from "./ids.js";
import { normalizeValidationResult } from "./normalize.js";
import { parseSpec } from "./parse/spec.js";
import {
  summarizeResolvedMode,
  isValidPrototypingMode,
  isValidPrototypingSurface,
  derivePrototypingObligations,
  inferSurfaceFromRecommendationAndEvidence,
} from "./prototyping/mode.js";
import { resolveLatestRecommendationArtifact } from "./prototyping/recommendationArtifact.js";
import { parseScenarioDocument } from "./scenarioModel.js";
import { classifyLayer, classifySize } from "./testStrategyTags.js";
import { toRelativePath } from "./paths.js";
import {
  normalizeCompat,
  normalizePrimary,
  REQUIRED_DELTA_META_KEYS,
  normalizeTag,
  parseDeltaV1,
  toDeltaMeta,
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
import type { Issue, ValidationCounts, ValidationResult, ValidationWaiverEntry } from "./types.js";
import { validateProject } from "./validate.js";
import { resolveToolVersion } from "./version.js";
import { readRenderEvidenceBundle, summarizeRenderEvidence } from "./uiux/renderEvidence.js";
import { readBrowserQaBundle } from "./browserQa/index.js";

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

export type ReportChangeTypeSummary = {
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
  status: "ok" | "missing-delta-update";
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
  unitComponentTotal: number;
  doneCount: number;
  exceptionCount: number;
  openCount: number;
  missingTcRefs: string[];
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
  mode: "full-harness";
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

export type ReportPrototypingSummary = {
  surfaceClassification?: ReportSurfaceClassification;
  fullHarnessExecution?: ReportFullHarnessExecution;
  recommendationArtifact?: {
    status: "valid" | "missing" | "invalid" | "no-pack";
    path?: string;
  };
  mode: {
    requested?: string;
    effective: string;
    source: string;
    rationale: string;
    discussionRecommendation?: string;
    allowedModes?: string[];
    surface: string;
    sourceSchema?: string;
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
    available?: boolean;
    runId?: string;
    iterationCount?: number;
    bestIteration?: number;
    terminationReason?: string;
    reviewerSignoffStatus?: string;
    scoringTraceCount?: number;
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
    phaseSummary?: Record<string, { passed: number; failed: number }>;
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

export async function createReportData(
  root: string,
  validation?: ValidationResult,
  configResult?: ConfigLoadResult,
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

  const specEntries = await collectSpecEntries(specsRoot);
  const specFiles = await collectSpecFiles(specsRoot);
  const scenarioFiles = await collectScenarioFiles(specsRoot);
  const scenarioCount = await countScenarios(scenarioFiles);
  const testStrategy = await collectTestStrategy(
    scenarioFiles,
    resolvedRoot,
    config,
    REPORT_TEST_STRATEGY_SAMPLE_LIMIT,
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
  const resolvedValidationRaw = validation ?? (await validateProject(resolvedRoot, resolved));
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
  const changeTypeSummary = await collectChangeTypeSummary(specsRoot);
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
  const expiredWaivers = normalizedValidation.issues
    .filter((item) => item.code === "QFAI-WAIVER-003")
    .map((item) => toReportRuleFinding(item));

  const tddCoverage = await collectTddCoverage(specEntries);
  const prototyping = await collectPrototypingSummary(resolvedRoot, config);

  const version = await resolveToolVersion();
  const displayRoot = toRelativePath(resolvedRoot, resolvedRoot);
  const displayConfigPath = toRelativePath(resolvedRoot, configPath);

  return {
    tool: "qfai",
    version,
    generatedAt: new Date().toISOString(),
    root: displayRoot,
    configPath: displayConfigPath,
    summary: {
      specs: specFiles.length,
      scenarios: scenarioCount,
      contracts: {
        api: apiFiles.length,
        ui: uiFiles.length,
        db: dbFiles.length,
        thema: themaFiles.length,
      },
      counts: normalizedValidation.counts,
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
        status: missingDeltaUpdateIssues > 0 ? "missing-delta-update" : "ok",
      },
    },
    waivers: {
      active: [...waiverState.active].sort((a, b) => a.id.localeCompare(b.id)),
      suppressed: {
        total: waiverState.suppressed.total,
        byWaiver: Object.fromEntries(
          Object.entries(waiverState.suppressed.byWaiver).sort(([a], [b]) => a.localeCompare(b)),
        ),
        byRule: Object.fromEntries(
          Object.entries(waiverState.suppressed.byRule).sort(([a], [b]) => a.localeCompare(b)),
        ),
      },
      expired: expiredWaivers,
    },
    issues: normalizedValidation.issues,
  };
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
  lines.push("");

  const severityOrder: Record<string, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  const categoryOrder: Record<string, number> = {
    compatibility: 0,
    change: 1,
  };

  const issuesByCategory = {
    compatibility: [] as Issue[],
    change: [] as Issue[],
  };
  for (const issue of data.issues) {
    const cat = issue.category;
    if (cat === "change") {
      issuesByCategory.change.push(issue);
    } else {
      issuesByCategory.compatibility.push(issue);
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

  const compatCounts = countIssuesBySeverity(issuesByCategory.compatibility);
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
    `- issues(compatibility): info ${compatCounts.info} / warning ${compatCounts.warning} / error ${compatCounts.error}`,
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
    `- delta coverage: ${data.changeType.deltaCoverage.status === "ok" ? "OK" : "NG"} (missing update issues: ${data.changeType.deltaCoverage.missingUpdateIssues})`,
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
  lines.push("- [Compatibility Issues](#compatibility-issues)");
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

  lines.push("## Compatibility Issues");
  lines.push("");
  lines.push("### Summary");
  lines.push("");
  lines.push(...formatIssueSummaryTable(issuesByCategory.compatibility));
  lines.push("");
  lines.push("### Issues");
  lines.push("");
  lines.push(...formatIssueCards(issuesByCategory.compatibility));

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
  lines.push(`- decision entries: ${data.changeType.summary.totalEntries}`);
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
    `- delta coverage: ${data.changeType.deltaCoverage.status} (issues=${data.changeType.deltaCoverage.missingUpdateIssues})`,
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
      lines.push(`- coverage-target TCs: ${spec.unitComponentTotal}`);
      lines.push(
        `- done: ${spec.doneCount} / exception: ${spec.exceptionCount} / open: ${spec.openCount}`,
      );
      if (spec.missingTcRefs.length > 0) {
        lines.push(`- missing TC refs (add to test-list.md): ${spec.missingTcRefs.join(", ")}`);
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
    // D-4: Always output recommendationArtifact status
    if (data.prototyping.recommendationArtifact) {
      lines.push("### prototyping.recommendationArtifact");
      lines.push("");
      lines.push(`- status: ${data.prototyping.recommendationArtifact.status}`);
      if (data.prototyping.recommendationArtifact.path) {
        lines.push(`- path: ${data.prototyping.recommendationArtifact.path}`);
      }
      const artifactStatus = data.prototyping.recommendationArtifact.status;
      if (artifactStatus === "invalid") {
        lines.push("- action: fix prototyping.yaml schema in the latest discussion pack");
      } else if (artifactStatus === "missing") {
        lines.push("- action: add prototyping.yaml to the latest discussion pack");
      } else if (artifactStatus === "no-pack") {
        lines.push("- action: create a discussion pack before relying on discussion-recommendation mode");
      }
      lines.push("");
    }

    // WS-F: Surface classification summary
    if (data.prototyping.surfaceClassification) {
      lines.push("### prototyping.surfaceClassification");
      lines.push("");
      lines.push(`- primary surface: ${data.prototyping.surfaceClassification.primarySurface}`);
      lines.push(`- UI-bearing: ${data.prototyping.surfaceClassification.uiBearing}`);
      if (data.prototyping.surfaceClassification.secondarySurfaces?.length) {
        lines.push(`- secondary surfaces: ${data.prototyping.surfaceClassification.secondarySurfaces.join(", ")}`);
      }
      if (data.prototyping.surfaceClassification.classificationRationale) {
        lines.push(`- rationale: ${data.prototyping.surfaceClassification.classificationRationale}`);
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
      lines.push(`- render: captured ${fhe.renderCaptured} / skipped ${fhe.renderSkipped} / failed ${fhe.renderFailed}`);
      lines.push(`- browser QA: phases executed ${fhe.browserQaPhasesExecuted} / skipped ${fhe.browserQaPhasesSkipped} / findings ${fhe.browserQaTotalFindings}`);
      lines.push("");
    }

    lines.push("### prototyping.mode");
    lines.push("");
    lines.push(`- requested: ${data.prototyping.mode.requested ?? "(none)"}`);
    lines.push(`- effective: ${data.prototyping.mode.effective}`);
    lines.push(`- source: ${data.prototyping.mode.source}`);
    lines.push(`- rationale: ${data.prototyping.mode.rationale}`);
    lines.push(
      `- discussion recommendation: ${data.prototyping.mode.discussionRecommendation ?? "(none)"}`,
    );
    if (data.prototyping.mode.allowedModes) {
      lines.push(`- allowed_modes: ${data.prototyping.mode.allowedModes.join(", ")}`);
    }
    lines.push(`- surface: ${data.prototyping.mode.surface}`);
    if (data.prototyping.mode.sourceSchema) {
      lines.push(`- source schema: ${data.prototyping.mode.sourceSchema}`);
    }
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
      lines.push("");
      lines.push("### prototyping.fullHarness");
      lines.push("");
      lines.push(`- enabled: ${data.prototyping.fullHarness.enabled}`);
      lines.push(`- available: ${data.prototyping.fullHarness.available ?? "(n/a)"}`);
      lines.push(`- runId: ${data.prototyping.fullHarness.runId ?? "(none)"}`);
      lines.push(`- iterationCount: ${data.prototyping.fullHarness.iterationCount ?? "(none)"}`);
      lines.push(`- bestIteration: ${data.prototyping.fullHarness.bestIteration ?? "(none)"}`);
      lines.push(
        `- terminationReason: ${data.prototyping.fullHarness.terminationReason ?? "(none)"}`,
      );
      lines.push(
        `- reviewerSignoff.status: ${data.prototyping.fullHarness.reviewerSignoffStatus ?? "(none)"}`,
      );
      if (data.prototyping.fullHarness.scoringTraceCount !== undefined) {
        lines.push(
          `- scoringTrace: ${data.prototyping.fullHarness.scoringTraceCount} entries`,
        );
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
    lines.push("- status: foundation-only (not integrated into blocking validation in v1.7.13)");
    // Warnings
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
    ["QFAI-PROT-101", "QFAI-PROT-244", "QFAI-PROT-245", "QFAI-PROT-251", "QFAI-PROT-252", "QFAI-PROT-253", "QFAI-PROT-254"].includes(item.code),
  );
  if (renderEvidenceIssues.length > 0) {
    lines.push(
      "- render evidence が不足または不完全です。viewport coverage と artifact path を確認してください。",
    );
    lines.push(
      "- recover: `/qfai-prototyping` skill を実行し、`.qfai/evidence/prototyping.json` と render bundle を更新します。",
    );
    lines.push(
      "- why it matters: render evidence は viewport coverage と missing artifact の切り分けに使われ、strict/high profile では gate に影響します。",
    );
  }
  const calibrationIssues = data.issues.filter((item) =>
    ["QFAI-PROT-271", "QFAI-PROT-272"].includes(item.code),
  );
  if (calibrationIssues.length > 0) {
    lines.push(
      "- calibration 設定が不足しています。full-harness evidence に calibration config と scoring trace を追加してください。",
    );
  }
  const fullHarnessCompletenessIssues = data.issues.filter((item) =>
    ["QFAI-PROT-264", "QFAI-PROT-281", "QFAI-PROT-282", "QFAI-PROT-283"].includes(item.code),
  );
  if (fullHarnessCompletenessIssues.length > 0) {
    lines.push(
      "- fullHarness evidence が不完全です。terminationReason / scoringTrace / reviewerSignoff を確認してください。",
    );
  }
  lines.push("- 変更内容・受入観点は `.qfai/specs/*/18_delta.md` に記録します。");
  lines.push("- 参照ルールの正本: `.qfai/assistant/instructions/constitution.md`");

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

async function collectChangeTypeSummary(specsRoot: string): Promise<ReportChangeTypeSummary> {
  const summary: ReportChangeTypeSummary = {
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

  const deltaFiles = await collectSpecDeltaFiles(specsRoot);

  for (const deltaFile of deltaFiles) {
    const text = await readFile(deltaFile, "utf-8");
    const parsed = parseDeltaV1(text);
    for (const entry of parsed.entries) {
      if (!entry.meta) {
        continue;
      }
      const hasAllKeys = REQUIRED_DELTA_META_KEYS.every((key) =>
        Object.prototype.hasOwnProperty.call(entry.meta, key),
      );
      if (!hasAllKeys) {
        continue;
      }

      const meta = toDeltaMeta(entry.meta);
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
  }

  return summary;
}

async function collectPrototypingSummary(
  root: string,
  config: ConfigLoadResult["config"],
): Promise<ReportPrototypingSummary | undefined> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const evidenceRoot = path.join(path.dirname(specsRoot), "evidence");
  const evidencePath = path.join(evidenceRoot, "prototyping.json");
  let raw: string;
  try {
    raw = await readFile(evidencePath, "utf-8");
  } catch {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }

  const record = parsed as Record<string, unknown>;
  const mode = asRecord(record.mode);
  if (!mode || !isValidPrototypingMode(mode.effective) || typeof mode.source !== "string") {
    return undefined;
  }

  const warnings: string[] = [];

  // O-2: Track recommendation artifact status for report visibility (artifact-first)
  const resolvedArtifact = await resolveLatestRecommendationArtifact(root, config);
  warnings.push(...resolvedArtifact.warnings);
  const recommendationArtifact: ReportPrototypingSummary["recommendationArtifact"] = {
    status: resolvedArtifact.status,
    ...(resolvedArtifact.path ? { path: resolvedArtifact.path } : {}),
  };

  // Artifact-first: only use canonical artifact recommendation, never embedded fallback
  const discussionRec = resolvedArtifact.status === "valid"
    ? resolvedArtifact.recommendation
    : null;

  const effectiveRec: import("./prototyping/types.js").DiscussionModeRecommendation | undefined = discussionRec ?? undefined;

  const modeSummary = summarizeResolvedMode({
    explicitMode: isValidPrototypingMode(mode.requested) ? mode.requested : undefined,
    discussionRecommendation: effectiveRec,
    defaultMode: mode.effective,
  });
  warnings.push(...modeSummary.warnings);

  const discussionSummary = effectiveRec
    ? effectiveRec.rationale
      ? `${effectiveRec.recommendedMode} (${effectiveRec.rationale})`
      : effectiveRec.recommendedMode
    : undefined;

  // WS-3: Use shared surface inference
  const surface = inferSurfaceFromRecommendationAndEvidence({
    evidenceSurface: isValidPrototypingSurface(record.surface) ? record.surface : undefined,
    recommendationSurface: effectiveRec?.surface,
    hasUiFidelity: asRecord(record.uiFidelity) !== null,
    hasRenderBundle: asRecord(record.renderEvidence) !== null,
    hasBrowserQaBundle: asRecord(record.browserQa) !== null,
    hasUiRoutes: Array.isArray(record.specs) && record.specs.some(
      (spec: unknown) => asRecord(spec) !== null && asRecord(asRecord(spec)?.declared) !== null &&
        typeof asRecord(asRecord(spec)?.declared)?.uiRoutes === "number" &&
        (asRecord(asRecord(spec)?.declared)?.uiRoutes as number) > 0,
    ),
    hasRuntimeGateUi: asRecord(record.runtimeGate) !== null &&
      Array.isArray(asRecord(record.runtimeGate)?.ui) &&
      (asRecord(record.runtimeGate)?.ui as unknown[]).length > 0,
  });
  const effectiveMode = mode.effective;

  // WS-3: Use shared obligation matrix
  const obligations = derivePrototypingObligations({ surface, effectiveMode });

  const fullHarness = asRecord(record.fullHarness);
  const runtimeGate = asRecord(record.runtimeGate);
  const uiFidelity = asRecord(record.uiFidelity);
  const renderBundle = await readRenderEvidenceBundle(path.join(evidenceRoot, "render.json"));
  const browserQaBundle = await readBrowserQaBundle(path.join(evidenceRoot, "browser-qa.json"));
  const specs = Array.isArray(record.specs) ? record.specs : [];

  // WS-6: Fix spec coverage — compare against project spec list
  const specEntries = await collectSpecEntries(specsRoot);
  const expectedSpecIds = specEntries.map((entry) => `spec-${entry.specNumber}`.toLowerCase());
  const observedSpecIds = specs
    .filter((spec: unknown) => asRecord(spec) !== null && typeof asRecord(spec)?.specId === "string")
    .map((spec: unknown) => (asRecord(spec)!.specId as string).toLowerCase());
  const missingSpecIds = expectedSpecIds.filter((id) => !observedSpecIds.includes(id));
  const unexpectedSpecIds = observedSpecIds.filter((id) => !expectedSpecIds.includes(id));
  const specsCoverageStatus =
    expectedSpecIds.length > 0 && missingSpecIds.length === 0 ? "complete" : "incomplete";

  // WS-2: Mode precedence mismatch warning
  if (
    mode.source === "default" &&
    effectiveRec
  ) {
    warnings.push(
      `evidence mode source is "default" but discussion recommendation exists (${effectiveRec.recommendedMode})`,
    );
  }
  if (
    mode.source === "discussion-recommendation" &&
    effectiveRec &&
    mode.effective !== effectiveRec.recommendedMode
  ) {
    warnings.push(
      `evidence effective mode (${mode.effective}) does not match discussion recommendation (${effectiveRec.recommendedMode})`,
    );
  }

  const renderSummary = summarizeRenderEvidence(renderBundle);
  const renderCounts = { captured: renderSummary.captured, skipped: renderSummary.skipped, failed: renderSummary.failed };
  const inlinePayloadViolation = renderSummary.inlinePayloadViolation;

  const browserQaCounts = { error: 0, warning: 0, info: 0 } as Record<"error" | "warning" | "info", number>;
  const browserQaCategoryCounts: Record<string, number> = {};
  let browserQaTotalPassed = 0;
  let browserQaTotalFailed = 0;
  if (browserQaBundle?.findings) {
    for (const finding of browserQaBundle.findings) {
      browserQaCounts[finding.severity] += 1;
      if (finding.category) {
        browserQaCategoryCounts[finding.category] =
          (browserQaCategoryCounts[finding.category] ?? 0) + 1;
      }
    }
  }
  if (browserQaBundle?.browserQa.summary) {
    const summary = browserQaBundle.browserQa.summary;
    for (const category of ["smoke", "interaction", "visual", "accessibility"] as const) {
      const bucket = summary[category];
      if (bucket) {
        browserQaTotalPassed += bucket.passed;
        browserQaTotalFailed += bucket.failed;
      }
    }
  }
  const browserQaModeMismatch =
    browserQaBundle?.browserQa.mode !== undefined &&
    browserQaBundle.browserQa.mode !== effectiveMode;

  // WS-8: Calibration summary
  const calibrationConfig = config.prototyping?.calibration;
  const scoringTrace = fullHarness && Array.isArray(fullHarness.scoringTrace)
    ? fullHarness.scoringTrace
    : undefined;
  const calibrationSummary = calibrationConfig || scoringTrace
    ? {
        configPresent: Boolean(calibrationConfig),
        ...(calibrationConfig?.thresholds
          ? {
              thresholdSummary: {
                accept: calibrationConfig.thresholds.accept ?? 0.8,
                refine: calibrationConfig.thresholds.refine ?? 0.5,
              },
            }
          : {}),
        scoringTraceAvailable: Boolean(scoringTrace && scoringTrace.length > 0),
        ...(scoringTrace && scoringTrace.length > 0 && calibrationConfig?.thresholds
          ? {
              belowThresholdWarning: scoringTrace.some(
                (row: unknown) =>
                  asRecord(row) !== null &&
                  typeof asRecord(row)?.weightedTotal === "number" &&
                  (asRecord(row)!.weightedTotal as number) < (calibrationConfig.thresholds?.accept ?? 0.8),
              ),
            }
          : {}),
      }
    : undefined;

  // WS-F: Surface classification summary
  const { readClassificationBlock } = await import("./detection/surfaceType.js");
  const { isUiBearingSurfaceType } = await import("./detection/surfaceType.js");
  const classificationBlock = await readClassificationBlock(root);
  const surfaceClassification: ReportPrototypingSummary["surfaceClassification"] = {
    primarySurface: surface,
    uiBearing: isUiBearingSurfaceType(surface as import("./detection/surfaceType.js").SurfaceType),
    ...(classificationBlock?.secondary_surfaces?.length
      ? { secondarySurfaces: classificationBlock.secondary_surfaces }
      : {}),
    ...(classificationBlock?.classification_rationale
      ? { classificationRationale: classificationBlock.classification_rationale }
      : {}),
  };

  return {
    surfaceClassification,
    recommendationArtifact,
    mode: {
      ...(modeSummary.requested ? { requested: modeSummary.requested } : {}),
      effective: effectiveMode,
      source: modeSummary.source,
      rationale:
        typeof mode.rationale === "string" && mode.rationale.trim().length > 0
          ? mode.rationale
          : modeSummary.rationale,
      ...(discussionSummary ? { discussionRecommendation: discussionSummary } : {}),
      ...(effectiveRec?.allowedModes ? { allowedModes: effectiveRec.allowedModes } : {}),
      surface,
      ...(effectiveRec?.sourceSchema
        ? { sourceSchema: effectiveRec.sourceSchema }
        : {}),
    },
    evidence: {
      specsCoverageStatus,
      specsCoverage: {
        expectedSpecIds,
        observedSpecIds,
        missingSpecIds,
        unexpectedSpecIds,
      },
      runtimeGate: { present: Boolean(runtimeGate), required: obligations.requireRuntimeGate },
      uiFidelity: { present: Boolean(uiFidelity), required: obligations.requireUiFidelity },
      renderBundle: { present: Boolean(renderBundle), required: obligations.requireRenderBundle },
      browserQaBundle: { present: Boolean(browserQaBundle), required: obligations.requireBrowserQaBundle },
      obligationProfile: `${surface}/${effectiveMode}`,
    },
    ...(fullHarness
      ? {
          fullHarness: {
            enabled: fullHarness.enabled === true,
            ...(typeof fullHarness.available === "boolean"
              ? { available: fullHarness.available }
              : {}),
            ...(typeof fullHarness.runId === "string" ? { runId: fullHarness.runId } : {}),
            ...(typeof fullHarness.iterationCount === "number"
              ? { iterationCount: fullHarness.iterationCount }
              : {}),
            ...(typeof fullHarness.bestIteration === "number"
              ? { bestIteration: fullHarness.bestIteration }
              : {}),
            ...(typeof fullHarness.terminationReason === "string"
              ? { terminationReason: fullHarness.terminationReason }
              : {}),
            ...(asRecord(fullHarness.reviewerSignoff)?.status &&
            typeof asRecord(fullHarness.reviewerSignoff)?.status === "string"
              ? {
                  reviewerSignoffStatus: String(asRecord(fullHarness.reviewerSignoff)?.status),
                }
              : {}),
            ...(scoringTrace && scoringTrace.length > 0
              ? { scoringTraceCount: scoringTrace.length }
              : {}),
          },
        }
      : {}),
    render: {
      ...(renderBundle?.renderEvidence.status
        ? { status: renderBundle.renderEvidence.status }
        : {}),
      ...(renderBundle?.renderEvidence.requested !== undefined
        ? { requested: renderBundle.renderEvidence.requested }
        : {}),
      captured: renderCounts.captured,
      skipped: renderCounts.skipped,
      failed: renderCounts.failed,
      malformed: renderBundle === null && Boolean(record.renderEvidence),
      inlinePayloadViolation,
    },
    browserQa: {
      ...(browserQaBundle?.browserQa.status ? { status: browserQaBundle.browserQa.status } : {}),
      ...(browserQaBundle?.browserQa.executed !== undefined
        ? { executed: browserQaBundle.browserQa.executed }
        : {}),
      findingsBySeverity: browserQaCounts,
      ...(Object.keys(browserQaCategoryCounts).length > 0
        ? { findingsByCategory: browserQaCategoryCounts }
        : {}),
      ...(browserQaBundle?.browserQa.summary
        ? {
            summaryAggregates: {
              totalPassed: browserQaTotalPassed,
              totalFailed: browserQaTotalFailed,
            },
            phaseSummary: browserQaBundle.browserQa.summary,
          }
        : {}),
      ...(browserQaModeMismatch ? { modeMismatch: true } : {}),
    },
    ...(calibrationSummary ? { calibration: calibrationSummary } : {}),
    warnings,
  };
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
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

async function collectTestStrategy(
  scenarioFiles: string[],
  root: string,
  config: ConfigLoadResult["config"],
  limit: number,
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
  let totalScenarios = 0;
  let e2eCount = 0;

  for (const file of scenarioFiles) {
    const text = await readFile(file, "utf-8");
    const { document, errors } = parseScenarioDocument(text, file);
    if (!document || errors.length > 0) {
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

  const layerSamples = missingLayer.slice(0, limit);
  const sizeSamples = missingSize.slice(0, limit);
  const ratio = totalScenarios === 0 ? 0 : e2eCount / totalScenarios;
  const maxRatio = config.validation.testStrategy.maxE2eScenarioRatio;
  const maxCount = config.validation.testStrategy.maxE2eScenarioCount;

  return {
    totalScenarios,
    limit,
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

async function collectTddCoverage(entries: readonly SpecEntry[]): Promise<ReportTddCoverage> {
  const specs: ReportTddCoverageSpec[] = [];

  for (const entry of entries) {
    const testCasesPath = path.join(entry.dir, "06_Test-Cases.md");
    let tcContent: string;
    try {
      tcContent = await readFile(testCasesPath, "utf-8");
    } catch {
      continue;
    }

    const tcTable = parseFirstMarkdownTable(tcContent);
    if (!tcTable) continue;
    const tcHeaders = tcTable.headers.map((h) => h.trim());
    const tcIdIdx = tcHeaders.indexOf("TC-ID");
    if (tcIdIdx < 0) continue;
    const levelIdx = tcHeaders.indexOf("Level");

    const unitComponentTcIds = new Set<string>();
    for (const row of tcTable.rows) {
      const tcId = (row[tcIdIdx] ?? "").trim().toUpperCase();
      if (tcId.length === 0) continue;
      if (levelIdx >= 0) {
        const level = (row[levelIdx] ?? "").trim().toLowerCase();
        if (!isCoverageTargetLevel(level)) continue;
      }
      // Reaches here when: (a) Level is a coverage target, or (b) Level column is absent (fallback: all TCs)
      unitComponentTcIds.add(tcId);
    }

    if (unitComponentTcIds.size === 0) {
      specs.push({
        specNumber: entry.specNumber,
        unitComponentTotal: 0,
        doneCount: 0,
        exceptionCount: 0,
        openCount: 0,
        missingTcRefs: [],
        exceptionRows: [],
      });
      continue;
    }

    const tddListPath = path.join(entry.dir, "tdd", "test-list.md");
    let tddContent: string;
    try {
      tddContent = await readFile(tddListPath, "utf-8");
    } catch {
      specs.push({
        specNumber: entry.specNumber,
        unitComponentTotal: unitComponentTcIds.size,
        doneCount: 0,
        exceptionCount: 0,
        openCount: unitComponentTcIds.size,
        missingTcRefs: Array.from(unitComponentTcIds).sort(),
        exceptionRows: [],
      });
      continue;
    }

    const tddTable = parseFirstMarkdownTable(tddContent);
    if (!tddTable) {
      specs.push({
        specNumber: entry.specNumber,
        unitComponentTotal: unitComponentTcIds.size,
        doneCount: 0,
        exceptionCount: 0,
        openCount: unitComponentTcIds.size,
        missingTcRefs: Array.from(unitComponentTcIds).sort(),
        exceptionRows: [],
      });
      continue;
    }
    const tddHeaders = tddTable.headers.map((h) => h.trim());
    const tcRefsIdx = tddHeaders.indexOf("TC-Refs");
    const statusIdx = tddHeaders.indexOf("Status");
    const tddIdIdx = tddHeaders.indexOf("TDD-ID");
    const drIdIdx = tddHeaders.indexOf("DR-ID");

    const coveredTcIds = new Set<string>();
    const doneTcIds = new Set<string>();
    const exceptionTcIds = new Set<string>();
    const exceptionRows: Array<{ tddId: string; drId: string }> = [];

    for (const row of tddTable.rows) {
      const rowRefs: string[] = [];
      if (tcRefsIdx >= 0) {
        const refs = splitTcRefs(row[tcRefsIdx] ?? "");
        for (const ref of refs) {
          const upper = ref.toUpperCase();
          coveredTcIds.add(upper);
          rowRefs.push(upper);
          const parent = resolveParentTcId(upper);
          if (parent) {
            coveredTcIds.add(parent);
            rowRefs.push(parent);
          }
        }
      }
      const status = statusIdx >= 0 ? (row[statusIdx] ?? "").trim().toLowerCase() : "";
      if (TDD_DONE_STATUSES.has(status)) {
        for (const tc of rowRefs) doneTcIds.add(tc);
      }
      if (status === "exception") {
        for (const tc of rowRefs) exceptionTcIds.add(tc);
        exceptionRows.push({
          tddId: tddIdIdx >= 0 ? (row[tddIdIdx] ?? "").trim() : "",
          drId: drIdIdx >= 0 ? (row[drIdIdx] ?? "").trim() : "",
        });
      }
    }

    const missingTcRefs = Array.from(unitComponentTcIds)
      .filter((id) => !coveredTcIds.has(id))
      .sort();
    // Use union of done and exception to avoid double-counting overlapping TCs
    const resolvedTcIds = new Set([...doneTcIds, ...exceptionTcIds]);
    const doneCount = Array.from(unitComponentTcIds).filter((id) => doneTcIds.has(id)).length;
    const exceptionCount = Array.from(unitComponentTcIds).filter(
      (id) => exceptionTcIds.has(id) && !doneTcIds.has(id),
    ).length;
    const openCount =
      unitComponentTcIds.size -
      Array.from(unitComponentTcIds).filter((id) => resolvedTcIds.has(id)).length;

    specs.push({
      specNumber: entry.specNumber,
      unitComponentTotal: unitComponentTcIds.size,
      doneCount,
      exceptionCount,
      openCount: Math.max(0, openCount),
      missingTcRefs,
      exceptionRows,
    });
  }

  return { specs };
}

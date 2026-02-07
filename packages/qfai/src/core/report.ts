import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildContractIndex } from "./contractIndex.js";
import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import {
  collectContractFiles,
  collectScenarioFiles,
  collectSpecFiles,
} from "./discovery.js";
import { collectFiles } from "./fs.js";
import { extractAllIds, extractIds, type IdPrefix } from "./ids.js";
import { normalizeValidationResult } from "./normalize.js";
import { parseSpec } from "./parse/spec.js";
import { parseScenarioDocument } from "./scenarioModel.js";
import { classifyLayer, classifySize } from "./testStrategyTags.js";
import { toRelativePath } from "./paths.js";
import {
  normalizeCompat,
  normalizePrimary,
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
import type { Issue, ValidationCounts, ValidationResult } from "./types.js";
import { validateProject } from "./validate.js";
import { resolveToolVersion } from "./version.js";

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
  layer: Record<
    "unit" | "component" | "integration" | "api" | "e2e" | "none" | "unknown",
    number
  >;
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
  compat: Record<
    "Compatibility" | "Improvement" | "Change" | "Bug-for-bug" | "unknown",
    number
  >;
};

export type ReportChangeTypeWarning = {
  file: string;
  suspectedMismatch: string;
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
  deltaCoverage: ReportDeltaCoverage;
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
  guardrails: ReportGuardrails;
  changeType: ReportChangeType;
  issues: Issue[];
};

const ID_PREFIXES: IdPrefix[] = [
  "SPEC",
  "BR",
  "SC",
  "AC",
  "CASE",
  "UI",
  "API",
  "DB",
  "THEMA",
];
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
  const specContractRefs = await collectSpecContractRefs(
    specFiles,
    contractIdList,
  );
  const referencedContracts = new Set<string>();
  for (const entry of specContractRefs.specToContracts.values()) {
    entry.ids.forEach((id) => referencedContracts.add(id));
  }
  const referencedContractCount = contractIdList.filter((id) =>
    referencedContracts.has(id),
  ).length;
  const orphanContractCount = contractIdList.filter(
    (id) => !referencedContracts.has(id),
  ).length;
  const contractIdToSpecsRecord = mapToSortedRecord(specContractRefs.idToSpecs);
  const specToContractsRecord = mapToSpecContractRecord(
    specContractRefs.specToContracts,
  );

  const idsByPrefix = await collectIds([
    ...specFiles,
    ...scenarioFiles,
    ...apiFiles,
    ...uiFiles,
    ...dbFiles,
    ...themaFiles,
  ]);

  const upstreamIds = await collectUpstreamIds([
    ...specFiles,
    ...scenarioFiles,
  ]);
  const traceability = await evaluateTraceability(
    upstreamIds,
    srcRoot,
    testsRoot,
  );
  const resolvedValidationRaw =
    validation ?? (await validateProject(resolvedRoot, resolved));
  const normalizedValidation = normalizeValidationResult(
    resolvedRoot,
    resolvedValidationRaw,
  );
  const scCoverage = normalizedValidation.traceability.sc;
  const testFiles = normalizedValidation.traceability.testFiles;
  const scSources = await collectScIdSourcesFromScenarioFiles(scenarioFiles);
  const scSourceRecord = mapToSortedRecord(
    normalizeScSources(resolvedRoot, scSources),
  );

  const guardrailsLoad = await loadDecisionGuardrails(resolvedRoot, {
    specsRoot,
  });
  const guardrailsAll = sortDecisionGuardrails(
    normalizeDecisionGuardrails(guardrailsLoad.entries),
  );
  const guardrailsDisplay = guardrailsAll.slice(0, REPORT_GUARDRAILS_MAX);
  const guardrailsByType = { nonGoal: 0, notNow: 0, tradeOff: 0 };
  for (const item of guardrailsAll) {
    if (item.type === "non-goal") {
      guardrailsByType.nonGoal += 1;
    } else if (item.type === "not-now") {
      guardrailsByType.notNow += 1;
    } else if (item.type === "trade-off") {
      guardrailsByType.tradeOff += 1;
    }
  }
  const guardrailsErrors = guardrailsLoad.errors.map((item) => ({
    path: toRelativePath(resolvedRoot, item.path),
    message: item.message,
  }));
  const changeTypeSummary = await collectChangeTypeSummary(resolvedRoot);
  const ctypeWarnings = normalizedValidation.issues
    .filter((item) => item.code === "QFAI-CTYPE-002")
    .map((item) => ({
      file: item.file ? toRelativePath(resolvedRoot, item.file) : "(unknown)",
      suspectedMismatch: item.message,
      suggestion: item.suggested_action,
      refs: item.refs ?? [],
    }));
  const missingDeltaUpdateIssues = normalizedValidation.issues.filter(
    (item) => item.code === "QFAI-CTYPE-003",
  ).length;

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
      deltaCoverage: {
        missingUpdateIssues: missingDeltaUpdateIssues,
        status:
          missingDeltaUpdateIssues > 0 ? "missing-delta-update" : "ok",
      },
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
        acc[i.severity] += 1;
        return acc;
      },
      { info: 0, warning: 0, error: 0 },
    );

  const compatCounts = countIssuesBySeverity(issuesByCategory.compatibility);
  const changeCounts = countIssuesBySeverity(issuesByCategory.change);

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
    `- delta coverage: ${data.changeType.deltaCoverage.status === "ok" ? "OK" : "NG"} (missing update issues: ${data.changeType.deltaCoverage.missingUpdateIssues})`,
  );
  lines.push(
    `- fail-on=error: ${data.summary.counts.error > 0 ? "FAIL" : "PASS"}`,
  );
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
    lines.push(
      "- warning の扱いはチーム判断です。`--fail-on warning` 運用なら修正してください。",
    );
    lines.push(
      "- 次の手順: `qfai doctor --fail-on error` → `qfai validate --fail-on error` → `qfai report`",
    );
  } else {
    lines.push("- issue はありません。運用テンプレに沿って継続してください。");
    lines.push(
      "- 次の手順: `qfai doctor` → `qfai validate` → `qfai report`（定期的に実行）",
    );
  }
  lines.push("");

  lines.push("### Index");
  lines.push("");
  lines.push("- [Compatibility Issues](#compatibility-issues)");
  lines.push("- [Change Issues](#change-issues)");
  lines.push("- [Change Type](#change-type)");
  lines.push("- [Decision Guardrails](#decision-guardrails)");
  lines.push("- [IDs](#ids)");
  lines.push("- [Traceability](#traceability)");
  lines.push("");

  const formatIssueSummaryTable = (issues: Issue[]): string[] => {
    const issueKeyToCount = new Map<
      string,
      { category: string; severity: string; code: string; count: number }
    >();
    for (const issue of issues) {
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
      out.push(
        `#### ${item.severity.toUpperCase()} [${item.code}] ${item.message}`,
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
        const actionLines = String(item.suggested_action).split("\n");
        for (const line of actionLines) {
          out.push(`  ${line}`);
        }
      }
      out.push("");
    }
    return out;
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
      lines.push(
        `- ${formatPathLink(errorItem.path, baseUrl)}: ${errorItem.message}`,
      );
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
  lines.push(
    `- コード/テスト参照: ${data.traceability.referencedInCodeOrTests ? "あり" : "なし"}`,
  );
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
  lines.push(
    `- maxRatio: ${formatOptionalPercent(data.testStrategy.e2e.maxRatio)}`,
  );
  lines.push(
    `- maxCount: ${formatOptionalNumber(data.testStrategy.e2e.maxCount)}`,
  );
  if (
    data.testStrategy.e2e.ratioExceeded ||
    data.testStrategy.e2e.countExceeded
  ) {
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
  lines.push(
    `- total: ${data.testStrategy.missing.size.total} (limit=${data.testStrategy.limit})`,
  );
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

  lines.push("### Contract Coverage");
  lines.push("");
  lines.push(`- total: ${data.traceability.contracts.total}`);
  lines.push(`- referenced: ${data.traceability.contracts.referenced}`);
  lines.push(`- orphan: ${data.traceability.contracts.orphan}`);
  lines.push(
    `- specContractRefMissing: ${data.traceability.specs.contractRefMissing}`,
  );
  lines.push("");

  lines.push("### Contract → Spec");
  lines.push("");
  const contractToSpecs = data.traceability.contracts.idToSpecs;
  const contractIds = Object.keys(contractToSpecs).sort((a, b) =>
    a.localeCompare(b),
  );
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
  const specIds = Object.keys(specToContracts).sort((a, b) =>
    a.localeCompare(b),
  );
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

  lines.push("### SC coverage");
  lines.push("");
  lines.push(`- total: ${data.traceability.sc.total}`);
  lines.push(`- covered: ${data.traceability.sc.covered}`);
  lines.push(`- missing: ${data.traceability.sc.missing}`);
  lines.push(
    `- testFileGlobs: ${formatList(data.traceability.testFiles.globs)}`,
  );
  lines.push(
    `- testFileExcludeGlobs: ${formatList(
      data.traceability.testFiles.excludeGlobs,
    )}`,
  );
  lines.push(
    `- testFileCount: ${data.traceability.testFiles.matchedFileCount}`,
  );
  if (data.traceability.testFiles.truncated) {
    lines.push(
      `- testFileTruncated: true (limit=${data.traceability.testFiles.limit})`,
    );
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

  lines.push("### SC → referenced tests");
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

  lines.push("### Duplicate SC IDs in scenario.feature");
  lines.push("");
  const duplicateScIssues = data.issues.filter(
    (item) => item.code === "QFAI-TRACE-035",
  );
  if (duplicateScIssues.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of duplicateScIssues) {
      const location = item.file ?? "(unknown)";
      const formattedLocation =
        location === "(unknown)" ? location : formatPathLink(location, baseUrl);
      const refs =
        item.refs && item.refs.length > 0 ? item.refs.join(", ") : item.message;
      lines.push(`- ${formattedLocation}: ${refs}`);
    }
  }
  lines.push("");

  lines.push("### Hotspots");
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
    lines.push(
      "- warning の扱い（Hard Gate にするか）は運用で決めてください。",
    );
  } else {
    lines.push(
      "- issue は検出されませんでした。運用テンプレに沿って継続してください。",
    );
  }
  lines.push("- 変更内容・受入観点は `.qfai/specs/*/delta.md` に記録します。");
  lines.push(
    "- 参照ルールの正本: `.qfai/assistant/instructions/constitution.md`",
  );

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
): Promise<ReportChangeTypeSummary> {
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

  const markdownFiles = await collectFiles(root, { extensions: [".md"] });
  const deltaFiles = markdownFiles.filter(
    (file) =>
      path.basename(file).toLowerCase() === "delta.md" &&
      isRuntimeDeltaFile(file),
  );
  const requiredMetaKeys = [
    "id",
    "date",
    "primary",
    "tags",
    "compat",
    "scope",
    "notes",
  ] as const;

  for (const deltaFile of deltaFiles) {
    const text = await readFile(deltaFile, "utf-8");
    const parsed = parseDeltaV1(text);
    for (const entry of parsed.entries) {
      if (!entry.meta) {
        continue;
      }
      const hasAllKeys = requiredMetaKeys.every((key) =>
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

function isRuntimeDeltaFile(file: string): boolean {
  return !file.replace(/\\/g, "/").toLowerCase().includes("/.qfai/templates/");
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

async function collectIds(
  files: string[],
): Promise<Record<IdPrefix, string[]>> {
  const result: Record<IdPrefix, Set<string>> = {
    SPEC: new Set(),
    BR: new Set(),
    SC: new Set(),
    AC: new Set(),
    CASE: new Set(),
    UI: new Set(),
    API: new Set(),
    DB: new Set(),
    THEMA: new Set(),
  };

  for (const file of files) {
    const text = await readFile(file, "utf-8");
    for (const prefix of ID_PREFIXES) {
      const ids = extractIds(text, prefix);
      ids.forEach((id) => result[prefix].add(id));
    }
  }

  return {
    SPEC: toSortedArray(result.SPEC),
    BR: toSortedArray(result.BR),
    SC: toSortedArray(result.SC),
    AC: toSortedArray(result.AC),
    CASE: toSortedArray(result.CASE),
    UI: toSortedArray(result.UI),
    API: toSortedArray(result.API),
    DB: toSortedArray(result.DB),
    THEMA: toSortedArray(result.THEMA),
  };
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
    const padded = cells.map((cell, index) =>
      (cell ?? "").padEnd(widths[index] ?? 0),
    );
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

function mapToSortedRecord(
  values: Map<string, Set<string>>,
): Record<string, string[]> {
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
      const label = buildScenarioLabel(
        root,
        file,
        scenario.tags,
        scenario.name,
      );

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

function buildScenarioLabel(
  root: string,
  file: string,
  tags: string[],
  name: string,
): string {
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

import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import {
  collectContractFiles,
  collectScenarioFiles,
  collectSpecFiles,
} from "./discovery.js";
import { collectFiles } from "./fs.js";
import { extractAllIds, extractIds, type IdPrefix } from "./ids.js";
import {
  buildScCoverage,
  collectScIdsFromScenarioFiles,
  collectScIdSourcesFromScenarioFiles,
  collectScTestReferences,
  type ScCoverage,
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
  };
  counts: ValidationCounts;
};

export type ReportIds = {
  spec: string[];
  br: string[];
  sc: string[];
  ui: string[];
  api: string[];
  data: string[];
};

export type ReportTraceability = {
  upstreamIdsFound: number;
  referencedInCodeOrTests: boolean;
  sc: ScCoverage;
  scSources: Record<string, string[]>;
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
  issues: Issue[];
};

const ID_PREFIXES: IdPrefix[] = ["SPEC", "BR", "SC", "UI", "API", "DATA"];

export async function createReportData(
  root: string,
  validation?: ValidationResult,
  configResult?: ConfigLoadResult,
): Promise<ReportData> {
  const resolved = configResult ?? (await loadConfig(root));
  const config = resolved.config;
  const configPath = resolved.configPath;

  const specsRoot = resolvePath(root, config, "specsDir");
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const apiRoot = path.join(contractsRoot, "api");
  const uiRoot = path.join(contractsRoot, "ui");
  const dbRoot = path.join(contractsRoot, "db");
  const srcRoot = resolvePath(root, config, "srcDir");
  const testsRoot = resolvePath(root, config, "testsDir");

  const specFiles = await collectSpecFiles(specsRoot);
  const scenarioFiles = await collectScenarioFiles(specsRoot);
  const {
    api: apiFiles,
    ui: uiFiles,
    db: dbFiles,
  } = await collectContractFiles(uiRoot, apiRoot, dbRoot);

  const idsByPrefix = await collectIds([
    ...specFiles,
    ...scenarioFiles,
    ...apiFiles,
    ...uiFiles,
    ...dbFiles,
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
  const scIds = await collectScIdsFromScenarioFiles(scenarioFiles);
  const scCoverage =
    validation?.traceability?.sc ??
    buildScCoverage(
      scIds,
      await collectScTestReferences([testsRoot, srcRoot]),
    );
  const scSources = await collectScIdSourcesFromScenarioFiles(scenarioFiles);
  const scSourceRecord = mapToSortedRecord(scSources);

  const resolvedValidation =
    validation ?? (await validateProject(root, resolved));
  const version = await resolveToolVersion();

  return {
    tool: "qfai",
    version,
    generatedAt: new Date().toISOString(),
    root,
    configPath,
    summary: {
      specs: specFiles.length,
      scenarios: scenarioFiles.length,
      contracts: {
        api: apiFiles.length,
        ui: uiFiles.length,
        db: dbFiles.length,
      },
      counts: resolvedValidation.counts,
    },
    ids: {
      spec: idsByPrefix.SPEC,
      br: idsByPrefix.BR,
      sc: idsByPrefix.SC,
      ui: idsByPrefix.UI,
      api: idsByPrefix.API,
      data: idsByPrefix.DATA,
    },
    traceability: {
      upstreamIdsFound: upstreamIds.size,
      referencedInCodeOrTests: traceability,
      sc: scCoverage,
      scSources: scSourceRecord,
    },
    issues: resolvedValidation.issues,
  };
}

export function formatReportMarkdown(data: ReportData): string {
  const lines: string[] = [];

  lines.push("# QFAI Report");
  lines.push(`- 生成日時: ${data.generatedAt}`);
  lines.push(`- ルート: ${data.root}`);
  lines.push(`- 設定: ${data.configPath}`);
  lines.push(`- 版: ${data.version}`);
  lines.push("");

  lines.push("## 概要");
  lines.push(`- specs: ${data.summary.specs}`);
  lines.push(`- scenarios: ${data.summary.scenarios}`);
  lines.push(
    `- contracts: api ${data.summary.contracts.api} / ui ${data.summary.contracts.ui} / db ${data.summary.contracts.db}`,
  );
  lines.push(
    `- issues: info ${data.summary.counts.info} / warning ${data.summary.counts.warning} / error ${data.summary.counts.error}`,
  );
  lines.push("");

  lines.push("## ID集計");
  lines.push(formatIdLine("SPEC", data.ids.spec));
  lines.push(formatIdLine("BR", data.ids.br));
  lines.push(formatIdLine("SC", data.ids.sc));
  lines.push(formatIdLine("UI", data.ids.ui));
  lines.push(formatIdLine("API", data.ids.api));
  lines.push(formatIdLine("DATA", data.ids.data));
  lines.push("");

  lines.push("## トレーサビリティ");
  lines.push(`- 上流ID検出数: ${data.traceability.upstreamIdsFound}`);
  lines.push(
    `- コード/テスト参照: ${data.traceability.referencedInCodeOrTests ? "あり" : "なし"}`,
  );
  lines.push("");

  lines.push("## SCカバレッジ");
  lines.push(`- total: ${data.traceability.sc.total}`);
  lines.push(`- covered: ${data.traceability.sc.covered}`);
  lines.push(`- missing: ${data.traceability.sc.missing}`);
  if (data.traceability.sc.missingIds.length === 0) {
    lines.push("- missingIds: (none)");
  } else {
    const sources = data.traceability.scSources;
    const missingWithSources = data.traceability.sc.missingIds.map((id) => {
      const files = sources[id] ?? [];
      if (files.length === 0) {
        return id;
      }
      return `${id} (${files.join(", ")})`;
    });
    lines.push(`- missingIds: ${missingWithSources.join(", ")}`);
  }
  lines.push("");

  lines.push("## SC→参照テスト");
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
        lines.push(`- ${scId}: ${refs.join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("## Spec:SC=1:1 違反");
  const specScIssues = data.issues.filter(
    (item) => item.code === "QFAI-TRACE-012",
  );
  if (specScIssues.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of specScIssues) {
      const location = item.file ?? "(unknown)";
      const refs =
        item.refs && item.refs.length > 0
          ? item.refs.join(", ")
          : item.message;
      lines.push(`- ${location}: ${refs}`);
    }
  }
  lines.push("");

  lines.push("## Hotspots");
  const hotspots = buildHotspots(data.issues);
  if (hotspots.length === 0) {
    lines.push("- (none)");
  } else {
    for (const spot of hotspots) {
      lines.push(
        `- ${spot.file}: total ${spot.total} (error ${spot.error} / warning ${spot.warning} / info ${spot.info})`,
      );
    }
  }
  lines.push("");

  lines.push("## トレーサビリティ（検証）");
  const traceIssues = data.issues.filter(
    (item) =>
      item.rule?.startsWith("traceability.") ||
      item.code.startsWith("QFAI_TRACE") ||
      item.code.startsWith("QFAI-TRACE-") ||
      item.code === "QFAI_CONTRACT_ORPHAN",
  );
  if (traceIssues.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of traceIssues) {
      const location = item.file ? ` (${item.file})` : "";
      lines.push(
        `- ${item.severity.toUpperCase()} [${item.code}] ${item.message}${location}`,
      );
    }
  }
  lines.push("");

  lines.push("## 検証結果");
  if (data.issues.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of data.issues) {
      const location = item.file ? ` (${item.file})` : "";
      const refs =
        item.refs && item.refs.length > 0 ? ` refs=${item.refs.join(",")}` : "";
      lines.push(
        `- ${item.severity.toUpperCase()} [${item.code}] ${item.message}${location}${refs}`,
      );
    }
  }

  return lines.join("\n");
}

export function formatReportJson(data: ReportData): string {
  return JSON.stringify(data, null, 2);
}

async function collectIds(
  files: string[],
): Promise<Record<IdPrefix, string[]>> {
  const result: Record<IdPrefix, Set<string>> = {
    SPEC: new Set(),
    BR: new Set(),
    SC: new Set(),
    UI: new Set(),
    API: new Set(),
    DATA: new Set(),
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
    UI: toSortedArray(result.UI),
    API: toSortedArray(result.API),
    DATA: toSortedArray(result.DATA),
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

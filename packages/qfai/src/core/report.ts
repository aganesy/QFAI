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
import { toRelativePath } from "./paths.js";
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
  };
  counts: ValidationCounts;
};

export type ReportIds = {
  spec: string[];
  br: string[];
  sc: string[];
  ui: string[];
  api: string[];
  db: string[];
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

export type ReportData = {
  tool: "qfai";
  version: string;
  reportFormatVersion: number;
  generatedAt: string;
  root: string;
  configPath: string;
  summary: ReportSummary;
  ids: ReportIds;
  traceability: ReportTraceability;
  issues: Issue[];
};

const ID_PREFIXES: IdPrefix[] = ["SPEC", "BR", "SC", "UI", "API", "DB"];

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
  const {
    api: apiFiles,
    ui: uiFiles,
    db: dbFiles,
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

  const version = await resolveToolVersion();
  const reportFormatVersion = 1;
  const displayRoot = toRelativePath(resolvedRoot, resolvedRoot);
  const displayConfigPath = toRelativePath(resolvedRoot, configPath);

  return {
    tool: "qfai",
    version,
    reportFormatVersion,
    generatedAt: new Date().toISOString(),
    root: displayRoot,
    configPath: displayConfigPath,
    summary: {
      specs: specFiles.length,
      scenarios: scenarioFiles.length,
      contracts: {
        api: apiFiles.length,
        ui: uiFiles.length,
        db: dbFiles.length,
      },
      counts: normalizedValidation.counts,
    },
    ids: {
      spec: idsByPrefix.SPEC,
      br: idsByPrefix.BR,
      sc: idsByPrefix.SC,
      ui: idsByPrefix.UI,
      api: idsByPrefix.API,
      db: idsByPrefix.DB,
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
    issues: normalizedValidation.issues,
  };
}

export function formatReportMarkdown(data: ReportData): string {
  const lines: string[] = [];

  lines.push("# QFAI Report");
  lines.push("");
  lines.push(`- 生成日時: ${data.generatedAt}`);
  lines.push(`- ルート: ${data.root}`);
  lines.push(`- 設定: ${data.configPath}`);
  lines.push(`- 版: ${data.version}`);
  lines.push("");

  lines.push("## 概要");
  lines.push("");
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
  lines.push("");
  lines.push(formatIdLine("SPEC", data.ids.spec));
  lines.push(formatIdLine("BR", data.ids.br));
  lines.push(formatIdLine("SC", data.ids.sc));
  lines.push(formatIdLine("UI", data.ids.ui));
  lines.push(formatIdLine("API", data.ids.api));
  lines.push(formatIdLine("DB", data.ids.db));
  lines.push("");

  lines.push("## トレーサビリティ");
  lines.push("");
  lines.push(`- 上流ID検出数: ${data.traceability.upstreamIdsFound}`);
  lines.push(
    `- コード/テスト参照: ${data.traceability.referencedInCodeOrTests ? "あり" : "なし"}`,
  );
  lines.push("");

  lines.push("## 契約カバレッジ");
  lines.push("");
  lines.push(`- total: ${data.traceability.contracts.total}`);
  lines.push(`- referenced: ${data.traceability.contracts.referenced}`);
  lines.push(`- orphan: ${data.traceability.contracts.orphan}`);
  lines.push(
    `- specContractRefMissing: ${data.traceability.specs.contractRefMissing}`,
  );
  lines.push("");

  lines.push("## 契約→Spec");
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

  lines.push("## Spec→契約");
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

  lines.push("## Specで contract-ref 未宣言");
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

  lines.push("## SCカバレッジ");
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
        lines.push(`- ${scId}: ${refs.join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("## Spec:SC=1:1 違反");
  lines.push("");
  const specScIssues = data.issues.filter(
    (item) => item.code === "QFAI-TRACE-012",
  );
  if (specScIssues.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of specScIssues) {
      const location = item.file ?? "(unknown)";
      const refs =
        item.refs && item.refs.length > 0 ? item.refs.join(", ") : item.message;
      lines.push(`- ${location}: ${refs}`);
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
        `- ${spot.file}: total ${spot.total} (error ${spot.error} / warning ${spot.warning} / info ${spot.info})`,
      );
    }
  }
  lines.push("");

  lines.push("## トレーサビリティ（検証）");
  lines.push("");
  const traceIssues = data.issues.filter(
    (item) =>
      item.rule?.startsWith("traceability.") ||
      item.code.startsWith("QFAI_TRACE") ||
      item.code.startsWith("QFAI-TRACE-"),
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
  lines.push("");
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

type SpecContractRefsResult = {
  specToContracts: Map<string, SpecContractRefEntry>;
  idToSpecs: Map<string, Set<string>>;
  missingRefSpecs: Set<string>;
};

type SpecContractRefEntry = {
  status: "missing" | "declared";
  ids: Set<string>;
};

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
    UI: new Set(),
    API: new Set(),
    DB: new Set(),
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
    DB: toSortedArray(result.DB),
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

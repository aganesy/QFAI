import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig, resolvePath, getConfigPath } from "./config.js";
import { collectFiles } from "./fs.js";
import { extractAllIds, extractIds, type IdPrefix } from "./ids.js";
import type { Issue } from "./types.js";
import { validateProject } from "./validate.js";

export type ReportSummary = {
  specs: number;
  scenarios: number;
  decisions: number;
  rules: number;
  contracts: {
    api: number;
    ui: number;
    db: number;
  };
  warnings: number;
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
  warnings: Issue[];
};

const ID_PREFIXES: IdPrefix[] = ["SPEC", "BR", "SC", "UI", "API", "DATA"];

export async function createReportData(root: string): Promise<ReportData> {
  const config = await loadConfig(root);
  const configPath = getConfigPath(root);

  const specRoot = resolvePath(root, config, "specDir");
  const decisionsRoot = resolvePath(root, config, "decisionsDir");
  const scenariosRoot = resolvePath(root, config, "scenariosDir");
  const rulesRoot = resolvePath(root, config, "rulesDir");
  const apiRoot = resolvePath(root, config, "apiContractsDir");
  const uiRoot = resolvePath(root, config, "uiContractsDir");
  const dbRoot = resolvePath(root, config, "dataContractsDir");
  const srcRoot = resolvePath(root, config, "srcDir");
  const testsRoot = resolvePath(root, config, "testsDir");

  const allSpecFiles = await collectFiles(specRoot, { extensions: [".md"] });
  const specFiles = allSpecFiles.filter((file) =>
    file.toLowerCase().endsWith(`${path.sep}spec.md`),
  );
  const scenarioFiles = await collectFiles(scenariosRoot, {
    extensions: [".feature"],
  });
  const decisionFiles = await collectFiles(decisionsRoot, {
    extensions: [".md"],
  });
  const ruleFiles = await collectFiles(rulesRoot, { extensions: [".md"] });
  const apiFiles = await collectFiles(apiRoot, {
    extensions: [".yaml", ".yml", ".json"],
  });
  const uiFiles = await collectFiles(uiRoot, { extensions: [".yaml", ".yml"] });
  const dbFiles = await collectFiles(dbRoot, { extensions: [".sql"] });

  const idsByPrefix = await collectIds([
    ...specFiles,
    ...scenarioFiles,
    ...decisionFiles,
    ...ruleFiles,
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

  const validation = await validateProject(root);
  const version = await resolvePackageVersion();

  return {
    tool: "qfai",
    version,
    generatedAt: new Date().toISOString(),
    root,
    configPath,
    summary: {
      specs: specFiles.length,
      scenarios: scenarioFiles.length,
      decisions: decisionFiles.length,
      rules: ruleFiles.length,
      contracts: {
        api: apiFiles.length,
        ui: uiFiles.length,
        db: dbFiles.length,
      },
      warnings: validation.issues.length,
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
    },
    warnings: validation.issues,
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
  lines.push(`- decisions: ${data.summary.decisions}`);
  lines.push(`- rules: ${data.summary.rules}`);
  lines.push(
    `- contracts: api ${data.summary.contracts.api} / ui ${data.summary.contracts.ui} / db ${data.summary.contracts.db}`,
  );
  lines.push(`- warnings: ${data.summary.warnings}`);
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

  lines.push("## 検証結果（warning）");
  if (data.warnings.length === 0) {
    lines.push("- (none)");
  } else {
    for (const item of data.warnings) {
      const location = item.file ? ` (${item.file})` : "";
      const refs =
        item.refs && item.refs.length > 0 ? ` refs=${item.refs.join(",")}` : "";
      lines.push(`- WARN [${item.code}] ${item.message}${location}${refs}`);
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

async function resolvePackageVersion(): Promise<string> {
  try {
    const packagePath = fileURLToPath(
      new URL("../../package.json", import.meta.url),
    );
    const raw = await readFile(packagePath, "utf-8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

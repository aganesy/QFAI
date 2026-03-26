import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { Issue } from "./types.js";
import { normalizeRenderViewports, type RenderEvidenceConfig } from "./uiux/renderEvidenceTypes.js";

export type FailOn = "never" | "warning" | "error";
export type OutputFormat = "text" | "github";
export type TraceabilitySeverity = "warning" | "error";
export type OrphanContractsPolicy = "error" | "warning" | "allow";

export type QfaiPaths = {
  contractsDir: string;
  specsDir: string;
  discussionDir: string;
  outDir: string;
  skillsDir: string;
  /**
   * @deprecated v1.3.13 以降は paths.skillsDir を使用する。
   * 互換性のため読み込みのみ継続し、検証の主経路では使用しない。
   */
  promptsDir: string;
  srcDir: string;
  testsDir: string;
};

export type QfaiValidationConfig = {
  failOn: FailOn;
  require: {
    specSections: string[];
  };
  testStrategy: {
    requireLayerTags: boolean;
    requireSizeTags: boolean;
    maxE2eScenarioRatio: number | null;
    maxE2eScenarioCount: number | null;
  };
  traceability: {
    brMustHaveSc: boolean;
    scMustHaveTest: boolean;
    testFileGlobs: string[];
    testFileExcludeGlobs: string[];
    scNoTestSeverity: TraceabilitySeverity;
    orphanContractsPolicy: OrphanContractsPolicy;
    unknownContractIdSeverity: TraceabilitySeverity;
  };
};

export type QfaiOutputConfig = {
  validateJsonPath: string;
};

export type QfaiUiuxConfig = {
  platform?: string;
  designTokensDir?: string;
  htmlMockTimeout?: number;
  qualityProfile?: "strict" | "high" | "default";
  requireResearchSummary?: boolean;
  competitive_refs_min?: number;
  warning_as_error_override?: string[];
  renderEvidence?: RenderEvidenceConfig;
};

export type QfaiConfig = {
  paths: QfaiPaths;
  validation: QfaiValidationConfig;
  output: QfaiOutputConfig;
  uiux?: QfaiUiuxConfig;
};

export type ConfigPathKey = keyof QfaiPaths;

export type ConfigLoadResult = {
  config: QfaiConfig;
  issues: Issue[];
  configPath: string;
};

export type ConfigSearchResult = {
  root: string;
  configPath: string;
  found: boolean;
};

export const defaultConfig: QfaiConfig = {
  paths: {
    contractsDir: ".qfai/contracts",
    specsDir: ".qfai/specs",
    discussionDir: ".qfai/discussion",
    outDir: ".qfai/report",
    skillsDir: ".qfai/assistant/skills",
    promptsDir: ".qfai/assistant/prompts",
    srcDir: "src",
    testsDir: "tests",
  },
  validation: {
    failOn: "error",
    require: {
      specSections: [],
    },
    testStrategy: {
      requireLayerTags: false,
      requireSizeTags: false,
      maxE2eScenarioRatio: null,
      maxE2eScenarioCount: null,
    },
    traceability: {
      brMustHaveSc: true,
      scMustHaveTest: true,
      testFileGlobs: [],
      testFileExcludeGlobs: [],
      scNoTestSeverity: "error",
      orphanContractsPolicy: "error",
      unknownContractIdSeverity: "error",
    },
  },
  output: {
    validateJsonPath: ".qfai/report/validate.json",
  },
};

export function getConfigPath(root: string): string {
  return path.join(root, "qfai.config.yaml");
}

export async function findConfigRoot(startDir: string): Promise<ConfigSearchResult> {
  const resolvedStart = path.resolve(startDir);
  let current = resolvedStart;

  for (;;) {
    const configPath = getConfigPath(current);
    if (await exists(configPath)) {
      return { root: current, configPath, found: true };
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return {
    root: resolvedStart,
    configPath: getConfigPath(resolvedStart),
    found: false,
  };
}

export async function loadConfig(root: string): Promise<ConfigLoadResult> {
  const configPath = getConfigPath(root);
  const issues: Issue[] = [];

  let parsed: unknown;
  try {
    const raw = await readFile(configPath, "utf-8");
    parsed = parseYaml(raw);
  } catch (error) {
    if (isMissingFile(error)) {
      return { config: defaultConfig, issues, configPath };
    }
    issues.push(configIssue(configPath, formatError(error)));
    return { config: defaultConfig, issues, configPath };
  }

  const normalized = normalizeConfig(parsed, configPath, issues);
  return { config: normalized, issues, configPath };
}

export function resolvePath(root: string, config: QfaiConfig, key: ConfigPathKey): string {
  return path.resolve(root, config.paths[key]);
}

function normalizeConfig(raw: unknown, configPath: string, issues: Issue[]): QfaiConfig {
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "設定ファイルの形式が不正です。"));
    return defaultConfig;
  }

  const uiux = normalizeUiux(raw.uiux, configPath, issues);
  const base: QfaiConfig = {
    paths: normalizePaths(raw.paths, configPath, issues),
    validation: normalizeValidation(raw.validation, configPath, issues),
    output: normalizeOutput(raw.output, configPath, issues),
  };
  if (uiux) {
    base.uiux = uiux;
  }
  return base;
}

function normalizePaths(raw: unknown, configPath: string, issues: Issue[]): QfaiPaths {
  const base = defaultConfig.paths;
  if (!raw) {
    return base;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "paths はオブジェクトである必要があります。"));
    return base;
  }

  const promptsDir = readString(
    raw.promptsDir,
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- backward compat: read deprecated promptsDir for migration
    base.promptsDir,
    "paths.promptsDir",
    configPath,
    issues,
  );
  const usePromptsDirForSkills = raw.skillsDir === undefined && isNonEmptyString(raw.promptsDir);

  return {
    contractsDir: readString(
      raw.contractsDir,
      base.contractsDir,
      "paths.contractsDir",
      configPath,
      issues,
    ),
    specsDir: readString(raw.specsDir, base.specsDir, "paths.specsDir", configPath, issues),
    discussionDir: readString(
      raw.discussionDir,
      base.discussionDir,
      "paths.discussionDir",
      configPath,
      issues,
    ),
    outDir: readString(raw.outDir, base.outDir, "paths.outDir", configPath, issues),
    skillsDir: usePromptsDirForSkills
      ? promptsDir
      : readString(raw.skillsDir, base.skillsDir, "paths.skillsDir", configPath, issues),
    promptsDir,
    srcDir: readString(raw.srcDir, base.srcDir, "paths.srcDir", configPath, issues),
    testsDir: readString(raw.testsDir, base.testsDir, "paths.testsDir", configPath, issues),
  };
}

function normalizeValidation(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiValidationConfig {
  const base = defaultConfig.validation;
  if (!raw) {
    return base;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "validation はオブジェクトである必要があります。"));
    return base;
  }

  let requireRaw: Record<string, unknown> | undefined;
  if (raw.require === undefined) {
    requireRaw = undefined;
  } else if (isRecord(raw.require)) {
    requireRaw = raw.require;
  } else {
    issues.push(configIssue(configPath, "validation.require はオブジェクトである必要があります。"));
    requireRaw = undefined;
  }

  let traceabilityRaw: Record<string, unknown> | undefined;
  if (raw.traceability === undefined) {
    traceabilityRaw = undefined;
  } else if (isRecord(raw.traceability)) {
    traceabilityRaw = raw.traceability;
  } else {
    issues.push(
      configIssue(configPath, "validation.traceability はオブジェクトである必要があります。"),
    );
    traceabilityRaw = undefined;
  }

  let testStrategyRaw: Record<string, unknown> | undefined;
  if (raw.testStrategy === undefined) {
    testStrategyRaw = undefined;
  } else if (isRecord(raw.testStrategy)) {
    testStrategyRaw = raw.testStrategy;
  } else {
    issues.push(
      configIssue(configPath, "validation.testStrategy はオブジェクトである必要があります。"),
    );
    testStrategyRaw = undefined;
  }

  return {
    failOn: readFailOn(raw.failOn, base.failOn, "validation.failOn", configPath, issues),
    require: {
      specSections: readStringArray(
        requireRaw?.specSections,
        base.require.specSections,
        "validation.require.specSections",
        configPath,
        issues,
      ),
    },
    testStrategy: {
      requireLayerTags: readBoolean(
        testStrategyRaw?.requireLayerTags,
        base.testStrategy.requireLayerTags,
        "validation.testStrategy.requireLayerTags",
        configPath,
        issues,
      ),
      requireSizeTags: readBoolean(
        testStrategyRaw?.requireSizeTags,
        base.testStrategy.requireSizeTags,
        "validation.testStrategy.requireSizeTags",
        configPath,
        issues,
      ),
      maxE2eScenarioRatio: readOptionalRatio(
        testStrategyRaw?.maxE2eScenarioRatio,
        base.testStrategy.maxE2eScenarioRatio,
        "validation.testStrategy.maxE2eScenarioRatio",
        configPath,
        issues,
      ),
      maxE2eScenarioCount: readOptionalNonNegativeInt(
        testStrategyRaw?.maxE2eScenarioCount,
        base.testStrategy.maxE2eScenarioCount,
        "validation.testStrategy.maxE2eScenarioCount",
        configPath,
        issues,
      ),
    },
    traceability: {
      brMustHaveSc: readBoolean(
        traceabilityRaw?.brMustHaveSc,
        base.traceability.brMustHaveSc,
        "validation.traceability.brMustHaveSc",
        configPath,
        issues,
      ),
      scMustHaveTest: readBoolean(
        traceabilityRaw?.scMustHaveTest,
        base.traceability.scMustHaveTest,
        "validation.traceability.scMustHaveTest",
        configPath,
        issues,
      ),
      testFileGlobs: readStringArray(
        traceabilityRaw?.testFileGlobs,
        base.traceability.testFileGlobs,
        "validation.traceability.testFileGlobs",
        configPath,
        issues,
      ),
      testFileExcludeGlobs: readStringArray(
        traceabilityRaw?.testFileExcludeGlobs,
        base.traceability.testFileExcludeGlobs,
        "validation.traceability.testFileExcludeGlobs",
        configPath,
        issues,
      ),
      scNoTestSeverity: readTraceabilitySeverity(
        traceabilityRaw?.scNoTestSeverity,
        base.traceability.scNoTestSeverity,
        "validation.traceability.scNoTestSeverity",
        configPath,
        issues,
      ),
      orphanContractsPolicy: readOrphanContractsPolicy(
        traceabilityRaw?.orphanContractsPolicy,
        base.traceability.orphanContractsPolicy,
        "validation.traceability.orphanContractsPolicy",
        configPath,
        issues,
      ),
      unknownContractIdSeverity: readTraceabilitySeverity(
        traceabilityRaw?.unknownContractIdSeverity,
        base.traceability.unknownContractIdSeverity,
        "validation.traceability.unknownContractIdSeverity",
        configPath,
        issues,
      ),
    },
  };
}

function normalizeOutput(raw: unknown, configPath: string, issues: Issue[]): QfaiOutputConfig {
  const base = defaultConfig.output;
  if (!raw) {
    return base;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "output はオブジェクトである必要があります。"));
    return base;
  }

  return {
    validateJsonPath: readString(
      raw.validateJsonPath,
      base.validateJsonPath,
      "output.validateJsonPath",
      configPath,
      issues,
    ),
  };
}

function readString(
  value: unknown,
  fallback: string,
  label: string,
  configPath: string,
  issues: Issue[],
): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (value !== undefined) {
    issues.push(configIssue(configPath, `${label} は文字列である必要があります。`));
  }
  return fallback;
}

function readOptionalRatio(
  value: unknown,
  fallback: number | null,
  label: string,
  configPath: string,
  issues: Issue[],
): number | null {
  if (value === undefined) {
    return fallback;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1) {
    return value;
  }
  issues.push(configIssue(configPath, `${label} は 0〜1 の数値である必要があります。`));
  return fallback;
}

function readOptionalNonNegativeInt(
  value: unknown,
  fallback: number | null,
  label: string,
  configPath: string,
  issues: Issue[],
): number | null {
  if (value === undefined) {
    return fallback;
  }
  if (value === null) {
    return null;
  }
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  ) {
    return value;
  }
  issues.push(configIssue(configPath, `${label} は 0 以上の整数である必要があります。`));
  return fallback;
}

function readStringArray(
  value: unknown,
  fallback: string[],
  label: string,
  configPath: string,
  issues: Issue[],
): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  if (value !== undefined) {
    issues.push(configIssue(configPath, `${label} は文字列配列である必要があります。`));
  }
  return fallback;
}

function readBoolean(
  value: unknown,
  fallback: boolean,
  label: string,
  configPath: string,
  issues: Issue[],
): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value !== undefined) {
    issues.push(configIssue(configPath, `${label} は真偽値である必要があります。`));
  }
  return fallback;
}

function readFailOn(
  value: unknown,
  fallback: FailOn,
  label: string,
  configPath: string,
  issues: Issue[],
): FailOn {
  if (value === "never" || value === "warning" || value === "error") {
    return value;
  }
  if (value !== undefined) {
    issues.push(
      configIssue(configPath, `${label} は never|warning|error のいずれかである必要があります。`),
    );
  }
  return fallback;
}

function readTraceabilitySeverity(
  value: unknown,
  fallback: TraceabilitySeverity,
  label: string,
  configPath: string,
  issues: Issue[],
): TraceabilitySeverity {
  if (value === "warning" || value === "error") {
    return value;
  }
  if (value !== undefined) {
    issues.push(
      configIssue(configPath, `${label} は warning|error のいずれかである必要があります。`),
    );
  }
  return fallback;
}

function readOrphanContractsPolicy(
  value: unknown,
  fallback: OrphanContractsPolicy,
  label: string,
  configPath: string,
  issues: Issue[],
): OrphanContractsPolicy {
  if (value === "error" || value === "warning" || value === "allow") {
    return value;
  }
  if (value !== undefined) {
    issues.push(
      configIssue(configPath, `${label} は error|warning|allow のいずれかである必要があります。`),
    );
  }
  return fallback;
}

function normalizeUiux(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiUiuxConfig | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "uiux はオブジェクトである必要があります。"));
    return undefined;
  }
  const result: QfaiUiuxConfig = {};
  if (raw.platform !== undefined) {
    if (typeof raw.platform === "string" && raw.platform.trim().length > 0) {
      result.platform = raw.platform;
    } else {
      issues.push(configIssue(configPath, "uiux.platform は空でない文字列である必要があります。"));
    }
  }
  if (raw.designTokensDir !== undefined) {
    if (typeof raw.designTokensDir === "string" && raw.designTokensDir.trim().length > 0) {
      result.designTokensDir = raw.designTokensDir;
    } else {
      issues.push(
        configIssue(configPath, "uiux.designTokensDir は空でない文字列である必要があります。"),
      );
    }
  }
  if (raw.htmlMockTimeout !== undefined) {
    if (
      typeof raw.htmlMockTimeout === "number" &&
      Number.isFinite(raw.htmlMockTimeout) &&
      raw.htmlMockTimeout > 0
    ) {
      result.htmlMockTimeout = raw.htmlMockTimeout;
    } else {
      issues.push(configIssue(configPath, "uiux.htmlMockTimeout は正の数値である必要があります。"));
    }
  }
  if (raw.qualityProfile !== undefined) {
    if (
      typeof raw.qualityProfile === "string" &&
      ["strict", "high", "default"].includes(raw.qualityProfile)
    ) {
      result.qualityProfile = raw.qualityProfile as "strict" | "high" | "default";
    } else {
      issues.push(
        configIssue(
          configPath,
          "uiux.qualityProfile は strict|high|default のいずれかである必要があります。",
        ),
      );
    }
  }
  if (raw.requireResearchSummary !== undefined) {
    if (typeof raw.requireResearchSummary === "boolean") {
      result.requireResearchSummary = raw.requireResearchSummary;
    } else {
      issues.push(
        configIssue(configPath, "uiux.requireResearchSummary はブール値である必要があります。"),
      );
    }
  }
  if (raw.competitive_refs_min !== undefined) {
    if (
      typeof raw.competitive_refs_min === "number" &&
      Number.isFinite(raw.competitive_refs_min) &&
      raw.competitive_refs_min >= 0
    ) {
      result.competitive_refs_min = raw.competitive_refs_min;
    } else {
      issues.push(
        configIssue(configPath, "uiux.competitive_refs_min は0以上の数値である必要があります。"),
      );
    }
  }
  if (raw.warning_as_error_override !== undefined) {
    if (
      Array.isArray(raw.warning_as_error_override) &&
      raw.warning_as_error_override.every((v: unknown) => typeof v === "string")
    ) {
      result.warning_as_error_override = raw.warning_as_error_override;
    } else {
      issues.push(
        configIssue(
          configPath,
          "uiux.warning_as_error_override は文字列配列である必要があります。",
        ),
      );
    }
  }
  if (raw.renderEvidence !== undefined) {
    const renderEvidence = normalizeRenderEvidence(raw.renderEvidence, configPath, issues);
    if (renderEvidence) {
      result.renderEvidence = renderEvidence;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeRenderEvidence(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): RenderEvidenceConfig | undefined {
  if (!isRecord(raw)) {
    issues.push(
      configIssue(configPath, "uiux.renderEvidence はオブジェクトである必要があります。"),
    );
    return undefined;
  }

  const result: RenderEvidenceConfig = {};

  if (raw.enabled !== undefined) {
    if (typeof raw.enabled === "boolean") {
      result.enabled = raw.enabled;
    } else {
      issues.push(
        configIssue(configPath, "uiux.renderEvidence.enabled はブール値である必要があります。"),
      );
    }
  }

  if (raw.viewports !== undefined) {
    if (Array.isArray(raw.viewports) && raw.viewports.every((item) => typeof item === "string")) {
      result.viewports = normalizeRenderViewports(raw.viewports);
    } else {
      issues.push(
        configIssue(configPath, "uiux.renderEvidence.viewports は文字列配列である必要があります。"),
      );
    }
  }

  if (raw.out !== undefined) {
    if (typeof raw.out === "string" && raw.out.trim().length > 0) {
      result.out = raw.out.trim();
    } else {
      issues.push(
        configIssue(configPath, "uiux.renderEvidence.out は空でない文字列である必要があります。"),
      );
    }
  }

  if (raw.baseUrl !== undefined) {
    if (typeof raw.baseUrl === "string" && raw.baseUrl.trim().length > 0) {
      result.baseUrl = raw.baseUrl.trim();
    } else {
      issues.push(
        configIssue(
          configPath,
          "uiux.renderEvidence.baseUrl は空でない文字列である必要があります。",
        ),
      );
    }
  }

  if (raw.failOpen !== undefined) {
    if (typeof raw.failOpen === "boolean") {
      result.failOpen = raw.failOpen;
    } else {
      issues.push(
        configIssue(configPath, "uiux.renderEvidence.failOpen はブール値である必要があります。"),
      );
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function configIssue(file: string, message: string): Issue {
  return {
    code: "QFAI_CONFIG_INVALID",
    severity: "error",
    category: "compatibility",
    message,
    file,
    rule: "config.invalid",
  };
}

function isMissingFile(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: string }).code === "ENOENT";
  }
  return false;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

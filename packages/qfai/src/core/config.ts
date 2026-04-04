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

export type QfaiUiuxAuditConfig = {
  enabled?: boolean;
  slopDetection?: boolean;
  maxPrimaryCtas?: number;
  maxRawTokenLiteralWarnings?: number;
  maxDuplicateFindingsPerRule?: number;
};

export type QfaiUiuxMigrationConfig = {
  strict?: boolean;
};

export type QfaiUiuxConfig = {
  platform?: string;
  designTokensDir?: string;
  htmlMockTimeout?: number;
  qualityProfile?: "strict" | "high" | "default";
  requireResearchSummary?: boolean;
  competitive_refs_min?: number;
  warning_as_error_override?: string[];
  phase1ReleaseDate?: string;
  renderEvidence?: RenderEvidenceConfig;
  audit?: QfaiUiuxAuditConfig;
  migration?: QfaiUiuxMigrationConfig;
};

export type QfaiPrototypingCalibrationConfig = {
  packPath?: string;
  thresholds?: {
    accept?: number;
    refine?: number;
  };
  maxIterations?: number;
  plateauDelta?: number;
  plateauLookback?: number;
};

export type QfaiPrototypingConfig = {
  calibration?: QfaiPrototypingCalibrationConfig;
  execution?: {
    targetUrl?: string | null;
    browserProvider?: string;
    renderProvider?: string;
    reviewer?: string;
  };
};

export type QfaiConfig = {
  paths: QfaiPaths;
  validation: QfaiValidationConfig;
  output: QfaiOutputConfig;
  uiux?: QfaiUiuxConfig;
  prototyping?: QfaiPrototypingConfig;
  baseBranch?: string;
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
  prototyping: {
    calibration: {
      packPath: ".qfai/evidence/calibration.yaml",
      thresholds: {
        accept: 0.8,
        refine: 0.5,
      },
      maxIterations: 15,
      plateauDelta: 0.02,
      plateauLookback: 3,
    },
    execution: {
      targetUrl: null,
      browserProvider: "playwright",
      renderProvider: "playwright",
    },
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
  const prototyping = normalizePrototyping(raw.prototyping, configPath, issues);
  const base: QfaiConfig = {
    paths: normalizePaths(raw.paths, configPath, issues),
    validation: normalizeValidation(raw.validation, configPath, issues),
    output: normalizeOutput(raw.output, configPath, issues),
  };
  if (uiux) {
    base.uiux = uiux;
  }
  if (prototyping) {
    base.prototyping = prototyping;
  }
  const baseBranch = readOptionalString(raw.baseBranch, "baseBranch", configPath, issues);
  if (baseBranch !== undefined) {
    base.baseBranch = baseBranch;
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

function normalizePrototyping(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiPrototypingConfig | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "prototyping はオブジェクトである必要があります。"));
    return undefined;
  }

  const calibration = normalizePrototypingCalibration(raw.calibration, configPath, issues);
  const execution = normalizePrototypingExecution(raw.execution, configPath, issues);
  if (!calibration && !execution) {
    return undefined;
  }
  return {
    ...(calibration ? { calibration } : {}),
    ...(execution ? { execution } : {}),
  };
}

function normalizePrototypingCalibration(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiPrototypingCalibrationConfig | undefined {
  const base = defaultConfig.prototyping?.calibration;
  if (raw === undefined || raw === null) {
    return base ? { ...base, thresholds: { ...base.thresholds } } : undefined;
  }
  if (!isRecord(raw)) {
    issues.push(
      configIssue(configPath, "prototyping.calibration はオブジェクトである必要があります。"),
    );
    return base ? { ...base, thresholds: { ...base.thresholds } } : undefined;
  }

  const thresholds = normalizePrototypingThresholds(raw.thresholds, configPath, issues);
  return {
    packPath: readString(
      raw.packPath,
      base?.packPath ?? ".qfai/evidence/calibration.yaml",
      "prototyping.calibration.packPath",
      configPath,
      issues,
    ),
    thresholds,
    maxIterations: readPositiveInt(
      raw.maxIterations,
      base?.maxIterations ?? 15,
      "prototyping.calibration.maxIterations",
      configPath,
      issues,
    ),
    plateauDelta: readNonNegativeNumber(
      raw.plateauDelta,
      base?.plateauDelta ?? 0.02,
      "prototyping.calibration.plateauDelta",
      configPath,
      issues,
    ),
    plateauLookback: readPositiveInt(
      raw.plateauLookback,
      base?.plateauLookback ?? 3,
      "prototyping.calibration.plateauLookback",
      configPath,
      issues,
    ),
  };
}

function normalizePrototypingExecution(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): NonNullable<QfaiPrototypingConfig["execution"]> | undefined {
  const base = defaultConfig.prototyping?.execution;
  if (raw === undefined || raw === null) {
    return base ? { ...base } : undefined;
  }
  if (!isRecord(raw)) {
    issues.push(
      configIssue(configPath, "prototyping.execution はオブジェクトである必要があります。"),
    );
    return base ? { ...base } : undefined;
  }

  return {
    targetUrl:
      raw.targetUrl === null
        ? null
        : (readOptionalString(
            raw.targetUrl,
            "prototyping.execution.targetUrl",
            configPath,
            issues,
          ) ?? null),
    browserProvider: readString(
      raw.browserProvider,
      base?.browserProvider ?? "playwright",
      "prototyping.execution.browserProvider",
      configPath,
      issues,
    ),
    renderProvider: readString(
      raw.renderProvider,
      base?.renderProvider ?? "playwright",
      "prototyping.execution.renderProvider",
      configPath,
      issues,
    ),
  };
}

function normalizePrototypingThresholds(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): NonNullable<QfaiPrototypingCalibrationConfig["thresholds"]> {
  const base = defaultConfig.prototyping?.calibration?.thresholds ?? {
    accept: 0.8,
    refine: 0.5,
  };
  if (raw === undefined || raw === null) {
    return { ...base };
  }
  if (!isRecord(raw)) {
    issues.push(
      configIssue(
        configPath,
        "prototyping.calibration.thresholds はオブジェクトである必要があります。",
      ),
    );
    return { ...base };
  }

  return {
    accept: readRatio(
      raw.accept,
      base.accept ?? 0.8,
      "prototyping.calibration.thresholds.accept",
      configPath,
      issues,
    ),
    refine: readRatio(
      raw.refine,
      base.refine ?? 0.5,
      "prototyping.calibration.thresholds.refine",
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

function readOptionalString(
  value: unknown,
  label: string,
  configPath: string,
  issues: Issue[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  issues.push(configIssue(configPath, `${label} は空でない文字列である必要があります。`));
  return undefined;
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

function readRatio(
  value: unknown,
  fallback: number,
  label: string,
  configPath: string,
  issues: Issue[],
): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1) {
    return value;
  }
  if (value !== undefined) {
    issues.push(configIssue(configPath, `${label} は 0〜1 の数値である必要があります。`));
  }
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

function readPositiveInt(
  value: unknown,
  fallback: number,
  label: string,
  configPath: string,
  issues: Issue[],
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 1
  ) {
    return value;
  }
  if (value !== undefined) {
    issues.push(configIssue(configPath, `${label} は 1 以上の整数である必要があります。`));
  }
  return fallback;
}

function readNonNegativeNumber(
  value: unknown,
  fallback: number,
  label: string,
  configPath: string,
  issues: Issue[],
): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (value !== undefined) {
    issues.push(configIssue(configPath, `${label} は 0 以上の数値である必要があります。`));
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
  if (raw.phase1ReleaseDate !== undefined) {
    if (
      typeof raw.phase1ReleaseDate === "string" &&
      !isNaN(new Date(raw.phase1ReleaseDate).getTime())
    ) {
      result.phase1ReleaseDate = raw.phase1ReleaseDate;
    } else {
      issues.push(
        configIssue(configPath, "uiux.phase1ReleaseDate は有効な日付文字列である必要があります。"),
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
  if (raw.audit !== undefined) {
    const audit = normalizeUiuxAudit(raw.audit, configPath, issues);
    if (audit) {
      result.audit = audit;
    }
  }
  if (raw.migration !== undefined) {
    const migration = normalizeUiuxMigration(raw.migration, configPath, issues);
    if (migration) {
      result.migration = migration;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeUiuxAudit(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiUiuxAuditConfig | undefined {
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "uiux.audit はオブジェクトである必要があります。"));
    return undefined;
  }
  const result: QfaiUiuxAuditConfig = {};
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled === "boolean") {
      result.enabled = raw.enabled;
    } else {
      issues.push(configIssue(configPath, "uiux.audit.enabled はブール値である必要があります。"));
    }
  }
  if (raw.slopDetection !== undefined) {
    if (typeof raw.slopDetection === "boolean") {
      result.slopDetection = raw.slopDetection;
    } else {
      issues.push(
        configIssue(configPath, "uiux.audit.slopDetection はブール値である必要があります。"),
      );
    }
  }
  if (raw.maxPrimaryCtas !== undefined) {
    if (
      typeof raw.maxPrimaryCtas === "number" &&
      Number.isFinite(raw.maxPrimaryCtas) &&
      raw.maxPrimaryCtas >= 0
    ) {
      result.maxPrimaryCtas = raw.maxPrimaryCtas;
    } else {
      issues.push(
        configIssue(configPath, "uiux.audit.maxPrimaryCtas は0以上の数値である必要があります。"),
      );
    }
  }
  if (raw.maxRawTokenLiteralWarnings !== undefined) {
    if (
      typeof raw.maxRawTokenLiteralWarnings === "number" &&
      Number.isFinite(raw.maxRawTokenLiteralWarnings) &&
      raw.maxRawTokenLiteralWarnings >= 0
    ) {
      result.maxRawTokenLiteralWarnings = raw.maxRawTokenLiteralWarnings;
    } else {
      issues.push(
        configIssue(
          configPath,
          "uiux.audit.maxRawTokenLiteralWarnings は0以上の数値である必要があります。",
        ),
      );
    }
  }
  if (raw.maxDuplicateFindingsPerRule !== undefined) {
    if (
      typeof raw.maxDuplicateFindingsPerRule === "number" &&
      Number.isFinite(raw.maxDuplicateFindingsPerRule) &&
      raw.maxDuplicateFindingsPerRule >= 0
    ) {
      result.maxDuplicateFindingsPerRule = raw.maxDuplicateFindingsPerRule;
    } else {
      issues.push(
        configIssue(
          configPath,
          "uiux.audit.maxDuplicateFindingsPerRule は0以上の数値である必要があります。",
        ),
      );
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeUiuxMigration(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiUiuxMigrationConfig | undefined {
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "uiux.migration はオブジェクトである必要があります。"));
    return undefined;
  }
  const result: QfaiUiuxMigrationConfig = {};
  if (raw.strict !== undefined) {
    if (typeof raw.strict === "boolean") {
      result.strict = raw.strict;
    } else {
      issues.push(
        configIssue(configPath, "uiux.migration.strict はブール値である必要があります。"),
      );
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

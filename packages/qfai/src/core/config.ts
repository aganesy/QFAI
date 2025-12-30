import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { Issue } from "./types.js";

export type FailOn = "never" | "warning" | "error";
export type OutputFormat = "text" | "github";
export type TraceabilitySeverity = "warning" | "error";

export type QfaiPaths = {
  contractsDir: string;
  specsDir: string;
  rulesDir: string;
  outDir: string;
  promptsDir: string;
  srcDir: string;
  testsDir: string;
};

export type QfaiValidationConfig = {
  failOn: FailOn;
  require: {
    specSections: string[];
  };
  traceability: {
    brMustHaveSc: boolean;
    scMustTouchContracts: boolean;
    allowOrphanContracts: boolean;
    unknownContractIdSeverity: TraceabilitySeverity;
  };
};

export type QfaiOutputConfig = {
  validateJsonPath: string;
};

export type QfaiConfig = {
  paths: QfaiPaths;
  validation: QfaiValidationConfig;
  output: QfaiOutputConfig;
};

export type ConfigPathKey = keyof QfaiPaths;

export type ConfigLoadResult = {
  config: QfaiConfig;
  issues: Issue[];
  configPath: string;
};

export const defaultConfig: QfaiConfig = {
  paths: {
    contractsDir: ".qfai/contracts",
    specsDir: ".qfai/specs",
    rulesDir: ".qfai/rules",
    outDir: ".qfai/out",
    promptsDir: ".qfai/prompts",
    srcDir: "src",
    testsDir: "tests",
  },
  validation: {
    failOn: "error",
    require: {
      specSections: [
        "背景",
        "スコープ",
        "非ゴール",
        "用語",
        "前提",
        "決定事項",
        "業務ルール",
      ],
    },
    traceability: {
      brMustHaveSc: true,
      scMustTouchContracts: true,
      allowOrphanContracts: false,
      unknownContractIdSeverity: "error",
    },
  },
  output: {
    validateJsonPath: ".qfai/out/validate.json",
  },
};

export function getConfigPath(root: string): string {
  return path.join(root, "qfai.config.yaml");
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

export function resolvePath(
  root: string,
  config: QfaiConfig,
  key: ConfigPathKey,
): string {
  return path.resolve(root, config.paths[key]);
}

function normalizeConfig(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiConfig {
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "設定ファイルの形式が不正です。"));
    return defaultConfig;
  }

  return {
    paths: normalizePaths(raw.paths, configPath, issues),
    validation: normalizeValidation(raw.validation, configPath, issues),
    output: normalizeOutput(raw.output, configPath, issues),
  };
}

function normalizePaths(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiPaths {
  const base = defaultConfig.paths;
  if (!raw) {
    return base;
  }
  if (!isRecord(raw)) {
    issues.push(
      configIssue(configPath, "paths はオブジェクトである必要があります。"),
    );
    return base;
  }

  return {
    contractsDir: readString(
      raw.contractsDir,
      base.contractsDir,
      "paths.contractsDir",
      configPath,
      issues,
    ),
    specsDir: readString(
      raw.specsDir,
      base.specsDir,
      "paths.specsDir",
      configPath,
      issues,
    ),
    rulesDir: readString(
      raw.rulesDir,
      base.rulesDir,
      "paths.rulesDir",
      configPath,
      issues,
    ),
    outDir: readString(
      raw.outDir,
      base.outDir,
      "paths.outDir",
      configPath,
      issues,
    ),
    promptsDir: readString(
      raw.promptsDir,
      base.promptsDir,
      "paths.promptsDir",
      configPath,
      issues,
    ),
    srcDir: readString(
      raw.srcDir,
      base.srcDir,
      "paths.srcDir",
      configPath,
      issues,
    ),
    testsDir: readString(
      raw.testsDir,
      base.testsDir,
      "paths.testsDir",
      configPath,
      issues,
    ),
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
    issues.push(
      configIssue(
        configPath,
        "validation はオブジェクトである必要があります。",
      ),
    );
    return base;
  }

  let requireRaw: Record<string, unknown> | undefined;
  if (raw.require === undefined) {
    requireRaw = undefined;
  } else if (isRecord(raw.require)) {
    requireRaw = raw.require;
  } else {
    issues.push(
      configIssue(
        configPath,
        "validation.require はオブジェクトである必要があります。",
      ),
    );
    requireRaw = undefined;
  }

  let traceabilityRaw: Record<string, unknown> | undefined;
  if (raw.traceability === undefined) {
    traceabilityRaw = undefined;
  } else if (isRecord(raw.traceability)) {
    traceabilityRaw = raw.traceability;
  } else {
    issues.push(
      configIssue(
        configPath,
        "validation.traceability はオブジェクトである必要があります。",
      ),
    );
    traceabilityRaw = undefined;
  }

  return {
    failOn: readFailOn(
      raw.failOn,
      base.failOn,
      "validation.failOn",
      configPath,
      issues,
    ),
    require: {
      specSections: readStringArray(
        requireRaw?.specSections,
        base.require.specSections,
        "validation.require.specSections",
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
      scMustTouchContracts: readBoolean(
        traceabilityRaw?.scMustTouchContracts,
        base.traceability.scMustTouchContracts,
        "validation.traceability.scMustTouchContracts",
        configPath,
        issues,
      ),
      allowOrphanContracts: readBoolean(
        traceabilityRaw?.allowOrphanContracts,
        base.traceability.allowOrphanContracts,
        "validation.traceability.allowOrphanContracts",
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

function normalizeOutput(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiOutputConfig {
  const base = defaultConfig.output;
  if (!raw) {
    return base;
  }
  if (!isRecord(raw)) {
    issues.push(
      configIssue(configPath, "output はオブジェクトである必要があります。"),
    );
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
    issues.push(
      configIssue(configPath, `${label} は文字列である必要があります。`),
    );
  }
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
    issues.push(
      configIssue(configPath, `${label} は文字列配列である必要があります。`),
    );
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
    issues.push(
      configIssue(configPath, `${label} は真偽値である必要があります。`),
    );
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
      configIssue(
        configPath,
        `${label} は never|warning|error のいずれかである必要があります。`,
      ),
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
      configIssue(
        configPath,
        `${label} は warning|error のいずれかである必要があります。`,
      ),
    );
  }
  return fallback;
}

function configIssue(file: string, message: string): Issue {
  return {
    code: "QFAI_CONFIG_INVALID",
    severity: "error",
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

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

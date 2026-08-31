import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { Issue } from "./types.js";
import { SUNSETS, isAtOrPastSunset } from "./sunset.js";
import { resolveToolVersion } from "./version.js";
import { isEnoent } from "./fs/errno.js";
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
   * @deprecated paths.skillsDir を使用する。
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
    /**
     * When true (default), `qfai validate` rejects `it.todo` / `test.todo` /
     * `describe.todo` stubs in test files (QFAI-TEST-001).
     * Set to false to opt out while migrating an existing project.
     */
    forbidTestTodoStubs: boolean;
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

export type QfaiUiuxConfig = {
  platform?: string;
  designTokensDir?: string;
  htmlMockTimeout?: number;
  qualityProfile?: "strict" | "high" | "default";
  requireResearchSummary?: boolean;
  competitive_refs_min?: number;
  warning_as_error_override?: string[];
  renderEvidence?: RenderEvidenceConfig;
  audit?: QfaiUiuxAuditConfig;
};

export type QfaiPrototypingCalibrationConfig = {
  packPath?: string;
};

export type QfaiPrototypingExecutionConfig = {
  targetUrl?: string | null;
  /**
   * Browser tool handed to the AI evaluator sub-agent.
   *
   * Accepted values during the deprecation window:
   *   - `"playwright"` (primary, post-1.9.x default).
   *   - `"playwright-cli"` (deprecated; sunset `SUNSETS.playwrightCli`).
   *     Inside the window the doctor probe emits `D-DEPRECATED-PROBE` at
   *     `warning`; from the sunset onwards `normalizePrototypingExecution`
   *     rejects the value and the probe reports `error`.
   *
   * At sunset only `"playwright"` is accepted.
   */
  browserTool: "playwright" | "playwright-cli";
};

export type QfaiPrototypingConfig = {
  calibration?: QfaiPrototypingCalibrationConfig;
  execution?: QfaiPrototypingExecutionConfig;
  /**
   * Explicit primary spec ID for `/qfai-prototyping`. If omitted,
   * `resolvePrimaryPrototypingSpec` auto-detects via the prototyping marker
   * (`surface_type: ui-bearing`) in `01_Spec.md`. Format: 4-digit string,
   * e.g. `"0001"`.
   */
  primarySpecId?: string;
  /**
   * Second-wave loop posture discriminator.
   *
   *   - `convergence` (default): every prototyping gate applies at the
   *     declared severity (today's behavior).
   *   - `exploration`: medium gate relaxation — soft-rubric gates
   *     (axes-exceptional, design-compliance drift) downgrade error →
   *     warning. Schema / path / license (exit 66) gates stay hard
   *     error.
   *
   * Overridden per-run by `qfai prototyping iterate --mode <value>`.
   * Optional; absence defaults to `convergence`.
   */
  mode?: "convergence" | "exploration";
};

export type QfaiReviewConfig = {
  /**
   * Stale review-pack TTL (calendar days) used by `qfai doctor --clean`
   * to decide whether to move `.qfai/review/<ts>/` packs into
   * `.qfai/review/_archive/<ts>/`. Default (when unset) is applied at
   * the call-site by `REVIEW_STALE_TTL_DAYS_DEFAULT`.
   */
  staleTtlDays?: number;
};

export type QfaiAtddConfig = {
  /**
   * Number of consecutive un-skip + re-skip cycles tolerated before the
   * scaffold-cycle escalation fires. Default (when unset) is applied at
   * the call-site. Pre-positioned for the spec-0008 ATDD scaffold slice.
   */
  scaffoldEscalateCycles?: number;
};

export type QfaiConfig = {
  paths: QfaiPaths;
  validation: QfaiValidationConfig;
  output: QfaiOutputConfig;
  uiux?: QfaiUiuxConfig;
  prototyping?: QfaiPrototypingConfig;
  review?: QfaiReviewConfig;
  atdd?: QfaiAtddConfig;
  baseBranch?: string;
};

export type ConfigPathKey = keyof QfaiPaths;

export type ConfigLoadResult = {
  config: QfaiConfig;
  issues: Issue[];
  configPath: string;
  /**
   * The parsed YAML document, before normalization. `undefined` when the
   * file is absent (`issues` empty) or could not be read / parsed at all
   * (`issues` non-empty) — the two cases a caller distinguishes by the
   * issue list.
   *
   * `issues` records *that* something was rejected but not *which* key,
   * so it cannot answer "was the value I depend on honoured, or silently
   * replaced by its default?". Normalization is per-key and independent,
   * so an unrelated rejection (a bad `baseBranch`, say) says nothing
   * about `paths.discussionDir`. A caller whose correctness hinges on one
   * key reads it here and checks that key alone, rather than treating any
   * issue anywhere in the file as a reason to distrust the whole config.
   */
  document?: unknown;
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
      forbidTestTodoStubs: true,
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
    },
    execution: {
      targetUrl: null,
      browserTool: "playwright",
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
  const toolVersion = await resolveToolVersion();

  let parsed: unknown;
  try {
    const raw = await readFile(configPath, "utf-8");
    parsed = parseYaml(raw);
  } catch (error) {
    if (isEnoent(error)) {
      return { config: defaultConfig, issues, configPath };
    }
    issues.push(configIssue(configPath, formatError(error)));
    return { config: defaultConfig, issues, configPath };
  }

  const normalized = normalizeConfig(parsed, configPath, issues, toolVersion);
  return { config: normalized, issues, configPath, document: parsed };
}

export function resolvePath(root: string, config: QfaiConfig, key: ConfigPathKey): string {
  return path.resolve(root, config.paths[key]);
}

function normalizeConfig(
  raw: unknown,
  configPath: string,
  issues: Issue[],
  toolVersion: string,
): QfaiConfig {
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "設定ファイルの形式が不正です。"));
    return defaultConfig;
  }

  const uiux = normalizeUiux(raw.uiux, configPath, issues);
  const prototyping = normalizePrototyping(raw.prototyping, configPath, issues, toolVersion);
  const review = normalizeReview(raw.review, configPath, issues);
  const atdd = normalizeAtdd(raw.atdd, configPath, issues);
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
  if (review) {
    base.review = review;
  }
  if (atdd) {
    base.atdd = atdd;
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
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- read deprecated promptsDir
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
      forbidTestTodoStubs: readBoolean(
        testStrategyRaw?.forbidTestTodoStubs,
        base.testStrategy.forbidTestTodoStubs,
        "validation.testStrategy.forbidTestTodoStubs",
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
  toolVersion: string,
): QfaiPrototypingConfig | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "prototyping はオブジェクトである必要があります。"));
    return undefined;
  }

  const calibration = normalizePrototypingCalibration(raw.calibration, configPath, issues);
  const execution = normalizePrototypingExecution(raw.execution, configPath, issues, toolVersion);
  const primarySpecId = normalizePrimarySpecId(raw.primarySpecId, configPath, issues);
  const mode = normalizePrototypingMode(raw.mode, configPath, issues);
  if (!calibration && !execution && primarySpecId === undefined && mode === undefined) {
    return undefined;
  }
  return {
    ...(calibration ? { calibration } : {}),
    ...(execution ? { execution } : {}),
    ...(primarySpecId !== undefined ? { primarySpecId } : {}),
    ...(mode !== undefined ? { mode } : {}),
  };
}

function normalizePrototypingMode(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): "convergence" | "exploration" | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (raw === "convergence" || raw === "exploration") {
    return raw;
  }
  issues.push(
    configIssue(
      configPath,
      `prototyping.mode は "convergence" または "exploration" のみ有効です。受け取った値: ${JSON.stringify(raw)}`,
    ),
  );
  return undefined;
}

function normalizePrimarySpecId(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== "string") {
    issues.push(
      configIssue(
        configPath,
        'prototyping.primarySpecId は4桁の文字列で指定してください (例: "0012")。',
      ),
    );
    return undefined;
  }
  if (!/^\d{4}$/.test(raw)) {
    issues.push(
      configIssue(
        configPath,
        `prototyping.primarySpecId は4桁の数字文字列である必要があります (got "${raw}")。`,
      ),
    );
    return undefined;
  }
  return raw;
}

function normalizePrototypingCalibration(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiPrototypingCalibrationConfig | undefined {
  const base = defaultConfig.prototyping?.calibration;
  if (raw === undefined || raw === null) {
    return base ? { ...base } : undefined;
  }
  if (!isRecord(raw)) {
    issues.push(
      configIssue(configPath, "prototyping.calibration はオブジェクトである必要があります。"),
    );
    return base ? { ...base } : undefined;
  }

  validateObsoleteCalibrationFields(raw, configPath, issues);
  return {
    packPath: readString(
      raw.packPath,
      base?.packPath ?? ".qfai/evidence/calibration.yaml",
      "prototyping.calibration.packPath",
      configPath,
      issues,
    ),
  };
}

function normalizePrototypingExecution(
  raw: unknown,
  configPath: string,
  issues: Issue[],
  toolVersion: string,
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

  // legacy keys are rejected, not silently aliased.
  for (const legacyKey of ["browserProvider", "renderProvider"] as const) {
    if (raw[legacyKey] !== undefined) {
      issues.push(
        configIssue(
          configPath,
          `prototyping.execution.${legacyKey} は廃止されました。` +
            ` prototyping.execution.browserTool: playwright に置き換えてください。`,
        ),
      );
    }
  }

  const browserToolRaw = raw.browserTool;
  let browserTool: "playwright" | "playwright-cli" = "playwright";
  if (browserToolRaw !== undefined) {
    if (browserToolRaw !== "playwright" && browserToolRaw !== "playwright-cli") {
      issues.push(
        configIssue(
          configPath,
          `prototyping.execution.browserTool は "playwright" または "playwright-cli" のみ有効です。` +
            ` 受け取った値: ${JSON.stringify(browserToolRaw)}`,
        ),
      );
    } else if (
      browserToolRaw === "playwright-cli" &&
      isAtOrPastSunset(toolVersion, SUNSETS.playwrightCli)
    ) {
      // The deprecation window has closed. The type doc has said "at sunset
      // only `playwright` is accepted" since the window opened, but nothing
      // here enforced it — so the notice would have expired with no effect.
      // `browserTool` keeps its `playwright` default, so a run that ignores
      // the issue proceeds against the supported launcher rather than a
      // half-configured one.
      issues.push(
        configIssue(
          configPath,
          `prototyping.execution.browserTool: "playwright-cli" は qfai ${SUNSETS.playwrightCli} で廃止されました。` +
            ` "playwright" を指定し、\`npm i -D playwright\` でインストールしてください。`,
        ),
      );
    } else {
      browserTool = browserToolRaw;
    }
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
    browserTool,
  };
}

function normalizeReview(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiReviewConfig | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "review はオブジェクトである必要があります。"));
    return undefined;
  }
  const result: QfaiReviewConfig = {};
  if (raw.staleTtlDays !== undefined) {
    if (
      typeof raw.staleTtlDays === "number" &&
      Number.isFinite(raw.staleTtlDays) &&
      Number.isInteger(raw.staleTtlDays) &&
      raw.staleTtlDays >= 0
    ) {
      result.staleTtlDays = raw.staleTtlDays;
    } else {
      issues.push(
        configIssue(configPath, "review.staleTtlDays は 0 以上の整数である必要があります。"),
      );
    }
  }
  return Object.keys(result).length === 0 ? undefined : result;
}

function normalizeAtdd(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiAtddConfig | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "atdd はオブジェクトである必要があります。"));
    return undefined;
  }
  const result: QfaiAtddConfig = {};
  if (raw.scaffoldEscalateCycles !== undefined) {
    if (
      typeof raw.scaffoldEscalateCycles === "number" &&
      Number.isFinite(raw.scaffoldEscalateCycles) &&
      Number.isInteger(raw.scaffoldEscalateCycles) &&
      raw.scaffoldEscalateCycles >= 0
    ) {
      result.scaffoldEscalateCycles = raw.scaffoldEscalateCycles;
    } else {
      issues.push(
        configIssue(
          configPath,
          "atdd.scaffoldEscalateCycles は 0 以上の整数である必要があります。",
        ),
      );
    }
  }
  return Object.keys(result).length === 0 ? undefined : result;
}

function validateObsoleteCalibrationFields(
  raw: Record<string, unknown>,
  configPath: string,
  issues: Issue[],
): void {
  const obsoleteFields = [
    "thresholds",
    "maxIterations",
    "plateauDelta",
    "plateauLookback",
  ] as const;
  for (const field of obsoleteFields) {
    if (raw[field] !== undefined) {
      issues.push(
        configIssue(
          configPath,
          `prototyping.calibration.${field} は廃止されました。calibration pack のみを使用し、prototyping.calibration.packPath だけを設定してください。`,
        ),
      );
    }
  }
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
  if (raw.audit !== undefined) {
    const audit = normalizeUiuxAudit(raw.audit, configPath, issues);
    if (audit) {
      result.audit = audit;
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
    category: "canonical",
    message,
    file,
    rule: "config.invalid",
  };
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

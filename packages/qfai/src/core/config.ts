import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { Issue } from "./types.js";
import { isEnoent } from "./fs/errno.js";
import { SHIPPED_WORKFLOW_NAMES } from "../shared/shippedWorkflowNames.js";

export type FailOn = "never" | "warning" | "error";
export type OutputFormat = "text" | "github";

export type QfaiPaths = {
  contractsDir: string;
  specsDir: string;
  discussionDir: string;
  outDir: string;
  skillsDir: string;
  srcDir: string;
  testsDir: string;
  /**
   * Where the project's migrations live, if it has any.
   *
   * Optional and unset by default, because qfai cannot guess it and a project
   * without migrations is not in violation of anything. `qfai db-drift` is the
   * only reader: with no value it says the project is out of scope and stops,
   * rather than comparing the contracts against an empty directory and calling
   * every column a difference.
   */
  migrationsDir?: string;
};

export type QfaiForbiddenIdentifier = {
  sha256: string;
  byteLength: number;
};

export type QfaiValidationConfig = {
  failOn: FailOn;
  /**
   * Terms the specs must no longer state, such as an option a decision rejected.
   * `qfai validate` warns on each line of a spec document that still holds one
   * (QFAI-STORY-016). Unset means no term is checked.
   */
  staleTerms?: string[];
  /** Hash-only identifiers checked against tracked names and current file bytes. */
  forbiddenIdentifiers?: QfaiForbiddenIdentifier[];
  testStrategy: {
    /**
     * When true (default), `qfai validate` reports the silent-placeholder
     * construct of each supported stack in test files (QFAI-TEST-001). On
     * JS/TS that is `it.todo` / `test.todo` / `describe.todo` (error) and
     * `it.skip` / `test.skip` / `describe.skip` (warning).
     * Set to false to opt out while migrating an existing project.
     */
    forbidTestTodoStubs: boolean;
  };
  traceability: {
    testFileGlobs: string[];
    testFileExcludeGlobs: string[];
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
  /**
   * Component registries the project can procure from, as name to URL
   * template. The shape mirrors the `registries` map a `components.json`
   * already carries, so a project that has one restates it rather than
   * translating it.
   *
   * Which registry is primary is named by the `Component catalogue` row of the
   * Stack table in `.qfai/spec/03_contract/tech.md`. Nothing here ranks them.
   */
  registries?: Record<string, string>;
  designTokensDir?: string;
  htmlMockTimeout?: number;
  qualityProfile?: "strict" | "high" | "default";
  requireResearchSummary?: boolean;
  competitive_refs_min?: number;
  /**
   * Minimum complete component-catalogue references a UI-bearing pack must
   * register. Absent means the count is not gated; entries that are
   * registered are still held to the same three fields.
   */
  catalogue_refs_min?: number;
  /**
   * Repository-relative POSIX globs of the paths that render a user-visible
   * surface. An empty list states that the project renders none; an absent
   * key declares nothing.
   */
  surfacePaths?: string[];
  audit?: QfaiUiuxAuditConfig;
};

export type QfaiPrototypingExecutionConfig = {
  targetUrl?: string | null;
  /**
   * Browser tool handed to the AI evaluator sub-agent. Only `"playwright"` is
   * accepted.
   */
  browserTool: "playwright";
};

export type QfaiPrototypingConfig = {
  execution?: QfaiPrototypingExecutionConfig;
  /**
   * Explicit primary UI contract for `/qfai-prototyping`.
   * Uses the full `UI-NNNN` identifier.
   */
  primaryUiContract?: string;
};

export type QfaiReportConfig = {
  /**
   * Stale run-log TTL (calendar days) used by `qfai doctor --clean` to
   * decide whether a `<paths.outDir>/run-*` directory may be pruned.
   * `0` opts out entirely (never prune). Default (when unset) is applied
   * at the call-site by `RUN_LOG_STALE_TTL_DAYS_DEFAULT`.
   */
  staleTtlDays?: number;
  /**
   * Number of newest `run-*` directories retained regardless of age, so
   * `validate.log`'s `run_log:` pointer can never be pruned away.
   * Default (when unset) is applied at the call-site by
   * `RUN_LOG_KEEP_LATEST_DEFAULT`; `0` is clamped up to
   * `RUN_LOG_KEEP_LATEST_MIN` (1) there, because keeping nothing would
   * strand that pointer. Use `staleTtlDays: 0` to keep every run.
   */
  keepLatestRuns?: number;
};

/**
 * Project routing overrides replace a complete entry, keyed by the step or the
 * skill it routes. An entry carries exactly one of `step:` and `skill:`.
 */
export type QfaiRoutingEntry = Record<string, unknown> & { step?: string; skill?: string };

/** The name a routing entry is keyed by: its `step:`, else its `skill:`. */
export function routingEntryName(entry: { step?: unknown; skill?: unknown }): string | undefined {
  if (typeof entry.step === "string" && entry.step.length > 0) return entry.step;
  if (typeof entry.skill === "string" && entry.skill.length > 0) return entry.skill;
  return undefined;
}

/** Project review-profile overrides replace a complete profile, keyed by name. */
export type QfaiReviewProfile = Record<string, unknown>;

export type QfaiConfig = {
  paths: QfaiPaths;
  validation: QfaiValidationConfig;
  output: QfaiOutputConfig;
  uiux?: QfaiUiuxConfig;
  prototyping?: QfaiPrototypingConfig;
  report?: QfaiReportConfig;
  routing?: QfaiRoutingEntry[];
  reviewProfiles?: Record<string, QfaiReviewProfile>;
  baseBranch?: string;
};

/**
 * The path keys `resolvePath` can resolve: the ones every config has.
 *
 * An optional key is excluded by its type rather than by a list, so a path
 * added later joins or stays out on its own. `resolvePath` returns a string,
 * and there is no directory to return for a key the project did not set — its
 * reader has to decide what absence means, which is not something a resolver
 * can do for it.
 */
export type ConfigPathKey = {
  [K in keyof QfaiPaths]-?: undefined extends QfaiPaths[K] ? never : K;
}[keyof QfaiPaths];

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
    contractsDir: ".qfai/spec/03_contract",
    specsDir: ".qfai/spec",
    discussionDir: ".qfai/discussion",
    outDir: ".qfai/report",
    skillsDir: ".qfai/assistant/skill",
    srcDir: "src",
    testsDir: "tests",
  },
  validation: {
    failOn: "error",
    testStrategy: {
      forbidTestTodoStubs: true,
    },
    traceability: {
      testFileGlobs: [],
      testFileExcludeGlobs: [],
    },
  },
  output: {
    validateJsonPath: ".qfai/report/validate.json",
  },
  prototyping: {
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

  let parsed: unknown;
  try {
    const raw = await readFile(configPath, "utf-8");
    parsed = parseYaml(raw);
  } catch (error) {
    if (isEnoent(error)) {
      return { config: defaultConfig, issues, configPath };
    }
    issues.push(configIssue(configPath, "The configuration file could not be read or parsed."));
    return { config: defaultConfig, issues, configPath };
  }

  const normalized = normalizeConfig(parsed, configPath, issues);
  if (readWorkflowMode(parsed) === null) {
    issues.push(configIssue(configPath, WORKFLOW_MODE_MESSAGE));
  }
  if (readSkippedWorkflows(parsed) === null) {
    issues.push(configIssue(configPath, SKIPPED_WORKFLOWS_MESSAGE));
  }
  return { config: normalized, issues, configPath, document: parsed };
}

const WORKFLOW_MODES = ["active", "shadow", "off"] as const;

/** The config issue an invalid `workflow.mode` raises. */
export const WORKFLOW_MODE_MESSAGE =
  "workflow.mode must be active, shadow or off; an absent key means active.";

export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

/**
 * The workflow mode in force, read from the parsed config document. `null` means the value is
 * none of the three, and no mode is guessed in its place.
 */
export function readWorkflowMode(document: unknown): WorkflowMode | null {
  const workflow = isRecord(document) ? document.workflow : undefined;
  if (workflow === undefined) return "active";
  if (!isRecord(workflow)) return null;
  const mode = workflow.mode;
  if (mode === undefined) return "active";
  return WORKFLOW_MODES.find((known) => known === mode) ?? null;
}

/** The config issue an invalid `workflow.skipShipped` raises. */
export const SKIPPED_WORKFLOWS_MESSAGE = `workflow.skipShipped must be a list of shipped workflow file names (${[...SHIPPED_WORKFLOW_NAMES].join(", ")}); an absent key means none are skipped.`;

/**
 * The shipped workflow names `workflow.skipShipped` lists, read from the parsed config document.
 * `null` means the value is not a list of shipped names, and no entry is guessed in its place.
 */
export function readSkippedWorkflows(document: unknown): ReadonlySet<string> | null {
  const workflow = isRecord(document) ? document.workflow : undefined;
  if (!isRecord(workflow) || workflow.skipShipped === undefined) return new Set();
  const listed = workflow.skipShipped;
  if (!Array.isArray(listed)) return null;
  const names = new Set<string>();
  for (const name of listed) {
    if (typeof name !== "string" || !SHIPPED_WORKFLOW_NAMES.has(name)) return null;
    names.add(name);
  }
  return names;
}

export function resolvePath(root: string, config: QfaiConfig, key: ConfigPathKey): string {
  return path.resolve(root, config.paths[key]);
}

function normalizeConfig(raw: unknown, configPath: string, issues: Issue[]): QfaiConfig {
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "The configuration file format is invalid."));
    return defaultConfig;
  }

  const uiux = normalizeUiux(raw.uiux, configPath, issues);
  const prototyping = normalizePrototyping(raw.prototyping, configPath, issues);
  const report = normalizeReport(raw.report, configPath, issues);
  const routing = normalizeRouting(raw.routing, configPath, issues);
  const reviewProfiles = normalizeReviewProfiles(raw.reviewProfiles, configPath, issues);
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
  if (report) {
    base.report = report;
  }
  if (routing) {
    base.routing = routing;
  }
  if (reviewProfiles) {
    base.reviewProfiles = reviewProfiles;
  }
  const baseBranch = readOptionalString(raw.baseBranch, "baseBranch", configPath, issues);
  if (baseBranch !== undefined) {
    base.baseBranch = baseBranch;
  }
  return base;
}

function normalizeRouting(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiRoutingEntry[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    issues.push(
      configIssue(configPath, "routing must be a list of entries keyed by step or skill."),
    );
    return undefined;
  }
  const entries: QfaiRoutingEntry[] = [];
  const seen = new Set<string>();
  for (const [index, value] of raw.entries()) {
    const name = isRecord(value) ? routingEntryName(value) : undefined;
    const keys = isRecord(value)
      ? [value.step, value.skill].filter((key) => key !== undefined)
      : [];
    if (!isRecord(value) || name === undefined || keys.length !== 1) {
      issues.push(
        configIssue(configPath, `routing[${index}] must have exactly one non-empty step or skill.`),
      );
      continue;
    }
    if (seen.has(name)) {
      issues.push(configIssue(configPath, `routing has duplicate entry ${name}.`));
      continue;
    }
    seen.add(name);
    entries.push(
      isNonEmptyString(value.step) ? { ...value, step: name } : { ...value, skill: name },
    );
  }
  return entries;
}

function normalizeReviewProfiles(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): Record<string, QfaiReviewProfile> | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    issues.push(
      configIssue(configPath, "reviewProfiles must be a map of profile names to entries."),
    );
    return undefined;
  }
  const profiles: Record<string, QfaiReviewProfile> = {};
  for (const [name, value] of Object.entries(raw)) {
    if (!isNonEmptyString(name) || !isRecord(value)) {
      issues.push(configIssue(configPath, `reviewProfiles.${name} must be an entry.`));
      continue;
    }
    profiles[name] = { ...value };
  }
  return profiles;
}

function normalizePaths(raw: unknown, configPath: string, issues: Issue[]): QfaiPaths {
  const base = defaultConfig.paths;
  if (!raw) {
    return base;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "paths must be an object."));
    return base;
  }

  const migrationsDir = readOptionalString(
    raw.migrationsDir,
    "paths.migrationsDir",
    configPath,
    issues,
  );

  return {
    ...(migrationsDir !== undefined ? { migrationsDir } : {}),
    contractsDir: readTreeDirString(
      raw.contractsDir,
      base.contractsDir,
      "paths.contractsDir",
      configPath,
      issues,
    ),
    specsDir: readTreeDirString(raw.specsDir, base.specsDir, "paths.specsDir", configPath, issues),
    discussionDir: readDirString(
      raw.discussionDir,
      base.discussionDir,
      "paths.discussionDir",
      configPath,
      issues,
    ),
    outDir: readDirString(raw.outDir, base.outDir, "paths.outDir", configPath, issues),
    skillsDir: readDirString(raw.skillsDir, base.skillsDir, "paths.skillsDir", configPath, issues),
    srcDir: readDirString(raw.srcDir, base.srcDir, "paths.srcDir", configPath, issues),
    testsDir: readDirString(raw.testsDir, base.testsDir, "paths.testsDir", configPath, issues),
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
    issues.push(configIssue(configPath, "validation must be an object."));
    return base;
  }

  let traceabilityRaw: Record<string, unknown> | undefined;
  if (raw.traceability === undefined) {
    traceabilityRaw = undefined;
  } else if (isRecord(raw.traceability)) {
    traceabilityRaw = raw.traceability;
  } else {
    issues.push(configIssue(configPath, "validation.traceability must be an object."));
    traceabilityRaw = undefined;
  }

  let testStrategyRaw: Record<string, unknown> | undefined;
  if (raw.testStrategy === undefined) {
    testStrategyRaw = undefined;
  } else if (isRecord(raw.testStrategy)) {
    testStrategyRaw = raw.testStrategy;
  } else {
    issues.push(configIssue(configPath, "validation.testStrategy must be an object."));
    testStrategyRaw = undefined;
  }

  reportRetiredTraceabilityKeys(traceabilityRaw, configPath, issues);

  const forbiddenIdentifiers = normalizeForbiddenIdentifiers(
    raw.forbiddenIdentifiers,
    configPath,
    issues,
  );

  const staleTerms = readStringArray(
    raw.staleTerms,
    [],
    "validation.staleTerms",
    configPath,
    issues,
  );

  return {
    failOn: readFailOn(raw.failOn, base.failOn, "validation.failOn", configPath, issues),
    ...(staleTerms.length > 0 ? { staleTerms } : {}),
    ...(forbiddenIdentifiers !== undefined ? { forbiddenIdentifiers } : {}),
    testStrategy: {
      forbidTestTodoStubs: readBoolean(
        testStrategyRaw?.forbidTestTodoStubs,
        base.testStrategy.forbidTestTodoStubs,
        "validation.testStrategy.forbidTestTodoStubs",
        configPath,
        issues,
      ),
    },
    traceability: {
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
    },
  };
}

function normalizeForbiddenIdentifiers(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiForbiddenIdentifier[] | undefined {
  if (raw === undefined) return undefined;
  const invalid = (): undefined => {
    issues.push(configIssue(configPath, "validation.forbiddenIdentifiers is invalid."));
    return undefined;
  };
  if (!Array.isArray(raw) || raw.length > 64) {
    invalid();
    return undefined;
  }

  const entries: QfaiForbiddenIdentifier[] = [];
  const pairs = new Set<string>();
  const lengths = new Set<number>();
  for (const entry of raw) {
    if (
      !isRecord(entry) ||
      Object.keys(entry).length !== 2 ||
      Object.keys(entry).some((key) => key !== "sha256" && key !== "byteLength") ||
      typeof entry.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(entry.sha256) ||
      typeof entry.byteLength !== "number" ||
      !Number.isInteger(entry.byteLength) ||
      entry.byteLength < 1 ||
      entry.byteLength > 128
    ) {
      invalid();
      return undefined;
    }
    const pair = `${entry.sha256}:${entry.byteLength}`;
    if (pairs.has(pair)) {
      invalid();
      return undefined;
    }
    pairs.add(pair);
    lengths.add(entry.byteLength);
    if (lengths.size > 8) {
      invalid();
      return undefined;
    }
    entries.push({ sha256: entry.sha256, byteLength: entry.byteLength });
  }
  return entries;
}

function normalizeOutput(raw: unknown, configPath: string, issues: Issue[]): QfaiOutputConfig {
  const base = defaultConfig.output;
  if (!raw) {
    return base;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "output must be an object."));
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
    issues.push(configIssue(configPath, "prototyping must be an object."));
    return undefined;
  }

  const execution = normalizePrototypingExecution(raw.execution, configPath, issues);
  if (Object.prototype.hasOwnProperty.call(raw, "primarySpecId")) {
    issues.push(
      configIssue(
        configPath,
        "prototyping.primarySpecId is retired; use prototyping.primaryUiContract: UI-NNNN.",
      ),
    );
  }
  const primaryUiContract = normalizePrimaryUiContract(raw.primaryUiContract, configPath, issues);
  if (!execution && primaryUiContract === undefined) {
    return undefined;
  }
  return {
    ...(execution ? { execution } : {}),
    ...(primaryUiContract !== undefined ? { primaryUiContract } : {}),
  };
}

function normalizePrimaryUiContract(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== "string" || !/^UI-\d{4}$/.test(raw)) {
    issues.push(configIssue(configPath, primaryUiContractMessage(raw)));
    return undefined;
  }
  return raw;
}

function primaryUiContractMessage(raw: unknown): string {
  return `prototyping.primaryUiContract must be a full UI-NNNN ID; received ${JSON.stringify(raw)}.`;
}

/**
 * Why the file's `prototyping.primaryUiContract` was rejected, or `undefined` when the file sets
 * none or the value was accepted. A command that selects the primary UI contract refuses on it,
 * because the loaded config would otherwise fall back to the first UI contract.
 */
export function readRejectedPrimaryUiContract(loaded: ConfigLoadResult): string | undefined {
  const prototyping = isRecord(loaded.document) ? loaded.document.prototyping : undefined;
  const raw = isRecord(prototyping) ? prototyping.primaryUiContract : undefined;
  if (raw === undefined || raw === null) return undefined;
  if (loaded.config.prototyping?.primaryUiContract !== undefined) return undefined;
  return primaryUiContractMessage(raw);
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
    issues.push(configIssue(configPath, "prototyping.execution must be an object."));
    return base ? { ...base } : undefined;
  }

  const browserToolRaw = raw.browserTool;
  const browserTool = "playwright";
  if (browserToolRaw !== undefined && browserToolRaw !== browserTool) {
    // `browserTool` keeps its `playwright` default, so a run that ignores the
    // issue proceeds against the supported launcher.
    issues.push(
      configIssue(
        configPath,
        `prototyping.execution.browserTool must be "playwright".` +
          ` Received: ${JSON.stringify(browserToolRaw)}`,
      ),
    );
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

function readNonNegativeInteger(
  raw: unknown,
  field: string,
  configPath: string,
  issues: Issue[],
): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && Number.isInteger(raw) && raw >= 0) {
    return raw;
  }
  issues.push(configIssue(configPath, `${field} must be an integer greater than or equal to 0.`));
  return undefined;
}

function normalizeReport(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiReportConfig | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "report must be an object."));
    return undefined;
  }
  const result: QfaiReportConfig = {};
  if (raw.staleTtlDays !== undefined) {
    const value = readNonNegativeInteger(
      raw.staleTtlDays,
      "report.staleTtlDays",
      configPath,
      issues,
    );
    if (value !== undefined) {
      result.staleTtlDays = value;
    }
  }
  if (raw.keepLatestRuns !== undefined) {
    const value = readNonNegativeInteger(
      raw.keepLatestRuns,
      "report.keepLatestRuns",
      configPath,
      issues,
    );
    if (value !== undefined) {
      result.keepLatestRuns = value;
    }
  }
  return Object.keys(result).length === 0 ? undefined : result;
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
    issues.push(configIssue(configPath, `${label} must be a string.`));
  }
  return fallback;
}

/**
 * A configured directory, with any trailing separators removed.
 *
 * Readers use these values two ways: joined with a child path, where a trailing
 * separator is harmless, and tested as a prefix, where it is not. `".qfai/spec/"`
 * builds the prefix `".qfai/spec//"`, which no repository path starts with, so a
 * gate keyed on it selects nothing and reports a pass over an empty set. Settling
 * the spelling here is what stops one reader from working on a value another
 * silently drops.
 *
 * A value that is only separators keeps what was written: trimming it to the
 * empty string would silently retarget the reader at the repository root.
 */
function readDirString(
  value: unknown,
  fallback: string,
  label: string,
  configPath: string,
  issues: Issue[],
): string {
  const raw = readString(value, fallback, label, configPath, issues);
  const trimmed = raw.replace(/[\\/]+$/, "");
  return trimmed.length > 0 ? trimmed : raw;
}

/**
 * A story-tree root, with every backslash read as `/` on every platform.
 *
 * The shipped document-schema checker reads these two keys itself, without
 * loading the configuration module, and takes a backslash as a separator. Folding here as well keeps
 * `qfai validate` and that checker on one directory for one value: on Linux and
 * macOS the platform's own path rules would otherwise read `.qfai\spec` as a
 * single directory name.
 */
function readTreeDirString(
  value: unknown,
  fallback: string,
  label: string,
  configPath: string,
  issues: Issue[],
): string {
  return readDirString(value, fallback, label, configPath, issues).replace(/\\/g, "/");
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
  issues.push(configIssue(configPath, `${label} must be a non-empty string.`));
  return undefined;
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
    issues.push(configIssue(configPath, `${label} must be an array of strings.`));
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
    issues.push(configIssue(configPath, `${label} must be a boolean.`));
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
    issues.push(configIssue(configPath, `${label} must be one of never|warning|error.`));
  }
  return fallback;
}

/**
 * `validation.traceability` keys no validator reads. The migration from the
 * spec-pack layout recognises the finding for each one that is still present,
 * and `QFAI-CFG-001` reports it until the key is deleted.
 */
const RETIRED_TRACEABILITY_KEYS = ["scMustHaveTest", "unknownContractIdSeverity"] as const;

function reportRetiredTraceabilityKeys(
  traceabilityRaw: Record<string, unknown> | undefined,
  configPath: string,
  issues: Issue[],
): void {
  if (!traceabilityRaw) {
    return;
  }
  for (const key of RETIRED_TRACEABILITY_KEYS) {
    if (traceabilityRaw[key] === undefined) {
      continue;
    }
    issues.push(
      configDeprecatedIssue(
        configPath,
        `validation.traceability.${key} is retired.` +
          ` No check reads it, so setting it changes nothing.` +
          ` Remove it from qfai.config.yaml.`,
      ),
    );
  }
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
    issues.push(configIssue(configPath, "uiux must be an object."));
    return undefined;
  }
  const result: QfaiUiuxConfig = {};
  if (raw.platform !== undefined) {
    if (typeof raw.platform === "string" && raw.platform.trim().length > 0) {
      result.platform = raw.platform;
    } else {
      issues.push(configIssue(configPath, "uiux.platform must be a non-empty string."));
    }
  }
  if (raw.designTokensDir !== undefined) {
    if (typeof raw.designTokensDir === "string" && raw.designTokensDir.trim().length > 0) {
      result.designTokensDir = raw.designTokensDir;
    } else {
      issues.push(configIssue(configPath, "uiux.designTokensDir must be a non-empty string."));
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
      issues.push(configIssue(configPath, "uiux.htmlMockTimeout must be a positive number."));
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
        configIssue(configPath, "uiux.qualityProfile must be one of strict|high|default."),
      );
    }
  }
  if (raw.requireResearchSummary !== undefined) {
    if (typeof raw.requireResearchSummary === "boolean") {
      result.requireResearchSummary = raw.requireResearchSummary;
    } else {
      issues.push(configIssue(configPath, "uiux.requireResearchSummary must be a boolean."));
    }
  }
  if (raw.competitive_refs_min !== undefined) {
    // Integers only. A count of references is discrete, and now that the knob
    // is a blocking gate a fractional bound is silently rounded up by the
    // comparison while the finding still reports the fraction — `2.5` demands
    // three references and says "at least 2.5".
    if (
      typeof raw.competitive_refs_min === "number" &&
      Number.isInteger(raw.competitive_refs_min) &&
      raw.competitive_refs_min >= 0
    ) {
      result.competitive_refs_min = raw.competitive_refs_min;
    } else {
      issues.push(
        configIssue(
          configPath,
          "uiux.competitive_refs_min must be an integer greater than or equal to 0.",
        ),
      );
    }
  }

  if (raw.catalogue_refs_min !== undefined) {
    if (
      typeof raw.catalogue_refs_min === "number" &&
      Number.isInteger(raw.catalogue_refs_min) &&
      raw.catalogue_refs_min >= 0
    ) {
      result.catalogue_refs_min = raw.catalogue_refs_min;
    } else {
      issues.push(
        configIssue(configPath, "uiux.catalogue_refs_min must be an integer of 0 or more."),
      );
    }
  }
  if (raw.surfacePaths !== undefined) {
    const surfacePaths = raw.surfacePaths;
    if (
      Array.isArray(surfacePaths) &&
      surfacePaths.every(
        (entry: unknown): entry is string => typeof entry === "string" && entry.trim().length > 0,
      )
    ) {
      result.surfacePaths = surfacePaths.map((entry) => entry.trim());
    } else {
      issues.push(
        configIssue(configPath, "uiux.surfacePaths must be a list of non-empty glob strings."),
      );
    }
  }
  if (raw.registries !== undefined) {
    const registries = normalizeUiuxRegistries(raw.registries, configPath, issues);
    if (registries) {
      result.registries = registries;
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

/**
 * A registry entry resolves one component name, so the template has to say
 * where the name goes. A URL without the placeholder resolves nothing and is
 * the typo this catches; everything else about the URL is the registry's
 * business, including its scheme, because a private one may sit on localhost.
 */
function normalizeUiuxRegistries(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): Record<string, string> | undefined {
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "uiux.registries must be an object."));
    return undefined;
  }
  const result: Record<string, string> = {};
  for (const [name, url] of Object.entries(raw)) {
    if (typeof url !== "string" || url.trim().length === 0) {
      issues.push(configIssue(configPath, `uiux.registries.${name} must be a non-empty string.`));
      continue;
    }
    if (!url.includes("{name}")) {
      issues.push(
        configIssue(
          configPath,
          `uiux.registries.${name} must contain the {name} placeholder, or it resolves no component.`,
        ),
      );
      continue;
    }
    result[name] = url;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeUiuxAudit(
  raw: unknown,
  configPath: string,
  issues: Issue[],
): QfaiUiuxAuditConfig | undefined {
  if (!isRecord(raw)) {
    issues.push(configIssue(configPath, "uiux.audit must be an object."));
    return undefined;
  }
  const result: QfaiUiuxAuditConfig = {};
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled === "boolean") {
      result.enabled = raw.enabled;
    } else {
      issues.push(configIssue(configPath, "uiux.audit.enabled must be a boolean."));
    }
  }
  if (raw.slopDetection !== undefined) {
    if (typeof raw.slopDetection === "boolean") {
      result.slopDetection = raw.slopDetection;
    } else {
      issues.push(configIssue(configPath, "uiux.audit.slopDetection must be a boolean."));
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
        configIssue(
          configPath,
          "uiux.audit.maxPrimaryCtas must be a number greater than or equal to 0.",
        ),
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
          "uiux.audit.maxRawTokenLiteralWarnings must be a number greater than or equal to 0.",
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
          "uiux.audit.maxDuplicateFindingsPerRule must be a number greater than or equal to 0.",
        ),
      );
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function configIssue(file: string, message: string): Issue {
  return {
    code: "QFAI-CFG-002",
    severity: "error",
    category: "canonical",
    message,
    file,
    rule: "config.invalid",
  };
}

function configDeprecatedIssue(file: string, message: string): Issue {
  return {
    code: "QFAI-CFG-001",
    severity: "error",
    category: "canonical",
    message,
    file,
    rule: "config.deprecatedKey",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

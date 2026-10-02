import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ConfigLoadResult, FailOn, QfaiConfig } from "../../core/config.js";
import { loadConfig, resolvePath } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { buildCiProfileIssue } from "../../core/phasePolicy.js";
import { createReportData, formatReportJson, formatReportMarkdown } from "../../core/report.js";
import { writeBusinessFlowReports } from "../../core/specPackReport.js";
import { resolveFlowScope } from "../../core/flowScope.js";
import { readStoryTreeModel } from "../../core/storyTree/tree.js";
import { isStoryTreeProject } from "../../core/storyTree/layout.js";
import type { ValidationProfile, ValidationResult } from "../../core/types.js";
import { countIssues, validateProject } from "../../core/validate.js";
import { shouldFail } from "../lib/failOn.js";
import { error, info, warn } from "../../core/logger.js";
import type { LegacyValidateJsonGate } from "./validate.js";
import {
  appendIssue,
  evaluateLegacyValidateJsonGate,
  profileSuffixedReportPath,
  scopedReportPath,
} from "./validate.js";

export type ReportOptions = {
  root: string;
  format: "md" | "json";
  outPath?: string;
  inputPath?: string;
  runValidate?: boolean;
  baseUrl?: string;
  profile?: ValidationProfile;
  failOn?: FailOn;
  strict?: boolean;
  /** `--flow <BF-NNNN>` values; empty / absent = the whole repo. */
  flowIds?: readonly string[];
};

type ReportPaths = {
  /** Where the validate result is read from (or written to under `--run-validate`). */
  validateJsonPath: string;
  /** Absolute path the rendered report is written to. */
  outPath: string;
};

/**
 * Resolve validate and report paths. A flow-scoped run uses the same suffix
 * as validate. An explicit `--out` still selects the report destination.
 */
function resolveReportPaths(
  root: string,
  config: QfaiConfig,
  options: ReportOptions,
): ReportPaths | null {
  const outRoot = resolvePath(root, config, "outDir");
  const defaultOut =
    options.format === "json" ? path.join(outRoot, "report.json") : path.join(outRoot, "report.md");
  const configuredValidateJson = config.output.validateJsonPath;
  const flowIds = options.flowIds ?? [];
  const scopedValidateJson =
    flowIds.length > 0 ? scopedReportPath(configuredValidateJson, flowIds) : configuredValidateJson;
  const scopedOut = flowIds.length > 0 ? scopedReportPath(defaultOut, flowIds) : defaultOut;
  if (scopedValidateJson === null || scopedOut === null) {
    return null;
  }
  const out = options.outPath ?? scopedOut;
  return {
    validateJsonPath: scopedValidateJson,
    outPath: path.isAbsolute(out) ? out : path.resolve(root, out),
  };
}

/**
 * True when an explicit `--in` file carries the scope the run was asked for.
 *
 * The stored validation result carries findings and waiver totals that cannot
 * be reconstructed by filtering a repository-wide result. The scoped file
 * name is the available provenance. `--profile` adds its suffix to that name.
 */
function inputCarriesRequestedScope(
  inputPath: string,
  scopedValidateJsonPath: string,
  profile: ValidationProfile | undefined,
): boolean {
  const accepted = new Set([path.basename(scopedValidateJsonPath)]);
  if (profile) {
    accepted.add(path.basename(profileSuffixedReportPath(scopedValidateJsonPath, profile)));
  }
  return accepted.has(path.basename(inputPath));
}

/**
 * The ENOENT guidance for a missing validate result.
 *
 * Repeat `--flow` and `--profile` so the suggested validate command writes
 * the exact file the report command attempted to read.
 */
function buildMissingInputGuidance(
  inputPath: string,
  flowIds: readonly string[],
  profile: ValidationProfile | undefined,
  expectedValidateJsonPath: string,
): string {
  const header = [`qfai report: input file not found: ${inputPath}`, ""];
  const profileArg = profile ? ` --profile ${profile}` : "";
  if (flowIds.length === 0) {
    return [
      ...header,
      "Run qfai validate first. For example:",
      `  qfai validate${profileArg}`,
      `(default output path: ${expectedValidateJsonPath})`,
      "",
      "Alternatively, pass --run-validate to report.",
      "If you use the GitHub Actions template, run the workflow's validate job first.",
    ].join("\n");
  }
  const unit = "flow";
  const scopeArgs = flowIds.map((id) => `--flow ${id}`).join(" ");
  return [
    ...header,
    `report with --${unit} reads the scoped validate result. Run validate with the same --${unit} first. For example:`,
    `  qfai validate ${scopeArgs}${profileArg}`,
    `(output path: ${expectedValidateJsonPath})`,
    "",
    `Alternatively, pass --run-validate to report itself. For example:`,
    `  qfai report ${scopeArgs}${profileArg} --run-validate`,
  ].join("\n");
}

/**
 * Write the report and return an exit code by the same criteria as `validate`.
 * 0 = gate passed, 1 = gate failed, 2 = usage error or missing input validate.json.
 */
export async function runReport(options: ReportOptions): Promise<number> {
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  const flowIds = options.flowIds ?? [];
  const storyTree = await isStoryTreeProject(root, configResult.config);
  if (!storyTree) {
    error(
      "qfai report: this project does not contain a story tree. Migrate the specs before reporting.",
    );
    return 2;
  }
  if (flowIds.length > 0) {
    const flowScope = resolveFlowScope(
      flowIds,
      await readStoryTreeModel(root, configResult.config),
    );
    if (flowScope.invalidValues.length > 0) {
      error(`qfai report: unknown or invalid --flow value: ${flowScope.invalidValues.join(", ")}`);
      return 2;
    }
  }
  const paths = resolveReportPaths(root, configResult.config, options);
  if (paths === null) {
    error(
      [
        `qfai report: --flow values are not readable as business flow IDs: ${flowIds.join(", ")}`,
        "For example: --flow BF-0001",
      ].join("\n"),
    );
    return 2;
  }
  let validation: ValidationResult;
  let ranNarrowProfileInCi: boolean;
  if (options.runValidate) {
    if (options.inputPath) {
      warn("report: --in is ignored because --run-validate was given.");
    }
    // Same migration gate `runValidate` enforces, evaluated once and handed to
    // the run below. Post-sunset, a config still pointing at
    // `.qfai/output/validate.json` gets no write — least of all a brand-new
    // `validate.flow-<ids>.json` inside the directory the sunset exists to
    // retire, which would read as "still fine to write here".
    const legacyGate = await evaluateLegacyValidateJsonGate({
      root,
      configuredValidateJsonPath: configResult.config.output.validateJsonPath,
    });
    if (legacyGate.refuseConfiguredLegacyWrite) {
      // Said on stderr as well as carried as a finding: the finding tells the
      // gate what to exit on, and this tells the operator which setting to
      // change. The run itself proceeds, the same way `validate` proceeds —
      // only the write to the retired path is dropped.
      error(
        [
          `qfai report: qfai.config.yaml#output.validateJsonPath points at the sunset legacy SSOT (${configResult.config.output.validateJsonPath}).`,
          "Refused to write the validate result. Update output.validateJsonPath to .qfai/report/validate.json and run again.",
        ].join("\n"),
      );
    }
    const ran = await runValidateForReport(
      root,
      configResult,
      options,
      paths.validateJsonPath,
      legacyGate,
    );
    ranNarrowProfileInCi = ran.ranNarrowProfileInCi;
    validation = ran.validation;
  } else {
    const inputPath = resolveInputPath(
      root,
      paths.validateJsonPath,
      options.inputPath,
      options.profile,
    );
    if (
      options.inputPath !== undefined &&
      flowIds.length > 0 &&
      !inputCarriesRequestedScope(inputPath, paths.validateJsonPath, options.profile)
    ) {
      const unit = "flow";
      const scopeArgs = flowIds.map((id) => `--flow ${id}`).join(" ");
      error(
        [
          `qfai report: the --in validate result does not match the --${unit} scope: ${inputPath}`,
          `report with --${unit} takes counts, issues, and waiver totals from the input file as they are.`,
          `Pass the scoped validate result named ${path.basename(paths.validateJsonPath)}. For example:`,
          `  qfai validate ${scopeArgs}`,
          `  qfai report ${scopeArgs}`,
        ].join("\n"),
      );
      return 2;
    }
    const loaded = await loadValidationResult(
      inputPath,
      flowIds,
      options.profile,
      resolveInputPath(root, paths.validateJsonPath, undefined, options.profile),
    );
    if (loaded === null) {
      return 2;
    }
    warnOnProfileMismatch(inputPath, loaded, options.profile);
    // As on the --run-validate side, report that CI used a narrow profile.
    // No finding is added here: the validate output that was read already
    // carries QFAI-VALIDATE-017 from the validate run that wrote it.
    //
    // Judge by the profile the report actually adopted, not the one requested.
    // An explicit `--in` wins even on a mismatch, so in a combination such as
    // `--profile sdd --in validate-prototyping.json` the profile recorded in
    // the artifact reflects what was used. Fall back to the requested value
    // only for the older format that records no profile.
    ranNarrowProfileInCi = buildCiProfileIssue(loaded.profile ?? options.profile) !== null;
    validation = loaded;
  }

  // Render only the flows named by the input scope.
  const data = await createReportData(root, configResult.config, validation, flowIds);
  const output =
    options.format === "json"
      ? formatReportJson(data)
      : formatReportMarkdown(data, options.baseUrl ? { baseUrl: options.baseUrl } : {});

  const outPath = paths.outPath;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${output}\n`, "utf-8");
  // A scoped run writes only its selected flow directories.
  await writeBusinessFlowReports(root, configResult.config, flowIds);

  if (ranNarrowProfileInCi) {
    // Reported, not fatal: the run happened and its findings are real. Exiting
    // non-zero here made every stage gate that names a narrow profile
    // unreachable in CI.
    warn(
      "report: a non-full-scan profile was run in CI. That is valid as a stage gate, but run a full scan with --profile full (or with no --profile) before declaring completion.",
    );
  }
  // `report --run-validate` is used as a single CI step. Without a gate it
  // would stay green even in a state validate rejects, so the exit code is
  // decided by the same failOn resolution and severity comparison as validate.
  const failOn = resolveFailOn(options, configResult.config.validation.failOn);
  info(
    `report: info=${data.summary.counts.info} warning=${data.summary.counts.warning} error=${data.summary.counts.error} failOn=${failOn}`,
  );
  info(`wrote report: ${outPath}`);
  return shouldFail(validation, failOn) ? 1 : 0;
}

/**
 * `--run-validate`: run the same validators `qfai validate` runs, apply the
 * same post-processing, and write the same (scope-resolved) validate result.
 *
 * The post-processing is shared, not re-implemented: `report --run-validate`
 * is documented as the single-step CI usage, so a finding `validate` raises
 * (here the legacy-path `D-DEPRECATED-PATH` migration gate) must reach this
 * exit code too, and a write `validate` refuses must be refused here as well.
 * Otherwise a project whose `output.validateJsonPath` still names the legacy
 * SSOT sees `qfai validate` exit 1 and refuse the write while `qfai report
 * --run-validate` re-creates the deprecated file and exits 0.
 *
 * `writeTo` is the scope-resolved target, so a refusal also covers the
 * corresponding `validate.flow-<ids>.json` path.
 */
async function runValidateForReport(
  root: string,
  configResult: ConfigLoadResult,
  options: ReportOptions,
  writeTo: string,
  legacyGate: LegacyValidateJsonGate,
): Promise<{ validation: ValidationResult; ranNarrowProfileInCi: boolean }> {
  const flowIds = options.flowIds ?? [];
  const ciProfileIssue = buildCiProfileIssue(options.profile);
  const validated = await validateProject(root, configResult, {
    ...(options.profile ? { profile: options.profile } : {}),
    ...(flowIds.length > 0 ? { flowIds } : {}),
  });
  const withCiIssue = ciProfileIssue ? appendIssue(validated, ciProfileIssue) : validated;
  const gated = legacyGate.issue ? appendIssue(withCiIssue, legacyGate.issue) : withCiIssue;
  const normalized = normalizeValidationResult(root, gated);
  // Profile suffixes compose with the flow-scoped path.
  if (!legacyGate.refuseConfiguredLegacyWrite) {
    await writeValidationResults(root, writeTo, normalized, options.profile);
  }
  return { validation: normalized, ranNarrowProfileInCi: ciProfileIssue !== null };
}

function resolveFailOn(options: ReportOptions, fallback: FailOn): FailOn {
  if (options.failOn) {
    return options.failOn;
  }
  if (options.strict) {
    return "warning";
  }
  return fallback;
}

/**
 * Decide the input path on the reading side (without `--run-validate`).
 *
 * When `--profile` is given, read the profile-suffixed file, never the
 * always-latest pointer (`validate.json`). `validate.json` is only the output
 * of "whichever profile ran last", and the Consumer rule of the CLI contract
 * also requires a reader scoped by profile to use the suffixed file. An
 * explicit `--in` is the operator's intent, so it always wins.
 */
function resolveInputPath(
  root: string,
  configuredPath: string,
  inputPath: string | undefined,
  profile: ValidationProfile | undefined,
): string {
  const input =
    inputPath ?? (profile ? profileSuffixedReportPath(configuredPath, profile) : configuredPath);
  return path.isAbsolute(input) ? input : path.resolve(root, input);
}

/**
 * Read the input validate output. When it is not found, print guidance and
 * return `null` (the caller sets the exit code). Any other failure is thrown
 * as is.
 *
 * The guidance text is delegated to `buildMissingInputGuidance`: `--flow` and
 * `--profile` both change the name of the file that is read, so a message that
 * knows about only one of them gives guidance that, followed exactly, ends in
 * the same exit 2 again.
 */
async function loadValidationResult(
  inputPath: string,
  flowIds: readonly string[],
  profile: ValidationProfile | undefined,
  expectedValidateJsonPath: string,
): Promise<ValidationResult | null> {
  try {
    return await readValidationResult(inputPath);
  } catch (err) {
    if (isEnoent(err)) {
      error(buildMissingInputGuidance(inputPath, flowIds, profile, expectedValidateJsonPath));
      return null;
    }
    throw err;
  }
}

/**
 * Warn when the profile in the validate output that was read differs from
 * `--profile`. This does not normally happen on the path that reads the
 * suffixed file, but when `--in` points at the output of another profile,
 * this is the only place that detects it.
 */
function warnOnProfileMismatch(
  inputPath: string,
  validation: ValidationResult,
  profile: ValidationProfile | undefined,
): void {
  if (!profile || validation.profile === undefined || validation.profile === profile) {
    return;
  }
  warn(
    `report: --profile ${profile} was given, but the input ${inputPath} is the result of a run with ` +
      `profile "${validation.profile}". The report is generated from those numbers as they are.`,
  );
}

async function readValidationResult(inputPath: string): Promise<ValidationResult> {
  const raw = await readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isValidationResult(parsed)) {
    throw new Error(`validate.json has an invalid shape: ${inputPath}`);
  }
  return reconcileCounts(parsed, inputPath);
}
/**
 * The `counts` of `--in` come from an external file and may disagree with
 * `issues` (a stale validate.json, a hand edit, a partial rewrite). The gate
 * and the report's summary both read `counts`, so leaving a mismatch alone
 * would let a report that lists errors pass with exit 0. Recount from
 * `issues` (excluding suppressed ones), warn about any difference, and use the
 * recounted values.
 */
function reconcileCounts(result: ValidationResult, inputPath: string): ValidationResult {
  const recounted = countIssues(result.issues);
  const stated = result.counts;
  if (
    recounted.info === stated.info &&
    recounted.warning === stated.warning &&
    recounted.error === stated.error
  ) {
    return result;
  }
  warn(
    [
      `report: the counts in ${inputPath} do not match its issues`,
      `(counts: info=${stated.info} warning=${stated.warning} error=${stated.error} /`,
      `issues: info=${recounted.info} warning=${recounted.warning} error=${recounted.error}).`,
      "Reporting and gating on the values recounted from issues.",
    ].join(" "),
  );
  return { ...result, counts: recounted };
}

/**
 * The two fields the recount reads off an `--in` issue.
 *
 * `severity` picks the bucket, and `suppressed` decides whether the issue is
 * counted at all. `countIssues` tests `suppressed` for truthiness, so a
 * hand-written or externally generated `"suppressed": "false"` is a
 * *suppression* — an error carrying one drops out of the recount and takes the
 * gate's only reason to fail with it, on the very input the gate was just
 * taught to trust. Neither field may arrive as anything but what its type
 * allows: `severity` one of the three names, `suppressed` absent or a boolean.
 */
function isGateReadableIssue(issue: unknown): boolean {
  if (!issue || typeof issue !== "object") {
    return false;
  }
  if (typeof Reflect.get(issue, "code") !== "string") return false;
  if (typeof Reflect.get(issue, "message") !== "string") return false;
  const category: unknown = Reflect.get(issue, "category");
  if (category !== "canonical" && category !== "change") return false;
  const severity: unknown = Reflect.get(issue, "severity");
  if (severity !== "info" && severity !== "warning" && severity !== "error") {
    return false;
  }
  const suppressed: unknown = Reflect.get(issue, "suppressed");
  return suppressed === undefined || typeof suppressed === "boolean";
}

function isValidationResult(value: unknown): value is ValidationResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if ("traceability" in record) return false;
  if (typeof record.toolVersion !== "string") {
    return false;
  }
  const profile = record.profile;
  if (
    profile !== undefined &&
    profile !== "discussion" &&
    profile !== "sdd" &&
    profile !== "prototyping" &&
    profile !== "atdd" &&
    profile !== "tdd" &&
    profile !== "verify" &&
    profile !== "full" &&
    profile !== "saas-package" &&
    profile !== "drift"
  ) {
    return false;
  }
  // `severity` and `suppressed` are load-bearing: the gate counts by the first
  // and skips on the second, so a value of the wrong type would silently drop
  // out of the recount instead of failing loudly.
  if (!Array.isArray(record.issues) || !record.issues.every(isGateReadableIssue)) {
    return false;
  }
  const counts = record.counts as Record<string, unknown> | undefined;
  if (!counts) {
    return false;
  }
  if (
    typeof counts.info !== "number" ||
    typeof counts.warning !== "number" ||
    typeof counts.error !== "number"
  ) {
    return false;
  }

  if (record.waivers !== undefined) {
    const waivers = record.waivers;
    if (!waivers || typeof waivers !== "object") return false;
    const active: unknown = Reflect.get(waivers, "active");
    const suppressed: unknown = Reflect.get(waivers, "suppressed");
    if (!Array.isArray(active) || !suppressed || typeof suppressed !== "object") return false;
    if (typeof Reflect.get(suppressed, "total") !== "number") return false;
    if (typeof Reflect.get(suppressed, "byWaiver") !== "object") return false;
    if (typeof Reflect.get(suppressed, "byRule") !== "object") return false;
  }

  return true;
}

/**
 * Write the `--run-validate` result to the same two places as a plain
 * `qfai validate`: the always-latest pointer (`validate.json`) and the
 * profile-suffixed file (`validate-<profile>.json`).
 *
 * The reading side (`resolveInputPath`) always looks at the suffixed file when
 * `--profile` is given. If the suffixed file is not updated here, a later
 * `qfai report --profile X` either exits 2 with "file not found" or builds
 * its report from a stale run.
 */
async function writeValidationResults(
  root: string,
  configuredPath: string,
  result: ValidationResult,
  requestedProfile: ValidationProfile | undefined,
): Promise<void> {
  await writeValidationResult(root, configuredPath, result);
  const profileLabel = result.profile ?? requestedProfile ?? "full";
  await writeValidationResult(
    root,
    profileSuffixedReportPath(configuredPath, profileLabel),
    result,
  );
}

async function writeValidationResult(
  root: string,
  outputPath: string,
  result: ValidationResult,
): Promise<void> {
  const abs = path.isAbsolute(outputPath) ? outputPath : path.resolve(root, outputPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
}

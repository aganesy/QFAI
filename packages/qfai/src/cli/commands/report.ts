import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ConfigLoadResult, FailOn, QfaiConfig } from "../../core/config.js";
import { loadConfig, resolvePath } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { writeReportFiles } from "../../core/runLog.js";
import { buildCiProfileIssue } from "../../core/phasePolicy.js";
import {
  createReportData,
  formatReportJson,
  formatReportMarkdown,
  parseReportBaseUrl,
} from "../../core/report.js";
import { writeBusinessFlowReports } from "../../core/specPackReport.js";
import { resolveFlowScope } from "../../core/flowScope.js";
import { readStoryTreeModel } from "../../core/storyTree/tree.js";
import { isStoryTreeProject } from "../../core/storyTree/layout.js";
import type { ValidationProfile, ValidationResult } from "../../core/types.js";
import { isValidationProfile } from "../../core/validationProfiles.js";
import { countIssues } from "../../core/validate.js";
import { shouldFail } from "../lib/failOn.js";
import { isIncompleteRunResult } from "../lib/warnings.js";
import { error, info, warn } from "../../core/logger.js";
import {
  appendIssue,
  scopedReportPath,
  validateProjectOrIncomplete,
  validationResultPaths,
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
  /** Where the validate result of the requested scope and profile is read from. */
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
  const flowIds = options.flowIds ?? [];
  const resultPaths = validationResultPaths(
    config.output.validateJsonPath,
    flowIds,
    options.profile,
  );
  const scopedOut = flowIds.length > 0 ? scopedReportPath(defaultOut, flowIds) : defaultOut;
  if (resultPaths === null || scopedOut === null) {
    return null;
  }
  const out = options.outPath ?? scopedOut;
  return {
    validateJsonPath: resultPaths.read,
    outPath: path.isAbsolute(out) ? out : path.resolve(root, out),
  };
}

/**
 * True when the validation result records the flows the run was asked for.
 *
 * The stored result carries findings and waiver totals that cannot be
 * reconstructed by filtering a result of another scope, and a file name can be
 * copied or renamed, so the scope the result records is the provenance. No
 * recorded flows means a repository-wide run.
 */
function recordsRequestedScope(validation: ValidationResult, flowIds: readonly string[]): boolean {
  const requested = [...new Set(flowIds)].sort();
  const recorded = validation.flowIds ?? [];
  return (
    recorded.length === requested.length && recorded.every((id, index) => id === requested[index])
  );
}

/**
 * The refusal for a result whose recorded flows are not the requested ones.
 * The suggested commands write and read a result of the requested scope.
 */
function buildScopeMismatchGuidance(
  inputPath: string,
  recorded: readonly string[] | undefined,
  flowIds: readonly string[],
  profile: ValidationProfile | undefined,
): string {
  const describe = (ids: readonly string[] | undefined): string =>
    ids && ids.length > 0 ? `flows ${ids.join(", ")}` : "the whole repository";
  const scopeArgs =
    flowIds.map((id) => ` --flow ${id}`).join("") + (profile ? ` --profile ${profile}` : "");
  return [
    `qfai report: ${inputPath} records a validation of ${describe(recorded)}, not of ${describe(flowIds)}.`,
    "A report takes counts, issues and waiver totals from the result as they are. Run validate with the same scope first. For example:",
    `  qfai validate${scopeArgs}`,
    `  qfai report${scopeArgs}`,
    "",
    "Alternatively, pass --run-validate to report.",
  ].join("\n");
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
  if (options.baseUrl !== undefined && parseReportBaseUrl(options.baseUrl) === null) {
    error(
      `qfai report: --base-url must be an absolute http or https URL without a query, fragment or credentials: ${options.baseUrl}`,
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
    const ran = await runValidateForReport(root, configResult, options);
    ranNarrowProfileInCi = ran.ranNarrowProfileInCi;
    validation = ran.validation;
  } else {
    const inputPath = resolveInputPath(root, paths.validateJsonPath, options.inputPath);
    const loaded = await loadValidationResult(
      inputPath,
      flowIds,
      options.profile,
      resolveInputPath(root, paths.validateJsonPath, undefined),
    );
    if (loaded === null) {
      return 2;
    }
    if (!recordsRequestedScope(loaded, flowIds)) {
      error(buildScopeMismatchGuidance(inputPath, loaded.flowIds, flowIds, options.profile));
      return 2;
    }
    if (options.inputPath === undefined && options.profile !== undefined && flowIds.length > 0) {
      // A flow-scoped file name carries no profile, so the profile the
      // result records is the only evidence it is the requested one.
      if (loaded.profile !== options.profile) {
        error(buildProfileMismatchGuidance(inputPath, loaded.profile, flowIds, options.profile));
        return 2;
      }
    } else {
      warnOnProfileMismatch(inputPath, loaded, options.profile);
    }
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
  if (isIncompleteRunResult(validation)) {
    // `--fail-on never` can exit 0 here, so the output itself says the
    // report holds no verdict on the tree.
    warn("report: validation did not finish, so this report is not a clean result.");
  }
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
 * `report --run-validate` is documented as the single-step CI usage, so a
 * finding `validate` raises must reach this exit code too.
 *
 * The result is written where `qfai validate` with the same options writes it.
 */
async function runValidateForReport(
  root: string,
  configResult: ConfigLoadResult,
  options: ReportOptions,
): Promise<{ validation: ValidationResult; ranNarrowProfileInCi: boolean }> {
  const flowIds = options.flowIds ?? [];
  const ciProfileIssue = buildCiProfileIssue(options.profile);
  // A run the validators could not finish still writes its verdict, so the
  // clean result of an earlier run is not left in place to be read as this one.
  const validated = await validateProjectOrIncomplete(
    root,
    configResult,
    {
      ...(options.profile ? { profile: options.profile } : {}),
      ...(flowIds.length > 0 ? { flowIds } : {}),
    },
    "report",
  );
  const withCiIssue = ciProfileIssue ? appendIssue(validated, ciProfileIssue) : validated;
  const normalized = normalizeValidationResult(root, withCiIssue);
  const resultPaths = validationResultPaths(
    configResult.config.output.validateJsonPath,
    flowIds,
    normalized.profile ?? options.profile,
  );
  await writeValidationResult(root, resultPaths?.write ?? [], normalized);
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
 * `resolvedPath` already names the file `qfai validate` writes for the
 * requested scope and profile. An explicit `--in` is the operator's intent,
 * so it always wins.
 */
function resolveInputPath(
  root: string,
  resolvedPath: string,
  inputPath: string | undefined,
): string {
  const input = inputPath ?? resolvedPath;
  return path.isAbsolute(input) ? input : path.resolve(root, input);
}

/**
 * The refusal for a result that records another profile than `--profile`.
 *
 * A flow-scoped result has one file whatever the profile, so the file read
 * can be the output of a later run with another profile. Rendering it would
 * present that run's findings as the requested profile's.
 */
function buildProfileMismatchGuidance(
  inputPath: string,
  storedProfile: ValidationProfile | undefined,
  flowIds: readonly string[],
  profile: ValidationProfile,
): string {
  const scopeArgs = flowIds.map((id) => ` --flow ${id}`).join("");
  return [
    `qfai report: ${inputPath} records profile "${storedProfile ?? "none"}", not the requested "${profile}".`,
    "Run validate with the same scope and profile first. For example:",
    `  qfai validate${scopeArgs} --profile ${profile}`,
    "",
    "Alternatively, pass --run-validate to report.",
  ].join("\n");
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
    const problem = validationResultShapeProblem(parsed) ?? "unreadable";
    throw new Error(`validate.json has an invalid shape: ${inputPath} (${problem})`);
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
 * The first field of an `--in` issue the recount or the renderer cannot read,
 * as a suffix to its `issues[N]` path, or `null` when the issue is readable.
 *
 * `severity` picks the bucket, and `suppressed` decides whether the issue is
 * counted at all. `countIssues` tests `suppressed` for truthiness, so a
 * hand-written or externally generated `"suppressed": "false"` is a
 * *suppression* — an error carrying one drops out of the recount and takes the
 * gate's only reason to fail with it, on the very input the gate was just
 * taught to trust. Neither field may arrive as anything but what its type
 * allows: `severity` one of the three names, `suppressed` absent or a boolean.
 */
function issueShapeProblem(issue: unknown): string | null {
  if (!issue || typeof issue !== "object") {
    return "must be an object";
  }
  if (typeof Reflect.get(issue, "code") !== "string") return ".code must be a string";
  if (typeof Reflect.get(issue, "message") !== "string") return ".message must be a string";
  const category: unknown = Reflect.get(issue, "category");
  if (category !== "canonical" && category !== "change") {
    return '.category must be "canonical" or "change"';
  }
  const severity: unknown = Reflect.get(issue, "severity");
  if (severity !== "info" && severity !== "warning" && severity !== "error") {
    return '.severity must be "info", "warning" or "error"';
  }
  const suppressed: unknown = Reflect.get(issue, "suppressed");
  if (suppressed !== undefined && typeof suppressed !== "boolean") {
    return ".suppressed must be a boolean";
  }
  // The Markdown renderer reads `file` for the finding's source and its
  // `--base-url` link; a number there fails mid-render instead of here.
  const file: unknown = Reflect.get(issue, "file");
  if (file !== undefined && typeof file !== "string") return ".file must be a string";
  return null;
}

/**
 * The first field of an `--in` validate result the report cannot read, as a
 * path and the type it must have, or `null` when the whole result is readable.
 */
function validationResultShapeProblem(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return "the result must be an object";
  }
  if (typeof Reflect.get(value, "toolVersion") !== "string") return "toolVersion must be a string";
  const profile: unknown = Reflect.get(value, "profile");
  if (profile !== undefined && !isValidationProfile(profile)) {
    return "profile must name a validation profile";
  }
  const recordedFlows: unknown = Reflect.get(value, "flowIds");
  if (
    recordedFlows !== undefined &&
    (!Array.isArray(recordedFlows) || !recordedFlows.every((id) => typeof id === "string"))
  ) {
    return "flowIds must be an array of strings";
  }
  // `severity` and `suppressed` are load-bearing: the gate counts by the first
  // and skips on the second, so a value of the wrong type would silently drop
  // out of the recount instead of failing loudly.
  const issues: unknown = Reflect.get(value, "issues");
  if (!Array.isArray(issues)) return "issues must be an array";
  for (const [index, entry] of issues.entries()) {
    const problem = issueShapeProblem(entry);
    if (problem !== null) return `issues[${index}]${problem.startsWith(".") ? "" : " "}${problem}`;
  }
  const counts: unknown = Reflect.get(value, "counts");
  if (!counts || typeof counts !== "object") return "counts must be an object";
  for (const key of ["info", "warning", "error"]) {
    if (typeof Reflect.get(counts, key) !== "number") return `counts.${key} must be a number`;
  }

  const waivers: unknown = Reflect.get(value, "waivers");
  if (waivers !== undefined) {
    if (!waivers || typeof waivers !== "object") return "waivers must be an object";
    if (!Array.isArray(Reflect.get(waivers, "active"))) return "waivers.active must be an array";
    const suppressed: unknown = Reflect.get(waivers, "suppressed");
    if (!suppressed || typeof suppressed !== "object")
      return "waivers.suppressed must be an object";
    if (typeof Reflect.get(suppressed, "total") !== "number") {
      return "waivers.suppressed.total must be a number";
    }
    if (typeof Reflect.get(suppressed, "byWaiver") !== "object") {
      return "waivers.suppressed.byWaiver must be an object";
    }
    if (typeof Reflect.get(suppressed, "byRule") !== "object") {
      return "waivers.suppressed.byRule must be an object";
    }
  }

  return null;
}

function isValidationResult(value: unknown): value is ValidationResult {
  return validationResultShapeProblem(value) === null;
}

/**
 * Write the `--run-validate` result files. The targets come from
 * `validationResultPaths`, as for a plain `qfai validate`, so a later
 * `qfai report` with the same options reads what this run wrote. One linked
 * target leaves every target unwritten.
 */
async function writeValidationResult(
  root: string,
  outputPaths: readonly string[],
  result: ValidationResult,
): Promise<void> {
  await writeReportFiles(
    root,
    outputPaths.map((outputPath) =>
      path.isAbsolute(outputPath) ? outputPath : path.resolve(root, outputPath),
    ),
    `${JSON.stringify(result, null, 2)}\n`,
    "qfai report: the validation result",
  );
}

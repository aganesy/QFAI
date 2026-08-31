import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../core/config.js";
import { loadConfig, resolvePath } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { buildCiProfileIssue } from "../../core/phasePolicy.js";
import { createReportData, formatReportJson, formatReportMarkdown } from "../../core/report.js";
import { writeSpecPackReports } from "../../core/specPackReport.js";
import { buildSpecScope } from "../../core/specScope.js";
import type { ValidationProfile, ValidationResult } from "../../core/types.js";
import { validateProject } from "../../core/validate.js";
import { resolveToolVersion } from "../../core/version.js";
import { error, info, warn } from "../lib/logger.js";
import { warnIfTruncated } from "../lib/warnings.js";
import {
  configTargetsLegacyValidateJsonPath,
  legacyValidateJsonSeverity,
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
  /** `--spec <id>` values; empty / absent = the whole repo. */
  specIds?: readonly string[];
  /**
   * Override the tool version observed by the legacy-path migration gate.
   * Tests use this to pin either side of the sunset; production reads
   * `packages/qfai/package.json#version`, same as `validate`.
   */
  toolVersionOverride?: string;
};

type ReportPaths = {
  /** Where the validate result is read from (or written to under `--run-validate`). */
  validateJsonPath: string;
  /** Absolute path the rendered report is written to. */
  outPath: string;
};

/**
 * Resolves the validate-result path and the rendered-report path, applying
 * `--spec` scoping when present.
 *
 * A scoped run reads `validate.spec-<ids>.json` — what `validate --spec` wrote
 * — and writes `report.spec-<ids>.md` / `.json`, so parallel slice workers stop
 * racing on the shared `report.md`. An explicit `--out` still wins.
 *
 * `null` when any `--spec` value carries no resolvable spec number: the same
 * refusal `scopedReportPath` makes for `validate`, so raw input never reaches a
 * filename and a failing scope never writes the file a healthy one would.
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
  const specIds = options.specIds ?? [];
  const scopedValidateJson =
    specIds.length > 0 ? scopedReportPath(configuredValidateJson, specIds) : configuredValidateJson;
  const scopedOut = specIds.length > 0 ? scopedReportPath(defaultOut, specIds) : defaultOut;
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
 * `--in` hands `runReport` a `ValidationResult` verbatim — `issues`, `counts`,
 * SC coverage and the waiver aggregates are whatever the producing run
 * computed. Scoping the output *name* does nothing to that body, so
 * `report --spec 0004 --in <repo-wide validate.json>` wrote sibling specs'
 * findings into `report.spec-0004.md`. Re-filtering the input is not a way out
 * either: `waivers.suppressed.byWaiver` attributes each suppression to a waiver
 * id the surviving `Issue` no longer names, so that aggregate cannot be
 * recomputed from the file alone and the report would still be part repo-wide.
 *
 * The provenance that does exist is the filename `validate --spec` writes, so
 * that is what is checked — same basename, any directory, which keeps `--in`
 * useful for a slice whose validate result lives outside `outDir`.
 */
function inputCarriesRequestedScope(inputPath: string, scopedValidateJsonPath: string): boolean {
  return path.basename(inputPath) === path.basename(scopedValidateJsonPath);
}

/**
 * The ENOENT guidance for a missing validate result.
 *
 * A scoped run reads `validate.spec-<ids>.json`, so the unscoped text — "run
 * `qfai validate`, output `.qfai/report/validate.json`" — named a file this
 * command will never read: following it verbatim left the scoped input missing
 * and the very same `report --spec` exited 2 again. The scoped branch therefore
 * repeats the caller's own `--spec` values on both suggested commands.
 */
function buildMissingInputGuidance(
  inputPath: string,
  specIds: readonly string[],
  scopedValidateJsonPath: string,
): string {
  const header = [`qfai report: input file not found: ${inputPath}`, ""];
  if (specIds.length === 0) {
    return [
      ...header,
      "Run qfai validate first. For example:",
      "  qfai validate",
      "(default output path: .qfai/report/validate.json)",
      "",
      "Alternatively, pass --run-validate to report.",
      "If you use the GitHub Actions template, run the workflow's validate job first.",
    ].join("\n");
  }
  const specArgs = specIds.map((id) => `--spec ${id}`).join(" ");
  return [
    ...header,
    `report with --spec reads the scoped validate result. Run validate with the same --spec first. For example:`,
    `  qfai validate ${specArgs}`,
    `(output path: ${scopedValidateJsonPath})`,
    "",
    `Alternatively, pass --run-validate to report itself. For example:`,
    `  qfai report ${specArgs} --run-validate`,
  ].join("\n");
}

export async function runReport(options: ReportOptions): Promise<void> {
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  const specIds = options.specIds ?? [];
  const paths = resolveReportPaths(root, configResult.config, options);
  if (paths === null) {
    error(
      [
        `qfai report: --spec values are not readable as spec numbers: ${specIds.join(", ")}`,
        "For example: --spec 0003 / --spec spec-0004",
      ].join("\n"),
    );
    process.exitCode = 2;
    return;
  }
  let validation: ValidationResult;
  let ranNarrowProfileInCi = false;
  if (options.runValidate) {
    if (options.inputPath) {
      warn("report: --in is ignored because --run-validate was given.");
    }
    // Same migration gate `runValidate` enforces, read through the same two
    // exported predicates. Post-sunset, a config still pointing at
    // `.qfai/output/validate.json` gets no write — least of all a brand-new
    // `validate.spec-<ids>.json` inside the directory the sunset exists to
    // retire, which would read as "still fine to write here". Checked before
    // the run so the refusal costs nothing.
    const effectiveToolVersion = options.toolVersionOverride ?? (await resolveToolVersion());
    const legacyWriteEnabled = legacyValidateJsonSeverity(effectiveToolVersion) === "warning";
    const configuredValidateJsonPath = configResult.config.output.validateJsonPath;
    if (configTargetsLegacyValidateJsonPath(configuredValidateJsonPath) && !legacyWriteEnabled) {
      error(
        [
          `qfai report: qfai.config.yaml#output.validateJsonPath points at the sunset legacy SSOT (${configuredValidateJsonPath}).`,
          "Refused to write the validate result. Update output.validateJsonPath to .qfai/report/validate.json and run again.",
        ].join("\n"),
      );
      process.exitCode = 2;
      return;
    }
    const ciProfileIssue = buildCiProfileIssue(options.profile);
    const validated = await validateProject(root, configResult, {
      ...(options.profile ? { profile: options.profile } : {}),
      ...(specIds.length > 0 ? { specIds } : {}),
    });
    const result = ciProfileIssue
      ? {
          ...validated,
          issues: [...validated.issues, ciProfileIssue],
          counts: { ...validated.counts, warning: validated.counts.warning + 1 },
        }
      : validated;
    ranNarrowProfileInCi = ciProfileIssue !== null;
    const normalized = normalizeValidationResult(root, result);
    await writeValidationResult(root, paths.validateJsonPath, normalized);
    validation = normalized;
  } else {
    const input = options.inputPath ?? paths.validateJsonPath;
    const inputPath = path.isAbsolute(input) ? input : path.resolve(root, input);
    if (
      options.inputPath !== undefined &&
      specIds.length > 0 &&
      !inputCarriesRequestedScope(inputPath, paths.validateJsonPath)
    ) {
      const specArgs = specIds.map((id) => `--spec ${id}`).join(" ");
      error(
        [
          `qfai report: the --in validate result does not match the --spec scope: ${inputPath}`,
          `report with --spec takes counts / issues / SC coverage / waiver totals from the input file as they are, so a whole-repo or different-spec result mixes out-of-scope results into the output.`,
          `Pass the scoped validate result named ${path.basename(paths.validateJsonPath)}. For example:`,
          `  qfai validate ${specArgs}`,
          `  qfai report ${specArgs}`,
        ].join("\n"),
      );
      process.exitCode = 2;
      return;
    }
    try {
      validation = await readValidationResult(inputPath);
    } catch (err) {
      if (isEnoent(err)) {
        error(buildMissingInputGuidance(inputPath, specIds, paths.validateJsonPath));
        process.exitCode = 2;
        return;
      }
      throw err;
    }
  }

  // The rendered body has to honour the same scope as the filename: a scoped
  // run that re-walked every spec put sibling specs — including ones another
  // worker was mid-edit on — inside `report.spec-<ids>.md`.
  const data = await createReportData(
    root,
    validation,
    configResult,
    specIds.length > 0 ? { specIds } : {},
  );
  warnIfTruncated(data.traceability.testFiles, "report");
  const output =
    options.format === "json"
      ? formatReportJson(data)
      : options.baseUrl
        ? formatReportMarkdown(data, { baseUrl: options.baseUrl })
        : formatReportMarkdown(data);

  const outPath = paths.outPath;

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${output}\n`, "utf-8");
  // Scoped: touch only the packs this run owns. An unscoped call rewrites every
  // spec pack, which is how a slice worker clobbered its siblings' artifacts.
  await writeSpecPackReports(root, configResult.config, buildSpecScope(specIds));

  if (ranNarrowProfileInCi) {
    // Reported, not fatal: the run happened and its findings are real. Exiting
    // non-zero here made every stage gate that names a narrow profile
    // unreachable in CI.
    warn(
      "report: a non-full-scan profile was run in CI. That is valid as a stage gate, but run a full scan with --profile full (or with no --profile) before declaring completion.",
    );
  }
  info(
    `report: info=${validation.counts.info} warning=${validation.counts.warning} error=${validation.counts.error}`,
  );
  info(`wrote report: ${outPath}`);
}

async function readValidationResult(inputPath: string): Promise<ValidationResult> {
  const raw = await readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isValidationResult(parsed)) {
    throw new Error(`validate.json has an invalid shape: ${inputPath}`);
  }
  return parsed;
}

function isValidationResult(value: unknown): value is ValidationResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
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
    profile !== "saas-package"
  ) {
    return false;
  }
  if (!Array.isArray(record.issues)) {
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

  const traceability = record.traceability as Record<string, unknown> | undefined;
  if (!traceability || typeof traceability !== "object") {
    return false;
  }

  const sc = traceability.sc as Record<string, unknown> | undefined;
  const testFiles = traceability.testFiles as Record<string, unknown> | undefined;
  if (!sc || !testFiles) {
    return false;
  }
  if (
    typeof sc.total !== "number" ||
    typeof sc.covered !== "number" ||
    typeof sc.missing !== "number"
  ) {
    return false;
  }
  if (!Array.isArray(sc.missingIds)) {
    return false;
  }
  if (!sc.refs || typeof sc.refs !== "object") {
    return false;
  }
  if (
    !Array.isArray(testFiles.globs) ||
    !Array.isArray(testFiles.excludeGlobs) ||
    typeof testFiles.matchedFileCount !== "number"
  ) {
    return false;
  }

  return true;
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

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
import { warnIfTruncated, withTruncatedScanIssue } from "../lib/warnings.js";
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
  const header = [`qfai report: 入力ファイルが見つかりません: ${inputPath}`, ""];
  if (specIds.length === 0) {
    return [
      ...header,
      "まず qfai validate を実行してください。例:",
      "  qfai validate",
      "（デフォルトの出力先: .qfai/report/validate.json）",
      "",
      "または report に --run-validate を指定してください。",
      "GitHub Actions テンプレを使っている場合は、workflow の validate ジョブを先に実行してください。",
    ].join("\n");
  }
  const specArgs = specIds.map((id) => `--spec ${id}`).join(" ");
  return [
    ...header,
    `--spec 付きの report は scoped な validate 結果を読みます。まず同じ --spec で validate を実行してください。例:`,
    `  qfai validate ${specArgs}`,
    `（出力先: ${scopedValidateJsonPath}）`,
    "",
    `または report 自身に --run-validate を指定してください。例:`,
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
        `qfai report: --spec の値を spec 番号として解釈できません: ${specIds.join(", ")}`,
        "例: --spec 0003 / --spec spec-0004",
      ].join("\n"),
    );
    process.exitCode = 2;
    return;
  }
  let validation: ValidationResult;
  let ranNarrowProfileInCi = false;
  if (options.runValidate) {
    if (options.inputPath) {
      warn("report: --run-validate が指定されたため --in は無視します。");
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
          `qfai report: qfai.config.yaml#output.validateJsonPath が sunset 済みの legacy SSOT (${configuredValidateJsonPath}) を指しています。`,
          "validate 結果の書き込みを拒否しました。output.validateJsonPath を .qfai/report/validate.json に更新してから再実行してください。",
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
    // A truncated scan has to reach `validate.json#issues` before the file is
    // written, otherwise the artifact a reviewer opens records the run as
    // clean while its coverage numbers came from a partial file set.
    const normalized = withTruncatedScanIssue(normalizeValidationResult(root, result), "report");
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
          `qfai report: --in の validate 結果が --spec の scope と一致しません: ${inputPath}`,
          `--spec 付きの report は counts / issues / SC coverage / waiver 集計を入力ファイルからそのまま採用するため、repo 全体や別 spec の結果を渡すと scope 外の結果が出力に混ざります。`,
          `${path.basename(paths.validateJsonPath)} という名前の scoped な validate 結果を指定してください。例:`,
          `  qfai validate ${specArgs}`,
          `  qfai report ${specArgs}`,
        ].join("\n"),
      );
      process.exitCode = 2;
      return;
    }
    try {
      validation = withTruncatedScanIssue(await readValidationResult(inputPath), "report");
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
      "report: CI で full-scan ではない profile を実行しました。stage gate としては有効ですが、完了宣言の前に --profile full（または --profile 指定なし）で full-scan を実行してください。",
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
    throw new Error(`validate.json の形式が不正です: ${inputPath}`);
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

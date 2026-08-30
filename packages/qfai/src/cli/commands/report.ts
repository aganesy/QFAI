import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ConfigLoadResult, FailOn } from "../../core/config.js";
import { loadConfig, resolvePath } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { buildCiProfileIssue } from "../../core/phasePolicy.js";
import { createReportData, formatReportJson, formatReportMarkdown } from "../../core/report.js";
import { writeSpecPackReports } from "../../core/specPackReport.js";
import type { ValidationProfile, ValidationResult } from "../../core/types.js";
import { countIssues, validateProject } from "../../core/validate.js";
import { shouldFail } from "../lib/failOn.js";
import { error, info, warn } from "../lib/logger.js";
import { warnIfTruncated } from "../lib/warnings.js";
import { appendIssue, evaluateLegacyValidateJsonGate } from "./validate.js";

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
  /**
   * Override the tool version observed by the legacy-path deprecation gate
   * under `--run-validate`. Tests use it to pin either side of the sunset;
   * production reads `packages/qfai/package.json#version`.
   */
  toolVersionOverride?: string;
};

/**
 * レポートを書き出し、`validate` と同じ基準で終了コードを返す。
 * 0=gate 通過 / 1=gate 不通過 / 2=入力 validate.json 欠如。
 */
export async function runReport(options: ReportOptions): Promise<number> {
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  let validation: ValidationResult;
  let ranNarrowProfileInCi = false;
  if (options.runValidate) {
    if (options.inputPath) {
      warn("report: --run-validate が指定されたため --in は無視します。");
    }
    const ran = await runValidateForReport(root, configResult, options);
    ranNarrowProfileInCi = ran.ranNarrowProfileInCi;
    validation = ran.validation;
  } else {
    const input = options.inputPath ?? configResult.config.output.validateJsonPath;
    const inputPath = path.isAbsolute(input) ? input : path.resolve(root, input);
    try {
      validation = await readValidationResult(inputPath);
    } catch (err) {
      if (isEnoent(err)) {
        error(
          [
            `qfai report: 入力ファイルが見つかりません: ${inputPath}`,
            "",
            "まず qfai validate を実行してください。例:",
            "  qfai validate",
            "（デフォルトの出力先: .qfai/report/validate.json）",
            "",
            "または report に --run-validate を指定してください。",
            "GitHub Actions テンプレを使っている場合は、workflow の validate ジョブを先に実行してください。",
          ].join("\n"),
        );
        return 2;
      }
      throw err;
    }
  }

  const data = await createReportData(root, validation, configResult);
  warnIfTruncated(data.traceability.testFiles, "report");
  const output =
    options.format === "json"
      ? formatReportJson(data)
      : options.baseUrl
        ? formatReportMarkdown(data, { baseUrl: options.baseUrl })
        : formatReportMarkdown(data);

  const outRoot = resolvePath(root, configResult.config, "outDir");
  const defaultOut =
    options.format === "json" ? path.join(outRoot, "report.json") : path.join(outRoot, "report.md");
  const out = options.outPath ?? defaultOut;
  const outPath = path.isAbsolute(out) ? out : path.resolve(root, out);

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${output}\n`, "utf-8");
  await writeSpecPackReports(root, configResult.config);

  if (ranNarrowProfileInCi) {
    // Reported, not fatal: the run happened and its findings are real. Exiting
    // non-zero here made every stage gate that names a narrow profile
    // unreachable in CI.
    warn(
      "report: CI で full-scan ではない profile を実行しました。stage gate としては有効ですが、完了宣言の前に --profile full（または --profile 指定なし）で full-scan を実行してください。",
    );
  }
  // `report --run-validate` は CI の単一ステップとして使われる。gate を
  // 持たないと validate が拒否する状態でも永続的に緑になるため、validate と
  // 同じ failOn 解決と severity 比較で終了コードを決める。
  const failOn = resolveFailOn(options, configResult.config.validation.failOn);
  info(
    `report: info=${validation.counts.info} warning=${validation.counts.warning} error=${validation.counts.error} failOn=${failOn}`,
  );
  info(`wrote report: ${outPath}`);
  return shouldFail(validation, failOn) ? 1 : 0;
}

/**
 * `--run-validate`: run the same validators `qfai validate` runs, apply the
 * same post-processing, and write the same `output.validateJsonPath`.
 *
 * The post-processing is shared, not re-implemented: `report --run-validate`
 * is documented as the single-step CI usage, so a finding `validate` raises
 * (here the legacy-path `D-DEPRECATED-PATH` migration gate) must reach this
 * exit code too, and a write `validate` refuses must be refused here as well.
 * Otherwise a project whose `output.validateJsonPath` still names the legacy
 * SSOT sees `qfai validate` exit 1 and refuse the write while `qfai report
 * --run-validate` re-creates the deprecated file and exits 0.
 */
async function runValidateForReport(
  root: string,
  configResult: ConfigLoadResult,
  options: ReportOptions,
): Promise<{ validation: ValidationResult; ranNarrowProfileInCi: boolean }> {
  const ciProfileIssue = buildCiProfileIssue(options.profile);
  const validated = await validateProject(
    root,
    configResult,
    options.profile ? { profile: options.profile } : {},
  );
  const withCiIssue = ciProfileIssue ? appendIssue(validated, ciProfileIssue) : validated;
  const configuredValidateJsonPath = configResult.config.output.validateJsonPath;
  const legacyGate = await evaluateLegacyValidateJsonGate({
    root,
    configuredValidateJsonPath,
    ...(options.toolVersionOverride !== undefined
      ? { toolVersionOverride: options.toolVersionOverride }
      : {}),
  });
  const gated = legacyGate.issue ? appendIssue(withCiIssue, legacyGate.issue) : withCiIssue;
  const normalized = normalizeValidationResult(root, gated);
  if (!legacyGate.refuseConfiguredLegacyWrite) {
    await writeValidationResult(root, configuredValidateJsonPath, normalized);
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

async function readValidationResult(inputPath: string): Promise<ValidationResult> {
  const raw = await readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isValidationResult(parsed)) {
    throw new Error(`validate.json の形式が不正です: ${inputPath}`);
  }
  return reconcileCounts(parsed, inputPath);
}

/**
 * `--in` の `counts` は外部ファイル由来で、`issues` と食い違いうる（古い
 * validate.json、手編集、部分的な書き換え）。gate も report 本文のサマリも
 * `counts` を読むため、食い違いを放置すると error を列挙したレポートが
 * exit 0 で緑になる。`issues` から（suppressed を除いて）数え直し、差異は
 * 警告した上で数え直した値を採用する。
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
      `report: ${inputPath} の counts が issues と一致しません`,
      `(counts: info=${stated.info} warning=${stated.warning} error=${stated.error} /`,
      `issues: info=${recounted.info} warning=${recounted.warning} error=${recounted.error})。`,
      "issues から数え直した値で集計と gate 判定を行います。",
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

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { buildCiProfileIssue } from "../../core/phasePolicy.js";
import { createReportData, formatReportJson, formatReportMarkdown } from "../../core/report.js";
import { writeSpecPackReports } from "../../core/specPackReport.js";
import type { ValidationProfile, ValidationResult } from "../../core/types.js";
import { validateProject } from "../../core/validate.js";
import { error, info, warn } from "../lib/logger.js";
import { warnIfTruncated } from "../lib/warnings.js";
import { profileSuffixedReportPath } from "./validate.js";

export type ReportOptions = {
  root: string;
  format: "md" | "json";
  outPath?: string;
  inputPath?: string;
  runValidate?: boolean;
  baseUrl?: string;
  profile?: ValidationProfile;
};

export async function runReport(options: ReportOptions): Promise<void> {
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  let validation: ValidationResult;
  let ranNarrowProfileInCi = false;
  if (options.runValidate) {
    if (options.inputPath) {
      warn("report: --run-validate が指定されたため --in は無視します。");
    }
    const ciProfileIssue = buildCiProfileIssue(options.profile);
    const validated = await validateProject(
      root,
      configResult,
      options.profile ? { profile: options.profile } : {},
    );
    const result = ciProfileIssue
      ? {
          ...validated,
          issues: [...validated.issues, ciProfileIssue],
          counts: { ...validated.counts, warning: validated.counts.warning + 1 },
        }
      : validated;
    ranNarrowProfileInCi = ciProfileIssue !== null;
    const normalized = normalizeValidationResult(root, result);
    await writeValidationResult(root, configResult.config.output.validateJsonPath, normalized);
    validation = normalized;
  } else {
    const inputPath = resolveInputPath(
      root,
      configResult.config.output.validateJsonPath,
      options.inputPath,
      options.profile,
    );
    // --run-validate 側と同じく、CI で narrow profile を使ったことを報告する。
    // ここでは finding を足さない: 読み込んだ validate 出力には、それを書いた
    // validate 実行が既に QFAI-VALIDATE-017 を載せている。
    ranNarrowProfileInCi = buildCiProfileIssue(options.profile) !== null;
    const loaded = await loadValidationResult(inputPath, options.profile);
    if (loaded === null) {
      process.exitCode = 2;
      return;
    }
    warnOnProfileMismatch(inputPath, loaded, options.profile);
    validation = loaded;
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
  info(
    `report: info=${validation.counts.info} warning=${validation.counts.warning} error=${validation.counts.error}`,
  );
  info(`wrote report: ${outPath}`);
}

/**
 * 読み取り側 (`--run-validate` なし) の入力パスを決める。
 *
 * `--profile` が指定されたときは、常に最新のポインタ (`validate.json`) では
 * なく profile 接尾辞付きファイルを読む。`validate.json` は「最後に走った
 * profile」の出力でしかなく、CLI コントラクトの Consumer rule も profile で
 * スコープする読み手には接尾辞付きファイルを要求している。明示された `--in`
 * は運用者の意思なので、常にそちらを優先する。
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
 * 入力の validate 出力を読む。見つからないときは案内を出して `null` を返す
 * (呼び出し側が exit code を立てる)。それ以外の失敗はそのまま投げる。
 */
async function loadValidationResult(
  inputPath: string,
  profile: ValidationProfile | undefined,
): Promise<ValidationResult | null> {
  try {
    return await readValidationResult(inputPath);
  } catch (err) {
    if (isEnoent(err)) {
      const validateCommand = profile ? `qfai validate --profile ${profile}` : "qfai validate";
      const defaultOut = profile
        ? `.qfai/report/validate-${profile}.json`
        : ".qfai/report/validate.json";
      error(
        [
          `qfai report: 入力ファイルが見つかりません: ${inputPath}`,
          "",
          "まず qfai validate を実行してください。例:",
          `  ${validateCommand}`,
          `（デフォルトの出力先: ${defaultOut}）`,
          "",
          "または report に --run-validate を指定してください。",
          "GitHub Actions テンプレを使っている場合は、workflow の validate ジョブを先に実行してください。",
        ].join("\n"),
      );
      return null;
    }
    throw err;
  }
}

/**
 * 読み込んだ validate 出力の profile が `--profile` と食い違うときに警告する。
 * 接尾辞付きファイルを読む経路では通常起きないが、`--in` で別 profile の
 * 出力を指した場合はここだけが唯一の検出点になる。
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
    `report: --profile ${profile} を指定しましたが、入力 ${inputPath} は profile "${validation.profile}" の実行結果です。` +
      `そのままの数値でレポートを生成します。`,
  );
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

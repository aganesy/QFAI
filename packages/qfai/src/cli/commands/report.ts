import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "../../core/config.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import {
  createReportData,
  formatReportJson,
  formatReportMarkdown,
} from "../../core/report.js";
import type { ValidationResult } from "../../core/types.js";
import { validateProject } from "../../core/validate.js";
import { error, info, warn } from "../lib/logger.js";
import { warnIfTruncated } from "../lib/warnings.js";

export type ReportOptions = {
  root: string;
  format: "md" | "json";
  outPath?: string;
  inputPath?: string;
  runValidate?: boolean;
  baseUrl?: string;
};

export async function runReport(options: ReportOptions): Promise<void> {
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  let validation: ValidationResult;
  if (options.runValidate) {
    if (options.inputPath) {
      warn("report: --run-validate が指定されたため --in は無視します。");
    }
    const result = await validateProject(root, configResult);
    const normalized = normalizeValidationResult(root, result);
    await writeValidationResult(
      root,
      configResult.config.output.validateJsonPath,
      normalized,
    );
    validation = normalized;
  } else {
    const input =
      options.inputPath ?? configResult.config.output.validateJsonPath;
    const inputPath = path.isAbsolute(input)
      ? input
      : path.resolve(root, input);
    try {
      validation = await readValidationResult(inputPath);
    } catch (err) {
      if (isMissingFileError(err)) {
        error(
          [
            `qfai report: 入力ファイルが見つかりません: ${inputPath}`,
            "",
            "まず qfai validate を実行してください。例:",
            "  qfai validate",
            "（デフォルトの出力先: .qfai/out/validate.json）",
            "",
            "または report に --run-validate を指定してください。",
            "GitHub Actions テンプレを使っている場合は、workflow の validate ジョブを先に実行してください。",
          ].join("\n"),
        );
        process.exitCode = 2;
        return;
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
    options.format === "json"
      ? path.join(outRoot, "report.json")
      : path.join(outRoot, "report.md");
  const out = options.outPath ?? defaultOut;
  const outPath = path.isAbsolute(out) ? out : path.resolve(root, out);

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${output}\n`, "utf-8");

  info(
    `report: info=${validation.counts.info} warning=${validation.counts.warning} error=${validation.counts.error}`,
  );
  info(`wrote report: ${outPath}`);
}

async function readValidationResult(
  inputPath: string,
): Promise<ValidationResult> {
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

  const traceability = record.traceability as
    | Record<string, unknown>
    | undefined;
  if (!traceability || typeof traceability !== "object") {
    return false;
  }

  const sc = traceability.sc as Record<string, unknown> | undefined;
  const testFiles = traceability.testFiles as
    | Record<string, unknown>
    | undefined;
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

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { code?: string };
  return record.code === "ENOENT";
}

async function writeValidationResult(
  root: string,
  outputPath: string,
  result: ValidationResult,
): Promise<void> {
  const abs = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(root, outputPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
}

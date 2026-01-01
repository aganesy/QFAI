import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "../../core/config.js";
import {
  createReportData,
  formatReportJson,
  formatReportMarkdown,
} from "../../core/report.js";
import type { ValidationResult } from "../../core/types.js";
import { error, info } from "../lib/logger.js";

export type ReportOptions = {
  root: string;
  format: "md" | "json";
  outPath?: string;
};

export async function runReport(options: ReportOptions): Promise<void> {
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  const input = configResult.config.output.validateJsonPath;
  const inputPath = path.isAbsolute(input) ? input : path.resolve(root, input);
  let validation: ValidationResult;
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
          "GitHub Actions テンプレを使っている場合は、workflow の validate ジョブを先に実行してください。",
        ].join("\n"),
      );
      process.exitCode = 2;
      return;
    }
    throw err;
  }

  const data = await createReportData(root, validation, configResult);
  const output =
    options.format === "json"
      ? formatReportJson(data)
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
  return (
    typeof counts.info === "number" &&
    typeof counts.warning === "number" &&
    typeof counts.error === "number"
  );
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { code?: string };
  return record.code === "ENOENT";
}

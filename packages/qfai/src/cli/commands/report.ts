import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import {
  createReportData,
  formatReportJson,
  formatReportMarkdown,
} from "../../core/report.js";
import {
  VALIDATION_SCHEMA_VERSION,
  type ValidationResult,
} from "../../core/types.js";
import { info } from "../lib/logger.js";

export type ReportOptions = {
  root: string;
  format: "md" | "json";
  jsonPath?: string;
  outPath?: string;
};

export async function runReport(options: ReportOptions): Promise<void> {
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  const input = options.jsonPath ?? configResult.config.output.jsonPath;
  const inputPath = path.isAbsolute(input) ? input : path.resolve(root, input);
  const validation = await readValidationResult(inputPath);

  const data = await createReportData(root, validation, configResult);
  const output =
    options.format === "json"
      ? formatReportJson(data)
      : formatReportMarkdown(data);

  const defaultOut =
    options.format === "json" ? ".qfai/out/report.json" : ".qfai/out/report.md";
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
  if (parsed.schemaVersion !== VALIDATION_SCHEMA_VERSION) {
    throw new Error(
      `validate.json の schemaVersion が不一致です: expected ${VALIDATION_SCHEMA_VERSION}, actual ${parsed.schemaVersion}`,
    );
  }
  return parsed;
}

function isValidationResult(value: unknown): value is ValidationResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.schemaVersion !== "string") {
    return false;
  }
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

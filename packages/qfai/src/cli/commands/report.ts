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
      warn("report: --in is ignored because --run-validate was given.");
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
    const input = options.inputPath ?? configResult.config.output.validateJsonPath;
    const inputPath = path.isAbsolute(input) ? input : path.resolve(root, input);
    try {
      validation = await readValidationResult(inputPath);
    } catch (err) {
      if (isEnoent(err)) {
        error(
          [
            `qfai report: input file not found: ${inputPath}`,
            "",
            "Run qfai validate first. For example:",
            "  qfai validate",
            "(default output path: .qfai/report/validate.json)",
            "",
            "Alternatively, pass --run-validate to report.",
            "If you use the GitHub Actions template, run the workflow's validate job first.",
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

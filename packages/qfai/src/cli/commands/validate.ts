import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FailOn, OutputFormat } from "../../core/config.js";
import { loadConfig } from "../../core/config.js";
import type { Issue, ValidationResult } from "../../core/types.js";
import { validateProject } from "../../core/validate.js";
import { shouldFail } from "../lib/failOn.js";

export type ValidateOptions = {
  root: string;
  strict: boolean;
  failOn?: FailOn;
  format?: OutputFormat;
};

export async function runValidate(options: ValidateOptions): Promise<number> {
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  const result = await validateProject(root, configResult);

  const format = options.format ?? "text";
  if (format === "text") {
    emitText(result);
  }
  if (format === "github") {
    result.issues.forEach(emitGitHub);
  }
  await emitJson(result, root, configResult.config.output.validateJsonPath);

  const failOn = resolveFailOn(options, configResult.config.validation.failOn);
  return shouldFail(result, failOn) ? 1 : 0;
}

function resolveFailOn(options: ValidateOptions, fallback: FailOn): FailOn {
  if (options.failOn) {
    return options.failOn;
  }
  if (options.strict) {
    return "warning";
  }
  return fallback;
}

function emitText(result: ValidationResult): void {
  for (const item of result.issues) {
    const location = item.file ? ` (${item.file})` : "";
    const refs =
      item.refs && item.refs.length > 0 ? ` refs=${item.refs.join(",")}` : "";
    process.stdout.write(
      `[${item.severity}] ${item.code} ${item.message}${location}${refs}\n`,
    );
  }
  process.stdout.write(
    `counts: info=${result.counts.info} warning=${result.counts.warning} error=${result.counts.error}\n`,
  );
}

function emitGitHub(issue: Issue): void {
  const level =
    issue.severity === "error"
      ? "error"
      : issue.severity === "warning"
        ? "warning"
        : "notice";
  const file = issue.file ? `file=${issue.file}` : "";
  const line = issue.loc?.line ? `,line=${issue.loc.line}` : "";
  const column = issue.loc?.column ? `,col=${issue.loc.column}` : "";
  const location = file ? ` ${file}${line}${column}` : "";
  process.stdout.write(
    `::${level}${location}::${issue.code}: ${issue.message}\n`,
  );
}

async function emitJson(
  result: ValidationResult,
  root: string,
  jsonPath: string,
): Promise<void> {
  const abs = path.isAbsolute(jsonPath)
    ? jsonPath
    : path.resolve(root, jsonPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
}

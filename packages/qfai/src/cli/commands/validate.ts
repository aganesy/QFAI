import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FailOn, OutputFormat } from "../../core/config.js";
import { loadConfig } from "../../core/config.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { toRelativePath } from "../../core/paths.js";
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
  const normalized = normalizeValidationResult(root, result);

  const format = options.format ?? "text";
  if (format === "text") {
    emitText(normalized);
  }
  if (format === "github") {
    const jsonPath = resolveJsonPath(
      root,
      configResult.config.output.validateJsonPath,
    );
    emitGitHubOutput(normalized, root, jsonPath);
  }
  await emitJson(normalized, root, configResult.config.output.validateJsonPath);

  const failOn = resolveFailOn(options, configResult.config.validation.failOn);
  return shouldFail(normalized, failOn) ? 1 : 0;
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

function emitGitHubOutput(
  result: ValidationResult,
  root: string,
  jsonPath: string,
): void {
  const deduped = dedupeIssues(result.issues);
  const omitted = Math.max(deduped.length - GITHUB_ANNOTATION_LIMIT, 0);
  const dropped = Math.max(result.issues.length - deduped.length, 0);

  emitGitHubSummary(result, {
    total: deduped.length,
    omitted,
    dropped,
    jsonPath,
    root,
  });

  const issues = deduped.slice(0, GITHUB_ANNOTATION_LIMIT);
  for (const issue of issues) {
    emitGitHub(issue);
  }
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

function emitGitHubSummary(
  result: ValidationResult,
  options: {
    total: number;
    omitted: number;
    dropped: number;
    jsonPath: string;
    root: string;
  },
): void {
  const summary = [
    "qfai validate summary:",
    `error=${result.counts.error}`,
    `warning=${result.counts.warning}`,
    `info=${result.counts.info}`,
    `annotations=${Math.min(options.total, GITHUB_ANNOTATION_LIMIT)}/${options.total}`,
  ].join(" ");
  process.stdout.write(`${summary}\n`);

  if (options.dropped > 0 || options.omitted > 0) {
    const details = [
      "qfai validate note:",
      options.dropped > 0 ? `重複除外=${options.dropped}` : null,
      options.omitted > 0 ? `上限省略=${options.omitted}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    process.stdout.write(`${details}\n`);
  }

  const relative = toRelativePath(options.root, options.jsonPath);
  process.stdout.write(
    `qfai validate note: 詳細は ${relative} または --format text を参照してください。\n`,
  );
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  const deduped: Issue[] = [];
  for (const issue of issues) {
    const key = issueKey(issue);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(issue);
  }
  return deduped;
}

function issueKey(issue: Issue): string {
  const file = issue.file ?? "";
  const line = issue.loc?.line ?? "";
  const column = issue.loc?.column ?? "";
  return [issue.code, issue.severity, issue.message, file, line, column].join(
    "|",
  );
}

async function emitJson(
  result: ValidationResult,
  root: string,
  jsonPath: string,
): Promise<void> {
  const abs = resolveJsonPath(root, jsonPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
}

function resolveJsonPath(root: string, jsonPath: string): string {
  return path.isAbsolute(jsonPath) ? jsonPath : path.resolve(root, jsonPath);
}

const GITHUB_ANNOTATION_LIMIT = 100;

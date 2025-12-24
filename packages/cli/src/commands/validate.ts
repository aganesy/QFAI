import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

import {
  loadConfig,
  resolvePath,
  validateProject,
  type Issue,
} from "@qfai/core";

import { collectFiles } from "../lib/scan.js";
import { info, warn } from "../lib/logger.js";

const require = createRequire(import.meta.url);

export type ValidateOptions = {
  root: string;
};

export async function runValidate(options: ValidateOptions): Promise<Issue[]> {
  const root = path.resolve(options.root);
  const result = await validateProject(root);
  const config = await loadConfig(root);
  const apiRoot = resolvePath(root, config, "apiContractsDir");

  const apiFiles = await collectFiles(apiRoot, [".yaml", ".yml", ".json"]);
  const spectralIssues = await lintOpenApi(apiFiles);

  const issues = [...result.issues, ...spectralIssues];
  printIssues(issues);

  info(`warnings: ${issues.length}`);
  return issues;
}

async function lintOpenApi(files: string[]): Promise<Issue[]> {
  if (files.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  const spectralPath = resolveSpectral();

  for (const file of files) {
    if (!spectralPath) {
      issues.push(
        issue(
          "QFAI-API-900",
          "Spectral が見つからないため OpenAPI 検査をスキップしました。",
          file,
        ),
      );
      continue;
    }

    const result = spawnSync(
      process.execPath,
      [spectralPath, "lint", file, "--format", "json"],
      {
        encoding: "utf-8",
      },
    );

    if (result.error) {
      issues.push(
        issue(
          "QFAI-API-901",
          `Spectral 実行に失敗しました: ${result.error.message}`,
          file,
        ),
      );
      continue;
    }

    if (!result.stdout) {
      continue;
    }

    const parsed = parseSpectralOutput(result.stdout, file);
    issues.push(...parsed);
  }

  return issues;
}

function parseSpectralOutput(output: string, file: string): Issue[] {
  try {
    const results = JSON.parse(output) as Array<{
      code?: string;
      message?: string;
    }>;
    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    return results.map((result) =>
      issue(
        "QFAI-API-SPECTRAL",
        `Spectral: ${result.code ?? "unknown"} ${result.message ?? ""}`.trim(),
        file,
      ),
    );
  } catch (error) {
    return [
      issue(
        "QFAI-API-902",
        `Spectral 出力の解析に失敗しました: ${formatError(error)}`,
        file,
      ),
    ];
  }
}

function resolveSpectral(): string | null {
  try {
    return require.resolve("@stoplight/spectral-cli/dist/index.js");
  } catch {
    return null;
  }
}

function printIssues(issues: Issue[]): void {
  for (const item of issues) {
    const location = item.file ? ` (${item.file})` : "";
    const refs =
      item.refs && item.refs.length > 0 ? ` refs=${item.refs.join(",")}` : "";
    warn(`WARN [${item.code}] ${item.message}${location}${refs}`);
  }
}

function issue(
  code: string,
  message: string,
  file?: string,
  refs?: string[],
): Issue {
  const issue: Issue = {
    code,
    severity: "warning",
    message,
  };
  if (file) {
    issue.file = file;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  return issue;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

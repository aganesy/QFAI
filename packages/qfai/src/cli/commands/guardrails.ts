import path from "node:path";

import {
  checkDecisionGuardrails,
  filterDecisionGuardrailsByKeyword,
  formatGuardrailsForLlm,
  loadDecisionGuardrails,
  normalizeDecisionGuardrails,
  sortDecisionGuardrails,
} from "../../core/decisionGuardrails.js";
import type { GuardrailLoadResult } from "../../core/decisionGuardrails.js";
import type { DecisionGuardrail, GuardrailIssue } from "../../core/decisionGuardrails.js";
import { toRelativePath } from "../../core/paths.js";
import { error, info } from "../lib/logger.js";

export type GuardrailsCommandOptions = {
  root: string;
  action?: "list" | "extract" | "check";
  paths: string[];
  max?: number;
  keyword?: string;
  /** `--format json` emits a machine-readable payload instead of text. */
  format?: "text" | "json";
};

const DEFAULT_EXTRACT_MAX = 20;

export async function runGuardrails(options: GuardrailsCommandOptions): Promise<number> {
  // Resolved before any failure branch: `--format json` promises parseable
  // stdout for every outcome, refusals included.
  const asJson = options.format === "json";

  if (!options.action) {
    const message = "guardrails: action is required (list|extract|check)";
    error(message);
    if (asJson) {
      info(formatGuardrailsErrorJson("action-required", message));
    }
    return 2;
  }

  const root = path.resolve(options.root);
  const { entries, errors } = await loadDecisionGuardrails(root, {
    paths: options.paths,
  });

  if (errors.length > 0) {
    errors.forEach((item) => {
      const relative = toRelativePath(root, item.path);
      error(`guardrails: ${relative}: ${relativizeMessagePaths(root, item.path, item.message)}`);
    });
    if (asJson) {
      info(
        formatGuardrailsErrorJson(
          "load-failed",
          "guardrails: failed to load one or more guardrail sources",
          errors.map((item) => ({
            path: toRelativePath(root, item.path),
            message: relativizeMessagePaths(root, item.path, item.message),
          })),
        ),
      );
    }
    return 2;
  }

  if (options.action === "check") {
    return runGuardrailsCheck(entries, root, asJson);
  }

  const items = sortDecisionGuardrails(normalizeDecisionGuardrails(entries));
  const filtered = filterDecisionGuardrailsByKeyword(items, options.keyword);

  if (options.action === "extract") {
    const max = options.max !== undefined ? options.max : DEFAULT_EXTRACT_MAX;
    if (!Number.isFinite(max) || max < 0) {
      const message = "guardrails: --max must be a non-negative number";
      error(message);
      if (asJson) {
        info(formatGuardrailsErrorJson("invalid-max", message));
      }
      return 2;
    }
    const limit = Math.max(0, Math.floor(max));
    if (asJson) {
      info(formatGuardrailsJson(filtered.slice(0, limit), root));
      return 0;
    }
    info(formatGuardrailsForLlm(filtered, max));
    return 0;
  }

  if (asJson) {
    info(formatGuardrailsJson(filtered, root));
    return 0;
  }

  info(formatGuardrailsList(filtered, root));
  return 0;
}

/**
 * Machine-readable encoding for the exit-2 refusals (missing action, load
 * failure, invalid `--max`, and the parser-level rejections `main.ts` returns
 * before this command runs). Distinct top-level key so consumers can tell a
 * refusal apart from a `check` payload, whose `errors[]` are guardrail issues.
 * `details[].path` is relativized against the project root like every other
 * path the JSON payloads emit.
 */
export function formatGuardrailsErrorJson(
  code: string,
  message: string,
  details: { path: string; message: string }[] = [],
): string {
  const payload = {
    error: {
      code,
      message,
      ...(details.length > 0 ? { details } : {}),
    },
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Node's fs errors splice the absolute path into their own message
 * (`Error: ENOENT: ... open '<abs>/18_delta.md'`), so relativizing the
 * structured `path` alone still leaks the local checkout onto stdout and makes
 * the payload differ between checkouts. Rewrite the target path — and any
 * other project-root prefix left in the text — to the portable relative form.
 */
function relativizeMessagePaths(root: string, target: string, message: string): string {
  const withTarget = replacePathOccurrences(message, target, toRelativePath(root, target));
  return replacePathOccurrences(withTarget, root, ".");
}

/**
 * Replaces `absolute` with `replacement` in both separator spellings, so a
 * message quoting a Windows path is caught even when the stored path uses
 * POSIX separators (and vice versa).
 */
function replacePathOccurrences(message: string, absolute: string, replacement: string): string {
  if (!absolute || !path.isAbsolute(absolute)) {
    return message;
  }
  const variants = new Set([
    absolute,
    absolute.replace(/\\/gu, "/"),
    absolute.replace(/\//gu, "\\"),
  ]);
  let result = message;
  for (const variant of variants) {
    result = result.split(variant).join(replacement);
  }
  return result;
}

/**
 * Machine-readable encoding for `list` / `extract`. Mirrors the normalized
 * entry shape, with `source.file` relativized against the project root so the
 * payload stays portable across checkouts (the text formatters do the same).
 */
function formatGuardrailsJson(items: DecisionGuardrail[], root: string): string {
  const payload = {
    items: items.map((item) => ({
      ...item,
      source: { file: toRelativePath(root, item.source.file), line: item.source.line },
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Machine-readable encoding for `check`. Keeps the pre-flatten
 * `{errors, warnings}` split and the issue fields the text formatter reads.
 */
function formatGuardrailsCheckJson(
  result: { errors: GuardrailIssue[]; warnings: GuardrailIssue[] },
  root: string,
): string {
  const toIssue = (issue: GuardrailIssue): Record<string, unknown> => ({
    ...issue,
    file: toRelativePath(root, issue.file),
    ...(issue.locations
      ? { locations: issue.locations.map((location) => toRelativeLocation(root, location)) }
      : {}),
  });
  const payload = {
    summary: { errors: result.errors.length, warnings: result.warnings.length },
    errors: result.errors.map(toIssue),
    warnings: result.warnings.map(toIssue),
  };
  return JSON.stringify(payload, null, 2);
}

function toRelativeLocation(
  root: string,
  location: { file: string; line: number },
): { file: string; line: number } {
  return { file: toRelativePath(root, location.file), line: location.line };
}

function formatGuardrailsList(
  items: ReturnType<typeof normalizeDecisionGuardrails>,
  root: string,
): string {
  const lines: string[] = ["# Decision Guardrails (list)", ""];
  if (items.length === 0) {
    lines.push("- (none)");
    return lines.join("\n");
  }
  for (const item of items) {
    const relPath = toRelativePath(root, item.source.file);
    const location = `${relPath}:${item.source.line}`;
    lines.push(`- [${item.id}][${item.type}] ${item.guardrail} (${location})`);
  }
  return lines.join("\n");
}

function runGuardrailsCheck(
  entries: GuardrailLoadResult["entries"],
  root: string,
  asJson: boolean,
): number {
  const result = checkDecisionGuardrails(entries);
  if (asJson) {
    info(formatGuardrailsCheckJson(result, root));
    return result.errors.length > 0 ? 1 : 0;
  }
  const lines: string[] = [
    `guardrails check: error=${result.errors.length} warning=${result.warnings.length}`,
  ];

  const formatIssue = (issue: GuardrailIssue): string => {
    const relPath = toRelativePath(root, issue.file);
    const line = issue.line ? `:${issue.line}` : "";
    const id = issue.id ? ` id=${issue.id}` : "";
    const locations = issue.locations
      ? ` locations=${issue.locations
          .map((location) => {
            const relative = toRelativeLocation(root, location);
            return `${relative.file}:${relative.line}`;
          })
          .join(", ")}`
      : "";
    return `[${issue.severity}] ${issue.code} ${issue.message} (${relPath}${line})${id}${locations}`;
  };

  result.errors.forEach((issue) => lines.push(formatIssue(issue)));
  result.warnings.forEach((issue) => lines.push(formatIssue(issue)));

  info(lines.join("\n"));
  return result.errors.length > 0 ? 1 : 0;
}

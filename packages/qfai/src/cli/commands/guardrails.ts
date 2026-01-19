import path from "node:path";

import {
  checkDecisionGuardrails,
  filterDecisionGuardrailsByKeyword,
  formatGuardrailsForLlm,
  loadDecisionGuardrails,
  normalizeDecisionGuardrails,
  sortDecisionGuardrails,
} from "../../core/decisionGuardrails.js";
import { toRelativePath } from "../../core/paths.js";
import { error, info } from "../lib/logger.js";

export type GuardrailsCommandOptions = {
  root: string;
  action?: "list" | "extract" | "check";
  paths: string[];
  max?: number;
  keyword?: string;
};

const DEFAULT_EXTRACT_MAX = 20;

export async function runGuardrails(
  options: GuardrailsCommandOptions,
): Promise<number> {
  if (!options.action) {
    error("guardrails: action is required (list|extract|check)");
    return 2;
  }

  const root = path.resolve(options.root);
  const { entries, errors } = await loadDecisionGuardrails(root, {
    paths: options.paths,
  });

  if (errors.length > 0) {
    errors.forEach((item) => {
      error(`guardrails: ${item.path}: ${item.message}`);
    });
    return 2;
  }

  if (options.action === "check") {
    return runGuardrailsCheck(entries, root);
  }

  const items = sortDecisionGuardrails(
    normalizeDecisionGuardrails(entries),
  );
  const filtered = filterDecisionGuardrailsByKeyword(items, options.keyword);

  if (options.action === "extract") {
    const max =
      options.max !== undefined ? options.max : DEFAULT_EXTRACT_MAX;
    if (!Number.isFinite(max) || max < 0) {
      error("guardrails: --max must be a non-negative number");
      return 2;
    }
    info(formatGuardrailsForLlm(filtered, max));
    return 0;
  }

  info(formatGuardrailsList(filtered, root));
  return 0;
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
  entries: ReturnType<typeof loadDecisionGuardrails>["entries"],
  root: string,
): number {
  const result = checkDecisionGuardrails(entries);
  const lines: string[] = [
    `guardrails check: error=${result.errors.length} warning=${result.warnings.length}`,
  ];

  const formatIssue = (issue: typeof result.errors[number]): string => {
    const relPath = toRelativePath(root, issue.file);
    const line = issue.line ? `:${issue.line}` : "";
    const id = issue.id ? ` id=${issue.id}` : "";
    return `[${issue.severity}] ${issue.code} ${issue.message} (${relPath}${line})${id}`;
  };

  result.errors.forEach((issue) => lines.push(formatIssue(issue)));
  result.warnings.forEach((issue) => lines.push(formatIssue(issue)));

  info(lines.join("\n"));
  return result.errors.length > 0 ? 1 : 0;
}

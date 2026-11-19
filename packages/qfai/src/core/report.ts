import type { ConfigLoadResult } from "./config.js";
import { resolveFlowScope } from "./flowScope.js";
import { readStoryTreeModel } from "./storyTree/tree.js";
import type { Issue, ValidationCounts, ValidationProfile, ValidationResult } from "./types.js";

export type ReportData = {
  tool: "qfai";
  version: string;
  generatedAt?: string;
  profile?: ValidationProfile;
  summary: {
    flows: number;
    stories: number;
    acceptanceCriteria: number;
    examples: number;
    rules: number;
    contracts: number;
    counts: ValidationCounts;
  };
  flows: Array<{
    id: string;
    stories: string[];
    acceptanceCriteria: string[];
    examples: string[];
    rules: string[];
  }>;
  waivers?: ValidationResult["waivers"];
  issues: Issue[];
};

/** Build a report from the validated story tree and its unmodified findings. */
export async function createReportData(
  root: string,
  config: ConfigLoadResult["config"],
  validation: ValidationResult,
  flowIds?: readonly string[],
): Promise<ReportData> {
  const model = await readStoryTreeModel(root, config);
  const scope = flowIds?.length ? resolveFlowScope(flowIds, model) : null;
  if (scope?.invalidValues.length) {
    throw new Error(`Unknown business flow: ${scope.invalidValues.join(", ")}`);
  }
  const selected = scope ? new Set(scope.flowIds) : null;
  const flows = model.flows
    .filter((flow) => !selected || selected.has(flow.id))
    .map((flow) => {
      const scope = resolveFlowScope([flow.id], model);
      return {
        id: flow.id,
        stories: scope.storyIds,
        acceptanceCriteria: scope.acceptanceCriteriaIds,
        examples: scope.exampleIds,
        rules: scope.ruleIds,
      };
    });
  const stories = new Set(flows.flatMap((flow) => flow.stories));
  const criteria = new Set(flows.flatMap((flow) => flow.acceptanceCriteria));
  const examples = new Set(flows.flatMap((flow) => flow.examples));
  const rules = new Set(flows.flatMap((flow) => flow.rules));
  const contracts = new Set(
    model.rules.filter((rule) => rules.has(rule.id)).map((rule) => rule.file),
  );
  return {
    tool: "qfai",
    version: validation.toolVersion,
    ...(validation.generatedAt ? { generatedAt: validation.generatedAt } : {}),
    ...(validation.profile ? { profile: validation.profile } : {}),
    summary: {
      flows: flows.length,
      stories: stories.size,
      acceptanceCriteria: criteria.size,
      examples: examples.size,
      rules: rules.size,
      contracts: contracts.size,
      counts: validation.counts,
    },
    flows,
    ...(validation.waivers ? { waivers: validation.waivers } : {}),
    issues: validation.issues,
  };
}

export function formatReportMarkdown(data: ReportData, options: { baseUrl?: string } = {}): string {
  const lines = [
    "# QFAI Report",
    "",
    ...(data.profile ? [`- Profile: ${data.profile}`] : []),
    `- Business flows: ${data.summary.flows}`,
    `- User stories: ${data.summary.stories}`,
    `- Acceptance criteria: ${data.summary.acceptanceCriteria}`,
    `- Examples: ${data.summary.examples}`,
    `- Business rules: ${data.summary.rules}`,
    `- Contracts: ${data.summary.contracts}`,
    `- Findings: info=${data.summary.counts.info} warning=${data.summary.counts.warning} error=${data.summary.counts.error}`,
    "",
    "## Business flows",
    "",
  ];
  for (const flow of data.flows) {
    lines.push(`### ${flow.id}`, "", `- Stories: ${flow.stories.join(", ") || "none"}`);
    lines.push(`- Acceptance criteria: ${flow.acceptanceCriteria.join(", ") || "none"}`);
    lines.push(`- Examples: ${flow.examples.join(", ") || "none"}`);
    lines.push(`- Business rules: ${flow.rules.join(", ") || "none"}`, "");
  }
  if (data.waivers) {
    lines.push("## Waivers", "", `- Active: ${data.waivers.active.length}`);
    lines.push(`- Suppressed findings: ${data.waivers.suppressed.total}`, "");
  }
  lines.push("## Findings", "");
  if (data.issues.length === 0) lines.push("No findings.");
  const baseUrl = options.baseUrl === undefined ? null : parseReportBaseUrl(options.baseUrl);
  for (const issue of data.issues) {
    const link = issue.file && baseUrl ? fileLink(baseUrl, issue.file) : null;
    const source = issue.file
      ? link
        ? ` ([${markdownText(issue.file)}](${link}))`
        : ` (${markdownText(issue.file)})`
      : "";
    lines.push(
      `- ${issue.severity.toUpperCase()} ${markdownText(issue.code)}: ${markdownText(issue.message)}${source}`,
    );
  }
  return lines.join("\n");
}

/**
 * The `--base-url` a report links from, or `null` when it is not an absolute
 * http(s) URL without a query, fragment or credentials: a path appended to one of those
 * would land in the query or fragment instead of the repository path.
 */
export function parseReportBaseUrl(value: string): URL | null {
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // An empty `?` or `#` leaves `search` and `hash` empty but stays in `href`.
  if (/[?#]/.test(url.href) || url.username !== "" || url.password !== "") return null;
  return url;
}

/**
 * Diagnostic text read from a validation result, rendered so it reads as text:
 * a line break cannot start a new block and an inline Markdown character
 * cannot open a link, an emphasis, code, HTML or a table cell.
 */
function markdownText(value: string): string {
  return value.replace(/\r\n|\r|\n/g, " ").replace(/[\\`*_[\]<>&|~!]/g, "\\$&");
}

/**
 * The link to `file` under `base`, each path segment percent-encoded, or `null`
 * when the file's path would resolve outside the base path. Parentheses are
 * encoded too, since an unbalanced one ends a Markdown link destination.
 */
function fileLink(base: URL, file: string): string | null {
  const segments = file
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment !== "")
    .map(encodeURIComponent);
  const prefix = base.href.replace(/\/$/, "");
  const link = new URL(`${prefix}/${segments.join("/")}`);
  if (!link.href.startsWith(`${prefix}/`)) return null;
  return link.href.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

export function formatReportJson(data: ReportData): string {
  return JSON.stringify(data, null, 2);
}

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
  for (const issue of data.issues) {
    const source = issue.file
      ? options.baseUrl
        ? ` ([${issue.file}](${options.baseUrl.replace(/\/$/, "")}/${issue.file.replace(/\\/g, "/").replace(/^\//, "")}))`
        : ` (${issue.file})`
      : "";
    lines.push(`- ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}${source}`);
  }
  return lines.join("\n");
}

export function formatReportJson(data: ReportData): string {
  return JSON.stringify(data, null, 2);
}

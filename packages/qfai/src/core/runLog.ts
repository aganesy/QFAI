import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { findLatestPack } from "./packLocator.js";
import { toRelativePath } from "./paths.js";
import type { Issue, ValidationResult } from "./types.js";

type RunLogResultStatus = "pass" | "fail";

type RunLogIssue = {
  code: string;
  path?: string;
  message: string;
  evidence?: string;
};

type TraceabilityNode = {
  id: string;
  layer: string;
  path?: string;
};

export type ValidateRunLog = {
  runId: string;
  reportDir: string;
};

export async function writeValidateRunLog(input: {
  root: string;
  config: QfaiConfig;
  result: ValidationResult;
  startedAt: Date;
  command?: string;
  status?: RunLogResultStatus;
}): Promise<ValidateRunLog> {
  const root = path.resolve(input.root);
  const outDir = resolvePath(root, input.config, "outDir");
  await mkdir(outDir, { recursive: true });
  const { runId, reportDir } = await allocateRunReportDir(
    outDir,
    input.startedAt,
  );

  const relativeSpecsRoot = toRelativePath(
    root,
    resolvePath(root, input.config, "specsDir"),
  );
  const latestDiscuss = await findLatestPack(
    path.join(root, ".qfai", "discuss"),
    "discuss",
  );
  const latestRequire = await findLatestPack(
    resolvePath(root, input.config, "requireDir"),
    "require",
  );

  const status = resolveStatus(input.result, input.status);
  const errors = toRunLogIssues(root, input.result.issues, "error");
  const warnings = toRunLogIssues(root, input.result.issues, "warning");
  const relativeReportDir = toRelativePath(root, reportDir);

  const runJson = {
    schema_version: 1,
    run_id: runId,
    started_at: input.startedAt.toISOString(),
    command: input.command ?? "/qfai-validate",
    repo_root: ".",
    inputs: {
      discuss_pack: latestDiscuss
        ? toRelativePath(root, latestDiscuss.path)
        : null,
      require_pack: latestRequire
        ? toRelativePath(root, latestRequire.path)
        : null,
      specs_root: relativeSpecsRoot,
    },
    outputs: {
      report_dir: relativeReportDir,
    },
    result: {
      status,
      errors: input.result.counts.error,
      warnings: input.result.counts.warning,
    },
  };

  const validatorJson = {
    schema_version: 1,
    status,
    errors,
    warnings,
  };

  const traceabilityJson = buildTraceabilityJson(root, input.result.issues);
  const summaryMd = buildSummaryMarkdown({
    runId,
    startedAt: input.startedAt.toISOString(),
    status,
    relativeReportDir,
    errors,
    warnings,
  });

  await writeJson(path.join(reportDir, "run.json"), runJson);
  await writeJson(path.join(reportDir, "validator.json"), validatorJson);
  await writeJson(path.join(reportDir, "traceability.json"), traceabilityJson);
  await writeFile(
    path.join(reportDir, "summary.md"),
    `${summaryMd}\n`,
    "utf-8",
  );

  return {
    runId,
    reportDir,
  };
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function resolveStatus(
  result: ValidationResult,
  override?: RunLogResultStatus,
): RunLogResultStatus {
  if (override) {
    return override;
  }
  return result.counts.error > 0 ? "fail" : "pass";
}

function toRunLogIssues(
  root: string,
  issues: Issue[],
  severity: "error" | "warning",
): RunLogIssue[] {
  return issues
    .filter((issue) => issue.severity === severity && !issue.suppressed)
    .map((issue) => {
      const entry: RunLogIssue = {
        code: issue.code,
        message: issue.message,
      };
      if (issue.file) {
        entry.path = toRelativePath(root, issue.file);
      }
      if (issue.refs && issue.refs.length > 0) {
        entry.evidence = issue.refs.join(", ");
      }
      return entry;
    });
}

function buildTraceabilityJson(
  root: string,
  issues: Issue[],
): {
  schema_version: number;
  nodes: TraceabilityNode[];
  edges: Array<{ from: string; to: string; type: string }>;
  stats: Record<string, number>;
} {
  const idRegex = /\b(OBJ|INIT|CAP|FLOW|US|AC|BR|EX|TC)-\d{4}\b/g;
  const nodes = new Map<string, TraceabilityNode>();

  for (const issue of issues) {
    if (!issue.refs || issue.refs.length === 0) {
      continue;
    }
    for (const ref of issue.refs) {
      const match = idRegex.exec(ref);
      idRegex.lastIndex = 0;
      const id = match?.[0];
      const layer = match?.[1];
      if (!id || !layer) {
        continue;
      }
      if (nodes.has(id)) {
        continue;
      }
      const node: TraceabilityNode = {
        id,
        layer,
      };
      if (issue.file) {
        node.path = toRelativePath(root, issue.file);
      }
      nodes.set(id, node);
    }
  }

  return {
    schema_version: 1,
    nodes: Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id)),
    edges: [],
    stats: {
      downstream_violations: issues.filter(
        (issue) => issue.code === "TRACE_DOWNSTREAM_REF",
      ).length,
      shared_scope_violations: issues.filter(
        (issue) => issue.code === "TRACE_SHARED_SCOPE_VIOLATION",
      ).length,
      legacy_status_warnings: issues.filter(
        (issue) =>
          issue.code === "LEGACY_STATUS_DIR" ||
          issue.code === "LEGACY_STATUS_DIR_NONEMPTY",
      ).length,
    },
  };
}

function buildSummaryMarkdown(input: {
  runId: string;
  startedAt: string;
  status: RunLogResultStatus;
  relativeReportDir: string;
  errors: RunLogIssue[];
  warnings: RunLogIssue[];
}): string {
  const lines: string[] = [];
  lines.push("# Validate Run Summary");
  lines.push("");
  lines.push(`- run_id: ${input.runId}`);
  lines.push(`- started_at: ${input.startedAt}`);
  lines.push(`- status: ${input.status}`);
  lines.push(`- report_dir: ${input.relativeReportDir}`);
  lines.push(`- errors: ${input.errors.length}`);
  lines.push(`- warnings: ${input.warnings.length}`);
  lines.push("");
  lines.push("## Top Errors");
  lines.push("");
  if (input.errors.length === 0) {
    lines.push("- none");
  } else {
    for (const issue of input.errors.slice(0, 5)) {
      const location = issue.path ? ` (${issue.path})` : "";
      lines.push(`- ${issue.code}${location}: ${issue.message}`);
    }
  }
  lines.push("");
  lines.push("## Top Warnings");
  lines.push("");
  if (input.warnings.length === 0) {
    lines.push("- none");
  } else {
    for (const issue of input.warnings.slice(0, 5)) {
      const location = issue.path ? ` (${issue.path})` : "";
      lines.push(`- ${issue.code}${location}: ${issue.message}`);
    }
  }
  return lines.join("\n");
}

function formatTimestamp17(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  const millis = `${date.getMilliseconds()}`.padStart(3, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}${millis}`;
}

async function allocateRunReportDir(
  outDir: string,
  startedAt: Date,
): Promise<ValidateRunLog> {
  const maxAttempts = 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateDate = new Date(startedAt.getTime() + attempt);
    const runId = `run-${formatTimestamp17(candidateDate)}`;
    const reportDir = path.join(outDir, runId);
    try {
      await mkdir(reportDir);
      return { runId, reportDir };
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }
  throw new Error(
    "run-log directory allocation failed after retrying timestamp collisions",
  );
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "EEXIST"
  );
}

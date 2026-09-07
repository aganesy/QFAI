import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FailOn, QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { findLatestPack } from "./packLocator.js";
import { toRelativePath } from "./paths.js";
import type { Issue, ValidationResult } from "./types.js";
import {
  buildLayeredTraceabilityGraph,
  qualifyId,
  specNumberForPath,
  type TraceabilityGraph,
  type TraceabilityGraphEdge,
} from "./validators/traceability.js";

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
  /**
   * この run の pass/fail を決めた実効しきい値。呼び出し側でフラグと config を
   * 突き合わせた結果であり、成果物だけを読む下流が status の根拠を再現できる
   * よう記録する。渡されなければ `null`。
   */
  failOn?: FailOn;
}): Promise<ValidateRunLog> {
  const root = path.resolve(input.root);
  const outDir = resolvePath(root, input.config, "outDir");
  await mkdir(outDir, { recursive: true });
  const { runId, reportDir } = await allocateRunReportDir(outDir, input.startedAt);

  const relativeSpecsRoot = toRelativePath(root, resolvePath(root, input.config, "specsDir"));
  const latestDiscussion = await findLatestPack(
    resolvePath(root, input.config, "discussionDir"),
    "discussion",
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
      discussion_pack: latestDiscussion ? toRelativePath(root, latestDiscussion.path) : null,
      specs_root: relativeSpecsRoot,
    },
    outputs: {
      report_dir: relativeReportDir,
    },
    result: {
      status,
      errors: input.result.counts.error,
      warnings: input.result.counts.warning,
      fail_on: input.failOn ?? null,
    },
  };

  const validatorJson = {
    schema_version: 1,
    status,
    errors,
    warnings,
  };

  // The graph comes from the parsed spec pack, not from the issue list, so a clean run still
  // produces real traceability evidence. A pack that cannot be walked degrades to the
  // issue-derived nodes rather than failing the run log.
  let graph: TraceabilityGraph = { nodes: [], edges: [] };
  try {
    graph = await buildLayeredTraceabilityGraph(root, input.config);
  } catch {
    // Keep the empty graph declared above and fall through to the
    // issue-derived nodes. Reassigning it here said the same thing twice.
  }
  const traceabilityJson = buildTraceabilityJson(root, input.result.issues, graph);
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
  await writeFile(path.join(reportDir, "summary.md"), `${summaryMd}\n`, "utf-8");

  // Validate Hard Gate evidence. Written on every run so it can never go stale:
  // it always points at the newest run-log directory. Previously this file only
  // existed as a side effect of `| tee`, which the Hard Gate command line itself
  // omits (and which is not portable to PowerShell).
  await writeLatestValidateLog(outDir, runId, () =>
    buildValidateLog({
      runId,
      startedAt: input.startedAt.toISOString(),
      status,
      relativeReportDir,
      command: runJson.command,
      errorCount: input.result.counts.error,
      warningCount: input.result.counts.warning,
      summaryMd,
    }),
  );

  return {
    runId,
    reportDir,
  };
}

const RUN_ID_LINE_RE = /^-\s*run_id:\s*(run-\d{17})\s*$/m;
const RUN_DIR_RE = /^run-\d{17}$/;

/**
 * Write the shared `validate.log` only when this run is the newest one on disk.
 *
 * Two validates on the same root race here. Run-log directory names come from
 * the run's START time, so a long run A started before a short run B finishes
 * after it — and an unconditional write would leave `validate.log` pointing at
 * A's older `run-*` directory while B's newer one sits beside it. The freshness
 * rule the shipped Hard Gate documents ("`run_log:` names the newest `run-*`")
 * would then fail on a repository where nothing is actually wrong.
 *
 * Run ids are `run-<17-digit local timestamp>`, so lexical order is
 * chronological order and both comparisons need no parsing.
 *
 * The decision is keyed on the `run-*` DIRECTORY listing rather than on
 * `validate.log` alone. A run's directory is created by `allocateRunReportDir`
 * at the START of the run, whereas the log is written at the END, so the
 * directory of a newer concurrent run is already visible during the window in
 * which an older run would otherwise clobber the pointer. Reading `validate.log`
 * remains as a second guard for the case where the newer run's directory was
 * pruned after it wrote.
 *
 * This is still not mutual exclusion: an older run that lists the directory
 * before a newer run has been allocated, and writes after that newer run has
 * finished, can leave a stale pointer. That window is now bounded by the gap
 * between this listing and the write below rather than by the whole duration of
 * the older run, which is what made the original ordering easy to lose. Closing
 * it entirely needs a lock file, whose stale-entry recovery after a crashed run
 * costs more than the residual risk.
 *
 * An unreadable or unparseable existing file is treated as "no newer run", so a
 * truncated or hand-edited log self-heals on the next validate.
 */
async function writeLatestValidateLog(
  outDir: string,
  runId: string,
  buildContents: () => string,
): Promise<void> {
  if (await hasNewerRunDir(outDir, runId)) {
    return;
  }
  const filePath = path.join(outDir, "validate.log");
  let existingRunId: string | null = null;
  try {
    existingRunId = RUN_ID_LINE_RE.exec(await readFile(filePath, "utf-8"))?.[1] ?? null;
  } catch {
    existingRunId = null;
  }
  if (existingRunId !== null && existingRunId > runId) {
    return;
  }
  await writeFile(filePath, `${buildContents()}\n`, "utf-8");
}

/**
 * True when `runRoot` already holds a `run-*` directory strictly newer than
 * `runId`.
 *
 * Exported because every writer of a "latest run" pointer needs the same rule
 * and the same reasoning about the race — `allocateRunDir` creates the
 * directory at the START of a run, so a newer concurrent run is visible here
 * before it finishes. Run ids are `run-<17-digit local timestamp>`, so lexical
 * order is chronological order.
 */
export async function hasNewerRunDir(runRoot: string, runId: string): Promise<boolean> {
  try {
    const entries = await readdir(runRoot, { withFileTypes: true });
    return entries.some(
      (entry) => entry.isDirectory() && RUN_DIR_RE.test(entry.name) && entry.name > runId,
    );
  } catch {
    // An unreadable run root cannot prove a newer run exists; fall through to
    // the caller's own pointer guard rather than skipping the write and losing
    // evidence.
    return false;
  }
}

function buildValidateLog(input: {
  runId: string;
  startedAt: string;
  status: RunLogResultStatus;
  relativeReportDir: string;
  command: string;
  errorCount: number;
  warningCount: number;
  summaryMd: string;
}): string {
  const lines: string[] = [];
  lines.push("# qfai validate log");
  lines.push("");
  lines.push("This file is written by every `qfai validate` run and always points at the newest");
  lines.push("run-log directory. Do not edit it by hand; do not pipe stdout into it.");
  lines.push("");
  lines.push(`- run_id: ${input.runId}`);
  lines.push(`- started_at: ${input.startedAt}`);
  lines.push(`- command: ${input.command}`);
  lines.push(`- status: ${input.status}`);
  lines.push(`- errors: ${input.errorCount}`);
  lines.push(`- warnings: ${input.warningCount}`);
  lines.push(`- run_log: ${input.relativeReportDir}`);
  lines.push("");
  lines.push(input.summaryMd);
  return lines.join("\n");
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

/**
 * `\b` after `\d{4}` matched happily before the `-` of a composite spec-local ID, so
 * `US-0006-0001` was silently rewritten to `US-0006` and the node dedup then collapsed every
 * requirement in a spec onto one node named after the spec. `{1,2}` accepts both the short and
 * composite forms; `SC` and `CASE` were missing from the prefix list entirely.
 */
const TRACEABILITY_ID_REGEX = /\b(OBJ|INIT|CAP|FLOW|US|AC|BR|EX|TC|SC|CASE)(?:-\d{4}){1,2}\b/g;

function buildTraceabilityJson(
  root: string,
  issues: Issue[],
  graph: TraceabilityGraph,
): {
  schema_version: number;
  nodes: TraceabilityNode[];
  edges: TraceabilityGraphEdge[];
  stats: Record<string, number>;
} {
  const idRegex = new RegExp(TRACEABILITY_ID_REGEX.source, TRACEABILITY_ID_REGEX.flags);
  const nodes = new Map<string, TraceabilityNode>();

  // Spec-pack nodes first: they are the authoritative set and carry their defining file.
  for (const node of graph.nodes) {
    const entry: TraceabilityNode = { id: node.id, layer: node.layer };
    if (node.path) {
      entry.path = node.path;
    }
    nodes.set(node.id, entry);
  }

  // Findings can still contribute IDs the spec-pack walk did not reach (non-layered layouts,
  // policy-level IDs such as OBJ / INIT / CAP / FLOW).
  for (const issue of issues) {
    if (!issue.refs || issue.refs.length === 0) {
      continue;
    }
    // The graph namespaces file-local short IDs as `spec-NNNN/AC-0001`, so a
    // raw `AC-0001` from a finding lands beside — not on — the node the edges
    // point at, and two specs' findings then merge onto one unqualified node.
    // Repo-level findings (`_policies/**`, config) have no owning spec and stay
    // unqualified, which is what the graph does for them too.
    const specNumber = specNumberForPath(issue.file);
    for (const ref of issue.refs) {
      idRegex.lastIndex = 0;
      const match = idRegex.exec(ref);
      const rawId = match?.[0];
      const layer = match?.[1];
      if (!rawId || !layer) {
        continue;
      }
      const id = specNumber === null ? rawId : qualifyId(specNumber, rawId);
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
    edges: graph.edges,
    stats: {
      downstream_violations: issues.filter((issue) => issue.code === "TRACE_DOWNSTREAM_REF").length,
      shared_scope_violations: issues.filter(
        (issue) => issue.code === "TRACE_SHARED_SCOPE_VIOLATION",
      ).length,
      legacy_status_warnings: issues.filter(
        (issue) =>
          issue.code === "LEGACY_STATUS_DIR" || issue.code === "LEGACY_STATUS_DIR_NONEMPTY",
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

/**
 * Allocate a fresh `run-<17-digit local timestamp>` directory under `parentDir`.
 *
 * The name is derived from the run's start time and the directory is created
 * exclusively, so two runs that start in the same millisecond get distinct ids
 * instead of writing over each other. Shared with the preflight writer, which
 * needs the same "one directory per run, lexically ordered" addressing under a
 * parent of its own.
 */
export async function allocateRunDir(
  parentDir: string,
  startedAt: Date,
): Promise<{ runId: string; runDir: string }> {
  const maxAttempts = 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateDate = new Date(startedAt.getTime() + attempt);
    const runId = `run-${formatTimestamp17(candidateDate)}`;
    const runDir = path.join(parentDir, runId);
    try {
      await mkdir(runDir);
      return { runId, runDir };
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("run directory allocation failed after retrying timestamp collisions");
}

async function allocateRunReportDir(outDir: string, startedAt: Date): Promise<ValidateRunLog> {
  const { runId, runDir } = await allocateRunDir(outDir, startedAt);
  return { runId, reportDir: runDir };
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "EEXIST"
  );
}

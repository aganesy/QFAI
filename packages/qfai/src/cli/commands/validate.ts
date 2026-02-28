import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FailOn, OutputFormat } from "../../core/config.js";
import { loadConfig } from "../../core/config.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import {
  buildCiRefinementIssue,
  createPhaseGuardResult,
} from "../../core/phasePolicy.js";
import { toRelativePath } from "../../core/paths.js";
import type {
  Issue,
  ValidationPhase,
  ValidationResult,
} from "../../core/types.js";
import { writeValidateRunLog } from "../../core/runLog.js";
import { validateProject } from "../../core/validate.js";
import { shouldFail } from "../lib/failOn.js";
import { warnIfTruncated } from "../lib/warnings.js";

export type ValidateOptions = {
  root: string;
  strict: boolean;
  failOn?: FailOn;
  format?: OutputFormat;
  phase?: ValidationPhase;
};

export async function runValidate(options: ValidateOptions): Promise<number> {
  const startedAt = new Date();
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  const blockedIssue = buildCiRefinementIssue(options.phase);
  const blockedByPhaseGuard = blockedIssue !== null;
  const result = blockedIssue
    ? await createPhaseGuardResult("refinement", blockedIssue)
    : await validateProject(
        root,
        configResult,
        options.phase ? { phase: options.phase } : {},
      );
  const normalized = normalizeValidationResult(root, result);
  warnIfTruncated(normalized.traceability.testFiles, "validate");

  const failOn = resolveFailOn(options, configResult.config.validation.failOn);
  const willFail = blockedByPhaseGuard || shouldFail(normalized, failOn);

  const runLog = await writeValidateRunLog({
    root,
    config: configResult.config,
    result: normalized,
    startedAt,
    command: "/qfai-validate",
    status: willFail ? "fail" : "pass",
  });
  const runLogPath = toRelativePath(root, runLog.reportDir);

  const format = options.format ?? "text";
  if (format === "text") {
    emitText(normalized);
    emitTextRunLog(runLogPath);
  }
  if (format === "github") {
    const jsonPath = resolveJsonPath(
      root,
      configResult.config.output.validateJsonPath,
    );
    emitGitHubOutput(normalized, root, jsonPath, {
      failOn,
      willFail,
      runLogPath,
    });
  }
  await emitJson(normalized, root, configResult.config.output.validateJsonPath);

  return willFail ? 1 : 0;
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
    const suppressed = item.suppressed ? " suppressed=true" : "";
    process.stdout.write(
      `[${item.severity}] ${item.code} ${item.message}${location}${refs}${suppressed}\n`,
    );
    if (item.severity === "error") {
      emitTextField("error_code", item.code);
      emitTextField("target", resolveIssueTarget(item));
      emitTextField("expected", resolveIssueExpected(item));
      emitTextField("current", item.message);
      emitTextField("fix", resolveIssueFix(item));
    }
  }
  process.stdout.write(
    `counts: info=${result.counts.info} warning=${result.counts.warning} error=${result.counts.error}\n`,
  );
}

function emitTextRunLog(runLogPath: string): void {
  process.stdout.write(`run-log: ${runLogPath}\n`);
}

function emitGitHubOutput(
  result: ValidationResult,
  root: string,
  jsonPath: string,
  status: { failOn: FailOn; willFail: boolean; runLogPath: string },
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
    ...status,
  });

  const issues = deduped.slice(0, GITHUB_ANNOTATION_LIMIT);
  for (const issue of issues) {
    emitGitHub(issue);
  }
}

function emitGitHub(issue: Issue): void {
  const level = issue.suppressed
    ? "notice"
    : issue.severity === "error"
      ? "error"
      : issue.severity === "warning"
        ? "warning"
        : "notice";
  const file = issue.file ? `file=${issue.file}` : "";
  const line = issue.loc?.line ? `,line=${issue.loc.line}` : "";
  const column = issue.loc?.column ? `,col=${issue.loc.column}` : "";
  const location = file ? ` ${file}${line}${column}` : "";
  const suffix =
    issue.severity === "error"
      ? ` expected=${resolveIssueExpected(issue)} | fix=${resolveIssueFix(issue)}`
      : "";
  const message = escapeGitHubCommandValue(
    `${issue.code}: ${issue.message}${suffix}`,
  );
  process.stdout.write(`::${level}${location}::${message}\n`);
}

function emitGitHubSummary(
  result: ValidationResult,
  options: {
    total: number;
    omitted: number;
    dropped: number;
    jsonPath: string;
    runLogPath: string;
    root: string;
    failOn: FailOn;
    willFail: boolean;
  },
): void {
  const summary = [
    "qfai validate summary:",
    `error=${result.counts.error}`,
    `warning=${result.counts.warning}`,
    `info=${result.counts.info}`,
    `annotations=${Math.min(options.total, GITHUB_ANNOTATION_LIMIT)}/${options.total}`,
    `failOn=${options.failOn}`,
    `result=${options.willFail ? "FAIL" : "PASS"}`,
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
  process.stdout.write(
    `qfai validate note: run-log は ${options.runLogPath} を参照してください。\n`,
  );

  process.stdout.write(
    "qfai validate note: 次は qfai report で report.md を生成できます（例: qfai report）。\n",
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
  const suppressed = issue.suppressed ? "suppressed" : "";
  return [
    issue.code,
    issue.severity,
    issue.message,
    file,
    line,
    column,
    suppressed,
  ].join("|");
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

const ISSUE_EXPECTED_BY_CODE: Record<string, string> = {
  E_SPEC_MISSING_FILESET: "Spec Pack required files (01..18) are complete.",
  E_LEDGER_MISSING_COLUMN:
    "Traceability Ledger has all required columns: trace_id,obj_id,init_id,cap_id,flow_id,us_id,ac_id,ex_ids,tc_ids.",
  E_LEDGER_EMPTY_CELL:
    "Required Ledger cells and multi-value columns are populated.",
  E_ID_INVALID_FORMAT: "All IDs follow the required format for each ID kind.",
  E_REF_NOT_FOUND:
    "Every referenced ID exists in the corresponding source file.",
  E_AC_NOT_VERIFIED: "Every AC is connected to EX and TC in the Ledger.",
  E_TC_ORPHAN:
    "Every TC is linked in Ledger and traceable up to objective intent.",
  E_UPWARD_REF_FORBIDDEN:
    "Upper-to-lower direct references are forbidden outside Ledger.",
  E_OQ_OPEN_RELEASE_BLOCK:
    "release_candidate requires zero open items in 15_Open-questions.md.",
  E_OQ_STATUS_UNPARSEABLE:
    "Each OQ entry has a valid status (open|resolved|deferred).",
  E_DELTA_MISSING_REQUIRED:
    "18_delta.md includes all required sections and Rejected has DO NOT/Temptation.",
  "QFAI-RPACK-001":
    "A latest require-pack directory exists under .qfai/require/require-<timestamp>/.",
  "QFAI-RPACK-002":
    "The latest require-pack contains all required files (01_Sources.md..09_delta.md).",
  "QFAI-RPACK-003":
    "The latest require-pack files contain minimum substantive content.",
  "QFAI-RPACK-004":
    "No blocking OQ remains in 08_OQ.md (Disposition=open with Gate discuss|require|sdd).",
  "QFAI-RPACK-005":
    "require-* naming must be timestamp format only (dangerous names are forbidden).",
  "QFAI-RPACK-006":
    "Legacy require-* serial packs are migration warnings in v1.4.36.",
  "QFAI-DISCUSS-023":
    "Discuss directory naming uses discuss-YYYYMMDDhhmmssSSS for new outputs.",
  "QFAI-DISCUSS-024":
    "Latest discuss pack contains required files (01_Context.md..09_delta.md).",
  "QFAI-DISCUSS-025": "No open OQ remains in latest discuss 05_OQ-Register.md.",
  "QFAI-DISCUSS-026":
    "Deferred rows include complete metadata in 07_Deferred.md.",
  "QFAI-DISCUSS-027":
    "Every deferred OQ in 05_OQ-Register.md is listed in 07_Deferred.md.",
  "QFAI-DISCUSS-028":
    "Legacy discuss serial packs are migration warnings in v1.4.36.",
  "QFAI-COV-201": "Every AC must be referenced by at least one TC (`AC-Refs`).",
  "QFAI-COV-202": "Every BR must be referenced by at least one EX (`BR-Ref`).",
  "QFAI-COV-203": "Every EX must be referenced by at least one TC (`EX-Ref`).",
  "QFAI-COV-204":
    "Every BR row must include at least one AC reference in `AC-Refs`.",
  "QFAI-COV-205":
    "Every EX row must include at least one BR reference in `BR-Ref`.",
  "QFAI-COV-206":
    "Every TC row must include at least one reference in `AC-Refs` or `EX-Ref`.",
  "QFAI-COV-207":
    "EX rows that reference multiple BR IDs should be reviewed as density-smell signals.",
  "QFAI-ATDD-101":
    "US annotations in test code must reference existing IDs in specs (`QFAI:SPEC-XXXX:US-YYYY`).",
  "QFAI-ATDD-102":
    "TC annotations in test code must reference existing IDs in specs (`QFAI:SPEC-XXXX:TC-YYYY`).",
  "QFAI-ATDD-103":
    "CON-API annotations in test code must reference declared API contracts (`QFAI:CON-API-XXXX`).",
  "QFAI-ATDD-111":
    "Every US must be referenced at least once from tests/e2e/**.",
  "QFAI-ATDD-112":
    "Every TC must be referenced at least once from tests/integration/**.",
  "QFAI-ATDD-113":
    "Every declared CON-API must be referenced at least once from tests/api/**.",
  "QFAI-ATDD-121":
    "tests/api/** must not include TC annotations (`QFAI:SPEC-XXXX:TC-YYYY`).",
  "QFAI-ATDD-122":
    "tests/e2e/** must not include TC annotations (`QFAI:SPEC-XXXX:TC-YYYY`).",
  "QFAI-ATDD-901":
    "ATDD traceability report output failures are warning-only, but report generation should be repaired.",
  "QFAI-HYG-001":
    "Legacy directory aliases are warned and should be migrated to canonical names.",
  "QFAI-HYG-002":
    "Template/sample artifacts should not remain under `.qfai/specs/**`.",
  "QFAI-REVIEW-001": "`.qfai/review/.gitignore` exists.",
  "QFAI-REVIEW-002":
    "At least one review pack directory exists under `.qfai/review/review-<timestamp>/`.",
  "QFAI-REVIEW-003": "Each review pack contains `review_request.md`.",
  "QFAI-REVIEW-004": "Each review pack contains `summary.json`.",
  "QFAI-REVIEW-005":
    "Each review pack contains one or more reviewer files (`Rxx_*.md`).",
  "QFAI-REVIEW-006": "Each review summary JSON is parseable.",
  "QFAI-REVIEW-007":
    "Each review summary satisfies the v1.4.36 minimum schema.",
  "QFAI-PROT-101":
    "Both prototyping evidence files exist and prototyping.json follows the required schema.",
  "QFAI-PROT-111":
    "Coverage Matrix rows in prototyping evidence include every `.qfai/specs/spec-*` entry.",
  "QFAI-PROT-112":
    "Per-spec UI checks satisfy declared route counts and leave no unresolved UI routes.",
  "QFAI-PROT-113":
    "Per-spec API checks satisfy declared endpoint counts and runtime gate contains no 404 statuses.",
  "QFAI-PROT-114":
    "Per-spec DB checks satisfy declared object counts and leave no unresolved DB objects.",
  "QFAI-PROT-231":
    "Interactive prototyping evidence includes uiFidelity with required screen-level fields.",
  "QFAI-PROT-232":
    "uiFidelity screen observations satisfy referenced UI contract elements/actions coverage.",
  "QFAI-PROT-233":
    "Interactive uiFidelity records at least one mockPaths status=pass entry (warning in v1.4.36).",
  "QFAI-CONTRACT-030":
    "Contract index references must match declared contract IDs in .qfai/contracts/**.",
};

function resolveIssueTarget(issue: Issue): string {
  if (issue.file && issue.refs && issue.refs.length > 0) {
    return `${issue.file} [${issue.refs.join(", ")}]`;
  }
  if (issue.file) {
    return issue.file;
  }
  if (issue.refs && issue.refs.length > 0) {
    return issue.refs.join(", ");
  }
  return "(project)";
}

function resolveIssueExpected(issue: Issue): string {
  return ISSUE_EXPECTED_BY_CODE[issue.code] ?? issue.rule ?? "Rule compliance";
}

function resolveIssueFix(issue: Issue): string {
  return (
    issue.suggested_action ?? "Follow the expected rule and rerun validate."
  );
}

function emitTextField(label: string, value: string): void {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  if (lines.length === 0) {
    process.stdout.write(`  ${label}: \n`);
    return;
  }
  const [first, ...rest] = lines;
  process.stdout.write(`  ${label}: ${first ?? ""}\n`);
  for (const line of rest) {
    process.stdout.write(`  ${" ".repeat(label.length)}  ${line}\n`);
  }
}

function escapeGitHubCommandValue(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

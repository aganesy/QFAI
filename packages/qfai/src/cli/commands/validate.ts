import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FailOn, OutputFormat } from "../../core/config.js";
import { loadConfig } from "../../core/config.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { buildCiProfileIssue, createProfileGuardResult } from "../../core/phasePolicy.js";
import { toRelativePath } from "../../core/paths.js";
import type { Issue, ValidationProfile, ValidationResult } from "../../core/types.js";
import { writeValidateRunLog } from "../../core/runLog.js";
import { validateProject } from "../../core/validate.js";
import { shouldFail } from "../lib/failOn.js";
import { warnIfTruncated } from "../lib/warnings.js";

export type ValidateOptions = {
  root: string;
  strict: boolean;
  failOn?: FailOn;
  format?: OutputFormat;
  profile?: ValidationProfile;
  platform?: string;
};

export async function runValidate(options: ValidateOptions): Promise<number> {
  const startedAt = new Date();
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  const blockedIssue = buildCiProfileIssue(options.profile);
  const blockedByProfileGuard = blockedIssue !== null;
  const result = blockedIssue
    ? await createProfileGuardResult(options.profile ?? "full", blockedIssue)
    : await validateProject(root, configResult, {
        ...(options.profile ? { profile: options.profile } : {}),
        ...(options.platform ? { platform: options.platform } : {}),
      });
  const normalized = normalizeValidationResult(root, result);
  warnIfTruncated(normalized.traceability.testFiles, "validate");

  const failOn = resolveFailOn(options, configResult.config.validation.failOn);
  const willFail = blockedByProfileGuard || shouldFail(normalized, failOn);

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
    const jsonPath = resolveJsonPath(root, configResult.config.output.validateJsonPath);
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
    const refs = item.refs && item.refs.length > 0 ? ` refs=${item.refs.join(",")}` : "";
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
  const message = escapeGitHubCommandValue(`${issue.code}: ${issue.message}${suffix}`);
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
  return [issue.code, issue.severity, issue.message, file, line, column, suppressed].join("|");
}

async function emitJson(result: ValidationResult, root: string, jsonPath: string): Promise<void> {
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
  E_LEDGER_EMPTY_CELL: "Required Ledger cells and multi-value columns are populated.",
  E_ID_INVALID_FORMAT: "All IDs follow the required format for each ID kind.",
  E_REF_NOT_FOUND: "Every referenced ID exists in the corresponding source file.",
  E_AC_NOT_VERIFIED: "Every AC is connected to EX and TC in the Ledger.",
  E_TC_ORPHAN: "Every TC is linked in Ledger and traceable up to objective intent.",
  E_UPWARD_REF_FORBIDDEN: "Upper-to-lower direct references are forbidden outside Ledger.",
  E_OQ_OPEN_RELEASE_BLOCK: "release_candidate requires zero open items in 15_Open-questions.md.",
  E_OQ_STATUS_UNPARSEABLE: "Each OQ entry has a valid status (open|resolved|deferred).",
  E_DELTA_MISSING_REQUIRED:
    "18_delta.md includes all required sections and Rejected has DO NOT/Temptation.",
  "QFAI-COV-201": "Every AC must be referenced by at least one TC (`AC-Refs`).",
  "QFAI-COV-202": "Every BR must be referenced by at least one EX (`BR-Ref`).",
  "QFAI-COV-203": "Every EX must be referenced by at least one TC (`EX-Ref`).",
  "QFAI-COV-204": "Every BR row must include at least one AC reference in `AC-Refs`.",
  "QFAI-COV-205": "Every EX row must include at least one BR reference in `BR-Ref`.",
  "QFAI-COV-206": "Every TC row must include at least one reference in `AC-Refs` or `EX-Ref`.",
  "QFAI-COV-207":
    "EX rows that reference multiple BR IDs should be reviewed as density-smell signals.",
  "QFAI-ATDD-101":
    "US annotations in test code must reference existing IDs in specs (`QFAI:SPEC-XXXX:US-YYYY`).",
  "QFAI-ATDD-102":
    "TC annotations in test code must reference existing IDs in specs (`QFAI:SPEC-XXXX:TC-YYYY`).",
  "QFAI-ATDD-103":
    "CON-API annotations in test code must reference declared API contracts (`QFAI:CON-API-XXXX`).",
  "QFAI-ATDD-111": "Every US must be referenced at least once from tests/e2e/**.",
  "QFAI-ATDD-112": "Every TC must be referenced at least once from tests/integration/**.",
  "QFAI-ATDD-113": "Every declared CON-API must be referenced at least once from tests/api/**.",
  "QFAI-ATDD-121": "tests/api/** must not include TC annotations (`QFAI:SPEC-XXXX:TC-YYYY`).",
  "QFAI-ATDD-122": "tests/e2e/** must not include TC annotations (`QFAI:SPEC-XXXX:TC-YYYY`).",
  "QFAI-ATDD-901":
    "ATDD traceability report output failures are warning-only, but report generation should be repaired.",
  "QFAI-DPACK-001":
    "A latest discussion-pack directory exists under `.qfai/discussion/discussion-<timestamp>/`.",
  "QFAI-DPACK-002":
    "The latest discussion-pack contains the required markdown files; no prototyping sidecar artifact is required.",
  "QFAI-DPACK-003": "The latest discussion-pack files contain minimum substantive content.",
  "QFAI-DPACK-004":
    "No open OQ remains in `11_OQ-Register.md` (`Disposition: open` blocks discussion completion).",
  "QFAI-DPACK-005":
    "Discussion pack naming must use `discussion-YYYYMMDDhhmmssSSS` for canonical outputs.",
  "QFAI-DPACK-006": "Legacy discussion serial packs should be migrated or removed.",
  "QFAI-DPACK-007":
    "Every deferred OQ in `11_OQ-Register.md` must have a corresponding row in `13_Deferred.md`.",
  "QFAI-DPACK-008": "`03_Story-Workshop.md` must include at least one Mermaid block.",
  "QFAI-DPACK-009":
    "`03_Story-Workshop.md` Mermaid content should include `flowchart` or `sequenceDiagram`.",
  "QFAI-DPACK-010":
    "Legacy discussion naming is deprecated; canonical naming should be used for new outputs.",
  "QFAI-HYG-001": "Legacy directory aliases are forbidden and must be migrated to canonical names.",
  "QFAI-HYG-002": "Template/sample artifacts should not remain under `.qfai/specs/**`.",
  "QFAI-REVIEW-001":
    "Root `.gitignore` contains QFAI managed entries or legacy `.qfai/review/.gitignore` exists.",
  "QFAI-REVIEW-002":
    "At least one review pack directory exists under `.qfai/review/review-<timestamp>/`.",
  "QFAI-REVIEW-003": "Each review pack contains `review_request.md`.",
  "QFAI-REVIEW-004": "Each review pack contains `summary.json`.",
  "QFAI-REVIEW-005": "Each review pack contains one or more reviewer files (`Rxx_*.md`).",
  "QFAI-REVIEW-006": "Each review summary JSON is parseable.",
  "QFAI-REVIEW-007": "Each review summary satisfies the minimum schema.",
  "QFAI-VIS-001": "`02_Inception-Deck.md` should include at least one Mermaid diagram.",
  "QFAI-VIS-002":
    "HTML+CSS visual mock is an optional fallback aid and should only be referenced when intentionally selected. Sidecar artifacts (uiux/) are the primary UI definition.",
  "QFAI-PROT-101":
    "Both prototyping evidence files exist and prototyping.json follows the required schema.",
  "QFAI-PROT-150": "prototyping.json exists at the canonical evidence path for UI prototyping.",
  "QFAI-PROT-151": "surface must be one of web|mobile|desktop|mixed.",
  "QFAI-PROT-152":
    "mode.requested/mode.effective/mode.source/mode.rationale must follow the current prototyping evidence schema.",
  "QFAI-PROT-171": "surface field must be one of: web, mobile, desktop, mixed.",
  "QFAI-PROT-172":
    "surface/mode obligation matrix mismatch — required evidence bundles are missing.",
  "QFAI-PROT-173": "required render evidence bundle is missing.",
  "QFAI-PROT-174": "required browser QA bundle is missing.",
  "QFAI-PROT-175":
    "non-UI prototyping surface but UI-only evidence present (runtimeGate.ui, uiFidelity, render, browserQa).",
  "QFAI-PROT-176": "ui-bearing full-harness mode requires uiFidelity.",
  "QFAI-PROT-177": "ui-bearing full-harness mode requires runtimeGate.",
  "QFAI-PROT-111":
    "Coverage Matrix rows in prototyping evidence include every `.qfai/specs/spec-*` entry.",
  "QFAI-PROT-112":
    "Per-spec UI checks satisfy declared route counts and leave no unresolved UI routes.",
  "QFAI-PROT-153":
    "iteration reviewer scores are malformed; every evaluation reviewer must score every axis with 0..100 and evidence refs.",
  "QFAI-PROT-154": "iteration count exceeds the configured maximum for the effective mode.",
  "QFAI-PROT-155":
    "iteration stopReason is invalid; must be threshold-reached|max-iterations|manual-stop.",
  "QFAI-PROT-156": "allReviewerAxesPerfect100 must be true when stopReason is threshold-reached.",
  "QFAI-PROT-234": "unused legacy prototyping recommendation fields are not supported.",
  "QFAI-PROT-235":
    "legacy discussion recommendation fields are not supported in prototyping evidence.",
  "QFAI-PROT-236": "explicit requested mode is invalid.",
  "QFAI-PROT-237":
    "interactive uiFidelity requires observed mockPaths issue ledger entries (fail|finding).",
  "QFAI-PROT-238":
    "uiFidelity does not satisfy UI contract coverage (screens empty or contract mismatch).",
  "QFAI-PROT-241":
    "uiFidelity screens must have no missing labels when expected.labels is present.",
  "QFAI-PROT-242":
    "uiFidelity screens must have no missing markers when expected.elements > 0 and markers are tracked.",
  "QFAI-PROT-243":
    "Placeholder/single-text pages are detected when expected elements > 2, observed <= 1, and found.labels <= 1.",
  "QFAI-PROT-244": "captured render artifacts must be path-only and referenced files must exist.",
  "QFAI-PROT-245":
    "render coverage is incomplete for required default viewports or all renders are skipped.",
  "QFAI-PROT-251":
    "render evidence path field contains inline payload (data URI, base64, inline HTML, or oversized content). Path-only required.",
  "QFAI-PROT-252":
    "render evidence status requires accompanying field (skippedReason for skipped, error for failed, imagePath/htmlPath for captured).",
  "QFAI-PROT-253":
    "render evidence top-level status contradicts screen-level statuses (e.g. status=captured but no captured screens).",
  "QFAI-PROT-254": "render bundle contradicts non-UI prototyping surface / mode expectation.",
  "QFAI-PROT-255": "captured render evidence screen references a file that does not exist on disk.",
  "QFAI-PROT-256": "skipped/failed render evidence screen is missing required reason/error field.",
  "QFAI-PROT-262":
    "browser QA completed status without usable evidence (no summary and no findings).",
  "QFAI-PROT-263":
    "browser QA bundle exists but executed=false for full-harness ui-bearing project.",
  "QFAI-PROT-264": "fullHarness reviewer signoff is incomplete (missing reviewer or timestamp).",
  "QFAI-PROT-265": "full-harness calibration pack could not be resolved from packPath.",
  "QFAI-PROT-266": "full-harness evidence exists but iteration reviewer scores are empty.",
  "QFAI-PROT-273": "browser QA bundle schema is invalid (missing or malformed browserQa block).",
  "QFAI-PROT-274":
    "browser QA executed/status contradiction (e.g. executed=true but status!=completed).",
  "QFAI-PROT-275": "browser QA summary is malformed (non-object or invalid bucket counts).",
  "QFAI-PROT-276": "browser QA findings are malformed (non-array or invalid finding structure).",
  "QFAI-PROT-270": "uiFidelity is required for full-harness UI prototyping but is absent.",
  "QFAI-PROT-271": "uiFidelity.mode='skeleton' is not allowed in full-harness UI prototyping.",
  "QFAI-PROT-272":
    "uiFidelity screen is missing required fields (uiContractId, route, expected, observed).",
  "QFAI-PROT-281": "mode.effective is full-harness but fullHarness block is missing.",
  "QFAI-PROT-282":
    "fullHarness.terminationReason is invalid; must be converged|max-iterations|plateau|manual-stop.",
  "QFAI-PROT-283": "fullHarness.scoringTrace must contain at least one entry.",
  "QFAI-PROT-284": "emoji characters (U+1F000–U+1FAFF) are forbidden in full-harness output.",
  "QFAI-PROT-285": "prototyping phase state machine is invalid for completion.",
  "QFAI-PROT-286": "post-selection polish iteration evidence is missing for completion.",
  "QFAI-PROT-287": "completion requires every reviewer axis score to be 100.",
  "QFAI-PROT-288": "legacy 95-point completion marker is not a valid completion border.",
  "QFAI-PROT-289": "completionCertificate is required when completion is claimed.",
  "QFAI-PROT-290":
    "fullHarness.iterationCount is 1 with converged; single-iteration convergence is suspicious.",
  "QFAI-PROT-291": "fullHarness.scoringTrace entry count does not match iterationCount.",
  "QFAI-PROT-292":
    "terminationReason is max-iterations but iterationCount is below configured maxIterations.",
  "QFAI-PROT-293": "fullHarness.iterationCount exceeds configured maxIterations.",
  "QFAI-PROT-294": "fullHarness.scoringTrace shows no improvement across iterations.",
  "QFAI-PROT-295": "fullHarness reviewer is a placeholder value.",
  "QFAI-PROT-296":
    "fullHarness legacy weighted score fields are deprecated and should not be used for completion decisions.",
  "QFAI-PROT-297": "fullHarness iteration commitSha is required.",
  "QFAI-PROT-298": "fullHarness.limitations is required.",
  "QFAI-PROT-299": "fullHarness.status is completed but terminationReason is missing.",
  "QFAI-PROT-300": "terminationReason is plateau but iterationCount is less than plateauLookback.",
  "QFAI-PROT-301": "fullHarness.calibrationRef is missing or has empty configPath/packPath.",
  "QFAI-PROT-302": "All fullHarness iterations have the same commitSha.",
  "QFAI-PROT-303": "fullHarness reviewerLog summary is too short.",
  "QFAI-PROT-304": "fullHarness reviewerLogs count does not match iterationCount.",
  "QFAI-PROT-305":
    "fullHarness specCoverage is zero-seeded (all declared/checked counts are zero).",
  "QFAI-PROT-306":
    "fullHarness uiFidelity mockPaths must be fail|finding only and must not contain synthetic pass entries.",
  "QFAI-PROT-308": "fullHarness status is converged but iterationCount < 2.",
  "QFAI-PROT-309": "fullHarness iteration reviewer is a placeholder value.",
  "QFAI-PROT-310":
    "executionPlan in prototyping.json must be present and well-formed in full-harness mode: the block itself must be an object, and each of targetIterations (number), evaluationAxesSource (non-empty string), delegationMap (object), plannedAt (non-empty string) must be present with the correct shape.",
  "QFAI-PROT-311":
    "delegationMap entry assigns a category to a role outside the SKILL.md Delegation Scope Table.",
  "QFAI-PROT-316": "reviewerSignoff.status does not match fullHarness.finalDecision.",
  "QFAI-PROT-317": "final reviewerLogs verdict does not match fullHarness termination semantics.",
  "QFAI-PROT-318":
    "runtimeGate/specCoverage evidenceRefs contain a non-concrete artifact reference.",
  "QFAI-PROT-319": "fullHarness.calibrationRef.packPath does not match the resolved pack path.",
  "QFAI-PROT-320":
    "fullHarness.calibrationRef.packVersion does not match the resolved calibration pack version.",
  "QFAI-PROT-321":
    "fullHarness.calibrationRef.configPath does not match the active qfai.config.yaml path.",
  "QFAI-PROT-322": "fullHarness.status is in-progress but finalDecision is not pending.",
  "QFAI-PROT-323": "fullHarness.status is in-progress but reviewerSignoff.status is not pending.",
  "QFAI-PROT-324": "fullHarness.status is in-progress but terminationReason is still present.",
  "QFAI-PROT-325": "fullHarness.status is completed but reviewerSignoff.status is still pending.",
  "QFAI-PROT-326": "runtimeGate.ui[].declaredRef must use the canonical screen contract sourceRef.",
  "QFAI-PROT-327":
    "fullHarness.iterations[].evidenceRefs.screenContract must use canonical screen contract refs.",
  "QFAI-PROT-328":
    "specs[].coverageRefs[].declaredRef must point to a spec declaration under .qfai/specs/.",
  "QFAI-PROT-329": "fullHarness.status is completed but reviewerSignoff.timestamp is missing.",
  "QFAI-PROT-330":
    "uiFidelity screen actionsWired exceeds actionsDeclared (expected.actions). actionsWired must not exceed the number of declared actions.",
  "QFAI-PROT-331":
    "fullHarness.scoringTrace[<n>].screenshotDir is missing or empty; full-harness requires screenshot evidence per iteration.",
  "QFAI-PROT-332":
    "Lighthouse gate is required for full-harness + web surface but no lighthouse report is present in prototyping.json.",
  "QFAI-PROT-333":
    "fullHarness.iterations: minimum 2 iterations required before convergence; iteration 1 cannot be marked converged.",
  "QFAI-PROT-334":
    "scoringTrace.designSystemCompliance is below the 0.75 threshold while 12_design_system.md is present in the calibration pack; immediate fix required for next iteration.",
  "QFAI-PROT-335":
    ".qfai/evidence/prototyping/completion-certificate.json is required when prototyping completion is claimed (run `qfai prototyping certify` after all gates pass).",
  "QFAI-PROT-336":
    ".qfai/evidence/prototyping/completion-certificate.json digest mismatch — evidence has been modified since certify; re-run `qfai prototyping certify`.",
  "QFAI-PROT-277":
    "prototyping.json rounds[].commitSha / polishCycles[].commitSha must contain a 40-character git commit SHA.",
  "QFAI-PROT-278":
    "prototyping.json must use a distinct commitSha for each prototyping round and polish cycle.",
  "QFAI-CFG-LINK-001":
    "qfai.config.yaml: prototyping.primarySpecId points to a spec ID that does not exist under the configured specs directory.",
  "QFAI-CFG-LINK-002":
    "qfai.config.yaml: paths.* points to a directory that does not exist on disk.",
  "QFAI-CFG-LINK-003":
    "qfai.config.yaml: prototyping.calibration.packPath points to a directory that does not exist on disk.",
  "QFAI-PROT-REF-001":
    "An xxxRef string in prototyping.json / review-bundle.json / breakthrough.json points to a file that does not exist on disk.",
  "QFAI-PROT-LINK-001":
    "prototyping.json.specs[].specId references a spec that does not exist under .qfai/specs/.",
  "QFAI-PROT-LINK-002":
    "review-bundle.json.spec references a spec that does not exist under .qfai/specs/.",
  "QFAI-PROT-LINK-003":
    "prototyping.json.rounds[].candidates[].candidateId has no corresponding artifact directory under .qfai/evidence/prototyping/rounds/<rN>/candidates/.",
  "QFAI-PROT-LINK-004":
    "prototyping.json.polishCycles[].cycle has no corresponding iteration directory under .qfai/evidence/prototyping/iterations/.",
  "QFAI-PROT-AXIS-FLOOR-001":
    "Each candidate's evaluator-review perAxis[].score must meet evaluation-rubric.yaml hard_floors[].min_score in absorption rounds (r3|r2|r1). r5 is exempt.",
  "QFAI-PROT-CONCEPT-001":
    "Every active prototyping candidate must have a complete concept.json with differentiated design thesis and template-risk constraints.",
  "QFAI-UIE-001":
    "Every declared screen declared in `.qfai/contracts/ui/*.yaml` has a screenshot evidence file at `.qfai/evidence/prototyping/screenshots/<screen-id>.png`.",
  "QFAI-UIE-002":
    "Every declared screen declared in `.qfai/contracts/ui/*.yaml` has an HTML snapshot evidence file at `.qfai/evidence/prototyping/html/<screen-id>.html`.",
  "QFAI-UIE-003":
    "Every declared screen id used for prototyping evidence filenames must be path-safe (`[A-Za-z0-9._-]+`).",
  "QFAI-DCON-001":
    "UI-bearing execution requires the canonical design contracts for the current phase when UI contracts exist.",
  "QFAI-DCON-002":
    "exploration-brief.yaml must define meaningful content for product_intent, target_users, must_preserve_interactions, brand_signals, and differentiation_targets.",
  "QFAI-DCON-003":
    "evaluation-rubric.yaml must define axes, hard_floors, and weighted_axes arrays.",
  "QFAI-DCON-004":
    "selected-direction.yaml must define chosen_direction_id, carry_forward_rules, and winning_rationale.",
  "QFAI-DCON-005":
    "design-system.yaml must define checklist entries for color, typography, spacing, border_radius, shadow, dos_and_donts, and motion_rules, plus component guidance via checklist.component_tone or richer component guidance blocks.",
  "QFAI-DCON-006": "exploration-brief.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-007": "evaluation-rubric.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-008": "selected-direction.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-009": "design-system.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-010":
    "evaluator-calibration.yaml must define meaningful content for good_critique_examples, too_lenient_examples, blandness_fail_examples, and originality_fail_examples.",
  "QFAI-DCON-011": "evaluator-calibration.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-012": "prototype-handoff.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-013":
    "prototype-handoff.yaml must contain source prototypes, surface profiles, screens, visual DNA, and implementation handoff guidance.",
  "QFAI-DCON-014": "reference-pool.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-015":
    "reference-pool.yaml must define complete reference records with kind, source, adopted/rejected points, local translation, copy risk, and template usage policy.",
  "QFAI-DCON-016": "brand-design.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-017":
    "brand-design.yaml must define brand personality, audience emotion, category conventions, differentiation strategy, visual language, content tone, and do-not-look-like rules.",
  "QFAI-DCON-018": "Legacy design contracts are forbidden.",
  "QFAI-DCON-019":
    "selected-direction.yaml, design-system.yaml, and prototype-handoff.yaml are produced by prototyping, not SDD.",
  "QFAI-DCON-020": "absorption-policy.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-021":
    "absorption-policy.yaml must define absorption and curation policy fields.",
  "QFAI-BREAK-001": "breakthrough.json is required for exploration-first UI prototyping evidence.",
  "QFAI-BREAK-002": "breakthrough.json must be a valid JSON object.",
  "QFAI-BREAK-003": "breakthrough.json.latestIteration must be a positive integer.",
  "QFAI-BREAK-004": "breakthrough.json.triggerResult must be a boolean.",
  "QFAI-BREAK-005": "breakthrough.json.triggerReasons must be an array of strings.",
  "QFAI-BREAK-006": "breakthrough.json.avgScoreDeltas must be an array of numbers.",
  "QFAI-BREAK-007": "breakthrough.json.diffLines must be a non-negative number.",
  "QFAI-BREAK-008":
    "triggerResult=true requires breakthrough.json.branchCount to be a positive integer.",
  "QFAI-BREAK-009": "triggerResult=true requires non-empty breakthrough.json.branchRefs evidence.",
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
  return issue.suggested_action ?? "Follow the expected rule and rerun validate.";
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

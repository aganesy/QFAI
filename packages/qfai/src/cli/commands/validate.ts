import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FailOn, OutputFormat } from "../../core/config.js";
import { loadConfig } from "../../core/config.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { buildCiProfileIssue, createProfileGuardResult } from "../../core/phasePolicy.js";
import { toRelativePath } from "../../core/paths.js";
import type { Issue, ValidationProfile, ValidationResult } from "../../core/types.js";
import { writeValidateRunLog } from "../../core/runLog.js";
import { validateProject } from "../../core/validate.js";
import { resolveToolVersion } from "../../core/version.js";
import { shouldFail } from "../lib/failOn.js";
import { warnIfTruncated } from "../lib/warnings.js";

export type ValidateOptions = {
  root: string;
  strict: boolean;
  failOn?: FailOn;
  format?: OutputFormat;
  profile?: ValidationProfile;
  platform?: string;
  /**
   * Override the tool version observed by the legacy-path deprecation
   * gate. Tests use this to simulate the post-sunset world (>= 1.10.0)
   * without mocking the resolver. Operational callers leave this
   * undefined; production reads `packages/qfai/package.json#version`.
   */
  toolVersionOverride?: string;
};

/**
 * Sunset version for the legacy `.qfai/output/validate.json` write
 * path. Until the running tool reaches this version the legacy path
 * keeps being written and a `D-DEPRECATED-PATH` warning fires; at and
 * past the sunset, the legacy path is no longer written and the
 * finding escalates to severity `error`.
 *
 * The literal sunset version is the only npm-version marker permitted
 * by `.agents/rules/distributed-surface.md` exception (npm version is
 * canonical), because it tracks the next minor of the pinned branch.
 */
const LEGACY_VALIDATE_JSON_SUNSET = "1.10.0";
const LEGACY_VALIDATE_JSON_REL = ".qfai/output/validate.json";

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a configured path for comparison against the legacy
 * literal. Lowercased, posix-slashed, leading `./` stripped, repeated
 * slashes collapsed. Comparison is case-insensitive only on the textual
 * normalization step (no filesystem casing inspection) so the rule
 * fires identically on Windows + macOS + Linux configs.
 */
function normalizeForLegacyMatch(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\.\//, "").toLowerCase();
}

/**
 * True when the configured validate JSON path is the legacy
 * `.qfai/output/validate.json` SSOT (post-PR-#207 the canonical path
 * moved to `.qfai/report/validate.json`). Absolute paths are never
 * treated as legacy — the legacy SSOT is the relative repo-rooted
 * literal only; operators who deliberately point at an absolute path
 * have explicitly opted out of the canonical SSOT.
 */
function configTargetsLegacyValidateJsonPath(configuredPath: string): boolean {
  if (path.isAbsolute(configuredPath)) return false;
  return normalizeForLegacyMatch(configuredPath) === LEGACY_VALIDATE_JSON_REL;
}

export async function runValidate(options: ValidateOptions): Promise<number> {
  const startedAt = new Date();
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  const blockedIssue = buildCiProfileIssue(options.profile);
  const blockedByProfileGuard = blockedIssue !== null;
  const rawResult = blockedIssue
    ? await createProfileGuardResult(options.profile ?? "full", blockedIssue)
    : await validateProject(root, configResult, {
        ...(options.profile ? { profile: options.profile } : {}),
        ...(options.platform ? { platform: options.platform } : {}),
      });
  // Resolve effective tool version for the legacy-path sunset gate.
  // Test callers override; production reads the same package.json#version
  // the rest of the toolchain uses (so the source-of-truth is single).
  const effectiveToolVersion = options.toolVersionOverride ?? (await resolveToolVersion());
  const legacySeverity = legacyValidateJsonSeverity(effectiveToolVersion);
  const legacyWriteEnabled = legacySeverity === "warning";
  // Detect whether the operator's project config still aims the writer
  // at the legacy SSOT. This is a stronger signal than "the legacy file
  // exists on disk" — even a clean filesystem will trigger the gate if
  // the config points there, because the writer is about to recreate
  // the stale path on this very run.
  const configuredValidateJsonPath = configResult.config.output.validateJsonPath;
  const configTargetsLegacyPath = configTargetsLegacyValidateJsonPath(configuredValidateJsonPath);
  // Post-sunset, only emit the deprecation finding when there is
  // observable evidence (config or on-disk file) that a consumer still
  // depends on the legacy path. Otherwise every clean validate run on
  // tool >= sunset would carry an unactionable error finding for a path
  // the user never used. Pre-sunset the finding is always emitted as a
  // warning because the tool itself is still writing the path.
  const legacyOnDisk = !legacyWriteEnabled
    ? await pathExists(path.join(root, LEGACY_VALIDATE_JSON_REL))
    : false;
  const emitDeprecationIssue = legacyWriteEnabled || legacyOnDisk || configTargetsLegacyPath;
  // Post-sunset, refuse to write to the configured legacy path. This is
  // the migration gate: the legacy SSOT is dead, the config must be
  // updated. Pre-sunset writes proceed normally (writer-side warning).
  const refuseConfiguredLegacyWrite = configTargetsLegacyPath && !legacyWriteEnabled;
  const deprecationIssue: Issue | null = emitDeprecationIssue
    ? buildDeprecationIssue({
        severity: legacySeverity,
        legacyWriteEnabled,
        configTargetsLegacyPath,
        refuseConfiguredLegacyWrite,
      })
    : null;
  const result: ValidationResult = deprecationIssue
    ? {
        ...rawResult,
        issues: [...rawResult.issues, deprecationIssue],
        counts: recountIssues(rawResult.counts, deprecationIssue),
      }
    : rawResult;
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
  // Always-latest report + profile-suffixed report.
  // Post-sunset, refuse to write to the configured legacy path: the
  // migration gate must direct the operator to update their config
  // instead of silently producing a stale-named file. The accompanying
  // deprecation issue (severity=error) already carries the actionable
  // text; here we just skip the physical write.
  if (!refuseConfiguredLegacyWrite) {
    await emitJson(normalized, root, configuredValidateJsonPath);
    const profileLabel = normalized.profile ?? options.profile ?? "full";
    const profileSuffixedRel = profileSuffixedReportPath(configuredValidateJsonPath, profileLabel);
    await emitJson(normalized, root, profileSuffixedRel);
  }
  // Legacy path — written only during the deprecation window AND only
  // if the configured path is NOT already the legacy path (avoid
  // double-write to the same file when the operator's config still
  // points there pre-sunset).
  if (legacyWriteEnabled && !configTargetsLegacyPath) {
    await emitJson(normalized, root, LEGACY_VALIDATE_JSON_REL);
  }

  return willFail ? 1 : 0;
}

/**
 * Compute the `.qfai/report/validate-<profile>.json` path that mirrors
 * the configured always-latest path. Splits at the basename so a custom
 * `validateJsonPath` of `.qfai/output/foo.json` still produces
 * `.qfai/output/foo-<profile>.json` — keeps backward compatibility with
 * non-default configurations.
 *
 * Exported so the certify-side `--upgrade-scope full` reader can derive
 * the same canonical signal path from the loaded config rather than
 * hardcoding a literal — otherwise an operator override of
 * `output.validateJsonPath` in `qfai.config.yaml` redirects the writer
 * but not the reader, and `--upgrade-scope full` refuses to upgrade
 * even when the saas-package gates are actually passing under the
 * custom location.
 */
export function profileSuffixedReportPath(configured: string, profile: string): string {
  const dir = path.posix.dirname(configured.replace(/\\/g, "/"));
  const base = path.posix.basename(configured.replace(/\\/g, "/"));
  const ext = path.posix.extname(base);
  const stem = ext.length > 0 ? base.slice(0, -ext.length) : base;
  return path.posix.join(dir, `${stem}-${profile}${ext}`);
}

/**
 * Severity of the `D-DEPRECATED-PATH` finding for the legacy validate
 * output path. Warning while the deprecation window is open; error
 * once the running tool reaches the announced sunset.
 *
 * Exported for unit testing of the prerelease-aware comparison rule.
 * Production callers go through `runValidate`.
 */
export function legacyValidateJsonSeverity(currentVersion: string): "warning" | "error" {
  return isAtOrPastSunset(currentVersion, LEGACY_VALIDATE_JSON_SUNSET) ? "error" : "warning";
}

type FullSemver = {
  major: number;
  minor: number;
  patch: number;
  /**
   * Raw prerelease tag (everything after the first `-`, before any
   * `+build` metadata). `undefined` denotes a clean GA release.
   * Per the semver spec, a clean release sorts AFTER any prerelease
   * sharing the same `major.minor.patch`.
   */
  prerelease: string | undefined;
};

/**
 * Strict full-semver parser: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`.
 * Returns `null` for inputs that do not match — callers treat that as
 * "be conservative" (i.e. pre-sunset / warning mode).
 *
 * Scope note: this is a **presence-only check**, not a full §9 / §11
 * validator. The prerelease group `([0-9A-Za-z.-]+)` does NOT enforce
 * SemVer §9 ("numeric identifiers MUST NOT include leading zeros"),
 * so inputs like `1.10.0-01` parse with `prerelease="01"`. That is
 * intentional: the legacy-path sunset gate only reads `prerelease ===
 * undefined` to distinguish GA vs prerelease, never the prerelease
 * contents themselves. If this helper grows into a general SemVer
 * comparator (e.g. via the prerelease ordering follow-up below), the
 * regex must be tightened to reject leading-zero numeric identifiers.
 *
 * Build metadata (`+...`) is dropped per semver §10 (ignored for
 * precedence). Prerelease tag is retained but only its presence is
 * needed for the at-or-past-sunset decision below.
 */
function parseFullSemver(value: string): FullSemver | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  if (!m) return null;
  const majorRaw = m[1];
  const minorRaw = m[2];
  const patchRaw = m[3];
  if (majorRaw === undefined || minorRaw === undefined || patchRaw === undefined) return null;
  return {
    major: Number(majorRaw),
    minor: Number(minorRaw),
    patch: Number(patchRaw),
    prerelease: m[4],
  };
}

/**
 * Returns `true` iff `currentVersion` is at or past the sunset.
 *
 * GA-only sunset assumption: this comparator presumes the sunset
 * literal is a clean GA release (no prerelease tag). When the sunset
 * is `1.10.0`, a current prerelease at the same triple
 * (`1.10.0-beta.1`) sorts BEFORE the GA (semver §11) and is therefore
 * pre-sunset. We deliberately do NOT call `comparePrerelease(cur, sun)`
 * here because `sun.prerelease` is always `undefined` in production
 * (the SSOT is the clean `LEGACY_VALIDATE_JSON_SUNSET` literal). If a
 * future migration ever pins sunset to a prerelease tag itself, this
 * helper needs an additional prerelease-vs-prerelease comparator step.
 *
 * Conservative default: if either version fails to parse, we treat
 * the current version as pre-sunset (warning mode) — the legacy file
 * keeps being written and operators are not surprised by an
 * unparseable-version-induced escalation.
 */
function isAtOrPastSunset(currentVersion: string, sunsetVersion: string): boolean {
  const cur = parseFullSemver(currentVersion);
  const sun = parseFullSemver(sunsetVersion);
  if (cur === null || sun === null) return false;
  if (cur.major !== sun.major) return cur.major > sun.major;
  if (cur.minor !== sun.minor) return cur.minor > sun.minor;
  if (cur.patch !== sun.patch) return cur.patch > sun.patch;
  // major.minor.patch tied: a clean GA (no prerelease) is at-sunset;
  // any prerelease at the same triple is still pre-sunset.
  return cur.prerelease === undefined;
}

/**
 * Build the `D-DEPRECATED-PATH` finding for the legacy validate output
 * SSOT. The message depends on three orthogonal signals:
 *
 *   - `legacyWriteEnabled` — the tool is still in the deprecation
 *     window (pre-sunset). Severity is `warning`.
 *   - `configTargetsLegacyPath` — the operator's project config still
 *     names the legacy literal as its `output.validateJsonPath`.
 *   - `refuseConfiguredLegacyWrite` — post-sunset AND the config points
 *     at the legacy path: the writer skips and the message must direct
 *     the operator to update their config.
 *
 * Pre-sunset the writer keeps depositing the legacy file (either via
 * the configured path or the side-write below) and the finding warns.
 * Post-sunset the file may exist on disk as a stale artifact: the
 * finding reports that and asks the operator to delete it.
 */
function buildDeprecationIssue(args: {
  severity: "warning" | "error";
  legacyWriteEnabled: boolean;
  configTargetsLegacyPath: boolean;
  refuseConfiguredLegacyWrite: boolean;
}): Issue {
  const message = args.refuseConfiguredLegacyWrite
    ? `qfai.config.yaml#output.validateJsonPath points at the legacy SSOT ` +
      `${LEGACY_VALIDATE_JSON_REL}, which is past the announced sunset ` +
      `(${LEGACY_VALIDATE_JSON_SUNSET}). The validate writer REFUSED this ` +
      `write to enforce the migration gate. Update output.validateJsonPath ` +
      `to .qfai/report/validate.json (canonical) and rerun validate.`
    : args.legacyWriteEnabled
      ? args.configTargetsLegacyPath
        ? `qfai.config.yaml#output.validateJsonPath still points at the legacy ` +
          `SSOT ${LEGACY_VALIDATE_JSON_REL}; the file is being written for ` +
          `backward compatibility but the sunset (${LEGACY_VALIDATE_JSON_SUNSET}) ` +
          `is approaching. Update output.validateJsonPath to ` +
          `.qfai/report/validate.json before the next minor.`
        : `Legacy validate output path ${LEGACY_VALIDATE_JSON_REL} is still being written ` +
          `for backward compatibility; sunset: ${LEGACY_VALIDATE_JSON_SUNSET}. Read ` +
          `.qfai/report/validate.json (always-latest) or .qfai/report/validate-<profile>.json instead.`
      : `Legacy validate output path ${LEGACY_VALIDATE_JSON_REL} is past the announced ` +
        `sunset (${LEGACY_VALIDATE_JSON_SUNSET}); the legacy file is no longer written but ` +
        `still exists on disk. Update consumers to read .qfai/report/validate.json or ` +
        `.qfai/report/validate-<profile>.json and delete the stale legacy file.`;
  return {
    code: "D-DEPRECATED-PATH",
    severity: args.severity,
    category: "canonical",
    message,
    file: LEGACY_VALIDATE_JSON_REL,
    rule: "validate.legacyOutputDeprecated",
  };
}

function recountIssues(
  counts: ValidationResult["counts"],
  added: Issue,
): ValidationResult["counts"] {
  if (added.suppressed) return counts;
  return {
    info: counts.info + (added.severity === "info" ? 1 : 0),
    warning: counts.warning + (added.severity === "warning" ? 1 : 0),
    error: counts.error + (added.severity === "error" ? 1 : 0),
  };
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
  "QFAI-DENSITY-005":
    "A `Rule` cell at least 400 chars AND at least 3x the mean of the other `BR` rows in the same file is a granularity signal (warning). Files with fewer than 3 `BR-ID`/`Rule` rows are not checked.",
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
  "QFAI-PROT-284": "emoji characters (U+1F000–U+1FAFF) are forbidden in full-harness output.",
  "QFAI-PROT-285": "prototyping phase state machine is invalid for completion.",
  "QFAI-PROT-286": "post-selection polish iteration evidence is missing for completion.",
  "QFAI-PROT-287": "completion requires every reviewer axis score to be 100.",
  "QFAI-PROT-288": "legacy 95-point completion marker is not a valid completion border.",
  "QFAI-PROT-289": "completionCertificate is required when completion is claimed.",
  "QFAI-PROT-292":
    "terminationReason is max-iterations but iterationCount is below configured maxIterations.",
  "QFAI-PROT-310":
    "executionPlan in prototyping.json must be present and well-formed in full-harness mode: the block itself must be an object, and each of targetIterations (number), evaluationAxesSource (non-empty string), delegationMap (object), plannedAt (non-empty string) must be present with the correct shape.",
  "QFAI-PROT-311":
    "delegationMap entry assigns a category to a role outside the SKILL.md Delegation Scope Table.",
  "QFAI-PROT-318":
    "runtimeGate/specCoverage evidenceRefs contain a non-concrete artifact reference.",
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
  "QFAI-DCON-005":
    "design-system.yaml must define checklist entries for color, typography, spacing, border_radius, shadow, dos_and_donts, and motion_rules, plus component guidance via checklist.component_tone or richer component guidance blocks.",
  "QFAI-DCON-009": "design-system.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-012": "prototype-handoff.yaml must parse as an object-shaped YAML document.",
  "QFAI-DCON-013":
    "prototype-handoff.yaml must contain source prototypes, surface profiles, screens, visual DNA, and implementation handoff guidance.",
  "QFAI-DCON-019":
    "design-system.yaml and prototype-handoff.yaml are produced by /qfai-prototyping, not /qfai-sdd.",
  "QFAI-DCON-030":
    "Root DESIGN.md is required as the brand SSOT for UI-bearing projects (file missing).",
  "QFAI-DCON-031":
    "DESIGN.md.lock.yaml must exist under contracts/design/ and contain a designMdSha256 string.",
  "QFAI-DCON-032":
    "Root DESIGN.md sha256 must match DESIGN.md.lock.yaml#designMdSha256 (re-freeze after intentional edits).",
  "QFAI-DCON-033":
    "Root DESIGN.md exists but failed to parse per design-md-spec (front-matter is malformed).",
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

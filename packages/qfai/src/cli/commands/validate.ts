import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FailOn, OutputFormat } from "../../core/config.js";
import { loadConfig } from "../../core/config.js";
import { normalizeValidationResult } from "../../core/normalize.js";
import { normalizeSpecId } from "../../core/specScope.js";
import { buildCiProfileIssue } from "../../core/phasePolicy.js";
import { SUNSETS, isAtOrPastSunset } from "../../core/sunset.js";
import { toRelativePath } from "../../core/paths.js";
import { ATTESTATION_MISSING_CODE, HANDOFF_SCHEMA_CODE } from "../../core/saasPackage/profile.js";
import { saasPackageSkippedGateFamilies } from "../../core/saasPackage/skippedGates.js";
import type {
  Issue,
  ValidationProfile,
  ValidationResult,
  ValidationTimings,
} from "../../core/types.js";
import {
  THIN_COVERAGE_SIGNAL_CODE,
  THIN_COVERAGE_SIGNAL_EXPECTATION,
} from "../../core/validators/layerCoverage.js";
import {
  PACKAGE_SELF_GOVERNANCE_FAMILIES,
  unevaluatedPackageSelfGovernanceFamilies,
} from "../../core/validators/packageSelfGovernance.js";
import {
  TDD_LIST_SEED_RECONCILIATION_CODES,
  TDD_LIST_SEED_SHAPE_CODES,
} from "../../core/validators/tddList.js";
import { writeValidateRunLog } from "../../core/runLog.js";
import { validateProject } from "../../core/validate.js";
import { resolveToolPackageDir, resolveToolVersion } from "../../core/version.js";
import { resolveFailOn, shouldFail, strictSupersededBy } from "../lib/failOn.js";
import {
  buildIncompleteRunIssue,
  buildTruncatedScanIssue,
  incompleteRunResult,
  warnIfTruncated,
} from "../lib/warnings.js";

export type ValidateOptions = {
  root: string;
  strict: boolean;
  failOn?: FailOn;
  format?: OutputFormat;
  profile?: ValidationProfile;
  platform?: string;
  /**
   * Restrict the run to the named specs (`--spec`, repeatable). Repo-level
   * findings are always kept; findings owned by an out-of-scope spec and that
   * spec's `specs-coverage` report write are dropped.
   */
  specIds?: readonly string[];
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
const LEGACY_VALIDATE_JSON_SUNSET = SUNSETS.legacyValidateJson;
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
 *
 * Exported so `report --run-validate` gates on the same predicate. That command
 * writes a validate result too, and a private copy of the rule here meant the
 * report path bypassed the migration gate the validate path enforces.
 */
export function configTargetsLegacyValidateJsonPath(configuredPath: string): boolean {
  if (path.isAbsolute(configuredPath)) return false;
  return normalizeForLegacyMatch(configuredPath) === LEGACY_VALIDATE_JSON_REL;
}

export async function runValidate(options: ValidateOptions): Promise<number> {
  const startedAt = new Date();
  const root = path.resolve(options.root);
  const configResult = await loadConfig(root);
  // The CI narrow-profile finding is appended to a real run, not substituted
  // for one. Replacing the run made every stage gate that names a narrow
  // profile unreachable in CI.
  const ciProfileIssue = buildCiProfileIssue(options.profile);
  // Wrapped, because an unhandled rejection here left the operator with one
  // stderr line and no verdict — no `counts:`, no `run-log:`, no
  // `validate.json` — and every shipped skill pipes validate through `| tail`,
  // so that line was all an agent saw (#1104). Enumerating the `stat` sites
  // that can raise reduces the ways in; this is what answers when the next one
  // appears.
  //
  // `unknown`, deliberately not narrowed to a filesystem error: the point is a
  // verdict for anything unexpected, and a narrowed catch would put the next
  // unclassified failure back on the path this exists to close.
  let validated: ValidationResult;
  try {
    validated = await validateProject(root, configResult, {
      ...(options.profile ? { profile: options.profile } : {}),
      ...(options.platform ? { platform: options.platform } : {}),
      ...(options.specIds && options.specIds.length > 0 ? { specIds: options.specIds } : {}),
    });
  } catch (error: unknown) {
    validated = incompleteRunResult(
      options.toolVersionOverride ?? (await resolveToolVersion()),
      buildIncompleteRunIssue(error, "validate"),
      options.profile,
    );
  }
  const rawResult = ciProfileIssue
    ? {
        ...validated,
        issues: [...validated.issues, ciProfileIssue],
        counts: { ...validated.counts, warning: validated.counts.warning + 1 },
      }
    : validated;
  // Resolve effective tool version for the legacy-path sunset gate.
  // Test callers override; production reads the same package.json#version
  // the rest of the toolchain uses (so the source-of-truth is single).
  const effectiveToolVersion = options.toolVersionOverride ?? (await resolveToolVersion());
  await emitProvenance(effectiveToolVersion);
  const legacySeverity = legacyValidateJsonSeverity(effectiveToolVersion);
  const legacyWriteEnabled = legacySeverity === "warning";
  // Detect whether the operator's project config still aims the writer
  // at the legacy SSOT. This is a stronger signal than "the legacy file
  // exists on disk" — even a clean filesystem will trigger the gate if
  // the config points there, because the writer is about to recreate
  // the stale path on this very run.
  const configuredValidateJsonPath = configResult.config.output.validateJsonPath;
  const configTargetsLegacyPath = configTargetsLegacyValidateJsonPath(configuredValidateJsonPath);
  const scopedSpecIds = options.specIds ?? [];
  // Post-sunset, only emit the deprecation finding when there is
  // observable evidence (config or on-disk file) that a consumer still
  // depends on the legacy path. Otherwise every clean validate run on
  // tool >= sunset would carry an unactionable error finding for a path
  // the user never used. Pre-sunset the finding is always emitted as a
  // warning because the tool itself is still writing the path.
  const legacyOnDisk = !legacyWriteEnabled
    ? await pathExists(path.join(root, LEGACY_VALIDATE_JSON_REL))
    : false;
  // A scoped run writes no shared report at all, so the PRE-sunset writer-side
  // notice would describe a deprecated write that never happens — and fail an
  // otherwise-clean slice gate under `--strict` / `--fail-on warning`. That is
  // the only part a scope may suppress. Post-sunset the finding is evidence of
  // a legacy path this project still depends on (config or stale file), and
  // suppressing it would let `--spec` alone walk past the migration gate with
  // exit 0.
  const emitDeprecationIssue = legacyWriteEnabled
    ? scopedSpecIds.length === 0
    : legacyOnDisk || configTargetsLegacyPath;
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
  // `!== false` rather than a truth test: a result that carries no claim (one
  // not produced by `validateProject`) keeps the ordinary per-profile wording.
  const partialProfileNotice = buildPartialProfileNotice(
    normalized.profile,
    normalized.profileValidatorsRan !== false,
    scopedSpecIds.length > 0,
    await unevaluatedPackageSelfGovernanceFamilies(root),
  );
  if (partialProfileNotice) {
    normalized.issues.push(partialProfileNotice);
    normalized.counts = recountIssues(normalized.counts, partialProfileNotice);
  }

  warnIfTruncated(normalized.traceability.testFiles, "validate");
  // The echo above is for a human reading stdout. The finding is what the exit
  // gate, the annotation stream and the run-log can actually see, so a
  // truncated scan can no longer pass `--fail-on warning` as a clean run.
  const truncatedScanIssue = buildTruncatedScanIssue(normalized.traceability.testFiles, "validate");
  if (truncatedScanIssue) {
    normalized.issues.push(truncatedScanIssue);
    normalized.counts = recountIssues(normalized.counts, truncatedScanIssue);
  }

  const failOn = resolveFailOn(options, configResult.config.validation.failOn);
  // No special case for an incomplete run. `QFAI-SCAN-002` is an `error`, so
  // `counts.error` is non-zero and `shouldFail` already fails the run under
  // every `--fail-on` but `never` — which is the one exception a caller asked
  // for explicitly, and there the finding is still in the output and in
  // `validate.json`.
  //
  // An earlier revision added `runIncomplete || …` here as a second guard. It
  // was unreachable: removing it changed no row, because the severity is what
  // decides. The invariant it was protecting — that this finding stays an
  // `error` — is pinned in `validateRunIncomplete.test.ts` instead, which is
  // where it can actually fail.
  if (strictSupersededBy(options)) {
    emitStrictSupersededNotice(failOn);
  }
  const willFail = shouldFail(normalized, failOn);

  const runLog = await writeValidateRunLog({
    root,
    config: configResult.config,
    result: normalized,
    startedAt,
    command: "/qfai-validate",
    status: willFail ? "fail" : "pass",
    failOn,
  });
  const runLogPath = toRelativePath(root, runLog.reportDir);

  // A `--spec` run is one worker's view of one slice, so it writes its own
  // report rather than the shared one. Resolve it BEFORE the GitHub summary:
  // pointing that summary at the shared `validate.json` named a file this run
  // never wrote — either missing, or a stale repo-wide report from another run
  // — so the findings dropped by the annotation cap were unreachable.
  const scopedReportRel =
    scopedSpecIds.length > 0 ? scopedReportPath(configuredValidateJsonPath, scopedSpecIds) : null;

  const format = options.format ?? "text";
  if (format === "text") {
    emitText(normalized, failOn);
    emitTextRunLog(runLogPath);
  }
  if (format === "github") {
    const jsonPath = resolveJsonPath(
      root,
      scopedReportRel ?? configResult.config.output.validateJsonPath,
    );
    emitGitHubOutput(normalized, root, jsonPath, {
      failOn,
      willFail,
      runLogPath,
    });
  }
  if (scopedSpecIds.length > 0) {
    // Writing a scoped result to the shared `validate.json` /
    // `validate-<profile>.json` / legacy path would let parallel Slice workers
    // race on the same files, leaving the last finisher's single spec looking
    // like a repo-wide PASS to every downstream reader.
    //
    // The migration gate applies here too. `scopedReportPath` derives its
    // directory from `output.validateJsonPath`, so a config still pointing at
    // the legacy SSOT would put `validate.spec-0003.json` inside the
    // deprecated directory — new files appearing under a path the gate exists
    // to retire, which reads as "still fine to write here".
    if (scopedReportRel !== null && !refuseConfiguredLegacyWrite) {
      await emitJson(normalized, root, scopedReportRel);
    }
  } else {
    // Always-latest report + profile-suffixed report.
    // Post-sunset, refuse to write to the configured legacy path: the
    // migration gate must direct the operator to update their config
    // instead of silently producing a stale-named file. The accompanying
    // deprecation issue (severity=error) already carries the actionable
    // text; here we just skip the physical write.
    if (!refuseConfiguredLegacyWrite) {
      await emitJson(normalized, root, configuredValidateJsonPath);
      const profileLabel = normalized.profile ?? options.profile ?? "full";
      const profileSuffixedRel = profileSuffixedReportPath(
        configuredValidateJsonPath,
        profileLabel,
      );
      await emitJson(normalized, root, profileSuffixedRel);
    }
    // Legacy path — written for the whole deprecation window per BR-0004-0026,
    // and skipped only when the configured path is already the legacy path
    // (avoid double-writing the same file). This is intentionally NOT gated on
    // the finding's evidence: a downstream consumer reading .qfai/output/
    // from a clean checkout has left no evidence to find, and withholding the
    // write would break it before the announced sunset. Post-sunset
    // (legacyWriteEnabled === false) the write stops, which is the whole
    // point of the sunset.
    if (legacyWriteEnabled && !configTargetsLegacyPath) {
      await emitJson(normalized, root, LEGACY_VALIDATE_JSON_REL);
    }
  }

  return willFail ? 1 : 0;
}

/**
 * Report path for a `--spec`-scoped run: `<dir>/<base>.spec-0003+0004.json`,
 * or `null` when the scope is not writable.
 *
 * Derived from the configured path so a custom `output.validateJsonPath` still
 * lands next to its siblings, and deterministic in the spec ids so re-running
 * the same worker overwrites only its own file.
 *
 * `null` when ANY value is unnormalizable. Two reasons, both load-bearing:
 * raw user input must never reach a filename (`--spec x/../../../outside`
 * escapes the report directory once `path.resolve` runs); and dropping the bad
 * value would make `--spec 0003 --spec nope` — a run that fails with
 * `QFAI-SCOPE-001` — write the SAME file as a healthy `--spec 0003`, so
 * whichever finished last decided whether that slice looked like a PASS. The
 * run's exit code, stdout and run-log still carry the failure.
 */
export function scopedReportPath(
  configuredPath: string,
  specIds: readonly string[],
): string | null {
  const normalizedIds: string[] = [];
  for (const id of specIds) {
    const normalizedId = normalizeSpecId(id);
    if (normalizedId === null) {
      return null;
    }
    normalizedIds.push(normalizedId);
  }
  if (normalizedIds.length === 0) {
    return null;
  }
  const normalized = configuredPath.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  const dir = slash === -1 ? "" : normalized.slice(0, slash + 1);
  const base = slash === -1 ? normalized : normalized.slice(slash + 1);
  const dot = base.lastIndexOf(".");
  const stem = dot === -1 ? base : base.slice(0, dot);
  const ext = dot === -1 ? "" : base.slice(dot);
  const suffix = Array.from(new Set(normalizedIds)).sort().join("+");
  return `${dir}${stem}.spec-${suffix}${ext}`;
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

/**
 * Build the `D-DEPRECATED-PATH` finding for the legacy validate output
 * SSOT. Exactly three states can reach this function, matching
 * `emitDeprecationIssue` in `runValidate`:
 *
 *   1. `refuseConfiguredLegacyWrite` — post-sunset AND the config points
 *      at the legacy path: the writer skipped, so the message must direct
 *      the operator to update their config.
 *   2. `legacyWriteEnabled` — pre-sunset, on any unscoped run, whether or
 *      not the config names the legacy literal. This branch is deliberately
 *      NOT evidence-gated: pre-sunset the tool still writes the legacy file
 *      on every run, so the warning describes a write that is really
 *      happening, and a project reading `.qfai/output/` from a clean
 *      checkout produces no evidence to gate on. `configTargetsLegacyPath`
 *      only selects which of the two pre-sunset messages is used. Severity
 *      is `warning`; the compatibility write still happens.
 *      The evidence gate this PR adds applies to state 3.
 *   3. Otherwise — post-sunset with a stale file left on disk. The write
 *      has stopped, so the message asks the operator to delete it.
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
      ? // BR-0004-0026 requires the sunset version as a literal `sunset: X`
        // string in every pre-sunset warning body, so both branches carry it.
        args.configTargetsLegacyPath
        ? `qfai.config.yaml#output.validateJsonPath still points at the legacy ` +
          `SSOT ${LEGACY_VALIDATE_JSON_REL}; the file is still being written for ` +
          `backward compatibility; sunset: ${LEGACY_VALIDATE_JSON_SUNSET}. ` +
          `Update output.validateJsonPath to .qfai/report/validate.json ` +
          `before the next minor.`
        : `Legacy validate output path ${LEGACY_VALIDATE_JSON_REL} is still being written ` +
          `for backward compatibility; sunset: ${LEGACY_VALIDATE_JSON_SUNSET}. Point consumers ` +
          `at .qfai/report/validate.json (always-latest) or ` +
          `.qfai/report/validate-<profile>.json before the next minor.`
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

/**
 * Validator groups the `full` profile runs, with the finding-code families
 * each one produces.
 *
 * The keys mirror the composition in `core/validate.ts#runFullValidators`, so
 * "what a partial profile did not evaluate" can be derived as
 * `full groups - profile groups` instead of being restated per profile. The
 * earlier hand-written per-profile lists named only the three headline
 * families and therefore claimed, for example, that `--profile tdd` had
 * evaluated repository hygiene (`QFAI-HYG-*`) when `runTddValidators` never
 * calls it.
 *
 * A group is a **set of validators**, not a code prefix, because a prefix is
 * not a partition of the validator set. Three shapes broke the earlier prefix
 * table:
 *
 *   - `validateContracts` and `validateTraceability` are called by both
 *     `runSddValidators` and `runTddValidators`, so `QFAI-CONTRACT-*` /
 *     `QFAI-TRACE-*` cannot sit in either profile's own group — a `tdd` run
 *     listed as unevaluated a family it had just emitted. The wildcard cannot
 *     stand in for the shared work either: `QFAI-CONTRACT-030` belongs to the
 *     sdd-only `validateContractReferences`, so a shared entry spelled
 *     `QFAI-CONTRACT-*` would let a stage claim coverage of a hard gate it
 *     never ran. One emitter is not one group either: `validateTraceability`
 *     runs its two code-reference gates only under `includeCodeReferences`,
 *     which `runSddValidators` leaves off, so `QFAI-TRACE-117` /
 *     `QFAI-TRACE-124` split away from the shared block into a group `tdd`
 *     lists and `sdd` does not.
 *   - `QFAI-DCON-*` has one emitter per profile
 *     (`validateSddDesignContractReadiness` /
 *     `validatePrototypingDesignContractReadiness`), which share only the root
 *     DESIGN.md sample / lock gates; the required-file, design-system and
 *     handoff codes are prototyping-only and `QFAI-DCON-019` is sdd-only, so
 *     the family splits three ways. `QFAI-RESEARCH-*` / `UIX-VAL-*` are
 *     reached from both the discussion and the prototyping compositions.
 *   - The reviewer-gate `R-*` codes split by emitter, not by prefix:
 *     `detectMockHrefDrift`, `validateDesignMdPatchZone` and
 *     `detectEvidenceMutationUnlogged` run only in prototyping, the rest only
 *     in sdd. The wildcard made `--profile sdd` claim coverage of detectors it
 *     never ran. Emitter, not detector, is the unit: `runSddValidators` also
 *     calls `validateReviewerJustification`, which re-issues a
 *     justification-catalog code verbatim when a JSON report anywhere under
 *     `.qfai/review/` carries a finding with an empty `justification:` — so the
 *     three prototyping-detector codes it can re-issue are shared, and the two
 *     catalog codes with no `validate` detector (`R-PACK-LOCATION-DRIFT`,
 *     `R-EXPLORATION-CERTIFY-ATTEMPT`) belong to sdd instead of to nothing.
 *
 * Shared work therefore gets its own group, listed by every profile that runs
 * it, and code-level entries are used wherever a family spans profiles.
 *
 * Whichever form an entry takes, it must cover **every** code its gate emits:
 * a gate that gains a second code would otherwise drop out of the notice
 * unannounced, which is how `QFAI-TEST-001` alone came to under-state what
 * `--profile tdd` had skipped once `QFAI-TEST-002` / `QFAI-TEST-003` existed.
 * So: a prefix glob where the gate owns its whole prefix, enumerated codes
 * where it owns only part of one — and then the split has to partition the
 * prefix rather than sample it. `tdd-ledger-seed` takes the tighter form
 * still, spreading the same constant its validator filters on, since a list
 * that IS the gate's own list cannot drift from what the gate evaluates.
 * Exported so `tests/core/findingCodeGrammar.test.ts` can prove the coverage
 * half of that for the gates whose emitted codes it scans.
 */
export const GATE_GROUP_FAMILIES = {
  hygiene: ["QFAI-HYG-*"],
  "skills-integrity": ["QFAI-SKILLS-*"],
  "assistant-assets": ["QFAI-ASSETS-*"],
  discussion: ["QFAI-DPACK-*", "QFAI-VIS-*"],
  // `validateResearchSummary` and `runCanonicalUixValidators` are called from
  // both `runDiscussionValidators` and `runUiuxValidators`, so neither can sit
  // inside `discussion`: a prototyping run listed as unevaluated a family it
  // had just emitted.
  "research-summary": ["QFAI-RESEARCH-*"],
  "canonical-uix": ["UIX-VAL-*"],
  sdd: [
    // `runSddValidators` dispatches the preflight input-source rule, so a
    // partial profile that skips the `sdd` group has not evaluated it either.
    // Leaving it off this list let `--profile tdd` PASS look input-source
    // checked when nothing had looked.
    "QFAI-IMPLITE-*",
    "QFAI-SPACK-*",
    "QFAI-SPECSECTION-*",
    "QFAI-COV-*",
    "QFAI-PLAN-*",
    "QFAI-ID-*",
    "QFAI-LAYER-*",
    "QFAI-ORPHAN-*",
    "QFAI-NAV-*",
    "QFAI-MMD-*",
    "QFAI-BFLOW-*",
    // The re-open gate runs with the spec-pack validators, so a partial
    // profile has to name it among the hard gates it did not evaluate.
    "QFAI-DECISION-*",
    // Spec-pack structural gates: table arity, density hints, capability
    // split, status leakage, triage approval, status enums, AC / EX / TC
    // verification and the Traceability Ledger. Absent from the table
    // entirely before, so NO profile ever reported them as unevaluated.
    "QFAI-TABLE-*",
    "QFAI-DENSITY-*",
    "QFAI-SPLIT-*",
    "QFAI-STATUSLEAK-*",
    "QFAI-TRIAGE-*",
    "QFAI-STATUS-*",
    "QFAI-AC-*",
    "QFAI-EX-*",
    "QFAI-TC-*",
    "QFAI-LEDGER-*",
    "E_*",
    // Worklog surface, assistant tree migration, skill doc references and
    // stale references — all sdd-only compositions.
    "W-WORKLOG-*",
    "W-PENDING-PROMOTION",
    "W-ASSISTANT-LAYOUT",
    "W-SKILL-DOC-BROKEN-REF",
    "W-SKILL-PROJECT-MEMORY",
    "W-STALE-REFERENCE",
    "I-ASSISTANT-LAYER-UNSEEDED",
    "D-SURFACE-TYPE-MISSING",
  ],
  // Reviewer-gate detectors wired into `runSddValidators`. The `R-*` wildcard
  // this replaces made `--profile sdd` claim coverage of `detectMockHrefDrift`
  // and `validateDesignMdPatchZone`, which run only in prototyping.
  "reviewer-gate-sdd": [
    "R-CERTIFY-VERIFY-CIRCULAR",
    "R-PROMPT-SCANNER-DRIFT",
    "R-AUTOPILOT-POLICY-*",
    "R-HANDOFF-INCOMPLETE",
    "R-WORKLOG-DRIFT",
    "R-REJECTED-READOPT",
  ],
  // Detectors wired into `runPrototypingValidators` whose codes
  // `validateReviewerJustification` re-emits from `runSddValidators`: an empty
  // `justification:` on a `.qfai/review/**/*.json` finding is reported under
  // the original code (`validators/reviewerJustification.ts`). Both stages can
  // therefore emit them, so both list this group — filing it as
  // prototyping-only made an sdd run name a code it had just emitted.
  "reviewer-gate-shared": [
    "R-MOCK-HREF-DRIFT",
    "R-DESIGN-MD-PATCH-OUT-OF-ZONE",
    "R-EVIDENCE-MUTATION-UNLOGGED",
  ],
  // The two justification-catalog codes with no `validate` detector at all:
  // `R-PACK-LOCATION-DRIFT` comes from the lint lane and
  // `R-EXPLORATION-CERTIFY-ATTEMPT` from `qfai prototyping certify`. Inside
  // `validate` they are reachable only through `validateReviewerJustification`,
  // which sdd runs — so they belong to sdd rather than to no group at all.
  "reviewer-justification-only": ["R-PACK-LOCATION-DRIFT", "R-EXPLORATION-CERTIFY-ATTEMPT"],
  // `validateContracts` (with `validateContractConsistency` /
  // `validateDbContractExecutability`) — `runSddValidators` and
  // `runTddValidators`. Listed by code, not as `QFAI-CONTRACT-*`: the wildcard
  // would swallow the sdd-only `QFAI-CONTRACT-030` below, letting a `tdd` run
  // claim a hard gate it never reached.
  contracts: [
    "QFAI-CONTRACT-000",
    "QFAI-CONTRACT-010",
    "QFAI-CONTRACT-011",
    "QFAI-CONTRACT-012",
    "QFAI-CONTRACT-013",
    "QFAI-CONTRACT-014",
    "QFAI-CONTRACT-020",
    "QFAI-CONTRACT-021",
    "QFAI-CONTRACT-031",
    "QFAI-CONTRACT-040",
    "QFAI-DB-*",
  ],
  // `validateContractReferences` — `runSddValidators` only.
  "contract-references": ["QFAI-CONTRACT-030"],
  // Root DESIGN.md sample / identity / lock gates, run by both
  // design-contract-readiness emitters before they branch on stage.
  "design-contract-readiness": ["QFAI-DCON-030", "QFAI-DCON-031", "QFAI-DCON-032", "QFAI-DCON-034"],
  // `validateRootDesignMdParse` — the parse half of the readiness gate, split
  // out so the stage that AUTHORS the file can see whether it parses. A third
  // composition emits `QFAI-DCON-033` because of it: `runDiscussionValidators`
  // calls it directly, so filing the code with the readiness gates told a
  // discussion run it had not evaluated a family it had just emitted.
  "root-design-md-parse": ["QFAI-DCON-033"],
  // `validateSddDesignContractReadiness` only — the premature-prototyping-
  // output guard. `runFullValidators` disables it, so it is stage-only.
  "design-contract-readiness-sdd": ["QFAI-DCON-019"],
  // `validatePrototypingDesignContractReadiness` only — required design
  // contracts plus the design-system / prototype-handoff mirrors.
  "design-contract-readiness-prototyping": [
    "QFAI-DCON-001",
    "QFAI-DCON-005",
    "QFAI-DCON-009",
    "QFAI-DCON-012",
    "QFAI-DCON-013",
  ],
  // `R-HANDOFF-SCHEMA-DRIFT` / `R-SKILL-MANIFEST-DRIFT`, split out of
  // `reviewer-gate-sdd`, where the emitter-based table above would otherwise
  // file them. The group runs inside that profile, but its two detectors read
  // qfai's own package sources, so in a consuming repo they are structurally
  // unevaluated while the rest of the sdd reviewer gates still fire. Their own
  // group is what lets `unevaluatedGates` name them per code when their inputs
  // are absent; `sdd` lists it alongside `reviewer-gate-sdd`, so neither code
  // loses its profile attribution.
  "package-self-governance": PACKAGE_SELF_GOVERNANCE_FAMILIES,
  "review-artifacts": ["QFAI-REVIEW-*"],
  prototyping: [
    "QFAI-PROT-*",
    "QFAI-CRIT-*",
    "QFAI-FID-*",
    "QFAI-UIE-*",
    "QFAI-DT-*",
    "QFAI-MOCK-*",
    "QFAI-FLOW-*",
    "QFAI-BPAP-*",
    "QFAI-CONSISTENCY-*",
    "QFAI-AGENT-*",
    "QFAI-AUD-*",
    "QFAI-PLATFORM-*",
    "QFAI-CFG-LINK-*",
    "QFAI-UIUX-PERF",
  ],
  "prototyping-skill": ["UIX-VAL-SKILL-*"],
  "atdd-traceability": ["QFAI-ATDD-*"],
  "atdd-scaffold": ["D-SCAFFOLD-PLACEHOLDER", "D-SCAFFOLD-FOREIGN-HOME"],
  // The half of the ledger validator that describes what `/qfai-sdd` Phase 2b
  // wrote. Both `sdd` and `tdd` run it, so it is its own group: folding it into
  // `tdd` would tell an `sdd` reader these codes went unevaluated.
  //
  // Read from the same constant `validateTddListSeedShape` filters on rather
  // than re-spelled here: a code in one list and absent from the other makes
  // the notice lie in whichever direction the two drifted.
  "tdd-ledger-seed": [...TDD_LIST_SEED_SHAPE_CODES],
  // The downstream-ownership gate, and one of the groups `full` does NOT run.
  //
  // `/qfai-sdd` owns the protected files and edits them without a Change
  // Request by design, and that author is told to run the full profile before
  // completion like everyone else — so emitting the finding there would flag
  // every legitimate authoring edit. `--profile tdd` is the completion gate the
  // drift protocol names, i.e. the downstream stage the rule binds, and it is
  // where the guard runs.
  //
  // Absent from this map entirely, the family could not even be REPORTED as
  // unevaluated, so a `full` PASS looked drift-checked to an operator following
  // `QFAI-PROFILE-001`'s own advice (#1122). Stage-only: see
  // `STAGE_ONLY_GATE_GROUPS`.
  drift: ["QFAI-DRIFT-*"],
  // The remaining `TDDLIST_*` codes report execution state that only exists
  // after `/qfai-implement` has driven rows, so only its profile evaluates
  // them. `QFAI-TDDLIST-*` is the canonical spelling of the same gate and every
  // code it holds today is execution state, so the glob sits here whole.
  //
  // `QFAI-TRACE-*` is deliberately NOT here: the four `traceability-*` groups
  // below split that prefix, and leaving the glob would count every trace code
  // in two groups at once.
  tdd: ["TDDLIST_* (execution state)", "QFAI-TDDLIST-*", "QFAI-TEST-*"],
  // Own group, not part of `tdd`: `/qfai-sdd` owns `16_Traceability-ledger.md`
  // and both profiles check that it is present and well-shaped, but `sdd` does
  // not run the TDD-list gates.
  "traceability-ledger": ["QFAI-TRACE-002"],
  // Split from the group above because `sdd` deliberately does not run it: at
  // that gate the linked implementation is untouched by design. `QFAI-TRACE-003`
  // only ever reports that *this* check could not run — no diff at all, or a
  // spec the diff names that the working tree no longer carries — so it travels
  // with it.
  "traceability-impl-drift": ["QFAI-TRACE-001", "QFAI-TRACE-003"],
  // The rest of the `QFAI-TRACE-1*` prefix: the layered-traceability report,
  // dispatched by both `runSddValidators` and `runTddValidators`. Enumerated
  // rather than globbed because the two code-reference gates below sit inside
  // the same prefix and the shared call does not reach them — and a group that
  // is a subset of a prefix has to partition it, not sample it. Together with
  // `traceability-code-references` these cover `QFAI-TRACE-100` .. `-124`.
  "traceability-layered": [
    "QFAI-TRACE-100",
    "QFAI-TRACE-101",
    "QFAI-TRACE-102",
    "QFAI-TRACE-103",
    "QFAI-TRACE-104",
    "QFAI-TRACE-105",
    "QFAI-TRACE-106",
    "QFAI-TRACE-107",
    "QFAI-TRACE-108",
    "QFAI-TRACE-109",
    "QFAI-TRACE-110",
    "QFAI-TRACE-111",
    "QFAI-TRACE-112",
    "QFAI-TRACE-113",
    "QFAI-TRACE-114",
    "QFAI-TRACE-115",
    "QFAI-TRACE-116",
    "QFAI-TRACE-118",
    "QFAI-TRACE-119",
    "QFAI-TRACE-120",
    "QFAI-TRACE-121",
    "QFAI-TRACE-122",
    "QFAI-TRACE-123",
  ],
  // The two `validateTraceability` gates behind its `includeCodeReferences`
  // option: `QFAI-TRACE-124` (test globs unset) and `QFAI-TRACE-117` (SC with
  // no code reference). `runSddValidators` defaults the option to `false`, so
  // `--profile sdd` calls the same validator and still evaluates neither —
  // filing them with the shared codes hid a gate that a `tdd` or `full` run
  // fails on. `runTddValidators` and `runFullValidators` both pass `true`.
  "traceability-code-references": ["QFAI-TRACE-117", "QFAI-TRACE-124"],
  // `runSaasPackageProfile` — reached only from the `saas-package` profile
  // (`core/validate.ts#runSaasPackage`), which `runFullValidators` does not
  // call. Both codes are `error`, so a package missing its design-system
  // attestation or carrying a malformed handoff fails `--profile saas-package`
  // and nothing else — including a full scan. Stage-only for that reason.
  // `D-SAAS-PACKAGE-VERIFY-SKIPPED` is deliberately absent: it is the profile's
  // own info marker for the gates it skips, not a gate another run could
  // evaluate.
  "saas-package-profile": [ATTESTATION_MISSING_CODE, HANDOFF_SCHEMA_CODE],
} as const satisfies Record<string, readonly string[]>;

type GateGroup = keyof typeof GATE_GROUP_FAMILIES;

const ALL_GATE_GROUPS = Object.keys(GATE_GROUP_FAMILIES) as GateGroup[];

/**
 * Groups `full` / `verify` deliberately do NOT run, mapped to the profile that
 * does run each one.
 *
 * `runFullValidators` disables two of them — `runSddValidators(..., false, ...)`
 * drops `QFAI-DCON-019` and `runTddValidators(..., false, false)` drops the
 * upstream guard — because a repo-wide audit also covers the stage that
 * legitimately owns the files each gate polices, so firing them there would
 * flag every lawful edit. The third is not disabled but unreachable: `full`
 * never composes `runSaasPackageProfile` at all. Listing any of them under
 * `full` made the notice tell a partial profile to run a scan that never
 * evaluates them, while `full` itself, showing no notice, read as complete
 * coverage (#1122). Both halves are fixed by excluding them from `full` and
 * naming their owning profile in the notice.
 */
const STAGE_ONLY_GATE_GROUPS: Partial<Record<GateGroup, ValidationProfile>> = {
  "design-contract-readiness-sdd": "sdd",
  drift: "tdd",
  "saas-package-profile": "saas-package",
};

function stageOwnerOf(group: GateGroup): ValidationProfile | undefined {
  return Object.prototype.hasOwnProperty.call(STAGE_ONLY_GATE_GROUPS, group)
    ? STAGE_ONLY_GATE_GROUPS[group]
    : undefined;
}

/**
 * Everything `runFullValidators` evaluates: every group but the stage-only ones.
 *
 * Derived by exclusion rather than enumerated, so a group added to
 * `GATE_GROUP_FAMILIES` still reaches `full` without a second edit — which is
 * the property `ALL_GATE_GROUPS` was there for. The exclusions are named in
 * `STAGE_ONLY_GATE_GROUPS`, and what each one mirrors is recorded there.
 */
const FULL_GATE_GROUPS: readonly GateGroup[] = ALL_GATE_GROUPS.filter(
  (group) => stageOwnerOf(group) === undefined,
);

/** `runPrototypingValidators`, shared by the `prototyping` and `saas-package` profiles. */
const PROTOTYPING_GATE_GROUPS: readonly GateGroup[] = [
  "prototyping",
  "reviewer-gate-shared",
  "design-contract-readiness",
  "design-contract-readiness-prototyping",
  "root-design-md-parse",
  "research-summary",
  "canonical-uix",
];

/**
 * Groups each profile actually runs, mirroring
 * `core/validate.ts#runProfileValidators`. Exhaustive over `ValidationProfile`
 * so a new profile cannot be added without deciding what it evaluates.
 */
const PROFILE_GATE_GROUPS: Record<ValidationProfile, readonly GateGroup[]> = {
  full: FULL_GATE_GROUPS,
  verify: FULL_GATE_GROUPS,
  // Both stages mandate the review pack in their RCP footer and both run
  // `validateReviewArtifacts` (`runDiscussionValidators` unconditionally,
  // `runSddValidators` under its `includeReviewArtifacts` default), so
  // `QFAI-REVIEW-*` must not be listed as a family the run did not evaluate.
  discussion: [
    "discussion",
    "research-summary",
    "canonical-uix",
    "review-artifacts",
    // `runDiscussionValidators` calls `validateRootDesignMdParse` directly:
    // the skill mandates a parsable root DESIGN.md and names this profile as
    // its gate.
    "root-design-md-parse",
  ],
  // `runSddValidators` also calls `validateTddListSeedShape`: the stage that
  // seeds the ledger is gated on the shape it seeded.
  sdd: [
    "sdd",
    "reviewer-gate-sdd",
    // `runSddValidators` calls `runPackageSelfGovernanceValidators`, so sdd
    // evaluates this group too — subject to the per-code precondition check.
    "package-self-governance",
    // `validateReviewerJustification` re-issues these codes from an sdd run.
    "reviewer-gate-shared",
    "reviewer-justification-only",
    "contracts",
    "contract-references",
    "design-contract-readiness",
    "design-contract-readiness-sdd",
    "root-design-md-parse",
    "review-artifacts",
    "tdd-ledger-seed",
    "traceability-ledger",
    "traceability-layered",
  ],
  prototyping: PROTOTYPING_GATE_GROUPS,
  atdd: ["atdd-traceability", "atdd-scaffold"],
  // `runTddValidators` also calls `validateAtddCodeTraceability`, but not the
  // scaffold-placeholder gate that completes the atdd group. It also calls
  // `validateContracts` and `validateTraceability`, which sdd shares, plus the
  // tdd-only `validateTraceabilityIntegrity`.
  //
  // `drift`: `runTddValidators` passes `includeUpstreamGuard = true` here and
  // `runFullValidators` passes `false`, so this is the only profile that
  // evaluates `QFAI-DRIFT-*`.
  //
  // `tdd-ledger-seed` as well as `tdd`: this profile runs the WHOLE ledger
  // validator, so it evaluates the seed shape the `sdd` profile also checks.
  tdd: [
    "tdd",
    "tdd-ledger-seed",
    "atdd-traceability",
    "drift",
    "contracts",
    "traceability-ledger",
    "traceability-impl-drift",
    "traceability-layered",
    // `runTddValidators` calls `validateTraceability` with
    // `includeCodeReferences: true`, which `runSddValidators` does not.
    "traceability-code-references",
  ],
  // `runSaasPackage` runs the prototyping composition, then narrows it via
  // `SAAS_PACKAGE_SKIPPED_GATES` (folded back into the notice below) and adds
  // its own attestation / handoff gates, which no other profile reaches.
  "saas-package": [...PROTOTYPING_GATE_GROUPS, "saas-package-profile"],
};

function isKnownProfile(profile: string): profile is ValidationProfile {
  return Object.prototype.hasOwnProperty.call(PROFILE_GATE_GROUPS, profile);
}

/** Families a profile does not evaluate, split by where the reader must go. */
type UnevaluatedGates = {
  /** Deduped, order-preserving families a `full` scan would have covered. */
  readonly fullCovered: readonly string[];
  /** Families only one stage's own profile ever runs, with that profile. */
  readonly stageOnly: readonly { readonly family: string; readonly profile: ValidationProfile }[];
};

/**
 * The groups a profile does not run, split by where the reader must go.
 *
 * `scoped` is whether the run carried `--spec`, which narrows what the `sdd`
 * profile evaluates: see the branch below.
 *
 * `unevaluatedSelfGovernance` carries the self-governance codes whose own
 * inputs are absent, so those detectors cannot fire whatever the project does
 * and their codes join the list even though the profile wires them in. It is
 * per code, not per group: the two detectors read different files, and a tree
 * carrying one detector's inputs but not the other's would otherwise drop both
 * from the notice while one of them had structurally not run. They join
 * `fullCovered` rather than `stageOnly`: no profile owns them the way a
 * stage-only group is owned, so there is no `--profile` to send the reader to.
 */
function unevaluatedGates(
  profile: string,
  scoped: boolean,
  unevaluatedSelfGovernance: readonly string[],
): UnevaluatedGates {
  if (!isKnownProfile(profile)) {
    return { fullCovered: [], stageOnly: [] };
  }
  const evaluated = new Set<GateGroup>(PROFILE_GATE_GROUPS[profile]);
  const fullCovered: string[] = [];
  const stageOnly: { family: string; profile: ValidationProfile }[] = [];
  const pushFullCovered = (family: string): void => {
    if (!fullCovered.includes(family)) fullCovered.push(family);
  };
  for (const group of ALL_GATE_GROUPS) {
    if (evaluated.has(group)) continue;
    const owner = stageOwnerOf(group);
    for (const family of GATE_GROUP_FAMILIES[group]) {
      // A stage-only gate is not reachable from `full`, so pointing the reader
      // at a full scan for it would be advice that cannot be followed.
      if (owner === undefined) {
        pushFullCovered(family);
      } else if (!stageOnly.some((entry) => entry.family === family)) {
        stageOnly.push({ family, profile: owner });
      }
    }
  }
  if (profile === "sdd" && scoped) {
    // A `--spec` run of this profile is the per-spec slice gate, which the
    // skill's Required Process places before the phase that seeds the ledger —
    // so `runSddValidators` drops the codes that reconcile the two. Read from
    // the same constant it filters on, so the notice cannot claim a gate the
    // run skipped.
    //
    // The drop is per spec — only where the ledger is genuinely absent — so on
    // a scoped run over seeded specs these codes did in fact run. Listing them
    // anyway is the conservative half of the error: the notice under-claims
    // what was evaluated, which is the direction that cannot mislead.
    for (const family of TDD_LIST_SEED_RECONCILIATION_CODES) pushFullCovered(family);
  }
  if (fullCovered.length === 0) {
    // A profile that runs every group a full scan covers is not partial, and
    // this is the partial-profile list. Appending a precondition-gated group
    // here would put "full is a partial profile" into the artifact. Stage-only
    // families are a separate axis and are reported either way.
    return { fullCovered, stageOnly };
  }
  if (evaluated.has("package-self-governance")) {
    for (const family of unevaluatedSelfGovernance) pushFullCovered(family);
  }
  if (profile === "saas-package") {
    // Keep the skip-set SSOT wired in: a gate added to
    // `SAAS_PACKAGE_SKIPPED_GATES` must reach the notice even if it belongs to
    // a group the profile otherwise runs. Every skipped family belongs to a
    // group `full` runs, so a full scan is the accurate remedy for all of them.
    for (const family of saasPackageSkippedGateFamilies()) pushFullCovered(family);
  }
  return { fullCovered, stageOnly };
}

/**
 * Notice describing what a run did NOT evaluate.
 *
 * A PASS on a partial profile is not layered coverage, and every profile
 * writes the shared always-latest `validate.json` — so the omission has to be
 * visible in the artifact, not only in the operator's head.
 *
 * `full` / `verify` get their own wording rather than silence: they evaluate
 * every gate a full scan covers, but three groups are stage-only, and a run
 * that says nothing at all reads as complete coverage of every gate in the
 * tool (#1122).
 *
 * All of that describes what the requested profile *would* evaluate, which is
 * only what it did evaluate when its validators actually ran.
 * `runProfileValidators` returns the integration-surface findings alone when a
 * path those validators walk cannot be walked, so the group table describes
 * nothing that happened: `profileValidatorsRan === false` gets its own wording
 * rather than a coverage claim printed next to the `QFAI-LINK-001` that
 * contradicts it.
 */
function buildPartialProfileNotice(
  profile: string | undefined,
  profileValidatorsRan: boolean,
  scoped: boolean,
  unevaluatedSelfGovernance: readonly string[],
): Issue | null {
  // `core/validate.ts` resolves `options.profile ?? "full"` before this runs,
  // so the only caller always supplies one; this is the parser-rejection path.
  if (!profile) {
    return null;
  }
  if (!profileValidatorsRan) {
    return profileNotice(
      `profile="${profile}" evaluated NO hard gate in this run. The integration-surface ` +
        "inspection found a path this profile's own validators walk that cannot be walked, so " +
        "the run stopped before any of them ran and reported only that damage " +
        "(`QFAI-LINK-001`). Repair the path it names and re-run: neither these findings nor " +
        "their absence says anything about this profile's gates.",
    );
  }
  // There is no "blocked" branch any more: a narrow profile in CI runs its own
  // validators, so the ordinary partial-profile wording is accurate.
  const { fullCovered, stageOnly } = unevaluatedGates(profile, scoped, unevaluatedSelfGovernance);
  if (fullCovered.length === 0 && stageOnly.length === 0) {
    return null;
  }
  // A stage-only gate is unreachable from a full scan, so it is named with the
  // profile that does run it instead of being folded into the "run full" list.
  // Sending the reader to `--fail-on error` for one of them would repeat the
  // advice that produced the false PASS (#1122).
  const stageOnlySentence =
    stageOnly.length === 0
      ? ""
      : ` Stage-ownership gates no full scan runs: ${stageOnly
          .map((entry) => `${entry.family} (\`--profile ${entry.profile}\`)`)
          .join(", ")}.`;
  const message =
    fullCovered.length === 0
      ? `profile="${profile}" evaluated every gate a full scan covers.` + stageOnlySentence
      : `profile="${profile}" is a partial profile. Hard gates NOT evaluated in this run: ` +
        `${fullCovered.join(", ")}. A PASS here is not full-scan coverage — run ` +
        "`npx qfai validate --fail-on error` (full profile) before declaring completion." +
        stageOnlySentence;
  return profileNotice(message);
}

/** The `QFAI-PROFILE-001` envelope every coverage wording above shares. */
function profileNotice(message: string): Issue {
  return {
    code: "QFAI-PROFILE-001",
    severity: "info",
    category: "canonical",
    message,
    rule: "validate.partialProfileCoverage",
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

function emitStrictSupersededNotice(failOn: FailOn): void {
  process.stderr.write(
    `qfai validate: --strict is superseded by --fail-on ${failOn} (effective failOn=${failOn})\n`,
  );
}

/**
 * Renders the default `--format text` output.
 *
 * The emitted line grammar is documented for users in the shipped
 * `assistant/catalog/cli-ux-guidelines.md` (Error Message Format section);
 * both must be changed together.
 */
export function emitText(result: ValidationResult, failOn: FailOn): void {
  for (const item of result.issues) {
    const location = item.file ? ` (${item.file})` : "";
    const refs = item.refs && item.refs.length > 0 ? ` refs=${item.refs.join(",")}` : "";
    const suppressed = item.suppressed ? " suppressed=true" : "";
    process.stdout.write(
      `[${item.severity}] ${item.code} ${item.message}${location}${refs}${suppressed}\n`,
    );
    if (shouldEmitIssueDetail(item, failOn)) {
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
  // 実効 failOn はこれまで `--format github` の summary 行にしか現れず、既定の
  // text 出力を読むレビュアーには終了コードの根拠が見えなかった。
  process.stdout.write(`fail-on: ${failOn}\n`);
  const overruns = formatTimingOverruns(result.timings);
  if (overruns) {
    process.stdout.write(`${overruns}\n`);
  }
}

/**
 * The validator groups that overshot their budget, as one text line, or `null`
 * when everything fit.
 *
 * Printed next to the counts rather than pushed as a finding: how long a run
 * took describes the machine, not the tree, so it must not move
 * `counts.warning` and make the same commit report different totals on a
 * laptop and on a loaded CI runner.
 */
export function formatTimingOverruns(timings: ValidationTimings | undefined): string | null {
  if (!timings) {
    return null;
  }
  const parts: string[] = [];
  if (timings.uiuxMs > timings.uiuxBudgetMs) {
    parts.push(
      `uiux=${formatOverrunMs(timings.uiuxMs, timings.uiuxBudgetMs)}ms ` +
        `(budget ${timings.uiuxBudgetMs}ms)`,
    );
  }
  if (timings.htmlMockMs > timings.htmlMockBudgetMs) {
    parts.push(
      `htmlMock=${formatOverrunMs(timings.htmlMockMs, timings.htmlMockBudgetMs)}ms ` +
        `(budget ${timings.htmlMockBudgetMs}ms)`,
    );
  }
  return parts.length > 0 ? `timings: over budget ${parts.join(" ")}` : null;
}

const MAX_OVERRUN_DECIMALS = 9;

/**
 * A measurement that already exceeds `budget`, rendered at the coarsest
 * precision that still reads as larger than the budget.
 *
 * Rounding to whole milliseconds unconditionally would print
 * `uiux=2000ms (budget 2000ms)` for a 2000.1ms run — a diagnostic that
 * contradicts the over-budget branch it was printed from — and collapse a
 * fractional custom budget to `0ms (budget 0.1ms)`. So the decimals grow until
 * the rendered value is strictly greater than the budget.
 */
function formatOverrunMs(value: number, budget: number): string {
  for (let decimals = 0; decimals <= MAX_OVERRUN_DECIMALS; decimals += 1) {
    const rendered = value.toFixed(decimals);
    if (Number(rendered) > budget) {
      return rendered;
    }
  }
  return String(value);
}

function emitTextRunLog(runLogPath: string): void {
  process.stdout.write(`run-log: ${runLogPath}\n`);
}

/**
 * The version and the directory it came from — first line of every run.
 *
 * A validate run printed findings, `counts:` and `run-log:` and nothing about
 * its own provenance, while `toolVersion` lived only inside `validate.json` —
 * which the README calls internal and not a stable external contract. So an
 * `npx qfai` that resolved three directories up, against another branch's
 * lockfile, was indistinguishable in the transcript from one that resolved
 * locally (#1096).
 *
 * **Before the work, and in every format.** Printed beside `run-log:` it was
 * absent from `--format github`, which is the format the shipped SDD loop
 * prescribes (`skills/qfai-sdd/SKILL.md`, `templates/evidence/sdd-spec.md`), so
 * the answer was missing from the path the product actually runs. And printed
 * after `validateProject` returned, it was missing from the run that needs it
 * most: an old externally-resolved qfai throwing on a newer project structure
 * left a stack trace and nothing about which binary produced it.
 *
 * stdout is safe in both formats — neither puts machine-readable JSON there.
 */
async function emitProvenance(toolVersion: string): Promise<void> {
  const packageDir = await resolveToolPackageDir();
  const where = packageDir === null ? "resolution unknown" : packageDir;
  process.stdout.write(`qfai: ${toolVersion} (${where})\n`);
}

function emitGitHubOutput(
  result: ValidationResult,
  root: string,
  jsonPath: string,
  status: { failOn: FailOn; willFail: boolean; runLogPath: string },
): void {
  const deduped = dedupeIssues(result.issues);
  const dropped = Math.max(result.issues.length - deduped.length, 0);
  const perLevel = capPerLevel(deduped);

  emitGitHubSummary(result, {
    total: deduped.length,
    emitted: perLevel.emitted.length,
    levels: perLevel.levels,
    dropped,
    jsonPath,
    root,
    timingOverruns: formatTimingOverruns(result.timings),
    ...status,
  });

  for (const issue of perLevel.emitted) {
    emitGitHub(issue, status.failOn);
  }
}

/** What one annotation level looked like: how many exist, and how many were emitted. */
export interface LevelTally {
  readonly level: GitHubLevel;
  readonly total: number;
  readonly emitted: number;
}

/**
 * The issues to emit, capped at GitHub's own limit for each level, plus a tally per level.
 *
 * The cap is applied on the level the ANNOTATION carries, not on `issue.severity`, and those are
 * not the same partition: a suppressed error annotates as `notice`. Capping by severity would
 * count a suppressed error against the error budget while the runner counted it against the
 * notice one — so the summary would be wrong in the direction that matters, claiming a level was
 * complete while the runner truncated it. One derivation, used here and by the emitter.
 *
 * Order within a level is preserved, so the first ten of a level are the first ten a reader
 * would have seen.
 */
export function capPerLevel(issues: Issue[]): { emitted: Issue[]; levels: LevelTally[] } {
  const buckets = new Map<GitHubLevel, Issue[]>();
  for (const issue of issues) {
    const level = gitHubLevel(issue);
    const bucket = buckets.get(level);
    if (bucket === undefined) buckets.set(level, [issue]);
    else bucket.push(issue);
  }

  const emitted: Issue[] = [];
  const levels: LevelTally[] = [];
  // A FIXED order, so the note reads the same way from one run to the next rather than in
  // whichever order the issues happened to arrive.
  for (const level of GITHUB_LEVELS) {
    const bucket = buckets.get(level) ?? [];
    if (bucket.length === 0) continue;
    const kept = bucket.slice(0, GITHUB_ANNOTATION_LIMIT_PER_LEVEL);
    emitted.push(...kept);
    levels.push({ level, total: bucket.length, emitted: kept.length });
  }
  return { emitted, levels };
}

/**
 * Whether an issue prints its `expected` / `fix` detail. This was hard-wired to
 * `severity === "error"`, which left the rule-description catalogue unreachable
 * for every warning-severity code: under `--strict` / `--fail-on warning` the
 * warning is exactly what fails the run, yet neither formatter printed its
 * expected state or remedy.
 */
function shouldEmitIssueDetail(issue: Issue, failOn: FailOn): boolean {
  if (issue.severity === "error") {
    return true;
  }
  return failOn === "warning" && issue.severity === "warning";
}

/** The three levels GitHub counts separately, in the order the summary reports them. */
export const GITHUB_LEVELS = ["error", "warning", "notice"] as const;

type GitHubLevel = (typeof GITHUB_LEVELS)[number];

/**
 * The level an issue annotates as.
 *
 * Extracted from `emitGitHub` so the per-level cap and the emitter cannot disagree about which
 * budget an issue spends. A suppressed issue is a `notice` whatever its severity, and that is
 * exactly the case a second copy of this expression would get wrong.
 */
export function gitHubLevel(issue: Issue): GitHubLevel {
  if (issue.suppressed) return "notice";
  if (issue.severity === "error") return "error";
  return issue.severity === "warning" ? "warning" : "notice";
}

function emitGitHub(issue: Issue, failOn: FailOn): void {
  const level = gitHubLevel(issue);
  // The location metadata is ESCAPED, and by the property rules rather than the message
  // ones. Review finding [40]: `issue.file` can come from a finding the reviewer gate
  // ingested out of `.qfai/review/**`, which is a directory a pull request writes — so a
  // `file` of `x\n::stop-commands::token` split this line in two and let a fork's pull
  // request inject a workflow command, suppressing or forging every annotation after it.
  //
  // A property value needs `:` and `,` escaped as well as `%` and the newlines: they are the
  // separators GitHub parses the metadata block with, so a `file` containing either changes
  // which properties this command appears to set.
  const file = issue.file ? `file=${escapeGitHubCommandProperty(issue.file)}` : "";
  const line = issue.loc?.line ? `,line=${issue.loc.line}` : "";
  const column = issue.loc?.column ? `,col=${issue.loc.column}` : "";
  const location = file ? ` ${file}${line}${column}` : "";
  const suffix = shouldEmitIssueDetail(issue, failOn)
    ? ` expected=${resolveIssueExpected(issue)} | fix=${resolveIssueFix(issue)}`
    : "";
  const message = escapeGitHubCommandValue(`${issue.code}: ${issue.message}${suffix}`);
  process.stdout.write(`::${level}${location}::${message}\n`);
}

function emitGitHubSummary(
  result: ValidationResult,
  options: {
    total: number;
    emitted: number;
    levels: LevelTally[];
    dropped: number;
    jsonPath: string;
    runLogPath: string;
    root: string;
    failOn: FailOn;
    willFail: boolean;
    timingOverruns: string | null;
  },
): void {
  const summary = [
    "qfai validate summary:",
    `error=${result.counts.error}`,
    `warning=${result.counts.warning}`,
    `info=${result.counts.info}`,
    `annotations=${options.emitted}/${options.total}`,
    `failOn=${options.failOn}`,
    `result=${options.willFail ? "FAIL" : "PASS"}`,
  ].join(" ");
  process.stdout.write(`${summary}\n`);

  if (options.timingOverruns) {
    // The measurement is not a finding, so it has no annotation of its own to
    // ride on; without this line a CI run in `--format github` would only
    // carry the overrun inside validate.json#timings.
    process.stdout.write(`::notice::${escapeGitHubCommandValue(options.timingOverruns)}\n`);
  }

  const truncated = options.levels.filter((tally) => tally.emitted < tally.total);
  if (options.dropped > 0 || truncated.length > 0) {
    const details = [
      "qfai validate note:",
      options.dropped > 0 ? `重複除外=${options.dropped}` : null,
      // PER LEVEL, because one number cannot express a per-level cap: a run with 5 errors and
      // 200 notices is complete on one level and truncated on the other, and a single
      // `上限省略=195` reads as though something was lost everywhere.
      truncated.length > 0
        ? `上限省略=${truncated
            .map((tally) => `${tally.level} ${tally.emitted}/${tally.total}`)
            .join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join(" ");
    process.stdout.write(`${details}\n`);
    process.stdout.write(
      `qfai validate note: GitHub は annotation を level ごと 10 件/step までしか表示しません。省略分は JSON に全件あります。\n`,
    );
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

/**
 * GitHub's own cap on annotations, which is per LEVEL and per STEP.
 *
 * This was 100, applied to the whole run, and the summary printed
 * `annotations=${min(total, 100)}/${total}` — so a run with 40 errors said `annotations=40/40`,
 * which reads as "every finding was emitted", while the runner displayed ten and dropped thirty
 * without saying so. The summary is the only thing an operator sees, and it said the opposite of
 * what happened. Measured on the `test (cli)` lane, all three levels sat at exactly ten, so the
 * truncation was the steady state rather than an edge case.
 *
 * Emitting past the cap was the alternative and buys nothing: the runner drops the extras, and a
 * local `--format github` run just prints more lines that no reader gets. What is owed is not a
 * smaller number but an honest report, which is why the per-level tally exists beside this.
 *
 * The cap is per STEP, and a step may run `validate` more than once — so this bounds what THIS
 * invocation emits, not what the step ultimately displays. The note says the rule rather than
 * promising an outcome this process cannot see.
 */
export const GITHUB_ANNOTATION_LIMIT_PER_LEVEL = 10;

/**
 * Human-readable "expected state" per issue code. Exported so a test can assert
 * that every code an emitter can raise at error severity is either catalogued
 * here or explicitly recorded as pending, instead of shipping without one.
 */
export const ISSUE_EXPECTED_BY_CODE: Record<string, string> = {
  "QFAI-CFG-001":
    "qfai.config.yaml sets no key that has been retired. A retired key is still parsed so an existing config keeps loading, but nothing reads it, so leaving it in place misreports the gate the tool actually runs.",
  "QFAI-SCOPE-001": "Every `--spec` value resolves to a 1-4 digit spec number.",
  "QFAI-SCOPE-002": "Every `--spec` value names a spec directory that exists.",
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
  "QFAI-DECISION-001":
    "A `Status: re-open` Decision Record uses the `DR-*` id scheme and names the prior `DR-*` it reconsiders in `Re-opens:` — not itself, and not a record that points back at it.",
  "QFAI-DECISION-002":
    "The `Re-opens:` reference resolves to a record declared in the spec's Decisions file or _policies/08_Decisions.md.",
  "QFAI-DECISION-003":
    "A `Status: re-open` Decision Record carries the explicit approval the Delta Rejected Guard requires (`Approved by` and an `Approved at` of YYYY-MM-DDThh:mm:ssZ).",
  "QFAI-DECISION-004":
    "A delta's `## Rejected` `Re-opened by:` and the spec's `Status: re-open` record name each other.",
  "QFAI-DECISION-005":
    "A `Status: re-open` Decision Record states in `Decision:` what changed since the rejection.",
  "QFAI-DECISION-006":
    "No candidate listed under a delta's `## Rejected` reappears under `## Adopted` unless that candidate's `Re-opened by:` names a `Status: re-open` record.",
  "QFAI-DECISION-007":
    "A `DR-*` id is declared once per Decisions file, so a `Re-opens:` or `Re-opened by:` reference resolves to one decision.",
  "QFAI-PROFILE-001":
    "A partial profile does not evaluate every hard gate; a PASS on it is not full-scan coverage.",
  "QFAI-PROT-011":
    "Every spec named in `prototyping.json#frozenSurfaceUnion` still resolves as UI-bearing, so the open loop describes screens that exist; a retired surface is either restored or the loop is reset deliberately from cycle 0.",
  "QFAI-SCAN-002":
    "`validate` runs to completion, so its output is a verdict; a run that could not finish reports that as a finding rather than as a bare stderr line with no counts, no run-log and no validate.json.",
  "QFAI-TOOL-002":
    "The qfai a project's gates run through is the one its own dependency declaration installs, so the gating version is pinned by its own lockfile rather than by whichever checkout `npx` reached first.",
  "QFAI-TOOL-001":
    "The qfai that runs a project's gates is resolved from inside that project, so the gating version is pinned by its own lockfile; a global install or a monorepo-root hoist is a benign reading of the same path test.",
  "QFAI-PLATFORM-003":
    "Every `--platform` given is read by the profile it is given to; the discussion / sdd / atdd / tdd profiles never reach platform detection, so a value passed there changes nothing about the run.",
  "QFAI-TRIAGE-007":
    "SPLIT / MERGE / SUPERSEDE / DELETE are spec-scoped; item decomposition is UPDATE:MODIFY + UPDATE:APPEND and item removal is UPDATE:REMOVE.",
  "QFAI-TRIAGE-008":
    "Every Triage section is introduced by the canonical `## Triage` H2, so the triage rules read the rows under it.",
  "QFAI-TRIAGE-009":
    "`Existing Spec` names its target in one grammar: `spec-NNNN` (multiple joined by `+`), `_policies` for a policy-only row, or `-` on a CREATE row. Every named spec must exist on disk; ranges are not a form.",
  "QFAI-SPLIT-106":
    "Every `CAP-NNNN` row in the CAP Catalog appears exactly once and its `Spec` cell names exactly one spec directory, and no two rows name the same one.",
  "QFAI-TEST-001":
    "No test file holds a silent placeholder — `it.todo` / `pytest.skip` / `t.Skip` / `@Disabled` / `#[ignore]` and the other dialects' stub forms.",
  "QFAI-TEST-003":
    "No vitest/jest test is parked with a `.skip` modifier; a parked suite is waived per path in `.qfai/waivers.yml` instead.",
  "QFAI-DENSITY-005":
    "A `Rule` cell at least 400 chars AND at least 3x the mean of the other `BR` rows in the same file is a granularity signal (warning). Files with fewer than 3 `BR-ID`/`Rule` rows are not checked.",
  "QFAI-COV-201": "Every AC must be referenced by at least one TC (`AC-Refs`).",
  "QFAI-COV-202": "Every BR must be referenced by at least one EX (`BR-Ref`).",
  "QFAI-COV-203": "Every EX must be referenced by at least one TC (`EX-Ref`).",
  "QFAI-COV-204": "Every BR row must include at least one AC reference in `AC-Refs`.",
  "QFAI-COV-205": "Every EX row must include at least one BR reference in `BR-Ref`.",
  "QFAI-COV-206": "Every TC row must include at least one reference in `AC-Refs` or `EX-Ref`.",
  [THIN_COVERAGE_SIGNAL_CODE]: THIN_COVERAGE_SIGNAL_EXPECTATION,
  "QFAI-ATDD-101":
    "US annotations in test code must reference existing IDs in specs (`QFAI:SPEC-XXXX:US-YYYY`).",
  "QFAI-ATDD-102":
    "TC annotations in test code must reference existing IDs in specs (`QFAI:SPEC-XXXX:TC-YYYY`).",
  "QFAI-ATDD-103":
    "CON-API annotations in test code must reference declared API contracts (`QFAI:CON-API-XXXX`).",
  "QFAI-ATDD-111":
    "Every US must be referenced at least once from tests/e2e/**. Scoped to user-facing specs when any spec declares a surface type; project-wide otherwise.",
  "QFAI-ATDD-112":
    "Every TC must be referenced at least once from the test directory its declared Level routes to (default tests/integration/**).",
  "QFAI-ATDD-118":
    "User stories declaring `- x-qfai-status: planned` are deferred from the E2E-test obligation.",
  "QFAI-ATDD-113": "Every declared CON-API must be referenced at least once from tests/api/**.",
  "QFAI-ATDD-114":
    "CON-API contracts declaring `x-qfai-status: planned` are deferred from the API-test obligation.",
  "QFAI-ATDD-121":
    "tests/api/** must not include TC annotations for a TC whose declared Level is not API.",
  "QFAI-ATDD-122":
    "tests/e2e/** must not include TC annotations for a TC whose declared Level is not E2E.",
  "QFAI-ATDD-123":
    "tests/integration/** must not include TC annotations for a TC whose declared Level is not Integration.",
  "QFAI-ATDD-117":
    "TCs declared Unit/Component are excluded from the ATDD annotation obligation; /qfai-implement's ledger gates them.",
  "QFAI-ATDD-119":
    "An obligation whose every annotation carrier declares no test is covered on paper, not by a test.",
  "QFAI-ATDD-131":
    "Every spec with an ATDD-owned test has a Coverage Depth Matrix at `.qfai/evidence/coverage-depth-<spec-id>.md`.",
  "QFAI-ATDD-132":
    "The Coverage Depth Matrix is tracked or unignored; the matrix and its justifications are committed.",
  "QFAI-ATDD-133":
    "`## Coverage Depth Matrix` in `.qfai/evidence/atdd-<spec-id>.md` exists and is a link plus counted totals.",
  "QFAI-ATDD-901":
    "ATDD traceability report output failures are warning-only, but report generation should be repaired.",
  "QFAI-TCLEVEL-001":
    "Every tdd/test-list.md coverage row cites a TC that declares a Level the ledger owns (L1/L2). A TC declaring no Level is owned by /qfai-atdd under tests/integration/** (QFAI-ATDD-112), so a ledger row still claiming it makes two stages own the same TC.",
  "QFAI-LINK-001":
    "Every qfai-owned entry in .claude/.agents/.codex/.github skill and agent directories is a symlink that resolves.",
  "QFAI-LINK-002":
    "Every `file.md#anchor` citation inside .qfai/assistant/** names a document that is there, and a heading that is in it.",
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
  "QFAI-IMPLITE-001":
    "A project that has spec packs also has a traceable input source: a `discussion-*/06_REQ.md` under the configured discussion directory, or an `.qfai/evidence/import-lite-*.md`.",
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
  "QFAI-PROT-244": "captured render artifacts must be path-only and referenced files must exist.",
  "QFAI-PROT-251":
    "render evidence path field contains inline payload (data URI, base64, inline HTML, or oversized content). Path-only required.",
  "QFAI-PROT-252":
    "render evidence status requires accompanying field (skippedReason for skipped, error for failed, imagePath/htmlPath for captured).",
  "QFAI-PROT-253":
    "render evidence top-level status contradicts screen-level statuses (e.g. status=captured but no captured screens).",
  "QFAI-PROT-273": "browser QA bundle schema is invalid (missing or malformed browserQa block).",
  "QFAI-PROT-274":
    "browser QA executed/status contradiction (e.g. executed=true but status!=completed).",
  "QFAI-PROT-275": "browser QA summary is malformed (non-object or invalid bucket counts).",
  "QFAI-PROT-276": "browser QA findings are malformed (non-array or invalid finding structure).",
  "QFAI-PROT-311":
    "executionPlan.delegationMap is present but is not an object, or one of its entries assigns a category to a role outside the SKILL.md Delegation Scope Table.",
  "QFAI-PROT-335":
    ".qfai/evidence/prototyping/completion-certificate.json is required when prototyping completion is claimed (run `qfai prototyping certify` after all gates pass).",
  "QFAI-PROT-336":
    ".qfai/evidence/prototyping/completion-certificate.json digest mismatch — evidence has been modified since certify; re-run `qfai prototyping certify`.",
  "QFAI-CFG-LINK-001":
    "qfai.config.yaml: prototyping.primarySpecId points to a spec ID that does not exist under the configured specs directory.",
  "QFAI-CFG-LINK-002":
    "qfai.config.yaml: paths.* points to a directory that does not exist on disk.",
  "QFAI-CFG-LINK-003":
    "qfai.config.yaml: prototyping.calibration.packPath points to a directory that does not exist on disk.",
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
  "QFAI-DCON-034":
    "Root DESIGN.md must be the project's own brand SSOT, not the unreplaced qfai sample seeded by `qfai init`.",
  "QFAI-AGENT-014":
    "The agent catalog embeds each agent's canonical body verbatim under `developer_instructions`, so a loader that reads only the catalog gets the same instructions the markdown file states.",
  "QFAI-AGENT-015":
    "Every role a skill declares is dispatchable: some routing phase or its review profile selects it.",
  "QFAI-AGENT-016":
    "Every routed skill's `SKILL.md` frontmatter parses, and its `roles:` and `routing-profile:` are usable, so the routing cross-check has something to read.",
  "QFAI-AGENT-017":
    "Every skill that declares a `routing-profile:` is routed at least one dispatchable phase by the routing manifest.",
  "QFAI-AGENT-018":
    "Each routed skill has exactly one review gate, named by both sides and defined in the review-profile manifest.",
  "QFAI-AGENT-019":
    "A skill's `roles:` is a superset of every agent the routing manifest binds to it, including the reviewers its review profile selects.",
  "QFAI-RESEARCH-012":
    "The latest discussion pack carries a `## Research Summary` section, so the research-first protocol has something to check.",
  "QFAI-PROT-337":
    "prototyping.mode=exploration downgraded one or more declared-error gates to warning; the notice names the source file and the affected codes.",
  // The apply-order family. Each of these reads a column or a declaration that
  // nothing read before them, so each carries a promotion window
  // (`core/sunset.ts`) and reaches `error` only at its pinned release. The
  // expected state is the same either way — the window decides how loudly a
  // gap is reported, not what the gap is.
  "QFAI-CONTRACT-015":
    "Every contract file states its apply order (`-- Depends on:` for SQL, `x-qfai-depends-on` for YAML/JSON), writing `-` when nothing has to be applied before it.",
  "QFAI-CONTRACT-030":
    "Contract index references must match declared contract IDs in .qfai/contracts/**.",
  "QFAI-CONTRACT-032":
    "Every contract index table carries a `Depends On` column, the one place a multi-file schema's apply order is written down.",
  "QFAI-CONTRACT-033":
    "Every contract index row's `Depends On` cell mirrors the apply order its contract file declares, with `-` for none; a blank cell records nothing and is not read as 'no dependencies'.",
  "QFAI-CONTRACT-034": "Every declared contract has a row in a contract index.",
  "QFAI-CONTRACT-035":
    "Every contract index row's `File` cell names a file that declares that row's contract ID.",
  "QFAI-CONTRACT-040":
    "Every state/status value an API contract mandates must have a representable counterpart in the domain declared by the DB contract(s) bounding the same normalized field name (CHECK ... IN, CREATE TYPE ... AS ENUM, or inline ENUM). Pairing is by normalized field name, not by an explicit pair declaration.",
  // Same rule as `QFAI-BPAP-001` below: `paths.contractsDir` is configurable, so
  // the expected state names the contracts root by role. Pinning the default
  // path sent a project that moved its contracts to repair a directory it does
  // not use, and the offending file is already on the finding's own line.
  "QFAI-CONTRACT-050":
    "Every `- SSOT modules:` entry in a contract under the configured contracts directory must resolve to a readable file or directory that travels with the project.",
  // `paths.contractsDir` is configurable, so the expected state names the file
  // by role rather than pinning the default location: a project that moved its
  // contracts must not be told to repair a directory it does not use. The
  // offending path is already on the finding's `target:` line.
  "QFAI-BPAP-001": "Every BP/AP rule file in the contracts `design/` directory is readable.",
  "QFAI-BPAP-002": "Every BP/AP rule file parses as YAML.",
  "QFAI-BPAP-003": "Every BP/AP rule file holds a top-level YAML array of rule entries.",
  "QFAI-BPAP-004": "Every BP entry has an `id` of the form `BP-XXXX`.",
  "QFAI-BPAP-005": "BP IDs are unique across every BP rule file.",
  // The check is `toSafeString(value).trim() === ""`, so a required key that is
  // present but holds `[]`, `{}`, or `null` fails it exactly like an absent
  // one. The expected state says "non-empty scalar", not "present", so the
  // report does not read as if the key were missing when it is not.
  "QFAI-BPAP-006": "Every BP entry gives each of its required fields a non-empty scalar value.",
  "QFAI-BPAP-007": "Every AP entry has an `id` of the form `AP-XXXX`.",
  "QFAI-BPAP-008": "AP IDs are unique across every AP rule file.",
  "QFAI-BPAP-009": "Every AP entry gives each of its required fields a non-empty scalar value.",
  "QFAI-BPAP-010": "Every AP entry declares a `detection_method` from the supported set.",
  "QFAI-BPAP-011": "Every BP/AP entry declares a `severity` from the supported set.",
  "QFAI-BPAP-012": "Every BP/AP entry declares a `platform` from the supported set.",
  // The layered spec ladder: US->CAP, AC->US, BR->AC, EX->AC|BR, TC->EX. Each
  // rung raises an even code when the `Parent` is absent and the odd one above
  // it when the `Parent` is there but names nothing the level above defines —
  // the same two states at five different heights.
  "QFAI-ORPHAN-100": "Every US declares a `Parent` naming the capability it delivers.",
  "QFAI-ORPHAN-101": "Every US `Parent` names a `CAP-XXXX` the shared capability policy defines.",
  "QFAI-ORPHAN-102": "Every AC declares a `Parent` naming the user story it refines.",
  "QFAI-ORPHAN-103": "Every AC `Parent` names a `US-XXXX` the same spec defines.",
  "QFAI-ORPHAN-104": "Every BR declares a `Parent` naming the acceptance criterion it constrains.",
  "QFAI-ORPHAN-105": "Every BR `Parent` names an `AC-XXXX` the same spec defines.",
  "QFAI-ORPHAN-106":
    "Every EX scenario carries a `Parent` comment naming the criterion or rule it illustrates.",
  "QFAI-ORPHAN-107": "Every EX `Parent` names an `AC-XXXX` or `BR-XXXX` the same spec defines.",
  "QFAI-ORPHAN-108": "Every TC declares a `Parent` naming the example it executes.",
  "QFAI-ORPHAN-109": "Every TC `Parent` names an `EX-XXXX` the same spec defines.",
  // `paths.skillsDir` is configurable and the diff is taken against whatever it
  // resolves to, so the expected state names the tree by role. The directory
  // actually compared is on the finding's `target:` line.
  "QFAI-TABLE-001":
    "Every Markdown table row carries the same cell count as its header, so a positionally-read ledger cannot silently shift a column.",
  "QFAI-SKILLS-001":
    "The project's assistant skills directory matches the skill assets shipped by the installed QFAI version.",
  "QFAI-ASSETS-003":
    "Every Stage 0 steering catalog file (.qfai/assistant/catalog/{manifest,product,structure,tech}.md) holds project values rather than the `<...>` slots and bare TODO/TBD placeholders `qfai init` ships, since qfai-implement Stage 0 reads its gate commands from tech.md#standard-commands-copy-paste and cannot run one that is still a placeholder.",
  // Both state the graph, not a path: `paths.skillsDir` is configurable, and
  // the file actually judged is on the finding's `target:` line.
  "QFAI-SKILLS-013":
    "Every file under a skill's `references/` is cited by some document reachable from that skill's `SKILL.md`, so progressive disclosure can reach it.",
  "QFAI-SKILLS-014":
    "Every document under the skills tree can be read, so reference reachability is decided over the whole graph rather than over the part that happened to open.",
  "D-SAAS-PACKAGE-ATTESTATION-MISSING":
    "The saas-package profile finds a design-system attestation at its configured path.",
  "D-SAAS-PACKAGE-HANDOFF-SCHEMA":
    "A cross-skill handoff, when present, parses as an object and conforms to the handoff schema.",
  "QFAI-DRIFT-001":
    "Upstream SSOT files are unchanged relative to the base branch, or the change carries an approved Change Request.",
  "QFAI-TDDLIST-007":
    "A ledger row at `done` states its evidence as a pointer into the evidence file its `Layer` owns, anchored at its own TDD item.",
  "QFAI-TDDLIST-009":
    "Every row's recorded `Revision` still names the tree its observation ran against: nothing the observation covered — the test file it names, or the source under test — has changed since. A stale Revision looks exactly like a fresh one, so this is computed rather than read.",
  "QFAI-TDDLIST-008":
    "Every evidence pointer resolves: the owner file the row's `Layer` names, the row's own TDD item, a heading that is present, and a complete entry behind it.",
  "QFAI-CTYPE-004":
    "Every `### DL-` entry in a delta file carries the seven `#### Meta` keys `parseDeltaV1` reads, so the Change Type counters see it. An entry the parser skips is counted for nothing and leaves the summary describing less change than the file records.",
  "QFAI-SPECSECTION-001":
    "Every spec pack carries each heading `validation.require.specSections` lists, in its own Markdown or — for a layered pack — in the shared `_policies` pack.",
  "QFAI-SPECSECTION-002":
    "Every `validation.require.specSections` entry normalises to a comparable heading name, so a configured strict gate is never a no-op.",
  "QFAI-RESEARCH-013":
    "A UI-bearing discussion pack registers at least `uiux.competitive_refs_min` complete competitive references (default 3) in `04_Sources.md`.",
  "QFAI-RESEARCH-014":
    "Every registered competitive reference populates `adopted_points`, `rejected_points` and `local_translation` with real content rather than a placeholder.",
  // States the healthy tree rather than the rejected values: a blank cell reads
  // as `T1`, so what the operator has to see is that a cell which is *filled*
  // names a tier the ceremony rules recognise.
  "QFAI-TDDLIST-010":
    "Every filled `Tier` cell in a TDD Execution Ledger names one of `T1`, `T2`, `T3` or `-`, so the ceremony a row owes is the one its author declared.",
};

/**
 * Human-readable remediation per issue code, for codes whose emitters cannot
 * say more at the call site than the message already does. An emitter that
 * passes `suggested_action` always wins over this catalog: it knows the concrete
 * values that failed the check.
 */
export const ISSUE_FIX_BY_CODE: Record<string, string> = {
  // The finding already names the offending key and the release the window
  // closes at; this is the catalog half, which `qfai report` renders for
  // codes whose `issue(...)` sites carry no `suggested_action` of their own.
  "QFAI-CFG-001":
    "Delete the named key from qfai.config.yaml. It changes no behaviour, so removing it is not a settings change — every validator already runs as if it were absent.",
  "QFAI-BPAP-001":
    "Restore read access to the file, or delete it if it is no longer part of the rule set.",
  "QFAI-BPAP-002": "Correct the YAML syntax the parse error points at, then rerun validate.",
  // QFAI-BPAP-001/002/003 fire on both `best-practices*.yaml` and
  // `anti-patterns*.yaml`, so the example ID has to stay neutral: spelling
  // `BP-0001` here would walk an anti-pattern author straight into
  // QFAI-BPAP-007, which demands the `AP-XXXX` form.
  "QFAI-BPAP-003":
    "Rewrite the file as a top-level YAML sequence of entries (`- id: BP-0001` in a best-practices file, `- id: AP-0001` in an anti-patterns file); a mapping at the root is not a rule set.",
  "QFAI-BPAP-004": "Rename the entry's `id` to `BP-` followed by four digits, e.g. `BP-0001`.",
  "QFAI-BPAP-005":
    "Give one of the colliding entries a fresh BP ID, or merge them if they state the same practice.",
  // Both codes fire on a present-but-empty value as well as on an absent key:
  // the check reads `toSafeString(value).trim()`, and a `description: []` or a
  // `detection_method: {}` reduces to the empty string. "Add the missing field"
  // is unusable on that path — the key is already there, and adding a second
  // one of the same name is a YAML duplicate rather than a repair.
  "QFAI-BPAP-006":
    "Give the BP entry a non-empty scalar for the field the message names: add the key when it is absent, and overwrite the value in place when the key is present but empty or written as a list or mapping. Drop the entry instead if the practice is no longer needed.",
  "QFAI-BPAP-007": "Rename the entry's `id` to `AP-` followed by four digits, e.g. `AP-0001`.",
  "QFAI-BPAP-008":
    "Give one of the colliding entries a fresh AP ID, or merge them if they state the same anti-pattern.",
  "QFAI-BPAP-009":
    "Give the AP entry a non-empty scalar for the field the message names: add the key when it is absent, and overwrite the value in place when the key is present but empty or written as a list or mapping. Drop the entry instead if the anti-pattern is no longer needed.",
  "QFAI-BPAP-010": "Set `detection_method` to one of the values the message lists.",
  "QFAI-BPAP-011": "Set `severity` to one of the values the message lists.",
  "QFAI-BPAP-012": "Set `platform` to one of the values the message lists.",
  // All four declared-mapping paths (blank cell, several directories, a CAP on
  // two rows, two CAPs on one directory) pass no `suggested_action`, and one
  // repair covers them: the `Spec` cell is the mapping, so the fix is always to
  // make each row name exactly one directory that no other row names.
  "QFAI-SPLIT-106":
    "Edit the `Spec` cell of each `CAP-NNNN` row the message names in `_policies/03_Capabilities.md` so it holds exactly one `spec-NNNN` directory: fill a blank cell with the directory that capability owns, cut a cell that lists several down to the one that owns it, merge a CAP that appears on two rows into one row, and give a directory claimed by two CAPs to only one of them.",
  // The agent-catalog drift emitter passes no `suggested_action` on either of
  // its paths (absent block, stale block), so both depend on this catalog for
  // their `fix:` line. One repair covers both: the markdown file is the source.
  "QFAI-AGENT-014":
    "Copy the agent markdown file from its `## Mission` heading onward, verbatim, into that agent's `developer_instructions` block in the catalog. When the instructions themselves need to change, edit the markdown file first and regenerate the block from it — never the other way round.",
  "QFAI-AGENT-015":
    "Remove the role from the skill's `roles:`, or bind it in `agent-routing.yml` (a phase's agent list) or in the review profile the route names.",
  "QFAI-AGENT-016":
    "Repair the `SKILL.md` frontmatter the message names: close the `---` block, and give `roles:` a list of strings and `routing-profile:` a non-empty profile name.",
  "QFAI-AGENT-017":
    "Add a `- skill:` route with at least one phase that dispatches an agent to `agent-routing.yml`, or drop the skill's `routing-profile:` if it is deliberately un-routed.",
  "QFAI-AGENT-018":
    "Make the skill's `routing-profile:` and the route's `review_profile:` name the same profile, defined once in `review-profiles.yml`, and leave the skill exactly one route block declaring it.",
  "QFAI-AGENT-019":
    "Add the named agent to that skill's `roles:` frontmatter, or stop binding it to the skill in `agent-routing.yml` / the review profile the route selects.",
  // The orphan-prohibition emitter passes no `suggested_action` on any path, so
  // every rung of the ladder depends on this catalog for its `fix:` line. The
  // even codes are repaired by writing a `Parent`, the odd ones by pointing an
  // existing `Parent` at something the level above actually defines.
  "QFAI-ORPHAN-100":
    "Add a `Parent: CAP-XXXX` line to the user story, naming the capability it delivers; register that capability in the shared capability policy first if it is not there yet.",
  "QFAI-ORPHAN-101":
    "Point the user story's `Parent` at a capability the shared policy defines — correct the reference, or add the capability there.",
  "QFAI-ORPHAN-102":
    "Add a `Parent: US-XXXX` line to the acceptance criterion, naming the user story it refines.",
  "QFAI-ORPHAN-103":
    "Point the criterion's `Parent` at a user story the same spec defines — correct the reference, or add the story.",
  "QFAI-ORPHAN-104":
    "Add a `Parent: AC-XXXX` line to the business rule, naming the criterion it constrains.",
  "QFAI-ORPHAN-105":
    "Point the rule's `Parent` at a criterion the same spec defines — correct the reference, or add the criterion.",
  "QFAI-ORPHAN-106":
    "Add a `Parent:` comment to the scenario, naming the criterion (`AC-XXXX`) or rule (`BR-XXXX`) it illustrates.",
  "QFAI-ORPHAN-107":
    "Point the scenario's `Parent` at a criterion or rule the same spec defines — correct the reference, or add the criterion or rule.",
  "QFAI-ORPHAN-108":
    "Add a `Parent: EX-XXXX` line to the test case, naming the example it executes.",
  "QFAI-ORPHAN-109":
    "Point the test case's `Parent` at an example the same spec defines — correct the reference, or add the example.",
  // Only the mirror-only rejection paths pass a `suggested_action`. The rest —
  // a missing `visual.*` block or key, a legacy `checklist.*` key, missing
  // component guidance, a mirror value that diverges from DESIGN.md, and a
  // mirror key DESIGN.md never authored — all fall through to this entry, so it
  // has to name every repair, not just the additive one.
  "QFAI-DCON-005":
    "design-system.yaml is a verbatim copy of DESIGN.md, so repair the entry the message names in whichever direction it is off: add it when it is missing (the `visual.*` block or key, the legacy `checklist.*` key, or the component-guidance block), copy DESIGN.md's value over it when the two diverge, and delete it when DESIGN.md does not author it. Then refreeze the lock and rerun validate.",
  // The browser-QA bundle checks are schema assertions raised by a local
  // `makeIssue` helper that has no `suggested_action` parameter, so every one of
  // their call sites depends on this catalog for its `fix:` line.
  "QFAI-PROT-273":
    "Add the `browserQa` block the message names to the browser-QA bundle, with `executed` a boolean and `status` one of completed|skipped|failed.",
  "QFAI-PROT-274":
    "Make `browserQa.executed` and `browserQa.status` agree: `executed=true` pairs with `status=completed`, and any other status pairs with `executed=false`.",
  "QFAI-PROT-275":
    "Give `browserQa.summary` an object per phase (smoke, interaction, visual, accessibility) carrying `status`, `findingsCount`, and `checksCount`, with `passed`/`failed` numeric when present.",
  "QFAI-PROT-276":
    "Make `findings` an array whose every entry carries a non-empty summary and detail, a severity from the supported set, at least one `evidence_refs` entry, and `repair_suggestions`.",
};

/** Printed as `expected` when a code has no catalog entry. */
export const UNCATALOGUED_EXPECTED = "Rule compliance";

/** Printed as `fix` when a code has neither a `suggested_action` nor a catalog entry. */
export const UNCATALOGUED_FIX = "Follow the expected rule and rerun validate.";

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

/**
 * Human-readable "expected state" a report prints for an issue code. Exported so
 * the catalog entry for a code can be asserted against the single definition the
 * emitting validator uses, instead of drifting from it silently.
 *
 * `issue.rule` is deliberately not a fallback: it holds an internal rule token
 * (`bpApDb.duplicateId`), and printing it in the `expected` field made a missing
 * catalog entry look like a value rather than an omission.
 */
export function resolveIssueExpected(issue: Issue): string {
  return ISSUE_EXPECTED_BY_CODE[issue.code] ?? UNCATALOGUED_EXPECTED;
}

/** Remediation a report prints for an issue: emitter first, then catalog. */
export function resolveIssueFix(issue: Issue): string {
  return issue.suggested_action ?? ISSUE_FIX_BY_CODE[issue.code] ?? UNCATALOGUED_FIX;
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

/**
 * One workflow-command PROPERTY value.
 *
 * The message escapes above plus `:` and `,`, which are the separators GitHub parses the
 * metadata block with — `%` first, or it would re-encode the escapes that follow it.
 */
function escapeGitHubCommandProperty(value: string): string {
  return escapeGitHubCommandValue(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

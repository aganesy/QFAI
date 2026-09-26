/**
 * `qfai prototyping certify [--check]` and `qfai prototyping show-ui-contract`.
 *
 * `certify` is the only writer of `.qfai/evidence/prototyping/completion-certificate.json`.
 * It refuses to write the artifact unless every gate passes:
 *   - prototyping.json.fullHarness.runId is present
 *   - .qfai/output/validate.json exists with counts.error === 0
 *   - .qfai/output/verify.json exists with status === "PASS"
 *   - prototyping.json.reviewerGate.result === "PASS"
 *   - root DESIGN.md parses, and the latest iteration HTML contains zero
 *     DESIGN.md violations (color / font / radius / shadow drift, and
 *     text below the declared contrast floor)
 *   - every `<screen>.review.json` required by the frozen set EXISTS,
 *     parses against the shipped reviewer payload schema (closed
 *     schema), carries the `(uiContractId, screenId, cycle)` of the pair and
 *     accepted iteration it is stored under, and is itself converged
 *     (no blocking finding, no layout anti-pattern, no DESIGN.md
 *     violation). All four failures are the same coverage rejection
 *     (exit 64) as a missing payload. The gate applies to single-spec
 *     and multi-spec frozen sets alike.
 *
 * `certify --check` re-computes evidence digests against the stored
 * certificate and exits non-zero on drift. The check ALSO re-hashes the
 * root DESIGN.md when the certificate carries `designMd`, so editing
 * the brand SSOT after certification fails the check, and re-audits the
 * review payloads the certificate sealed for the accepted iteration
 * against the current schema / identity / convergence rules, so a
 * certificate sealed by an older, presence-only gate cannot keep
 * reporting DONE on unparsable or non-converged evidence.
 *
 * `show-ui-contract` prints the frozen UI contract set and resolved primary.
 */

import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { loadConfig, type ConfigLoadResult } from "../../core/config.js";
import { readUiContractScreenContracts } from "../../core/contracts/screenContracts.js";
import { hashDesignMd, parseDesignMd } from "../../core/design/designMd.js";
import { readDesignMdLockSha } from "../../core/design/designMdLock.js";
import { isEnoent } from "../../core/fs/errno.js";
import { resolvePrototypingIterationViews } from "../../core/prototyping/modeRead.js";
import {
  PROTOTYPE_REL,
  PROTOTYPING_EVIDENCE_REL,
  PROTOTYPING_JSON_REL,
} from "../../core/prototyping/paths.js";
import {
  readVerifyJson,
  VERIFY_JSON_LEGACY_REL,
  VERIFY_JSON_REL,
} from "../../core/prototyping/verifyJson.js";
import {
  buildCompletionCertificate,
  checkCompletionCertificate,
  COMPLETION_CERTIFICATE_REL_PATH,
  isResetBackupDirectory,
  loadCompletionCertificate,
  writeCompletionCertificate,
  type CompletionCertificate,
  type CompletionCertificateDesignMd,
} from "../../core/prototyping/certificate.js";
import {
  findDesignMdViolations,
  type DesignMdViolation,
} from "../../core/prototyping/designMdViolations.js";
import {
  parseEvaluatorReview,
  type ReviewerPayload,
} from "../../core/prototyping/evaluatorReview.js";
import {
  resolvePrimaryPrototypingSpec,
  resolveSurfaceUnion,
} from "../../core/prototyping/specResolution.js";
import {
  detectExplorationCertifyAttempt,
  resolveCertifyAcceptedIterationIndex,
  type CertifyIterationView,
} from "../../core/validators/prototyping/explorationCertify.js";
// show-ui-contract's `liveUiBearing`
// uses the same resolver as iterate's drift gate (`resolveSurfaceUnion`)
// so the live scope reported here is apples-to-apples with what iterate
// enforces. the resolver was
// moved to `core/prototyping/specResolution.ts` so this import lands
// in the core layer instead of taking the sideways CLI → CLI hop on
// `prototypingIterate.ts`.
import {
  checkUiContractsCoveredDrift,
  readUiContractsCovered,
} from "../../core/prototyping/specsCovered.js";
import { readUiContractInventory } from "../../core/prototyping/specResolution.js";
import { SAAS_PACKAGE_SKIPPED_GATES } from "../../core/saasPackage/skippedGates.js";
import { resolveToolVersion } from "../../core/version.js";
import { error, info } from "../lib/logger.js";
import { EXIT_CODES } from "../lib/exitCodes.js";
import { profileSuffixedReportPath } from "./validate.js";

export type RunPrototypingCertifyOptions = {
  root: string;
  /** When true, do not write; only verify the existing certificate. */
  check: boolean;
  /**
   * Optional scope-limited posture. When set to `"saas-package"`, the
   * sealed certificate carries `scope: "saas-package"` + `notes[]`
   * naming the gates intentionally skipped under that scope. Default
   * (omitted) seals a full-scope certificate.
   */
  scope?: "saas-package" | "full";
  /**
   * Upgrade an existing scope-limited certificate to full DONE. The
   * impl re-gates the previously-skipped gates against the current
   * project state; if any still fail, exits non-zero and names them.
   * On success, rewrites the certificate WITHOUT the scope-limited
   * markers (no `scope`, no `notes`) — the canonical full-DONE shape.
   */
  upgradeScopeFull?: boolean;
};

/**
 * Per-gate skip note shape attached to a scope-limited certificate's
 * `notes[]`. Kept in sync with the `SAAS_PACKAGE_SKIPPED_GATES` SSOT.
 */
function formatSaasPackageSkipNote(gate: string): string {
  return `${gate}: skipped under saas-package scope`;
}

/**
 * Default canonical path (POSIX, relative to the project root) of the
 * optional "saas-package gates passing" signal used by
 * `--upgrade-scope full`. The file is a validate-style record carrying
 * per-gate status entries for every name in `SAAS_PACKAGE_SKIPPED_GATES`.
 * Absent → upgrade refuses (the gates have not been re-run yet).
 *
 * This literal is the DEFAULT — the effective canonical path is derived
 * at runtime from `config.output.validateJsonPath` via
 * {@link profileSuffixedReportPath} so an operator override of
 * `output.validateJsonPath` in `qfai.config.yaml` (e.g.
 * `custom/report.json` → writer emits `custom/report-saas-package.json`)
 * is honored by the reader too. Falling back to a hardcoded literal
 * would let writer and reader disagree under custom configs and refuse
 * upgrades that should succeed.
 *
 * The legacy `.qfai/output/validate-saas-package.json` path remains a
 * hardcoded literal — it is the legacy convention read only during
 * the `D-DEPRECATED-PATH` deprecation window and is intentionally not
 * config-derived.
 */
const SAAS_PACKAGE_GATES_SIGNAL_DEFAULT_REL = ".qfai/report/validate-saas-package.json";
const SAAS_PACKAGE_GATES_SIGNAL_LEGACY_REL = ".qfai/output/validate-saas-package.json";
const FULL_PROFILE_GATES_SIGNAL_DEFAULT_REL = ".qfai/report/validate-full.json";

/**
 * Resolve the saas-package gates signal canonical path from a loaded
 * config. Mirrors the writer-side derivation in
 * `runValidate` (`validate.ts`) so writer + reader stay in lockstep on
 * a single SSOT (`config.output.validateJsonPath`).
 *
 * `config.output.validateJsonPath` is populated with the canonical
 * default by `loadConfig` when the operator omits the key, so the
 * conditional fallback to the hardcoded default is defence-in-depth
 * against an unexpectedly empty value rather than the common path.
 */
function resolveSaasPackageGatesSignalRel(config: ConfigLoadResult["config"]): string {
  const configured = config.output.validateJsonPath;
  if (typeof configured !== "string" || configured.length === 0) {
    return SAAS_PACKAGE_GATES_SIGNAL_DEFAULT_REL;
  }
  return profileSuffixedReportPath(configured, "saas-package");
}

/**
 * Resolve the `--profile full` gates signal canonical path from a
 * loaded config. The recovery message emitted by the upgrade-scope
 * refusal path (when the saas-package signal is inadmissible)
 * instructs operators to re-run `qfai validate --profile full`, which
 * writes `.qfai/report/validate-full.json` via the same
 * {@link profileSuffixedReportPath} derivation. The reader probes this
 * fuller-profile path so that the recovery loop actually closes
 * (otherwise the upgrade would refuse forever even after the operator
 * follows the printed instruction).
 */
function resolveFullProfileGatesSignalRel(config: ConfigLoadResult["config"]): string {
  const configured = config.output.validateJsonPath;
  if (typeof configured !== "string" || configured.length === 0) {
    return FULL_PROFILE_GATES_SIGNAL_DEFAULT_REL;
  }
  return profileSuffixedReportPath(configured, "full");
}

const ROOT_DESIGN_MD_REL = "DESIGN.md";

/**
 * Frozen UI contract IDs are full CON-UI-NNNN values. The anchored shape
 * keeps review payload paths inside their iteration directories.
 */
const CANONICAL_SPEC_ID = /^CON-UI-\d{4}$/u;

/** Legacy `prototyping.json` shape (OC-60). Named so the code is greppable. */
const DEPRECATED_SCHEMA_CODE = "D-DEPRECATED-SCHEMA" as const;

export async function runPrototypingCertify(
  options: RunPrototypingCertifyOptions,
): Promise<number> {
  const toolVersion = await resolveToolVersion();
  if (options.check) {
    const result = await checkCompletionCertificate(options.root);
    // Digest equality only proves the sealed bytes are unchanged — it
    // says nothing about whether those bytes are valid review evidence.
    // A certificate sealed by a build whose gate was presence-only can
    // carry `{}` / `{"ok":true}` payloads, and re-checking it after a
    // package upgrade would keep reporting OK forever (the shipped
    // SKILL.md defines DONE as `certify --check` exit 0). Re-audit the
    // sealed payloads against the CURRENT schema / identity /
    // convergence rules, so the rules a fresh seal must satisfy are the
    // same rules an existing certificate is held to.
    const sealed = await loadCompletionCertificate(options.root);
    const payloadReasons =
      sealed === null ? [] : await auditSealedReviewPayloads(options.root, sealed);
    const reasons = [...(result.ok ? [] : result.reasons), ...payloadReasons];
    if (reasons.length === 0) {
      info("completion-certificate: OK (digests match, gates valid, review payloads audited)");
      return 0;
    }
    error("completion-certificate: MISMATCH");
    for (const reason of reasons) {
      error(`  - ${reason}`);
    }
    return 2;
  }

  // ─── Upgrade-scope path ────────────────────────────────────────────────────
  // `upgradeScopeFull` rewrites an existing scope-limited certificate in
  // place — promoting it to the canonical full-DONE shape — once the
  // previously-skipped gates pass against the current project state.
  // Branch BEFORE the regular write path so the upgrade is purely a
  // re-gate + cert-rewrite (no second full prototyping pipeline).
  if (options.upgradeScopeFull === true) {
    const { config: upgradeConfig } = await loadConfig(options.root);
    return runUpgradeScopeFull(options.root, upgradeConfig);
  }

  // ─── Generate mode ─────────────────────────────────────────────────────────
  const { config } = await loadConfig(options.root);
  const evidenceRoot = path.join(options.root, PROTOTYPING_EVIDENCE_REL);

  const protoJson = await loadJson(path.join(options.root, PROTOTYPING_JSON_REL));
  if (!protoJson) {
    error(
      `qfai prototyping certify: ${PROTOTYPING_JSON_REL} is missing or unparseable. ` +
        "Run prototyping rounds first.",
    );
    return 2;
  }
  const coveredRead = readUiContractsCovered(protoJson);
  if (coveredRead.kind !== "ok") {
    error(
      "qfai prototyping certify: prototyping.json#uiContractsCovered is missing, legacy, or " +
        "malformed. Re-seed with `qfai prototyping iterate --cycle 0`.",
    );
    return 2;
  }
  const frozenUnion = readStringArrayField(
    (protoJson as Record<string, unknown>).frozenSurfaceUnion,
  );
  if (
    frozenUnion === null ||
    frozenUnion.length === 0 ||
    frozenUnion.some((id) => !CANONICAL_SPEC_ID.test(id)) ||
    frozenUnion.length !== coveredRead.value.length ||
    frozenUnion.some((id, index) => id !== coveredRead.value[index])
  ) {
    error(
      "qfai prototyping certify: frozenSurfaceUnion must equal the cycle-0 " +
        "uiContractsCovered set. Re-seed with `qfai prototyping iterate --cycle 0`.",
    );
    return 2;
  }
  const liveUiContracts = await resolveSurfaceUnion(options.root, config);
  const scopeDrift = checkUiContractsCoveredDrift(frozenUnion, liveUiContracts);
  if (scopeDrift.drifted) {
    error(
      "qfai prototyping certify: UI contract scope drifted after cycle 0 " +
        `(added=${scopeDrift.added.join(",")} removed=${scopeDrift.removed.join(",")}). ` +
        "Re-run the prototyping loop from cycle 0.",
    );
    return 2;
  }

  // Accept the new top-level `runId` (written by `iterate` at cycle 0) and
  // fall back to the legacy `fullHarness.runId` shape for projects whose
  // prototyping.json predates the UX-loop schema rewrite.
  //
  // The fallback used to be silent. A hybrid record — modern `iterations[]`,
  // legacy `fullHarness.runId` — sealed a completion certificate with
  // `counts.error === 0` and no operator signal at all, while the migration
  // memo told the same operator the shape was retired. Reporting it follows
  // the legacy `verify.json` branch below: say so, and still seal. Refusing
  // outright would delete the acceptance path, which OC-60 forbids.
  const canonicalRunId = extractString(protoJson, "runId");
  const legacyRunId = extractString(extractRecord(protoJson, "fullHarness"), "runId");
  const runId = canonicalRunId ?? legacyRunId;
  if (!canonicalRunId && legacyRunId) {
    // The shape is retired and nothing reads it any more, so this is an error
    // outright.
    error(
      `qfai prototyping certify: ${DEPRECATED_SCHEMA_CODE} prototyping.json carries the legacy ` +
        `\`fullHarness.runId\` shape instead of a top-level \`runId\`. ` +
        `Re-run \`qfai prototyping iterate --cycle 0\` to write the current shape.`,
    );
  }
  if (!runId) {
    error(
      "qfai prototyping certify: prototyping.json#runId is required " +
        "before a completion certificate can be issued (set by `qfai prototyping iterate --cycle 0`).",
    );
    return 2;
  }

  // Prototyping-mode discriminator: certify cannot seal a loop that
  // produced any exploration-mode iteration. The check runs before
  // the profile validation / verify.json gates so the operator sees the
  // structural "exploration cannot certify" diagnostic without having
  // to re-run validate first.
  const earlyIterationViews = extractIterationViewsForCertify(protoJson);
  const earlyExplorationIssues = detectExplorationCertifyAttempt({
    iterations: earlyIterationViews,
  });
  if (earlyExplorationIssues.length > 0) {
    for (const issue of earlyExplorationIssues) {
      error(issue.message);
    }
    return 2;
  }

  const validateJsonPath = path.resolve(
    options.root,
    profileSuffixedReportPath(config.output.validateJsonPath, "prototyping"),
  );
  const validateJsonRel = path.relative(options.root, validateJsonPath).replace(/\\/g, "/");
  const validateJson = await loadJson(validateJsonPath);
  if (!validateJson) {
    error(
      `qfai prototyping certify: ${validateJsonRel} is missing. ` +
        "Run `qfai validate --profile prototyping --fail-on error` first.",
    );
    return 2;
  }
  // Profile-mismatch gate: when the dedicated result was produced by
  // a profile OTHER than `prototyping`, certify refuses and prints both
  // the observed and expected profile names plus the recovery command.
  // The check runs before the counts.error check so the operator-facing
  // diagnostic surfaces the real problem (wrong profile) instead of a
  // downstream counts-could-not-be-asserted error.
  const observedProfile = extractString(validateJson, "profile");
  const EXPECTED_PROFILE = "prototyping" as const;
  if (typeof observedProfile === "string" && observedProfile !== EXPECTED_PROFILE) {
    error(
      `qfai prototyping certify: ${validateJsonRel} was produced by profile="${observedProfile}" ` +
        `but certify requires profile="${EXPECTED_PROFILE}". ` +
        `Recovery: run \`qfai validate --profile ${EXPECTED_PROFILE} --fail-on error\` ` +
        "and rerun certify.",
    );
    return 2;
  }
  const errorCount = extractNumber(extractRecord(validateJson, "counts"), "error") ?? -1;
  if (errorCount !== 0) {
    error(
      `qfai prototyping certify: ${validateJsonRel} reports ${errorCount} error(s); ` +
        "all must be 0 before certification.",
    );
    return 2;
  }
  // Freshness gate. The three checks above say the stored result PASSED; none
  // of them says it passed against the tree about to be sealed. So a success
  // recorded while a flat `review.json` was present let certify seal a
  // contract-scoped layout the current `validate` rejects, and the certificate
  // recorded `validateRun.ranAt` as the CERTIFY instant — a timestamp
  // manufactured at the moment the question became unanswerable.
  //
  // Known limitations, carried forward from the sibling mtime check below
  // rather than dropped: filesystem granularity can make a write in the same
  // second look not-newer, and an mtime is not tamper-resistant. Linking the
  // certificate to the run by content digest is the stronger form and needs
  // its own decision; this makes the relation exist at all.
  const validateRanAtRaw = extractString(validateJson, "generatedAt");
  const validateRanAt =
    validateRanAtRaw !== undefined && !Number.isNaN(Date.parse(validateRanAtRaw))
      ? validateRanAtRaw
      : null;
  // A missing `generatedAt` is an OLDER WRITER, not a failed check, and it is
  // reported rather than refused. The issue asks certify to refuse when the
  // evidence is newer than the run; refusing when the run carries no instant
  // would also reject every profile result written before this field existed,
  // for a condition none of them can express. Any `validate` run on this
  // version stamps it, so the window is one stale file wide and the next run
  // closes it.
  if (validateRanAt === null) {
    info(
      `  note: ${validateJsonRel} carries no generatedAt (written by an earlier version), ` +
        "so this certification could not be checked against the age of the evidence. " +
        "Re-run `qfai validate --profile prototyping --fail-on error` to get that check.",
    );
  }
  const newerThanRun =
    validateRanAt === null
      ? []
      : await findEvidenceNewerThan(
          options.root,
          path.join(options.root, PROTOTYPING_EVIDENCE_REL),
          Date.parse(validateRanAt),
        );
  if (newerThanRun.length > 0) {
    error(
      [
        `qfai prototyping certify: ${newerThanRun.length} evidence file(s) changed after ` +
          `${validateJsonRel} was written (${validateRanAt}), so that result is not a ` +
          "verdict on the tree being sealed:",
        ...newerThanRun.slice(0, 10).map((rel) => `  - ${rel}`),
        ...(newerThanRun.length > 10 ? [`  ... and ${newerThanRun.length - 10} more`] : []),
        "Run `qfai validate --profile prototyping --fail-on error` and rerun certify.",
      ].join("\n"),
    );
    return 2;
  }

  // Canonical `.qfai/report/verify.json` first, legacy `.qfai/output/` as a
  // fallback — the same shape `validate.json` and the saas-package gates
  // signal already use in this file.
  const verifyRead = await readVerifyJson(options.root);
  if (verifyRead.source === "unreadable") {
    // A gate file that exists but cannot be parsed is a broken gate, not an
    // absent one. Certifying from the other location here would mean issuing a
    // certificate off a stale result while the real one was never readable.
    error(
      `qfai prototyping certify: ${verifyRead.rel} exists but is not a usable verify ` +
        `result (${verifyRead.error ?? "unknown error"}). Fix or remove the file and ` +
        "re-run `/qfai-verify`; certify does not fall back to another location while " +
        "this one is broken.",
    );
    return 2;
  }
  if (verifyRead.source === "legacy") {
    error(
      `qfai prototyping certify: read ${VERIFY_JSON_LEGACY_REL} (legacy). ` +
        `Move it to ${VERIFY_JSON_REL}; the legacy location will stop being read.`,
    );
  }
  // A missing file is not a failing verify. Without this branch the run fell
  // through to the `status must be PASS` message below, which sends the
  // operator to look at a status in a file that does not exist.
  if (verifyRead.source === "missing") {
    error(
      `qfai prototyping certify: ${VERIFY_JSON_REL} is missing ` +
        `(${VERIFY_JSON_LEGACY_REL} was not there either). ` +
        "Run `/qfai-verify` with the prototyping scope to produce it, then re-run certify.",
    );
    return 2;
  }
  const verifyStatus = extractString(verifyRead.json, "status");
  if (verifyStatus !== "PASS") {
    error(
      `qfai prototyping certify: ${verifyRead.rel} status must be PASS ` +
        "(run `/qfai-verify` and ensure it reports PASS).",
    );
    return 2;
  }
  // Scope discriminator: when `verify.json#scope` is present, certify
  // recognises the `"prototyping"` value as satisfying the prototyping
  // DONE condition without requiring ATDD / implement artefacts.
  // Non-prototyping scopes (`atdd` / `implement` / `full`) are refused
  // at the certify gate so the operator hits a single clear error
  // before any downstream artifact is touched. The same circular-read
  // class is enforced as a validator finding by
  // `core/validators/reviewerGate.ts::detectCertifyVerifyCircular`
  // (R-CERTIFY-VERIFY-CIRCULAR); this CLI-side gate keeps the certify
  // command self-contained instead of relying on a downstream validate
  // pass to surface the same condition.
  const verifyScope = extractString(verifyRead.json, "scope");
  if (verifyScope !== undefined && verifyScope !== "prototyping") {
    // This is the enforcement for the circular-read class. The validator
    // finding is `info` because a `scope: "full"` verdict on disk is not damage
    // — a full-profile run records it truthfully, and making it an `error`
    // repo-wide left `/qfai-verify` with no honest value to write outside Work
    // Order H. Consuming such a verdict here is the actual defect, and
    // this refuses it.
    error(
      `qfai prototyping certify: ${verifyRead.rel} scope is "${verifyScope}" but the ` +
        'prototyping certify gate accepts only scope="prototyping". ' +
        "Close the prototyping loop, then re-run `/qfai-verify` for Work Order H so the file " +
        'records scope="prototyping" before certification ' +
        "(ATDD / implement / full scopes are forbidden by the option-B phase-isolation contract).",
    );
    return 2;
  }

  const reviewerGate = extractRecord(protoJson, "reviewerGate");
  if (!reviewerGate || extractString(reviewerGate, "result") !== "PASS") {
    error("qfai prototyping certify: prototyping.json.reviewerGate.result must be PASS.");
    return 2;
  }

  // DESIGN.md compliance gate — refuse to seal a certificate when the
  // final iteration drifts from the frozen brand SSOT.
  const designMdAbs = path.join(options.root, ROOT_DESIGN_MD_REL);
  let designMdText: string;
  try {
    designMdText = await readFile(designMdAbs, "utf-8");
  } catch {
    error(
      "qfai prototyping certify: root DESIGN.md is missing — the brand SSOT must exist before certification.",
    );
    return 2;
  }
  const designMdParsed = parseDesignMd(designMdText);
  if ("error" in designMdParsed) {
    error(
      "qfai prototyping certify: root DESIGN.md failed to parse — " +
        `${designMdParsed.error.message}.`,
    );
    return 2;
  }
  // Anchor the final-iter HTML scan to the iteration count actually
  // recorded in prototyping.json — NOT the highest iter-NN dir on disk.
  // After a `qfai prototyping iterate --cycle 0` reset, stale `iter-NN/`
  // directories from the prior run can survive on disk; selecting by
  // filesystem max would let certify digest evidence the current
  // reviewer gate did not approve.
  const iterationCount = countIterations(protoJson);
  if (iterationCount === 0) {
    error(
      "qfai prototyping certify: prototyping.json#iterations is empty — " +
        "complete at least one iteration before certification.",
    );
    return 2;
  }

  // Resolve the certify-accepted iteration index from the convergence-
  // mode-only iterations. The earlier `earlyExplorationIssues` block
  // (above) already hard-refuses any exploration-mode iteration with
  // exit 2; `protoJson` is not reassigned between that block and here,
  // so reuse the same view rather than rescanning the payload. Today
  // every reachable iteration is convergence (mixed-mode is rejected
  // above), so this resolves to the highest iteration index — but the
  // helper is the SSOT shape so the future mixed-mode reuse stays honest.
  const resolvedAcceptedIndex = resolveCertifyAcceptedIterationIndex(earlyIterationViews);
  const acceptedIterationIndex =
    resolvedAcceptedIndex !== null ? resolvedAcceptedIndex : iterationCount - 1;
  const acceptedIterDir = `iter-${String(acceptedIterationIndex).padStart(2, "0")}`;
  const finalHtmlPaths = await findIterationHtmlFiles(evidenceRoot, acceptedIterationIndex);
  if (finalHtmlPaths.length === 0) {
    error(
      "qfai prototyping certify: no HTML found under " +
        `${PROTOTYPING_EVIDENCE_REL}/${acceptedIterDir}/ ` +
        "(the iteration recorded in prototyping.json#iterations[]). " +
        "Run the capture step for the accepted iteration before certification.",
    );
    return 2;
  }
  // Accepted-iteration HTML must cover every declared route. Review payloads
  // remain scoped to each UI contract below.

  const screenContracts = await readUiContractScreenContracts(
    options.root,
    config.paths.contractsDir,
  );
  const uiContractsPath = path.join(config.paths.contractsDir, "ui").replace(/\\/g, "/");
  if (screenContracts.length > 0) {
    const presentScreenIds = new Set<string>();
    for (const htmlPath of finalHtmlPaths) {
      const base = path.basename(htmlPath);
      const stem = base.replace(/\.html$/i, "");
      presentScreenIds.add(stem);
    }
    const missing = screenContracts.filter((s) => !presentScreenIds.has(s.screenId));
    if (missing.length > 0) {
      error(
        "qfai prototyping certify: accepted iteration " +
          `${acceptedIterDir} is missing HTML for ${missing.length} declared screen(s):`,
      );
      for (const m of missing.slice(0, 10)) {
        error(
          `  - ${m.screenId} (expected ${PROTOTYPING_EVIDENCE_REL}/${acceptedIterDir}/${m.screenId}.html)`,
        );
      }
      // Name the authoring artifact explicitly. The paths above are
      // CAPTURE OUTPUT, not what the generator authors — an operator
      // whose `.qfai/prototype/iter-NN/index.html` is complete
      // otherwise reads this as "my prototype is missing screens",
      // when the real cause is that the capture step never ran or
      // could not reach those routes.
      error(
        `  These are capture outputs, not authored files. The generator writes ` +
          `${PROTOTYPE_REL}/${acceptedIterDir}/index.html; ` +
          "`qfai prototyping iterate --capture` is what fans that out to one " +
          `${PROTOTYPING_EVIDENCE_REL}/${acceptedIterDir}/<screenId>.html per declared screen.`,
      );
      // Recovery must be reachable. Re-invoking the accepted cycle with
      // `--capture` is NOT: the iteration is already recorded, so
      // `evaluateCycleGteOneGate` rejects it with "expected --cycle
      // <iterations.length>" before capture runs, and cycle 0 refuses an
      // existing iter-00 without `--force`. There is no capture-only
      // entry point today, so the two routes below are the ones an
      // operator can actually execute.
      // Keep this in step with `defaultServerRunner.ts#resolveServablePath`
      // and the routing-shapes list in `generator-prompt.md`: --auto-serve
      // has an SPA fallback, so telling the operator to reshape contract
      // routes into hash routes would contradict the prompt the generator
      // is given and rewrite the contract for nothing.
      error(
        "  Recovery: first make each missing screen's contract route reachable from the " +
          "capture target. The built-in --auto-serve server serves index.html to any document " +
          "request that matches no file, so path routes resolve as long as the served " +
          "directory has an index.html — a skeleton-only tree (--emit-skeletons writes " +
          "<screenId>.html and no index.html) has nothing to fall back to and still 404s, so " +
          "author index.html alongside the skeletons. Do not reshape contract routes into hash " +
          "routes. Against --target-url, the route must be reachable on whatever that server " +
          "does with an unknown path. " +
          "Then re-run the loop from cycle 0. Re-invoking the accepted cycle with --capture " +
          "will not work: that iteration is already recorded in prototyping.json#iterations, " +
          "so iterate exits first on the expected-next-cycle gate. If a listed screen is no " +
          `longer part of the product, delete it from ${uiContractsPath}/ AND still re-run the ` +
          "loop from cycle 0 — deleting alone is not a shortcut past this gate. certify " +
          "recomputes the declared-screen set from the contracts on every run, so a bare " +
          "deletion silently drops that screen's HTML and UI contract review.json checks while " +
          "the already-recorded validate.json, verify.json and reviewerGate results — produced " +
          "against the old scope — are re-used as they are, sealing a certificate whose " +
          "evidence never covered the screen you were experimenting on.",
      );
      error(
        "  The cycle-0 re-run is DESTRUCTIVE, and --force does not make it safe: it renames " +
          "only iter-00 to iter-00.backup-<ISO>, and moves the aggregate screenshots/ and " +
          "html/ to aggregate.backup-<ISO>. Everything else in " +
          `${PROTOTYPING_EVIDENCE_REL}/ is then reset — iter-01 and up are deleted outright, ` +
          "and prototyping.json#iterations / #reviewerGate are cleared. Copy the whole " +
          `${PROTOTYPING_EVIDENCE_REL}/ directory somewhere safe first if the earlier ` +
          "iterations still matter.",
      );
      return 2;
    }
  }

  // Every frozen UI contract requires a review for each screen it declares.
  // The project-wide HTML capture gate above remains separate from these
  // contract-scoped reviewer payloads.
  const frozenSpecsPreview = coveredRead.value;
  const uiInventory = await readUiContractInventory(options.root, config);
  if (frozenSpecsPreview.length > 0) {
    const acceptedIterAbs = path.join(options.root, PROTOTYPING_EVIDENCE_REL, acceptedIterDir);
    const hasPerSpecLayout = await hasPerSpecSubdir(acceptedIterAbs);
    if (!hasPerSpecLayout && frozenSpecsPreview.length > 1) {
      // A missing contract directory is a coverage failure.
      error(
        `qfai prototyping certify: accepted iteration ${acceptedIterDir} carries a ` +
          `UI contract set (uiContractsCovered=${JSON.stringify(frozenSpecsPreview)}) ` +
          "but no iter-NN/CON-UI-NNNN/<screen>.review.json layout is present. " +
          "Each declared contract and screen requires its own review payload.",
      );
      // Exit 64 covers missing reviewer evidence.
      return EXIT_CODES.prototypingStop;
    } else {
      if (!hasPerSpecLayout) {
        // State the required layout before listing missing pairs.
        info(
          `qfai prototyping certify: ${acceptedIterDir}/CON-UI-NNNN layout not detected — ` +
            "every declared UI contract and screen needs its review payload under the contract directory.",
        );
      }
      const missingPairs: Array<{ spec: string; screen: string; expectedPath: string }> = [];
      const invalidPayloads: PayloadFailure[] = [];
      // A payload can be schema-perfect and still not be evidence for
      // the pair it is filed under (copied from another spec / screen /
      // cycle), or contradict the summary PASS it is supposed to
      // support. Keep the three rejection reasons in separate buckets
      // so the operator diagnostic names the actual defect class.
      const mismatchedPayloads: PayloadFailure[] = [];
      const unconvergedPayloads: PayloadFailure[] = [];
      // One handle over the three buckets so the stray-payload sweep
      // files its findings in exactly the same classes as the
      // declared-pair sweep.
      const sink: PayloadFailureSink = {
        invalid: invalidPayloads,
        mismatched: mismatchedPayloads,
        unconverged: unconvergedPayloads,
      };
      // Read each contract's declared screens before requiring pair evidence.
      for (const rawSpec of frozenSpecsPreview) {
        const specDirName = rawSpec;
        const contract = uiInventory.find((entry) => entry.uiContractId === specDirName);
        if (!contract || contract.screenIds.length === 0) {
          error(`qfai prototyping certify: ${specDirName} has no declared screens[] to review.`);
          return 2;
        }
        // A contract is responsible for its own declared screens.
        const scopedScreens = contract.screenIds.map((screenId) => ({ screenId }));
        for (const screen of scopedScreens) {
          const rel = `${PROTOTYPING_EVIDENCE_REL}/${acceptedIterDir}/${specDirName}/${screen.screenId}.review.json`;
          const abs = path.join(options.root, rel);
          const exists = await fileExists(abs);
          if (!exists) {
            missingPairs.push({
              spec: specDirName,
              screen: screen.screenId,
              expectedPath: rel,
            });
            continue;
          }
          // Presence alone is not evidence: a truncated, empty or
          // `{}`-only payload used to seal a certificate because the
          // gate never opened the file. The shipped reference
          // (`.qfai/assistant/skill/qfai-prototyping/references/review-payload-schema.md`)
          // declares the payload a CLOSED schema whose violation is a
          // hard failure, so parse it here with the same parser the
          // reference documents — then check that what parsed actually
          // reviewed THIS pair at THIS cycle and agrees with the
          // reviewerGate PASS that got us here.
          const audit = await auditReviewPayload(abs, {
            specDirName,
            screenId: screen.screenId,
            cycle: acceptedIterationIndex,
          });
          if (audit.schemaErrors.length > 0) {
            invalidPayloads.push({ expectedPath: rel, errors: audit.schemaErrors });
            continue;
          }
          if (audit.identityErrors.length > 0) {
            mismatchedPayloads.push({ expectedPath: rel, errors: audit.identityErrors });
          }
          if (audit.convergenceErrors.length > 0) {
            unconvergedPayloads.push({ expectedPath: rel, errors: audit.convergenceErrors });
          }
        }
        // The expected-path sweep above only opens the payloads the
        // declared screens name. `buildCompletionCertificate` digests
        // every file under the evidence root, so a payload left behind
        // by a since-deleted screen (`old.review.json`) would be sealed
        // into the certificate without ever being read — exactly the
        // "present-but-unparsable payload is not evidence" case the
        // shipped reference says certify rejects. Audit every
        // `*.review.json` actually on disk in the per-spec directory,
        // holding a stray file against the screen its own filename
        // claims.
        await auditStrayPayloads({
          root: options.root,
          specDirRel: `${PROTOTYPING_EVIDENCE_REL}/${acceptedIterDir}/${specDirName}`,
          specDirName,
          cycle: acceptedIterationIndex,
          skipScreens: new Set(scopedScreens.map((s) => s.screenId)),
          sink,
        });
      }
      // UI contract directories outside the frozen set are never visited by
      // the loop above, yet the certificate digests them all the same:
      // an `old.review.json` under a contract directory that dropped out
      // of the frozen set would ship unread. Sweep every canonical
      // contract directory the accepted iteration actually holds.
      const frozenDirNames = new Set(frozenSpecsPreview);
      for (const straySpecDir of await listSpecDirs(acceptedIterAbs)) {
        if (frozenDirNames.has(straySpecDir)) continue;
        await auditStrayPayloads({
          root: options.root,
          specDirRel: `${PROTOTYPING_EVIDENCE_REL}/${acceptedIterDir}/${straySpecDir}`,
          specDirName: straySpecDir,
          cycle: acceptedIterationIndex,
          skipScreens: new Set<string>(),
          sink,
        });
      }
      // Finally, payloads that live under no canonical UI contract
      // directory at all — a flat `iter-NN/<screen>.review.json`, or one
      // parked under another sibling folder. The certificate's
      // digest walk is recursive over the whole evidence root, so these
      // ship sealed as well; audit what can be audited (schema +
      // convergence + the screen / cycle their own path claims). Their
      // `uiContractId` is not anchored by a directory, so identity is checked
      // on the two discriminators the path does carry.
      for (const rel of await listStrayIterationPayloads(acceptedIterAbs)) {
        const payloadRel = `${PROTOTYPING_EVIDENCE_REL}/${acceptedIterDir}/${rel}`;
        const audit = await auditReviewPayload(
          path.join(acceptedIterAbs, rel),
          payloadExpectationFromRel(rel, acceptedIterationIndex),
        );
        if (audit.schemaErrors.length > 0) {
          invalidPayloads.push({ expectedPath: payloadRel, errors: audit.schemaErrors });
          continue;
        }
        if (audit.identityErrors.length > 0) {
          mismatchedPayloads.push({ expectedPath: payloadRel, errors: audit.identityErrors });
        }
        if (audit.convergenceErrors.length > 0) {
          unconvergedPayloads.push({ expectedPath: payloadRel, errors: audit.convergenceErrors });
        }
      }
      if (missingPairs.length > 0) {
        error(
          "qfai prototyping certify: accepted iteration " +
            `${acceptedIterDir} is missing review.json for ${missingPairs.length} ` +
            "(UI contract, screen) pair(s):",
        );
        // Cap the per-pair log output to keep operator-facing stderr
        // bounded on large frozen sets — same pattern as the
        // missing-HTML branch above (`missing.slice(0, 10)`).
        for (const m of missingPairs.slice(0, 20)) {
          error(`  - ${m.spec} / ${m.screen} (expected ${m.expectedPath})`);
        }
        // Missing reviewer evidence is a coverage rejection.
        return EXIT_CODES.prototypingStop;
      }
      if (invalidPayloads.length > 0) {
        reportPayloadFailures(
          "qfai prototyping certify: accepted iteration " +
            `${acceptedIterDir} has ${invalidPayloads.length} review.json payload(s) that ` +
            "do not satisfy the reviewer payload schema " +
            "(.qfai/assistant/skill/qfai-prototyping/references/review-payload-schema.md):",
          invalidPayloads,
        );
        // A malformed payload is the same evidence gap as a missing
        // one — the (UI contract, screen) pair carries no parsable review —
        // so it shares the coverage rejection code (exit 64) instead
        // of introducing a third exit code for the same class.
        return EXIT_CODES.prototypingStop;
      }
      // A schema-valid payload copied in from another screen, another
      // UI contract, or an earlier cycle parses cleanly while reviewing
      // something else entirely. The payload's own
      // `(uiContractId, screenId, cycle)` discriminators exist precisely to
      // make that detectable, so hold them against the pair and the
      // accepted iteration this file is filed under.
      if (mismatchedPayloads.length > 0) {
        reportPayloadFailures(
          "qfai prototyping certify: accepted iteration " +
            `${acceptedIterDir} has ${mismatchedPayloads.length} review.json payload(s) whose ` +
            "(uiContractId, screenId, cycle) identity does not match the (UI contract, screen) pair and " +
            "accepted iteration they are stored under — a payload copied from another pair or " +
            "cycle is not evidence for this one:",
          mismatchedPayloads,
        );
        // Same class as a missing payload: the pair still carries no
        // review of ITS OWN surface.
        return EXIT_CODES.prototypingStop;
      }
      // `reviewerGate.result === "PASS"` is a summary claim (gated
      // above); the per-screen payloads are the evidence behind it.
      // Convergence is an AND over every (spec, screen) pair — a
      // completed Reviewer session (`sessionStatus: "ok"`) and
      // `blockingFindings`, `layoutAntiPatternsDetected` and
      // `designMdViolations` all empty (see
      // `core/prototyping/iteration.ts::iterationConverged` /
      // `shouldStopAcrossSpecs`) — so a payload that fails it
      // contradicts the summary, and sealing the certificate on top of
      // that contradiction is exactly the drift certify exists to stop.
      if (unconvergedPayloads.length > 0) {
        reportPayloadFailures(
          "qfai prototyping certify: prototyping.json#reviewerGate.result is PASS but accepted " +
            `iteration ${acceptedIterDir} has ${unconvergedPayloads.length} review.json ` +
            "payload(s) that contradict convergence (every (spec, screen) pair needs " +
            '`sessionStatus: "ok"` with blockingFindings, ' +
            "layoutAntiPatternsDetected and designMdViolations empty):",
          unconvergedPayloads,
        );
        // Non-converged per-screen evidence is the same evidence-gap
        // class as a missing or unparsable payload: the pair has no
        // review that supports certification.
        return EXIT_CODES.prototypingStop;
      }
    }
  }
  // Multi-screen specs emit one HTML artifact per screen under the
  // same iter-NN directory. Every file must pass the DESIGN.md gate;
  // a clean home.html does not absolve a drifting settings.html.
  const violationsByPath: Array<{ path: string; violations: DesignMdViolation[] }> = [];
  for (const htmlPath of finalHtmlPaths) {
    const html = await readFile(htmlPath, "utf-8");
    const fileViolations = findDesignMdViolations(html, designMdParsed.data);
    if (fileViolations.length > 0) {
      violationsByPath.push({
        path: path.relative(options.root, htmlPath).replace(/\\/g, "/"),
        violations: fileViolations,
      });
    }
  }
  if (violationsByPath.length > 0) {
    const totalViolations = violationsByPath.reduce(
      (sum, entry) => sum + entry.violations.length,
      0,
    );
    error(
      `qfai prototyping certify: ${totalViolations} DESIGN.md violation(s) detected across ` +
        `${violationsByPath.length} final iteration HTML file(s):`,
    );
    let logged = 0;
    for (const entry of violationsByPath) {
      error(`  ${entry.path}:`);
      for (const v of entry.violations) {
        if (logged >= 20) break;
        error(`    - kind=${v.kind} found="${v.found}"`);
        logged += 1;
      }
      if (logged >= 20) break;
    }
    return 2;
  }

  const reviewerSignoff = extractRecord(reviewerGate, "signoff");
  const reviewerId =
    extractString(reviewerSignoff, "reviewerId") ??
    extractString(reviewerSignoff, "reviewer") ??
    "unknown";
  const reviewerTimestamp = extractString(reviewerSignoff, "timestamp") ?? new Date().toISOString();

  // Seal the same frozen UI contract set whose review payloads passed above.

  const uiContractsCovered = coveredRead.value;
  // Frozen-loop hash invariant: the certificate must record the sha256
  // that was frozen at cycle 0 in prototyping.json (and, when the SDD
  // lock is present, the lock value too). Recording the live re-hash
  // would let a brand-body edit between the final iter and certify
  // silently re-baseline the cert against an SSOT that was not used
  // during the loop.
  const currentSha = hashDesignMd(designMdText);
  const frozenSha = extractString(extractRecord(protoJson, "designMd"), "sha256");
  if (!frozenSha) {
    error(
      "qfai prototyping certify: prototyping.json#designMd.sha256 is missing — re-run " +
        "prototyping from cycle 0 to record the frozen DESIGN.md sha256.",
    );
    return 2;
  }
  if (frozenSha !== currentSha) {
    error(
      "qfai prototyping certify: root DESIGN.md sha256 (" +
        `${currentSha}) differs from the frozen value in prototyping.json (${frozenSha}). ` +
        "DESIGN.md was edited after the loop completed; re-run prototyping from cycle 0.",
    );
    return 2;
  }
  const lockResult = await loadLockGate(options.root, config.paths.contractsDir);
  if (lockResult.kind === "malformed") {
    error(
      "qfai prototyping certify: DESIGN.md.lock.yaml exists but " +
        "designMdSha256 is missing or not a 64-character hex string. " +
        "Re-run the design lock step of /qfai-sdd to regenerate the lock before sealing.",
    );
    return 2;
  }
  if (lockResult.kind === "unreadable") {
    const cause =
      lockResult.cause instanceof Error ? lockResult.cause.message : String(lockResult.cause);
    error(
      "qfai prototyping certify: DESIGN.md.lock.yaml exists but could not be read " +
        `(${cause}). The freeze invariant cannot be enforced when the lock is ` +
        "unreadable; fix file permissions / EIO and rerun.",
    );
    return 2;
  }
  const lockSha = lockResult.kind === "ok" ? lockResult.sha256 : null;
  if (lockSha !== null && lockSha !== frozenSha) {
    error(
      "qfai prototyping certify: DESIGN.md.lock.yaml sha256 (" +
        `${lockSha}) differs from the loop-frozen value (${frozenSha}). ` +
        "Refreeze and re-run prototyping from cycle 0.",
    );
    return 2;
  }
  // The completion certificate digests every file under `evidenceRoot`,
  // so a stale `iter-NN` dir from a prior loop (NN >= recorded
  // iterationCount) would otherwise be sealed into `evidenceDigests`
  // and would cause `certify --check` to fail later if the operator
  // cleans up the stale dir even though the accepted iteration is
  // unchanged. Fail-fast and force the operator to rerun cycle 0
  // (which the round-5 hard-reset removes the stale dirs) or delete
  // them manually before sealing.
  let staleIterDirs: string[];
  try {
    staleIterDirs = await findStaleIterDirs(evidenceRoot, iterationCount);
  } catch (err) {
    // findStaleIterDirs propagates non-ENOENT fs errors (EACCES /
    // EPERM / EIO) instead of swallowing them, so a permission flip
    // cannot silently bypass the stale-iter guard — symmetric with the
    // lock `unreadable` path. Surface a clear operator-facing message
    // instead of letting the raw error stack escape.
    const cause = err instanceof Error ? err.message : String(err);
    error(
      `qfai prototyping certify: failed to scan ${PROTOTYPING_EVIDENCE_REL} for stale ` +
        `iteration directories (${cause}). The freeze invariant cannot be enforced when ` +
        "the evidence dir is unreadable; fix file permissions / EIO and rerun.",
    );
    return 2;
  }
  if (staleIterDirs.length > 0) {
    error(
      "qfai prototyping certify: stale iteration directories found under " +
        `${PROTOTYPING_EVIDENCE_REL} (recorded iterationCount=${iterationCount}, ` +
        `but found: ${staleIterDirs.join(", ")}). These would be sealed into ` +
        "the certificate's evidenceDigests and break --check after cleanup. " +
        "Re-run `qfai prototyping iterate --cycle 0` (which deletes stale " +
        "iter-NN dirs as part of the hard reset) or remove them manually, " +
        "then rerun certify.",
    );
    return 2;
  }

  const designMdRecord: CompletionCertificateDesignMd = {
    path: ROOT_DESIGN_MD_REL,
    sha256: frozenSha,
  };

  // Scope-limited posture: when `--scope saas-package` is set, attach
  // the `scope` marker plus a `notes[]` array enumerating the gates the
  // saas-package profile deliberately skips. `--scope full` (or omitted)
  // seals the canonical full-DONE certificate with no scope/notes
  // fields.
  const isSaasPackageScope = options.scope === "saas-package";
  const saasPackageNotes = isSaasPackageScope
    ? SAAS_PACKAGE_SKIPPED_GATES.map(formatSaasPackageSkipNote)
    : undefined;

  const cert = await buildCompletionCertificate({
    runId,
    toolVersion,
    evidenceRoot,
    // The run's own instant when the result carries one. `new Date()` here
    // recorded when the CERTIFICATE was built and called it when validation
    // ran, so a certificate could not be audited for the very relation it was
    // standing for. The fallback is that old behaviour and applies only
    // to a `validate.json` written before `generatedAt` existed.
    validateRun: { errorCount: 0, ranAt: validateRanAt ?? new Date().toISOString() },
    verifyRun: { status: "PASS", ranAt: new Date().toISOString() },
    reviewerSignoff: {
      reviewerId,
      approved: true,
      timestamp: reviewerTimestamp,
    },
    iterationCount,
    uiContractsCovered,
    convergedUiContracts: uiContractsCovered,
    laggingUiContracts: [],
    designMd: designMdRecord,
    ...(isSaasPackageScope ? { scope: "saas-package" as const } : {}),
    ...(saasPackageNotes ? { notes: saasPackageNotes } : {}),
  });

  const certPath = await writeCompletionCertificate(options.root, cert);
  info(`qfai prototyping certify: wrote ${certPath}`);
  info(`  runId: ${runId}`);
  info(`  evidenceFiles: ${cert.evidenceDigests.length}`);
  info(`  uiContractsCovered: ${uiContractsCovered.join(", ") || "(none)"}`);
  info(`  designMd: ${designMdRecord.path} sha256=${designMdRecord.sha256.slice(0, 12)}...`);
  return 0;
}

type LockGateResult =
  | { kind: "ok"; sha256: string }
  | { kind: "missing" }
  | { kind: "malformed" }
  | { kind: "unreadable"; cause: unknown };

async function loadLockGate(root: string, contractsDir: string): Promise<LockGateResult> {
  const lockAbs = path.join(root, contractsDir, "design", "DESIGN.md.lock.yaml");
  let text: string;
  try {
    text = await readFile(lockAbs, "utf-8");
  } catch (err) {
    if (isEnoent(err)) return { kind: "missing" };
    return { kind: "unreadable", cause: err };
  }
  const sha = readDesignMdLockSha(text);
  return sha !== null ? { kind: "ok", sha256: sha } : { kind: "malformed" };
}

/**
 * Print the frozen UI contract scope, the current live scope, and the
 * selected primary contract. Missing or legacy state exits 2.
 */
export async function runPrototypingShowUiContract(options: { root: string }): Promise<number> {
  const { config } = await loadConfig(options.root);
  const protoRaw = await loadJson(path.join(options.root, PROTOTYPING_JSON_REL));
  const covered = readUiContractsCovered(protoRaw);
  if (covered.kind !== "ok") {
    error(
      "qfai prototyping show-ui-contract: prototyping.json#uiContractsCovered is missing, " +
        "legacy, or malformed. Re-seed with `qfai prototyping iterate --cycle 0`.",
    );
    return 2;
  }
  if (typeof protoRaw !== "object" || protoRaw === null || Array.isArray(protoRaw)) return 2;
  const frozenSurfaceUnion = readStringArrayField(
    (protoRaw as Record<string, unknown>).frozenSurfaceUnion,
  );
  if (
    frozenSurfaceUnion === null ||
    frozenSurfaceUnion.length === 0 ||
    frozenSurfaceUnion.some((id) => !CANONICAL_SPEC_ID.test(id))
  ) {
    error(
      "qfai prototyping show-ui-contract: frozenSurfaceUnion is missing or malformed. " +
        "Re-seed with `qfai prototyping iterate --cycle 0`.",
    );
    return 2;
  }
  const liveUiBearing = await resolveSurfaceUnion(options.root, config);
  const primary = await resolvePrimaryPrototypingSpec(options.root, config);
  const payload: Record<string, unknown> = {
    uiContractsCovered: covered.value,
    frozenSurfaceUnion,
    liveUiBearing,
  };
  if (primary !== undefined) payload.primary = primary;
  info(JSON.stringify(payload, null, 2));
  return 0;
}
/**
 * Implementation of `--upgrade-scope full`. Reads the existing
 * scope-limited certificate, re-gates the previously-skipped saas-
 * package gates against the current project state, and — when all
 * pass — rewrites the certificate WITHOUT the scope-limited markers
 * (no `scope`, no `notes`). If any named gate is still missing /
 * failing, exits non-zero and names the still-missing gates on
 * stderr.
 *
 * The gate-pass signal lives at the validate-side profile-suffixed
 * report path — derived at runtime from the loaded
 * `config.output.validateJsonPath` (default
 * `.qfai/report/validate-saas-package.json`). The legacy
 * `.qfai/output/validate-saas-package.json` is read as a fallback
 * during the `D-DEPRECATED-PATH` deprecation window.
 * The file is a validate-style record produced by re-running
 * `qfai validate --profile saas-package` against the now-complete
 * surface. Pragmatic shortcut: the upgrade path checks for that
 * single signal (presence, `counts.error === 0`, and per-gate
 * `status === "PASS"` for each name in `SAAS_PACKAGE_SKIPPED_GATES`)
 * rather than re-invoking every validator inline. Operators run
 * `qfai validate --profile saas-package` to produce the signal,
 * then `qfai prototyping certify --upgrade-scope full` consumes it.
 */
async function runUpgradeScopeFull(
  root: string,
  config: ConfigLoadResult["config"],
): Promise<number> {
  const canonicalSignalRel = resolveSaasPackageGatesSignalRel(config);
  const fullProfileSignalRel = resolveFullProfileGatesSignalRel(config);
  const cert = await loadCompletionCertificate(root);
  if (!cert) {
    error(
      "qfai prototyping certify: cannot upgrade scope — completion-certificate.json " +
        "is missing or unparseable. Seal a scope-limited certificate first " +
        "(e.g. `qfai prototyping certify --scope saas-package`).",
    );
    return 2;
  }
  if (typeof cert.scope !== "string" || cert.scope.length === 0) {
    error(
      "qfai prototyping certify: cannot upgrade scope — the existing certificate " +
        "carries no `scope` marker (already full-scope). Re-run without " +
        "--upgrade-scope.",
    );
    return 2;
  }

  // Re-gate against the saas-package gates signal. Read it once; treat
  // missing / malformed / non-PASS entries as "still skipped" and name
  // them in stderr. This keeps the upgrade path purely a re-gate
  // operation grounded in evidence files already produced by the
  // validate-side surface.
  //
  // Canonical path is checked first; the legacy `.qfai/output/...`
  // path is read only when the canonical signal is absent (back-compat
  // for older consumer state). When the legacy path is used a
  // one-line stderr note surfaces the fallback so operators can
  // migrate to the canonical location at their convenience.
  // `path.resolve` (not `path.join`) so that an absolute
  // `output.validateJsonPath` in qfai.config.yaml is honored verbatim
  // — `profileSuffixedReportPath` preserves the absolute form, and
  // the validate writer uses `resolveJsonPath` which is `path.resolve`
  // too. Using `path.join` would re-anchor the absolute target under
  // `<root>` (e.g. `<repo>/tmp/validate-full.json`) so the reader
  // could never find the file that the writer actually produced.
  const canonicalAbs = path.resolve(root, canonicalSignalRel);
  const fullProfileAbs = path.resolve(root, fullProfileSignalRel);
  const legacyAbs = path.resolve(root, SAAS_PACKAGE_GATES_SIGNAL_LEGACY_REL);
  const signalRead = await loadSaasPackageGatesSignal(canonicalAbs, fullProfileAbs, legacyAbs);
  if (signalRead.source === "full-profile") {
    // Freshness gate: the full-profile signal must have been written
    // AFTER the scope-limited certificate was sealed. Otherwise the
    // upgrade promotes on stale evidence — a previously-successful
    // `--profile full` validate run whose counts.error=0 predates
    // the regression that prompted the operator to look again. The
    // gate is scoped to the full-profile source (NOT the canonical
    // source) because the standard recovery flow pins canonical at
    // saas-package=INADMISSIBLE; the canonical-admissible path
    // (operator wrote a non-saas-package profile to the canonical
    // location, or a synthetic gates map) is not reachable from the
    // recovery message and lives outside this gate's threat model.
    // Should the canonical-admissible path become a
    // recovery target in a future release, mirror this gate onto
    // canonical with the same mtime invariant. The `legacy` source
    // is also exempt — `.qfai/output/...` is the superseded layout
    // in a deprecation window; gating it would surface migration
    // noise without closing a real threat.
    //
    // Freshness signal: file mtime, with KNOWN LIMITATIONS:
    //   - Sub-second precision on modern filesystems; coarse on
    //     legacy / cross-FS layouts (FAT ≈ 2 s; some ext3 / HFS+
    //     truncate to whole seconds). Connected operator flows
    //     that execute `certify --scope saas-package && validate
    //     --profile full && certify --upgrade-scope full` in the
    //     same second on a coarse FS can produce equal mtimes and
    //     trip the `<=` rejection. The mitigation is
    //     non-destructive: the operator re-runs `validate
    //     --profile full` after any measurable delay and the gate
    //     clears. We accept the rare false-positive over admitting
    //     any false-negative.
    //   - mtime is NOT a tamper-resistant freshness signal — any
    //     of `cp`, `rsync`, `git checkout`, `touch`, or clock skew
    //     can reset or advance it. Future hardening (case A: embed
    //     `generatedAt` in `ValidationResult` and compare to
    //     `cert.generatedAt`; case B: link cert → validate-run via
    //     a content sha256) would replace mtime with a content-
    //     bound signal. Tracked as a future-minor follow-up. The
    //     gate today is defense-in-depth, not a security boundary.
    const certAbs = path.resolve(root, COMPLETION_CERTIFICATE_REL_PATH);
    try {
      const [fullProfileStat, certStat] = await Promise.all([stat(fullProfileAbs), stat(certAbs)]);
      if (fullProfileStat.mtimeMs <= certStat.mtimeMs) {
        error(
          "qfai prototyping certify: cannot upgrade scope — the full-profile " +
            `gates signal (${fullProfileSignalRel}, mtime ` +
            `${new Date(fullProfileStat.mtimeMs).toISOString()}) is NOT ` +
            `newer than the scope-limited certificate ` +
            `(${COMPLETION_CERTIFICATE_REL_PATH}, mtime ` +
            `${new Date(certStat.mtimeMs).toISOString()}). Re-run ` +
            "`qfai validate --profile full --fail-on error` to write a fresh " +
            "full-profile signal, then re-run certify --upgrade-scope full.",
        );
        return 2;
      }
      // Additional freshness invariant: when a canonical saas-package
      // signal is also present, the full-profile signal must be newer
      // than it too. Otherwise this sequence promotes stale evidence:
      //   1. validate --profile full (writes full-profile signal at F)
      //   2. cert sealed (C, with F > C — passes the gate above)
      //   3. regression in source
      //   4. validate --profile saas-package (writes canonical at S,
      //      S > F, INADMISSIBLE because saas-package always emits one
      //      skip finding per gate)
      //   5. certify --upgrade-scope full: the loader prefers
      //      full-profile over canonical (per the precedence in
      //      `loadSaasPackageGatesSignal`), so without this guard a
      //      full-profile signal older than the canonical retry would
      //      still drive the upgrade decision.
      // The check is skipped when canonical is absent (ENOENT) —
      // superseded layouts and any flow that never wrote canonical
      // remain unaffected. Same mtime caveats apply as documented above.
      try {
        const canonicalStat = await stat(canonicalAbs);
        if (fullProfileStat.mtimeMs <= canonicalStat.mtimeMs) {
          error(
            "qfai prototyping certify: cannot upgrade scope — the full-profile " +
              `gates signal (${fullProfileSignalRel}, mtime ` +
              `${new Date(fullProfileStat.mtimeMs).toISOString()}) is NOT ` +
              `newer than the canonical saas-package signal ` +
              `(${canonicalSignalRel}, mtime ` +
              `${new Date(canonicalStat.mtimeMs).toISOString()}). The canonical ` +
              "signal was written after the last full-profile run, so the " +
              "full-profile evidence may pre-date a regression that prompted " +
              "the saas-package re-run. Re-run `qfai validate --profile full " +
              "--fail-on error` to write a fresh full-profile signal, then " +
              "re-run certify --upgrade-scope full.",
          );
          return 2;
        }
      } catch (err) {
        if (!isEnoent(err)) {
          throw err;
        }
        // Canonical signal absent — nothing to compare against.
      }
    } catch (err) {
      // Fail-closed on any stat error. Both files are expected to
      // exist at this point (the cert was loaded above; the
      // full-profile file was just read via
      // loadSaasPackageGatesSignal). A failure here is unusual —
      // permission flip, deleted-since-read race, etc. We refuse
      // the upgrade and surface the underlying error rather than
      // risk a silent pass. (Note: `EEXIST` is a write-side errno,
      // not a stat-side one; the failure class here is ENOENT /
      // EACCES / EIO etc.)
      const message = err instanceof Error ? err.message : String(err);
      error(
        "qfai prototyping certify: cannot upgrade scope — freshness " +
          `check failed (${message}). Re-run \`qfai validate --profile full ` +
          "--fail-on error` and try again.",
      );
      return 2;
    }
    // Hint (not deprecation): the operator followed the recovery path
    // and re-ran under `--profile full`, so its profile-suffixed report
    // is the admissible signal. Surface the path on stderr so log
    // readers can see which file actually drove the decision without
    // affecting the success exit code.
    process.stderr.write(
      `qfai prototyping certify: Reading fuller-profile gates signal ` +
        `(${fullProfileSignalRel}); saas-package profile is INADMISSIBLE for upgrade.\n`,
    );
  } else if (signalRead.source === "legacy") {
    // Write the deprecation note directly to stderr — the `warn`
    // logger emits to stdout, which the upgrade-scope contract
    // reserves for operator-facing positive output. A stderr-only
    // notice keeps the upgrade succeeding (exit 0) while surfacing
    // the canonical-path migration to anyone watching the error
    // stream (CI logs, terminal stderr, etc.).
    // Append a concrete migration command so the deprecation note
    // mirrors the in-repo `D-DEPRECATED-PATH` convention (e.g. init's
    // legacy-steering note instructs `qfai init --upgrade-assistant-tree
    // to migrate`). Operators reading the stderr line should not have
    // to consult docs to learn how to clear the warning.
    process.stderr.write(
      `qfai prototyping certify: Reading legacy validate-saas-package.json path ` +
        `(${SAAS_PACKAGE_GATES_SIGNAL_LEGACY_REL}); the canonical path is ` +
        `${canonicalSignalRel}. ` +
        `Re-run \`qfai validate --profile saas-package\` to write the canonical path.\n`,
    );
  }
  const signal = signalRead.payload;
  const stillMissing = resolveStillMissingSaasPackageGates(signal);
  if (stillMissing.length > 0) {
    error(
      "qfai prototyping certify: cannot upgrade to full scope — the following " +
        "gate(s) named in the certificate's notes are still missing or not PASS:",
    );
    for (const gate of stillMissing) {
      error(`  - ${gate}`);
    }
    // Recovery message: adapt to the loaded signal's `profile` so the
    // operator is steered toward a profile that can actually empty the
    // skip-set. The saas-package profile is INADMISSIBLE because
    // `runSaasPackageProfile` unconditionally emits one skip-finding
    // per gate; re-running it on a fixed surface will still flag every
    // gate as skipped and the operator would loop. For any other
    // profile name (full / verify / tdd / atdd /...) the existing
    // "re-run after gates PASS" hint is correct — surface the actual
    // profile name from the signal.
    const signalProfile = isRecord(signal) ? extractString(signal, "profile") : undefined;
    if (signalProfile === "saas-package") {
      // The recovery target is the fuller-profile report
      // (`validate-full.json`), NOT the canonical saas-package report.
      // The validate writer for `--profile full` writes the
      // profile-suffixed `validate-full.json` and leaves the existing
      // `validate-saas-package.json` untouched, so an operator who
      // follows this instruction will populate `${fullProfileSignalRel}`
      // — which the reader now prefers over a stale canonical
      // saas-package signal (see precedence logic in
      // `loadSaasPackageGatesSignal`).
      error(
        "The saas-package profile is INADMISSIBLE for --upgrade-scope full: it always " +
          "emits one skip finding per gate, so its skip-set can never be emptied. " +
          "Re-run `qfai validate --profile full --fail-on error` so that " +
          `${fullProfileSignalRel} reports counts.error=0 under a fuller profile, then ` +
          "re-run certify --upgrade-scope full.",
      );
    } else if (typeof signalProfile === "string" && signalProfile.length > 0) {
      error(
        `Re-run \`qfai validate --profile ${signalProfile} --fail-on error\` so that ` +
          `${canonicalSignalRel} reports counts.error=0 and every gate as PASS, then ` +
          "re-run certify --upgrade-scope full.",
      );
    } else {
      error(
        "Re-run `qfai validate --profile full --fail-on error` so that " +
          `${canonicalSignalRel} reports counts.error=0 and every gate as PASS, then ` +
          "re-run certify --upgrade-scope full.",
      );
    }
    return 2;
  }

  // All previously-skipped gates now pass: rewrite the certificate
  // WITHOUT the scope-limited markers. Preserve every other field.
  const upgraded = stripScopeMarkers(cert);
  const out = await writeCompletionCertificate(root, upgraded);
  info(`qfai prototyping certify: upgraded ${out} to full scope (dropped scope, notes)`);
  return 0;
}

/**
 * Result of resolving the saas-package gates signal. `source` records
 * which path the payload was actually read from (`canonical` /
 * `legacy`) or `none` when neither file exists. The signal payload is
 * `null` when no file was found OR the file existed but failed to parse
 * — both cases are surfaced as "still missing" by
 * {@link resolveStillMissingSaasPackageGates}.
 *
 * The canonical path is preferred. When the canonical path is absent
 * AND the legacy path is present, the legacy payload is returned along
 * with `source: "legacy"` so the caller can emit a one-line stderr
 * deprecation note. Both-present case: canonical WINS (deterministic;
 * matches how `qfai validate --profile saas-package` writes the
 * canonical path by default).
 */
type SaasPackageGatesSignalRead = {
  payload: unknown;
  source: "canonical" | "full-profile" | "legacy" | "none";
};

async function probeFile(absPath: string): Promise<boolean> {
  try {
    const s = await stat(absPath);
    return s.isFile();
  } catch (err) {
    if (!isEnoent(err)) {
      // Permission flips / EIO are reported as "exists" so the caller
      // surfaces the real read error via loadJson rather than silently
      // bypassing to the next probe layer.
      return true;
    }
    return false;
  }
}

async function loadSaasPackageGatesSignal(
  canonicalAbs: string,
  fullProfileAbs: string,
  legacyAbs: string,
): Promise<SaasPackageGatesSignalRead> {
  // Probe layout:
  //   (1) canonical (`validate-saas-package.json`) is the
  //       writer-default produced by `qfai validate --profile saas-package`.
  //   (2) full-profile (`validate-full.json`) is the writer-default
  //       produced by `qfai validate --profile full`.
  //   (3) legacy (`.qfai/output/validate-saas-package.json`) is the
  //       superseded path; kept for back-compat with the
  //       `D-DEPRECATED-PATH` deprecation window.
  //
  // Precedence requirement (closes the INADMISSIBLE recovery loop):
  // when a stale `validate-saas-package.json` (profile === "saas-package")
  // is present on disk AND the operator has since run
  // `qfai validate --profile full`, the full-profile signal MUST win.
  // The validate writer does not delete or overwrite the
  // saas-package-shaped canonical file when invoked under a different
  // profile (validate.ts always-latest writes `validate.json` plus the
  // profile-suffixed sibling), so a naive canonical-first precedence
  // would re-read the stale INADMISSIBLE payload forever even after
  // the operator followed the refusal message. We therefore:
  //   - read canonical first if present;
  //   - if its payload is admissible (any non-saas-package profile, or
  //     a synthetic gates map), return it;
  //   - if its payload is INADMISSIBLE (profile === "saas-package"),
  //     try full-profile next. If full-profile exists, prefer it;
  //     otherwise return the canonical INADMISSIBLE payload so the
  //     refusal path can emit the recovery message.
  const canonicalExists = await probeFile(canonicalAbs);
  if (canonicalExists) {
    const canonicalPayload = await loadJson(canonicalAbs);
    if (
      isRecord(canonicalPayload) &&
      extractString(canonicalPayload, "profile") === "saas-package"
    ) {
      // Stale-canonical case: try full-profile before giving up.
      const fullProfileExists = await probeFile(fullProfileAbs);
      if (fullProfileExists) {
        const fullPayload = await loadJson(fullProfileAbs);
        return { payload: fullPayload, source: "full-profile" };
      }
      // No full-profile available — return the canonical payload so
      // the refusal message names the actual recovery step.
      return { payload: canonicalPayload, source: "canonical" };
    }
    return { payload: canonicalPayload, source: "canonical" };
  }
  // Canonical absent: try the `--profile full` report next, then
  // legacy. The canonical-absent case can happen on a clean project
  // OR after the operator manually removed the stale canonical.
  const fullProfileExists = await probeFile(fullProfileAbs);
  if (fullProfileExists) {
    const payload = await loadJson(fullProfileAbs);
    return { payload, source: "full-profile" };
  }
  const legacyExists = await probeFile(legacyAbs);
  if (legacyExists) {
    const payload = await loadJson(legacyAbs);
    return { payload, source: "legacy" };
  }
  return { payload: null, source: "none" };
}

/**
 * Inspect a `.qfai/report/validate-saas-package.json` payload (canonical;
 * `.qfai/output/...` read as legacy fallback) and return the
 * saas-package gates that are still NOT confirmed passing.
 *
 * Two interpretation modes are supported because the file can be
 * produced by two writers:
 *
 *   1. **Synthetic gates map** (`gates: {<gate>: {status: "PASS"}}`) —
 *      written by test fixtures and ad-hoc operator overrides. A gate
 *      is passing when its entry's `status === "PASS"` AND the
 *      top-level `counts.error === 0`.
 *
 *   2. **Real validate output** (no `gates` map; carries the
 *      `ValidationResult` shape with `profile`, `counts`, `issues`,
 *      etc.). Interpretation honors the producer contract:
 *      - `profile === "saas-package"` → **INADMISSIBLE for upgrade**.
 *        `runSaasPackageProfile` UNCONDITIONALLY emits one
 *        `D-SAAS-PACKAGE-VERIFY-SKIPPED` info finding per skipped
 *        gate, so the skip-set can never be "emptied" within this
 *        profile. Operators MUST re-run a fuller profile (e.g.
 *        `qfai validate --profile full`) to drive `--upgrade-scope
 *        full`. The reader returns the full skip-set as still
 *        missing whenever the signal carries
 *        `profile === "saas-package"`.
 *      - `profile` is `"full"` / `"verify"` / `"tdd"` / `"atdd"` (any
 *        non-`saas-package` profile) AND `counts.error === 0` AND no
 *        error-severity issues match the gate names → all gates pass
 *        (the operator re-ran under a fuller profile that exercises
 *        every gate, none failed).
 *      - Any profile AND `counts.error > 0` → still missing (the
 *        validate run had failures; the upgrade refuses and the
 *        operator-facing log enumerates the still-missing set).
 *      - `profile` field absent (malformed / hand-edited signal) →
 *        still missing (refuse to default-to-success on
 *        unrecognized shapes).
 *
 * `mode` defaults to `"auto"`: when `signal.gates` is present and is a
 * non-empty record, the synthetic-map branch is used; otherwise the
 * issues-based branch runs. Explicit `"gates"` / `"issues"` forces one
 * branch for callers that want deterministic behaviour (e.g. unit tests
 * that seed both shapes).
 *
 * The fail-closed refusal classes returned as the full
 * `SAAS_PACKAGE_SKIPPED_GATES` list fall into two groups:
 *
 *   Shape-mismatch classes (apply to both branches, gates-map and
 *   issues):
 *     (a) `null` / non-record payloads;
 *     (b) records lacking `counts.error` as a number — no recognizable
 *         ValidationResult / synthetic-gates shape.
 *
 *   Validate-failure class (well-formed signal whose own counts say
 *   "failure"; applies to both branches):
 *     (c) records with `counts.error > 0` — the signal IS a recognizable
 *         shape, but it reports the validate run failed, so the
 *         upgrade refuses fail-closed (treats failed-but-formatted
 *         results identically to malformed input).
 *
 *   Profile-only classes (apply to the issues branch ONLY; the
 *   synthetic gates-map branch does not consult `profile`):
 *     (d) records lacking a `profile` field (malformed `{}` or
 *         hand-edited signal with no recognizable ValidationResult
 *         shape);
 *     (e) records with `profile === "saas-package"` (INADMISSIBLE: the
 *         saas-package profile unconditionally emits one skip finding
 *         per gate; its skip-set can never be emptied — operators must
 *         re-run a fuller profile such as `qfai validate --profile full`).
 *
 * Truncated / malformed signals must NEVER default-to-success.
 */
type StillMissingMode = "auto" | "gates" | "issues";

function resolveStillMissingSaasPackageGates(
  signal: unknown,
  mode: StillMissingMode = "auto",
): string[] {
  if (!isRecord(signal)) {
    return [...SAAS_PACKAGE_SKIPPED_GATES];
  }
  const gatesRecord = extractRecord(signal, "gates");
  const gatesNonEmpty = gatesRecord !== undefined && Object.keys(gatesRecord).length > 0;
  const resolvedMode: "gates" | "issues" =
    mode === "auto" ? (gatesNonEmpty ? "gates" : "issues") : mode;

  if (resolvedMode === "gates") {
    return resolveStillMissingFromGatesMap(signal, gatesRecord);
  }
  return resolveStillMissingFromIssues(signal);
}

/**
 * Synthetic `gates: {<gate>: {status: "PASS"}}` map branch. Keeps the
 * existing test-fixture contract: a gate is passing only when both its
 * entry's `status === "PASS"` AND the top-level `counts.error === 0`.
 */
function resolveStillMissingFromGatesMap(
  signal: Record<string, unknown>,
  gates: Record<string, unknown> | undefined,
): string[] {
  const errorCount = extractNumber(extractRecord(signal, "counts"), "error");
  if (errorCount !== 0) {
    return [...SAAS_PACKAGE_SKIPPED_GATES];
  }
  if (!gates) {
    return [...SAAS_PACKAGE_SKIPPED_GATES];
  }
  const missing: string[] = [];
  for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
    const entry = extractRecord(gates, gate);
    if (!entry || extractString(entry, "status") !== "PASS") {
      missing.push(gate);
    }
  }
  return missing;
}

/**
 * Real-`ValidationResult` branch. Mirrors the operator's actual
 * workflow: run `qfai validate --profile saas-package` (or a fuller
 * profile that exercises the skip-set inline) and let the resulting
 * record drive the upgrade decision.
 */
function resolveStillMissingFromIssues(signal: Record<string, unknown>): string[] {
  // Require a recognizable ValidationResult shape AND counts.error === 0
  // as positive admissibility conditions. Malformed inputs (e.g. `{}`)
  // MUST be treated as "all gates still missing" — never as "all pass" by
  // omission. This guards against accidental upgrades on truncated /
  // hand-edited signal files.
  const errorCount = extractNumber(extractRecord(signal, "counts"), "error");
  if (typeof errorCount !== "number") {
    return [...SAAS_PACKAGE_SKIPPED_GATES];
  }
  if (errorCount > 0) {
    return [...SAAS_PACKAGE_SKIPPED_GATES];
  }
  const profile = extractString(signal, "profile");
  if (profile === undefined) {
    // No `profile` field — not a recognizable ValidationResult; refuse.
    return [...SAAS_PACKAGE_SKIPPED_GATES];
  }
  const issuesRaw = signal["issues"];
  const issues = Array.isArray(issuesRaw) ? issuesRaw : [];

  if (profile === "saas-package") {
    // saas-package profile UNCONDITIONALLY emits one
    // `D-SAAS-PACKAGE-VERIFY-SKIPPED` info finding per skipped gate
    // (see `runSaasPackageProfile` → `buildSkipFindings`). The skip-set
    // can never be "emptied" within this profile — so a saas-package
    // signal is INADMISSIBLE for upgrade. Operators must run a fuller
    // profile (e.g. `qfai validate --profile full`) to drive
    // `--upgrade-scope full`.
    return [...SAAS_PACKAGE_SKIPPED_GATES];
  }
  // Fuller profile (full / tdd / atdd / default):
  // counts.error === 0 + no error-severity issue mentioning a gate
  // name → all gates pass.
  const errorByGate: string[] = [];
  for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
    if (hasErrorFindingForGate(issues, gate)) {
      errorByGate.push(gate);
    }
  }
  return errorByGate;
}

/**
 * Match an error-severity finding that names the gate. Used by the
 * fuller-profile branch: when an operator runs `qfai validate
 * --profile full`, any gate that fails surfaces as an error issue
 * naming the validator. Conservative substring match on the `rule` /
 * `refs` / `message` keeps us source-of-truth-tolerant.
 */
function hasErrorFindingForGate(issues: unknown[], gate: string): boolean {
  for (const entry of issues) {
    if (!isRecord(entry)) continue;
    if (extractString(entry, "severity") !== "error") continue;
    if (issueMentionsGate(entry, gate)) return true;
  }
  return false;
}

function issueMentionsGate(entry: Record<string, unknown>, gate: string): boolean {
  const refs = entry["refs"];
  if (Array.isArray(refs)) {
    for (const ref of refs) {
      if (typeof ref === "string" && ref === gate) return true;
    }
  }
  const rule = extractString(entry, "rule");
  if (typeof rule === "string" && rule.includes(gate)) return true;
  const message = extractString(entry, "message");
  if (typeof message === "string" && message.includes(gate)) return true;
  return false;
}

/**
 * Return a copy of `cert` with the scope-limited markers (`scope`,
 * `notes`) dropped. Preserves every other field bit-stable.
 */
function stripScopeMarkers(cert: CompletionCertificate): CompletionCertificate {
  const next: CompletionCertificate = {
    runId: cert.runId,
    generatedAt: cert.generatedAt,
    generator: cert.generator,
    evidenceDigests: cert.evidenceDigests,
    validateRun: cert.validateRun,
    verifyRun: cert.verifyRun,
    reviewerSignoff: cert.reviewerSignoff,
    iterationCount: cert.iterationCount,
    uiContractsCovered: cert.uiContractsCovered,
    convergedUiContracts: cert.convergedUiContracts,
    laggingUiContracts: cert.laggingUiContracts,
    ...(cert.designMd ? { designMd: cert.designMd } : {}),
  };
  return next;
}

/** Narrow an unknown value to non-empty strings for the frozen scope. */
function readStringArrayField(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string" || value.length === 0) return null;
    out.push(value);
  }
  return out;
}

// ─── final-iter HTML resolution ─────────────────────────────────────────────

/**
 * Return every `*.html` file in the iteration directory whose index
 * matches the accepted iteration recorded in `prototyping.json#iterations[]`
 * (i.e. `iterations.length - 1`).
 *
 * Anchored — not selected — by the recorded iteration index. Stale
 * `iter-NN/` directories from a prior loop (kept on disk after a
 * `qfai prototyping iterate --cycle 0` reset) MUST NOT be eligible
 * for certification. Returns an empty array when the recorded iter
 * dir has no HTML artifacts.
 */
async function findIterationHtmlFiles(
  evidenceRoot: string,
  iterationIndex: number,
): Promise<string[]> {
  const iterDirAbs = path.join(evidenceRoot, `iter-${String(iterationIndex).padStart(2, "0")}`);
  return allHtmlIn(iterDirAbs);
}

/**
 * Return iter-NN directory names whose index is >= `iterationCount`
 * (i.e. higher than any iteration recorded in `prototyping.json`).
 *
 * Used by `runPrototypingCertify` to fail fast when stale iter dirs
 * from a prior loop survived on disk: `buildCompletionCertificate`
 * digests every file under `evidenceRoot`, so a stale higher iter
 * dir would otherwise be sealed into the certificate and would
 * cause a later `certify --check` to fail when the operator cleans
 * up the stale dir even though the accepted iteration is unchanged.
 *
 * Returned names are POSIX, sorted, and exclude any non-iter
 * directories (so untracked top-level files / dirs under
 * `evidenceRoot` are not flagged here — those are caught separately
 * by the digest layer if relevant).
 */
/**
 * @internal Exported for direct unit-testing of the symmetric
 * fail-closed posture — not part of the package's public surface.
 */
export async function findStaleIterDirs(
  evidenceRoot: string,
  iterationCount: number,
): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(evidenceRoot);
  } catch (err) {
    // ENOENT: evidenceRoot legitimately absent on a fresh project that
    // has not yet captured an iteration. The certify caller already
    // requires `iterationCount > 0` and a non-empty accepted-iter HTML
    // set upstream, so reaching this path with ENOENT means the
    // operator deleted the dir mid-flight — there's nothing stale to
    // flag in either case.
    //
    // EACCES / EPERM / EIO: the same fail-closed posture as the
    // `unreadable` LockGateResult branch above. Returning [] here would
    // let a permission flip silently bypass the stale-iter guard, the
    // same vector the lock branch guards against. Symmetric: propagate
    // so certify's caller surfaces a hard error rather than seal a
    // possibly-stale digest set.
    if (isEnoent(err)) return [];
    throw err;
  }
  const stale: string[] = [];
  for (const name of names) {
    const match = name.match(/^iter-(\d{2,})$/);
    if (!match || match[1] === undefined) continue;
    const index = Number.parseInt(match[1], 10);
    if (!Number.isFinite(index) || index < iterationCount) continue;
    const abs = path.join(evidenceRoot, name);
    try {
      const s = await stat(abs);
      if (s.isDirectory()) {
        const children = await readdir(abs, { withFileTypes: true });
        const legacyOnly =
          children.length > 0 &&
          children.every((entry) => entry.isDirectory() && /^spec-\d{4}$/u.test(entry.name));
        if (!legacyOnly) stale.push(name);
      }
    } catch (err) {
      // Same asymmetry rule as readdir above. ENOENT here is a tight
      // race (a sibling process removed the entry between readdir and
      // stat) and is safe to skip — the next certify run will see the
      // updated tree. Other fs errors are propagated.
      if (isEnoent(err)) continue;
      throw err;
    }
  }
  stale.sort();
  return stale;
}

async function allHtmlIn(dir: string): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  names.sort();
  const out: string[] = [];
  for (const name of names) {
    if (!name.toLowerCase().endsWith(".html")) continue;
    const abs = path.join(dir, name);
    try {
      const s = await stat(abs);
      if (s.isFile()) out.push(abs);
    } catch {
      continue;
    }
  }
  return out;
}

// ─── small helpers (kept local to avoid widening prototyping/types.ts) ──────

async function loadJson(filePath: string): Promise<unknown> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Evidence files modified after `runAtMs`, repo-relative and sorted.
 *
 * The walk mirrors `scanEvidenceDigests` in
 * `core/prototyping/certificate.ts` — same tree, same tolerance for an
 * unreadable directory — because the question is about the same file set the
 * certificate is about to digest. An unreadable entry is skipped rather than
 * reported: this function answers "what is newer", and a path it cannot read is
 * a different problem that the digest scan raises on its own terms.
 *
 * `>` not `>=`: a file written in the same clock tick as the run is not
 * evidence of a change, and on a coarse filesystem it is not distinguishable
 * from one written just before. That is the granularity limitation the caller
 * records, and erring toward "not newer" keeps the gate from refusing a
 * correct sequence.
 */
async function findEvidenceNewerThan(
  root: string,
  evidenceRoot: string,
  runAtMs: number,
): Promise<string[]> {
  const newer: string[] = [];
  const visit = async (dir: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      // A reset's backups are not sealed, so a change inside one is not a change
      // to the tree the run judged. Read by name, as the digest walk reads it:
      // nothing is asked of `stat`, so the two answer the same for a backup a
      // listing can read and a `stat` cannot, and for a link whatever its
      // target is.
      if (dir === evidenceRoot && isResetBackupDirectory(entry.name)) continue;
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      // The certificate itself lives at the top of the tree and is written
      // after this gate runs, so it is never part of the answer.
      if (dir === evidenceRoot && absolute === path.join(root, COMPLETION_CERTIFICATE_REL_PATH))
        continue;
      try {
        const stats = await stat(absolute);
        if (stats.mtimeMs > runAtMs) {
          newer.push(path.relative(evidenceRoot, absolute).replace(/\\/g, "/"));
        }
      } catch {
        // Unreadable: not this function's verdict to give.
      }
    }
  };
  await visit(evidenceRoot);
  newer.sort();
  return newer;
}

/**
 * Cheap existence probe for the per-(spec × screen) review.json gate.
 * Uses `stat` (not `access`) so symlinks resolve consistently with the
 * rest of the evidence walker, and isolates the swallow-all-errors
 * scope to a single helper instead of inlining a try/catch at the call
 * site.
 *
 * Returns `false` for ANY fs error (including permission flips) — the
 * caller treats "not visible to the certify process" as missing. This
 * is symmetric with `validateUiEvidenceArtifacts`-style presence
 * checks elsewhere; certify's strict gates upstream (lock-unreadable,
 * stale-iter-readdir) catch the broader permission-flip vector.
 */
/** One rejected `<screen>.review.json` and why it was rejected. */
type PayloadFailure = { readonly expectedPath: string; readonly errors: readonly string[] };

/**
 * The (UI contract, screen, cycle) triple a payload is filed under.
 *
 * `specDirName` is `null` for a payload outside a canonical
 * `CON-UI-NNNN` directory. Such a path anchors only its screen and cycle.
 */
type ReviewPayloadExpectation = {
  readonly specDirName: string | null;
  readonly screenId: string;
  readonly cycle: number;
};

/**
 * The three independent ways one `<screen>.review.json` can fail
 * certification: it does not parse, it parses but reviews a different
 * (spec, screen, cycle), or it parses and contradicts the convergence
 * the summary PASS asserts. Each list is empty when that check passed.
 */
type ReviewPayloadAudit = {
  readonly schemaErrors: readonly string[];
  readonly identityErrors: readonly string[];
  readonly convergenceErrors: readonly string[];
};

/**
 * Read one `<screen>.review.json` and audit it against the shipped
 * reviewer payload reference
 * (`.qfai/assistant/skill/qfai-prototyping/references/review-payload-schema.md`)
 * via {@link parseEvaluatorReview}, then against the pair it is filed
 * under and the convergence rule.
 *
 * Unreadable / non-JSON files are reported as a single schema
 * violation rather than thrown, so one corrupt payload cannot abort
 * the sweep over the remaining (spec, screen) pairs. Identity and
 * convergence are only evaluated on a payload that parsed — otherwise
 * there are no trustworthy fields to compare.
 */
async function auditReviewPayload(
  absPath: string,
  expected: ReviewPayloadExpectation,
): Promise<ReviewPayloadAudit> {
  let raw: string;
  try {
    raw = await readFile(absPath, "utf-8");
  } catch (err) {
    return schemaOnlyAudit(`unreadable: ${err instanceof Error ? err.message : String(err)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return schemaOnlyAudit(`invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  const result = parseEvaluatorReview(parsed);
  if (!result.ok) {
    return { schemaErrors: [...result.errors], identityErrors: [], convergenceErrors: [] };
  }
  return {
    schemaErrors: [],
    identityErrors: collectIdentityMismatches(result.review, expected),
    convergenceErrors: collectConvergenceContradictions(result.review),
  };
}

function schemaOnlyAudit(message: string): ReviewPayloadAudit {
  return { schemaErrors: [message], identityErrors: [], convergenceErrors: [] };
}

/** Filename suffix of a per-(spec × screen) reviewer payload. */
const REVIEW_PAYLOAD_SUFFIX = ".review.json";

/** The three rejection buckets an audited payload can land in. */
type PayloadFailureSink = {
  readonly invalid: PayloadFailure[];
  readonly mismatched: PayloadFailure[];
  readonly unconverged: PayloadFailure[];
};

/**
 * Audit every `*.review.json` present in one accepted-iteration
 * UI contract directory that the declared-pair sweep did not already
 * open (`skipScreens`), filing each finding in the same bucket the
 * declared-pair sweep uses. A stray payload is held against the contract
 * directory it sits in and the screen its own filename claims, so a
 * schema-valid, converged extra payload passes while a corrupt or
 * unconverged leftover is rejected.
 */
async function auditStrayPayloads(args: {
  root: string;
  specDirRel: string;
  specDirName: string;
  cycle: number;
  skipScreens: ReadonlySet<string>;
  sink: PayloadFailureSink;
}): Promise<void> {
  for (const relName of await listReviewPayloadFiles(path.join(args.root, args.specDirRel))) {
    const screenId = payloadScreenId(relName);
    // `skipScreens` names the payloads the declared-pair sweep already
    // opened, and those live directly in the contract directory. A
    // NESTED file of the same name (`archive/home.review.json`) is a
    // different file that sweep never touched, so the skip must not
    // extend to it.
    if (!relName.includes("/") && args.skipScreens.has(screenId)) continue;
    const rel = `${args.specDirRel}/${relName}`;
    const audit = await auditReviewPayload(path.join(args.root, rel), {
      specDirName: args.specDirName,
      screenId,
      cycle: args.cycle,
    });
    if (audit.schemaErrors.length > 0) {
      args.sink.invalid.push({ expectedPath: rel, errors: audit.schemaErrors });
      continue;
    }
    if (audit.identityErrors.length > 0) {
      args.sink.mismatched.push({ expectedPath: rel, errors: audit.identityErrors });
    }
    if (audit.convergenceErrors.length > 0) {
      args.sink.unconverged.push({ expectedPath: rel, errors: audit.convergenceErrors });
    }
  }
}

/**
 * Canonical `CON-UI-NNNN` subdirectories, sorted. An unreadable
 * directory yields `[]`.
 */
async function listSpecDirs(iterDirAbs: string): Promise<string[]> {
  let entries: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    entries = await readdir(iterDirAbs, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && CANONICAL_SPEC_DIR.test(e.name))
    .map((e) => e.name)
    .sort();
}

/**
 * Every `<screen>.review.json` file that actually exists under one
 * directory AT ANY DEPTH, as POSIX paths relative to `dirAbs`, sorted
 * for deterministic operator output. A missing / unreadable directory
 * yields `[]`: the per-pair presence sweep already reports that as
 * missing pairs.
 *
 * The walk is recursive on purpose. `buildCompletionCertificate`
 * digests the evidence root recursively, so a payload one level down
 * (`CON-UI-NNNN/archive/old.review.json`) is sealed into the certificate
 * exactly like a top-level sibling. A shallow `readdir` here would let
 * that nested file ship without ever being parsed — the audited set
 * must be at least as wide as the digested set.
 */
async function listReviewPayloadFiles(dirAbs: string): Promise<string[]> {
  const out: string[] = [];
  await collectReviewPayloadFiles(dirAbs, "", out);
  return out.sort();
}

/**
 * Depth-first accumulator behind {@link listReviewPayloadFiles}.
 *
 * Uses `readdir` + `stat` (not `withFileTypes`) so symlinks resolve the
 * same way the certificate's own evidence walker resolves them; a file
 * the digest tree follows must be a file this sweep follows too.
 * Per-entry `stat` failures are skipped rather than thrown: one
 * vanished entry must not abort the audit of its siblings.
 */
async function collectReviewPayloadFiles(
  dirAbs: string,
  prefix: string,
  out: string[],
): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dirAbs);
  } catch {
    return;
  }
  for (const name of entries) {
    const rel = prefix === "" ? name : `${prefix}/${name}`;
    const abs = path.join(dirAbs, name);
    let s: Awaited<ReturnType<typeof stat>>;
    try {
      s = await stat(abs);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      await collectReviewPayloadFiles(abs, rel, out);
    } else if (s.isFile() && name.endsWith(REVIEW_PAYLOAD_SUFFIX)) {
      out.push(rel);
    }
  }
}

/**
 * Every `*.review.json` under an accepted-iteration directory that does
 * not inside a canonical `CON-UI-NNNN` subtree. Historical
 * `spec-NNNN` evidence is preserved and ignored. Paths are relative
 * to the iteration directory.
 */
async function listStrayIterationPayloads(iterDirAbs: string): Promise<string[]> {
  const all = await listReviewPayloadFiles(iterDirAbs);
  return all.filter((rel) => {
    const first = rel.split("/")[0];
    if (first !== undefined && /^spec-\d{4}$/u.test(first)) return false;
    return !(rel.includes("/") && first !== undefined && CANONICAL_SPEC_DIR.test(first));
  });
}

/** The screen id a payload path claims: its basename minus the suffix. */
function payloadScreenId(rel: string): string {
  const fileName = rel.slice(rel.lastIndexOf("/") + 1);
  return fileName.slice(0, -REVIEW_PAYLOAD_SUFFIX.length);
}

/**
 * Derive the `(UI contract, screen, cycle)` a payload path claims, given
 * its iteration-relative path. The contract is anchored only when the
 * first segment is a canonical `CON-UI-NNNN` directory; see
 * {@link ReviewPayloadExpectation}.
 */
function payloadExpectationFromRel(rel: string, cycle: number): ReviewPayloadExpectation {
  const first = rel.split("/")[0];
  const specDirName =
    rel.includes("/") && first !== undefined && CANONICAL_SPEC_DIR.test(first) ? first : null;
  return { specDirName, screenId: payloadScreenId(rel), cycle };
}

/**
 * A reviewer payload as it appears in `evidenceDigests[].path`, i.e.
 * relative to the evidence root: `iter-NN/<anything>/<screen>.review.json`.
 */
const SEALED_REVIEW_PAYLOAD_RE = /^iter-(\d{2,})\/(.+\.review\.json)$/u;

/** Bound on the payload reasons `--check` renders, as elsewhere. */
const SEALED_AUDIT_REASON_CAP = 20;

/**
 * Re-audit the review payloads a certificate already sealed against the
 * CURRENT schema / identity / convergence rules, and return one reason
 * per violation.
 *
 * `checkCompletionCertificate` proves only that the sealed bytes are
 * unchanged. A certificate written by a build whose gate checked
 * presence alone therefore keeps passing `--check` forever, even after
 * the package is upgraded, with `{}` or `{"ok":true}` standing in for
 * review evidence — and the shipped skill defines DONE as `--check`
 * exit 0. Holding the sealed set to the same rules a fresh seal must
 * satisfy closes that gap without re-running any gate that needs the
 * project's live configuration.
 *
 * Only the ACCEPTED iteration's payloads are audited. Earlier cycles
 * are legitimately non-converged — that is why the loop ran again — so
 * applying the convergence rule to them would reject every honest
 * multi-cycle certificate.
 */
async function auditSealedReviewPayloads(
  root: string,
  cert: CompletionCertificate,
): Promise<string[]> {
  const sealed: Array<{ iterIndex: number; relUnderIter: string; evidenceRel: string }> = [];
  for (const entry of cert.evidenceDigests) {
    const evidenceRel = entry.path.replace(/\\/g, "/");
    const match = SEALED_REVIEW_PAYLOAD_RE.exec(evidenceRel);
    if (!match) continue;
    const idxRaw = match[1];
    const relUnderIter = match[2];
    if (idxRaw === undefined || relUnderIter === undefined) continue;
    if (/^spec-\d{4}\//u.test(relUnderIter)) continue;
    const iterIndex = Number.parseInt(idxRaw, 10);
    if (!Number.isInteger(iterIndex)) continue;
    sealed.push({ iterIndex, relUnderIter, evidenceRel });
  }
  if (sealed.length === 0) return [];

  const acceptedIterationIndex = await resolveSealedAcceptedIterationIndex(root);
  if (acceptedIterationIndex === null) {
    // Fail closed: payloads are sealed but the record that says which
    // iteration was accepted is gone, so nothing can be re-audited.
    return [
      `${PROTOTYPING_JSON_REL} is missing or carries no iterations, so the ${sealed.length} ` +
        "sealed review payload(s) cannot be re-audited against the accepted iteration.",
    ];
  }

  const reasons: string[] = [];
  for (const payload of sealed) {
    if (payload.iterIndex !== acceptedIterationIndex) continue;
    if (reasons.length >= SEALED_AUDIT_REASON_CAP) break;
    const audit = await auditReviewPayload(
      path.join(root, PROTOTYPING_EVIDENCE_REL, payload.evidenceRel),
      payloadExpectationFromRel(payload.relUnderIter, acceptedIterationIndex),
    );
    const details = [...audit.schemaErrors, ...audit.identityErrors, ...audit.convergenceErrors];
    for (const detail of details) {
      if (reasons.length >= SEALED_AUDIT_REASON_CAP) break;
      reasons.push(
        `sealed review payload ${PROTOTYPING_EVIDENCE_REL}/${payload.evidenceRel}: ${detail}`,
      );
    }
  }
  return reasons;
}

/**
 * The accepted iteration index as recorded in `prototyping.json`,
 * resolved exactly the way the generate path resolves it. `null` when
 * the record is unreadable or holds no iterations.
 */
async function resolveSealedAcceptedIterationIndex(root: string): Promise<number | null> {
  const protoJson = await loadJson(path.join(root, PROTOTYPING_JSON_REL));
  if (protoJson === null) return null;
  const resolved = resolveCertifyAcceptedIterationIndex(extractIterationViewsForCertify(protoJson));
  if (resolved !== null) return resolved;
  const iterationCount = countIterations(protoJson);
  return iterationCount > 0 ? iterationCount - 1 : null;
}

/**
 * Compare the payload's `(uiContractId, screenId, cycle)` with its
 * storage path and accepted iteration.
 */
function collectIdentityMismatches(
  review: ReviewerPayload,
  expected: ReviewPayloadExpectation,
): string[] {
  const errors: string[] = [];
  if (expected.specDirName !== null && review.uiContractId !== expected.specDirName) {
    errors.push(`uiContractId "${review.uiContractId}" does not identify ${expected.specDirName}`);
  }
  if (review.screenId !== expected.screenId) {
    errors.push(`screenId "${review.screenId}" is not the declared screen "${expected.screenId}"`);
  }
  if (review.cycle !== expected.cycle) {
    errors.push(
      `cycle ${String(review.cycle)} is not the accepted iteration index ${String(expected.cycle)}`,
    );
  }
  return errors;
}

/**
 * Re-derive per-pair convergence from the payload itself, mirroring
 * `core/prototyping/iteration.ts::iterationConverged`: no blocking
 * finding, no layout anti-pattern, no DESIGN.md violation. Every
 * returned string names one reason this pair is not converged.
 *
 * `sessionStatus` gates all of that: the shipped reference declares
 * `retryExhausted` / `launchFailed` as the Reviewer Playwright
 * hard-stop — every attempt failed, or the Reviewer never started —
 * and such a pair is supposed to leave NO payload behind. A file that
 * nonetheless carries a failed status reviewed nothing, so whatever it
 * claims is not evidence; only `ok` describes a session that
 * actually ran.
 */
function collectConvergenceContradictions(review: ReviewerPayload): string[] {
  const errors: string[] = [];
  if (review.sessionStatus !== "ok") {
    errors.push(
      `sessionStatus is "${review.sessionStatus}", not "ok" — the Reviewer session did not ` +
        "complete, so this payload is not evidence of a review",
    );
  }
  if (review.blockingFindings.length > 0) {
    errors.push(`blockingFindings is non-empty: ${review.blockingFindings.join("; ")}`);
  }
  if (review.layoutAntiPatternsDetected.length > 0) {
    errors.push(
      `layoutAntiPatternsDetected is non-empty: ${review.layoutAntiPatternsDetected.join(", ")}`,
    );
  }
  if (review.designMdViolations.length > 0) {
    errors.push(
      `designMdViolations is non-empty: ${review.designMdViolations
        .map((v) => `${v.kind}=${v.found}`)
        .join(", ")}`,
    );
  }
  return errors;
}

/**
 * Render one rejection class to stderr under `heading`.
 *
 * Same bounded-stderr policy as the missing-pair branch: cap the
 * rendered per-payload details so a large frozen set cannot flood the
 * operator's terminal.
 */
function reportPayloadFailures(heading: string, failures: readonly PayloadFailure[]): void {
  error(heading);
  let renderedErrors = 0;
  for (const entry of failures.slice(0, 20)) {
    error(`  - ${entry.expectedPath}:`);
    for (const detail of entry.errors) {
      if (renderedErrors >= 20) break;
      error(`      ${detail}`);
      renderedErrors += 1;
    }
    if (renderedErrors >= 20) break;
  }
}

async function fileExists(absPath: string): Promise<boolean> {
  try {
    const s = await stat(absPath);
    return s.isFile();
  } catch {
    return false;
  }
}

/**
 * Canonical UI contract evidence directory. Historical `spec-NNNN`
 * directories are excluded from the current review gate.
 */
const CANONICAL_SPEC_DIR = /^CON-UI-\d{4}$/u;

/**
 * Returns `true` when the accepted iter directory contains at least
 * one canonical `CON-UI-NNNN` subdirectory. A missing directory yields
 * false; the coverage gate reports missing pair evidence.
 */
async function hasPerSpecSubdir(iterDirAbs: string): Promise<boolean> {
  let names: string[];
  try {
    names = await readdir(iterDirAbs);
  } catch {
    return false;
  }
  for (const name of names) {
    if (!CANONICAL_SPEC_DIR.test(name)) continue;
    const abs = path.join(iterDirAbs, name);
    try {
      const s = await stat(abs);
      if (s.isDirectory()) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractRecord(source: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(source)) return undefined;
  const value = source[key];
  return isRecord(value) ? value : undefined;
}

function extractString(source: unknown, key: string): string | undefined {
  if (!isRecord(source)) return undefined;
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extractNumber(source: unknown, key: string): number | undefined {
  if (!isRecord(source)) return undefined;
  const value = source[key];
  return typeof value === "number" ? value : undefined;
}

function countIterations(protoJson: unknown): number {
  if (!isRecord(protoJson)) return 0;
  const iterations = protoJson.iterations;
  return Array.isArray(iterations) ? iterations.length : 0;
}

/**
 * Extract a structural view of every iteration suitable for the
 * exploration-mode reviewer-gate detector. Delegates to the cross-
 * surface SSOT in `core/prototyping/modeRead.ts#
 * resolvePrototypingIterationViews` so certify and `qfai validate`
 * (via `readPrototypingModeForRelax`) consume the SAME per-iteration
 * view set with sticky-mode inheritance applied.
 *
 * Guarantee that the shared helper enforces:
 *   - relax mode "exploration" (last view's mode = exploration)
 *     IMPLIES at least one explicit exploration iteration exists in
 *     the loop (sticky inheritance can only carry FORWARD an
 *     already-explicit posture);
 *   - therefore certify ALWAYS fires when relax has relaxed — relax
 *     relaxes ⇒ certify rejects. Per-iteration certify is the
 *     stricter superset (it can also fire on
 *     `[exploration, convergence]` shapes that relax does NOT relax,
 *     which is the safe direction).
 *
 * The matching `CertifyIterationView` type from explorationCertify.ts
 * is structurally compatible with `PrototypingIterationView` from
 * modeRead.ts (same `{index, mode?}` shape), so this thin shim is
 * essentially a re-export with the certify-side name retained for
 * the existing reviewer-gate input contract.
 */
export function extractIterationViewsForCertify(
  protoJson: unknown,
): readonly CertifyIterationView[] {
  return resolvePrototypingIterationViews(protoJson);
}

// `DesignMdViolation` is only used as part of typing through the
// findDesignMdViolations import; explicit re-export keeps the tree shake
// stable but is not strictly required.
export type { DesignMdViolation };

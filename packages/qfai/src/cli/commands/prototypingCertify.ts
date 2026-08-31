/**
 * `qfai prototyping certify [--check]` and `qfai prototyping show-spec`.
 *
 * `certify` is the only writer of `.qfai/evidence/prototyping/completion-certificate.json`.
 * It refuses to write the artifact unless every gate passes:
 *   - prototyping.json.fullHarness.runId is present
 *   - .qfai/output/validate.json exists with counts.error === 0
 *   - .qfai/output/verify.json exists with status === "PASS"
 *   - prototyping.json.reviewerGate.result === "PASS"
 *   - root DESIGN.md parses, and the latest iteration HTML contains zero
 *     DESIGN.md violations (color / font / radius / shadow drift)
 *   - every `<screen>.review.json` required by the frozen set EXISTS,
 *     parses against the shipped reviewer payload schema (closed
 *     schema), carries the `(specId, screenId, cycle)` of the pair and
 *     accepted iteration it is stored under, and is itself converged
 *     (4 axes `exceptional`, no layout anti-patterns, no DESIGN.md
 *     violations). All four failures are the same coverage rejection
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
 * `show-spec` prints the resolved primary prototyping spec (config or
 * marker-scan based) so AI consumers do not hardcode a specific spec id.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import { loadConfig, type ConfigLoadResult } from "../../core/config.js";
import {
  extractUiScreens,
  readUiContractScreenContracts,
  type CanonicalScreenContract,
} from "../../core/contracts/screenContracts.js";
import { hashDesignMd, parseDesignMd } from "../../core/design/designMd.js";
import { readDesignMdLockSha } from "../../core/design/designMdLock.js";
import { isEnoent } from "../../core/fs/errno.js";
import { resolvePrototypingIterationViews } from "../../core/prototyping/modeRead.js";
import { PROTOTYPING_EVIDENCE_REL, PROTOTYPING_JSON_REL } from "../../core/prototyping/paths.js";
import {
  readVerifyJson,
  VERIFY_JSON_LEGACY_REL,
  VERIFY_JSON_REL,
} from "../../core/prototyping/verifyJson.js";
import {
  buildCompletionCertificate,
  checkCompletionCertificate,
  COMPLETION_CERTIFICATE_REL_PATH,
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
  ORDINAL_AXES,
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
// 15th-wave Fix (codex r3269453293, P2): show-spec's `liveUiBearing`
// uses the same resolver as iterate's drift gate (`resolveSurfaceUnion`)
// so the live scope reported here is apples-to-apples with what iterate
// enforces. 19th-wave Fix (codex r3270055214, MAJOR): the resolver was
// moved to `core/prototyping/specResolution.ts` so this import lands
// in the core layer instead of taking the sideways CLI → CLI hop on
// `prototypingIterate.ts` that wave-15 left behind.
import {
  classifyFrozenSpecsCoveredMultiSpec,
  readFrozenSpecsCovered,
} from "../../core/prototyping/specsCovered.js";
import { SAAS_PACKAGE_SKIPPED_GATES } from "../../core/saasPackage/skippedGates.js";
import { SUNSETS, deprecationSeverity } from "../../core/sunset.js";
import { resolveToolVersion } from "../../core/version.js";
import { error, info, warn } from "../lib/logger.js";
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
 * hardcoded literal — it is the pre-CHG-005 convention read only during
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
 * Canonical `frozenSpecsCovered[]` entry shape: either a bare 4-digit
 * id or the fully-qualified directory name (`spec-` prefix + 4 digits).
 * The certify-side per-(spec × screen) gate constructs `iter-NN/<id>/
 * <screen>.review.json` paths from these strings, so values containing
 * `/`, `..`, whitespace (leading or trailing), or any other character
 * would let `path.join` escape the intended subtree. Validated at the
 * certify entry point before `normalizeSpecDirName` is ever called.
 *
 * The anchored regex (`^...$`) plus `\d{4}` rejects every variant
 * including leading / trailing / tab whitespace, embedded path
 * separators, non-numeric tails, and wrong-digit-count strings.
 */
const CANONICAL_SPEC_ID = /^(?:spec-)?\d{4}$/u;

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

  // Accept the new top-level `runId` (written by `iterate` at cycle 0) and
  // fall back to the legacy `fullHarness.runId` shape for projects whose
  // prototyping.json predates the UX-loop schema rewrite.
  //
  // The fallback used to be silent. A hybrid record — modern `iterations[]`,
  // legacy `fullHarness.runId` — sealed a completion certificate with
  // `counts.error === 0` and no operator signal at all, while the migration
  // memo told the same operator the shape was rejected from 1.10.0. Reporting
  // it follows the legacy `verify.json` branch below: say so at the severity
  // the version implies, and still seal. Refusing outright would delete the
  // acceptance path, which OC-60 forbids inside the window and which the
  // sunset does not ask for either — the constraint escalates the finding.
  const canonicalRunId = extractString(protoJson, "runId");
  const legacyRunId = extractString(extractRecord(protoJson, "fullHarness"), "runId");
  const runId = canonicalRunId ?? legacyRunId;
  if (!canonicalRunId && legacyRunId) {
    const line =
      `qfai prototyping certify: ${DEPRECATED_SCHEMA_CODE} prototyping.json carries the legacy ` +
      `\`fullHarness.runId\` shape instead of a top-level \`runId\`; sunset: v${SUNSETS.legacyPrototypingJsonShape}. ` +
      `Re-run \`qfai prototyping iterate --cycle 0\` to write the current shape.`;
    if (deprecationSeverity(toolVersion, SUNSETS.legacyPrototypingJsonShape) === "error") {
      error(line);
    } else {
      warn(line);
    }
  }
  if (!runId) {
    error(
      "qfai prototyping certify: prototyping.json#runId is required " +
        "before a completion certificate can be issued (set by `qfai prototyping iterate --cycle 0`).",
    );
    return 2;
  }

  // CHG-006 prototyping-mode discriminator: certify cannot seal a loop that
  // produced any exploration-mode iteration. The check runs before
  // the validate.json / verify.json gates so the operator sees the
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

  const validateJsonPath = path.resolve(options.root, config.output.validateJsonPath);
  const validateJsonRel = path.relative(options.root, validateJsonPath).replace(/\\/g, "/");
  const validateJson = await loadJson(validateJsonPath);
  if (!validateJson) {
    error(
      `qfai prototyping certify: ${validateJsonRel} is missing. ` +
        "Run `qfai validate --profile prototyping --fail-on error` first.",
    );
    return 2;
  }
  // Profile-mismatch gate: when the latest validate.json was produced by
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
      `qfai prototyping certify: validate.json reports ${errorCount} error(s); ` +
        "all must be 0 before certification.",
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
    error(
      `qfai prototyping certify: ${verifyRead.rel} scope is "${verifyScope}" but the ` +
        'prototyping certify gate accepts only scope="prototyping". ' +
        "Re-run `/qfai-verify` with the prototyping scope before certification " +
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
  // For multi-screen specs, the accepted iteration MUST contain HTML
  // for every screen declared in the UI contracts. Otherwise, the
  // current pipeline can seal a certificate while a stale older
  // `iter-NN/<missing-screen>.html` is what `validate` matched
  // against (validateUiEvidenceArtifacts accepts a screen file from
  // ANY iteration directory). Anchor the per-screen check to the
  // ACCEPTED iter only.
  //
  // Codex review: the shipped review-payload reference
  // (`.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`)
  // specifies that only `<screen>.review.json` is a per-cycle Reviewer
  // artifact (no `.html`, no `.png`, no `.interaction.json`). This flat-iter
  // `.html` gate predates that contract and remains in force for
  // backward compatibility with the pre-CHG-002 layout and the
  // current iterate driver, which still emits flat
  // `iter-NN/<screen>.html`. The cleanup is coupled to the per-spec
  // iter-dir migration in `prototypingIterate.ts`; once iterate
  // writes per-spec `iter-NN/spec-NNNN/<screen>.review.json`
  // exclusively, this gate is replaced by the per-(spec x screen)
  // review.json gate below. See the deferred follow-ups note in the
  // governing spec's Plan document.
  const screenContracts = await readUiContractScreenContracts(
    options.root,
    config.paths.contractsDir,
  );
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
      // whose `.qfai/prototypes/iter-NN/index.html` is complete
      // otherwise reads this as "my prototype is missing screens",
      // when the real cause is that the capture step never ran or
      // could not reach those routes.
      error(
        `  These are capture outputs, not authored files. The generator writes ` +
          `.qfai/prototypes/${acceptedIterDir}/index.html; ` +
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
      error(
        "  Recovery: first make each missing screen's contract route reachable from the " +
          "capture target (the built-in --auto-serve server is a static file server and 404s " +
          "path routes; use hash routes or point --target-url at a server with SPA fallback). " +
          "Then re-run the loop from cycle 0. Re-invoking the accepted cycle with --capture " +
          "will not work: that iteration is already recorded in prototyping.json#iterations, " +
          "so iterate exits first on the expected-next-cycle gate. If a listed screen is no " +
          "longer part of the product, delete it from .qfai/contracts/ui/ AND still re-run the " +
          "loop from cycle 0 — deleting alone is not a shortcut past this gate. certify " +
          "recomputes the declared-screen set from the contracts on every run, so a bare " +
          "deletion silently drops that screen's HTML and per-spec review.json checks while " +
          "the already-recorded validate.json, verify.json and reviewerGate results — produced " +
          "against the old scope — are re-used as they are, sealing a certificate whose " +
          "evidence never covered the screen you were experimenting on.",
      );
      error(
        "  The cycle-0 re-run is DESTRUCTIVE, and --force does not make it safe: it renames " +
          "only iter-00 to iter-00.backup-<ISO>. Everything else in " +
          `${PROTOTYPING_EVIDENCE_REL}/ is then reset — iter-01 and up are deleted outright, ` +
          "and prototyping.json#iterations / #reviewerGate are cleared. Copy the whole " +
          `${PROTOTYPING_EVIDENCE_REL}/ directory somewhere safe first if the earlier ` +
          "iterations still matter.",
      );
      return 2;
    }
  }

  // ─── Per-(spec × screen) review.json presence (AC-0012-0047) ───────────
  //
  // Under the CHG-002 schema, every spec in the cycle-0 frozen set must
  // have a `<screen>.review.json` for every declared screen at the
  // accepted iter, namespaced as
  //   `iter-NN/spec-NNNN/<screen>.review.json`.
  //
  // Pre-read the frozen set (it is also read further down to populate
  // `specsCovered` on the certificate body — single source) and pre-read
  // the UI contract screens. Only enforce when both inputs are non-empty:
  //   - empty frozen set → certify already rejects below ("specsCovered
  //     is missing or malformed"); the per-pair check has nothing to do.
  //   - empty screen contracts → no per-screen artifacts are declared
  //     for the project; the legacy flat-iter `index.html` shape stays
  //     valid and the per-pair gate skips, preserving the long-standing
  //     single-page test fixtures.
  //
  // Per-spec screen contracts are deferred to reviewerDispatch (Wave 1).
  // Today, UI contracts under `.qfai/contracts/ui/` are project-wide,
  // so the same screen list applies to every spec in the frozen set.
  //
  // Use the cycle-0-frozen MULTI-spec field (`frozenSpecsCovered`)
  // first; iterate writes the full UI-bearing set there and only the
  // resolved primary spec into `specsCovered`. Reading the legacy
  // single-spec field would silently iterate ONLY the primary spec
  // and let a frozen-set secondary spec ship a sealed certificate
  // with completely-missing review.json files. Fall back to the
  // legacy field for pre-Wave-3 evidence that predates the
  // `frozenSpecsCovered` write.
  // codex r3270861808 (P1, chatgpt-codex-connector): classify the
  // multi-spec field so a PRESENT-but-malformed `frozenSpecsCovered`
  // (key on the record but value is a non-array / empty / non-string
  // / empty-string entry) fails closed with exit 2 instead of silently
  // falling back to the legacy `specsCovered` field. Pre-fix the
  // `?? readFrozenSpecsCovered(...)` null-coalesce collapsed the
  // "missing" and "malformed" cases into one branch, which on a
  // partially-corrupt multi-spec record would downgrade certification
  // scope to the resolved primary spec only — letting missing
  // secondary-spec review evidence ship a sealed certificate. The
  // legacy fallback is now ONLY taken when the field is absent.
  const frozenMultiSpec = classifyFrozenSpecsCoveredMultiSpec(protoJson);
  if (frozenMultiSpec.kind === "malformed") {
    error(
      "qfai prototyping certify: `prototyping.json#frozenSpecsCovered` is present " +
        `but malformed (${frozenMultiSpec.reason}). Failing closed instead of ` +
        "silently downgrading certification scope to the legacy single-spec " +
        "`specsCovered` field — a partial / corrupt edit of the multi-spec frozen " +
        "set must not allow missing secondary-spec review evidence to ship a sealed " +
        "certificate. Re-run `qfai prototyping iterate --cycle 0` to regenerate " +
        "`prototyping.json` with the cycle-0-frozen UI-bearing set.",
    );
    return 2;
  }
  const frozenSpecsPreview =
    frozenMultiSpec.kind === "ok" ? frozenMultiSpec.value : readFrozenSpecsCovered(protoJson);
  if (frozenSpecsPreview !== null && screenContracts.length > 0) {
    // codex r3270776268 (P2): validate canonical spec-id shape BEFORE any
    // path construction. `normalizeSpecDirName` only strips/re-adds the
    // `spec-` prefix, so a hand-edited `prototyping.json` carrying `/`,
    // `..`, or other non-canonical characters in `frozenSpecsCovered[]`
    // would otherwise reach `path.join(options.root, rel)` unmodified and
    // let the per-(spec × screen) gate probe files outside the intended
    // `iter-NN/spec-NNNN/` subtree (potentially "satisfying" missing-
    // review checks with unrelated files). Reject anything that is not
    // either bare `NNNN` or fully-qualified `spec-NNNN` and treat it as
    // structural malformation of the iterate-produced record (exit 2).
    const malformedSpecs = frozenSpecsPreview.filter((id) => !CANONICAL_SPEC_ID.test(id));
    if (malformedSpecs.length > 0) {
      error(
        "qfai prototyping certify: `frozenSpecsCovered[]` contains non-canonical " +
          `spec id(s) ${JSON.stringify(malformedSpecs)} — values must match ` +
          "`spec-NNNN` or bare 4-digit `NNNN`. Refusing to construct review paths " +
          "from unvalidated input; re-run `qfai prototyping iterate --cycle 0` to " +
          "regenerate `prototyping.json` with canonical ids.",
      );
      return 2;
    }
    // The per-(spec × screen) gate runs for EVERY frozen set whose
    // project declares UI screens — single-spec included.
    //
    // It used to be opt-in on the accepted iter actually holding
    // per-spec subdirs (`iter-NN/spec-*/`), on the grounds that the
    // shipped iterate driver + SKILL.md still told the loop to emit
    // only the flat `iter-NN/review.json` summary. That justification
    // is gone: the shipped skill now instructs the reviewer to write
    // `iter-NN/<spec-id>/<screen>.review.json` at cycle 0 and at every
    // later cycle (`assistant/skills/qfai-prototyping/SKILL.md`
    // Step 2-C, `references/reviewer-prompt.md`,
    // `references/iteration-loop.md`). Keeping the skip meant any
    // single-spec run could opt out of the whole payload gate — schema,
    // identity AND convergence — simply by never writing a payload,
    // which is precisely the evidence gap this gate exists to close.
    // A run that has no payloads now gets the missing-pair diagnostic
    // below (exit 64), which names every expected path.
    const acceptedIterAbs = path.join(options.root, PROTOTYPING_EVIDENCE_REL, acceptedIterDir);
    const hasPerSpecLayout = await hasPerSpecSubdir(acceptedIterAbs);
    if (!hasPerSpecLayout && frozenSpecsPreview.length > 1) {
      // codex review r3264798065 (P1): a multi-spec frozen set on a
      // flat iter is reported as a STRUCTURAL incompatibility rather
      // than as N missing pairs — there is no place at all to host the
      // per-spec `<screen>.review.json` files for the secondary
      // spec(s), so naming the layout is the actionable diagnostic.
      error(
        `qfai prototyping certify: accepted iteration ${acceptedIterDir} carries a ` +
          `multi-spec frozen set (frozenSpecsCovered=${JSON.stringify(frozenSpecsPreview)}) ` +
          "but no per-spec iter-NN/spec-NNNN/<screen>.review.json layout is present. " +
          "Multi-spec frozen set requires per-spec iter-NN/spec-NNNN/<screen>.review.json layout; " +
          "the flat-iter layout migration is deferred and is incompatible with multi-spec runs. " +
          "Re-run prototyping with the per-spec layout or restrict the frozen set to a single spec.",
      );
      // Exit 64 matches the prototyping CLI contract's coverage class
      // ("at least one spec lacks a review.json for a declared
      // screen"). Returning 2 (input error) here would split the same
      // coverage rejection across two exit codes and break operator
      // workflows that key on 64 for missing review.json gaps.
      return 64;
    } else {
      if (!hasPerSpecLayout) {
        // Single-spec run on the flat layout: the gate is NOT skipped
        // any more, so say what will happen instead of leaving the
        // operator to read the missing-pair list cold.
        info(
          `qfai prototyping certify: per-spec ${acceptedIterDir}/spec-NNNN layout not detected — ` +
            "the per-(spec x screen) review.json gate still applies to single-spec runs; every " +
            "declared screen needs its payload under the per-spec directory.",
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
      // codex r3270911400 (P1, chatgpt-codex-connector): the previous
      // optimisation pre-built a per-spec map from `screenContracts.sourceRef`
      // and used it whenever the indexed entry was non-empty, only
      // falling back to `readPerSpecScreens` when the entry was
      // missing/empty. That was unsafe for multi-file subdir layouts: a
      // spec whose `home` was project-wide-dedupped to another spec but
      // whose `settings` survived would end up with `perSpecFiles[spec]
      // = {spec/settings.yaml}` only — the indexed re-parse missed
      // `spec/home.yaml` entirely and the gate happily passed without
      // requiring `<spec>/home.review.json`. We now call
      // `readPerSpecScreens` unconditionally for every spec in the
      // frozen set; that helper does its own authoritative fs discovery
      // (`fg(... spec-NNNN/**\/*.yaml)` for subdir layouts), so the
      // per-spec scope is always complete. The optimisation saved one
      // glob per spec; for the typical N ≤ 10 specs case the wall-clock
      // cost is negligible compared to the safety gain.
      for (const rawSpec of frozenSpecsPreview) {
        const specDirName = normalizeSpecDirName(rawSpec);
        // codex r3265157640 (P1): when a per-spec UI contract exists at
        // `.qfai/contracts/ui/<spec-id>.yaml`, it scopes which screens
        // are declared for THIS spec — not the project-wide screen set.
        // Pre-fix the gate required the cross-product (every spec × every
        // project-wide screen), which produced spurious "missing
        // (spec-0001, settings)" rejections when the spec's own contract
        // only declared `home`. Fall back to the project-wide list for
        // backward-compatibility with single-spec projects that have a
        // single shared contract.
        const perSpecScreens = await readPerSpecScreens(
          options.root,
          config.paths.contractsDir,
          specDirName,
        );
        const scopedScreens = perSpecScreens ?? screenContracts;
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
          // (`.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`)
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
      // Spec directories OUTSIDE the frozen set are never visited by
      // the loop above, yet the certificate digests them all the same:
      // an `old.review.json` under a spec directory that dropped out
      // of the frozen set would ship unread. Sweep every canonical
      // per-spec directory the accepted iteration actually holds.
      const frozenDirNames = new Set(frozenSpecsPreview.map(normalizeSpecDirName));
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
      // Finally, payloads that live under NO canonical per-spec
      // directory at all — a flat `iter-NN/<screen>.review.json`, or one
      // parked under a non-`spec-NNNN` sibling folder. The certificate's
      // digest walk is recursive over the whole evidence root, so these
      // ship sealed as well; audit what can be audited (schema +
      // convergence + the screen / cycle their own path claims). Their
      // `specId` is not anchored by a directory, so identity is checked
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
            "(spec, screen) pair(s):",
        );
        // Cap the per-pair log output to keep operator-facing stderr
        // bounded on large frozen sets — same pattern as the
        // missing-HTML branch above (`missing.slice(0, 10)`).
        for (const m of missingPairs.slice(0, 20)) {
          error(`  - ${m.spec} / ${m.screen} (expected ${m.expectedPath})`);
        }
        // 12th-wave Fix (codex r3265482136, P2): missing review.json
        // coverage at the per-spec layout is the same rejection class
        // as the flat-iter multi-spec coverage gap above (exit 64),
        // not an input error. The CLI contract's exit-code table
        // declares "at least one spec lacks a review.json for a
        // declared screen" → exit 64; returning 2 (input error) here
        // would split the same coverage rejection across two exit
        // codes and break operator workflows that key on 64.
        return 64;
      }
      if (invalidPayloads.length > 0) {
        reportPayloadFailures(
          "qfai prototyping certify: accepted iteration " +
            `${acceptedIterDir} has ${invalidPayloads.length} review.json payload(s) that ` +
            "do not satisfy the reviewer payload schema " +
            "(.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md):",
          invalidPayloads,
        );
        // A malformed payload is the same evidence gap as a missing
        // one — the (spec, screen) pair carries no parsable review —
        // so it shares the coverage rejection code (exit 64) instead
        // of introducing a third exit code for the same class.
        return 64;
      }
      // A schema-valid payload copied in from another screen, another
      // spec, or an earlier cycle parses cleanly while reviewing
      // something else entirely. The payload's own
      // `(specId, screenId, cycle)` discriminators exist precisely to
      // make that detectable, so hold them against the pair and the
      // accepted iteration this file is filed under.
      if (mismatchedPayloads.length > 0) {
        reportPayloadFailures(
          "qfai prototyping certify: accepted iteration " +
            `${acceptedIterDir} has ${mismatchedPayloads.length} review.json payload(s) whose ` +
            "(specId, screenId, cycle) identity does not match the (spec, screen) pair and " +
            "accepted iteration they are stored under — a payload copied from another pair or " +
            "cycle is not evidence for this one:",
          mismatchedPayloads,
        );
        // Same class as a missing payload: the pair still carries no
        // review of ITS OWN surface.
        return 64;
      }
      // `reviewerGate.result === "PASS"` is a summary claim (gated
      // above); the per-screen payloads are the evidence behind it.
      // Convergence is an AND over every (spec, screen) pair — a
      // completed Reviewer session (`sessionStatus: "ok"`), all 4
      // ordinal axes `exceptional`, `layoutAntiPatternsDetected` and
      // `designMdViolations` both empty (see
      // `core/prototyping/iteration.ts::allFourAxesExceptional` /
      // `shouldStopAcrossSpecs`) — so a payload that fails it
      // contradicts the summary, and sealing the certificate on top of
      // that contradiction is exactly the drift certify exists to stop.
      if (unconvergedPayloads.length > 0) {
        reportPayloadFailures(
          "qfai prototyping certify: prototyping.json#reviewerGate.result is PASS but accepted " +
            `iteration ${acceptedIterDir} has ${unconvergedPayloads.length} review.json ` +
            "payload(s) that contradict convergence (every (spec, screen) pair needs " +
            '`sessionStatus: "ok"` and all 4 ordinal axes `exceptional` with ' +
            "layoutAntiPatternsDetected and designMdViolations empty):",
          unconvergedPayloads,
        );
        // Non-converged per-screen evidence is the same evidence-gap
        // class as a missing or unparsable payload: the pair has no
        // review that supports certification.
        return 64;
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

  // Read the frozen spec set recorded by `iterate --cycle 0`.
  //
  // Codex P1 (r3264670163): under multi-spec runs the legacy
  // `specsCovered` field holds only the resolved primary spec, while
  // `frozenSpecsCovered` is the cycle-0-frozen FULL UI-bearing set.
  // Building the completion certificate from the legacy field would
  // ship a cert that claims only the primary spec even when per-spec
  // review.json files exist for the secondary specs — corrupting the
  // audited scope of a completed multi-spec run. Mirror the per-(spec
  // x screen) review.json gate above: prefer the multi-spec field;
  // fall back to the legacy single-spec field for pre-Wave-3 evidence
  // that predates the `frozenSpecsCovered` write so older runs still
  // certify cleanly.
  //
  // Re-resolving the primary spec here would let a config edit
  // (`prototyping.primarySpecId`) or a marker change between cycle 0
  // and certify silently re-baseline the certificate to a spec the
  // loop never exercised. The loop seed is the SSOT for what was
  // actually reviewed.
  // codex r3270861808 (P1, chatgpt-codex-connector): mirror the per-
  // (spec × screen) gate's fail-closed classification at the cert-
  // sealing call site too. A PRESENT-but-malformed `frozenSpecsCovered`
  // here would downgrade the sealed certificate's `specsCovered` body
  // field to the legacy single-spec scope and let a multi-spec frozen
  // set ship a certificate that records only the primary spec.
  const certFrozenMultiSpec = classifyFrozenSpecsCoveredMultiSpec(protoJson);
  if (certFrozenMultiSpec.kind === "malformed") {
    error(
      "qfai prototyping certify: `prototyping.json#frozenSpecsCovered` is present " +
        `but malformed (${certFrozenMultiSpec.reason}) at cert-sealing time. Failing ` +
        "closed instead of silently sealing the certificate against the legacy " +
        "single-spec `specsCovered` field. Re-run `qfai prototyping iterate --cycle 0` " +
        "to regenerate the multi-spec frozen set.",
    );
    return 2;
  }
  const specsCovered =
    certFrozenMultiSpec.kind === "ok"
      ? certFrozenMultiSpec.value
      : readFrozenSpecsCovered(protoJson);
  if (specsCovered === null) {
    error(
      "qfai prototyping certify: prototyping.json#specsCovered is missing or malformed — " +
        "re-run prototyping from cycle 0 so the seed cycle records the spec(s) under review.",
    );
    return 2;
  }

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
        "Re-run /qfai-sdd Phase 0 to regenerate the lock before sealing.",
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
    // codex 8zqb: findStaleIterDirs propagates non-ENOENT fs errors
    // (EACCES / EPERM / EIO) so a permission flip cannot silently
    // bypass the stale-iter guard — symmetric with the lock
    // `unreadable` path. Surface a clear operator-facing message
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
    validateRun: { errorCount: 0, ranAt: new Date().toISOString() },
    verifyRun: { status: "PASS", ranAt: new Date().toISOString() },
    reviewerSignoff: {
      reviewerId,
      approved: true,
      timestamp: reviewerTimestamp,
    },
    iterationCount,
    specsCovered,
    designMd: designMdRecord,
    ...(isSaasPackageScope ? { scope: "saas-package" as const } : {}),
    ...(saasPackageNotes ? { notes: saasPackageNotes } : {}),
  });

  const certPath = await writeCompletionCertificate(options.root, cert);
  info(`qfai prototyping certify: wrote ${certPath}`);
  info(`  runId: ${runId}`);
  info(`  evidenceFiles: ${cert.evidenceDigests.length}`);
  info(`  specsCovered: ${specsCovered.join(", ") || "(none)"}`);
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
 * Print the cycle-0 frozen specsCovered[] from prototyping.json so the
 * operator can see which specs the current `/qfai-prototyping` run
 * iterates over.
 *
 * 12th-wave Fix (codex r3265482150, P2): pre-fix this command resolved
 * the LIVE primary spec from the config / spec markers and never read
 * `prototyping.json`. After cycle 0 the frozen scope can diverge from
 * the live config (a primary spec id renamed, markers moved between
 * specs, etc.), so the pre-fix output misled agents about which spec
 * iterate/certify were actually operating on. Now reads the frozen
 * `specsCovered[]` (and, when present, `frozenSpecsCovered[]`) and
 * exits 2 if `prototyping.json` is missing or malformed — matching the
 * CLI contract §`qfai prototyping show-spec`.
 *
 * Output payload (JSON):
 *   - `frozenSpecsCovered`: single-spec scope under review (cycle-0
 *      frozen primary).
 *   - `frozenSpecsCoveredSource`: discriminant indicating which
 *      `prototyping.json` field the spec list was read from
 *      (`"frozenSpecsCovered"` on current records, `"specsCovered"`
 *      on pre-Wave-3 legacy records). Added in the 14th-wave fix
 *      (codex r3269198684) so operators can detect legacy seed
 *      records without re-reading the file.
 *   - `frozenSurfaceUnion`: multi-spec UI-bearing UNION snapshot at
 *      cycle 0 (drift baseline). May be absent on pre-11th-wave
 *      records — surfaced as `null` so the consumer can distinguish
 *      "field absent" from "field present but empty".
 *   - `liveUiBearing`: current `resolveSurfaceUnion()` result (the
 *      same resolver iterate's cycle ≥ 1 drift gate uses — strict
 *      frontmatter + title-marker + `primarySpecId` config pin + UI
 *      contract signals) so the live scope reported here is
 *      apples-to-apples with what iterate enforces. Emitted as
 *      `string[]` of bare spec IDs (15th + 16th-wave alignment;
 *      pre-fix the field was `SpecRef[]` from
 *      `resolveAllUiBearingSpecs`).
 *   - `primary?`: present iff a primary spec resolves; carries
 *      `{specId, specMdPath, source}`.
 */
export async function runPrototypingShowSpec(options: { root: string }): Promise<number> {
  const { config } = await loadConfig(options.root);

  const protoJsonAbs = path.join(options.root, PROTOTYPING_JSON_REL);
  const protoRaw = await loadJson(protoJsonAbs);
  if (protoRaw === null) {
    error(
      `qfai prototyping show-spec: ${PROTOTYPING_JSON_REL} is missing or unparseable. ` +
        "show-spec reads the cycle-0 frozen specsCovered[] — run " +
        "`qfai prototyping iterate --cycle 0 --target-url <url>` to seed " +
        "prototyping.json, or check the file is valid JSON.",
    );
    return 2;
  }
  if (typeof protoRaw !== "object" || Array.isArray(protoRaw)) {
    error(
      `qfai prototyping show-spec: ${PROTOTYPING_JSON_REL} is not a JSON object — ` +
        "show-spec cannot read the frozen specsCovered[] from a non-object root.",
    );
    return 2;
  }
  const protoRecord = protoRaw as Record<string, unknown>;
  // codex r3271018000 (P2, chatgpt-codex-connector): show-spec previously
  // read `frozenSpecsCovered` via `readStringArrayField`, which collapses
  // "field absent" and "field present-but-invalid" into a single `null`
  // return value. That let `?? readStringArrayField(protoRecord.specsCovered)`
  // silently downgrade to legacy single-spec scope even when the operator
  // intended a multi-spec frozen scope but corrupted the JSON. certify
  // already treats a present-but-malformed `frozenSpecsCovered` as a hard
  // error (AC-0012-0045 class (h)); show-spec must mirror that contract on
  // its own surface so operators / automation making recovery decisions
  // from the scope output cannot be misled. (iterate-side present-but-
  // malformed `frozenSpecsCovered` is handled separately: iterate consumes
  // the legacy `specsCovered` reader for the cycle ≥ 1 shallow-equal
  // primary-spec check, and reads the multi-spec drift baseline from
  // `frozenSurfaceUnion`, not `frozenSpecsCovered`.) Use the same SSOT
  // classifier the certify call sites already consume so the three
  // surfaces — certify per-(spec × screen) gate, certify cert-sealing,
  // and show-spec — share one absent-vs-malformed decision rule (codex
  // r3271093206 FYI scope-narrowing note).
  const showSpecFrozenMultiSpec = classifyFrozenSpecsCoveredMultiSpec(protoRecord);
  if (showSpecFrozenMultiSpec.kind === "malformed") {
    // codex r3271639132 (NIT, product-surface-reviewer, 44th-wave):
    // 2-block CTA + `Reason:` layout matches the iterate-side
    // `frozenSurfaceUnion missing` diagnostic (introduced 24th-wave per
    // codex r3270459355). The recovery action stays the headline; the
    // rationale (cross-surface symmetry, iterate-side handled
    // separately) follows on an indented line after a blank separator
    // so narrow-terminal wrap cannot visually fuse the CTA with the
    // rationale.
    error(
      "qfai prototyping show-spec: `prototyping.json#frozenSpecsCovered` is present " +
        `but malformed (${showSpecFrozenMultiSpec.reason}). Re-run ` +
        "`qfai prototyping iterate --cycle 0` to regenerate the record.",
    );
    error("");
    error(
      "  Reason: refusing to report a downgraded single-spec scope from the legacy " +
        "`specsCovered` field — certify treats the same input as a hard error and " +
        "refuses to seal a certificate from a partially-corrupt multi-spec scope, " +
        "so a downgraded show-spec output would mislead recovery decisions. " +
        "(iterate-side handles present-but-malformed `frozenSpecsCovered` separately " +
        "via the legacy `specsCovered` reader and the `frozenSurfaceUnion` drift gate.)",
    );
    return 2;
  }
  const frozenSpecsCovered =
    showSpecFrozenMultiSpec.kind === "ok" ? showSpecFrozenMultiSpec.value : null;
  const specsCovered = frozenSpecsCovered ?? readStringArrayField(protoRecord.specsCovered);
  if (specsCovered === null || specsCovered.length === 0) {
    error(
      `qfai prototyping show-spec: ${PROTOTYPING_JSON_REL} is missing a valid ` +
        "`frozenSpecsCovered[]` (or legacy `specsCovered[]`) — re-run " +
        "`qfai prototyping iterate --cycle 0 --target-url <url>` to seed it.",
    );
    return 2;
  }
  // 14th-wave Fix (codex r3269198684, MINOR): surface which prototyping.json
  // field the spec list was actually read from so operators doing drift
  // analysis can tell post-Wave-3 records (frozen field present) apart from
  // legacy Wave-2 records (only `specsCovered` on disk). Pre-fix the payload
  // emitted the value under the key `frozenSpecsCovered` regardless of
  // source, which masked the signal that cycle 0 was seeded with the
  // pre-CHG-002 schema.
  const frozenSpecsCoveredSource: "frozenSpecsCovered" | "specsCovered" =
    frozenSpecsCovered !== null ? "frozenSpecsCovered" : "specsCovered";
  const frozenSurfaceUnion = readStringArrayField(protoRecord.frozenSurfaceUnion);
  // Compute the live UI-bearing union so the operator can spot drift.
  // The legacy primary-resolver path is preserved as a fallback `specMdPath`
  // so existing operator tooling that reads the per-spec path keeps working.
  //
  // 15th-wave Fix (codex r3269453293, P2): use `resolveSurfaceUnion` here
  // — the SAME resolver the cycle ≥ 1 drift gate uses — so show-spec's
  // `liveUiBearing` covers the full union (strict `surface_type:
  // ui-bearing` + legacy `# … prototyping …` title-marker +
  // `prototyping.primarySpecId` config pin + UI contract signals).
  // Pre-fix show-spec called `resolveAllUiBearingSpecs`, which returns
  // only the strict signals; on projects relying on non-strict markers
  // operators saw a narrower live set than iterate actually enforces,
  // producing false "drift" diagnostics that did not match the iterate
  // gate. 19th-wave Fix (codex r3270055214, MAJOR): `resolveSurfaceUnion`
  // now lives at `core/prototyping/specResolution.ts` (the canonical
  // core-layer location); `prototypingIterate.ts` only re-exports it
  // for back-compat with the wave-8/10/13 unit tests. Both CLI
  // commands import from the core module directly (codex r3270215029
  // / r3270209821 21st-wave comment refresh).
  const liveUiBearing = await resolveSurfaceUnion(options.root, config);
  const primary = await resolvePrimaryPrototypingSpec(options.root, config);
  const payload: Record<string, unknown> = {
    frozenSpecsCovered: specsCovered,
    frozenSpecsCoveredSource,
    frozenSurfaceUnion: frozenSurfaceUnion,
    liveUiBearing,
  };
  if (primary !== undefined) {
    payload.primary = {
      specId: primary.specId,
      specMdPath: path.relative(options.root, primary.specMdPath).replace(/\\/g, "/"),
      source: primary.source,
    };
  }
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
  // for pre-CHG-005 consumer state). When the legacy path is used a
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
    // recovery message and lives outside the codex r3338253318
    // threat model. Should the canonical-admissible path become a
    // recovery target in a future release, mirror this gate onto
    // canonical with the same mtime invariant. The `legacy` source
    // is also exempt — `.qfai/output/...` is the pre-CHG-005 layout
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
      // pre-CHG-005 layouts and any flow that never wrote canonical
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
    // profile name (full / verify / tdd / atdd / ...) the existing
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
 * canonical path by default under CHG-005).
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
  //       pre-CHG-005 path; kept for back-compat with the
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
    specsCovered: cert.specsCovered,
    ...(cert.designMd ? { designMd: cert.designMd } : {}),
  };
  return next;
}

/**
 * Narrow an unknown value to `string[]` of non-empty strings, or
 * `null` when the value is missing / malformed. Shared by show-spec
 * to read both `frozenSpecsCovered` and `frozenSurfaceUnion`.
 */
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
 * fail-closed posture (codex 8zqb regression sentinel) — not part
 * of the package's public surface.
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
    // `unreadable` LockGateResult branch above (codex 8cTg). Returning
    // [] here would let a permission flip silently bypass the
    // stale-iter guard, which is the same vector the lock fix closed.
    // Symmetric: propagate so certify's caller surfaces a hard error
    // rather than seal a possibly-stale digest set.
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
      if (s.isDirectory()) stale.push(name);
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
 * The (spec, screen, cycle) triple a payload is filed under.
 *
 * `specDirName` is `null` for a payload that sits under no canonical
 * `spec-NNNN` directory (a flat `iter-NN/<screen>.review.json`, or one
 * parked in a non-canonical sibling folder). Nothing on such a path
 * asserts which spec the file belongs to, so the identity check holds
 * it to the two discriminators the path does carry (screen, cycle)
 * rather than inventing a spec to compare against.
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
 * (`.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`)
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
 * per-spec directory that the declared-pair sweep did not already
 * open (`skipScreens`), filing each finding in the same bucket the
 * declared-pair sweep uses. A stray payload is held against the spec
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
    // opened, and those live directly in the per-spec directory. A
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
 * Canonical `spec-NNNN` subdirectories an iteration directory holds,
 * sorted. Unreadable directory yields `[]` — the layout gate above
 * already decides whether a per-spec layout is required at all.
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
 * (`spec-NNNN/archive/old.review.json`) is sealed into the certificate
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
 * NOT sit inside a canonical `spec-NNNN` subtree — the per-spec sweeps
 * cover those. Paths are relative to the iteration directory.
 */
async function listStrayIterationPayloads(iterDirAbs: string): Promise<string[]> {
  const all = await listReviewPayloadFiles(iterDirAbs);
  return all.filter((rel) => {
    const first = rel.split("/")[0];
    return !(rel.includes("/") && first !== undefined && CANONICAL_SPEC_DIR.test(first));
  });
}

/** The screen id a payload path claims: its basename minus the suffix. */
function payloadScreenId(rel: string): string {
  const fileName = rel.slice(rel.lastIndexOf("/") + 1);
  return fileName.slice(0, -REVIEW_PAYLOAD_SUFFIX.length);
}

/**
 * Derive the `(spec, screen, cycle)` a payload path claims, given the
 * path relative to its iteration directory. The spec is anchored only
 * when the first segment is a canonical `spec-NNNN` directory; see
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
 * Compare the payload's own `(specId, screenId, cycle)` discriminators
 * with the pair and accepted iteration it is stored under. `specId` is
 * normalised first so both the bare `NNNN` and the fully-qualified
 * `spec-NNNN` spellings the frozen set allows compare equal.
 */
function collectIdentityMismatches(
  review: ReviewerPayload,
  expected: ReviewPayloadExpectation,
): string[] {
  const errors: string[] = [];
  if (
    expected.specDirName !== null &&
    normalizeSpecDirName(review.specId) !== expected.specDirName
  ) {
    errors.push(`specId "${review.specId}" does not identify ${expected.specDirName}`);
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
 * `core/prototyping/iteration.ts::allFourAxesExceptional`: all 4
 * ordinal axes `exceptional`, no layout anti-patterns, no DESIGN.md
 * violations. Every returned string names one reason this pair is not
 * converged.
 *
 * `sessionStatus` gates all of that: the shipped reference declares
 * `retryExhausted` / `launchFailed` as the Reviewer Playwright
 * hard-stop — every attempt failed, or the Reviewer never started —
 * and such a pair is supposed to leave NO payload behind. A file that
 * nonetheless carries a failed status reviewed nothing, so whatever
 * axes it claims are not evidence; only `ok` describes a session that
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
  for (const axis of ORDINAL_AXES) {
    const verdict = review.ordinalAxes[axis];
    if (verdict !== "exceptional") {
      errors.push(`ordinalAxes.${axis} is "${verdict}", not "exceptional"`);
    }
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
 * Canonical per-spec evidence directory shape: `spec-NNNN` where NNNN
 * is exactly 4 digits. Used by {@link hasPerSpecSubdir} to gate
 * activation of the per-(spec × screen) review.json presence check on
 * the actual evidence layout — unrelated names like `spec-assets` /
 * `spec-temp` / `spec-archive` MUST NOT enable the gate (codex
 * r3271018003 P2 — chatgpt-codex-connector: pre-fix any `spec-*`
 * directory triggered the gate, so a legacy flat-iter project with an
 * incidental `spec-assets/` sibling would have the gate spuriously
 * activated and fail with missing review.json coverage that the run
 * never intended to produce).
 */
const CANONICAL_SPEC_DIR = /^spec-\d{4}$/u;

/**
 * Returns `true` when the accepted iter directory contains at least
 * one canonical `spec-NNNN` subdirectory (per-spec layout). Used by
 * the per-(spec × screen) review.json gate to skip enforcement on
 * legacy flat-iter projects, which the shipped iterate driver +
 * SKILL.md still emit until the per-spec layout migration lands.
 *
 * ENOENT / non-readable iter dir → `false` (gate stays off): the
 * accepted iter HTML gate above already required the dir to exist
 * and contain HTML, so reaching here with a missing dir is the
 * legitimate "no per-spec layout" answer rather than a hidden error.
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

/**
 * Parse a single UI contract YAML file and return its
 * `CanonicalScreenContract[]` records with `sourceRef` set to
 * `<rel-path>#<screenId>`. Shared by `readPerSpecScreens` so the
 * id/route/title/primary_tasks extraction logic lives in exactly one
 * place (`extractUiScreens`); see SOLID/DRY rationale on the export
 * declaration in `core/contracts/screenContracts.ts`.
 *
 * Returns an empty array on read / parse failure or on a missing
 * `screens:` array.
 *
 * 13th-wave Fix (codex r3265813656, MINOR): pre-fix the read / parse
 * failure path silently swallowed the error and returned `[]`, which
 * the aggregate-warn at the call site only surfaced when the entire
 * matched set produced zero screens. In a half-failure (e.g. three
 * matched files, one with a YAML parse error, two with valid
 * `screens:`), the call site's aggregate warn never fired because the
 * other files filled the array — and the operator never saw the parse
 * error. This per-file `warn` line names the offending file and
 * narrows the error class (read vs parse) so authoring typos surface
 * at the certify gate. The function still returns `[]` on failure so
 * existing callers keep their contracts; CLAUDE.md "every async path
 * must have explicit error handling" is satisfied via the
 * named-error warn.
 */
async function parseUiScreenFile(
  root: string,
  absPath: string,
): Promise<CanonicalScreenContract[]> {
  const relRef = path.relative(root, absPath).replace(/\\/g, "/");
  let raw: string;
  try {
    raw = await readFile(absPath, "utf-8");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    warn(
      `qfai prototyping certify: UI contract file ${relRef} could not be read ` +
        `(${reason}); treating as zero screens.`,
    );
    return [];
  }
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    warn(
      `qfai prototyping certify: UI contract file ${relRef} could not be parsed ` +
        `as YAML (${reason}); treating as zero screens.`,
    );
    return [];
  }
  return extractUiScreens(parsed).map((screen) => ({
    ...screen,
    sourceRef: `${relRef}#${screen.screenId}`,
  }));
}

/**
 * Read the per-spec UI contract for `<specDirName>` (e.g. `spec-0007`) if
 * one exists under `<contractsDir>/ui/`. Returns the screens declared by
 * that contract, or `null` when no per-spec contract file matches.
 *
 * codex r3265157640 (P1): UI contracts can be authored either project-wide
 * (one `screens:` list under `.qfai/contracts/ui/`, applies to every
 * spec in the frozen set) or per-spec (one contract file per spec, scopes
 * screen declarations to THAT spec). The per-(spec × screen) certify gate
 * must respect the per-spec scope when available — pre-fix it always used
 * the project-wide list and produced spurious cross-product rejections.
 *
 * Resolution order (TRUE first-hit-wins for canonical single-file
 * candidates; multi-file shapes are only considered when no canonical
 * single file matches):
 *   1. `<contractsDir>/ui/<specDirName>.yaml`            (e.g. `spec-0007.yaml`)
 *   2. `<contractsDir>/ui/<bareNumeric>.yaml`            (e.g. `0007.yaml`)
 *   3. `<contractsDir>/ui/ui-<bareNumeric>.yaml`         (e.g. `ui-0007.yaml`)
 *
 *   If none of 1-3 matches, the function falls back to multi-file shapes
 *   (every match contributes screens):
 *   4. `<contractsDir>/ui/ui-<bareNumeric>-<slug>.yaml` (glob; e.g. `ui-0007-home.yaml`)
 *   5. `<contractsDir>/ui/<specDirName>/<subpath>.yaml` (recursive subdir layout)
 *
 * Behaviour for 1-3 is TRUE first-hit: the loop breaks on the first match
 * so an authoring fork that left both `spec-0007.yaml` and `ui-0007.yaml`
 * on disk uses `spec-0007.yaml` only — the prior implementation read
 * BOTH and unioned screens, producing surprising cross-file behaviour.
 * Candidates 4 (glob) and 5 (subdir) are aggregated together because
 * their entire purpose is multi-file authoring; deduplication is
 * first-write-wins (matches `readUiContractScreenContracts`).
 *
 * Returns `null` when none of the candidates exists OR when matched
 * files parse but declare no `screens:`. The caller falls back to the
 * project-wide list in either case so a malformed per-spec contract
 * does not silently zero-out the gate.
 *
 * Returns the deduplicated `CanonicalScreenContract[]` list
 * (first-write wins for duplicate `screenId`s across multiple matched
 * files; matches `readUiContractScreenContracts`'s `findIndex`
 * dedup semantics — pre-fix the JSDoc claimed "last-write wins"
 * which contradicted the impl).
 *
 * Diagnostic logging: when at least one file matched but no screens
 * were extracted (e.g. YAML parse error, `screens:` typo, non-array
 * `screens`), emits a `warn` line naming the file path(s) so operators
 * see authoring issues at certify time instead of silently falling
 * back to the project-wide list.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export async function readPerSpecScreens(
  root: string,
  contractsDirRelative: string,
  specDirName: string,
): Promise<CanonicalScreenContract[] | null> {
  // codex r3271715563 (P1, chatgpt-codex-connector, 47th-wave): use
  // `path.resolve` instead of `path.join` so an absolute `paths.contractsDir`
  // override in `qfai.config.yaml` (e.g. `/tmp/contracts`) resolves to
  // the absolute path directly. Pre-fix `path.join(root, "/tmp/contracts",
  // "ui")` produced `<root>/tmp/contracts/ui` (string concatenation, no
  // absolute-segment reset), so per-spec contract discovery missed every
  // file under the absolute contractsDir. Certify then fell back to the
  // project-wide screen list and enforced wrong (spec, screen) coverage
  // for explicit-contracts-dir workflows. Mirrors the wave-45 fix for
  // `specDirExists` against `paths.specsDir`.
  const uiDir = path.resolve(root, contractsDirRelative, "ui");
  const bareNumeric = specDirName.replace(/^spec-/iu, "");
  const singleFileCandidates = [
    path.join(uiDir, `${specDirName}.yaml`),
    path.join(uiDir, `${bareNumeric}.yaml`),
    path.join(uiDir, `ui-${bareNumeric}.yaml`),
  ];
  const matched: string[] = [];
  // True first-hit-wins: stop on first existing canonical candidate so
  // authoring forks (e.g. both spec-0007.yaml AND ui-0007.yaml on disk)
  // produce deterministic per-spec scope.
  for (const abs of singleFileCandidates) {
    if (await fileExists(abs)) {
      matched.push(abs);
      break;
    }
  }
  if (matched.length === 0) {
    // Multi-file shapes (glob + subdir layout). The glob targets the
    // `ui-NNNN-<slug>.yaml` split-naming convention; the subdir targets
    // `<spec-id>/**\/*.yaml` for projects that group per-spec contracts
    // in a directory.
    const uiDirPosix = uiDir.replace(/\\/g, "/");
    const globPattern = path.posix.join(uiDirPosix, `ui-${bareNumeric}-*.yaml`);
    const subdirPattern = path.posix.join(uiDirPosix, specDirName, "**", "*.yaml");
    const [globMatches, subdirMatches] = await Promise.all([
      fg(globPattern, { absolute: true }),
      fg(subdirPattern, { absolute: true }),
    ]);
    matched.push(...globMatches, ...subdirMatches);
  }
  if (matched.length === 0) return null;

  const screens: CanonicalScreenContract[] = [];
  for (const abs of matched) {
    const fileScreens = await parseUiScreenFile(root, abs);
    screens.push(...fileScreens);
  }
  if (screens.length === 0) {
    // Surface the authoring issue: per-spec UI contract files exist
    // for this spec but produced zero valid screens. Without this warn
    // the caller silently falls back to the project-wide list (the
    // 9th-wave cross-product behaviour). Operator gets a named path
    // instead of a confusing "missing pair" error at the gate below.
    const relPaths = matched.map((m) => path.relative(root, m).replace(/\\/g, "/")).join(", ");
    warn(
      `qfai prototyping certify: per-spec UI contract file(s) for ${specDirName} ` +
        `(${relPaths}) parsed but declared no valid screens; falling back to the ` +
        "project-wide screen list. Check the YAML for parse errors, a `screens:` " +
        "typo, or missing `id`/`route` on each entry.",
    );
    return null;
  }
  // First-write-wins dedup across multi-file matches (glob + subdir
  // layout can both surface duplicate `screenId`s). Matches the
  // `readUiContractScreenContracts` semantics.
  return screens.filter((s, idx, all) => all.findIndex((c) => c.screenId === s.screenId) === idx);
}

/**
 * Normalize a `specsCovered[]` entry to its `spec-NNNN` directory name.
 *
 * `prototyping.json#specsCovered` entries are persisted by `iterate
 * --cycle 0` as bare 4-digit numeric strings; some authoring paths may
 * also write the fully-qualified `spec-NNNN` form. Both shapes must
 * resolve to the same on-disk directory under `iter-NN/`. The strip +
 * re-prefix is byte-stable and idempotent (already-prefixed input
 * round-trips unchanged).
 */
function normalizeSpecDirName(raw: string): string {
  const stripped = raw.replace(/^spec-/iu, "");
  return `spec-${stripped}`;
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
 *     which is the safe direction — codex r3338446583).
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

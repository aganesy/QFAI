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
 *
 * `certify --check` re-computes evidence digests against the stored
 * certificate and exits non-zero on drift. The check ALSO re-hashes the
 * root DESIGN.md when the certificate carries `designMd`, so editing
 * the brand SSOT after certification fails the check.
 *
 * `show-spec` prints the resolved primary prototyping spec (config or
 * marker-scan based) so AI consumers do not hardcode a specific spec id.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import { loadConfig } from "../../core/config.js";
import {
  readUiContractScreenContracts,
  type CanonicalScreenContract,
} from "../../core/contracts/screenContracts.js";
import { hashDesignMd, parseDesignMd } from "../../core/design/designMd.js";
import { readDesignMdLockSha } from "../../core/design/designMdLock.js";
import { isEnoent } from "../../core/fs/errno.js";
import { PROTOTYPING_EVIDENCE_REL, PROTOTYPING_JSON_REL } from "../../core/prototyping/paths.js";
import {
  buildCompletionCertificate,
  checkCompletionCertificate,
  writeCompletionCertificate,
  type CompletionCertificateDesignMd,
} from "../../core/prototyping/certificate.js";
import {
  findDesignMdViolations,
  type DesignMdViolation,
} from "../../core/prototyping/designMdViolations.js";
import { resolvePrimaryPrototypingSpec } from "../../core/prototyping/specResolution.js";
import {
  readFrozenSpecsCovered,
  readFrozenSpecsCoveredMultiSpec,
} from "../../core/prototyping/specsCovered.js";
import { resolveToolVersion } from "../../core/version.js";
import { error, info } from "../lib/logger.js";

export type RunPrototypingCertifyOptions = {
  root: string;
  /** When true, do not write; only verify the existing certificate. */
  check: boolean;
};

const ROOT_DESIGN_MD_REL = "DESIGN.md";

export async function runPrototypingCertify(
  options: RunPrototypingCertifyOptions,
): Promise<number> {
  if (options.check) {
    const result = await checkCompletionCertificate(options.root);
    if (result.ok) {
      info("completion-certificate: OK (digests match, gates valid)");
      return 0;
    }
    error("completion-certificate: MISMATCH");
    for (const reason of result.reasons) {
      error(`  - ${reason}`);
    }
    return 2;
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

  // Accept the new top-level `runId` (written by `iterate` at cycle 0)
  // and fall back to the legacy `fullHarness.runId` shape for projects
  // whose prototyping.json predates the UX-loop schema rewrite.
  const runId =
    extractString(protoJson, "runId") ??
    extractString(extractRecord(protoJson, "fullHarness"), "runId");
  if (!runId) {
    error(
      "qfai prototyping certify: prototyping.json#runId is required " +
        "before a completion certificate can be issued (set by `qfai prototyping iterate --cycle 0`).",
    );
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
  const errorCount = extractNumber(extractRecord(validateJson, "counts"), "error") ?? -1;
  if (errorCount !== 0) {
    error(
      `qfai prototyping certify: validate.json reports ${errorCount} error(s); ` +
        "all must be 0 before certification.",
    );
    return 2;
  }

  const verifyJsonPath = path.join(options.root, ".qfai/output/verify.json");
  const verifyJson = await loadJson(verifyJsonPath);
  const verifyStatus = extractString(verifyJson, "status");
  if (verifyStatus !== "PASS") {
    error(
      "qfai prototyping certify: verify.json status must be PASS " +
        "(run `/qfai-verify` and ensure it reports PASS).",
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
  const acceptedIterationIndex = iterationCount - 1;
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
  // Codex review: the prototyping CLI contract specifies that only
  // `<screen>.review.json` is a per-cycle Reviewer artifact (no
  // `.html`, no `.png`, no `.interaction.json`). This flat-iter
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
  const frozenSpecsPreview =
    readFrozenSpecsCoveredMultiSpec(protoJson) ?? readFrozenSpecsCovered(protoJson);
  if (frozenSpecsPreview !== null && screenContracts.length > 0) {
    // The per-(spec × screen) gate ONLY runs when the accepted iter
    // actually contains per-spec subdirs (`iter-NN/spec-*/`). The
    // shipped iterate driver + SKILL.md still emit the legacy flat
    // layout (`iter-NN/index.html` / `iter-NN/review.json`), so
    // without this guard the gate would fail every (spec, screen)
    // pair on a normal run that follows the documented plan. The
    // flat-iter migration to per-spec layout is deferred; until then,
    // flat-iter projects skip the gate with a one-line stderr info
    // note so the deferred migration stays visible to operators.
    const acceptedIterAbs = path.join(options.root, PROTOTYPING_EVIDENCE_REL, acceptedIterDir);
    const hasPerSpecLayout = await hasPerSpecSubdir(acceptedIterAbs);
    if (!hasPerSpecLayout) {
      // codex review r3264798065 (P1): the flat-iter skip is only valid
      // for SINGLE-spec frozen sets. When the frozen set carries
      // multiple specs but the accepted iter has no per-spec subdir,
      // the legacy flat layout is structurally incompatible — there is
      // no place to host the per-spec `<screen>.review.json` files for
      // the secondary spec(s), and silently skipping the gate would
      // re-open the TDD-0387 vulnerability (a frozen secondary spec
      // ships a sealed certificate with zero review.json evidence).
      // Fail-fast with a hard error in the multi-spec case; preserve
      // the info-skip for the single-spec legacy path.
      if (frozenSpecsPreview.length > 1) {
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
      }
      info(
        `qfai prototyping certify: per-spec ${acceptedIterDir}/spec-NNNN layout not detected — ` +
          "skipping per-(spec x screen) review.json presence gate; running with legacy flat layout " +
          "(per-spec layout migration pending, single-spec frozen set).",
      );
    } else {
      const missingPairs: Array<{ spec: string; screen: string; expectedPath: string }> = [];
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
          }
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
        return 2;
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
  const specsCovered =
    readFrozenSpecsCoveredMultiSpec(protoJson) ?? readFrozenSpecsCovered(protoJson);
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

  const toolVersion = await resolveToolVersion();
  const designMdRecord: CompletionCertificateDesignMd = {
    path: ROOT_DESIGN_MD_REL,
    sha256: frozenSha,
  };

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

export async function runPrototypingShowSpec(options: { root: string }): Promise<number> {
  const { config } = await loadConfig(options.root);
  const resolved = await resolvePrimaryPrototypingSpec(options.root, config);
  if (!resolved) {
    error(
      "qfai prototyping show-spec: no primary prototyping spec found. " +
        "Set qfai.config.yaml: prototyping.primarySpecId, " +
        "or add `surface_type: ui-bearing` (or 'prototyping' in the title) " +
        "to one of your specs' 01_Spec.md.",
    );
    return 2;
  }
  const payload = {
    specId: resolved.specId,
    specMdPath: path.relative(options.root, resolved.specMdPath).replace(/\\/g, "/"),
    source: resolved.source,
  };
  info(JSON.stringify(payload, null, 2));
  return 0;
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
async function fileExists(absPath: string): Promise<boolean> {
  try {
    const s = await stat(absPath);
    return s.isFile();
  } catch {
    return false;
  }
}

/**
 * Returns `true` when the accepted iter directory contains at least
 * one `spec-*` subdirectory (per-spec layout). Used by the per-(spec
 * x screen) review.json gate to skip enforcement on legacy flat-iter
 * projects, which the shipped iterate driver + SKILL.md still emit
 * until the per-spec layout migration lands.
 *
 * ENOENT / non-readable iter dir -> `false` (gate stays off): the
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
    if (!name.startsWith("spec-")) continue;
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
 * Resolution order (first hit wins):
 *   1. `<contractsDir>/ui/<specDirName>.yaml`              (e.g. `spec-0007.yaml`)
 *   2. `<contractsDir>/ui/<bareNumeric>.yaml`              (e.g. `0007.yaml`)
 *   3. `<contractsDir>/ui/ui-<bareNumeric>.yaml`           (e.g. `ui-0007.yaml`)
 *   4. `<contractsDir>/ui/ui-<bareNumeric>-*.yaml` (glob)  (e.g. `ui-0007-home.yaml`)
 *
 * Each candidate is probed only if previous candidates missed; the glob
 * (4) is evaluated last so a single canonical file (1-3) takes precedence
 * over a multi-file split. Returns `null` when none of the candidates
 * exists OR when the matched file parses but declares no `screens:`. The
 * caller falls back to the project-wide list in either case so a malformed
 * per-spec contract does not silently zero-out the gate.
 *
 * Returns the deduplicated `CanonicalScreenContract[]` list (last-write
 * wins for duplicate `screenId`s across multiple matched files); matches
 * `readUiContractScreenContracts`'s dedup semantics.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export async function readPerSpecScreens(
  root: string,
  contractsDirRelative: string,
  specDirName: string,
): Promise<CanonicalScreenContract[] | null> {
  const uiDir = path.join(root, contractsDirRelative, "ui");
  const bareNumeric = specDirName.replace(/^spec-/iu, "");
  const candidates = [
    path.join(uiDir, `${specDirName}.yaml`),
    path.join(uiDir, `${bareNumeric}.yaml`),
    path.join(uiDir, `ui-${bareNumeric}.yaml`),
  ];
  const matched: string[] = [];
  for (const abs of candidates) {
    if (await fileExists(abs)) {
      matched.push(abs);
    }
  }
  if (matched.length === 0) {
    const globPattern = path.posix.join(
      uiDir.replace(/\\/g, "/"),
      `ui-${bareNumeric}-*.yaml`,
    );
    const globMatches = await fg(globPattern, { absolute: true });
    matched.push(...globMatches);
  }
  if (matched.length === 0) return null;

  const screens: CanonicalScreenContract[] = [];
  for (const abs of matched) {
    let raw: string;
    try {
      raw = await readFile(abs, "utf-8");
    } catch {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) continue;
    const rawScreens = parsed.screens;
    if (!Array.isArray(rawScreens)) continue;
    for (const entry of rawScreens) {
      if (!isRecord(entry)) continue;
      const id = typeof entry.id === "string" ? entry.id.trim() : "";
      const route = typeof entry.route === "string" ? entry.route.trim() : "";
      if (!id || !route) continue;
      const title =
        typeof entry.title === "string" && entry.title.trim().length > 0
          ? entry.title.trim()
          : id;
      const primaryTasks = Array.isArray(entry.primary_tasks)
        ? entry.primary_tasks
            .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
            .map((t) => t.trim())
        : [];
      screens.push({
        name: title,
        screenId: id,
        route,
        primaryTasks,
        sourceRef: `${path.relative(root, abs).replace(/\\/g, "/")}#${id}`,
      });
    }
  }
  if (screens.length === 0) return null;
  return screens.filter(
    (s, idx, all) => all.findIndex((c) => c.screenId === s.screenId) === idx,
  );
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

// `DesignMdViolation` is only used as part of typing through the
// findDesignMdViolations import; explicit re-export keeps the tree shake
// stable but is not strictly required.
export type { DesignMdViolation };

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
  extractUiScreens,
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
// 15th-wave Fix (codex r3269453293, P2): show-spec's `liveUiBearing`
// now uses the same resolver as iterate's drift gate
// (`resolveSurfaceUnion`) so the live scope reported here is
// apples-to-apples with what iterate enforces.
import { resolveSurfaceUnion } from "./prototypingIterate.js";
import {
  readFrozenSpecsCovered,
  readFrozenSpecsCoveredMultiSpec,
} from "../../core/prototyping/specsCovered.js";
import { resolveToolVersion } from "../../core/version.js";
import { error, info, warn } from "../lib/logger.js";

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
      // codex r3265376125 (MINOR): pre-build a per-spec map from the
      // already-loaded `screenContracts` so the common single-file
      // canonical layouts skip the per-spec fs probe entirely. Subdir /
      // multi-file layouts still fall through to `readPerSpecScreens`
      // because their fs surface is not represented in this Map (the
      // project-wide reader does see those files via its `**\/*.yaml`
      // glob, but the Map keys collapse only well-formed per-spec
      // single-file paths to avoid cross-talk with project-wide files
      // that have no per-spec scope).
      const perSpecIndex = await indexPerSpecScreens(
        options.root,
        screenContracts,
        config.paths.contractsDir,
      );
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
        const indexedScreens = perSpecIndex.get(specDirName);
        const perSpecScreens =
          indexedScreens !== undefined && indexedScreens.length > 0
            ? indexedScreens
            : await readPerSpecScreens(options.root, config.paths.contractsDir, specDirName);
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
 *   - `frozenSurfaceUnion`: multi-spec UI-bearing UNION snapshot at
 *      cycle 0 (drift baseline). May be absent on pre-11th-wave
 *      records — surfaced as `null` so the consumer can distinguish
 *      "field absent" from "field present but empty".
 *   - `liveUiBearing`: current `resolveAllUiBearingSpecs()` result so
 *      the operator can spot drift without running iterate.
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
  const frozenSpecsCovered = readStringArrayField(protoRecord.frozenSpecsCovered);
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
  // gate. `resolveSurfaceUnion` is exported from `prototypingIterate.ts`
  // for exactly this kind of SSOT alignment.
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
  const uiDir = path.join(root, contractsDirRelative, "ui");
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
 * Build a `Map<specDirName, CanonicalScreenContract[]>` from the
 * project-wide `screenContracts` so the per-(spec x screen) gate avoids
 * N+1 fs probes (`readPerSpecScreens` runs up to 5 fs ops per spec; this
 * Map collapses N calls to one pass over already-discovered file paths).
 *
 * The Map is keyed by the `<spec-id>` segment extracted from the
 * canonical `sourceRef` shape (`<contractsDir>/ui/<spec-id>.yaml#<id>`
 * or `<contractsDir>/ui/<spec-id>/<file>.yaml#<id>`). Project-wide
 * contracts whose path does not encode a per-spec segment (e.g.
 * `<contractsDir>/ui/main.yaml#home`) are skipped — the per-spec scope
 * does not apply, and `readPerSpecScreens` will return `null` for those
 * specs, falling back to the project-wide list as before.
 *
 * codex r3265376125 (MINOR): pre-fix the per-spec gate called
 * `readPerSpecScreens` for every frozen spec, repeating the same fs
 * probes for shapes that were already loaded once at the call site.
 *
 * 13th-wave Fix (codex r3265806993 / r3265809880, MAJOR): pre-fix the
 * Map seeded each spec entry from the project-wide `screenContracts`
 * collection — which has already been deduplicated by `screenId` across
 * every parsed file in `<contractsDir>/ui/**`. When two specs declare
 * the same `screenId` (e.g. `home`), the project-wide dedup keeps the
 * first file's entry and drops the second; the index then looked
 * non-empty for the losing spec but was silently missing one screen,
 * which silently false-negative-passed the `<spec>/<screen>.review.json`
 * gate. The fix re-parses each spec's winning file via
 * `parseUiScreenFile` to recover the unfiltered per-spec screen list
 * (the per-spec re-parse scope is isolated from cross-spec dedup).
 * For multi-file shapes (glob #4 / subdir #5) the winner set is the
 * union of all matched files (first-write-wins dedup within the
 * spec's own scope) so subdir / glob layouts still benefit from the
 * pre-indexed path discovery instead of falling through to the fs
 * probe.
 */
async function indexPerSpecScreens(
  root: string,
  screenContracts: ReadonlyArray<CanonicalScreenContract>,
  contractsDirRelative: string,
): Promise<Map<string, CanonicalScreenContract[]>> {
  const uiPrefix = `${contractsDirRelative.replace(/\\/g, "/")}/ui/`;
  // Bucket file relative paths by spec so the candidate-precedence step
  // can choose the winning file(s) deterministically. We retain the
  // per-file path set (NOT the per-file already-dedupped screens) so
  // the per-spec re-parse below operates on the raw on-disk source.
  const perSpecFiles = new Map<string, Set<string>>();
  for (const screen of screenContracts) {
    const ref = screen.sourceRef;
    const hashIdx = ref.indexOf("#");
    const pathPart = hashIdx >= 0 ? ref.slice(0, hashIdx) : ref;
    if (!pathPart.startsWith(uiPrefix)) continue;
    const rel = pathPart.slice(uiPrefix.length);
    const specDirName = extractSpecDirFromUiRel(rel);
    if (specDirName === null) continue;
    let filesForSpec = perSpecFiles.get(specDirName);
    if (!filesForSpec) {
      filesForSpec = new Set<string>();
      perSpecFiles.set(specDirName, filesForSpec);
    }
    filesForSpec.add(rel);
  }
  // Apply readPerSpecScreens's TRUE first-hit-wins precedence for
  // single-file canonical shapes; aggregate for multi-file shapes. Then
  // re-parse the chosen file(s) so the per-spec re-parse scope is
  // isolated from project-wide cross-spec dedup.
  const out = new Map<string, CanonicalScreenContract[]>();
  for (const [specDirName, fileSet] of perSpecFiles.entries()) {
    const winners = chooseWinningFiles(specDirName, [...fileSet]);
    if (winners.length === 0) continue;
    const uiDir = path.join(root, contractsDirRelative, "ui");
    const reparsed: CanonicalScreenContract[] = [];
    for (const rel of winners) {
      const abs = path.join(uiDir, rel);
      const fileScreens = await parseUiScreenFile(root, abs);
      reparsed.push(...fileScreens);
    }
    // First-write-wins per-spec dedup (multi-file shapes may still
    // declare duplicate `screenId`s within the spec's own scope).
    const dedupped = reparsed.filter(
      (s, idx, all) => all.findIndex((c) => c.screenId === s.screenId) === idx,
    );
    if (dedupped.length > 0) out.set(specDirName, dedupped);
  }
  return out;
}

/**
 * Apply the same candidate precedence as {@link readPerSpecScreens}
 * (1: `<spec-id>.yaml`, 2: `<bare>.yaml`, 3: `ui-<bare>.yaml`, then
 * multi-file shapes 4 + 5 aggregated) over a set of already-discovered
 * per-spec file relative paths.
 *
 * 13th-wave Fix (codex r3265809880, MAJOR): pre-fix multi-file shapes
 * (#4 glob / #5 subdir) returned `null` so the call site fell through
 * to `readPerSpecScreens` and ran the same fs probes again — defeating
 * the N+1 optimization for subdir / multi-file layouts. The fix
 * returns every multi-file match so the caller's re-parse covers the
 * full per-spec union, and the precedence semantics (single-file #1..3
 * beat multi-file #4..5) are preserved by checking the canonical
 * candidates first.
 */
function chooseWinningFiles(specDirName: string, relPaths: string[]): string[] {
  const bareNumeric = specDirName.replace(/^spec-/iu, "");
  const ordered = [`${specDirName}.yaml`, `${bareNumeric}.yaml`, `ui-${bareNumeric}.yaml`];
  for (const candidate of ordered) {
    if (relPaths.includes(candidate)) return [candidate];
  }
  // Multi-file shapes (glob #4 / subdir #5): aggregate every matched
  // path so the caller's per-spec re-parse builds the full union (with
  // first-write-wins dedup within the spec's own scope). Matches
  // `readPerSpecScreens`'s behaviour for the same layouts.
  const multiFile = relPaths.filter((rel) => {
    return (
      new RegExp(`^ui-${bareNumeric}-[^/]+\\.yaml$`, "iu").test(rel) ||
      rel.startsWith(`${specDirName}/`)
    );
  });
  return multiFile;
}

/**
 * Resolve `<spec-id>` from a per-spec UI contract relative path
 * (`spec-0007.yaml`, `0007.yaml`, `ui-0007.yaml`, `ui-0007-home.yaml`,
 * or `spec-0007/<subpath>.yaml`). Returns `null` for project-wide files
 * (`main.yaml`, `screens.yaml`) so they do NOT map to a per-spec
 * bucket. Mirrors `readPerSpecScreens`'s candidate set so the
 * pre-indexed Map and the fallback fs probe stay equivalent.
 */
function extractSpecDirFromUiRel(rel: string): string | null {
  const normalized = rel.replace(/\\/g, "/");
  // Subdir layout: `<spec-id>/...` -> `spec-NNNN`.
  const subdirMatch = /^(spec-\d{4,})\//u.exec(normalized);
  if (subdirMatch?.[1]) return subdirMatch[1];
  // Single-file canonical: `spec-NNNN.yaml`.
  const specFileMatch = /^(spec-\d{4,})\.yaml$/iu.exec(normalized);
  if (specFileMatch?.[1]) return specFileMatch[1];
  // Bare numeric: `NNNN.yaml` -> `spec-NNNN`.
  const bareMatch = /^(\d{4,})\.yaml$/iu.exec(normalized);
  if (bareMatch?.[1]) return `spec-${bareMatch[1]}`;
  // ui-prefixed: `ui-NNNN.yaml` or `ui-NNNN-<slug>.yaml` -> `spec-NNNN`.
  const uiMatch = /^ui-(\d{4,})(?:-[^/]+)?\.yaml$/iu.exec(normalized);
  if (uiMatch?.[1]) return `spec-${uiMatch[1]}`;
  return null;
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

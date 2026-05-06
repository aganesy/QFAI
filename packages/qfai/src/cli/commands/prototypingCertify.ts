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

import { loadConfig } from "../../core/config.js";
import { readUiContractScreenContracts } from "../../core/contracts/screenContracts.js";
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
import { readFrozenSpecsCovered } from "../../core/prototyping/specsCovered.js";
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

  // Read the frozen `specsCovered` recorded by `iterate --cycle 0`.
  // Re-resolving the primary spec here would let a config edit
  // (`prototyping.primarySpecId`) or a marker change between cycle 0
  // and certify silently re-baseline the certificate to a spec the
  // loop never exercised. The loop seed is the SSOT for what was
  // actually reviewed.
  const specsCovered = readFrozenSpecsCovered(protoJson);
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
  const staleIterDirs = await findStaleIterDirs(evidenceRoot, iterationCount);
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
async function findStaleIterDirs(evidenceRoot: string, iterationCount: number): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(evidenceRoot);
  } catch {
    return [];
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
    } catch {
      continue;
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

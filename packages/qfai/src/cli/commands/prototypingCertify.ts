/**
 * `qfai prototyping certify [--check]` and `qfai prototyping show-spec`
 * (v1.8.4 Phase 5).
 *
 * `certify` is the only writer of `.qfai/evidence/prototyping/completion-certificate.json`.
 * It refuses to write the artifact unless every gate passes:
 *   - prototyping.json.fullHarness.runId is present
 *   - .qfai/output/validate.json exists with counts.error === 0
 *   - .qfai/output/verify.json exists with status === "PASS"
 *   - prototyping.json.reviewerGate.result === "PASS"
 *
 * `certify --check` re-computes evidence digests against the stored
 * certificate and exits non-zero on drift. This is the only deterministic
 * way to claim a prototyping run is complete.
 *
 * `show-spec` prints the resolved primary prototyping spec (config or
 * marker-scan based) so AI consumers no longer hardcode `spec-0012`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import {
  buildCompletionCertificate,
  checkCompletionCertificate,
  writeCompletionCertificate,
} from "../../core/prototyping/certificate.js";
import { resolvePrimaryPrototypingSpec } from "../../core/prototyping/specResolution.js";
import { resolveToolVersion } from "../../core/version.js";
import { error, info } from "../lib/logger.js";

export type RunPrototypingCertifyOptions = {
  root: string;
  /** When true, do not write; only verify the existing certificate. */
  check: boolean;
};

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
  const evidenceRoot = path.join(options.root, ".qfai/evidence/prototyping");

  const protoJson = await loadJson(path.join(options.root, ".qfai/evidence/prototyping.json"));
  if (!protoJson) {
    error(
      "qfai prototyping certify: .qfai/evidence/prototyping.json is missing or unparseable. " +
        "Run prototyping rounds first.",
    );
    return 2;
  }

  const runId = extractString(extractRecord(protoJson, "fullHarness"), "runId");
  if (!runId) {
    error(
      "qfai prototyping certify: prototyping.json.fullHarness.runId is required " +
        "before a completion certificate can be issued.",
    );
    return 2;
  }

  // Resolve validate.json from the configured output path (Codex P1 review on
  // PR #201). Hardcoding ".qfai/output/" was wrong for any user with a
  // customized `output.validateJsonPath`.
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

  const reviewerSignoff = extractRecord(reviewerGate, "signoff");
  const reviewerId =
    extractString(reviewerSignoff, "reviewerId") ??
    extractString(reviewerSignoff, "reviewer") ??
    "unknown";
  const reviewerTimestamp = extractString(reviewerSignoff, "timestamp") ?? new Date().toISOString();

  const resolvedSpec = await resolvePrimaryPrototypingSpec(options.root, config);
  const specsCovered = resolvedSpec ? [resolvedSpec.specId] : [];

  const toolVersion = await resolveToolVersion();

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
    iterationCount: countIterations(protoJson),
    polishCycleCount: countPolishCycles(protoJson),
    specsCovered,
  });

  const certPath = await writeCompletionCertificate(options.root, cert);
  info(`qfai prototyping certify: wrote ${certPath}`);
  info(`  runId: ${runId}`);
  info(`  evidenceFiles: ${cert.evidenceDigests.length}`);
  info(`  specsCovered: ${specsCovered.join(", ") || "(none)"}`);
  return 0;
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
  const rounds = protoJson.rounds;
  if (Array.isArray(rounds)) return rounds.length;
  // V1 fallback (deleted in Phase 8 but kept here for the v1.8.4 transition)
  const iterations = protoJson.iterations;
  return Array.isArray(iterations) ? iterations.length : 0;
}

function countPolishCycles(protoJson: unknown): number {
  if (!isRecord(protoJson)) return 0;
  const polishCycles = protoJson.polishCycles;
  return Array.isArray(polishCycles) ? polishCycles.length : 0;
}

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
import { hashDesignMd, parseDesignMd } from "../../core/design/designMd.js";
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
import { resolveToolVersion } from "../../core/version.js";
import { error, info } from "../lib/logger.js";

export type RunPrototypingCertifyOptions = {
  root: string;
  /** When true, do not write; only verify the existing certificate. */
  check: boolean;
};

const ROOT_DESIGN_MD_REL = "DESIGN.md";
const PROTOTYPING_EVIDENCE_REL = ".qfai/evidence/prototyping";

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
  const finalHtmlPaths = await findFinalIterationHtmlFiles(evidenceRoot);
  if (finalHtmlPaths.length === 0) {
    error(
      "qfai prototyping certify: no final iteration HTML found under " +
        `${PROTOTYPING_EVIDENCE_REL}/iter-*/. Run prototyping iterations first.`,
    );
    return 2;
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

  const resolvedSpec = await resolvePrimaryPrototypingSpec(options.root, config);
  const specsCovered = resolvedSpec ? [resolvedSpec.specId] : [];

  const toolVersion = await resolveToolVersion();
  const designMdRecord: CompletionCertificateDesignMd = {
    path: ROOT_DESIGN_MD_REL,
    sha256: hashDesignMd(designMdText),
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
    iterationCount: countIterations(protoJson),
    specsCovered,
    designMd: designMdRecord,
  });

  const certPath = await writeCompletionCertificate(options.root, cert);
  info(`qfai prototyping certify: wrote ${certPath}`);
  info(`  runId: ${runId}`);
  info(`  evidenceFiles: ${cert.evidenceDigests.length}`);
  info(`  specsCovered: ${specsCovered.join(", ") || "(none)"}`);
  info(`  designMd: ${designMdRecord.path} sha256=${designMdRecord.sha256.slice(0, 12)}…`);
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

// ─── final-iter HTML resolution ─────────────────────────────────────────────

/**
 * Walk `evidenceRoot/iter-NN/` directories in descending index order and
 * return every `*.html` file in the highest-indexed dir that has one.
 * Returns an empty array when no iter dir holds an HTML artifact.
 */
async function findFinalIterationHtmlFiles(evidenceRoot: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(evidenceRoot);
  } catch {
    return [];
  }
  const iterDirs: Array<{ index: number; abs: string }> = [];
  for (const name of entries) {
    const match = /^iter-(\d{2,})$/.exec(name);
    if (!match) continue;
    const indexStr = match[1];
    if (indexStr === undefined) continue;
    const index = Number.parseInt(indexStr, 10);
    if (Number.isNaN(index)) continue;
    iterDirs.push({ index, abs: path.join(evidenceRoot, name) });
  }
  iterDirs.sort((a, b) => b.index - a.index);
  for (const dir of iterDirs) {
    const htmls = await allHtmlIn(dir.abs);
    if (htmls.length > 0) return htmls;
  }
  return [];
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

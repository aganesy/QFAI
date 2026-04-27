/**
 * Completion certificate (v1.8.4 Phase 5).
 *
 * `.qfai/evidence/prototyping/completion-certificate.json` is the SINGLE
 * authoritative completion artifact for a prototyping run. It carries
 * SHA-256 digests of every evidence file under
 * `.qfai/evidence/prototyping/` plus references to validate/verify run
 * outputs and reviewer signoff.
 *
 * Generated only by `qfai prototyping certify` after gates pass. The
 * generator refuses to write the artifact if any pre-condition fails, so
 * the artifact's existence (with a `--check`-passing digest) is the
 * deterministic completion signal:
 *
 *   completion = `qfai prototyping certify --check` exit 0
 *
 * RR root cause #1 (completion semantics multi-source): closed by making
 * the certificate the only valid "DONE" claim. AI cannot subjectively
 * declare completion when the artifact is absent or its digests fail.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type CompletionCertificate = {
  readonly schemaVersion: "1.0";
  readonly runId: string;
  readonly generatedAt: string; // ISO-8601
  readonly generator: { readonly tool: "qfai"; readonly version: string };
  readonly evidenceDigests: ReadonlyArray<{ readonly path: string; readonly sha256: string }>;
  /**
   * validateRun.errorCount is always 0 at write time (the writer refuses to
   * generate a certificate otherwise), but the type is widened to `number`
   * so loaders can detect tampering at check time.
   */
  readonly validateRun: { readonly errorCount: number; readonly ranAt: string };
  /**
   * verifyRun.status is always "PASS" at write time. Widened type lets the
   * checker raise QFAI-PROT-336 on tampering.
   */
  readonly verifyRun: { readonly status: string; readonly ranAt: string };
  readonly reviewerSignoff: {
    readonly reviewer: string;
    readonly approved: boolean;
    readonly timestamp: string;
  };
  readonly iterationCount: number;
  readonly polishCycleCount: number;
  readonly specsCovered: ReadonlyArray<string>;
};

/** Path (POSIX) under repo root. */
export const COMPLETION_CERTIFICATE_REL_PATH =
  ".qfai/evidence/prototyping/completion-certificate.json";

export type BuildCertificateInputs = {
  runId: string;
  toolVersion: string;
  /** Absolute path to `.qfai/evidence/prototyping/`. */
  evidenceRoot: string;
  /** errorCount must be 0; widened-type field is enforced at runtime. */
  validateRun: { errorCount: number; ranAt: string };
  /** status must be "PASS"; widened-type field is enforced at runtime. */
  verifyRun: { status: string; ranAt: string };
  reviewerSignoff: { reviewer: string; approved: boolean; timestamp: string };
  iterationCount: number;
  polishCycleCount: number;
  specsCovered: readonly string[];
};

export async function buildCompletionCertificate(
  inputs: BuildCertificateInputs,
): Promise<CompletionCertificate> {
  const evidenceDigests = await scanEvidenceDigests(inputs.evidenceRoot);
  return {
    schemaVersion: "1.0",
    runId: inputs.runId,
    generatedAt: new Date().toISOString(),
    generator: { tool: "qfai", version: inputs.toolVersion },
    evidenceDigests,
    validateRun: inputs.validateRun,
    verifyRun: inputs.verifyRun,
    reviewerSignoff: inputs.reviewerSignoff,
    iterationCount: inputs.iterationCount,
    polishCycleCount: inputs.polishCycleCount,
    specsCovered: [...inputs.specsCovered],
  };
}

export async function writeCompletionCertificate(
  root: string,
  certificate: CompletionCertificate,
): Promise<string> {
  const fullPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
  await mkdir(path.dirname(fullPath), { recursive: true });
  const json = canonicalStringify(certificate);
  await writeFile(fullPath, `${json}\n`, "utf-8");
  return fullPath;
}

export async function loadCompletionCertificate(
  root: string,
): Promise<CompletionCertificate | null> {
  const fullPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
  try {
    const raw = await readFile(fullPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    // Reviewer comment from PR #201 (Codex, P1): validate the parsed shape
    // before casting. A malformed certificate (e.g. truncated, manually
    // edited) used to crash downstream callers via property access on
    // `undefined`. Now we return null and let `checkCompletionCertificate`
    // emit a descriptive reason.
    if (!isMinimallyValidCertificate(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isMinimallyValidCertificate(value: unknown): value is CompletionCertificate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== "1.0") return false;
  if (typeof v.runId !== "string") return false;
  if (!Array.isArray(v.evidenceDigests)) return false;
  for (const entry of v.evidenceDigests) {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.path !== "string" || typeof e.sha256 !== "string") return false;
  }
  if (!v.validateRun || typeof v.validateRun !== "object") return false;
  if (!v.verifyRun || typeof v.verifyRun !== "object") return false;
  if (!v.reviewerSignoff || typeof v.reviewerSignoff !== "object") return false;
  return true;
}

export type CertifyCheckResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reasons: readonly string[] };

/**
 * Re-compute evidence digests and compare against the stored certificate.
 * The certificate file itself is excluded from the digest tree (otherwise
 * verification would always fail because writing the cert mutates the dir).
 *
 * Also enforces invariants that don't require disk I/O:
 *   - validateRun.errorCount must be 0
 *   - verifyRun.status must be "PASS"
 *   - reviewerSignoff.approved must be true
 */
export async function checkCompletionCertificate(root: string): Promise<CertifyCheckResult> {
  const cert = await loadCompletionCertificate(root);
  if (!cert) {
    return {
      ok: false,
      reasons: [
        `${COMPLETION_CERTIFICATE_REL_PATH} not found. Run \`qfai prototyping certify\` after all gates pass.`,
      ],
    };
  }

  const reasons: string[] = [];
  const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
  const currentDigests = await scanEvidenceDigests(evidenceRoot);

  const certMap = new Map(cert.evidenceDigests.map((entry) => [entry.path, entry.sha256]));
  const currMap = new Map(currentDigests.map((entry) => [entry.path, entry.sha256]));

  for (const [p, hash] of certMap) {
    const observed = currMap.get(p);
    if (observed === undefined) {
      reasons.push(`evidence file removed since certify: ${p}`);
    } else if (observed !== hash) {
      reasons.push(`digest mismatch (file modified since certify): ${p}`);
    }
  }
  for (const [p] of currMap) {
    if (!certMap.has(p)) {
      reasons.push(`new evidence file present but not in certificate: ${p}`);
    }
  }

  if (cert.validateRun.errorCount !== 0) {
    reasons.push("validateRun.errorCount must be 0");
  }
  if (cert.verifyRun.status !== "PASS") {
    reasons.push("verifyRun.status must be PASS");
  }
  if (!cert.reviewerSignoff.approved) {
    reasons.push("reviewerSignoff.approved must be true");
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

/**
 * Walk every file under `evidenceRoot` (recursively), computing
 * SHA-256(content) per file. Output is sorted by path for determinism.
 *
 * The certificate file itself is excluded so that re-checking after
 * write does not detect itself as a "new file".
 */
async function scanEvidenceDigests(
  evidenceRoot: string,
): Promise<Array<{ path: string; sha256: string }>> {
  const out: Array<{ path: string; sha256: string }> = [];
  await walk(evidenceRoot, evidenceRoot, out);
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

async function walk(
  rootDir: string,
  dir: string,
  out: Array<{ path: string; sha256: string }>,
): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "completion-certificate.json") continue;
    const full = path.join(dir, name);
    let s: Awaited<ReturnType<typeof stat>>;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      await walk(rootDir, full, out);
    } else if (s.isFile()) {
      const buf = await readFile(full);
      const hash = createHash("sha256").update(buf).digest("hex");
      const rel = path.relative(rootDir, full).replace(/\\/g, "/");
      out.push({ path: rel, sha256: hash });
    }
  }
}

/**
 * Canonical JSON: keys sorted alphabetically at every object level so
 * the output is byte-stable for any logically-equivalent input.
 */
function canonicalStringify(value: unknown): string {
  return JSON.stringify(value, sortedReplacer(), 2);
}

function sortedReplacer(): (key: string, value: unknown) => unknown {
  return (_key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  };
}

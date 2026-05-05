/**
 * Completion certificate.
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
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashDesignMd } from "../design/designMd.js";

export type CompletionCertificateDesignMd = {
  readonly path: string;
  readonly sha256: string;
};

export type CompletionCertificate = {
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
   * checker raise tampering errors at check time.
   */
  readonly verifyRun: { readonly status: string; readonly ranAt: string };
  readonly reviewerSignoff: {
    readonly reviewerId: string;
    readonly approved: boolean;
    readonly timestamp: string;
  };
  readonly iterationCount: number;
  readonly specsCovered: ReadonlyArray<string>;
  /**
   * Frozen DESIGN.md reference. `path` is the project-root relative path
   * (POSIX) and `sha256` is the hex digest of the file contents at the
   * time `qfai prototyping certify` ran. Optional only for legacy
   * certificates written before the field existed.
   */
  readonly designMd?: CompletionCertificateDesignMd;
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
  reviewerSignoff: { reviewerId: string; approved: boolean; timestamp: string };
  iterationCount: number;
  specsCovered: readonly string[];
  /**
   * Optional DESIGN.md binding. When supplied, the certificate carries
   * the path + sha256 so `--check` can detect post-certify edits to the
   * brand SSOT.
   */
  designMd?: CompletionCertificateDesignMd;
};

export async function buildCompletionCertificate(
  inputs: BuildCertificateInputs,
): Promise<CompletionCertificate> {
  const evidenceDigests = await scanEvidenceDigests(inputs.evidenceRoot);
  const cert: CompletionCertificate = {
    runId: inputs.runId,
    generatedAt: new Date().toISOString(),
    generator: { tool: "qfai", version: inputs.toolVersion },
    evidenceDigests,
    validateRun: inputs.validateRun,
    verifyRun: inputs.verifyRun,
    reviewerSignoff: inputs.reviewerSignoff,
    iterationCount: inputs.iterationCount,
    specsCovered: [...inputs.specsCovered],
    ...(inputs.designMd ? { designMd: { ...inputs.designMd } } : {}),
  };
  return cert;
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
    return normalizeCompletionCertificate(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

type CompletionCertificateRecord = {
  runId: string;
  generatedAt: string;
  generator: { tool: "qfai"; version: string };
  evidenceDigests: Array<{ path: string; sha256: string }>;
  validateRun: { errorCount: number; ranAt: string };
  verifyRun: { status: string; ranAt: string };
  reviewerSignoff: {
    reviewerId?: string;
    reviewer?: string;
    approved: boolean;
    timestamp: string;
  };
  iterationCount: number;
  specsCovered: string[];
  designMd?: { path: string; sha256: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isEvidenceDigestArray(
  value: unknown,
): value is CompletionCertificateRecord["evidenceDigests"] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) && typeof entry.path === "string" && typeof entry.sha256 === "string",
    )
  );
}

function isMinimallyValidCertificate(value: unknown): value is CompletionCertificateRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.runId !== "string") return false;
  if (typeof v.generatedAt !== "string") return false;
  if (!isRecord(v.generator)) return false;
  if (v.generator.tool !== "qfai" || typeof v.generator.version !== "string") return false;
  if (!isEvidenceDigestArray(v.evidenceDigests)) return false;
  if (!isRecord(v.validateRun)) return false;
  if (typeof v.validateRun.errorCount !== "number" || typeof v.validateRun.ranAt !== "string") {
    return false;
  }
  if (!isRecord(v.verifyRun)) return false;
  if (typeof v.verifyRun.status !== "string" || typeof v.verifyRun.ranAt !== "string") {
    return false;
  }
  if (!isRecord(v.reviewerSignoff)) return false;
  const reviewerSignoff = v.reviewerSignoff;
  if (
    typeof reviewerSignoff.reviewerId !== "string" &&
    typeof reviewerSignoff.reviewer !== "string"
  ) {
    return false;
  }
  if (typeof reviewerSignoff.approved !== "boolean") return false;
  if (typeof reviewerSignoff.timestamp !== "string") return false;
  if (typeof v.iterationCount !== "number") return false;
  if (!isStringArray(v.specsCovered)) return false;
  if (v.designMd !== undefined) {
    if (!isRecord(v.designMd)) return false;
    if (typeof v.designMd.path !== "string" || typeof v.designMd.sha256 !== "string") {
      return false;
    }
  }
  return true;
}

function normalizeCompletionCertificate(value: unknown): CompletionCertificate | null {
  if (!isMinimallyValidCertificate(value)) {
    return null;
  }

  const record = value;
  const reviewerSignoff = record.reviewerSignoff;
  const reviewerId =
    typeof reviewerSignoff.reviewerId === "string"
      ? reviewerSignoff.reviewerId
      : (reviewerSignoff.reviewer as string);

  const out: CompletionCertificate = {
    runId: record.runId,
    generatedAt: record.generatedAt,
    generator: {
      tool: "qfai",
      version: record.generator.version,
    },
    evidenceDigests: record.evidenceDigests.map((entry) => ({
      path: entry.path,
      sha256: entry.sha256,
    })),
    validateRun: {
      errorCount: record.validateRun.errorCount,
      ranAt: record.validateRun.ranAt,
    },
    verifyRun: {
      status: record.verifyRun.status,
      ranAt: record.verifyRun.ranAt,
    },
    reviewerSignoff: {
      reviewerId,
      approved: reviewerSignoff.approved,
      timestamp: reviewerSignoff.timestamp,
    },
    iterationCount: record.iterationCount,
    specsCovered: [...record.specsCovered],
    ...(record.designMd
      ? { designMd: { path: record.designMd.path, sha256: record.designMd.sha256 } }
      : {}),
  };
  return out;
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

  if (cert.designMd) {
    const designMdAbs = path.join(root, cert.designMd.path);
    let currentSha: string | null = null;
    try {
      const text = await readFile(designMdAbs, "utf-8");
      currentSha = hashDesignMd(text);
    } catch {
      reasons.push(`DESIGN.md missing at ${cert.designMd.path} (referenced by certificate).`);
    }
    if (currentSha !== null && currentSha !== cert.designMd.sha256) {
      reasons.push(
        `DESIGN.md sha256 mismatch: certificate=${cert.designMd.sha256}, current=${currentSha}.`,
      );
    }
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

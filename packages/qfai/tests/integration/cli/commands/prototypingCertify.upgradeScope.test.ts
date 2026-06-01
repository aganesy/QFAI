/**
 * `qfai prototyping certify --scope saas-package --upgrade-scope full` —
 * scope-upgrade re-gating.
 *
 * Asserts:
 *   (a) Starting from a sealed scope-limited certificate (saas-package),
 *       a re-invocation with `upgradeScopeFull: true` MUST refuse to
 *       upgrade while gates named in the existing certificate's `notes:`
 *       are still missing. Exit non-zero; stderr names the still-missing
 *       gates.
 *   (b) After seeding the missing gates as PASS, a second
 *       `upgradeScopeFull: true` invocation rewrites the certificate
 *       WITHOUT the scope-limited markers (no `scope`, no `notes`) —
 *       the canonical "full DONE" shape.
 *
 * The upgrade-scope contract is intentionally a single-step state
 * transition from the saas-package certificate; full DONE is signalled
 * by absence of the scope-limited markers.
 */

// QFAI:SPEC-0014:TC-0014-0036

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingCertify } from "../../../../src/cli/commands/prototypingCertify.js";
import { hashDesignMd } from "../../../../src/core/design/designMd.js";
import { SAAS_PACKAGE_SKIPPED_GATES } from "../../../../src/core/saasPackage/skippedGates.js";

const CERT_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme SaaS"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
  "Restrained.",
  "",
].join("\n");

const CLEAN_FINAL_HTML =
  "<!doctype html>\n<html><head><style>body { font-family: Inter, system-ui, sans-serif; }</style></head>" +
  "<body><main><h1>Acme</h1></main></body></html>\n";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cert-upgrade-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedSaasPackageHappyPath(root: string): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/output",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "",
    ].join("\n"),
    "utf-8",
  );
  await mkdir(path.join(root, ".qfai/specs/spec-0014"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/specs/spec-0014/01_Spec.md"),
    "---\nsurface_type: ui-bearing\n---\n\n# spec-0014\n",
    "utf-8",
  );
  await writeFile(path.join(root, "DESIGN.md"), CERT_DESIGN_MD, "utf-8");
  const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
  await mkdir(iter00, { recursive: true });
  await writeFile(path.join(iter00, "index.html"), CLEAN_FINAL_HTML, "utf-8");
  await mkdir(path.join(root, ".qfai/output"), { recursive: true });
  await mkdir(path.join(root, ".qfai/report"), { recursive: true });
  const validateBody = JSON.stringify({
    profile: "prototyping",
    counts: { error: 0, warning: 0, info: 0 },
  });
  await writeFile(path.join(root, ".qfai/report/validate.json"), validateBody, "utf-8");
  await writeFile(path.join(root, ".qfai/output/validate.json"), validateBody, "utf-8");
  await writeFile(
    path.join(root, ".qfai/output/verify.json"),
    JSON.stringify({ status: "PASS", scope: "prototyping" }),
    "utf-8",
  );
  const protoBody = {
    mode: { effective: "standard", source: "explicit-request", rationale: "test" },
    surface: "web",
    runId: "run-saas-package",
    designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
    specsCovered: ["0014"],
    reviewerGate: {
      result: "PASS",
      signoff: { reviewerId: "test-reviewer", timestamp: "2026-05-27T00:00:00Z" },
    },
    iterations: [{ index: 0 }],
  };
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
    JSON.stringify(protoBody),
    "utf-8",
  );
}

/**
 * Build the "all gates pass" signal body. The signal is a validate-style
 * record with `counts.error: 0` plus an explicit per-gate result map
 * keyed by `SAAS_PACKAGE_SKIPPED_GATES`.
 */
function buildSaasPackageGatesPassingBody(): string {
  const perGate: Record<string, { status: "PASS" }> = {};
  for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
    perGate[gate] = { status: "PASS" };
  }
  return JSON.stringify({
    profile: "saas-package",
    counts: { error: 0, warning: 0, info: 0 },
    gates: perGate,
  });
}

/**
 * Seed the "all gates pass" signal at the LEGACY pre-CHG-005 path
 * `.qfai/output/validate-saas-package.json`. Preserved as the
 * back-compat regression guard so a pre-CHG-005 consumer state still
 * upgrades cleanly through the deprecation window.
 */
async function seedSaasPackageGatesPassingLegacy(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai/output"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/output/validate-saas-package.json"),
    buildSaasPackageGatesPassingBody(),
    "utf-8",
  );
}

/**
 * Seed the "all gates pass" signal at the CANONICAL post-CHG-005 path
 * `.qfai/report/validate-saas-package.json`. This is the
 * `qfai validate --profile saas-package` default output location under
 * `paths.outDir = ".qfai/report"`.
 */
async function seedSaasPackageGatesPassingCanonical(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai/report"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/report/validate-saas-package.json"),
    buildSaasPackageGatesPassingBody(),
    "utf-8",
  );
}

/**
 * Back-compat shim retained so the in-tree "happy upgrade" case below
 * keeps reading from a known signal location. Defaults to the
 * canonical post-CHG-005 path.
 */
async function seedSaasPackageGatesPassing(root: string): Promise<void> {
  await seedSaasPackageGatesPassingCanonical(root);
}

describe("certify --upgrade-scope full upgrades a saas-package cert to full DONE", () => {
  it("refuses to upgrade while named gates are still missing; stderr names them", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Capture stderr while attempting upgrade-scope without seeding the
    // gates-passing signal. The impl must refuse and name the still-
    // missing gates.
    const stderrChunks: string[] = [];
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      stderrChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    }) as typeof process.stderr.write;
    let upgradeExit: number;
    try {
      upgradeExit = await runPrototypingCertify({
        root,
        check: false,
        scope: "saas-package",
        upgradeScopeFull: true,
      });
    } finally {
      process.stderr.write = originalStderrWrite;
    }

    expect(upgradeExit).not.toBe(0);
    const stderrText = stderrChunks.join("");
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      expect(stderrText).toContain(gate);
    }

    // Certificate must remain scope-limited after the refused upgrade.
    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const raw = await readFile(certPath, "utf-8");
    const cert = JSON.parse(raw) as Record<string, unknown>;
    expect(cert.scope).toBe("saas-package");
    expect(Array.isArray(cert.notes)).toBe(true);
  });

  it("upgrades the certificate to full DONE when the previously-skipped gates now pass", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    await seedSaasPackageGatesPassing(root);

    const upgradeExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
      upgradeScopeFull: true,
    });
    expect(upgradeExit).toBe(0);

    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const raw = await readFile(certPath, "utf-8");
    const cert = JSON.parse(raw) as Record<string, unknown>;

    // Canonical "full DONE" shape: scope-limited markers are dropped.
    expect(cert.scope).toBeUndefined();
    expect(cert.notes).toBeUndefined();
  });

  // Regression for the path-mismatch P1: `qfai validate --profile
  // saas-package` writes the signal under the canonical post-CHG-005
  // path `.qfai/report/validate-saas-package.json`. The upgrade-scope
  // path must read from there as the primary signal location.
  it("reads the canonical .qfai/report/validate-saas-package.json signal", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    await seedSaasPackageGatesPassingCanonical(root);

    const upgradeExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
      upgradeScopeFull: true,
    });
    expect(upgradeExit).toBe(0);

    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const cert = JSON.parse(await readFile(certPath, "utf-8")) as Record<string, unknown>;
    expect(cert.scope).toBeUndefined();
    expect(cert.notes).toBeUndefined();
  });

  // Regression for the path-mismatch P1: back-compat fallback. When the
  // canonical path is ABSENT and only the legacy
  // `.qfai/output/validate-saas-package.json` exists, the upgrade must
  // still succeed AND emit a one-line stderr note pointing operators
  // at the canonical location.
  it("falls back to the legacy .qfai/output/ signal and emits a deprecation note", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Seed ONLY the legacy path.
    await seedSaasPackageGatesPassingLegacy(root);

    const stderrChunks: string[] = [];
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      stderrChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    }) as typeof process.stderr.write;
    let upgradeExit: number;
    try {
      upgradeExit = await runPrototypingCertify({
        root,
        check: false,
        scope: "saas-package",
        upgradeScopeFull: true,
      });
    } finally {
      process.stderr.write = originalStderrWrite;
    }
    expect(upgradeExit).toBe(0);
    const stderrText = stderrChunks.join("");
    expect(stderrText).toMatch(/legacy/i);

    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const cert = JSON.parse(await readFile(certPath, "utf-8")) as Record<string, unknown>;
    expect(cert.scope).toBeUndefined();
    expect(cert.notes).toBeUndefined();
  });

  // Regression for the path-mismatch P1: both-present case. Canonical
  // path WINS to keep the resolution deterministic regardless of any
  // operator-side cleanup ordering.
  it("prefers the canonical path when BOTH canonical and legacy signals exist", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Seed canonical with a PASSING body and legacy with a FAILING
    // body. If the impl read the legacy path the upgrade would
    // refuse; with canonical wins, the upgrade succeeds.
    await seedSaasPackageGatesPassingCanonical(root);
    await mkdir(path.join(root, ".qfai/output"), { recursive: true });
    const perGateMissing: Record<string, { status: "MISSING" }> = {};
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      perGateMissing[gate] = { status: "MISSING" };
    }
    await writeFile(
      path.join(root, ".qfai/output/validate-saas-package.json"),
      JSON.stringify({
        profile: "saas-package",
        counts: { error: 1 },
        gates: perGateMissing,
      }),
      "utf-8",
    );

    const upgradeExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
      upgradeScopeFull: true,
    });
    expect(upgradeExit).toBe(0);
  });
});

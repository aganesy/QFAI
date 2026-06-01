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

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingCertify } from "../../../../src/cli/commands/prototypingCertify.js";
import { hashDesignMd } from "../../../../src/core/design/designMd.js";
import { SAAS_PACKAGE_SKIPPED_GATES } from "../../../../src/core/saasPackage/skippedGates.js";

/**
 * Capture process.stderr.write via `vi.spyOn` so the spy carries the
 * full overloaded signature of `process.stderr.write` — no bare-`as`
 * cast required (CLAUDE.md "avoid bare `as`"). The implementation
 * callback accepts `unknown` for the chunk so all three overloads
 * (`(chunk)`, `(chunk, cb)`, `(chunk, encoding, cb)`) match; the
 * encoding / callback arguments are ignored. `afterEach`-style
 * restoration is handled by `vi.restoreAllMocks()`, but the returned
 * `.restore()` is provided so callers can scope the spy tightly when
 * a single test wants the real stderr for the rest of the body.
 */
function captureStderr(): { restore: () => void; read: () => string } {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    if (typeof chunk === "string") {
      chunks.push(chunk);
    } else if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk).toString("utf-8"));
    }
    return true;
  });
  return {
    restore: () => spy.mockRestore(),
    read: () => chunks.join(""),
  };
}

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
    const stderrCap = captureStderr();
    let upgradeExit: number;
    try {
      upgradeExit = await runPrototypingCertify({
        root,
        check: false,
        scope: "saas-package",
        upgradeScopeFull: true,
      });
    } finally {
      stderrCap.restore();
    }
    const stderrChunks = [stderrCap.read()];

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

    const stderrCap = captureStderr();
    let upgradeExit: number;
    try {
      upgradeExit = await runPrototypingCertify({
        root,
        check: false,
        scope: "saas-package",
        upgradeScopeFull: true,
      });
    } finally {
      stderrCap.restore();
    }
    const stderrChunks = [stderrCap.read()];
    expect(upgradeExit).toBe(0);
    const stderrText = stderrChunks.join("");
    expect(stderrText).toMatch(/legacy/i);
    // The legacy-fallback note must include a concrete migration
    // command (matches the `D-DEPRECATED-PATH` convention used by
    // other deprecated-path warnings in this repo) so operators do
    // not have to look up the docs to clear the warning.
    expect(stderrText).toMatch(/qfai validate --profile saas-package/);
    expect(stderrText).toMatch(/to write the canonical path/);

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

    // Capture stderr so we can assert the legacy deprecation note is
    // ABSENT — when canonical wins on both-present, the impl must NOT
    // emit the "Reading legacy validate-saas-package.json path" note
    // that the legacy-fallback branch produces. Without this negative
    // assertion the test would still pass if the impl read the
    // canonical body but spuriously printed the legacy-path note,
    // masking a source-discrimination regression.
    const stderrCap = captureStderr();
    let upgradeExit: number;
    try {
      upgradeExit = await runPrototypingCertify({
        root,
        check: false,
        scope: "saas-package",
        upgradeScopeFull: true,
      });
    } finally {
      stderrCap.restore();
    }
    const stderrChunks = [stderrCap.read()];
    expect(upgradeExit).toBe(0);
    const stderrText = stderrChunks.join("");
    expect(stderrText).not.toMatch(/legacy/i);
  });

  // Regression for the config-aware-reader gap: when an operator
  // overrides `output.validateJsonPath` in `qfai.config.yaml`, the
  // validate-side writer emits the saas-package signal under the
  // operator-customized location. The upgrade-scope reader MUST
  // derive the signal path from the same config field — pre-fix the
  // reader was hardcoded to `.qfai/report/validate-saas-package.json`
  // and refused to upgrade under custom configs even when the gates
  // were actually passing.
  it("derives the signal path from a non-default config.output.validateJsonPath", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    // Overwrite the seed config with a non-default
    // `output.validateJsonPath`. The writer-side derivation in
    // validate.ts splits at the basename, so a configured path of
    // `custom/report.json` produces `custom/report-saas-package.json`
    // for the saas-package profile output.
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
        "output:",
        "  validateJsonPath: custom/report.json",
        "",
      ].join("\n"),
      "utf-8",
    );
    // Mirror the validate.json the certify pre-seal gate reads against
    // the custom path, so the prerequisite "validate.json#counts.error=0"
    // gate keeps passing under the override.
    const customValidatePath = path.join(root, "custom/report.json");
    await mkdir(path.dirname(customValidatePath), { recursive: true });
    await writeFile(
      customValidatePath,
      JSON.stringify({
        profile: "prototyping",
        counts: { error: 0, warning: 0, info: 0 },
      }),
      "utf-8",
    );

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Seed the saas-package gates-passing signal at the
    // config-derived location ONLY (not at the hardcoded default).
    // Pre-fix the upgrade refused because the reader stayed at
    // `.qfai/report/validate-saas-package.json`.
    const customSignalPath = path.join(root, "custom/report-saas-package.json");
    await writeFile(customSignalPath, buildSaasPackageGatesPassingBody(), "utf-8");

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

  // Regression for the signal-shape-mismatch P2: `runValidate` writes
  // the saas-package profile result as a normal `ValidationResult`
  // (`profile`, `counts`, `issues`, ...) — the skip-set is represented
  // as `D-SAAS-PACKAGE-VERIFY-SKIPPED` info findings inside `issues[]`,
  // NOT as a synthetic `gates` map. The upgrade-scope reader must
  // interpret the real validate output so operators can produce the
  // signal via the actual `qfai validate --profile saas-package`
  // command instead of hand-authoring a synthetic gates JSON.
  //
  // Build a validate-style issues-only body matching the real writer.
  function buildSaasPackageIssuesBody(skippedGates: readonly string[]): string {
    const issues = skippedGates.map((gate) => ({
      code: "D-SAAS-PACKAGE-VERIFY-SKIPPED",
      severity: "info" as const,
      category: "canonical" as const,
      message: `SaaS-package profile skipped ${gate}; full DONE not claimed for this profile.`,
      rule: "validate.saasPackage.verifySkipped",
      refs: [gate],
    }));
    return JSON.stringify({
      profile: "saas-package",
      counts: { error: 0, warning: 0, info: skippedGates.length },
      issues,
    });
  }

  it("refuses upgrade on real saas-package validate output with all gates still skipped", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Seed the canonical signal with the REAL validate output shape:
    // all four skipped gates surface as info-severity findings.
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/report/validate-saas-package.json"),
      buildSaasPackageIssuesBody(SAAS_PACKAGE_SKIPPED_GATES),
      "utf-8",
    );

    const stderrCap = captureStderr();
    let upgradeExit: number;
    try {
      upgradeExit = await runPrototypingCertify({
        root,
        check: false,
        scope: "saas-package",
        upgradeScopeFull: true,
      });
    } finally {
      stderrCap.restore();
    }
    const stderrChunks = [stderrCap.read()];
    expect(upgradeExit).not.toBe(0);
    const stderrText = stderrChunks.join("");
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      expect(stderrText).toContain(gate);
    }
  });

  it("refuses upgrade on a saas-package profile signal (operator must run a fuller profile)", async () => {
    // runSaasPackageProfile UNCONDITIONALLY emits one
    // `D-SAAS-PACKAGE-VERIFY-SKIPPED` info finding per skipped gate, so
    // the skip-set can never be "emptied" within this profile. The
    // reader must therefore treat a saas-package signal as
    // INADMISSIBLE for upgrade — the operator has to run `qfai validate
    // --profile full` (or another fuller profile) instead.
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Even an artificially zero-skip-finding saas-package signal must
    // be refused — admissibility is decided by profile name, not by
    // counts.
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/report/validate-saas-package.json"),
      JSON.stringify({
        profile: "saas-package",
        counts: { error: 0, warning: 0, info: 0 },
        issues: [],
      }),
      "utf-8",
    );

    // Capture stderr so we can prove the recovery message steers the
    // operator to a FULLER profile rather than looping them back to
    // `--profile saas-package` (which would still emit skip findings
    // and refuse upgrade ad infinitum).
    const stderrCap = captureStderr();
    let upgradeExit: number;
    try {
      upgradeExit = await runPrototypingCertify({
        root,
        check: false,
        scope: "saas-package",
        upgradeScopeFull: true,
      });
    } finally {
      stderrCap.restore();
    }
    const stderrChunks = [stderrCap.read()];
    expect(upgradeExit).not.toBe(0);
    const stderrText = stderrChunks.join("");
    // Recovery message MUST direct the operator to a fuller profile.
    // The pre-fix message instructed `qfai validate --profile saas-
    // package` which causes an infinite recovery loop because the
    // saas-package profile unconditionally emits skip findings.
    expect(stderrText).toMatch(/--profile full/);
    expect(stderrText).toMatch(/INADMISSIBLE|inadmissible/);
    // And it must NOT instruct re-running `--profile saas-package`
    // as the recovery step.
    expect(stderrText).not.toMatch(/Re-run `qfai validate --profile saas-package`/);
  });

  it("refuses upgrade on a malformed signal (empty / shape-incomplete object)", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // A parseable-but-malformed canonical signal: empty object. The
    // reader must NOT default-to-success when counts.error is absent;
    // it must require a recognizable ValidationResult shape.
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/report/validate-saas-package.json"),
      JSON.stringify({}),
      "utf-8",
    );

    const upgradeExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
      upgradeScopeFull: true,
    });
    expect(upgradeExit).not.toBe(0);
  });

  it("allows upgrade when a fuller-profile validate run reports zero errors", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Operator re-ran `qfai validate --profile full` — every gate
    // including the previously-skipped ones executed cleanly.
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/report/validate-saas-package.json"),
      JSON.stringify({
        profile: "full",
        counts: { error: 0, warning: 0, info: 0 },
        issues: [],
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

    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const cert = JSON.parse(await readFile(certPath, "utf-8")) as Record<string, unknown>;
    expect(cert.scope).toBeUndefined();
    expect(cert.notes).toBeUndefined();
  });

  it("refuses upgrade when a fuller-profile validate run carries any error finding", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Operator re-ran a fuller profile and at least one gate failed.
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/report/validate-saas-package.json"),
      JSON.stringify({
        profile: "full",
        counts: { error: 1, warning: 0, info: 0 },
        issues: [
          {
            code: "T-TDD-LIST",
            severity: "error",
            category: "canonical",
            message: "validateTddList reported a failure on some surface.",
            rule: "validate.tdd.list",
            refs: ["validateTddList"],
          },
        ],
      }),
      "utf-8",
    );

    const upgradeExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
      upgradeScopeFull: true,
    });
    expect(upgradeExit).not.toBe(0);

    // Certificate must remain scope-limited after the refused upgrade.
    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const cert = JSON.parse(await readFile(certPath, "utf-8")) as Record<string, unknown>;
    expect(cert.scope).toBe("saas-package");
  });

  // Pin gate-name listing on the saas-package INADMISSIBLE refusal
  // path. The previous batch added two refusal-case assertions but
  // only checked `upgradeExit).not.toBe(0)` — that lets the
  // operator-facing list of still-missing gates regress silently.
  // The earlier "fail-closed" test (around L246-271) already pins
  // gate-name listing on the missing-canonical path; this new test
  // does the same for the saas-package-profile-INADMISSIBLE branch
  // so both fail-closed paths surface still-missing gate names in
  // stderr.
  it("names every still-missing gate in stderr on saas-package profile refusal", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/report/validate-saas-package.json"),
      JSON.stringify({
        profile: "saas-package",
        counts: { error: 0, warning: 0, info: 0 },
        issues: [],
      }),
      "utf-8",
    );

    const stderrCap = captureStderr();
    let upgradeExit: number;
    try {
      upgradeExit = await runPrototypingCertify({
        root,
        check: false,
        scope: "saas-package",
        upgradeScopeFull: true,
      });
    } finally {
      stderrCap.restore();
    }
    expect(upgradeExit).not.toBe(0);
    const stderrText = stderrCap.read();
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      expect(stderrText).toContain(gate);
    }
    expect(stderrText).toMatch(/--profile full/);
  });

  // Pin the INADMISSIBLE recovery loop: an operator who follows the
  // refusal message ("re-run `qfai validate --profile full`") must
  // actually close the loop, even when a stale
  // `validate-saas-package.json` (profile === "saas-package") remains
  // on disk. The validate writer does NOT delete or overwrite the
  // saas-package signal when invoked under `--profile full` — it
  // writes the profile-suffixed `validate-full.json` as a separate
  // file — so the reader must prefer the full-profile signal over a
  // stale INADMISSIBLE canonical. Pre-fix, the reader returned
  // `source: "canonical"` on the first probe and the recovery loop
  // never closed.
  it("prefers full-profile signal over stale saas-package canonical (INADMISSIBLE recovery)", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Step 1: operator's first `qfai validate --profile saas-package`
    // run wrote an INADMISSIBLE signal at the canonical path. The
    // saas-package profile unconditionally emits one skip finding per
    // gate, so its skip-set can never be emptied within that profile.
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/report/validate-saas-package.json"),
      JSON.stringify({
        profile: "saas-package",
        counts: { error: 0, warning: 0, info: SAAS_PACKAGE_SKIPPED_GATES.length },
        issues: [],
      }),
      "utf-8",
    );

    // Step 2: operator followed the refusal message and re-ran
    // `qfai validate --profile full --fail-on error`, which writes the
    // profile-suffixed `validate-full.json` as a separate file. The
    // stale canonical at step 1 is NOT removed by the writer.
    await writeFile(
      path.join(root, ".qfai/report/validate-full.json"),
      JSON.stringify({
        profile: "full",
        counts: { error: 0, warning: 0, info: 0 },
        issues: [],
      }),
      "utf-8",
    );

    // Step 3: re-run `certify --upgrade-scope full`. The reader must
    // prefer the full-profile signal so the upgrade succeeds; the
    // stale canonical must NOT block the loop.
    const upgradeExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
      upgradeScopeFull: true,
    });
    expect(upgradeExit).toBe(0);

    // Certificate is now full-scope.
    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const cert = JSON.parse(await readFile(certPath, "utf-8")) as Record<string, unknown>;
    expect(cert.scope).toBeUndefined();
    expect(cert.notes).toBeUndefined();
  });

  it("reads full-profile signal as source=full-profile when canonical is absent", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const sealExit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(sealExit).toBe(0);

    // Canonical absent on disk; full-profile present (operator ran
    // `--profile full` without ever running `--profile saas-package`
    // beforehand).
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/report/validate-full.json"),
      JSON.stringify({
        profile: "full",
        counts: { error: 0, warning: 0, info: 0 },
        issues: [],
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

    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const cert = JSON.parse(await readFile(certPath, "utf-8")) as Record<string, unknown>;
    expect(cert.scope).toBeUndefined();
  });
});

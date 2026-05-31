/**
 * `qfai prototyping certify --scope saas-package` seal.
 *
 * Asserts:
 *   (a) `--scope saas-package` against a SaaS-tenant project with
 *       complete prototyping evidence seals
 *       `.qfai/evidence/prototyping/completion-certificate.json`
 *       with `scope: "saas-package"`.
 *   (b) The sealed certificate carries a non-empty `notes:` field
 *       naming each skipped gate from `SAAS_PACKAGE_SKIPPED_GATES`.
 *   (c) The certificate does NOT claim full DONE — full-completion
 *       consumers detect the scope-limited posture via the `scope`
 *       field.
 *
 * The certify-side `notes:` enumeration is sourced from
 * `core/saasPackage/skippedGates.ts` so the certify-side and
 * validate-side surfaces stay in lockstep.
 */

// QFAI:SPEC-0014:TC-0014-0035

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
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cert-saaspkg-"));
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

describe("certify --scope saas-package seals a scope-limited certificate", () => {
  it("writes scope=\"saas-package\" and notes enumerating each skipped gate", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const exit = await runPrototypingCertify({
      root,
      check: false,
      scope: "saas-package",
    });
    expect(exit).toBe(0);

    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const raw = await readFile(certPath, "utf-8");
    const cert = JSON.parse(raw) as Record<string, unknown>;

    expect(cert.scope).toBe("saas-package");

    // notes is non-empty and names every skipped gate from the SSOT
    const notes = cert.notes;
    expect(Array.isArray(notes)).toBe(true);
    if (Array.isArray(notes)) {
      expect(notes.length).toBeGreaterThan(0);
      for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
        const found = notes.some((entry) => typeof entry === "string" && entry.includes(gate));
        expect(found).toBe(true);
      }
    }

    // Scope-limited certificate MUST NOT claim full DONE: no "full"
    // status marker on the certificate itself (verifyRun reflects the
    // prototyping-scope verify only).
    expect(cert.scope).not.toBe("full");
  });

  it("default invocation (no --scope) preserves the existing certificate shape (no scope, no notes)", async () => {
    const root = await newTempDir();
    await seedSaasPackageHappyPath(root);

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);

    const certPath = path.join(root, ".qfai/evidence/prototyping/completion-certificate.json");
    const raw = await readFile(certPath, "utf-8");
    const cert = JSON.parse(raw) as Record<string, unknown>;

    expect(cert.scope).toBeUndefined();
    expect(cert.notes).toBeUndefined();
  });
});

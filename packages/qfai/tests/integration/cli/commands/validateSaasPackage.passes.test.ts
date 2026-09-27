/**
 * Integration: `qfai validate --profile saas-package` end-to-end
 * (TC-0004-0067 / TDD-0047).
 *
 * - Given a temp-dir repo where the prototyping pipeline produces
 *   no error findings, the design-system attestation — root `DESIGN.md` —
 *   is present and parses, and a conformant
 *   handoff exists at `.qfai/handoff.yaml`, the saas-package profile
 *   PASSes (no error severities, exit 0).
 * - The validation result emits ONE `D-SAAS-PACKAGE-VERIFY-SKIPPED`
 *   (severity info) finding per skipped ATDD / implement-class gate
 *   naming each gate.
 *
 * Drives `runValidate` directly (no subprocess shell-out) so the
 * harness can read the in-memory validation result deterministically.
 */
// QFAI:EX-0001-0051-01

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";
import { SAAS_PACKAGE_SKIPPED_GATES } from "../../../../src/core/saasPackage/skippedGates.js";

let root: string;
let savedCiEnv: string | undefined;
let savedGhaEnv: string | undefined;

const DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary: "#1F2937"',
  '    secondary: "#6366F1"',
  '    accent: "#D97706"',
  '    surface: "#FFFFFF"',
  '    surface_muted: "#F3F4F6"',
  '    text: "#111827"',
  '    text_muted: "#6B7280"',
  '    danger: "#DC2626"',
  '    warning: "#F59E0B"',
  '    success: "#10B981"',
  '    border: "#E5E7EB"',
  '    overlay: "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans: "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono: "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm: "0.25rem"',
  '    md: "0.5rem"',
  '    lg: "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
].join("\n");

async function seedDesignSystemAttestation(): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), DESIGN_MD, "utf-8");
}

async function seedHandoff(): Promise<void> {
  await mkdir(path.join(root, ".qfai"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai", "handoff.yaml"),
    JSON.stringify(
      {
        companyName: "Acme",
        primarySpecId: "spec-0001",
        startDate: "2026-05-27",
        entryPattern: "saas-package",
        productScope: "tenant-portal",
      },
      null,
      2,
    ),
    "utf-8",
  );
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-saas-validate-pass-"));
  // CI env vars short-circuit narrow profiles via QFAI-VALIDATE-017.
  // saas-package is a narrow profile by design — clear CI env so the
  // test exercises the actual profile pipeline.
  savedCiEnv = process.env.CI;
  savedGhaEnv = process.env.GITHUB_ACTIONS;
  delete process.env.CI;
  delete process.env.GITHUB_ACTIONS;
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  if (savedCiEnv !== undefined) process.env.CI = savedCiEnv;
  if (savedGhaEnv !== undefined) process.env.GITHUB_ACTIONS = savedGhaEnv;
});

describe("TC-0004-0067: validate --profile saas-package PASSes + emits skip-set (normal)", () => {
  it("PASSes (exit 0) and writes a profile-suffixed report containing D-SAAS-PACKAGE-VERIFY-SKIPPED info findings", async () => {
    await seedDesignSystemAttestation();
    await seedHandoff();

    const exit = await runValidate({
      root,
      strict: false,
      profile: "saas-package",
      failOn: "error",
    });
    expect(exit).toBe(0);

    const reportPath = path.join(root, ".qfai", "report", "validate-saas-package.json");
    const body = JSON.parse(await readFile(reportPath, "utf-8")) as {
      profile: string;
      issues: Array<{ code: string; severity: string; message: string }>;
      counts: { error: number; warning: number; info: number };
    };
    expect(body.profile).toBe("saas-package");
    expect(body.counts.error).toBe(0);

    const skips = body.issues.filter((i) => i.code === "D-SAAS-PACKAGE-VERIFY-SKIPPED");
    expect(skips.length).toBe(SAAS_PACKAGE_SKIPPED_GATES.length);
    expect(skips.every((i) => i.severity === "info")).toBe(true);
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      const named = skips.find((i) => i.message.includes(gate));
      expect(named, `expected a skip finding naming "${gate}"`).toBeDefined();
    }
  });

  it("FAILs (exit non-zero) when the design-system attestation is removed (same repo otherwise)", async () => {
    // Skip seeding the attestation. Handoff present so the only
    // failure source is the missing attestation gate.
    await seedHandoff();

    const exit = await runValidate({
      root,
      strict: false,
      profile: "saas-package",
      failOn: "error",
    });
    expect(exit).not.toBe(0);

    const reportPath = path.join(root, ".qfai", "report", "validate-saas-package.json");
    const body = JSON.parse(await readFile(reportPath, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const attestation = body.issues.find(
      (i) => i.severity === "error" && i.code === "D-SAAS-PACKAGE-ATTESTATION-MISSING",
    );
    expect(attestation?.message).toContain("DESIGN.md is absent");
  });
});

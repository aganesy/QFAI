/**
 * Integration: `qfai validate --profile saas-package` end-to-end
 * (TC-0004-0067 / TDD-0047).
 *
 * - Given a temp-dir repo where the prototyping pipeline produces
 *   no error findings, the design-system attestation is present at
 *   `.qfai/contracts/design/design-system.yaml`, and a conformant
 *   handoff exists at `.qfai/handoff.yaml`, the saas-package profile
 *   PASSes (no error severities, exit 0).
 * - The validation result emits ONE `D-SAAS-PACKAGE-VERIFY-SKIPPED`
 *   (severity info) finding per skipped ATDD / implement-class gate
 *   naming each gate.
 *
 * Drives `runValidate` directly (no subprocess shell-out) so the
 * harness can read the in-memory validation result deterministically.
 */
// QFAI:SPEC-0004:TC-0004-0067

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";
import { SAAS_PACKAGE_SKIPPED_GATES } from "../../../../src/core/saasPackage/skippedGates.js";

let root: string;
let savedCiEnv: string | undefined;
let savedGhaEnv: string | undefined;

async function seedDesignSystemAttestation(): Promise<void> {
  const dir = path.join(root, ".qfai", "contracts", "design");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "design-system.yaml"),
    [
      "# Design-system attestation (DCON-005)",
      "surfaces:",
      "  - id: dashboard",
      "    tokens-source: .qfai/contracts/design/tokens.yaml",
      "tokens: {}",
      "",
    ].join("\n"),
    "utf-8",
  );
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

  it("FAILs (exit non-zero) when the DCON-005 attestation is removed (same repo otherwise)", async () => {
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
      (i) => i.severity === "error" && (i.message ?? "").includes("design-system.yaml"),
    );
    expect(
      attestation,
      "expected error finding naming the absent design-system.yaml attestation",
    ).toBeDefined();
  });
});
